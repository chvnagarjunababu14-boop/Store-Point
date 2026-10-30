import { getDb } from '@/lib/db'
import type {
  BranchEntity,
  ProductEntity,
  BranchInventoryEntity,
  StockMovementEntity,
  SaleEntity,
  SaleLineItemEntity,
  OperatingExpenseEntity,
  PurchaseEntity,
  PurchaseLineItemEntity,
} from '@/types/database'
import { dollarsToCents } from '@/utils/money'

export const demoDataService = {
  /**
   * Check if demo workspace has been seeded
   */
  async isDemoSeeded(): Promise<boolean> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', 'demo')
    return branches.length > 0
  },

  /**
   * Safely wipe ONLY demo workspace records.
   * NEVER touches 'live' records.
   */
  async resetDemoWorkspace(): Promise<void> {
    const db = await getDb()
    const tx = db.transaction(
      [
        'branches',
        'products',
        'inventory',
        'stockMovements',
        'purchases',
        'purchaseLineItems',
        'sales',
        'saleLineItems',
        'saleReturns',
        'operatingExpenses',
      ],
      'readwrite'
    )

    const stores = [
      'branches',
      'products',
      'inventory',
      'stockMovements',
      'purchases',
      'purchaseLineItems',
      'sales',
      'saleLineItems',
      'saleReturns',
      'operatingExpenses',
    ] as const

    for (const storeName of stores) {
      const store = tx.objectStore(storeName)
      // Check if store has by-workspace index
      if ('by-workspace' in store.indexNames) {
        const records = await store.index('by-workspace').getAll('demo')
        for (const record of records) {
          // All entities have string id as key
          const r = record as { id: string }
          if (r.id) {
            await store.delete(r.id)
          }
        }
      }
    }

    await tx.done
  },

  /**
   * Seed the demo workspace idempotently.
   * Wipes any prior demo data first so repeatedly clicking "Seed Demo Data" never duplicates records.
   */
  async seedDemoWorkspace(): Promise<void> {
    await this.resetDemoWorkspace()

    const db = await getDb()
    const now = new Date().toISOString()

    // 1. Branches
    const branches: BranchEntity[] = [
      {
        id: 'b-flagship',
        workspaceId: 'demo',
        code: 'BR-01',
        name: 'Downtown Flagship',
        locationType: 'Flagship',
        city: 'Downtown Core',
        address: '450 Retail Avenue, Suite 100',
        manager: 'Sarah Jenkins',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'b-westside',
        workspaceId: 'demo',
        code: 'BR-02',
        name: 'Westside Commerce Hub',
        locationType: 'Retail',
        city: 'Westside Plaza',
        address: '882 Westside Promenade, Bay 4',
        manager: 'David Chen',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'b-airport',
        workspaceId: 'demo',
        code: 'BR-03',
        name: 'Airport Express Kiosk',
        locationType: 'Outlet',
        city: 'Terminal 2 Concourse',
        address: 'Departure Gate 24, Intl Terminal',
        manager: 'Elena Rostova',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'b-depot',
        workspaceId: 'demo',
        code: 'WH-01',
        name: 'Central Depot Warehouse',
        locationType: 'Warehouse',
        city: 'Industrial Logistics Park',
        address: 'Building C, Dock 12-14',
        manager: 'Marcus Vance',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ]

    // 2. Master Products
    const products: ProductEntity[] = [
      {
        id: 'prod-01',
        workspaceId: 'demo',
        sku: 'SKU-8921-X',
        barcode: '097855174567',
        name: 'Logitech MX Master 3S Wireless Mouse',
        category: 'Peripherals',
        description: 'Quiet-click ergonomic performance mouse',
        costPriceCents: dollarsToCents(58.0),
        sellingPriceCents: dollarsToCents(99.99),
        reorderPoint: 15,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-02',
        workspaceId: 'demo',
        sku: 'SKU-1092-K',
        barcode: '085004128912',
        name: 'Keychron Q1 Pro Mechanical Keyboard',
        category: 'Hardware',
        description: 'CNC aluminum wireless custom mechanical keyboard',
        costPriceCents: dollarsToCents(135.0),
        sellingPriceCents: dollarsToCents(219.0),
        reorderPoint: 12,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-03',
        workspaceId: 'demo',
        sku: 'SKU-3108-M',
        barcode: '027242923769',
        name: 'Sony WH-1000XM5 Wireless Headphones',
        category: 'Audio',
        description: 'Active noise cancelling wireless headphones',
        costPriceCents: dollarsToCents(230.0),
        sellingPriceCents: dollarsToCents(349.99),
        reorderPoint: 12,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-04',
        workspaceId: 'demo',
        sku: 'SKU-7734-L',
        barcode: '085002812034',
        name: 'CalDigit TS4 Thunderbolt 4 Docking Station',
        category: 'Connectivity',
        description: '18-port Thunderbolt 4 hub for workstations',
        costPriceCents: dollarsToCents(270.0),
        sellingPriceCents: dollarsToCents(399.95),
        reorderPoint: 8,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-05',
        workspaceId: 'demo',
        sku: 'SKU-4410-B',
        barcode: '019464414592',
        name: 'Anker Prime 100W GaN Wall Charger',
        category: 'Accessories',
        description: '3-port GaN high speed compact charger',
        costPriceCents: dollarsToCents(42.0),
        sellingPriceCents: dollarsToCents(79.99),
        reorderPoint: 25,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-06',
        workspaceId: 'demo',
        sku: 'SKU-5521-P',
        barcode: '061965918234',
        name: 'SanDisk Extreme Pro 1TB Portable SSD',
        category: 'Storage',
        description: 'Rugged USB 3.2 Gen 2x2 solid state drive',
        costPriceCents: dollarsToCents(85.0),
        sellingPriceCents: dollarsToCents(139.99),
        reorderPoint: 15,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-07',
        workspaceId: 'demo',
        sku: 'SKU-9902-S',
        barcode: '074588383921',
        name: 'Belkin BoostCharge Pro 3-in-1 MagSafe Pad',
        category: 'Accessories',
        description: 'Wireless charging pad for iPhone, Apple Watch, AirPods',
        costPriceCents: dollarsToCents(85.0),
        sellingPriceCents: dollarsToCents(149.99),
        reorderPoint: 15,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-08',
        workspaceId: 'demo',
        sku: 'SKU-6210-D',
        barcode: '088411639201',
        name: 'Dell UltraSharp 27 4K USB-C Hub Monitor',
        category: 'Hardware',
        description: 'IPS Black panel monitor with 90W power delivery',
        costPriceCents: dollarsToCents(390.0),
        sellingPriceCents: dollarsToCents(579.99),
        reorderPoint: 10,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-09',
        workspaceId: 'demo',
        sku: 'SKU-1844-R',
        barcode: '084000663821',
        name: 'Elgato Stream Deck MK.2 Production Console',
        category: 'Peripherals',
        description: '15 customizable LCD keys for studio control',
        costPriceCents: dollarsToCents(92.0),
        sellingPriceCents: dollarsToCents(149.99),
        reorderPoint: 12,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ]

    // 3. Branch Inventory
    const inventory: BranchInventoryEntity[] = [
      {
        id: 'inv_b-flagship_prod-01',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        productId: 'prod-01',
        quantity: 48,
        reorderPoint: 15,
        locationBin: 'A-12-04',
        averageCostCents: dollarsToCents(58.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-westside_prod-01',
        workspaceId: 'demo',
        branchId: 'b-westside',
        productId: 'prod-01',
        quantity: 24,
        reorderPoint: 10,
        locationBin: 'W-03-02',
        averageCostCents: dollarsToCents(58.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-flagship_prod-02',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        productId: 'prod-02',
        quantity: 18,
        reorderPoint: 12,
        locationBin: 'K-01-11',
        averageCostCents: dollarsToCents(135.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-flagship_prod-03',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        productId: 'prod-03',
        quantity: 0,
        reorderPoint: 12,
        locationBin: 'AUD-02-01',
        averageCostCents: dollarsToCents(230.0),
        status: 'out_of_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-airport_prod-04',
        workspaceId: 'demo',
        branchId: 'b-airport',
        productId: 'prod-04',
        quantity: 2,
        reorderPoint: 8,
        locationBin: 'AP-K-04',
        averageCostCents: dollarsToCents(270.0),
        status: 'low_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-westside_prod-05',
        workspaceId: 'demo',
        branchId: 'b-westside',
        productId: 'prod-05',
        quantity: 12,
        reorderPoint: 25,
        locationBin: 'W-08-14',
        averageCostCents: dollarsToCents(42.0),
        status: 'low_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-flagship_prod-06',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        productId: 'prod-06',
        quantity: 5,
        reorderPoint: 15,
        locationBin: 'SSD-01-08',
        averageCostCents: dollarsToCents(85.0),
        status: 'low_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-depot_prod-07',
        workspaceId: 'demo',
        branchId: 'b-depot',
        productId: 'prod-07',
        quantity: 84,
        reorderPoint: 15,
        locationBin: 'WH-C-12',
        averageCostCents: dollarsToCents(85.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-depot_prod-08',
        workspaceId: 'demo',
        branchId: 'b-depot',
        productId: 'prod-08',
        quantity: 36,
        reorderPoint: 10,
        locationBin: 'WH-PAL-04',
        averageCostCents: dollarsToCents(390.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
      {
        id: 'inv_b-westside_prod-09',
        workspaceId: 'demo',
        branchId: 'b-westside',
        productId: 'prod-09',
        quantity: 14,
        reorderPoint: 12,
        locationBin: 'W-02-09',
        averageCostCents: dollarsToCents(92.0),
        status: 'in_stock',
        lastRestockedAt: now,
        updatedAt: now,
      },
    ]

    // 4. Initial Stock Movements
    const movements: StockMovementEntity[] = inventory.map((inv) => ({
      id: `mov_init_${inv.id}`,
      workspaceId: 'demo',
      branchId: inv.branchId,
      productId: inv.productId,
      inventoryId: inv.id,
      type: 'opening_stock',
      quantityDelta: inv.quantity,
      resultingQuantity: inv.quantity,
      unitCostCents: inv.averageCostCents,
      notes: 'Initial opening benchmark inventory',
      createdAt: now,
    }))

    // 5. Purchases (PO)
    const purchases: PurchaseEntity[] = [
      {
        id: 'po-1001',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        orderNumber: 'PO-2026-001',
        supplierName: 'Logitech Direct Distribution',
        status: 'received',
        totalCostCents: dollarsToCents(2900.0),
        orderedAt: '2026-10-10T09:00:00Z',
        receivedAt: '2026-10-12T14:30:00Z',
        createdAt: '2026-10-10T09:00:00Z',
        updatedAt: now,
      },
      {
        id: 'po-1002',
        workspaceId: 'demo',
        branchId: 'b-depot',
        orderNumber: 'PO-2026-002',
        supplierName: 'CalDigit International Supply',
        status: 'received',
        totalCostCents: dollarsToCents(5400.0),
        orderedAt: '2026-10-12T11:00:00Z',
        receivedAt: '2026-10-15T16:00:00Z',
        createdAt: '2026-10-12T11:00:00Z',
        updatedAt: now,
      },
    ]

    const purchaseItems: PurchaseLineItemEntity[] = [
      {
        id: 'poi-1001-1',
        workspaceId: 'demo',
        purchaseId: 'po-1001',
        productId: 'prod-01',
        quantityOrdered: 50,
        quantityReceived: 50,
        unitCostCents: dollarsToCents(58.0),
        totalCostCents: dollarsToCents(2900.0),
      },
      {
        id: 'poi-1002-1',
        workspaceId: 'demo',
        purchaseId: 'po-1002',
        productId: 'prod-04',
        quantityOrdered: 20,
        quantityReceived: 20,
        unitCostCents: dollarsToCents(270.0),
        totalCostCents: dollarsToCents(5400.0),
      },
    ]

    // 6. Sales Orders
    const sales: SaleEntity[] = [
      {
        id: 'sale-9041',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        receiptNumber: 'REC-2026-9041',
        subtotalCents: dollarsToCents(318.99),
        discountCents: 0,
        taxCents: dollarsToCents(25.52),
        totalCents: dollarsToCents(344.51),
        totalCostCents: dollarsToCents(193.0),
        netProfitCents: dollarsToCents(125.99),
        paymentMethod: 'NFC / Apple Pay',
        status: 'completed',
        createdAt: now,
      },
      {
        id: 'sale-9040',
        workspaceId: 'demo',
        branchId: 'b-westside',
        receiptNumber: 'REC-2026-9040',
        subtotalCents: dollarsToCents(79.99),
        discountCents: 0,
        taxCents: dollarsToCents(6.4),
        totalCents: dollarsToCents(86.39),
        totalCostCents: dollarsToCents(42.0),
        netProfitCents: dollarsToCents(37.99),
        paymentMethod: 'Card',
        status: 'completed',
        createdAt: now,
      },
      {
        id: 'sale-9039',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        receiptNumber: 'REC-2026-9039',
        subtotalCents: dollarsToCents(519.98),
        discountCents: 0,
        taxCents: dollarsToCents(41.6),
        totalCents: dollarsToCents(561.58),
        totalCostCents: dollarsToCents(321.58),
        netProfitCents: dollarsToCents(198.4),
        paymentMethod: 'Card',
        status: 'completed',
        createdAt: now,
      },
      {
        id: 'sale-9038',
        workspaceId: 'demo',
        branchId: 'b-airport',
        receiptNumber: 'REC-2026-9038',
        subtotalCents: dollarsToCents(399.95),
        discountCents: 0,
        taxCents: dollarsToCents(32.0),
        totalCents: dollarsToCents(431.95),
        totalCostCents: dollarsToCents(270.0),
        netProfitCents: dollarsToCents(129.95),
        paymentMethod: 'NFC / Apple Pay',
        status: 'completed',
        createdAt: now,
      },
      {
        id: 'sale-9037',
        workspaceId: 'demo',
        branchId: 'b-depot',
        receiptNumber: 'REC-2026-9037',
        subtotalCents: dollarsToCents(1240.0),
        discountCents: 0,
        taxCents: dollarsToCents(99.2),
        totalCents: dollarsToCents(1339.2),
        totalCostCents: dollarsToCents(858.0),
        netProfitCents: dollarsToCents(382.0),
        paymentMethod: 'Store Credit',
        status: 'completed',
        createdAt: now,
      },
    ]

    const saleItems: SaleLineItemEntity[] = [
      {
        id: 'sli-9041-1',
        workspaceId: 'demo',
        saleId: 'sale-9041',
        productId: 'prod-01',
        productName: 'Logitech MX Master 3S Wireless Mouse',
        sku: 'SKU-8921-X',
        quantity: 1,
        unitSellingPricePaise: dollarsToCents(99.99),
        unitSellingPriceCents: dollarsToCents(99.99),
        unitCostSnapshotPaise: dollarsToCents(58.0),
        unitCostSnapshotCents: dollarsToCents(58.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(99.99),
        totalCents: dollarsToCents(99.99),
      },
      {
        id: 'sli-9041-2',
        workspaceId: 'demo',
        saleId: 'sale-9041',
        productId: 'prod-02',
        productName: 'Keychron Q1 Pro Mechanical Keyboard',
        sku: 'SKU-1092-K',
        quantity: 1,
        unitSellingPricePaise: dollarsToCents(219.0),
        unitSellingPriceCents: dollarsToCents(219.0),
        unitCostSnapshotPaise: dollarsToCents(135.0),
        unitCostSnapshotCents: dollarsToCents(135.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(219.0),
        totalCents: dollarsToCents(219.0),
      },
      {
        id: 'sli-9040-1',
        workspaceId: 'demo',
        saleId: 'sale-9040',
        productId: 'prod-05',
        productName: 'Anker Prime 100W GaN Wall Charger',
        sku: 'SKU-4410-B',
        quantity: 1,
        unitSellingPricePaise: dollarsToCents(79.99),
        unitSellingPriceCents: dollarsToCents(79.99),
        unitCostSnapshotPaise: dollarsToCents(42.0),
        unitCostSnapshotCents: dollarsToCents(42.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(79.99),
        totalCents: dollarsToCents(79.99),
      },
      {
        id: 'sli-9039-1',
        workspaceId: 'demo',
        saleId: 'sale-9039',
        productId: 'prod-06',
        productName: 'SanDisk Extreme Pro 1TB Portable SSD',
        sku: 'SKU-5521-P',
        quantity: 2,
        unitSellingPricePaise: dollarsToCents(139.99),
        unitSellingPriceCents: dollarsToCents(139.99),
        unitCostSnapshotPaise: dollarsToCents(85.0),
        unitCostSnapshotCents: dollarsToCents(85.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(279.98),
        totalCents: dollarsToCents(279.98),
      },
      {
        id: 'sli-9039-2',
        workspaceId: 'demo',
        saleId: 'sale-9039',
        productId: 'prod-02',
        productName: 'Keychron Q1 Pro Mechanical Keyboard',
        sku: 'SKU-1092-K',
        quantity: 1,
        unitSellingPricePaise: dollarsToCents(219.0),
        unitSellingPriceCents: dollarsToCents(219.0),
        unitCostSnapshotPaise: dollarsToCents(135.0),
        unitCostSnapshotCents: dollarsToCents(135.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(219.0),
        totalCents: dollarsToCents(219.0),
      },
      {
        id: 'sli-9038-1',
        workspaceId: 'demo',
        saleId: 'sale-9038',
        productId: 'prod-04',
        productName: 'CalDigit TS4 Thunderbolt 4 Docking Station',
        sku: 'SKU-7734-L',
        quantity: 1,
        unitSellingPricePaise: dollarsToCents(399.95),
        unitSellingPriceCents: dollarsToCents(399.95),
        unitCostSnapshotPaise: dollarsToCents(270.0),
        unitCostSnapshotCents: dollarsToCents(270.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(399.95),
        totalCents: dollarsToCents(399.95),
      },
      {
        id: 'sli-9037-1',
        workspaceId: 'demo',
        saleId: 'sale-9037',
        productId: 'prod-08',
        productName: 'Dell UltraSharp 27 4K USB-C Hub Monitor',
        sku: 'SKU-6210-D',
        quantity: 2,
        unitSellingPricePaise: dollarsToCents(579.99),
        unitSellingPriceCents: dollarsToCents(579.99),
        unitCostSnapshotPaise: dollarsToCents(390.0),
        unitCostSnapshotCents: dollarsToCents(390.0),
        discountPaise: 0,
        discountCents: 0,
        totalPaise: dollarsToCents(1159.98),
        totalCents: dollarsToCents(1159.98),
      },
    ]

    // 7. Operating Expenses
    const expenses: OperatingExpenseEntity[] = [
      {
        id: 'exp-101',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        category: 'Rent & Facilities',
        description: 'Monthly commercial retail lease - Downtown Flagship',
        amountPaise: dollarsToCents(3800.0),
        amountCents: dollarsToCents(3800.0),
        date: '2026-10-01',
        paymentMethod: 'Bank Wire',
        createdAt: now,
      },
      {
        id: 'exp-102',
        workspaceId: 'demo',
        branchId: 'b-flagship',
        category: 'Payroll & Staff',
        description: 'Retail store shift payroll - Sarah Jenkins team',
        amountPaise: dollarsToCents(3400.0),
        amountCents: dollarsToCents(3400.0),
        date: '2026-10-15',
        paymentMethod: 'Direct Deposit',
        createdAt: now,
      },
      {
        id: 'exp-103',
        workspaceId: 'demo',
        branchId: 'b-westside',
        category: 'Rent & Facilities',
        description: 'Westside Commerce Hub promenade lease',
        amountPaise: dollarsToCents(2600.0),
        amountCents: dollarsToCents(2600.0),
        date: '2026-10-01',
        paymentMethod: 'Bank Wire',
        createdAt: now,
      },
      {
        id: 'exp-104',
        workspaceId: 'demo',
        branchId: 'b-westside',
        category: 'Payroll & Staff',
        description: 'Westside store associate payroll',
        amountPaise: dollarsToCents(2400.0),
        amountCents: dollarsToCents(2400.0),
        date: '2026-10-15',
        paymentMethod: 'Direct Deposit',
        createdAt: now,
      },
      {
        id: 'exp-105',
        workspaceId: 'demo',
        branchId: 'b-airport',
        category: 'Rent & Facilities',
        description: 'Terminal 2 concourse kiosk license fee',
        amountPaise: dollarsToCents(1800.0),
        amountCents: dollarsToCents(1800.0),
        date: '2026-10-01',
        paymentMethod: 'ACH',
        createdAt: now,
      },
      {
        id: 'exp-106',
        workspaceId: 'demo',
        branchId: 'b-depot',
        category: 'Utilities & Internet',
        description: 'Warehouse three-phase power & high-bandwidth fiber',
        amountPaise: dollarsToCents(820.0),
        amountCents: dollarsToCents(820.0),
        date: '2026-10-05',
        paymentMethod: 'Card',
        createdAt: now,
      },
    ]

    // Batch write to IndexedDB
    const tx = db.transaction(
      [
        'branches',
        'products',
        'inventory',
        'stockMovements',
        'purchases',
        'purchaseLineItems',
        'sales',
        'saleLineItems',
        'operatingExpenses',
      ],
      'readwrite'
    )

    for (const b of branches) await tx.objectStore('branches').put(b)
    for (const p of products) {
      const cost = p.costPricePaise ?? p.costPriceCents ?? 0
      const sell = p.sellingPricePaise ?? p.sellingPriceCents ?? 0
      await tx.objectStore('products').put({
        ...p,
        costPricePaise: cost,
        costPriceCents: cost,
        sellingPricePaise: sell,
        sellingPriceCents: sell,
      })
    }
    for (const i of inventory) {
      const cost = i.averageCostPaise ?? i.averageCostCents ?? 0
      await tx.objectStore('inventory').put({
        ...i,
        averageCostPaise: cost,
        averageCostCents: cost,
        quantityOnHand: i.quantityOnHand !== undefined ? i.quantityOnHand : i.quantity,
      })
    }
    for (const m of movements) {
      const cost = m.unitCostPaise ?? m.unitCostCents ?? 0
      await tx.objectStore('stockMovements').put({
        ...m,
        unitCostPaise: cost,
        unitCostCents: cost,
      })
    }
    for (const po of purchases) {
      const cost = po.totalCostPaise ?? po.totalCostCents ?? 0
      await tx.objectStore('purchases').put({
        ...po,
        totalCostPaise: cost,
        totalCostCents: cost,
      })
    }
    for (const poi of purchaseItems) {
      const unit = poi.unitCostPaise ?? poi.unitCostCents ?? 0
      const total = poi.totalCostPaise ?? poi.totalCostCents ?? 0
      await tx.objectStore('purchaseLineItems').put({
        ...poi,
        unitCostPaise: unit,
        unitCostCents: unit,
        totalCostPaise: total,
        totalCostCents: total,
      })
    }
    for (const s of sales) {
      const subtotal = s.subtotalPaise ?? s.subtotalCents ?? 0
      const discount = s.discountPaise ?? s.discountCents ?? 0
      const tax = s.taxPaise ?? s.taxCents ?? 0
      const total = s.totalPaise ?? s.totalCents ?? 0
      const totalCost = s.totalCostPaise ?? s.totalCostCents ?? 0
      const netProfit = s.netProfitPaise ?? s.netProfitCents ?? 0
      await tx.objectStore('sales').put({
        ...s,
        subtotalPaise: subtotal,
        subtotalCents: subtotal,
        discountPaise: discount,
        discountCents: discount,
        taxPaise: tax,
        taxCents: tax,
        totalPaise: total,
        totalCents: total,
        totalCostPaise: totalCost,
        totalCostCents: totalCost,
        netProfitPaise: netProfit,
        netProfitCents: netProfit,
      })
    }
    for (const sli of saleItems) {
      const sell = sli.unitSellingPricePaise ?? sli.unitSellingPriceCents ?? 0
      const cost = sli.unitCostSnapshotPaise ?? sli.unitCostSnapshotCents ?? 0
      const discount = sli.discountPaise ?? sli.discountCents ?? 0
      const total = sli.totalPaise ?? sli.totalCents ?? 0
      await tx.objectStore('saleLineItems').put({
        ...sli,
        unitSellingPricePaise: sell,
        unitSellingPriceCents: sell,
        unitCostSnapshotPaise: cost,
        unitCostSnapshotCents: cost,
        discountPaise: discount,
        discountCents: discount,
        totalPaise: total,
        totalCents: total,
      })
    }
    for (const e of expenses) {
      const amt = e.amountPaise ?? e.amountCents ?? 0
      await tx.objectStore('operatingExpenses').put({
        ...e,
        amountPaise: amt,
        amountCents: amt,
      })
    }

    await tx.done
  },

  async seedDemoData(_workspaceId = 'demo'): Promise<void> {
    return this.seedDemoWorkspace()
  },

  async resetDemoData(): Promise<void> {
    return this.resetDemoWorkspace()
  },
}

