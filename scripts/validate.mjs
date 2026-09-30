import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const readJSON = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const errors = []; const warnings = [];
const err = m => errors.push(m); const warn = m => warnings.push(m);

async function main(){
  const settings = await readJSON(path.join(DATA, 'settings.json'));
  const cats = await readJSON(path.join(DATA, 'categories.json'));
  const bases = await readJSON(path.join(DATA, 'bases.json'));
  const catKeys = new Set(cats.map(c => c.key));
  const slugs = new Set(); const titles = new Set();

  if (!settings.domain || !settings.domain.startsWith('https://')) err('settings.domain must be https');
  if (!settings.siteName) err('settings.siteName missing');

  for (const c of cats){
    if (!c.slug || !c.key || !c.name) err(`Category missing slug/key/name`);
    if (!c.intro || c.intro.length < 80) warn(`Category "${c.slug}" intro is short`);
  }
  for (const b of bases){
    const label = b.slug || b.id || '(unnamed)';
    if (!b.slug) err(`Base ${label}: missing slug`);
    if (b.slug && !/^[a-z0-9-]+$/.test(b.slug)) err(`Base ${label}: slug must be lowercase kebab-case`);
    if (slugs.has(b.slug)) err(`Duplicate slug: ${b.slug}`);
    slugs.add(b.slug);
    if (!b.name) err(`Base ${label}: missing name`);
    if (!b.category) err(`Base ${label}: missing category`);
    else if (!catKeys.has(b.category)) err(`Base ${label}: unknown category "${b.category}"`);
    if (!b.description || b.description.length < 60) warn(`Base ${label}: description short`);
    if (!b.clashLink) warn(`Base ${label}: no clash link`);
    if (!b.dateAdded) err(`Base ${label}: missing dateAdded`);
    if (b.published !== false){
      const title = b.seo?.title || `${b.name} — Copy Layout | ${settings.siteName}`;
      if (titles.has(title)) err(`Duplicate SEO title: "${title}"`);
      titles.add(title);
    }
  }
  console.log(`Validation: ${bases.length} bases, ${cats.length} categories`);
  if (warnings.length){ console.log(`\n⚠ ${warnings.length} warning(s):`); warnings.forEach(w => console.log('  · ' + w)); }
  if (errors.length){ console.error(`\n✕ ${errors.length} error(s):`); errors.forEach(e => console.error('  · ' + e)); process.exit(1); }
  console.log('\n✅ Validation passed.');
}
main().catch(e => { console.error(e); process.exit(1); });
