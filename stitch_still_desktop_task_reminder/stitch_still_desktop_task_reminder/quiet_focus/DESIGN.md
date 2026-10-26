---
name: Quiet Focus
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1a1b1e'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#c6c5d2'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3033'
  outline: '#908f9c'
  outline-variant: '#464651'
  surface-tint: '#bcc2ff'
  primary: '#c8ccff'
  on-primary: '#1f2871'
  primary-container: '#a5aeff'
  on-primary-container: '#363f88'
  inverse-primary: '#4f58a2'
  secondary: '#a9cfb8'
  on-secondary: '#133726'
  secondary-container: '#2d503e'
  on-secondary-container: '#9bc1aa'
  tertiary: '#ffbfbe'
  on-tertiary: '#591b1e'
  tertiary-container: '#f89a9a'
  on-tertiary-container: '#743032'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc2ff'
  on-primary-fixed: '#040e5d'
  on-primary-fixed-variant: '#374089'
  secondary-fixed: '#c4ecd3'
  secondary-fixed-dim: '#a9cfb8'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#2b4e3c'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#ffb3b2'
  on-tertiary-fixed: '#3d060b'
  on-tertiary-fixed-variant: '#763133'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-default:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-medium:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-kbd:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.01em
  micro:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-compact: 0.5rem
  margin: 1rem
  margin-window: 1.25rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system embodies the calculated serenity of high-craft desktop software. Built for power users, deep thinkers, and minimalist operators, it marries the spatial refinement of macOS native utilities with the rigorous, keyboard-centric precision of modern developer tools.

### Design Aesthetic: Quiet Utility
The visual tone is calm, monolithic, and deliberate. Interfaces avoid unnecessary chrome, saturated fills, and decorative distraction. Every element exists to recede into the canvas until summoned. Contrast is deployed sparingly to direct micro-attention: primary actions glow with a restrained periwinkle luminescence, while critical deadlines communicate urgency through desaturated, elegant signals rather than jarring alerts.

Key principles:
- **Atmospheric Restraint:** A deep charcoal canvas sets an uncluttered tonal floor where content floats without glare.
- **Physical Precision:** Borders act as hair-thin light catches rather than heavy separators; inset highlights replicate micro-machined physical edges.
- **Tactile Density:** Layouts prefer compact, predictable rhythms that reward high visual literacy and fast navigation.

## Colors

The system uses a strictly controlled tonal spectrum anchored by dark charcoal surfaces and high-legibility muted neutrals.

### Surface Hierarchy
- **Canvas / Root Background (`#131417`):** The ground layer of the application window and unpinned desk canvas.
- **Surface Base / Widget Panel (`#191A1D`):** Primary level for floating panels, persistent widgets, and docked toolbars.
- **Elevated Surface / Overlays (`#222429`):** Command palettes, row selections, dropdowns, and context menus.
- **Interactive Container (`#292B31`):** Form inputs, pill indicators, and subtle secondary chips.

### Functional Accents
- **Primary / Brand Periwinkle (`#A5AEFF`):** Reserved strictly for active indicators, caret focus, check states, and primary shortcuts. Hover shifts to `#B9C0FF`.
- **Success Sage (`#91B7A0`):** Used for completed milestones, synchronized states, and non-destructive alerts.
- **Overdue Coral (`#E78C8C`):** Subdued warning and date breach state; intentionally desaturated to preserve desktop harmony without causing cognitive panic.

### Typography & Dividers
- **Text Primary (`#F5F5F7`):** Headings, critical lists, and high-priority titles.
- **Text Secondary (`#9699A3`):** Metadata, key hints, subheaders, and contextual timestamps.
- **Text Tertiary / Muted (`#656872`):** Placeholder text, shortcut brackets, and disabled nodes.
- **Hairline Divider (`#30323A`):** 1px structural partitions and component edge borders.

## Typography

The typographic engine favors compact vertical metrics, negative tracking across higher size scales, and strict tabular alignment for dates and metrics.

- **Negative Tracking:** Headings and titles use `-0.01em` to `-0.02em` letter spacing to yield crisp, dense header groupings that feel deliberate on high-DPI desktop screens.
- **Font Stacking:** Primary font defaults to `Inter` (or native `-apple-system, BlinkMacSystemFont, "Segoe UI"`), with numeric variants forced into `font-feature-settings: "tnum" 1` for list alignment and time indicators.
- **Optical Compactness:** Text blocks maintain strict line height constraints (1.3x to 1.4x font size) to mirror desktop system density rather than web prose sprawl.

## Layout & Spacing

Layouts reject wide web gutters in favor of structural, high-density layouts optimized for quick visual scanning and compact desktop footprints.

### Screen & Widget Models
- **Persistent Widget Canvas:** Fixed or edge-anchored floating container sizes (ranging between 320px to 440px width). Content stays clamped within tight margins (`12px` to `16px`).
- **Main App Layout:** Two-pane or three-pane split view using a collapsed fluid side navigation (minimum 200px, maximum 260px) and a fixed-fluid central task list.
- **Micro-Gaps:** Interior list rows and control groupings utilize strict `4px` (`space-xs`) or `8px` (`space-sm`) gaps to prevent the visual scattering of actionable targets.

## Elevation & Depth

Depth is defined using a twin approach: ambient dark drop-shadows combined with hairline inner light traps.

### Ambient Drops
- **Layer 0 (Canvas):** Pure flat base, zero shadow.
- **Layer 1 (Floating Panels & Persistent Widgets):** `0 12px 36px -4px rgba(0, 0, 0, 0.45)`, providing subtle detachment from the OS background.
- **Layer 2 (Context Menus, Modals & Command Palette):** `0 20px 50px rgba(0, 0, 0, 0.65)`. Ensures total separation above underlying lists.

### Inset Light Highlights
All floating panels, elevated inputs, and modal borders must incorporate a delicate 1px inset highlight:
`box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.05);`
This creates a micro-machined, beveled bevel that catches the eye without adding physical border weight.

### Outlines
Containers utilize flat 1px borders colored in `#30323A` (subtle border token). Never deploy borders thicker than 1px.

## Shapes

The design system maintains strict geometry scales mapped by component scale:
- **Parent Containers & Persistent Widgets:** `14px` to `16px` radius. Curvature provides a comfortable, organic presence on desktop backdrops without drifting into playful or cartoonish territory.
- **Dialogs & Overlay Windows:** `8px` radius.
- **Inputs, Buttons, and Pill Badges:** `6px` radius.
- **Small Controls (Checkboxes, Toggles, Key Caps):** `4px` radius.

## Components

### Buttons
- **Primary:** Background `#A5AEFF`, text `#131417`, font-weight 500. Hover: `#B9C0FF`. Active state compresses slightly via `transform: scale(0.98)`.
- **Secondary / Ghost:** Background transparent or `#222429` on hover, border 1px solid `#30323A`, text `#F5F5F7`. Height 28px (compact) or 32px (standard), radius 6px, padding 0 10px.

### Inputs & Search Bars
- Background `#292B31`, border 1px solid `#30323A`, radius 6px.
- Text `#F5F5F7`, placeholder `#656872`.
- Focus state: Border color transitions to `#A5AEFF` with an inner glow of `0 0 0 1px #A5AEFF`.

### Lists & Row Items
- Fixed row heights of 32px (dense) or 38px (comfortable).
- Background transparent by default; row hover transitions to `#222429` with `transition: background 120ms ease`.
- Selected row retains `#222429` with an optional 2px vertical periwinkle indicator on the left boundary.

### Checkboxes
- Size: 14px × 14px, radius 4px.
- Idle: Border 1px solid `#656872`, background transparent.
- Checked: Background `#A5AEFF`, border `#A5AEFF`, with a `#131417` check icon.
- Hover: Border color `#9699A3`.

### Keyboard Shortcuts (KBD Badges)
- Background `#222429`, border 1px solid `#30323A`, radius 4px.
- Padding: 1px 5px; font size 11px, font-family tabular monospaced or `Inter`, text color `#9699A3`.

### Status Badges & Chips
- Padding: 2px 8px, radius 6px, font size 11px, weight 500.
- Overdue: Background `rgba(231, 140, 140, 0.12)`, text `#E78C8C`, border 1px solid `rgba(231, 140, 140, 0.25)`.
- Success / Finished: Background `rgba(145, 183, 160, 0.12)`, text `#91B7A0`, border 1px solid `rgba(145, 183, 160, 0.25)`.