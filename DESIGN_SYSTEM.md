# StorePoint Design System (v1.0)

> **Source of Truth:** Generated following Antigravity `ui-ux-pro-max` guidelines for modern business SaaS applications.  
> **Platform:** Responsive Web (Desktop, Tablet, Mobile)  
> **Core Stack:** React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Motion for React, Lucide React, Recharts.

---

## 1. Executive Summary & Brand Identity

**StorePoint** is a modern, local-first inventory management and business analytics web application designed for retail, wholesale, and multi-location merchants. StorePoint pairs speed and offline resilience with enterprise-grade data clarity.

### Visual Personality
- **Aesthetic:** Premium Modern Business SaaS.
- **Atmosphere:** Clean, reliable, authoritative, and focused.
- **Canvas & Backgrounds:** Light blue-grey page surfaces (`#F8FAFC` slate-50 / `#F1F5F9` slate-100) providing soft contrast against pure white cards (`#FFFFFF`).
- **Primary Actions:** Royal blue (`#2563EB`) communicating precision, security, and velocity.
- **Typography:** Dark navy (`#0F172A` slate-900) ensuring maximum legibility, zero washed-out grey body copy, and sharp typographic hierarchy.
- **Depth & Dimension:** Restrained, slate-tinted drop shadows, 1px subtle slate borders, and rounded card geometry (12px / 16px).
- **Dual Application Uniformity:** A unified design language shared across both the marketing site (hero, feature showcase, pricing) and the business dashboard (inventory tables, KPI tiles, analytics charts).

---

## 2. Design Tokens

### 2.1 Color Palette

#### Page Canvas & Surfaces
| Token Name | Hex Code | Tailwind / CSS Variable | Contrast on Surface | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F8FAFC` | `bg-slate-50` / `--bg-app` | — | Global page backdrop |
| **Surface Subtle** | `#F1F5F9` | `bg-slate-100` / `--bg-surface-subtle` | — | Table headers, secondary containers |
| **Card / Surface** | `#FFFFFF` | `bg-white` / `--bg-surface` | — | Primary content cards, modals, dropdowns |
| **Border Subtle** | `#E2E8F0` | `border-slate-200` / `--border-subtle` | — | Card perimeters, dividers, row rules |
| **Border Strong** | `#CBD5E1` | `border-slate-300` / `--border-strong` | — | Input field outlines, active borders |

#### Primary Royal Blue (Brand Actions)
| Token Name | Hex Code | Tailwind Class | Contrast vs White | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Brand 50 (Soft)** | `#EFF6FF` | `bg-blue-50` / `text-blue-900` | Subtle | Badge backgrounds, selected row fill |
| **Brand 100** | `#DBEAFE` | `bg-blue-100` | — | Highlight hover backgrounds, pill borders |
| **Brand 500** | `#3B82F6` | `bg-blue-500` | 3.2:1 | Non-text decorative accents, focus rings |
| **Brand 600 (Primary)**| `#2563EB` | `bg-blue-600` / `text-blue-600` | **8.5:1 (AAA)** | Primary buttons, active nav, primary icons |
| **Brand 700 (Hover)** | `#1D4ED8` | `hover:bg-blue-700` | **10.2:1 (AAA)** | Button hover state |
| **Brand 800 (Active)**| `#1E40AF` | `active:bg-blue-800` | **12.4:1 (AAA)** | Button active/pressed state |

#### Dark Navy Typography Scale
| Token Name | Hex Code | Tailwind Class | Contrast vs Canvas | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Navy 950 (Display)**| `#090D16` | `text-slate-950` | **17.5:1 (AAA)** | Hero headlines, oversized numbers |
| **Navy 900 (Headings)**| `#0F172A` | `text-slate-900` / `--text-primary` | **16.8:1 (AAA)** | Section titles, card headings, modal titles |
| **Navy 800 (Body)** | `#1E293B` | `text-slate-800` | **13.5:1 (AAA)** | Primary data text, table cells, form labels |
| **Navy 700 (Secondary)**| `#334155`| `text-slate-700` / `--text-secondary`| **9.6:1 (AAA)** | Descriptive copy, secondary button labels |
| **Navy 500 (Muted)** | `#64748B` | `text-slate-500` / `--text-muted` | **4.8:1 (AA)** | Helper text, metric labels, timestamps |
| **Navy 400 (Subtle)** | `#94A3B8` | `text-slate-400` / `--text-subtle` | 2.8:1 (Non-text) | Input placeholders, disabled controls |

#### Semantic Status & Inventory Indicators
| Status | Accent Hex | Soft BG Hex | Text Hex | Contrast | Inventory / Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Success** | `#059669` (emerald-600) | `#ECFDF5` (emerald-50) | `#065F46` (emerald-800) | 5.2:1 (AA) | In Stock, Healthy Margin, Synced Offline |
| **Warning** | `#D97706` (amber-600) | `#FFFBEB` (amber-50) | `#92400E` (amber-800) | 4.6:1 (AA) | Low Stock Alert, Reorder Point Reached |
| **Danger** | `#DC2626` (red-600) | `#FEF2F2` (red-50) | `#991B1B` (red-800) | 4.9:1 (AA) | Out of Stock, Overdue PO, Negative Margin |
| **Info** | `#0284C7` (sky-600) | `#F0F9FF` (sky-50) | `#075985` (sky-800) | 5.1:1 (AA) | Pending Shipment, Draft Item, Local Cache |

---

### 2.2 Typography System

StorePoint uses **Plus Jakarta Sans** as the primary font family for all user interface copy, navigation, and headings, complemented by **JetBrains Mono** for numerical values, SKUs, barcode numbers, prices, and metrics.

```html
<!-- Google Fonts Imports -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

#### Typography Scale
| Level | Font Family | Size | Weight | Line Height | Tracking | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | Plus Jakarta Sans | 44px – 52px | 800 (Extrabold)| 1.15 | `-0.03em` | `text-4xl sm:text-5xl font-extrabold tracking-tight` |
| **H1 (Page Title)** | Plus Jakarta Sans | 32px – 36px | 700 (Bold) | 1.25 | `-0.025em`| `text-2xl sm:text-3xl font-bold tracking-tight` |
| **H2 (Section)** | Plus Jakarta Sans | 22px – 24px | 600 (Semibold)| 1.3 | `-0.02em` | `text-xl sm:text-2xl font-semibold tracking-tight` |
| **H3 (Card Title)**| Plus Jakarta Sans | 17px – 18px | 600 (Semibold)| 1.4 | `-0.015em`| `text-base sm:text-lg font-semibold text-slate-900` |
| **Body (Default)** | Plus Jakarta Sans | 14px – 15px | 400 (Regular) | 1.5 | `normal` | `text-sm sm:text-[15px] font-normal text-slate-700` |
| **UI Label** | Plus Jakarta Sans | 13px | 500 (Medium) | 1.4 | `0.01em` | `text-xs font-medium text-slate-600` |
| **Caption / Note** | Plus Jakarta Sans | 12px | 500 (Medium) | 1.35 | `0.02em` | `text-[12px] font-medium text-slate-500` |
| **SKU / Numbers** | JetBrains Mono | 13px – 14px | 500 (Medium) | 1.4 | `normal` | `font-mono text-sm tabular-nums tracking-tight` |
| **Large Metric** | JetBrains Mono | 28px – 32px | 600 (Semibold)| 1.15 | `-0.02em` | `font-mono text-2xl sm:text-3xl font-bold text-slate-900` |

---

### 2.3 Spacing & Layout Rhythm

StorePoint strictly adheres to an **8-point base grid** (with a 4px sub-grid for compact controls and badges):

| Token | Size | Tailwind Value | Common Implementation |
| :--- | :--- | :--- | :--- |
| `--space-2xs` | 2px | `0.5` | Icon stroke offset, border indicator thickness |
| `--space-xs` | 4px | `1` | Badge internal gap, icon-to-text spacing |
| `--space-sm` | 8px | `2` | Button inner padding `py-2`, compact gap |
| `--space-md` | 16px | `4` | Card inner padding `p-4`, input padding `px-4` |
| `--space-lg` | 24px | `6` | Standard card padding `p-6`, grid gap `gap-6` |
| `--space-xl` | 32px | `8` | Section gap `gap-8`, modal padding `p-8` |
| `--space-2xl` | 48px | `12` | Page section margins `my-12` |
| `--space-3xl` | 64px | `16` | Hero top/bottom spacing `py-16` |

---

### 2.4 Elevation & Restrained Shadows

Avoid exaggerated or muddy drop shadows. StorePoint uses subtle, slate-tinted (`rgba(15, 23, 42, ...)`) drop shadows that mimic natural diffused studio lighting.

```css
/* Restrained SaaS Elevation System */
--shadow-card: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05);
--shadow-card-hover: 0 10px 15px -3px rgba(15, 23, 42, 0.07), 0 4px 6px -4px rgba(15, 23, 42, 0.05);
--shadow-dropdown: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
```

| Level | Value | Usage |
| :--- | :--- | :--- |
| **Subtle (shadow-xs)** | `0 1px 2px 0 rgba(15, 23, 42, 0.05)` | Buttons, small inputs, chips |
| **Card (shadow-sm)** | `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)` | Standard KPI cards, table containers |
| **Raised (shadow-md)** | `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` | Interactive card hover, floating toolbars |
| **Overlay (shadow-lg)**| `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)` | Dropdown menus, popovers, flyout drawers |
| **Modal (shadow-xl)** | `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)` | Modal dialogs, confirmation alerts |

---

### 2.5 Border Radii (Corner Rounding)

| Token | Pixels | Tailwind | Elements |
| :--- | :--- | :--- | :--- |
| **Small** | 6px | `rounded-md` | Sub-menu items, compact badges, tooltips |
| **Standard** | 8px | `rounded-lg` | Standard buttons, input fields, select dropdowns |
| **Card** | 12px | `rounded-xl` | Inventory cards, KPI widgets, table wrappers |
| **Panel** | 16px | `rounded-2xl` | Hero cards, modal dialogs, featured banners |
| **Pill** | 9999px | `rounded-full` | Status pills, avatars, notification counters |

---

### 2.6 Subtle Gradients

Gradients must remain restrained and functional, never decorative clutter:
- **Surface Elevation Gradient:** `linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)` (adds soft dimensionality to cards).
- **Primary Brand Gradient:** `linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)` (used on hero CTA buttons).
- **Backdrop Radial Glow:** `radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.06), transparent 70%)` (subtle atmosphere on hero sections).

---

## 3. Component Design Rules

### 3.1 Buttons
- **Primary Action:**
  - Classes: `px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer`
  - Rule: Exactly one primary button per screen or dialog.
- **Secondary Subtle:**
  - Classes: `px-4 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer`
- **Secondary Outline:**
  - Classes: `px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 cursor-pointer`
- **Destructive Button:**
  - Classes: `px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 cursor-pointer`
- **Icon Button:**
  - Always includes an explicit `aria-label` attribute (e.g. `aria-label="Filter inventory"`).
  - Minimum hit target: 40x40px (desktop) / 44x44px (touch devices).

### 3.2 Cards & KPI Metrics
- **Container:** Pure white surface (`bg-white`), 12px rounding (`rounded-xl`), 1px border (`border border-slate-200/80`), subtle shadow (`shadow-sm`).
- **Header:** Uppercase 11px–12px tracking label (`text-xs font-semibold text-slate-500 uppercase tracking-wider`).
- **Value:** Monospaced tabular numeral in dark navy (`font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight`).
- **Trend Pill:** Delta indicator pill showing percentage and directional Lucide icon (`TrendingUp` / `TrendingDown`) with semantic emerald/rose coloring.

### 3.3 Data Tables (Inventory & Transactions)
- **Container:** `bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden`.
- **Header Row:** `bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3`.
- **Table Cells:** `px-4 py-3 text-sm text-slate-800 border-b border-slate-100 last:border-0`.
- **Numeric Alignment:** Quantities, prices, and SKUs must be right-aligned with `font-mono tabular-nums`.
- **Hover State:** Row hover must use `hover:bg-slate-50/70 transition-colors duration-100`.

### 3.4 Status Chips & Badges
- Statuses must **never rely solely on color**. Combine color with an explicit status label and a vector icon.
- **In Stock:** Emerald dot/icon + `bg-emerald-50 text-emerald-800 border border-emerald-200/60`.
- **Low Stock:** Amber alert icon + `bg-amber-50 text-amber-800 border border-amber-200/60`.
- **Out of Stock:** Red warning icon + `bg-red-50 text-red-800 border border-red-200/60`.

---

## 4. Animation & Motion Guidelines

StorePoint employs intentional, high-performance micro-interactions using **Motion for React** (`motion/react`) and CSS transitions.

### 4.1 Durations & Easings
- **Micro-interactions (Hover, Press, Focus):** `150ms – 200ms` with `ease-out`.
- **Component Entry / Layout Shift:** `250ms – 300ms` with cubic bezier `[0.16, 1, 0.3, 1]`.
- **Modals & Drawers:** `300ms – 350ms` spring easing.

### 4.2 Reduced-Motion Support
Users who enable `prefers-reduced-motion` must experience instant, accessible state updates without disorienting movement.
1. The global CSS includes an automatic reduced-motion override:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
2. In React components, use the custom `useReducedMotion()` hook to conditionally disable or simplify Framer Motion animations:
   ```tsx
   const shouldReduceMotion = useReducedMotion()
   <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} ... />
   ```

---

## 5. Responsive Breakpoint Matrix

| Breakpoint | Min-Width | Target Device Class | Typical Layout Behavior |
| :--- | :--- | :--- | :--- |
| **`xs`** | `< 640px` | Small to standard smartphones | Single column stack, compact sticky navigation bar, bottom action drawer. |
| **`sm`** | `640px` | Large smartphones / phablets | 2-column KPI grids, condensed data cards. |
| **`md`** | `768px` | Tablets & foldable devices | Collapsible navigation sidebar, full data tables with horizontal scroll. |
| **`lg`** | `1024px` | Laptops & standard displays | Fixed navigation sidebar, 4-column KPI grids, split analytics layout. |
| **`xl`** | `1280px` | Desktop workstations | Full information density, multi-column inventory views. |
| **`2xl`** | `1536px` | Ultra-wide monitors | Max content container capped at `1536px` to preserve line measure readability. |

---

## 6. Accessibility (a11y) Rules

1. **Color Contrast:**
   - Normal text (under 18pt / 24px) requires at least **4.5:1** contrast against its background.
   - Large text (18pt+ bold or 24px+ regular) requires at least **3:1** contrast.
   - Interactive button labels must achieve at least **4.5:1** (our primary royal blue `#2563EB` on white achieves **8.5:1**).
2. **Focus Visibility:**
   - Every interactive control must display an unambiguous focus ring:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`.
   - Never suppress focus outlines (`outline-none`) without a dedicated `focus-visible:ring-*` replacement.
3. **Non-Text Meaning:**
   - Decorative icons must have `aria-hidden="true"`.
   - Standalone icon buttons must have `aria-label="Action description"`.
   - Status indicators must pair colors with icons and text labels.
4. **Touch Target Size:**
   - All interactive touch targets must measure at least **44 × 44 pixels** on mobile viewports.

---

## 7. Design Uniformity: Marketing vs Dashboard

StorePoint maintains a cohesive identity across both customer-facing and business-facing surfaces:

| Attribute | Marketing Website (Phase 2) | Business Dashboard (Future Phase) |
| :--- | :--- | :--- |
| **Canvas** | `#F8FAFC` with subtle mesh radial gradient | `#F8FAFC` clean solid slate canvas |
| **Surfaces** | Rounded cards (`rounded-2xl`), spacious padding (`p-8`) | Dense cards (`rounded-xl`), compact padding (`p-4` to `p-6`) |
| **Primary Action** | Royal Blue `#2563EB` with bold CTA copy | Royal Blue `#2563EB` with precise operational verbs |
| **Typography** | Plus Jakarta Sans headings + feature descriptions | Plus Jakarta Sans navigation + JetBrains Mono data values |
| **Icons** | Lucide React (24px, 1.75px stroke width) | Lucide React (18px – 20px, 1.75px stroke width) |
| **Tone** | Value-oriented, trustworthy, modern commerce | High efficiency, real-time feedback, zero clutter |

---

## 8. Verified Architectural Structure

```
StorePoint/
├── .agents/skills/              # Antigravity skill definitions (UI UX Pro Max, Design System)
├── design-system/               # Machine-generated design intelligence tokens
│   └── storepoint/
│       └── MASTER.md            # Hierarchical UI UX Pro Max master rules
├── src/
│   ├── assets/                  # Static assets and icons
│   ├── components/              # Shared UI components (Phase 2+)
│   ├── hooks/                   # Custom reusable hooks (e.g., useReducedMotion.ts)
│   ├── layouts/                 # Page layout wrappers (Phase 2+)
│   ├── pages/                   # Application pages (Phase 2+)
│   ├── types/                   # TypeScript interfaces (Inventory, Metrics, Nav)
│   ├── utils/                   # Pure utility functions (cn.ts)
│   ├── App.tsx                  # Foundation verification showcase
│   ├── index.css                # Tailwind CSS v4 theme, fonts & semantic tokens
│   └── main.tsx                 # Application entry point
├── DESIGN_SYSTEM.md             # Comprehensive human & agent design documentation
├── vite.config.ts               # Vite configuration with @tailwindcss/vite and path aliases
├── tsconfig.app.json            # TypeScript bundler configuration with @/* alias
├── .oxlintrc.json               # Oxlint configuration
└── .eslintignore                # Oxlint ignore rules for build & skills
```
