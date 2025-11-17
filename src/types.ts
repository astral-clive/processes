import type { Edge, Node } from 'reactflow'

export type NodeShape = 'rectangle' | 'circle' | 'diamond'

export type ProcessNodeField = {
  key: string
  value: string
}

export type ProcessNodeData = {
  label: string
  shape: NodeShape
  color: string
  textColor: string
  fields: ProcessNodeField[]
}

export type ProcessNode = Node<ProcessNodeData>

export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted'
export type EdgeArrowStyle = 'none' | 'arrow' | 'diamond'
export type BranchStyle = 'default' | 'positive' | 'caution' | 'danger'

export type ProcessEdgeData = {
  label?: string
  color: string
  lineStyle: EdgeLineStyle
  arrow: EdgeArrowStyle
  branchStyle: BranchStyle
}

export type ProcessEdge = Edge<ProcessEdgeData>

export type ProcessDocument = {
  meta: {
    categoryId: string
    processId: string
    title: string
    description?: string
    updatedAt?: string
  }
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}

export type ProcessSummary = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
  processes: ProcessSummary[]
}

export type CategoriesDocument = {
  categories: Category[]
}

export type ProcessIdentifier = {
  categoryId: string
  processId: string
}

export type ProcessUpdater = (prev: ProcessDocument) => ProcessDocument

