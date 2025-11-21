# Copy Deck Export Plugin

This plugin allows you to create marketing copy decks directly within your flowcharts and export them to professional PDF documents. Perfect for creating marketing materials, product customization flows, or any process that needs accompanying copy text.

## Features

- ✅ **Copy Text Field**: Add marketing copy to any node via the inspector panel
- ✅ **Node Type Classification**: Categorize nodes as Static, Choice, Option, Start, or End
- ✅ **Visual Indicators**: See which nodes have copy text with badges
- ✅ **Copy Preview**: Preview copy text directly on nodes in the flowchart
- ✅ **PDF Export**: Generate professional PDF documents with all copy text
- ✅ **Smart Traversal**: Automatically follows flowchart structure to organize copy

## Example: Car Customization Flow

An example flowchart has been created to demonstrate this plugin: **Marketing > Car Customization Flow**

This example shows a car purchase customization flow with:
- Introduction copy (always shown)
- Color selection options (Red, Blue, Silver) - each with unique copy
- Environmental statement (always shown)
- Window tinting options (Yes/No)
- Wheel size options (18" or 20")

## How to Use

### 1. Add Copy to Nodes

1. Open any process flowchart in **Edit Mode**
2. Select a node you want to add copy to
3. In the **Inspector Panel** on the right, you'll see new fields:
   - **Copy Text**: A textarea to enter your marketing copy
   - **Node Type**: Categorize the node's purpose

### 2. Node Types

Choose the appropriate type for each node:

- **Start**: Beginning of the flow (typically no copy)
- **Static**: Copy that always appears (e.g., introductions, disclaimers)
- **Choice**: Decision point nodes (typically no copy, just the question)
- **Option**: Specific choice copy (e.g., color descriptions)
- **End**: Completion node (optional closing copy)

### 3. Visual Feedback

As you add copy, you'll see:
- 📄 **Badge**: Appears on nodes that have copy text
- **Preview**: First 60 characters of copy shown below the node description

### 4. Export to PDF

1. Click the **"Export Copy Deck"** button in the header (available in both View and Edit modes)
2. The PDF will automatically download with:
   - Document title and description
   - All copy text organized in flow order
   - Node type labels for each section
   - Professional formatting

## Use Cases

### Marketing Materials
- Product customization flows
- Service selection processes
- Customer journey documentation

### Content Management
- Website copy decks
- Email campaign content
- Landing page variations

### Documentation
- Process documentation with explanatory text
- Training materials
- User guides

## Technical Details

### Data Structure

The plugin extends `ProcessNodeData` with two new fields:

```typescript
{
  copyText?: string      // The marketing copy text
  nodeType?: string      // 'static' | 'choice' | 'option' | 'start' | 'end'
}
```

These fields are stored directly in the node's data object and persist with the process file.

### PDF Generation

- Uses jsPDF library for PDF creation
- Text wrapping handles long copy automatically
- Follows flowchart structure via edge traversal
- Starts from nodes without incoming edges
- Includes visual separators between sections

### Hook Integration

The plugin uses the following hooks:
- `header:viewMode:buttons` - Export button
- `header:editMode:buttons` - Export button
- `inspector:node:fields` - Copy text and node type fields
- `node:render:badge` - Visual indicator for nodes with copy
- `node:render:content` - Copy preview display

## Tips

1. **Keep Copy Concise**: While the textarea allows long text, consider readability in the PDF
2. **Use Node Colors**: Visually group related nodes with colors for easier editing
3. **Test Export Early**: Export frequently to see how your copy flows together
4. **Document Choices**: Even "choice" nodes can have brief copy explaining the decision
5. **Leverage Static Nodes**: Use static nodes for intro, disclaimers, and closing statements

## Example Workflow

1. Create your flowchart structure with nodes and edges
2. Identify which nodes need copy (usually option nodes and static content)
3. Set node types appropriately
4. Write copy for each node, starting with static introductions
5. Add copy for each option/choice path
6. Preview on the flowchart (badges and previews)
7. Export to PDF and review
8. Iterate and refine

## Future Enhancements

Possible future additions:
- Export to other formats (Word, Markdown)
- Custom PDF styling/branding
- Copy templates
- Version comparison
- Multi-language support

## Questions or Issues?

This plugin is self-contained in `plugins/copy-deck-export.tsx`. Feel free to modify it to suit your specific needs!

