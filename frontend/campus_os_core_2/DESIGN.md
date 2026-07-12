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
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#474750'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f5f68'
  on-tertiary-container: '#dbdae4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e3e1ec'
  tertiary-fixed-dim: '#c6c5cf'
  on-tertiary-fixed: '#1a1b22'
  on-tertiary-fixed-variant: '#46464e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
This design system is engineered for educational administration and student productivity, prioritizing clarity, efficiency, and academic focus. The brand personality is institutional yet modern, striking a balance between the reliability of a legacy university and the agility of a cutting-edge SaaS platform.

The design style follows a **Corporate / Modern** aesthetic with elements of **Minimalism**. It utilizes high-quality typography and a disciplined approach to whitespace to reduce cognitive load in data-heavy environments. Visual interest is generated through precise geometry and purposeful color application rather than decorative elements.

## Colors
The palette is anchored by a professional Slate and Zinc foundation to maintain a "neutral-first" environment for data density. 

- **Primary Accent:** The Purple (#4f46e5) is reserved strictly for high-impact achievements, primary actions, and "success" states that require celebration (e.g., GPA milestones, course completions).
- **Secondary/Surface:** Zinc-900 is used for deep contrast in text, while Zinc-500 to 100 handles borders and secondary metadata.
- **Backgrounds:** Slate-50 provides a cool-toned, low-strain background for long-form reading and data entry.

## Typography
The typographic system uses a tiered approach to distinguish between navigation, content, and data. 

- **Headlines:** Hanken Grotesk provides a sharp, contemporary edge for page titles and section headers. 
- **Body:** Inter is the workhorse for all interface text, chosen for its exceptional legibility at small sizes. 
- **Data Labels:** JetBrains Mono is utilized for IDs, timestamps, and technical metadata to provide a distinct visual "mode" for raw data points.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop. 

- **Whitespace Strategy:** Generous padding within cards (minimum 24px) is mandatory to prevent visual clutter in data-heavy views.
- **Breakpoints:** 
  - Mobile (< 768px): 4 columns, 16px margins.
  - Tablet (768px - 1024px): 8 columns, 24px margins.
  - Desktop (> 1024px): 12 columns, 48px margins.
- **Rhythm:** All spacing must be a multiple of the 4px base unit to ensure vertical rhythm.

## Elevation & Depth
This design system uses a **Low-contrast outlines** approach combined with **Ambient shadows**. 

Depth is expressed through three primary layers:
1. **Level 0 (Canvas):** Slate-50 background.
2. **Level 1 (Cards/Surface):** Pure White (#FFFFFF) surfaces with a 1px border in Zinc-200. A soft, ultra-diffused shadow (Y: 2px, Blur: 4px, Color: Slate-900 @ 4% opacity) is applied to distinguish the card from the canvas.
3. **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow (Y: 8px, Blur: 16px, Color: Slate-900 @ 8% opacity).

Avoid heavy dropshadows or inner glows; the focus is on a flat, architectural feel.

## Shapes
The shape language is "Soft" (0.25rem - 0.75rem). This provides enough curvature to feel approachable while maintaining a structured, professional appearance. 

- **Small Components (Buttons/Inputs):** 4px (0.25rem).
- **Medium Components (Cards):** 8px (0.5rem).
- **Large Components (Modals/Banners):** 12px (0.75rem).

## Components

### Cards
Cards are the primary container for the UI. They must feature a white background, a Zinc-200 border, and subtle ambient shadows. Header areas within cards should use a light Slate-50 fill to separate controls from content.

### Buttons
- **Primary:** Purple (#4f46e5) background with White text. Used only for the most important action on a page.
- **Secondary:** White background with Zinc-200 border and Zinc-900 text.
- **Ghost:** No background or border, used for utility actions.

### Inputs & Fields
Inputs use a 1px border (Zinc-300) and Inter (body-sm). Focus states switch the border to Purple (#4f46e5) with a subtle 2px outer glow of the same color at 10% opacity.

### Chips & Badges
Chips are used for course tags or status indicators. Success states for high-impact achievements use a light Purple tint background with dark Purple text.

### Progress Indicators
Progress bars should be thin (4px) and utilize the Purple accent to represent completion percentages.

### Lists
Data lists should use Zebra-striping sparingly; prefer 1px Zinc-100 horizontal dividers with generous vertical padding (16px) to maintain the emphasis on whitespace.