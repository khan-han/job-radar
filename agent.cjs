#!/usr/bin/env node
// Daily job-monitoring agent.
// Fetches listings from configured job boards + company career pages, filters
// them down to relevant CSM/AM-style roles, flags geo/timezone signals, marks
// newly-appeared roles, and persists results (merging in any saved application
// statuses) to public/data/jobs.json for the dashboard to read.

const fs = require('fs');
const path = require('path');

const sources = require('./sources.cjs');
const { fetchCompany, fetchJobBoard } = require('./fetchers.cjs');
const { processJobs } = require('./filters.cjs');

const DATA_FILE = path.join(__dirname, 'public', 'data', 'jobs.json');

function loadExisting() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { lastChecked: null, jobs: [] };
  }
}

function dateStr(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function main() {
  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] Starting job check...`);

  const existing = loadExisting();
  const previousById = new Map(existing.jobs.map((j) => [j.id, j]));

  // 1. Fetch everything (job boards + companies), in modest parallel batches
  // to be polite to upstream servers.
  const allRaw = [];

  console.log(`Checking ${sources.jobBoards.length} job boards...`);
  for (const board of sources.jobBoards) {
    const items = await fetchJobBoard(board);
    console.log(`  - ${board.name} (${board.id}): ${items.length} listings`);
    allRaw.push(...items);
  }

  console.log(`Checking ${sources.companies.length} company career pages...`);
  const BATCH = 5;
  for (let i = 0; i < sources.companies.length; i += BATCH) {
    const batch = sources.companies.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((c) => fetchCompany(c)));
    batch.forEach((c, idx) => {
      console.log(`  - ${c.name} (${c.ats}): ${results[idx].length} listings`);
      allRaw.push(...results[idx]);
    });
  }

  console.log(`Fetched ${allRaw.length} raw listings total.`);

  // 2. Filter + flag
  const matched = processJobs(allRaw);
  console.log(`${matched.length} listings match role filters and pass geo exclusions.`);

  // 3. Merge with existing data: preserve firstSeen + status, compute isNew
  const today = dateStr(startedAt);
  const yesterday = dateStr(startedAt.getTime() - 24 * 60 * 60 * 1000);

  const mergedJobs = matched.map((job) => {
    const prev = previousById.get(job.id);
    const firstSeen = prev ? prev.firstSeen : startedAt.toISOString();
    const firstSeenDate = dateStr(firstSeen);
    return {
      ...job,
      firstSeen,
      isNew: firstSeenDate === today || firstSeenDate === yesterday,
      status: prev ? prev.status : 'Not Applied',
    };
  });

  // Sort: new first, then by postedAt/firstSeen descending
  mergedJobs.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    const at = new Date(a.postedAt || a.firstSeen).getTime();
    const bt = new Date(b.postedAt || b.firstSeen).getTime();
    return bt - at;
  });

  const output = {
    lastChecked: startedAt.toISOString(),
    totalRawListings: allRaw.length,
    jobs: mergedJobs,
  };

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved ${mergedJobs.length} matching roles to ${DATA_FILE}`);
  console.log(`New since yesterday: ${mergedJobs.filter((j) => j.isNew).length}`);
  console.log(`Flagged for CST/Central hours: ${mergedJobs.filter((j) => j.flags.centralTime).length}`);
}

main().catch((err) => {
  console.error('Agent run failed:', err);
  process.exitCode = 1;
});
