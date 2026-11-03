// Playwright 端到端（识图用 mock）。运行：NODE_PATH=/workspace/pw/node_modules node tools/e2e.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };
const MOCK = `{title: 小星星（练习示例）}
{capo: 2}
{comment: 主歌}
[G]一闪一闪[C]亮晶[G]晶
[C]满天都是[G]小星[D]星
[G]晚风轻轻 [D/F#]吹过[Em7]窗台
[Cadd9]琴声慢慢 [D]唱出[G]未来`;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const results = [];
function check(name, cond, extra='') { results.push({ name, ok: !!cond, extra }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); }
(async () => {
  await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, tag: 'phone' }, { w: 820, h: 1180, tag: 'tablet' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, isMobile: vp.w < 500, hasTouch: true, acceptDownloads: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    let mockCalls = 0, lastBody = null, lastAuth = null;
    await page.route('**/chat/completions', async route => {
      mockCalls++; lastBody = route.request().postDataJSON(); lastAuth = route.request().headers()['authorization'];
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: '```\n' + MOCK + '\n```' } }] }) });
    });
    await page.goto(base); await page.waitForSelector('#sheet-input');
    const T = `[${vp.tag}] `;
    // settings
    await page.evaluate(() => { const d = document.querySelector('#settings'); if (d && d.tagName === 'DETAILS') d.open = true; });
    await page.fill('#set-key', 'test-dummy-key-123');
    await page.click('#btn-save-settings');
    const stored = await page.evaluate(() => localStorage.getItem('uke-chords-settings-v1'));
    check(T + 'settings saved to localStorage', stored && stored.includes('test-dummy-key-123'));
    check(T + 'default provider is Moonshot kimi-k3.1-pro', stored && stored.includes('api.moonshot.cn') && stored.includes('kimi-k3.1-pro'), stored);
    // upload image (tiny png)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('#file-album', { name: 'sheet.png', mimeType: 'image/png', buffer: png });
    await page.click('#btn-recognize');
    await page.waitForFunction(() => document.querySelector('#sheet-input').value.includes('小星星'), null, { timeout: 15000 });
    check(T + 'vision mock called once', mockCalls === 1, String(mockCalls));
    check(T + 'request content is array with image_url', lastBody && Array.isArray(lastBody.messages.at(-1).content) && lastBody.messages.at(-1).content.some(c => c.type === 'image_url' && String(c.image_url.url).startsWith('data:image/')));
    check(T + 'request model + bearer', lastBody && lastBody.model === 'kimi-k3.1-pro' && lastAuth === 'Bearer test-dummy-key-123');
    const ta = await page.inputValue('#sheet-input');
    check(T + 'code fence stripped', !ta.includes('```'));
    const capoVal = await page.inputValue('#capo');
    check(T + 'capo auto-filled to 2', capoVal === '2', capoVal);
    // edit
    await page.fill('#sheet-input', ta.replace('[G]晚风轻轻', '[G]晚风轻轻吹'));
    await page.click('#btn-to-twoline'); const two = await page.inputValue('#sheet-input');
    check(T + 'to two-line format', !/\[[A-G]/.test(two.split('\n').filter(l => !l.startsWith('{')).join('\n')));
    await page.click('#btn-to-chordpro'); const cp = await page.inputValue('#sheet-input');
    check(T + 'back to ChordPro', cp.includes('[G]一闪一闪') && cp.includes('晚风轻轻吹'));
    await page.click('#btn-convert');
    await page.waitForSelector('#output svg');
    const names = await page.$$eval('#output svg', s => s.length);
    const outText = await page.textContent('#output');
    // capo 2: G C D D/F# Em7 Cadd9 -> A D E E Gbm7/F#m7 Dadd9
    check(T + 'capo applied (G->A, Em7->F#m7, Cadd9->Dadd9)', /A/.test(outText) && /F#m7|Gbm7/.test(outText) && /Dadd9/.test(outText) && !/Cadd9/.test(outText), outText.slice(0, 200));
    check(T + 'slash chord falls back in diagrams (no E/G# diagram)', !(await page.$$eval('#output svg', ss => ss.some(s => s.textContent.includes('/')))));
    check(T + 'diagram count = unique uke chords (A D E F#m7 Dadd9 = 5)', names === 5, String(names));
    // transpose -2 -> back to G shapes
    await page.selectOption('#transpose', '-2'); await page.click('#btn-convert');
    const out2 = await page.textContent('#output');
    check(T + 'transpose -2 gives G/C/D/Em7/Cadd9', /Em7/.test(out2) && /Cadd9/.test(out2), out2.slice(0, 120));
    await page.selectOption('#transpose', '0'); await page.click('#btn-convert');
    // suggestions
    await page.click('#btn-suggest'); await page.waitForSelector('#suggestions :is(button,li,[data-semitones])');
    const sug = await page.textContent('#suggestions');
    check(T + 'suggestions shown with reason', sug.length > 20 && /降|升|原调/.test(sug), sug.slice(0, 160));
    // alignment check: chord sits above intended char
    const align = await page.evaluate(() => {
      const segs = [...document.querySelectorAll('#output .segment')];
      return segs.slice(0, 6).map(s => { const c = s.querySelector('.chord, [class*=chord]'); const t = s.querySelector('.lyric, [class*=lyric], .text'); if (!c || !t) return null; const a = c.getBoundingClientRect(), b = t.getBoundingClientRect(); return { dx: Math.abs(a.left - b.left), above: a.bottom <= b.top + 2 }; });
    });
    check(T + 'chords left-aligned above their lyric char', align.length > 0 && align.every(x => x && x.dx < 2 && x.above), JSON.stringify(align));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(T + 'no horizontal scroll', overflow <= 0, String(overflow));
    // export
    await page.click('#btn-export');
    await page.waitForFunction(() => { const i = document.querySelector('#export-preview img, img#export-preview'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
    const img = await page.evaluate(() => { const i = document.querySelector('#export-preview img, img#export-preview'); return { w: i.naturalWidth, h: i.naturalHeight, src: i.src.slice(0, 30) }; });
    check(T + 'PNG preview rendered', img.w >= 1000 && img.h > 600, JSON.stringify(img));
    const href = await page.getAttribute('#export-download', 'href'); const dl = await page.getAttribute('#export-download', 'download');
    check(T + 'download link', href && dl && /\.png$/.test(dl), `${dl} ${href && href.slice(0, 20)}`);
    if (href) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-download')]);
      const p = await download.path(); const buf = fs.readFileSync(p);
      check(T + 'downloaded file is PNG', buf.slice(1, 4).toString() === 'PNG', String(buf.length) + ' bytes');
      fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
      fs.copyFileSync(p, path.join(ROOT, 'screenshots', `export-${vp.tag}.png`));
    }
    // screenshot of the result
    fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
    await page.evaluate(() => document.querySelector('#output').scrollIntoView());
    await page.screenshot({ path: path.join(ROOT, 'screenshots', vp.tag === 'phone' ? 'phone-demo.png' : 'tablet-demo.png') });
    await page.screenshot({ path: path.join(ROOT, 'screenshots', `${vp.tag}-full.png`), fullPage: true });
    // sample button flow (no vision)
    await page.click('#btn-sample'); const smp = await page.inputValue('#sheet-input');
    check(T + 'sample sheet has Capo 2 and title', /Capo 2|capo: ?2/i.test(smp) && smp.includes('小星星'));
    // clear key
    await page.click('#btn-clear-key');
    const after = await page.evaluate(() => localStorage.getItem('uke-chords-settings-v1') || '');
    check(T + 'clear key removes key', !after.includes('test-dummy-key-123'));
    check(T + '0 console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close(); server.close();
  const fail = results.filter(r => !r.ok).length;
  console.log(`\nE2E: ${results.length - fail}/${results.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
