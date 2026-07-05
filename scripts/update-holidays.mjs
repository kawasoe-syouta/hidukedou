// 内閣府「国民の祝日」CSV から src/lib/holidays.js を再生成するスクリプト。
// 年に1回（毎年2月の官報公示後ごろ）実行すれば祝日データが最新になります。
//   実行: npm run update-holidays
// CSVはShift_JISで配布されているためデコードしてから処理します。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CSV_URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";
// 何年分を収録するか（今年の前年〜今年+2年の範囲に絞る）
const now = new Date().getFullYear();
const FROM_YEAR = now - 1;
const TO_YEAR = now + 2;

const res = await fetch(CSV_URL);
if (!res.ok) {
  console.error(`取得に失敗しました: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const buf = await res.arrayBuffer();
const text = new TextDecoder("shift_jis").decode(buf);

const holidays = [];
for (const line of text.split(/\r?\n/).slice(1)) {
  const [rawDate, rawName] = line.split(",");
  if (!rawDate || !rawName) continue;
  const m = rawDate.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) continue;
  const [, y, mo, d] = m;
  const year = Number(y);
  if (year < FROM_YEAR || year > TO_YEAR) continue;
  // 内閣府CSVでは振替休日・国民の休日が「休日」と表記される
  const name = rawName.trim() === "休日" ? "休日（振替休日等）" : rawName.trim();
  holidays.push({ date: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, name });
}

if (holidays.length < 10) {
  console.error("取得件数が少なすぎます。CSVの形式が変わった可能性があるため中断します。");
  process.exit(1);
}
holidays.sort((a, b) => a.date.localeCompare(b.date));

const data = {
  source: `内閣府「国民の祝日について」公表データに基づく（${new Date().toISOString().slice(0, 10)} 取得）`,
  range: { from: `${FROM_YEAR}-01-01`, to: `${TO_YEAR}-12-31` },
  holidays,
};

const out = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/holidays.js");
writeFileSync(
  out,
  "// このファイルは scripts/update-holidays.mjs が生成します。手動編集は不可。\nexport default " +
    JSON.stringify(data, null, 2) +
    ";\n"
);
console.log(`${holidays.length}件の祝日を書き込みました → src/lib/holidays.js`);
console.log("念のため npm test で計算テストも実行してください。");
