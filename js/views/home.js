// js/views/home.js —— 首页：净资产卡 + 指标面板 + 趋势(可切指标/区间) + 资产构成
import { h, money, moneyShort, pct, clear } from '../util.js';
import { fieldControl } from '../forms.js';
import { headline, series } from '../models.js';
import { getAccounts } from '../store.js';
import { icon } from '../icons.js';
import { lineChart, donutChart } from '../charts.js';

const CAT_SLOT = { '资产账户': 0, '股票 / 基金': 1, '固定资产': 2, '信用卡': 4, '贷款': 5, '其他': 3 };
const catColorVar = (cat) => `var(--cat-${(CAT_SLOT[cat] ?? 7) + 1})`;
function cssResolve(varExpr) {
  const m = varExpr.match(/--cat-\d/);
  return m ? (getComputedStyle(document.documentElement).getPropertyValue(m[0]).trim() || '#888') : varExpr;
}
function debtRatioLevel(ratio) {
  if (ratio < 0.2) return { label: '偏低', color: 'var(--teal)' };
  if (ratio <= 0.5) return { label: '健康', color: 'var(--positive)' };
  return { label: '偏高', color: 'var(--negative)' };
}

// 把 money 的 ¥ 拆成小号前缀
function heroAmount(n) {
  const s = money(n);
  return `${n < 0 ? '−' : ''}<span class="cur">¥</span>${s.replace(/[-¥]/g, '')}`;
}

export function render() {
  const root = h('div');

  root.appendChild(h('div', { class: 'nav-head' }, [
    h('div', {}, [h('h1', { class: 'nav-title', text: '财务总览' })])
  ]));

  const hl = headline();
  if (!hl) {
    root.appendChild(h('div', { class: 'empty' }, [
      h('div', { html: icon('home') }),
      h('h3', { text: '还没有对账数据' }),
      h('p', { text: getAccounts().length ? '去「对账」记录一次，首页就会显示净资产与趋势。' : '先添加账户，再做一次对账。' }),
      h('a', { class: 'btn primary', href: getAccounts().length ? '#/reconcile' : '#/accounts', text: getAccounts().length ? '去对账' : '去添加账户' })
    ]));
    return root;
  }
  const { cur, prev, yoy } = hl;

  // 净资产大卡
  root.appendChild(h('div', { class: 'hero' }, [
    h('div', { class: 'hero-label' }, [h('span', { text: '净资产' }), h('span', { class: 'hero-date', text: `截至 ${cur.date}` })]),
    h('div', { class: 'hero-value', style: `--amount-length:${money(cur.net).length}`, html: heroAmount(cur.net) }),
    h('div', { class: 'hero-cmp' }, [cmp('环比', cur.net, prev && prev.net), cmp('同比', cur.net, yoy && yoy.net)])
  ]));

  // 指标面板 2×2
  const debtLevel = debtRatioLevel(cur.debtRatio);
  root.appendChild(h('div', { class: 'metrics-panel' }, [
    metric('总资产', money(cur.assets), 'var(--positive)'),
    metric('总负债', money(cur.liabilities), 'var(--negative)', { colorValue: true }),
    metric('流动资金', money(cur.liquid), 'var(--teal)'),
    metric('负债率', pct(cur.debtRatio), debtLevel.color, { colorValue: true, status: debtLevel.label, hint: '低于 20%：偏低；20%–50%：健康；高于 50%：偏高' })
  ]));

  // 趋势图（可切换指标与区间）
  const s = series();
  const state = { metric: 'net', range: 0 };
  const chartBox = h('div', { style: 'margin-top:8px' });
  function drawChart() {
    clear(chartBox);
    let data = state.range ? s.slice(-state.range) : s;
    const isPct = state.metric === 'ratio';
    const pts = data.map((p) => ({ date: p.date, value: isPct ? p.debtRatio : p.net }));
    chartBox.appendChild(lineChart(pts, {
      fmt: isPct ? (v) => pct(v) : moneyShort, percent: isPct,
      color: cssResolve(isPct ? 'var(--cat-6)' : 'var(--cat-1)')
    }));
  }
  const seg = h('div', { class: 'seg', style: 'width:auto' });
  [['net', '净资产'], ['ratio', '负债率']].forEach(([v, label]) => {
    seg.appendChild(h('button', { class: state.metric === v ? 'active' : '', text: label, onclick: (e) => { state.metric = v; [...seg.children].forEach((b) => b.classList.remove('active')); e.target.classList.add('active'); drawChart(); } }));
  });
  const rangeSel = h('select', { onchange: (e) => { state.range = +e.target.value; drawChart(); } }, [
    h('option', { value: '0', text: '全部' }),
    h('option', { value: '6', text: '近 6 期' }),
    h('option', { value: '12', text: '近 12 期' })
  ]);
  const trend = h('div', { class: 'card' }, [
    h('div', { class: 'chart-head' }, [seg, fieldControl('时间范围', rangeSel, { compact: true })]),
    chartBox
  ]);
  root.appendChild(trend);
  drawChart();

  // 按账户页的大类查看资产 / 负债构成。
  const compositionBox = h('div', { style: 'margin-top:14px' });
  const compositionSeg = h('div', { class: 'seg' });
  function drawComposition(kind) {
    clear(compositionBox);
    const debt = kind === 'liability';
    const items = Object.entries(debt ? cur.liabilityComposition : cur.composition)
      .filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: cssResolve(catColorVar(label)) }));
    compositionBox.appendChild(donutChart(items, {
      centerLabel: debt ? '总负债' : '总资产', total: debt ? cur.liabilities : cur.assets,
      emptyLabel: debt ? '暂无负债数据' : '暂无资产数据'
    }));
  }
  [['asset', '资产构成'], ['liability', '负债构成']].forEach(([kind, label]) => {
    compositionSeg.appendChild(h('button', { class: kind === 'asset' ? 'active' : '', text: label, onclick: (e) => {
      [...compositionSeg.children].forEach((b) => b.classList.toggle('active', b === e.currentTarget));
      drawComposition(kind);
    } }));
  });
  root.appendChild(h('div', { class: 'card' }, [
    compositionSeg, compositionBox
  ]));
  drawComposition('asset');

  return root;
}

function cmp(label, cur, base) {
  if (base == null) return h('span', { class: 'cmp', html: `${label} <b style="color:#ffffff9e">--</b>` });
  const diff = cur - base;
  const rate = base !== 0 ? diff / Math.abs(base) : 0;
  const up = diff >= 0;
  const cls = up ? 'delta-up' : 'delta-down';
  const arrow = up ? '▲' : '▼';
  return h('span', { class: 'cmp', html: `${label} <b class="${cls}">${arrow} ${moneyShort(Math.abs(diff))}</b> <span class="pct ${cls}">${pct(Math.abs(rate))}</span>` });
}

function metric(label, value, color, { colorValue = false, status = '', hint = '' } = {}) {
  return h('div', { class: 'metric-box', title: hint || null }, [
    h('div', { class: 'metric-label' }, [
      h('span', { class: 'dot', style: `background:${color}` }), label,
      status ? h('span', { class: 'metric-status', style: `color:${color}`, text: status }) : null
    ]),
    h('div', { class: 'metric-val', style: `--amount-length:${value.length};${colorValue ? `color:${color}` : ''}`, text: value })
  ]);
}
