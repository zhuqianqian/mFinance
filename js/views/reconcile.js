// js/views/reconcile.js —— 对账：校准各账户当日余额并生成快照
import { h, money, moneyShort, num, fmtDate, toast } from '../util.js';
import { getAccounts, getSettings, putSnapshotsBatch, updateAccount, updateSettings } from '../store.js';
import { TYPES, liveValuation } from '../models.js';
import { accountBadge, icon } from '../icons.js';
import { updateAllQuotes } from '../valuation.js';

const ORDER = ['cash', 'investment', 'fixed', 'credit', 'loan'];

function suggestedDate() {
  const s = getSettings();
  const d = new Date();
  const day = Math.min(s.reconcileDay || 1, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
  const cand = new Date(d.getFullYear(), d.getMonth(), day);
  return fmtDate(cand <= d ? cand : new Date(d.getFullYear(), d.getMonth() - 1, day));
}

// 模块级，跨重渲染保留用户输入
let state = { date: null, vals: {} };

export function render() {
  const accounts = getAccounts();
  if (!state.date) state.date = suggestedDate();
  const root = h('div');

  root.appendChild(h('div', { class: 'nav-head' }, [
    h('div', {}, [h('h1', { class: 'nav-title', text: '对账' }),
      h('div', { class: 'nav-sub', text: '校准余额并记录当日快照' })])
  ]));

  if (!accounts.length) {
    root.appendChild(h('div', { class: 'empty' }, [h('div', { html: icon('reconcile') }), h('h3', { text: '暂无账户' }), h('p', { text: '先在「账户」页添加账户。' })]));
    return root;
  }

  root.appendChild(h('div', { class: 'card', style: 'display:flex;align-items:center;justify-content:space-between;gap:10px' }, [
    h('div', {}, [h('div', { class: 'stat-label', text: '对账日期' }),
      h('div', { class: 'muted', style: 'font-size:12px;margin-top:2px', text: `设定对账日：每月 ${getSettings().reconcileDay} 日` })]),
    h('input', { type: 'date', value: state.date, style: 'width:auto', onchange: (e) => { state.date = e.target.value; state.vals = {}; rerender(); } })
  ]));

  root.appendChild(h('div', { style: 'display:flex;gap:10px;margin-bottom:14px' }, [
    h('button', { class: 'btn block', style: 'display:flex', html: icon('refresh') + '<span style="margin-left:6px">联网更新行情</span>', onclick: onQuote }),
    h('button', { class: 'btn block', text: '↻ 重新估值', onclick: () => { state.vals = {}; rerender(); } })
  ]));

  // 预填缺失项
  accounts.forEach((a) => { if (state.vals[a.id] == null) state.vals[a.id] = liveValuation(a, state.date).value; });

  let assets = 0, liab = 0;
  for (const type of ORDER) {
    const list = accounts.filter((a) => a.type === type);
    if (!list.length) continue;
    root.appendChild(h('div', { class: 'section-label', text: TYPES[type].label }));
    const rows = h('div', { class: 'rows' });
    list.forEach((a) => {
      const lv = liveValuation(a, state.date);
      const auto = a.type === 'loan' || a.type === 'investment' || a.type === 'fixed';
      if (lv.kind === 'liability') liab += num(state.vals[a.id]); else assets += num(state.vals[a.id]);
      rows.appendChild(h('div', { class: 'row' }, [
        accountBadge(a),
        h('div', { class: 'row-main' }, [
          h('div', { class: 'row-title', style: 'font-size:15px', text: a.name }),
          h('div', { class: 'row-sub', text: (lv.kind === 'liability' ? '欠款 · ' : '') + (auto ? '自动估值（可改）' : '手动校准') })
        ]),
        h('input', {
          type: 'text', inputmode: 'decimal', value: state.vals[a.id],
          style: 'width:118px;text-align:right;font-family:var(--num);padding:8px 10px',
          oninput: (e) => { state.vals[a.id] = e.target.value; }
        })
      ]));
    });
    root.appendChild(rows);
  }

  root.appendChild(h('div', { class: 'card', style: 'margin-top:14px;display:flex;justify-content:space-around;text-align:center' }, [
    colStat('总资产', moneyShort(assets)), colStat('总负债', moneyShort(liab)), colStat('净资产', moneyShort(assets - liab), true)
  ]));
  root.appendChild(h('button', { class: 'btn primary block', style: 'margin-top:16px', text: '✓ 提交对账', onclick: submit }));

  return root;

  function rerender() { const ev = new HashChangeEvent('hashchange'); window.dispatchEvent(ev); }

  async function onQuote(e) {
    const invest = accounts.filter((a) => a.type === 'investment' && a.code);
    if (!invest.length) { toast('没有可更新的投资账户'); return; }
    e.currentTarget.disabled = true;
    toast('正在联网获取行情…');
    const res = await updateAllQuotes(accounts, (acc, q) => {
      if (q) { delete state.vals[acc.id]; updateAccount(acc.id, { latestPrice: q.price, priceUpdatedAt: new Date().toISOString() }); }
    });
    toast(`行情更新：成功 ${res.ok} · 失败 ${res.fail}`);
    rerender();
  }

  function submit() {
    const snaps = [];
    accounts.forEach((a) => {
      const lv = liveValuation(a, state.date);
      const value = num(state.vals[a.id]);
      if (a.type === 'cash') updateAccount(a.id, { currentBalance: value });
      else if (a.type === 'credit') updateAccount(a.id, { availableCredit: Math.max(0, (+a.totalLimit || 0) - value) });
      else if (a.type === 'fixed' && Math.abs(value - lv.value) > 0.01) updateAccount(a.id, { valuationOverride: value });
      // 投资类手动调整只记入当日快照，不改写账户（避免覆盖后续联网行情）
      snaps.push({ accountId: a.id, date: state.date, value, kind: lv.kind, source: 'manual' });
    });
    putSnapshotsBatch(snaps);
    updateSettings({ lastReconcileDate: state.date });
    state.vals = {};
    toast('对账完成，已记录快照 ✓');
    location.hash = '#/home';
  }
}
function colStat(label, value, big) {
  return h('div', {}, [h('div', { class: 'stat-label', style: 'justify-content:center', text: label }),
    h('div', { class: 'stat-value', style: big ? '' : 'font-size:18px', text: value })]);
}
