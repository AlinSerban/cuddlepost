import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

/**
 * Client-side text check for names/messages before checkout.
 * Not foolproof (bypasses, new slang, non-English). Voice notes need
 * speech-to-text on the server later; for now recipients can Report.
 */
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

export function textLooksClean(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  return !matcher.hasMatch(t)
}

/** Returns a short error if any field fails, else null. */
export function findBlockedText(fields: { label: string; value: string }[]): string | null {
  for (const { label, value } of fields) {
    if (!textLooksClean(value)) {
      return `${label} has words we can’t allow. Please rewrite it to something kinder.`
    }
  }
  return null
}
