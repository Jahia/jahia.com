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
      /^_center-(\d+)$/,
      ([, size]) => ({
        "display": "flex",
        "align-items": "center",
        "justify-content": "center",
        "gap": `${Number(size) / 4}rem`,
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
        "flex-shrink": "0",
      },
      collections: {
        custom: {
          jackrabbit:
            '<svg viewBox="0 0 16.2 13.6"><path fill="currentColor" d="m5.6 13.5.5-.9.4-.7-.8.8q-1 .9-.9.3c0-.2.8-1.2 1.7-2q1.7-1.5 1.2-1.7-2.3-.6-3-.4l-.9.2q-1.2.1.7 1 1 .4.8.8t-.5.4q-.8-.3-.5.3 0 .5-.3.5C3.4 12 .2 7.9.1 6.9Q-.2 3.8.4 3l.5-.7-.1.7q-.4 1.4.8.2 1.9-1.3 4.9.4c2 1.2 3.2 1.4 4.5.8l1-.6c0-.3-1.3-.8-2-.8C8 3 4.1.8 5 0c.8-.4 3.3.4 5.8 2q1.5 1 2.5 1c1 0 1.3.1 2 .9 1.5 1.5 1 2.7-1.2 2.4-1-.2-1-.1-1.9.8zm9.2-9.1q-.1-.3-.5-.5-.7.2-.3.8.6.3.8-.3"/></svg>',
        },
      },
    }),
  ],
  transformers: [transformerDirectives()],
});
