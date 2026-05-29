import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { isValidLocale, DEFAULT_LOCALE } from '@/lib/locale'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale = isValidLocale(raw) ? raw : DEFAULT_LOCALE
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
