import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReactFlowProvider } from 'reactflow'
import App from './App.tsx'
import './index.css'
import { initializePlugins } from './lib/plugins'

// Initialize plugin system before rendering the app
initializePlugins()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </React.StrictMode>
)


