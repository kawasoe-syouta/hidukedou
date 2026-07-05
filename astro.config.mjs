import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // 独自ドメイン取得後にここを書き換える（sitemap生成とcanonical URLに使われます）
  site: "https://example.com",
  integrations: [sitemap()],
});
