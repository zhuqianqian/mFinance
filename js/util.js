// js/util.js —— 通用工具：DOM、格式化、日期、模态、提示

/* ---------- DOM ---------- */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null || c === false) return;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  });
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/* ---------- 数字 / 货币 ---------- */
export function money(n, { sign = false, decimals = 2 } = {}) {
  if (n == null || isNaN(n)) return '--';
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const p = (neg ? '-' : (sign && n > 0 ? '+' : ''));
  return p + '¥' + s;
}
// 大额简写：万 / 亿
export function moneyShort(n) {
  if (n == null || isNaN(n)) return '--';
  const neg = n < 0; const a = Math.abs(n);
  let out;
  if (a >= 1e8) out = (a / 1e8).toFixed(2) + '亿';
  else if (a >= 1e4) out = (a / 1e4).toFixed(2) + '万';
  else out = a.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  return (neg ? '-' : '') + '¥' + out;
}
export function pct(n, decimals = 1) {
  if (n == null || isNaN(n)) return '--';
  return (n * 100).toFixed(decimals) + '%';
}
export const num = (v, d = 0) => { const x = parseFloat(v); return isNaN(x) ? d : x; };
export const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ---------- 日期 (YYYY-MM-DD) ---------- */
export const today = () => fmtDate(new Date());
export function fmtDate(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function addMonths(dateStr, n) {
  const d = parseDate(dateStr);
  const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return fmtDate(d);
}
export const monthKey = (s) => s.slice(0, 7);
export function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }

/* ---------- 提示 toast ---------- */
export function toast(msg, ms = 1900) {
  const root = document.getElementById('toast-root');
  const t = h('div', { class: 'toast', text: msg });
  root.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, ms);
}

/* ---------- 底部弹层 sheet ---------- */
export function openSheet(title, bodyEl, { onClose, rightBtn } = {}) {
  const root = document.getElementById('modal-root');
  const close = () => {
    backdrop.classList.remove('show');
    setTimeout(() => { backdrop.remove(); onClose && onClose(); }, 280);
  };
  const head = h('div', { class: 'sheet-head' }, [
    h('button', { class: 'btn ghost', text: '取消', onclick: close }),
    h('h3', { text: title }),
    rightBtn || h('span', { style: 'width:44px' })
  ]);
  const sheet = h('div', { class: 'sheet' }, [head, h('div', { class: 'sheet-body' }, [bodyEl])]);
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: (e) => { if (e.target === backdrop) close(); } }, [sheet]);
  root.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));
  return { close, sheet };
}

/* ---------- 确认 ---------- */
export function confirmDialog(message, { okText = '确定', danger = false } = {}) {
  return new Promise((resolve) => {
    const body = h('div', {}, [
      h('p', { text: message, style: 'font-size:15px;line-height:1.5;margin:4px 0 20px;' }),
      h('button', { class: 'btn block ' + (danger ? 'danger' : 'primary'), text: okText,
        onclick: () => { ctl.close(); resolve(true); } }),
      h('button', { class: 'btn block', style: 'margin-top:10px;background:transparent;color:var(--text-3)', text: '取消',
        onclick: () => { ctl.close(); resolve(false); } })
    ]);
    const ctl = openSheet('请确认', body, { onClose: () => resolve(false) });
  });
}
