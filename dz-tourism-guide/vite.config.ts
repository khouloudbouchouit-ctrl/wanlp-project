import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Flask: `cd wennew && python app.py` (default port 5000)
      "/analyze": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/ner": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/sentiment": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
});
