import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ExcelQRCodeUploader from './ExcelQRCodeUploader.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExcelQRCodeUploader />
  </StrictMode>,
)
