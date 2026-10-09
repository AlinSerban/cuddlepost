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
    document.title = 'Manage gift · Cuddlepost'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className={`pg-theme ${themeClass}`}>
      <nav className="v3-nav">
        <Link to={homePath} className="v3-logo">
          <span className="v3-stamp-logo">🧸</span>
          <span>
            Cuddlepost
            <small>hugs by (very fast) post</small>
          </span>
        </Link>
      </nav>
      <main className="v3-sent">
        <div className="v3-label">
          {status === 'gone' ? (
            <>
              <span className="v3-hand">all gone</span>
              <h1>Gift deleted</h1>
              <p className="v3-hand v3-hand-sm">
                This parcel will no longer open for anyone. Voice note gone too.
              </p>
              <div className="v3-actions">
                <Link to={homePath} className="v3-btn">
                  Back home
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="v3-hand">handle with care</span>
              <h1>Manage this gift</h1>
              <dl className="v3-label-rows">
                <dt>Gift</dt>
                <dd>
                  <code style={{ fontSize: '0.85rem' }}>{id}</code>
                </dd>
                <dt>Note</dt>
                <dd>Deleting removes the page and any voice note. This cannot be undone.</dd>
              </dl>
              {status === 'bad' && (
                <p className="pg-error" style={{ marginTop: '1rem' }}>
                  Could not delete. Check your manage link.
                </p>
              )}
              <div className="v3-actions">
                <button
                  type="button"
                  className={`${btnClass} v3-btn-ghost v3-btn-delete`.trim()}
                  style={{ padding: '14px 26px', fontSize: 'inherit', fontWeight: 700 }}
                  disabled={!token || status === 'busy'}
                  onClick={async () => {
                    setStatus('busy')
                    try {
                      const ok = await deleteGift(id, token)
                      setStatus(ok ? 'gone' : 'bad')
                    } catch (err) {
                      console.error('[manage] delete failed', err)
                      setStatus('bad')
                    }
                  }}
                >
                  {status === 'busy' ? 'Deleting…' : 'Delete gift permanently'}
                </button>
                <Link to={homePath} className="v3-btn v3-btn-ghost">
                  Back home
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
