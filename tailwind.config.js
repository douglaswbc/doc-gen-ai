/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // Habilita o modo escuro via classe CSS
  theme: {
    extend: {
      colors: {
        // Paleta PREVAI baseada no PDF
        primary: {
          DEFAULT: "#00A8E8", // Azul Vibrante (Botões, Destaques)
          hover: "#0096D1",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#003B73", // Azul Profundo (Institucional, Headers)
          foreground: "#FFFFFF",
        },
        // Cores de Fundo
        background: {
          light: "#F1F5F9", // Cinza Claro (Papel)
          dark: "#0F172A",  // Azul Noturno (Dark Mode)
        },
        // Cores de Cartões/Superfícies
        card: {
          light: "#FFFFFF",
          dark: "#1E293B",  // Um pouco mais claro que o fundo dark
        }
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}