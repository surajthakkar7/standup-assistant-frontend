import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { applyTheme, getStoredTheme } from './theme';
applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer
        position="top-right"
        theme="dark"
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        autoClose={2500}
      />
    </BrowserRouter>
  </React.StrictMode>
)
