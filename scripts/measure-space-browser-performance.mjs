import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cpus, freemem, platform, release, totalmem } from "node:os";
import { fileURLToPath } from "node:url";

const THREE_DIMENSIONAL_REQUEST = /(?:three-vendor|rapier-vendor|SpacePage|SpaceHost|FocusOverlay|\.glb(?:[?#]|$)|draco|\.wasm(?:[?#]|$))/i;
const PRE_ENTER_FORBIDDEN_REQUEST = /(?:rapier|space_main|focus_[^/]*\.glb|\.glb(?:[?#]|$)|draco|\.wasm(?:[?#]|$)|\/audio\/[^/]+\.(?:wav|mp3|ogg)(?:[?#]|$))/i;
const PERSISTENT_CORE_REQUEST = /(?:rapier-vendor|space_main\.glb|space_(?!main)[^/]*\.glb|draco|\.wasm(?:[?#]|$))/i;
const SELECTED_WORK_REQUEST = /\/exhibits\/arch_treehabitat\/(?:focus_|img\/|content\.json)/i;
const DEFAULT_OUTPUT = "docs/performance/space-browser-baseline.json";
const PERF_INIT = () => {
  const state = {
    cls: 0,
    lcp: null,
    longTaskBlockingMs: 0,
    longTaskCount: 0,
  };
  Object.defineProperty(window, "__spacePerf", { value: state, configurable: false });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.lcp = {
          duration: entry.duration,
          element: entry.element?.tagName ?? null,
          renderTime: entry.renderTime,
          size: entry.size,
          startTime: entry.startTime,
          url: entry.url ?? null,
        };
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTaskCount += 1;
        state.longTaskBlockingMs += Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {}
};

export function summarizeNumbers(values) {
  const sorted = values.filter(Number.isFinite).toSorted((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted.at(-1),
    median,
    p95: sorted[p95Index],
  };
}

export function summarizeMetric(samples, path) {
  const keys = path.split(".");
  const values = samples.map((sample) => keys.reduce(
    (value, key) => value == null ? undefined : value[key],
    sample,
  ));
  return summarizeNumbers(values);
}

export function classifyRequestUrl(url) {
  return {
    threeDimensional: THREE_DIMENSIONAL_REQUEST.test(url),
    preEnterForbidden: PRE_ENTER_FORBIDDEN_REQUEST.test(url),
    persistentCore: PERSISTENT_CORE_REQUEST.test(url),
  };
}

export function evaluateHardGates({
  mobileSamples,
  coldContentSamples,
  lobbySamples,
  routeSamples,
}) {
  const threeDimensionalViolations = [...mobileSamples, ...coldContentSamples]
    .flatMap((sample) => sample.threeDimensionalUrls ?? []);
  const preEnterViolations = lobbySamples.flatMap(
    (sample) => sample.preEnterForbiddenUrls ?? [],
  );
  const routeReRequests = routeSamples.reduce(
    (total, sample) => total + (sample.persistentCoreReRequestCount ?? 0),
    0,
  );
  return {
    mobileAndColdContent3dZero: {
      pass: threeDimensionalViolations.length === 0,
      violations: [...new Set(threeDimensionalViolations)],
    },
    desktopLobbyPreEnterForbiddenZero: {
      pass: preEnterViolations.length === 0,
      violations: [...new Set(preEnterViolations)],
    },
    routeReturnCoreReRequestsZero: {
      pass: routeReRequests === 0,
      observed: routeReRequests,
    },
  };
}

export function compareShippingAssets(baseline, candidate) {
  const select = (inventory) => new Map(
    inventory.assets
      .filter((asset) => asset.shipping)
      .map((asset) => [asset.path, `${asset.bytes}:${asset.sha256}`]),
  );
  const left = select(baseline);
  const right = select(candidate);
  const paths = [...new Set([...left.keys(), ...right.keys()])].toSorted();
  const violations = paths.filter((path) => left.get(path) !== right.get(path));
  return { pass: violations.length === 0, violations };
}

function parseArgs(args) {
  const options = {
    baseUrl: "http://127.0.0.1:4173",
    output: DEFAULT_OUTPUT,
    playwrightModule: process.env.SPACE_PLAYWRIGHT_MODULE ?? "",
    samples: 3,
    sourceGitHead: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--base-url" && value) options.baseUrl = value.replace(/\/$/, "");
    else if (flag === "--output" && value) options.output = value;
    else if (flag === "--playwright-module" && value) options.playwrightModule = value;
    else if (flag === "--samples" && value) options.samples = Number.parseInt(value, 10);
    else if (flag === "--source-git-head" && value) options.sourceGitHead = value;
    else throw new Error(`Unknown or incomplete argument: ${flag}`);
    index += 1;
  }
  if (!Number.isInteger(options.samples) || options.samples < 3) {
    throw new Error("--samples must be an integer >= 3");
  }
  if (!options.playwrightModule) {
    throw new Error("Pass --playwright-module or set SPACE_PLAYWRIGHT_MODULE to the installed Playwright package directory.");
  }
  options.sourceGitHead ??= git(["rev-parse", "HEAD"]);
  return options;
}

function loadPlaywright(modulePath) {
  const require = createRequire(import.meta.url);
  const playwright = require(resolve(modulePath));
  const packageJson = JSON.parse(readFileSync(resolve(modulePath, "package.json"), "utf8"));
  return { ...playwright, playwrightVersion: packageJson.version };
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
}

function unique(values) {
  return [...new Set(values)];
}

async function createAudit(context, cacheDisabled) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const requests = new Map();
  const consoleMessages = [];
  const rendererMessages = [];
  const pageErrors = [];
  let sequence = 0;
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled });
  await cdp.send("Performance.enable");

  cdp.on("Network.requestWillBeSent", (event) => {
    const url = event.request.url;
    if (!/^https?:/i.test(url)) return;
    requests.set(event.requestId, {
      cache: false,
      cacheControl: null,
      contentEncoding: null,
      encodedBytes: 0,
      etag: null,
      mimeType: null,
      sequence: sequence++,
      status: null,
      type: event.type ?? null,
      url,
    });
  });
  cdp.on("Network.requestServedFromCache", ({ requestId }) => {
    const request = requests.get(requestId);
    if (request) request.cache = true;
  });
  cdp.on("Network.responseReceived", ({ requestId, response, type }) => {
    const request = requests.get(requestId);
    if (!request) return;
    const headers = Object.fromEntries(
      Object.entries(response.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)]),
    );
    request.cache ||= Boolean(response.fromDiskCache || response.fromServiceWorker || response.fromPrefetchCache);
    request.cacheControl = headers["cache-control"] ?? null;
    request.contentEncoding = headers["content-encoding"] ?? null;
    request.etag = headers.etag ?? null;
    request.mimeType = response.mimeType ?? null;
    request.status = response.status;
    request.type = type ?? request.type;
  });
  cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    const request = requests.get(requestId);
    if (request) request.encodedBytes = encodedDataLength;
  });
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[Renderer]")) rendererMessages.push(text);
    if (["warning", "error"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  return {
    cdp,
    page,
    consoleMessages,
    pageErrors,
    rendererMessages,
    snapshot: async () => {
      await page.waitForTimeout(50);
      const resource = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource");
        return {
          decodedBodyBytes: resources.reduce((total, entry) => total + (entry.decodedBodySize ?? 0), 0),
          encodedBodyBytes: resources.reduce((total, entry) => total + (entry.encodedBodySize ?? 0), 0),
          transferBytes: resources.reduce((total, entry) => total + (entry.transferSize ?? 0), 0),
        };
      });
      const entries = [...requests.values()].toSorted((left, right) => left.sequence - right.sequence);
      const urls = entries.map((request) => request.url);
      return {
        cacheHitCount: entries.filter((request) => request.cache).length,
        decodedBodyBytes: resource.decodedBodyBytes,
        encodedBodyBytes: resource.encodedBodyBytes,
        encodedBytes: round(entries.reduce((total, request) => total + request.encodedBytes, 0)),
        requestCount: entries.length,
        transferBytes: resource.transferBytes,
        threeDimensionalUrls: unique(urls.filter((url) => classifyRequestUrl(url).threeDimensional)),
        preEnterForbiddenUrls: unique(urls.filter((url) => classifyRequestUrl(url).preEnterForbidden)),
        persistentCoreUrls: urls.filter((url) => classifyRequestUrl(url).persistentCore),
        selectedWorkUrls: urls.filter((url) => SELECTED_WORK_REQUEST.test(url)),
      };
    },
  };
}

async function waitForNetworkIdle(page, timeout = 10_000) {
  try {
    await page.waitForLoadState("networkidle", { timeout });
  } catch {}
}

async function readPageMetrics(audit) {
  const browserMetrics = await audit.page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]),
    );
    const state = window.__spacePerf ?? {};
    const memory = performance.memory;
    return {
      cls: state.cls ?? null,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      fcpMs: paints["first-contentful-paint"] ?? null,
      firstPaintMs: paints["first-paint"] ?? null,
      jsHeap: memory ? {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapBytes: memory.totalJSHeapSize,
        usedJSHeapBytes: memory.usedJSHeapSize,
      } : null,
      lcpMs: state.lcp?.startTime ?? null,
      lcp: state.lcp ?? null,
      loadEventMs: navigation?.loadEventEnd ?? null,
      longTaskBlockingMs: state.longTaskBlockingMs ?? null,
      longTaskCount: state.longTaskCount ?? null,
    };
  });
  const cdpMetrics = Object.fromEntries(
    (await audit.cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]),
  );
  return {
    ...browserMetrics,
    cdp: {
      documents: cdpMetrics.Documents ?? null,
      jsEventListeners: cdpMetrics.JSEventListeners ?? null,
      jsHeapTotalBytes: cdpMetrics.JSHeapTotalSize ?? null,
      jsHeapUsedBytes: cdpMetrics.JSHeapUsedSize ?? null,
      layoutCount: cdpMetrics.LayoutCount ?? null,
      nodes: cdpMetrics.Nodes ?? null,
      recalcStyleCount: cdpMetrics.RecalcStyleCount ?? null,
    },
  };
}

async function sampleRaf(page, frameCount) {
  const deltas = await page.evaluate((count) => new Promise((resolve) => {
    const samples = [];
    let previous = null;
    const step = (now) => {
      if (previous !== null) samples.push(now - previous);
      previous = now;
      if (samples.length >= count) resolve(samples);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), frameCount);
  return {
    ...summarizeNumbers(deltas.map((value) => round(value))),
    over20ms: deltas.filter((value) => value > 20).length,
    over33ms: deltas.filter((value) => value > 33.334).length,
  };
}

async function navigateSpa(page, path) {
  await page.evaluate((nextPath) => {
    history.pushState(null, "", nextPath);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function inspectWebGl(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas#space-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const gl = canvas.getContext("webgl2");
    if (!gl) return { context: "unavailable" };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      context: "webgl2",
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
      version: gl.getParameter(gl.VERSION),
    };
  });
}

async function primeMobile(context, baseUrl) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mobile-start-menu", { timeout: 15_000 });
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForSelector(".mobile-terminal-header", { timeout: 15_000 });
  await waitForNetworkIdle(page);
  await page.close();
}

async function primeContent(context, baseUrl, path) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.close();
}

async function primeDesktop(context, baseUrl) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".start-lobby", { timeout: 15_000 });
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForSelector(".topbar", { timeout: 90_000 });
  await waitForNetworkIdle(page, 30_000);
  await page.close();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
}

async function measureMobile(context, baseUrl, cacheDisabled) {
  const audit = await createAudit(context, cacheDisabled);
  const start = Date.now();
  await audit.page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await audit.page.waitForSelector(".mobile-start-menu", { timeout: 15_000 });
  await waitForNetworkIdle(audit.page);
  const startMenuReadyMs = Date.now() - start;
  const preEnterNetwork = await audit.snapshot();
  const enterAt = Date.now();
  await audit.page.getByRole("button", { name: "Enter" }).click();
  await audit.page.waitForSelector(".mobile-terminal-header", { timeout: 15_000 });
  await waitForNetworkIdle(audit.page);
  const terminalReadyMs = Date.now() - enterAt;
  const network = await audit.snapshot();
  const steadyRaf = await sampleRaf(audit.page, 60);
  const web = await readPageMetrics(audit);

  await navigateSpa(audit.page, "/profile");
  await audit.page.waitForFunction(() => document.querySelector(".mobile-site")?.getAttribute("data-active-tab") === "soul");
  await navigateSpa(audit.page, "/works/arch_treehabitat");
  await audit.page.waitForTimeout(500);
  await waitForNetworkIdle(audit.page);
  const afterRoutesNetwork = await audit.snapshot();
  const threeDimensionalUrls = unique(afterRoutesNetwork.threeDimensionalUrls);
  await audit.page.close();
  return {
    afterRoutesNetwork,
    cacheDisabled,
    consoleMessages: audit.consoleMessages,
    milestones: { startMenuReadyMs, terminalReadyMs },
    network,
    pageErrors: audit.pageErrors,
    preEnterNetwork,
    rendererMessages: audit.rendererMessages,
    steadyRaf,
    threeDimensionalUrls,
    web,
  };
}

async function measureColdContent(context, baseUrl, path, cacheDisabled) {
  const audit = await createAudit(context, cacheDisabled);
  const start = Date.now();
  await audit.page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await waitForNetworkIdle(audit.page);
  await audit.page.waitForTimeout(250);
  const readyMs = Date.now() - start;
  const network = await audit.snapshot();
  const web = await readPageMetrics(audit);
  await audit.page.close();
  return {
    cacheDisabled,
    consoleMessages: audit.consoleMessages,
    milestones: { readyMs },
    network,
    pageErrors: audit.pageErrors,
    route: path,
    threeDimensionalUrls: network.threeDimensionalUrls,
    web,
  };
}

async function measureDesktop(context, baseUrl, cacheDisabled) {
  const audit = await createAudit(context, cacheDisabled);
  const start = Date.now();
  await audit.page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await audit.page.waitForSelector(".start-lobby", { timeout: 15_000 });
  await waitForNetworkIdle(audit.page);
  const lobbyReadyMs = Date.now() - start;
  const lobbyNetwork = await audit.snapshot();
  const enterAt = Date.now();
  await audit.page.getByRole("button", { name: "Enter" }).click();
  await audit.page.waitForSelector("canvas#space-canvas", { timeout: 30_000 });
  const mainCanvasMs = Date.now() - enterAt;
  await audit.page.waitForSelector(".topbar", { timeout: 90_000 });
  await waitForNetworkIdle(audit.page, 30_000);
  const enteredMs = Date.now() - enterAt;
  const bootNetwork = await audit.snapshot();
  const steadyRaf = await sampleRaf(audit.page, 120);
  const webAfterBoot = await readPageMetrics(audit);
  const webGl = await inspectWebGl(audit.page);
  const canvasIdentity = await audit.page.evaluate(() => {
    const canvas = document.querySelector("canvas#space-canvas");
    if (!canvas) return null;
    canvas.setAttribute("data-performance-identity", "persistent-main");
    return canvas.getAttribute("data-performance-identity");
  });

  const routeStartNetwork = await audit.snapshot();
  await audit.page.locator(".topbar__button").nth(0).click();
  await audit.page.waitForURL("**/profile");
  await audit.page.waitForSelector(".frosted-split", { timeout: 15_000 });
  await audit.page.goBack();
  await audit.page.waitForSelector(".topbar");
  await audit.page.locator(".topbar__button").nth(2).click();
  await audit.page.waitForURL("**/devstories");
  await audit.page.waitForSelector(".frosted-split", { timeout: 15_000 });
  await audit.page.goBack();
  await audit.page.waitForSelector(".topbar");
  await waitForNetworkIdle(audit.page);
  const routeEndNetwork = await audit.snapshot();
  const persistentCoreReRequestCount = Math.max(
    0,
    routeEndNetwork.persistentCoreUrls.length - routeStartNetwork.persistentCoreUrls.length,
  );
  const canvasPreserved = await audit.page.evaluate(() =>
    document.querySelector("canvas#space-canvas")?.getAttribute("data-performance-identity") === "persistent-main",
  );

  const firstWorkStart = Date.now();
  await navigateSpa(audit.page, "/works/arch_treehabitat");
  await audit.page.waitForSelector(".focus-overlay", { timeout: 30_000 });
  await audit.page.waitForFunction(
    () => document.querySelectorAll(".focus-media-dot").length >= 24,
    null,
    { timeout: 90_000 },
  );
  await waitForNetworkIdle(audit.page, 30_000);
  const selectedWorkReadyMs = Date.now() - firstWorkStart;
  const firstWorkNetwork = await audit.snapshot();
  const heapAfterFirstWork = await readPageMetrics(audit);
  await audit.page.locator(".focus-return-button").click();
  await audit.page.waitForURL(`${baseUrl}/`);
  await audit.page.waitForSelector(".topbar");

  const secondWorkStart = Date.now();
  await navigateSpa(audit.page, "/works/arch_treehabitat");
  await audit.page.waitForSelector(".focus-overlay", { timeout: 30_000 });
  await audit.page.waitForFunction(
    () => document.querySelectorAll(".focus-media-dot").length >= 24,
    null,
    { timeout: 90_000 },
  );
  await waitForNetworkIdle(audit.page, 30_000);
  const repeatedWorkReadyMs = Date.now() - secondWorkStart;
  const secondWorkNetwork = await audit.snapshot();
  const repeatedWorkReRequestCount = Math.max(
    0,
    secondWorkNetwork.selectedWorkUrls.length - firstWorkNetwork.selectedWorkUrls.length,
  );
  const heapAfterRepeatedWork = await readPageMetrics(audit);
  await audit.page.locator(".focus-return-button").click();
  let repeatedWorkReturnViaUi = true;
  try {
    await audit.page.waitForURL(`${baseUrl}/`, { timeout: 3_000 });
  } catch {
    repeatedWorkReturnViaUi = false;
  }
  if (!repeatedWorkReturnViaUi) await navigateSpa(audit.page, "/");
  await audit.page.waitForSelector(".topbar");
  const finalNetwork = await audit.snapshot();
  const heapAfterReturn = await readPageMetrics(audit);
  await audit.page.close();

  return {
    cacheDisabled,
    canvasIdentity,
    canvasPreserved,
    consoleMessages: audit.consoleMessages,
    finalNetwork,
    heapAfterFirstWork: heapAfterFirstWork.jsHeap,
    heapAfterRepeatedWork: heapAfterRepeatedWork.jsHeap,
    heapAfterReturn: heapAfterReturn.jsHeap,
    lobbyNetwork,
    milestones: {
      enteredMs,
      lobbyReadyMs,
      mainCanvasMs,
      repeatedWorkReadyMs,
      selectedWorkReadyMs,
    },
    network: bootNetwork,
    pageErrors: audit.pageErrors,
    persistentCoreReRequestCount,
    preEnterForbiddenUrls: lobbyNetwork.preEnterForbiddenUrls,
    rendererMessages: audit.rendererMessages,
    repeatedWorkReRequestCount,
    repeatedWorkReturnViaUi,
    routeNetworkDelta: {
      encodedBytes: routeEndNetwork.encodedBytes - routeStartNetwork.encodedBytes,
      requestCount: routeEndNetwork.requestCount - routeStartNetwork.requestCount,
    },
    selectedWorkNetworkDelta: {
      encodedBytes: firstWorkNetwork.encodedBytes - routeEndNetwork.encodedBytes,
      requestCount: firstWorkNetwork.requestCount - routeEndNetwork.requestCount,
    },
    steadyRaf,
    web: webAfterBoot,
    webGl,
  };
}

async function createContext(browser, type) {
  const context = await browser.newContext(type === "mobile" ? {
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { width: 390, height: 844 },
  } : {
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(PERF_INIT);
  return context;
}

async function collectSamples({ browser, count, type, baseUrl, prime, measure }) {
  const result = { cold: [], warm: [] };
  for (const cacheState of ["cold", "warm"]) {
    for (let sample = 0; sample < count; sample += 1) {
      const context = await createContext(browser, type);
      if (cacheState === "warm") await prime(context, baseUrl);
      result[cacheState].push(await measure(context, baseUrl, cacheState === "cold"));
      await context.close();
      process.stdout.write(`${type} ${cacheState} ${sample + 1}/${count}\n`);
    }
  }
  return result;
}

function summarizeSamples(samples) {
  const metricPaths = [
    "network.requestCount",
    "network.encodedBytes",
    "network.transferBytes",
    "network.decodedBodyBytes",
    "web.domContentLoadedMs",
    "web.fcpMs",
    "web.lcpMs",
    "web.cls",
    "web.longTaskBlockingMs",
    "web.jsHeap.usedJSHeapBytes",
    "steadyRaf.median",
    "steadyRaf.p95",
    "milestones.readyMs",
    "milestones.startMenuReadyMs",
    "milestones.terminalReadyMs",
    "milestones.lobbyReadyMs",
    "milestones.mainCanvasMs",
    "milestones.enteredMs",
    "milestones.selectedWorkReadyMs",
    "milestones.repeatedWorkReadyMs",
    "routeNetworkDelta.encodedBytes",
    "selectedWorkNetworkDelta.encodedBytes",
    "heapAfterFirstWork.usedJSHeapBytes",
    "heapAfterRepeatedWork.usedJSHeapBytes",
    "heapAfterReturn.usedJSHeapBytes",
  ];
  return Object.fromEntries(
    metricPaths.map((path) => [path, summarizeMetric(samples, path)]).filter(([, value]) => value),
  );
}

function git(command) {
  return execFileSync("git", command, { encoding: "utf8" }).trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { chromium, playwrightVersion } = loadPlaywright(options.playwrightModule);
  const browser = await chromium.launch({
    args: [
      "--enable-precise-memory-info",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-angle=swiftshader",
    ],
    headless: true,
  });
  const startedAt = new Date().toISOString();
  try {
    const mobile = await collectSamples({
      baseUrl: options.baseUrl,
      browser,
      count: options.samples,
      measure: measureMobile,
      prime: primeMobile,
      type: "mobile",
    });
    const coldContent = {};
    for (const [name, path] of Object.entries({
      profile: "/profile",
      devstories: "/devstories",
      work: "/works/arch_treehabitat",
    })) {
      coldContent[name] = await collectSamples({
        baseUrl: options.baseUrl,
        browser,
        count: options.samples,
        measure: (context, baseUrl, cacheDisabled) => measureColdContent(context, baseUrl, path, cacheDisabled),
        prime: (context, baseUrl) => primeContent(context, baseUrl, path),
        type: `content-${name}`,
      });
    }
    const desktop = await collectSamples({
      baseUrl: options.baseUrl,
      browser,
      count: options.samples,
      measure: measureDesktop,
      prime: primeDesktop,
      type: "desktop-simplified",
    });

    const allColdContent = Object.values(coldContent).flatMap((group) => [...group.cold, ...group.warm]);
    const allMobile = [...mobile.cold, ...mobile.warm];
    const allDesktop = [...desktop.cold, ...desktop.warm];
    const hardGates = evaluateHardGates({
      coldContentSamples: allColdContent,
      lobbySamples: allDesktop,
      mobileSamples: allMobile,
      routeSamples: allDesktop,
    });
    const baselineInventory = JSON.parse(git(["show", "HEAD:docs/performance/space-asset-inventory.json"]));
    const currentInventory = JSON.parse(readFileSync("docs/performance/space-asset-inventory.json", "utf8"));
    hardGates.protectedShippingAssetHashesBytesUnchanged = compareShippingAssets(
      baselineInventory,
      currentInventory,
    );
    const report = {
      schemaVersion: 1,
      status: Object.values(hardGates).every((gate) => gate.pass)
        ? "measured_simplified_and_proposed_full"
        : "measured_with_failed_hard_gates",
      environment: {
        baseUrl: options.baseUrl,
        browser: `Chromium ${browser.version()}`,
        cacheProtocol: {
          cold: "new isolated browser context, empty storage, CDP Network.setCacheDisabled(true)",
          warm: "new isolated browser context, one unmeasured same-context prime navigation, HTTP cache enabled, then a fresh measured page",
        },
        captureEndedAt: new Date().toISOString(),
        captureStartedAt: startedAt,
        cpu: cpus()[0]?.model ?? "unknown",
        deviceScaleFactor: 1,
        gitHead: options.sourceGitHead,
        gpu: "headless ANGLE SwiftShader; actual adapter memory unavailable",
        memory: { freeBytesAtReport: freemem(), totalBytes: totalmem() },
        network: "unthrottled local loopback production preview; CDP encodedDataLength and Resource Timing recorded",
        node: process.version,
        os: `${platform()} ${release()}`,
        playwright: playwrightVersion,
        sampleCountPerCacheState: options.samples,
        viewport: { desktop: "1440x900", mobile: "390x844" },
      },
      measurementLimits: {
        fullProfile: "not measured: native WebGPU unavailable in the authorized headless SwiftShader protocol",
        gpuMemory: "unavailable: browser exposes neither reliable per-page texture/buffer residency nor adapter allocation",
        inp: "not reported: scripted interactions are not a representative field INP sample",
        transferQualification: "CDP encodedDataLength includes protocol bytes; Resource Timing transferSize may be zero for cache hits and local preview is not content-encoded",
      },
      definitions: {
        p95: "nearest-rank p95; with three samples this equals the maximum",
        range: "minimum and maximum of finite samples",
        median: "middle value, or arithmetic mean of the two middle values",
      },
      hardGates,
      samples: { coldContent, desktopSimplified: desktop, mobile },
      summaries: {
        coldContent: Object.fromEntries(Object.entries(coldContent).map(([name, group]) => [name, {
          cold: summarizeSamples(group.cold),
          warm: summarizeSamples(group.warm),
        }])),
        desktopSimplified: {
          cold: summarizeSamples(desktop.cold),
          warm: summarizeSamples(desktop.warm),
        },
        mobile: {
          cold: summarizeSamples(mobile.cold),
          warm: summarizeSamples(mobile.warm),
        },
      },
    };
    const output = resolve(options.output);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`Wrote ${output}\n`);
    process.stdout.write(`${JSON.stringify({ hardGates, summaries: report.summaries }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  await main();
}
