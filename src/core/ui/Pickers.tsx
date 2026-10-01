import {
  PATCH_COLORS,
  PATCH_SLOTS,
  PATCH_TYPES,
  PLUSH_TYPES,
  type GiftDraft,
  type PatchSlot,
  type PatchType,
  type PlushType,
} from '../gift'

export function PlushPicker({ value, onChange }: { value: PlushType; onChange: (p: PlushType) => void }) {
  return (
    <div className="pg-plushpicker">
      {PLUSH_TYPES.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`pg-plushpicker-item ${p.id === value ? 'is-active' : ''}`}
          onClick={() => onChange(p.id)}
        >
          <span className="pg-plushpicker-emoji">{p.emoji}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  )
}

export function PatchEditor({
  draft,
  update,
}: {
  draft: GiftDraft
  update: (patch: Partial<GiftDraft>) => void
}) {
  const setSlot = (slot: PatchSlot, type: PatchType | undefined) => {
    const next = { ...draft.patches }
    if (type) next[slot] = type
    else delete next[slot]
    update({ patches: next })
  }

  return (
    <div className="pg-patches">
      {PATCH_SLOTS.map((slot) => (
        <div key={slot.id} className="pg-patches-row">
          <span className="pg-patches-label">{slot.label}</span>
          <div className="pg-patches-options">
            <button
              type="button"
              className={`pg-chip ${!draft.patches[slot.id] ? 'is-active' : ''}`}
              onClick={() => setSlot(slot.id, undefined)}
            >
              None
            </button>
            {PATCH_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.label}
                className={`pg-chip ${draft.patches[slot.id] === t.id ? 'is-active' : ''}`}
                onClick={() => setSlot(slot.id, t.id)}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="pg-patches-row">
        <span className="pg-patches-label">Patch color</span>
        <div className="pg-patches-options">
          {PATCH_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`pg-swatch pg-swatch-sm ${c === draft.patchColor ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => update({ patchColor: c })}
              aria-label={`Patch color ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

