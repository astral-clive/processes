import {
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  getBezierPath
} from 'reactflow'
import type { EdgeProps } from 'reactflow'
import type { ProcessEdgeData } from '@/types'

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
  const { id, data } = props
  const [edgePath, labelX, labelY] = getBezierPath(props)

  const color = data?.color ?? '#94a3b8'
  const lineStyle = data?.lineStyle ?? 'solid'
  const dashArray =
    lineStyle === 'dashed' ? '8 8' : lineStyle === 'dotted' ? '2 10' : undefined

  const markerEnd =
    data?.arrow === 'arrow'
      ? {
          type: MarkerType.ArrowClosed,
          color,
          width: 24,
          height: 24
        }
      : data?.arrow === 'diamond'
        ? `url(#diamond-${id})`
        : undefined

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
      {data?.arrow === 'diamond' && (
        <defs>
          <marker
            id={`diamond-${id}`}
            markerWidth="14"
            markerHeight="14"
            refX="0"
            refY="0"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0,-4 4,0 0,4 -4,0"
              fill={color}
            />
          </marker>
        </defs>
      )}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: 2.4,
          strokeDasharray: dashArray,
          ...animatedStyle
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
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
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default ProcessEdge

