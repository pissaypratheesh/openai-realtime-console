import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/**/*.{jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    typography,
  ],
};
