// js/views/settings.js —— 设置：对账日、主题、导入导出、示例数据、清空
import { h, toast, confirmDialog, today, fmtDate, num } from '../util.js';
import { inlineField } from '../forms.js';
import { getSettings, updateSettings, exportJSON, importJSON, wipeAll, getAccounts, getSnapshots, addAccount, putSnapshot } from '../store.js';

// 发布时与 sw.js 的缓存版本同步，表示当前页面代码的版本。
const APP_VERSION = 'v4';

function applyThemeNow(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export function render() {
  const s = getSettings();
  const root = h('div');
  root.appendChild(h('div', { class: 'nav-head' }, [h('div', {}, [h('h1', { class: 'nav-title', text: '我的' }), h('div', { class: 'nav-sub', text: '设置与数据' })])]));

  // 对账日
  root.appendChild(h('div', { class: 'section-label', text: '对账' }));
  const dayRow = h('div', { class: 'rows' }, [
    h('div', { class: 'row settings-date' }, [
      (() => {
        const sel = h('select', { onchange: (e) => { updateSettings({ reconcileDay: +e.target.value }); toast('已更新'); } });
        for (let i = 1; i <= 28; i++) sel.appendChild(h('option', { value: i, selected: s.reconcileDay === i ? 'selected' : null, text: i + ' 日' }));
        return inlineField('每月对账日', sel, { hint: '贷款与投资按此日自动结转', compact: true });
      })()
    ])
  ]);
  root.appendChild(dayRow);

  // 主题
  root.appendChild(h('div', { class: 'section-label', text: '外观' }));
  const seg = h('div', { class: 'seg' });
  [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].forEach(([v, label]) => {
    seg.appendChild(h('button', { class: s.theme === v ? 'active' : '', text: label, onclick: () => { updateSettings({ theme: v }); applyThemeNow(v); refreshSeg(v); } }));
  });
  function refreshSeg(v) { [...seg.children].forEach((b, i) => b.classList.toggle('active', ['auto', 'light', 'dark'][i] === v)); }
  root.appendChild(h('div', { class: 'card' }, [seg]));

  // 数据
  root.appendChild(h('div', { class: 'section-label', text: '数据' }));
  const dataCard = h('div', { class: 'rows' }, [
    actionRow('导出数据', `${getAccounts({ includeArchived: true }).length} 账户 · ${getSnapshots().length} 快照`, doExport),
    actionRow('导入数据', '从 JSON 文件恢复或合并', doImport),
    actionRow('载入示例数据', '生成演示账户与几期快照', seedDemo)
  ]);
  root.appendChild(dataCard);

  root.appendChild(h('div', { class: 'section-label', text: '危险操作' }));
  root.appendChild(h('div', { class: 'rows' }, [
    h('button', { class: 'row', style: 'color:var(--negative);justify-content:center;font-weight:600', text: '清空全部数据', onclick: async () => { if (await confirmDialog('将删除所有账户与快照，建议先导出备份。', { okText: '清空', danger: true })) { wipeAll(); toast('已清空'); location.hash = '#/home'; } } })
  ]));

  root.appendChild(h('div', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:24px' }, [
    h('div', { text: `mFinance · 应用版本 ${APP_VERSION}` }),
    h('div', { style: 'margin-top:6px', text: '数据仅存于本机浏览器' })
  ]));
  return root;

  function doExport() {
    const text = exportJSON();
    const name = `mFinance-${today()}.json`;
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('已导出 ' + name);
    } catch (e) {
      navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板'));
    }
  }

  function doImport() {
    const input = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const text = await file.text();
        const merge = await confirmDialog('选择导入方式：确定=合并（保留现有），取消后不导入。如需覆盖，请先清空再导入。', { okText: '合并导入' });
        if (!merge) return;
        importJSON(text, { merge: true });
        toast('导入成功');
        location.hash = '#/home';
      } catch (e) { toast('导入失败：' + e.message); }
    });
    document.body.appendChild(input); input.click(); setTimeout(() => input.remove(), 1000);
  }

  async function seedDemo() {
    if (getAccounts({ includeArchived: true }).length && !(await confirmDialog('已有账户，仍要追加示例数据？'))) return;
    const bank = addAccount({ type: 'cash', subKind: 'bank', institutionId: 'cmb', name: '招行储蓄卡', currentBalance: 120000 });
    const ali = addAccount({ type: 'cash', subKind: 'alipay', institutionId: 'alipay', name: '支付宝', currentBalance: 8600 });
    const fund = addAccount({ type: 'investment', subKind: 'fund', code: '110020', name: '易方达沪深300', holdingQty: 20000, latestPrice: 1.52 });
    const house = addAccount({ type: 'fixed', subKind: 'house', name: '自住房', unitPrice: 45000, area: 89, initialValue: 4005000 });
    const card = addAccount({ type: 'credit', institutionId: 'cmb', name: '招行信用卡', totalLimit: 50000, availableCredit: 38000 });
    const loan = addAccount({ type: 'loan', institutionId: 'ccb', name: '住房商业贷款', principal: 2800000, initialAnnualRate: 0.042, periods: 360, disbursementDate: '2022-06-20', firstPaymentDate: '2022-07-20', repaymentMethod: 'equal_payment', dayCount: '30E/360', rateChanges: [], prepayments: [] });
    // 过去 5 期快照（按每月 reconcileDay）
    const day = getSettings().reconcileDay || 1;
    const now = new Date();
    const mkValues = (i) => ({
      [bank.id]: 100000 + i * 5000, [ali.id]: 7000 + i * 400,
      [fund.id]: 28000 + i * 900, [house.id]: 3900000 + i * 22000,
      [card.id]: 8000 + (i % 2 ? 2000 : 0), [loan.id]: 2500000 - i * 9000
    });
    for (let k = 4; k >= 0; k--) {
      const dt = fmtDate(new Date(now.getFullYear(), now.getMonth() - k, day));
      const vals = mkValues(4 - k);
      [bank, ali, fund, house].forEach((a) => putSnapshot({ accountId: a.id, date: dt, value: vals[a.id], kind: 'asset', source: 'manual' }));
      [card, loan].forEach((a) => putSnapshot({ accountId: a.id, date: dt, value: vals[a.id], kind: 'liability', source: 'manual' }));
    }
    toast('已载入示例数据');
    location.hash = '#/home';
  }
}

function actionRow(title, sub, onclick) {
  return h('button', { class: 'row', onclick }, [
    h('div', { class: 'row-main' }, [h('div', { class: 'row-title', style: 'font-size:15px', text: title }), h('div', { class: 'row-sub', text: sub })]),
    h('span', { class: 'row-chevron', html: '<svg viewBox="0 0 24 24" style="width:7px;height:12px"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' })
  ]);
}
