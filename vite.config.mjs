import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";

export default defineConfig({
  plugins: [
    jahia({
      client: {
        input: {
          dir: "./src/",
          glob: "**/*.client.{jsx,tsx}",
        },
        output: "./dist/",
      },
      server: {
        // You can use a glob pattern to match multiple files
        input: "./src/**/*.server.{jsx,tsx}",
        output: {
          dir: "./dist/server/",
          fileName: "index", // Will produce index.js and style.css (because of a bug)
        },
      },
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
  ],
});
