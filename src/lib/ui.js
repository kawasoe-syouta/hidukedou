// ui.js — 結果表示の共通部品（クライアント側）
import { WEEKDAYS_JA, toYmd, toWareki, holidayName, formatJa } from "./dateCore.js";
import { rokuyo } from "./rokuyo.js";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** シグネチャの「日めくりカレンダー」風カードHTML */
export function himekuriHTML(date) {
  const w = date.getDay();
  const holiday = holidayName(date);
  const isRed = w === 0 || holiday !== null;
  // 和暦と六曜（六曜はデータ範囲内のときだけ）を小さく併記する
  const r = rokuyo(date);
  const subLine = [toWareki(date), r && r.name].filter(Boolean).join("・");
  return `
    <div class="himekuri" role="img" aria-label="${esc(formatJa(date))}${holiday ? " " + esc(holiday) : ""}${r ? " " + esc(r.name) : ""}">
      <div class="himekuri-band${isRed ? " is-red" : ""}">${WEEKDAYS_JA[w]}曜日</div>
      <div class="himekuri-ym">${date.getFullYear()}年 ${date.getMonth() + 1}月</div>
      <div class="himekuri-day${isRed ? " is-red" : ""}">${date.getDate()}</div>
      <div class="himekuri-wareki">${subLine ? esc(subLine) : ""}</div>
      ${holiday ? `<div class="himekuri-note">${esc(holiday)}</div>` : ""}
    </div>`;
}

/** 節目一覧テーブルHTML。items: [{label, date, sub?, main?}] */
export function milestoneTableHTML(items, { firstColLabel = "行事" } = {}) {
  const rows = items
    .map((it) => {
      const holiday = holidayName(it.date);
      const red = it.date.getDay() === 0 || holiday;
      return `<tr${it.main ? ' class="is-main"' : ""}>
        <td>${esc(it.label)}${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ""}</td>
        <td class="date-cell${red ? " is-red" : ""}">${esc(formatJa(it.date))}${
          holiday ? `<span class="sub">${esc(holiday)}</span>` : ""
        }</td>
      </tr>`;
    })
    .join("");
  return `<table class="milestones">
    <thead><tr><th>${esc(firstColLabel)}</th><th>日付</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** 「結果のURLをコピー」ボタンHTMLと、そのイベント登録 */
export function shareButtonHTML() {
  return `<div class="result-actions"><button type="button" class="btn-ghost" data-copy-url>結果のURLをコピー</button></div>`;
}
export function bindShareButtons(root = document) {
  root.querySelectorAll("[data-copy-url]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        btn.textContent = "コピーしました";
        setTimeout(() => (btn.textContent = "結果のURLをコピー"), 1600);
      } catch {
        btn.textContent = location.href;
      }
    });
  });
}

/** URLクエリの読み書き（結果をURLに反映して共有可能にする） */
export function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}
export function setParams(obj) {
  try {
    const p = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
  } catch {
    // URLを書き換えられない環境（アプリ内ブラウザ等）では共有URL機能だけを諦める
  }
}

/** date input の初期値を今日にする */
export function todayYmd() {
  return toYmd(new Date());
}
