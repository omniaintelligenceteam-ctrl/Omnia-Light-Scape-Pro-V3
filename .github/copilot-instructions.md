# Omnia Light Scape PRO - AI Coding Agent Instructions

## Architecture Overview

**Omnia Light Scape PRO** is a React + TypeScript full-stack application for outdoor landscape lighting design and quoting. It uses the Gemini API for AI-powered image generation and scene analysis.

### Core Architecture
- **Frontend**: React 18 + Vite (TypeScript)
- **Backend**: Express.js server (server.js) running on port 3001
- **AI Service**: Google Gemini 3.0 Pro for image generation; Gemini 2.5 Flash for analysis/chat
- **Dev Setup**: `npm run dev` runs both client (Vite) and server concurrently

### Key Data Flow
1. User uploads image → Vite frontend (index.tsx → App.tsx)
2. User provides "Architect Notes" (design prompts)
3. Frontend sends to Express backend (`/api/generate`)
4. Backend calls Gemini API with parsed settings + prompt
5. Generated image returned → shown in lightbox/fullscreen
6. Design saved as `SavedProject` (localStorage or Supabase)
7. Quote auto-generated from fixture counts in `Quotes.tsx`

## Critical Files & Patterns

### State Management (App.tsx)
- **No Redux/Context**: State is lifted to App.tsx and passed via props
- **Key State Objects**:
  - `selectedFixtures`: Array of fixture types ("up", "path", "gutter")
  - `pricing`: `FixturePricing[]` from `DEFAULT_PRICING` (constants.ts)
  - `generatedImage`: Base64 string from Gemini
  - `colorTemp`: Kelvin setting (2700k, 3000k, etc.) with embedded prompt
- **Pattern**: Settings state (colorTemp, lightIntensity, beamAngle) → passed to geminiService → embedded in AI prompt

### Component Structure
- **Sidebar.tsx**: Fixture selection + light settings sliders
- **LightPlacementCanvas.tsx**: Interactive canvas for manual light placement (uses @ts-nocheck)
- **ProjectGallery.tsx**: Save/load projects from storage
- **Quotes.tsx**: Auto-calculates pricing based on `parsePromptForQuantities()` (App.tsx line ~17)
- **Auth.tsx**: Clerk authentication integration
- **Chatbot.tsx**: Chat interface with context-aware system instruction (references currentView)

### Gemini Service Integration (geminiService.ts)

**Critical Design Patterns**:
- **Model Names**: 
  - `gemini-3-pro-image-preview` for image generation (Veo alternative)
  - `gemini-2.5-flash` for analysis & chat
- **API Key Management**: 
  - Loaded from `process.env.API_KEY` (server-side)
  - Client also checks `window.aistudio.hasSelectedApiKey()` for AI Studio mode
  - Backend (server.js) hardcodes API key—**DO NOT commit credentials**
- **Fixture Detection**: `detectFixtureLocations()` analyzes image to locate placement points
- **Prompt Injection**: `chatWithAssistant()` has embedded system instruction with:
  - App feature descriptions (Mockups, Projects, Quotes, Settings tabs)
  - **Fixture Rules** (ground-mounted up lights only; NO soffit/floodlights)
  - Current view context for contextual responses

### Configuration & Constants (constants.ts, types.ts)

**Fixture Types** (FixtureType):
- `"up"` (ground/wall-mounted uplights) - primary fixture
- `"path"` (pathway lights)
- `"gutter"` (roofline/fascia mounted)
- `"transformer"`, `"custom"` (currently unused but extensible)

**Color Temperatures** (COLOR_TEMPERATURES):
- Each has embedded `prompt` field—included in Gemini call
- Special themes: "christmas", "halloween" with specific color instructions
- Pattern: `colorTemp` ID maps to prompt injection via `getColorPrompt()`

**Pricing**:
- `DEFAULT_PRICING` array with `FixturePricing` objects
- Quote generation parses prompt regex patterns (e.g., "3x up lights") to count fixtures
- **Pattern**: Manual counts via `parsePromptForQuantities()` (App.tsx ~17)

## Developer Workflows

### Local Development
```bash
npm install
# Set GEMINI_API_KEY in .env.local (for Vite) or server.js (backend)
npm run dev          # Concurrent: Vite + Node server
npm run dev:client   # Vite only (port 5173)
npm run dev:server   # Express only (port 3001)
```

### Building & Deployment
```bash
npm run build        # Vite production build → dist/
npm run preview      # Preview production build locally
npm start            # Run Express server (for production)
```

### Vite Configuration
- Proxy `/api` calls to `http://localhost:3001` (see vite.config.ts)
- `process.env` is manually defined as empty object—use `import.meta.env` instead in client code

## Project-Specific Conventions

### Error Handling
- Gemini service returns fallback text on error (never throws to UI)
- API key missing → status 500 from server.js
- User-facing errors display in `error` state with optional AlertCircle icon

### UI Pattern: Tabs
- App.tsx uses `activeTab` state: 'editor', 'projects', 'quotes', 'settings'
- Each tab conditionally renders a full component
- Sidebar visible only on 'editor' tab

### Image Processing
- Base64 encoding for transmission: `fileToBase64()` (utils)
- Preview URLs via `getPreviewUrl()` for immediate display
- Fabric.js library imported but minimal usage (canvas manipulation)

### Authentication (Clerk)
- `<SignedIn>` / `<SignedOut>` components wrap UI sections
- Sign-out button calls `useClerk().signOut()`
- No database queries—metadata stored in projects (localStorage initially)

### Prompt Composability
All AI prompts are built by combining:
1. **Base system instruction** (system design expertise)
2. **Color temperature prompt** from constants
3. **User architect notes** (custom instructions)
4. **Settings embedded** (intensity, dark sky mode, etc.)
- This pattern allows incremental prompt refinement without code changes

## Integration Points & Dependencies

### External APIs
- **Gemini API** (Google AI): Rate-limited, requires API key rotation for production
- **PayPal** (Paywall.tsx): Subscription billing stubs exist but not fully implemented
- **Supabase** (supabaseClient.ts): Imported but primary storage is localStorage

### Third-Party Libraries
- `@google/genai`: Gemini client SDK
- `fabric.js`: Canvas manipulation (LightPlacementCanvas)
- `lucide-react`: Icon library (widespread usage)
- `@paypal/react-paypal-js`: PayPal integration (conditional rendering)
- `@clerk/clerk-react`: Auth management

### Communication Pattern
- Frontend → Backend: POST `/api/generate` with image base64 + settings payload
- Backend → Gemini: Multimodal request (image + text prompt)
- Response: Base64-encoded PNG image

## Common Pitfalls & Guidelines

1. **API Key Exposure**: Server.js hardcodes key—use environment variables in production
2. **Prompt Injection**: Always sanitize user input in architect notes before Gemini call
3. **Fixture Rules Enforcement**: System prompt explicitly forbids soffit/floodlights—maintain this constraint
4. **Local Storage Limits**: Projects array may hit storage quota on large images—consider pagination
5. **Canvas Coordinates**: LightPlacementCanvas uses percentage-based positions (0-100) not pixel coordinates
6. **State Mutations**: All state updates are immutable spread operations—avoid direct mutations

## Navigation & Tab Hierarchy

```
App (main container)
├── Header (logo, user menu)
├── Sidebar (settings) — visible only when activeTab === 'editor'
├── [Tab Content]
│   ├── editor: LightPlacementCanvas + ImageUpload
│   ├── projects: ProjectGallery
│   ├── quotes: Quotes + quote calculator
│   └── settings: SettingsPage (company profile, logo)
└── Chatbot (floating, always visible)
```

## Quick Reference: Key Exports

| File | Key Exports |
|------|-------------|
| `geminiService.ts` | `chatWithAssistant()`, `detectFixtureLocations()`, `checkApiKey()` |
| `constants.ts` | `COLOR_TEMPERATURES`, `FIXTURE_TYPES`, `DEFAULT_PRICING`, `BEAM_ANGLES` |
| `types.ts` | `SavedProject`, `FixturePricing`, `LightMarker`, `AppSettings` |
| `App.tsx` | `parsePromptForQuantities()` for regex-based fixture counting |
| `utils/` | Image encoding utilities |

---

**Last Updated**: January 2026 | AI Studio Deployment
