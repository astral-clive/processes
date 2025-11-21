# Extension System - User Guide

## Simple Explanation: How Extensions Work

Think of extensions like WordPress plugins or browser extensions:
- **The core app** (the flowchart editor) stays untouched
- **Extensions** add extra features by "hooking into" specific places in the app
- Extensions can add buttons, form fields, and custom functionality

### The Hook System

The app has 4 "hook points" where extensions can inject code:

1. **Header buttons (View Mode)** - Add buttons to the top right when viewing flowcharts
2. **Header buttons (Edit Mode)** - Add buttons to the top right when editing flowcharts  
3. **Node Inspector** - Add form fields when editing a node/step
4. **Edge Inspector** - Add form fields when editing a connection/edge

When the app reaches these hook points, it asks all loaded extensions: "Do you want to add anything here?" Extensions can return UI elements (buttons, form fields) that get displayed.

---

## Adding an Extension

### Receiving an extension from someone else

**It's as simple as drag-and-drop!**

1. **Drag the extension file** into the `plugins/` directory
   - Example: Paul sends you `my-custom-extension.tsx` → Drop it into `plugins/` folder
   - The file must have a `.tsx` extension

2. **Restart your dev server** (or wait for hot reload)
   - The extension will automatically be discovered and loaded
   - Check the browser console to see "Loading plugin: [Plugin Name]"

**That's it!** No code editing required. The system automatically finds and loads any `.tsx` file in the `plugins/` directory.

### Creating your own extension

1. **Create a new file** in `plugins/` directory (e.g., `plugins/my-extension.tsx`)

2. **Copy this template** and modify it:
   ```typescript
   import { hooks } from '@/lib/hooks'
   import type { Plugin } from '@/lib/plugins'
   import type { HeaderButtonHookContext } from '@/lib/hook-types'
   
   function initialize() {
     // Add a button to view mode header
     hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', ({ doc }) => {
       return (
         <button onClick={() => alert('Hello!')} className="icon-button">
           My Button
         </button>
       )
     })
   }
   
   const plugin: Plugin = {
     name: 'My Extension',
     initialize
   }
   
   export default plugin
   ```

3. **Save the file** - That's it! The extension will auto-load on next restart

---

## Removing an Extension

**Super simple - just delete the file!**

1. **Delete the extension file** from the `plugins/` directory
   - Example: Delete `plugins/my-custom-extension.tsx`

2. **Restart your dev server** (or wait for hot reload)

That's it! The extension is now removed. If you want to keep the file but disable it, you can rename it (e.g., add `.disabled` extension), since only `.tsx` files are auto-loaded.

---

## Current Extensions

### Priority Extension (`priority-extension.tsx`)

**What it does:**
- Adds a "Priority" field (High/Medium/Low) to nodes
- Adds a filter button in view mode to filter nodes by priority

**To enable:** Just keep the file in `plugins/` directory - it loads automatically!

**To disable:** Delete the file or rename it to something other than `.tsx`

---

## Troubleshooting

### Extension not showing up?

1. **Check the console** - Look for error messages when the app loads
2. **Verify the file path** - Make sure the path in `plugins.ts` matches the file location
3. **Check file extension** - Extension files must be `.tsx` (not `.ts`) if they contain React/JSX
4. **Restart the server** - Changes to `plugins.ts` require a restart

### Extension causing errors?

1. **Check browser console** for error messages
2. **Temporarily disable** the extension to see if the app works without it
3. **Check the extension file** - Make sure it exports a default Plugin object correctly

---

## Example: Complete Add/Remove Flow

### Adding an Extension:

**Scenario:** Paul creates `awesome-extension.tsx` and sends it to Curtis

1. **Curtis receives** `awesome-extension.tsx` via email/Slack/etc.

2. **Curtis drags** the file into `plugins/` folder

3. **Curtis restarts** the dev server (or waits for hot reload)

4. **Done!** The extension is now active. Curtis sees:
   - "Loading plugin: Awesome Extension" in the console
   - The extension's features appear in the app

**No code editing. No configuration. Just drag-and-drop!**

### Removing an Extension:

1. **Delete** the file from `plugins/` folder (or rename it to `.tsx.disabled`)

2. **Restart** the dev server

3. **Done!** The extension is removed

**Even simpler than adding!**

---

## Quick Reference

| Action | What to Do |
|--------|------------|
| **Add extension** | Drag `.tsx` file into `plugins/` folder, restart server |
| **Remove extension** | Delete the `.tsx` file from `plugins/` folder, restart server |
| **Create extension** | Create new `.tsx` file in `plugins/` folder following the template |
| **View extensions** | Look in `plugins/` folder - all `.tsx` files are loaded automatically |
| **Disable temporarily** | Rename file extension from `.tsx` to `.tsx.disabled` |

**No code editing required anymore!** The system auto-discovers all `.tsx` files in the `plugins/` directory.

---

## Important Notes

- **Extensions don't modify core code** - The core flowchart engine stays untouched
- **Extensions are isolated** - If one breaks, it won't break the core app
- **Restart required** - Changes to `plugins.ts` need a server restart to take effect
- **Extensions persist data** - If an extension adds fields to nodes, that data is saved in the JSON files

