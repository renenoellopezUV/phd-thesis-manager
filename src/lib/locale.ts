export type Locale = 'en' | 'es'
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'

export function isValidLocale(value: string | undefined | null): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? '')
}

export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  for (const seg of header.split(',')) {
    const lang = seg.split(';')[0].trim().toLowerCase()
    if (lang.startsWith('es')) return 'es'
    if (lang.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}
