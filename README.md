# Skyhook Runner

Low-poly endless runner with three lanes, jump/slide moves, collectible coins, rising difficulty, and neon grapple anchors that swing you across rooftop gaps. Built as a static **React + Vite + TypeScript** app with **Three.js**, Tailwind-style utility CSS (`@tailwindcss/vite`), and lightweight procedural audio.

## Requirements

- Node.js 20+ recommended
- npm 10+

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

## Production build

```bash
npm run build
```

Outputs static files to `dist/`.

## Preview the production build

```bash
npm run preview
```

## Deploy (static hosting)

The game is a fully client-side SPA with no backend. Production builds use `base: "/Skyhook-Runner/"` so assets resolve correctly on **GitHub project Pages**.

### GitHub Pages (this repo)

Live site (after the workflow succeeds):

**https://monaghanhc.github.io/Skyhook-Runner/**

1. Push to `main` — the workflow in `.github/workflows/deploy-pages.yml` builds with Vite and deploys `dist/` via **GitHub Actions**.
   - If you need a manual refresh after updating Actions secrets/variables, push any small commit to retrigger deployment.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source**: select **GitHub Actions** (not “Deploy from a branch”).
3. Open the **Actions** tab and confirm the **Deploy to GitHub Pages** workflow completed; the Pages URL appears on the workflow run and under Pages settings.

If the workflow fails at **deploy-pages** with **404 / “Ensure GitHub Pages has been enabled”**, Pages was still pointed at “Deploy from a branch.” Switch **Source** to **GitHub Actions**, save, then in **Actions** open the failed run and choose **Re-run all jobs** (or push any commit to `main`).

### Other hosts

After `npm run build`, upload the `dist/` folder:

- **Netlify / Cloudflare Pages / Vercel**: set publish directory to `dist`, build command `npm run build`. If you deploy at the site root (not `/Skyhook-Runner/`), change `base` in `vite.config.ts` back to `"/"` for that environment.
- **Any CDN / object storage**: serve `index.html` as the default document for the SPA root.

## Controls

### Desktop

- **A / D** or **Arrow Left / Right**: change lane  
- **Space / Arrow Up**: jump  
- **S** or **Arrow Down**: slide  
- **E** or **click/tap** on the canvas: grapple when a glowing anchor is in range  

### Mobile

- **Swipe left / right**: lanes  
- **Swipe up**: jump  
- **Swipe down**: slide  
- **Tap** (short): grapple when an anchor is available  

The canvas uses `touch-action: none` and prevents touch scrolling while playing.

## Performance mode

Toggle **Performance mode** from the main menu or in-game HUD. It lowers fog strength, particle count, starfield density, caps pixel ratio to **1**, and disables some rim neon meshes to keep mobile GPUs happier.

## Persistence

- Best score: `localStorage` key `skyhook_best_score`
- Tutorial seen: `skyhook_tutorial_seen`
- Performance preference: `skyhook_performance_mode`
- Music preference: `skyhook_music_enabled`

## Project layout

- `src/game/` — core modules (`GameEngine`, input, audio, world generation, pooling / instancing helpers)
- `src/components/` — React UI (`GameScene` canvas host, menu, HUD, overlays)

## Future improvements

- Optional **React Three Fiber** layer for declarative scene graphs while keeping hot paths in imperative Three.js  
- Real asset pipeline (glTF hero / drones) with DRACO compression and LOD  
- Stronger **chunk grammar** (hand-authored segments + validation for fair obstacle spacing)  
- Online leaderboards and ghost replays  
- Haptics on mobile coin pickups and crashes  
- Optional shader-based rim lighting instead of extra rim meshes  

## Online leaderboard setup (Supabase)

The app can post and fetch global scores when these env vars are set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LEADERBOARD_TABLE` (optional, defaults to `leaderboard_scores`)

Create a `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_LEADERBOARD_TABLE=leaderboard_scores
```

Create table in Supabase SQL editor:

```sql
create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(username) between 1 and 20),
  score integer not null check (score > 0),
  created_at timestamptz not null default now()
);

alter table public.leaderboard_scores enable row level security;

create policy "public read leaderboard"
on public.leaderboard_scores
for select
to anon
using (true);

create policy "public insert leaderboard"
on public.leaderboard_scores
for insert
to anon
with check (true);
```

### If posting still fails

- `404`: table name is wrong or table missing. Confirm `VITE_LEADERBOARD_TABLE` and SQL ran.
- `401/403`: key or policy issue. Use **anon** key and ensure RLS policies for `select` + `insert` exist.
- `400`: usually schema mismatch (column/type/check constraint mismatch).
