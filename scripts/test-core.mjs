import {
  parseYmd, toYmd, formatJa, toWareki, addDays, addMonths, addYears,
  diffDays, nthDayCountingFirst, isBusinessDay, addBusinessDays,
  countBusinessDays, memorialServices, babyAge, babyEvents,
  coolingOffDeadline, anniversaryMilestones, holidayName,
} from "../src/lib/dateCore.js";
import { kyureki, rokuyo, formatKyureki, nextRokuyoDays } from "../src/lib/rokuyo.js";

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = actual instanceof Date ? toYmd(actual) : actual;
  if (a === expected) { pass++; }
  else { fail++; console.error(`NG ${label}: got ${a}, want ${expected}`); }
}

// --- 基本 ---
eq(toYmd(parseYmd("2026-07-05")), "2026-07-05", "parse/format往復");
eq(formatJa(parseYmd("2026-07-05")), "2026年7月5日（日）", "日本語表記と曜日");
eq(toWareki(parseYmd("2026-07-05")), "令和8年", "和暦 令和");
eq(toWareki(parseYmd("2019-05-01")), "令和元年", "令和元年境界");
eq(toWareki(parseYmd("2019-04-30")), "平成31年", "平成末日");
eq(toWareki(parseYmd("1989-01-07")), "昭和64年", "昭和末日");

// --- 加算 ---
eq(addDays(parseYmd("2026-12-31"), 1), "2027-01-01", "年またぎ+1日");
eq(addMonths(parseYmd("2026-01-31"), 1), "2026-02-28", "月末繰り下げ(平年)");
eq(addMonths(parseYmd("2024-01-31"), 1), "2024-02-29", "月末繰り下げ(閏年)");
eq(addYears(parseYmd("2024-02-29"), 1), "2025-02-28", "閏日+1年");

// --- 差分（初日算入/不算入） ---
eq(diffDays(parseYmd("2026-07-01"), parseYmd("2026-07-08")), 7, "初日不算入=7日");
eq(diffDays(parseYmd("2026-07-01"), parseYmd("2026-07-08"), true), 8, "初日算入=8日");
eq(diffDays(parseYmd("2026-07-05"), parseYmd("2026-07-05")), 0, "同日=0日");

// --- n日目（起算日を1日目） ---
eq(nthDayCountingFirst(parseYmd("2026-07-01"), 1), "2026-07-01", "1日目=当日");
eq(nthDayCountingFirst(parseYmd("2026-07-01"), 8), "2026-07-08", "8日目=+7日");

// --- 営業日 ---
// 2026-07-03(金)の翌営業日: 7/4土,7/5日を飛ばして 7/6(月)
eq(addBusinessDays(parseYmd("2026-07-03"), 1), "2026-07-06", "金曜の1営業日後=月曜");
// 2026-04-30(木)の3営業日後: 5/1(金)=1, 5/2土 5/3日祝 5/4祝 5/5祝 5/6振替 を飛ばし 5/7(木)=2, 5/8(金)=3
eq(addBusinessDays(parseYmd("2026-04-30"), 3), "2026-05-08", "GWまたぎ3営業日後");
// 2026-09-24(木)の2営業日前: 9/23祝 9/22国民の休日 9/21祝 9/20日 9/19土 を飛ばし 9/18(金)=1, 9/17(木)=2
eq(addBusinessDays(parseYmd("2026-09-24"), -2), "2026-09-17", "シルバーウィークまたぎ2営業日前");
eq(isBusinessDay(parseYmd("2026-09-22")), false, "国民の休日は非営業日");
eq(holidayName(parseYmd("2026-05-06")), "振替休日", "振替休日の名称");
// 2026-07-06(月)〜2026-07-10(金): 初日不算入で火水木金=4
eq(countBusinessDays(parseYmd("2026-07-06"), parseYmd("2026-07-10")), 4, "期間内営業日数(初日不算入)");
eq(countBusinessDays(parseYmd("2026-07-06"), parseYmd("2026-07-10"), true), 5, "期間内営業日数(初日算入)");

// --- 四十九日（命日を1日目） ---
const svc = memorialServices(parseYmd("2026-07-01"));
const find = (arr, key) => arr.find((x) => x.label.includes(key)).date;
eq(find(svc, "初七日"), "2026-07-07", "初七日=命日+6");
eq(find(svc, "四十九日"), "2026-08-18", "四十九日=命日+48");
eq(find(svc, "百箇日"), "2026-10-08", "百箇日=命日+99");
eq(find(svc, "一周忌"), "2027-07-01", "一周忌=翌年祥月命日");
eq(find(svc, "三回忌"), "2028-07-01", "三回忌=2年後");

// --- 生後日数（誕生日を0日） ---
const age = babyAge(parseYmd("2026-01-15"), parseYmd("2026-07-05"));
eq(age.days, 171, "生後日数");
eq(age.months, 5, "月齢(同日基準・7/5<15なので5か月)");
const age2 = babyAge(parseYmd("2026-01-15"), parseYmd("2026-07-15"));
eq(age2.months, 6, "月齢(同日到達で6か月)");
const ev = babyEvents(parseYmd("2026-01-15"));
eq(find(ev, "お七夜"), "2026-01-21", "お七夜=生後7日目=+6");
eq(find(ev, "百日祝い"), "2026-04-24", "百日祝い=生後100日目=+99");
eq(find(ev, "ハーフ"), "2026-07-15", "ハーフバースデー=+6か月");

// --- クーリングオフ（受領日を1日目として8日間） ---
eq(coolingOffDeadline(parseYmd("2026-07-01"), 8), "2026-07-08", "8日間=受領日+7");
eq(coolingOffDeadline(parseYmd("2026-07-01"), 20), "2026-07-20", "20日間=受領日+19");

// --- 記念日（開始日を1日目） ---
const ann = anniversaryMilestones(parseYmd("2025-01-01"));
eq(find(ann, "100日目"), "2025-04-10", "100日目=+99");
eq(find(ann, "1周年"), "2026-01-01", "1周年");
eq(find(ann, "1000日目"), "2027-09-27", "1000日目=+999");

// --- 六曜・旧暦（市販の旧暦カレンダーと照合済みの値） ---
const k1 = kyureki(parseYmd("2026-01-01"));
eq(`${k1.month}/${k1.day}${k1.leap ? "閏" : ""}`, "11/13", "旧暦変換 2026-01-01=旧暦11月13日");
eq(formatKyureki(kyureki(parseYmd("2025-07-25"))), "旧暦閏6月1日", "閏月の表記");
eq(rokuyo(parseYmd("2025-01-01")).name, "先勝", "2025-01-01=先勝(旧暦12月2日)");
eq(rokuyo(parseYmd("2025-01-29")).name, "先勝", "旧暦元日は必ず先勝");
eq(rokuyo(parseYmd("2025-07-25")).name, "赤口", "閏6月1日=赤口(閏月は元の月の数字で計算)");
eq(rokuyo(parseYmd("2026-01-01")).name, "大安", "2026-01-01=大安(旧暦11月13日)");
eq(rokuyo(parseYmd("2026-07-09")).name, "大安", "2026-07-09=大安(旧暦5月25日)");
eq(rokuyo(parseYmd("2026-12-31")).name, "先負", "2026-12-31=先負(旧暦11月23日)");
eq(rokuyo(parseYmd("2024-12-31")), null, "範囲より前はnull");
eq(rokuyo(parseYmd("2028-01-01")), null, "範囲より後はnull");
const taian = nextRokuyoDays(parseYmd("2026-07-09"), "大安", 2);
eq(taian[0], "2026-07-09", "次の大安: 当日が大安なら当日を含む");
eq(taian[1], "2026-07-19", "次の大安: 月替わり(7/14=旧暦6月1日)をまたいで7/19");

console.log(`\n結果: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
