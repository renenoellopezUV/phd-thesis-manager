// Type augmentation for next-intl v4.
// Uses real message types derived from the English translation file.
import en from '../messages/en.json'

type Messages = typeof en

declare module 'use-intl' {
  interface AppConfig {
    Messages: Messages
  }
}
