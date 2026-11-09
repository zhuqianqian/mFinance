import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// 只在内存中使用示例账户，不读取或写入浏览器里的个人数据。
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { fixedValue, carMonthlyRate, liveValuation, totalsAsOf } = await import('../js/models.js');
const { getState } = await import('../js/store.js');

beforeEach(() => {
  getState().accounts = [];
  getState().snapshots = [];
});

test('资产和负债按账户大类汇总，历史快照正常结转', () => {
  const db = getState();
  db.accounts = [
    { id: 'bank', type: 'cash', subKind: 'bank' },
    { id: 'wallet', type: 'cash', subKind: 'alipay' },
    { id: 'housing-fund', type: 'cash', subKind: 'gongjijin' },
    { id: 'fund', type: 'investment' },
    { id: 'house', type: 'fixed' },
    { id: 'credit', type: 'credit' },
    { id: 'loan', type: 'loan' }
  ];
  db.snapshots = db.accounts.map((a, i) => ({
    accountId: a.id, date: '2026-09-01', value: (i + 1) * 1000,
    kind: ['credit', 'loan'].includes(a.type) ? 'liability' : 'asset'
  }));
  db.snapshots.push({ accountId: 'wallet', date: '2026-10-01', value: 2500, kind: 'asset' });
  db.snapshots.push({ accountId: 'credit', date: '2026-11-01', value: 10, kind: 'liability' });
  const totals = totalsAsOf('2026-10-01');
  assert.deepEqual(totals.composition, { '资产账户': 6500, '股票 / 基金': 4000, '固定资产': 5000 });
  assert.deepEqual(totals.liabilityComposition, { '信用卡': 6000, '贷款': 7000 });
  assert.equal(totals.assets, 15500);
  assert.equal(totals.liabilities, 13000);
  assert.equal(totals.net, 2500);
  assert.equal(totals.liquid, 7500);
});

test('没有负债快照时构成为空，负债总额为零', () => {
  assert.deepEqual(totalsAsOf('2026-10-01').liabilityComposition, {});
  assert.equal(totalsAsOf('2026-10-01').liabilities, 0);
});

test('房产手动每平方米单价乘以面积，支持改面积与零估值', () => {
  const house = { type: 'fixed', subKind: 'house', area: 80, unitPrice: 30000, valuationUnitPrice: 25000 };
  assert.equal(fixedValue(house), 2000000);
  assert.equal(fixedValue({ ...house, area: 100 }), 2500000);
  assert.equal(fixedValue({ ...house, valuationUnitPrice: 0 }), 0);
  assert.equal(fixedValue({ ...house, valuationUnitPrice: null }), 2400000);
});

test('旧房产总估值与初始价值仍可读取', () => {
  const house = { subKind: 'house', area: 80, unitPrice: 30000, valuationOverride: 2200000 };
  assert.equal(fixedValue(house), 2200000);
  assert.equal(fixedValue({ ...house, area: 0 }), 2200000);
  assert.equal(fixedValue({ subKind: 'house', initialValue: 1000000 }), 1000000);
});

test('车辆按月率复利折旧，手动值仍优先', () => {
  const car = { type: 'fixed', subKind: 'car', initialValue: 100000, monthlyDepreciationRate: 0.01, purchaseDate: '2023-01-01' };
  // 四年跨越一个闰年，按 365.25 天/年折算正好 48 个月。
  assert.ok(Math.abs(fixedValue(car, '2027-01-01') - 100000 * 0.99 ** 48) < 1e-6);
  assert.equal(fixedValue(car, '2022-12-01'), 100000);
  assert.equal(fixedValue({ ...car, monthlyDepreciationRate: 0 }, '2027-01-01'), 100000);
  assert.equal(fixedValue({ ...car, monthlyDepreciationRate: 1 }, '2027-01-01'), 0);
  assert.equal(fixedValue({ ...car, valuationOverride: 88888 }, '2027-01-01'), 88888);
});

test('旧年折损率换算后保持原估值，不会被当成月率', () => {
  const car = { subKind: 'car', initialValue: 200000, depreciationRate: 0.15, purchaseDate: '2023-01-01' };
  assert.ok(Math.abs((1 - carMonthlyRate(car)) ** 12 - 0.85) < 1e-12);
  assert.ok(Math.abs(fixedValue(car, '2027-01-01') - 200000 * 0.85 ** 4) < 1e-6);
  assert.equal(carMonthlyRate({ ...car, monthlyDepreciationRate: 0 }), 0);
});

test('信用卡通过可用额度计算欠款，支持溢缴款与透支', () => {
  const card = { type: 'credit', totalLimit: 50000, availableCredit: 38000 };
  assert.deepEqual(liveValuation(card), { value: 12000, kind: 'liability' });
  assert.equal(liveValuation({ ...card, availableCredit: 12345.67 }).value, 37654.33);
  assert.equal(liveValuation({ ...card, availableCredit: 51000 }).value, 0);
  assert.equal(liveValuation({ ...card, availableCredit: -100 }).value, 50100);
});
