import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  reportService,
  type ReportType,
  type ReportFilterOptions,
  type ReportData,
} from '@/lib/services/reportService'
import { getDateRangeFromPreset, type DatePreset } from '@/lib/services/financialCalculationService'
import { buildCSV, downloadCSVFile } from '@/utils/csv'

export interface UseReportsOptions {
  initialReportType?: ReportType
  initialBranchId?: string
}

export function useReports(options: UseReportsOptions = {}) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey } = useWorkspace()

  const [reportType, setReportType] = useState<ReportType>(options.initialReportType || 'sales_summary')
  const [selectedBranchId, setSelectedBranchId] = useState<string>(options.initialBranchId || contextBranchId || 'all')
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Compute active date boundaries
  const activeDateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      }
    }
    return getDateRangeFromPreset(datePreset)
  }, [datePreset, customStartDate, customEndDate])

  const filterOptions: ReportFilterOptions = useMemo(
    () => ({
      branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
      startDate: activeDateRange.startDate,
      endDate: activeDateRange.endDate,
      searchQuery,
      category: categoryFilter,
      status: statusFilter,
    }),
    [selectedBranchId, activeDateRange, searchQuery, categoryFilter, statusFilter]
  )

  const loadReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reportService.getReport(reportType, workspaceMode, filterOptions)
      setReportData(data)
    } catch (err) {
      console.error('Failed to load report:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [reportType, workspaceMode, filterOptions])

  useEffect(() => {
    loadReport()
  }, [loadReport, refreshKey])

  // Trigger CSV export
  const exportCSV = useCallback(() => {
    if (!reportData) return

    const { csvData, title, periodLabel, branchLabel, generatedAt } = reportData

    const csvContent = buildCSV({
      title: `StorePoint Financial & Operational Report: ${title}`,
      metadata: {
        'Workspace': workspaceMode.toUpperCase(),
        'Report Period': periodLabel,
        'Branch Scope': branchLabel,
        'Generated At': generatedAt,
        'Currency': 'INR (₹)',
        'Accounting Convention': 'Integer Paise Canonical Model',
      },
      headers: csvData.headers,
      rows: csvData.rows,
      summaryRow: csvData.summaryRow,
    })

    const safeDate = (activeDateRange.startDate || 'all') + '_to_' + (activeDateRange.endDate || 'now')
    const filename = `storepoint_${reportType}_${selectedBranchId}_${safeDate}.csv`
    downloadCSVFile(filename, csvContent)
  }, [reportData, workspaceMode, selectedBranchId, activeDateRange, reportType])

  return {
    reportType,
    setReportType,
    selectedBranchId,
    setSelectedBranchId,
    datePreset,
    setDatePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    reportData,
    loading,
    error,
    refresh: loadReport,
    exportCSV,
  }
}
