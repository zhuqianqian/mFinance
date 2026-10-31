// js/icons.js —— 机构徽标（官网 favicon，失败回退字母色块）+ 全球银行数据 + UI 图标
import { h } from './util.js';

/* ---------- 全球银行数据（按地区分组；favicon 取官网域名） ---------- */
// 每项：{ id, label, en?, region, domain?, color, text }
export const BANKS = [
  // 中国大陆
  { id: 'icbc', label: '工商银行', region: '中国大陆', domain: 'www.icbc.com.cn', color: '#C8102E', text: '工' },
  { id: 'ccb', label: '建设银行', region: '中国大陆', domain: 'www.ccb.com', color: '#0033A0', text: '建' },
  { id: 'abc', label: '农业银行', region: '中国大陆', domain: 'www.abchina.com', color: '#009A44', text: '农' },
  { id: 'boc', label: '中国银行', region: '中国大陆', domain: 'www.boc.cn', color: '#AD0B20', text: '中' },
  { id: 'bocom', label: '交通银行', region: '中国大陆', domain: 'www.bankcomm.com', color: '#005BAC', text: '交' },
  { id: 'cmb', label: '招商银行', region: '中国大陆', domain: 'www.cmbchina.com', color: '#C8102E', text: '招' },
  { id: 'psbc', label: '邮储银行', region: '中国大陆', domain: 'www.psbc.com', color: '#006C3B', text: '邮' },
  { id: 'citic', label: '中信银行', region: '中国大陆', domain: 'bank.ecitic.com', color: '#D7000F', text: '信' },
  { id: 'spdb', label: '浦发银行', region: '中国大陆', domain: 'www.spdb.com.cn', color: '#00529C', text: '浦' },
  { id: 'cmbc', label: '民生银行', region: '中国大陆', domain: 'www.cmbc.com.cn', color: '#007C45', text: '民' },
  { id: 'ceb', label: '光大银行', region: '中国大陆', domain: 'www.cebbank.com', color: '#4F2D7F', text: '光' },
  { id: 'pingan', label: '平安银行', region: '中国大陆', domain: 'bank.pingan.com', color: '#F05A28', text: '平' },
  { id: 'cib', label: '兴业银行', region: '中国大陆', domain: 'www.cib.com.cn', color: '#1A4C9B', text: '兴' },
  { id: 'cgb', label: '广发银行', region: '中国大陆', domain: 'www.cgbchina.com.cn', color: '#E2231A', text: '广' },
  { id: 'hxb', label: '华夏银行', region: '中国大陆', domain: 'www.hxb.com.cn', color: '#B81C22', text: '华' },
  { id: 'bcm', label: '北京银行', region: '中国大陆', domain: 'www.bankofbeijing.com.cn', color: '#C4122F', text: '京' },
  { id: 'shb', label: '上海银行', region: '中国大陆', domain: 'www.bankofshanghai.com', color: '#0C4DA2', text: '沪' },
  { id: 'czbank', label: '浙商银行', region: '中国大陆', domain: 'www.czbank.com', color: '#C8102E', text: '浙' },
  { id: 'njcb', label: '南京银行', region: '中国大陆', domain: 'www.njcb.com.cn', color: '#1A4C9B', text: '宁' },
  // 中国港澳台
  { id: 'hsbchk', label: '汇丰银行（香港）', region: '中国港澳台', domain: 'www.hsbc.com.hk', color: '#DB0011', text: 'HS' },
  { id: 'hangseng', label: '恒生银行', region: '中国港澳台', domain: 'www.hangseng.com', color: '#8B6F3E', text: '恒' },
  { id: 'bochk', label: '中银香港', region: '中国港澳台', domain: 'www.bochk.com', color: '#AD0B20', text: '中' },
  { id: 'scbhk', label: '渣打银行（香港）', region: '中国港澳台', domain: 'www.sc.com', color: '#0473EA', text: 'SC' },
  { id: 'bea', label: '东亚银行', region: '中国港澳台', domain: 'www.hkbea.com', color: '#C8102E', text: '东' },
  { id: 'cathaybk', label: '国泰世华银行', region: '中国港澳台', domain: 'www.cathaybk.com.tw', color: '#006A4E', text: '国' },
  { id: 'ctbc', label: '中国信托银行', region: '中国港澳台', domain: 'www.ctbcbank.com', color: '#D7000F', text: '信' },
  { id: 'bot', label: '台湾银行', region: '中国港澳台', domain: 'www.bot.com.tw', color: '#005BAC', text: '台' },
  // 美国
  { id: 'chase', label: '摩根大通', en: 'Chase', region: '美国', domain: 'www.chase.com', color: '#117ACA', text: 'CH' },
  { id: 'bofa', label: '美国银行', en: 'Bank of America', region: '美国', domain: 'www.bankofamerica.com', color: '#012169', text: 'BA' },
  { id: 'wellsfargo', label: '富国银行', en: 'Wells Fargo', region: '美国', domain: 'www.wellsfargo.com', color: '#D71E28', text: 'WF' },
  { id: 'citi', label: '花旗银行', en: 'Citibank', region: '美国', domain: 'www.citi.com', color: '#003B70', text: '花' },
  { id: 'usbank', label: '合众银行', en: 'U.S. Bank', region: '美国', domain: 'www.usbank.com', color: '#0C2074', text: 'US' },
  { id: 'pnc', label: 'PNC 银行', en: 'PNC', region: '美国', domain: 'www.pnc.com', color: '#F58025', text: 'PN' },
  { id: 'capitalone', label: '第一资本', en: 'Capital One', region: '美国', domain: 'www.capitalone.com', color: '#004977', text: 'C1' },
  { id: 'amex', label: '美国运通', en: 'Amex', region: '美国', domain: 'www.americanexpress.com', color: '#006FCF', text: 'AX' },
  // 加拿大
  { id: 'rbc', label: '加拿大皇家银行', en: 'RBC', region: '加拿大', domain: 'www.rbcroyalbank.com', color: '#005DAA', text: 'RB' },
  { id: 'tdca', label: '道明银行', en: 'TD', region: '加拿大', domain: 'www.td.com', color: '#008A00', text: 'TD' },
  { id: 'scotiabank', label: '丰业银行', en: 'Scotiabank', region: '加拿大', domain: 'www.scotiabank.com', color: '#EC111A', text: 'SC' },
  { id: 'bmo', label: '蒙特利尔银行', en: 'BMO', region: '加拿大', domain: 'www.bmo.com', color: '#0079C1', text: 'BM' },
  { id: 'cibc', label: '帝国商业银行', en: 'CIBC', region: '加拿大', domain: 'www.cibc.com', color: '#B3122F', text: 'CI' },
  // 英国
  { id: 'hsbcuk', label: '汇丰银行（英国）', en: 'HSBC UK', region: '英国', domain: 'www.hsbc.co.uk', color: '#DB0011', text: 'HS' },
  { id: 'barclays', label: '巴克莱银行', en: 'Barclays', region: '英国', domain: 'www.barclays.co.uk', color: '#00AEEF', text: 'BA' },
  { id: 'lloyds', label: '劳埃德银行', en: 'Lloyds', region: '英国', domain: 'www.lloydsbank.com', color: '#024731', text: 'LL' },
  { id: 'natwest', label: '国民西敏银行', en: 'NatWest', region: '英国', domain: 'www.natwest.com', color: '#5A287F', text: 'NW' },
  { id: 'santanderuk', label: '桑坦德（英国）', en: 'Santander UK', region: '英国', domain: 'www.santander.co.uk', color: '#EC0000', text: 'SA' },
  { id: 'revolut', label: 'Revolut', en: 'Revolut', region: '英国', domain: 'www.revolut.com', color: '#0666EB', text: 'RE' },
  // 欧洲
  { id: 'deutschebank', label: '德意志银行', en: 'Deutsche Bank', region: '欧洲', domain: 'www.db.com', color: '#0018A8', text: 'DB' },
  { id: 'commerzbank', label: '德国商业银行', en: 'Commerzbank', region: '欧洲', domain: 'www.commerzbank.de', color: '#FFD700', text: 'CO' },
  { id: 'bnpparibas', label: '法国巴黎银行', en: 'BNP Paribas', region: '欧洲', domain: 'group.bnpparibas', color: '#00915A', text: 'BN' },
  { id: 'socgen', label: '法国兴业银行', en: 'Société Générale', region: '欧洲', domain: 'www.societegenerale.com', color: '#E60028', text: 'SG' },
  { id: 'ing', label: '荷兰国际集团', en: 'ING', region: '欧洲', domain: 'www.ing.com', color: '#FF6200', text: 'IN' },
  { id: 'santander', label: '桑坦德银行', en: 'Santander', region: '欧洲', domain: 'www.santander.com', color: '#EC0000', text: 'SA' },
  { id: 'bbva', label: '西班牙对外银行', en: 'BBVA', region: '欧洲', domain: 'www.bbva.com', color: '#004481', text: 'BB' },
  { id: 'unicredit', label: '裕信银行', en: 'UniCredit', region: '欧洲', domain: 'www.unicredit.eu', color: '#E2001A', text: 'UC' },
  { id: 'ubs', label: '瑞银集团', en: 'UBS', region: '欧洲', domain: 'www.ubs.com', color: '#E60100', text: 'UB' },
  // 日本·韩国
  { id: 'mufg', label: '三菱 UFJ 银行', en: 'MUFG', region: '日本·韩国', domain: 'www.bk.mufg.jp', color: '#E60012', text: 'MU' },
  { id: 'smbc', label: '三井住友银行', en: 'SMBC', region: '日本·韩国', domain: 'www.smbc.co.jp', color: '#00A040', text: 'SM' },
  { id: 'mizuho', label: '瑞穗银行', en: 'Mizuho', region: '日本·韩国', domain: 'www.mizuhobank.co.jp', color: '#1C3F94', text: 'MI' },
  { id: 'jpbank', label: '日本邮政银行', en: 'Japan Post Bank', region: '日本·韩国', domain: 'www.jp-bank.japanpost.jp', color: '#009944', text: '邮' },
  { id: 'kb', label: '国民银行', en: 'KB Kookmin', region: '日本·韩国', domain: 'www.kbstar.com', color: '#FFBC00', text: 'KB' },
  { id: 'shinhan', label: '新韩银行', en: 'Shinhan', region: '日本·韩国', domain: 'www.shinhan.com', color: '#0046FF', text: 'SH' },
  { id: 'woori', label: '友利银行', en: 'Woori', region: '日本·韩国', domain: 'www.wooribank.com', color: '#0067AC', text: 'WO' },
  { id: 'hana', label: '韩亚银行', en: 'Hana', region: '日本·韩国', domain: 'www.hanabank.com', color: '#008485', text: 'HA' },
  // 东南亚
  { id: 'dbs', label: '星展银行', en: 'DBS', region: '东南亚', domain: 'www.dbs.com.sg', color: '#FF3333', text: 'DB' },
  { id: 'ocbc', label: '华侨银行', en: 'OCBC', region: '东南亚', domain: 'www.ocbc.com', color: '#E11931', text: 'OC' },
  { id: 'uob', label: '大华银行', en: 'UOB', region: '东南亚', domain: 'www.uob.com.sg', color: '#005CAB', text: 'UO' },
  { id: 'maybank', label: '马来亚银行', en: 'Maybank', region: '东南亚', domain: 'www.maybank.com', color: '#FFC425', text: 'MB' },
  { id: 'cimb', label: '联昌国际银行', en: 'CIMB', region: '东南亚', domain: 'www.cimb.com', color: '#7A1A2E', text: 'CB' },
  { id: 'bangkokbank', label: '盘谷银行', en: 'Bangkok Bank', region: '东南亚', domain: 'www.bangkokbank.com', color: '#1E4598', text: 'BB' },
  { id: 'kbank', label: '开泰银行', en: 'Kasikornbank', region: '东南亚', domain: 'www.kasikornbank.com', color: '#138F2D', text: 'KB' },
  { id: 'bca', label: '中亚银行', en: 'BCA', region: '东南亚', domain: 'www.bca.co.id', color: '#0060AF', text: 'BC' },
  { id: 'vietcombank', label: '越南外贸银行', en: 'Vietcombank', region: '东南亚', domain: 'www.vietcombank.com.vn', color: '#007E3A', text: 'VC' },
  // 澳大利亚·新西兰
  { id: 'cba', label: '联邦银行', en: 'Commonwealth Bank', region: '澳大利亚·新西兰', domain: 'www.commbank.com.au', color: '#FFCC00', text: 'CB' },
  { id: 'westpac', label: '西太平洋银行', en: 'Westpac', region: '澳大利亚·新西兰', domain: 'www.westpac.com.au', color: '#D5002B', text: 'WP' },
  { id: 'anz', label: '澳新银行', en: 'ANZ', region: '澳大利亚·新西兰', domain: 'www.anz.com.au', color: '#007DBA', text: 'AZ' },
  { id: 'nab', label: '澳大利亚国民银行', en: 'NAB', region: '澳大利亚·新西兰', domain: 'www.nab.com.au', color: '#C50000', text: 'NA' },
  // 印度
  { id: 'sbi', label: '印度国家银行', en: 'SBI', region: '印度', domain: 'www.sbi.co.in', color: '#22409A', text: 'SB' },
  { id: 'hdfc', label: 'HDFC 银行', en: 'HDFC', region: '印度', domain: 'www.hdfcbank.com', color: '#004C8F', text: 'HD' },
  { id: 'icici', label: 'ICICI 银行', en: 'ICICI', region: '印度', domain: 'www.icicibank.com', color: '#AE282E', text: 'IC' },
  { id: 'axis', label: 'Axis 银行', en: 'Axis', region: '印度', domain: 'www.axisbank.com', color: '#97144D', text: 'AX' },
  // 电子钱包 · 其他（folded into institution picker for 资产账户; hidden for bank/credit/loan via wallet flag）
  { id: 'alipay', label: '支付宝', region: '电子钱包 · 其他', domain: 'www.alipay.com', color: '#1677FF', text: '支', wallet: true },
  { id: 'wechat', label: '微信 / 微信支付', region: '电子钱包 · 其他', domain: 'weixin.qq.com', color: '#07C160', text: '微', wallet: true },
  { id: 'unionpay', label: '云闪付', region: '电子钱包 · 其他', domain: 'www.unionpay.com', color: '#E21836', text: '云', wallet: true },
  { id: 'gongjijin', label: '住房公积金', region: '电子钱包 · 其他', color: '#C0562B', text: '积', wallet: true },
  { id: 'cash_other', label: '现金 / 其他', region: '电子钱包 · 其他', color: '#34C759', glyph: 'cash', wallet: true },
  // 其他
  { id: 'other_bank', label: '其他银行', region: '其他', color: '#6E6E73', text: '银' }
];

export const BANK_REGION_ORDER = ['中国大陆', '电子钱包 · 其他', '中国港澳台', '美国', '加拿大', '英国', '欧洲', '日本·韩国', '东南亚', '澳大利亚·新西兰', '印度', '其他'];

export function localeDefaultRegion() {
  const l = (navigator.language || 'zh-CN').toLowerCase();
  if (l.startsWith('zh-hk') || l.startsWith('zh-tw') || l.startsWith('zh-mo') || l === 'zh-hant') return '中国港澳台';
  if (l.startsWith('zh')) return '中国大陆';
  if (l.startsWith('en-gb')) return '英国';
  if (l.startsWith('en-ca') || l.startsWith('fr-ca')) return '加拿大';
  if (l.startsWith('en-au') || l.startsWith('en-nz')) return '澳大利亚·新西兰';
  if (l.startsWith('en')) return '美国';
  if (l.startsWith('ja') || l.startsWith('ko')) return '日本·韩国';
  if (l.startsWith('de') || l.startsWith('fr') || l.startsWith('es') || l.startsWith('it') || l.startsWith('nl')) return '欧洲';
  if (l.startsWith('hi') || l.startsWith('ta')) return '印度';
  return '中国大陆';
}

// 返回 [ [region, banks[]], ... ]，按固定地区顺序（本地化“推荐”由调用方单独置顶）
export function banksGrouped() {
  return BANK_REGION_ORDER.map((r) => [r, BANKS.filter((b) => b.region === r)]).filter(([, list]) => list.length);
}

/* ---------- 机构注册表（钱包 / 公积金 / 类型字形 + 合并银行） ---------- */
export const INSTITUTIONS = {
  house: { label: '房产', color: '#8E6E53', glyph: 'house' },
  car:   { label: '车辆', color: '#3A7D7B', glyph: 'car' },
  stock: { label: '股票', color: '#D9480F', glyph: 'stock' },
  fund:  { label: '基金', color: '#5E5CE6', glyph: 'fund' },
  loan:  { label: '贷款', color: '#8E8E93', glyph: 'loan' },
  credit:{ label: '信用卡', color: '#1C1C1E', glyph: 'card' },
  cash:  { label: '现金', color: '#34C759', glyph: 'cash' }
};
BANKS.forEach((b) => { INSTITUTIONS[b.id] = b; });

export const faviconURL = (domain) => `https://${domain}/favicon.ico`;

/* ---------- 字形库 ---------- */
const P = {
  home: '<rect x="3" y="3" width="7.5" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7.5" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/>',
  wallet: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 7V5.5a1.5 1.5 0 0 0-1.9-1.45L4.6 7.2A2 2 0 0 0 3 9.15V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 9.2A2 2 0 0 1 5 7h14a1 1 0 0 1 1 1v3"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 11.5h-3.5a2.25 2.25 0 0 0 0 4.5H21a.5.5 0 0 0 .5-.5v-3.5a.5.5 0 0 0-.5-.5z"/>',
  reconcile: '<rect x="8" y="2.5" width="8" height="4" rx="1.3" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 4.5h2a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2M8.5 13.5l2.4 2.4 4.6-4.8"/>',
  settings: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  chevron: '<path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  house: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z"/>',
  car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h.5a1.5 1.5 0 0 1 1.5 1.5V17h-2v1.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V17H9v1.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V17H4v-4.5A1.5 1.5 0 0 1 5.5 11zm2 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>',
  stock: '<path d="M4 18V6m0 12h16M7 14l3-3 2.5 2.5L18 8m0 0h-3m3 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  fund: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9A9 9 0 0 0 12 3z" opacity=".55"/>',
  loan: '<path d="M4 7h16v3H4zm0 5h16v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM7 15h4v2H7z"/>',
  card: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 3h18M6 15h5"/>',
  cash: '<path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
  download: '<path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  upload: '<path d="M12 20V10m0 0 4 4m-4-4-4 4M5 5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-.9 4.5M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="M4 20h4L18 10l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm6 13 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};

export function glyphSVG(name, color = 'currentColor') {
  const inner = P[name] || P.cash;
  return `<svg viewBox="0 0 24 24" fill="${color}" aria-hidden="true">${inner}</svg>`;
}
export function icon(name) { return glyphSVG(name, 'currentColor'); }

function colorFromString(s) {
  let hash = 0; for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#0a84ff', '#34c759', '#ff9f0a', '#af52de', '#30b0c7', '#ff6482', '#5e5ce6', '#8e8e93'];
  return palette[Math.abs(hash) % palette.length];
}

export function instBadge(instId, { size = '', label = '' } = {}) {
  const el = h('div', { class: 'badge' + (size === 'lg' ? ' lg' : '') });
  const inst = INSTITUTIONS[instId];
  const lettermark = () => {
    el.className = 'badge' + (size === 'lg' ? ' lg' : '');
    el.innerHTML = '';
    if (inst) {
      el.style.background = inst.color;
      const t = inst.text || inst.label.slice(0, 1);
      el.textContent = t; el.style.fontSize = t.length > 1 ? '12px' : (size === 'lg' ? '19px' : '16px');
    } else {
      const t = (label || '账').slice(0, 1);
      el.style.background = colorFromString(label || instId || '账'); el.textContent = t;
    }
  };
  if (inst && inst.domain) {
    el.classList.add('badge-logo');
    // 多源回退：官网 favicon → icon.horse 聚合 → 字母色块
    const sources = [faviconURL(inst.domain), `https://icon.horse/icon/${inst.domain}`];
    let si = 0;
    const img = h('img', { src: sources[0], alt: inst.label, loading: 'lazy', decoding: 'async' });
    img.onerror = () => { si += 1; if (si < sources.length) img.src = sources[si]; else lettermark(); };
    el.appendChild(img);
    return el;
  }
  if (inst && inst.glyph) { el.style.background = inst.color; el.innerHTML = glyphSVG(inst.glyph, '#fff'); return el; }
  lettermark();
  return el;
}

export function accountBadge(acc, size = '') {
  if (acc.institutionId && INSTITUTIONS[acc.institutionId]) return instBadge(acc.institutionId, { size, label: acc.name });
  const byType = { fixed: acc.subKind, investment: acc.subKind, loan: 'loan', credit: 'credit', cash: 'cash' };
  const key = byType[acc.type] || 'cash';
  return instBadge(key, { size, label: acc.name });
}
