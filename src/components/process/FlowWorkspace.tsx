import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeFunc,
  useEdgesState,
  useNodesState
} from 'reactflow'
import 'reactflow/dist/style.css'

import type {
  BranchStyle,
  NodeShape,
  ProcessDocument,
  ProcessEdge,
  ProcessEdgeData,
  ProcessNode,
  ProcessNodeData,
  ProcessUpdater
} from '@/types'

import ProcessEdgeComponent from './ProcessEdge'
import ProcessNodeComponent from './ProcessNode'

type FlowWorkspaceProps = {
  doc: ProcessDocument
  onDocChange: (updater: ProcessUpdater) => void
  autoSaveState: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: number | null
  onReset: () => Promise<void> | void
}

type SelectionState =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null

const shapeColors: Record<NodeShape, { fill: string; text: string }> = {
  rectangle: { fill: '#6366f1', text: '#ffffff' },
  circle: { fill: '#22d3ee', text: '#0f172a' },
  diamond: { fill: '#facc15', text: '#0f172a' }
}

const defaultEdgeData: ProcessEdgeData = {
  label: 'New edge',
  color: '#94a3b8',
  lineStyle: 'solid',
  arrow: 'arrow',
  branchStyle: 'default'
}

const FlowWorkspace = ({
  doc,
  onDocChange,
  autoSaveState,
  lastSavedAt,
  onReset
}: FlowWorkspaceProps) => {
  const [nodes, setNodes] = useNodesState(doc.nodes)
  const [edges, setEdges] = useEdgesState(doc.edges)
  const [selection, setSelection] = useState<SelectionState>(null)
  const [resetting, setResetting] = useState(false)
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

  const nodeTypes = useMemo(
    () => ({
      processNode: ProcessNodeComponent
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      processEdge: ProcessEdgeComponent
    }),
    []
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<ProcessNodeData>[]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current)
        onDocChange((prev) => ({ ...prev, nodes: next }))
        return next
      })
    },
    [onDocChange, setNodes]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<ProcessEdgeData>[]) => {
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current)
        onDocChange((prev) => ({ ...prev, edges: next }))
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
        data: { ...defaultEdgeData }
      }

      setEdges((current) => {
        const next = addEdge(newEdge, current)
        onDocChange((prev) => ({ ...prev, edges: next }))
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

  const addNode = useCallback(
    (shape: NodeShape) => {
      const palette = shapeColors[shape]
      const newNode: ProcessNode = {
        id: `${doc.meta.categoryId}-${doc.meta.processId}-${shape}-${Date.now()}`,
        type: 'processNode',
        position: {
          x: 120 + nodes.length * 35,
          y: 120 + nodes.length * 20
        },
        data: {
          label: shape === 'diamond' ? 'Decision' : 'New Step',
          shape,
          color: palette.fill,
          textColor: palette.text,
          fields: []
        }
      }

      setNodes((current) => {
        const next = [...current, newNode]
        onDocChange((prev) => ({ ...prev, nodes: next }))
        return next
      })
      setSelection({ type: 'node', id: newNode.id })
    },
    [doc.meta.categoryId, doc.meta.processId, nodes.length, onDocChange, setNodes]
  )

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
        onDocChange((prev) => ({ ...prev, nodes: next }))
        return next
      })
    },
    [onDocChange, setNodes]
  )

  const updateEdge = useCallback(
    (edgeId: string, updater: (edge: ProcessEdge) => ProcessEdge) => {
      setEdges((current) => {
        const next = current.map((edge) => (edge.id === edgeId ? updater(edge) : edge))
        onDocChange((prev) => ({ ...prev, edges: next }))
        return next
      })
    },
    [onDocChange, setEdges]
  )

  const selectedNode =
    selection?.type === 'node'
      ? nodes.find((node) => node.id === selection.id)
      : undefined

  const selectedEdge =
    selection?.type === 'edge'
      ? edges.find((edge) => edge.id === selection.id)
      : undefined

  const formatSaveState = () => {
    if (autoSaveState === 'saving') return 'Saving...'
    if (autoSaveState === 'error') return 'Save failed'
    if (autoSaveState === 'saved') {
      if (!lastSavedAt) return 'Saved'
      const diff = Date.now() - lastSavedAt
      if (diff < 5000) return 'Saved moments ago'
      if (diff < 60000) return `Saved ${Math.round(diff / 1000)}s ago`
      const minutes = Math.floor(diff / 60000)
      if (minutes < 60) return `Saved ${minutes}m ago`
      return 'Saved earlier'
    }
    return 'Auto-save ready'
  }

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

  return (
    <div className="flex h-full">
      <div className="flex-1 relative bg-slate-950">
        <header className="flex items-center justify-between border-b border-white/10 px-8 py-5 bg-gradient-to-r from-ink-950 to-ink-900">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {doc.meta.categoryId} · {doc.meta.processId}
            </p>
            <h2 className="text-2xl font-semibold text-white mt-1">
              {doc.meta.title}
            </h2>
            {doc.meta.description && (
              <p className="text-sm text-slate-400 mt-1">{doc.meta.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm px-3 py-1.5 rounded-full border ${
                autoSaveState === 'saving'
                  ? 'border-amber-400 text-amber-300'
                  : autoSaveState === 'error'
                    ? 'border-rose-500 text-rose-300'
                    : 'border-emerald-400 text-emerald-300'
              }`}
            >
              {formatSaveState()}
            </span>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="text-sm font-medium px-4 py-2 rounded-full border border-white/20 text-white hover:border-white/60 transition disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset flow'}
            </button>
          </div>
        </header>

        <div className="relative h-[calc(100%-88px)]">
          <ReactFlow
            key={`${doc.meta.categoryId}-${doc.meta.processId}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            className="bg-gradient-to-br from-slate-900 via-ink-900 to-slate-950"
          >
            <MiniMap
              nodeColor={(node) => (node.data as ProcessNodeData)?.color || '#818cf8'}
              maskColor="rgba(15,23,42,0.7)"
              pannable
              zoomable
            />
            <Controls showInteractive={false} />
            <Background color="rgba(148,163,184,0.2)" gap={30} />
          </ReactFlow>

          <div className="absolute top-5 right-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-soft px-4 py-3 flex flex-col gap-2 w-60">
            <p className="text-xs uppercase tracking-wide text-white/70">Canvas controls</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addNode('rectangle')}
                className="control-chip text-white/90"
              >
                + Rectangle
              </button>
              <button
                type="button"
                onClick={() => addNode('circle')}
                className="control-chip text-white/90"
              >
                + Circle
              </button>
              <button
                type="button"
                onClick={() => addNode('diamond')}
                className="control-chip text-white/90"
              >
                + Decision
              </button>
              <button
                type="button"
                onClick={removeSelection}
                className="control-chip text-rose-200"
                disabled={!selection}
              >
                Delete selection
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="control-chip text-amber-200"
                disabled={resetting}
              >
                Reset
              </button>
            </div>
            {!selection && (
              <p className="text-xs text-slate-200">
                Tip: double-click the canvas to pan and drag handles to connect nodes.
              </p>
            )}
          </div>
        </div>
      </div>

      <InspectorPanel
        node={selectedNode}
        edge={selectedEdge}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
      />
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
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6">
        <h3 className="text-lg font-semibold">Inspector</h3>
        <p className="mt-2 text-sm text-slate-400">
          Select a node or edge to edit its properties.
        </p>
      </aside>
    )
  }

  if (node) {
    const updateNodeData = (changes: Partial<ProcessNodeData>) => {
      onUpdateNode(node.id, (data) => ({ ...data, ...changes }))
    }

    const updateField = (index: number, key: 'key' | 'value', value: string) => {
      onUpdateNode(node.id, (data) => {
        const fields = [...(data.fields ?? [])]
        const currentField = fields[index] ?? { key: '', value: '' }
        fields[index] = { ...currentField, [key]: value }
        return { ...data, fields }
      })
    }

    const addField = () => {
      onUpdateNode(node.id, (data) => ({
        ...data,
        fields: [...(data.fields ?? []), { key: '', value: '' }]
      }))
    }

    const removeField = (index: number) => {
      onUpdateNode(node.id, (data) => ({
        ...data,
        fields: data.fields.filter((_, idx) => idx !== index)
      }))
    }

    return (
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Node</p>
          <h3 className="text-xl font-semibold">{node.data.label || 'Untitled node'}</h3>
        </div>
        <label className="form-label">
          Label
          <input
            value={node.data.label}
            onChange={(event) => updateNodeData({ label: event.target.value })}
            className="form-input"
            placeholder="Enter label"
          />
        </label>
        <label className="form-label">
          Shape
          <select
            value={node.data.shape}
            onChange={(event) => updateNodeData({ shape: event.target.value as NodeShape })}
            className="form-input"
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="diamond">Decision (diamond)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="form-label">
            Fill
            <input
              type="color"
              value={node.data.color}
              onChange={(event) => updateNodeData({ color: event.target.value })}
              className="form-input-color"
            />
          </label>
          <label className="form-label">
            Text
            <input
              type="color"
              value={node.data.textColor}
              onChange={(event) => updateNodeData({ textColor: event.target.value })}
              className="form-input-color"
            />
          </label>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Custom fields</p>
            <button type="button" onClick={addField} className="text-xs text-emerald-300">
              + Add field
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {(node.data.fields ?? []).map((field, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3">
                <div className="flex gap-2">
                  <input
                    value={field.key}
                    onChange={(event) => updateField(index, 'key', event.target.value)}
                    placeholder="Key"
                    className="form-input flex-1"
                  />
                  <input
                    value={field.value}
                    onChange={(event) => updateField(index, 'value', event.target.value)}
                    placeholder="Value"
                    className="form-input flex-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
            {node.data.fields?.length === 0 && (
              <p className="text-xs text-slate-400">No fields yet. Add insight chips for this node.</p>
            )}
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

    return (
      <aside className="w-80 border-l border-white/10 bg-ink-900/80 text-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Edge</p>
          <h3 className="text-xl font-semibold">{edge.data?.label || 'Connection'}</h3>
        </div>
        <label className="form-label">
          Label
          <input
            value={edge.data?.label ?? ''}
            onChange={(event) => updateEdgeData({ label: event.target.value })}
            className="form-input"
            placeholder="Edge label"
          />
        </label>
        <label className="form-label">
          Color
          <input
            type="color"
            value={edge.data?.color ?? '#94a3b8'}
            onChange={(event) => updateEdgeData({ color: event.target.value })}
            className="form-input-color"
          />
        </label>
        <label className="form-label">
          Line style
          <select
            value={edge.data?.lineStyle ?? 'solid'}
            onChange={(event) => updateEdgeData({ lineStyle: event.target.value as ProcessEdgeData['lineStyle'] })}
            className="form-input"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </label>
        <label className="form-label">
          Arrow type
          <select
            value={edge.data?.arrow ?? 'arrow'}
            onChange={(event) => updateEdgeData({ arrow: event.target.value as ProcessEdgeData['arrow'] })}
            className="form-input"
          >
            <option value="arrow">Arrow</option>
            <option value="diamond">Diamond</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="form-label">
          Branch style
          <select
            value={edge.data?.branchStyle ?? 'default'}
            onChange={(event) => updateEdgeData({ branchStyle: event.target.value as BranchStyle })}
            className="form-input"
          >
            <option value="default">Default</option>
            <option value="positive">Positive</option>
            <option value="caution">Caution</option>
            <option value="danger">Danger</option>
          </select>
        </label>
        <label className="form-toggle">
          <input
            type="checkbox"
            checked={Boolean(edge.animated)}
            onChange={(event) =>
              onUpdateEdge(edge.id, (current) => ({
                ...current,
                animated: event.target.checked
              }))
            }
          />
          Animated edge
        </label>
      </aside>
    )
  }

  return null
}

export default FlowWorkspace

