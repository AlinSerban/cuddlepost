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
      <main className="pg-legal">
        <p className="pg-legal-brand">
          <Link to={homePath}>{b.name}</Link>
        </p>
        <h1>{doc.title}</h1>
        <p className="pg-legal-note">Draft for review — not legal advice. Last updated 29 Sep 2026.</p>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </section>
        ))}
        <nav className="pg-legal-nav">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/refund">Refunds</Link>
          <Link to={homePath}>Home</Link>
        </nav>
      </main>
    </div>
  )
}
