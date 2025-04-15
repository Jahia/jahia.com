import { defineConfig } from "unocss/vite";
import { presetIcons } from "unocss";
import { transformerDirectives } from "unocss";

export default defineConfig({
  theme: {
    breakpoints: {
      md: "800px",
    },
  },
  rules: [
    [
      /^_stack-(\d+)$/,
      ([, gap]) => ({
        "display": "flex",
        "flex-direction": "column",
        "gap": `${gap / 4}rem`,
      }),
    ],
    [
      /^_pack-(\d+)$/,
      ([, size]) => ({
        "display": "flex",
        "align-items": "center",
        "gap": `${size / 4}rem`,
      }),
    ],
    [
      /^_row-(\d+)$/,
      ([, size]) => ({
        "display": "flex",
        "align-items": "center",
        "gap": `${size / 4}rem`,
        "flex-wrap": "wrap",
      }),
    ],
  ],
  presets: [
    presetIcons({
      extraProperties: {
        "display": "inline-block",
        "vertical-align": "text-bottom",
      },
    }),
  ],
  transformers: [transformerDirectives()],
});
