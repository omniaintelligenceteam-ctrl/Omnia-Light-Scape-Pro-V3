# Refactor Plan: Breaking Up App.tsx

## Current State
- `App.tsx`: **11,000 lines** (god component)
- 4 main tabs managed via `activeTab` state: `editor`, `projects`, `schedule`, `settings`
- 60+ props passed to SettingsView alone
- No URL-based routing for main navigation

## Goals
1. Split App.tsx into manageable, focused components
2. Add URL-based routing (React Router)
3. Reduce prop drilling with Context API
4. Make codebase maintainable and testable

---

## Phase 1: Create Shared Contexts (Foundation)

Before extracting pages, we need contexts to avoid prop drilling hell.

### 1.1 AppSettingsContext
Holds: `colorTemp`, `lightIntensity`, `darknessLevel`, `beamAngle`, `theme`, `accentColor`, `fontSize`, etc.

```typescript
// contexts/AppSettingsContext.tsx
interface AppSettings {
  colorTemp: string;
  lightIntensity: number;
  darknessLevel: number;
  beamAngle: number;
  theme: string;
  accentColor: string;
  fontSize: string;
  highContrast: boolean;
  enableBeforeAfter: boolean;
  notifications: NotificationPreferences;
}
```

### 1.2 CompanyContext
Holds: `companyProfile`, `pricing`, `customPricing`, `fixtureCatalog`

### 1.3 SubscriptionContext
Already have `useSubscription()` hook - good to go.

### 1.4 AnalyticsContext
Holds: All analytics data, date ranges, comparison states

---

## Phase 2: Extract Page Components

### 2.1 EditorPage (~2,600 lines → ~800 after context)
Location: `pages/EditorPage.tsx`

Handles:
- Image upload
- Fixture selection
- AI generation pipeline
- Before/After view
- Generation history

### 2.2 ProjectsPage (~2,300 lines → ~600 after context)
Location: `pages/ProjectsPage.tsx`

Handles:
- Project list/grid
- Project detail modals
- Quote generation
- Client management
- Kanban pipeline view

### 2.3 SchedulePage (~90 lines - already small)
Location: `pages/SchedulePage.tsx`

Already using `ScheduleView` component - just wrap with context consumers.

### 2.4 SettingsPage (~120 lines)
Location: `pages/SettingsPage.tsx`

Already using `SettingsView` component - just wrap with context consumers.

---

## Phase 3: Add React Router

### 3.1 Install
```bash
npm install react-router-dom
```

### 3.2 Route Structure
```
/              → EditorPage (default)
/projects      → ProjectsPage
/projects/:id  → ProjectDetailPage
/schedule      → SchedulePage
/settings      → SettingsPage
/portal        → ClientPortal (existing)
/invite/:token → AcceptInvite (existing)
```

### 3.3 Update Sidebar
Change from `onTabChange` callback to `<Link>` components.

---

## Phase 4: Clean Up

### 4.1 Delete Dead Code
- Remove commented imports in App.tsx
- Remove unused state variables
- Clean up console.logs

### 4.2 Type Consolidation
- Move shared types to `types/` directory
- Create barrel exports

### 4.3 Hook Extraction
Move inline logic from App.tsx to custom hooks:
- `useFixtureSelection()`
- `useImageGeneration()`
- `useProjectManagement()`

---

## Execution Order

| Step | Task | Est. Time | Risk |
|------|------|-----------|------|
| 1 | Create AppSettingsContext | 30 min | Low |
| 2 | Create CompanyContext | 30 min | Low |
| 3 | Extract SettingsPage (smallest) | 1 hr | Low |
| 4 | Extract SchedulePage | 30 min | Low |
| 5 | Install React Router, update Sidebar | 1 hr | Medium |
| 6 | Extract ProjectsPage | 2 hr | Medium |
| 7 | Extract EditorPage | 3 hr | High |
| 8 | Clean up App.tsx shell | 1 hr | Low |
| 9 | Testing & bug fixes | 2 hr | - |

**Total estimate: ~12 hours of work**

---

## File Structure After Refactor

```
src/
├── App.tsx              # ~200 lines (router + layout shell)
├── contexts/
│   ├── AppSettingsContext.tsx
│   ├── CompanyContext.tsx
│   └── AnalyticsContext.tsx
├── pages/
│   ├── EditorPage.tsx
│   ├── ProjectsPage.tsx
│   ├── SchedulePage.tsx
│   └── SettingsPage.tsx
├── components/          # (existing - unchanged)
├── hooks/              # (existing - unchanged)
├── services/           # (existing - unchanged)
└── routes/
    └── index.tsx       # Route definitions
```

---

## Quick Win Option (30 min)

If you want something working TODAY without the full refactor:

1. Extract just the Editor state into a `useEditor()` hook
2. This removes ~500 lines from App.tsx
3. No breaking changes, just cleaner organization

Let me know which approach you want:
- **Full refactor** (12 hours, proper architecture)
- **Quick win** (30 min, incremental improvement)
