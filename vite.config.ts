import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import mkcert from "vite-plugin-mkcert";
import path from "path";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://127.0.0.1:3000";

  return {
  plugins: [tailwindcss(), react(), mkcert(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lucide-react": path.resolve(__dirname, "./src/shared/icons/lucide-compat.tsx"),
    },
  },
  server: {
    port: 3010,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep vendor chunks stable (better caching) and reduce the initial entry size.
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");
          if (!normalized.includes("node_modules")) return;

          if (/(^|\/)node_modules\/(react|react-dom|scheduler|use-sync-external-store|react-router|react-router-dom)\//.test(normalized)) {
            return "vendor-react";
          }
          if (/(^|\/)node_modules\/(react-pdf|pdfjs-dist)\//.test(normalized)) {
            return "vendor-pdf";
          }
          if (/(^|\/)node_modules\/(@radix-ui|cmdk|vaul|class-variance-authority|clsx|tailwind-merge|sonner|input-otp|react-hook-form|react-day-picker|embla-carousel-react|react-resizable-panels)\//.test(normalized)) {
            return "vendor-ui";
          }
          if (/(^|\/)node_modules\/(motion|framer-motion|lucide-react)\//.test(normalized)) {
            return "vendor-motion";
          }
          if (/(^|\/)node_modules\/(axios)\//.test(normalized)) {
            return "vendor-data";
          }
          if (/(^|\/)node_modules\/(@gsap\/react|gsap|ogl)\//.test(normalized)) {
            return "vendor-anim";
          }
          if (/(^|\/)node_modules\/(recharts)\//.test(normalized)) {
            return "vendor-charts";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.ts",
    css: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/**/*.d.ts"],
    },
  },
  };
});