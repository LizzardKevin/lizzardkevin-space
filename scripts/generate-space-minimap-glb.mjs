/**
 * 从 space_main.glb 生成小地图 GLB(apps/web/public/models/space_minimap_strip.glb)。
 *
 * 流程:自起 vite(临时端口)+ headless Chrome,在页面里经 vite 加载
 * apps/web/tools/export-space-minimap.ts —— 该模块跑与运行时完全相同的剥离管线
 * (prepareGalleryScene 可见性/去重 + buildSpaceMinimapModel 前缀过滤/分层合并),
 * 因此离线产物与运行时 strip 永远一致。展厅模型更新后重跑本脚本即可同步地图:
 *
 *   node scripts/generate-space-minimap-glb.mjs
 *
 * 无新依赖(node 内置 fetch/WebSocket + 本机 Chrome)。
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = join(repoRoot, "apps", "web");
const OUT = join(webRoot, "public", "models", "space_minimap_strip.glb");
const VITE_PORT = 5199;
const CDP_PORT = 9335;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(400);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const vite = spawn("npx", ["vite", "--port", String(VITE_PORT), "--strictPort"], {
  cwd: webRoot,
  stdio: "ignore",
  shell: true,
});
const profileDir = join(tmpdir(), `minimap-gen-${Date.now()}`);
mkdirSync(profileDir, { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--disable-extensions",
  "--enable-unsafe-swiftshader",
  "about:blank",
]);

let ws;
let msgId = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => {
  const id = ++msgId;
  ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 120_000);
  });
};

try {
  await waitHttp(`http://localhost:${VITE_PORT}/`, 30_000, "vite");
  await waitHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 20_000, "chrome devtools");

  const browserWs = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json())
    .webSocketDebuggerUrl;
  ws = new WebSocket(browserWs);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result ?? msg.error);
      return;
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ");
      console.log(`[page:${msg.params.type}] ${text.slice(0, 400)}`);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const detail = msg.params.exceptionDetails;
      console.log(`[page:exception] ${detail.text} ${detail.exception?.description?.slice(0, 400) ?? ""}`);
    }
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send(
    "Page.navigate",
    { url: `http://localhost:${VITE_PORT}/tools/export-space-minimap.html` },
    sessionId,
  );

  const ready = await send(
    "Runtime.evaluate",
    {
      expression: `new Promise((resolve) => {
        const tick = () => (window.__minimapExportReady ? resolve(true) : setTimeout(tick, 300));
        tick();
        setTimeout(() => resolve(false), 30000);
      })`,
      returnByValue: true,
      awaitPromise: true,
      timeout: 60_000,
    },
    sessionId,
  );
  if (ready.result?.value !== true) throw new Error("export page module never became ready");

  const expression = `window.buildSpaceMinimapGlbBase64()`;
  const result = await send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true, timeout: 120_000 },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(`in-page export failed: ${JSON.stringify(result.exceptionDetails).slice(0, 600)}`);
  }
  const value = result.result?.value;
  if (typeof value !== "string" || !value.includes("|vertices=")) {
    throw new Error(`unexpected export payload: ${String(value).slice(0, 200)}`);
  }
  const [base64, stats] = value.split("|");
  const buffer = Buffer.from(base64, "base64");
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, buffer);
  console.log(`wrote ${OUT}`);
  console.log(`bytes: ${buffer.length} (${(buffer.length / 1024).toFixed(1)} KB), ${stats}`);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  vite.kill();
  await sleep(600);
  rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
}
