import security from "eslint-plugin-security";

export default [
  {
    plugins: {
      security
    },
    rules: {
      ...security.configs.recommended.rules
    }
  }
];