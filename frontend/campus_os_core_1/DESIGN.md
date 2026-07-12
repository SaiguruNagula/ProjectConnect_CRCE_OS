---
name: Campus OS Core
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#07006c'
  on-tertiary-container: '#7073ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is engineered for the modern campus ecosystem, prioritizing functional elegance and high-density information management. The brand personality is authoritative yet invisible—acting as a silent, high-performance engine for campus operations. 

The aesthetic is a hybrid of **Minimalism** and **Modern Corporate**, drawing heavily from the precision of developer tools and the clarity of premium fintech interfaces. It avoids academic cliches in favor of a "Dashboard-as-a-Service" feel.

**Key Visual Principles:**
- **Precision over Decoration:** Every line and pixel serves a functional purpose.
- **Atmospheric Clarity:** Utilization of generous whitespace to reduce cognitive load in complex data environments.
- **Technical Sophistication:** A blend of subtle gradients and high-contrast typography that evokes a sense of "premium engineering."

## Colors

The palette is anchored by **Slate** and **Indigo**, creating a professional, high-contrast environment. 

- **Primary (Slate 900):** Used for primary headings and core structural elements to ground the UI.
- **Secondary (Indigo 600):** Reserved for primary actions, progress indicators, and subtle focus states.
- **Background (White/Slate 50):** Pure white surfaces (#FFFFFF) are used for "cards" and content areas, while a subtle off-white (#F8FAFC) is used for the application background to create depth without using heavy shadows.
- **Interactive States:** Use Indigo 700 for hover states and Indigo 50 for subtle background highlights on selected list items.

## Typography

The system utilizes **Inter** for its exceptional readability and neutral, modern tone. For technical labels and data-heavy attributes, **Geist** is introduced to provide a "monospaced-adjacent" feel that suggests precision.

**Hierarchy Rules:**
- **Headings:** Use tight letter-spacing (-0.02em to -0.04em) for larger sizes to mimic premium editorial layouts.
- **Body:** Standard tracking for optimal legibility in long-form data or descriptions.
- **Labels:** Always uppercase or medium weight for small metadata to differentiate from body text.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main content container is capped at 1440px for readability, while navigation and sidebar elements are pinned to the viewport edges.

**Grid System:**
- **Desktop:** 12-column grid with 24px gutters. Use wide 40px margins to provide "Apple-style" breathing room.
- **Tablet:** 8-column grid with 16px gutters.
- **Mobile:** 4-column grid with 16px gutters.

**Spacing Rhythm:**
A strict 8px-based linear scale is used. Components should prioritize `lg` (40px) padding for primary card containers to achieve the airy, premium feel requested.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Micro-Shadows** rather than heavy blurs.

- **Level 0 (Background):** Slate 50. The canvas for the application.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF). Uses a 1px solid border (#E2E8F0) to define the boundary.
- **Level 2 (Dropdowns/Modals):** Pure White with a "Linear-style" shadow: `0px 4px 6px -1px rgba(0, 0, 0, 0.05), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Glassmorphism:** Use only for sticky headers or sidebars—60% white blur (20px) to maintain context of the content scrolling beneath.

## Shapes

The design system uses a **Rounded** (8px) radius as its standard. This strikes a balance between the clinical sharpness of engineering tools and the approachability of modern SaaS.

- **Standard (Base):** 8px (0.5rem) for buttons, inputs, and small cards.
- **Large (lg):** 16px (1rem) for main dashboard containers and modal windows.
- **Pill:** Reserved exclusively for status "Chips" or "Badges" to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Slate 900 background, White text. Subtle 1px top-light gradient to give a tactile feel.
- **Secondary:** White background, 1px Slate 200 border. High-contrast Slate 900 text.
- **Size:** Medium (40px height) with 16px horizontal padding.

### Cards
- White background, 1px #E5E7EB border.
- `padding: 32px` (standard) or `40px` (hero sections).
- No shadow in resting state; subtle 4px elevation on hover for interactive cards.

### Input Fields
- Background: White. Border: 1px #E2E8F0.
- Focus State: 1px Indigo 600 border with a 3px Indigo 50 outer glow (ring).
- Typography: Body-md (14px).

### Chips/Status Badges
- Small, uppercase Geist font.
- Success: Soft Green background (#ECFDF5) with dark Green text (#065F46).
- No borders on badges; use background fills for "Stripe-like" cleanliness.

### Lists
- Clean rows with 1px bottom border. 
- 16px vertical padding. 
- Use Geist Mono for ID numbers or date-stamps to emphasize the engineering-tool aesthetic.