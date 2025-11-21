/**
 * Layout Rules Enforcement
 * 
 * This module enforces the layout rules defined in docs/LAYOUT_RULES.md
 * It automatically corrects node positioning to ensure proper spacing,
 * prevent collisions, and maintain readable flowcharts.
 */

import type { ProcessDocument, ProcessNode, ProcessEdge } from '@/types'

// Constants from layout rules
const NODE_WIDTH = 200
const NODE_MIN_HEIGHT = 100
const MIN_VERTICAL_GAP = 70 // Minimum gap between node edges
const MIN_HORIZONTAL_GAP = 240 // Minimum horizontal spacing for branches
const MIN_NODE_SPACING = 40 // Minimum spacing between any node edges
const NODE_PADDING = 16 // Top/bottom padding

/**
 * Estimate node height based on content length
 */
export function estimateNodeHeight(title: string, description: string): number {
  const titleLength = (title || '').length
  const descLength = (description || '').length
  const totalLength = titleLength + descLength

  // Base estimation from layout rules
  if (totalLength < 50) return NODE_MIN_HEIGHT // 100px
  if (totalLength < 150) return 115
  if (totalLength < 250) return 135
  return 155 // Can go higher for very long text
}

/**
 * Get node bounding box
 */
function getNodeBounds(node: ProcessNode) {
  const width = node.width || NODE_WIDTH
  const height = node.height || estimateNodeHeight(node.data.title, node.data.description)
  
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
    width,
    height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2
  }
}

/**
 * Check if two nodes collide
 */
export function nodesCollide(node1: ProcessNode, node2: ProcessNode, minSpacing: number = MIN_NODE_SPACING): boolean {
  const bounds1 = getNodeBounds(node1)
  const bounds2 = getNodeBounds(node2)

  // Check if nodes overlap horizontally
  const horizontalOverlap =
    bounds1.right + minSpacing > bounds2.left &&
    bounds1.left < bounds2.right + minSpacing

  // Check if nodes overlap vertically
  const verticalOverlap =
    bounds1.bottom + minSpacing > bounds2.top &&
    bounds1.top < bounds2.bottom + minSpacing

  // Collision if both horizontal and vertical overlap
  return horizontalOverlap && verticalOverlap
}

/**
 * Check if an edge path would intersect a node
 */
export function edgeIntersectsNode(
  edge: ProcessEdge,
  node: ProcessNode,
  sourceNode: ProcessNode,
  targetNode: ProcessNode
): boolean {
  const nodeBounds = getNodeBounds(node)
  const safetyMargin = 5

  // Get edge connection points based on handles
  const getHandlePosition = (node: ProcessNode, handle: string) => {
    const bounds = getNodeBounds(node)
    switch (handle) {
      case 'top':
        return { x: bounds.centerX, y: bounds.top }
      case 'bottom':
        return { x: bounds.centerX, y: bounds.bottom }
      case 'left':
        return { x: bounds.left, y: bounds.centerY }
      case 'right':
        return { x: bounds.right, y: bounds.centerY }
      default:
        return { x: bounds.centerX, y: bounds.centerY }
    }
  }

  const sourcePos = getHandlePosition(sourceNode, edge.sourceHandle || 'bottom')
  const targetPos = getHandlePosition(targetNode, edge.targetHandle || 'top')

  // Expand node bounds with safety margin
  const expandedBounds = {
    left: nodeBounds.left - safetyMargin,
    right: nodeBounds.right + safetyMargin,
    top: nodeBounds.top - safetyMargin,
    bottom: nodeBounds.bottom + safetyMargin
  }

  // Skip if edge is connecting to this node
  if (edge.source === node.id || edge.target === node.id) {
    return false
  }

  // Check if line segment intersects rectangle
  return lineIntersectsRect(
    sourcePos.x,
    sourcePos.y,
    targetPos.x,
    targetPos.y,
    expandedBounds.left,
    expandedBounds.top,
    expandedBounds.right - expandedBounds.left,
    expandedBounds.bottom - expandedBounds.top
  )
}

/**
 * Check if a line segment intersects a rectangle
 */
function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  // Get rectangle corners
  const rectRight = rx + rw
  const rectBottom = ry + rh

  // Check if line segment is completely outside rectangle
  if (
    (x1 < rx && x2 < rx) ||
    (x1 > rectRight && x2 > rectRight) ||
    (y1 < ry && y2 < ry) ||
    (y1 > rectBottom && y2 > rectBottom)
  ) {
    return false
  }

  // Check if any point of line segment is inside rectangle
  if (
    (x1 >= rx && x1 <= rectRight && y1 >= ry && y1 <= rectBottom) ||
    (x2 >= rx && x2 <= rectRight && y2 >= ry && y2 <= rectBottom)
  ) {
    return true
  }

  // Check if line intersects rectangle edges
  // This is a simplified check - for production, use proper line-rectangle intersection algorithm
  const dx = x2 - x1
  const dy = y2 - y1

  if (dx === 0 && dy === 0) return false

  // Check intersection with vertical edges
  if (dx !== 0) {
    const t1 = (rx - x1) / dx
    const t2 = (rectRight - x1) / dx
    const tMin = Math.min(t1, t2)
    const tMax = Math.max(t1, t2)
    if (tMax >= 0 && tMin <= 1) {
      const y = y1 + dy * Math.max(0, Math.min(1, tMin))
      if (y >= ry && y <= rectBottom) return true
    }
  }

  // Check intersection with horizontal edges
  if (dy !== 0) {
    const t1 = (ry - y1) / dy
    const t2 = (rectBottom - y1) / dy
    const tMin = Math.min(t1, t2)
    const tMax = Math.max(t1, t2)
    if (tMax >= 0 && tMin <= 1) {
      const x = x1 + dx * Math.max(0, Math.min(1, tMin))
      if (x >= rx && x <= rectRight) return true
    }
  }

  return false
}

/**
 * Find all nodes that collide with a given node
 */
function findCollisions(node: ProcessNode, allNodes: ProcessNode[]): ProcessNode[] {
  return allNodes.filter((other) => {
    if (other.id === node.id) return false
    return nodesCollide(node, other)
  })
}

/**
 * Adjust node position to avoid collisions
 */
function adjustForCollision(
  node: ProcessNode,
  existingNodes: ProcessNode[],
  preferredPosition?: { x: number; y: number }
): { x: number; y: number } {
  let position = preferredPosition || node.position
  const bounds = getNodeBounds({ ...node, position })

  // Try moving down first (common for sequential flows)
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const testNode = { ...node, position, width: bounds.width, height: bounds.height }
    const collisions = findCollisions(testNode, existingNodes)

    if (collisions.length === 0) {
      return position
    }

    // Try different strategies based on attempt number
    if (attempts < 3) {
      // Strategy 1: Move down
      position = { x: position.x, y: position.y + 100 }
    } else if (attempts < 6) {
      // Strategy 2: Move right
      position = { x: position.x + 300, y: position.y }
    } else if (attempts < 9) {
      // Strategy 3: Move left
      position = { x: position.x - 300, y: position.y }
    } else {
      // Strategy 4: Move down and right
      position = { x: position.x + 300, y: position.y + 100 }
    }

    attempts++
  }

  // If still colliding, return the last attempted position
  return position
}

/**
 * Build a node dependency graph from edges
 */
function buildGraph(nodes: ProcessNode[], edges: ProcessEdge[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
  nodes.forEach(node => {
    graph.set(node.id, [])
  })
  
  edges.forEach(edge => {
    const children = graph.get(edge.source) || []
    children.push(edge.target)
    graph.set(edge.source, children)
  })
  
  return graph
}

/**
 * Topological sort to determine processing order
 */
function topologicalSort(graph: Map<string, string[]>): string[] {
  const inDegree = new Map<string, number>()
  const queue: string[] = []
  const result: string[] = []

  // Calculate in-degrees
  graph.forEach((children, nodeId) => {
    inDegree.set(nodeId, 0)
  })

  graph.forEach((children) => {
    children.forEach((childId) => {
      const current = inDegree.get(childId) || 0
      inDegree.set(childId, current + 1)
    })
  })

  // Find nodes with no incoming edges
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId)
    }
  })

  // Process nodes
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    result.push(nodeId)

    const children = graph.get(nodeId) || []
    children.forEach((childId) => {
      const degree = (inDegree.get(childId) || 0) - 1
      inDegree.set(childId, degree)
      if (degree === 0) {
        queue.push(childId)
      }
    })
  }

  return result
}

/**
 * Check if an edge is part of a sequential flow (top-to-bottom)
 */
function isSequentialEdge(edge: ProcessEdge): boolean {
  return edge.sourceHandle === 'bottom' && edge.targetHandle === 'top'
}

/**
 * Get source and target nodes for an edge
 */
function getEdgeNodes(edge: ProcessEdge, nodes: ProcessNode[]): {
  source: ProcessNode | undefined
  target: ProcessNode | undefined
} {
  return {
    source: nodes.find(n => n.id === edge.source),
    target: nodes.find(n => n.id === edge.target)
  }
}

/**
 * Enforce layout rules on a process document
 * This automatically corrects node positions, spacing, and prevents collisions
 */
export function enforceLayoutRules(doc: ProcessDocument): ProcessDocument {
  const nodes = [...doc.nodes]
  const edges = [...doc.edges]

  // Step 1: Ensure all nodes have calculated heights
  nodes.forEach(node => {
    if (!node.height || node.height < NODE_MIN_HEIGHT) {
      node.height = estimateNodeHeight(node.data.title, node.data.description)
    }
    if (!node.width) {
      node.width = NODE_WIDTH
    }
  })

  // Step 2: Build dependency graph
  const graph = buildGraph(nodes, edges)

  // Step 3: Topological sort to determine processing order
  const sortedIds = topologicalSort(graph)
  
  // Create a map for quick node lookup
  const nodeMap = new Map<string, ProcessNode>()
  nodes.forEach(node => nodeMap.set(node.id, node))

  // Step 4: Position nodes sequentially, avoiding collisions
  const positionedNodes: ProcessNode[] = []
  let currentY = 0
  const centerX = 400 // Default center for main flow

  // Process nodes in topological order
  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    // Find incoming edges to determine position
    const incomingEdges = edges.filter(e => e.target === nodeId)
    const outgoingEdges = edges.filter(e => e.source === nodeId)

    let newPosition: { x: number; y: number }

    if (incomingEdges.length === 0) {
      // Root node - start at beginning
      newPosition = { x: centerX, y: 0 }
    } else {
      // Position based on source nodes
      const sourceNodes = incomingEdges
        .map(e => nodeMap.get(e.source))
        .filter((n): n is ProcessNode => n !== undefined)

      if (sourceNodes.length === 1) {
        const sourceNode = sourceNodes[0]
        const edge = incomingEdges[0]

        if (isSequentialEdge(edge)) {
          // Sequential flow - position below source
          const sourceBounds = getNodeBounds(sourceNode)
          const gap = MIN_VERTICAL_GAP
          newPosition = {
            x: sourceNode.position.x, // Maintain X alignment
            y: sourceBounds.bottom + gap
          }
        } else {
          // Branch - position to the side
          const sourceBounds = getNodeBounds(sourceNode)
          if (edge.sourceHandle === 'right') {
            // Branch right
            newPosition = {
              x: sourceBounds.right + MIN_HORIZONTAL_GAP,
              y: sourceNode.position.y + (edge.targetHandle === 'top' ? -20 : 0)
            }
          } else {
            // Branch left
            newPosition = {
              x: sourceBounds.left - MIN_HORIZONTAL_GAP - NODE_WIDTH,
              y: sourceNode.position.y + (edge.targetHandle === 'top' ? -20 : 0)
            }
          }
        }
      } else {
        // Multiple sources (merge point) - position after lowest source
        const lowestSource = sourceNodes.reduce((lowest, node) => {
          const lowestBottom = getNodeBounds(lowest).bottom
          const nodeBottom = getNodeBounds(node).bottom
          return nodeBottom > lowestBottom ? node : lowest
        })

        const lowestBounds = getNodeBounds(lowestSource)
        newPosition = {
          x: centerX, // Center-aligned merge point
          y: lowestBounds.bottom + MIN_VERTICAL_GAP
        }
      }
    }

    // Adjust position to avoid collisions
    newPosition = adjustForCollision(node, positionedNodes, newPosition)

    // Update node position
    node.position = newPosition
    positionedNodes.push(node)
    nodeMap.set(node.id, node)
  }

  // Step 5: Check for edge-to-node intersections and adjust if needed
  // (React Flow handles routing, but we can warn or adjust nodes)
  edges.forEach(edge => {
    const { source: sourceNode, target: targetNode } = getEdgeNodes(edge, nodes)
    if (!sourceNode || !targetNode) return

    nodes.forEach(node => {
      if (edgeIntersectsNode(edge, node, sourceNode, targetNode)) {
        // Try to adjust the intersecting node
        const adjusted = adjustForCollision(node, positionedNodes)
        node.position = adjusted
      }
    })
  })

  // Step 6: Update positionAbsolute for all nodes
  nodes.forEach(node => {
    node.positionAbsolute = { ...node.position }
  })

  return {
    ...doc,
    nodes
  }
}

/**
 * Validate layout rules and return violations
 */
export function validateLayout(doc: ProcessDocument): {
  isValid: boolean
  violations: Array<{
    type: 'collision' | 'edge-intersection' | 'spacing'
    message: string
    nodeIds?: string[]
    edgeId?: string
  }>
} {
  const violations: Array<{
    type: 'collision' | 'edge-intersection' | 'spacing'
    message: string
    nodeIds?: string[]
    edgeId?: string
  }> = []

  const nodes = doc.nodes
  const edges = doc.edges

  // Check for node collisions
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodesCollide(nodes[i], nodes[j])) {
        violations.push({
          type: 'collision',
          message: `Nodes "${nodes[i].id}" and "${nodes[j].id}" are overlapping`,
          nodeIds: [nodes[i].id, nodes[j].id]
        })
      }
    }
  }

  // Check for edge-to-node intersections
  edges.forEach(edge => {
    const { source: sourceNode, target: targetNode } = getEdgeNodes(edge, nodes)
    if (!sourceNode || !targetNode) return

    nodes.forEach(node => {
      if (edgeIntersectsNode(edge, node, sourceNode, targetNode)) {
        violations.push({
          type: 'edge-intersection',
          message: `Edge from "${edge.source}" to "${edge.target}" intersects node "${node.id}"`,
          edgeId: edge.id,
          nodeIds: [node.id]
        })
      }
    })
  })

  // Check for insufficient spacing in sequential flows
  edges.forEach(edge => {
    if (isSequentialEdge(edge)) {
      const { source: sourceNode, target: targetNode } = getEdgeNodes(edge, nodes)
      if (!sourceNode || !targetNode) return

      const sourceBounds = getNodeBounds(sourceNode)
      const targetBounds = getNodeBounds(targetNode)

      const gap = targetBounds.top - sourceBounds.bottom
      if (gap < MIN_VERTICAL_GAP) {
        violations.push({
          type: 'spacing',
          message: `Insufficient spacing between "${edge.source}" and "${edge.target}" (${gap}px < ${MIN_VERTICAL_GAP}px minimum)`,
          edgeId: edge.id,
          nodeIds: [edge.source, edge.target]
        })
      }
    }
  })

  return {
    isValid: violations.length === 0,
    violations
  }
}


