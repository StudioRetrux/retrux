// Hero lab: develop / preview the WebGL hero without Next.js (light on RAM),
// reachable from other devices on the same network.
//   node hero-lab/serve.mjs            watch + serve on 0.0.0.0:5173 (PORT env to change)
//   node hero-lab/serve.mjs --build    one-off minified build into hero-lab/dist
import * as esbuild from "esbuild";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..");
const dist = path.join(here, "dist");
const args = new Set(process.argv.slice(2));
const buildOnly = args.has("--build");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ktx2": "image/ktx2",
  ".glb": "model/gltf-binary",
  ".exr": "application/octet-stream",
  ".hdr": "application/octet-stream",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

const clients = new Set();
const reloadPlugin = {
  name: "lab-reload",
  setup(build) {
    build.onEnd((result) => {
      const errors = result.errors.length;
      console.log(`[lab] build ${errors ? `failed (${errors} errors)` : "ok"} ${new Date().toLocaleTimeString()}`);
      if (!errors) for (const res of clients) res.write("data: reload\n\n");
    });
  },
};

const options = {
  entryPoints: [path.join(here, "main.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  outdir: dist,
  sourcemap: !buildOnly,
  minify: buildOnly,
  logLevel: "warning",
  plugins: buildOnly ? [] : [reloadPlugin],
};

if (buildOnly) {
  await esbuild.build(options);
  console.log("[lab] built", dist);
  process.exit(0);
}

const ctx = await esbuild.context(options);
if (!args.has("--no-watch")) await ctx.watch();
else await ctx.rebuild();

function send(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
}

function safeJoin(root, rel) {
  const p = path.normalize(path.join(root, decodeURIComponent(rel)));
  return p.startsWith(root) ? p : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://lab");
  const p = url.pathname;
  if (p === "/__reload") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(": hi\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (p === "/" || p === "/index.html") return send(res, path.join(here, "index.html"));
  if (p === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const routes = [
    ["/dist/", dist],
    ["/hero/", path.join(web, "public", "hero")],
    ["/icons/", path.join(web, "public", "icons")],
  ];
  for (const [prefix, root] of routes) {
    if (p.startsWith(prefix)) {
      const f = safeJoin(root, p.slice(prefix.length));
      return f ? send(res, f) : send(res, "");
    }
  }
  send(res, "");
});

let port = Number(process.env.PORT) || 5173;
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    port++;
    server.listen(port, "0.0.0.0");
  } else throw e;
});
server.listen(port, "0.0.0.0", () => {
  const urls = [`http://localhost:${port}/`];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) urls.push(`http://${a.address}:${port}/`);
  }
  console.log("[lab] serving hero lab:\n  " + urls.join("\n  "));
});
