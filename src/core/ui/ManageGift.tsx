import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { deleteGift, recallManageToken } from '../services'

interface ManageGiftProps {
  themeClass: string
  homePath?: string
  btnClass?: string
}

export function ManageGiftPage({ themeClass, homePath = '/', btnClass = 'pg-pay-btn' }: ManageGiftProps) {
  const { id = '' } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const token = params.get('token') || recallManageToken(id) || ''
  const [status, setStatus] = useState<'idle' | 'busy' | 'gone' | 'bad'>('idle')

  useEffect(() => {
    document.title = 'Manage gift'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className={`pg-theme ${themeClass}`}>
      <main className="pg-legal">
        <h1>Manage this gift</h1>
        {status === 'gone' ? (
          <>
            <p>This gift has been deleted and will no longer open for anyone.</p>
            <Link to={homePath}>Back home</Link>
          </>
        ) : (
          <>
            <p>
              Gift id: <code>{id}</code>
            </p>
            <p>Deleting removes the page and any voice note. This cannot be undone.</p>
            {status === 'bad' && <p className="pg-error">Could not delete — check your manage link.</p>}
            <button
              type="button"
              className={btnClass}
              disabled={!token || status === 'busy'}
              onClick={async () => {
                setStatus('busy')
                const ok = await deleteGift(id, token)
                setStatus(ok ? 'gone' : 'bad')
              }}
            >
              {status === 'busy' ? 'Deleting…' : 'Delete gift permanently'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
