import { Handle, Position, type NodeProps } from 'reactflow'
import type { ProcessNodeData } from '@/types'
import { hooks } from '@/lib/hooks'
import type { NodeRenderHookContext } from '@/lib/hook-types'

const ProcessNode = ({ id, data, selected }: NodeProps<ProcessNodeData>) => {
  // Default to blue if no color specified
  const color = data.color || '#3b82f6'
  
  // Convert hex to RGB for opacity backgrounds
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 } // default blue
  }
  
  const rgb = hexToRgb(color)
  const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
  const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
  
  return (
    <div 
      className={`process-node ${selected ? 'process-node--selected' : ''}`}
      style={{
        ['--node-bg' as any]: backgroundColor,
        ['--node-border' as any]: borderColor
      } as React.CSSProperties}
    >
      {/* Top handle */}
      <Handle
        type="source"
        position={Position.Top}
        className="process-node-handle"
        id="top"
      />
      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="process-node-handle"
        id="right"
      />
      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="process-node-handle"
        id="bottom"
      />
      {/* Left handle */}
      <Handle
        type="source"
        position={Position.Left}
        className="process-node-handle"
        id="left"
      />
      <div className="process-node__inner">
        <p className="process-node__title">{data.title || 'Untitled step'}</p>
        <p className="process-node__description">
          {data.description || 'Add a short description so collaborators understand this step.'}
        </p>
        {/* Plugin hook: render additional content below description */}
        {hooks.doAction<NodeRenderHookContext>('node:render:content', {
          id,
          data,
          selected
        })}
      </div>
      {/* Plugin hook: render badges at top-right corner */}
      <div className="process-node__badges">
        {hooks.doAction<NodeRenderHookContext>('node:render:badge', {
          id,
          data,
          selected
        })}
      </div>
    </div>
  )
}

export default ProcessNode

