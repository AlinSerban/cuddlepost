export type BrandId = 'cuddlepost'

export interface BrandConfig {
  id: BrandId
  name: string
  supportEmail: string
  tagline: string
}

export const BRANDS: Record<BrandId, BrandConfig> = {
  cuddlepost: {
    id: 'cuddlepost',
    name: 'Cuddlepost',
    supportEmail: 'post@cuddlepost.com',
    tagline: 'A little hug, posted in seconds',
  },
}
