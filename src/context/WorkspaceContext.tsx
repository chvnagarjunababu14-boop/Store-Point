import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { WorkspaceId } from '@/types/database'
import { settingsRepository } from '@/lib/repositories/settingsRepository'
import { demoDataService } from '@/lib/services/demoDataService'

interface WorkspaceContextValue {
  workspaceMode: WorkspaceId
  setWorkspaceMode: (mode: WorkspaceId) => Promise<void>
  activeBranchId: string
  setActiveBranchId: (id: string) => void
  isFirstRun: boolean
  isInitialized: boolean
  chooseInitialWorkspace: (mode: WorkspaceId) => Promise<void>
  resetDemoWorkspace: () => Promise<void>
  refreshKey: number
  notifyDataChanged: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceId>('demo')
  const [activeBranchId, setActiveBranchId] = useState<string>('all')
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // Initialize workspace settings from IndexedDB
  useEffect(() => {
    async function init() {
      try {
        const savedMode = await settingsRepository.get<WorkspaceId | null>('activeWorkspaceId', null)
        const hasCompletedSetup = await settingsRepository.get<boolean>('hasCompletedFirstRun', false)

        if (!hasCompletedSetup) {
          setIsFirstRun(true)
        } else {
          setWorkspaceModeState(savedMode || 'demo')
        }

        // If in demo mode and demo has never been seeded, automatically seed it
        if (savedMode === 'demo' || !savedMode) {
          const isSeeded = await demoDataService.isDemoSeeded()
          if (!isSeeded && hasCompletedSetup) {
            await demoDataService.seedDemoWorkspace()
          }
        }
      } catch (err) {
        console.error('Failed to initialize workspace from IndexedDB:', err)
      } finally {
        setIsInitialized(true)
      }
    }
    init()
  }, [])

  const notifyDataChanged = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const setWorkspaceMode = async (mode: WorkspaceId) => {
    setWorkspaceModeState(mode)
    setActiveBranchId('all')
    await settingsRepository.set('activeWorkspaceId', mode)
    notifyDataChanged()
  }

  const chooseInitialWorkspace = async (mode: WorkspaceId) => {
    if (mode === 'demo') {
      const isSeeded = await demoDataService.isDemoSeeded()
      if (!isSeeded) {
        await demoDataService.seedDemoWorkspace()
      }
    }
    await settingsRepository.set('activeWorkspaceId', mode)
    await settingsRepository.set('hasCompletedFirstRun', true)
    setWorkspaceModeState(mode)
    setIsFirstRun(false)
    notifyDataChanged()
  }

  const resetDemoWorkspace = async () => {
    await demoDataService.seedDemoWorkspace()
    setActiveBranchId('all')
    notifyDataChanged()
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceMode,
        setWorkspaceMode,
        activeBranchId,
        setActiveBranchId,
        isFirstRun,
        isInitialized,
        chooseInitialWorkspace,
        resetDemoWorkspace,
        refreshKey,
        notifyDataChanged,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return ctx
}
