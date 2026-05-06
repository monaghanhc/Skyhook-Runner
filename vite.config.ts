import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub project Pages serves the site at /<repo-name>/ (not the apex domain).
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/Skyhook-Runner/",
  plugins: [react(), tailwindcss()],
}));
