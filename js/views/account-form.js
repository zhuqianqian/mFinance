// js/views/account-form.js —— 新增/编辑账户（五类）+ 还款计划 + 利率变更 + 提前还款
import { h, clear, openSheet, confirmDialog, toast, num, today, money, moneyShort } from '../util.js';
import { inputField, fieldControl, segmentedField } from '../forms.js';
import { addAccount, updateAccount, deleteAccount } from '../store.js';
import { TYPES, CASH_SUBKINDS, defaultLiquid, liveValuation, carMonthlyRate } from '../models.js';
import { INSTITUTIONS, instBadge, banksGrouped, BANKS, localeDefaultRegion, icon } from '../icons.js';
import { METHODS, DAYCOUNTS, generateSchedule, summarize } from '../loan.js';
import { fetchQuote } from '../valuation.js';

/* 默认草稿 */
function defaults(type) {
  const base = { type, name: '', note: '', liquid: undefined };
  const map = {
    cash: { subKind: 'bank', institutionId: '', currentBalance: '' },
    credit: { institutionId: '', totalLimit: '', availableCredit: '' },
    fixed: { subKind: 'house', initialValue: '', unitPrice: '', area: '', valuationUnitPrice: '', monthlyDepreciationRate: '', purchaseDate: today(), valuationOverride: '' },
    investment: { subKind: 'stock', code: '', market: '', holdingQty: '', latestPrice: '', costTotal: '' },
    loan: { institutionId: '', principal: '', initialAnnualRate: '', periods: '', disbursementDate: today(), firstPaymentDate: '', repaymentMethod: 'equal_payment', dayCount: '30E/360', rateChanges: [], prepayments: [] }
  };
  return Object.assign(base, map[type]);
}

/* 载入时：利率/折损率 小数->百分比，便于编辑 */
function toDraft(acc) {
  const d = structuredClone(acc);
  if (d.type === 'loan') {
    if (d.initialAnnualRate !== '' && d.initialAnnualRate != null) d.initialAnnualRate = round4(d.initialAnnualRate * 100);
    (d.rateChanges || []).forEach((r) => r.newAnnualRate = round4(r.newAnnualRate * 100));
  }
  if (d.type === 'fixed') {
    d.valuationOverride ??= '';
    d.valuationUnitPrice ??= '';
    if (d.subKind === 'house' && d.valuationUnitPrice === '' && d.valuationOverride !== '' && num(d.area) > 0) {
      d.valuationUnitPrice = num(d.valuationOverride) / num(d.area);
      d.valuationOverride = '';
    }
    if (d.subKind === 'car') {
      d._originalMonthlyRate = carMonthlyRate(d);
      d.monthlyDepreciationRate = round4(d._originalMonthlyRate * 100);
    }
  }
  return d;
}
const round4 = (n) => Math.round(n * 10000) / 10000;

/* 保存时：清洗 + 百分比->小数 */
function clean(d) {
  const o = { type: d.type, name: (d.name || '').trim(), note: d.note || '', liquid: d.liquid };
  if (d.type === 'cash') {
    const wallets = ['alipay', 'wechat', 'unionpay'];
    o.institutionId = d.institutionId || '';
    o.subKind = o.institutionId === 'gongjijin' ? 'gongjijin'
      : wallets.includes(o.institutionId) ? o.institutionId
      : (o.institutionId === 'cash_other' || !o.institutionId) ? 'other' : 'bank';
    o.currentBalance = num(d.currentBalance);
  } else if (d.type === 'credit') {
    o.institutionId = d.institutionId; o.totalLimit = num(d.totalLimit); o.availableCredit = num(d.availableCredit);
  } else if (d.type === 'fixed') {
    o.subKind = d.subKind; o.initialValue = num(d.initialValue);
    o.valuationOverride = d.valuationOverride == null || d.valuationOverride === '' ? null : num(d.valuationOverride);
    o.valuationUnitPrice = null;
    if (d.subKind === 'house') {
      o.unitPrice = num(d.unitPrice); o.area = num(d.area);
      o.valuationUnitPrice = d.valuationUnitPrice == null || d.valuationUnitPrice === '' ? null : num(d.valuationUnitPrice);
      if (o.valuationUnitPrice != null) o.valuationOverride = null;
    }
    if (d.subKind === 'car') {
      o.monthlyDepreciationRate = d._originalMonthlyRate != null && num(d.monthlyDepreciationRate) === round4(d._originalMonthlyRate * 100)
        ? d._originalMonthlyRate : num(d.monthlyDepreciationRate) / 100;
      o.depreciationRate = null; o.purchaseDate = d.purchaseDate;
    }
  } else if (d.type === 'investment') {
    o.subKind = d.subKind; o.code = (d.code || '').trim(); o.market = d.market || '';
    o.holdingQty = num(d.holdingQty); o.latestPrice = num(d.latestPrice); o.costTotal = num(d.costTotal);
    o.priceUpdatedAt = d.priceUpdatedAt || null; o.quoteDate = d.quoteDate || null;
  } else if (d.type === 'loan') {
    Object.assign(o, {
      institutionId: d.institutionId, principal: num(d.principal),
      initialAnnualRate: num(d.initialAnnualRate) / 100, periods: Math.round(num(d.periods)),
      disbursementDate: d.disbursementDate, firstPaymentDate: d.firstPaymentDate || d.disbursementDate,
      repaymentMethod: d.repaymentMethod, dayCount: d.dayCount,
      rateChanges: (d.rateChanges || []).map((r) => ({ effectiveDate: r.effectiveDate, newAnnualRate: num(r.newAnnualRate) / 100 })),
      prepayments: (d.prepayments || []).map((p) => ({ date: p.date, amount: num(p.amount), mode: p.mode }))
    });
  }
  return o;
}

/* ---------- 字段构件 ---------- */
function fInput(label, d, key, { type = 'text', ph = '', hint = '', suffix = '', stacked = false } = {}) {
  return inputField(label, {
    type, value: d[key], placeholder: ph, hint, suffix, stacked,
    oninput: (e) => { d[key] = e.target.value; }
  });
}
function fSeg(label, d, key, opts, onchange) {
  const seg = h('div', { class: 'seg' });
  opts.forEach((o) => seg.appendChild(h('button', { class: d[key] === o.v ? 'active' : '', text: o.label, onclick: (e) => {
    d[key] = o.v;
    [...seg.children].forEach((b) => b.classList.toggle('active', b === e.currentTarget));
    onchange && onchange();
  } })));
  return segmentedField(label, seg);
}
const PICK_CHEV = '<svg viewBox="0 0 24 24" style="width:8px;height:14px"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function instField(label, d, rebuild, opts = {}) {
  const inst = INSTITUTIONS[d.institutionId];
  const row = h('button', {
    class: 'picker-field',
    onclick: () => openBankPicker(d.institutionId, (id) => { d.institutionId = id; if (!d.name) d.name = INSTITUTIONS[id].label; rebuild(); }, opts)
  }, [
    inst ? instBadge(d.institutionId, {}) : h('div', { class: 'badge', style: 'background:var(--card-2);color:var(--text-3);font-size:18px' }, '?'),
    h('span', { style: 'flex:1;text-align:left;' + (inst ? '' : 'color:var(--text-3)'), text: inst ? inst.label : '点击选择' }),
    h('span', { style: 'color:var(--text-4)', html: PICK_CHEV })
  ]);
  return fieldControl(label, row);
}

function openBankPicker(currentId, onPick, opts = {}) {
  const rec = localeDefaultRegion();
  const groups = banksGrouped();
  const listWrap = h('div', { class: 'pick-list' });
  const search = inputField('搜索银行 / 机构', { type: 'search', placeholder: '搜索银行 / 机构', hideLabel: true, oninput: (e) => renderList(e.target.value) });

  const match = (b, kw) => (opts.wallets || !b.wallet) && (!kw || b.label.toLowerCase().includes(kw) || (b.en && b.en.toLowerCase().includes(kw)) || b.id.includes(kw));
  const makeRow = (b) => h('button', { class: 'pick-row', onclick: () => { onPick(b.id); ctl.close(); } }, [
    instBadge(b.id, {}),
    h('span', { class: 'nm', text: b.label }),
    b.en ? h('span', { class: 'en', text: b.en }) : null,
    currentId === b.id ? h('span', { class: 'ck', text: '✓' }) : null
  ]);
  const section = (title, items) => {
    if (!items.length) return;
    listWrap.appendChild(h('div', { class: 'section-label', text: title }));
    const box = h('div', { class: 'rows' });
    items.forEach((b) => box.appendChild(makeRow(b)));
    listWrap.appendChild(box);
  };
  function renderList(q) {
    clear(listWrap);
    const kw = (q || '').trim().toLowerCase();
    let count = 0;
    if (!kw) { const recItems = BANKS.filter((b) => b.region === rec && match(b, '')); section('推荐', recItems); count += recItems.length; }
    groups.forEach(([region, banks]) => { const items = banks.filter((b) => match(b, kw)); if (items.length) { section(region, items); count += items.length; } });
    if (!count) listWrap.appendChild(h('div', { class: 'empty', style: 'padding:40px 20px' }, [h('p', { text: '未找到相关机构' })]));
  }
  renderList('');
  const body = h('div', {}, [
    h('div', { style: 'position:sticky;top:-16px;background:var(--bg);padding:4px 0 0;z-index:3;margin:-4px 0 0' }, [search]),
    listWrap
  ]);
  const ctl = openSheet('选择银行 / 机构', body);
}

/* ---------- 各类型表单体 ---------- */
function buildBody(d, rebuild) {
  const frag = document.createDocumentFragment();
  const liquidToggle = () => fSeg('计入流动资金', d, '_liquid', [{ v: 'auto', label: '自动' }, { v: 'yes', label: '计入流动资金' }, { v: 'no', label: '不计入' }]);
  // 流动资金三态用独立 key 映射
  if (d._liquid === undefined) d._liquid = d.liquid === true ? 'yes' : d.liquid === false ? 'no' : 'auto';

  if (d.type === 'cash') {
    frag.appendChild(instField('所属机构', d, rebuild, { wallets: true }));
    frag.appendChild(fInput('账户名称', d, 'name', { ph: '如：工资卡 / 零钱' }));
    frag.appendChild(fInput('当前余额', d, 'currentBalance', { type: 'number', ph: '0.00', suffix: '元' }));
    frag.appendChild(liquidToggle());
  } else if (d.type === 'credit') {
    frag.appendChild(instField('发卡行', d, rebuild));
    frag.appendChild(fInput('卡片名称', d, 'name', { ph: '如：招行信用卡' }));
    frag.appendChild(h('div', { class: 'field row2' }, [
      fInput('总额度', d, 'totalLimit', { type: 'number', suffix: '元' }),
      fInput('可用额度', d, 'availableCredit', { type: 'number', suffix: '元' })
    ]));
    const debt = Math.max(0, num(d.totalLimit) - num(d.availableCredit));
    frag.appendChild(h('div', { class: 'hint', style: 'margin:-6px 2px 10px', html: `当前欠款（自动）：<b>${money(debt)}</b>` }));
  } else if (d.type === 'fixed') {
    frag.appendChild(fSeg('资产类型', d, 'subKind', [{ v: 'house', label: '房产' }, { v: 'car', label: '车辆' }, { v: 'other', label: '其他' }], rebuild));
    frag.appendChild(fInput('名称', d, 'name', { ph: d.subKind === 'house' ? '如：自住房' : d.subKind === 'car' ? '如：家用车' : '资产名称' }));
    const valuationFields = h('div');
    const valuationHint = h('div', { class: 'hint valuation-preview', 'aria-live': 'polite' });
    const refreshValuation = () => {
      valuationHint.textContent = `当前估值：${money(liveValuation(clean(d)).value)}`;
    };
    if (d.subKind === 'house') {
      valuationFields.appendChild(h('div', { class: 'field row2' }, [
        fInput('参考单价', d, 'unitPrice', { type: 'number', suffix: '元/㎡' }),
        fInput('面积', d, 'area', { type: 'number', suffix: '㎡' })
      ]));
      valuationFields.appendChild(fInput('初始价值', d, 'initialValue', { type: 'number', suffix: '元', hint: '未填单价×面积时用作估值基准' }));
      valuationFields.appendChild(fInput('手动估值单价（可选）', d, 'valuationUnitPrice', { type: 'number', suffix: '元/㎡', hint: '当前估值 = 手动单价 × 面积；留空使用参考单价' }));
      if (d.valuationOverride !== '' && d.valuationOverride != null) {
        valuationFields.appendChild(h('div', { class: 'hint', text: `原手动总估值 ${money(num(d.valuationOverride))} 已保留，填写面积和手动单价后替换。` }));
      }
    } else if (d.subKind === 'car') {
      valuationFields.appendChild(h('div', { class: 'field row2' }, [
        fInput('购入价值', d, 'initialValue', { type: 'number', suffix: '元' }),
        fInput('月折损率', d, 'monthlyDepreciationRate', { type: 'number', suffix: '%', ph: '如 1' })
      ]));
      valuationFields.appendChild(fInput('购入日期', d, 'purchaseDate', { type: 'date' }));
    } else {
      valuationFields.appendChild(fInput('初始价值', d, 'initialValue', { type: 'number', suffix: '元' }));
    }
    if (d.subKind !== 'house') {
      const overrideField = fInput('手动估值（可选）', d, 'valuationOverride', { type: 'number', suffix: '元', hint: '填写后优先于自动估值；留空恢复自动估值' });
      valuationFields.appendChild(overrideField);
      if (d.subKind === 'car') {
        valuationFields.appendChild(h('button', { class: 'btn block', text: '按月折损率计算当前估值', onclick: () => {
          if (!d.purchaseDate || num(d.initialValue) <= 0) { toast('请先填写购入价值和日期'); return; }
          if (!Number.isFinite(+d.monthlyDepreciationRate) || num(d.monthlyDepreciationRate) < 0 || num(d.monthlyDepreciationRate) > 100) { toast('月折损率应为 0%～100%'); return; }
          d.valuationOverride = liveValuation({ ...clean(d), valuationOverride: null }).value;
          overrideField.querySelector('input').value = d.valuationOverride;
          refreshValuation();
          toast('已按月折损率计算当前估值');
        } }));
        valuationFields.appendChild(h('div', { class: 'hint', style: 'margin:6px 0 12px', text: '以购入价值复利折旧，按天折算月数。' }));
      }
    }
    valuationFields.addEventListener('input', refreshValuation);
    refreshValuation();
    frag.appendChild(valuationFields);
    frag.appendChild(valuationHint);
  } else if (d.type === 'investment') {
    frag.appendChild(fSeg('类型', d, 'subKind', [{ v: 'stock', label: '股票' }, { v: 'fund', label: '基金' }], rebuild));
    frag.appendChild(fInput('名称', d, 'name', { ph: d.subKind === 'fund' ? '如：沪深300ETF' : '如：贵州茅台' }));
    frag.appendChild(h('div', { class: 'field row2' }, [
      fInput(d.subKind === 'fund' ? '基金代码' : '股票代码', d, 'code', { ph: d.subKind === 'fund' ? '如 110020' : '如 600519' }),
      d.subKind === 'stock' ? fSeg('市场', d, 'market', [{ v: '', label: '自动' }, { v: 'sh', label: '沪' }, { v: 'sz', label: '深' }]) : h('div')
    ]));
    frag.appendChild(h('div', { class: 'field row2' }, [
      fInput('持仓数量', d, 'holdingQty', { type: 'number', suffix: d.subKind === 'fund' ? '份' : '股' }),
      fInput('最新价/净值', d, 'latestPrice', { type: 'number' })
    ]));
    const qtyHint = h('div', { class: 'hint', style: 'margin:-6px 2px 10px' });
    const updateHint = () => {
      const mv = num(d.holdingQty) * num(d.latestPrice);
      const cost = num(d.costTotal);
      qtyHint.innerHTML = `市值（自动）：<b>${money(mv)}</b>` + (cost ? ` · 成本价 ${(cost / (num(d.holdingQty) || 1)).toFixed(3)}` : '');
    };
    updateHint();
    frag.appendChild(fInput('买入总成本（可选）', d, 'costTotal', { type: 'number', suffix: '元', hint: '用于计算成本价/盈亏' }));
    frag.appendChild(qtyHint);
    frag.appendChild(h('button', {
      class: 'btn sm', style: 'margin-bottom:12px', text: '🔄 联网获取最新价',
      onclick: async (e) => {
        if (!d.code) { toast('请先填写代码'); return; }
        e.target.disabled = true; e.target.textContent = '获取中…';
        try {
          const q = await fetchQuote(clean(d));
          d.latestPrice = q.price; d.quoteDate = q.time; d.priceUpdatedAt = new Date().toISOString();
          if (!d.name && q.name) d.name = q.name;
          toast(`已更新：${q.price}${q.time ? ` · ${q.time}` : ''}`); rebuild();
        } catch (err) { toast('获取失败，请手动填写'); e.target.disabled = false; e.target.textContent = '🔄 联网获取最新价'; }
      }
    }));
    frag.appendChild(liquidToggle());
  } else if (d.type === 'loan') {
    frag.appendChild(instField('贷款机构', d, rebuild));
    frag.appendChild(fInput('贷款名称', d, 'name', { ph: '如：住房商业贷款' }));
    frag.appendChild(fInput('贷款总额', d, 'principal', { type: 'number', suffix: '元' }));
    frag.appendChild(h('div', { class: 'field row2' }, [
      fInput('初始年利率', d, 'initialAnnualRate', { type: 'number', suffix: '%', ph: '如 4.2' }),
      fInput('贷款期数', d, 'periods', { type: 'number', suffix: '期' })
    ]));
    frag.appendChild(fInput('放款日', d, 'disbursementDate', { type: 'date' }));
    frag.appendChild(fInput('首次还款日', d, 'firstPaymentDate', { type: 'date' }));
    frag.appendChild(fSeg('还款方式', d, 'repaymentMethod', Object.entries(METHODS).map(([v, label]) => ({ v, label }))));
    const dayCount = h('select', { onchange: (e) => d.dayCount = e.target.value });
    DAYCOUNTS.forEach((dc) => dayCount.appendChild(h('option', { value: dc, selected: d.dayCount === dc ? 'selected' : null, text: dcLabel(dc) })));
    frag.appendChild(fieldControl('日计息标准', dayCount));
    // 利率变更 / 提前还款 / 还款计划
    frag.appendChild(h('div', { class: 'section-label', text: '利率变更 / 提前还款' }));
    frag.appendChild(listEditor('利率变更', d.rateChanges, (r) => `${r.effectiveDate} → ${r.newAnnualRate}%`, () => rateChangeForm(d, rebuild), (i) => { d.rateChanges.splice(i, 1); rebuild(); }));
    frag.appendChild(listEditor('提前还款', d.prepayments, (p) => `${p.date} · ${moneyShort(num(p.amount))} · ${p.mode === 'shorten' ? '缩期' : '降月供'}`, () => prepayForm(d, rebuild), (i) => { d.prepayments.splice(i, 1); rebuild(); }));
    frag.appendChild(h('button', { class: 'btn block', style: 'margin-top:8px', text: '📋 查看还款计划', onclick: () => openSchedule(clean(d)) }));
  }
  frag.appendChild(fInput('备注（可选）', d, 'note', { stacked: true }));
  return frag;
}
function dcLabel(dc) {
  return { '30E/360': '30E/360（欧洲）', '30/360': '30/360（美国）', 'ACT/360': '实际天数/360', 'ACT/365': '实际天数/365' }[dc] || dc;
}

/* 子列表编辑器 */
function listEditor(title, arr, fmtItem, onAdd, onDel) {
  const box = h('div', { class: 'rows', style: 'margin-bottom:12px' });
  (arr || []).forEach((it, i) => {
    box.appendChild(h('div', { class: 'row' }, [
      h('div', { class: 'row-main' }, [h('div', { class: 'row-title', style: 'font-size:14px', text: fmtItem(it) })]),
      h('button', { class: 'btn sm danger', text: '删除', onclick: () => onDel(i) })
    ]));
  });
  box.appendChild(h('button', { class: 'row', style: 'color:var(--accent);font-weight:600;justify-content:center', text: `+ 添加${title}`, onclick: onAdd }));
  return box;
}

function rateChangeForm(d, rebuild) {
  const t = { effectiveDate: today(), newAnnualRate: '' };
  const body = h('div', {}, [
    fInput('生效日期', t, 'effectiveDate', { type: 'date' }),
    fInput('新年利率', t, 'newAnnualRate', { type: 'number', suffix: '%' })
  ]);
  const save = h('button', { class: 'btn ghost', style: 'color:var(--accent);font-weight:700', text: '添加', onclick: () => { if (!num(t.newAnnualRate)) { toast('请输入利率'); return; } d.rateChanges.push({ effectiveDate: t.effectiveDate, newAnnualRate: num(t.newAnnualRate) }); ctl.close(); rebuild(); } });
  const ctl = openSheet('利率变更', body, { rightBtn: save });
}
function prepayForm(d, rebuild) {
  const t = { date: today(), amount: '', mode: 'shorten' };
  const body = h('div', {}, [
    fInput('还款日期', t, 'date', { type: 'date' }),
    fInput('提前还款金额', t, 'amount', { type: 'number', suffix: '元' }),
    fSeg('方式', t, 'mode', [{ v: 'shorten', label: '缩短期限' }, { v: 'reduce', label: '减少月供' }])
  ]);
  const save = h('button', { class: 'btn ghost', style: 'color:var(--accent);font-weight:700', text: '添加', onclick: () => { if (!num(t.amount)) { toast('请输入金额'); return; } d.prepayments.push({ date: t.date, amount: num(t.amount), mode: t.mode }); ctl.close(); rebuild(); } });
  const ctl = openSheet('提前还款', body, { rightBtn: save });
}

/* 还款计划（时间线卡片，传入已清洗的贷款账户） */
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
const CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="M12 13v3l2 1"/></svg>';
const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
const CIRCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/></svg>';
const CIRCLEDOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>';

export function openSchedule(l) {
  const rows = generateSchedule(l);
  const td = today();
  let currentId = null;
  for (const r of rows) { if (r.kind === 'pay' && r.date > td) { currentId = 'p' + r.index; break; } }

  const list = h('ol', { class: 'sch-list' });
  rows.forEach((r, i) => {
    if (r.kind === 'prepay') {
      const done = r.date <= td;
      list.appendChild(schItem({ date: r.date, cls: done ? 'paid' : 'planned', marker: done ? BOLT : CAL, current: false, total: r.amount, principal: r.amount, interest: r.interest || 0, remain: r.remaining }));
    } else {
      const paid = r.date <= td;
      const current = ('p' + r.index) === currentId;
      list.appendChild(schItem({ date: r.date, cls: paid ? 'paid' : (current ? 'current' : ''), marker: paid ? CHECK : (current ? CIRCLEDOT : CIRCLE), current, total: r.payment, principal: r.principal, interest: r.interest, remain: r.remaining }));
    }
  });
  const scroll = h('div', { class: 'sch-scroll' }, [list]);
  openSheet('还款计划', scroll);
  setTimeout(() => { const el = list.querySelector('.sch-item.current') || list.querySelector('.sch-item'); if (el) el.scrollIntoView({ block: 'center' }); }, 120);
}

function schItem(e) {
  return h('li', { class: 'sch-item ' + e.cls }, [
    h('article', { class: 'sch-card' }, [
      h('time', { class: 'sch-date' }, [h('span', { text: e.date.slice(0, 4) }), h('strong', { text: e.date.slice(5) })]),
      h('div', { class: 'sch-axis' }, [h('span', { class: 'sch-marker', html: e.marker })]),
      h('div', { class: 'sch-content' }, [
        h('div', { class: 'sch-amounts' }, [
          h('strong', { class: 'sch-total', text: money(e.total) }),
          h('dl', { class: 'sch-dl' }, [
            h('div', {}, [h('dt', { text: '本金' }), h('dd', { text: money(e.principal) })]),
            h('div', {}, [h('dt', { text: '利息' }), h('dd', { text: money(e.interest) })])
          ])
        ]),
        h('div', { class: 'sch-bottom' }, [h('span', { html: `剩余<b>${money(e.remain)}</b>` })])
      ])
    ])
  ]);
}

/* ---------- 入口 ---------- */
export function openAccountForm(existing, presetType) {
  const d = existing ? toDraft(existing) : defaults(presetType || 'cash');
  const body = h('div');
  function rebuild() {
    // 同步流动资金三态
    d.liquid = d._liquid === 'yes' ? true : d._liquid === 'no' ? false : undefined;
    clear(body); body.appendChild(buildBody(d, rebuild));
  }
  function save() {
    d.liquid = d._liquid === 'yes' ? true : d._liquid === 'no' ? false : undefined;
    const rec = clean(d);
    if (!rec.name) { toast('请填写名称'); return; }
    if (rec.type === 'fixed' && rec.subKind === 'house' && rec.valuationUnitPrice != null && (rec.area <= 0 || rec.valuationUnitPrice < 0)) { toast('请填写有效的面积和估值单价'); return; }
    if (rec.type === 'fixed' && rec.subKind === 'car' && (!Number.isFinite(+d.monthlyDepreciationRate) || num(d.monthlyDepreciationRate) < 0 || num(d.monthlyDepreciationRate) > 100)) { toast('月折损率应为 0%～100%'); return; }
    if (rec.type === 'loan' && (!rec.principal || !rec.periods || !rec.firstPaymentDate)) { toast('请完整填写贷款信息'); return; }
    if (existing) updateAccount(existing.id, rec); else addAccount(rec);
    toast(existing ? '已保存' : '已添加');
    ctl.close();
  }
  const saveBtn = h('button', { class: 'btn ghost', style: 'color:var(--accent);font-weight:700', text: '保存', onclick: save });
  const ctl = openSheet(existing ? '编辑账户' : `新增 · ${TYPES[d.type].label}`, body, { rightBtn: saveBtn });

  if (existing) {
    rebuild();
    body.appendChild(h('button', {
      class: 'btn block danger', style: 'margin-top:8px', text: '删除账户',
      onclick: async () => { if (await confirmDialog('确定删除该账户？相关历史快照也会一并删除。', { okText: '删除', danger: true })) { deleteAccount(existing.id); toast('已删除'); ctl.close(); location.hash = '#/accounts'; } }
    }));
  } else {
    rebuild();
  }
}

/* 新增时先选类型 */
export function openTypePicker() {
  const body = h('div', { class: 'rows' });
  Object.entries(TYPES).forEach(([type, meta]) => {
    body.appendChild(h('button', { class: 'row', onclick: () => { ctl.close(); setTimeout(() => openAccountForm(null, type), 120); } }, [
      instBadge(meta.glyph, { label: meta.label }),
      h('div', { class: 'row-main' }, [h('div', { class: 'row-title', text: meta.label }), h('div', { class: 'row-sub', text: meta.desc })]),
      h('span', { class: 'row-chevron', html: '<svg viewBox="0 0 24 24" class="chevron"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' })
    ]));
  });
  const ctl = openSheet('选择账户类型', body);
}
