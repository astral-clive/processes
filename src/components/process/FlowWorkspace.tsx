import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeFunc,
  useEdgesState,
  useNodesState,
  useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Sidebar as SidebarIcon,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Maximize2,
  Loader2,
  Check,
  Upload,
  Image,
  FileText
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  BranchStyle,
  ProcessDocument,
  ProcessEdge,
  ProcessEdgeData,
  ProcessNode,
  ProcessNodeData,
  ProcessUpdater
} from '@/types'

import ProcessEdgeComponent from './ProcessEdge'
import ProcessNodeComponent from './ProcessNode'

// Define node and edge types outside component to prevent recreation
const nodeTypes = {
  processNode: ProcessNodeComponent
}

const edgeTypes = {
  processEdge: ProcessEdgeComponent
}

type FlowWorkspaceProps = {
  doc: ProcessDocument
  onDocChange: (updater: ProcessUpdater) => void
  onSave: () => Promise<boolean>
  onReset: () => Promise<void> | void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  hasUnsavedChanges: boolean
}

type SelectionState =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null

const defaultEdgeData: ProcessEdgeData = {
  label: '',
  color: '#94a3b8',
  lineStyle: 'solid',
  arrow: 'arrow',
  branchStyle: 'default'
}

// Pastel color palette for nodes
const NODE_COLORS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Pink', hex: '#fca5a5' },
  { name: 'Purple', hex: '#c4b5fd' },
  { name: 'Green', hex: '#86efac' },
  { name: 'Yellow', hex: '#fde047' },
  { name: 'Orange', hex: '#fdba74' },
  { name: 'Teal', hex: '#5eead4' },
  { name: 'Lavender', hex: '#e9d5ff' }
]

const DEFAULT_NODE_COLOR = '#3b82f6'

const FlowWorkspace = ({
  doc,
  onDocChange,
  onSave,
  onReset,
  sidebarOpen,
  onToggleSidebar,
  hasUnsavedChanges: parentHasUnsavedChanges
}: FlowWorkspaceProps) => {
  const [nodes, setNodes] = useNodesState(doc.nodes)
  const [edges, setEdges] = useEdgesState(doc.edges)
  const [selection, setSelection] = useState<SelectionState>(null)
  const [resetting, setResetting] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [exportingPNG, setExportingPNG] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pngDropdownOpen, setPngDropdownOpen] = useState(false)
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState(false)
  const { project, fitView } = useReactFlow()
  const reactFlowRef = useRef<HTMLDivElement>(null)
  
  // Open inspector when entering edit mode
  useEffect(() => {
    if (editMode) {
      setInspectorOpen(true)
    }
  }, [editMode])
  
  const docKey = `${doc.meta.categoryId}-${doc.meta.processId}`
  const lastDocKey = useRef(docKey)

  useEffect(() => {
    setNodes(doc.nodes)
    setEdges(doc.edges)
    if (lastDocKey.current !== docKey) {
      setSelection(null)
      lastDocKey.current = docKey
    }
  }, [docKey, doc.edges, doc.nodes, setEdges, setNodes])
  
  // Auto-save when changes are made (after user stops making changes for 3 seconds)
  useEffect(() => {
    if (!parentHasUnsavedChanges) return
    
    const timer = setTimeout(async () => {
      setSaving(true)
      const success = await onSave()
      setSaving(false)
      
      if (success) {
        setShowSavedToast(true)
        // Hide toast after 2 seconds
        setTimeout(() => {
          setShowSavedToast(false)
        }, 2000)
      }
    }, 1000) // Wait 1 second after last change
    
    return () => clearTimeout(timer)
  }, [parentHasUnsavedChanges, onSave])

  const handleNodesChange = useCallback(
    (changes: NodeChange<ProcessNodeData>[]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current)
        // Batch the document change to avoid rapid updates during dragging
        setTimeout(() => {
          onDocChange((prev) => ({ ...prev, nodes: next, _hasUnsavedChanges: true }))
        }, 0)
        return next
      })
    },
    [onDocChange, setNodes]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<ProcessEdgeData>[]) => {
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current)
        // Batch the document change to avoid rapid updates
        setTimeout(() => {
          onDocChange((prev) => ({ ...prev, edges: next, _hasUnsavedChanges: true }))
        }, 0)
        return next
      })
    },
    [onDocChange, setEdges]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: ProcessEdge = {
        ...(connection as ProcessEdge),
        id: `${doc.meta.categoryId}-${doc.meta.processId}-${Date.now()}`,
        type: 'processEdge',
        data: { ...defaultEdgeData },
        markerEnd: {
          type: 'arrowclosed',
          color: defaultEdgeData.color
        }
      }

      setEdges((current) => {
        const next = addEdge(newEdge, current)
        // Batch the document change to avoid rapid updates
        setTimeout(() => {
          onDocChange((prev) => ({ ...prev, edges: next, _hasUnsavedChanges: true }))
        }, 0)
        return next
      })
    },
    [doc.meta.categoryId, doc.meta.processId, onDocChange, setEdges]
  )

  const handleSelectionChange: OnSelectionChangeFunc = useCallback((params) => {
    if (params.nodes?.length) {
      setSelection({ type: 'node', id: params.nodes[0].id })
      return
    }
    if (params.edges?.length) {
      setSelection({ type: 'edge', id: params.edges[0].id })
      return
    }
    setSelection(null)
  }, [])

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: ProcessNode) => {
    if (editMode) {
      setSelection({ type: 'node', id: node.id })
      setInspectorOpen(true)
    }
  }, [editMode])

  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: ProcessEdge) => {
    if (editMode) {
      setSelection({ type: 'edge', id: edge.id })
      setInspectorOpen(true)
    }
  }, [editMode])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.4, maxZoom: 0.8, duration: 300 })
  }, [fitView])

  const addNode = useCallback(() => {
    // Get the center of the viewport
    const viewportCenter = project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    })

    const newNode: ProcessNode = {
      id: `${doc.meta.categoryId}-${doc.meta.processId}-step-${Date.now()}`,
      type: 'processNode',
      position: {
        x: viewportCenter.x - 100, // Center the node (node width is ~200px)
        y: viewportCenter.y - 60   // Center the node (node height is ~120px)
      },
      data: {
        title: 'New step',
        description: 'Describe this step so teammates know what needs to happen.',
        color: DEFAULT_NODE_COLOR
      }
    }

    setNodes((current) => {
      const next = [...current, newNode]
      setTimeout(() => {
        onDocChange((prev) => ({ ...prev, nodes: next, _hasUnsavedChanges: true }))
      }, 0)
      return next
    })
    setSelection({ type: 'node', id: newNode.id })
  }, [doc.meta.categoryId, doc.meta.processId, onDocChange, project, setNodes])

  const removeSelection = useCallback(() => {
    if (!selection) return

    if (selection.type === 'node') {
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.filter((node) => node.id !== selection.id)
        if (nextNodes.length === currentNodes.length) {
          return currentNodes
        }
        setEdges((currentEdges) => {
          const filteredEdges = currentEdges.filter(
            (edge) => edge.source !== selection.id && edge.target !== selection.id
          )
          onDocChange((prev) => ({ ...prev, nodes: nextNodes, edges: filteredEdges }))
          return filteredEdges
        })
        setSelection(null)
        return nextNodes
      })
      return
    }

    setEdges((currentEdges) => {
      const filteredEdges = currentEdges.filter((edge) => edge.id !== selection.id)
      if (filteredEdges.length === currentEdges.length) {
        return currentEdges
      }
      onDocChange((prev) => ({ ...prev, edges: filteredEdges }))
      setSelection(null)
      return filteredEdges
    })
  }, [onDocChange, selection, setEdges, setNodes])

  const updateNode = useCallback(
    (nodeId: string, updater: (data: ProcessNodeData) => ProcessNodeData) => {
      setNodes((current) => {
        const next = current.map((node) =>
          node.id === nodeId ? { ...node, data: updater(node.data) } : node
        )
        setTimeout(() => {
          onDocChange((prev) => ({ ...prev, nodes: next, _hasUnsavedChanges: true }))
        }, 0)
        return next
      })
    },
    [onDocChange, setNodes]
  )

  const updateEdge = useCallback(
    (edgeId: string, updater: (edge: ProcessEdge) => ProcessEdge) => {
      setEdges((current) => {
        const next = current.map((edge) => {
          if (edge.id !== edgeId) return edge
          
          const updated = updater(edge)
          
          // Update markerEnd based on arrow setting
          if (updated.data?.arrow === 'none') {
            const { markerEnd, ...rest } = updated
            return rest
          } else if (updated.data?.arrow === 'arrow') {
            return {
              ...updated,
              markerEnd: {
                type: 'arrowclosed',
                color: updated.data?.color ?? '#94a3b8'
              }
            }
          }
          
          return updated
        })
        setTimeout(() => {
          onDocChange((prev) => ({ ...prev, edges: next, _hasUnsavedChanges: true }))
        }, 0)
        return next
      })
    },
    [onDocChange, setEdges]
  )

  const selectedNode = useMemo(() => 
    selection?.type === 'node'
      ? nodes.find((node) => node.id === selection.id)
      : undefined
  , [selection, nodes])

  const selectedEdge = useMemo(() =>
    selection?.type === 'edge'
      ? edges.find((edge) => edge.id === selection.id)
      : undefined
  , [selection, edges])

  const handleReset = async () => {
    setResetting(true)
    try {
      await onReset()
      setSelection(null)
    } catch (error) {
      console.error(error)
    } finally {
      setResetting(false)
    }
  }

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(doc, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${doc.meta.categoryId}-${doc.meta.processId}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [doc])

  const handleExportPNG = useCallback(async (exportEntire: boolean) => {
    if (!reactFlowRef.current) return
    
    setExportingPNG(true)
    setPngDropdownOpen(false)
    
    try {
      // Get the ReactFlow viewport element
      const reactFlowElement = reactFlowRef.current.querySelector('.react-flow') as HTMLElement
      if (!reactFlowElement) {
        console.error('ReactFlow element not found')
        return
      }
      
      if (exportEntire) {
        // Fit entire flowchart to view
        fitView({ padding: 0.4, maxZoom: 0.8, duration: 300 })
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 350))
      }

      // Capture the viewport
      const canvas = await html2canvas(reactFlowElement, {
        backgroundColor: '#0f172a', // slate-950
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      })

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${doc.meta.categoryId}-${doc.meta.processId}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('Error exporting PNG:', error)
    } finally {
      setExportingPNG(false)
    }
  }, [doc.meta.categoryId, doc.meta.processId, fitView])

  const handleExportPDF = useCallback(async (exportEntire: boolean) => {
    if (!reactFlowRef.current) return
    
    setExportingPDF(true)
    setPdfDropdownOpen(false)
    
    try {
      // Get the ReactFlow viewport element
      const reactFlowElement = reactFlowRef.current.querySelector('.react-flow') as HTMLElement
      if (!reactFlowElement) {
        console.error('ReactFlow element not found')
        return
      }

      if (exportEntire) {
        // Fit entire flowchart to view
        fitView({ padding: 0.4, maxZoom: 0.8, duration: 300 })
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 350))
      }

      // Capture the viewport
      const canvas = await html2canvas(reactFlowElement, {
        backgroundColor: '#0f172a', // slate-950
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${doc.meta.categoryId}-${doc.meta.processId}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setExportingPDF(false)
    }
  }, [doc.meta.categoryId, doc.meta.processId, fitView])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pngDropdownOpen || pdfDropdownOpen) {
        const target = event.target as HTMLElement
        if (!target.closest('.export-button-container')) {
          setPngDropdownOpen(false)
          setPdfDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pngDropdownOpen, pdfDropdownOpen])

  return (
    <div className="flex h-full">
      <div className="flex-1 relative bg-slate-950">
        <header className="flex items-center justify-between border-b border-white/10 px-8 py-4 bg-ink-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="icon-button"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <SidebarIcon size={18} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="icon-button"
              title="Export process"
            >
              <Upload size={18} />
            </button>
            <h2 className="text-sm font-medium tracking-widest uppercase text-slate-400">
              {doc.meta.categoryId} · {doc.meta.processId}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!editMode && (
              <>
                {/* PNG Export Button */}
                <div className="relative export-button-container">
                  <button
                    type="button"
                    onClick={() => {
                      setPngDropdownOpen((prev) => !prev)
                      setPdfDropdownOpen(false)
                    }}
                    disabled={exportingPNG}
                    className="icon-button"
                    title="Export as PNG"
                  >
                    {exportingPNG ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Image size={18} />
                    )}
                  </button>
                  {pngDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-ink-900 border border-white/10 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <button
                        type="button"
                        onClick={() => handleExportPNG(false)}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        Export visible area
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPNG(true)}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10"
                      >
                        Export entire flowchart
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF Export Button */}
                <div className="relative export-button-container">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfDropdownOpen((prev) => !prev)
                      setPngDropdownOpen(false)
                    }}
                    disabled={exportingPDF}
                    className="icon-button"
                    title="Export as PDF"
                  >
                    {exportingPDF ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <FileText size={18} />
                    )}
                  </button>
                  {pdfDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-ink-900 border border-white/10 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <button
                        type="button"
                        onClick={() => handleExportPDF(false)}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        Export visible area
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPDF(true)}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10"
                      >
                        Export entire flowchart
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {editMode && (
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="icon-button"
                title={resetting ? 'Resetting...' : 'Reset flow'}
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="icon-button"
              title={editMode ? 'View mode' : 'Edit mode'}
            >
              {editMode ? <Eye size={18} /> : <Edit3 size={18} />}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={() => setInspectorOpen((prev) => !prev)}
                className="icon-button"
                title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
              >
                {inspectorOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            )}
          </div>
        </header>

        <div className="relative h-[calc(100%-88px)]" ref={reactFlowRef}>
          <ReactFlow
            key={`${doc.meta.categoryId}-${doc.meta.processId}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={editMode ? handleNodesChange : undefined}
            onEdgesChange={editMode ? handleEdgesChange : undefined}
            onConnect={editMode ? handleConnect : undefined}
            onSelectionChange={editMode ? handleSelectionChange : undefined}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            nodesDraggable={editMode}
            nodesConnectable={editMode}
            elementsSelectable={editMode}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 0.8 }}
            minZoom={0.3}
            className="bg-slate-950"
            connectionMode="loose"
            snapToGrid={true}
            snapGrid={[20, 20]}
          >
            <Background color="rgba(148,163,184,0.2)" gap={30} />
          </ReactFlow>

          {/* Canvas Controls at bottom left */}
          <div className="absolute bottom-5 left-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-soft px-3 py-3 flex gap-2 z-10">
            <button
              type="button"
              onClick={handleFitView}
              className="icon-button"
              title="Fit view"
            >
              <Maximize2 size={18} />
            </button>
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={addNode}
                  className="icon-button"
                  title="Add node"
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={removeSelection}
                  className="icon-button"
                  title="Delete selection"
                  disabled={!selection}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {editMode && inspectorOpen && (
        <InspectorPanel
          node={selectedNode}
          edge={selectedEdge}
          onUpdateNode={updateNode}
          onUpdateEdge={updateEdge}
        />
      )}
      
      {/* Toast notification for saving/saved */}
      {(saving || showSavedToast) && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500/90 backdrop-blur-sm border border-emerald-400/50 rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 text-white animate-slide-up">
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span className="font-medium">Saving...</span>
            </>
          ) : (
            <>
              <Check size={18} />
              <span className="font-medium">Saved</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

type InspectorPanelProps = {
  node?: ProcessNode
  edge?: ProcessEdge
  onUpdateNode: (id: string, updater: (data: ProcessNodeData) => ProcessNodeData) => void
  onUpdateEdge: (id: string, updater: (edge: ProcessEdge) => ProcessEdge) => void
}

const InspectorPanel = ({ node, edge, onUpdateNode, onUpdateEdge }: InspectorPanelProps) => {
  if (!node && !edge) {
    return (
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inspector</p>
          <h3 className="text-xl font-semibold">Nothing selected</h3>
        </div>
        <p className="text-sm text-slate-400">
          Select a step or connection to edit its details.
        </p>
      </aside>
    )
  }

  if (node) {
    const updateNodeData = (changes: Partial<ProcessNodeData>) => {
      onUpdateNode(node.id, (data) => ({ ...data, ...changes }))
    }

    const currentColor = node.data.color || DEFAULT_NODE_COLOR

    return (
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step</p>
          <h3 className="text-xl font-semibold">{node.data.title || 'Untitled step'}</h3>
        </div>
        <label className="form-label">
          Title
          <input
            value={node.data.title}
            onChange={(event) => updateNodeData({ title: event.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="form-input"
            placeholder="Enter a concise title"
          />
        </label>
        <label className="form-label">
          Description
          <textarea
            value={node.data.description}
            onChange={(event) => updateNodeData({ description: event.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="form-input min-h-[140px] resize-none"
            placeholder="Summarize what happens in this step."
          />
        </label>
        <div className="form-label">
          Color
          <div className="grid grid-cols-4 gap-2 mt-2">
            {NODE_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => updateNodeData({ color: color.hex })}
                className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                  currentColor === color.hex
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-900'
                    : 'hover:ring-1 hover:ring-white/50'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </aside>
    )
  }

  if (edge) {
    const updateEdgeData = (changes: Partial<ProcessEdgeData>) => {
      onUpdateEdge(edge.id, (current) => ({
        ...current,
        data: { ...defaultEdgeData, ...current.data, ...changes }
      }))
    }

    const hasArrow = edge.data?.arrow !== 'none'
    const isDashed = edge.data?.lineStyle === 'dashed'

    return (
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Connection</p>
          <h3 className="text-xl font-semibold">{edge.data?.label || 'Connection'}</h3>
        </div>
        <label className="form-label">
          Label
          <input
            value={edge.data?.label ?? ''}
            onChange={(event) => updateEdgeData({ label: event.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="form-input"
            placeholder="Optional label"
          />
        </label>
        <label className="form-toggle">
          <input
            type="checkbox"
            checked={hasArrow}
            onChange={(event) =>
              updateEdgeData({ arrow: event.target.checked ? 'arrow' : 'none' })
            }
          />
          Show arrow
        </label>
        <label className="form-toggle">
          <input
            type="checkbox"
            checked={isDashed}
            onChange={(event) =>
              updateEdgeData({ lineStyle: event.target.checked ? 'dashed' : 'solid' })
            }
          />
          Dashed line
        </label>
      </aside>
    )
  }

  return null
}

export default FlowWorkspace

