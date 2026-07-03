// Filtering & flagging: title matching, geo exclusion, CST flagging, geo-signal explanations.

const { titleKeywords, geoExclusions, centralTimeFlags } = require('./sources.cjs');

// Region/country names that, when they appear in a job's title or location
// (but the role wasn't hard-excluded by an explicit "X only" phrase), are
// worth surfacing as an informational signal -- e.g. "Customer Success
// Manager, Japan" or "Remote, Germany" suggests the role may be regionally
// scoped even though it doesn't literally say "Japan only".
const REGION_HINTS = [
  'emea', 'apac', 'latam', 'americas', 'apj',
  'united states', 'usa', 'u.s.', ' us ', 'us-based',
  'canada', 'united kingdom', 'uk', 'ireland',
  'australia', 'new zealand', 'japan', 'singapore', 'india',
  'germany', 'austria', 'france', 'spain', 'netherlands', 'portugal',
  'brazil', 'mexico', 'philippines',
];

function detectRegionHints(job, geoExclusionPhrase) {
  if (geoExclusionPhrase) return [];
  const haystack = ` ${job.title.toLowerCase()} | ${job.location.toLowerCase()} `;
  const found = [];
  for (const hint of REGION_HINTS) {
    if (haystack.includes(hint) && !found.includes(hint.trim())) {
      found.push(hint.trim());
    }
  }
  return found;
}

function textOf(job) {
  return `${job.title} ${job.location} ${job.descriptionText}`.toLowerCase();
}

function matchesTitle(job) {
  const title = job.title.toLowerCase();
  return titleKeywords.find((kw) => title.includes(kw)) || null;
}

function findGeoExclusion(job) {
  const haystack = textOf(job);
  return geoExclusions.find((phrase) => haystack.includes(phrase)) || null;
}

const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Roles whose posted date is more than 30 days old may well have been filled
// already -- flag them so the user can decide whether to check manually.
function isStale(job) {
  if (!job.postedAt) return false;
  const posted = new Date(job.postedAt).getTime();
  if (Number.isNaN(posted)) return false;
  return Date.now() - posted > STALE_THRESHOLD_MS;
}

function findCentralTimeMention(job) {
  const haystack = textOf(job);
  return centralTimeFlags.find((phrase) => {
    // avoid matching "cst" inside unrelated words (e.g. "Customer" never contains "cst" as standalone,
    // but be safe with word-boundary check for the short "cst"/"us central" tokens)
    if (phrase === 'cst') return /\bcst\b/.test(haystack);
    return haystack.includes(phrase);
  }) || null;
}

// Builds the human-readable "why this card is here / flagged" signal list shown on each card.
function buildGeoSignals(job, { matchedKeyword, geoExclusionPhrase, centralTimePhrase, regionHints }) {
  const signals = [];

  if (matchedKeyword) {
    signals.push({ type: 'match', label: `Title matches "${matchedKeyword}"` });
  }

  if (job.location) {
    signals.push({ type: 'info', label: `Location listed as: ${job.location}` });
  }

  if (geoExclusionPhrase) {
    signals.push({ type: 'exclude', label: `Excluded — mentions "${geoExclusionPhrase}"` });
  } else {
    signals.push({ type: 'pass', label: 'No hard geo-restriction phrases detected' });
  }

  if (regionHints && regionHints.length) {
    signals.push({
      type: 'region',
      label: `May be region-scoped — title/location mentions: ${regionHints.join(', ')}`,
    });
  }

  if (centralTimePhrase) {
    signals.push({ type: 'flag', label: `Mentions "${centralTimePhrase}" — possible CST/Central hours requirement` });
  }

  return signals;
}

// Runs the full pipeline over a raw normalized job list and returns enriched,
// filtered results ready for storage/display.
function processJobs(rawJobs) {
  const out = [];
  for (const job of rawJobs) {
    const matchedKeyword = matchesTitle(job);
    if (!matchedKeyword && !job.lowConfidence) continue; // title must match unless it's a flagged custom-scrape mention

    const geoExclusionPhrase = findGeoExclusion(job);
    if (geoExclusionPhrase) continue; // filtered OUT per geo restriction rules

    const centralTimePhrase = findCentralTimeMention(job);
    const regionHints = detectRegionHints(job, geoExclusionPhrase);

    out.push({
      ...job,
      matchedKeyword: matchedKeyword || (job.lowConfidence ? 'possible match (verify)' : null),
      flags: {
        centralTime: Boolean(centralTimePhrase),
        lowConfidence: Boolean(job.lowConfidence),
        regionScoped: regionHints.length > 0,
        stale: isStale(job),
      },
      geoSignals: buildGeoSignals(job, { matchedKeyword, geoExclusionPhrase, centralTimePhrase, regionHints }),
    });
  }
  return out;
}

module.exports = { processJobs, matchesTitle, findGeoExclusion, findCentralTimeMention, isStale };
