import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";  
import pluginReact from "eslint-plugin-react";
import pluginReactNative from "eslint-plugin-react-native";

export default [
  {
    ignores: ["**/*.test.*", "**/__tests__/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],  
    languageOptions: {
      parser: parser,  
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: pluginReact,
      "react-native": pluginReactNative,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactNative.configs.all.rules,  // 'all' が利用可能か確認（利用不可なら 'recommended' に変更）
      // Custom rules
      "order/properties": "off",  // 追加: プロパティ順序チェックをオフ
      "react-native/sort-styles": "off",  // 追加: React Nativeスタイル順序チェックをオフ
      "react-native/no-unused-styles": "warn",
      "react-native/split-platform-components": "warn",
      "react-native/no-inline-styles": "warn",
      "react-native/no-color-literals": "warn",
      "react-native/no-raw-text": "error",
      "react-native/no-single-element-style-arrays": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/react-in-jsx-scope": "off",
    },
  }, 
];
