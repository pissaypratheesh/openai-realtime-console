import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  plugins: [react()],
  server: {
    hmr: {
      overlay: false
    },
    fs: {
      strict: false
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(dirname(path), "client/index.html")
      }
    }
  },
  optimizeDeps: {
    exclude: ['/.well-known/*']
  }
};
