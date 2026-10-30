# StorePoint — Local-First Retail POS & Multi-Branch Business Intelligence

> Fast, offline-resilient inventory control, sub-millisecond barcode Point of Sale (POS), real-time Cost of Goods Sold (COGS), and multi-branch analytics — running 100% locally in the browser with total data sovereignty.

---

## 📖 Project Overview

**StorePoint** is a modern, high-precision retail operations platform and Point of Sale (POS) system engineered for independent retailers, multi-location store operators, and warehouse managers.

Unlike legacy cloud-based SaaS POS platforms that suffer from network latency, freeze during internet dropouts, and mandate recurring subscription fees, StorePoint executes entirely on the client machine using browser-native **IndexedDB** persistent storage. Every stock adjustment, barcode checkout, inter-branch transfer, and financial calculation is computed on-device with zero roundtrip delay and bank-grade privacy.

---

## ✨ Key Features

### 🏢 Multi-Branch Operations & Stock Routing
- **Multi-Location Tracking**: Manage flagship stores, pop-up kiosks, and regional depots under a unified workspace.
- **Inter-Branch Stock Transfers**: Formal workflow (`pending` → `in_transit` → `completed` / `cancelled`) with automated inventory balance adjustments.
- **Cross-Branch Benchmarking**: Side-by-side revenue, net profit margin, and inventory health comparisons across all locations.

### ⚡ Sub-Millisecond Barcode POS & Checkout
- **Instant Product Lookup**: Instant barcode and SKU search with sub-millisecond response times.
- **Cart & Discount Engine**: Flexible line-item and order-level discount deductions with receipt generation.
- **Multiple Payment Methods**: Integrated tracking for Cash, Card, UPI, and Store Credit.
- **Refunds & Returns**: Comprehensive full and partial return processing with automated inventory restocking.

### 💰 Automated Real-Time COGS & Margin Intelligence
- **Cost of Goods Sold (COGS)**: Automatically computed on every sale using historical cost snapshots.
- **Operating Expense Ledger**: Track recurring overhead (Rent, Utilities, Payroll, Maintenance, Marketing).
- **Exact Integer Accounting**: All financial computations utilize integer cents/paise to eliminate IEEE 754 floating-point inaccuracies.
- **Live Net Profit Telemetry**: Real-time gross margin and net operating profit calculations updated dynamically.

### 🧠 Product Intelligence & Inventory Health
- **ABC Classification**: Automated Pareto analysis (80/15/5 revenue attribution) to categorize high-value inventory.
- **Stock Depletion & Reorder Alerts**: Real-time alerts when SKU counts drop below defined safety thresholds.
- **Days of Inventory on Hand (DOH)**: Velocity tracking to forecast runout dates.
- **Dead-Stock & Stagnant Capital Prevention**: Highlights dormant items exceeding holding thresholds to prevent capital lockup.

### 🔒 Air-Gapped Privacy & Dual Workspaces
- **100% Local-First Storage**: Zero cloud database dependencies. Customer data and transactions never leave the device.
- **Dual Workspace Mode**:
  - **Demo Sandbox**: Pre-seeded with rich sample electronics and retail records for risk-free evaluation and one-click data reset.
  - **Live Workspace**: Isolated, clean production ledger for everyday business operations.
- **Backup & Portability**: Encrypted JSON database export/import with schema verification and standard CSV exports.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | [React](https://react.dev/) | `^19.3.1` | Declarative, component-driven user interface |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `~6.0.3` | Strict static typing and code reliability |
| **Bundler & Dev Server**| [Vite](https://vite.dev/) | `^8.3.4` | Fast HMR dev server and optimized production bundling |
| **Styling & Design** | [Tailwind CSS](https://tailwindcss.com/) | `^4.3.3` | Utility-first styling with `@theme` design tokens |
| **Routing** | [React Router DOM](https://reactrouter.com/) | `^7.18.4` | Client-side routing with code-splitting |
| **Icons** | [Lucide React](https://lucide.dev/) | `^1.61.0` | Accessible modern icon system |
| **Animations** | [Motion](https://motion.dev/) | `^14.5.0` | Micro-interactions with reduced-motion support |
| **Data Visualization** | [Recharts](https://recharts.org/) | `^3.10.1` | Area charts for financial and margin velocity |
| **Client Storage** | [idb](https://github.com/jakearchibald/idb) | `^8.0.4` | Promised IndexedDB interface |
| **Testing** | [Vitest](https://vitest.dev/) | `^5.0.5` | Fast test execution with `fake-indexeddb` |
| **Linting** | [Oxlint](https://oxc.rs/) | `^1.88.0` | Fast Rust-based linter |

---

## 🏗️ Architecture Overview

StorePoint employs a decoupled, client-side repository and domain service architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       UI / View Layer                       │
│  - Marketing Landing Page (Interactive Hero, Bento Grid)    │
│  - Dashboard Shell (Obsidian Sidebar, Topbar, Search)       │
│  - Views: POS, Products, Inventory, Analytics, Reports      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Context & Hooks Layer                   │
│  - WorkspaceContext (Demo Sandbox vs. Live Production)      │
│  - Domain Hooks (useInventory, useSales, useBranches, etc.) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Domain Services Layer                    │
│  - FinancialCalculationService (COGS, Margins, P&L in paise)│
│  - ProductIntelligenceService (ABC Classification, DOH)     │
│  - BackupService (Validated JSON Export/Import, CSV)        │
│  - DemoDataService (Multi-Branch Realistic Retail Data)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Repository Layer (Data Access)             │
│  - branchRepository, productRepository, inventoryRepository │
│  - saleRepository, purchaseRepository, stockMovementRepo    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           Storage Layer: Browser IndexedDB (idb)            │
│  Database: storepoint_local_db (Version 2)                  │
│  10 Indexed Object Stores with Compound Query Indexes       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Directory Structure

```
StorePoint/
├── public/                     # Static assets (favicons, icons)
├── src/
│   ├── assets/                 # Graphics and imagery
│   ├── components/             # Modular React components
│   │   ├── dashboard/          # KPI cards, Recharts chart, branch benchmarking
│   │   ├── layout/             # Shared layout elements
│   │   ├── ui/                 # Accessible primitives (Button, Card, Input, Badges)
│   │   ├── workspace/          # First-run & demo onboarding dialogs
│   │   ├── Hero.tsx            # Hero with live simulated sales feed
│   │   ├── Navbar.tsx          # Frosted glass navigation with live engine beacon
│   │   ├── Features.tsx        # Bento Grid of core retail capabilities
│   │   ├── ProductPreview.tsx  # Product preview & 7-day velocity chart
│   │   ├── HowItWorks.tsx      # Connected 3-step merchant workflow
│   │   ├── CTASection.tsx      # High-conversion CTA banner
│   │   └── Footer.tsx          # Modern obsidian footer
│   ├── context/                # WorkspaceContext (Demo Sandbox vs. Live Workspace)
│   ├── data/                   # Pre-seeded sample retail data & mock metrics
│   ├── hooks/                  # Custom React hooks for business logic & a11y
│   ├── layouts/                # DashboardLayout.tsx (Sidebar, topbar, Ctrl+K search)
│   ├── lib/
│   │   ├── db.ts               # IndexedDB initialization, schema, and migrations
│   │   ├── repositories/       # Data Access Object (DAO) repositories
│   │   └── services/           # Financial, analytics, backup, and reporting services
│   ├── pages/
│   │   ├── LandingPage.tsx     # Public marketing & demonstration page
│   │   └── dashboard/          # Operations, Analytics, POS, and Settings views
│   ├── types/                  # TypeScript interfaces (database, dashboard, landing)
│   └── utils/                  # Currency formatting (paise/rupees), CSV builders, cn
├── tests/                      # 10 Vitest test suites (90 unit/integration tests)
├── index.html                  # HTML entry point with Plus Jakarta Sans & JetBrains Mono
├── package.json                # Project dependencies and script declarations
├── tsconfig.app.json           # Application TypeScript configuration
├── vite.config.ts              # Vite 8 configuration with Tailwind v4 & path aliases
└── vitest.config.ts            # Test configuration with fake-indexeddb
```

---

## ⚙️ Prerequisites

Before running StorePoint, ensure the following are installed on your workstation:
- **Node.js**: Version `20.x` or higher (LTS recommended)
- **npm**: Version `10.x` or higher (bundled with Node.js)
- A modern web browser supporting **IndexedDB** (Chrome, Firefox, Safari, Edge, or Brave)

---

## 🚀 Installation Instructions

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/chvnagarjunababu14-boop/Store-Point.git

# Navigate into the project folder
cd Store-Point

# Install dependencies
npm install
```

---

## 🔐 Environment Variable Configuration

StorePoint is an **air-gapped, local-first web application**. It does **not require any `.env` file, database connection string, or cloud API keys**.

All application states, catalogs, and transaction records persist securely inside your web browser's local **IndexedDB** storage.

---

## 🗄️ Database Setup & Initialization

There is **no manual database setup or external server required**.

1. When you first launch StorePoint in your browser, the database (`storepoint_local_db`) is automatically initialized at version `2`.
2. The initial load prompts you with a workspace selector:
   - **Demo Workspace**: Pre-populates realistic branches, electronics SKUs, purchase orders, and sales history for testing.
   - **Live Workspace**: Initializes an empty production database ready for custom merchant records.
3. You can reset or toggle workspaces at any time from the top navigation bar or via the **Settings** view.

---

## 🖥️ How to Run the Application

### Development Mode
Runs the local dev server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

### Production Build
Type-checks the project with TypeScript and produces an optimized static bundle in the `dist/` directory:

```bash
npm run build
```

### Preview Production Build
Locally tests the production bundle:

```bash
npm run preview
```

### Code Quality & Linting
Runs the fast Oxlint linter:

```bash
npm run lint
```

---

## 🧪 Testing Instructions

StorePoint includes an automated test suite powered by **Vitest** and **fake-indexeddb**, verifying repository operations, integer financial math, inventory transfers, and transaction safety.

### Run All Tests
```bash
npm run test
```

### Test Coverage Overview
- `financial.test.ts`: COGS and profit margin formulas.
- `money.test.ts`: Integer paise to rupee conversions and formatting.
- `repositories.test.ts`: CRUD operations across all IndexedDB object stores.
- `demo-and-backup.test.ts`: JSON backup serialization, validation, and restore idempotency.
- `phase6-inventory-transfers.test.ts`: Multi-branch transfer workflows.
- `phase7-sales-returns-expenses.test.ts`: Checkout, stock decrements, returns, and expense tracking.
- `phase8-analytics-branch-performance.test.ts`: Multi-location performance metric aggregations.
- `phase9-product-intelligence.test.ts`: ABC categorization, turnover velocity, and dead-stock flagging.
- `phase10-reports-exports-backup.test.ts`: Report generation and CSV building.
- `phase11-release-readiness.test.ts`: Transaction safety, inventory integrity, and edge case resilience.

---

## 🖼️ Screenshots

### High-Fidelity Interactive Dashboard Preview
![StorePoint Hero Preview](src/assets/hero.png)

---

## ⚠️ Known Limitations

1. **Browser Storage Scope**: All data resides inside the specific browser's IndexedDB. Clearing browser site data or cookies will clear the database unless an encrypted JSON backup has been exported.
2. **Device Isolation**: Data is saved to the local workstation. Syncing between different machines requires exporting a JSON backup from machine A and importing it on machine B.
3. **Single-Tenant / No Multi-User RBAC**: Built for owner-operator retail environments. Does not include remote user authentication, permissions tiers, or password-based role management.
4. **Receipt Printing**: Generates receipts through the browser's standard print dialog (`window.print()`) rather than low-level ESC/POS hardware serial drivers.

---

## 🔮 Future Improvements

- [ ] **WebUSB / ESC-POS Hardware Drivers**: Direct integration with thermal receipt printers and cash drawer kickers.
- [ ] **P2P Encrypted Sync**: Peer-to-peer WebRTC / local Wi-Fi synchronization between store tablets and checkout counters.
- [ ] **Multi-Currency Support**: Configurable currency symbols and decimal formats (USD, EUR, GBP) alongside INR.
- [ ] **Offline PWA Installation**: Service Worker caching for seamless desktop and mobile Progressive Web App (PWA) installation.
- [ ] **Barcode Generator**: Built-in SVG/Canvas barcode and QR code label generator for shelf pricing tags.

---

## 📄 License Information

This project is currently maintained as **private / proprietary software** (`"private": true` in `package.json`). All rights are reserved by the repository owner.
