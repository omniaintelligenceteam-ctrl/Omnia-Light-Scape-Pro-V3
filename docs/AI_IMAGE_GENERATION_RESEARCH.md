# AI Image Generation Research for Landscape Lighting

This document contains key research findings for generating accurate nighttime landscape lighting photos with AI.

## Key Problems & Solutions

### PROBLEM 1: AI Generates Lights That Weren't Selected

**Why it happens:** AI image models are trained to create "complete" scenes and may add lighting they think looks good.

**Solution: Explicit ALLOWLIST + PROHIBITION Structure**

```markdown
## EXCLUSIVE FIXTURE ALLOWLIST
ONLY the following fixture types may appear in this image:
- Up lights: Ground-mounted brass cylinders aimed upward
- Path lights: Ground-mounted fixtures illuminating walkways

## ABSOLUTE PROHIBITION - MUST REMAIN DARK
The following fixtures are FORBIDDEN and their surfaces MUST remain completely unlit:
- Soffit/downlights: Eave undersides appear as dark shadows, NO downward illumination
- Gutter lights: Roofline remains dark silhouette, NO edge lighting
- Hardscape lights: Walls and steps remain unlit, NO accent lighting

VALIDATION: Any fixture not in the ALLOWLIST appearing = INVALID IMAGE
```

**Key Techniques:**
- Use ALL CAPS for emphasis (research shows this works in Gemini)
- Use markdown dashed lists (Gemini follows structured lists better)
- Describe what "dark" looks like for each forbidden type
- Add validation/threat language at the end

---

### PROBLEM 2: AI Gets Wrong Number of Fixtures

**Why it happens:** Research shows AI achieves only ~29-54% accuracy on exact object counts.

**Solution: Visual Anchors Instead of Numbers**

Instead of: "Place EXACTLY 6 up lights"

Use individual position descriptions:
```markdown
## UP LIGHTS - 6 FIXTURES TOTAL
FIXTURE 1: Far LEFT corner of facade - in landscaping bed 6" from foundation
FIXTURE 2: Wall section between left corner and window 1 - centered
FIXTURE 3: Centered below window 1 - aligned with window frame
FIXTURE 4: Wall section between window 1 and entry door - centered
FIXTURE 5: Centered below window 2 (right of door) - aligned with frame
FIXTURE 6: Far RIGHT corner of facade - in landscaping bed 6" from foundation

VERIFICATION: Count fixtures before finalizing. Must be EXACTLY 6.
```

**Key Techniques:**
- Describe each fixture position individually
- Use visual anchors: "between window 1 and window 2"
- Reference specific architectural features
- Include verification requirement

---

### PROBLEM 3: Lighting Looks Flat/Unrealistic (No Dark Gaps)

**Why it happens:** AI defaults to "complete" lighting that fills in shadows, creating uniform wall wash instead of dramatic pools with dark gaps between fixtures.

**Solution: Explicit Dramatic Contrast Instructions**

```markdown
## LIGHTING STYLE - DRAMATIC CONTRAST WITH DARK GAPS (CRITICAL)

### BEAM CHARACTERISTICS (NARROW SPOT - 15-30°)
- Each up light creates a DISTINCT, TIGHT column of light
- Light cone spreads approximately 2.5-5 feet at 10 feet height
- Hot center with SOFT (not crisp) falloff to edges
- Edge transition zone: 6-12 inches with soft diffusion
- Beam boundary is DEFINED but FEATHERED, never sharp

### DARK GAPS BETWEEN FIXTURES (MANDATORY)
- Fixtures are spaced with INTENTIONAL DARK GAPS between illumination zones
- Unlit wall sections between fixtures remain in DEEP SHADOW
- Dark gaps are COMPOSITIONAL ELEMENTS that create drama
- Do NOT blend fixtures into continuous uniform wash

### INVERSE SQUARE LAW (PHYSICS)
Light intensity MUST follow: brightness = 1/(distance squared)
- Brightest at fixture source, rapid falloff with distance
- Creates natural-looking gradients, NOT uniform brightness

### WHAT TO AVOID
- Uniform brightness across entire wall surface
- Light pools that blend/overlap into continuous wash
- Fill light that softens shadows between fixtures
- Crisp, hard-edged circular light boundaries

VALIDATION: Fixtures must have VISIBLE DARK GAPS between them.
Uniform wall wash = INVALID. Distinct pools with shadows = VALID.
```

**Key Techniques:**
- Specify NARROW beam angles (15-30°) not wide flood
- Explicitly require DARK GAPS between fixtures
- Describe inverse square law falloff
- Use language like "DISTINCT pools" and "ISOLATED zones"
- Describe what dark gaps look like (shadow, unlit wall sections)

**Research Sources:**
- [CAST Lighting - Wall Washing vs Wall Grazing](https://cast-lighting.com/blog/post/outdoor-lighting-101-wall-washing-vs-wall-grazing)
- [Palmetto Outdoor Lighting - The Art of Darkness](https://palmettooutdoorlighting.com/the-art-of-darkness-the-role-of-shadows-in-outdoor-lighting-design/)
- [ProGrade Digital - Inverse Square Law](https://progradedigital.com/understanding-and-using-the-inverse-square-law-in-photography/)

---

## Best Practices Summary

### 1. ALL CAPS for Critical Rules
Research from Max Woolf's Nano Banana study shows caps improve prompt adherence.

### 2. Markdown Dashed Lists
Gemini was trained on code documentation and follows structured lists better.

### 3. Visual Anchors Beat Numbers
Describing positions individually is more reliable than specifying counts.

### 4. Describe "Dark" Explicitly
For forbidden fixtures, describe what the dark/unlit state looks like.

### 5. Validation/Threat Language
Adding consequence language improves compliance: "Any violation = INVALID IMAGE"

### 6. Multi-Stage Validation
Have AI verify fixture types and counts before image generation.

### 7. Dramatic Contrast with Dark Gaps
Professional lighting has intentional dark areas between fixtures. Specify:
- Narrow beam angles (15-30°) for distinct light pools
- DARK GAPS as compositional elements
- Inverse square law for realistic falloff
- Soft, feathered beam edges (never crisp circles)

---

## Prompt Template

```markdown
## EXCLUSIVE FIXTURE ALLOWLIST
ONLY the following fixture types may appear:
- [Selected fixture 1]: [description]
- [Selected fixture 2]: [description]

## ABSOLUTE PROHIBITION - MUST REMAIN DARK
The following are FORBIDDEN:
- [Unselected 1]: [description of dark state]
- [Unselected 2]: [description of dark state]

## EXACT FIXTURE PLACEMENTS

### [Fixture Type] - [Count] FIXTURES TOTAL
FIXTURE 1: [Exact position with visual anchor]
FIXTURE 2: [Exact position with visual anchor]
...

VERIFICATION: Count all fixtures. Confirm ONLY allowlisted types appear.
Any violation = INVALID IMAGE.
```

---

## Sources

- [Max Woolf's Nano Banana Research](https://minimaxir.com/2025/11/nano-banana-prompts/) - ALL CAPS, lists, threats
- [CVPR 2025 "Make It Count"](https://arxiv.org/abs/2406.10210) - Object counting accuracy
- [Google Gemini Prompting Tips](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/image-generation)



