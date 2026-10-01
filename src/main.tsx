import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LegalDocument } from './core/legal/LegalDocument'
import { ManageGiftPage } from './core/ui/ManageGift'
import './core/ui/base.css'
import './core/keepsake/keepsake.css'

const Landing = lazy(() => import('./index').then((m) => ({ default: m.Landing })))
const Sent = lazy(() => import('./index').then((m) => ({ default: m.Sent })))
const Gift = lazy(() => import('./index').then((m) => ({ default: m.Gift })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sent/:id" element={<Sent />} />
          <Route path="/gift/:id" element={<Gift />} />
          <Route path="/manage/:id" element={<ManageGiftPage themeClass="v3" btnClass="v3-btn" />} />
          <Route path="/terms" element={<LegalDocument brand="cuddlepost" page="terms" themeClass="v3" />} />
          <Route path="/privacy" element={<LegalDocument brand="cuddlepost" page="privacy" themeClass="v3" />} />
          <Route path="/refund" element={<LegalDocument brand="cuddlepost" page="refund" themeClass="v3" />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
