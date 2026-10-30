# StorePoint Premium UI/UX Transformation — Changelog

## Visual direction
- Cool blue-grey canvas (`#F8FAFC`), white surfaces, royal blue (`#2563EB`) actions, deep navy text
- Plus Jakarta Sans + JetBrains Mono (existing fonts)
- Restrained shadows, fine borders, no purple gradients / glass overload
- Follows `DESIGN_SYSTEM.md` (overrides conflicting auto-generated MASTER accent colors)

## Shared design system & components
- `src/components/ui/` — Button, Badge, Card, Input, PageHeader, EmptyState, StatusBadge
- Phase 2 additions: KpiStat, FilterBar/FilterField, IconButton, DialogHeader/DialogFooter
- `src/index.css` — `.sp-table`, `.sp-control`, `.sp-product-cell`, `.sp-tabs` / `.sp-tab`, skeletons, hero atmosphere

## Landing page
- Brand-first hero, Open StorePoint CTAs, labeled illustrative preview, feature/workflow/CTA/footer polish

## Application shell
- Grouped nav, refined navy sidebar, Escape-close drawer, search → `/app/products?q=`

## Phase 2 — Deep operational polish
- **Products**: FilterBar, KpiStat, StatusBadge, IconButton actions, EmptyState/skeletons, DialogHeader on detail drawer, clearer name/SKU/pricing hierarchy
- **Inventory**: Tab chrome, FilterBar + health pills, sp-table product cells, StatusBadge, EmptyState, numeric alignment
- **Sales / POS**: Ledger FilterBar + StatusBadge, EmptyState, keyboard-focusable rows; cart qty controls, payment/discount labels, checkout hierarchy (logic unchanged)
- **Analytics**: Date/branch toolbar polish, KpiStat grid (revenue vs profit distinction), skeleton loading, insufficient-data EmptyState
- **Intelligence**: KpiStat summary strip, search/control chrome alignment
- **Branches**: FilterBar, Badge stock health, IconButton archive, DialogHeader/Footer on add modal, EmptyState
- **Settings**: Workspace card copy/surface polish

## Phase 3 — Inventory sub-tabs, Reports, browser QA
- **Inventory**: Transfers / purchase orders / movement log use FilterBar, `sp-table`, StatusBadge, EmptyState; adjust / threshold / transfer / PO / confirm / detail dialogs use DialogHeader/DialogFooter + `sp-control`
- **Reports**: Report nav a11y (`aria-current`), FilterBar + FilterField, KpiStat summary, StatusBadge in tables, EmptyState for no rows
- **StatusBadge**: Fixed duplicate `cancelled` key; added `dispatched`; draft uses warning tone
- **Onboarding**: Removed meta “Phase 3 QA” copy from sandbox notice
- **Browser QA** (Vite `localhost:5173`): landing (desktop + ~390px), dashboard shell, Inventory stock/transfers/PO/movements + transfer modal Escape, Sales ledger + POS Escape, Products/Analytics/Intelligence/Reports/Settings/Branches (no document-level horizontal overflow), mobile nav open + Escape dismiss

## Quality
- `npm run test` — 90/90 passed (exit 0)
- `npm run lint` — exit 0 (pre-existing React Compiler / set-state-in-effect warnings; unused `Search` import removed)
- `npm run build` — exit 0

## Behavior notes
- No repository, calculation, IndexedDB schema, or checkout/refund safety changes
- POS payment option labels shortened in UI only (same PaymentMethod values)
- Sales ledger rows are keyboard-activatable (Enter/Space) for detail open
