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
    return <p className={className}>Thanks — we hid this gift from new visitors and will review it.</p>
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
      <label>
        Reason
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label>
        Details (optional)
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500} />
      </label>
      {error && <p className="pg-error">{error}</p>}
      <div className="pg-report-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}
