'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MilestoneCard from '@/components/MilestoneCard'
import { addMilestone, toggleMilestone, deleteMilestone } from '@/app/actions/milestones'
import type { Milestone, MilestoneType } from '@/types'

const MILESTONE_TYPES: { value: MilestoneType; label: string }[] = [
  { value: 'exam', label: 'Exam' },
  { value: 'defense', label: 'Defense' },
  { value: 'chapter', label: 'Chapter' },
  { value: 'committee-meeting', label: 'Committee Meeting' },
  { value: 'other', label: 'Other' },
]

type FormErrors = { title?: string; dueDate?: string }

export default function MilestonesClient({ milestones }: { milestones: Milestone[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'other' as MilestoneType, dueDate: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const incomplete = milestones.filter((m) => !m.completed)
  const complete = milestones.filter((m) => m.completed)

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.dueDate) next.dueDate = 'Due date is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    const fd = new FormData()
    fd.set('title', form.title)
    fd.set('description', form.description)
    fd.set('type', form.type)
    fd.set('dueDate', form.dueDate)

    startTransition(async () => {
      const result = await addMilestone(fd)
      if (result.error) { setFormError(result.error); return }
      setForm({ title: '', description: '', type: 'other', dueDate: '' })
      setErrors({})
      setShowForm(false)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleMilestone(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMilestone(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Milestones</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Milestone'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Chapter 5 Draft"
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional details..."
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MilestoneType })}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {MILESTONE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Add Milestone
            </button>
          </div>
        </form>
      )}

      {incomplete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Upcoming ({incomplete.length})
          </h2>
          <div className="space-y-2">
            {incomplete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Completed ({complete.length})
          </h2>
          <div className="space-y-2">
            {complete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {milestones.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
          No milestones yet. Add your first one above.
        </p>
      )}
    </div>
  )
}
