// Fetchers: pull raw listings from each source type and normalize them into a
// common shape: { id, title, company, location, url, source, postedAt, descriptionText }

const https = require('https');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) job-monitor/1.0 (personal use)';

function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, Accept: '*/*' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          return resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      })
      .on('error', reject);
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeId(...parts) {
  return parts.join('::').toLowerCase().replace(/\s+/g, '-');
}

// ---- ATS fetchers --------------------------------------------------------

async function fetchGreenhouse(company) {
  const r = await get(`https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`);
  if (r.status !== 200) return [];
  const json = JSON.parse(r.data);
  return (json.jobs || []).map((j) => ({
    id: makeId('greenhouse', company.slug, j.id),
    title: j.title,
    company: company.name,
    location: (j.location && j.location.name) || '',
    url: j.absolute_url,
    source: company.name,
    postedAt: j.updated_at || j.created_at || null,
    descriptionText: stripHtml(j.content || ''),
  }));
}

async function fetchLever(company) {
  const r = await get(`https://api.lever.co/v0/postings/${company.slug}?mode=json`);
  if (r.status !== 200) return [];
  const json = JSON.parse(r.data);
  return (Array.isArray(json) ? json : []).map((j) => ({
    id: makeId('lever', company.slug, j.id),
    title: j.text,
    company: company.name,
    location: (j.categories && j.categories.location) || '',
    url: j.hostedUrl,
    source: company.name,
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    descriptionText: stripHtml(`${j.descriptionPlain || j.description || ''} ${(j.lists || [])
      .map((l) => `${l.text} ${(l.content || '')}`)
      .join(' ')}`),
  }));
}

async function fetchAshby(company) {
  const r = await get(`https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=false`);
  if (r.status !== 200) return [];
  const json = JSON.parse(r.data);
  return (json.jobs || []).map((j) => ({
    id: makeId('ashby', company.slug, j.id),
    title: j.title,
    company: company.name,
    location: j.location || (j.secondaryLocations || []).map((l) => l.location).join(', '),
    url: j.jobUrl || j.applyUrl,
    source: company.name,
    postedAt: j.publishedAt || null,
    descriptionText: stripHtml(j.descriptionHtml || ''),
  }));
}

async function fetchWorkable(company) {
  const r = await get(`https://apply.workable.com/api/v1/widget/accounts/${company.slug}`);
  if (r.status !== 200) return [];
  let json;
  try {
    json = JSON.parse(r.data);
  } catch {
    return [];
  }
  return (json.jobs || []).map((j) => ({
    id: makeId('workable', company.slug, j.shortcode),
    title: j.title,
    company: company.name,
    location: [j.city, j.state, j.country].filter(Boolean).join(', ') || (j.telecommuting ? 'Remote' : ''),
    url: j.url || j.shortlink,
    source: company.name,
    postedAt: j.published_on ? new Date(j.published_on).toISOString() : null,
    descriptionText: '', // widget endpoint doesn't include full description; title+location is enough for keyword match
  }));
}

// Best-effort scrape for companies whose career pages are JS-rendered SPAs with
// no public API. We pull the raw page text and look for role-keyword matches
// near job-link patterns. Lower confidence -- flagged for manual verification.
async function fetchCustom(company) {
  const r = await get(company.careersUrl);
  if (r.status !== 200) return [];
  const text = stripHtml(r.data);
  const results = [];
  const seen = new Set();
  // Look for any of our title keywords appearing in the visible page text,
  // and capture a short surrounding snippet as a "possible listing".
  const keywordPattern = /(customer success manager|customer success specialist|client success manager|creator success manager|customer success|account manager|customer lifecycle|customer enablement)/gi;
  let m;
  while ((m = keywordPattern.exec(text)) !== null) {
    const snippet = text.slice(Math.max(0, m.index - 80), m.index + 80).trim();
    const key = m[1].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      id: makeId('custom', company.name, key),
      title: `${m[1]} (mentioned on careers page — verify)`,
      company: company.name,
      location: '',
      url: company.careersUrl,
      source: company.name,
      postedAt: null,
      descriptionText: snippet,
      lowConfidence: true,
    });
  }
  return results;
}

// ---- Job board fetchers ---------------------------------------------------

function parseRssItems(xml) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemPattern.exec(xml)) !== null) {
    const block = m[1];
    const field = (tag) => {
      const r = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`).exec(block);
      return r ? r[1].trim() : '';
    };
    items.push({
      title: field('title'),
      link: field('link'),
      region: field('region'),
      description: field('description'),
      pubDate: field('pubDate') || field('dc:date'),
    });
  }
  return items;
}

async function fetchWWR(source) {
  const r = await get(source.url);
  if (r.status !== 200) return [];
  const items = parseRssItems(r.data);
  return items.map((it) => {
    // Title format is usually "Company: Role Title"
    const sep = it.title.indexOf(':');
    const company = sep > -1 ? it.title.slice(0, sep).trim() : 'Unknown';
    const title = sep > -1 ? it.title.slice(sep + 1).trim() : it.title;
    return {
      id: makeId('wwr', it.link),
      title,
      company,
      location: it.region || '',
      url: it.link,
      source: 'We Work Remotely',
      postedAt: it.pubDate ? new Date(it.pubDate).toISOString() : null,
      descriptionText: stripHtml(it.description || ''),
    };
  });
}

async function fetchRemoteOK(source) {
  const r = await get(source.url);
  if (r.status !== 200) return [];
  let json;
  try {
    json = JSON.parse(r.data);
  } catch {
    return [];
  }
  return (Array.isArray(json) ? json : [])
    .filter((j) => j.id && j.position)
    .map((j) => ({
      id: makeId('remoteok', j.id),
      title: j.position,
      company: j.company || 'Unknown',
      location: j.location || 'Remote',
      url: j.url ? `https://remoteok.com${j.url.startsWith('/') ? '' : '/'}${j.url}`.replace('https://remoteokhttps://', 'https://') : j.original_url,
      source: 'Remote OK',
      postedAt: j.date || null,
      descriptionText: stripHtml(j.description || ''),
    }));
}

// ---- Dispatch --------------------------------------------------------------

async function fetchCompany(company) {
  try {
    switch (company.ats) {
      case 'greenhouse':
        return await fetchGreenhouse(company);
      case 'lever':
        return await fetchLever(company);
      case 'ashby':
        return await fetchAshby(company);
      case 'workable':
        return await fetchWorkable(company);
      case 'custom':
        return await fetchCustom(company);
      default:
        return [];
    }
  } catch (err) {
    console.error(`  ! ${company.name} (${company.ats}): ${err.message}`);
    return [];
  }
}

async function fetchJobBoard(source) {
  try {
    switch (source.type) {
      case 'wwr-rss':
        return await fetchWWR(source);
      case 'remoteok':
        return await fetchRemoteOK(source);
      default:
        return [];
    }
  } catch (err) {
    console.error(`  ! ${source.name} (${source.id}): ${err.message}`);
    return [];
  }
}

module.exports = { fetchCompany, fetchJobBoard, stripHtml };
