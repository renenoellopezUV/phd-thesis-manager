import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CreateProgramButton from './CreateProgramButton'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Programs</h1>
        <CreateProgramButton />
      </div>

      {!programs || programs.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-12 text-center">
          No programs yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/admin/programs/${p.id}`}
              className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.description}</p>
                )}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Edit →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
