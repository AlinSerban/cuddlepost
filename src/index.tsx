import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PLUSH_TYPES, PRICE, GIFT_TTL_HOURS, isGiftExpired, type Gift } from './core/gift'
import { copyText, useGiftById, useGiftFlow } from './core/flow'
import { isStandalone, Keepsake, useHomeScreenSetup } from './core/keepsake'
import { PlushViewer } from './core/plushie/PlushViewer'
import { useBrandHomeMeta, useGiftMeta } from './core/seo'
import { CheckoutModal } from './core/ui/Checkout'
import { ErrorBoundary } from './core/ui/ErrorBoundary'
import { ColorWheel } from './core/ui/ColorWheel'
import { DeliveryFields, MessageFields } from './core/ui/Fields'
import { PatchEditor, PlushPicker } from './core/ui/Pickers'
import { QrCode } from './core/ui/QrCode'
import { ReportGiftButton } from './core/ui/ReportGift'
import { VoicePlayer } from './core/ui/Voice'
import { cuddlepostKeepsake } from './keepsake'
import './v3.css'

const BRAND = 'Cuddlepost'

function Nav() {
  return (
    <nav className="v3-nav">
      <Link to="/" className="v3-logo">
        <span className="v3-stamp-logo">🧸</span>
        <span>
          {BRAND}
          <small>hugs by (very fast) post</small>
        </span>
      </Link>
      <a href="#bench" className="v3-btn v3-btn-sm">
        Start stitching
      </a>
    </nav>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="v3-block">
      <header>
        <span className="v3-block-n">{n}</span>
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  )
}

function postDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export function Landing() {
  useBrandHomeMeta('cuddlepost')
  const flow = useGiftFlow('cuddlepost', {
    plush: 'bear',
    color: '#c98b5e',
    patchColor: '#e8436b',
    patches: { chest: 'heart' },
  })
  const { draft, update } = flow
  const plush = PLUSH_TYPES.find((p) => p.id === draft.plush)!

  return (
    <div className="pg-theme v3">
      <Nav />

      <header className="v3-hero">
        <div className="v3-hero-copy">
          <span className="v3-hand">made just for them ♡</span>
          <h1>
            A little hug, <br />
            <em>posted in seconds.</em>
          </h1>
          <p>
            Stitch together a one-of-a-kind 3D plushie, tie on a handwritten tag, and send it to someone who could use
            a cuddle. It never gets lost in the mail.
          </p>
          <div className="v3-hero-cta">
            <a href="#bench" className="v3-btn">
              Stitch one for {PRICE.label}
            </a>
            <span className="v3-hand v3-hand-sm">↖ takes about a minute</span>
          </div>
        </div>
        <div className="v3-hero-stage">
          <div className="v3-parcel-bg" />
          <PlushViewer
            className="v3-hero-canvas"
            plush="puppy"
            color="#f3e6d4"
            patchColor="#6b8f71"
            patches={{ chest: 'flower', head: 'heart' }}
            autoRotate
            shadowColor="#5a3b22"
          />
          <div className="v3-tag v3-hero-tag">
            <span className="v3-tag-hole" />
            <p>Get well soon, Grandpa. Love, Mia</p>
          </div>
        </div>
      </header>

      <section className="v3-section">
        <h2>From our little workshop</h2>
        <div className="v3-steps">
          {[
            ['Choose a friend', 'A bear, bunny, kitty or puppy, each one soft and a little squishy.'],
            ['Sew it your way', 'Any fabric color you can dream up, plus patches on the chest, head or feet.'],
            ['Tie on a tag', 'Write a note in your words. Add your voice, if you like.'],
          ].map(([t, d], i) => (
            <div key={t} className="v3-step">
              <span className="v3-step-n">No. {i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="v3-section">
        <h2>Little reasons to post a hug</h2>
        <p className="v3-section-lede">Example tags. Tap one to start stitching.</p>
        <div className="v3-postcards">
          {[
            [
              'Miss you already. Squeeze this when the house feels quiet.',
              'for Dad, from Maya',
              'I miss you',
              '🧸',
            ],
            [
              'Happy birthday, you absolute legend. This one’s for your desk.',
              'for Priya',
              'Happy birthday',
              '🎂',
            ],
            [
              'No reason. Just wanted you to have something soft today.',
              'just because',
              'Just because',
              '♡',
            ],
          ].map(([note, from, occasion, stamp], i) => (
            <button
              key={occasion}
              type="button"
              className="v3-postcard v3-postcard-btn"
              style={{ rotate: `${[-1.5, 1, -0.5][i]}deg` }}
              onClick={() => {
                update({ occasion })
                document.getElementById('bench')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <p className="v3-postcard-quote">{note}</p>
              <span className="v3-postcard-label">{from}</span>
              <span className="v3-postcard-stamp" aria-hidden>
                {stamp}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="bench" className="v3-section v3-bench">
        <div className="v3-bench-head">
          <h2>The workbench</h2>
          <p>Everything you change shows up on your plushie right away.</p>
        </div>

        <div className="v3-bench-grid">
          <div className="v3-bench-preview">
            <div className="v3-mat">
              <PlushViewer
                className="v3-bench-canvas"
                plush={draft.plush}
                color={draft.color}
                patchColor={draft.patchColor}
                patches={draft.patches}
                bounceOn={`${draft.plush}${draft.patchColor}${JSON.stringify(draft.patches)}`}
                shadowColor="#5a3b22"
              />
              <span className="v3-mat-hint">drag to turn · tap to squeeze</span>
            </div>
            <div className="v3-tag v3-live-tag">
              <span className="v3-tag-hole" />
              <small>To {draft.recipientName || '…'}</small>
              <p>{draft.message || 'Your note goes here'}</p>
              <small>Love, {draft.senderName || '…'}</small>
            </div>
          </div>

          <div className="v3-bench-form">
            <Section n={1} title="Choose a friend">
              <PlushPicker value={draft.plush} onChange={(p) => update({ plush: p })} />
            </Section>
            <Section n={2} title="Pick the fabric">
              <ColorWheel value={draft.color} onChange={(color) => update({ color })} size={180} />
            </Section>
            <Section n={3} title="Sew on patches">
              <PatchEditor draft={draft} update={update} />
            </Section>
            <Section n={4} title="Write the tag">
              <MessageFields draft={draft} update={update} />
            </Section>
            <Section n={5} title="Post it">
              <DeliveryFields draft={draft} update={update} />
            </Section>

            {flow.error && <p className="pg-error">{flow.error}</p>}
            <button type="button" className="v3-btn v3-btn-block" onClick={flow.openCheckout}>
              Wrap my {plush.label.toLowerCase()} · {PRICE.label}
            </button>
          </div>
        </div>
      </section>

      <section className="v3-section v3-faq">
        <h2>FAQ</h2>
        <p className="v3-section-lede">Frequently asked questions</p>
        {[
          [
            'Why a digital plushie instead of a real toy?',
            'Physical gifts can be late, expensive to ship, or lost in the post. A Cuddlepost arrives in seconds: a 3D plushie they can turn and squeeze, with your note (and optional voice) on a private page.',
          ],
          [
            'How long does delivery take?',
            'Usually under a minute after payment. We create the gift page right away and show you the link (and email it when email delivery is on).',
          ],
          [
            'How is the gift sent?',
            'You choose email or a private link with QR code. For email we send it for you; for link & QR you share it yourself (chat, print the QR in a card, etc.).',
          ],
          [
            'Does the recipient need an app?',
            'No. They open the link in any normal phone or computer browser. No account, no download.',
          ],
          [
            'How long does the link last?',
            `The gift page stays open for ${GIFT_TTL_HOURS / 24} days. After that it expires, so share it while it's fresh.`,
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <footer className="v3-footer">
        <span>{BRAND} · made with care</span>
        <span>
          post@cuddlepost.fun · <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
          <Link to="/refund">Refunds</Link>
        </span>
      </footer>

      <CheckoutModal
        draft={draft}
        open={flow.checkoutOpen}
        paying={flow.paying}
        onClose={flow.closeCheckout}
        onPay={flow.pay}
        title="Wrap & post"
      />
    </div>
  )
}

export function Sent() {
  const { gift, url, path, emailedTo, manageToken, loading } = useGiftById('cuddlepost')
  const [copied, setCopied] = useState(false)
  if (loading) return <Opening />
  if (!gift) return <Missing />

  return (
    <div className="pg-theme v3">
      <Nav />
      <main className="v3-sent">
        <div className="v3-label">
          <div className="v3-postmark">
            <span>POSTED</span>
            <small>{postDate(gift.createdAt)}</small>
          </div>
          <span className="v3-hand">it's on its way!</span>
          <h1>Your parcel is ready</h1>
          <dl className="v3-label-rows">
            <dt>To</dt>
            <dd>{gift.recipientName}</dd>
            <dt>From</dt>
            <dd>{gift.senderName}</dd>
            <dt>Contents</dt>
            <dd>
              1 × {PLUSH_TYPES.find((p) => p.id === gift.plush)!.label} plushie, handwritten tag
              {gift.hasVoice ? ', voice note' : ''}
            </dd>
            <dt>Via</dt>
            <dd>{emailedTo ? `Email to ${emailedTo}` : 'Private link & QR'}</dd>
          </dl>
          <div className="v3-label-link">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="v3-btn v3-btn-sm" onClick={async () => setCopied(await copyText(url))}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="v3-hand v3-hand-sm" style={{ marginTop: '0.75rem' }}>
            This link works for {GIFT_TTL_HOURS / 24} days. Share it soon.
          </p>
          <div className="v3-label-qr">
            <QrCode value={url} dark="#3b2f2a" light="#fffaf1" size={130} />
            <p className="v3-hand v3-hand-sm">print me & tuck me into a card</p>
          </div>
          <div className="v3-actions">
            <div className="v3-actions-row">
              <Link to={path} className="v3-btn">
                Peek inside the parcel
              </Link>
              <Link to="/" className="v3-btn v3-btn-ghost">
                Stitch another
              </Link>
            </div>
            {manageToken && (
              <Link
                to={`/manage/${gift.id}?token=${encodeURIComponent(manageToken)}`}
                className="v3-btn v3-btn-sm v3-btn-ghost v3-btn-delete"
              >
                Delete this gift
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export function Gift() {
  return (
    <ErrorBoundary className="pg-theme v3">
      <GiftInner />
    </ErrorBoundary>
  )
}

function GiftInner() {
  const { gift, voiceSrc, loading } = useGiftById('cuddlepost')
  const [stage, setStage] = useState<'closed' | 'opening' | 'open'>(() => (isStandalone() ? 'open' : 'closed'))
  useGiftMeta('cuddlepost', gift)
  useHomeScreenSetup(gift ?? null, cuddlepostKeepsake)
  if (loading) return <Opening />
  if (!gift) return <Missing />
  if (isGiftExpired(gift)) return <Expired />

  const unwrap = () => {
    setStage('opening')
    window.setTimeout(() => setStage('open'), 1100)
  }

  return (
    <div className="pg-theme v3 v3-gift">
      {stage !== 'open' ? (
        <main className="v3-gift-intro">
          <span className="v3-hand">a parcel for</span>
          <h1>{gift.recipientName}</h1>
          <button type="button" className={`v3-box ${stage === 'opening' ? 'is-opening' : ''}`} onClick={unwrap}>
            <span className="v3-box-lid" />
            <span className="v3-box-body" />
            <span className="v3-ribbon-v" />
            <span className="v3-ribbon-h" />
            <span className="v3-bow">🎀</span>
            <span className="v3-box-label">from {gift.senderName}</span>
          </button>
          <p>{stage === 'opening' ? 'Untying the ribbon…' : 'Tap the box to untie the ribbon'}</p>
        </main>
      ) : (
        <ErrorBoundary className="pg-theme v3">
          <GiftOpen gift={gift} voiceSrc={voiceSrc} />
        </ErrorBoundary>
      )}
    </div>
  )
}

function GiftOpen({ gift, voiceSrc }: { gift: Gift; voiceSrc: string | null }) {
  return (
    <main className="v3-gift-open">
      <div className="v3-gift-stage">
        <PlushViewer className="v3-gift-canvas" {...gift} bounceOn="open" shadowColor="#5a3b22" />
        <span className="v3-hand v3-hand-sm">give them a squeeze ↑</span>
      </div>
      <article className="v3-letter">
        <div className="v3-postmark v3-postmark-sm">
          <span>{gift.occasion.toUpperCase()}</span>
          <small>{postDate(gift.createdAt)}</small>
        </div>
        <p className="v3-letter-to">Dear {gift.recipientName},</p>
        <p className="v3-letter-body">{gift.message}</p>
        <p className="v3-letter-from">Love, {gift.senderName}</p>
        {voiceSrc && <VoicePlayer src={voiceSrc} label={`Listen to ${gift.senderName}`} />}
      </article>
      <Keepsake
        className="v3-keep"
        gift={gift}
        theme={cuddlepostKeepsake}
        title="Keep them nearby"
        subtitle={<span className="v3-hand v3-hand-sm">a little reminder, wherever you look ♡</span>}
        btn="v3-btn"
        btnAlt="v3-btn v3-btn-ghost"
      />
      <ReportGiftButton giftId={gift.id} className="v3-btn v3-btn-ghost" />
      <Link to="/" className="v3-btn">
        Post a hug back
      </Link>
    </main>
  )
}

function Opening() {
  return (
    <div className="pg-theme v3 v3-gift">
      <main className="v3-gift-intro">
        <p>Opening…</p>
      </main>
    </div>
  )
}

function Missing() {
  return (
    <div className="pg-theme v3 v3-gift">
      <main className="v3-gift-intro">
        <h1>This parcel went astray.</h1>
        <Link to="/" className="v3-btn">
          Back to the workshop
        </Link>
      </main>
    </div>
  )
}

function Expired() {
  return (
    <div className="pg-theme v3 v3-gift">
      <main className="v3-gift-intro">
        <span className="v3-hand">too late for this post</span>
        <h1>This parcel has expired.</h1>
        <p>Gift links stay open for {GIFT_TTL_HOURS / 24} days, then the page closes.</p>
        <Link to="/" className="v3-btn">
          Stitch a new one
        </Link>
      </main>
    </div>
  )
}
