type Props = {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function ProgressRing({ percentage, size = 120, strokeWidth = 10 }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference

  return (
    <svg width={size} height={size} aria-label={`${percentage}% complete`} role="img">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-100 dark:text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-zinc-700 dark:text-zinc-300 transition-all duration-500"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-zinc-800 dark:fill-zinc-200 text-lg font-semibold"
        fontSize={size * 0.18}
        fontWeight="600"
      >
        {percentage}%
      </text>
    </svg>
  )
}
