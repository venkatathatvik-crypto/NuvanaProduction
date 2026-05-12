import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.png"],
      manifest: {
        name: "Nuvana360",
        short_name: "Nuvana360",
        description:
          "Your complete 360° academic companion for learning, teaching, and thriving",
        theme_color: "#8b5cf6",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Precache all static assets that form the app shell
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],

        // Allow larger bundles (e.g. PDF-viewer chunk) to be precached
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        // Serve index.html for every navigation request that isn't a static
        // asset.  This is what makes deep links work when the user is offline
        // (React Router handles the route client-side once the shell loads).
        navigateFallback: "index.html",

        // Only apply navigateFallback to requests under the app's base path
        navigateFallbackAllowlist: [/^\//],

        // Exclude the legacy cleanup SW from precaching — we don't want
        // Workbox to version-hash it and interfere with its self-unregister.
        globIgnores: ["**/service-worker.js"],

        runtimeCaching: [
          // ── Google Fonts (cache-first, 1 year) ─────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-assets",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── App images / logos (stale-while-revalidate) ────────────────
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },

          // ── Supabase Storage: PDFs, audio, video (cache-first) ─────────
          // Files are stored as public Supabase storage URLs (stable, no expiry).
          // CacheFirst means: serve from cache immediately, skip network when
          // offline.  Files are cached on first access — no "save offline"
          // button required.
          //
          // Limits: 100 files max, evict after 30 days.
          // rangeRequests: true enables byte-range support so audio/video
          // seeking works correctly from the service-worker cache.
          {
            urlPattern: /^https:\/\/borazruaystegxynvckt\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "nuvana360-files-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              // Cache both opaque (0) and normal (200) responses so the SW
              // works even when the Supabase CORS policy returns opaque responses.
              cacheableResponse: { statuses: [0, 200] },
              // Enables partial content responses so audio/video seeking
              // (HTTP 206) works from the cache (requires Workbox rangeRequests).
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor chunks strategically to reduce bundle size
          // while maintaining stability
          if (id.includes('node_modules')) {
            // UI libraries (Radix, Recharts, etc.) - separate to reduce main bundle
            if (id.includes('@radix-ui') || id.includes('recharts') || id.includes('lucide-react')) {
              return 'ui-libs';
            }
            
            // Query and state management
            if (id.includes('@tanstack') || id.includes('zustand')) {
              return 'state-libs';
            }
            
            // Keep React, React-DOM, and React-Router together in vendor chunk
            // to prevent context/hook errors from chunk splitting
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1500kb to accommodate larger bundles
    chunkSizeWarningLimit: 1500,
  },
}));
