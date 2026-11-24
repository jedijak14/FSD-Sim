import { defineConfig, loadEnv } from "vite";
import { jevMiddleware } from "./server/jev.js";
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  // Accept the configured preview hosts as well as any explicitly allowed
  // domains; Vite blocks unknown Host headers by default.
  const allowedHosts = [
    ...new Set([
      ".localhost",
      ".e2b.app",
      ...(env.JEV_ALLOWED_HOSTS || "").split(",").filter(Boolean),
    ]),
  ];
  return {
    server: {
      host: env.JEV_HOST || "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts,
    },
    preview: {
      host: env.JEV_HOST || "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts,
    },
    plugins: [
      {
        name: "jev-server",
        configureServer(server) {
          server.middlewares.use(jevMiddleware(env));
        },
        configurePreviewServer(server) {
          server.middlewares.use(jevMiddleware(env));
        },
      },
    ],
    build: {
      rolldownOptions: {
        input: { main: "index.html", login: "login.html" },
        output: {
          codeSplitting: {
            groups: [{ name: "three", test: /node_modules\/three/ }],
          },
        },
      },
    },
  };
});
