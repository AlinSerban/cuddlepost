import { useState } from 'react'
import { reportGift } from '../services'

const REASONS = [
  'Harassment or abuse',
  'Spam or scam',
  'Inappropriate content',
  'Impersonation',
  'Other',
]

export function ReportGiftButton({ giftId, className }: { giftId: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <p className="pg-report-done">
        Thanks. This gift is hidden now. We also notified support at post@cuddlepost.fun.
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Report this gift
      </button>
    )
  }

  return (
    <form
      className="pg-report"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await reportGift(giftId, reason, details.trim() || undefined)
          setDone(true)
        } catch {
          setError('Could not send the report. Try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <h3 className="pg-report-title">Report this gift</h3>
      <p className="pg-report-lede">Tell us what’s wrong. We’ll hide the page and review it.</p>
      <label className="pg-field">
        <span>Reason</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="pg-field">
        <span>
          Details <em>optional</em>
        </span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Anything that helps us understand…"
        />
      </label>
      {error && <p className="pg-error">{error}</p>}
      <div className="pg-report-actions">
        <button type="submit" className="v3-btn v3-btn-sm" disabled={busy}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
        <button type="button" className="v3-btn v3-btn-sm v3-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}
