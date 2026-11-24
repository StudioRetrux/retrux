---
name: retrux-wip-vercel
description: Where the user checks the Retrux hero WIP from outside the home network (Vercel project and link)
metadata:
  node_type: memory
  type: reference
  originSessionId: 570a569a-5122-4ff1-b51f-d34d42e5fde3
  modified: 2026-11-11T03:46:03.067Z
---

- Link: https://retrux-hero-wip.vercel.app
- Vercel project: `retrux-hero-wip` on the user's own Vercel account (CLI login done on 2026-11-11 with the device flow).
- Vercel Authentication protection is on, so viewers must be logged in to that Vercel account.
- Redeploy from `retrux-web`: `npx vercel@latest deploy --prod --yes`.
  - Vercel builds remotely, so the laptop only uploads.
  - `.vercelignore` keeps out `public/models` (70 MB, unused), `hero-lab`, `.next` and `node_modules`.
- Use it when the user wants a link to check at work. Use the LAN lab (`node hero-lab/serve.mjs`, :5173) for the home network.

Related: [[retrux-hero-project-status]].
