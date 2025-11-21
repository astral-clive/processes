# Layout Rules for AI-Generated Process Flowcharts

This document provides comprehensive guidelines for AI agents to generate well-spaced, collision-free process flowcharts. Follow these rules to ensure nodes are properly positioned, edges route correctly, and the overall layout is clean and readable.

## Automatic Enforcement (Opt‑In for AI)

**Important**: Layout rules are **not** forced on human editors anymore. They are only enforced when explicitly requested by the caller.

The system can:

- ✅ Automatically calculate node heights based on content length  
- ✅ Correct node positions to prevent collisions  
- ✅ Adjust spacing between nodes to meet minimum requirements  
- ✅ Reposition nodes to avoid edge-to-node intersections  
- ✅ Apply proper layout patterns for sequential, branching, and merging flows  

How this works:

- **For AI agents or programmatic callers**  
  - If you want the server to enforce these rules, send a `ProcessDocument` to  
    `PUT /api/process/:categoryId/:processId` with:
    - `meta.autoLayout = true`
  - The API middleware (`vite.config.ts`) will call `enforceLayoutRules` from `src/lib/layout-rules-server.ts`
    before persisting your document.
  - This is the intended mode when an AI is generating the entire flow layout.

- **For manual editing (human users in the UI)**  
  - The client does **not** set `meta.autoLayout`, so layout rules are **not** re-enforced on save.
  - This preserves the user’s exact drag positions and avoids surprising reflows.

- **For programmatic generation**  
  - You can either:
    - Follow all rules in this document yourself and skip `autoLayout`, or
    - Generate a reasonable layout and set `meta.autoLayout = true` to let the server correct and normalize it.

## Table of Contents

- [Core Spacing Guidelines](#core-spacing-guidelines)
- [Dynamic Height Calculation](#dynamic-height-calculation)
- [Collision Detection](#collision-detection)
- [Positioning Patterns](#positioning-patterns)
- [Edge Routing Guidelines](#edge-routing-guidelines)
- [Layout Algorithm](#layout-algorithm)
- [Visual Examples](#visual-examples)
- [Code Examples](#code-examples)
- [Reference Examples](#reference-examples)

## Core Spacing Guidelines

### Node Dimensions

- **Width**: Fixed at 200px
- **Height**: Dynamic based on content
  - Minimum: 100px
  - Typical range: 115-155px
  - Can exceed 180px for very long text
- **Padding**: 16px top/bottom, 20px left/right
- **Border**: 2px solid

### Vertical Spacing

When positioning nodes sequentially (top to bottom), use this formula:

```
nextY = previousY + previousNodeHeight + gap
```

Where:
- `previousY` is the Y position of the previous node
- `previousNodeHeight` is the actual height of the previous node
- `gap` is the minimum spacing between node edges (60-80px recommended)

**Important**: Always account for the previous node's actual height, not a fixed value.

### Horizontal Spacing

For branching flows:
- **Minimum horizontal spacing**: 240-360px between node centers
- **Recommended**: 300px for clean branching

## Dynamic Height Calculation

Node heights vary based on content length. Estimate heights before positioning nodes:

### Height Estimation Guidelines

| Content Length | Estimated Height |
|---------------|------------------|
| Short text (< 50 chars total) | 100-115px |
| Medium text (50-150 chars) | 115-135px |
| Long text (150-250 chars) | 135-155px |
| Very long text (> 250 chars) | 155-180px |

### Height Calculation Formula

```
estimatedHeight = baseHeight + titleLines * 20px + descriptionLines * 18px + padding

Where:
- baseHeight = 100px (minimum)
- titleLines = ceil((title.length) / 25)  // ~25 chars per line at 200px width
- descriptionLines = ceil((description.length) / 30)  // ~30 chars per line
- padding = 32px (16px top + 16px bottom)
```

### Example Calculation

For a node with:
- Title: "Question: Do you want a bagel?" (30 chars) → ~1 line
- Description: "Ask the new employee if they'd like a bagel from the kitchen." (66 chars) → ~2-3 lines

Calculation:
```
titleLines = ceil(30 / 25) = 2
descriptionLines = ceil(66 / 30) = 3
estimatedHeight = 100 + (2 * 20) + (3 * 18) + 32 = 100 + 40 + 54 + 32 = 226px
```

However, in practice, shorter text compacts better. Use the estimation guidelines above for simpler approximations.

## Collision Detection

### Node-to-Node Collision Detection

Nodes must **never overlap**. Check for collisions before finalizing positions:

#### Collision Check Algorithm

```javascript
function nodesCollide(node1, node2, minSpacing = 40) {
  const node1Bounds = {
    left: node1.x,
    right: node1.x + node1.width,
    top: node1.y,
    bottom: node1.y + node1.height
  };
  
  const node2Bounds = {
    left: node2.x,
    right: node2.x + node2.width,
    top: node2.y,
    bottom: node2.y + node2.height
  };
  
  // Check if nodes overlap horizontally
  const horizontalOverlap = 
    node1Bounds.right + minSpacing > node2Bounds.left &&
    node1Bounds.left < node2Bounds.right + minSpacing;
  
  // Check if nodes overlap vertically
  const verticalOverlap = 
    node1Bounds.bottom + minSpacing > node2Bounds.top &&
    node1Bounds.top < node2Bounds.bottom + minSpacing;
  
  // Collision if both horizontal and vertical overlap
  return horizontalOverlap && verticalOverlap;
}
```

#### Minimum Spacing Buffer

- **Minimum spacing between any node edges**: 40px
- This ensures visual clarity and prevents accidental overlaps
- Increase spacing (60-80px) for better readability in sequential flows

### Edge-to-Node Collision Detection

Edges must **never cross through node bodies**. Check edge paths against node bounding boxes:

#### Bounding Box Calculation

```javascript
function getNodeBoundingBox(node) {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    right: node.x + node.width,
    bottom: node.y + node.height
  };
}
```

#### Edge Path Intersection Check

```javascript
function edgeIntersectsNode(edge, node) {
  const sourceNode = getNodeById(edge.source);
  const targetNode = getNodeById(edge.target);
  
  // Get node bounding boxes (expand slightly for safety)
  const nodeBox = getNodeBoundingBox(node);
  const safetyMargin = 5; // pixels
  
  // Calculate edge path (simplified straight line)
  const x1 = sourceNode.x + sourceNode.width / 2; // Handle position
  const y1 = sourceNode.y + (edge.sourceHandle === 'bottom' ? sourceNode.height : 0);
  const x2 = targetNode.x + targetNode.width / 2;
  const y2 = targetNode.y + (edge.targetHandle === 'top' ? 0 : targetNode.height);
  
  // Check if line segment intersects with expanded node box
  return lineIntersectsRect(
    x1, y1, x2, y2,
    nodeBox.x - safetyMargin,
    nodeBox.y - safetyMargin,
    nodeBox.width + (safetyMargin * 2),
    nodeBox.height + (safetyMargin * 2)
  );
}
```

**Note**: React Flow handles edge routing automatically, but you should position nodes to minimize edge-node intersections.

### Edge-to-Edge Collision Minimization

Minimize unnecessary edge crossings:

- **Stagger parallel branches**: When multiple paths exist, stagger nodes vertically or horizontally
- **Route edges on different sides**: Use left/right handles for branches to separate edge paths
- **Avoid crossing main flow**: Branch nodes should be positioned to avoid crossing the primary sequential flow

## Positioning Patterns

### Sequential Flow (Linear)

For a linear sequence of nodes:

```javascript
let currentY = startY; // Starting Y position

nodes.forEach((node, index) => {
  if (index === 0) {
    node.position = { x: centerX, y: currentY };
  } else {
    const previousNode = nodes[index - 1];
    const gap = 70; // Minimum gap between nodes
    currentY = previousNode.position.y + previousNode.height + gap;
    node.position = { x: centerX, y: currentY };
  }
  
  // Estimate or calculate node height
  node.height = estimateNodeHeight(node.data.title, node.data.description);
});
```

**Pattern**: Vertical stacking with consistent X alignment.

### Binary Decision Branching

For Yes/No decision branches:

```javascript
// Decision node
const decisionNode = { x: centerX, y: currentY };

// Yes branch (right side)
const yesNode = {
  x: centerX + 300, // 300px to the right
  y: currentY + offset, // Slight vertical offset for visual distinction
  height: estimateHeight(yesNodeData)
};

// No branch (continue down main flow)
const noNode = {
  x: centerX, // Stay on main flow
  y: decisionNode.y + decisionNode.height + 70, // Continue down
  height: estimateHeight(noNodeData)
};

// Yes branch merges back
const mergeNode = {
  x: centerX,
  y: Math.max(
    yesNode.y + yesNode.height + 70, // After yes branch
    noNode.y + noNode.height + 70    // After no branch
  ) + 70, // Additional spacing for merge
  height: estimateHeight(mergeNodeData)
};
```

**Pattern**: Right branch for Yes, continue down for No, merge after both paths.

### Parallel Branches

For parallel processing paths:

```javascript
const branchPoint = { x: centerX, y: currentY };

// Branch A (left)
const branchANode = {
  x: centerX - 300,
  y: currentY + 100, // Stagger down
  height: estimateHeight(branchAData)
};

// Branch B (center/right)
const branchBNode = {
  x: centerX + 300,
  y: currentY + 150, // Different stagger
  height: estimateHeight(branchBData)
};

// Merge point - use maximum Y from all branches
const mergeY = Math.max(
  branchANode.y + branchANode.height,
  branchBNode.y + branchBNode.height
) + 100; // Extra spacing for merge

const mergeNode = {
  x: centerX,
  y: mergeY,
  height: estimateHeight(mergeData)
};
```

**Pattern**: Stagger parallel branches vertically, ensure merge point accounts for tallest branch.

### Converging Paths

When multiple edges converge to one node:

```javascript
// Find all source nodes that connect to target
const sourceNodes = edges
  .filter(e => e.target === targetNodeId)
  .map(e => getNodeById(e.source));

// Position target node after the lowest source node
const lowestSource = sourceNodes.reduce((lowest, node) => 
  (node.y + node.height) > (lowest.y + lowest.height) ? node : lowest
);

const targetNode = {
  x: centerX, // Usually center-aligned
  y: lowestSource.y + lowestSource.height + 80, // After lowest source
  height: estimateHeight(targetData)
};
```

**Pattern**: Merge node positioned after the lowest point of all converging paths.

## Edge Routing Guidelines

### Handle Selection

Choose appropriate connection handles based on flow direction:

| Flow Direction | Source Handle | Target Handle |
|---------------|---------------|---------------|
| Down (sequential) | `bottom` | `top` |
| Right (branch) | `right` | `left` |
| Left (alternative) | `left` | `right` |
| Up (merge/loop) | `top` | `bottom` |

### Edge Labels

- **Conditional edges**: Always label (e.g., "Yes", "No", "If condition")
- **Sequential edges**: Leave unlabeled or use descriptive labels when helpful
- **Style**: Use dashed lines for conditional branches, solid for sequential flow

### Avoiding Node Intersections

When routing edges:

1. **Position nodes first**: Ensure nodes don't overlap
2. **Check direct paths**: Verify straight-line edges don't cross through nodes
3. **Adjust if needed**: If an edge would intersect a node, adjust node positions
4. **Use routing**: React Flow will handle edge routing, but good node positioning minimizes routing complexity

### Example: Proper Branch Positioning

```
Incorrect (edge crosses through node):
    [A]
     |
    [B]----[C]
     |
    [D]

Correct (no crossing):
    [A]
     |
    [B]    [C]
     |      |
     |     [D]
     |      |
    [E]<----┘
```

## Layout Algorithm

### Complete Layout Pseudocode

```javascript
function layoutFlowchart(nodes, edges) {
  // Step 1: Calculate all node heights
  nodes.forEach(node => {
    node.height = estimateNodeHeight(
      node.data.title, 
      node.data.description
    );
  });
  
  // Step 2: Build node dependency graph
  const graph = buildGraph(nodes, edges);
  
  // Step 3: Topological sort to determine processing order
  const sortedNodes = topologicalSort(graph);
  
  // Step 4: Position nodes sequentially
  const positionedNodes = [];
  let currentY = startY;
  const centerX = 400; // Default center
  
  sortedNodes.forEach(node => {
    // Check for collisions with already positioned nodes
    let position = calculatePosition(node, positionedNodes, centerX, currentY);
    
    // Adjust if collision detected
    while (hasCollision(position, positionedNodes)) {
      position = adjustForCollision(position, positionedNodes);
    }
    
    node.position = position;
    positionedNodes.push(node);
    
    // Update current Y for next node in sequence
    if (isSequential(node, edges)) {
      currentY = position.y + node.height + 70; // gap
    }
  });
  
  // Step 5: Verify edges don't intersect nodes
  edges.forEach(edge => {
    const intersectingNodes = findIntersectingNodes(edge, nodes);
    if (intersectingNodes.length > 0) {
      // Adjust node positions to avoid intersection
      adjustNodesForEdge(edge, intersectingNodes, nodes);
    }
  });
  
  return nodes;
}

function hasCollision(newNode, existingNodes, minSpacing = 40) {
  return existingNodes.some(existing => 
    nodesCollide(newNode, existing, minSpacing)
  );
}

function adjustForCollision(position, existingNodes) {
  // Try moving down
  let newY = position.y + 100;
  let newPosition = { x: position.x, y: newY };
  
  if (!hasCollision({ ...newPosition, width: 200, height: 120 }, existingNodes)) {
    return newPosition;
  }
  
  // Try moving right
  let newX = position.x + 300;
  newPosition = { x: newX, y: position.y };
  
  if (!hasCollision({ ...newPosition, width: 200, height: 120 }, existingNodes)) {
    return newPosition;
  }
  
  // Try moving left
  newX = position.x - 300;
  newPosition = { x: newX, y: position.y };
  
  return newPosition;
}
```

## Visual Examples

### ❌ Incorrect: Nodes Too Close

```
[Node A]
   |
   |  <-- Only 40px gap (too close)
   |
[Node B]
```

**Problem**: Nodes overlap or are too close, making the flowchart hard to read.

### ✅ Correct: Proper Spacing

```
[Node A]
   |
   |  <-- 70-80px gap (proper spacing)
   |
[Node B]
```

**Solution**: Adequate spacing between nodes based on actual node heights.

### ❌ Incorrect: Edge Through Node

```
[A]----[C]
 |
[B]
```

**Problem**: Edge from A to C crosses through Node B.

### ✅ Correct: Node Positioning Avoids Crossing

```
[A]    [C]
 |      |
[B]     |
 |      |
[D]-----┘
```

**Solution**: Nodes positioned so edges don't cross through other nodes.

### ❌ Incorrect: Branches Overlap

```
    [A]
   / \
 [B] [C]  <-- B and C overlap horizontally
```

**Problem**: Branch nodes positioned too close, causing overlap.

### ✅ Correct: Proper Branch Spacing

```
    [A]
   /   \
 [B]   [C]  <-- 300px horizontal spacing
  |     |
  |     |
 [D]---┘
```

**Solution**: Adequate horizontal spacing (300px+) between branch nodes.

## Code Examples

### Complete Example: Generating a Sequential Flow

```javascript
function generateSequentialFlow(steps, startX = 400, startY = 100) {
  const nodes = [];
  let currentY = startY;
  
  steps.forEach((step, index) => {
    // Estimate height based on content
    const height = estimateNodeHeight(step.title, step.description);
    
    const node = {
      id: `step-${index + 1}`,
      type: 'processNode',
      position: { x: startX, y: currentY },
      data: {
        title: step.title,
        description: step.description,
        color: step.color || '#3b82f6'
      },
      width: 200,
      height: height
    };
    
    nodes.push(node);
    
    // Calculate next position
    const gap = 70; // Minimum gap
    currentY = currentY + height + gap;
  });
  
  // Create edges
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${i + 1}`,
      type: 'processEdge',
      source: nodes[i].id,
      target: nodes[i + 1].id,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      data: {
        label: '',
        color: '#94a3b8',
        lineStyle: 'solid',
        arrow: 'arrow'
      }
    });
  }
  
  return { nodes, edges };
}

function estimateNodeHeight(title, description) {
  const titleLength = (title || '').length;
  const descLength = (description || '').length;
  const totalLength = titleLength + descLength;
  
  if (totalLength < 50) return 100;
  if (totalLength < 150) return 115;
  if (totalLength < 250) return 135;
  return 155;
}
```

### Example: Binary Decision Flow

```javascript
function generateDecisionFlow(decision, yesBranch, noBranch, mergeStep) {
  const nodes = [];
  const edges = [];
  
  // Decision node
  const decisionNode = {
    id: 'decision',
    type: 'processNode',
    position: { x: 400, y: 100 },
    data: {
      title: decision.title,
      description: decision.description,
      color: '#5eead4' // Teal for questions
    },
    width: 200,
    height: estimateNodeHeight(decision.title, decision.description)
  };
  nodes.push(decisionNode);
  
  // Yes branch (right)
  const yesNode = {
    id: 'yes-branch',
    type: 'processNode',
    position: {
      x: 700, // 300px to the right
      y: 130  // Slight vertical offset
    },
    data: {
      title: yesBranch.title,
      description: yesBranch.description,
      color: '#fde047' // Yellow for actions
    },
    width: 200,
    height: estimateNodeHeight(yesBranch.title, yesBranch.description)
  };
  nodes.push(yesNode);
  
  // No branch (continue down)
  const noY = decisionNode.position.y + decisionNode.height + 70;
  const noNode = {
    id: 'no-branch',
    type: 'processNode',
    position: { x: 400, y: noY },
    data: {
      title: noBranch.title,
      description: noBranch.description,
      color: '#3b82f6'
    },
    width: 200,
    height: estimateNodeHeight(noBranch.title, noBranch.description)
  };
  nodes.push(noNode);
  
  // Merge node (after both paths)
  const mergeY = Math.max(
    yesNode.position.y + yesNode.height,
    noNode.position.y + noNode.height
  ) + 100; // Extra spacing for merge
  
  const mergeNode = {
    id: 'merge',
    type: 'processNode',
    position: { x: 400, y: mergeY },
    data: {
      title: mergeStep.title,
      description: mergeStep.description,
      color: '#3b82f6'
    },
    width: 200,
    height: estimateNodeHeight(mergeStep.title, mergeStep.description)
  };
  nodes.push(mergeNode);
  
  // Edges
  edges.push({
    id: 'decision-yes',
    type: 'processEdge',
    source: 'decision',
    target: 'yes-branch',
    sourceHandle: 'right',
    targetHandle: 'left',
    data: { label: 'Yes', lineStyle: 'dashed', arrow: 'arrow' }
  });
  
  edges.push({
    id: 'decision-no',
    type: 'processEdge',
    source: 'decision',
    target: 'no-branch',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    data: { label: 'No', lineStyle: 'dashed', arrow: 'arrow' }
  });
  
  edges.push({
    id: 'yes-merge',
    type: 'processEdge',
    source: 'yes-branch',
    target: 'merge',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    data: { label: '', lineStyle: 'solid', arrow: 'arrow' }
  });
  
  edges.push({
    id: 'no-merge',
    type: 'processEdge',
    source: 'no-branch',
    target: 'merge',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    data: { label: '', lineStyle: 'solid', arrow: 'arrow' }
  });
  
  return { nodes, edges };
}
```

## Reference Examples

### Well-Spaced Flowchart Reference

See `data/processes/alpha-onboarding-to-team.json` for a real-world example of proper spacing:

- Sequential nodes with adequate vertical spacing (180px+ between centers)
- Branch nodes with 360px horizontal spacing
- Proper merging of parallel paths
- No node overlaps
- Clean edge routing

**Key observations from reference:**
- Node at (100, -80) with height 115px
- Next node at (100, 100) - gap of 180px (65px edge-to-edge)
- Branch node at (460, 40) - 360px horizontal offset
- Merge continues flow after both branches

### Checklist Before Finalizing Layout

- [ ] All node heights estimated or calculated
- [ ] No node-to-node collisions (40px+ spacing between edges)
- [ ] Sequential flows use dynamic spacing (previous height + gap)
- [ ] Branches have adequate horizontal spacing (300px+)
- [ ] Merge nodes positioned after lowest converging node
- [ ] Edges don't cross through node bodies
- [ ] Edge handles chosen appropriately (top/bottom for vertical, left/right for horizontal)
- [ ] Conditional edges labeled and styled (dashed)
- [ ] Overall layout is readable and follows flow logic

---

## Summary

When generating flowcharts:

1. **Calculate node heights first** based on content length
2. **Position nodes sequentially** using dynamic spacing: `nextY = previousY + previousHeight + gap`
3. **Check for collisions** before finalizing each position
4. **Branch horizontally** with 300px+ spacing, stagger vertically
5. **Merge after lowest point** of all converging paths
6. **Verify edge paths** don't intersect node bounding boxes
7. **Use appropriate handles** for clean edge connections

Following these rules ensures your generated flowcharts will be well-spaced, collision-free, and easy to read!

