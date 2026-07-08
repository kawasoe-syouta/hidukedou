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

/** 祝日データがカバーする年の配列（例: [2025, 2026, 2027]） */
export function holidayYears() {
  const from = Number(HOLIDAY_RANGE.from.slice(0, 4));
  const to = Number(HOLIDAY_RANGE.to.slice(0, 4));
  const years = [];
  for (let y = from; y <= to; y++) years.push(y);
  return years;
}

/** 指定年の祝日一覧 [{ date: Date, name }]（振替休日・国民の休日を含む・日付順） */
export function holidaysInYear(year) {
  const prefix = `${year}-`;
  return holidayData.holidays
    .filter((h) => h.date.startsWith(prefix))
    .map((h) => ({ date: parseYmd(h.date), name: h.name }));
}

/** 基準日「以降」で最初にくる祝日 { date: Date, name }。範囲内になければ null */
export function nextHoliday(from) {
  const fromYmd = toYmd(from);
  const hit = holidayData.holidays.find((h) => h.date >= fromYmd);
  return hit ? { date: parseYmd(hit.date), name: hit.name } : null;
}

/**
 * date を含む「連続した休み（土日＋祝日）」の日数。
 * 単独の平日祝日なら 1、飛び石を含まず前後の休みだけを数える。
 */
export function holidayRunLength(date) {
  const off = (d) => isWeekend(d) || isHoliday(d);
  if (!off(date)) return 0;
  let len = 1;
  for (let d = addDays(date, -1); off(d); d = addDays(d, -1)) len++;
  for (let d = addDays(date, 1); off(d); d = addDays(d, 1)) len++;
  return len;
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

/** 早生まれ（1月1日〜4月1日生まれ）かどうか */
export function isHayaumare(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  return m < 4 || (m === 4 && d === 1);
}

/**
 * 小学校入学年（西暦）。学年は「4月2日生まれ〜翌年4月1日生まれ」で区切られる。
 * 年齢計算に関する法律により誕生日の前日に加齢するため、4月1日生まれは
 * 3月31日に満6歳となり、1学年上（早生まれ側）に入る。
 */
export function elementaryEntranceYear(birthDate) {
  return birthDate.getFullYear() + (isHayaumare(birthDate) ? 6 : 7);
}

/**
 * 学歴早見（幼稚園〜大学の入学・卒業年）。浪人・留年なしのストレート進学の場合。
 * enter / graduate は西暦年。入学（入園）は4月、卒業（卒園）は3月。
 */
export function schoolMilestones(birthDate) {
  const e = elementaryEntranceYear(birthDate);
  return [
    { key: "kindergarten", label: "幼稚園（3年保育）", enter: e - 3, graduate: e },
    { key: "elementary", label: "小学校", enter: e, graduate: e + 6 },
    { key: "junior", label: "中学校", enter: e + 6, graduate: e + 9 },
    { key: "high", label: "高等学校", enter: e + 9, graduate: e + 12 },
    { key: "college2", label: "短大・専門学校（2年制）", enter: e + 12, graduate: e + 14 },
    { key: "university", label: "大学（4年制）", enter: e + 12, graduate: e + 16 },
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
