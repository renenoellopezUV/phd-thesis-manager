'use client'

import { MILESTONE_TYPE_LABELS, type Milestone } from '@/types'

const TYPE_COLORS: Record<string, string> = {
  exam: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  defense: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  chapter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'committee-meeting': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  other: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

type Props = {
  milestone: Milestone
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  canDelete?: boolean
}

export default function MilestoneCard({ milestone, onToggle, onDelete, canDelete = true }: Props) {
  const due = new Date(milestone.dueDate)
  const isOverdue = !milestone.completed && due < new Date()

  const handleDelete = () => {
    if (confirm(`Delete "${milestone.title}"?`)) {
      onDelete(milestone.id)
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
        milestone.completed
          ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-60'
          : isOverdue
          ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      }`}
    >
      <input
        type="checkbox"
        checked={milestone.completed}
        onChange={() => onToggle(milestone.id)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-700 cursor-pointer"
        aria-label={`Mark "${milestone.title}" as ${milestone.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[milestone.type]}`}
          >
            {MILESTONE_TYPE_LABELS[milestone.type]}
          </span>
          {isOverdue && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Overdue
            </span>
          )}
        </div>
        <p
          className={`text-sm font-medium ${
            milestone.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {milestone.title}
        </p>
        {milestone.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{milestone.description}</p>
        )}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Due: {due.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          {milestone.completedDate && (
            <span className="ml-2">
              · Completed:{' '}
              {new Date(milestone.completedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </p>
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs px-1"
          aria-label={`Delete "${milestone.title}"`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
