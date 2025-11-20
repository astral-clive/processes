/**
 * Priority Extension
 * 
 * A complete working example extension that adds priority management to nodes.
 * 
 * Features:
 * - Adds a priority field (High/Medium/Low) to nodes
 * - Shows priority indicator in the node inspector
 * - Adds a priority filter button to the view mode header
 * 
 * This extension demonstrates:
 * - Using multiple hooks (header button + inspector field)
 * - Extending node data structure
 * - State management for plugin UI
 * - Complex UI interactions (filter dropdown)
 */

import { useState, useCallback } from 'react'
import { hooks } from '@/lib/hooks'
import type { HeaderButtonHookContext, InspectorFieldHookContext } from '@/lib/hook-types'
import type { Plugin } from '@/lib/plugins'
import { Filter, ChevronDown } from 'lucide-react'
import type { ProcessNodeData } from '@/types'

// Extend ProcessNodeData to include priority
type PriorityNodeData = ProcessNodeData & {
  priority?: 'high' | 'medium' | 'low'
}

// Priority configuration
const PRIORITY_OPTIONS = [
  { value: 'high' as const, label: 'High', color: 'text-rose-400' },
  { value: 'medium' as const, label: 'Medium', color: 'text-yellow-400' },
  { value: 'low' as const, label: 'Low', color: 'text-slate-400' }
] as const

// Priority filter dropdown component
function PriorityFilterButton({ doc }: { doc: HeaderButtonHookContext['doc'] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low' | 'all'>('all')

  // Filter nodes based on selected priority
  const filteredNodeIds = selectedPriority === 'all'
    ? doc.nodes.map(n => n.id)
    : doc.nodes
        .filter(n => (n.data as PriorityNodeData).priority === selectedPriority)
        .map(n => n.id)

  const handlePrioritySelect = useCallback((priority: 'high' | 'medium' | 'low' | 'all') => {
    setSelectedPriority(priority)
    setIsOpen(false)

    // Highlight filtered nodes (simple approach - in production you might use a more sophisticated method)
    if (priority === 'all') {
      // Remove all highlights
      document.querySelectorAll('.react-flow__node').forEach(node => {
        (node as HTMLElement).style.opacity = '1'
      })
    } else {
      // Highlight matching nodes, dim others
      document.querySelectorAll('.react-flow__node').forEach(node => {
        const nodeId = node.getAttribute('data-id')
        if (nodeId && filteredNodeIds.includes(nodeId)) {
          (node as HTMLElement).style.opacity = '1'
        } else {
          (node as HTMLElement).style.opacity = '0.3'
        }
      })
    }
  }, [filteredNodeIds])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`icon-button flex items-center gap-1 ${selectedPriority !== 'all' ? 'bg-blue-500/20 border-blue-500/50' : ''}`}
        title="Filter by priority"
      >
        <Filter size={18} />
        {selectedPriority !== 'all' && (
          <span className="text-xs">{PRIORITY_OPTIONS.find(p => p.value === selectedPriority)?.label}</span>
        )}
        <ChevronDown size={14} className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 bg-ink-900 border border-white/10 rounded-lg shadow-lg z-50 min-w-[150px]">
            <button
              type="button"
              onClick={() => handlePrioritySelect('all')}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                selectedPriority === 'all'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Priorities
            </button>
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePrioritySelect(option.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors border-t border-white/10 ${
                  selectedPriority === option.value
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={option.color}>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Initialize the plugin
function initialize() {
  // Register header button for priority filtering (view mode)
  hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', ({ doc }) => {
    return <PriorityFilterButton doc={doc} />
  })

  // Register inspector field for setting priority (edit mode)
  hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
    // Only render if we have a node and update function
    if (!node || !onUpdateNode) {
      return null
    }

    const nodeData = node.data as PriorityNodeData
    const currentPriority = nodeData.priority || 'medium'

    return (
      <div className="form-label">
        <label className="block text-sm font-medium mb-2">Priority</label>
        <div className="space-y-2">
          {PRIORITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="radio"
                name={`priority-${node.id}`}
                value={option.value}
                checked={currentPriority === option.value}
                onChange={() => {
                  onUpdateNode(node.id, (data) => ({
                    ...data,
                    priority: option.value
                  } as PriorityNodeData))
                }}
                className="form-radio"
              />
              <span className={`text-sm ${option.color} group-hover:opacity-80`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Set the priority level for this step.
        </p>
      </div>
    )
  })
}

// Export plugin definition
const plugin: Plugin = {
  name: 'Priority Extension',
  version: '1.0.0',
  initialize
}

export default plugin

