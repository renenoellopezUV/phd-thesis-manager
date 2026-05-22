## ADDED Requirements

### Requirement: Admin user list page
The system SHALL render a page at `/admin/users` accessible only to users with role `'admin'`. The page SHALL display all registered users fetched via the Supabase Admin API (`supabase.auth.admin.listUsers()`), showing each user's email, role, and email-verification status.

#### Scenario: Admin sees all users
- **WHEN** an admin navigates to `/admin/users`
- **THEN** a list of all registered users SHALL be displayed

#### Scenario: Non-admin is blocked from admin route
- **WHEN** a user with role `'student'` or `'advisor'` attempts to access `/admin/users`
- **THEN** the middleware SHALL redirect them to `/`

### Requirement: Admin can change a user's role
The system SHALL provide a role-selector control next to each user in the admin panel. Selecting a new role SHALL call a Server Action (`changeUserRole`) that uses the Supabase Admin API (`supabase.auth.admin.updateUserById`) with `app_metadata: { role }` to update the role. The action SHALL use `SUPABASE_SERVICE_ROLE_KEY` (server-only).

#### Scenario: Admin changes a student to advisor
- **WHEN** an admin selects "Advisor" from a student user's role selector and confirms
- **THEN** `changeUserRole` SHALL update `app_metadata.role` to `'advisor'` via the Admin API and the page SHALL reflect the change

#### Scenario: Service role key never exposed to client
- **WHEN** the admin panel renders in the browser
- **THEN** `SUPABASE_SERVICE_ROLE_KEY` SHALL NOT appear in any client-side JavaScript bundle or network response
