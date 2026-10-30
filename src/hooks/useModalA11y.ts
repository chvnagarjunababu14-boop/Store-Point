import { useEffect, useRef } from 'react'

export interface UseModalA11yOptions {
  isOpen: boolean
  onClose: () => void
  containerRef?: React.RefObject<HTMLElement | null>
  closeOnEscape?: boolean
  lockScroll?: boolean
}

/**
 * Accessibility hook for accessible modal dialogs:
 * 1. Closes modal on Escape key press.
 * 2. Traps keyboard focus within focusable children inside container.
 * 3. Restores focus to trigger element when dialog closes.
 * 4. Optionally locks background document scrolling.
 *
 * Supports two calling conventions:
 * - `useModalA11y({ isOpen, onClose, containerRef })`
 * - `const ref = useModalA11y(isOpen, onClose)`
 */
export function useModalA11y(options: UseModalA11yOptions): void
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void
): React.RefObject<HTMLDivElement | null>
export function useModalA11y(
  optionsOrIsOpen: UseModalA11yOptions | boolean,
  maybeOnClose?: () => void
): React.RefObject<HTMLDivElement | null> | void {
  const isOptions = typeof optionsOrIsOpen === 'object' && optionsOrIsOpen !== null
  const isOpen = isOptions ? optionsOrIsOpen.isOpen : Boolean(optionsOrIsOpen)
  const onClose = isOptions ? optionsOrIsOpen.onClose : maybeOnClose || (() => {})
  const closeOnEscape = isOptions ? optionsOrIsOpen.closeOnEscape ?? true : true
  const lockScroll = isOptions ? optionsOrIsOpen.lockScroll ?? true : true

  const internalRef = useRef<HTMLDivElement | null>(null)
  const containerRef = isOptions && optionsOrIsOpen.containerRef ? optionsOrIsOpen.containerRef : internalRef

  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement | null

    // Optionally lock body scroll
    if (lockScroll) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
        // Restore focus on close
        previousFocusRef.current?.focus?.()
      }
    } else {
      return () => {
        previousFocusRef.current?.focus?.()
      }
    }
  }, [isOpen, lockScroll])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Escape key handling
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }

      // 2. Focus trapping
      if (e.key === 'Tab' && containerRef?.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, containerRef, closeOnEscape])

  if (!isOptions) {
    return internalRef
  }
}
