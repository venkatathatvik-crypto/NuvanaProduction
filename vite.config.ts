import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        // Increase the maximum file size to cache to 5MB (default is 2MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
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
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-core';
            }
            
            // UI libraries (Radix, Recharts, etc.)
            if (id.includes('@radix-ui') || id.includes('recharts') || id.includes('lucide-react')) {
              return 'ui-libs';
            }
            
            // Query and state management
            if (id.includes('@tanstack') || id.includes('zustand')) {
              return 'state-libs';
            }
            
            // All other vendor dependencies
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1500kb to accommodate larger bundles
    chunkSizeWarningLimit: 1500,
  },
}));
