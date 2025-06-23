// @ts-check
import { defineConfig } from "unocss/vite";
import { presetIcons } from "unocss";
import { transformerDirectives } from "unocss";

export default defineConfig({
  rules: [
    [
      /^_stack-(\d+)$/,
      ([, gap]) => ({
        "display": "flex",
        "flex-direction": "column",
        "gap": `${Number(gap) / 4}rem`,
      }),
    ],
    [
      /^_pack-(\d+)$/,
      ([, size]) => ({
        "display": "flex",
        "align-items": "center",
        "gap": `${Number(size) / 4}rem`,
      }),
    ],
    [
      /^_row-(\d+)$/,
      ([, size]) => ({
        "display": "flex",
        "align-items": "center",
        "gap": `${Number(size) / 4}rem`,
        "flex-wrap": "wrap",
      }),
    ],
    [
      // Stylish corner cut
      /^_cut-(before|after|both)$/,
      function* (matches, { symbols }) {
        /** Before is top-left corner, after is bottom-right. */
        const side = /** @type {"before" | "after" | "both"} */ (matches[1]);

        yield {
          "clip-path": {
            before: "polygon(var(--jahia-cut) 0, 100% 0, 100% 100%, 0 100%, 0 var(--jahia-cut))",
            after:
              "polygon(0 0, 100% 0, 100% calc(100% - var(--jahia-cut)), calc(100% - var(--jahia-cut)) 100%, 0 100%)",
            both: "polygon(var(--jahia-cut) 0, 100% 0, 100% calc(100% - var(--jahia-cut)), calc(100% - var(--jahia-cut)) 100%, 0 100%, 0 var(--jahia-cut))",
          }[side],
          "contain": "paint",
        };

        if (side !== "after") {
          yield {
            [symbols.selector]: (selector) => `${selector}::before`,
            "position": "absolute",
            "inset-block-start": "0",
            "inset-inline-start": "0",
            "inline-size": "var(--jahia-cut)",
            "block-size": "var(--jahia-cut)",
            "content": '""',
            "background-color": "var(--jahia-border)",
            "clip-path": "polygon(0 0, 100% 0, 0 100%)",
          };
        }

        if (side !== "before") {
          yield {
            [symbols.selector]: (selector) => `${selector}::after`,
            "position": "absolute",
            "inset-block-end": "0",
            "inset-inline-end": "0",
            "inline-size": "var(--jahia-cut)",
            "block-size": "var(--jahia-cut)",
            "content": '""',
            "background-color": "var(--jahia-border)",
            "clip-path": "polygon(100% 100%, 100% 0, 0 100%)",
          };
        }
      },
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
