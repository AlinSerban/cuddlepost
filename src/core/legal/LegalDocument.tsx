import { Link } from 'react-router-dom'
import { BRANDS, type BrandId } from '../brand'
import { legalPages, type LegalPageId } from './index'

interface LegalDocProps {
  brand: BrandId
  page: LegalPageId
  /** CSS class prefix matching the brand theme, e.g. `v1` / `v2` / `v3`. */
  themeClass: string
  homePath?: string
}

export function LegalDocument({ brand, page, themeClass, homePath = '/' }: LegalDocProps) {
  const doc = legalPages(brand).find((p) => p.id === page)!
  const b = BRANDS[brand]
  const t = themeClass

  return (
    <div className={`pg-theme ${t}`}>
      <header className="pg-legal-top">
        <Link to={homePath} className="pg-legal-logo">
          <span className="pg-legal-logo-mark" aria-hidden>
            🧸
          </span>
          <span>
            {b.name}
            <small>back to home</small>
          </span>
        </Link>
        <nav className="pg-legal-tabs" aria-label="Legal pages">
          <Link to="/terms" className={page === 'terms' ? 'is-active' : undefined}>
            Terms
          </Link>
          <Link to="/privacy" className={page === 'privacy' ? 'is-active' : undefined}>
            Privacy
          </Link>
          <Link to="/refund" className={page === 'refund' ? 'is-active' : undefined}>
            Refunds
          </Link>
        </nav>
      </header>

      <main className="pg-legal">
        <h1>{doc.title}</h1>
        <p className="pg-legal-note">Last updated 29 Sep 2026</p>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </section>
        ))}
        <p className="pg-legal-contact">
          Questions? Email <a href={`mailto:${b.supportEmail}`}>{b.supportEmail}</a>
        </p>
      </main>
    </div>
  )
}
