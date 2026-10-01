import { useEffect, useMemo, useRef, useState } from 'react'

const MAX_SECONDS = 60

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const url = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])

  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  useEffect(() => () => window.clearInterval(timer.current), [])

  const stop = () => {
    recorder.current?.stop()
    window.clearInterval(timer.current)
    setRecording(false)
  }

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        onChange(new Blob(chunks, { type: rec.mimeType }))
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setElapsed(0)
      const startedAt = Date.now()
      timer.current = window.setInterval(() => {
        const sec = (Date.now() - startedAt) / 1000
        setElapsed(sec)
        if (sec >= MAX_SECONDS) stop()
      }, 200)
    } catch {
      setError('Microphone access was blocked.')
    }
  }

  return (
    <div className="pg-voice">
      {!value && !recording && (
        <button type="button" className="pg-voice-btn" onClick={start}>
          <span className="pg-voice-dot" /> Record voice note
        </button>
      )}
      {recording && (
        <button type="button" className="pg-voice-btn is-recording" onClick={stop}>
          <span className="pg-voice-dot" /> Stop · {fmt(elapsed)} / {fmt(MAX_SECONDS)}
        </button>
      )}
      {value && url && (
        <div className="pg-voice-done">
          <VoicePlayer src={url} />
          <button type="button" className="pg-link-btn" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      )}
      {error && <p className="pg-error">{error}</p>}
    </div>
  )
}

export function VoicePlayer({ src, label = 'Voice note' }: { src: string; label?: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  return (
    <div className="pg-player">
      <button
        type="button"
        className="pg-player-btn"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => (playing ? audio.current?.pause() : audio.current?.play())}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="pg-player-body">
        <span className="pg-player-label">{label}</span>
        <div className="pg-player-bars">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className={i / 28 < progress ? 'is-on' : ''}
              style={{ height: `${30 + Math.abs(Math.sin(i * 1.7)) * 70}%` }}
            />
          ))}
        </div>
      </div>
      <audio
        ref={audio}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          if (Number.isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration)
        }}
      />
    </div>
  )
}

