// Daily job fetcher — Node 20+, zero dependencies. Writes data/jobs.json
const fs = require('fs');
const OUT = 'data/jobs.json';
const KEEP_DAYS = 30;

// ---- Edit your profile here ----
const SKILLS = ['react', 'react native', 'javascript', 'node', 'typescript', 'frontend', 'front-end', 'front end',
  'mobile', 'ios', 'android', 'full stack', 'fullstack', 'engineering manager', 'tech lead', 'ai', 'llm', 'genai', 'cloud', 'devops', 'azure'];

// Government / bank / PSU — via Google News RSS (free, no API key)
const GOVT = [
  'lateral entry recruitment', 'SBI specialist officer recruitment', 'bank IT officer recruitment',
  'RBI recruitment IT specialist', 'NIC scientist recruitment', 'C-DAC recruitment', 'NIELIT recruitment',
  'BPSC TRE computer teacher', 'KVS PGT computer science', 'PSU recruitment experienced IT manager',
  'ISRO DRDO recruitment computer science', 'Digital India Corporation recruitment', 'NHAI IT consultant recruitment',
];
// MNC / market hiring news
const MNC = ['AI engineer hiring India', 'TCS Accenture Infosys new AI roles', 'engineering manager hiring India',
  'React Native developer hiring India', 'GCC India hiring frontend'];

const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:14d')}&hl=en-IN&gl=IN&ceid=IN:en`;
const clean = s => (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (x, t) => clean((x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1]);
const get = async url => fetch(url, { headers: { 'User-Agent': 'job-radar/1.0' } });

async function rss(q, category) {
  try {
    const xml = await (await get(gnews(q))).text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
      title: tag(it, 'title'), link: tag(it, 'link'), source: tag(it, 'source') || 'News',
      date: new Date(tag(it, 'pubDate') || Date.now()).toISOString(), category, query: q,
    }));
  } catch (e) { console.error('RSS fail:', q, e.message); return []; }
}

async function api(url, map) {
  try { return map(await (await get(url)).json()).map(j => ({ ...j, category: 'remote' })); }
  catch (e) { console.error('API fail:', url, e.message); return []; }
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matches = t => SKILLS.filter(s => new RegExp(`\\b${esc(s)}\\b`, 'i').test(t));

(async () => {
  const batches = await Promise.all([
    ...GOVT.map(q => rss(q, 'govt')),
    ...MNC.map(q => rss(q, 'mnc')),
    api('https://remotive.com/api/remote-jobs?category=software-dev&limit=200', d => d.jobs.map(j => ({
      title: `${j.title} — ${j.company_name}`, link: j.url, date: j.publication_date, source: 'Remotive', tags: j.tags }))),
    api('https://remoteok.com/api', d => d.filter(j => j.position).map(j => ({
      title: `${j.position} — ${j.company}`, link: j.url, date: j.date, source: 'RemoteOK', tags: j.tags }))),
    api('https://www.arbeitnow.com/api/job-board-api', d => d.data.filter(j => j.remote).map(j => ({
      title: `${j.title} — ${j.company_name}`, link: j.url, date: new Date(j.created_at * 1000).toISOString(), source: 'Arbeitnow', tags: j.tags }))),
  ]);

  const fresh = batches.flat()
    .filter(j => j.title && j.link)
    .map(j => ({ ...j, match: matches(`${j.title} ${(j.tags || []).join(' ')}`) }))
    .filter(j => j.category !== 'remote' || j.match.length); // remote: only skill matches

  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).jobs || [] : [];
  const cutoff = Date.now() - KEEP_DAYS * 864e5, now = new Date().toISOString(), seen = new Map();
  for (const j of [...old, ...fresh]) {
    const key = j.title.toLowerCase().slice(0, 80);
    if (new Date(j.date) > cutoff && !seen.has(key)) seen.set(key, { ...j, firstSeen: j.firstSeen || now });
  }
  const jobs = [...seen.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
  fs.writeFileSync(OUT, JSON.stringify({ updated: now, jobs }));
  console.log(`Saved ${jobs.length} jobs (${fresh.length} fetched this run)`);
})();
