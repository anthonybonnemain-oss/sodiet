import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PatientApp from './PatientApp.jsx'

const isPatient = window.location.pathname.startsWith('/patient')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPatient ? <PatientApp /> : <App />}
  </StrictMode>
)
