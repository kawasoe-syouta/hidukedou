# ひづけ堂 仕様書

最終更新: 2026-07-05

## サイト概要

| 項目 | 内容 |
|---|---|
| サイト名 | ひづけ堂 |
| タグライン | 日付の数え方まで、きちんと。 |
| 内容 | 四十九日・営業日・生後日数・クーリングオフ期限など、暮らしの日付を計算できる無料ツール集 |
| 本番URL | https://hizukedo.com （www.hizukedo.com も有効） |
| リポジトリ | github.com/kawasoe-syouta/hidukedou |

サイト名・タグライン・説明文は `src/lib/site.js` で一元管理。変更はこのファイルだけでよい。

## 技術構成

- **フレームワーク**: Astro（静的サイト生成）+ @astrojs/sitemap
- **ホスティング**: Cloudflare Workers（静的アセット配信）
- **ドメイン**: hizukedo.com（Cloudflare Registrar で取得・DNSもCloudflare管理）
- **デプロイ**: GitHub の main ブランチに push すると Cloudflare が自動でビルド・デプロイ
  - ビルドコマンド: `npm run build`
  - デプロイコマンド: `npx wrangler deploy`
  - 配信ディレクトリ・カスタムドメインは `wrangler.jsonc` で管理（`dist/` を配信、apex と www を custom_domain として登録）

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `src/lib/site.js` | サイト名・タグライン・説明文の一元管理 |
| `astro.config.mjs` | `site: "https://hizukedo.com"`（sitemap と canonical URL の基準） |
| `wrangler.jsonc` | Cloudflare Workers 設定（配信ディレクトリ・カスタムドメイン） |
| `src/layouts/Base.astro` | 全ページ共通レイアウト。`<head>` に AdSense コード設置済み |
| `src/layouts/ToolLayout.astro` | ツールページ用レイアウト |
| `public/robots.txt` | クロール許可 + sitemap の場所を指定 |

## ページ構成（src/pages/）

- `index.astro` — トップ（ツール一覧）
- `shijukunichi.astro` — 四十九日計算
- `eigyobi.astro` — 営業日計算
- `seigo.astro` — 生後日数計算
- `cooling-off.astro` — クーリングオフ期限計算
- `kinenbi.astro` — 記念日計算
- `column/` — コラム記事
- `about.astro` / `privacy.astro` / `contact.astro` — 運営者情報・プライバシーポリシー・お問い合わせ（Google Form）

## 外部サービス設定

### Cloudflare
- ドメイン登録・DNS・ホスティングを一括管理
- カスタムドメインの DNS レコードと SSL 証明書は `wrangler.jsonc` の routes 設定により deploy 時に自動管理

### Google Search Console
- プロパティ: `hizukedo.com`（ドメインプロパティ）
- 所有権確認: TXT レコード（Google↔Cloudflare の自動連携で設定済み）
- サイトマップ送信済み: `https://hizukedo.com/sitemap-index.xml`
  - ※登録直後は「取得できませんでした」と表示されるが、数日以内に自動で解消される

### Google AdSense
- パブリッシャーID: `ca-pub-7405074438692646`
- 審査コード: `Base.astro` の `<head>` に設置済み（全ページに反映）
- 状態: 審査申請済み（2026-07-05）。結果は数日〜2週間でメール通知

## 運用メモ

- **更新の流れ**: ファイル編集 → `git push origin main` → 自動デプロイ（1〜2分）
- **ローカル確認**: `npm run dev`（開発サーバー）/ `npm run build`（本番ビルド確認）
- **AdSense 審査中〜通過後のTODO**:
  - 各ツールページの解説文を充実させる（審査通過率とSEOに有効）
  - 審査通過後、広告ユニットを作成して配置場所を決める
