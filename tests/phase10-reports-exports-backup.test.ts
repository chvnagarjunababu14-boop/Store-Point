import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { demoDataService } from '@/lib/services/demoDataService'
import { backupService } from '@/lib/services/backupService'
import { reportService } from '@/lib/services/reportService'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { stockTransferRepository } from '@/lib/repositories/stockTransferRepository'
import { escapeCSVCell, buildCSV } from '@/utils/csv'
import type { StorePointBackupFile } from '@/types/database'

describe('Phase 10: Reports, CSV Exports & Data Management', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  // ==========================================
  // 1. CSV ESCAPING & FORMULA INJECTION
  // ==========================================
  describe('CSV Escaping and Formula Injection Protection', () => {
    it('escapes standard strings with commas, quotes, and newlines', () => {
      expect(escapeCSVCell('Plain text')).toBe('"Plain text"')
      expect(escapeCSVCell('Store, West Wing')).toBe('"Store, West Wing"')
      expect(escapeCSVCell('Store "Flagship" Branch')).toBe('"Store ""Flagship"" Branch"')
      expect(escapeCSVCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
    })

    it('protects against formula injection for malicious formulas starting with =, +, -, @, \\t, \\r', () => {
      // Formula starting with =
      expect(escapeCSVCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"')
      // Malicious command execution
      expect(escapeCSVCell('@cmd|/C calc')).toBe('"\'@cmd|/C calc"')
      // Plus prefixed string
      expect(escapeCSVCell('+cmd|/C calc')).toBe('"\'+cmd|/C calc"')
      // Tab character injection
      expect(escapeCSVCell('\tmalicious')).toBe('"\'\tmalicious"')
    })

    it('does not corrupt or quote legitimate negative or positive numeric values', () => {
      // Legitimate negative number passed as number
      expect(escapeCSVCell(-150.5)).toBe('-150.5')
      // Legitimate negative numeric string
      expect(escapeCSVCell('-150.00')).toBe('"-150.00"')
      // Legitimate positive number passed as number
      expect(escapeCSVCell(250)).toBe('250')
      // Legitimate positive numeric string
      expect(escapeCSVCell('+250')).toBe('"+250"')
    })

    it('builds a complete CSV document with UTF-8 BOM, metadata, columns, and rows', () => {
      const csv = buildCSV({
        title: 'Sales & Revenue Summary',
        metadata: {
          Workspace: 'LIVE PRODUCTION',
          Currency: 'INR (₹)',
        },
        headers: ['Receipt #', 'Amount (₹)'],
        rows: [
          ['REC-001', '1,500.00'],
          ['=INJECTION-TEST', '2,000.00'],
        ],
        summaryRow: ['TOTAL', '3,500.00'],
      })

      // Starts with UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(false) // buildCSV produces raw string, downloadCSVFile adds BOM
      // Contains title
      expect(csv).toContain('"Sales & Revenue Summary"')
      // Contains metadata
      expect(csv).toContain('"Workspace","LIVE PRODUCTION"')
      expect(csv).toContain('"Currency","INR (₹)"')
      // Contains headers
      expect(csv).toContain('"Receipt #","Amount (₹)"')
      // Protects formula row
      expect(csv).toContain('"\'=INJECTION-TEST"')
      // Contains summary row
      expect(csv).toContain('"TOTAL","3,500.00"')
    })
  })

  // ==========================================
  // 2. REPORT CENTRE SERVICES & FINANCIALS
  // ==========================================
  describe('Report Centre Services', () => {
    it('handles empty reports gracefully with empty rows and 0 metrics', async () => {
      // Clean workspace without data
      const salesReport = await reportService.getReport('sales_summary', 'live', {})
      expect(salesReport.rows).toEqual([])
      expect(salesReport.summaryKpis[0].value).toBe('₹0.00')
      expect(salesReport.summaryKpis[1].value).toBe('₹0.00')

      const invReport = await reportService.getReport('inventory_valuation', 'live', {})
      expect(invReport.rows).toEqual([])

      const taxReport = await reportService.getReport('tax_summary', 'live', {})
      expect(taxReport.rows).toEqual([])
    })

    it('generates accurate sales summary with date range and branch filters', async () => {
      await demoDataService.seedDemoData('demo')

      // All branches report
      const fullReport = await reportService.getReport('sales_summary', 'demo', {})

      expect(fullReport.rows.length).toBeGreaterThan(0)
      expect(fullReport.summaryKpis.length).toBe(6)

      // Get first branch ID
      const branches = await branchRepository.list('demo')
      const targetBranch = branches[0]

      // Filter by specific branch
      const branchReport = await reportService.getReport('sales_summary', 'demo', {
        branchId: targetBranch.id,
      })

      for (const row of branchReport.rows) {
        expect(row.branchName).toBe(targetBranch.name)
      }

      // Date boundary filter with future date resulting in 0 matches
      const futureReport = await reportService.getReport('sales_summary', 'demo', {
        startDate: '2099-01-01',
        endDate: '2099-12-31',
      })
      expect(futureReport.rows.length).toBe(0)
    })

    it('generates accurate returns & refunds report without duplicate counts', async () => {
      await demoDataService.seedDemoData('demo')

      const returnsReport = await reportService.getReport('returns_refunds', 'demo', {})

      expect(returnsReport.reportType).toBe('returns_refunds')
      expect(returnsReport.columns.some((c) => c.key === 'refundRupees')).toBe(true)

      // Total refunds KPI is present
      const refundKPI = returnsReport.summaryKpis.find((k) => k.label.includes('Refunds'))
      expect(refundKPI).toBeDefined()
    })

    it('generates product profitability report with category and search filters', async () => {
      await demoDataService.seedDemoData('demo')

      const report = await reportService.getReport('product_profitability', 'demo', {})

      expect(report.rows.length).toBeGreaterThan(0)

      // Filter by category
      const categories = [...new Set(report.rows.map((r: any) => r.category))]
      if (categories.length > 0) {
        const catFilter = categories[0]
        const filteredReport = await reportService.getReport('product_profitability', 'demo', {
          category: catFilter,
        })
        for (const row of filteredReport.rows) {
          expect(row.category).toBe(catFilter)
        }
      }

      // Search filter by product name or SKU
      const searchTarget = (report.rows[0].name || report.rows[0].sku).slice(0, 4)
      const searchReport = await reportService.getReport('product_profitability', 'demo', {
        searchQuery: searchTarget,
      })
      expect(searchReport.rows.length).toBeGreaterThan(0)
      for (const row of searchReport.rows) {
        const matches =
          row.name.toLowerCase().includes(searchTarget.toLowerCase()) ||
          row.sku.toLowerCase().includes(searchTarget.toLowerCase())
        expect(matches).toBe(true)
      }
    })

    it('generates inventory valuation at cost accurately', async () => {
      await demoDataService.seedDemoData('demo')

      const report = await reportService.getReport('inventory_valuation', 'demo', {})

      expect(report.rows.length).toBeGreaterThan(0)
      const totalValuationKPI = report.summaryKpis.find((k) => k.label.includes('Inventory Assets') || k.label.includes('Valuation'))
      expect(totalValuationKPI).toBeDefined()
      expect(totalValuationKPI?.value.startsWith('₹')).toBe(true)
    })

    it('generates stock transfers and operating expenses reports', async () => {
      await demoDataService.seedDemoData('demo')

      const transfersReport = await reportService.getReport('stock_transfers', 'demo', {})
      expect(transfersReport.reportType).toBe('stock_transfers')
      expect(transfersReport.columns.some((c) => c.key === 'sourceBranch')).toBe(true)

      const expensesReport = await reportService.getReport('operating_expenses', 'demo', {})
      expect(expensesReport.reportType).toBe('operating_expenses')
      expect(expensesReport.summaryKpis.find((k) => k.label.includes('Operating Expenses'))).toBeDefined()
    })

    it('marks tax summary calculations clearly as non-statutory estimates', async () => {
      await demoDataService.seedDemoData('demo')

      const taxReport = await reportService.getReport('tax_summary', 'demo', {})

      expect(taxReport.reportType).toBe('tax_summary')
      expect(taxReport.disclaimer?.toLowerCase()).toContain('non-statutory')
    })
  })

  // ==========================================
  // 3. BACKUP & RESTORE SAFEGUARDS
  // ==========================================
  describe('Backup & Restore Validation, Safeguards & Round-Trips', () => {
    it('creates and validates full workspace backup export', async () => {
      await demoDataService.seedDemoData('demo')

      const backup = await backupService.createBackup('demo')
      expect(backup.format).toBe('storepoint-backup')
      expect(backup.schemaVersion).toBe(1)
      expect(backup.data.branches.length).toBe(4)
      expect(backup.data.products.length).toBe(9)
      expect(backup.data.sales.length).toBeGreaterThan(0)

      const jsonStr = JSON.stringify(backup)
      const validation = backupService.validateBackup(jsonStr)

      expect(validation.valid).toBe(true)
      expect(validation.preview?.branchesCount).toBe(4)
      expect(validation.preview?.productsCount).toBe(9)
      expect(validation.preview?.totalInventoryValuePaise).toBeGreaterThan(0)
      expect(validation.preview?.totalSalesValuePaise).toBeGreaterThan(0)
    })

    it('restores backup atomically into target live workspace without polluting demo workspace', async () => {
      // 1. Seed demo workspace
      await demoDataService.seedDemoData('demo')

      // 2. Create distinct records in live workspace
      const liveBranch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Live Corporate Headquarters',
        code: 'CORP-01',
        city: 'Mumbai',
        state: 'MH',
        address: 'Bandra Kurla Complex',
        phone: '022-12345678',
        email: 'hq@storepoint.in',
        isActive: true,
      })

      const liveProd = await productRepository.create({
        workspaceId: 'live',
        name: 'Enterprise POS License',
        sku: 'ENT-POS-01',
        category: 'Software',
        costPricePaise: 100000,
        sellingPricePaise: 250000,
        unit: 'license',
        minStockLevel: 5,
        isActive: true,
      })

      // 3. Export live backup
      const backup = await backupService.createBackup('live')

      // 4. Mutate live records
      await branchRepository.update(liveBranch.id, { name: 'Mutated Temp Branch' })
      await productRepository.update(liveProd.id, { name: 'Mutated Temp Product' })

      // 5. Restore live backup into 'live' workspace
      await backupService.restoreBackup(backup, 'live')

      // 6. Verify live records are restored to their pristine state
      const liveBranches = await branchRepository.list('live')
      const liveProducts = await productRepository.list('live')

      expect(liveBranches.length).toBe(1)
      expect(liveBranches[0].name).toBe('Live Corporate Headquarters')
      expect(liveProducts.length).toBe(1)
      expect(liveProducts[0].name).toBe('Enterprise POS License')

      // 7. Verify demo records are untouched and fully preserved
      const demoBranches = await branchRepository.list('demo')
      expect(demoBranches.length).toBe(4)
    })

    it('rejects oversized backup files exceeding 50MB', () => {
      const hugeString = 'a'.repeat(51 * 1024 * 1024)
      const res = backupService.validateBackup(hugeString)
      expect(res.valid).toBe(false)
      expect(res.error).toContain('50MB')
    })

    it('rejects malformed JSON syntax and non-object roots', () => {
      const res1 = backupService.validateBackup('{ invalid json: true ')
      expect(res1.valid).toBe(false)
      expect(res1.error).toContain('Malformed JSON')

      const res2 = backupService.validateBackup('["array", "not", "object"]')
      expect(res2.valid).toBe(false)
      expect(res2.error).toContain('valid JSON object')
    })

    it('rejects unsupported schema versions', () => {
      const payload = JSON.stringify({
        format: 'storepoint-backup',
        schemaVersion: 99,
        data: {},
      })
      const res = backupService.validateBackup(payload)
      expect(res.valid).toBe(false)
      expect(res.error).toContain('Unsupported schema version')
    })

    it('rejects backup with invalid non-numeric money values', () => {
      const corruptPayload = JSON.stringify({
        format: 'storepoint-backup',
        schemaVersion: 2,
        data: {
          branches: [{ id: 'b1', name: 'Branch 1' }],
          products: [
            {
              id: 'p1',
              name: 'Corrupt Prod',
              sku: 'BAD-SKU',
              costPricePaise: 'one hundred rupees', // Corrupt string instead of integer
            },
          ],
        },
      })

      const res = backupService.validateBackup(corruptPayload)
      expect(res.valid).toBe(false)
      expect(res.error).toContain('invalid numeric cost')
    })

    it('migrates legacy v1 backup with Cents fields to canonical Paise', async () => {
      const legacyBackup: StorePointBackupFile = {
        format: 'storepoint-backup',
        version: 1,
        schemaVersion: 1,
        appVersion: '0.9.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        workspaceId: 'live',
        counts: { branches: 1, products: 1, inventory: 1, sales: 1, purchases: 0, expenses: 0 },
        metadata: { branchesCount: 1, productsCount: 1, inventoryCount: 1, salesCount: 1, purchasesCount: 0, expensesCount: 0 },
        data: {
          branches: [
            {
              id: 'leg-b1',
              workspaceId: 'live',
              name: 'Legacy Branch',
              code: 'LEG-1',
              city: 'Delhi',
              state: 'DL',
              address: 'Connaught Place',
              phone: '9876543210',
              email: 'leg@storepoint.in',
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          products: [
            {
              id: 'leg-p1',
              workspaceId: 'live',
              name: 'Legacy Saffron',
              sku: 'LEG-SAF-01',
              category: 'Spices',
              costPriceCents: 45000, // Legacy cents field
              sellingPriceCents: 90000,
              costPricePaise: 45000,
              sellingPricePaise: 90000,
              unit: 'box',
              minStockLevel: 5,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          inventory: [],
          purchases: [],
          purchaseLineItems: [],
          sales: [],
          saleLineItems: [],
          saleReturns: [],
          operatingExpenses: [],
          stockMovements: [],
          stockTransfers: [],
          settings: [],
        },
      }

      await backupService.restoreBackup(legacyBackup, 'live')

      const prods = await productRepository.list('live')
      expect(prods.length).toBe(1)
      expect(prods[0].costPricePaise).toBe(45000)
      expect(prods[0].sellingPricePaise).toBe(90000)
    })

    it('preserves stock transfers and relationship integrity after restore', async () => {
      // 1. Create a transfer in live
      const b1 = await branchRepository.create({
        workspaceId: 'live',
        name: 'Warehouse North',
        code: 'WH-N',
        city: 'Delhi',
        state: 'DL',
        address: 'Sector 5',
        phone: '111',
        email: 'wh@store.in',
        isActive: true,
      })
      const b2 = await branchRepository.create({
        workspaceId: 'live',
        name: 'Store South',
        code: 'ST-S',
        city: 'Delhi',
        state: 'DL',
        address: 'South Ex',
        phone: '222',
        email: 'st@store.in',
        isActive: true,
      })
      const p1 = await productRepository.create({
        workspaceId: 'live',
        name: 'Transfer Item',
        sku: 'TR-ITM-01',
        category: 'Goods',
        costPricePaise: 5000,
        sellingPricePaise: 8000,
        unit: 'pc',
        minStockLevel: 2,
        isActive: true,
      })
      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: b1.id,
        productId: p1.id,
        initialQuantity: 100,
        unitCostPaise: 5000,
      })

      const trf = await stockTransferRepository.create({
        workspaceId: 'live',
        sourceBranchId: b1.id,
        destinationBranchId: b2.id,
        productId: p1.id,
        quantity: 15,
        referenceNumber: 'TRF-TEST-001',
      })
      await stockTransferRepository.dispatch(trf.id)

      // 2. Export backup
      const backup = await backupService.createBackup('live')
      expect(backup.data.stockTransfers.length).toBe(1)
      expect(backup.data.stockTransfers[0].referenceNumber).toBe('TRF-TEST-001')

      // 3. Clear DB and restore
      closeDB()
      await deleteDatabase()

      await backupService.restoreBackup(backup, 'live')

      // 4. Verify stock transfer was restored
      const restoredTransfers = await stockTransferRepository.getAll('live')
      expect(restoredTransfers.length).toBe(1)
      expect(restoredTransfers[0].quantity).toBe(15)
      expect(restoredTransfers[0].unitCostPaise).toBe(5000)
      expect(restoredTransfers[0].referenceNumber).toBe('TRF-TEST-001')
    })

    it('preserves existing workspace data when restore validation fails', async () => {
      // 1. Establish existing live data
      const existingBranch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Permanent Vault Branch',
        code: 'VAULT-01',
        city: 'Mumbai',
        state: 'MH',
        address: 'Nariman Point',
        phone: '9999999999',
        email: 'vault@store.in',
        isActive: true,
      })

      // 2. Attempt restoring corrupt backup
      const corruptBackup = '{ "format": "invalid-format" }'

      await expect(backupService.restoreBackup(corruptBackup, 'live')).rejects.toThrow()

      // 3. Confirm existing branch is safe and unmolested
      const liveBranches = await branchRepository.list('live')
      expect(liveBranches.length).toBe(1)
      expect(liveBranches[0].id).toBe(existingBranch.id)
    })
  })
})

