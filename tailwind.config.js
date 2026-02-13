/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        'primary-light-blue': '#27B7EE',
        'primary-dark-blue': '#1F8FD6',
        'primary': '#27B7EE',
        'primary-dark': '#1F8FD6',
        
        // Neutrals
        'near-black': '#0F1720',
        'charcoal': '#2A2F36',
        'mid-gray': '#6B7280',
        'light-gray': '#F3F4F6',
        'white': '#FFFFFF',
        
        // System / State Colors
        'success': '#22C55E',
        'warning': '#F59E0B',
        'error': '#EF4444',
      },
    },
  },
  plugins: [],
}
