/**
 * Team Members Accordion Plugin
 * 
 * This example plugin demonstrates multiple hook types working together:
 * 1. header:viewMode:buttons & header:editMode:buttons - Toggle button to expand/collapse all accordions
 * 2. node:render:content - Collapsible accordion on flowchart nodes showing all team members
 * 3. node:render:badge - Count badge at top-right corner of nodes
 * 4. inspector:node:fields - Full accordion UI in inspector panel for managing team members
 * 
 * Features:
 * - Header button (📄/📋) to expand/collapse all team member lists at once
 * - Collapsible accordion on each flowchart node displaying full list of team member names
 * - Badge indicator showing number of members at top-right of each node
 * - Inspector panel with add/remove functionality for team members
 * - Persists data in node.data.teamMembers array
 * - Uses core CSS classes (node-plugin-*) for consistent styling
 * - Global state management for synchronized accordion toggling
 * 
 * This demonstrates how plugins can coordinate across multiple hook points to create
 * a cohesive feature that includes UI controls, visual rendering, and data management.
 */

import React, { useState } from 'react'
import { hooks } from '@/lib/hooks'
import type { InspectorFieldHookContext, NodeRenderHookContext, HeaderButtonHookContext } from '@/lib/hook-types'
import type { Plugin } from '@/lib/plugins'

// Extend the node data type to include our custom field
type ExtendedNodeData = {
  teamMembers?: string[]
}

// Global state for controlling all accordions
// Using a counter that increments to force re-renders and toggle state
let globalExpandToggle = 0
let globalExpandState = false

const toggleAllAccordions = () => {
  globalExpandState = !globalExpandState
  globalExpandToggle++
}

function initialize() {
  // Register header buttons to toggle all accordions
  const addToggleButton = ({ editMode }: HeaderButtonHookContext) => {
    // Track state to force button re-render when clicked
    const [, setForceUpdate] = useState(0)
    
    return (
      <button
        onClick={() => {
          toggleAllAccordions()
          setForceUpdate(prev => prev + 1) // Force button to re-render with new icon
        }}
        className="icon-button"
        title={globalExpandState ? "Collapse all team lists" : "Expand all team lists"}
      >
        {globalExpandState ? '📋' : '📄'}
      </button>
    )
  }
  
  hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', addToggleButton)
  hooks.addAction<HeaderButtonHookContext>('header:editMode:buttons', addToggleButton)

  // Register for the node render content hook - displays on the flowchart
  hooks.addAction<NodeRenderHookContext>('node:render:content', ({ id, data, selected }) => {
    const teamMembers = ((data as ExtendedNodeData).teamMembers || []) as string[]
    
    // Don't show anything if no team members
    if (teamMembers.length === 0) return null
    
    // State for accordion - individual toggle state
    const [isExpanded, setIsExpanded] = useState(globalExpandState)
    // Track the last known global toggle version to detect changes
    const lastToggleVersionRef = React.useRef(globalExpandToggle)
    
    // Check if global toggle button was pressed and sync accordion state
    React.useEffect(() => {
      // Use a small interval to check for global toggle changes
      const checkInterval = setInterval(() => {
        if (lastToggleVersionRef.current !== globalExpandToggle) {
          lastToggleVersionRef.current = globalExpandToggle
          setIsExpanded(globalExpandState)
        }
      }, 100) // Check every 100ms
      
      return () => clearInterval(checkInterval)
    }, [])
    
    return (
      <div className="node-plugin-content">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="node-plugin-accordion-header"
        >
          <span className="flex items-center gap-1">
            <span>👥</span>
            <span>{teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}</span>
          </span>
          <span className="text-[10px]">
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>
        
        {/* Accordion Content - List of Members */}
        {isExpanded && (
          <ul className="node-plugin-list">
            {teamMembers.map((name, index) => (
              <li key={index} className="node-plugin-list-item">
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  })

  // Register for the node badge hook - shows badge at top-right corner
  hooks.addAction<NodeRenderHookContext>('node:render:badge', ({ id, data, selected }) => {
    const teamMembers = ((data as ExtendedNodeData).teamMembers || []) as string[]
    
    // Don't show badge if no team members
    if (teamMembers.length === 0) return null
    
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 text-xs bg-blue-500 text-white rounded-full shadow-lg">
        {teamMembers.length}
      </span>
    )
  })

  // Register for the node inspector fields hook - allows editing in inspector
  hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
    // Only render if we have a node and update function
    if (!node || !onUpdateNode) {
      return null
    }

    // State for accordion open/closed
    const [isOpen, setIsOpen] = useState(false)
    
    // State for new name input
    const [newName, setNewName] = useState('')

    // Get the current team members list (or empty array if not set)
    const teamMembers = ((node.data as ExtendedNodeData).teamMembers || []) as string[]

    // Add a new name to the list
    const handleAddName = () => {
      if (newName.trim()) {
        onUpdateNode(node.id, (data) => ({
          ...data,
          teamMembers: [...teamMembers, newName.trim()]
        }))
        setNewName('')
      }
    }

    // Remove a name from the list
    const handleRemoveName = (index: number) => {
      onUpdateNode(node.id, (data) => ({
        ...data,
        teamMembers: teamMembers.filter((_, i) => i !== index)
      }))
    }

    // Handle Enter key in input field
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddName()
      }
      // Prevent ReactFlow keyboard shortcuts
      e.stopPropagation()
    }

    return (
      <div className="form-label">
        {/* Accordion Header/Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-left text-sm font-medium text-white hover:text-slate-300 transition-colors py-2"
        >
          <span className="flex items-center gap-2">
            <span>Team Members</span>
            {teamMembers.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-slate-700 rounded-full">
                {teamMembers.length}
              </span>
            )}
          </span>
          <span className="text-slate-400 text-lg">
            {isOpen ? '▼' : '▶'}
          </span>
        </button>

        {/* Accordion Content */}
        {isOpen && (
          <div className="mt-2 space-y-3 border-l-2 border-slate-700 pl-3">
            {/* List of Names */}
            {teamMembers.length > 0 ? (
              <ul className="space-y-2">
                {teamMembers.map((name, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2 group"
                  >
                    <span className="text-sm text-white">{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveName(index)}
                      className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No team members added yet
              </p>
            )}

            {/* Add New Name Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-input flex-1 text-sm"
                placeholder="Enter name..."
              />
              <button
                type="button"
                onClick={handleAddName}
                disabled={!newName.trim()}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                Add
              </button>
            </div>

            <p className="text-xs text-slate-400 pt-1">
              Team members appear on the flowchart node in a collapsible list
            </p>
          </div>
        )}
      </div>
    )
  })
}

// Export plugin definition
const plugin: Plugin = {
  name: 'Team Members Accordion',
  version: '1.0.0',
  initialize
}

export default plugin

