import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PLUSH_TYPES, PRICE, type GiftDraft } from '../gift'

interface CheckoutProps {
  draft: GiftDraft
  open: boolean
  paying: boolean
  onClose: () => void
  onPay: () => void
  title?: string
}

export function CheckoutModal({ draft, open, paying, onClose, onPay, title = 'Checkout' }: CheckoutProps) {
  const [digitalConsent, setDigitalConsent] = useState(false)
  const [terms, setTerms] = useState(false)
  if (!open) return null
  const plush = PLUSH_TYPES.find((p) => p.id === draft.plush)!
  const patchCount = Object.keys(draft.patches).length

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div className="pg-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pg-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>{title}</h3>
        <div className="pg-summary">
          <div className="pg-summary-row">
            <span>
              {plush.emoji} {plush.label} for {draft.recipientName || '—'}
            </span>
            <strong>{PRICE.label}</strong>
          </div>
          <ul>
            <li>Custom color{patchCount ? ` + ${patchCount} patch${patchCount > 1 ? 'es' : ''}` : ''}</li>
            <li>Private message card{draft.voice ? ' + voice note' : ''}</li>
            <li>
              {draft.delivery === 'email'
                ? `Delivered by email to ${draft.recipientEmail}`
                : 'Private link + QR code'}
            </li>
          </ul>
        </div>

        <div className="pg-placeholder-pay">
          <span className="pg-placeholder-tag">Payment placeholder</span>
          <div className="pg-fake-input">4242 4242 4242 4242</div>
          <div className="pg-row">
            <div className="pg-fake-input">12 / 34</div>
            <div className="pg-fake-input">123</div>
          </div>
          <small>
            Polar (or Paddle / Creem) checkout will live here. No real charge is made in stub mode.
          </small>
        </div>

        <label className="pg-check">
          <input
            type="checkbox"
            checked={digitalConsent}
            onChange={(e) => setDigitalConsent(e.target.checked)}
          />
          <span>
            I agree to immediate delivery of digital content and understand I lose my right of withdrawal.
          </span>
        </label>
        <label className="pg-check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I accept the <Link to="/terms" target="_blank">Terms</Link>,{' '}
            <Link to="/privacy" target="_blank">Privacy Policy</Link> and{' '}
            <Link to="/refund" target="_blank">Refund Policy</Link>.
          </span>
        </label>

        <button
          type="button"
          className="pg-pay-btn"
          disabled={!digitalConsent || !terms || paying}
          onClick={onPay}
        >
          {paying ? 'Wrapping your plushie…' : `Pay ${PRICE.label} & send`}
        </button>
      </div>
    </div>
  )
}
