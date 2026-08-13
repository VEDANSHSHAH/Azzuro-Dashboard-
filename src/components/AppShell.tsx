import { useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconButton } from './Button'
import { cx } from './utils'

export interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: string | number
}

export interface SidebarProps {
  items: readonly NavigationItem[]
  activeItem: string
  onNavigate: (id: string) => void
  secondaryItems?: readonly NavigationItem[]
  isOpen?: boolean
  onClose?: () => void
  footer?: ReactNode
  className?: string
}

export function Sidebar({
  items,
  activeItem,
  onNavigate,
  secondaryItems,
  isOpen = false,
  onClose,
  footer,
  className,
}: SidebarProps) {
  function renderNavigationItem(item: NavigationItem) {
    const Icon = item.icon
    const isActive = item.id === activeItem

    return (
      <li key={item.id}>
        <button
          type="button"
          className={cx(
            'sidebar__nav-item',
            isActive && 'sidebar__nav-item--active',
          )}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => {
            onNavigate(item.id)
            onClose?.()
          }}
        >
          <Icon className="sidebar__nav-icon" aria-hidden="true" />
          <span className="sidebar__nav-label">{item.label}</span>
          {item.badge !== undefined ? (
            <span className="sidebar__nav-badge">{item.badge}</span>
          ) : null}
        </button>
      </li>
    )
  }

  return (
    <aside
      className={cx('sidebar', isOpen && 'sidebar--open', className)}
      aria-label="Primary navigation"
    >
      <div className="sidebar__brand-row">
        <div className="sidebar__brand" aria-label="MYWORK AZZURO">
          <span className="sidebar__brand-mark" aria-hidden="true">
            MA
          </span>
          <span className="sidebar__brand-name">
            <strong>MYWORK</strong>
            <span>AZZURO</span>
          </span>
        </div>
        {onClose ? (
          <IconButton
            className="sidebar__mobile-close"
            label="Close navigation"
            icon={X}
            variant="on-dark"
            onClick={onClose}
          />
        ) : null}
      </div>

      <nav className="sidebar__navigation">
        <p className="sidebar__section-label">Workspace</p>
        <ul className="sidebar__nav-list">{items.map(renderNavigationItem)}</ul>
        {secondaryItems?.length ? (
          <>
            <div className="sidebar__divider" />
            <ul className="sidebar__nav-list">
              {secondaryItems.map(renderNavigationItem)}
            </ul>
          </>
        ) : null}
      </nav>

      {footer ? <div className="sidebar__footer">{footer}</div> : null}
    </aside>
  )
}

export interface AppShellProps
  extends Omit<SidebarProps, 'isOpen' | 'onClose'> {
  children: ReactNode
  mainClassName?: string
}

export function AppShell({
  children,
  mainClassName,
  ...sidebarProps
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  return (
    <div className="app-shell">
      <AnimatePresence>
        {navigationOpen ? (
          <motion.button
            type="button"
            className="app-shell__backdrop"
            aria-label="Close navigation"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={() => setNavigationOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <Sidebar
        {...sidebarProps}
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />

      <div className="app-shell__workspace">
        <header className="app-shell__mobile-header">
          <IconButton
            label="Open navigation"
            icon={Menu}
            variant="quiet"
            onClick={() => setNavigationOpen(true)}
          />
          <span className="app-shell__mobile-brand">MYWORK AZZURO</span>
        </header>
        <main className={cx('app-shell__main', mainClassName)}>{children}</main>
      </div>
    </div>
  )
}
