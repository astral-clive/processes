# Processes

## tl;dr

A process flowchart tool that runs entirely on your infrastructure with zero external dependencies. Perfect for teams working with disclosed client information—fork this repo, run it locally, and document processes without any risk of data leaving your organization. No cloud services, no APIs, no third-party tracking. Just your data, your infrastructure, your control.

---

A client-agnostic process flowchart application that lets you create, edit, and share visual process flows entirely within your own infrastructure. Perfect for organizations that need to document workflows, onboarding processes, and operational procedures without exposing sensitive client information to third-party services.

**Key Value Proposition:** Fork this repository to your organization's private repo and run it completely independently—no cloud services, no external APIs, no data leakage. All your process data stays local and secure.

## Synopsis

Processes is a self-contained web application for creating interactive process flowcharts. Built with React and React Flow, it provides an intuitive visual editor where teams can document complex workflows, decision trees, and operational procedures. The application is designed from the ground up to be **client-agnostic** and **privacy-first**, making it ideal for:

- Consulting firms documenting client-specific processes
- Agencies managing workflows for multiple clients
- Organizations with strict data privacy requirements
- Teams needing to document processes without exposing client information
- Environments where client confidentiality is critical

Unlike traditional SaaS tools, Processes runs entirely on your infrastructure with zero external dependencies. There are no API keys, no cloud services, no telemetry, and no risk of client data being exposed through third-party services.

## Features

- **Visual Flow Editor**: Create interactive flowcharts with nodes (steps) and edges (connections)
- **Category Organization**: Organize processes into categories for better structure
- **Rich Node Editing**: Customize step titles, descriptions, and colors
- **Flexible Connections**: Create decision branches with labeled edges
- **Export & Import**: Share processes with teammates via JSON files
- **Local Storage**: All data stored in simple JSON files on your filesystem
- **No External Dependencies**: Runs completely offline and independently

## Client-Agnostic Design

Processes is built to be completely self-contained:

- **No External Services**: No databases, cloud storage, or third-party APIs
- **File-Based Storage**: All data stored as JSON files in the `data/` directory
- **No Configuration Secrets**: No API keys, credentials, or sensitive configuration
- **Fully Forkable**: Clone or fork to your organization's private repository
- **Complete Data Control**: Your data never leaves your infrastructure
- **Privacy-First**: No telemetry, analytics, or external tracking

This architecture ensures that sensitive client information remains secure within your organization's boundaries, making it safe to use even in environments where client data may be frequently disclosed.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone or fork this repository:
   ```bash
   git clone <repository-url>
   cd processes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173` (or the port shown in your terminal)

### Basic Usage

1. **Create a Category**: Click "Edit" in the sidebar, then "New Category"
2. **Add a Process**: With edit mode enabled, click "+ Add process" under any category
3. **Edit the Flow**: Click on nodes to edit their titles and descriptions
4. **Add Connections**: Drag from node handles to create connections between steps
5. **Save Changes**: Changes are automatically saved when you modify the process

## Exporting and Importing Processes

### Exporting a Process

To share a process with teammates:

1. Open the process you want to export in the main workspace
2. Click the **Export** button (upload icon) in the top header of the flow workspace
3. A JSON file will be downloaded with the format: `{categoryId}-{processId}.json`

The exported file contains the complete process definition including:
- Process metadata (title, description, category/process IDs)
- All nodes with their positions, titles, descriptions, and colors
- All edges with their connections, labels, and styling

### Importing a Process

To import a process shared by a teammate:

1. Enable **Edit Mode** by clicking the "Edit" button in the sidebar
2. Navigate to the category where you want to import the process
3. Click the **Import** button (download icon) next to the category name
4. Select the JSON file exported by your teammate
5. The process will be imported and added to the selected category

**Note**: The imported process will be given a new process ID based on its title to avoid conflicts. You can rename it after importing if needed.

### Sharing Workflow

1. **Teammate A** exports a process using the Export button
2. **Teammate A** shares the JSON file via email, Slack, or version control
3. **Teammate B** imports the JSON file into their local instance
4. Both teammates now have the same process in their respective installations

This workflow allows teams to collaborate on processes while maintaining complete control over their data storage and infrastructure.

## Forking for Your Organization

### Setting Up Your Fork

1. **Fork the Repository**: Create a fork in your organization's private Git repository
2. **Clone Locally**: Clone your fork to your development machine
3. **Customize**: Modify branding, colors, or features as needed for your organization
4. **Deploy**: Deploy to your organization's infrastructure (see Deployment below)

### Data Storage

All process data is stored in the `data/` directory:

```
data/
├── categories.json          # Category definitions and process listings
└── processes/               # Individual process files
    └── {categoryId}-{processId}.json
```

The `data/original/` directory contains snapshot backups (gitignored) that are used for the reset functionality.

### Deployment Considerations

**Development**: The application runs via Vite's dev server with a built-in file-based API middleware. This is perfect for local development and small team usage.

**Production**: For production deployment, you'll need to:

1. Build the application:
   ```bash
   npm run build
   ```

2. Serve the `dist/` folder with a web server that includes the API middleware, or:
   - Adapt the Vite middleware to your preferred Node.js framework (Express, Fastify, etc.)
   - Implement the same file-based API endpoints in your production server
   - Ensure the `data/` directory is writable by your server process

3. **Security**: Since this application has no authentication built-in, ensure:
   - Access is restricted to your organization's network/VPN
   - Or implement authentication/authorization as needed
   - The `data/` directory has appropriate file permissions

4. **Backup**: Regularly backup the `data/` directory as it contains all your process definitions

### Customization

The application is built with:
- **React 18** with TypeScript
- **React Flow** for the flowchart editor
- **Tailwind CSS** for styling
- **Vite** for build tooling

You can customize:
- Colors and styling via `tailwind.config.js` and `src/index.css`
- UI components in `src/components/`
- Data structure by modifying `src/types.ts` and the API middleware in `vite.config.ts`

## License

[Specify your license here]

## Contributing

Since this is designed to be forked for organizational use, contributions back to the original repository are welcome but not required. Feel free to adapt and modify for your organization's specific needs.

