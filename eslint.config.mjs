import js from "@eslint/js";
import security from "eslint-plugin-security";

export default [
  {
    ignores: ["eslint.config.mjs"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        exports: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    plugins: {
      security
    },
    rules: {
      ...security.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^(?:_|resolve|reject)$",
          varsIgnorePattern: "^_$"
        }
      ]
    }
  }
];