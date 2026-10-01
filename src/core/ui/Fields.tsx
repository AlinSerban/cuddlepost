import { useEffect, useState } from 'react'
import { OCCASIONS, type GiftDraft } from '../gift'
import { voiceAllowed } from '../voiceGeo'
import { VoiceRecorder } from './Voice'

type Update = (patch: Partial<GiftDraft>) => void

export const MESSAGE_LIMIT = 280

export function MessageFields({ draft, update, withVoice = true }: { draft: GiftDraft; update: Update; withVoice?: boolean }) {
  const [voiceOk, setVoiceOk] = useState(true)

  useEffect(() => {
    if (!withVoice) return
    let cancelled = false
    voiceAllowed().then((ok) => {
      if (cancelled) return
      setVoiceOk(ok)
      if (!ok && draft.voice) update({ voice: null })
    })
    return () => {
      cancelled = true
    }
    // Only re-check when withVoice flips; draft.voice clear is intentional once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geo check once per mount
  }, [withVoice])

  const showVoice = withVoice && voiceOk

  return (
    <div className="pg-fields">
      <div className="pg-row">
        <label className="pg-field">
          <span>Your name</span>
          <input value={draft.senderName} placeholder="Alex" maxLength={40} onChange={(e) => update({ senderName: e.target.value })} />
        </label>
        <label className="pg-field">
          <span>Their name</span>
          <input
            value={draft.recipientName}
            placeholder="Sam"
            maxLength={40}
            onChange={(e) => update({ recipientName: e.target.value })}
          />
        </label>
      </div>
      <div className="pg-field">
        <span>Occasion</span>
        <div className="pg-occasions">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              className={`pg-chip ${draft.occasion === o ? 'is-active' : ''}`}
              onClick={() => update({ occasion: o })}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <label className="pg-field">
        <span>
          Your message <em>{draft.message.length}/{MESSAGE_LIMIT}</em>
        </span>
        <textarea
          rows={4}
          value={draft.message}
          maxLength={MESSAGE_LIMIT}
          placeholder="A few words from the heart…"
          onChange={(e) => update({ message: e.target.value })}
        />
      </label>
      {showVoice && (
        <div className="pg-field">
          <span>
            Voice note <em>optional · up to 60s</em>
          </span>
          <VoiceRecorder value={draft.voice} onChange={(voice) => update({ voice })} />
        </div>
      )}
      {withVoice && !voiceOk && (
        <p className="pg-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Voice notes aren’t available in your region due to local biometric-data rules. You can still send a written
          message.
        </p>
      )}
    </div>
  )
}

export function DeliveryFields({ draft, update }: { draft: GiftDraft; update: Update }) {
  return (
    <div className="pg-fields">
      <div className="pg-delivery">
        <button
          type="button"
          className={`pg-delivery-opt ${draft.delivery === 'link' ? 'is-active' : ''}`}
          onClick={() => update({ delivery: 'link' })}
        >
          <strong>Link & QR</strong>
          <small>Share it yourself anywhere</small>
        </button>
        <button
          type="button"
          className={`pg-delivery-opt ${draft.delivery === 'email' ? 'is-active' : ''}`}
          onClick={() => update({ delivery: 'email' })}
        >
          <strong>Email</strong>
          <small>We deliver it for you</small>
        </button>
      </div>
      {draft.delivery === 'email' && (
        <label className="pg-field">
          <span>Their email</span>
          <input
            type="email"
            value={draft.recipientEmail}
            placeholder="sam@example.com"
            onChange={(e) => update({ recipientEmail: e.target.value })}
          />
        </label>
      )}
      <label className="pg-field">
        <span>Your email (for the receipt & link)</span>
        <input
          type="email"
          value={draft.senderEmail}
          placeholder="you@example.com"
          onChange={(e) => update({ senderEmail: e.target.value })}
        />
      </label>
    </div>
  )
}
