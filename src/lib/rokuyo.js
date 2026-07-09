// rokuyo.js — 六曜（大安・仏滅など）と旧暦の計算
//
// 六曜は占いではなく、旧暦（太陰太陽暦）の月日から機械的に決まる:
//   (旧暦の月 + 旧暦の日) % 6 → 0:大安 1:赤口 2:先勝 3:友引 4:先負 5:仏滅
// 閏月は元の月と同じ月番号で計算する（例: 閏6月1日 = (6+1)%6 = 赤口）。
//
// 旧暦の各月1日（朔日＝新月の日）は天文計算で決まるため、祝日データと同様に
// 確定済みの対応表を静的に持つ。範囲を延長するときは MONTH_STARTS に翌年分の
// 朔日を追加し、KYUREKI_RANGE.to を更新する（市販の暦・複数の旧暦カレンダーと
// 照合して検証すること。scripts/test-core.mjs に検証済みの照合値がある）。

import { parseYmd, toYmd, addDays, diffDays } from "./dateCore.js";

// index = (旧暦月 + 旧暦日) % 6 に対応
export const ROKUYO = [
  {
    name: "大安",
    yomi: "たいあん",
    summary: "万事に吉とされる大吉日",
    desc: "「大いに安し」の意味で、六曜でもっとも縁起がよいとされる日。終日吉とされ、結婚式・入籍・納車・引越しなど、お祝いごとの日取りとして人気があります。",
  },
  {
    name: "赤口",
    yomi: "しゃっこう",
    summary: "正午前後のみ吉",
    desc: "「しゃっこう」「しゃっく」と読みます。正午前後（午前11時〜午後1時ごろ）だけが吉で、それ以外は凶とされる日。「赤」の連想から、火の元や刃物に注意といわれます。",
  },
  {
    name: "先勝",
    yomi: "せんしょう",
    summary: "午前が吉、午後は凶",
    desc: "「先んずれば勝つ」とされ、急ぐことがよいといわれる日。用事は午前中に済ませるのが吉とされます。「さきがち」「せんかち」とも読みます。",
  },
  {
    name: "友引",
    yomi: "ともびき",
    summary: "朝晩は吉、昼は凶",
    desc: "勝負がつかない日とされ、朝晩は吉、昼は凶といわれます。「友を引く」の連想から葬儀を避ける風習がありますが、お祝いごとには大安に次いでよい日とされます。",
  },
  {
    name: "先負",
    yomi: "せんぶ",
    summary: "午前が凶、午後は吉",
    desc: "「先んずれば負ける」とされ、急がず静かに過ごすのがよいといわれる日。用事は午後に回すのが吉とされます。「さきまけ」「せんまけ」とも読みます。",
  },
  {
    name: "仏滅",
    yomi: "ぶつめつ",
    summary: "万事に凶とされる日",
    desc: "六曜でいちばんの凶日とされ、お祝いごとを避ける傾向があります。ただし仏教とは無関係で、もとは「物滅」と書かれていました。式場が空きやすく費用を抑えられるため、あえて選ぶ人もいます。",
  },
];

/** 慣用的な並び（先勝→友引→先負→仏滅→大安→赤口）での一覧 */
export const ROKUYO_DISPLAY = [2, 3, 4, 5, 0, 1].map((i) => ROKUYO[i]);

// 旧暦の各月1日（朔日）にあたる新暦の日付: [新暦日付, 旧暦月, 閏月フラグ]
// 国立天文台の暦要項に基づく旧暦カレンダー（複数サイト）と照合済み。
const MONTH_STARTS = [
  ["2024-12-31", 12, 0],
  ["2025-01-29", 1, 0],
  ["2025-02-28", 2, 0],
  ["2025-03-30", 3, 0],
  ["2025-04-28", 4, 0],
  ["2025-05-27", 5, 0],
  ["2025-06-25", 6, 0],
  ["2025-07-25", 6, 1], // 閏6月
  ["2025-08-23", 7, 0],
  ["2025-09-22", 8, 0],
  ["2025-10-21", 9, 0],
  ["2025-11-20", 10, 0],
  ["2025-12-20", 11, 0],
  ["2026-01-19", 12, 0],
  ["2026-02-17", 1, 0],
  ["2026-03-19", 2, 0],
  ["2026-04-17", 3, 0],
  ["2026-05-17", 4, 0],
  ["2026-06-15", 5, 0],
  ["2026-07-14", 6, 0],
  ["2026-08-13", 7, 0],
  ["2026-09-11", 8, 0],
  ["2026-10-11", 9, 0],
  ["2026-11-09", 10, 0],
  ["2026-12-09", 11, 0],
  ["2027-01-08", 12, 0],
  ["2027-02-07", 1, 0],
  ["2027-03-08", 2, 0],
  ["2027-04-06", 3, 0],
  ["2027-05-06", 4, 0],
  ["2027-06-05", 5, 0],
  ["2027-07-04", 6, 0],
  ["2027-08-02", 7, 0],
  ["2027-09-01", 8, 0],
  ["2027-09-30", 9, 0],
  ["2027-10-29", 10, 0],
  ["2027-11-28", 11, 0],
  ["2027-12-28", 12, 0],
];

/** 六曜・旧暦を計算できる範囲（範囲外の日付には null を返す） */
export const KYUREKI_RANGE = { from: "2025-01-01", to: "2027-12-31" };

/** 新暦 → 旧暦 { month, day, leap }。範囲外は null */
export function kyureki(date) {
  const ymd = toYmd(date);
  if (ymd < KYUREKI_RANGE.from || ymd > KYUREKI_RANGE.to) return null;
  let hit = null;
  for (const [start, month, leap] of MONTH_STARTS) {
    if (start <= ymd) hit = { start, month, leap: leap === 1 };
    else break;
  }
  if (!hit) return null;
  const day = diffDays(parseYmd(hit.start), date, true); // 朔日を1日目と数える
  return { month: hit.month, day, leap: hit.leap };
}

/** 旧暦 → "旧暦6月25日"（閏月は "旧暦閏6月1日"） */
export function formatKyureki(k) {
  return `旧暦${k.leap ? "閏" : ""}${k.month}月${k.day}日`;
}

/** その日の六曜 { name, yomi, summary, desc }。範囲外は null */
export function rokuyo(date) {
  const k = kyureki(date);
  return k ? ROKUYO[(k.month + k.day) % 6] : null;
}

/** 基準日以降で指定の六曜（例: "大安"）にあたる日を最大 count 件。基準日当日を含む */
export function nextRokuyoDays(from, name, count = 6) {
  const res = [];
  for (let d = from; toYmd(d) <= KYUREKI_RANGE.to && res.length < count; d = addDays(d, 1)) {
    const r = rokuyo(d);
    if (r && r.name === name) res.push(d);
  }
  return res;
}

/** 旧暦データがカバーする年の配列（例: [2025, 2026, 2027]） */
export function kyurekiYears() {
  const from = Number(KYUREKI_RANGE.from.slice(0, 4));
  const to = Number(KYUREKI_RANGE.to.slice(0, 4));
  const years = [];
  for (let y = from; y <= to; y++) years.push(y);
  return years;
}
