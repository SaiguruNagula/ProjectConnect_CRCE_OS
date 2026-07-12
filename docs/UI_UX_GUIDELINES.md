# 03_UI_UX_GUIDELINES.md

# 1. Document Information

| Item | Details |
|------|---------|
| Document Name | UI/UX Guidelines |
| Product | CRCE OS |
| Version | 1.0 |
| Status | Active |
| Owner | CRCE OS Team |
| Design Language | Linear × Stripe × Notion |
| Frontend | React + TypeScript + TailwindCSS + shadcn/ui |
| Last Updated | July 2026 |

---

# Purpose

This document defines the complete design system, user experience guidelines, visual identity, and interaction principles for CRCE OS.

It acts as the **single source of truth** for every interface built within the platform.

Every page, component, interaction, and animation should follow these guidelines to ensure a consistent, scalable, and accessible user experience.

---

# Goals

- Create a modern SaaS experience.
- Maintain consistency across every page.
- Build reusable UI components.
- Improve usability.
- Reduce design complexity.
- Enable faster development.
- Ensure accessibility.
- Support future scalability.

---

# Scope

These guidelines apply to:

- Landing Page
- Login
- Student Dashboard
- Faculty Dashboard
- Admin Dashboard
- Principal Dashboard
- Shared Modules
- Portfolio
- Leaderboard
- Innovation Hub
- Project Space
- Review Engine
- Credit Engine
- Mobile Views
- Tablet Views

---

# 2. Design Philosophy

## Core Philosophy

CRCE OS is **not a traditional college ERP**.

It is an **Innovation Operating System** that should feel like a modern enterprise SaaS product rather than academic software.

The design should inspire students to build, collaborate, innovate, and explore.

Every interface should reduce friction and make complex workflows feel simple.

---

## Design Goals

The UI should be:

- Minimal
- Professional
- Clean
- Fast
- Calm
- Predictable
- Accessible
- Scalable
- Modern

---

## User Experience Philosophy

Users should never wonder:

- Where am I?
- What should I do next?
- Is this clickable?
- What happened?

Every action should provide immediate feedback.

---

## Simplicity First

Prefer removing UI instead of adding more.

Avoid:

- Decorative elements
- Unnecessary animations
- Fancy gradients
- Heavy shadows
- Complex navigation
- Visual clutter

---

## Enterprise Mindset

Every screen should resemble products like:

- Linear
- Stripe Dashboard
- GitHub
- Notion
- Vercel Dashboard

Not:

- Gaming UI
- Social Media UI
- Student Portal UI
- ERP Dashboard

---

## Information First

The interface should prioritize information over decoration.

Content should always be easier to scan than visuals.

---

# 3. Design Principles

## Principle 1 — Clarity

Every screen should communicate its purpose immediately.

---

## Principle 2 — Consistency

The same action should always look and behave the same.

---

## Principle 3 — Reusability

Never redesign a component that already exists.

Build once.

Reuse everywhere.

---

## Principle 4 — Accessibility

Every feature should be usable by everyone.

Follow WCAG 2.1 AA standards.

---

## Principle 5 — Performance

Fast interfaces create better experiences.

Every interaction should feel instant.

---

## Principle 6 — Simplicity

Reduce complexity wherever possible.

Less UI.

More productivity.

---

## Principle 7 — Predictability

Buttons should behave like buttons.

Cards should behave like cards.

Users should never need instructions.

---

## Principle 8 — Mobile Ready

Every component must work on:

- Desktop
- Laptop
- Tablet
- Mobile

---

## Principle 9 — Scalability

Components should support future modules without redesign.

---

## Principle 10 — Accessibility Before Beauty

A beautiful interface that isn't usable is a failed design.

---

# 4. Design Language

## Inspiration

CRCE OS follows a carefully balanced design language.

### 70% Linear

Used for:

- Layout
- Navigation
- Cards
- Dashboard
- Typography
- Minimalism

---

### 20% Stripe

Used for:

- Forms
- Tables
- Professional spacing
- Enterprise polish

---

### 10% Notion

Used for:

- Documentation
- Content pages
- Empty states
- Readability

---

## What We Avoid

- Glassmorphism
- Neumorphism
- Heavy gradients
- Bright colors
- Cartoon illustrations
- Over-animated interfaces
- Material Design overload

---

## Visual Personality

Professional

Minimal

Intelligent

Academic

Innovation-focused

Elegant

Timeless

---

# 5. Brand Identity

## Brand Position

CRCE OS is the digital operating system for innovation at Fr. CRCE.

---

## Brand Values

Innovation

Collaboration

Research

Transparency

Learning

Impact

Professionalism

Trust

---

## Brand Voice

Confident

Helpful

Clear

Professional

Encouraging

Never playful.

Never childish.

---

## Product Personality

If CRCE OS were a person:

- Calm
- Intelligent
- Organized
- Helpful
- Efficient
- Reliable
- Modern

---

## Motto

> Learn. Build. Innovate. Impact.

---

## Tagline

> Transforming Problems into Innovation.

---

# 6. Visual Identity

## Visual Characteristics

- White-first design
- Large whitespace
- Rounded corners
- Soft borders
- Thin dividers
- Clean typography
- Minimal icons
- No clutter

---

## Visual Hierarchy

Heading

↓

Subheading

↓

Primary Content

↓

Secondary Information

↓

Metadata

---

## Card Philosophy

Everything important should live inside a card.

Cards should breathe.

Never overcrowd them.

---

## Borders

Use borders more often than shadows.

---

## Shadows

Soft.

Minimal.

Used only for elevation.

---

## Density

Medium density.

Neither too compact nor too spacious.

---

## Empty Space

Whitespace is a design element.

Never fill every pixel.

---

# 7. Color System

## Primary

Purple

Used for:

- Primary Buttons
- Links
- Active Navigation
- Focus States
- Selected Items

---

## Neutral Colors

White

Gray 50

Gray 100

Gray 200

Gray 300

Gray 500

Gray 700

Gray 900

These form the majority of the interface.

---

## Semantic Colors

Green

Success

Blue

Information

Orange

Warning

Red

Error

Only use semantic colors for status communication.

---

## Color Rules

Primary Color

≤10%

Neutral Colors

≈85%

Semantic Colors

≈5%

Never overuse accent colors.

---

# 8. Typography

## Font

Inter

Fallback

System Sans

---

## Hierarchy

Display

Page Title

Section Heading

Card Heading

Body

Caption

Label

Helper Text

---

## Font Rules

- Left aligned
- High contrast
- Comfortable line spacing
- Avoid excessive bold text
- Use weight instead of color for emphasis

---

## Reading Experience

Maximum readability.

Documentation pages should resemble Notion.

Dashboards should resemble Linear.

---

# 9. Spacing System

Use an 8-point spacing grid.

Standard spacing:

4px

8px

12px

16px

24px

32px

48px

64px

Never use random spacing values.

---

## Padding

Cards

24px

Forms

24px

Modals

32px

Dashboards

32px

Sections

48px

---

## Margins

Maintain consistent spacing between all UI sections.

Whitespace improves comprehension.

---

# 10. Layout System

## Overall Structure

Header

↓

Sidebar

↓

Main Content

↓

Footer (where applicable)

---

## Dashboard Layout

Sidebar

Main Content

Widgets

Cards

Tables

---

## Maximum Content Width

Avoid extremely wide content.

Use centered layouts for forms and documentation.

---

## Content Organization

Primary information first.

Secondary actions later.

Dangerous actions last.

---

# 11. Grid System

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

---

## Card Layout

Use responsive cards.

Cards should stack naturally on smaller devices.

---

## Responsive Behaviour

Desktop

Multi-column

Tablet

Two-column

Mobile

Single-column

---

## Alignment

Everything should align to the grid.

Avoid arbitrary positioning.

---

# 12. Border Radius & Elevation

## Border Radius

Buttons

Medium

Cards

Medium

Inputs

Medium

Dialogs

Large

Badges

Rounded

---

## Borders

Prefer subtle borders over shadows.

Border color should use neutral grays.

---

## Elevation

Level 0

Flat

Level 1

Cards

Level 2

Dropdowns

Dialogs

Level 3

Only critical overlays

---

## Shadow Philosophy

Minimal.

Soft.

Almost invisible.

The interface should feel lightweight rather than floating.

---

## UI Foundation Summary

The CRCE OS interface should embody the precision of Linear, the professionalism of Stripe, and the readability of Notion. Every screen should feel intentional, calm, and efficient, with a strong emphasis on whitespace, consistent spacing, reusable components, accessibility, and information hierarchy. The goal is not visual extravagance, but a timeless enterprise experience that empowers innovation and scales gracefully as the platform evolves.

# 13. Iconography

## Icon Library

CRCE OS uses **Lucide React** as the official icon library.

Reasons:

- Clean
- Consistent
- Lightweight
- Open Source
- Matches Linear Design

---

## Icon Rules

- Outline icons only
- 20px default size
- 16px inside buttons
- 24px for page headers
- 32px+ only for illustrations

---

## Usage

Icons should communicate actions.

Examples:

Search

Edit

Delete

Download

Upload

Notification

Project

Research

Leaderboard

Portfolio

Settings

Never use decorative icons.

---

# 14. Illustration Style

Illustrations should be minimal and used sparingly.

Allowed:

- Empty State illustrations
- Onboarding graphics
- Success screens

Avoid:

- Cartoon characters
- 3D illustrations
- Emoji-heavy interfaces
- Decorative graphics

Illustrations should complement content, not dominate it.

---

# 15. Motion & Animation

## Philosophy

Motion should communicate state, not entertain.

Animations must feel subtle and purposeful.

---

## Allowed Animations

- Hover
- Fade In
- Scale (very small)
- Accordion
- Dropdown
- Modal
- Toast
- Progress Bar
- Skeleton Loading

---

## Duration

Fast

150–250ms

Medium

250–350ms

Slow

350–500ms

---

## Avoid

- Bounce
- Spin continuously
- Flashing
- Long transitions
- Excessive motion

---

# 16. Responsive Design

CRCE OS follows a Mobile-First approach.

---

## Breakpoints

Mobile

<640px

Tablet

640–1024px

Laptop

1024–1280px

Desktop

>1280px

---

## Rules

Desktop

Sidebar visible

Tablet

Collapsible sidebar

Mobile

Bottom navigation or hamburger

Cards stack vertically.

Tables become scrollable.

Forms become single column.

---

# 17. Accessibility Guidelines

CRCE OS follows WCAG 2.1 AA.

---

## Accessibility Rules

- Keyboard Navigation
- Screen Reader Support
- Focus Indicators
- Proper Labels
- Semantic HTML
- High Contrast
- Accessible Tables
- ARIA where necessary

---

## Color

Never rely only on color.

Always include:

- Icons
- Labels
- Text

---

## Forms

Every input requires:

- Label
- Placeholder
- Validation
- Error Message

---

# 18. Component Design Principles

Every component should be:

Reusable

Accessible

Responsive

Composable

Predictable

Lightweight

Independent

---

## Component Rules

One responsibility.

No duplicate components.

Accept props.

Avoid hardcoded values.

Keep logic separated from presentation.

Support dark mode in future.

---

## State Handling

Each component should support:

Loading

Empty

Success

Error

Disabled

---

# 19. Complete Component Library

## Navigation

- Sidebar
- Top Navigation
- Breadcrumb
- Tabs
- Navigation Links

---

## Buttons

- Primary
- Secondary
- Ghost
- Outline
- Danger
- Icon Button

---

## Inputs

- Text Field
- Text Area
- Password
- Search
- Select
- Multi Select
- Date Picker
- Checkbox
- Radio
- Toggle
- File Upload

---

## Cards

- Statistic Card
- Project Card
- Problem Card
- Faculty Card
- Student Card
- Activity Card
- Portfolio Card

---

## Data Display

- Table
- Badge
- Avatar
- Progress Bar
- Timeline
- Accordion
- Tag
- Tooltip

---

## Feedback

- Toast
- Alert
- Snackbar
- Confirmation Dialog
- Empty State
- Skeleton Loader

---

## Overlays

- Modal
- Drawer
- Dropdown
- Popover

---

# 20. Navigation Design

Navigation should remain identical across the platform.

---

## Public Navigation

Home

About

Open Problems

Campus Impact

Leaderboard

Goal

Login

---

## Student Navigation

Dashboard

Innovation Hub

Open Problems

My Projects

Credits

Leaderboard

Portfolio

Profile

---

## Faculty Navigation

Dashboard

Innovation Hub

Create Problem

Reviews

Leaderboard

Profile

---

## Admin Navigation

Dashboard

Users

Analytics

Reports

Settings

---

## Principal Navigation

Dashboard

Reports

Analytics

Leaderboard

---

# Navigation Rules

Maximum navigation depth:

3 Levels

Always highlight active page.

Never hide critical actions.

---

# 21. Dashboard Design

Every dashboard follows the same layout.

---

## Structure

Header

↓

Statistics

↓

Quick Actions

↓

Recent Activity

↓

Main Content

↓

Secondary Widgets

---

## Widget Types

Statistics

Recent Activity

Notifications

Projects

Deadlines

Charts

Leaderboard

Portfolio Progress

---

## Dashboard Rules

No scrolling inside cards.

Important information first.

Maximum four statistic cards per row.

---

# 22. Card Design

Cards are the primary UI building block.

---

## Standard Card

Header

Content

Footer (optional)

---

## Card Rules

Rounded corners.

Soft border.

Minimal shadow.

Consistent padding.

Never overcrowd.

---

## Card Types

Information Card

Project Card

Problem Card

Analytics Card

User Card

Portfolio Card

Leaderboard Card

Review Card

---

# 23. Form Design

Forms should minimize user effort.

---

## Form Layout

Title

↓

Description

↓

Inputs

↓

Validation

↓

Primary Action

↓

Secondary Action

---

## Form Rules

Single-column whenever possible.

Logical grouping.

Real-time validation.

Required fields clearly marked.

---

## Buttons

Primary action on right.

Cancel on left.

---

# 24. Table Design

Tables are used for administrative and analytical data.

---

## Features

Search

Filter

Sorting

Pagination

Column Visibility

Export

Responsive Scroll

---

## Columns

Keep concise.

Left align text.

Right align numbers.

Use badges for status.

---

## Row Actions

View

Edit

Delete

Download

Approve

Reject

Actions appear consistently across all tables.

---

## Table States

Loading

Empty

Error

Data Available

Selected Rows

Pagination

---

## Components & Layout Summary

CRCE OS follows a component-driven architecture where every UI element is reusable, consistent, and accessible. Navigation remains predictable across roles, dashboards prioritize actionable information, forms reduce cognitive load, cards organize content effectively, and tables support efficient data management. Every component is designed for scalability, responsiveness, and long-term maintainability while preserving the clean enterprise aesthetic inspired by Linear, Stripe, and Notion.

# 25. Modal & Dialog Design

## Purpose

Modals should interrupt the user's workflow only when immediate attention or confirmation is required.

---

## Types

- Confirmation Dialog
- Information Dialog
- Form Modal
- Preview Modal
- Delete Confirmation
- Success Modal
- Warning Modal

---

## Rules

- Keep modals focused on a single task.
- Maximum width: 600px (unless preview/content-heavy).
- Clicking outside closes only non-destructive dialogs.
- ESC closes supported dialogs.
- Primary action always visible.
- Destructive actions require confirmation.

---

## Layout

```
Title
Description

Content

Cancel          Primary Action
```

---

# 26. Empty States

Empty states should educate users rather than simply stating that no data exists.

Each empty state should include:

- Relevant illustration (minimal)
- Title
- Short description
- Primary CTA
- Optional secondary CTA

Examples:

- No Projects Yet
- No Problems Available
- No Notifications
- No Reviews
- No Portfolio Data
- No Leaderboard Results

---

# 27. Loading States

Never leave users waiting without feedback.

Use:

- Skeleton Loaders
- Progress Bars
- Loading Indicators
- Optimistic UI when appropriate

Avoid:

- Blank white pages
- Infinite spinners
- Layout shifts

---

# 28. Error States

Errors should always help users recover.

Each error should contain:

- Error title
- Human-readable explanation
- Recovery action
- Retry button (where applicable)

Examples

- Network Error
- Permission Denied
- Session Expired
- File Upload Failed
- Page Not Found

Never expose raw backend exceptions.

---

# 29. Success States

Celebrate completion subtly.

Examples

- Project Created
- Review Submitted
- Credits Awarded
- Portfolio Updated
- Team Created
- File Uploaded

Use:

- Green check icon
- Toast notification
- Optional animation (≤250ms)

---

# 30. Notification Design

Notification Categories

Information

Success

Warning

Error

System

---

## Delivery

- In-App Notifications
- Toast Messages
- Email Notifications

Future

- Push Notifications

---

## Notification Rules

- Short
- Actionable
- Timestamped
- Clickable (if applicable)
- Never intrusive

---

# 31. Theme Guidelines

Current Theme

Light Mode Only

Future Support

Dark Mode

High Contrast Mode

Accessibility Theme

---

## Theme Rules

- Use Design Tokens
- Never hardcode colors
- Maintain consistent contrast
- Support theme switching without redesign

---

# 32. Role-Based UI Guidelines

## Student

Focus

- Discover
- Build
- Collaborate
- Track Progress

Priority Modules

- Dashboard
- Projects
- Credits
- Portfolio

---

## Faculty

Focus

- Mentor
- Review
- Publish Problems

Priority Modules

- Reviews
- Problem Creation
- Team Monitoring

---

## Admin

Focus

- Platform Management
- Analytics
- Reports

Minimal operational interface.

---

## Principal

Focus

- Institution Overview
- KPIs
- Innovation Metrics

Read-only executive dashboard.

---

# 33. Page Templates

Every page should follow one of these templates.

---

## Dashboard

```
Header

Statistics

Quick Actions

Main Content

Secondary Widgets
```

---

## List Page

```
Header

Filters

Search

Table / Cards

Pagination
```

---

## Details Page

```
Header

Overview

Tabs

Related Data

Actions
```

---

## Form Page

```
Header

Description

Form

Actions
```

---

## Analytics Page

```
Header

KPIs

Charts

Tables

Insights
```

---

# 34. Design Tokens

## Colors

Primary

Neutral

Success

Warning

Error

Info

---

## Radius

Small

Medium

Large

---

## Shadows

None

Small

Medium

Large

---

## Spacing

4

8

12

16

24

32

48

64

---

## Typography

Display

Heading

Title

Body

Caption

Label

---

## Animation

Fast

Medium

Slow

---

## Border

Thin

Medium

Focus

---

## Z-Index

Header

Sidebar

Dropdown

Modal

Toast

Tooltip

---

# 35. UI Rules for Claude Code

These rules are mandatory for every UI implementation.

## General Rules

- Never redesign existing components.
- Always reuse existing components.
- Prefer composition over duplication.
- Follow React best practices.
- Keep components small and reusable.

---

## Design Rules

- Follow Linear-inspired layouts.
- Follow Stripe spacing.
- Follow Notion readability.
- Use TailwindCSS utilities.
- Use shadcn/ui as the base component library.
- Never invent a new visual style.

---

## Component Rules

Every component must support:

- Loading
- Empty
- Error
- Disabled
- Responsive layouts

---

## Accessibility Rules

- Semantic HTML
- Keyboard navigation
- Focus states
- Screen reader support
- ARIA where necessary

---

## Performance Rules

- Lazy load pages
- Optimize images
- Avoid unnecessary re-renders
- Memoize expensive components
- Code split routes

---

## Code Quality Rules

- TypeScript everywhere
- No inline styles
- No duplicated logic
- Clean folder structure
- Consistent naming conventions

---

## Before Creating Any New Component

Claude must ask internally:

1. Does this already exist?
2. Can I reuse another component?
3. Can I compose existing components?
4. Does it follow the design system?
5. Is it responsive?
6. Is it accessible?
7. Is it consistent with CRCE OS?

Only if all answers are satisfied should a new component be created.

---

# 36. Future UI Expansion

The design system should support future modules without redesign.

Planned expansions include:

- Mobile Application
- Alumni Portal
- Industry Collaboration Portal
- Startup Incubator
- Research Repository
- AI Assistant
- Patent Management
- Multi-College Support
- ERP Integration
- Placement Portal
- Event Management
- Internship Portal

All future modules must inherit the existing design system.

---

# 37. UI/UX Principles Checklist

Before shipping any feature, verify the following:

## Design

- Clean and minimal
- Consistent spacing
- Proper typography
- Correct color usage
- Responsive layout
- Accessible design

---

## Components

- Reusable
- Responsive
- Accessible
- Well documented
- Consistent

---

## User Experience

- Clear navigation
- Fast interactions
- Helpful feedback
- Predictable behavior
- Minimal clicks
- Logical workflow

---

## Performance

- Fast page loads
- Optimized assets
- Lazy loading
- Smooth interactions

---

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard accessible
- Screen reader friendly
- Focus indicators
- Proper contrast ratios

---

## Code Quality

- Reusable components
- TypeScript
- TailwindCSS
- shadcn/ui
- Modular architecture
- No duplicate logic

---

# Final UI/UX Vision

CRCE OS should feel like a modern **Innovation Operating System** rather than a traditional college portal. Every interaction should be fast, intuitive, and purposeful. The interface must balance the precision of **Linear**, the enterprise polish of **Stripe**, and the clarity of **Notion**, resulting in a clean, accessible, and scalable experience.

The design system prioritizes **consistency over creativity**, **clarity over complexity**, and **functionality over decoration**. Every page should reinforce a unified visual language, every component should be reusable, and every workflow should minimize friction.

The ultimate goal is to create a timeless, enterprise-grade platform that empowers students, faculty, administrators, and institutional leaders to collaborate, innovate, and transform ideas into measurable impact while maintaining a cohesive user experience across the entire CRCE OS ecosystem.

