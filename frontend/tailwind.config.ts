import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0f172a",
        line: "#334155"
      }
    }
  },
  plugins: []
} satisfies Config;
