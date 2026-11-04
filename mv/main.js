/* timeline manager: scenes, captions, flashes, ending */
const SCENES = [];
const scenesRoot = document.getElementById('scenes');
function addScene(t0, t1, build, z = 0) {
  const root = el('div', 'scene', scenesRoot); root.style.zIndex = z; root.style.display = 'none';
  const sc = { t0, t1, root }; sc.render = build(root, sc) || (() => {}); SCENES.push(sc); return sc;
}
// flashes: [start, peak, end, max]
const FLASHES = [];
function addFlash(a, b, c, m = 1) { FLASHES.push([a, b, c, m]); }
function flashAll(t) {
  let v = t < 17.9 ? flashAt(t) : 0;
  for (const [a, b, c, m] of FLASHES) if (t >= a && t < c) v = Math.max(v, m * (t < b ? E.inQ(P(t, a, b)) : 1 - E.outQ(P(t, b, c))));
  return v;
}
// ---------- captions (toned-down per-glyph pop) ----------
const capRoot = document.getElementById('cap');
const capLines = LYR.map(([a, b, s]) => { const ln = el('div', 'line', capRoot); ln.style.display = 'none'; const chs = [...s].map(c => el('span', 'ch', ln, stroked(c))); return { a, b, ln, chs }; });
const CAPHIDE = []; // [t0,t1] ranges where captions sit higher, e.g. when something occupies the bottom
function renderCaps(t) {
  capLines.forEach(({ a, b, ln, chs }) => {
    const on = t >= a - .02 && t < b;
    vis(ln, on); if (!on) return;
    const out = E.inQ(P(t, b - .18, b));
    ln.style.opacity = 1 - out; ln.style.transform = `translateY(${out * 24}px)`;
    chs.forEach((c, i) => {
      const ti = a + i * .03, k = P(t, ti, ti + .2);
      const s = t < ti ? .6 : spring(t - ti, .6, 18, 11);
      c.style.opacity = E.outQ(P(t, ti, ti + .1));
      c.style.transform = `translateY(${(1 - E.outC(k)) * 16}px) scale(${s})`;
    });
  });
}
const END = 218.3;
window.renderAt = function (t) {
  // intro scenes (0–17.9) live in intro.js
  const intro = t < 17.9;
  vis(A, intro && t < 1.09); vis(B, intro && t >= 1.06 && t < 4.88); vis(C, intro && t >= 4.36 && t < 8.6); vis(D, intro && t >= 8.6 && t < 15.6);
  fade.style.opacity = 0;
  if (intro) {
    if (t < 1.09) renderA(t);
    if (t >= 1.06 && t < 4.88) renderB(t);
    if (t >= 4.36 && t < 8.6) renderC(t);
    if (t >= 8.6 && t < 15.6) renderD(t);
  }
  for (const sc of SCENES) { const on = t >= sc.t0 && t < sc.t1; vis(sc.root, on); if (on) sc.render(t); }
  renderCaps(t);
  flash.style.opacity = flashAll(t);
  // CRT switch-off at the very end
  const k1 = P(t, END - .5, END - .32), k2 = P(t, END - .32, END - .1);
  if (t < END - .5) { all.style.transform = ''; all.style.filter = ''; all.style.opacity = 1; offline.style.opacity = 0; }
  else if (t < END - .32) { all.style.transform = `scale(${1 + k1 * .04},${Math.max(.004, 1 - E.inQ(k1))})`; all.style.filter = `brightness(${1 + k1 * 3})`; all.style.opacity = 1; offline.style.opacity = 0; }
  else { all.style.opacity = 0; offline.style.opacity = t < END - .1 ? 1 : 0; offline.style.transform = `scaleX(${Math.max(.002, 1 - E.outC(k2))}) scaleY(${1 - k2 * .5})`; }
};
window.preloadFonts = async function () {
  const txt = document.getElementById('stage').textContent + LYR.map(l => l[2]).join('') + '▌0123456789%⚠：:，。！？～·';
  await Promise.all([
    document.fonts.load('400 40px "ZCOOL KuaiLe"', txt), document.fonts.load('700 40px "Noto Sans SC"', txt), document.fonts.load('900 40px "Noto Sans SC"', txt),
    document.fonts.load('400 20px "Press Start 2P"', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%:/.¥+-'), document.fonts.load('400 36px "VT323"', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:;(){}[]=<>/+-*."\'_ '),
  ]);
  await document.fonts.ready;
  return [...document.fonts].filter(f => f.status === 'loaded').length;
};
