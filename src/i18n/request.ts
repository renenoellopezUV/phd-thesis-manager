import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { isValidLocale, DEFAULT_LOCALE } from '@/lib/locale'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  const raw = isValidLocale(cookieLocale) ? cookieLocale : requested
  const locale = isValidLocale(raw) ? raw : DEFAULT_LOCALE
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
