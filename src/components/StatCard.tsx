type Props = {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">{value}</span>
      {sub && <span className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</span>}
    </div>
  )
}
