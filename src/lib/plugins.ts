/**
 * Plugin Loader System
 * 
 * System for loading and registering plugins from the plugins directory.
 * Plugins are TypeScript modules that register hooks using the hooks.addAction() method.
 */

import { hooks } from './hooks'

/**
 * Plugin interface - all plugins must export a default function that registers their hooks.
 */
export interface Plugin {
  /**
   * Plugin name (for identification and debugging)
   */
  name: string

  /**
   * Plugin version (optional, for tracking)
   */
  version?: string

  /**
   * Initialize the plugin - this function should register all hooks.
   * This is called automatically when the plugin is loaded.
   */
  initialize: () => void | Promise<void>

  /**
   * Cleanup function (optional) - called when plugin is unloaded
   */
  cleanup?: () => void
}

/**
 * Load a plugin module and register it.
 * 
 * @param pluginModule - The plugin module (imported dynamically or statically)
 */
export function loadPlugin(pluginModule: { default: Plugin }): void {
  try {
    const plugin = pluginModule.default
    console.log(`Loading plugin: ${plugin.name}${plugin.version ? ` v${plugin.version}` : ''}`)
    plugin.initialize()
    console.log(`Plugin "${plugin.name}" loaded successfully`)
  } catch (error) {
    console.error(`Error loading plugin:`, error)
  }
}

/**
 * Load plugins from a list of plugin modules.
 * This is useful for statically importing multiple plugins.
 * 
 * @param plugins - Array of plugin modules to load
 */
export function loadPlugins(plugins: Array<{ default: Plugin }>): void {
  for (const pluginModule of plugins) {
    loadPlugin(pluginModule)
  }
}

/**
 * Initialize the plugin system.
 * This function should be called early in the application lifecycle (e.g., in main.tsx).
 * 
 * Automatically discovers and loads all plugin files from the plugins/ directory.
 * 
 * To add a plugin:
 * 1. Create a plugin file (e.g., my-extension.tsx) in the plugins/ directory
 * 2. Export a default object that implements the Plugin interface
 * 3. That's it! The plugin will be automatically discovered and loaded
 * 
 * Plugin files must:
 * - Be in the plugins/ directory (or subdirectories)
 * - Have a .tsx extension
 * - Export a default object with name, initialize, and optionally version properties
 */
export function initializePlugins(): void {
  // Auto-discover all plugin files using Vite's import.meta.glob
  // This scans the plugins directory and automatically imports all .tsx files
  const pluginModules = import.meta.glob('../../plugins/**/*.tsx', { eager: false })

  // Load each discovered plugin
  const pluginPaths = Object.keys(pluginModules)
  console.log(`Found ${pluginPaths.length} plugin(s) to load...`)

  // Filter out non-plugin files and example plugins
  const pluginFiles = pluginPaths.filter(path => {
    // Exclude plugins in the examples directory - these are just reference examples
    if (path.includes('/examples/')) {
      return false
    }
    
    const fileName = path.split('/').pop() || ''
    // Skip files that are clearly not plugins (like documentation or test files)
    const skipPatterns = ['README', 'USER_GUIDE', 'test', '.spec', '.test']
    return !skipPatterns.some(pattern => fileName.includes(pattern))
  })

  // Load each plugin asynchronously
  pluginFiles.forEach((pluginPath) => {
    const importFn = pluginModules[pluginPath]
    if (typeof importFn === 'function') {
      importFn()
        .then((module) => {
          loadPlugin(module as { default: Plugin })
        })
        .catch((error) => {
          console.warn(`Failed to load plugin from ${pluginPath}:`, error)
        })
    }
  })

  console.log('Plugin system initialized - auto-discovery enabled')
}

/**
 * Get information about all registered hooks (useful for debugging and discovery).
 */
export function getRegisteredHooksInfo(): Record<string, number> {
  const hookNames = [
    'header:viewMode:buttons',
    'header:editMode:buttons',
    'inspector:node:fields',
    'inspector:edge:fields'
  ]

  const info: Record<string, number> = {}
  for (const hookName of hookNames) {
    info[hookName] = hooks.getActionCount(hookName)
  }

  return info
}

