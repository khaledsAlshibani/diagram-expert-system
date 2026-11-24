// Records docs/demo.gif and docs/demo.mp4: the built app (dist/) on the left, demo.html's inference panel on the right.
// Usage: npm run gif [-- --chrome <path to Chrome>]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const demoDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(demoDir, '../..');
const distDir = join(rootDir, 'dist');
const gifOutput = join(rootDir, 'docs/demo.gif');
const videoOutput = join(rootDir, 'docs/demo.mp4');
const chromeFlag = process.argv.indexOf('--chrome');
const executablePath = chromeFlag > -1 ? process.argv[chromeFlag + 1] : undefined;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const ORIGIN = 'http://demo.local';

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

// Serve demo.html and the built app from disk without a server.
await page.route(`${ORIGIN}/**`, (route) => {
  const path = normalize(new URL(route.request().url()).pathname);
  const file = path === '/demo.html' ? join(demoDir, 'demo.html') : join(distDir, path === '/' ? 'index.html' : path);
  route.fulfill({ body: readFileSync(file), contentType: MIME[extname(file)] ?? 'application/octet-stream' });
});

await page.goto(`${ORIGIN}/demo.html`, { waitUntil: 'networkidle' });
const app = page.frameLocator('#app');
await app.locator('.option').first().waitFor();
await page.waitForTimeout(900);

const frames = [];
let isRecording = true;
const startedAt = Date.now();
const capture = (async () => {
  while (isRecording) frames.push({ time: Date.now() - startedAt, image: await page.screenshot({ type: 'png' }) });
})();

const pause = (ms) => page.waitForTimeout(ms);

async function choose(label) {
  const option = app.locator('.option', { hasText: label });
  const box = await option.boundingBox();
  const point = [box.x + box.width * 0.62, box.y + box.height / 2];
  await page.evaluate(([x, y]) => window.demo.moveCursor(x, y), point);
  await pause(1100);
  await page.evaluate(([x, y]) => window.demo.click(x, y), point);
  await option.click();
}

// The consultation from the README example.
await page.evaluate(() => window.demo.intro());
await pause(3200);

await choose('Interactions and user requirements');
await page.evaluate(() => window.demo.answer('goal = interaction', {
  title: 'Next question: interactionFocus', detail: 'Its condition <code>goal = interaction</code> is now known',
  before: 'Your answer is saved as a fact. The engine checks every rule, but no rule can use this fact on its own yet.',
  after: 'Because the goal is now <em>interaction</em>, the follow-up question about interactions becomes available.',
}));
await pause(2600);

await choose('Messages between participants');
await page.evaluate(() => window.demo.answer('interactionFocus = messages', {
  title: 'Next question: messagesDetail', detail: 'Its condition <code>focus = messages</code> was inferred by R09',
  before: 'Both answers are known, so the rule <code>IF goal = interaction AND interactionFocus = messages THEN focus = messages</code> (R09) fires.',
  after: 'A second pass finds nothing new, so the engine stops and asks the question that belongs to that focus.',
}, {
  id: 'R09', when: ['goal = interaction', 'interactionFocus = messages'], then: 'focus = messages',
}));
await pause(2600);

await choose('The order of the messages');
await page.evaluate(() => window.demo.answer('messagesDetail = order', {
  title: 'Recommendation: UML Sequence Diagram', detail: '<code>recommendation</code> is now known, so the consultation ends', done: true,
  before: 'The rule <code>IF focus = messages AND messagesDetail = order THEN recommendation = sequence</code> (R10) fires and picks the diagram.',
  after: 'The result is a <em>UML Sequence Diagram</em>. The rules that fired are shown as the explanation.',
}, {
  id: 'R10', when: ['focus = messages', 'messagesDetail = order'], then: 'recommendation = sequence',
}));
await page.evaluate(() => window.demo.moveCursor(700, 660));
await pause(1200);
await app.locator('.result-body').evaluate((body) => body.scrollTo({ top: 260, behavior: 'smooth' }));
await pause(3600);

isRecording = false;
await capture;
await browser.close();

// Keep each frame on screen for as long as it was captured, then encode with a shared palette.
const frameDir = mkdtempSync(join(tmpdir(), 'demo-gif-'));
let list = '';
frames.forEach((frame, index) => {
  const name = `${String(index).padStart(4, '0')}.png`;
  writeFileSync(join(frameDir, name), frame.image);
  const nextTime = frames[index + 1]?.time ?? frame.time + 100;
  list += `file '${name}'\nduration ${((nextTime - frame.time) / 1000).toFixed(3)}\n`;
});
list += `file '${String(frames.length - 1).padStart(4, '0')}.png'\n`;
writeFileSync(join(frameDir, 'list.txt'), list);

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frameDir, 'list.txt'),
  '-vf', 'fps=15,scale=1280:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
  gifOutput,
]);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frameDir, 'list.txt'),
  '-vf', 'fps=30', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  videoOutput,
]);
rmSync(frameDir, { recursive: true, force: true });
console.log(`${frames.length} frames, ${(frames.at(-1).time / 1000).toFixed(1)}s, saved to docs/demo.gif and docs/demo.mp4`);
