import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from 'reactflow'
import type { EdgeProps } from 'reactflow'
import type { ProcessEdgeData } from '@/types'
import { hooks } from '@/lib/hooks'
import type { EdgeRenderHookContext } from '@/lib/hook-types'

const branchBadgeStyles: Record<
  ProcessEdgeData['branchStyle'],
  string
> = {
  default: 'bg-slate-800/80 text-slate-100 border border-white/10',
  positive: 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-900/30',
  caution: 'bg-amber-400/90 text-ink-950 shadow-lg shadow-amber-900/20',
  danger: 'bg-rose-500/90 text-white shadow-lg shadow-rose-900/30'
}

const ProcessEdge = (props: EdgeProps<ProcessEdgeData>) => {
  const { id, source, target, data, markerEnd, markerStart } = props
  const [edgePath, labelX, labelY] = getBezierPath(props)

  const color = data?.color ?? '#94a3b8'
  const lineStyle = data?.lineStyle ?? 'solid'
  const dashArray =
    lineStyle === 'dashed' ? '8 8' : lineStyle === 'dotted' ? '2 10' : undefined

  const animatedStyle =
    props.animated
      ? {
          strokeDasharray: dashArray ?? '10 6',
          animation: 'edge-flow 1.2s linear infinite',
          strokeDashoffset: 0
        }
      : {}

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth: 3,
          strokeDasharray: dashArray,
          ...animatedStyle
        }}
      />
      <EdgeLabelRenderer>
        {data?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none'
            }}
            className={`process-edge-label ${branchBadgeStyles[data?.branchStyle ?? 'default']}`}
          >
            {data.label}
          </div>
        )}
        {/* Plugin hook: render badges on edges */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (data?.label ? 25 : 0)}px)`,
            pointerEvents: 'none',
            display: 'flex',
            gap: '0.25rem'
          }}
        >
          {hooks.doAction<EdgeRenderHookContext>('edge:render:badge', {
            id,
            data,
            source,
            target
          })}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default ProcessEdge

