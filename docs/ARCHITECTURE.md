# Architecture Overview

This document provides a high-level overview of the application architecture, specifically designed to help AI assistants and developers understand the system structure and extension points.

## Directory Structure

```
processes/
├── plugins/          # Extensions/plugins (auto-discovered *.tsx files)
│   ├── examples/    # Example plugins (not auto-loaded)
│   ├── README.md    # Plugin developer guide (PRIMARY REFERENCE)
│   ├── USER_GUIDE.md # Non-technical user guide
│   └── *.tsx        # Active plugins (auto-discovered and loaded)
│
├── src/
│   ├── components/
│   │   ├── process/
│   │   │   ├── FlowWorkspace.tsx  # Main flowchart workspace
│   │   │   ├── ProcessNode.tsx    # Node rendering component
│   │   │   └── ProcessEdge.tsx    # Edge rendering component
│   │   └── sidebar/
│   │       └── Sidebar.tsx        # Process/category navigation
│   │
│   ├── lib/
│   │   ├── hooks.ts       # Hook registry system (core)
│   │   ├── hook-types.ts  # Hook type definitions and documentation
│   │   ├── plugins.ts     # Plugin loader with auto-discovery
│   │   ├── api.ts         # File-based API client
│   │   └── layout-rules.ts # Flowchart layout algorithms
│   │
│   ├── types.ts      # Core type definitions
│   └── main.tsx      # Application entry point
│
├── data/             # Process data storage (JSON files)
│   ├── categories.json
│   └── processes/
│       └── {categoryId}-{processId}.json
│
├── docs/
│   ├── ARCHITECTURE.md    # This file
│   └── LAYOUT_RULES.md    # AI flowchart generation rules
│
├── README.md         # Main project documentation
└── .cursorrules      # AI assistant guidelines

```

## Core Architecture

### 1. ReactFlow Foundation

The application is built on [ReactFlow](https://reactflow.dev/), a React library for building node-based editors.

**Key Components:**
- **FlowWorkspace** (`src/components/process/FlowWorkspace.tsx`) - Main container that manages ReactFlow state
- **ProcessNode** (`src/components/process/ProcessNode.tsx`) - Custom node component
- **ProcessEdge** (`src/components/process/ProcessEdge.tsx`) - Custom edge component

**Data Flow:**
```
ProcessDocument (JSON) 
  → ReactFlow nodes/edges 
    → ProcessNode/ProcessEdge components 
      → Visual rendering
```

### 2. Data Storage

**File-Based Architecture:**
- No database, no external services
- All data stored as JSON files in `data/` directory
- Categories defined in `data/categories.json`
- Individual processes in `data/processes/{categoryId}-{processId}.json`

**Benefits:**
- Privacy-first (no cloud services)
- Easy to version control
- Simple backup/restore
- Portable across systems

### 3. Plugin System (Hook-Based)

**Architecture Inspiration:** WordPress hooks/filters system

**Components:**
1. **Hook Registry** (`src/lib/hooks.ts`)
   - Central registry for all hooks
   - Manages callback registration and execution
   - Type-safe with TypeScript generics

2. **Plugin Loader** (`src/lib/plugins.ts`)
   - Auto-discovers plugins from `plugins/` directory
   - Loads `.tsx` files automatically (excluding `examples/`)
   - Initializes plugins on application startup

3. **Hook Definitions** (`src/lib/hook-types.ts`)
   - Type definitions for all available hooks
   - Documentation for each hook point
   - Context types for type safety

**Hook Flow:**
```
Application reaches hook point 
  → hooks.doAction('hook:name', context)
    → Executes all registered callbacks
      → Returns array of ReactNodes
        → Renders in UI
```

## Extension Points

### Available Hooks

| Hook Name | Purpose | Location | Context Provided |
|-----------|---------|----------|------------------|
| `header:viewMode:buttons` | Add buttons to header (view mode) | FlowWorkspace.tsx | `{ editMode, doc }` |
| `header:editMode:buttons` | Add buttons to header (edit mode) | FlowWorkspace.tsx | `{ editMode, doc }` |
| `inspector:node:fields` | Add fields to node inspector | FlowWorkspace.tsx | `{ node, onUpdateNode }` |
| `inspector:edge:fields` | Add fields to edge inspector | FlowWorkspace.tsx | `{ edge, onUpdateEdge }` |

### What Plugins Can Do

✅ **Allowed:**
- Add UI elements (buttons, form fields) via hooks
- Modify node/edge data properties
- Read process document state
- Store custom data in nodes/edges
- Perform actions based on document state
- Create subdirectories within `plugins/` for organization
- Include multiple files, components, services within plugin directory
- Use external npm packages (if already in package.json)

❌ **Not Allowed:**
- Modify any files outside `plugins/` directory
- Modify visual rendering of nodes/edges (requires core component changes)
- Change ReactFlow configuration
- Add new node/edge types
- Modify core application behavior outside of hooks
- Edit `src/` directory files
- Modify configuration files (`vite.config.ts`, `package.json`, etc.)

## Key Design Principles

### 1. Data-Driven Rendering

Nodes and edges are rendered based on their data properties:

**Node Data Structure:**
```typescript
{
  title: string
  description: string
  color?: string
  // Plugins can extend with custom fields
}
```

**Edge Data Structure:**
```typescript
{
  label?: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  arrow: 'none' | 'arrow' | 'diamond'
  branchStyle: 'default' | 'positive' | 'caution' | 'danger'
  // Plugins can extend with custom fields
}
```

### 2. Plugin Isolation

- Plugins are isolated from each other
- Plugins cannot modify core components
- Plugin errors don't crash the application
- Plugins can be added/removed without code changes

### 3. Type Safety

- TypeScript throughout
- Hook context types defined
- Plugin interface enforced
- Type-safe hook registration

### 4. Auto-Discovery

- No manual plugin registration
- Drop `.tsx` file in `plugins/` directory
- Automatic load on startup
- Remove file to disable plugin

## Data Flow Diagram

```
User Interaction
    ↓
React Component (FlowWorkspace, Sidebar, etc.)
    ↓
Hook Execution (hooks.doAction)
    ↓
Plugin Callbacks (registered via hooks.addAction)
    ↓
Return React Elements
    ↓
Render in UI
```

## Development Workflow

### Adding a New Plugin

**Simple Plugin (single file):**
1. Create file: `plugins/my-plugin.tsx`
2. Implement `Plugin` interface:
   ```typescript
   export default {
     name: 'My Plugin',
     initialize: () => { /* register hooks */ }
   }
   ```
3. Restart dev server
4. Plugin auto-loads and registers hooks

**Complex Plugin (multiple files):**
1. Create directory: `plugins/my-plugin/`
2. Create entry point: `plugins/my-plugin/index.tsx`
3. Add supporting files in subdirectories:
   ```
   plugins/my-plugin/
     ├── index.tsx          # Exports Plugin object
     ├── components/        # UI components
     ├── services/          # API integrations
     └── utils/             # Helpers
   ```
4. Restart dev server
5. Plugin auto-loads from entry point

**Critical Rule**: ALL plugin code must remain within `plugins/` directory. Never modify files outside of this directory.

### Modifying Core Functionality

For changes outside the plugin system:
- Edit core components in `src/components/`
- Modify types in `src/types.ts`
- Update layout algorithms in `src/lib/layout-rules.ts`
- Change API behavior in `vite.config.ts` (middleware)

### Testing

- **Manual Testing**: Start dev server and interact with UI
- **Plugin Testing**: Check browser console for load messages
- **Data Testing**: Inspect JSON files in `data/` directory

## Technology Stack

- **Frontend Framework**: React 18
- **Type Safety**: TypeScript
- **Build Tool**: Vite
- **Flowchart Engine**: ReactFlow
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useEffect)

## Security Considerations

- **No Authentication**: Application has no built-in auth
- **File System Access**: Vite middleware has filesystem access
- **Deployment**: Should be behind network restrictions or add auth layer
- **Data Privacy**: All data local, no external services

## Performance Considerations

- **File-Based Storage**: Fast for small to medium datasets
- **ReactFlow**: Handles hundreds of nodes efficiently
- **Plugin Loading**: All plugins loaded at startup (small overhead)
- **Hot Module Replacement**: Vite provides fast HMR during development

## Future Extension Ideas

- Database backend option
- Real-time collaboration
- Version control integration
- Advanced plugin hooks (lifecycle, filters)
- Plugin marketplace/repository
- Visual plugin builder

## References

- ReactFlow Documentation: https://reactflow.dev/
- Plugin System Guide: `plugins/README.md`
- Layout Rules: `docs/LAYOUT_RULES.md`
- Main README: `README.md`

