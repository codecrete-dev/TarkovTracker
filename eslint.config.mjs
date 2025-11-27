// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    // Soften migration noise from legacy codebase; tighten later as we refactor
    "vue/html-self-closing": "off",
    "prefer-const": "warn",
    "no-var": "warn",
    // Keep visual noise down; avoid accidental double-blank lines
    "no-multiple-empty-lines": ["warn", { max: 1, maxBOF: 0, maxEOF: 0 }],
  },
});
