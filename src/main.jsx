import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PatientApp from './PatientApp.jsx'
import './index.css'

function Launcher() {
  // Par défaut, on lance l'App Praticien
  const [mode, setMode] = useState('praticien');

  return (
    <>
      {/* Petit menu de secours en haut de l'écran (uniquement en local) */}
      <div style={{
        position: 'fixed', bottom: 10, right: 10, zIndex: 9999,
        display: 'flex', gap: 10, background: '#2A2118', padding: '10px', borderRadius: '8px'
      }}>
        <button onClick={() => setMode('praticien')} style={{cursor:'pointer', fontSize: '12px'}}>Mode Praticien</button>
        <button onClick={() => setMode('patient')} style={{cursor:'pointer', fontSize: '12px'}}>Mode Patient</button>
      </div>

      {mode === 'praticien' ? <App /> : <PatientApp />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Launcher />
  </React.StrictMode>,
)