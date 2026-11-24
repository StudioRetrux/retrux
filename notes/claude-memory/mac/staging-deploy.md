---
name: staging-deploy
description: How the Retrux coming-soon page is deployed to staging.retrux.com (cPanel) and the public Vercel staging project
metadata:
  node_type: memory
  type: reference
  originSessionId: a0f5735b-9a7f-477e-9b57-6de40ca5644b
  modified: 2026-11-19T02:22:42.196Z
---

Set up 2026-11-19 at the user's request ("naikin ke staging.retrux.com", "public vercel staging link, everyone with the link can access").

- **staging.retrux.com** lives on the user's Niagahoster cPanel plan ("cPanel Hosting Personal", main domain retruxstudio.com, retrux.com is an addon domain): server `srv143.niagahoster.com` (194.163.42.246), cPanel API on :2083, document root `public_html/staging`. retrux.com DNS is on ns1/ns2.niagahoster.com (cPanel zone), NOT the Hostinger DNS zone, so subdomains made in cPanel get DNS automatically. AutoSSL (Let's Encrypt) covers it.
- Auth: cPanel API token in the repo-root `.env` as `CPANEL_TOKEN=` (git-ignored; never print it). Header `Authorization: cpanel <cpanel-user>:<token>`; the cPanel username is the one the user gave on 19 Nov (ask again if unknown — never guess, cPHulk locks out).
- Deploy recipe: static export of retrux-web (`output: "export"`, `images.unoptimized`) built in a scratch copy, zipped with an `.htaccess` (wasm/glb/mp3 MIME, https redirect) → UAPI `Fileman/upload_files` → API2 `Fileman::fileop op=extract` (gotcha: a relative destfiles resolves against the archive's folder; use absolute paths) → keep cPanel's own `.htaccess` PHP block and append ours.
- The Hostinger MCP / hPanel API cannot see this cPanel plan (its website list is empty).
- Public Vercel copy: project `retrux-staging` (framework nextjs, deployment protection OFF) → https://retrux-staging.vercel.app. Deploy from a non-git copy (the repo's commit author is not on the Vercel team → TEAM_ACCESS_REQUIRED). Project `retrux-hero-wip` keeps protection on.

Related: [[retrux-round11-state]], [[hero-interaction-spec]].
