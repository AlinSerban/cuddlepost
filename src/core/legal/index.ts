import { BRANDS, type BrandId } from '../brand'
import { GIFT_TTL_HOURS } from '../gift'

export type LegalPageId = 'terms' | 'privacy' | 'refund'

export interface LegalPage {
  id: LegalPageId
  title: string
  /** Plain sections — draft copy for review, not legal advice. */
  sections: { heading: string; paragraphs: string[] }[]
}

export function legalPages(brandId: BrandId): LegalPage[] {
  const b = BRANDS[brandId]
  const name = b.name
  const email = b.supportEmail

  return [
    {
      id: 'terms',
      title: 'Terms of Service',
      sections: [
        {
          heading: 'What this is',
          paragraphs: [
            `${name} sells a digital keepsake: a personalized 3D plushie page with your message (and optional voice note), delivered by private link and/or email.`,
            `Contact: ${email}.`,
          ],
        },
        {
          heading: 'Digital product · no withdrawal after delivery',
          paragraphs: [
            'This is digital content delivered immediately after payment. By checking the box at checkout you request immediate delivery and acknowledge that you lose the usual 14-day right of withdrawal once the gift is created and the link is available.',
            'If the gift never loads because of a fault on our side, contact us for a fix or refund.',
          ],
        },
        {
          heading: 'Your content',
          paragraphs: [
            'You are responsible for names, messages and voice notes you upload. Do not send hate speech, racial or other slurs, illegal, abusive, harassing or copyrighted material you do not have rights to. We may block messages that look like they break these rules.',
            'We may remove gifts that violate these terms or that are reported by recipients. Voice notes are not automatically screened; report abuse from the gift page.',
          ],
        },
        {
          heading: 'Availability',
          paragraphs: [
            'We aim to keep gift pages online, but we do not guarantee perpetual hosting. We may delete inactive or reported gifts, or shut down the service with reasonable notice when possible.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            `${name} is provided as-is. To the extent allowed by law we are not liable for indirect damages, lost messages, or third-party messaging apps failing to show a link preview.`,
          ],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'What we collect',
          paragraphs: [
            `To deliver a ${name} we process: sender and recipient names, message text, optional voice audio, optional emails, gift design choices, payment details needed for your order, and basic technical logs needed to run the site and prevent abuse.`,
            'We also use analytics to understand how the site is used (pages visited, button clicks, errors). Analytics does not include your gift message text.',
          ],
        },
        {
          heading: 'Why we process it',
          paragraphs: [
            'To create and show the gift, send receipts and delivery emails, handle refunds and abuse reports, keep the service secure, and improve the product.',
          ],
        },
        {
          heading: 'Who sees it',
          paragraphs: [
            'Anyone with the private gift link can open the gift page. Do not share the link publicly if the message is sensitive.',
          ],
        },
        {
          heading: 'How long we keep it',
          paragraphs: [
            `Gifts and voice files stay available for ${GIFT_TTL_HOURS / 24} days after purchase (the public link then expires). Deleted or reported gifts are removed sooner. Payment records are kept as required by law.`,
          ],
        },
        {
          heading: 'Your rights (EU / GDPR)',
          paragraphs: [
            `You can request access, correction, deletion or a copy of your personal data, and object to certain processing. Email ${email}. You may also lodge a complaint with your local supervisory authority.`,
            'Senders can delete a gift using the manage link in their receipt email or the manage controls shown after purchase.',
          ],
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'We aim to run without non-essential cookies. Essential browser storage may be used to keep your draft or complete checkout.',
          ],
        },
      ],
    },
    {
      id: 'refund',
      title: 'Refund Policy',
      sections: [
        {
          heading: 'When we refund',
          paragraphs: [
            `Because ${name} is custom digital content delivered immediately, refunds are not automatic after the gift link is created.`,
            'We will refund or replace when: payment was charged but the gift was never created; the gift page is broken due to our error; or a duplicate charge occurred.',
          ],
        },
        {
          heading: 'How to ask',
          paragraphs: [
            `Email ${email} within 14 days of purchase with your order/payment id and gift link.`,
          ],
        },
        {
          heading: 'Abuse and reports',
          paragraphs: [
            'If a gift is removed after a valid abuse report, we may refuse a refund to the sender depending on the content. Recipients can use Report on the gift page.',
          ],
        },
      ],
    },
  ]
}

export function legalPath(id: LegalPageId) {
  return `/${id}`
}
