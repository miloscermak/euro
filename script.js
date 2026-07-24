/* Vlastní stoeurovka
 * Celá bankovka se kreslí na canvas 1740×945.
 * Fotka/emoji se převede na "rytinu": vodorovné vlnité linky,
 * jejichž tloušťka odpovídá tmavosti obrazu – stejný princip
 * jako u skutečných bankovkových rytin, jen o dost levnější.
 */

const W = 1740, H = 945;
const CX = 985, CY = 470, R = 440;      // střední kruh s motivem
const INK = '#14501e';                   // barva "tiskařské" zelené

const canvas = document.getElementById('note');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');

// ---- Stav aplikace ----
const state = {
  source: { type: 'emoji', emoji: '🍺', img: null },
  zoom: 1,
  panX: 0,
  panY: 0,
  denom: '100',
  label: 'EURO',
  signature: 'Mario Draghi',
};

// ---- Pseudonáhodná čísla s pevným seedem (ať se pozadí nemění při každém překreslení) ----
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ---- Převod nápisu do řecké a cyrilské podoby (jen vtipná aproximace) ----
const GREEK = { A:'Α',B:'Β',C:'Κ',D:'Δ',E:'Ε',F:'Φ',G:'Γ',H:'Η',I:'Ι',J:'Ι',K:'Κ',L:'Λ',M:'Μ',N:'Ν',O:'Ο',P:'Π',Q:'Θ',R:'Ρ',S:'Σ',T:'Τ',U:'Υ',V:'Β',W:'Ω',X:'Ξ',Y:'Υ',Z:'Ζ' };
const CYRIL = { A:'А',B:'Б',C:'Ц',D:'Д',E:'Е',F:'Ф',G:'Г',H:'Х',I:'И',J:'Й',K:'К',L:'Л',M:'М',N:'Н',O:'О',P:'П',Q:'К',R:'Р',S:'С',T:'Т',U:'У',V:'В',W:'Ш',X:'Х',Y:'У',Z:'З' };

function transliterate(text, map) {
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (plain === 'EURO') return map === GREEK ? 'ΕΥΡΩ' : 'ЕВРО';
  return [...plain].map(ch => map[ch] || ch).join('');
}

// ---- Pěticípá hvězda ----
function drawStar(c, cx, cy, r, color, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.4;
    const a = rot + (i * Math.PI) / 5;
    c[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

// =====================================================================
// POZADÍ BANKOVKY (kreslí se jednou do offscreen canvasu a pak jen kopíruje)
// =====================================================================
let bgCache = null;

function drawBackground() {
  if (bgCache) { ctx.drawImage(bgCache, 0, 0); return; }
  bgCache = document.createElement('canvas');
  bgCache.width = W; bgCache.height = H;
  const c = bgCache.getContext('2d');
  const rng = makeRng(42);

  // papír
  c.fillStyle = '#f2efe0';
  c.fillRect(0, 0, W, H);

  // žlutozelený nádech nahoře
  let g = c.createLinearGradient(0, 0, 0, 260);
  g.addColorStop(0, 'rgba(225,232,110,0.85)');
  g.addColorStop(1, 'rgba(225,232,110,0)');
  c.fillStyle = g;
  c.fillRect(260, 0, 1180, 260);

  // světle zelený pruh vpravo
  g = c.createLinearGradient(1420, 0, 1740, 0);
  g.addColorStop(0, 'rgba(190,225,190,0.35)');
  g.addColorStop(0.3, 'rgba(205,232,205,0.85)');
  g.addColorStop(1, 'rgba(215,238,215,0.95)');
  c.fillStyle = g;
  c.fillRect(1400, 0, 340, H);

  // střední kruh (podklad pro motiv)
  g = c.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
  g.addColorStop(0, '#e6ee8e');
  g.addColorStop(0.55, '#cfe374');
  g.addColorStop(1, '#aed45e');
  c.fillStyle = g;
  c.beginPath();
  c.arc(CX, CY, R, 0, Math.PI * 2);
  c.fill();

  // šachovnice na okrajích (levý pruh + pravé rohy)
  const palette = ['#bfe0a8', '#e4f0c8', '#9ed49a', '#d3ead8', '#eee9c8'];
  for (let y = 0; y < H; y += 34) {
    for (let x = 0; x < 44; x += 22) {
      c.fillStyle = palette[Math.floor(rng() * palette.length)];
      c.fillRect(x, y, 22, 34);
    }
  }
  for (const [ry0, ry1] of [[0, 160], [790, H]]) {
    for (let y = ry0; y < ry1; y += 32) {
      for (let x = 1640; x < W; x += 33) {
        c.fillStyle = palette[Math.floor(rng() * palette.length)];
        c.fillRect(x, y, 33, 32);
      }
    }
  }

  // jemné vodorovné linky přes celou bankovku (tisková textura)
  c.strokeStyle = 'rgba(30,70,30,0.05)';
  c.lineWidth = 1;
  for (let y = 2; y < H; y += 4) {
    c.beginPath(); c.moveTo(46, y); c.lineTo(1400, y); c.stroke();
  }

  // bílé tečky přes střed (rastr jako na skutečné bankovce)
  c.fillStyle = 'rgba(255,255,255,0.4)';
  for (let y = 20; y < H - 10; y += 14) {
    for (let x = 470; x < 1430; x += 14) {
      c.beginPath(); c.arc(x + (y % 28 === 0 ? 7 : 0), y, 1.7, 0, Math.PI * 2); c.fill();
    }
  }

  // žluté kroužky ("bublinky") vlevo od kruhu
  c.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    const x = 360 + rng() * 200;
    const y = 130 + rng() * 620;
    if (Math.hypot(x - CX, y - CY) < R + 15) continue;
    c.strokeStyle = 'rgba(210,205,60,0.75)';
    c.beginPath(); c.arc(x, y, 4 + rng() * 5, 0, Math.PI * 2); c.stroke();
  }

  // hvězdy
  drawStar(c, 565, 455, 34, '#f2d422');
  drawStar(c, 612, 622, 30, '#b9b3d9');
  drawStar(c, 1128, 108, 30, '#9aa3ad');

  // přerušovaný ochranný proužek
  c.fillStyle = 'rgba(25,45,35,0.3)';
  for (let y = 0; y < H; y += 62) c.fillRect(1396, y, 9, 40);

  ctx.drawImage(bgCache, 0, 0);
}

// =====================================================================
// RYTINA – převod fotky/emoji na bankovkový styl
// =====================================================================
const S = 880; // rozlišení čtverce s motivem (2×R)

function renderSource() {
  // zdrojový obraz (fotka nebo emoji) nakreslený na bílém podkladu
  const src = document.createElement('canvas');
  src.width = src.height = S;
  const c = src.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, S, S);

  if (state.source.type === 'photo' && state.source.img) {
    const img = state.source.img;
    const base = Math.max(S / img.width, S / img.height); // cover
    const scale = base * state.zoom;
    c.drawImage(
      img,
      S / 2 - (img.width * scale) / 2 + state.panX,
      S / 2 - (img.height * scale) / 2 + state.panY,
      img.width * scale,
      img.height * scale
    );
  } else {
    c.font = `${Math.round(S * 0.72 * state.zoom)}px serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(state.source.emoji, S / 2 + state.panX, S / 2 + S * 0.04 + state.panY);
  }
  return src;
}

function computeDarkness(src) {
  // tmavost 0–1 s automatickým roztažením kontrastu (percentily 2 a 98)
  const data = src.getContext('2d').getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  const hist = new Uint32Array(256);
  for (let i = 0; i < S * S; i++) {
    const j = i * 4;
    const l = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
    lum[i] = l;
    hist[Math.round(l)]++;
  }
  const total = S * S;
  let acc = 0, lo = 0, hi = 255;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.02) { hi = i; break; } }
  const range = Math.max(1, hi - lo);
  const dark = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    dark[i] = 1 - Math.min(1, Math.max(0, (lum[i] - lo) / range));
  }
  return dark;
}

function engrave(src) {
  const dark = computeDarkness(src);
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const c = out.getContext('2d');
  c.fillStyle = INK;

  const darkAt = (x, y) => {
    const xi = Math.min(S - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(S - 1, Math.max(0, Math.round(y)));
    return dark[yi * S + xi];
  };

  // vodorovné vlnité linky – tloušťka podle tmavosti (jádro celého efektu)
  const step = 5;
  for (let y = step; y < S; y += step) {
    let seg = [];
    const flush = () => {
      if (seg.length < 2) { seg = []; return; }
      c.beginPath();
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i];
        c[i === 0 ? 'moveTo' : 'lineTo'](p.x, p.y - p.w / 2);
      }
      for (let i = seg.length - 1; i >= 0; i--) {
        const p = seg[i];
        c.lineTo(p.x, p.y + p.w / 2);
      }
      c.closePath();
      c.fill();
      seg = [];
    };
    for (let x = 0; x <= S; x += 3) {
      const yy = y + Math.sin(x * 0.022 + y * 0.6) * 1.6;
      const t = darkAt(x, yy);
      if (t < 0.08) { flush(); continue; }
      seg.push({ x, y: yy, w: 0.5 + t * 4.1 });
    }
    flush();
  }

  // svislé linky navíc v nejtmavších místech (šrafování dodá hloubku)
  for (let x = 4; x < S; x += 8) {
    let seg = [];
    const flush = () => {
      if (seg.length < 2) { seg = []; return; }
      c.beginPath();
      for (let i = 0; i < seg.length; i++) c[i === 0 ? 'moveTo' : 'lineTo'](seg[i].x - seg[i].w / 2, seg[i].y);
      for (let i = seg.length - 1; i >= 0; i--) c.lineTo(seg[i].x + seg[i].w / 2, seg[i].y);
      c.closePath();
      c.fill();
      seg = [];
    };
    for (let y = 0; y <= S; y += 3) {
      const t = darkAt(x, y);
      if (t < 0.55) { flush(); continue; }
      seg.push({ x, y, w: 0.4 + (t - 0.55) * 3 });
    }
    flush();
  }

  // kruhová maska s měkkým okrajem
  const mask = c.createRadialGradient(S / 2, S / 2, S * 0.38, S / 2, S / 2, S / 2);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.92, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = mask;
  c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'source-over';

  return out;
}

// =====================================================================
// TEXTY A PRVKY PŘES MOTIV
// =====================================================================
function fitText(c, text, font, maxWidth) {
  c.font = font;
  const w = c.measureText(text).width;
  return w > maxWidth ? maxWidth : undefined; // fillText s maxWidth text stlačí
}

function drawOverlay() {
  const denom = state.denom || '100';

  // --- vlajka EU ---
  ctx.fillStyle = '#39329e';
  ctx.fillRect(140, 58, 162, 104);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    drawStar(ctx, 221 + Math.cos(a) * 34, 110 + Math.sin(a) * 34, 7, '#ffd617');
  }

  // --- podpis prezidenta ECB legrace ---
  ctx.save();
  ctx.translate(145, 205);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#2b2f8f';
  ctx.font = '44px "Snell Roundhand", "Segoe Script", cursive';
  ctx.fillText(state.signature, 0, 0, 300);
  ctx.restore();

  // --- svislý text u levého okraje ---
  ctx.save();
  ctx.translate(96, 900);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#1c4a1c';
  ctx.font = 'bold 27px Arial';
  ctx.fillText('©BCE ECB ЕЦБ EZB EKP EKT ESB EKB BCE EBC 2019', 0, 0, 830);
  ctx.restore();

  // --- velká hodnota nahoře ---
  ctx.save();
  let g = ctx.createLinearGradient(400, 80, 900, 320);
  g.addColorStop(0, '#1c5a2a');
  g.addColorStop(1, '#14417e');
  ctx.fillStyle = g;
  const topFont = '900 235px "Arial Black", Arial, sans-serif';
  const squish = fitText(ctx, denom, topFont, 520);
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillText(denom, 420, 300, squish);
  ctx.restore();

  // --- hodnota dole vlevo ---
  ctx.save();
  g = ctx.createLinearGradient(150, 700, 560, 890);
  g.addColorStop(0, '#2c7a3f');
  g.addColorStop(1, '#0f3d1e');
  ctx.fillStyle = g;
  const botFont = '900 190px "Arial Black", Arial, sans-serif';
  ctx.fillText(denom, 150, 880, fitText(ctx, denom, botFont, 400));
  ctx.restore();

  // --- nápis EURO / ΕΥΡΩ / ЕВРО ---
  const label = (state.label || 'EURO').toUpperCase();
  ctx.font = '84px Arial';
  ctx.fillStyle = '#3a3a3a';
  ctx.fillText(label, 558, 728, 330);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillText(transliterate(label, GREEK), 558, 812, 330);
  ctx.fillStyle = '#a3a3a3';
  ctx.fillText(transliterate(label, CYRIL), 558, 896, 330);

  // --- modrý hologramový štítek s hodnotou ---
  ctx.save();
  g = ctx.createLinearGradient(1450, 45, 1600, 185);
  g.addColorStop(0, '#39b7e8');
  g.addColorStop(1, '#0b2e86');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(1450, 45);
  ctx.lineTo(1600, 45);
  ctx.lineTo(1600, 140);
  ctx.quadraticCurveTo(1585, 178, 1525, 188);
  ctx.quadraticCurveTo(1465, 178, 1450, 140);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d2f4f';
  ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(denom, 1525, 128, 130);
  ctx.restore();

  // --- stříbrné hologramy vpravo ---
  const silver = (x, y, w, h) => {
    const sg = ctx.createLinearGradient(x, y, x + w, y + h);
    sg.addColorStop(0, '#d9d9d9');
    sg.addColorStop(0.5, '#a8a8a8');
    sg.addColorStop(1, '#8b8b8b');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
  };
  ctx.save();
  ctx.textAlign = 'center';

  silver(1452, 252, 144, 180);
  ctx.fillStyle = 'rgba(70,70,70,0.85)';
  ctx.font = 'bold 110px Georgia';
  ctx.fillText('€', 1524, 375);

  silver(1450, 472, 148, 208);
  ctx.strokeStyle = 'rgba(90,90,90,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath(); // budova s antickým průčelím
  ctx.moveTo(1462, 545); ctx.lineTo(1524, 508); ctx.lineTo(1586, 545); ctx.closePath();
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const x = 1468 + i * 22.5;
    ctx.strokeRect(x, 552, 9, 96);
  }
  ctx.strokeRect(1460, 652, 128, 14);

  silver(1452, 718, 144, 178);
  ctx.fillStyle = 'rgba(70,70,70,0.85)';
  ctx.font = 'bold 120px Georgia';
  ctx.fillText('€', 1524, 848);
  ctx.restore();

  // --- mikroskopická sériová čísla ---
  ctx.save();
  ctx.fillStyle = '#3a6b4a';
  ctx.font = '13px Menlo, monospace';
  ctx.translate(1622, 640);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${denom} E019B ${denom} EU98B ${denom} E019B ${denom}`.slice(0, 48), 0, 0);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#2a5a3a';
  ctx.font = '13px Menlo, monospace';
  ctx.translate(1728, 900);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('U19B8073 D-VA098L 30110326I', 0, 0);
  ctx.restore();

  // --- povinná legrace ---
  ctx.fillStyle = 'rgba(30,50,30,0.5)';
  ctx.font = 'bold 19px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SPECIMEN · JEN PRO LEGRACI · NENÍ ZÁKONNÉ PLATIDLO', 870, 936);
  ctx.textAlign = 'left';
}

// =====================================================================
// HLAVNÍ VYKRESLENÍ
// =====================================================================
let renderQueued = false;

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  const engraved = engrave(renderSource());
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(engraved, CX - S / 2, CY - S / 2);
  ctx.restore();

  drawOverlay();
}

// =====================================================================
// OVLÁDÁNÍ
// =====================================================================
document.getElementById('file').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) loadPhoto(f);
});

function loadPhoto(file) {
  const img = new Image();
  img.onload = () => {
    state.source = { type: 'photo', img };
    state.panX = 0; state.panY = 0;
    state.zoom = 1;
    document.getElementById('zoom').value = 1;
    hint.hidden = true;
    requestRender();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
}

// drag & drop fotky přímo na bankovku
canvas.addEventListener('dragover', e => { e.preventDefault(); hint.hidden = false; });
canvas.addEventListener('dragleave', () => { hint.hidden = true; });
canvas.addEventListener('drop', e => {
  e.preventDefault();
  hint.hidden = true;
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadPhoto(f);
});

// emoji galerie
document.getElementById('emojiRow').addEventListener('click', e => {
  const btn = e.target.closest('button[data-emoji]');
  if (!btn) return;
  state.source = { type: 'emoji', emoji: btn.dataset.emoji, img: null };
  state.panX = 0; state.panY = 0;
  requestRender();
});

// posouvání motivu tažením po canvasu
let dragging = null;
canvas.addEventListener('pointerdown', e => {
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const factor = canvas.width / canvas.getBoundingClientRect().width;
  state.panX += (e.clientX - dragging.x) * factor;
  state.panY += (e.clientY - dragging.y) * factor;
  dragging = { x: e.clientX, y: e.clientY };
  requestRender();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

// posuvník a textová pole
document.getElementById('zoom').addEventListener('input', e => {
  state.zoom = parseFloat(e.target.value);
  requestRender();
});
for (const id of ['denom', 'label', 'signature']) {
  document.getElementById(id).addEventListener('input', e => {
    state[id] = e.target.value;
    requestRender();
  });
}

// stažení PNG
document.getElementById('download').addEventListener('click', () => {
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `moje-${(state.denom || '100').replace(/\W/g, '')}eurovka.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
});

// sdílení přes Web Share API (na mobilu rovnou do aplikací)
document.getElementById('share').addEventListener('click', () => {
  canvas.toBlob(async blob => {
    const file = new File([blob], 'moje-stoeurovka.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Moje vlastní stoeurovka' });
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      // fallback: prohlížeč sdílení souborů neumí, tak aspoň stáhneme
      document.getElementById('download').click();
    }
  }, 'image/png');
});

// první vykreslení
render();
