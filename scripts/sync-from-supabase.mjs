import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key){ console.log('Supabase env vars not set — using existing data/*.json as-is.'); process.exit(0); }

async function api(p){
  const res = await fetch(`${url}/rest/v1/${p}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${p}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main(){
  console.log('Syncing content from Supabase…');
  const cats = await api('categories?select=*&order=sort_order.asc');
  const bases = await api('bases?select=*&order=date_added.desc');
  const settingsRows = await api('settings?select=data&id=eq.1');

  const mappedCats = cats.map(c => ({ slug: c.slug, key: c.key, name: c.name, short: c.short, icon: c.icon, description: c.description, intro: c.intro }));
  const mappedBases = bases.map(b => ({
    id: b.id, slug: b.slug, name: b.name, category: b.category, subCategory: b.sub_category || 'general',
    image: b.image || '', clashLink: b.clash_link || '', description: b.description || '',
    strategyNotes: b.strategy_notes || [], tags: b.tags || [], featured: !!b.featured, published: !!b.published,
    dateAdded: b.date_added, updatedAt: b.updated_at, views: b.views || 0,
    seo: { title: b.seo_title || '', description: b.seo_description || '', canonical: b.canonical || '', ogImage: b.og_image || '' }
  }));
  const settings = settingsRows[0]?.data || JSON.parse(await fs.readFile(path.join(DATA, 'settings.json'), 'utf8'));
  await fs.writeFile(path.join(DATA, 'categories.json'), JSON.stringify(mappedCats, null, 2));
  await fs.writeFile(path.join(DATA, 'bases.json'), JSON.stringify(mappedBases, null, 2));
  await fs.writeFile(path.join(DATA, 'settings.json'), JSON.stringify(settings, null, 2));
  console.log(`✅ Synced ${mappedCats.length} categories, ${mappedBases.length} bases.`);
}
main().catch(e => { console.error(e); process.exit(1); });
