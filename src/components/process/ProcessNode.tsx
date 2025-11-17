import type { NodeProps } from 'reactflow'
import type { ProcessNodeData } from '@/types'

const ProcessNode = ({ data, selected }: NodeProps<ProcessNodeData>) => {
  const nodeClass =
    data.shape === 'circle'
      ? 'process-node process-node--circle'
      : data.shape === 'diamond'
        ? 'process-node process-node--diamond'
        : 'process-node'

  return (
    <div
      className={`${nodeClass} ${selected ? 'ring-4 ring-white/60' : 'ring-2 ring-transparent'}`}
      style={{
        backgroundColor: data.color,
        color: data.textColor
      }}
    >
      <div className="process-node__inner">
        <p className="text-base font-semibold leading-tight">
          {data.label || 'Untitled node'}
        </p>
        {data.fields?.length > 0 && (
          <div className="mt-4 space-y-1.5 text-xs">
            {data.fields.map((field, index) => {
              if (!field.key && !field.value) {
                return null
              }
              return (
                <div
                  key={`${data.label}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-full bg-white/20 px-3 py-1 backdrop-blur"
                  style={{
                    color: data.textColor
                  }}
                >
                  <span className="font-medium uppercase tracking-wide opacity-80">
                    {field.key || 'Field'}
                  </span>
                  <span className="text-right">{field.value || 'Value'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessNode

