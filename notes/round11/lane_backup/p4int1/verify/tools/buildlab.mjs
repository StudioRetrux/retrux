// buildlab.mjs <retrux-web dir> <outdir>: the lab's own esbuild options (serve.mjs non-build mode: sourcemap on, not minified)
import { createRequire } from "node:module";
import path from "node:path";
const [web, outdir] = process.argv.slice(2);
const require = createRequire(path.join(web, "package.json"));
const esbuild = require("esbuild");
await esbuild.build({ entryPoints: [path.join(web, "hero-lab", "main.ts")], bundle: true, format: "esm", target: "es2022", outdir, sourcemap: true, minify: false, logLevel: "warning", absWorkingDir: web });
console.log("built", outdir);
