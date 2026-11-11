// js/valuation.js —— 行情抓取（JSONP，规避 CORS）+ 批量更新
// 说明：公开行情接口在 PWA 里走 <script> 注入（JSONP 式）读取，失败则回退手动录入。

function loadScript(url, timeout = 6500) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    const done = (ok) => { s.remove(); clearTimeout(timer); ok ? resolve() : reject(new Error('加载失败')); };
    const timer = setTimeout(() => done(false), timeout);
    s.onload = () => done(true);
    s.onerror = () => done(false);
    document.head.appendChild(s);
  });
}

function guessMarket(code) {
  if (/^(6|5|9|11|13|688)/.test(code)) return 'sh';
  if (/^(0|3|1|2|15|16|18)/.test(code)) return 'sz';
  return 'sh';
}

function fundDate(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(timestamp));
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function stockTime(raw) {
  if (!/^\d{14}$/.test(raw || '')) return raw || '';
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
}

/* 开放式基金：东方财富确认净值，取单位净值走势的最后一条。 */
export function fetchFund(code) {
  window.Data_netWorthTrend = undefined;
  window.fS_name = undefined;
  window.fS_code = undefined;
  return loadScript(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`, 10000).then(() => {
    const trend = window.Data_netWorthTrend;
    const latest = Array.isArray(trend) ? trend[trend.length - 1] : null;
    const price = Number(latest?.y);
    const timestamp = Number(latest?.x);
    if (String(window.fS_code || '') !== code || !latest || !Number.isFinite(price) || price <= 0 || !Number.isFinite(timestamp)) {
      throw new Error('无最新净值');
    }
    return { price, name: window.fS_name || '', time: fundDate(timestamp), raw: latest };
  });
}

/* A 股 / ETF：腾讯行情 (v_xxx 全局变量) */
export function fetchStock(code, market) {
  const prefix = market === 'sh' || market === 'sz' ? market : guessMarket(code);
  const varName = `v_${prefix}${code}`;
  return loadScript(`https://qt.gtimg.cn/q=${prefix}${code}&_=${Date.now()}`).then(() => {
    const raw = window[varName];
    try { delete window[varName]; } catch (_) {}
    if (!raw || typeof raw !== 'string') throw new Error('无数据');
    const f = raw.split('~');
    const price = parseFloat(f[3]);
    if (!price || isNaN(price)) throw new Error('价格解析失败');
    return { price, name: f[1], time: stockTime(f[30]), raw };
  });
}

export function fetchQuote(acc) {
  if (!acc.code) return Promise.reject(new Error('未设置代码'));
  if (acc.subKind === 'fund') return fetchFund(acc.code.trim());
  return fetchStock(acc.code.trim(), acc.market);
}

/* 批量更新：返回 { ok, fail, results } */
export async function updateAllQuotes(accounts, onEach) {
  const invest = accounts.filter((a) => a.type === 'investment' && a.code);
  let ok = 0, fail = 0; const results = [];
  for (const acc of invest) {
    try {
      const q = await fetchQuote(acc);
      ok++; results.push({ acc, quote: q });
      onEach && onEach(acc, q, null);
    } catch (e) {
      fail++; results.push({ acc, error: e.message });
      onEach && onEach(acc, null, e);
    }
  }
  return { ok, fail, total: invest.length, results };
}
