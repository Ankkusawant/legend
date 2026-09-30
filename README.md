# Clash Legend Bases

A TH18-only Clash of Clans base library. Static-generated site + Supabase-backed admin.

## Quick start

    node scripts/validate.mjs
    node scripts/build.mjs
    npx serve dist

## Deploy

Push to GitHub, enable Pages (source: GitHub Actions), set custom domain.

See the full deployment guide in the project chat / docs.

## Architecture

    data/*.json  ─┐
                  ├─→ scripts/build.mjs ─→ dist/ ─→ GitHub Pages
    Supabase    ──┘        (static HTML)

- Public site: pure static HTML. No JS required to see content.
- Admin SPA: talks to Supabase directly (Row Level Security enforces access).
- Rebuild trigger: Supabase Edge Function fires a GitHub repository_dispatch.
