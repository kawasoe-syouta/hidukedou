import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // sitemap生成とcanonical URLに使われます
  site: "https://hizukedo.com",
  integrations: [sitemap()],
});
