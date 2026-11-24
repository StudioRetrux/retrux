---
name: retrux-github-repo
description: "Private GitHub repo fvldi/retrux-hero-rnd holds the whole hero R&D (code, pipeline, notes, v7 Blender, refs) for continuing on another laptop; staging folder E:\\retrux-hero-rnd"
metadata:
  node_type: memory
  type: project
  originSessionId: ad5eb6b8-3186-4c45-b311-7d1966e204e3
  modified: 2026-11-14T09:06:55.732Z
---

On 2026-11-14 the R&D was pushed to the private repo https://github.com/fvldi/retrux-hero-rnd (branch main, 675 files, ~312 MB, plain git, no LFS) so the user can continue on another laptop.

- The repo's working copy is `E:\retrux-hero-rnd`. It is a curated COPY, not the live project: the live code is still in `E:\Retrux Hero R&D\retrux-web` and `hero-pipeline`, and the R&D scripts were in the old session scratchpad `...\570a569a-...\scratchpad\pipeline`. To update the repo, robocopy those into the staging folder (excluding node_modules, .next, .git, .vercel, .env*, *.tsbuildinfo, __pycache__), then commit and push.
- Its README has the new-laptop setup and a table that maps the old hard-coded paths to the repo paths.
- Left out on purpose: `.env.local` (Vercel token), `.vercel`, plate scenes v2-v6, ~5.5 GB of QC captures, and the raw artist asset folders.
- Tools on this laptop: Git 2.56 (C:\Program Files\Git) and gh 2.104 (winget, logged in as fvldi via keyring; `gh auth setup-git` done). A shell started before the install needs PATH refreshed from Machine+User.
- Commit identity is set per repo: fvldi with the GitHub noreply email (55771340+fvldi@users.noreply.github.com).

Related: [[retrux-hero-project-status]], [[retrux-wip-vercel]].
