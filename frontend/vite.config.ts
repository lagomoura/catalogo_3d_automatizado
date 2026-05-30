/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Permitir subdominios de tienda en dev (p. ej. mi-tienda.lvh.me:5173, que
    // resuelve a 127.0.0.1) para probar la vitrina pública multi-tenant.
    host: true,
    allowedHosts: [".lvh.me", "localhost"],
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
