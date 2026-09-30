import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key){
  console.log('Supabase env vars not set — using existing data/*.json as-is.');
  process.exit(0);
}

async function api(p){
  const res = await fetch(`${url}/rest/v1/${p}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`${p}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function readLocal(name){
  try { return JSON.parse(await fs.readFile(path.join(DATA, name), 'utf8')); }
  catch { return null; }
}

async function main(){
  console.log('Syncing content from Supabase…');

  const cats = await api('categories?select=*&order=sort_order.asc');
  const bases = await api('bases?select=*&order=date_added.desc');
  const settingsRows = await api('settings?select=data&id=eq.1');

  const mappedCats = cats.map(c => ({
    slug: c.slug, key: c.key, name: c.name, short: c.short, icon: c.icon,
    description: c.description, intro: c.intro
  }));

  const mappedBases = bases.map(b => ({
    id: b.id, slug: b.slug, name: b.name,
    category: b.category, subCategory: b.sub_category || 'general',
    image: b.image || '', clashLink: b.clash_link || '',
    description: b.description || '',
    strategyNotes: b.strategy_notes || [],
    tags: b.tags || [],
    featured: !!b.featured, published: !!b.published,
    dateAdded: b.date_added, updatedAt: b.updated_at,
    views: b.views || 0,
    seo: { title: b.seo_title || '', description: b.seo_description || '',
           canonical: b.canonical || '', ogImage: b.og_image || '' }
  }));

  const remoteSettings = settingsRows[0]?.data || {};
  const localSettings = (await readLocal('settings.json')) || {};

  /* ------------------------------------------------------------------
     Only overwrite a file when the remote data is actually meaningful.
     Prevents an empty Supabase project from wiping the local seed data.
     ------------------------------------------------------------------ */

  // CATEGORIES
  if (Array.isArray(mappedCats) && mappedCats.length > 0) {
    await fs.writeFile(path.join(DATA, 'categories.json'), JSON.stringify(mappedCats, null, 2));
    console.log(`  ✓ categories.json — ${mappedCats.length} items from Supabase`);
  } else {
    console.log('  ⊘ categories.json — Supabase empty, keeping local file');
  }

  // BASES
  if (Array.isArray(mappedBases) && mappedBases.length > 0) {
    await fs.writeFile(path.join(DATA, 'bases.json'), JSON.stringify(mappedBases, null, 2));
    console.log(`  ✓ bases.json — ${mappedBases.length} items from Supabase`);
  } else {
    console.log('  ⊘ bases.json — Supabase empty, keeping local file');
  }

  // SETTINGS — merge: remote overrides local, but only if remote is non-empty
  const remoteHasContent = remoteSettings && Object.keys(remoteSettings).length > 0;
  if (remoteHasContent) {
    const merged = { ...localSettings, ...remoteSettings };
    await fs.writeFile(path.join(DATA, 'settings.json'), JSON.stringify(merged, null, 2));
    console.log('  ✓ settings.json — merged from Supabase + local');
  } else {
    console.log('  ⊘ settings.json — Supabase settings empty, keeping local file');
  }

  console.log('✅ Sync complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
