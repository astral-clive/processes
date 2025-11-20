/**
 * Layout Rules Enforcement (Server-side)
 * 
 * Node.js compatible version of layout rules enforcement
 * Used by the API middleware to automatically enforce layout rules
 */

// Constants from layout rules
const NODE_WIDTH = 200
const NODE_MIN_HEIGHT = 100
const MIN_VERTICAL_GAP = 70 // Minimum gap between node edges
const MIN_HORIZONTAL_GAP = 240 // Minimum horizontal spacing for branches
const MIN_NODE_SPACING = 40 // Minimum spacing between any node edges

type ProcessNode = {
  id: string
  position: { x: number; y: number }
  data: { title: string; description: string }
  width?: number
  height?: number
  positionAbsolute?: { x: number; y: number }
}

type ProcessEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

type ProcessDocument = {
  meta: unknown
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}

/**
 * Estimate node height based on content length
 */
function estimateNodeHeight(title: string, description: string): number {
  const titleLength = (title || '').length
  const descLength = (description || '').length
  const totalLength = titleLength + descLength

  if (totalLength < 50) return NODE_MIN_HEIGHT // 100px
  if (totalLength < 150) return 115
  if (totalLength < 250) return 135
  return 155
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
function nodesCollide(node1: ProcessNode, node2: ProcessNode, minSpacing: number = MIN_NODE_SPACING): boolean {
  const bounds1 = getNodeBounds(node1)
  const bounds2 = getNodeBounds(node2)

  const horizontalOverlap =
    bounds1.right + minSpacing > bounds2.left &&
    bounds1.left < bounds2.right + minSpacing

  const verticalOverlap =
    bounds1.bottom + minSpacing > bounds2.top &&
    bounds1.top < bounds2.bottom + minSpacing

  return horizontalOverlap && verticalOverlap
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

  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const testNode = { ...node, position }
    const collisions = findCollisions(testNode, existingNodes)

    if (collisions.length === 0) {
      return position
    }

    if (attempts < 3) {
      position = { x: position.x, y: position.y + 100 }
    } else if (attempts < 6) {
      position = { x: position.x + 300, y: position.y }
    } else if (attempts < 9) {
      position = { x: position.x - 300, y: position.y }
    } else {
      position = { x: position.x + 300, y: position.y + 100 }
    }

    attempts++
  }

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

  graph.forEach((children, nodeId) => {
    inDegree.set(nodeId, 0)
  })

  graph.forEach((children) => {
    children.forEach((childId) => {
      const current = inDegree.get(childId) || 0
      inDegree.set(childId, current + 1)
    })
  })

  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId)
    }
  })

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
  const centerX = 400 // Default center for main flow

  // Process nodes in topological order
  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    // Find incoming edges to determine position
    const incomingEdges = edges.filter(e => e.target === nodeId)

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

  // Step 5: Update positionAbsolute for all nodes
  nodes.forEach(node => {
    node.positionAbsolute = { ...node.position }
  })

  return {
    ...doc,
    nodes
  }
}

