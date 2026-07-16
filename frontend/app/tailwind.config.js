import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

/**
 * Tailwind configuration.
 *
 * Design tokens are ported verbatim from the approved Stitch prototypes so that
 * migrated pages render pixel-identically. Do NOT restyle these values — token
 * reconciliation toward the Linear/Stripe/Notion system (UI_UX_GUIDELINES) is a
 * separate, later pass. Light mode only for v1.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'inverse-primary': '#bec6e0',
        outline: '#76777d',
        'on-secondary-fixed': '#0f0069',
        tertiary: '#000000',
        'surface-bright': '#f7f9fb',
        background: '#f7f9fb',
        'on-surface': '#191c1e',
        'on-primary-fixed': '#131b2e',
        'on-primary-container': '#7c839b',
        'surface-container-high': '#e6e8ea',
        'surface-container-low': '#f2f4f6',
        'inverse-on-surface': '#eff1f3',
        'surface-container-highest': '#e0e3e5',
        'tertiary-fixed': '#e1e0ff',
        'surface-dim': '#d8dadc',
        'primary-container': '#131b2e',
        'on-primary-fixed-variant': '#3f465c',
        'tertiary-container': '#07006c',
        'surface-container-lowest': '#ffffff',
        'secondary-fixed': '#e2dfff',
        'inverse-surface': '#2d3133',
        'primary-fixed-dim': '#bec6e0',
        surface: '#f7f9fb',
        'surface-variant': '#e0e3e5',
        'on-tertiary-fixed-variant': '#2f2ebe',
        'tertiary-fixed-dim': '#c0c1ff',
        secondary: '#4b41e1',
        'on-tertiary-container': '#7073ff',
        'on-background': '#191c1e',
        'on-secondary': '#ffffff',
        'on-tertiary-fixed': '#07006c',
        'on-error': '#ffffff',
        'on-tertiary': '#ffffff',
        'on-secondary-container': '#fffbff',
        'surface-tint': '#565e74',
        'on-error-container': '#93000a',
        'secondary-container': '#645efb',
        'secondary-fixed-dim': '#c3c0ff',
        'on-primary': '#ffffff',
        error: '#ba1a1a',
        'primary-fixed': '#dae2fd',
        'outline-variant': '#c6c6cd',
        'surface-container': '#eceef0',
        'error-container': '#ffdad6',
        'on-secondary-fixed-variant': '#3323cc',
        'on-surface-variant': '#45464d',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        lg: '40px',
        md: '24px',
        'container-max': '1440px',
        sm: '16px',
        base: '4px',
        xs: '8px',
        xl: '64px',
        gutter: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        'headline-lg': ['Inter', 'system-ui', 'sans-serif'],
        'headline-md': ['Inter', 'system-ui', 'sans-serif'],
        'headline-sm': ['Inter', 'system-ui', 'sans-serif'],
        'body-lg': ['Inter', 'system-ui', 'sans-serif'],
        'body-md': ['Inter', 'system-ui', 'sans-serif'],
        'label-md': ['Geist', 'ui-monospace', 'monospace'],
        mono: ['Geist', 'ui-monospace', 'monospace'],
      },
      // Typography scale ported verbatim from the approved Stitch prototypes.
      fontSize: {
        'headline-sm': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        mono: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'headline-lg-mobile': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        display: ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'label-md': ['12px', { lineHeight: '1.2', letterSpacing: '0.02em', fontWeight: '500' }],
      },
    },
  },
  plugins: [forms, containerQueries],
}
