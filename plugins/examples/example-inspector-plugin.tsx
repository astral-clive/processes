/**
 * Example Inspector Plugin
 * 
 * This is a simple example plugin that demonstrates how to add custom fields
 * to the node inspector panel.
 * 
 * This plugin shows:
 * - How to register for the 'inspector:node:fields' hook
 * - How to access and update node data
 * - How to create form fields that match the inspector styling
 */

import { hooks } from '@/lib/hooks'
import type { InspectorFieldHookContext } from '@/lib/hook-types'
import type { Plugin } from '@/lib/plugins'

// Initialize the plugin
function initialize() {
  // Register for the node inspector fields hook
  hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
    // Only render if we have a node and update function
    if (!node || !onUpdateNode) {
      return null
    }

    // Get the current custom field value (or empty string if not set)
    // TypeScript note: We're extending ProcessNodeData with a custom field
    // In real plugins, you'd want to properly extend the type or use type assertions
    const customField = (node.data as any).customField || ''

    return (
      <label className="form-label">
        Custom Field
        <input
          type="text"
          value={customField}
          onChange={(event) => {
            // Update the node data with the new custom field value
            onUpdateNode(node.id, (data) => ({
              ...data,
              customField: event.target.value
            }))
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="form-input"
          placeholder="Enter custom value"
        />
        <p className="text-xs text-slate-400 mt-1">
          This is an example custom field added by a plugin.
        </p>
      </label>
    )
  })
}

// Export plugin definition
const plugin: Plugin = {
  name: 'Example Inspector Plugin',
  version: '1.0.0',
  initialize
}

export default plugin

