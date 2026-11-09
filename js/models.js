// js/models.js —— 账户类型元数据 + 派生计算（估值/负债/净资产/构成）
import { getAccounts, snapshotsOf, getSnapshots } from './store.js';
import { outstandingAt } from './loan.js';
import { today, parseDate, round2 } from './util.js';

/* 账户大类 */
export const TYPES = {
  cash:       { label: '资产账户', desc: '银行储蓄、公积金、支付宝、微信等', glyph: 'cash' },
  credit:     { label: '信用卡',   desc: '按额度计算当前欠款', glyph: 'card' },
  fixed:      { label: '固定资产', desc: '房产、车辆等', glyph: 'house' },
  investment: { label: '股票 / 基金', desc: '按持仓与最新价估值', glyph: 'stock' },
  loan:       { label: '贷款',     desc: '分期贷款与还款计划', glyph: 'loan' }
};

export const CASH_SUBKINDS = {
  bank: '银行储蓄', gongjijin: '住房公积金', alipay: '支付宝', wechat: '微信', unionpay: '云闪付', other: '其他现金'
};

/* 资产构成分类（用于首页环形图） */
export function categoryOf(acc) {
  return TYPES[acc.type]?.label || '其他';
}

/* 是否计入流动资金（账户可用 liquid 显式覆盖） */
export function isLiquid(acc) {
  if (typeof acc.liquid === 'boolean') return acc.liquid;
  if (acc.type === 'cash') return acc.subKind !== 'gongjijin';
  if (acc.type === 'investment') return true;
  return false; // 固定资产、贷款、信用卡默认不计
}
export function defaultLiquid(type, subKind) {
  if (type === 'cash') return subKind !== 'gongjijin';
  if (type === 'investment') return true;
  return false;
}

/* ---------- 实时估值（对账预填用） ---------- */
// 返回 { value(>=0), kind:'asset'|'liability' }
export function liveValuation(acc, asOf = today()) {
  switch (acc.type) {
    case 'cash':
      return { value: round2(+acc.currentBalance || 0), kind: 'asset' };
    case 'credit': {
      const debt = Math.max(0, (+acc.totalLimit || 0) - (+acc.availableCredit || 0));
      return { value: round2(debt), kind: 'liability' };
    }
    case 'investment': {
      const v = (+acc.holdingQty || 0) * (+acc.latestPrice || 0);
      return { value: round2(v), kind: 'asset' };
    }
    case 'fixed':
      return { value: round2(fixedValue(acc, asOf)), kind: 'asset' };
    case 'loan':
      return { value: round2(outstandingAt(acc, asOf)), kind: 'liability' };
    default:
      return { value: 0, kind: 'asset' };
  }
}

export function fixedValue(acc, asOf = today()) {
  if (acc.subKind === 'house' && acc.valuationUnitPrice != null && acc.valuationUnitPrice !== '' && +acc.area > 0) {
    return +acc.valuationUnitPrice * +acc.area;
  }
  if (acc.valuationOverride != null && acc.valuationOverride !== '') return +acc.valuationOverride;
  if (acc.subKind === 'house') {
    if (acc.unitPrice && acc.area) return (+acc.unitPrice) * (+acc.area);
    return +acc.initialValue || 0;
  }
  if (acc.subKind === 'car') {
    const base = +acc.initialValue || 0;
    const rate = carMonthlyRate(acc);
    const start = acc.purchaseDate || acc.createdAt;
    if (!start || !rate) return base;
    // 按天折算月数；与旧版按年折旧的时间口径保持一致。
    const months = Math.max(0, (parseDate(asOf) - parseDate(start)) / (365.25 / 12 * 86400000));
    return base * Math.pow(1 - rate, months);
  }
  return +acc.initialValue || 0;
}

// 旧账户仍可能只有年折损率，使用等效月复利率，避免直接当成月率。
export function carMonthlyRate(acc) {
  if (acc.monthlyDepreciationRate != null && acc.monthlyDepreciationRate !== '') {
    return Math.min(1, Math.max(0, +acc.monthlyDepreciationRate || 0));
  }
  const annual = Math.min(1, Math.max(0, +acc.depreciationRate || 0));
  return 1 - Math.pow(1 - annual, 1 / 12);
}

/* 账户一行展示用的金额与说明 */
export function accountDisplay(acc) {
  const { value, kind } = liveValuation(acc);
  let sub = '';
  if (acc.type === 'credit') sub = `额度 ${fmtK(acc.totalLimit)} · 可用 ${fmtK(acc.availableCredit)}`;
  else if (acc.type === 'investment') sub = `${acc.code || ''} · ${(+acc.holdingQty || 0)}份 @ ${acc.latestPrice || '--'}`;
  else if (acc.type === 'loan') sub = '剩余本金';
  else if (acc.type === 'fixed' && acc.subKind === 'house' && +acc.area > 0) {
    const price = fixedValue(acc) / +acc.area;
    sub = `${acc.area}㎡ × ${round2(price)}/㎡`;
  }
  return { value, kind, sub };
}
function fmtK(n) { n = +n || 0; return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString('zh-CN'); }

/* ---------- 快照聚合（首页数据来源） ---------- */
function latestSnapOnOrBefore(accountId, date) {
  const snaps = snapshotsOf(accountId).filter((s) => s.date <= date);
  return snaps.length ? snaps[snaps.length - 1] : null;
}

export function reconcileDates() {
  return [...new Set(getSnapshots().map((s) => s.date))].sort();
}

// 以 date 为口径，对每个账户取 ≤date 的最新快照（结转）并汇总
export function totalsAsOf(date) {
  const accs = getAccounts({ includeArchived: true });
  let assets = 0, liabilities = 0, liquid = 0;
  const composition = {}, liabilityComposition = {};
  for (const acc of accs) {
    const snap = latestSnapOnOrBefore(acc.id, date);
    if (!snap) continue;
    if (snap.kind === 'liability') {
      liabilities += snap.value;
      const cat = categoryOf(acc);
      liabilityComposition[cat] = (liabilityComposition[cat] || 0) + snap.value;
    }
    else {
      assets += snap.value;
      if (isLiquid(acc)) liquid += snap.value;
      const cat = categoryOf(acc);
      composition[cat] = (composition[cat] || 0) + snap.value;
    }
  }
  assets = round2(assets); liabilities = round2(liabilities);
  return {
    date, assets, liabilities, liquid: round2(liquid),
    net: round2(assets - liabilities),
    debtRatio: assets > 0 ? liabilities / assets : 0,
    composition, liabilityComposition
  };
}

export function series() {
  return reconcileDates().map((d) => totalsAsOf(d));
}

// 最新一期 + 环比(上一期) + 同比(约12个月前)
export function headline() {
  const s = series();
  if (!s.length) return null;
  const cur = s[s.length - 1];
  const prev = s.length >= 2 ? s[s.length - 2] : null;
  const curDate = parseDate(cur.date);
  // 同比：寻找最接近 12 个月前的那一期
  let yoy = null, bestDiff = Infinity;
  for (const p of s) {
    const months = (curDate - parseDate(p.date)) / (30.44 * 86400000);
    const diff = Math.abs(months - 12);
    if (months >= 6 && diff < bestDiff) { bestDiff = diff; yoy = p; }
  }
  return { cur, prev, yoy };
}
