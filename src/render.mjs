// ---- base path support -----------------------------------------------
let BASE = '';
export function setBase(b){ BASE = b || ''; }
const u = p => BASE + p;
export const url = p => BASE + p;
// ----------------------------------------------------------------------

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export const titleCase = s => String(s||'').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());

export const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
};

function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

export function baseArt(slug){
  const rnd = mulberry32(hashStr(slug));
  const rects = [];
  (function split(r, d){
    if (d <= 0 || r.w < 28 || r.h < 28) { rects.push(r); return; }
    const vert = r.w > r.h ? rnd() > 0.22 : rnd() > 0.78;
    const t = 0.36 + rnd() * 0.28;
    if (vert) {
      const w1 = Math.round(r.w * t);
      split({ x:r.x, y:r.y, w:w1-1.6, h:r.h }, d-1);
      split({ x:r.x+w1+1.6, y:r.y, w:r.w-w1-1.6, h:r.h }, d-1);
    } else {
      const h1 = Math.round(r.h * t);
      split({ x:r.x, y:r.y, w:r.w, h:h1-1.6 }, d-1);
      split({ x:r.x, y:r.y+h1+1.6, w:r.w, h:r.h-h1-1.6 }, d-1);
    }
  })({ x:7, y:7, w:86, h:86 }, 4);

  let walls = '';
  for (const r of rects) {
    walls += `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="1.4" fill="#2b5236" stroke="#c9a75a" stroke-width="1.15" stroke-linejoin="round"/>`;
  }
  let dots = '';
  for (const r of rects) {
    const n = r.w > 24 && r.h > 24 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const cx = r.x + 4 + rnd() * (r.w - 8);
      const cy = r.y + 4 + rnd() * (r.h - 8);
      if (cx < 12 || cx > 88 || cy < 12 || cy > 88) continue;
      const air = rnd() > 0.62;
      dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.1" fill="${air ? '#7dd3fc' : '#f5b022'}" opacity="0.85"/>`;
    }
  }
  const thX = 50 + (rnd() * 8 - 4);
  const thY = 50 + (rnd() * 8 - 4);
  const id = hashStr(slug);
  return `<svg viewBox="0 0 100 100" role="img" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gr_${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f5c3c"/><stop offset="1" stop-color="#22422c"/></linearGradient><radialGradient id="th_${id}" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e09a12"/></radialGradient><radialGradient id="vig_${id}" cx="0.5" cy="0.45" r="0.72"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient></defs><rect width="100" height="100" fill="url(#gr_${id})"/>${walls}<rect x="${(thX-7.5).toFixed(1)}" y="${(thY-7.5).toFixed(1)}" width="15" height="15" rx="2" fill="url(#th_${id})" stroke="#8a5c07" stroke-width="1.1"/><path d="M${thX} ${thY-3.4} l3.2 3.2 -3.2 3.2 -3.2 -3.2z" fill="#5a3a04" opacity="0.85"/>${dots}<rect width="100" height="100" fill="url(#vig_${id})"/></svg>`;
}

export function layout({ seo, settings, categories, body, navActive = '' }){
  const navLinks = [
    [u('/war-bases/'),'War'], [u('/cwl-bases/'),'CWL'], [u('/farming-bases/'),'Farming'],
    [u('/trophy-bases/'),'Trophy'], [u('/anti-3-star-bases/'),'Anti-3-Star'],
    [u('/latest/'),'Latest'], [u('/submit-base/'),'Submit Base']
  ];
  const nav = navLinks.map(([h,l]) =>
    `<a href="${h}"${navActive === h ? ' class="active"' : ''}>${l}</a>`).join('');
  const footCats = categories.map(c => `<li><a href="${u('/' + c.slug + '/')}">${esc(c.short)} Bases</a></li>`).join('');
  const jsonLd = seo.jsonLd ? `<script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>` : '';
  const gsc = settings.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(settings.googleSiteVerification)}">` : '';
  const analytics = settings.analyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(settings.analyticsId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(settings.analyticsId)}');</script>` : '';
  const adsense = settings.adsensePublisherId
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(settings.adsensePublisherId)}" crossorigin="anonymous"></script><meta name="google-adsense-account" content="${esc(settings.adsensePublisherId)}">` : '';
  const logo = `<span class="logo-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3.2v6.1c0 5-3.4 9.2-8 10.7-4.6-1.5-8-5.7-8-10.7V5.2L12 2z" fill="url(#lg)" stroke="#a98cff" stroke-width="1.1" stroke-linejoin="round"/><defs><linearGradient id="lg" x1="4" y1="2" x2="20" y2="22"><stop stop-color="#8f6dff"/><stop offset="1" stop-color="#f5b022"/></linearGradient></defs></svg></span>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.description)}">
<link rel="canonical" href="${esc(seo.canonical)}">
<meta name="robots" content="${esc(seo.robots || 'index, follow, max-image-preview:large')}">
<meta property="og:type" content="${esc(seo.type || 'website')}">
<meta property="og:title" content="${esc(seo.title)}">
<meta property="og:description" content="${esc(seo.description)}">
<meta property="og:url" content="${esc(seo.canonical)}">
<meta property="og:image" content="${esc(seo.image || settings.domain + settings.ogImage)}">
<meta property="og:site_name" content="${esc(settings.siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(seo.title)}">
<meta name="twitter:description" content="${esc(seo.description)}">
<meta name="twitter:image" content="${esc(seo.image || settings.domain + settings.ogImage)}">
<link rel="icon" href="${u('/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${u('/styles.css')}">
<script>window.__BASE__=${JSON.stringify(BASE)};</script>
${gsc}${analytics}${adsense}
${jsonLd}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site">
  <div class="hwrap">
    <a class="logo" href="${u('/')}">${logo}<span class="logo-txt"><strong>${esc(settings.siteName)}</strong><span>TH18 Base Library</span></span></a>
    <nav class="main" aria-label="Primary">${nav}</nav>
    <div class="hbtns">
      <button class="icon-btn" id="searchBtn" aria-label="Search bases"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
    </div>
  </div>
</header>
<main id="main">${body}</main>
<footer class="site">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="${u('/')}" style="margin-bottom:14px">${logo}<span class="logo-txt"><strong>${esc(settings.siteName)}</strong><span>TH18 Base Library</span></span></a>
        <p style="color:var(--muted);font-size:13.5px;max-width:38ch;margin:0">${esc(settings.siteDescription)}</p>
      </div>
      <div><h4>Categories</h4><ul>${footCats}</ul></div>
      <div><h4>Browse</h4><ul><li><a href="${u('/latest/')}">Latest TH18 Bases</a></li><li><a href="${u('/popular/')}">Most Viewed</a></li><li><a href="${u('/submit-base/')}">Submit a Base</a></li></ul></div>
      <div><h4>Site</h4><ul><li><a href="${u('/about/')}">About</a></li><li><a href="${u('/contact/')}">Contact</a></li><li><a href="${u('/privacy-policy/')}">Privacy Policy</a></li><li><a href="${u('/terms/')}">Terms</a></li><li><a href="${u('/disclaimer/')}">Disclaimer</a></li></ul></div>
    </div>
    <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${esc(settings.siteName)}.</span><span>TH18 layouts only · Independent fan resource</span></div>
    <p class="disclaimer">${esc(settings.siteName)} is an independent, fan-made community resource. Not affiliated with, endorsed by, sponsored by, or officially connected to Supercell Oy. Clash of Clans is a trademark of Supercell Oy.</p>
  </div>
</footer>
<div class="overlay" id="searchOverlay" hidden>
  <div class="search-box">
    <input class="search-input" id="searchInput" type="search" placeholder="Search TH18 bases…" aria-label="Search bases">
    <div class="search-results" id="searchResults"></div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="${u('/app.js')}" defer></script>
</body>
</html>`;
}

export function crumbs(items){
  const parts = items.map((it, i) => {
    const last = i === items.length - 1;
    if (last || !it.href) return `<span class="cur">${esc(it.label)}</span>`;
    return `<a href="${it.href}">${esc(it.label)}</a><span class="sep">›</span>`;
  });
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('')}</nav>`;
}

export function baseCard(b, cats){
  const cat = cats.find(c => c.key === b.category);
  const img = b.image ? u(b.image) : u(`/images/bases/${b.slug}.svg`);
  const href = u(`/${b.slug}/`);
  return `<article class="card">
    <div class="card-thumb">
      <img src="${esc(img)}" alt="${esc(b.name)} layout" width="600" height="600" loading="lazy" decoding="async">
      <span class="badge">${esc(cat ? cat.short : b.category)}</span>
      ${b.featured ? '<span class="badge alt">★ Featured</span>' : ''}
    </div>
    <div class="card-body">
      <h3 class="card-title"><a href="${href}">${esc(b.name)}</a></h3>
      <div class="card-meta">
        <span class="chip th">TH18</span>
        ${b.subCategory && b.subCategory !== 'general' ? `<span class="chip">${esc(titleCase(b.subCategory))}</span>` : ''}
        <span class="chip date">Added ${fmtDate(b.dateAdded)}</span>
      </div>
      <div class="card-actions">
        <a class="btn btn-sm" href="${href}">View Base</a>
        ${b.clashLink
          ? `<button class="btn btn-sm btn-primary" data-copy="${esc(b.clashLink)}">Copy Layout</button>`
          : `<button class="btn btn-sm" disabled title="No valid Clash link">No Link</button>`}
      </div>
    </div>
  </article>`;
}

export function adSlot(name){
  return `<div class="ad-slot" data-slot="${esc(name)}" aria-hidden="true">Ad slot · ${esc(name)}</div>`;
}
