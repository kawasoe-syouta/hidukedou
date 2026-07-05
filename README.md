# ひづけ堂 — 日付計算ツール集

四十九日・営業日・生後日数・クーリングオフ期限・記念日を計算する、広告収益型の静的サイトです。
Astro製・サーバー不要・入力データはすべてブラウザ内で処理されます。

## セットアップ

```bash
npm install
npm test        # 日付計算エンジンのテスト（38件）
npm run dev     # http://localhost:4321 で開発サーバー起動
npm run build   # dist/ に静的ファイルを出力
```

## 公開前にやること（チェックリスト）

1. **サイト名を決める** — `src/lib/site.js` の1ファイルだけ変えれば全ページに反映されます（現状は仮に「ひづけ堂」）。
2. **独自ドメインを取得** — `astro.config.mjs` の `site:` を取得したURLに書き換える（sitemap生成とcanonical URLに使われます）。
3. **お問い合わせフォームを作る** — Googleフォームを作成し、`src/pages/contact.astro` のURLを差し替える。
4. **Cloudflare Pages（またはVercel/Netlify）にデプロイ** — GitHubにpushして連携するだけ。ビルドコマンド `npm run build`、出力ディレクトリ `dist`。
5. **Google Search Consoleに登録** — サイトマップ（`/sitemap-index.xml`）を送信。
6. **AdSense審査に申請** — 上記が済んで全ページ公開済みの状態で申請。通過後、広告コードを `src/layouts/Base.astro` の `<head>` に追加。

## 運用（年1回だけ）

祝日データの更新。毎年2月ごろ（翌々年の春分・秋分が官報公示された後）に実行:

```bash
npm run update-holidays   # 内閣府CSVから src/lib/holidays.js を再生成
npm test                  # 計算テストが通ることを確認
```

あとはコミットしてpushすれば自動デプロイされます。

## ページを増やすには

1. `src/pages/` に既存ツール（例: `kinenbi.astro`）をコピーして新しい名前で保存
2. タイトル・説明文・FAQ・計算ロジック呼び出しを書き換える
3. 計算関数が足りなければ `src/lib/dateCore.js` に追加し、`scripts/test-core.mjs` にテストも追加
4. トップページ（`src/pages/index.astro`）の一覧に追加

計算エンジン（dateCore.js）とUI部品（ui.js）は共通なので、1ページの追加は30分程度で済む構造になっています。

## 構成

```
src/
├─ lib/
│  ├─ dateCore.js   # 日付計算エンジン（初日算入/不算入をオプション化）
│  ├─ holidays.js   # 祝日データ（scripts/update-holidays.mjs が生成）
│  ├─ ui.js         # 結果カード・一覧表・URL共有などの共通UI
│  └─ site.js       # サイト名・タグライン（ここだけ変えれば全体に反映）
├─ layouts/
│  ├─ Base.astro    # 全ページ共通（メタ・ヘッダー・フッター）
│  └─ ToolLayout.astro  # ツールページの型（計算機→解説→FAQ→関連リンク）
├─ pages/           # 各ページ（URLと1対1対応）
└─ styles/global.css    # デザイントークンと全スタイル
scripts/
├─ test-core.mjs        # 計算エンジンのテスト
└─ update-holidays.mjs  # 祝日データの年次更新
```

## 免責まわりの方針

- クーリングオフなど法制度に触れるページには「法的助言ではない」旨と相談窓口（消費者ホットライン188）を明記しています。内容を編集する際もこの方針を維持してください。
- フッターに全ページ共通の免責文があります（`Base.astro`）。
