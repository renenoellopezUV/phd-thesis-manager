## ADDED Requirements

### Requirement: Profiles table schema
The system SHALL maintain a `profiles` table in Supabase Postgres with columns: `id` (uuid, PK, references `auth.users.id`), `name` (text), `email` (text), `advisor_email` (text, nullable), `department` (text, nullable), `program` (text, nullable), `start_date` (date, nullable), `expected_graduation` (date, nullable), `stage` (text, default `'coursework'`), `created_at` (timestamptz).

#### Scenario: Profile row exists after signup
- **WHEN** a new user completes signup via Supabase Auth
- **THEN** a corresponding row SHALL exist in `profiles` with `id = auth.uid()` and `email` matching the signup email

### Requirement: Milestones table schema
The system SHALL maintain a `milestones` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `profile_id` (uuid, FK → `profiles.id` on delete cascade), `title` (text), `description` (text, default `''`), `type` (text), `due_date` (date), `completed` (boolean, default false), `completed_date` (date, nullable), `created_at` (timestamptz).

#### Scenario: Milestone belongs to a profile
- **WHEN** a milestone is inserted for a student
- **THEN** its `profile_id` SHALL reference a valid `profiles.id` and deletion of the profile SHALL cascade to delete the milestone

### Requirement: Row Level Security — student owns their data
The system SHALL enforce RLS policies so that authenticated students can only SELECT, INSERT, UPDATE, and DELETE their own `profiles` row and their own `milestones` rows (where `profile_id = auth.uid()`).

#### Scenario: Student cannot read another student's milestones
- **WHEN** a student with ID `"a"` queries `milestones`
- **THEN** the result SHALL contain only rows where `profile_id = "a"`, even if other students have milestones in the table

### Requirement: Row Level Security — advisor read access
The system SHALL enforce an RLS policy allowing advisors to SELECT `profiles` rows where `advisor_email = auth.email()` and to SELECT `milestones` rows belonging to those students.

#### Scenario: Advisor reads their students' profiles
- **WHEN** an advisor with email `"dr.chen@uni.edu"` queries `profiles`
- **THEN** the result SHALL include all profiles where `advisor_email = 'dr.chen@uni.edu'`

### Requirement: Row Level Security — admin full read access
The system SHALL enforce an RLS policy allowing users with `app_metadata.role = 'admin'` to SELECT all rows in `profiles`.

#### Scenario: Admin reads all profiles
- **WHEN** an admin user queries `profiles`
- **THEN** all rows SHALL be returned regardless of `advisor_email`

### Requirement: Auto-create profile on signup trigger
The system SHALL install a Postgres trigger `handle_new_user` on `auth.users` that fires `AFTER INSERT` and: (1) creates a `profiles` row with `id = new.id` and `email = new.email`, and (2) copies `new.raw_user_meta_data->>'role'` into `new.raw_app_meta_data` so the role is stored in admin-controlled metadata.

#### Scenario: Profile created automatically
- **WHEN** a new user signs up via Supabase Auth
- **THEN** a `profiles` row SHALL exist within the same transaction, with no separate API call required

### Requirement: Server Actions for milestone CRUD
The system SHALL implement Server Actions in `src/app/actions/milestones.ts` for: `addMilestone`, `toggleMilestone`, `deleteMilestone`. Each action SHALL call `revalidatePath('/milestones')` and `revalidatePath('/')` after a successful DB write.

#### Scenario: Add milestone persists across page reload
- **WHEN** a user submits the add-milestone form and `addMilestone` succeeds
- **THEN** reloading `/milestones` SHALL show the new milestone fetched from the DB

#### Scenario: Toggle milestone updates DB
- **WHEN** `toggleMilestone` is called with a milestone ID
- **THEN** the `completed` and `completed_date` columns SHALL be updated in Postgres

### Requirement: Server Actions for profile update
The system SHALL implement a `updateProfile` Server Action in `src/app/actions/profile.ts` that updates the authenticated user's `profiles` row and calls `revalidatePath('/')`.

#### Scenario: Profile update persists
- **WHEN** a student updates their department via the profile form and `updateProfile` succeeds
- **THEN** reloading the dashboard SHALL show the updated department value fetched from DB
