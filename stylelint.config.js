// @ts-check
/**
 * @type {import('stylelint').Config}
 * @see https://stylelint.io/user-guide/configure
 */
export default {
  extends: ["stylelint-config-standard", "stylelint-config-recess-order"],
  rules: {
    // Allow UnoCSS directives: https://unocss.dev/transformers/directives#usage
    "at-rule-no-deprecated": [true, { ignoreAtRules: ["apply"] }],

    // CSS modules: allow "value" at-rule
    "at-rule-no-unknown": [true, { ignoreAtRules: ["value"] }],

    // CSS Modules: allow "composes" rules
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
    "value-keyword-case": ["lower", { ignoreProperties: ["composes"] }],

    // CSS Modules: require camelCase for class names to be used as JS identifiers
    "selector-class-pattern": [
      /^_?([a-z][a-zA-Z0-9]*)$/,
      {
        message: (selector) => `Expected class selector "${selector}" to be camelCase`,
      },
    ],

    // CSS Modules: allow :global selectors
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
  },
};
