import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function readAppVersion(): string {
  const candidates = [
    resolve(__dirname, "VERSION"), // Docker: flach nach /app kopiert
    resolve(__dirname, "../VERSION"), // Lokal: Repo-Root neben frontend/
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8").trim();
    }
  }
  throw new Error(`VERSION file not found. Tried: ${candidates.join(", ")}`);
}

const appVersion = readAppVersion();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    host: true,
  },
});
