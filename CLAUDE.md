# Landscape Lighting App

## Stack
Vite, React, TypeScript, Tailwind, Supabase, Clerk, Stripe, Gemini API

## Commands
- npm run dev
- npm run build
- npm run typecheck

## Key Files
- src/constants.ts: Fixture types and prompts
- src/lib/supabase.ts: Database
- src/lib/gemini.ts: AI image generation

## Rules
- TypeScript strict
- Tailwind for styling
- Always typecheck before commit
- STRICTLY only update what the user explicitly asks - do not make additional changes beyond the request.
- Make sure it fits perfectly for the mobile version and computer/tablot version

## Error Handling
- Read full error traces before attempting fixes
- If using paid APIs, ask before retrying failed calls

## Before Creating New Code
- Check existing components/hooks/utils for similar patterns
- Prefer extending existing code over creating new files
- All simple tasks, give it to sonnet to do