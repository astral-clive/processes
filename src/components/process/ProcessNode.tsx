import { Handle, Position, type NodeProps } from 'reactflow'
import type { ProcessNodeData } from '@/types'

const ProcessNode = ({ data, selected }: NodeProps<ProcessNodeData>) => {
  return (
    <div className={`process-node ${selected ? 'process-node--selected' : ''}`}>
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
      </div>
    </div>
  )
}

export default ProcessNode

