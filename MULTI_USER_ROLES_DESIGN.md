# Multi-User Role System Design

## Overview

Transform the single-user app into a team-based platform where an **Owner** can invite multiple users with specific roles, each seeing only what's relevant to their job.

---

## User Roles

### 1. **Owner** (Account Holder)
The person who created the account and pays for the subscription.

**Full Access To:**
- Everything in the app
- Executive Dashboard & Analytics
- All projects across all locations
- All financial data (revenue, AR, invoices)
- User management (invite/remove team members)
- Billing & subscription management
- Company settings
- Locations & Technicians setup
- Business goals

**Unique Capabilities:**
- Invite/remove users
- Assign roles to users
- Transfer ownership
- Delete account

---

### 2. **Office Manager / Admin**
Runs the day-to-day operations, handles scheduling, invoicing, and client communication.

**Full Access To:**
- All projects (all locations)
- All clients
- Calendar & scheduling
- Quotes & invoicing
- Analytics (basic + goals)
- Location data (view only)
- Technician assignments

**Limited/No Access To:**
- ❌ User management (can't invite/remove people)
- ❌ Billing & subscription
- ❌ Executive Dashboard (company-wide financials)
- ❌ Delete projects permanently

**Why:** They need to manage operations but shouldn't see owner-level financials or change billing.

---

### 3. **Salesperson / Estimator**
Creates quotes, meets with clients, closes deals.

**Full Access To:**
- Projects they created OR are assigned to
- Clients they're assigned to
- Create new projects & quotes
- Quote builder (line items, pricing)
- Client contact info
- Their own calendar/schedule
- Basic pipeline view (their projects only)

**Limited/No Access To:**
- ❌ Other salespeople's projects
- ❌ Invoicing (can see if paid, can't create/edit)
- ❌ Technician management
- ❌ Company-wide analytics
- ❌ Financial reports
- ❌ Settings (except personal profile)

**Why:** They focus on closing deals, not operations or finances.

---

### 4. **Technician / Installer**
Does the actual installation work in the field.

**Full Access To:**
- Projects assigned to them (view only)
- Their daily schedule
- Job details (address, client contact, scope of work)
- Mark jobs as complete
- Add completion notes & photos
- View BOM for assigned jobs

**Limited/No Access To:**
- ❌ Pricing (can't see quote totals)
- ❌ Client financial info
- ❌ Other technicians' schedules
- ❌ Create/edit projects
- ❌ Create/edit quotes
- ❌ Analytics
- ❌ Invoicing
- ❌ Settings

**Why:** They need job details to do the work, nothing more.

---

### 5. **Lead Technician / Foreman**
Senior technician who leads a crew.

**Same as Technician, PLUS:**
- See all technicians at their location
- Assign jobs to technicians under them
- View location-level analytics (jobs completed, efficiency)
- Manage crew schedules

**Why:** They coordinate the team but don't need financial data.

---

## Database Changes

### New Tables

```sql
-- Team/Organization table (replaces single-user model)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members with roles
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'salesperson', 'technician', 'lead_technician')),
    location_id UUID REFERENCES locations(id), -- NULL = all locations
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Invitations for users who don't have accounts yet
CREATE TABLE organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'salesperson', 'technician', 'lead_technician')),
    location_id UUID REFERENCES locations(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project assignments (who can see/edit which projects)
CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'salesperson', 'technician')),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Client assignments (salesperson ownership)
CREATE TABLE client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);
```

### Modify Existing Tables

```sql
-- Add organization_id to all major tables
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN assigned_technician_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN assigned_salesperson_id UUID REFERENCES users(id);
ALTER TABLE clients ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE clients ADD COLUMN assigned_salesperson_id UUID REFERENCES users(id);
ALTER TABLE locations ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE technicians ADD COLUMN user_id UUID REFERENCES users(id); -- Link to actual user account
ALTER TABLE calendar_events ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE calendar_events ADD COLUMN assigned_to UUID REFERENCES users(id);
```

---

## UI Changes Per Role

### Navigation/Sidebar Visibility

| Feature | Owner | Admin | Salesperson | Lead Tech | Technician |
|---------|-------|-------|-------------|-----------|------------|
| Create Project | ✅ | ✅ | ✅ | ❌ | ❌ |
| All Projects | ✅ | ✅ | ❌ (own only) | ❌ | ❌ |
| Pipeline View | ✅ | ✅ | ✅ (filtered) | ❌ | ❌ |
| Clients Tab | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ |
| Calendar | ✅ | ✅ | ✅ (own) | ✅ (crew) | ✅ (own) |
| Analytics Tab | ✅ | ✅ | ❌ | ❌ | ❌ |
| Executive Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invoicing | ✅ | ✅ | 👁️ (view only) | ❌ | ❌ |
| Settings | ✅ | ⚠️ (limited) | ⚠️ (profile only) | ⚠️ (profile only) | ⚠️ (profile only) |
| Team Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Locations Setup | ✅ | 👁️ (view) | ❌ | ❌ | ❌ |
| Technicians Setup | ✅ | ✅ | ❌ | 👁️ (view) | ❌ |

### Role-Specific Views

#### Technician Mobile View
Simplified dashboard showing:
```
┌─────────────────────────┐
│ Today's Jobs (3)        │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 9:00 AM - Smith     │ │
│ │ 123 Oak St          │ │
│ │ [Navigate] [Details]│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 1:00 PM - Johnson   │ │
│ │ 456 Pine Ave        │ │
│ │ [Navigate] [Details]│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 4:00 PM - Williams  │ │
│ │ 789 Maple Dr        │ │
│ │ [Navigate] [Details]│ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ [Mark Current Complete] │
└─────────────────────────┘
```

#### Salesperson View
Pipeline focused on their deals:
```
┌─────────────────────────────────────────────┐
│ My Pipeline                    $125K total  │
├─────────────────────────────────────────────┤
│ Draft (3)  Quoted (5)  Approved (2)  Done   │
│ $15K       $85K        $25K          $42K   │
├─────────────────────────────────────────────┤
│ Quoted - Waiting for Response               │
│ ┌─────────────────────────────────────────┐ │
│ │ Johnson Residence        $12,500       │ │
│ │ Quoted 3 days ago        [Follow Up]   │ │
│ └─────────────────────────────────────────┘ │
│ ...                                         │
└─────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Database + Auth)
1. Create `organizations` and `organization_members` tables
2. Migrate existing users to be "owners" of their own org
3. Add `organization_id` to all relevant tables
4. Update RLS policies for organization-scoped access
5. Create `useOrganization` hook
6. Create `useCurrentUserRole` hook

### Phase 2: Role-Based UI Filtering
1. Create `RoleGate` component for conditional rendering
2. Update Sidebar to show/hide based on role
3. Update Settings to show/hide sections by role
4. Add role indicator in header/profile

### Phase 3: Team Management (Owner)
1. Create Team Settings section
2. Build invite flow (email invitation)
3. Create accept invite page
4. Build team member list with role management
5. Add remove/deactivate member functionality

### Phase 4: Assignment System
1. Add "Assign Salesperson" to projects/clients
2. Add "Assign Technician" to scheduled projects
3. Create assignment hooks and APIs
4. Filter views based on assignments

### Phase 5: Role-Specific Views
1. Build Technician mobile dashboard
2. Optimize Salesperson pipeline view
3. Add Lead Technician crew management
4. Create Admin operations view

### Phase 6: Notifications & Activity
1. Notify assigned users of new assignments
2. Notify salesperson when their quote is approved
3. Notify technician of schedule changes
4. Activity log for owner visibility

---

## API Endpoints Needed

```
POST   /api/organization/create           # Create org (new signup)
GET    /api/organization                  # Get current org details
PATCH  /api/organization                  # Update org details

POST   /api/team/invite                   # Send invitation
GET    /api/team/invites                  # List pending invites
DELETE /api/team/invites/:id              # Cancel invite
POST   /api/team/accept-invite            # Accept invitation
GET    /api/team/members                  # List team members
PATCH  /api/team/members/:id              # Update member role
DELETE /api/team/members/:id              # Remove member

POST   /api/projects/:id/assign           # Assign user to project
DELETE /api/projects/:id/assign/:userId   # Remove assignment
GET    /api/projects/assigned             # Get my assigned projects

POST   /api/clients/:id/assign            # Assign salesperson to client
GET    /api/clients/assigned              # Get my assigned clients
```

---

## Security Considerations

1. **RLS Policies must check:**
   - Organization membership
   - Role-based permissions
   - Assignment-based access (for salespeople/techs)

2. **API endpoints must validate:**
   - User belongs to organization
   - User has required role for action
   - User has access to specific resource

3. **Sensitive data protection:**
   - Technicians can't see pricing/totals
   - Salespeople can't see other reps' pipelines
   - Only owner sees full financial picture

4. **Invitation security:**
   - Token-based invites with expiration
   - Email verification
   - Rate limiting on invite sends

---

## Migration Strategy

For existing users:
1. Create organization record for each existing user
2. Set existing user as "owner" of their org
3. Move all their data under that organization
4. Existing functionality unchanged (they're still owner)

This ensures backward compatibility while enabling team features.

---

## Files to Create/Modify

### New Files
- `hooks/useOrganization.ts` - Org context
- `hooks/useCurrentUserRole.ts` - Role helper
- `hooks/useTeamMembers.ts` - Team CRUD
- `hooks/useAssignments.ts` - Assignment management
- `components/RoleGate.tsx` - Conditional rendering
- `components/settings/TeamSection.tsx` - Team management UI
- `components/TechnicianDashboard.tsx` - Tech-specific view
- `api/organization/*.ts` - Org endpoints
- `api/team/*.ts` - Team endpoints

### Modify
- `App.tsx` - Role-based routing
- `components/Sidebar.tsx` - Role-based nav
- `components/settings/*.tsx` - Role-based sections
- `hooks/useProjects.ts` - Add assignment filtering
- `hooks/useClients.ts` - Add assignment filtering
- All API endpoints - Add organization scoping

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Foundation | 3-4 days | None |
| Phase 2: UI Filtering | 2-3 days | Phase 1 |
| Phase 3: Team Management | 3-4 days | Phase 1 |
| Phase 4: Assignments | 2-3 days | Phase 1, 3 |
| Phase 5: Role Views | 3-4 days | Phase 1, 2 |
| Phase 6: Notifications | 2-3 days | Phase 4 |

**Total: 15-21 days of development**

---

## Questions to Resolve

1. **Pricing model:** Does adding team members cost extra? Per-seat pricing?
2. **Role limits:** Can you have unlimited salespeople? Limited techs?
3. **Cross-location:** Can a salesperson work across multiple locations?
4. **Data ownership:** When a salesperson leaves, who owns their clients?
5. **Audit trail:** Do we need to log who did what and when?
