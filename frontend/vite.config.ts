import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // "prompt": we show a toast and let the user apply updates — an auto
      // reload mid-exercise (or mid-placement-exam) would be hostile.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "MeinDeutsch",
        short_name: "MeinDeutsch",
        description: "Dein Weg zu natürlichem Deutsch — daily German practice.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1a2434",
        background_color: "#f7faff",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // SPA fallback must never swallow API requests (same-origin /api on deploy).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Google Fonts stylesheets — revalidate in background.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            // Font files are immutable — cache-first for a year.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
          // Deliberately NO caching for /api — learning data must always be live.
        ]
      },
      // Keep the service worker out of dev: stale caches while iterating are misery.
      devOptions: { enabled: false }
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@backend": fileURLToPath(new URL("../backend/src", import.meta.url))
    }
  },
  server: {
    fs: {
      allow: [".."]
    }
  }
});
