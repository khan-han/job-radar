// Source configuration: maps each company / job board to where & how to fetch its listings.
// "ats" sources use structured JSON APIs (reliable). "custom" sources are best-effort
// HTML text scans of JS-rendered career pages that have no public API.

module.exports = {
  jobBoards: [
    {
      id: 'wwr-sales',
      name: 'We Work Remotely',
      type: 'wwr-rss',
      url: 'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
    },
    {
      id: 'wwr-support',
      name: 'We Work Remotely',
      type: 'wwr-rss',
      url: 'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
    },
    {
      id: 'remoteok',
      name: 'Remote OK',
      type: 'remoteok',
      url: 'https://remoteok.com/api',
    },
  ],

  companies: [
    { name: 'Automattic', ats: 'workable', slug: 'automattic' },
    { name: 'Doist', ats: 'workable', slug: 'doist' },
    { name: 'Buffer', ats: 'ashby', slug: 'buffer' },
    { name: 'Toggl', ats: 'workable', slug: 'toggl' },
    { name: 'Superside', ats: 'lever', slug: 'superside' },
    { name: 'TestGorilla', ats: 'ashby', slug: 'testgorilla' },
    { name: 'Hubstaff', ats: 'ashby', slug: 'hubstaff' },
    { name: 'SafetyWing', ats: 'custom', careersUrl: 'https://safetywing.com/join-us' },
    { name: 'Remote.com', ats: 'greenhouse', slug: 'remotecom' },
    { name: 'GitLab', ats: 'greenhouse', slug: 'gitlab' },
    { name: 'Shogun', ats: 'workable', slug: 'shogun' },
    { name: 'Help Scout', ats: 'ashby', slug: 'helpscout' },
    { name: 'Customer.io', ats: 'greenhouse', slug: 'customerio' },
    { name: 'Zapier', ats: 'ashby', slug: 'zapier' },
    { name: 'MailerLite', ats: 'workable', slug: 'mailerlite' },
    { name: 'Kit', ats: 'ashby', slug: 'kit' },
    { name: 'Lyssna', ats: 'workable', slug: 'usabilityhub' },
    { name: 'ChartMogul', ats: 'workable', slug: 'chartmogul' },
    { name: 'Ghost', ats: 'custom', careersUrl: 'https://careers.ghost.org/' },
    { name: 'Chameleon', ats: 'custom', careersUrl: 'https://www.chameleon.io/jobs' },
    { name: 'PostHog', ats: 'ashby', slug: 'posthog' },
    { name: 'RevenueCat', ats: 'ashby', slug: 'revenuecat' },
    { name: 'Webflow', ats: 'greenhouse', slug: 'webflow' },
    { name: 'Openphone', ats: 'workable', slug: 'openphone' },
  ],

  // Role titles we're hunting for (substring match, case-insensitive)
  titleKeywords: [
    'customer success manager',
    'customer success',
    'account manager',
    'client success manager',
    'customer success specialist',
    'creator success manager',
    'customer lifecycle',
    'customer enablement',
    'csm',
  ],

  // Geo phrases that knock a role OUT of the list
  geoExclusions: [
    'us only',
    'u.s. only',
    'united states only',
    'emea only',
    'canada only',
    'uk only',
    'u.k. only',
    'americas only',
  ],

  // Phrases that flag a role as having CST / Central time hours requirements
  centralTimeFlags: [
    'cst',
    'central time',
    'central standard time',
    'central daylight time',
    'us central',
    'u.s. central',
  ],
};
