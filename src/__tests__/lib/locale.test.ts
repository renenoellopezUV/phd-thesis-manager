import { isValidLocale, parseAcceptLanguage, DEFAULT_LOCALE } from '@/lib/locale'

describe('isValidLocale', () => {
  it('accepts en', () => expect(isValidLocale('en')).toBe(true))
  it('accepts es', () => expect(isValidLocale('es')).toBe(true))
  it('rejects fr', () => expect(isValidLocale('fr')).toBe(false))
  it('rejects undefined', () => expect(isValidLocale(undefined)).toBe(false))
  it('rejects null', () => expect(isValidLocale(null)).toBe(false))
  it('rejects empty string', () => expect(isValidLocale('')).toBe(false))
})

describe('parseAcceptLanguage', () => {
  it('returns en for en-US header', () =>
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en'))
  it('returns es when es is first', () =>
    expect(parseAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toBe('es'))
  it('returns es for bare es', () =>
    expect(parseAcceptLanguage('es,en-US;q=0.9')).toBe('es'))
  it('returns default for null', () =>
    expect(parseAcceptLanguage(null)).toBe(DEFAULT_LOCALE))
  it('returns default for empty string', () =>
    expect(parseAcceptLanguage('')).toBe(DEFAULT_LOCALE))
  it('returns default for unknown language', () =>
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9')).toBe(DEFAULT_LOCALE))
  it('skips unknown and picks known', () =>
    expect(parseAcceptLanguage('fr;q=0.9,es;q=0.8')).toBe('es'))
})
