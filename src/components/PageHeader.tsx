import type { ReactNode } from 'react'
import { isToday, format } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './Button'
import { cx } from './utils'

export interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx('page-header', className)}>
      <div className="page-header__copy">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <div className="page-header__description">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}

export interface DateNavigatorProps {
  date: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onOpenCalendar: () => void
  className?: string
}

export function DateNavigator({
  date,
  onPrevious,
  onNext,
  onToday,
  onOpenCalendar,
  className,
}: DateNavigatorProps) {
  const selectedIsToday = isToday(date)

  return (
    <div
      className={cx('date-navigator', className)}
      role="group"
      aria-label="Choose work date"
    >
      <IconButton
        label="Previous day"
        icon={ChevronLeft}
        variant="quiet"
        onClick={onPrevious}
      />
      <button
        type="button"
        className="date-navigator__date"
        onClick={onOpenCalendar}
        aria-label={`Open calendar, selected date ${format(date, 'EEEE, MMMM d, yyyy')}`}
      >
        <span className="date-navigator__weekday">
          {selectedIsToday ? 'Today' : format(date, 'EEEE')}
        </span>
        <span className="date-navigator__full-date">
          {format(date, 'MMMM d, yyyy')}
        </span>
      </button>
      <IconButton
        label="Next day"
        icon={ChevronRight}
        variant="quiet"
        onClick={onNext}
      />
      {!selectedIsToday ? (
        <button
          type="button"
          className="date-navigator__today"
          onClick={onToday}
        >
          Today
        </button>
      ) : null}
      <IconButton
        className="date-navigator__calendar"
        label="Open calendar"
        icon={CalendarDays}
        onClick={onOpenCalendar}
      />
    </div>
  )
}
