import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

const rootEl = document.getElementById('root')!
const appNode = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if (rootEl.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootEl, appNode)
} else {
  ReactDOM.createRoot(rootEl).render(appNode)
}
