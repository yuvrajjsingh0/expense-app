import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The web app lives in app/ and imports the parser core straight from src/.
// Root stays at the repo root so both directories resolve without aliases.
export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist-app",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
