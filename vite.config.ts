import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    proxy: {
      "/api/github/graphql": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: () => "/graphql",
      },
      "/api/github/rest": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/github\/rest/, ""),
      },
    },
  },
  plugins: [react()],
});
