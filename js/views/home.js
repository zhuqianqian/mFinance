// js/views/home.js —— 首页：净资产卡 + 关键指标 + 趋势/构成图
import { h, money, moneyShort, pct } from '../util.js';
import { headline, series, totalsAsOf, reconcileDates, categoryOf } from '../models.js';
import { getAccounts } from '../store.js';
import { icon } from '../icons.js';
import { lineChart, donutChart } from '../charts.js';

// 资产构成分类 -> 固定颜色槽（色随实体，不随排序）
const CAT_SLOT = { '银行储蓄': 0, '网络钱包': 1, '投资理财': 2, '固定资产': 3, '公积金': 4, '其他': 5 };
function catColorVar(cat) { return `var(--cat-${(CAT_SLOT[cat] ?? 7) + 1})`; }

export function render() {
  const root = h('div');
  const dates = reconcileDates();

  root.appendChild(h('div', { class: 'nav-head' }, [
    h('div', {}, [h('h1', { class: 'nav-title', text: '资产总览' }),
      h('div', { class: 'nav-sub', text: dates.length ? `截至 ${dates[dates.length - 1]}` : '尚无对账记录' })])
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

  // 净资产 Hero
  const hero = h('div', { class: 'hero' }, [
    h('div', { class: 'hero-label', text: '净资产' }),
    h('div', { class: 'hero-value', text: money(cur.net) }),
    h('div', { class: 'hero-cmp' }, [cmp('环比', cur.net, prev && prev.net), cmp('同比', cur.net, yoy && yoy.net)])
  ]);
  root.appendChild(hero);

  // 指标
  root.appendChild(h('div', { class: 'stat-grid' }, [
    statCard('总资产', money(cur.assets), '--positive'),
    statCard('总负债', money(cur.liabilities), '--negative'),
    statCard('流动资金', money(cur.liquid), '--teal'),
    statCard('负债率', pct(cur.debtRatio), cur.debtRatio > 0.5 ? '--warning' : '--purple')
  ]));

  // 趋势
  const s = series();
  const trend = h('div', { class: 'card' }, [
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
      h('div', { class: 'card-title', style: 'margin:0', text: '净资产趋势' }),
      h('div', { class: 'muted', style: 'font-size:12px', text: `${s.length} 期` })
    ]),
    h('div', { style: 'height:8px' })
  ]);
  trend.appendChild(lineChart(s.map((p) => ({ date: p.date, value: p.net }))));
  root.appendChild(trend);

  // 构成
  const comp = cur.composition;
  const items = Object.entries(comp).sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: cssResolve(catColorVar(label)) }));
  const compCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title', text: '资产构成' }),
    donutChart(items, { centerLabel: '总资产', total: cur.assets })
  ]);
  root.appendChild(compCard);

  return root;
}

function cmp(label, cur, base) {
  if (base == null) return h('span', { class: 'cmp', html: `${label} <b class="muted">--</b>` });
  const diff = cur - base;
  const rate = base !== 0 ? diff / Math.abs(base) : 0;
  const up = diff >= 0;
  const cls = up ? 'delta-up' : 'delta-down';
  const arrow = up ? '▲' : '▼';
  return h('span', { class: 'cmp', html: `${label} <b class="${cls}">${arrow} ${moneyShort(Math.abs(diff))}</b> <span class="${cls}">(${pct(Math.abs(rate))})</span>` });
}

function statCard(label, value, colorVar) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'stat-label' }, [h('span', { class: 'stat-dot', style: `background:var(${colorVar})` }), label]),
    h('div', { class: 'stat-value', text: value })
  ]);
}

// 把 var(--cat-n) 解析为具体色值（charts 需要实色做 SVG stroke）
function cssResolve(varExpr) {
  const m = varExpr.match(/--cat-\d/);
  if (!m) return varExpr;
  return getComputedStyle(document.documentElement).getPropertyValue(m[0]).trim() || '#888';
}
