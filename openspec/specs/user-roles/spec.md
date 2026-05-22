## ADDED Requirements

### Requirement: Role type definition
The system SHALL define a `UserRole` TypeScript type as `'student' | 'advisor' | 'admin'` in `src/types/index.ts`. A `ROLE_LABELS` map SHALL provide human-readable labels for each role.

#### Scenario: Role type is importable
- **WHEN** any module imports `UserRole` from `src/types/index.ts`
- **THEN** TypeScript SHALL resolve the type without errors

### Requirement: Role stored in user metadata at signup
The system SHALL store the user's selected role in `user_metadata.role` during the Supabase `signUp()` call by passing `{ data: { role } }`.

#### Scenario: Role is readable after signup
- **WHEN** a user signs up with role `'advisor'`
- **THEN** `supabase.auth.getUser()` SHALL return a user where `user.user_metadata.role === 'advisor'`

### Requirement: Role accessible from session
The system SHALL expose a typed helper `getUserRole(user: User): UserRole` that reads `user.user_metadata.role` and returns it as a `UserRole`, defaulting to `'student'` if the value is missing or unrecognised.

#### Scenario: Missing role defaults to student
- **WHEN** `user.user_metadata.role` is `undefined`
- **THEN** `getUserRole(user)` SHALL return `'student'`

#### Scenario: Known role passes through
- **WHEN** `user.user_metadata.role` is `'admin'`
- **THEN** `getUserRole(user)` SHALL return `'admin'`

### Requirement: Role displayed in nav
The system SHALL display the authenticated user's email and role label in the navigation bar when the user is signed in.

#### Scenario: Role label visible after login
- **WHEN** an authenticated user with role `'advisor'` views any page
- **THEN** the nav SHALL display "Advisor" (or equivalent label) alongside the user's email
