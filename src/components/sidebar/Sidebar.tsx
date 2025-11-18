import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Category, ProcessIdentifier } from '@/types'

type SidebarProps = {
  categories: Category[]
  selectedProcess: ProcessIdentifier | null
  editMode: boolean
  loading: boolean
  onToggleEditMode: () => void
  onSelectProcess: (identifier: ProcessIdentifier) => void
  onAddCategory: () => void
  onRenameCategory: (categoryId: string) => void
  onDeleteCategory: (categoryId: string) => void
  onAddProcess: (categoryId: string) => void
  onRenameProcess: (categoryId: string, processId: string) => void
  onDeleteProcess: (categoryId: string, processId: string) => void
}

const Sidebar = ({
  categories,
  selectedProcess,
  editMode,
  loading,
  onToggleEditMode,
  onSelectProcess,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddProcess,
  onRenameProcess,
  onDeleteProcess
}: SidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((cat) => cat.id))
  )

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }
  return (
    <aside className="w-[280px] bg-ink-950 text-white flex flex-col border-r border-white/5">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Processes</p>
            <h1 className="mt-1 text-2xl font-semibold">Processes</h1>
          </div>
          <button
            type="button"
            onClick={onToggleEditMode}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              editMode
                ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10'
                : 'border-white/20 text-slate-200 hover:border-white/40'
            }`}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Design, review, and share process flowcharts with your team.
        </p>
        {editMode && (
          <button
            type="button"
            onClick={onAddCategory}
            className="mt-4 w-full text-center text-sm font-medium bg-white/10 hover:bg-white/20 transition rounded-xl py-2"
          >
            + New Category
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {loading && (
          <div className="text-sm text-slate-400">
            Loading categories...
          </div>
        )}
        {!loading && categories.length === 0 && (
          <div className="text-sm text-slate-400">
            No categories yet. {editMode ? 'Create your first one to get started.' : 'Enable edit mode to add one.'}
          </div>
        )}
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id)
          
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-1.5 hover:text-slate-200 transition"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{category.name}</span>
                </button>
                {editMode && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onRenameCategory(category.id)}
                      className="text-slate-300 hover:text-white transition"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(category.id)}
                      className="text-rose-300 hover:text-rose-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="space-y-2">
              {category.processes.map((process) => {
                const isActive =
                  selectedProcess?.categoryId === category.id &&
                  selectedProcess.processId === process.id

                const selectProcess = () =>
                  onSelectProcess({ categoryId: category.id, processId: process.id })

                return (
                  <div
                    key={process.id}
                    role="button"
                    tabIndex={0}
                    onClick={selectProcess}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        selectProcess()
                      }
                    }}
                    className={`rounded-2xl border px-3 py-3 cursor-pointer transition ${
                      isActive
                        ? 'border-white/40 bg-white/10 shadow-soft'
                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{process.name}</p>
                        <p className="text-xs text-slate-400">{category.name}</p>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    {editMode && (
                      <div className="mt-3 flex gap-3 text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onRenameProcess(category.id, process.id)
                          }}
                          className="hover:text-white transition"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDeleteProcess(category.id, process.id)
                          }}
                          className="text-rose-300 hover:text-rose-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => onAddProcess(category.id)}
                      className="w-full text-left text-xs text-slate-400 hover:text-white transition flex items-center gap-2 px-1"
                    >
                      <span className="text-base leading-none">+</span>
                      Add process
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar

