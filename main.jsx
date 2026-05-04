import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { injectSEO } from './utils/SEOEngine' // Import your new file

// Run SEO injection immediately on load
injectSEO();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)