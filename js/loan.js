// js/loan.js —— 还款引擎（对齐已验证的 Swift 实现 LoanCalculator）
// 年利率(annualRate)以小数表示，如 4.85% => 0.0485
import { addMonths, parseDate, round2, today, daysBetween } from './util.js';

export const METHODS = {
  equal_payment:   '等额本息',
  equal_principal: '等额本金',
  interest_first:  '先息后本'
};
export const DAYCOUNTS = ['30E/360', '30/360', 'ACT/360', 'ACT/365'];

/* ---------- 基础 ---------- */
function pmtEqual(P, r, n) {
  if (n <= 0) return P;
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}
function nper(P, r, pmt) {
  if (pmt <= 0) return 9999;
  if (r === 0) return Math.ceil(P / pmt);
  const v = 1 - (P * r) / pmt;
  if (v <= 0) return 9999;
  return Math.ceil(-Math.log(v) / Math.log(1 + r));
}
const isActual = (c) => c === 'ACT/360' || c === 'ACT/365';
const denom = (c) => (c === 'ACT/365' ? 365 : 360);

function normalizedChanges(loan) {
  return [...(loan.rateChanges || [])].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}
function annualRateAt(loan, dateStr) {
  let a = loan.initialAnnualRate;
  normalizedChanges(loan).forEach((rc) => { if (rc.effectiveDate <= dateStr) a = rc.newAnnualRate; });
  return a;
}
function rateChangeWithin(from, to, changes) {
  return changes.some((c) => c.effectiveDate > from && c.effectiveDate < to);
}

/* ---------- 日计息 ---------- */
function days360E(a, b) {
  const A = parseDate(a), B = parseDate(b);
  const d = 360 * (B.getFullYear() - A.getFullYear()) + 30 * (B.getMonth() - A.getMonth()) + (Math.min(B.getDate(), 30) - Math.min(A.getDate(), 30));
  return Math.max(0, d);
}
function lastDayOfMonth(d) { return d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function days360US(a, b) {
  const A = parseDate(a), B = parseDate(b);
  let sd = A.getDate(), ed = B.getDate(), sm = A.getMonth(), em = B.getMonth(), sy = A.getFullYear(), ey = B.getFullYear();
  if (lastDayOfMonth(A)) sd = 30;
  if (lastDayOfMonth(B)) { if (sd < 30) { ed = 1; em += 1; if (em === 12) { em = 0; ey += 1; } } else ed = 30; }
  return Math.max(0, 360 * (ey - sy) + 30 * (em - sm) + (ed - sd));
}
function dayCountDays(a, b, conv) {
  if (isActual(conv)) return Math.max(0, daysBetween(a, b));
  return conv === '30/360' ? days360US(a, b) : days360E(a, b);
}
// 年化占比（公开，兼容旧调用）
export function yearFraction(a, b, conv = '30E/360') { return dayCountDays(a, b, conv) / denom(conv); }

// 从 from 到 to 的计息因子，按利率变更分段
function accruedFactor(from, to, conv, loan) {
  if (to <= from) return 0;
  const bounds = normalizedChanges(loan).map((c) => c.effectiveDate).filter((d) => d > from && d < to).sort();
  bounds.push(to);
  let segStart = from, factor = 0;
  for (const segEnd of bounds) {
    factor += annualRateAt(loan, segStart) * dayCountDays(segStart, segEnd, conv) / denom(conv);
    segStart = segEnd;
  }
  return factor;
}
// 当期利息：首期 / 实际天数惯例 / 期内有利率变更 → 按日计息；否则简单月息 balance*rate/12
function installmentInterest(balance, from, to, isInitial, conv, loan, changes) {
  if (isActual(conv) || isInitial || rateChangeWithin(from, to, changes)) {
    return round2(balance * accruedFactor(from, to, conv, loan));
  }
  return round2(balance * annualRateAt(loan, from) / 12);
}

/* ---------- 还款计划 ---------- */
export function generateSchedule(loan) {
  const P = +loan.principal;
  const conv = loan.dayCount || '30E/360';
  const method = loan.repaymentMethod || 'equal_payment';
  const changes = normalizedChanges(loan);
  const prepays = [...(loan.prepayments || [])].sort((a, b) => a.date.localeCompare(b.date));
  const issued = loan.disbursementDate || loan.firstPaymentDate;
  if (!(P > 0) || !(loan.periods > 0) || !loan.firstPaymentDate) return [];

  const rows = [];
  let balance = P;
  let scheduledN = loan.periods;
  let idx = 0;
  let periodStart = issued;   // 上一还款日（首期为放款日）
  let ppIdx = 0;
  let amortRate = null, payment = 0;
  let fixedPrincipal = round2(P / scheduledN);
  const MAX = 1300;

  while (balance > 0.005 && idx < MAX) {
    const dueDate = addMonths(loan.firstPaymentDate, idx);

    // 提前还款（落在上一还款日~本期之间）：额外利息按【提前还款金额】计提
    while (ppIdx < prepays.length && prepays[ppIdx].date <= dueDate) {
      const pp = prepays[ppIdx++];
      const amt = Math.min(+pp.amount, balance);
      const accrued = round2(amt * accruedFactor(periodStart, pp.date, conv, loan));
      balance = round2(balance - amt);
      rows.push({ kind: 'prepay', date: pp.date, amount: amt, mode: pp.mode, interest: accrued, remaining: balance });
      if (balance <= 0.005) break;
      const left = Math.max(1, scheduledN - idx);
      const r = (amortRate != null ? amortRate : annualRateAt(loan, dueDate)) / 12;
      if (method === 'equal_payment') {
        if (pp.mode === 'reduce') { payment = round2(pmtEqual(balance, r, left)); amortRate = (amortRate != null ? amortRate : annualRateAt(loan, dueDate)); }
        else scheduledN = idx + nper(balance, r, payment);   // 缩短期限：保月供
      } else if (method === 'equal_principal' && pp.mode === 'reduce') {
        fixedPrincipal = round2(balance / left);
      }
    }
    if (balance <= 0.005) break;

    const periodsLeft = scheduledN - idx;
    const rateStart = annualRateAt(loan, periodStart);
    const within = rateChangeWithin(periodStart, dueDate, changes);
    const payRate = within ? annualRateAt(loan, dueDate) : rateStart;
    if (method === 'equal_payment' && payRate !== amortRate) {
      amortRate = payRate;
      payment = round2(pmtEqual(balance, payRate / 12, periodsLeft));
    }

    const isInitial = idx === 0;
    const interest = installmentInterest(balance, periodStart, dueDate, isInitial, conv, loan, changes);
    let principal;
    if (periodsLeft <= 1) {
      principal = balance;
    } else if (method === 'equal_payment') {
      const scheduledInterest = round2(balance * payRate / 12);
      principal = round2(Math.min(Math.max(payment - scheduledInterest, 0), balance));
    } else if (method === 'equal_principal') {
      principal = round2(Math.min(fixedPrincipal, balance));
    } else { // interest_first 先息后本
      principal = 0;
    }
    const total = round2(principal + interest);
    balance = round2(balance - principal);
    rows.push({ kind: 'pay', index: idx + 1, date: dueDate, payment: total, principal: round2(principal), interest, rate: annualRateAt(loan, dueDate), remaining: Math.max(0, balance) });
    periodStart = dueDate;
    idx++;
  }
  return rows;
}

export function summarize(rows) {
  let totalInterest = 0, totalPrincipal = 0, totalPay = 0;
  rows.forEach((row) => {
    if (row.kind === 'pay') { totalInterest += row.interest; totalPrincipal += row.principal; totalPay += row.payment; }
    else { totalPrincipal += row.amount; totalInterest += (row.interest || 0); totalPay += row.amount + (row.interest || 0); }
  });
  const payRows = rows.filter((r) => r.kind === 'pay');
  return {
    totalInterest: round2(totalInterest), totalPrincipal: round2(totalPrincipal), totalPayment: round2(totalPay),
    periods: payRows.length, firstPayment: payRows[0] ? payRows[0].payment : 0,
    lastDate: payRows.length ? payRows[payRows.length - 1].date : null
  };
}

// 指定日期的剩余本金
export function outstandingAt(loan, dateStr) {
  if (loan.disbursementDate && dateStr < loan.firstPaymentDate) {
    let b = +loan.principal;
    (loan.prepayments || []).forEach((pp) => { if (pp.date <= dateStr) b -= +pp.amount; });
    return Math.max(0, round2(b));
  }
  const rows = generateSchedule(loan);
  let bal = +loan.principal;
  for (const row of rows) { if (row.date <= dateStr) bal = row.remaining; else break; }
  return Math.max(0, round2(bal));
}

export function nextPayment(loan, fromDateStr) {
  return generateSchedule(loan).filter((r) => r.kind === 'pay').find((r) => r.date >= fromDateStr) || null;
}

// 提前还款预估利息 = 提前还款金额 × 从上一普通还款日(或放款日)到还款日的计息因子
export function advanceInterest(loan, dateStr, amount) {
  if (!(amount > 0) || !dateStr) return 0;
  const conv = loan.dayCount || '30E/360';
  const priorDues = generateSchedule(loan).filter((r) => r.kind === 'pay' && r.date < dateStr).map((r) => r.date);
  const periodStart = priorDues.length ? priorDues[priorDues.length - 1] : (loan.disbursementDate || loan.firstPaymentDate);
  return round2(amount * accruedFactor(periodStart, dateStr, conv, loan));
}

// 贷款汇总统计（详情页用）
export function loanStats(loan, asOf = today()) {
  const rows = generateSchedule(loan);
  const s = summarize(rows);
  let paidInterest = 0, paidPrincipal = 0, paidTotal = 0, remainingPeriods = 0, next = null;
  rows.forEach((r) => {
    if (r.kind === 'pay') {
      if (r.date <= asOf) { paidInterest += r.interest; paidPrincipal += r.principal; paidTotal += r.payment; }
      else { remainingPeriods++; if (!next) next = r; }
    } else if (r.date <= asOf) { paidPrincipal += r.amount; paidInterest += (r.interest || 0); paidTotal += r.amount + (r.interest || 0); }
  });
  return {
    totalInterest: s.totalInterest, totalPayment: s.totalPayment, periods: s.periods, firstPayment: s.firstPayment,
    paidInterest: round2(paidInterest), paidPrincipal: round2(paidPrincipal), paidTotal: round2(paidTotal),
    remainingPeriods, remainingPrincipal: outstandingAt(loan, asOf),
    nextPayment: next ? next.payment : 0, nextDate: next ? next.date : null
  };
}
