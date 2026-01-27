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



AI Landscape Lighting Generation Pipeline
Stage 1 - Scene Analysis: When a daytime house photo is uploaded, immediately extract four critical maps that will anchor the entire generation process: a depth map using Depth Anything V2 (outdoor model) to understand the 3D structure of the scene, semantic segmentation using SAM 3 to identify and label every element (house, windows, lawn, trees, walkway, etc.), surface normals to understand which direction each surface faces, and edge detection using MLSD for architectural lines combined with Canny for organic shapes. These four maps become the "ground truth" that prevents the AI from hallucinating or changing anything about the original house structure throughout the entire pipeline.

Stage 2 - Fixture Placement & Radiance Hints: When the user selects fixture types and quantities (e.g., "4 uplights, 6 path lights"), use the scene analysis to suggest optimal placements based on detected surfaces and features. For each placed fixture, generate physics-based "radiance hints" - mathematically calculated light maps showing exactly how that fixture's light should spread based on real parameters: position derived from depth map, beam angle, intensity falloff using inverse-square law (I=I₀/d²), and shadow casting using ray-tracing against the depth map. Combine all individual fixture contributions into a 16-channel tensor containing diffuse lighting, specular highlights at multiple roughness levels, and shadow masks. These radiance hints become hard constraints telling the AI exactly where and how light should appear.

Stage 3 - Day-to-Night Base Conversion: Convert the original photo to a nighttime base image WITHOUT any artificial lighting yet. Replace the sky region (identified via segmentation) with an appropriate night sky, apply global darkening with a cooler color temperature shift, and maintain subtle ambient moonlight/twilight levels. Critically, apply heavy ControlNet conditioning during this conversion - depth ControlNet at 0.85 weight, edge ControlNet at 0.70, segmentation ControlNet at 0.60 - to absolutely lock the house structure and prevent any changes to the building or landscaping. The output should look like the house at night with no lights on.

Stage 4 - Lighting Synthesis with Regional Control: Feed the diffusion model (fine-tuned SDXL or Flux) with multiple conditions: the nighttime base as background, the radiance hints as lighting instructions, and the structure maps as geometry locks. The critical technique here is regional denoising strength - areas where fixtures are placed get denoising strength of 0.70-0.75 allowing the AI to render realistic lighting effects, while areas with NO fixtures get denoising strength of only 0.20-0.25 preventing any changes or unwanted lights from appearing. The sky can have higher denoising (0.90) for natural variation. This ensures lights appear ONLY where the user specified fixtures, with physically accurate falloff and shadows, while the rest of the image remains essentially untouched.

Stage 5 - Validation & Output: Before delivering results, run automated validation checks: compare edge maps between original and generated (require >95% similarity to ensure structure preservation), verify all detected bright regions in the output fall within the defined fixture influence zones (light containment check), and scan for typical AI artifacts or impossible geometry. If validation fails, either selectively inpaint problem areas or regenerate with adjusted parameters. Output the final high-resolution image along with 2-3 variations at different intensity levels, giving users options while maintaining confidence that every generated image accurately represents the specified lighting design without hallucinated elements or structural changes to the original photograph.