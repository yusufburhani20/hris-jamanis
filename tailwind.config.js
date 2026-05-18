import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    safelist: [
        '-translate-x-full',
        'translate-x-0',
        'opacity-0',
        'opacity-100',
        'invisible',
        'visible',
        'pointer-events-none',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: '#1576a7',
                'primary-hover': '#115d84',
                // Primary
                indigo: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#1576a7', // Primary Core
                    800: '#075985',
                    900: '#0c4a6e',
                },
                violet: {
                    500: '#8b5cf6', // Primary Accent
                    600: '#7c3aed',
                },
                // Background Colors
                slate: {
                    50: '#f8fafc',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                // Semantic Colors
                emerald: {
                    500: '#10b981', // Success
                    600: '#059669',
                },
                amber: {
                    500: '#f59e0b', // Warning
                    600: '#d97706',
                },
                red: {
                    500: '#ef4444', // Danger
                    600: '#dc2626',
                }
            },
        },
    },

    plugins: [forms],
};
