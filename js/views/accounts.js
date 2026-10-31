// js/views/accounts.js —— 账户列表（按类型分组）
import { h, money, moneyShort } from '../util.js';
import { getAccounts } from '../store.js';
import { TYPES, accountDisplay } from '../models.js';
import { accountBadge, icon } from '../icons.js';
import { openAccountForm, openTypePicker } from './account-form.js';

const ORDER = ['cash', 'investment', 'fixed', 'credit', 'loan'];
const chevron = '<svg viewBox="0 0 24 24" class="chevron" style="width:7px;height:12px"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function render() {
  const root = h('div');
  const accounts = getAccounts();

  root.appendChild(h('div', { class: 'nav-head' }, [
    h('div', {}, [h('h1', { class: 'nav-title', text: '账户' }),
      h('div', { class: 'nav-sub', text: `${accounts.length} 个账户` })]),
    h('button', { class: 'icon-btn', html: icon('plus'), onclick: openTypePicker, 'aria-label': '新增' })
  ]));

  if (!accounts.length) {
    root.appendChild(h('div', { class: 'empty' }, [
      h('div', { html: icon('wallet') }),
      h('h3', { text: '还没有账户' }),
      h('p', { text: '添加银行卡、贷款、股票等账户，开始管理你的资产。' }),
      h('button', { class: 'btn primary', text: '+ 添加第一个账户', onclick: openTypePicker })
    ]));
    return root;
  }

  for (const type of ORDER) {
    const list = accounts.filter((a) => a.type === type);
    if (!list.length) continue;
    const sumMag = list.reduce((acc, a) => acc + accountDisplay(a).value, 0);
    const sumLabel = { cash: '余额', investment: '估值', fixed: '估值', credit: '欠款', loan: '欠款' }[type] || '';
    root.appendChild(h('div', { class: 'section-label', style: 'display:flex;justify-content:space-between' }, [
      h('span', { text: TYPES[type].label }),
      h('span', { class: 'tnum', style: 'color:var(--text-3)', text: `${sumLabel} ${moneyShort(sumMag)}` })
    ]));
    const rows = h('div', { class: 'rows' });
    list.forEach((a) => {
      const d = accountDisplay(a);
      rows.appendChild(h('button', { class: 'row', onclick: () => { location.hash = '#/account/' + a.id; } }, [
        accountBadge(a),
        h('div', { class: 'row-main' }, [
          h('div', { class: 'row-title', text: a.name || TYPES[type].label }),
          d.sub ? h('div', { class: 'row-sub', text: d.sub }) : null
        ]),
        h('div', { class: 'row-value' }, [
          h('div', { class: 'amt' + (d.kind === 'liability' ? ' neg' : ''), text: (d.kind === 'liability' ? '-' : '') + money(d.value) })
        ]),
        h('span', { class: 'row-chevron', html: chevron })
      ]));
    });
    root.appendChild(rows);
  }

  root.appendChild(h('button', { class: 'fab', html: icon('plus'), onclick: openTypePicker, 'aria-label': '新增账户' }));
  return root;
}
