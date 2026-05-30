// Type augmentation for next-intl v4.
// Updated to use full message types in Task 7 when messages/en.json exists.
declare module 'use-intl' {
  interface AppConfig {
    Messages: Record<string, unknown>
  }
}
