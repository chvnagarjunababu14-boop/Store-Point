import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { demoDataService } from '@/lib/services/demoDataService'
import { backupService } from '@/lib/services/backupService'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'

describe('Demo Data Seeding & Workspace Backup/Restore', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  it('seeds demo data idempotently without duplicate records when run multiple times', async () => {
    // First seed
    await demoDataService.seedDemoData('demo')

    const branchesFirst = await branchRepository.list('demo')
    const productsFirst = await productRepository.list('demo')
    const expensesFirst = await expenseRepository.list('demo')

    expect(branchesFirst.length).toBe(4)
    expect(productsFirst.length).toBe(9)
    expect(expensesFirst.length).toBeGreaterThan(0)

    // Second seed (idempotent call)
    await demoDataService.seedDemoData('demo')

    const branchesSecond = await branchRepository.list('demo')
    const productsSecond = await productRepository.list('demo')
    const expensesSecond = await expenseRepository.list('demo')

    expect(branchesSecond.length).toBe(4)
    expect(productsSecond.length).toBe(9)
    expect(expensesSecond.length).toBe(expensesFirst.length)
  })

  it('resets demo workspace safely without touching live workspace records', async () => {
    // 1. Seed demo workspace
    await demoDataService.seedDemoData('demo')

    // 2. Add real records in live workspace
    const liveBranch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Real Flagship Inc',
      code: 'LIVE-01',
      city: 'Chicago',
      state: 'IL',
      address: '233 S Wacker Dr',
      phone: '312-555-0100',
      email: 'live@realbusiness.com',
      isActive: true,
    })

    const liveProd = await productRepository.create({
      workspaceId: 'live',
      name: 'Real Proprietary Widget',
      sku: 'REAL-WDG-01',
      category: 'Hardware',
      costPriceCents: 5000,
      sellingPriceCents: 12000,
      reorderPoint: 10,
      isActive: true,
    })

    // 3. Reset demo workspace
    await demoDataService.resetDemoData()

    // 4. Verify demo workspace was re-seeded to original demo count
    const demoBranches = await branchRepository.list('demo')
    expect(demoBranches.length).toBe(4)

    // 5. Verify live workspace is completely intact and untouched!
    const liveBranches = await branchRepository.list('live')
    expect(liveBranches.length).toBe(1)
    expect(liveBranches[0].id).toBe(liveBranch.id)
    expect(liveBranches[0].name).toBe('Real Flagship Inc')

    const liveProducts = await productRepository.list('live')
    expect(liveProducts.length).toBe(1)
    expect(liveProducts[0].id).toBe(liveProd.id)
    expect(liveProducts[0].name).toBe('Real Proprietary Widget')
  })

  it('exports valid versioned JSON backup and validates metadata', async () => {
    await demoDataService.seedDemoData('demo')

    const backupJson = await backupService.exportBackup('demo')
    expect(typeof backupJson).toBe('string')

    const parsed = JSON.parse(backupJson)
    expect(parsed.format).toBe('storepoint-backup')
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.workspaceId).toBe('demo')
    expect(parsed.counts.branches).toBe(4)
    expect(parsed.counts.products).toBe(9)

    // Validate valid backup
    const preview = backupService.validateBackup(backupJson)
    expect(preview.isValid).toBe(true)
    expect(preview.metadata?.branchCount).toBe(4)
    expect(preview.metadata?.productCount).toBe(9)
  })

  it('rejects invalid or corrupted JSON backups with clear errors', () => {
    // Malformed JSON string
    const malformedResult = backupService.validateBackup('{ invalid json syntax')
    expect(malformedResult.isValid).toBe(false)
    expect(malformedResult.errorMessage).toContain('Malformed JSON')

    // Wrong format identifier
    const wrongFormatResult = backupService.validateBackup(
      JSON.stringify({ format: 'random-app', schemaVersion: 1 })
    )
    expect(wrongFormatResult.isValid).toBe(false)
    expect(wrongFormatResult.errorMessage).toContain('Not a recognized StorePoint backup file')

    // Incompatible schema version
    const wrongVersionResult = backupService.validateBackup(
      JSON.stringify({ format: 'storepoint-backup', schemaVersion: 99 })
    )
    expect(wrongVersionResult.isValid).toBe(false)
    expect(wrongVersionResult.errorMessage).toContain('Unsupported schema version')
  })

  it('restores backup atomically into target workspace', async () => {
    // 1. Create a minimal custom workspace
    const customBranch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Backup Test Branch',
      code: 'BTB-01',
      city: 'Austin',
      state: 'TX',
      address: '100 Congress Ave',
      phone: '512-555-0100',
      email: 'test@backup.com',
      isActive: true,
    })

    const customProd = await productRepository.create({
      workspaceId: 'live',
      name: 'Backup Test Product',
      sku: 'BTB-PRD-01',
      category: 'General',
      costPriceCents: 500,
      sellingPriceCents: 1000,
      reorderPoint: 5,
      isActive: true,
    })

    const backupJson = await backupService.exportBackup('live')

    // Clear live workspace by resetting or deleting
    await branchRepository.archive(customBranch.id)
    await productRepository.update(customProd.id, { name: 'Mutated Before Restore' })

    // Restore backup
    await backupService.restoreBackup(backupJson, 'live')

    const restoredBranches = await branchRepository.list('live')
    expect(restoredBranches.length).toBe(1)
    expect(restoredBranches[0].name).toBe('Backup Test Branch')
    expect(restoredBranches[0].isActive).toBe(true)

    const restoredProducts = await productRepository.list('live')
    expect(restoredProducts.length).toBe(1)
    expect(restoredProducts[0].name).toBe('Backup Test Product')
  })
})
