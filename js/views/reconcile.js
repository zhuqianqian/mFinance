// js/views/reconcile.js —— 对账：校准各账户当日余额并生成快照
import { h, money, moneyShort, num, fmtDate, toast } from '../util.js';
import { inputField } from '../forms.js';
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
  const date = suggestedDate();
  if (state.date !== date) { state.date = date; state.vals = {}; }
  const root = h('div');

  root.appendChild(h('div', { class: 'nav-head' }, [
    h('div', {}, [h('h1', { class: 'nav-title', text: '对账' }),
      h('div', { class: 'nav-sub', text: '校准余额并记录快照' })])
  ]));

  if (!accounts.length) {
    root.appendChild(h('div', { class: 'empty' }, [h('div', { html: icon('reconcile') }), h('h3', { text: '暂无账户' }), h('p', { text: '先在「账户」页添加账户。' })]));
    return root;
  }

  root.appendChild(h('div', { class: 'reconcile-actions' }, [
    h('button', { class: 'btn block', html: icon('refresh') + '<span>联网更新行情</span>', onclick: onQuote }),
    h('button', { class: 'btn block', text: '↻ 重新估值', onclick: () => { state.vals = {}; rerender(); } })
  ]));

  // 预填缺失项
  accounts.forEach((a) => { if (state.vals[a.id] == null) state.vals[a.id] = a.type === 'credit' ? num(a.availableCredit) : liveValuation(a, state.date).value; });
  const valueFor = (a) => a.type === 'credit'
    ? liveValuation({ ...a, availableCredit: num(state.vals[a.id]) }, state.date).value
    : num(state.vals[a.id]);

  for (const type of ORDER) {
    const list = accounts.filter((a) => a.type === type);
    if (!list.length) continue;
    root.appendChild(h('div', { class: 'section-label', text: TYPES[type].label }));
    const rows = h('div', { class: 'rows reconcile-rows' });
    list.forEach((a) => {
      const lv = liveValuation(a, state.date);
      const auto = a.type === 'loan' || a.type === 'investment' || a.type === 'fixed';
      const credit = a.type === 'credit';
      const quotaAmount = (value) => moneyShort(value).replace('¥', '').replace('.00万', '万').replace('.00亿', '亿');
      const sub = h('div', { class: 'row-sub', text: (lv.kind === 'liability' ? '欠款 · ' : '') + (auto ? '自动估值（可改）' : '手动校准') });
      const updateQuota = () => {
        sub.textContent = `额度：${quotaAmount(valueFor(a))} / ${quotaAmount(num(a.totalLimit))}`;
        sub.title = `额度：${money(valueFor(a))} / ${money(num(a.totalLimit))}`;
        sub.setAttribute('aria-label', `欠款 ${money(valueFor(a))}，总额度 ${money(num(a.totalLimit))}`);
      };
      if (credit) { sub.setAttribute('aria-live', 'polite'); updateQuota(); }
      const label = credit ? '可用额度' : lv.kind === 'liability' ? '欠款' : auto ? '估值' : '余额';
      const entry = inputField(label, {
        type: 'number', value: state.vals[a.id], compact: true,
        oninput: (e) => {
          state.vals[a.id] = e.target.value;
          if (credit) updateQuota();
          refreshSummary();
        }
      });
      entry.querySelector('input').setAttribute('aria-label', `${a.name} · ${label}`);
      rows.appendChild(h('div', { class: 'row' }, [
        accountBadge(a),
        h('div', { class: 'row-main' }, [
          h('div', { class: 'row-title', text: a.name }),
          sub
        ]),
        entry
      ]));
    });
    root.appendChild(rows);
  }

  const summary = h('div', { class: 'card reconcile-summary' }, [
    colStat('总资产', ''), colStat('总负债', ''), colStat('净资产', '', true)
  ]);
  root.appendChild(summary);
  refreshSummary();
  root.appendChild(h('button', { class: 'btn primary block', style: 'margin-top:16px', text: '✓ 提交对账', onclick: submit }));

  return root;

  function refreshSummary() {
    let assets = 0, liabilities = 0;
    accounts.forEach((a) => {
      if (a.type === 'credit' || a.type === 'loan') liabilities += valueFor(a);
      else assets += valueFor(a);
    });
    const values = [assets, liabilities, assets - liabilities];
    summary.querySelectorAll('.stat-value').forEach((el, i) => { el.textContent = moneyShort(values[i]); });
  }

  function rerender() { const ev = new HashChangeEvent('hashchange'); window.dispatchEvent(ev); }

  async function onQuote(e) {
    const invest = accounts.filter((a) => a.type === 'investment' && a.code);
    if (!invest.length) { toast('没有可更新的投资账户'); return; }
    e.currentTarget.disabled = true;
    toast('正在联网获取行情…');
    const res = await updateAllQuotes(accounts, (acc, q) => {
      if (q) { delete state.vals[acc.id]; updateAccount(acc.id, { latestPrice: q.price, quoteDate: q.time, priceUpdatedAt: new Date().toISOString() }); }
    });
    toast(`行情更新：成功 ${res.ok} · 失败 ${res.fail}`);
    rerender();
  }

  function submit() {
    if (accounts.some((a) => a.type === 'credit' && (String(state.vals[a.id]).trim() === '' || !Number.isFinite(+state.vals[a.id])))) {
      toast('请填写有效的信用卡可用额度'); return;
    }
    const snaps = [];
    accounts.forEach((a) => {
      const lv = liveValuation(a, state.date);
      const value = valueFor(a);
      if (a.type === 'cash') updateAccount(a.id, { currentBalance: value });
      else if (a.type === 'credit') updateAccount(a.id, { availableCredit: num(state.vals[a.id]) });
      else if (a.type === 'fixed' && Math.abs(value - lv.value) > 0.01) {
        updateAccount(a.id, a.subKind === 'house' && num(a.area) > 0
          ? { valuationUnitPrice: value / num(a.area), valuationOverride: null }
          : { valuationOverride: value, valuationUnitPrice: null });
      }
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
