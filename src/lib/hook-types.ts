/**
 * Hook Type Definitions
 * 
 * This file defines all types, interfaces, and constants related to the plugin hook system.
 * It serves as documentation for AI and developers to understand available hooks.
 */

import type { ReactNode } from 'react'
import type { ProcessDocument, ProcessNode, ProcessEdge } from '@/types'

/**
 * Base type for hook callback functions.
 * 
 * @template TContext - The context object passed to the callback
 * @template TReturn - The return type of the callback (defaults to ReactNode)
 */
export type HookCallback<TContext extends Record<string, unknown> = Record<string, unknown>, TReturn = ReactNode> = (
  context: TContext
) => TReturn | null | undefined

/**
 * Interface for the hook registry system.
 */
export interface HookRegistry {
  /**
   * Register a callback for a specific hook.
   */
  addAction<TContext extends Record<string, unknown>>(
    hookName: string,
    callback: HookCallback<TContext>
  ): () => void

  /**
   * Execute all callbacks registered for a hook.
   */
  doAction<TContext extends Record<string, unknown>, TReturn = ReactNode>(
    hookName: string,
    context: TContext
  ): TReturn[]
}

/**
 * Context object passed to header button hooks.
 * 
 * @hook header:viewMode:buttons - Add buttons to the header when in view mode
 * @hook header:editMode:buttons - Add buttons to the header when in edit mode
 * 
 * @property editMode - Whether the application is in edit mode
 * @property doc - The current process document
 */
export interface HeaderButtonHookContext {
  editMode: boolean
  doc: ProcessDocument
}

/**
 * Context object passed to inspector field hooks.
 * 
 * @hook inspector:node:fields - Add form fields to the node inspector panel
 * @hook inspector:edge:fields - Add form fields to the edge inspector panel
 * 
 * @property node - The currently selected node (only for inspector:node:fields)
 * @property edge - The currently selected edge (only for inspector:edge:fields)
 * @property onUpdateNode - Function to update node data (only for inspector:node:fields)
 * @property onUpdateEdge - Function to update edge data (only for inspector:edge:fields)
 */
export interface InspectorFieldHookContext {
  node?: ProcessNode
  edge?: ProcessEdge
  onUpdateNode?: (id: string, updater: (data: any) => any) => void
  onUpdateEdge?: (id: string, updater: (edge: ProcessEdge) => ProcessEdge) => void
}

/**
 * Context object passed to node rendering hooks.
 * 
 * @hook node:render:content - Add content below the description in nodes
 * @hook node:render:badge - Add badges/indicators to the top-right of nodes
 * 
 * @property id - The node ID
 * @property data - The node data (title, description, color, custom fields)
 * @property selected - Whether the node is currently selected
 */
export interface NodeRenderHookContext {
  id: string
  data: ProcessNode['data']
  selected: boolean
}

/**
 * Context object passed to edge rendering hooks.
 * 
 * @hook edge:render:badge - Add badges/indicators to edges
 * 
 * @property id - The edge ID
 * @property data - The edge data (label, color, lineStyle, etc.)
 * @property source - The source node ID
 * @property target - The target node ID
 */
export interface EdgeRenderHookContext {
  id: string
  data?: ProcessEdge['data']
  source: string
  target: string
}

/**
 * Hook metadata - describes all available hooks for AI/developer discovery.
 */
export const HOOK_DEFINITIONS = {
  /**
   * Hook: header:viewMode:buttons
   * 
   * Purpose: Add custom buttons to the header when the application is in view mode.
   * 
   * Context provided:
   * - editMode: boolean (always false for this hook)
   * - doc: ProcessDocument (the current process document)
   * 
   * Expected return: ReactNode (typically a button or button group)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('header:viewMode:buttons', ({ doc }) => {
   *   return (
   *     <button onClick={() => doSomething(doc)}>
   *       My Action
   *     </button>
   *   )
   * })
   * ```
   * 
   * Location: FlowWorkspace header, visible when editMode is false
   */
  'header:viewMode:buttons': {
    description: 'Add buttons to the header when in view mode',
    context: {
      editMode: 'boolean - always false for this hook',
      doc: 'ProcessDocument - the current process document'
    },
    returnType: 'ReactNode - typically a button element',
    location: 'FlowWorkspace.tsx header, view mode section'
  },

  /**
   * Hook: header:editMode:buttons
   * 
   * Purpose: Add custom buttons to the header when the application is in edit mode.
   * 
   * Context provided:
   * - editMode: boolean (always true for this hook)
   * - doc: ProcessDocument (the current process document)
   * 
   * Expected return: ReactNode (typically a button or button group)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('header:editMode:buttons', ({ doc }) => {
   *   return (
   *     <button onClick={() => performEditAction(doc)}>
   *       Edit Action
   *     </button>
   *   )
   * })
   * ```
   * 
   * Location: FlowWorkspace header, visible when editMode is true
   */
  'header:editMode:buttons': {
    description: 'Add buttons to the header when in edit mode',
    context: {
      editMode: 'boolean - always true for this hook',
      doc: 'ProcessDocument - the current process document'
    },
    returnType: 'ReactNode - typically a button element',
    location: 'FlowWorkspace.tsx header, edit mode section'
  },

  /**
   * Hook: inspector:node:fields
   * 
   * Purpose: Add custom form fields to the node inspector panel.
   * 
   * Context provided:
   * - node: ProcessNode (the currently selected node)
   * - onUpdateNode: function to update the node's data
   * 
   * Expected return: ReactNode (typically form fields or UI elements)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('inspector:node:fields', ({ node, onUpdateNode }) => {
   *   if (!node || !onUpdateNode) return null
   *   
   *   return (
   *     <label className="form-label">
   *       Custom Field
   *       <input
   *         value={node.data.customField || ''}
   *         onChange={(e) => onUpdateNode(node.id, (data) => ({
   *           ...data,
   *           customField: e.target.value
   *         }))}
   *         className="form-input"
   *       />
   *     </label>
   *   )
   * })
   * ```
   * 
   * Location: InspectorPanel component, node editing section
   */
  'inspector:node:fields': {
    description: 'Add form fields to the node inspector panel',
    context: {
      node: 'ProcessNode - the currently selected node',
      onUpdateNode: 'function(id, updater) - function to update node data'
    },
    returnType: 'ReactNode - typically form fields',
    location: 'FlowWorkspace.tsx InspectorPanel, node section'
  },

  /**
   * Hook: inspector:edge:fields
   * 
   * Purpose: Add custom form fields to the edge inspector panel.
   * 
   * Context provided:
   * - edge: ProcessEdge (the currently selected edge)
   * - onUpdateEdge: function to update the edge's data
   * 
   * Expected return: ReactNode (typically form fields or UI elements)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('inspector:edge:fields', ({ edge, onUpdateEdge }) => {
   *   if (!edge || !onUpdateEdge) return null
   *   
   *   return (
   *     <label className="form-label">
   *       Custom Field
   *       <input
   *         value={edge.data?.customField || ''}
   *         onChange={(e) => onUpdateEdge(edge.id, (current) => ({
   *           ...current,
   *           data: { ...current.data, customField: e.target.value }
   *         }))}
   *         className="form-input"
   *       />
   *     </label>
   *   )
   * })
   * ```
   * 
   * Location: InspectorPanel component, edge editing section
   */
  'inspector:edge:fields': {
    description: 'Add form fields to the edge inspector panel',
    context: {
      edge: 'ProcessEdge - the currently selected edge',
      onUpdateEdge: 'function(id, updater) - function to update edge data'
    },
    returnType: 'ReactNode - typically form fields',
    location: 'FlowWorkspace.tsx InspectorPanel, edge section'
  },

  /**
   * Hook: node:render:content
   * 
   * Purpose: Add custom content below the description inside flowchart nodes.
   * This allows plugins to display additional information directly on the node.
   * 
   * Context provided:
   * - id: string (the node ID)
   * - data: ProcessNodeData (the node data including title, description, color, custom fields)
   * - selected: boolean (whether the node is currently selected)
   * 
   * Expected return: ReactNode (typically text, badges, or small UI elements)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('node:render:content', ({ id, data, selected }) => {
   *   const teamMembers = (data as any).teamMembers || []
   *   if (teamMembers.length === 0) return null
   *   
   *   return (
   *     <div className="text-xs mt-2 text-slate-600">
   *       👥 {teamMembers.length} team members
   *     </div>
   *   )
   * })
   * ```
   * 
   * Location: ProcessNode.tsx component, inside node body
   * 
   * Note: Keep content minimal and styled appropriately for small node sizes.
   */
  'node:render:content': {
    description: 'Add content below description in flowchart nodes',
    context: {
      id: 'string - the node ID',
      data: 'ProcessNodeData - node data (title, description, color, custom fields)',
      selected: 'boolean - whether the node is currently selected'
    },
    returnType: 'ReactNode - typically text, badges, or small UI elements',
    location: 'ProcessNode.tsx, inside node body after description'
  },

  /**
   * Hook: node:render:badge
   * 
   * Purpose: Add badges or indicators to the top-right corner of flowchart nodes.
   * Useful for status indicators, counts, icons, or other visual metadata.
   * 
   * Context provided:
   * - id: string (the node ID)
   * - data: ProcessNodeData (the node data including title, description, color, custom fields)
   * - selected: boolean (whether the node is currently selected)
   * 
   * Expected return: ReactNode (typically small badges or icons)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('node:render:badge', ({ id, data, selected }) => {
   *   const priority = (data as any).priority
   *   if (!priority || priority === 'Low') return null
   *   
   *   return (
   *     <span className={`badge ${priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>
   *       {priority}
   *     </span>
   *   )
   * })
   * ```
   * 
   * Location: ProcessNode.tsx component, positioned at top-right
   * 
   * Note: Keep badges small and unobtrusive.
   */
  'node:render:badge': {
    description: 'Add badges/indicators to top-right of flowchart nodes',
    context: {
      id: 'string - the node ID',
      data: 'ProcessNodeData - node data (title, description, color, custom fields)',
      selected: 'boolean - whether the node is currently selected'
    },
    returnType: 'ReactNode - typically small badges or icons',
    location: 'ProcessNode.tsx, positioned at top-right corner'
  },

  /**
   * Hook: edge:render:badge
   * 
   * Purpose: Add badges or indicators to flowchart edges.
   * Appears near the edge label (or at midpoint if no label).
   * 
   * Context provided:
   * - id: string (the edge ID)
   * - data: ProcessEdgeData (edge data including label, color, lineStyle, etc.)
   * - source: string (source node ID)
   * - target: string (target node ID)
   * 
   * Expected return: ReactNode (typically small badges or icons)
   * 
   * Example:
   * ```typescript
   * hooks.addAction('edge:render:badge', ({ id, data, source, target }) => {
   *   const validated = (data as any)?.validated
   *   if (!validated) return null
   *   
   *   return (
   *     <span className="text-xs bg-green-500 text-white px-1 rounded">
   *       ✓
   *     </span>
   *   )
   * })
   * ```
   * 
   * Location: ProcessEdge.tsx component, near edge label
   * 
   * Note: Keep badges minimal to avoid cluttering the flowchart.
   */
  'edge:render:badge': {
    description: 'Add badges/indicators to flowchart edges',
    context: {
      id: 'string - the edge ID',
      data: 'ProcessEdgeData - edge data (label, color, lineStyle, custom fields)',
      source: 'string - source node ID',
      target: 'string - target node ID'
    },
    returnType: 'ReactNode - typically small badges or icons',
    location: 'ProcessEdge.tsx, near edge label'
  }
} as const

/**
 * Type representing all available hook names.
 */
export type HookName = keyof typeof HOOK_DEFINITIONS

/**
 * Get hook metadata for a specific hook name.
 * Useful for documentation and discovery.
 */
export function getHookDefinition(hookName: HookName) {
  return HOOK_DEFINITIONS[hookName]
}

/**
 * Get all available hook names.
 */
export function getAllHookNames(): HookName[] {
  return Object.keys(HOOK_DEFINITIONS) as HookName[]
}

