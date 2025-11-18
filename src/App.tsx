import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar as SidebarIcon } from 'lucide-react'
import Sidebar from '@/components/sidebar/Sidebar'
import FlowWorkspace from '@/components/process/FlowWorkspace'
import {
  createProcess,
  deleteProcess,
  fetchCategories,
  fetchProcess,
  persistCategories,
  persistProcess,
  resetProcess
} from '@/lib/api'
import type {
  CategoriesDocument,
  ProcessDocument,
  ProcessIdentifier,
  ProcessNodeData,
  ProcessUpdater
} from '@/types'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item'

const uniqueSlug = (base: string, existing: string[]) => {
  let candidate = base
  let counter = 1
  while (existing.includes(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

type LegacyNodeData = Partial<ProcessNodeData> & Record<string, unknown>

const formatFieldsDescription = (fields: unknown): string => {
  if (!Array.isArray(fields)) {
    return ''
  }
  const tokens = fields
    .map((field) => {
      if (!field || typeof field !== 'object') {
        return ''
      }
      const key = typeof (field as { key?: string }).key === 'string' ? (field as { key?: string }).key?.trim() : ''
      const value =
        typeof (field as { value?: string }).value === 'string' ? (field as { value?: string }).value?.trim() : ''
      if (key && value) return `${key}: ${value}`
      return key || value || ''
    })
    .filter(Boolean)
  return tokens.join(' • ')
}

const normalizeNodeData = (data: LegacyNodeData): ProcessNodeData => {
  const legacyLabel = typeof data.label === 'string' ? data.label : ''
  const titleCandidate = typeof data.title === 'string' ? data.title : legacyLabel
  const title = titleCandidate || 'Untitled step'

  const descriptions: string[] = []
  if (typeof data.description === 'string') {
    descriptions.push(data.description)
  }
  const fromFields = formatFieldsDescription(data.fields)
  if (fromFields) {
    descriptions.push(fromFields)
  }
  descriptions.push('Add context for this step.')

  const description = descriptions.find((item) => item && item.length > 0) || 'Add context for this step.'

  return {
    ...data, // Preserve all existing properties like color
    title,
    description
  }
}

const normalizeProcessDoc = (doc: ProcessDocument): ProcessDocument => ({
  ...doc,
  nodes: doc.nodes.map((node, index) => ({
    ...node,
    id: node.id || `${doc.meta.categoryId}-${doc.meta.processId}-node-${index}`,
    type: 'processNode',
    data: normalizeNodeData(node.data as LegacyNodeData)
  })),
  edges: doc.edges.map((edge, index) => ({
    ...edge,
    id: edge.id || `${doc.meta.categoryId}-${doc.meta.processId}-edge-${index}`,
    type: edge.type ?? 'processEdge'
  }))
})

function App() {
  const [categoriesDoc, setCategoriesDoc] = useState<CategoriesDocument>({ categories: [] })
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [selectedProcess, setSelectedProcess] = useState<ProcessIdentifier | null>(null)
  const [processDoc, setProcessDoc] = useState<ProcessDocument | null>(null)
  const [processLoading, setProcessLoading] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])

  useEffect(() => {
    const load = async () => {
      setCategoriesLoading(true)
      setCategoriesError(null)
      try {
        const data = await fetchCategories()
        setCategoriesDoc(data)
        if (!selectedProcess && data.categories.length > 0) {
          const firstCategory = data.categories[0]
          const firstProcess = firstCategory.processes[0]
          if (firstProcess) {
            setSelectedProcess({ categoryId: firstCategory.id, processId: firstProcess.id })
          }
        }
      } catch (error) {
        console.error(error)
        setCategoriesError('Unable to load categories.')
      } finally {
        setCategoriesLoading(false)
      }
    }

    load()
  }, [])

  const availableProcesses = useMemo(() => {
    const available = categoriesDoc.categories.flatMap((category) =>
      category.processes.map((process) => ({
        categoryId: category.id,
        processId: process.id
      }))
    )
    return available
  }, [categoriesDoc])

  useEffect(() => {
    if (!availableProcesses.length) {
      setSelectedProcess(null)
      setProcessDoc(null)
      return
    }

    if (
      selectedProcess &&
      availableProcesses.some(
        (item) =>
          item.categoryId === selectedProcess.categoryId &&
          item.processId === selectedProcess.processId
      )
    ) {
      return
    }

    setSelectedProcess(availableProcesses[0])
  }, [availableProcesses, selectedProcess])

  useEffect(() => {
    if (!selectedProcess) {
      setProcessDoc(null)
      return
    }

    const loadProcess = async () => {
      setProcessLoading(true)
      setProcessError(null)

      try {
        const doc = await fetchProcess(selectedProcess.categoryId, selectedProcess.processId)
        setProcessDoc(normalizeProcessDoc(doc))
      } catch (error) {
        console.error(error)
        setProcessError('Unable to load this process.')
      } finally {
        setProcessLoading(false)
      }
    }

    loadProcess()
  }, [selectedProcess])

  const persistCategoriesChange = useCallback(
    async (updater: (prev: CategoriesDocument) => CategoriesDocument) => {
      let nextDoc: CategoriesDocument | null = null
      setCategoriesDoc((prev) => {
        nextDoc = updater(prev)
        return nextDoc
      })
      if (!nextDoc) return

      try {
        await persistCategories(nextDoc)
      } catch (error) {
        console.error(error)
        setCategoriesError('Unable to save categories.')
        throw error
      }
    },
    []
  )

  const handleProcessChange = useCallback(
    (updater: ProcessUpdater) => {
      setProcessDoc((prev) => {
        if (!prev) return prev
        const updated = updater(prev)
        // Check if the updater marked this as having unsaved changes
        if ((updated as any)._hasUnsavedChanges) {
          setHasUnsavedChanges(true)
          delete (updated as any)._hasUnsavedChanges
        }
        return normalizeProcessDoc(updated)
      })
    },
    []
  )

  const handleSaveProcess = useCallback(async () => {
    if (!processDoc) return false

    try {
      const updated = await persistProcess(processDoc)
      setProcessDoc(normalizeProcessDoc(updated))
      setHasUnsavedChanges(false)
      return true
    } catch (error) {
      console.error(error)
      setProcessError('Unable to save this process.')
      return false
    }
  }, [processDoc])

  const handleAddCategory = useCallback(async () => {
    const name = window.prompt('New category name?')?.trim()
    if (!name) return

    const id = uniqueSlug(slugify(name), categoriesDoc.categories.map((category) => category.id))

    await persistCategoriesChange((prev) => ({
      categories: [...prev.categories, { id, name, processes: [] }]
    }))
  }, [categoriesDoc, persistCategoriesChange])

  const handleRenameCategory = useCallback(
    async (categoryId: string) => {
      const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
      if (!category) return
      const name = window.prompt('Rename category', category.name)?.trim()
      if (!name || name === category.name) return

      await persistCategoriesChange((prev) => ({
        categories: prev.categories.map((cat) =>
          cat.id === categoryId ? { ...cat, name } : cat
        )
      }))
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
      if (!category) return
      const confirmed = window.confirm(
        `Delete category "${category.name}" and all of its processes?`
      )
      if (!confirmed) return

      setProcessError(null)
      try {
        await Promise.all(
          category.processes.map((process) =>
            deleteProcess(categoryId, process.id).catch((error) => console.error(error))
          )
        )

        await persistCategoriesChange((prev) => ({
          categories: prev.categories.filter((cat) => cat.id !== categoryId)
        }))

        setSelectedProcess((prev) =>
          prev && prev.categoryId === categoryId ? null : prev
        )
      } catch (error) {
        console.error(error)
        setProcessError('Unable to delete that category.')
      }
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleMoveCategoryUp = useCallback(
    async (categoryId: string) => {
      const currentIndex = categoriesDoc.categories.findIndex((cat) => cat.id === categoryId)
      if (currentIndex <= 0) return // Already at top or not found

      await persistCategoriesChange((prev) => {
        const newCategories = [...prev.categories]
        const [movedCategory] = newCategories.splice(currentIndex, 1)
        newCategories.splice(currentIndex - 1, 0, movedCategory)
        return { categories: newCategories }
      })
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleMoveCategoryDown = useCallback(
    async (categoryId: string) => {
      const currentIndex = categoriesDoc.categories.findIndex((cat) => cat.id === categoryId)
      if (currentIndex === -1 || currentIndex >= categoriesDoc.categories.length - 1) return // Not found or already at bottom

      await persistCategoriesChange((prev) => {
        const newCategories = [...prev.categories]
        const [movedCategory] = newCategories.splice(currentIndex, 1)
        newCategories.splice(currentIndex + 1, 0, movedCategory)
        return { categories: newCategories }
      })
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleAddProcess = useCallback(
    async (categoryId: string) => {
      const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
      if (!category) return

      const name = window.prompt('Process name?')?.trim()
      if (!name) return

      const processId = uniqueSlug(
        slugify(name),
        category.processes.map((process) => process.id)
      )

      setProcessError(null)
      try {
        const doc = await createProcess({
          categoryId,
          categoryName: category.name,
          processId,
          processName: name
        })

        await persistCategoriesChange((prev) => ({
          categories: prev.categories.map((cat) =>
            cat.id === categoryId
              ? {
                  ...cat,
                  processes: [...cat.processes, { id: processId, name }]
                }
              : cat
          )
        }))

        setSelectedProcess({ categoryId, processId })
        setProcessDoc(normalizeProcessDoc(doc))
      } catch (error) {
        console.error(error)
        setProcessError('Unable to create that process.')
      }
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleRenameProcess = useCallback(
    async (categoryId: string, processId: string) => {
      const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
      const process = category?.processes.find((proc) => proc.id === processId)
      if (!category || !process) return

      const name = window.prompt('Rename process', process.name)?.trim()
      if (!name || name === process.name) return

      await persistCategoriesChange((prev) => ({
        categories: prev.categories.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                processes: cat.processes.map((proc) =>
                  proc.id === processId ? { ...proc, name } : proc
                )
              }
            : cat
        )
      }))

      setProcessDoc((prev) =>
        prev &&
        prev.meta.categoryId === categoryId &&
        prev.meta.processId === processId
          ? {
              ...prev,
              meta: {
                ...prev.meta,
                title: `${category.name} ${name} Flow`
              }
            }
          : prev
      )
    },
    [categoriesDoc, persistCategoriesChange]
  )

  const handleDeleteProcess = useCallback(
    async (categoryId: string, processId: string) => {
      const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
      const process = category?.processes.find((proc) => proc.id === processId)
      if (!category || !process) return

      const confirmed = window.confirm(`Delete process "${process.name}"?`)
      if (!confirmed) return

      setProcessError(null)
      try {
        await deleteProcess(categoryId, processId)

        await persistCategoriesChange((prev) => ({
          categories: prev.categories.map((cat) =>
            cat.id === categoryId
              ? {
                  ...cat,
                  processes: cat.processes.filter((proc) => proc.id !== processId)
                }
              : cat
          )
        }))

        if (
          selectedProcess?.categoryId === categoryId &&
          selectedProcess.processId === processId
        ) {
          setSelectedProcess(null)
          setProcessDoc(null)
        }
      } catch (error) {
        console.error(error)
        setProcessError('Unable to delete that process.')
      }
    },
    [categoriesDoc, persistCategoriesChange, selectedProcess]
  )

  const handleResetProcess = useCallback(async () => {
    if (!selectedProcess) return
    setProcessError(null)
    try {
      const doc = await resetProcess(selectedProcess.categoryId, selectedProcess.processId)
      setProcessDoc(normalizeProcessDoc(doc))
    } catch (error) {
      console.error(error)
      setProcessError('Unable to reset this process.')
      throw error
    }
  }, [selectedProcess])

  const handleImportProcess = useCallback(
    async (categoryId: string, importedData: ProcessDocument) => {
      setProcessError(null)
      try {
        const category = categoriesDoc.categories.find((cat) => cat.id === categoryId)
        if (!category) {
          alert('Category not found.')
          return
        }

        // Use the title from the imported data
        const processName = importedData.meta.title || 'Imported Process'

        // Create a process ID from the process name
        const processId = uniqueSlug(
          slugify(processName),
          category.processes.map((process) => process.id)
        )

        // First create the process (this creates a default process on the server)
        await createProcess({
          categoryId,
          categoryName: category.name,
          processId,
          processName
        })

        // Then immediately update it with the imported data
        const newProcessDoc: ProcessDocument = {
          meta: {
            categoryId,
            processId,
            title: processName,
            description: importedData.meta.description,
            updatedAt: new Date().toISOString()
          },
          nodes: importedData.nodes,
          edges: importedData.edges
        }

        const saved = await persistProcess(newProcessDoc)

        // Update categories to include the new process
        await persistCategoriesChange((prev) => ({
          categories: prev.categories.map((cat) =>
            cat.id === categoryId
              ? { ...cat, processes: [...cat.processes, { id: processId, name: processName }] }
              : cat
          )
        }))

        // Navigate to the new process
        setSelectedProcess({ categoryId, processId })
        setProcessDoc(normalizeProcessDoc(saved))
        
        alert(`Process "${processName}" imported successfully!`)
      } catch (error) {
        console.error(error)
        setProcessError('Unable to import process.')
        alert('Failed to import process. Please try again.')
      }
    },
    [categoriesDoc, persistCategoriesChange]
  )

  return (
    <div className="flex h-screen bg-ink-950 text-white relative">
      {sidebarOpen && (
        <Sidebar
          categories={categoriesDoc.categories}
          selectedProcess={selectedProcess}
          editMode={editMode}
          loading={categoriesLoading}
          onToggleEditMode={() => setEditMode((prev) => !prev)}
          onSelectProcess={setSelectedProcess}
          onAddCategory={handleAddCategory}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
          onMoveCategoryUp={handleMoveCategoryUp}
          onMoveCategoryDown={handleMoveCategoryDown}
          onImportProcess={handleImportProcess}
          onAddProcess={handleAddProcess}
          onRenameProcess={handleRenameProcess}
          onDeleteProcess={handleDeleteProcess}
        />
      )}

      <main className="flex-1 relative flex flex-col bg-ink-950">
        {!sidebarOpen && (!processDoc || processLoading) && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-6 top-6 z-10 icon-button"
            title="Show sidebar"
          >
            <SidebarIcon size={18} />
          </button>
        )}
        {categoriesError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 px-4 py-2 text-sm">
            {categoriesError}
          </div>
        )}
        {processError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 px-4 py-2 text-sm">
            {processError}
          </div>
        )}
        <div className="flex-1">
          {processLoading && (
            <div className="flex h-full items-center justify-center text-slate-400">
              Loading process...
            </div>
          )}
          {!processLoading && processDoc && (
            <FlowWorkspace
              doc={processDoc}
              onDocChange={handleProcessChange}
              onSave={handleSaveProcess}
              onReset={handleResetProcess}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          )}
          {!processLoading && !processDoc && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <p className="text-xl font-medium text-white">Choose a process to get started</p>
              <p className="text-sm">
                Use the sidebar to create categories and processes, then build beautiful flowcharts.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App


