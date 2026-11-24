import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/RetruxR11Work/lanes/wl3a/retrux-web/package.json");
const esbuild = require("esbuild");
await esbuild.build({ entryPoints: ["/Users/muhamadrifaldi/RetruxR11Work/lanes/wl3a/retrux-web/hero-lab/main.ts"], bundle: true, format: "esm", target: "es2022", outdir: process.argv[2], sourcemap: true, minify: false, logLevel: "warning" });
