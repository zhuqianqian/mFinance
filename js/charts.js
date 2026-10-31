// js/charts.js —— 自绘 SVG 图表（遵循 dataviz：细线、圆端、2px 间隙、hover 层）
import { h, moneyShort, money, pct } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
export function catColor(i) { return cssVar(`--cat-${(i % 8) + 1}`); }

/* ---------- 趋势折线（单系列，含十字光标 tooltip） ---------- */
export function lineChart(points, { height = 190, fmt = moneyShort } = {}) {
  const wrap = h('div', { style: 'position:relative;width:100%;touch-action:pan-y;' });
  if (!points.length) return wrap;

  const W = 340, H = height, padL = 10, padR = 10, padT = 14, padB = 22;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, preserveAspectRatio: 'none', style: 'overflow:visible;display:block' });

  const xs = points.map((_, i) => points.length === 1 ? W / 2 : padL + (i * (W - padL - padR)) / (points.length - 1));
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12; min -= pad; max += pad;
  const yOf = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  // 网格（3 条，弱）
  const grid = cssVar('--chart-grid');
  for (let g = 0; g <= 2; g++) {
    const y = padT + (g * (H - padT - padB)) / 2;
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: grid, 'stroke-width': 1 }));
  }

  const accent = cssVar('--cat-1') || cssVar('--accent');
  // 面积
  const area = `M${xs[0]},${yOf(vals[0])} ` + xs.map((x, i) => `L${x},${yOf(vals[i])}`).join(' ') +
    ` L${xs[xs.length - 1]},${H - padB} L${xs[0]},${H - padB} Z`;
  const grad = svgEl('linearGradient', { id: 'ln-grad', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(svgEl('stop', { offset: 0, 'stop-color': accent, 'stop-opacity': 0.28 }));
  grad.appendChild(svgEl('stop', { offset: 1, 'stop-color': accent, 'stop-opacity': 0 }));
  const defs = svgEl('defs'); defs.appendChild(grad); svg.appendChild(defs);
  svg.appendChild(svgEl('path', { d: area, fill: 'url(#ln-grad)' }));

  // 线（2px、圆端圆角）
  const line = `M` + xs.map((x, i) => `${x},${yOf(vals[i])}`).join(' L');
  svg.appendChild(svgEl('path', { d: line, fill: 'none', stroke: accent, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', vector_effect: 'non-scaling-stroke' }));
  // 末点标记（>=8px）
  const lastX = xs[xs.length - 1], lastY = yOf(vals[vals.length - 1]);
  svg.appendChild(svgEl('circle', { cx: lastX, cy: lastY, r: 3.4, fill: cssVar('--card'), stroke: accent, 'stroke-width': 2 }));

  // 交互层
  const cursor = svgEl('line', { x1: 0, y1: padT, x2: 0, y2: H - padB, stroke: accent, 'stroke-width': 1, opacity: 0 });
  const dot = svgEl('circle', { r: 4, fill: accent, stroke: cssVar('--card'), 'stroke-width': 2, opacity: 0 });
  svg.appendChild(cursor); svg.appendChild(dot);
  wrap.appendChild(svg);

  const tip = h('div', { style: 'position:absolute;pointer-events:none;background:var(--card);border:0.5px solid var(--separator);box-shadow:var(--shadow-pop);border-radius:10px;padding:6px 10px;font-size:12px;opacity:0;transition:opacity .1s;white-space:nowrap;z-index:5;' });
  wrap.appendChild(tip);

  // x 轴端点标签
  const xlab = h('div', { style: 'display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-top:2px;' }, [
    h('span', { text: points[0].date.slice(2) }),
    points.length > 2 ? h('span', { text: points[points.length - 1].date.slice(2) }) : null
  ]);
  wrap.appendChild(xlab);

  function move(clientX) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let idx = 0, best = Infinity;
    xs.forEach((x, i) => { const d = Math.abs(x - px); if (d < best) { best = d; idx = i; } });
    const x = xs[idx], y = yOf(vals[idx]);
    cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); cursor.setAttribute('opacity', 0.5);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
    tip.style.opacity = '1';
    tip.innerHTML = `<b style="font-size:13px;">${fmt(vals[idx])}</b><br><span style="color:var(--text-3)">${points[idx].date}</span>`;
    const leftPct = (x / W) * 100;
    tip.style.left = `calc(${leftPct}% )`;
    tip.style.transform = `translateX(${leftPct > 60 ? '-100%' : '-50%'})`;
    tip.style.top = '0px';
  }
  function end() { cursor.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.style.opacity = '0'; }
  svg.addEventListener('pointermove', (e) => move(e.clientX));
  svg.addEventListener('pointerdown', (e) => move(e.clientX));
  svg.addEventListener('pointerleave', end);
  return wrap;
}

/* ---------- 资产构成环形（分类色、直接标签 + 图例、2px 间隙） ---------- */
export function donutChart(items, { centerLabel = '总资产', total = null } = {}) {
  const sum = total != null ? total : items.reduce((a, b) => a + b.value, 0);
  const wrap = h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap;' });
  if (sum <= 0 || !items.length) { wrap.appendChild(h('div', { class: 'muted', text: '暂无资产数据' })); return wrap; }

  const size = 150, r = 62, cx = size / 2, cy = size / 2, sw = 22;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: 150, height: 150, style: 'flex-shrink:0' });
  const C = 2 * Math.PI * r;
  const gap = 2; // px 间隙
  let offset = 0;
  const surface = cssVar('--card');
  items.forEach((it, i) => {
    const frac = it.value / sum;
    const len = Math.max(0, frac * C - gap);
    const circle = svgEl('circle', {
      cx, cy, r, fill: 'none', stroke: it.color, 'stroke-width': sw,
      'stroke-dasharray': `${len} ${C - len}`, 'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${cx} ${cy})`, 'stroke-linecap': 'butt'
    });
    circle.style.cursor = 'default';
    const title = svgEl('title'); title.textContent = `${it.label} ${money(it.value)} (${pct(frac)})`;
    circle.appendChild(title);
    svg.appendChild(circle);
    offset += frac * C;
  });
  // 中心文字
  const center = h('div', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;' }, [
    h('div', { class: 'muted', style: 'font-size:11px', text: centerLabel }),
    h('div', { style: 'font-size:15px;font-weight:800;font-family:var(--num);', text: moneyShort(sum) })
  ]);
  const ring = h('div', { style: 'position:relative;width:150px;height:150px;flex-shrink:0;' }, [svg, center]);

  // 图例（色点 + 名称 + 金额 + 占比）—— 文字用文本色，身份靠色点
  const legend = h('div', { style: 'flex:1;min-width:150px;display:flex;flex-direction:column;gap:7px;' });
  items.forEach((it) => {
    legend.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;font-size:13px;' }, [
      h('span', { style: `width:10px;height:10px;border-radius:3px;background:${it.color};flex-shrink:0;` }),
      h('span', { style: 'flex:1;color:var(--text-2)', text: it.label }),
      h('span', { class: 'tnum', style: 'font-weight:700', text: moneyShort(it.value) }),
      h('span', { class: 'muted tnum', style: 'width:42px;text-align:right', text: pct(it.value / sum) })
    ]));
  });
  wrap.appendChild(ring); wrap.appendChild(legend);
  return wrap;
}
