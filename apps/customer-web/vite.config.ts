import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Richy's Eat",
        short_name: "Richy's Eat",
        description: "Order from your favorite local restaurants.",
        theme_color: "#0F766E",
        background_color: "#F8FAFC",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // Precaches the built app shell (JS/CSS/HTML). API calls go to a
        // different origin (the backend), so they're never part of this
        // precache and always hit the network — order data must never be
        // served stale.
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
