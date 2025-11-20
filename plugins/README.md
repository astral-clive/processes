# Plugin System Documentation

This document explains how to create plugins/extensions for the Process Flowchart application. The plugin system follows a WordPress-style hook architecture that allows you to extend functionality without modifying core code.

## Overview

Plugins are TypeScript modules that register callback functions for specific "hooks" in the application. When the application reaches a hook point, it executes all registered callbacks, allowing plugins to inject UI elements or modify behavior.

## Quick Start

1. Create a new TypeScript file in the `plugins/` directory
2. Import the hooks system and types
3. Register callbacks for the hooks you want to use
4. Export a plugin object that implements the `Plugin` interface
5. Import and register the plugin in `src/lib/plugins.ts`

## Plugin Structure

Every plugin must export a default object that implements the `Plugin` interface:

```typescript
import { hooks } from '@/lib/hooks'
import type { Plugin } from '@/lib/plugins'
import type { HeaderButtonHookContext } from '@/lib/hook-types'

function initialize() {
  // Register your hooks here
  hooks.addAction('header:viewMode:buttons', (context) => {
    // Return React elements to inject
    return <MyButton />
  })
}

const plugin: Plugin = {
  name: 'My Plugin Name',
  version: '1.0.0', // optional
  initialize
}

export default plugin
```

## Available Hooks

### 1. `header:viewMode:buttons`

**Purpose**: Add buttons to the header when the application is in view mode (read-only).

**Context provided**:
```typescript
{
  editMode: boolean  // Always false for this hook
  doc: ProcessDocument  // The current process document
}
```

**Return type**: `ReactNode` (typically a button element)

**Example**:
```typescript
hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', ({ doc }) => {
  return (
    <button onClick={() => doSomething(doc)} className="icon-button">
      My Button
    </button>
  )
})
```

**When it runs**: Only when `editMode` is `false` in the FlowWorkspace header

---

### 2. `header:editMode:buttons`

**Purpose**: Add buttons to the header when the application is in edit mode.

**Context provided**:
```typescript
{
  editMode: boolean  // Always true for this hook
  doc: ProcessDocument  // The current process document
}
```

**Return type**: `ReactNode` (typically a button element)

**Example**:
```typescript
hooks.addAction<HeaderButtonHookContext>('header:editMode:buttons', ({ doc }) => {
  return (
    <button onClick={() => performEditAction(doc)} className="icon-button">
      Edit Action
    </button>
  )
})
```

**When it runs**: Only when `editMode` is `true` in the FlowWorkspace header

---

### 3. `inspector:node:fields`

**Purpose**: Add custom form fields to the node inspector panel.

**Context provided**:
```typescript
{
  node?: ProcessNode  // The currently selected node (undefined if nothing selected)
  onUpdateNode?: (id: string, updater: (data: ProcessNodeData) => ProcessNodeData) => void
  // Function to update node data - receives node ID and an updater function
}
```

**Return type**: `ReactNode` (typically form fields)

**Example**:
```typescript
hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
  if (!node || !onUpdateNode) return null
  
  const customValue = (node.data as any).customField || ''
  
  return (
    <label className="form-label">
      Custom Field
      <input
        type="text"
        value={customValue}
        onChange={(e) => onUpdateNode(node.id, (data) => ({
          ...data,
          customField: e.target.value
        }))}
        className="form-input"
        placeholder="Enter value"
      />
    </label>
  )
})
```

**When it runs**: When a node is selected and the inspector panel is open in edit mode

**Styling notes**:
- Use `className="form-label"` for label containers
- Use `className="form-input"` for input fields
- Use `className="form-toggle"` for checkbox/toggle inputs
- Match the existing inspector styling for consistency

---

### 4. `inspector:edge:fields`

**Purpose**: Add custom form fields to the edge inspector panel.

**Context provided**:
```typescript
{
  edge?: ProcessEdge  // The currently selected edge (undefined if nothing selected)
  onUpdateEdge?: (id: string, updater: (edge: ProcessEdge) => ProcessEdge) => void
  // Function to update edge data - receives edge ID and an updater function
}
```

**Return type**: `ReactNode` (typically form fields)

**Example**:
```typescript
hooks.addAction<InspectorFieldHookContext>('inspector:edge:fields', ({ edge, onUpdateEdge }) => {
  if (!edge || !onUpdateEdge) return null
  
  const customValue = edge.data?.customField || ''
  
  return (
    <label className="form-label">
      Custom Field
      <input
        type="text"
        value={customValue}
        onChange={(e) => onUpdateEdge(edge.id, (current) => ({
          ...current,
          data: { ...current.data, customField: e.target.value }
        }))}
        className="form-input"
        placeholder="Enter value"
      />
    </label>
  )
})
```

**When it runs**: When an edge is selected and the inspector panel is open in edit mode

---

## Type Definitions

All types are exported from `@/lib/hook-types`:

```typescript
import type {
  HeaderButtonHookContext,
  InspectorFieldHookContext,
  HookName
} from '@/lib/hook-types'
```

### ProcessNodeData

Nodes have this base structure:
```typescript
{
  title: string
  description: string
  color?: string
  // Plugins can extend this with additional properties
}
```

### ProcessEdgeData

Edges have this base structure:
```typescript
{
  label?: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  arrow: 'none' | 'arrow' | 'diamond'
  branchStyle: 'default' | 'positive' | 'caution' | 'danger'
  // Plugins can extend this with additional properties
}
```

## Extending Node/Edge Data

To add custom properties to nodes or edges, you can safely extend the data object. TypeScript will complain, so use type assertions when needed:

```typescript
// When reading:
const customValue = (node.data as any).myCustomField

// When writing:
onUpdateNode(node.id, (data) => ({
  ...data,
  myCustomField: newValue
}))
```

For better type safety, you can create an extended type:

```typescript
type ExtendedNodeData = ProcessNodeData & {
  myCustomField?: string
}

const customValue = (node.data as ExtendedNodeData).myCustomField
```

## Styling Guidelines

Plugins should match the existing UI styling:

- **Buttons**: Use `className="icon-button"` for icon buttons in the header
- **Form labels**: Use `className="form-label"` for form field containers
- **Form inputs**: Use `className="form-input"` for text inputs
- **Form toggles**: Use `className="form-toggle"` for checkboxes
- **Colors**: Follow the existing color scheme (slate, ink, etc.)
- **Spacing**: Match existing spacing patterns (`space-y-4`, `gap-2`, etc.)

The application uses Tailwind CSS, so you can use any Tailwind classes.

## Complete Example: Priority Extension

See `priority-extension.ts` for a complete working example that:
- Adds a priority field to nodes (High/Medium/Low)
- Shows priority in the inspector
- Adds a filter button to the view mode header
- Demonstrates state management and complex UI interactions

## Registering Your Plugin

After creating your plugin file:

1. Import it in `src/lib/plugins.ts`:
```typescript
import priorityExtension from '@/plugins/priority-extension'

export function initializePlugins(): void {
  loadPlugins([
    priorityExtension,
    // Add your plugin here
  ])
}
```

2. The plugin will automatically initialize when the application starts

## Debugging

To check which hooks are registered:

```typescript
import { getRegisteredHooksInfo } from '@/lib/plugins'

console.log(getRegisteredHooksInfo())
// Output: { 'header:viewMode:buttons': 2, 'inspector:node:fields': 1, ... }
```

## Best Practices

1. **Always check for required context**: Before using `node`, `edge`, `onUpdateNode`, or `onUpdateEdge`, check if they exist
2. **Return null for invalid states**: If the hook context isn't valid, return `null` instead of rendering
3. **Use semantic HTML**: Use proper form elements and labels for accessibility
4. **Match existing patterns**: Follow the styling and interaction patterns of the core application
5. **Handle errors gracefully**: Wrap plugin logic in try-catch if needed
6. **Document your plugin**: Add comments explaining what your plugin does

## For AI: Instructions to Build a Plugin

When building a plugin, follow these steps:

1. **Determine what you want to extend**:
   - Header buttons (view or edit mode)?
   - Inspector fields (node or edge)?
   - Multiple hooks?

2. **Create the plugin file structure**:
   ```typescript
   import { hooks } from '@/lib/hooks'
   import type { Plugin } from '@/lib/plugins'
   import type { [HookContextType] } from '@/lib/hook-types'
   
   function initialize() {
     hooks.addAction('[hook-name]', (context) => {
       // Your implementation
     })
   }
   
   const plugin: Plugin = {
     name: 'Plugin Name',
     initialize
   }
   
   export default plugin
   ```

3. **Access the context**: Use the context object provided to the callback to access:
   - Current document (`doc`)
   - Selected node/edge (`node`/`edge`)
   - Update functions (`onUpdateNode`/`onUpdateEdge`)
   - Other state (`editMode`)

4. **Return React elements**: Return JSX elements that match the expected hook return type:
   - Header hooks: Button elements
   - Inspector hooks: Form fields

5. **Handle edge cases**: Check for undefined values and return `null` if conditions aren't met

6. **Test your plugin**: Import and register it to verify it works

7. **Match styling**: Use the existing CSS classes and patterns for consistency

## Examples

- `plugins/examples/example-button-plugin.ts` - Simple button example
- `plugins/examples/example-inspector-plugin.ts` - Simple inspector field example
- `plugins/priority-extension.ts` - Complete multi-hook extension example

Use these examples as templates when building new plugins.

