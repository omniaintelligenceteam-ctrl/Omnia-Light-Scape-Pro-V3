# Phase 1 Research: Omnia Light Scape Pro @ Commit 6feccd6

**Date:** 2026-02-05  
**Researcher:** Claude (G)  
**Status:** Phase 1 — No code changes made

---

## 📊 CODEBASE OVERVIEW

| Metric | Value |
|--------|-------|
| Total Files | 301 |
| Total Lines (core) | 17,564 |
| App.tsx (god component) | 10,998 lines |
| services/geminiService.ts | 3,045 lines, 18 exports |
| constants.ts | 2,464 lines |
| types.ts | 1,057 lines |

**Architecture:** Vite + React/TS + Supabase + Clerk + Stripe + Gemini API

---

## 🔬 AI GENERATION PIPELINE ANALYSIS

### Stage 1: ANALYZE (lines 233-540 in geminiService.ts)
**Function:** `analyzePropertyArchitecture()`

**What it does:**
- Takes user image + fixture selections
- Uses Gemini Pro 3 (`gemini-3-pro-preview`) to analyze property
- Returns: architecture details, window counts, recommended fixture counts
- Optional spatial map with % coordinates

**Current Issues:**
1. NO hard count enforcement — AI "recommends" but can ignore user input
2. Spatial coordinates optional — may not always generate positions
3. No Y-coordinate validation for gutter fixtures

**Prompt Weakness:** 
```typescript
// Line 494 in analysis prompt:
"For auto counts, recommend based on property features"
```
→ This gives AI discretion to override user counts

---

### Stage 2: PLAN (lines 710-925)
**Function:** `planLightingWithAI()`

**What it does:**
- Uses analysis to create lighting plan
- Determines intensity, beam angles, fixture placements
- Creates `LightingPlan` object with `FixturePlacement[]`

**Issues:**
1. Relies on Stage 1 analysis which may have wrong counts
2. Generates positions based on AI discretion, not hard math
3. No coordinate clamping (gutter can be placed at Y=20% instead of Y=85%)

---

### Stage 3: PROMPT (lines 925-1278)
**Function:** `craftPromptWithAI()`

**What it does:**
- Crafts final image generation prompt using analysis + plan
- Builds ALLOWLIST of selected fixtures
- Builds PROHIBITION list of non-selected fixtures

**CRITICAL ISSUE — Soffit Language Leak:**
Looking at constants.ts lines 424-427:
```typescript
"For 1ST STORY walls: beam reaches 1st story gutter/soffit (8-12 ft)"
"For 2ND STORY sections: beam MUST reach 2ND STORY soffit (18-25 ft)"
"The gutter/soffit underside MUST show visible illumination"
```
→ Even when soffit fixture NOT selected, AI sees "soffit" as a TARGET and may add soffit lights to "reach/illuminate" it

**Prompt Verbosity:**
- Master instruction: ~300 words of narrative description
- Intensity prompts: ~300 words per level (4 levels)
- Beam angle prompts: ~200 words per angle (4 angles)
→ Total: 2,000+ words that AI likely ignores

---

### Stage 4: VALIDATE (lines 1269-1470)
**Function:** `validatePrompt()`

**What it does:**
- Reviews generated prompt for contradictions
- Checks fixture counts match specifications
- Pre-catches position/count mismatches

**Issues:**
1. Only validates TEXT prompt, not actual image output
2. Position mismatches caught but not corrected — just warns
3. No actual enforcement of Y-coordinates

---

### Stage 5: GENERATE (lines 2339+)
**Function:** `generateNightScene()` (3 versions)

**Functions:**
- `generateNightScene()` — Full pipeline with all stages
- `generateNightSceneDirect()` — Skip analysis/planning, direct generation
- `generateNightSceneEnhanced()` — Uses Gemini analysis + direct gen

**Missing:** NO post-generation image verification. Once image is generated, no check that it matches specs.

---

## 🎯 IDENTIFIED FAILURE MODES

### Failure 1: Gutter Lights on Roof (HIGH PRIORITY)
**Symptom:** AI places gutter fixtures at Y=20-30% (roof) instead of Y=85-95% (ground gutter)

**Root Causes:**
1. No programmatic Y-coordinate clamping in code
2. AI confused between "gutter" (low, Y=85%) and "roofline" (high, Y=20-30%)
3. Prompt says "gutter" but doesn't explicitly contrast LOW vs HIGH position

**Current Prompt Language (line 1148):**
```typescript
"CATEGORY ENABLED: Gutter-Mounted Up Lights.
ASSUMPTION: A 1st story gutter ALWAYS exists.
PLACEMENT: Gutter up lights MUST be placed IN the 1st story gutter (8-10 ft high off ground)."
```
→ Says "8-10 ft" but doesn't give visual Y% reference

**Fix Needed:**
- Add coordinate validation: if gutter fixture has Y < 80%, force to Y=85%
- Update prompts to explicitly contrast: "LOW position Y=85-95%, NOT roof at Y=20-30%"

---

### Failure 2: Window Lights Bunched (HIGH PRIORITY)
**Symptom:** 4 windows requested, AI puts 2 lights on 1 window, ignores others

**Root Causes:**
1. Prompt says "one per window" but doesn't list windows individually
2. AI interprets "centered below window" loosely
3. No per-window coordinate tracking

**Current Prompt (line 694):**
```typescript
"Illuminates window glass, frame, trim, casing, sill and above to the soffit line"
```
→ Vague, no individual window reference

**Fix Needed:**
- Change to explicit list: "Window 1 (left): fixture. Window 2: fixture. Window 3: fixture. Window 4 (right): fixture"
- Add "NO bunching — each window gets its own distinct light"

---

### Failure 3: Soffit Lights Appearing Unrequested (HIGH PRIORITY)
**Symptom:** User selects "up lights" or "gutter lights", AI adds soffit downlights

**Root Causes:**
1. Up light prompts reference "soffit" as TARGET: "beam reaches soffit line", "illuminates up to soffit"
2. AI sees "soffit" and thinks it needs soffit FIXTURES to illuminate it
3. Soffit fixture type still fully defined in FIXTURE_TYPES (lines 1145-1197)
4. Filter `&& ft.id !== 'soffit'` only removes from disabled list, not from target language

**All Soffit References in Non-Fixture Contexts:**
- Line 424: "beam reaches 1st story gutter/soffit"
- Line 425: "beam MUST reach 2ND STORY soffit"
- Line 427: "The gutter/soffit underside MUST show visible illumination"
- Line 432: "Light should be EVEN from base to soffit"
- Line 441: "reach soffit"
- Line 465: "gradual dimming toward soffit"
- Line 493: "Up lights reach soffit line"
- Line 672: "Beam MUST reach soffit/roofline"
- Line 694: "above to the soffit line"
- Line 758: "soffit above"
- Line 966: "soffit above garage"
- Line 982: "wall above to soffit"
- Line 993: "continue above to soffit"

**Fix Options:**
- **Option A:** Delete soffit from FIXTURE_TYPES entirely
- **Option B:** Replace all "soffit" target language with "roofline" in up light/gutter prompts
- **Option C:** Both (safest)
→ User indicated B only in previous session

---

### Failure 4: Prompt Verbose-Induced Confusion (MEDIUM PRIORITY)
**Symptom:** AI doesn't follow detailed instructions

**Evidence:**
- Master instruction: 2,500+ words
- Intensity section: 1,000+ words per level × 4 = 4,000 words
- Beam angle section: 500+ words per angle × 4 = 2,000 words
- Total prompt: 8,000+ words

**Research shows:** AI attention drops after ~1,000 tokens. Verbose prompts = ignored instructions.

**Fix Needed:**
- Reduce to bullet points, max 500 words total
- Focus on: counts, positions, prohibitions
- Remove: physics explanations, narrative descriptions, examples

---

### Failure 5: Count Enforcement Gaps (MEDIUM PRIORITY)
**Symptom:** User specifies 6 fixtures, AI generates 4 or 8

**Root Causes:**
1. Analysis stage: "auto mode - AI recommends based on property" gives AI discretion
2. No hard enforcement at generation stage
3. Post-generation verification exists but doesn't auto-retry

**Current Flow:**
```
User Input: 6 window lights
    ↓
Analysis: AI "recommends" 6 (may change)
    ↓
Plan: Uses analysis count (not user input)
    ↓
Generate: May deviate
    ↓
Validate: Warns if mismatch, no correction
```

**Fix Needed:**
- Hard user count enforcement: AI must use EXACT user count, no recommendation override
- Post-generation: Count fixtures in output, retry if mismatch

---

## 🔧 DETAILED FIX CHECKLIST

### Immediate Fixes (No Code Changes Yet — For Phase 2)

#### 1. Gutter Y-Coordinate Enforcement
**File:** `services/geminiService.ts`  
**Location:** Line ~580, within `validateAgainstManifest()` or new function  
**Change:** Add validation:
```typescript
if (fixtureType === 'gutter' && spatialPosition.y < 80) {
  violations.push({ type: 'gutter_roof_placement', severity: 'critical' });
  // Auto-correct to Y=85%
  spatialPosition.y = 85;
}
```

#### 2. Window Distribution Fix
**File:** `constants.ts`  
**Location:** Line ~694, Windows sub-option prompt  
**Current:** 
```
"Illuminates window glass, frame, trim, casing, sill and above to the soffit line"
```
**Proposed:**
```
"Place EXACTLY one fixture centered below EACH first-story window. Count windows left-to-right. Window 1: fixture at [X%, Y%]. Window 2: fixture at [X%, Y%]. Continue for all windows. NO bunching — spread evenly."
```

#### 3. Soffit Language Removal (Option B Only)
**File:** `constants.ts`  
**Lines to change:** 424, 425, 427, 432, 441, 465, 493, 672, 694, 758, 966, 982, 993  
**Change pattern:** `s/soffit/roofline/g` in up light/gutter contexts only

#### 4. Prompt Brevity
**File:** `constants.ts`  
**Lines:** SYSTEM_PROMPT section (~line 28)  
**Strategy:** Reduce from 2,500 words to <500 words. Remove narrative, keep enforcement bullets.

#### 5. Hard Count Enforcement
**File:** `services/geminiService.ts`  
**Location:** Line ~460, within validation  
**Change:** Force user count, disable AI recommendation override

#### 6. Post-Generation Image Verification (Advanced)
**New Feature:** Add vision analysis to count fixtures in generated image
**File:** New function in `geminiService.ts`  
**Logic:** If count mismatch, retry with stricter prompt

---

## 📸 REFERENCE IMAGES (From User Sessions)

### Image Issue 1: Window Bunching
**Description:** House with 4 first-story windows  
**User Request:** 4 window lights (one per window)  
**AI Result:** 2 lights on 1 window, other windows unlit  
**Root Cause:** No explicit per-window placement in prompt

### Image Issue 2: Garage Downlights
**Description:** Garage door with 3 downlights above it  
**User Request:** Gutter lights for 2nd story  
**AI Result:** Soffit-style downlights above garage (wrong fixture type)  
**Root Cause:** AI confused gutter (shines up) with soffit (shines down)

### Image Issue 3: Roofline Fixtures
**Description:** Fixtures mounted at roofline (Y=20-30%)  
**User Request:** Gutter-mounted up lights  
**Expected:** Fixtures at Y=85-95%, near ground, shining up  
**AI Result:** Fixtures at roof height, high on house  
**Root Cause:** No Y-coordinate enforcement

---

## 🎯 PHASE 2 RECOMMENDATION ORDER

Based on impact vs effort:

1. **Soffit Language Removal (B only)** — Medium effort, high impact — Prevents unwanted fixtures
2. **Gutter Y-Coordinate Enforcement** — Medium effort, high impact — Fixes primary user's issue
3. **Window Distribution Fix** — Low effort, high impact — Clear win for another primary issue
4. **Hard Count Enforcement** — Medium effort, medium impact — Fixes count mismatch
5. **Prompt Brevity** — High effort, low immediate impact — Long-term maintainability
6. **Post-Gen Verification** — High effort, high impact — Advanced feature for precision

---

## 📝 SUMMARY

**State at 6feccd6:**
- ✅ 4-stage pipeline exists
- ✅ Validation layer exists (but doesn't enforce corrections)
- ✅ Soffit fixture type still fully defined
- ❌ No hard coordinate clamping
- ❌ No per-window explicit placement
- ❌ Soffit language leaks into up light prompts
- ❌ Verbose prompts confusing AI
- ❌ Count enforcement gaps

**Ready for Phase 2 — awaiting your specific fix approval.**

I will NOT touch code until you explicitly approve each numbered fix above.