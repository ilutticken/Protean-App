# Hosting Protean

Protean is a **static site with no backend** — no server, no database, no API keys. Every byte of
your training data stays in your browser's local storage. That makes it free and trivial to host
anywhere, and it also means the hosting choice affects *nothing* about your data.

## Option A — Netlify Drop (easiest, no account needed to try)

1. Run `npm run build` locally. This produces a `dist/` folder.
2. Go to <https://app.netlify.com/drop>.
3. Drag the **`dist` folder** onto the page.

You get a live URL in seconds (e.g. `random-name-123.netlify.app`). Sign in (free) to keep it
permanently, rename it to something like `protean-training.netlify.app`, or add a custom domain.

To update the site later, re-run `npm run build` and drag `dist` again.

## Option B — Netlify connected to Git (auto-deploys on every change)

Best if you want changes to go live automatically.

1. Put the project on GitHub (free private repo is fine):
   ```bash
   git init && git add -A && git commit -m "Protean"
   gh repo create protean --private --source=. --push   # or create the repo on github.com
   ```
2. In Netlify: **Add new site → Import an existing project → GitHub →** pick the repo.
3. Netlify reads [`netlify.toml`](../netlify.toml) in this repo, so build command (`npm run build`)
   and publish directory (`dist`) are already configured. Just click Deploy.

Every push to your default branch redeploys automatically.

## Other free options (all equally fine)

| Host | How | Notes |
|---|---|---|
| **Cloudflare Pages** | Connect repo; build `npm run build`, output `dist` | Generous free tier, very fast globally |
| **Vercel** | Connect repo; auto-detects Vite | Same flow as Netlify |
| **GitHub Pages** | Push `dist` to a `gh-pages` branch | Needs `base` set in `vite.config.ts` if served from a subpath |

All are free for a project this size. Netlify or Cloudflare Pages are the least fussy.

## Important: hosting does not sync your data

The app is **local-first**. Two consequences worth understanding:

- Your log lives in the browser storage of the specific device + browser you use. Opening the hosted
  URL on your phone gives you a *separate, empty* log from your laptop.
- To move data between devices, use **Plan → Export backup** on one and **Import backup** on the
  other. Export regularly regardless — it is your only backup.

If you later want true multi-device sync, that requires adding a backend (or a service like Supabase
/ Firebase) — a real feature, not a hosting setting. Ask and it can be built.

## Making it feel like an installed app

Once hosted over HTTPS (all the options above are), you can install it:

- **Phone (iOS/Android):** open the URL → Share → *Add to Home Screen*. It then launches
  full-screen without browser chrome. On iOS this also protects your data from Safari's
  7-day eviction of unused site storage — worth doing if you use it on an iPhone.
- **Desktop Chrome/Edge:** install icon in the address bar.

For the best installed experience, add a web app manifest and service worker (offline caching).
Not done yet — worth adding if you decide to host it and use it on your phone daily.
