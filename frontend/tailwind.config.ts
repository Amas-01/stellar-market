import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        stellar: {
          blue: "#3E54CF",
          purple: "#7B61FF",
        },
        dark: {
          bg: "#0a0b14",
          card: "#12131f",
          border: "#1e2035",
          text: "#a1a1b5",
          heading: "#e4e4ed",
        },
      },
    },
  },
  plugins: [],
};

export default config;
