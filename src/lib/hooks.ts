/**
 * Plugin Hook System
 * 
 * WordPress-style hook system for extending the flowchart application.
 * Plugins can register callbacks that will be called at specific points in the application lifecycle.
 */

import type { ReactNode } from 'react'
import type {
  HeaderButtonHookContext,
  InspectorFieldHookContext,
  NodeRenderHookContext,
  EdgeRenderHookContext,
  HookCallback,
  HookRegistry
} from './hook-types'

class HookRegistryImpl implements HookRegistry {
  private hooks: Map<string, HookCallback[]> = new Map()

  /**
   * Register a callback for a specific hook.
   * 
   * @param hookName - The name of the hook to register for
   * @param callback - The callback function to execute when the hook is called
   * @returns A function to unregister the callback
   * 
   * @example
   * ```typescript
   * const unregister = hooks.addAction('header:viewMode:buttons', (context) => {
   *   return <MyCustomButton />
   * })
   * 
   * // Later, to unregister:
   * unregister()
   * ```
   */
  addAction<TContext extends Record<string, unknown>>(
    hookName: string,
    callback: HookCallback<TContext>
  ): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }

    const callbacks = this.hooks.get(hookName)!
    callbacks.push(callback as HookCallback)

    // Return unregister function
    return () => {
      const index = callbacks.indexOf(callback as HookCallback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Execute all callbacks registered for a hook.
   * 
   * @param hookName - The name of the hook to execute
   * @param context - The context object to pass to each callback
   * @returns Array of return values from all callbacks (filtered to remove null/undefined)
   * 
   * @example
   * ```typescript
   * const buttons = hooks.doAction('header:viewMode:buttons', { editMode: false, doc })
   * // Returns: ReactNode[] - all buttons registered by plugins
   * ```
   */
  doAction<TContext extends Record<string, unknown>, TReturn = ReactNode>(
    hookName: string,
    context: TContext
  ): TReturn[] {
    const callbacks = this.hooks.get(hookName) || []
    const results: TReturn[] = []

    for (const callback of callbacks) {
      try {
        const result = callback(context) as TReturn
        // Only include non-null/non-undefined results
        if (result !== null && result !== undefined) {
          results.push(result)
        }
      } catch (error) {
        console.error(`Error executing hook "${hookName}":`, error)
      }
    }

    return results
  }

  /**
   * Check if a hook has any registered callbacks.
   * 
   * @param hookName - The name of the hook to check
   * @returns true if the hook has registered callbacks
   */
  hasAction(hookName: string): boolean {
    const callbacks = this.hooks.get(hookName)
    return callbacks !== undefined && callbacks.length > 0
  }

  /**
   * Get the number of callbacks registered for a hook.
   * 
   * @param hookName - The name of the hook
   * @returns The number of registered callbacks
   */
  getActionCount(hookName: string): number {
    return this.hooks.get(hookName)?.length || 0
  }

  /**
   * Remove all callbacks for a hook (useful for testing or cleanup).
   * 
   * @param hookName - The name of the hook to clear
   */
  clearHook(hookName: string): void {
    this.hooks.delete(hookName)
  }

  /**
   * Remove all registered hooks (useful for testing).
   */
  clearAll(): void {
    this.hooks.clear()
  }
}

// Export singleton instance
export const hooks = new HookRegistryImpl()

// Export the class for testing purposes
export { HookRegistryImpl }

