import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value)
};

test('首页选项保存后重新加载可恢复，且保存时不触发整页重渲染', async () => {
  storage.clear();
  const store = await import('../js/store.js?home-preferences');
  const account = store.addAccount({ name: '示例账户', type: 'cash', currentBalance: 100 });
  store.putSnapshot({ accountId: account.id, date: '2026-11-01', value: 100, kind: 'asset' });
  let notifications = 0;
  store.subscribe(() => { notifications += 1; });
  const homeCharts = { view: 'credit', range: 12, composition: 'liability' };
  store.updateSettings({ homeCharts }, { notify: false });
  assert.equal(notifications, 0);

  const reopened = await import('../js/store.js?home-preferences-reopened');
  assert.deepEqual(reopened.getSettings().homeCharts, homeCharts);
  assert.equal(reopened.getAccounts()[0].id, account.id);
  assert.equal(reopened.getSnapshots()[0].value, 100);
  assert.deepEqual(JSON.parse(reopened.exportJSON()).data.settings.homeCharts, homeCharts);

  store.updateSettings({ reconcileDay: 12 });
  assert.equal(notifications, 1);
  assert.deepEqual(store.getSettings().homeCharts, homeCharts);
});

test('已有数据缺少图表配置时仍正常加载并保留对账日', async () => {
  storage.clear();
  storage.set('mfinance.db.v1', JSON.stringify({ settings: { reconcileDay: 20 }, accounts: [], snapshots: [] }));
  const store = await import('../js/store.js?legacy-preferences');
  assert.equal(store.getSettings().reconcileDay, 20);
  assert.equal(store.getSettings().theme, 'auto');
  assert.equal(store.getSettings().homeCharts, undefined);
  assert.deepEqual(store.getAccounts(), []);
});
