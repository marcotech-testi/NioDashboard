import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // Regra voltada para compatibilidade com o React Compiler, que este
      // projeto não usa; o padrão de resetar loading/error no início de um
      // efeito de data-fetching é intencional aqui.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
