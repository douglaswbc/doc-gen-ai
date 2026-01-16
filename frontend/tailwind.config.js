/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", 
  theme: {
    extend: {
      colors: {
        // Paleta PREVAI
        primary: {
          DEFAULT: "#00A8E8", 
          hover: "#0096D1",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#003B73", 
          foreground: "#FFFFFF",
        },
        // Cores de Fundo (Gera bg-background-light e bg-background-dark)
        background: {
          light: "#F1F5F9", 
          dark: "#0F172A", 
        },
        // Cores de Cartões
        card: {
          light: "#FFFFFF",
          dark: "#1E293B", 
        }
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [
    // Verifique se estes plugins estão instalados no package.json
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}