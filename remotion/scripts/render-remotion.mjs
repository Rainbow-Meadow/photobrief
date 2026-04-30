import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outPath = process.argv[2] || "/mnt/documents/photobrief-demo.mp4";
const stillFrame = process.env.STILL_FRAME ? parseInt(process.env.STILL_FRAME, 10) : null;

console.log("Bundling...");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

console.log("Opening browser...");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

console.log(`Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps to ${outPath}...`);

if (stillFrame !== null) {
  const { renderStill } = await import("@remotion/renderer");
  await renderStill({
    composition,
    serveUrl: bundled,
    output: outPath,
    frame: stillFrame,
    puppeteerInstance: browser,
  });
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
}

await browser.close({ silent: false });
console.log("Done →", outPath);
