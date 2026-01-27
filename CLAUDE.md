# Landscape Lighting App

## Stack
Vite, React, TypeScript, Tailwind, Supabase, Clerk, Stripe, Gemini API

## Commands
- npm run dev
- npm run build
- npm run typecheck

## Key Files
- constants.ts: Fixture types and prompts
- services/geminiService.ts: AI image generation pipeline (5-stage)
- docs/AI_IMAGE_GENERATION_RESEARCH.md: Research on AI prompt engineering

## AI Image Generation Guidelines
See `docs/AI_IMAGE_GENERATION_RESEARCH.md` for research-backed best practices:
- Use ALLOWLIST + PROHIBITION structure for fixture type control
- Use visual anchors (not just counts) for fixture quantity accuracy
- Use ALL CAPS for critical rules
- Use markdown dashed lists for structured rules
- Describe what "dark" looks like for forbidden fixtures

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
