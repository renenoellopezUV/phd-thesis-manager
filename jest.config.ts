// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // ts-jest does not support moduleResolution: bundler — override for tests only
        moduleResolution: 'node',
        module: 'commonjs',
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
