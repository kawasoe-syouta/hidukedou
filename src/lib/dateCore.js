// dateCore.js — 日付計算の共通エンジン
// すべてローカルタイムの「年月日」だけで計算する（UTC変換によるズレを避けるため、
// Date は必ず new Date(y, m-1, d) で生成し、toISOString は使わない）。

import holidayData from "./holidays.js";

export const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" → Date（ローカル） */
export function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" */
export function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date → "2026年7月5日（日）" */
export function formatJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS_JA[date.getDay()]}）`;
}

/** 和暦表記（令和・平成・昭和）。範囲外は null */
export function toWareki(date) {
  const y = date.getFullYear();
  const ymd = toYmd(date);
  if (ymd >= "2019-05-01") {
    const n = y - 2018;
    return `令和${n === 1 ? "元" : n}年`;
  }
  if (ymd >= "1989-01-08") {
    const n = y - 1988;
    return `平成${n === 1 ? "元" : n}年`;
  }
  if (ymd >= "1926-12-25") {
    const n = y - 1925;
    return `昭和${n === 1 ? "元" : n}年`;
  }
  return null;
}

/** n日後（負なら前）の日付 */
export function addDays(date, n) {
  const r = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

/** nか月後。月末対応（1/31 の1か月後 → 2/28 or 2/29） */
export function addMonths(date, n) {
  const y = date.getFullYear();
  const m = date.getMonth() + n;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

/** n年後。2/29 の1年後 → 2/28 */
export function addYears(date, n) {
  return addMonths(date, n * 12);
}

/**
 * 2つの日付の差（日数）。
 * includeFirstDay=false（初日不算入・既定）: 7/1→7/8 は 7日
 * includeFirstDay=true（初日算入）        : 7/1→7/8 は 8日目までの 8日
 */
export function diffDays(from, to, includeFirstDay = false) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const days = Math.round((b - a) / 86400000);
  return includeFirstDay ? days + 1 : days;
}

/** 起算日を「1日目」として数えたときの n日目 の日付（四十九日・クーリングオフ等の数え方） */
export function nthDayCountingFirst(date, n) {
  return addDays(date, n - 1);
}

// ---------- 祝日・営業日 ----------

const holidaySet = new Set(holidayData.holidays.map((h) => h.date));
export const HOLIDAY_RANGE = holidayData.range; // { from: "2025-01-01", to: "2027-12-31" }

/** 祝日名を返す（祝日でなければ null） */
export function holidayName(date) {
  const hit = holidayData.holidays.find((h) => h.date === toYmd(date));
  return hit ? hit.name : null;
}

export function isHoliday(date) {
  return holidaySet.has(toYmd(date));
}

export function isWeekend(date) {
  const w = date.getDay();
  return w === 0 || w === 6;
}

/** 営業日（土日祝以外）かどうか */
export function isBusinessDay(date) {
  return !isWeekend(date) && !isHoliday(date);
}

/** 祝日データの範囲内かどうか（範囲外の計算には注意書きを出す用途） */
export function inHolidayRange(date) {
  const ymd = toYmd(date);
  return ymd >= HOLIDAY_RANGE.from && ymd <= HOLIDAY_RANGE.to;
}

/**
 * n営業日後（n>0）/ n営業日前（n<0）。
 * 「3営業日後」＝起算日の翌日から数えて3番目の営業日（起算日当日は数えない）。
 */
export function addBusinessDays(date, n) {
  if (n === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const step = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  let cur = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (remaining > 0) {
    cur = addDays(cur, step);
    if (isBusinessDay(cur)) remaining--;
  }
  return cur;
}

/**
 * from の翌日から to までに含まれる営業日数（初日不算入・末日算入）。
 * includeFirstDay=true なら from 当日も数える。
 */
export function countBusinessDays(from, to, includeFirstDay = false) {
  let start = includeFirstDay ? from : addDays(from, 1);
  let count = 0;
  for (let d = start; toYmd(d) <= toYmd(to); d = addDays(d, 1)) {
    if (isBusinessDay(d)) count++;
  }
  return count;
}

// ---------- 用途別プリセット ----------

/** 法要日一覧（命日を1日目として数える） */
export function memorialServices(deathDate) {
  const byDay = (label, n) => ({ label, date: nthDayCountingFirst(deathDate, n) });
  const byYear = (label, n) => ({ label, date: addYears(deathDate, n) });
  return [
    byDay("初七日（しょなのか）", 7),
    byDay("二七日（ふたなのか）", 14),
    byDay("三七日（みなのか）", 21),
    byDay("四七日（よなのか）", 28),
    byDay("五七日（いつなのか・三十五日）", 35),
    byDay("六七日（むなのか）", 42),
    byDay("四十九日（しじゅうくにち・満中陰）", 49),
    byDay("百箇日（ひゃっかにち）", 100),
    byYear("一周忌", 1),
    byYear("三回忌", 2),
    byYear("七回忌", 6),
    byYear("十三回忌", 12),
    byYear("十七回忌", 16),
    byYear("二十三回忌", 22),
    byYear("二十七回忌", 26),
    byYear("三十三回忌", 32),
  ];
}

/** 生後日数と月齢。誕生日を生後0日と数える（母子健康手帳の数え方） */
export function babyAge(birthDate, today) {
  const days = diffDays(birthDate, today, false); // 生後n日
  const weeks = Math.floor(days / 7);
  const weekDays = days % 7;
  // 月齢: 同日基準。まだ当月の同日に達していなければ繰り下げ
  let months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth());
  if (today.getDate() < birthDate.getDate()) months--;
  const monthAnchor = addMonths(birthDate, months);
  const monthRemainderDays = diffDays(monthAnchor, today, false);
  return { days, weeks, weekDays, months, monthRemainderDays };
}

/** お祝い行事一覧（誕生日を「生後1日目」と数える行事は n日目 = +n-1日） */
export function babyEvents(birthDate) {
  return [
    { label: "お七夜（生後7日目）", date: nthDayCountingFirst(birthDate, 7) },
    { label: "お宮参り 男の子（生後31日目・目安）", date: nthDayCountingFirst(birthDate, 31) },
    { label: "お宮参り 女の子（生後32日目・目安）", date: nthDayCountingFirst(birthDate, 32) },
    { label: "百日祝い・お食い初め（生後100日目）", date: nthDayCountingFirst(birthDate, 100) },
    { label: "ハーフバースデー（生後6か月）", date: addMonths(birthDate, 6) },
    { label: "1歳の誕生日", date: addYears(birthDate, 1) },
  ];
}

/** クーリングオフ期限（書面等の受領日を1日目として dayCount 日間） */
export function coolingOffDeadline(receiptDate, dayCount) {
  return nthDayCountingFirst(receiptDate, dayCount);
}

/** 記念日の節目一覧（開始日を1日目と数える） */
export function anniversaryMilestones(startDate) {
  const days = [100, 200, 300, 365, 500, 1000, 2000, 3000].map((n) => ({
    label: `${n}日目`,
    date: nthDayCountingFirst(startDate, n),
  }));
  const years = [1, 2, 3, 5, 10].map((n) => ({
    label: `${n}周年`,
    date: addYears(startDate, n),
  }));
  return [...days, ...years].sort((a, b) => a.date - b.date);
}
