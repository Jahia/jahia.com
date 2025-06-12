// @ts-check
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";
import unocss from "unocss/vite";
import { patchCssModules } from "vite-css-modules";

export default defineConfig({
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
