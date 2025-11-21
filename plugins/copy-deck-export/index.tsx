import { hooks } from '@/lib/hooks'
import type { Plugin } from '@/lib/plugins'
import type { 
  HeaderButtonHookContext, 
  InspectorFieldHookContext,
  NodeRenderHookContext 
} from '@/lib/hook-types'
import type { ProcessDocument, ProcessNode } from '@/types'
import { useState } from 'react'
import { jsPDF } from 'jspdf'

/**
 * Copy Deck Export Plugin
 * 
 * Allows editing marketing copy on nodes and exporting all copy to a PDF document.
 * Perfect for creating marketing materials from flowchart processes.
 * 
 * Features:
 * - Add "Copy Text" field to node inspector
 * - Add "Node Type" field to categorize nodes (static/choice/option/start/end)
 * - Export button in header to generate PDF
 * - Visual indicator showing which nodes have copy text
 */

// Extended node data type
interface CopyNodeData {
  copyText?: string
  nodeType?: 'static' | 'choice' | 'option' | 'start' | 'end'
}

/**
 * Parse markdown-style formatting in text
 * Supports **bold** and __underline__
 */
type TextSegment = {
  text: string
  bold?: boolean
  underline?: boolean
}

function parseMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentPos = 0

  // Pattern to match **bold** or __underline__
  const pattern = /(\*\*|__)(.*?)\1/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match (plain text)
    if (match.index > currentPos) {
      const plainText = text.substring(currentPos, match.index)
      if (plainText) {
        segments.push({ text: plainText })
      }
    }

    // Add the formatted text
    const marker = match[1]
    const content = match[2]
    
    if (marker === '**') {
      segments.push({ text: content, bold: true })
    } else if (marker === '__') {
      segments.push({ text: content, underline: true })
    }

    currentPos = match.index + match[0].length
  }

  // Add remaining text after last match
  if (currentPos < text.length) {
    const remaining = text.substring(currentPos)
    if (remaining) {
      segments.push({ text: remaining })
    }
  }

  // Return segments or original text if no formatting found
  return segments.length > 0 ? segments : [{ text: text }]
}

/**
 * Render formatted text segments in PDF with proper word wrapping
 */
function renderFormattedText(
  pdf: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  fontSize: number = 11,
  lineHeight: number = 6
): number {
  let yPosition = startY
  
  // Parse markdown into segments
  const segments = parseMarkdown(text)
  
  // Word wrapping with formatting awareness
  type LineSegment = { text: string; bold?: boolean; underline?: boolean }
  const lines: LineSegment[][] = []
  let currentLine: LineSegment[] = []
  let currentLineWidth = 0
  
  pdf.setFontSize(fontSize)
  
  // Process each segment
  segments.forEach(segment => {
    // Split segment into words
    const words = segment.text.split(/(\s+)/)
    
    words.forEach(word => {
      // Set appropriate font for measurement
      pdf.setFont('helvetica', segment.bold ? 'bold' : 'normal')
      const wordWidth = pdf.getTextWidth(word)
      
      // Check if word fits on current line
      if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
        // Start new line
        lines.push(currentLine)
        currentLine = []
        currentLineWidth = 0
        
        // Skip leading whitespace on new line
        if (word.trim()) {
          currentLine.push({ text: word, bold: segment.bold, underline: segment.underline })
          currentLineWidth = wordWidth
        }
      } else {
        // Add to current line
        currentLine.push({ text: word, bold: segment.bold, underline: segment.underline })
        currentLineWidth += wordWidth
      }
    })
  })
  
  // Add last line
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }
  
  // Render each line
  lines.forEach(line => {
    let xOffset = x
    
    line.forEach(segment => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', segment.bold ? 'bold' : 'normal')
      
      pdf.text(segment.text, xOffset, yPosition)
      
      // Add underline if needed
      if (segment.underline) {
        const textWidth = pdf.getTextWidth(segment.text)
        pdf.line(xOffset, yPosition + 1, xOffset + textWidth, yPosition + 1)
      }
      
      // Move x position for next segment
      xOffset += pdf.getTextWidth(segment.text)
    })
    
    yPosition += lineHeight
  })
  
  return yPosition
}

/**
 * Generate a PDF from the flowchart's copy deck
 */
function generateCopyDeckPDF(doc: ProcessDocument) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 20
  const maxWidth = pageWidth - (margin * 2)
  let yPosition = margin

  // Title
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(doc.meta.title || 'Copy Deck', margin, yPosition)
  yPosition += 15

  // Subtitle
  if (doc.meta.description) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(doc.meta.description, margin, yPosition)
    yPosition += 10
  }

  // Separator line
  yPosition += 5
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 15

  // Traverse the flowchart and collect copy with grouping
  const processedNodes = new Set<string>()
  type CopySection = {
    type: 'single'
    title: string
    copyText: string
    nodeType: string
  } | {
    type: 'options'
    choiceTitle: string
    options: Array<{ title: string; copyText: string }>
  }
  const copySections: CopySection[] = []

  // Helper function to traverse nodes
  function traverseNode(nodeId: string) {
    if (processedNodes.has(nodeId)) return
    processedNodes.add(nodeId)

    const node = doc.nodes.find(n => n.id === nodeId)
    if (!node) return

    const data = node.data as CopyNodeData
    const copyText = data.copyText?.trim()
    const nodeType = data.nodeType || 'unknown'

    // If this is a choice node, group the following option nodes
    if (nodeType === 'choice') {
      const outgoingEdges = doc.edges.filter(e => e.source === nodeId)
      const optionNodes = outgoingEdges
        .map(edge => doc.nodes.find(n => n.id === edge.target))
        .filter(n => n && (n.data as CopyNodeData).nodeType === 'option')
        .filter(n => n && (n.data as CopyNodeData).copyText?.trim())

      if (optionNodes.length > 0) {
        // Add option group
        copySections.push({
          type: 'options',
          choiceTitle: node.data.title,
          options: optionNodes.map(n => ({
            title: n!.data.title,
            copyText: (n!.data as CopyNodeData).copyText!.trim()
          }))
        })

        // Mark option nodes as processed
        optionNodes.forEach(n => processedNodes.add(n!.id))

        // Continue from the first option node's children (they should converge)
        const firstOptionId = optionNodes[0]!.id
        const nextEdges = doc.edges.filter(e => e.source === firstOptionId)
        nextEdges.forEach(edge => traverseNode(edge.target))
      } else {
        // No options, continue traversal
        outgoingEdges.forEach(edge => traverseNode(edge.target))
      }
    } else {
      // Add single item if it has copy text
      if (copyText) {
        copySections.push({
          type: 'single',
          title: node.data.title,
          copyText: copyText,
          nodeType: nodeType
        })
      }

      // Continue traversing
      const outgoingEdges = doc.edges.filter(e => e.source === nodeId)
      outgoingEdges.forEach(edge => traverseNode(edge.target))
    }
  }

  // Start traversal from nodes without incoming edges (start nodes)
  const nodesWithIncoming = new Set(doc.edges.map(e => e.target))
  const startNodes = doc.nodes.filter(n => !nodesWithIncoming.has(n.id))
  
  startNodes.forEach(node => traverseNode(node.id))

  // Add copy sections to PDF
  copySections.forEach((section, sectionIndex) => {
    // Check if we need a new page
    if (yPosition > pdf.internal.pageSize.getHeight() - 60) {
      pdf.addPage()
      yPosition = margin
    }

    if (section.type === 'single') {
      // Single item (static, start, end)
      // Node type badge
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 100, 100)
      const nodeTypeLabel = `[${section.nodeType.toUpperCase()}]`
      pdf.text(nodeTypeLabel, margin, yPosition)
      yPosition += 6

      // Title
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(section.title, margin, yPosition)
      yPosition += 8

      // Copy text - wrap text with formatting support
      yPosition = renderFormattedText(
        pdf,
        section.copyText,
        margin,
        yPosition,
        maxWidth,
        11,
        6
      )

      // Spacing after section
      yPosition += 10
    } else {
      // Option group
      // Group header
      pdf.setFontSize(15)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(section.choiceTitle.toUpperCase(), margin, yPosition)
      yPosition += 8

      // Subtitle "Choose one:"
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(80, 80, 80)
      pdf.text('Choose one of the following options:', margin, yPosition)
      yPosition += 10

      // Add light background box for options
      const boxStartY = yPosition
      const optionIndent = margin + 5

      // Render each option
      section.options.forEach((option, optionIndex) => {
        // Check if we need a new page
        if (yPosition > pdf.internal.pageSize.getHeight() - 60) {
          pdf.addPage()
          yPosition = margin
        }

        // Bullet point
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(0, 0, 0)
        pdf.text('•', optionIndent, yPosition)

        // Option title
        pdf.setFont('helvetica', 'bold')
        pdf.text(option.title, optionIndent + 8, yPosition)
        yPosition += 7

        // Option copy text (indented) with formatting support
        pdf.setTextColor(40, 40, 40)
        yPosition = renderFormattedText(
          pdf,
          option.copyText,
          optionIndent + 8,
          yPosition,
          maxWidth - 15,
          10,
          5.5
        )

        // Spacing between options
        yPosition += (optionIndex < section.options.length - 1) ? 8 : 10
      })

      // Spacing after option group
      yPosition += 5
    }

    // Separator line (except for last section)
    if (sectionIndex < copySections.length - 1) {
      if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage()
        yPosition = margin
      }
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 12
    }
  })

  // Save PDF
  const fileName = `${doc.meta.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-copy-deck.pdf`
  pdf.save(fileName)
}

/**
 * Export button component
 */
function ExportButton({ doc }: { doc: ProcessDocument }) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      generateCopyDeckPDF(doc)
      setTimeout(() => setIsExporting(false), 1000)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please check the console for details.')
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="icon-button"
      title="Export Copy Deck to PDF"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: isExporting ? 0.6 : 1
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      {isExporting ? 'Exporting...' : 'Export Copy Deck'}
    </button>
  )
}

/**
 * Plugin initialization
 */
function initialize() {
  // Add export button to view mode header
  hooks.addAction<HeaderButtonHookContext>('header:viewMode:buttons', ({ doc }) => {
    return <ExportButton doc={doc} />
  })

  // Add export button to edit mode header
  hooks.addAction<HeaderButtonHookContext>('header:editMode:buttons', ({ doc }) => {
    return <ExportButton doc={doc} />
  })

  // Add copy text field to node inspector
  hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
    if (!node || !onUpdateNode) return null

    const data = node.data as CopyNodeData
    const copyText = data.copyText || ''

    return (
      <div className="space-y-4">
        <label className="form-label">
          <span className="font-medium" style={{ display: 'block', marginBottom: '4px' }}>
            Copy Text
          </span>
          <textarea
            value={copyText}
            onChange={(e) => onUpdateNode(node.id, (data) => ({
              ...data,
              copyText: e.target.value
            }))}
            className="form-input"
            placeholder="Enter marketing copy for this node..."
            rows={6}
            style={{
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          />
          <span className="text-xs text-slate-500" style={{ display: 'block', marginTop: '4px' }}>
            This copy will be included in the PDF export. Use **bold** or __underline__ for formatting.
          </span>
        </label>
      </div>
    )
  })

  // Add node type field to node inspector
  hooks.addAction<InspectorFieldHookContext>('inspector:node:fields', ({ node, onUpdateNode }) => {
    if (!node || !onUpdateNode) return null

    const data = node.data as CopyNodeData
    const nodeType = data.nodeType || 'static'

    return (
      <label className="form-label">
        <span className="font-medium" style={{ display: 'block', marginBottom: '4px' }}>
          Node Type
        </span>
        <select
          value={nodeType}
          onChange={(e) => onUpdateNode(node.id, (data) => ({
            ...data,
            nodeType: e.target.value as CopyNodeData['nodeType']
          }))}
          className="form-input"
          style={{
            colorScheme: 'dark'
          }}
        >
          <option value="start">Start</option>
          <option value="static">Static (always shown)</option>
          <option value="choice">Choice (decision point)</option>
          <option value="option">Option (specific choice)</option>
          <option value="end">End</option>
        </select>
        <span className="text-xs text-slate-500" style={{ display: 'block', marginTop: '4px' }}>
          Categorize this node for organization
        </span>
      </label>
    )
  })

  // Add visual indicator for nodes with copy text
  hooks.addAction<NodeRenderHookContext>('node:render:badge', ({ id, data }) => {
    const copyData = data as CopyNodeData
    const hasCopy = copyData.copyText && copyData.copyText.trim().length > 0

    if (!hasCopy) return null

    return (
      <span
        style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: '#10b981',
          color: 'white',
          fontWeight: '600'
        }}
        title="Has copy text"
      >
        📄
      </span>
    )
  })

  // Show copy preview on nodes
  hooks.addAction<NodeRenderHookContext>('node:render:content', ({ id, data }) => {
    const copyData = data as CopyNodeData
    const copyText = copyData.copyText?.trim()

    if (!copyText) return null

    // Show first 60 characters as preview
    const preview = copyText.length > 60 
      ? copyText.substring(0, 60) + '...' 
      : copyText

    return (
      <div
        style={{
          marginTop: '8px',
          padding: '6px 8px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          fontSize: '11px',
          lineHeight: '1.4',
          color: '#0f766e',
          fontStyle: 'italic'
        }}
      >
        {preview}
      </div>
    )
  })
}

const plugin: Plugin = {
  name: 'Copy Deck Export',
  version: '1.0.0',
  initialize
}

export default plugin

