# Plugin System Documentation

This document explains how to create plugins/extensions for the Process Flowchart application. The plugin system follows a WordPress-style hook architecture that allows you to extend functionality without modifying core code.

## Overview

Plugins are TypeScript modules that register callback functions for specific "hooks" in the application. When the application reaches a hook point, it executes all registered callbacks, allowing plugins to inject UI elements or modify behavior.

## Quick Start

1. Create a new TypeScript file in the `plugins/` directory
2. Import the hooks system and types
3. Register callbacks for the hooks you want to use
4. Export a plugin object that implements the `Plugin` interface
5. The plugin will be automatically discovered and loaded (no manual registration needed)

## Architecture Overview

### ReactFlow Foundation

This application uses [ReactFlow](https://reactflow.dev/) as its underlying flowchart rendering engine. Understanding this architecture is crucial for knowing what plugins can and cannot do.

**Key Architecture Points:**

1. **Nodes and Edges are React Components**: The visual representation of nodes and edges are defined by React components:
   - Nodes: `src/components/process/ProcessNode.tsx`
   - Edges: `src/components/process/ProcessEdge.tsx`
   - These components are registered with ReactFlow in `src/components/process/FlowWorkspace.tsx`

2. **Data-Driven Rendering**: The visual appearance of nodes/edges is determined by their data properties:
   - Node appearance is controlled by `ProcessNodeData` (title, description, color)
   - Edge appearance is controlled by `ProcessEdgeData` (label, color, lineStyle, arrow, branchStyle)
   - The React components read these data properties and render accordingly

3. **Plugin System Scope**: The plugin system operates at the **data and UI injection level**, not at the rendering component level.

### What Plugins CAN Do

- ✅ Add buttons to the header (view mode or edit mode)
- ✅ Add form fields to the inspector panels (for nodes or edges)
- ✅ Modify node/edge data properties (title, description, color, custom fields, etc.)
- ✅ Access and read the entire process document
- ✅ Perform actions based on document state
- ✅ Store custom data in node/edge data objects

### What Plugins CANNOT Do

- ❌ Customize the visual rendering of nodes/edges (e.g., change node shape, add custom graphics)
- ❌ Modify the React components that render nodes/edges (`ProcessNode.tsx`, `ProcessEdge.tsx`)
- ❌ Add new node or edge types to ReactFlow
- ❌ Change ReactFlow configuration (connection rules, snap-to-grid, etc.)
- ❌ Modify the canvas background or ReactFlow behavior

### Visual Customization Limitations

If you need to customize how nodes or edges look visually (beyond changing data properties like color, title, etc.), you must:

1. **Modify the core components directly**:
   - Edit `src/components/process/ProcessNode.tsx` for node visual changes
   - Edit `src/components/process/ProcessEdge.tsx` for edge visual changes
   - This is **not** achievable through the plugin system

2. **Understand the data-to-visual mapping**:
   - Node color → affects background and border colors (see `ProcessNode.tsx`)
   - Edge color → affects stroke color (see `ProcessEdge.tsx`)
   - Edge lineStyle → affects dash pattern (solid/dashed/dotted)
   - Edge branchStyle → affects label badge styling
   - These are the only visual aspects that can be controlled via data

**For AI Developers**: When building plugins, focus on data manipulation and UI injection (buttons, form fields). Do not attempt to customize visual rendering through plugins - this requires modifying core components outside the plugin system.

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

**Rendering notes**:
- This hook modifies **node data**, not visual rendering
- Changing data properties (e.g., `color`, `title`, `description`) will affect appearance because the `ProcessNode` component reads from data
- You cannot change the node's visual structure, shape, or component behavior through this hook
- See "Understanding Node/Edge Rendering" section for details on how data affects visual appearance

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

**Rendering notes**:
- This hook modifies **edge data**, not visual rendering
- Changing data properties (e.g., `color`, `lineStyle`, `arrow`, `label`, `branchStyle`) will affect appearance because the `ProcessEdge` component reads from data
- You cannot change the edge's path calculation, curve shape, or component behavior through this hook
- See "Understanding Node/Edge Rendering" section for details on how data affects visual appearance

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

## Understanding Node/Edge Rendering

**For AI Developers**: This section explains how nodes and edges are rendered. This is for **understanding purposes only** - plugins cannot modify this rendering. If you need to understand what visual changes are possible through data manipulation, read this section.

### Component Architecture

The flowchart uses ReactFlow with custom React components:

- **Node Component**: `src/components/process/ProcessNode.tsx`
- **Edge Component**: `src/components/process/ProcessEdge.tsx`
- **Workspace**: `src/components/process/FlowWorkspace.tsx` (registers components with ReactFlow)

These components are React components that receive props from ReactFlow and render based on the data properties.

### How Data Properties Affect Visual Appearance

#### Node Rendering (`ProcessNode.tsx`)

The `ProcessNode` component reads from `ProcessNodeData` and renders accordingly:

| Data Property | Visual Effect | How It Works |
|--------------|---------------|--------------|
| `title` | Displayed as the main text in the node | Rendered in `<p className="process-node__title">` |
| `description` | Displayed as secondary text below title | Rendered in `<p className="process-node__description">` |
| `color` | Controls background and border colors | Converted to RGB, used for `backgroundColor` (15% opacity) and `borderColor` (40% opacity) |

**Key Code Reference** (from `ProcessNode.tsx`):
```typescript
const color = data.color || '#3b82f6'  // Default blue
const rgb = hexToRgb(color)
const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
```

**What Plugins Can Control**: By modifying `node.data.color`, plugins can change the node's background and border colors. The node shape, handles, and layout are fixed by the component.

#### Edge Rendering (`ProcessEdge.tsx`)

The `ProcessEdge` component reads from `ProcessEdgeData` and renders accordingly:

| Data Property | Visual Effect | How It Works |
|--------------|---------------|--------------|
| `label` | Text displayed on the edge | Rendered in a badge positioned at the edge midpoint |
| `color` | Controls the edge stroke color | Applied to `BaseEdge` style as `stroke` |
| `lineStyle` | Controls dash pattern | `'solid'`, `'dashed'` (8 8), or `'dotted'` (2 10) |
| `arrow` | Controls arrow marker | `'none'`, `'arrow'` (arrowclosed marker), or `'diamond'` |
| `branchStyle` | Controls label badge styling | `'default'`, `'positive'` (green), `'caution'` (yellow), `'danger'` (red) |

**Key Code Reference** (from `ProcessEdge.tsx`):
```typescript
const color = data?.color ?? '#94a3b8'
const lineStyle = data?.lineStyle ?? 'solid'
const dashArray = lineStyle === 'dashed' ? '8 8' : lineStyle === 'dotted' ? '2 10' : undefined
```

**What Plugins Can Control**: By modifying edge data properties, plugins can change:
- Edge color (stroke)
- Line style (solid/dashed/dotted)
- Arrow presence and type
- Label text and badge styling

**What Plugins Cannot Control**: The edge path calculation (handled by ReactFlow's `getBezierPath`), the edge shape/curve, or the rendering component structure.

### Important Notes for Plugin Development

1. **Data Changes = Visual Changes**: When you modify node/edge data through `onUpdateNode` or `onUpdateEdge`, the visual appearance will update automatically because the components re-render with new data.

2. **Component Structure is Fixed**: The HTML structure, CSS classes, and React component logic in `ProcessNode.tsx` and `ProcessEdge.tsx` cannot be modified through plugins.

3. **ReactFlow Handles Layout**: Node positions, edge paths, and canvas interactions are managed by ReactFlow, not by plugins.

4. **For Visual Customization**: If you need to change node shapes, add custom graphics, or modify component structure, you must edit the core component files directly. This is outside the plugin system's scope.

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

**Automatic Discovery**: The plugin system automatically discovers and loads all `.tsx` files in the `plugins/` directory (excluding the `examples/` subdirectory). No manual registration is required!

After creating your plugin file:

1. **Place it in the `plugins/` directory** (or any subdirectory except `examples/`)
2. **Ensure it has a `.tsx` extension** (required for auto-discovery)
3. **Restart your dev server** (or wait for hot reload)

The plugin will automatically be discovered and loaded when the application starts. You'll see a console message: `"Loading plugin: [Your Plugin Name]"`

**Note**: Files in `plugins/examples/` are excluded from auto-discovery as they are reference examples only.

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

**IMPORTANT FOR AI DEVELOPERS**: This plugin system works with **data and UI injection only**. You cannot customize the visual rendering of nodes/edges through plugins. If a user requests visual customization (e.g., changing node shapes, adding custom graphics), explain that this requires modifying core components (`ProcessNode.tsx`, `ProcessEdge.tsx`) and is outside the plugin system's scope.

When building a plugin, follow these steps:

1. **Determine what you want to extend**:
   - Header buttons (view or edit mode)?
   - Inspector fields (node or edge)?
   - Multiple hooks?
   - **Note**: Visual rendering customization is NOT possible via plugins

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

6. **Test your plugin**: The plugin will auto-load when placed in the `plugins/` directory

7. **Match styling**: Use the existing CSS classes and patterns for consistency

8. **Understand rendering limitations**:
   - Plugins modify **data**, not visual rendering
   - Changing node/edge data (color, title, etc.) will affect appearance because the components read from data
   - You cannot change HOW nodes/edges are rendered (their component structure)
   - See "Understanding Node/Edge Rendering" section below for details

## Examples

- `plugins/examples/example-button-plugin.ts` - Simple button example
- `plugins/examples/example-inspector-plugin.ts` - Simple inspector field example
- `plugins/priority-extension.ts` - Complete multi-hook extension example

Use these examples as templates when building new plugins.

