// @ts-check
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";
import unocss from "unocss/vite";
import { patchCssModules } from "vite-css-modules";

export default defineConfig({
  build: {
    // Workaround for https://github.com/Jahia/jahia-private/issues/3637
    assetsInlineLimit: 0,
  },
  plugins: [
    patchCssModules(),
    unocss(),
    jahia({
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
  ],
});
