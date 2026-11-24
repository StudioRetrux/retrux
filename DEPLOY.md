# Putting the Retrux hero live on retrux.com

**Release:** branch `hero-round11`, commit `524c88f` (24 Nov 2026: the 22 Nov release + the first-click sound, the water
flicker fix, and the meta tags / share image / icons). Its `retrux-web/` is byte-identical to what https://retrux-staging.vercel.app serves. `main` is older (14 Nov): do not deploy `main` until `hero-round11` is merged into it.

## What it is

- `retrux-web/`: Next.js 16.2.4 (App Router), React 19.2.4, three.js 0.184. One static page (`/`): no API routes,
  no server code, no environment variables.
- Node 20.9 or newer (tested on Node 24). Optional env `SITE_URL` (for example `https://retrux.com`): the absolute base for the share image and canonical URL; without it the build uses the Vercel production URL, else `https://retrux.com`. Hosts ending in `.vercel.app` or starting with `staging.` get `noindex`. Build: `cd retrux-web && npm ci && npm run build`.
- Not part of the site: `retrux-web/hero-lab/` (dev lab), `retrux-web/public/models/home-full.glb` (73 MB source model,
  never loaded), and everything outside `retrux-web/` (R&D pipeline, notes, Blender files).
- The repo is private on Faldi's GitHub: ask Faldi for access.

## Option A: Vercel (recommended, same setup as staging)

1. Vercel → Add New → Project → import `fvldi/retrux-hero-rnd`.
2. Root Directory `retrux-web`. Framework preset Next.js (detected). Build and output settings: defaults. No env vars.
3. Production branch: not `hero-round11` itself (R&D notes keep landing there and would auto-deploy). Create a release
   branch at the release commit (`git branch release 524c88f && git push origin release`) and set it as the production
   branch (Settings → Git), or merge `hero-round11` into `main` and deploy `main`.
4. Settings → Domains: add `retrux.com` and `www.retrux.com`, then create the DNS records Vercel shows. retrux.com's DNS
   is in the Niagahoster cPanel (Zone Editor). Change only the `@` / `www` A and CNAME records; leave MX and other mail
   records alone.
5. `retrux-web/.vercelignore` already keeps the hero lab and `public/models/` out of the deployment.

Vercel's Hobby plan is for non-commercial use; a company site belongs on a Pro team. If Vercel blocks a deployment
because the commit author is not a member of the team, add them to the team or deploy from the CLI
(`cd retrux-web && npx vercel deploy --prod`).

## Option B: the existing cPanel hosting (static export)

Tested again on 24 Nov 2026 with the release commit: the export builds in about a minute (~19 MB) and loads with 0 console errors, and
the `.htaccess` files below were tested on Apache 2.4 (22 Nov) (HTTPS redirect, `application/wasm`, gzip, caching, 404 page).

1. In `retrux-web/next.config.ts` (in the build copy; no need to commit it):
   ```ts
   const nextConfig: NextConfig = {
     output: "export",
     images: { unoptimized: true },
   };
   ```
2. `cd retrux-web && npm ci && npm run build`. The site is now in `retrux-web/out/`.
3. Delete `out/models/` (the 73 MB source model the site never loads).
4. Add the two `.htaccess` files below as `out/.htaccess` and `out/_next/static/.htaccess`.
5. Upload the contents of `out/` (not the folder itself) into retrux.com's document root (cPanel → Domains shows the
   folder); zip → upload → Extract in File Manager is the fastest. If the document root already has a `.htaccess` from
   cPanel (PHP handler lines), keep those lines and add ours below them. For a later release, replace the folder's content
   (the HTML is never cached; the hashed files in `_next/static/` are).

`out/.htaccess`:

```apache
# Retrux hero: static export on Apache / LiteSpeed (cPanel).
# If cPanel already put lines in this file (for example a PHP handler block), keep them and add these below.

# 1. Always HTTPS
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 2. MIME types the hero needs (WebAssembly must be served as application/wasm)
AddType application/wasm .wasm
AddType model/gltf-binary .glb
AddType image/x-exr .exr
AddType image/webp .webp
AddType audio/mpeg .mp3
AddType application/manifest+json .webmanifest

# 3. Compress text-like files (images and mp3 are already compressed)
<IfModule mod_deflate.c>
  <IfModule mod_filter.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json application/wasm model/gltf-binary image/svg+xml image/x-exr
  </IfModule>
</IfModule>

# 4. Pages always revalidate, so visitors get a new release right away
<IfModule mod_headers.c>
  <FilesMatch "\.(html|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

ErrorDocument 404 /404.html
```

`out/_next/static/.htaccess`:

```apache
# Next.js build files have content hashes in their names and never change: cache them for a year
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>
```

## Check after going live

- Desktop Chrome and Safari, and a real iPhone in Safari: the scene renders sharp, no errors in the console.
- Press and hold anywhere: the slow-motion ring expand; release returns smoothly. A short click does nothing (by design).
- Sound: every new visit starts muted. The first click, key press or tap anywhere (links included), a press-and-hold or
  the Sound button turns it on; switching it off with the button sticks for that visit.
- DevTools → Network: `hero/draco/draco_decoder.wasm` is served as `application/wasm`; JS is gzip or brotli.
- `?tier=T0`, `?tier=T1`, `?tier=T2` force a quality tier for testing (T0 = phones).

## Coming next

The desktop flicker at the left ice sheets is fixed in this release. The far ice reflections and the water edge at the
far slabs come as a later release on this branch; redeploy the same way when it is announced.

## Links

- Latest staging (= this release): https://retrux-staging.vercel.app
- Release commit: https://github.com/fvldi/retrux-hero-rnd/commit/524c88f
- UI design (Figma): https://www.figma.com/design/PBjdUahkIWrc6BDTQv4wNR/Retrux-Web-Revamp?node-id=2979-1492
- Old static staging from 19 Nov (outdated, do not use as reference): https://staging.retrux.com
