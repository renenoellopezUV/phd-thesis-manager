type Props = {
  overdueCount: number
}

export default function HealthBadge({ overdueCount }: Props) {
  let label: string
  let className: string

  if (overdueCount === 0) {
    label = 'On Track'
    className = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  } else if (overdueCount <= 2) {
    label = 'At Risk'
    className = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  } else {
    label = 'Off Track'
    className = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  )
}
