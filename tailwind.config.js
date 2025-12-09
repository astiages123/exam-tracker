/** @type {import('tailwindcss').Config} */
// Force rebuild
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                'custom-bg': '#212529',
                'custom-header': '#343a40', // used for cards too
                'custom-title': '#f8f9fa',
                'custom-text': '#ffffff',
                'custom-accent': '#04b2a6',
                'custom-category': '#495057',
                'custom-border': '#33a1e0',
                'custom-success': '#2ecc71',
                'custom-error': '#e74c3c',
                'custom-warning': '#f39c12',
                'custom-info': '#3498db',
            }
        },
    },
    plugins: [],
}
