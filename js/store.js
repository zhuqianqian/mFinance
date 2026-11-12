// js/store.js —— localStorage 单文档仓储 + 订阅 + 导出/导入
import { uid, today } from './util.js';

const KEY = 'mfinance.db.v1';
const SCHEMA = 1;

function blank() {
  return {
    schemaVersion: SCHEMA,
    settings: { reconcileDay: 1, baseCurrency: 'CNY', lastReconcileDate: null, theme: 'auto' },
    accounts: [],
    snapshots: []
  };
}

let db = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.warn('读取本地数据失败，使用空库', e);
    return blank();
  }
}
function migrate(data) {
  if (!data.schemaVersion) data.schemaVersion = SCHEMA;
  // 预留：未来结构升级在此按版本处理
  data.settings = Object.assign(blank().settings, data.settings || {});
  data.accounts = data.accounts || [];
  data.snapshots = data.snapshots || [];
  return data;
}
function persist({ notify = true } = {}) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { console.error('保存失败', e); }
  if (notify) listeners.forEach((fn) => fn(db));
}

/* ---------- 订阅 ---------- */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* ---------- 读取 ---------- */
export const getState = () => db;
export const getSettings = () => db.settings;
export const getAccounts = ({ includeArchived = false } = {}) =>
  db.accounts.filter((a) => includeArchived || !a.archived);
export const getAccount = (id) => db.accounts.find((a) => a.id === id);
export const getSnapshots = () => db.snapshots;
export const snapshotsOf = (accountId) =>
  db.snapshots.filter((s) => s.accountId === accountId).sort((a, b) => a.date.localeCompare(b.date));

/* ---------- 设置 ---------- */
export function updateSettings(patch, options) { Object.assign(db.settings, patch); persist(options); }

/* ---------- 账户 CRUD ---------- */
export function addAccount(acc) {
  const rec = Object.assign({ id: uid(), createdAt: today(), archived: false, note: '' }, acc);
  db.accounts.push(rec);
  persist();
  return rec;
}
export function updateAccount(id, patch) {
  const a = getAccount(id);
  if (!a) return;
  Object.assign(a, patch);
  persist();
  return a;
}
export function deleteAccount(id) {
  db.accounts = db.accounts.filter((a) => a.id !== id);
  db.snapshots = db.snapshots.filter((s) => s.accountId !== id);
  persist();
}

/* ---------- 快照 ---------- */
// 同一账户同一天只保留一条（覆盖）
export function putSnapshot(snap) {
  const rec = Object.assign({ id: uid() }, snap);
  db.snapshots = db.snapshots.filter((s) => !(s.accountId === rec.accountId && s.date === rec.date));
  db.snapshots.push(rec);
  persist();
  return rec;
}
export function putSnapshotsBatch(list) {
  for (const snap of list) {
    const rec = Object.assign({ id: uid() }, snap);
    db.snapshots = db.snapshots.filter((s) => !(s.accountId === rec.accountId && s.date === rec.date));
    db.snapshots.push(rec);
  }
  persist();
}
export function deleteSnapshot(id) {
  db.snapshots = db.snapshots.filter((s) => s.id !== id);
  persist();
}

/* ---------- 导出 / 导入 ---------- */
export function exportJSON() {
  return JSON.stringify({ app: 'mFinance', exportedAt: new Date().toISOString(), data: db }, null, 2);
}
export function importJSON(text, { merge = false } = {}) {
  const parsed = JSON.parse(text);
  const incoming = parsed.data || parsed; // 兼容直接传 db
  if (!incoming.accounts || !incoming.snapshots) throw new Error('文件格式不正确');
  const clean = migrate(incoming);
  if (merge) {
    const ids = new Set(db.accounts.map((a) => a.id));
    clean.accounts.forEach((a) => { if (!ids.has(a.id)) db.accounts.push(a); });
    const skey = new Set(db.snapshots.map((s) => s.accountId + s.date));
    clean.snapshots.forEach((s) => { if (!skey.has(s.accountId + s.date)) db.snapshots.push(s); });
  } else {
    db = clean;
  }
  persist();
}
export function wipeAll() { db = blank(); persist(); }
