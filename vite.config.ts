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
          // Core React libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // React Router
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-router';
          }
          
          // React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          
          // UI Libraries
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          
          // Charts
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          
          // Math rendering
          if (id.includes('node_modules/katex')) {
            return 'vendor-math';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          
          // Shadcn UI components
          if (id.includes('/src/components/ui/')) {
            return 'ui-components';
          }
          
          // Admin pages
          if (id.includes('/src/pages/admin/')) {
            return 'pages-admin';
          }
          
          // Teacher pages
          if (id.includes('/src/pages/teacher/')) {
            return 'pages-teacher';
          }
          
          // Student pages
          if (id.includes('/src/pages/student/')) {
            return 'pages-student';
          }
          
          // Services
          if (id.includes('/src/services/')) {
            return 'services';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1000kb
    chunkSizeWarningLimit: 1000,
  },
}));
