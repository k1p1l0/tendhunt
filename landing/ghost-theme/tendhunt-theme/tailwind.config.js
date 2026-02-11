/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./*.hbs", "./**/*.hbs"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#E5FF00",
        "accent-hover": "#D4EE00",
        "bg-primary": "#0A0A0A",
        "bg-secondary": "#111111",
        "bg-tertiary": "#1A1A1A",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A1A1A1",
        "text-body": "#D4D4D4",
        "text-muted": "#737373",
        "text-dark": "#171717",
        border: "#2A2A2A",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme("colors.text-body"),
            a: {
              color: theme("colors.accent"),
              "&:hover": { color: theme("colors.accent-hover") },
              textDecoration: "none",
            },
            h1: { color: theme("colors.text-primary"), fontFamily: theme("fontFamily.heading").join(", ") },
            h2: { color: theme("colors.text-primary"), fontFamily: theme("fontFamily.heading").join(", ") },
            h3: { color: theme("colors.text-primary"), fontFamily: theme("fontFamily.heading").join(", ") },
            h4: { color: theme("colors.text-primary"), fontFamily: theme("fontFamily.heading").join(", ") },
            strong: { color: theme("colors.text-primary") },
            code: { color: theme("colors.accent") },
            blockquote: { borderLeftColor: theme("colors.accent"), color: theme("colors.text-secondary") },
            "pre code": { color: theme("colors.text-body") },
            hr: { borderColor: theme("colors.border") },
            th: { color: theme("colors.text-primary") },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
