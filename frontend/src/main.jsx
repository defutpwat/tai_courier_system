/**
 * Punkt wejścia aplikacji React (Entry Point).
 * Montuje komponent <App /> w głównym elemencie HTML i nakłada na niego podstawową warstwę Reacta.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
