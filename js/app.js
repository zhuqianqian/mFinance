// js/app.js —— 启动、路由、底部 Tab、主题、SW 注册
import { subscribe, getSettings } from './store.js';
import { icon } from './icons.js';
import { clear, h } from './util.js';
import * as home from './views/home.js';
import * as accounts from './views/accounts.js';
import * as reconcile from './views/reconcile.js';
import * as settings from './views/settings.js';
import * as accountDetail from './views/account-detail.js';

const routes = { home, accounts, reconcile, settings };
const TABS = [
  { id: 'home', label: '资产', glyph: 'home' },
  { id: 'accounts', label: '账户', glyph: 'wallet' },
  { id: 'reconcile', label: '对账', glyph: 'reconcile' },
  { id: 'settings', label: '我的', glyph: 'settings' }
];

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

function currentRoute() {
  const id = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  return routes[id] ? id : 'home';
}

function renderTabs(active) {
  clear(tabbar);
  TABS.forEach((t) => {
    const btn = h('a', { class: 'tab' + (t.id === active ? ' active' : ''), href: `#/${t.id}`, role: 'tab' }, [
      h('span', { html: icon(t.glyph), style: 'display:flex' }),
      h('span', { text: t.label })
    ]);
    tabbar.appendChild(btn);
  });
}

function render() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [seg, arg] = raw.split('/');

  // 账户详情：#/account/<id>
  if (seg === 'account' && arg) {
    renderTabs('accounts');
    clear(viewEl);
    try { viewEl.appendChild(accountDetail.render(arg)); }
    catch (e) { console.error(e); viewEl.appendChild(h('div', { class: 'empty' }, [h('p', { text: '页面渲染出错：' + e.message })])); }
    window.scrollTo(0, 0);
    return;
  }

  const id = routes[seg] ? seg : 'home';
  renderTabs(id);
  clear(viewEl);
  try {
    viewEl.appendChild(routes[id].render());
  } catch (e) {
    console.error(e);
    viewEl.appendChild(h('div', { class: 'empty' }, [h('p', { text: '页面渲染出错：' + e.message })]));
  }
  viewEl.scrollTop = 0;
  window.scrollTo(0, 0);
}

export function applyTheme() {
  const t = getSettings().theme || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

window.addEventListener('hashchange', () => { closeModals(); render(); });
// 数据变化时重渲染当前页（不影响打开的弹层）
subscribe(() => render());

function closeModals() {
  const m = document.getElementById('modal-root');
  while (m && m.firstChild) m.removeChild(m.firstChild);
}

applyTheme();
render();

/* Service Worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW 注册失败', e));
  });
}
