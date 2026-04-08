/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pcb: {
          bg:      "#0c1117",
          surface: "#161b22",
          border:  "#30363d",
          text:    "#e6edf3",
          muted:   "#8b949e",
          accent:  "#00d68f",
          copper:  "#ff9f43",
          danger:  "#f85149",
          info:    "#58a6ff",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        mono:    ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
    },
  },
  plugins: [],
};