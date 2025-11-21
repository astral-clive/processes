/**
 * Example Button Plugin
 * 
 * This is a simple example plugin that demonstrates how to add a button
 * to the header in view mode.
 * 
 * This plugin shows:
 * - How to register for the 'header:viewMode:buttons' hook
 * - How to access context (doc) in a plugin
 * - How to return React elements to be rendered
 */

import { hooks } from '@/lib/hooks'
import type { HeaderButtonHookContext } from '@/lib/hook-types'
import type { Plugin } from '@/lib/plugins'
import { AlertCircle } from 'lucide-react'

// Initialize the plugin
function initialize() {
  // Register for the view mode header buttons hook
  hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', ({ doc }) => {
    // Create a simple button that shows an alert with the current process info
    const handleClick = () => {
      alert(`Current process: ${doc.meta.categoryId}/${doc.meta.processId}\nNodes: ${doc.nodes.length}\nEdges: ${doc.edges.length}`)
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="icon-button"
        title="Show process info"
      >
        <AlertCircle size={18} />
      </button>
    )
  })
}

// Export plugin definition
const plugin: Plugin = {
  name: 'Example Button Plugin',
  version: '1.0.0',
  initialize
}

export default plugin

