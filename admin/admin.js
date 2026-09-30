import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const cfg = window.__ADMIN_CONFIG__ || {};
let sb = null, session = null, view = 'dashboard';
let bases = [], cats = [], subs = [], settings = {}, editing = null;
const $app = document.getElementById('app');

function toast(msg, kind){
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast on ' + (kind || '');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = 'toast', 2600);
}
window.toast = toast;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');

async function boot(){
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey){
    $app.innerHTML = `<div class="login"><div class="notice err"><strong>Admin not configured.</strong> Add <code>/admin/config.js</code> with <code>supabaseUrl</code> and <code>supabaseAnonKey</code>.</div></div>`;
    return;
  }
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const { data: { session: s } } = await sb.auth.getSession();
  session = s;
  sb.auth.onAuthStateChange((_e, s2) => { session = s2; render(); });
  render();
}

function renderLogin(){
  $app.innerHTML = `<form class="login" id="loginForm"><h1>Admin Sign In</h1><p>Clash Legend Bases · content management</p>
    <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="pass">Password</label><input class="input" id="pass" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary btn-block" type="submit" id="loginBtn">Sign In</button>
    <p id="loginMsg" style="font-size:12.5px;color:var(--muted2);margin:14px 0 0;text-align:center"></p></form>`;
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('loginMsg'); const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const { error } = await sb.auth.signInWithPassword({ email: document.getElementById('email').value, password: document.getElementById('pass').value });
    if (error){ msg.textContent = error.message; btn.disabled = false; btn.textContent = 'Sign In'; }
  });
}
async function signOut(){ await sb.auth.signOut(); session = null; render(); }

async function loadAll(){
  const [b, c, s, st] = await Promise.all([
    sb.from('bases').select('*').order('date_added', { ascending: false }),
    sb.from('categories').select('*').order('sort_order', { ascending: true }),
    sb.from('submissions').select('*').order('created_at', { ascending: false }),
    sb.from('settings').select('data').eq('id', 1).maybeSingle()
  ]);
  bases = b.data || []; cats = c.data || []; subs = s.data || []; settings = st.data?.data || {};
}

async function triggerRebuild(){
  if (!cfg.rebuildWebhook){ toast('No rebuild webhook configured.', 'err'); return; }
  try {
    const res = await fetch(cfg.rebuildWebhook, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    toast('Rebuild triggered. Site will update in ~1 minute.', 'ok');
  } catch (e){ toast('Failed to trigger rebuild: ' + e.message, 'err'); }
}

async function render(){
  if (!session){ renderLogin(); return; }
  await loadAll();
  if (view === 'dashboard') return renderDashboard();
  if (view === 'bases') return renderBases();
  if (view === 'editor') return renderEditor(editing);
  if (view === 'subs') return renderSubs();
  if (view === 'categories') return renderCategories();
  if (view === 'settings') return renderSettings();
}
const setView = v => { view = v; render(); };
const editBase = b => { editing = b; view = 'editor'; render(); };
const newBase = () => { editing = { id:null, slug:'', name:'', category:'war', sub_category:'general', clash_link:'', image:'', description:'', strategy_notes:[], tags:[], featured:false, published:true, date_added:new Date().toISOString().slice(0,10), seo_title:'', seo_description:'', og_image:'' }; view='editor'; render(); };

function shell(body){
  const nav = [['dashboard','📊 Dashboard'],['bases','🗂️ Bases'],['subs','📥 Submissions'],['categories','🏷️ Categories'],['settings','⚙️ Settings']];
  const pending = subs.filter(s => s.status === 'pending').length;
  return `<div class="shell"><aside class="side"><span class="brand">Admin · TH18 Library</span>
    ${nav.map(([k,l]) => `<a class="${view===k||(k==='bases'&&view==='editor')?'on':''}" data-nav="${k}">${l}${k==='subs' && pending ? ` <span class="pill pend" style="margin-left:auto">${pending}</span>`:''}</a>`).join('')}
    <a data-act="rebuild" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">🔄 Rebuild site</a>
    <a data-act="signout">🚪 Sign out</a></aside><main class="main">${body}</main></div>`;
}
function attachShell(){
  document.querySelectorAll('[data-nav]').forEach(a => a.onclick = () => setView(a.dataset.nav));
  document.querySelector('[data-act="rebuild"]')?.addEventListener('click', triggerRebuild);
  document.querySelector('[data-act="signout"]')?.addEventListener('click', signOut);
}

function renderDashboard(){
  const published = bases.filter(b => b.published).length;
  const featured = bases.filter(b => b.featured).length;
  const pending = subs.filter(s => s.status === 'pending').length;
  const recent = bases.slice(0, 5);
  $app.innerHTML = shell(`
    <h1>Dashboard</h1><p class="sub">TH18 library overview.</p>
    <div class="stat-grid">
      <div class="stat"><div class="n">${bases.length}</div><div class="l">Total Bases</div></div>
      <div class="stat green"><div class="n">${published}</div><div class="l">Published</div></div>
      <div class="stat"><div class="n">${bases.length - published}</div><div class="l">Drafts</div></div>
      <div class="stat gold"><div class="n">${featured}</div><div class="l">Featured</div></div>
      <div class="stat violet"><div class="n">${cats.length}</div><div class="l">Categories</div></div>
      <div class="stat"><div class="n">${pending}</div><div class="l">Pending</div></div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Recent Bases</h3><div class="row-actions"><button class="mini gold" data-new>+ New Base</button><button class="mini" data-goto="subs">Submissions</button></div></div>
      <div class="panel-body pad0"><table class="data"><thead><tr><th>Base</th><th>Category</th><th>Added</th><th>Status</th><th></th></tr></thead><tbody>
        ${recent.length ? recent.map(b => `<tr><td><strong>${esc(b.name)}</strong><br><span style="color:var(--muted2);font-size:11.5px">/${esc(b.slug)}/</span></td><td>${esc(b.category)}</td><td>${esc(b.date_added)}</td><td>${b.published ? '<span class="pill live">Live</span>' : '<span class="pill draft">Draft</span>'}</td><td class="row-actions"><button class="mini" data-edit="${b.id}">Edit</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted2);padding:30px">No bases yet.</td></tr>'}
      </tbody></table></div></div>`);
  attachShell();
  document.querySelector('[data-new]')?.addEventListener('click', newBase);
  document.querySelector('[data-goto="subs"]')?.addEventListener('click', () => setView('subs'));
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => editBase(bases.find(b => b.id === el.dataset.edit)));
}

function renderBases(){
  $app.innerHTML = shell(`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
      <div><h1>Base Manager</h1><p class="sub">${bases.length} bases · ${bases.filter(b => b.published).length} published</p></div>
      <button class="btn btn-primary btn-sm" data-new>+ New Base</button>
    </div>
    <div class="panel"><div class="panel-body pad0"><table class="data"><thead><tr><th>Base</th><th>Category</th><th>Added</th><th>Status</th><th>Featured</th><th></th></tr></thead><tbody>
      ${bases.length ? bases.map(b => `<tr><td><strong>${esc(b.name)}</strong><br><span style="color:var(--muted2);font-size:11.5px">/${esc(b.slug)}/</span></td><td>${esc(b.category)}</td><td>${esc(b.date_added)}</td><td>${b.published ? '<span class="pill live">Live</span>' : '<span class="pill draft">Draft</span>'}</td><td>${b.featured ? '★' : '—'}</td><td class="row-actions"><button class="mini" data-edit="${b.id}">Edit</button><button class="mini good" data-toggle="${b.id}">${b.published ? 'Unpublish' : 'Publish'}</button><button class="mini bad" data-del="${b.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:30px">No bases yet.</td></tr>'}
    </tbody></table></div></div>`);
  attachShell();
  document.querySelector('[data-new]').onclick = newBase;
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => editBase(bases.find(b => b.id === el.dataset.edit)));
  document.querySelectorAll('[data-toggle]').forEach(el => el.onclick = async () => {
    const b = bases.find(x => x.id === el.dataset.toggle);
    const { error } = await sb.from('bases').update({ published: !b.published }).eq('id', b.id);
    if (error) return toast(error.message, 'err');
    toast(b.published ? 'Unpublished.' : 'Published.', 'ok'); render();
  });
  document.querySelectorAll('[data-del]').forEach(el => el.onclick = async () => {
    if (!confirm('Delete this base permanently?')) return;
    const { error } = await sb.from('bases').delete().eq('id', el.dataset.del);
    if (error) return toast(error.message, 'err');
    toast('Deleted.', 'ok'); render();
  });
}

function renderEditor(b){
  const isNew = !b.id;
  const warnings = [];
  if (!b.slug) warnings.push('Slug is empty.');
  if (!b.name) warnings.push('Name is empty.');
  if (!b.description || b.description.length < 60) warnings.push('Description is short.');
  if (!b.clash_link) warnings.push('No Clash layout link.');
  if (!b.seo_title) warnings.push('SEO title empty.');
  if (!b.seo_description) warnings.push('Meta description empty.');
  $app.innerHTML = shell(`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px">
      <div><button class="mini" data-back>← Bases</button><h1 style="margin-top:10px">${isNew ? 'New Base' : 'Edit Base'}</h1></div>
      <div class="row-actions"><button class="mini" data-preview ${isNew?'disabled':''}>Preview page</button><button class="btn btn-primary btn-sm" data-save>${b.published?'Save':'Save &amp; Publish'}</button></div>
    </div>
    ${warnings.length ? `<div class="notice warn"><strong>Warnings:</strong><ul style="margin:6px 0 0 18px">${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <div class="grid2">
      <div class="panel"><div class="panel-body"><h2>Content</h2>
        <div class="field"><label>Base Name</label><input class="input" id="f-name" value="${esc(b.name)}"></div>
        <div class="field"><label>Slug</label><input class="input" id="f-slug" value="${esc(b.slug)}"><div style="font-size:11.5px;color:var(--muted2);margin-top:5px">URL: /<span id="slugPreview">${esc(b.slug)}</span>/</div></div>
        <div class="grid2">
          <div class="field"><label>Category</label><select class="input" id="f-cat">${cats.map(c => `<option value="${c.key}" ${c.key===b.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Subcategory</label><input class="input" id="f-subcat" value="${esc(b.sub_category)}"></div>
        </div>
        <div class="field"><label>Clash Link</label><input class="input" id="f-link" value="${esc(b.clash_link)}"></div>
        <div class="field"><label>Image URL (empty = auto SVG)</label><input class="input" id="f-image" value="${esc(b.image)}"></div>
        <div class="field"><label>Description</label><textarea class="input" id="f-desc">${esc(b.description)}</textarea></div>
        <div class="field"><label>Strategy notes (one per line)</label><textarea class="input" id="f-notes">${esc((b.strategy_notes||[]).join('\n'))}</textarea></div>
        <div class="field"><label>Tags (comma separated)</label><input class="input" id="f-tags" value="${esc((b.tags||[]).join(', '))}"></div>
      </div></div>
      <div>
        <div class="panel"><div class="panel-body"><h2>Publishing</h2>
          <div class="field"><label>Date Added</label><input class="input" type="date" id="f-date" value="${esc(b.date_added)}"></div>
          <div class="field" style="display:flex;gap:20px;align-items:center">
            <label style="display:flex;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="f-feat" ${b.featured?'checked':''}> Featured</label>
            <label style="display:flex;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="f-pub" ${b.published?'checked':''}> Published</label>
          </div>
        </div></div>
        <div class="panel"><div class="panel-body"><h2>SEO</h2>
          <div class="field"><label>SEO Title</label><input class="input" id="f-seotitle" value="${esc(b.seo_title||'')}"></div>
          <div class="field"><label>Meta Description</label><textarea class="input" id="f-seodesc" style="min-height:80px">${esc(b.seo_description||'')}</textarea></div>
          <div class="field"><label>OG Image</label><input class="input" id="f-og" value="${esc(b.og_image||'')}"></div>
        </div></div>
      </div>
    </div>`);
  attachShell();
  const slug = document.getElementById('f-slug'), name = document.getElementById('f-name'), preview = document.getElementById('slugPreview');
  name.addEventListener('input', () => { if (!slug.dataset.touched){ slug.value = slugify(name.value); preview.textContent = slug.value; } });
  slug.addEventListener('input', () => { slug.dataset.touched = '1'; preview.textContent = slug.value; });
  document.querySelector('[data-back]').onclick = () => setView('bases');
  document.querySelector('[data-preview]')?.addEventListener('click', () => window.open(`https://clashlegendbases.online/${b.slug}/`, '_blank', 'noopener'));
  document.querySelector('[data-save]').onclick = async () => {
    const data = {
      name: document.getElementById('f-name').value.trim(),
      slug: document.getElementById('f-slug').value.trim(),
      category: document.getElementById('f-cat').value,
      sub_category: document.getElementById('f-subcat').value.trim() || 'general',
      clash_link: document.getElementById('f-link').value.trim(),
      image: document.getElementById('f-image').value.trim(),
      description: document.getElementById('f-desc').value.trim(),
      strategy_notes: document.getElementById('f-notes').value.split('\n').map(s => s.trim()).filter(Boolean),
      tags: document.getElementById('f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      date_added: document.getElementById('f-date').value,
      featured: document.getElementById('f-feat').checked,
      published: document.getElementById('f-pub').checked,
      seo_title: document.getElementById('f-seotitle').value.trim(),
      seo_description: document.getElementById('f-seodesc').value.trim(),
      og_image: document.getElementById('f-og').value.trim()
    };
    if (!data.slug || !data.name) return toast('Slug and name required.', 'err');
    const res = b.id ? await sb.from('bases').update(data).eq('id', b.id) : await sb.from('bases').insert(data);
    if (res.error) return toast(res.error.message, 'err');
    toast(b.id ? 'Saved.' : 'Created.', 'ok'); setView('bases');
  };
}

function renderSubs(){
  const pending = subs.filter(s => s.status === 'pending');
  const others = subs.filter(s => s.status !== 'pending');
  $app.innerHTML = shell(`
    <h1>Submissions</h1><p class="sub">${pending.length} pending · ${others.length} reviewed</p>
    <div class="panel"><div class="panel-head"><h3>Pending</h3></div><div class="panel-body pad0">
      ${pending.length ? pending.map(s => `<div style="padding:16px 18px;border-bottom:1px solid var(--border)">
        <h3 style="margin:0 0 4px">${esc(s.name)}</h3>
        <p style="font-size:12.5px;color:var(--muted2);margin:0 0 8px">Category: ${esc(s.category)} · ${new Date(s.created_at).toLocaleString()} · by ${esc(s.username||'anonymous')}</p>
        <p style="font-size:13.5px;color:#c3cddd;margin:0 0 8px">${esc(s.description||'')}</p>
        <p style="font-size:12.5px;margin:0 0 10px">Link: ${s.clash_link ? `<a href="${esc(s.clash_link)}" target="_blank" rel="noopener nofollow" style="color:var(--gold)">${esc(s.clash_link.slice(0,60))}…</a>` : '<em>none</em>'}</p>
        <div class="row-actions"><button class="mini good" data-approve="${s.id}">✓ Approve</button><button class="mini bad" data-reject="${s.id}">✕ Reject</button><button class="mini" data-promote="${s.id}">→ Create base</button></div>
      </div>`).join('') : '<div style="padding:30px;text-align:center;color:var(--muted2)">No pending submissions.</div>'}
    </div></div>`);
  attachShell();
  document.querySelectorAll('[data-approve]').forEach(el => el.onclick = () => updateSub(el.dataset.approve, 'approved'));
  document.querySelectorAll('[data-reject]').forEach(el => el.onclick = () => updateSub(el.dataset.reject, 'rejected'));
  document.querySelectorAll('[data-promote]').forEach(el => el.onclick = () => promoteSub(subs.find(s => s.id === el.dataset.promote)));
}
async function updateSub(id, status){
  const { error } = await sb.from('submissions').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }).eq('id', id);
  if (error) return toast(error.message, 'err');
  toast(`Submission ${status}.`, 'ok'); render();
}
function promoteSub(s){
  editing = { id:null, slug: slugify(s.name), name: s.name, category: s.category, sub_category:'general', clash_link: s.clash_link||'', image: s.image_url||'', description: s.description||'', strategy_notes:[], tags:['TH18'], featured:false, published:false, date_added: new Date().toISOString().slice(0,10), seo_title:'', seo_description:'', og_image:'' };
  view = 'editor'; render();
}

function renderCategories(){
  $app.innerHTML = shell(`<h1>Categories</h1><p class="sub">TH18-only by design.</p><div class="panel"><div class="panel-body pad0"><table class="data"><thead><tr><th>Category</th><th>Slug</th><th>Key</th><th>Bases</th><th>Published</th></tr></thead><tbody>${cats.map(c => { const n = bases.filter(b => b.category === c.key).length; return `<tr><td><strong>${c.icon||''} ${esc(c.name)}</strong></td><td style="font-size:12px;color:var(--muted2)">/${esc(c.slug)}/</td><td style="font-size:12px;color:var(--muted2)">${esc(c.key)}</td><td>${n}</td><td>${c.published ? '<span class="pill live">Yes</span>' : '<span class="pill draft">No</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>`);
  attachShell();
}

function renderSettings(){
  const s = settings;
  $app.innerHTML = shell(`
    <h1>Site Settings</h1><p class="sub">Global configuration. Tracking IDs are safe to expose.</p>
    <div class="grid2">
      <div class="panel"><div class="panel-body"><h2>General</h2>
        <div class="field"><label>Site Name</label><input class="input" id="set-name" value="${esc(s.siteName||'')}"></div>
        <div class="field"><label>Site Description</label><textarea class="input" id="set-desc">${esc(s.siteDescription||'')}</textarea></div>
        <div class="field"><label>Domain</label><input class="input" id="set-domain" value="${esc(s.domain||'')}"></div>
        <div class="field"><label>Contact Email</label><input class="input" id="set-email" value="${esc(s.contactEmail||'')}"></div>
      </div></div>
      <div class="panel"><div class="panel-body"><h2>SEO &amp; Integrations</h2>
        <div class="field"><label>Default SEO Title</label><input class="input" id="set-title" value="${esc(s.defaultSeoTitle||'')}"></div>
        <div class="field"><label>Default Meta Description</label><textarea class="input" id="set-metadesc">${esc(s.defaultSeoDescription||'')}</textarea></div>
        <div class="field"><label>Google Site Verification</label><input class="input" id="set-gsc" value="${esc(s.googleSiteVerification||'')}"></div>
        <div class="field"><label>Analytics ID</label><input class="input" id="set-ga" value="${esc(s.analyticsId||'')}"></div>
        <div class="field"><label>AdSense Publisher ID</label><input class="input" id="set-ads" value="${esc(s.adsensePublisherId||'')}"></div>
      </div></div>
    </div>
    <button class="btn btn-primary" data-save>Save Settings</button>`);
  attachShell();
  document.querySelector('[data-save]').onclick = async () => {
    const data = { ...s,
      siteName: document.getElementById('set-name').value.trim(),
      siteDescription: document.getElementById('set-desc').value.trim(),
      domain: document.getElementById('set-domain').value.trim(),
      contactEmail: document.getElementById('set-email').value.trim(),
      defaultSeoTitle: document.getElementById('set-title').value.trim(),
      defaultSeoDescription: document.getElementById('set-metadesc').value.trim(),
      googleSiteVerification: document.getElementById('set-gsc').value.trim(),
      analyticsId: document.getElementById('set-ga').value.trim(),
      adsensePublisherId: document.getElementById('set-ads').value.trim()
    };
    const { error } = await sb.from('settings').update({ data, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return toast(error.message, 'err');
    settings = data; toast('Settings saved.', 'ok');
  };
}

boot();
