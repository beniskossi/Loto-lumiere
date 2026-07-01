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
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "LOTO LUMIERE - Analyse et Prédictions",
        short_name: "LOTO LUMIERE",
        description: "Application d'analyse avancée des résultats de loterie avec statistiques et prédictions intelligentes",
        theme_color: "#1e3a5f",
        background_color: "#1e3a5f",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "utilities"],
        lang: "fr-FR",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        shortcuts: [
          {
            name: "Statistiques",
            short_name: "Stats",
            description: "Voir les statistiques avancées",
            url: "/statistiques",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Consulter un Numéro",
            short_name: "Consulter",
            description: "Analyser un numéro spécifique",
            url: "/consulter",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Historique",
            short_name: "Historique",
            description: "Voir l'historique des tirages",
            url: "/historique",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Mon espace personnel",
            url: "/dashboard",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/kmkdwivnymcumgoorsiv\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour for offline support
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/kmkdwivnymcumgoorsiv\.supabase\.co\/functions\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-functions-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 60, // 30 minutes
              },
              networkTimeoutSeconds: 15
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
