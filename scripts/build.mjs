import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, crumbs, baseCard, baseArt, adSlot, esc, titleCase, fmtDate } from '../src/render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');

const readJSON = async p => JSON.parse(await fs.readFile(p, 'utf8'));

async function writePage(urlPath, html){
  const clean = urlPath.replace(/^\/|\/$/g, '');
  const dir = clean ? path.join(DIST, clean) : DIST;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), html, 'utf8');
}

async function copyDir(src, dest){
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries){
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

function seoHome(settings){
  return {
    title: settings.defaultSeoTitle,
    description: settings.defaultSeoDescription,
    canonical: settings.domain + '/',
    jsonLd: { '@context':'https://schema.org', '@graph': [
      { '@type':'WebSite', '@id': settings.domain + '/#website', url: settings.domain + '/',
        name: settings.siteName, description: settings.siteDescription, inLanguage: 'en',
        publisher: { '@id': settings.domain + '/#organization' } },
      { '@type':'Organization', '@id': settings.domain + '/#organization',
        name: settings.siteName, url: settings.domain + '/',
        description: 'Independent fan resource publishing Town Hall 18 base layouts for Clash of Clans.' }
    ]}
  };
}
function seoCategory(settings, c){
  return {
    title: `${c.name} — Copy Layout | ${settings.siteName}`,
    description: c.intro.slice(0, 155).replace(/\s+\S*$/, '') + '…',
    canonical: `${settings.domain}/${c.slug}/`,
    jsonLd: { '@context':'https://schema.org', '@graph': [
      { '@type':'CollectionPage', name: c.name, url: `${settings.domain}/${c.slug}/`,
        description: c.intro, isPartOf: { '@id': settings.domain + '/#website' } },
      { '@type':'BreadcrumbList', itemListElement: [
        { '@type':'ListItem', position:1, name:'Home', item: settings.domain + '/' },
        { '@type':'ListItem', position:2, name:c.name, item: `${settings.domain}/${c.slug}/` }
      ]}
    ]}
  };
}
function seoBase(settings, b, cat){
  const title = (b.seo?.title) || `${b.name} — Copy Layout | ${settings.siteName}`;
  const description = (b.seo?.description) || (b.description.slice(0, 155).replace(/\s+\S*$/, '') + '…');
  const canonical = (b.seo?.canonical) || `${settings.domain}/${b.slug}/`;
  return {
    title, description, canonical, type: 'article',
    image: b.seo?.ogImage || `${settings.domain}/images/bases/${b.slug}.webp`,
    jsonLd: { '@context':'https://schema.org', '@graph': [
      { '@type':'WebPage', '@id': canonical, url: canonical, name: title, description,
        inLanguage: 'en',
        primaryImageOfPage: { '@type':'ImageObject', url: `${settings.domain}/images/bases/${b.slug}.webp`, caption: b.name + ' layout' },
        isPartOf: { '@id': settings.domain + '/#website' },
        datePublished: b.dateAdded, dateModified: b.updatedAt || b.dateAdded },
      { '@type':'BreadcrumbList', itemListElement: [
        { '@type':'ListItem', position:1, name:'Home', item: settings.domain + '/' },
        { '@type':'ListItem', position:2, name:cat.name, item: `${settings.domain}/${cat.slug}/` },
        { '@type':'ListItem', position:3, name:b.name, item: canonical }
      ]}
    ]}
  };
}

function bodyHome(settings, cats, bases){
  const latest = bases.slice().sort((a,b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 8);
  const featured = bases.filter(b => b.featured).slice(0, 4);
  const catSections = ['war','cwl','farming','trophy'].map(k => {
    const c = cats.find(x => x.key === k);
    const list = bases.filter(b => b.category === k).slice(0, 4);
    if (!list.length) return '';
    return `<section><div class="sec-head"><div><div class="eyebrow">${c.icon} Category</div><h2>${esc(c.name)}</h2></div><a class="sec-link" href="/${c.slug}/">View all ${esc(c.short)} bases →</a></div><div class="grid">${list.map(b => baseCard(b, cats)).join('')}</div></section>`;
  }).join('');
  return `
  <div class="hero"><div class="wrap"><div class="hero-in">
    <div class="eyebrow">TH18 Base Library · Clash of Clans</div>
    <h1>TH18 Bases for <span class="grad">Clash of Clans</span></h1>
    <p class="lead">${esc(settings.siteDescription)} Every base has its own page with layout notes, tags and related designs.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/war-bases/">⚔️ Explore TH18 War Bases</a>
      <a class="btn" href="/latest/">🆕 Latest Bases</a>
      <a class="btn btn-ghost" href="/submit-base/">Submit Your Base</a>
    </div>
    <div class="hero-facts">
      <div class="fact"><b>${cats.length}</b><span>TH18 Categories</span></div>
      <div class="fact"><b>TH18</b><span>Exclusive Focus</span></div>
      <div class="fact"><b>1-Tap</b><span>Copy Layout</span></div>
    </div>
  </div></div></div>
  <div class="wrap">
    ${adSlot('AdSlotTop')}
    <section><div class="sec-head"><div><div class="eyebrow">Recently Added</div><h2>Latest TH18 Bases</h2></div><a class="sec-link" href="/latest/">View all →</a></div><div class="grid">${latest.map(b => baseCard(b, cats)).join('')}</div></section>
    ${featured.length ? `<section><div class="sec-head"><div><div class="eyebrow">Hand-picked</div><h2>Featured TH18 Bases</h2></div></div><div class="grid">${featured.map(b => baseCard(b, cats)).join('')}</div></section>` : ''}
    ${catSections}
    <section><div class="sec-head"><div><div class="eyebrow">Browse</div><h2>TH18 Base Categories</h2></div></div><div class="grid grid-4">${cats.map(c => { const n = bases.filter(b => b.category === c.key).length; return `<a class="cat-tile" href="/${c.slug}/"><span class="cat-ico" aria-hidden="true">${c.icon}</span><span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p></span><span class="cat-count">${n} base${n===1?'':'s'}</span></a>`; }).join('')}</div></section>
    ${adSlot('AdSlotBetweenContent')}
    <section><div class="sec-head"><div><div class="eyebrow">Why us</div><h2>Why Clash Legend Bases?</h2></div></div><div class="features">
      <div class="feature"><div class="fi">🎯</div><h3>TH18 Only</h3><p>Every layout, guide and category is focused on Town Hall 18 — no dilution.</p></div>
      <div class="feature"><div class="fi">📋</div><h3>Real Copy Links</h3><p>Copy links you can paste into Clash of Clans. If there is no valid link, the button is not shown.</p></div>
      <div class="feature"><div class="fi">📝</div><h3>Layout Notes</h3><p>Bases are published with notes explaining what the layout defends against.</p></div>
      <div class="feature"><div class="fi">⚡</div><h3>Fast &amp; Static</h3><p>Pre-rendered HTML with almost no JavaScript.</p></div>
    </div></section>
    <section><div class="sec-head"><div><div class="eyebrow">FAQ</div><h2>TH18 Base FAQ</h2></div></div><div class="faq">
      <details><summary>What is a TH18 war base?</summary><div class="faq-a">A TH18 war base is a layout designed for Clan Wars at Town Hall 18, prioritising Town Hall protection over resources.</div></details>
      <details><summary>How do I copy a TH18 base?</summary><div class="faq-a">Open the base page and press <strong>Copy Layout</strong>, then paste it in Clash of Clans.</div></details>
      <details><summary>What is an anti-3-star base?</summary><div class="faq-a">A layout designed to make a three-star attack very difficult, even if it concedes two stars.</div></details>
      <details><summary>Are these bases free to use?</summary><div class="faq-a">Yes — all published layouts are free to view and copy.</div></details>
    </div></section>
    <section><div class="form-card" style="text-align:center;padding:36px 24px"><div class="eyebrow">Community</div><h2 style="margin-bottom:8px">Submit Your TH18 Base</h2><p style="color:var(--muted);max-width:56ch;margin:0 auto 20px">Send in your TH18 layout. Submissions enter a review queue — nothing is published automatically.</p><a class="btn btn-primary" href="/submit-base/">Submit a Base</a></div></section>
  </div>`;
}

function bodyCategory(settings, cats, bases, c){
  const list = bases.filter(b => b.category === c.key).sort((a,b) => b.dateAdded.localeCompare(a.dateAdded));
  const related = cats.filter(x => x.key !== c.key).slice(0, 4);
  return `<div class="wrap">${crumbs([{label:'Home', href:'/'}, {label:c.name}])}
    <section style="padding-top:22px">
      <div class="eyebrow">${c.icon} TH18 Category</div>
      <h1>${esc(c.name)}</h1>
      <p class="lead" style="margin-top:14px">${esc(c.intro)}</p>
      ${adSlot('AdSlotTop')}
      <div class="grid">${list.length ? list.map(b => baseCard(b, cats)).join('') : '<div class="empty">No bases published in this category yet.</div>'}</div>
      ${adSlot('AdSlotRelatedBases')}
      <h2 style="margin:34px 0 16px">Other TH18 Categories</h2>
      <div class="grid grid-4">${related.map(r => `<a class="cat-tile" href="/${r.slug}/"><span class="cat-ico" aria-hidden="true">${r.icon}</span><span><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p></span></a>`).join('')}</div>
      <h2 style="margin:34px 0 16px">${esc(c.short)} Base FAQ</h2>
      <div class="faq">
        <details><summary>How many TH18 ${esc(c.short.toLowerCase())} bases are available?</summary><div class="faq-a">There are currently ${list.length} published TH18 ${esc(c.short.toLowerCase())} layouts in this category.</div></details>
        <details><summary>Are these layouts up to date for TH18?</summary><div class="faq-a">Every layout in this category is built for Town Hall 18.</div></details>
        <details><summary>Can I submit my own ${esc(c.short.toLowerCase())} base?</summary><div class="faq-a">Yes — use the <a href="/submit-base/">submit page</a>.</div></details>
      </div>
    </section>
  </div>`;
}

function bodyBase(settings, cats, bases, b){
  const c = cats.find(x => x.key === b.category);
  const related = bases.filter(x => x.slug !== b.slug && x.category === b.category).slice(0, 4);
  const more = bases.filter(x => x.slug !== b.slug && x.category !== b.category).slice(0, 4);
  const img = b.image || `/images/bases/${b.slug}.svg`;
  return `<div class="wrap">${crumbs([{label:'Home', href:'/'}, {label:c.name, href:`/${c.slug}/`}, {label:b.name}])}
    <section style="padding-top:18px">
      <div class="eyebrow">${c.icon} ${esc(c.name)}</div>
      <h1>${esc(b.name)}</h1>
      <div class="base-layout">
        <div>
          <div class="base-shot"><img src="${esc(img)}" alt="${esc(b.name)} layout" width="800" height="800" decoding="async"></div>
          <div class="action-bar">
            ${b.clashLink
              ? `<button class="btn btn-primary" data-copy="${esc(b.clashLink)}">📋 Copy Layout</button><a class="btn" href="${esc(b.clashLink)}" target="_blank" rel="noopener nofollow">⚔️ Open in Clash of Clans</a>`
              : `<button class="btn" disabled title="No valid Clash link provided">📋 Copy Layout (no link)</button>`}
          </div>
        </div>
        <div>
          <table class="info-table">
            <tr><th>Town Hall</th><td>TH18</td></tr>
            <tr><th>Category</th><td><a href="/${c.slug}/" style="color:var(--gold)">${esc(c.name)}</a></td></tr>
            <tr><th>Type</th><td>${esc(titleCase(b.subCategory || 'General'))}</td></tr>
            <tr><th>Added</th><td>${fmtDate(b.dateAdded)}</td></tr>
            <tr><th>Updated</th><td>${fmtDate(b.updatedAt || b.dateAdded)}</td></tr>
            <tr><th>Clash Link</th><td>${b.clashLink ? '✅ Available' : '— Not provided'}</td></tr>
          </table>
          <h2 style="margin:26px 0 10px;font-size:19px">Description</h2>
          <p style="color:#c3cddd;font-size:14.5px;margin:0">${esc(b.description)}</p>
          ${(b.strategyNotes||[]).length ? `<h2 style="margin:26px 0 10px;font-size:19px">Layout &amp; Strategy Notes</h2><ul class="notes">${b.strategyNotes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
          <h2 style="margin:26px 0 10px;font-size:19px">Tags</h2>
          <div class="tagrow">${(b.tags||[]).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
      </div>
    </section>
    ${adSlot('AdSlotAfterBase')}
    ${related.length ? `<section><div class="sec-head"><div><div class="eyebrow">Related</div><h2>More TH18 ${esc(c.short)} Bases</h2></div><a class="sec-link" href="/${c.slug}/">View all →</a></div><div class="grid">${related.map(x => baseCard(x, cats)).join('')}</div></section>` : ''}
    ${more.length ? `<section><div class="sec-head"><div><div class="eyebrow">Browse</div><h2>More TH18 Bases</h2></div><a class="sec-link" href="/">All categories →</a></div><div class="grid">${more.map(x => baseCard(x, cats)).join('')}</div></section>` : ''}
  </div>`;
}

function bodyList(settings, cats, bases, kind){
  let list, title, eyebrow, intro;
  if (kind === 'latest'){
    list = bases.slice().sort((a,b) => b.dateAdded.localeCompare(a.dateAdded));
    title = 'Latest TH18 Bases'; eyebrow = 'Recently Added';
    intro = 'The newest TH18 layouts published on Clash Legend Bases, ordered by date added.';
  } else {
    list = bases.slice().sort((a,b) => (b.views||0) - (a.views||0));
    title = 'Most Viewed TH18 Bases'; eyebrow = 'Popular';
    intro = 'TH18 layouts ranked by real page views.';
  }
  return `<div class="wrap">${crumbs([{label:'Home', href:'/'}, {label:title}])}<section style="padding-top:22px"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="lead" style="margin-top:14px">${intro}</p>${adSlot('AdSlotTop')}<div class="grid">${list.length ? list.map(b => baseCard(b, cats)).join('') : '<div class="empty">Nothing here yet.</div>'}</div></section></div>`;
}

function bodySubmit(settings, cats){
  return `<div class="wrap">${crumbs([{label:'Home', href:'/'}, {label:'Submit a Base'}])}<section style="padding-top:22px;max-width:720px"><div class="eyebrow">Community</div><h1>Submit a TH18 Base</h1><p class="lead" style="margin-top:14px;margin-bottom:26px">Send us your Town Hall 18 layout. Submissions enter a review queue — nothing is published automatically.</p>
    <form id="submitForm" class="form-card">
      <div class="grid2">
        <div class="field"><label for="s-name">Base name *</label><input class="input" id="s-name" name="name" required></div>
        <div class="field"><label for="s-cat">Category *</label><select class="input" id="s-cat" name="category">${cats.map(c => `<option value="${c.key}">${esc(c.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="s-link">Clash layout link *</label><input class="input" id="s-link" name="clash_link" required placeholder="https://link.clashofclans.com/..."></div>
      <div class="field"><label for="s-img">Screenshot URL (optional)</label><input class="input" id="s-img" name="image_url" placeholder="https://..."></div>
      <div class="field"><label for="s-desc">Description *</label><textarea class="input" id="s-desc" name="description" required></textarea></div>
      <div class="field"><label for="s-user">Your username (optional)</label><input class="input" id="s-user" name="username"></div>
      <button class="btn btn-primary btn-block" type="submit">Submit Base for Review</button>
      <p id="submitStatus" style="font-size:13px;margin:12px 0 0;color:var(--muted2)"></p>
    </form></section></div>`;
}

const STATIC_PAGES = {
  about: { title: 'About Clash Legend Bases', eyebrow: 'About', h1: 'About Clash Legend Bases',
    body: `<p>Clash Legend Bases is an independent, fan-run resource dedicated entirely to Town Hall 18 base layouts in Clash of Clans.</p><h2>What we do</h2><p>We collect, organise and publish TH18 base layouts across eight categories. Each base gets its own page with layout notes, tags, a copy link and related designs.</p><h2>Why TH18 only?</h2><p>Most base sites cover every Town Hall level and end up shallow everywhere. We focus exclusively on Town Hall 18.</p><h2>How bases are published</h2><p>Community submissions enter a pending queue and are only published after an editor has checked the layout link, screenshot and description.</p><h2>Independence</h2><p>Clash Legend Bases is not affiliated with Supercell.</p>` },
  contact: { title: 'Contact', eyebrow: 'Contact', h1: 'Contact',
    body: `<p>Questions, corrections, takedown requests or partnership enquiries — email us at <a href="mailto:contact@clashlegendbases.online">contact@clashlegendbases.online</a>.</p>` },
  'privacy-policy': { title: 'Privacy Policy', eyebrow: 'Legal', h1: 'Privacy Policy',
    body: `<p>Last updated: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p><h2>1. Information we collect</h2><p>We collect anonymised analytics data and any information you voluntarily submit through forms.</p><h2>2. Cookies</h2><p>We use cookies for analytics and, if advertising is enabled, for advertising personalisation.</p><h2>3. Analytics</h2><p>We use Google Analytics to understand how visitors use the site.</p><h2>4. Advertising</h2><p>If Google AdSense is enabled, Google and its partners may use cookies to serve ads.</p><h2>5. Base submissions</h2><p>If you submit a base, we store the details you provide so we can review it.</p><h2>6. Data sharing</h2><p>We do not sell personal information.</p><h2>7. Your rights</h2><p>You may have the right to access, correct or delete personal data.</p><h2>8. Children</h2><p>Not directed at children under 13.</p><h2>9. Changes</h2><p>We may update this policy.</p><h2>10. Contact</h2><p><a href="mailto:contact@clashlegendbases.online">contact@clashlegendbases.online</a></p>` },
  terms: { title: 'Terms of Use', eyebrow: 'Legal', h1: 'Terms of Use',
    body: `<p>By using Clash Legend Bases you agree to these terms.</p><h2>1. Use of the site</h2><p>Personal, non-commercial use.</p><h2>2. User submissions</h2><p>By submitting a base you confirm you have the right to share it.</p><h2>3. Intellectual property</h2><p>Site design and original text belong to Clash Legend Bases.</p><h2>4. No warranty</h2><p>Layouts are provided "as is".</p><h2>5. Limitation of liability</h2><p>We are not liable for losses arising from use of the site.</p><h2>6. Changes</h2><p>We may update these terms at any time.</p>` },
  disclaimer: { title: 'Disclaimer', eyebrow: 'Legal', h1: 'Disclaimer',
    body: `<div class="notice warn"><strong>Clash Legend Bases is not affiliated with Supercell.</strong></div><h2>Supercell notice</h2><p>This website is an independent, fan-made community resource. Not affiliated with, endorsed by, sponsored by, or officially connected to Supercell Oy. Clash of Clans is a trademark of Supercell Oy.</p><h2>Content</h2><p>Base layouts published here are community submissions or original layouts.</p><h2>Accuracy</h2><p>We make no guarantees about defensive results.</p>` }
};

function sitemap(settings, cats, bases){
  const urls = [
    { loc: settings.domain + '/', priority: '1.0', changefreq: 'daily' },
    { loc: settings.domain + '/latest/', priority: '0.9', changefreq: 'daily' },
    { loc: settings.domain + '/popular/', priority: '0.8', changefreq: 'weekly' },
    { loc: settings.domain + '/submit-base/', priority: '0.6', changefreq: 'monthly' },
    ...['about','contact','privacy-policy','terms','disclaimer'].map(s => ({ loc: `${settings.domain}/${s}/`, priority: '0.4', changefreq: 'yearly' })),
    ...cats.map(c => ({ loc: `${settings.domain}/${c.slug}/`, priority: '0.9', changefreq: 'weekly' })),
    ...bases.map(b => ({ loc: `${settings.domain}/${b.slug}/`, priority: '0.8', changefreq: 'monthly', lastmod: b.updatedAt || b.dateAdded }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>`;
}

function robots(settings){
  return `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /*?q=\nDisallow: /search\n\nSitemap: ${settings.domain}/sitemap.xml\n`;
}

function body404(settings, cats, bases){
  const latest = bases.slice(0, 3);
  return `<div class="wrap"><section style="text-align:center;padding:70px 0 40px;max-width:640px;margin:0 auto"><div style="font-size:56px;line-height:1;margin-bottom:12px">🏚️</div><h1>Base not found</h1><p class="lead" style="margin:14px auto 26px">That layout does not exist, has been unpublished, or the URL is incorrect.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:34px"><a class="btn btn-primary" href="/war-bases/">⚔️ TH18 War Bases</a><a class="btn" href="/latest/">🆕 Latest Bases</a><a class="btn btn-ghost" href="/">Homepage</a></div></section><section style="padding-top:0"><div class="sec-head"><div><div class="eyebrow">Try these</div><h2>Latest TH18 Bases</h2></div><a class="sec-link" href="/latest/">View all →</a></div><div class="grid">${latest.map(b => baseCard(b, cats)).join('')}</div></section></div>`;
}

async function main(){
  const settings = await readJSON(path.join(DATA, 'settings.json'));
  const cats = await readJSON(path.join(DATA, 'categories.json'));
  const allBases = await readJSON(path.join(DATA, 'bases.json'));
  const bases = allBases.filter(b => b.published !== false);
  console.log(`Build: ${bases.length} published / ${allBases.length} total bases`);

  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  await writePage('/', layout({ seo: seoHome(settings), settings, categories: cats, body: bodyHome(settings, cats, bases) }));
  for (const c of cats) {
    await writePage(`/${c.slug}/`, layout({ seo: seoCategory(settings, c), settings, categories: cats, body: bodyCategory(settings, cats, bases, c), navActive: `/${c.slug}/` }));
  }
  for (const b of bases) {
    const c = cats.find(x => x.key === b.category);
    if (!c) { console.warn(`Skipping base ${b.slug}: unknown category ${b.category}`); continue; }
    await writePage(`/${b.slug}/`, layout({ seo: seoBase(settings, b, c), settings, categories: cats, body: bodyBase(settings, cats, bases, b) }));
  }
  await writePage('/latest/', layout({
    seo: { title: `Latest TH18 Bases | ${settings.siteName}`, description: 'The newest TH18 base layouts on Clash Legend Bases.', canonical: `${settings.domain}/latest/`,
      jsonLd: { '@context':'https://schema.org', '@type':'CollectionPage', name:'Latest TH18 Bases', url: `${settings.domain}/latest/` } },
    settings, categories: cats, body: bodyList(settings, cats, bases, 'latest'), navActive: '/latest/' }));
  await writePage('/popular/', layout({
    seo: { title: `Most Viewed TH18 Bases | ${settings.siteName}`, description: 'TH18 base layouts ranked by real page views.', canonical: `${settings.domain}/popular/`,
      jsonLd: { '@context':'https://schema.org', '@type':'CollectionPage', name:'Most Viewed TH18 Bases', url: `${settings.domain}/popular/` } },
    settings, categories: cats, body: bodyList(settings, cats, bases, 'popular') }));
  await writePage('/submit-base/', layout({
    seo: { title: `Submit a TH18 Base | ${settings.siteName}`, description: 'Submit your Town Hall 18 base layout to Clash Legend Bases.', canonical: `${settings.domain}/submit-base/`,
      jsonLd: { '@context':'https://schema.org', '@type':'WebPage', name:'Submit a TH18 Base', url: `${settings.domain}/submit-base/` } },
    settings, categories: cats, body: bodySubmit(settings, cats), navActive: '/submit-base/' }));

  for (const slug of Object.keys(STATIC_PAGES)){
    const p = STATIC_PAGES[slug];
    await writePage(`/${slug}/`, layout({
      seo: { title: `${p.title} | ${settings.siteName}`, description: p.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,155) + '…',
        canonical: `${settings.domain}/${slug}/`, jsonLd: { '@context':'https://schema.org', '@type':'WebPage', name: p.title, url: `${settings.domain}/${slug}/` } },
      settings, categories: cats, body: bodyStatic(settings, slug, STATIC_PAGES) }));
  }

  const notFound = layout({
    seo: { title: `Base Not Found (404) | ${settings.siteName}`, description: 'The TH18 base you requested could not be found.', canonical: `${settings.domain}/404.html`, robots: 'noindex, follow' },
    settings, categories: cats, body: body404(settings, cats, bases) });
  await fs.writeFile(path.join(DIST, '404.html'), notFound, 'utf8');

  await fs.writeFile(path.join(DIST, 'robots.txt'), robots(settings), 'utf8');
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap(settings, cats, bases), 'utf8');
  await fs.writeFile(path.join(DIST, 'CNAME'), new URL(settings.domain).hostname + '\n', 'utf8');

  const searchIndex = bases.map(b => ({ slug: b.slug, name: b.name, category: b.category, categoryName: cats.find(c => c.key === b.category)?.name || b.category, tags: b.tags || [] }));
  await fs.writeFile(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex), 'utf8');

  const supaCfg = { url: process.env.SUPABASE_URL || '', anonKey: process.env.SUPABASE_ANON_KEY || '' };
  await fs.writeFile(path.join(DIST, 'supabase-config.json'), JSON.stringify(supaCfg), 'utf8');

  await copyDir(PUBLIC, DIST);

  const artDir = path.join(DIST, 'images', 'bases');
  await fs.mkdir(artDir, { recursive: true });
  for (const b of bases) {
    if (b.image) continue;
    await fs.writeFile(path.join(artDir, `${b.slug}.svg`), baseArt(b.slug), 'utf8');
  }

  console.log(`✅ Build complete → dist/`);
}

function bodyStatic(settings, slug, pages){
  const p = pages[slug];
  return `<div class="wrap">${crumbs([{label:'Home', href:'/'}, {label:p.h1}])}<section style="padding-top:22px;max-width:800px"><div class="eyebrow">${p.eyebrow}</div><h1>${esc(p.h1)}</h1><div class="prose" style="margin-top:22px">${p.body}</div></section></div>`;
}

main().catch(err => { console.error(err); process.exit(1); });
