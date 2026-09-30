(function(){
  'use strict';
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    const link = btn.dataset.copy;
    if (!link) { toast('No Clash layout link available.', true); return; }
    const original = btn.innerHTML;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(link); ok = true; }
      else {
        const ta = document.createElement('textarea');
        ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch { ok = false; }
    btn.innerHTML = ok ? '✓ Copied!' : '✕ Copy failed';
    toast(ok ? 'Layout link copied.' : 'Could not access clipboard — copy manually.', !ok);
    setTimeout(() => { btn.innerHTML = original; }, 1800);
  });

  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let index = null;
  async function loadIndex(){ if (index) return index; const res = await fetch('/search-index.json'); index = await res.json(); return index; }
  function openSearch(){ overlay.hidden = false; input.value = ''; renderResults(''); setTimeout(() => input.focus(), 30); }
  function closeSearch(){ overlay.hidden = true; }
  document.getElementById('searchBtn')?.addEventListener('click', openSearch);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  input?.addEventListener('input', () => renderResults(input.value));
  async function renderResults(q){
    const idx = await loadIndex();
    q = q.trim().toLowerCase();
    const hits = q ? idx.filter(b => b.name.toLowerCase().includes(q) || b.slug.includes(q) || b.category.includes(q) || (b.tags||[]).join(' ').toLowerCase().includes(q)) : idx.slice(0, 12);
    if (!hits.length){ results.innerHTML = '<div class="empty">No TH18 bases match that search.</div>'; return; }
    results.innerHTML = hits.slice(0, 12).map(b => `<a class="sres" href="/${b.slug}/"><div class="thumb"><img src="/images/bases/${b.slug}.svg" alt="" loading="lazy"></div><div><div class="t">${esc(b.name)}</div><div class="m">${esc(b.categoryName || b.category)}</div></div></a>`).join('');
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  let toastTimer;
  window.toast = function(msg, isErr){
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.className = 'toast on' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = 'toast', 2400);
  };

  const form = document.getElementById('submitForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('submitStatus');
    status.textContent = 'Submitting…';
    const payload = Object.fromEntries(new FormData(form).entries());
    let cfg = {};
    try { cfg = await (await fetch('/supabase-config.json')).json(); } catch {}
    if (!cfg.url || !cfg.anonKey){ status.textContent = 'Submissions are not configured on this build yet.'; return; }
    try {
      const res = await fetch(`${cfg.url}/rest/v1/submissions`, {
        method: 'POST',
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      status.textContent = '✅ Submitted. An editor will review it before it is published.';
      form.reset();
    } catch (err){ status.textContent = '❌ Submission failed. Please try again later.'; }
  });
})();
