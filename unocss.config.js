import { defineConfig } from "unocss/vite";
import { presetIcons } from "unocss";

export default defineConfig({
  rules: [
    [
      /^_stack-(\d+)$/,
      ([, gap]) => ({
        "display": "flex",
        "flex-direction": "column",
        "gap": `${gap / 4}rem`,
      }),
    ],
  ],
  // Disable the default presets
  presets: [
    presetIcons({
      extraProperties: {
        "display": "inline-block",
        "vertical-align": "text-bottom",
      },
    }),
  ],
});
