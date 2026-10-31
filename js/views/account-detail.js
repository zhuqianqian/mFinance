// js/views/account-detail.js —— 账户详情：基本信息 + 历史对账 + 贷款统计/操作
import { h, money, moneyShort, pct, num, today, toast, confirmDialog, openSheet } from '../util.js';
import { getAccount, snapshotsOf, updateAccount, deleteSnapshot } from '../store.js';
import { TYPES, CASH_SUBKINDS, liveValuation, accountDisplay, fixedValue } from '../models.js';
import { accountBadge, INSTITUTIONS, icon } from '../icons.js';
import { METHODS, loanStats, advanceInterest } from '../loan.js';
import { openAccountForm, openSchedule } from './account-form.js';
import { fetchQuote } from '../valuation.js';

const CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" style="width:7px;height:12px"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function back() { location.hash = '#/accounts'; }

export function render(id) {
  const acc = getAccount(id);
  const root = h('div');
  root.appendChild(h('div', { class: 'detail-head' }, [
    h('button', { class: 'back-btn', html: CHEV_L, onclick: back, 'aria-label': '返回' }),
    h('div', { style: 'flex:1;text-align:center;font-weight:700;font-size:17px', text: acc && acc.type === 'loan' ? '贷款详情' : '账户详情' }),
    acc ? h('button', { class: 'icon-btn', html: icon('edit'), onclick: () => openAccountForm(acc), 'aria-label': '编辑' }) : h('span', { style: 'width:36px' })
  ]));
  if (!acc) { root.appendChild(h('div', { class: 'empty' }, [h('h3', { text: '账户不存在' })])); return root; }

  const { value, kind } = liveValuation(acc);
  root.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'detail-hero' }, [
      accountBadge(acc, 'lg'),
      h('div', { class: 'meta' }, [h('div', { class: 'nm', text: acc.name }), h('div', { class: 'inst', text: subtitle(acc) })]),
      h('div', { style: 'text-align:right' }, [
        acc.type === 'loan' ? h('div', { class: 'muted', style: 'font-size:11px;margin-bottom:1px', text: '剩余本金' }) : null,
        h('div', { class: 'val' + (kind === 'liability' ? ' neg' : ''), text: (kind === 'liability' ? '-' : '') + money(value) })
      ])
    ])
  ]));

  if (acc.type === 'loan') loanBody(root, acc); else assetBody(root, acc);
  historyBody(root, acc);
  return root;
}

function subtitle(acc) {
  const inst = INSTITUTIONS[acc.institutionId];
  const parts = [];
  if (inst) parts.push(inst.label);
  if (acc.type === 'cash') parts.push(CASH_SUBKINDS[acc.subKind] || '');
  else if (acc.type === 'loan') parts.push(METHODS[acc.repaymentMethod]);
  else if (acc.type === 'investment') parts.push(acc.subKind === 'fund' ? '基金' : '股票', acc.code || '');
  else if (acc.type === 'fixed') parts.push({ house: '房产', car: '车辆', other: '其他' }[acc.subKind] || '');
  else if (acc.type === 'credit') parts.push('信用卡');
  return parts.filter(Boolean).join(' · ');
}

/* ---------- 资产类基本信息 ---------- */
function assetBody(root, acc) {
  const lines = [];
  if (acc.type === 'cash') {
    lines.push(['当前余额', money(+acc.currentBalance || 0)]);
    lines.push(['计入流动资金', typeof acc.liquid === 'boolean' ? (acc.liquid ? '是' : '否') : '自动']);
  } else if (acc.type === 'credit') {
    const debt = Math.max(0, (+acc.totalLimit || 0) - (+acc.availableCredit || 0));
    lines.push(['总额度', money(+acc.totalLimit || 0)], ['可用额度', money(+acc.availableCredit || 0)], ['当前欠款', money(debt), true]);
  } else if (acc.type === 'fixed') {
    if (acc.subKind === 'house') { lines.push(['单价', money(+acc.unitPrice || 0) + '/㎡'], ['面积', (+acc.area || 0) + ' ㎡']); }
    if (acc.subKind === 'car') { lines.push(['购入价值', money(+acc.initialValue || 0)], ['年折损率', pct(+acc.depreciationRate || 0)], ['购入日期', acc.purchaseDate || '—']); }
    lines.push(['当前估值', money(fixedValue(acc))]);
    if (acc.valuationOverride != null && acc.valuationOverride !== '') lines.push(['手动估值', money(+acc.valuationOverride)]);
  } else if (acc.type === 'investment') {
    const mv = (+acc.holdingQty || 0) * (+acc.latestPrice || 0);
    lines.push(['代码', acc.code || '—'], ['持仓', (+acc.holdingQty || 0) + (acc.subKind === 'fund' ? ' 份' : ' 股')], ['最新价/净值', acc.latestPrice || '—'], ['市值', money(mv), false, true]);
    if (+acc.costTotal) {
      const costPrice = +acc.costTotal / (+acc.holdingQty || 1);
      const pnl = mv - +acc.costTotal;
      lines.push(['成本价', costPrice.toFixed(3)], ['浮动盈亏', money(pnl), false, false, pnl >= 0]);
    }
  }
  root.appendChild(infoCard(lines));
  if (acc.type === 'investment' && acc.code) {
    root.appendChild(h('button', {
      class: 'btn block', style: 'margin-bottom:14px', text: '🔄 联网更新最新价',
      onclick: async (e) => {
        e.target.disabled = true; e.target.textContent = '获取中…';
        try { const q = await fetchQuote(acc); updateAccount(acc.id, { latestPrice: q.price, priceUpdatedAt: new Date().toISOString() }); toast('已更新：' + q.price); }
        catch (_) { toast('获取失败，请手动填写'); e.target.disabled = false; e.target.textContent = '🔄 联网更新最新价'; }
      }
    }));
  }
}

function infoCard(lines) {
  return h('div', { class: 'card' }, lines.map(([label, val, neg, big, pos]) =>
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:0.5px solid var(--separator)' }, [
      h('span', { class: 'muted', style: 'font-size:14px', text: label }),
      h('span', { class: 'tnum', style: `font-weight:700;${big ? 'font-size:17px;' : ''}${neg ? 'color:var(--negative)' : pos === true ? 'color:var(--positive)' : pos === false ? 'color:var(--negative)' : ''}`, text: val })
    ])
  ));
}

/* ---------- 贷款详情 ---------- */
function loanBody(root, acc) {
  const s = loanStats(acc);
  root.appendChild(h('div', { class: 'stat-grid' }, [
    tile('贷款总额', money(acc.principal)),
    tile('已还本金', money(s.paidPrincipal)),
    tile('总利息', money(s.totalInterest)),
    tile('已付利息', money(s.paidInterest)),
    tile('累计已付', money(s.paidTotal)),
    tile('剩余期数', s.remainingPeriods + ' 期')
  ]));

  root.appendChild(h('div', { class: 'section-label', text: '操作' }));
  root.appendChild(h('div', { class: 'rows' }, [
    opRow('plus', '安排提前还款', () => prepayForm(acc)),
    opRow('percent', '记录利率变更', () => rateForm(acc)),
    opRow('list', '查看完整还款计划', () => openSchedule(acc), true)
  ]));

  if ((acc.rateChanges || []).length) {
    root.appendChild(h('div', { class: 'section-label', text: '利率变更记录' }));
    const rows = h('div', { class: 'rows' });
    [...acc.rateChanges].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).forEach((r) => {
      rows.appendChild(recRow(`${r.effectiveDate}`, `年利率调整为 ${(r.newAnnualRate * 100).toFixed(2)}%`, '', null,
        () => delItem(acc, 'rateChanges', r)));
    });
    root.appendChild(rows);
  }
  const td = today();
  if ((acc.prepayments || []).length) {
    root.appendChild(h('div', { class: 'section-label', text: '提前还款记录' }));
    const rows = h('div', { class: 'rows' });
    [...acc.prepayments].sort((a, b) => b.date.localeCompare(a.date)).forEach((p) => {
      const status = p.date <= td ? '已执行' : '已计划';
      rows.appendChild(recRow(p.date, (p.mode === 'shorten' ? '缩短期限' : '减少每期还款额'), money(p.amount), status,
        () => delItem(acc, 'prepayments', p)));
    });
    root.appendChild(rows);
  }
}

function tile(label, value, big) {
  return h('div', { class: 'stat' }, [h('div', { class: 'stat-label', text: label }), h('div', { class: 'stat-value' + (big ? ' neg' : ''), style: 'font-size:17px', text: value })]);
}
function opRow(glyph, label, onclick, chev) {
  const g = { plus: icon('upload'), percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/><path d="M6 18 18 6"/></svg>', list: icon('reconcile') }[glyph];
  return h('button', { class: 'op-row', onclick }, [h('span', { html: g, style: 'display:flex' }), h('span', { text: label }), chev ? h('span', { class: 'op-chev', html: CHEV_R }) : null]);
}
function recRow(title, sub, amount, status, onDel) {
  return h('div', { class: 'row' }, [
    h('div', { class: 'row-main' }, [h('div', { class: 'row-title', style: 'font-size:15px', text: title }), h('div', { class: 'row-sub', text: sub })]),
    amount ? h('div', { class: 'row-value' }, [h('div', { class: 'amt', style: 'font-size:15px', text: amount }), status ? h('div', { class: 'muted', style: 'font-size:11px', text: status }) : null]) : (status ? h('span', { class: 'pill muted', text: status }) : null),
    h('button', { class: 'icon-btn', style: 'width:30px;height:30px;background:transparent;color:var(--text-4)', html: icon('trash'), onclick: onDel, 'aria-label': '删除' })
  ]);
}
async function delItem(acc, key, item) {
  if (!(await confirmDialog('删除这条记录？'))) return;
  updateAccount(acc.id, { [key]: acc[key].filter((x) => x !== item) });
  toast('已删除');
}

/* 持久化的提前还款 / 利率变更表单 */
function tInput(label, obj, key, { type = 'text', suffix = '' } = {}) {
  const input = h('input', { type: type === 'number' ? 'text' : type, inputmode: type === 'number' ? 'decimal' : null, value: obj[key] ?? '', oninput: (e) => obj[key] = e.target.value });
  const inner = suffix ? h('div', { style: 'position:relative' }, [input, h('span', { style: 'position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--text-3)', text: suffix })]) : input;
  return h('div', { class: 'field' }, [h('label', { text: label }), inner]);
}
function tSeg(label, obj, key, opts) {
  const seg = h('div', { class: 'seg' });
  opts.forEach((o) => seg.appendChild(h('button', { class: obj[key] === o.v ? 'active' : '', text: o.label, onclick: (e) => { obj[key] = o.v; [...seg.children].forEach((b) => b.classList.remove('active')); e.target.classList.add('active'); } })));
  return h('div', { class: 'field' }, [h('label', { text: label }), seg]);
}
function prepayForm(acc) {
  const t = { date: today(), amount: '', mode: 'shorten' };
  const info = h('div', { class: 'hint', style: 'margin:-6px 2px 14px;line-height:1.6' });
  const refresh = () => {
    const amt = num(t.amount);
    if (!amt) { info.innerHTML = ''; return; }
    const interest = advanceInterest(acc, t.date, amt);
    info.innerHTML = `预估额外利息 <b>${money(interest)}</b>（自上一还款日按日计息，计入总利息）<br>本次应还合计 <b>${money(amt + interest)}</b>`;
  };
  const dateF = tInput('还款日期', t, 'date', { type: 'date' });
  const amtF = tInput('提前还款金额', t, 'amount', { type: 'number', suffix: '元' });
  dateF.querySelector('input').addEventListener('input', refresh);
  amtF.querySelector('input').addEventListener('input', refresh);
  const body = h('div', {}, [dateF, amtF, info, tSeg('方式', t, 'mode', [{ v: 'shorten', label: '缩短期限' }, { v: 'reduce', label: '减少月供' }])]);
  const save = h('button', { class: 'btn ghost', style: 'color:var(--accent);font-weight:700', text: '保存', onclick: () => { if (!num(t.amount)) { toast('请输入金额'); return; } updateAccount(acc.id, { prepayments: [...(acc.prepayments || []), { date: t.date, amount: num(t.amount), mode: t.mode }] }); ctl.close(); toast('已添加提前还款'); } });
  const ctl = openSheet('安排提前还款', body, { rightBtn: save });
}
function rateForm(acc) {
  const t = { effectiveDate: today(), newAnnualRate: '' };
  const body = h('div', {}, [tInput('生效日期', t, 'effectiveDate', { type: 'date' }), tInput('新年利率', t, 'newAnnualRate', { type: 'number', suffix: '%' })]);
  const save = h('button', { class: 'btn ghost', style: 'color:var(--accent);font-weight:700', text: '保存', onclick: () => { if (!num(t.newAnnualRate)) { toast('请输入利率'); return; } updateAccount(acc.id, { rateChanges: [...(acc.rateChanges || []), { effectiveDate: t.effectiveDate, newAnnualRate: num(t.newAnnualRate) / 100 }] }); ctl.close(); toast('已记录利率变更'); } });
  const ctl = openSheet('记录利率变更', body, { rightBtn: save });
}

/* ---------- 历史对账记录 ---------- */
function historyBody(root, acc) {
  const snaps = snapshotsOf(acc.id).slice().reverse();
  const valLabel = { cash: '余额', credit: '欠款', fixed: '估值', investment: '市值', loan: '剩余本金' }[acc.type] || '金额';
  root.appendChild(h('div', { class: 'section-label', style: 'display:flex;justify-content:space-between' }, [h('span', { text: '历史对账记录' }), h('span', { class: 'muted', text: `${snaps.length} 条` })]));
  if (!snaps.length) { root.appendChild(h('div', { class: 'card muted', style: 'text-align:center;font-size:14px', text: '暂无记录，去「对账」记录一次' })); return; }
  const rows = h('div', { class: 'rows' });
  snaps.forEach((s) => {
    rows.appendChild(h('div', { class: 'row' }, [
      h('div', { class: 'row-main' }, [h('div', { class: 'row-title', style: 'font-size:15px', text: s.date }), h('div', { class: 'row-sub', text: valLabel + (s.source === 'manual' ? ' · 手动' : '') })]),
      h('div', { class: 'row-value' }, [h('div', { class: 'amt' + (s.kind === 'liability' ? ' neg' : ''), style: 'font-size:15px', text: (s.kind === 'liability' ? '-' : '') + money(s.value) })]),
      h('button', { class: 'icon-btn', style: 'width:30px;height:30px;background:transparent;color:var(--text-4)', html: icon('trash'), onclick: async () => { if (await confirmDialog('删除这条快照？会影响首页趋势。')) { deleteSnapshot(s.id); toast('已删除'); } }, 'aria-label': '删除' })
    ]));
  });
  root.appendChild(rows);
}
