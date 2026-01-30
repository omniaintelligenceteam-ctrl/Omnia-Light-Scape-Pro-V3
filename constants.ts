
import type { ColorTemperature, FixturePricing } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// constants.ts - Lighting Design System Configuration
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubOption {
  id: string;
  label: string;
  description: string;
  prompt: string;
  negativePrompt: string;
  darkDescription: string; // Description of what this suboption looks like when NOT selected (dark/off state)
}

export interface FixtureType {
  id: string;
  label: string;
  description: string;
  positivePrompt: string;
  negativePrompt: string;
  subOptions: SubOption[];
}

export interface SystemPromptConfig {
  masterInstruction: string;
  globalNegativePrompt: string;
  closingReinforcement: string;
}

export interface GenerationSettingsConfig {
  denoisingStrength: number;
  cfgScale: number;
  steps: number;
  controlNet: {
    enabled: boolean;
    model: string;
    weight: number;
    guidanceStart: number;
    guidanceEnd: number;
  };
  ipAdapter: {
    enabled: boolean;
    weight: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM-LEVEL MASTER PROMPTS - ANTI-HALLUCINATION GUARDRAILS
// Apply these BEFORE and AFTER all fixture prompts to ensure architectural fidelity
// ═══════════════════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT: SystemPromptConfig = {
  
  masterInstruction: `YOU ARE A PROFESSIONAL LANDSCAPE LIGHTING VISUALIZATION TOOL.

═══════════════════════════════════════════════════════════════════════════════
SCENE VISION - WHAT WE ARE CREATING
═══════════════════════════════════════════════════════════════════════════════

Imagine a luxury residential home as night falls. The sky becomes a pure black canvas with a luminous full moon casting the faintest silver outline on the roofline. Against this dramatic backdrop, professional-grade landscape lighting transforms the property.

Ground-mounted brass uplights create distinct vertical columns of warm amber light (2700K-3000K) that graze textured surfaces - revealing the depth of mortar joints in brick, the horizontal shadow lines between siding boards, the irregular facets of natural stone. Each fixture stands alone, its illumination separated by intentional dark gaps that define professional lighting design.

The light follows the inverse square law: brightest at mid-wall where the narrow beam (15-25°) concentrates its energy, then gradually fading as it reaches the soffit line above. There are no harsh hot spots at the fixture base, no continuous wash of light blending pools together. Instead, there is rhythm - alternating zones of light and shadow that give the facade depth, drama, and dimension.

This is architectural lighting as art: controlled, intentional, and deeply respectful of both the home's character and the physics of light itself.

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE CONSTRAINTS - VIOLATION IS FORBIDDEN
═══════════════════════════════════════════════════════════════════════════════

## 0. FRAMING & COMPOSITION PRESERVATION (CRITICAL)
- The output image MUST have the EXACT SAME framing and composition as the source
- Keep the ENTIRE house in frame - do NOT crop, zoom in, or cut off any part
- All edges of the property visible in source MUST remain visible in output
- The aspect ratio and boundaries MUST match the source image exactly
- If source shows full front facade, output MUST show full front facade
- Do NOT zoom in on specific areas or features

## 1. ARCHITECTURAL PRESERVATION (ZERO TOLERANCE)
- The home's structure, shape, roofline, windows, doors, columns, and ALL architectural features MUST remain EXACTLY as shown in source image

## 2. HARDSCAPE PRESERVATION (ZERO TOLERANCE)
- Driveways MUST remain EXACTLY as shown - same shape, length, width, material
- Sidewalks and walkways MUST remain EXACTLY as shown - do NOT add new paths
- Patios, steps, and retaining walls MUST remain EXACTLY as shown

## 3. LANDSCAPE PRESERVATION (ZERO TOLERANCE)
- Trees MUST remain EXACTLY as shown - same size, shape, position, species
- Shrubs, bushes, and plants MUST remain EXACTLY as shown
- Lawn areas MUST remain EXACTLY as shown - same shape and boundaries
- Flower beds and mulch areas MUST remain EXACTLY as shown

## 4. ENVIRONMENTAL PRESERVATION
- Neighboring structures, fences, and property elements remain unchanged
- Vehicles, if present, remain unchanged
- Outdoor furniture and decorations remain unchanged
- Mailboxes, house numbers, and accessories remain unchanged

═══════════════════════════════════════════════════════════════════════════════
NIGHTTIME SKY REQUIREMENTS (MANDATORY - CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

### SKY RENDERING - PURE BLACK VOID
- Sky MUST be PURE BLACK (#000000 to #0A0A0A) - completely dark
- NO ambient glow, NO gradients, NO blue tones, NO purple tones
- NO light pollution, NO horizon glow, NO atmospheric scatter
- The sky is a TRUE VOID - the blackest black possible

### MOON RENDERING - REALISTIC FULL MOON
- Include ONE realistic FULL MOON in the sky
- Moon position: upper portion of sky, aesthetically placed (NOT behind house)
- Moon size: realistic apparent size (0.5° angular diameter equivalent)
- Moon color: soft white/pale yellow (#F5F5DC to #FFFACD)
- Moon detail: visible maria (dark patches), subtle crater shadows
- Moon glow: VERY SOFT halo (2-3 moon diameters), barely perceptible

### MOONLIGHT EFFECT - EXTREMELY SUBTLE EDGE LIGHTING ONLY
- Moon provides ONLY the faintest silhouette definition - NOT illumination
- Roofline edges: hairline highlight (1-2 pixels) on uppermost edge
- Tree silhouettes: barely perceptible outline against black sky
- This is RIM LIGHTING at 5% intensity - just enough to separate shapes from sky
- Moonlight does NOT illuminate surfaces, walls, or ground
- Moonlight does NOT fill shadows or reduce contrast
- If unsure, make moonlight WEAKER not stronger

### ABSOLUTE SKY PROHIBITIONS
- NO stars (keep sky completely black except for moon)
- NO clouds (clear night sky only)
- NO aurora, nebula, or atmospheric effects
- NO city glow on horizon
- NO blue hour/golden hour remnants

═══════════════════════════════════════════════════════════════════════════════
PERMITTED MODIFICATIONS (ONLY THESE)
═══════════════════════════════════════════════════════════════════════════════

- Convert daytime sky to PURE BLACK nighttime sky with FULL MOON
- Add extremely subtle moonlight rim on roofline and tree silhouettes
- REMOVE all ambient daylight - scene should be DARK except for fixture lighting
- ADD ONLY the specific light fixtures and effects explicitly requested
- Light fixtures may ONLY be placed in locations specified by active prompts
- The contrast between lit and unlit surfaces should be DRAMATIC and HIGH

═══════════════════════════════════════════════════════════════════════════════
LIGHT GENERATION RULES (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

- Generate ONLY fixture types that are explicitly ENABLED in the design request
- Place fixtures ONLY in locations specified by active sub-option prompts
- Do NOT add decorative string lights unless explicitly requested
- Do NOT add interior window glow unless explicitly requested
- Do NOT add street lights, car headlights, or ambient city glow
- Light color temperature and beam characteristics follow active prompt specs
- Unlit areas MUST remain in DEEP SHADOW for maximum contrast

═══════════════════════════════════════════════════════════════════════════════
GUTTER LIGHT MOUNTING LOCATION (CRITICAL - WHEN GUTTER LIGHTS SELECTED)
═══════════════════════════════════════════════════════════════════════════════

*** GUTTER LIGHTS MUST BE INSIDE THE GUTTER TROUGH POKING OUT THE ROOF - NEVER ON THE ROOF ***

GUTTER ANATOMY:
- A gutter is a U-shaped metal channel running along the roofline
- It collects rainwater and directs it to downspouts
- The INSIDE of the gutter is where water flows
- Gutter lights sit INSIDE this U-channel, against the inner wall

CORRECT GUTTER LIGHT PLACEMENT:
- INSIDE the metal gutter trough (the U-shaped channel)
- Against the INNER GUTTER WALL (wall closest to house/fascia)
- Fixture sits DOWN in the channel, partially hidden by gutter walls
- Only the top of the fixture is visible from ground level

FORBIDDEN GUTTER LIGHT PLACEMENTS:
- ON THE ROOF SURFACE - Fixtures must NEVER be on shingles
- ON THE GUTTER LIP/EDGE - Fixtures must NEVER be on the outer rim
- ON THE FASCIA BOARD - Fixtures must be IN the gutter, not on fascia
- PROMINENTLY VISIBLE ON ROOFLINE - Fixtures should be partially hidden

WHY INSIDE THE GUTTER:
- Professional installation - fixtures are protected from weather
- Aesthetic - fixtures are discreet, not prominently visible
- Function - allows upward beam angle toward target

VISUAL VALIDATION:
- If the entire fixture is prominently visible on the roofline = WRONG
- If the fixture appears to be sitting on shingles = WRONG
- If the fixture is described as low-profile, inside gutter channel = CORRECT

═══════════════════════════════════════════════════════════════════════════════
DRAMATIC LIGHTING STYLE (CRITICAL FOR PROFESSIONAL REALISM)
═══════════════════════════════════════════════════════════════════════════════

### LIGHT POOL ISOLATION - THE DEFINING CHARACTERISTIC
Each fixture creates a DISTINCT, ISOLATED pool of light with these properties:

1. **DARK GAPS BETWEEN FIXTURES (MANDATORY)**
   - Visible dark wall/ground sections MUST exist between each fixture's illumination
   - Light pools do NOT blend into continuous wash - they remain SEPARATE
   - The spacing between lit areas should be 30-50% of the lit area width
   - These dark gaps are INTENTIONAL and define professional lighting

2. **BEAM ANGLE & SPREAD (NARROW FOR DRAMA)**
   - Default beam angle: 15-25° (narrow spot)
   - Creates tight vertical columns of light, NOT wide floods
   - Wider angles (45-60°) ONLY if specifically requested
   - Narrow beams reveal texture and create dramatic shadows

3. **INVERSE SQUARE LAW (REALISTIC FALLOFF)**
   - Light intensity = 1 / (distance²)
   - Brightest at mid-wall (not at fixture base - see hot spot avoidance)
   - Rapid dimming as distance increases
   - Natural falloff creates depth and dimension

4. **SOFT BEAM EDGES (FEATHERED TRANSITIONS)**
   - Beam edges are SOFT and GRADUAL, never crisp circles
   - Transition zone: 6-12 inches from full brightness to shadow
   - Penumbra effect at beam edges
   - Light fades naturally into darkness, not abrupt cutoff

5. **TEXTURE REVELATION (WALL GRAZING)**
   - Narrow beam angle reveals surface texture
   - Brick: mortar joint shadows visible
   - Stone: irregular surface creates light/shadow play
   - Siding: horizontal shadow lines between boards
   - Smooth surfaces: subtle directional shading

### WHAT PROFESSIONAL LIGHTING LOOKS LIKE
✓ CORRECT: Distinct light pools with visible dark gaps between them
✓ CORRECT: Vertical columns of light that don't merge together
✓ CORRECT: Deep shadows between fixtures creating rhythm
✓ CORRECT: Texture visible from grazing light angles

### WHAT TO AVOID (AMATEUR MISTAKES)
✗ WRONG: Uniform brightness across entire wall (looks flat/fake)
✗ WRONG: Light pools blending into continuous wash
✗ WRONG: Crisp, hard-edged circular light boundaries
✗ WRONG: Fill light that softens shadows between fixtures
✗ WRONG: Over-lit scenes with no dark areas

═══════════════════════════════════════════════════════════════════════════════
UP LIGHT FIXTURE SPECIFICATIONS (APPLIES TO ALL UP LIGHT SUB-OPTIONS)
═══════════════════════════════════════════════════════════════════════════════

- Type: ground-staked brass up light (bullet or cylinder style)
- Housing: solid brass/bronze, low-profile
- Height: 6-8 inches above grade
- Beam: narrow (15-25°) for wall grazing, medium (20-40°) for wash
- Distance from wall/foundation: 4-6 inches
- Placement: ONLY in landscaping beds/mulch, NEVER on hardscape

═══════════════════════════════════════════════════════════════════════════════
HOT SPOT AVOIDANCE (APPLIES TO ALL UP LIGHTS)
═══════════════════════════════════════════════════════════════════════════════

- Angle fixture BACK 15-20° from vertical
- Beam starts on wall 12-18 inches above ground, NOT at fixture height
- Light is BRIGHTEST at mid-wall, not at fixture base
- Avoid overly bright "hot spot" at base - light should be EVEN

WATTAGE BY WALL HEIGHT:
- 1st story only (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2nd story reach (18-25 ft): 6-10 watt LED (500-800 lumens)
- Tall facades (25+ ft): 10-15 watt LED (800-1200 lumens)

═══════════════════════════════════════════════════════════════════════════════
PATH LIGHT SPECIFICATIONS (APPLIES TO ALL PATH LIGHT SUB-OPTIONS)
═══════════════════════════════════════════════════════════════════════════════

- Style: cast brass "china hat" or dome-top path light
- Height: 22 inches tall
- Material: solid brass with aged bronze patina finish
- Distribution: 360-degree omnidirectional downward projection
- Light pool diameter: 6-8 feet
- Placement: ALWAYS in landscaping beds adjacent to path, NEVER on hardscape
- Pattern: STAGGERED ZIGZAG along path edges, 8-10 feet apart

═══════════════════════════════════════════════════════════════════════════════
CORE DRILL SPECIFICATIONS (APPLIES TO ALL IN-GRADE SUB-OPTIONS)
═══════════════════════════════════════════════════════════════════════════════

- Type: flush-mounted well light recessed into concrete/pavers
- Housing: brass or stainless steel with tempered glass lens
- Installation: level with grade, ZERO protrusion
- Rating: vehicle-traffic rated where applicable

═══════════════════════════════════════════════════════════════════════════════
GUTTER LIGHT SPECIFICATIONS (APPLIES TO ALL GUTTER SUB-OPTIONS)
═══════════════════════════════════════════════════════════════════════════════

- Type: SMALL compact mini bullet up light - TINY fixture
- Housing: DARK BRONZE finish (required)
- Mounting: INSIDE the gutter trough ONLY, against inner gutter wall poking out over the roof
- FORBIDDEN: On roof shingles, on gutter lip, on fascia board
- Beam MUST reach target (dormer/gable) regardless of distance

═══════════════════════════════════════════════════════════════════════════════
MULTI-SELECTION PRIORITY RULES (CRITICAL - PREVENTS DUPLICATE FIXTURES)
═══════════════════════════════════════════════════════════════════════════════

When multiple sub-options are active, some SHARE TARGET ZONES. Follow these rules:

UP LIGHTS - SHARED ZONE RESOLUTION:
1. ENTRYWAY takes PRIORITY within 6 feet of entry door
   - If siding/windows/columns would place a fixture near the entry, SKIP IT
   - Entryway's two flanking fixtures cover the entry zone

2. COLUMNS takes PRIORITY at column bases
   - If siding would place a fixture where a column stands, use COLUMNS instead
   - Do NOT add a siding fixture at a column base

3. WINDOWS takes PRIORITY at window centers
   - Siding does NOT place fixtures under windows - only BETWEEN them
   - This is already the default behavior

4. SIDING fills REMAINING wall sections
   - After entryway, columns, and windows have their fixtures, siding fills gaps

GUTTER UP LIGHTS - SHARED ZONE RESOLUTION:
1. DORMERS takes PRIORITY for dormer features
   - If secondStoryFacade would place a fixture below a dormer, SKIP IT
   - Dormers sub-option handles all dormer illumination

2. SECONDSTORYFACADE handles facades WITH peaks above
   - If peaks AND secondStoryFacade both selected, secondStoryFacade handles peaks that are part of a 2nd story facade

3. PEAKS handles STANDALONE gables only
   - Gables that rise directly from ground level OR don't have a 2nd story facade below

FIXTURE OVERLAP RULE:
- NEVER place two fixtures within 2 feet of each other
- If two sub-options would both place a fixture in the same spot, use the HIGHER PRIORITY option only

═══════════════════════════════════════════════════════════════════════════════
VALIDATION CHECK (PERFORM BEFORE GENERATING)
═══════════════════════════════════════════════════════════════════════════════

- [ ] Source image FRAMING = Output image FRAMING (IDENTICAL)
- [ ] Source image architecture = Output image architecture (IDENTICAL)
- [ ] Source image hardscape = Output image hardscape (IDENTICAL)
- [ ] Source image landscaping = Output image landscaping (IDENTICAL)
- [ ] Sky is PURE BLACK with realistic FULL MOON
- [ ] DARK GAPS visible between fixture illumination zones
- [ ] Only requested fixture types appear (no extras)
- [ ] Only differences: sky darkness + requested light fixtures/effects`,

  globalNegativePrompt: `ARCHITECTURAL ADDITIONS: new windows, new doors, new dormers, new columns, new trim, new shutters, new porches, new decks, new balconies, new railings, roof changes, roof modifications, added architectural features, removed architectural features, altered architectural features, BREAK
HARDSCAPE ADDITIONS: new driveways, new sidewalks, new walkways, new patios, new steps, new retaining walls, new pavers, new concrete, added hardscape, BREAK
LANDSCAPE ADDITIONS: new trees, new shrubs, new bushes, new plants, new flowers, new mulch beds, new planters, new garden features, lawn changes, seasonal changes, snow, fall leaves, different foliage, BREAK
OBJECT ADDITIONS: new vehicles, new furniture, new outdoor objects, added objects, BREAK
PROHIBITED LIGHTING: string lights, fairy lights, holiday lighting, christmas lights, interior window glow, glowing windows from inside, street lights, car lights, car headlights, urban ambient glow, city glow, light fixtures not specified, unspecified fixtures, extra fixtures, security lights, security floodlights, motion sensor lights, existing security fixtures turned on, lit security lights, BREAK
SKY ERRORS: bright moonlight, harsh moonlight, stars, starlight, blue sky, gradient sky, ambient sky glow, twilight, dusk colors, purple sky, blue tones, atmospheric glow, light pollution, horizon glow, BREAK
MATERIAL CHANGES: paint color changes, siding changes, brick changes, stone changes, material changes, fence changes, gate changes, BREAK
LIGHTING QUALITY ERRORS: uniform wall wash, blended light pools, no dark gaps, harsh beam edges, crisp circular beams, over-lit scene, no shadows, hot spots at fixture base, continuous illumination without gaps, flat lighting, BREAK
STRUCTURE MODIFICATIONS: property modifications, house modifications, structure modifications, framing changes, composition changes, cropped house, zoomed in`,

  closingReinforcement: `
═══════════════════════════════════════════════════════════════════════════════
MASTER RULE - STRICT CATEGORY ENFORCEMENT
═══════════════════════════════════════════════════════════════════════════════

### FIXTURE TYPE ALLOWLIST (ABSOLUTE)
- ONLY generate fixtures for categories that are EXPLICITLY ENABLED above
- If path lights are NOT selected → ZERO path lights in image
- If up lights are NOT selected → ZERO up lights in image
- NEVER add fixtures "for realism" or "to complete the design"
- ABSENCE of a category = ABSOLUTE PROHIBITION of that fixture type

### SUB-OPTION ISOLATION (CRITICAL)
Within each fixture category, ONLY the SELECTED sub-options receive lights:

EXAMPLE: If "Up Lights" is enabled with ONLY "Trees" selected:
- Trees = LIT (with exact count specified)
- Siding = MUST REMAIN COMPLETELY DARK (zero fixtures)
- Windows = MUST REMAIN COMPLETELY DARK (zero fixtures)
- Columns = MUST REMAIN COMPLETELY DARK (zero fixtures)
- Landscaping = MUST REMAIN COMPLETELY DARK (zero fixtures)

This rule is ABSOLUTE and NON-NEGOTIABLE.

═══════════════════════════════════════════════════════════════════════════════
SECURITY LIGHT PROHIBITION
═══════════════════════════════════════════════════════════════════════════════

- Even if security fixtures exist on the home in source image → MUST remain OFF and DARK
- Do NOT turn on, activate, or show light from ANY existing security fixtures
- This applies regardless of what other lighting is selected
- Security lights are FORBIDDEN from being lit - NO EXCEPTIONS

═══════════════════════════════════════════════════════════════════════════════
UP LIGHT PLACEMENT RULES (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

### FOUNDATION PROXIMITY (6 INCH RULE)
- ALL up lights MUST be placed WITHIN 6 INCHES of the home's foundation
- EXCEPTION: Tree up lights are placed at tree base, not foundation
- For siding, windows, columns, entry: fixtures MUST be tight against foundation
- The fixture base should be nearly touching the foundation - 6 inches MAX

### BEAM HEIGHT (SOFFIT REACH)
- ALL up lights on siding AND 1st story windows MUST reach the SOFFIT LINE
- Light beam travels the FULL HEIGHT from ground to soffit
- Each up light creates a vertical column reaching the soffit above it
- The soffit underside MUST show visible illumination ("kiss" the soffit)

### HOT SPOT AVOIDANCE (CRITICAL FOR REALISM)
- AVOID hot spots (overly bright areas at fixture base)
- Light should be EVEN from base to soffit, not blinding at bottom
- Technique: Angle fixture BACK 15-20 degrees from vertical
- Beam should start on wall 12-18 inches above ground, NOT at fixture height
- Light is BRIGHTEST at mid-wall, not at fixture base

### WATTAGE BY WALL HEIGHT
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED appearance (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED appearance (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED appearance (800-1200 lumens)
- Taller walls require brighter/higher wattage appearance to reach soffit

═══════════════════════════════════════════════════════════════════════════════
DRAMATIC CONTRAST WITH DARK GAPS (THE DEFINING VISUAL)
═══════════════════════════════════════════════════════════════════════════════

### WHAT MAKES PROFESSIONAL LIGHTING LOOK PROFESSIONAL
The single most important visual characteristic of professional landscape lighting
is the DRAMATIC INTERPLAY of LIGHT and DARK.

### DARK GAP REQUIREMENTS (MANDATORY)
- Each fixture creates a DISTINCT vertical column of light
- DARK GAPS MUST be visible between each fixture's illumination zone
- Wall sections between fixtures remain in DEEP SHADOW
- The material (brick/siding/stone) is visible in shadow between light pools

### VISUAL TEST
- ✗ WRONG: All lights blend together into continuous wash
- ✓ CORRECT: Lights have visible dark gaps between them

### BEAM CHARACTERISTICS
- Beam angles: NARROW (15-25°) for dramatic contrast
- Beam edges: SOFT and FEATHERED (6-12 inch transition zone)
- Light physics: INVERSE SQUARE LAW - brightness = 1/(distance²)
- Falloff: Brightest at mid-wall, gradual dimming toward soffit

═══════════════════════════════════════════════════════════════════════════════
FINAL VALIDATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before finalizing the image, verify:

### PRESERVATION
- [ ] Architecture IDENTICAL to source (zero modifications)
- [ ] Hardscape IDENTICAL to source (no added paths/driveways)
- [ ] Landscaping IDENTICAL to source (no added/removed plants)
- [ ] Framing/composition IDENTICAL (whole house in frame)

### SKY
- [ ] Sky is PURE BLACK (#000000 to #0A0A0A)
- [ ] FULL MOON present with realistic detail
- [ ] NO stars, gradients, blue tones, or atmospheric glow
- [ ] Moonlight provides ONLY hairline edge definition on roofline

### FIXTURES
- [ ] ONLY enabled fixture types appear (check allowlist)
- [ ] ONLY enabled sub-options are lit (others remain DARK)
- [ ] Fixture counts match EXACTLY what was specified
- [ ] Security lights remain OFF

### LIGHTING QUALITY
- [ ] DARK GAPS visible between fixture illumination zones
- [ ] Up lights reach soffit line with natural falloff
- [ ] No hot spots at fixture bases
- [ ] Professional dramatic contrast achieved

═══════════════════════════════════════════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════════════════════════════════════════

You are converting a daytime photo to nighttime and adding ONLY the specified
lighting fixtures. The home, landscaping, hardscape, and all physical features
must be PIXEL-PERFECT identical to the source.

If you are uncertain whether a feature exists in the source, do NOT add it.
When in doubt, preserve the source image exactly.
ONLY generate lights that are explicitly enabled above.

The dramatic interplay of light and shadow is the PRIMARY VISUAL GOAL.
Professional landscape lighting has intentional dark areas - shadows are as
important as the light itself.`
};


// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED GENERATION SETTINGS - Helps prevent hallucination
// ═══════════════════════════════════════════════════════════════════════════════

export const GENERATION_SETTINGS: GenerationSettingsConfig = {
  denoisingStrength: 0.35,
  cfgScale: 7.5,
  steps: 30,
  controlNet: {
    enabled: true,
    model: 'canny',
    weight: 0.8,
    guidanceStart: 0.0,
    guidanceEnd: 1.0
  },
  ipAdapter: {
    enabled: true,
    weight: 0.5
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function buildFinalPrompt(
  activeFixtures: FixtureType[],
  activeSubOptions: Record<string, SubOption[]>,
  allFixtureTypes: FixtureType[]
): string {
  let finalPrompt = '';
  
  // 1. Start with master instruction (anti-hallucination rules)
  finalPrompt += SYSTEM_PROMPT.masterInstruction + '\n\n';
  
  // 2. Add fixture-specific prompts based on what's enabled
  finalPrompt += '=== ENABLED LIGHTING ===\n\n';
  
  if (activeFixtures.length === 0) {
    finalPrompt += 'NO LIGHTING ENABLED. Convert to nighttime scene only. Do NOT add any light fixtures.\n\n';
  } else {
    activeFixtures.forEach(fixture => {
      finalPrompt += `--- ${fixture.label.toUpperCase()} ---\n`;
      finalPrompt += fixture.positivePrompt + '\n\n';
      
      // Add active sub-options for this fixture
      const subOpts = activeSubOptions[fixture.id] || [];
      if (subOpts.length > 0) {
        subOpts.forEach(subOpt => {
          finalPrompt += `[${subOpt.label}]\n`;
          finalPrompt += subOpt.prompt + '\n\n';
        });
      }
    });
  }
  
  // 3. Add disabled fixture negative prompts
  const disabledFixtures = allFixtureTypes.filter(
    f => !activeFixtures.some(af => af.id === f.id)
  );
  
  if (disabledFixtures.length > 0) {
    finalPrompt += '=== DISABLED LIGHTING (DO NOT GENERATE) ===\n\n';
    disabledFixtures.forEach(fixture => {
      finalPrompt += fixture.negativePrompt + '\n';
    });
    finalPrompt += '\n';
  }
  
  // 4. Add closing reinforcement
  finalPrompt += SYSTEM_PROMPT.closingReinforcement;
  
  return finalPrompt;
}

export function buildNegativePrompt(
  activeFixtures: FixtureType[],
  allFixtureTypes: FixtureType[]
): string {
  let negPrompt = '';
  
  // 1. Start with global anti-hallucination negative prompt
  negPrompt += SYSTEM_PROMPT.globalNegativePrompt + ', ';
  
  // 2. Add specific negative prompts for disabled fixtures
  const disabledFixtures = allFixtureTypes.filter(
    f => !activeFixtures.some(af => af.id === f.id)
  );
  
  disabledFixtures.forEach(fixture => {
    negPrompt += fixture.negativePrompt
      .replace('HARD RULE: ', '')
      .replace('ABSOLUTE PROHIBITION: ', '')
      .replace(/\(.*?\)/g, '') + ', ';
  });
  
  return negPrompt.trim().replace(/,\s*$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURE TYPES - Parent category definitions with nested sub-options
// ═══════════════════════════════════════════════════════════════════════════════

export const FIXTURE_TYPES: FixtureType[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // UP LIGHTS - Ground-mounted accent lights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'up',
    label: 'Up Lights',
    description: 'Ground-mounted accent lights',
    positivePrompt: `CATEGORY ENABLED: Ground-Mounted Up Lights.
FIXTURE STYLE: Small brass/bronze cylinder ground stakes, low-profile, nearly invisible at night.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Do not place uplights unless a sub-option specifies the target.`,
    negativePrompt: `HARD RULE: Do NOT generate any ground-mounted up lights. The base of the house, walls, columns, and landscaping must remain completely dark at ground level. No uplighting of any kind.`,
    subOptions: [
      {
  id: 'siding',
  label: 'Siding',
  description: 'Ground staked up lights on wall piers between windows',
  prompt: `TARGET: Wall piers / siding sections between windows

WHAT TO LIGHT:
- Every vertical wall section BETWEEN windows across facade
- Include corner siding at far LEFT and far RIGHT of structure
- Include blank wall expanses with no windows

PLACEMENT:
- ONE fixture at BASE of each wall pier
- Start at FAR LEFT corner, then FAR RIGHT corner, fill inward
- Wide piers (>6 ft): two fixtures at 1/3 points
- Narrow piers (<2 ft): single centered fixture
- Beam MUST reach soffit/roofline

EXCLUSIONS:
- Do NOT place directly under windows (windows get separate fixtures if selected)
- Do NOT place on concrete/hardscape

COMPATIBILITY (when other sub-options also selected):
- If WINDOWS selected: place siding fixtures ONLY between windows, not under them
- If COLUMNS selected: skip wall sections occupied by columns
- If ENTRYWAY selected: skip wall sections within 6 feet of entry door`,
  negativePrompt: `ABSOLUTE PROHIBITION (SIDING): skip the corners/ends of the home - both left and right ends MUST have up lights. start placement in the middle of the facade.place up lights directly under windows.  place on concrete, hardscape, or open lawn - ONLY in landscaping beds.  aim beams at window glass.`,
  darkDescription: `Wall piers between windows remain PITCH BLACK - zero ground-staked fixtures between windows, no vertical light columns on siding sections, wall surfaces show only ambient spill from adjacent lit features if any, siding texture invisible in darkness.`

      },
      {
  id: 'windows',
  label: '1st Story Windows',
  description: 'Centered on glass (single) or mullion between (double)',
  prompt: `TARGET: First-story window assemblies - centered uplighting

WHAT TO LIGHT:
- ALL first-story windows: single, double, triple, picture, bay
- Illuminates window glass, frame, trim, casing, sill and above to the soffit line

PLACEMENT BY WINDOW TYPE:
- SINGLE window: center on glass horizontal middle
- DOUBLE/MULLED window: center on mullion between panes
- TRIPLE window: center on middle pane
- BAY window: one fixture per flat section
- ONE fixture per window - no exceptions

OBSTRUCTION RULE:
- IGNORE landscaping - place fixture BEHIND foliage if needed
- Do NOT skip windows due to plants
- Do NOT relocate off-center to avoid plants

EXCLUSIONS:
- Do NOT place on wall piers between windows (siding handles those)
- Do NOT aim directly at glass surface

COMPATIBILITY:
- If SIDING also selected: windows get centered fixtures, wall piers get separate siding fixtures
- These are complementary, not overlapping`,
  negativePrompt: `ABSOLUTE PROHIBITION (1ST STORY WINDOWS): Do NOT place fixtures off-center from windows. Do NOT skip windows due to landscaping. Do NOT place on wall piers between windows. Do NOT aim directly at glass. Do NOT use multiple fixtures per window. ONE fixture centered under each window only.`,
  darkDescription: `First-story windows receive NO dedicated ground fixtures - no centered uplights below windows, window frames and casings remain dark, glass shows only ambient reflection from other light sources if any, window assemblies appear as dark rectangles against facade.`
},
      {
        id: 'entryway',
        label: 'Entryway',
        description: 'Flanking main entry door',
        prompt: `TARGET: Main entryway - flanking uplights

WHAT TO LIGHT:
- PRIMARY entrance door and surrounding architecture
- Trim, casing, sidelights, transom, columns, portico

PLACEMENT:
- EXACTLY TWO fixtures: one LEFT, one RIGHT of entry door
- Beams angled slightly inward, converging above door
- Must be SYMMETRICAL pair

PLACEMENT BY SCENARIO:
- COLUMNS flank door: at base of each column
- SIDELIGHTS flank door: at outer edges of sidelight assembly
- PLAIN WALL: at outer edges of door casing
- PORTICO above: angle to illuminate underside of overhang

EXCLUSIONS:
- No fixtures in CENTER of walkway (trip hazard)
- No fixtures on concrete, pavers, or steps
- Door is FRAMED by light, not blasted with light

COMPATIBILITY (when other sub-options also selected):
- Entryway takes PRIORITY over siding/windows/columns within entry zone
- If columns flank the entry: entryway fixtures at column bases replace column fixtures`,
        negativePrompt: `ABSOLUTE PROHIBITION (ENTRYWAY): Do NOT place lights in the center walking path. Do NOT place only one fixture -- must be a symmetrical pair. Do NOT aim lights directly at the door surface.`,
        darkDescription: `Entry door has NO flanking uplights - doorway and surrounding trim remain completely dark, no symmetrical fixture pair at entry, door frame and architectural portal unlit, entry appears as dark void in facade.`
      },
      {
        id: 'columns',
        label: 'Columns',
        description: 'Base of architectural pillars',
        prompt: `TARGET: Architectural columns, pillars & posts

WHAT TO LIGHT:
- ALL vertical columnar elements: round columns, square pillars, porch posts, pilasters, stone/brick piers
- Beam MUST reach capital, entablature, and soffit above

PLACEMENT:
- ONE fixture at BASE of EACH column, centered on front face
- EACH column in a row gets its own fixture

SETBACK BY SURFACE:
- Textured (stone/brick/fluted): 3-6 inches for dramatic graze
- Smooth (painted wood/vinyl): 6-8 inches for soft wash

EXCLUSIONS:
- No fixtures in gaps BETWEEN columns
- No fixtures on porch floor or deck surface
- Spaces between columns stay darker for contrast

COMPATIBILITY (when other sub-options also selected):
- Columns take PRIORITY at column locations over siding
- If ENTRYWAY selected AND columns flank door: entryway takes priority at entry columns`,
        negativePrompt: `ABSOLUTE PROHIBITION (COLUMNS): Do NOT place lights in the open space between columns. Do NOT skip columns in a row -- all must be lit for symmetry. Do NOT use broad flood fixtures.`,
        darkDescription: `Column bases remain UNLIT - no ground fixtures at pillar bases, column shafts show only ambient spill from adjacent lights, capitals and entablature dark, columns appear as dark silhouettes against facade.`
      },
      {
  id: 'trees',
  label: 'Trees',
  description: 'Uplighting trees and large shrubs',
  prompt: `TARGET: Trees & large shrubs - canopy uplighting

WHAT TO LIGHT:
- ALL significant trees within 15 feet of the home
- Deciduous, evergreens, ornamental trees, large specimen shrubs
- Illuminates trunk, branches, and canopy

PLACEMENT BY TREE SIZE:
- SMALL trees (under 15 ft): ONE fixture, 1-2 feet from trunk
- MEDIUM trees (15-25 ft): ONE or TWO fixtures
- LARGE trees (over 25 ft): TWO or THREE fixtures around trunk base
- Multi-trunk trees: illuminate each major trunk
- Angle beam UP into canopy center

EXCLUSIONS:
- Do NOT aim toward windows or neighbor properties
- Do NOT over-light small trees with multiple fixtures
- Use landscaping beds when possible, not open lawn`,
  negativePrompt: `ABSOLUTE PROHIBITION (TREES): Do NOT aim tree lights toward house windows. Do NOT place in open lawn if avoidable. Do NOT over-light small trees with multiple fixtures.`,
  darkDescription: `Trees remain DARK silhouettes - no ground fixtures near trunks, no upward beams into canopy, tree forms visible only against night sky, trunk texture invisible, canopy unlit, trees appear as natural dark shapes.`
     }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH LIGHTS - Post-mounted landscape lights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'path',
    label: 'Path Lights',
    description: 'Post-mounted walkway lights',
    positivePrompt: `CATEGORY ENABLED: Path Lights.
FIXTURE STYLE: Cast brass "china hat" or dome-top path light, 22 inches tall, solid brass with aged bronze patina, 360-degree omnidirectional distribution, creates 6-8 foot diameter light pools.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Do not place path lights unless a sub-option specifies the target area.`,
    negativePrompt: `HARD RULE: Do NOT generate any post-mounted path lights. Walkways, driveways, and garden beds must remain dark. No path lighting of any kind.`,
    subOptions: [
      {
  id: 'pathway',
  label: 'Pathway',
  description: 'Walkways & sidewalks',
  prompt: `TARGET: Pedestrian walkways & sidewalks

WHAT TO LIGHT:
- Front walk from street/driveway to front door
- Side paths, garden paths, patio transitions
- NOT driveways (use driveway preset for those)

PLACEMENT:
- IN landscaping beds/mulch ALONGSIDE the path, NOT in the path itself
- STAGGERED ZIGZAG pattern: alternate left and right sides
- Spacing: 8-10 feet apart
- First fixture: near path start; Last fixture: near destination
- Pools should TOUCH or SLIGHTLY OVERLAP - no dark gaps

EXCLUSIONS:
- Do NOT place ON concrete, pavers, or hardscape
- Do NOT place IN the walking path - always in adjacent beds
- Do NOT place along driveways`,
  negativePrompt: `ABSOLUTE PROHIBITION (PATHWAY): Do NOT place path lights on concrete or pavement. Do NOT place path lights IN the walkway. Always place in adjacent landscaping beds. Do NOT place along driveways. Do NOT create dark gaps between light pools.`,
  darkDescription: `Walkways have NO path lights - sidewalks and pedestrian paths remain completely dark, no post-mounted fixtures along paths, no light pools on walking surfaces, path edges undefined in darkness, walking surfaces visible only by ambient moonlight.`
},
      {
        id: 'driveway',
        label: 'Driveway',
        description: 'Along vehicle entry',
        prompt: `TARGET: Driveway edges - vehicle entry delineation

WHAT TO LIGHT:
- BOTH SIDES of driveway from apron (street) to terminus (garage)
- Define the vehicle corridor with light pools

PLACEMENT BY LENGTH:
- SHORT driveways (<40 ft): PARALLEL - fixtures across from each other, 10-12 ft apart
- LONG driveways (40+ ft): STAGGERED ZIGZAG - alternating left/right, 10-15 ft apart
- First fixtures: at driveway apron (one on each side)
- Last fixtures: near garage/terminus
- Pools should TOUCH or OVERLAP - no dark gaps

CURVES:
- Place fixtures CLOSER on curves (8-10 ft apart)
- Add extra fixture on inside of tight turns

EXCLUSIONS:
- No fixtures ON driveway pavement
- No fixtures along pedestrian walkways (use pathway preset)
- No single-side lighting on driveways over 20 ft`,
        negativePrompt: `ABSOLUTE PROHIBITION (DRIVEWAY): Do NOT place path lights on driveway pavement. Do NOT use single-side lighting on long driveways. Do NOT leave dark gaps between pools. Do NOT place along pedestrian walkways.`,
        darkDescription: `Driveway edges have NO path lights - vehicle entry corridor unlit, no brass post fixtures flanking drive, driveway pavement edges undefined in darkness, no glowing corridor effect, driveway appears as dark surface visible only by moonlight.`
      },
      {
        id: 'landscaping',
        label: 'Landscaping',
        description: 'Garden beds & planters',
        prompt: `TARGET: GARDEN BEDS & PLANTERS -- INTERIOR BED ILLUMINATION

IDENTIFICATION:
- Locate all planting beds: foundation beds along house, island beds in lawn, border beds along fences/walls, raised planters
- Distinguish from pathway edges and driveway borders

FIXTURE SPECIFICATIONS:
- Style: cast brass "china hat" or dome-top path light
- Height: 22 inches tall
- Material: solid brass with aged bronze patina finish
- Light distribution: 360-degree omnidirectional downward projection
- Ground light pool diameter: approximately 6-8 feet

PLACEMENT GEOMETRY:
- Place fixtures INSIDE the planting beds, NOT along bed edges

PLACEMENT BY BED TYPE:
- FOUNDATION BEDS: 2-3 feet out from foundation wall; 6-8 feet apart along bed length; illuminates bed depth; avoid direct contact with house wall
- ISLAND BEDS: scattered through bed interior; organic/naturalistic pattern; 1-2 fixtures for small beds; larger beds may need multiple
- BORDER BEDS: staggered through bed depth; light reveals layered plantings; 6-8 feet apart
- RAISED PLANTERS: within planter soil among plants; 1 fixture per small planter; multiple for large planters; light spills over planter edges

VEGETATION INTERACTION:
- 22-inch height is slightly taller than most groundcover and low shrubs
- Light creates a "glow from within" the garden
- Illuminates foliage from above and within
- Reveals plant textures, colors, and layering

LIGHT BEHAVIOR:
- 360-degree downward/outward projection
- Overlapping pools illuminate bed interior
- Soft shadows add depth and interest
- Light spills onto mulch and foliage

NATURALISTIC PLACEMENT:
- Avoid perfectly even spacing -- beds are organic
- Cluster 2-3 fixtures in larger beds for natural groupings
- Position near focal plants (specimen shrubs, ornamental grasses)
- Catch textures of interesting foliage

FIXTURE VISIBILITY:
- Daytime: fixtures partially obscured by foliage
- Nighttime: brass fixtures glow warmly among plants

STRICT EXCLUSION ZONES:
- Do NOT place fixtures along walkway edges (use pathway preset)
- Do NOT place along driveway edges (use driveway preset)
- Do NOT place in open lawn areas
- Do NOT place on hardscape surfaces
- Do NOT place on extreme outer edge of beds
- Do NOT place directly against foundation or fences
- No uplighting -- downward 360-degree spread only`,
        negativePrompt: `ABSOLUTE PROHIBITION (LANDSCAPING): Do NOT place path lights along walkways or driveways. Do NOT place on bed edges. Do NOT place in open lawn. Interior bed placement only.`,
        darkDescription: `Garden beds have NO interior path lights - planting areas remain dark, no post fixtures within landscaping beds, mulch and foliage unlit from within, beds appear as dark masses, no "glow from within" garden effect.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE DRILL - Flush-mounted in-ground lights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'coredrill',
    label: 'Core Drill Lights',
    description: 'Flush-mounted in-grade lights',
    positivePrompt: `CATEGORY ENABLED: Core Drill (In-Grade) Lights.
FIXTURE STYLE: Flush-mounted well lights recessed into concrete/pavers, brass or stainless housing with tempered glass lens, level with grade, zero protrusion, vehicle-rated where applicable.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only place lights in the hardscape surfaces specified by active sub-options.`,
    negativePrompt: `HARD RULE: Do NOT generate any flush-mounted core drill lights. Do NOT embed any lights in concrete, pavers, or hardscape surfaces. All ground surfaces remain unlit.`,
    subOptions: [
      {
        id: 'garage_sides',
        label: 'Garage Sides',
        description: 'Piers flanking & between doors',
        prompt: `TARGET: Garage piers - wall grazing from in-ground fixtures

WHAT TO LIGHT:
- ALL vertical wall surfaces (piers) flanking garage doors
- FAR LEFT pier, FAR RIGHT pier, and CENTER pier(s) between doors

FIXTURE COUNT BY CONFIGURATION:
- SINGLE-CAR GARAGE: 2 fixtures (left + right piers)
- DOUBLE-WIDE DOOR: 2 fixtures (left + right piers)
- TWO SINGLE DOORS with center pier: 3 fixtures
- THREE-CAR GARAGE: 4 fixtures

PLACEMENT:
- Drill into driveway concrete at BASE of each pier
- Distance from wall: 4-6 inches for proper grazing angle
- Centered on pier width, ONE fixture per pier
- Beam MUST reach soffit above garage

EXCLUSIONS:
- Do NOT place IN FRONT OF garage doors
- Do NOT place in center of driveway driving path
- Do NOT aim beams at door panels - piers only`,
        negativePrompt: `ABSOLUTE PROHIBITION (GARAGE SIDES): Do NOT place lights in front of garage doors. Do NOT place in center of driveway. Do NOT use protruding fixtures. Flush-mount in concrete only, aimed at PIERS.`,
        darkDescription: `Garage piers remain UNLIT - no flush-mounted well lights at pier bases, no vertical light columns grazing pier faces, garage pier texture invisible, piers appear as dark vertical surfaces flanking doors.`
      },
      {
        id: 'garage_door',
        label: 'Garage Door',
        description: 'Wash light on door face and siding above',
        prompt: `TARGET: Garage door panels - wall washing from in-ground fixtures

WHAT TO LIGHT:
- Each garage door panel AND wall above to soffit
- Use WIDE beam (wall wash, not narrow graze)

FIXTURE COUNT BY DOOR TYPE:
- SINGLE DOOR: 1 fixture (centered)
- DOUBLE-WIDE DOOR: 2 fixtures (at 1/3 and 2/3 points)
- MULTIPLE SINGLE DOORS: 1 fixture per door

PLACEMENT:
- Drill into driveway concrete, CENTERED in front of each door
- Distance from door: 24-36 inches (further back than pier grazing)
- Light MUST wash door face AND continue above to soffit

EXCLUSIONS:
- Do NOT place at pier bases (garage_sides handles those)
- Do NOT use narrow grazing beams
- Do NOT use single fixture for double-wide doors`,
        negativePrompt: `ABSOLUTE PROHIBITION (GARAGE DOOR): Do NOT place lights at pier bases. Do NOT use narrow grazing beams. Light MUST wash above door to soffit. Do NOT place closer than 24 inches to door face.`,
        darkDescription: `Garage doors receive NO wash lighting - no flush well lights in front of doors, door panels remain dark, siding above doors unlit, garage doors appear as dark rectangles, no illumination from driveway surface.`
      },
      {
        id: 'sidewalks',
        label: 'Sidewalks',
        description: 'Embedded marker lights in walkways',
        prompt: `TARGET: Sidewalks & walkways - embedded marker lights

WHAT TO LIGHT:
- ALL concrete pedestrian walkways: front walk, side paths, entry paths
- Include paver/flagstone paths
- EXCLUDE: driveways (use driveway preset)

PLACEMENT PATTERN:
- STAGGERED EDGE (recommended): alternate left/right edges, 6-8 feet apart
- PARALLEL EDGE (wide paths >4 ft): both edges opposite each other
- SINGLE EDGE (narrow paths <3 ft): one side only

PLACEMENT SPECIFICS:
- Along path EDGES (not center), 2-3 inches from edge
- First fixture at path START, last at path END
- Extra fixtures at CURVES and STEPS (top and bottom)
- Maximum spacing: 10 feet

LIGHT BEHAVIOR:
- MARKER glow only (2-3 ft diameter pools)
- "Breadcrumb trail" effect on ground plane

EXCLUSIONS:
- Do NOT place in driveways
- Do NOT place in grass, lawn, or mulch
- Do NOT place in CENTER of wide walkways`,
        negativePrompt: `ABSOLUTE PROHIBITION (SIDEWALKS): Do NOT embed lights in driveways. Do NOT place in lawn or mulch. Do NOT aim at vertical walls. Edge placement only, not center of walkway.`,
        darkDescription: `Sidewalks have NO embedded marker lights - walkway concrete surfaces remain dark, no flush well lights embedded in paths, path edges undefined, no "breadcrumb trail" marker effect, walking surfaces visible only by ambient moonlight.`
      },
      {
        id: 'driveway',
        label: 'Driveway',
        description: 'Surface marker lights',
        prompt: `TARGET: Driveway surface - embedded edge markers

WHAT TO LIGHT:
- BOTH EDGES of driveway from apron (street) to terminus (garage)
- Include curves, turnarounds, and parking pads

PLACEMENT PATTERN:
- STAGGERED EDGE: alternate left/right, 10-15 feet apart
- PARALLEL EDGE: both edges opposite each other, 12-15 feet apart

PLACEMENT SPECIFICS:
- First fixtures: at APRON (street entry), one on each side
- Last fixtures: near TERMINUS (garage/parking)
- Setback from edge: 3-4 inches
- On curves: place CLOSER (8-10 feet apart)

LIGHT BEHAVIOR:
- MARKER glow only (2-4 ft diameter pools)
- "Runway" edge definition effect on ground plane

EXCLUSIONS:
- Do NOT place along pedestrian walkways (use sidewalks preset)
- Do NOT place in grass, lawn, or beds
- Do NOT aim at vertical walls`,
        negativePrompt: `ABSOLUTE PROHIBITION (DRIVEWAY): Do NOT embed lights along pedestrian walkways. Do NOT place in grass or beds. Do NOT aim at walls. Edge markers only, ground plane illumination.`,
        darkDescription: `Driveway has NO embedded surface markers - pavement edges undefined, no flush well lights in concrete/asphalt, no "runway" edge definition effect, driveway corridor appears as dark surface, edges visible only by moonlight reflection.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GUTTER - Gutter-mounted up lights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'gutter',
    label: 'Gutter Up Lights',
    description: 'Roofline accent lights',
    positivePrompt: `CATEGORY ENABLED: Gutter-Mounted Up Lights.

WHEN SELECTED THERE MUST ONLY BE UP LIGHTS MOUNTED IN THE FIRST STORY GUTTER SHINING UPWARDS TO ILLUMINATE 2nd STORY FEATURES (DORMERS, GABLES, 2nd STORY FACADE).

GUTTER MOUNTED UP LIGHTS ONLY - These shoot UPWARD:
- GUTTER MOUNTED UP LIGHT: Visible bullet/flood fixture sits IN the metal gutter trough mounted inside the gutter inner wall, beam shoots UPWARD
- The fixture is VISIBLE - you can see the bronze housing peaking out of the gutter
- Light goes UP toward the 2nd story features, illuminating up from the gutter
- The illuminated area is ABOVE where the fixture is mounted

FIXTURE STYLE: Compact brass bullet or mini flood up light with gutter-mount bracket, low-profile, mounts INSIDE the gutter trough ONLY.
HARD RULE - MANDATORY: Gutter up lights MUST be placed INSIDE the gutter trough. They sit IN the gutter channel itself. NEVER place these fixtures on the roof, on roof shingles, on the gutter lip edge, or on any roof surface. The fixture must be INSIDE the gutter.

MOUNTING PHYSICS - CRITICAL:
- Fixture MUST be mounted against the INNER GUTTER WALL (the wall closest to the house/fascia)
- The fixture sits INSIDE the gutter channel, braced against the inner wall
- Light beam projects UPWARD at an angle to reach the target (dormer, gable, or facade)
- The beam MUST reach its target NO MATTER THE DISTANCE from the gutter
- For distant targets: use higher wattage, narrower beam angles
- For close targets: use lower wattage, wider beam angles
- The light ALWAYS reaches and illuminates the intended target fully - never falls short

INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only illuminate the specific upper-story features specified (dormers, gables, second story facade). Do not light the entire roofline.`,
    negativePrompt: `HARD RULE: Do NOT generate any gutter-mounted lights. Dormers, gables, second story facade, and upper roofline features must remain dark. No uplighting or downlighting from gutter or fascia level.`,
    subOptions: [
      {
        id: 'dormers',
        label: 'Dormers',
        description: 'Illuminating dormer faces',
        prompt: `TARGET: Dormers - gutter-mounted uplights

WHAT TO LIGHT:
- ALL dormers on the roofline: gable, shed, hipped, eyebrow types
- Wash the dormer FACE (front wall, trim, window frame)

COUNT RULE (CRITICAL):
- EXACTLY ONE (1) fixture per dormer
- 2 dormers = 2 lights, 3 dormers = 3 lights
- Do NOT use multiple lights per dormer

PLACEMENT:
- Mount INSIDE gutter trough directly BELOW each dormer
- CENTERED horizontally under the dormer
- Beam MUST reach and fully illuminate dormer face (10-25 ft distance)

EXCLUSIONS:
- Do NOT mount on dormer face, dormer roof, or main roof shingles
- Do NOT aim directly into window glass
- Do NOT skip dormers - all should be lit for balance

COMPATIBILITY (when other sub-options selected):
- Dormers takes PRIORITY over secondStoryFacade for dormer features
- If secondStoryFacade selected: dormers handles all dormer illumination`,
        negativePrompt: `ABSOLUTE PROHIBITION (DORMERS): EXACTLY ONE VERY SMALL DARK BRONZE light per dormer - no more, no less. Fixture must be TINY and mount INSIDE the gutter inner wall , CENTERED directly below dormer. Do NOT use large fixtures. Do NOT use brass or silver fixtures. Do NOT mount on gutter lip or fascia. Do NOT mount multiple lights per dormer. Do NOT place lights between dormers. Do NOT mount on dormer surface or roof shingles. Do NOT aim into window glass.`,
        darkDescription: `Dormers remain UNLIT - no gutter-mounted uplights below dormers, dormer faces completely dark, dormer windows show only ambient reflection, dormers appear as dark shapes against roofline, no upward wash on dormer siding or trim.`
      },
    
      {
        id: 'secondStoryFacade',
        label: '2nd Story Windows, Sidings, & Peaks',
        description: 'Complete facade uplighting including windows, siding, and peaks',
        prompt: `TARGET: 2nd story windows & peaks - first-story gutter-mounted uplights

WHAT TO LIGHT:
- ENTIRE 2nd story facade: windows, siding, trim, AND peaks above
- Light shining up on 2nd story windows IS ACCEPTABLE and DESIRED
- Include towers, turrets, pop-outs, windows, siding, box bays - any 2nd story section

WHICH GUTTER (CRITICAL):
- Mount in FIRST STORY gutter ONLY (typically 8-10 feet high off the ground)
- ANY first-story gutter with a 2nd story above it is ELIGIBLE
- Beam shoots UPWARD to illuminate 2nd story facade and peaks
- Do NOT soffit from the 2nd story

FIXTURE COUNT BY FACADE WIDTH:
- Narrow (8-12 ft): 2-3 fixtures
- Medium (12-20 ft): 3-4 fixtures
- Wide (20+ ft): 4-6 fixtures
- Space 4-6 feet apart for even coverage
- At least ONE fixture positioned to illuminate any area or peak above

PLACEMENT:
- Distribute across facade to cover windows, siding, AND peaks
- Use visual anchors: "below window 1", "between windows 2-3", "centered under peak" "bigger peaks add 2 lights"
- Ensure FULL coverage of 2nd story facade with up lighting
- For multi-section homes: fixtures in EACH first story gutter 

PEAK ILLUMINATION (when present):
- Beam MUST continue PAST windows upwards to graze gable face to APEX
- Creates dramatic vertical emphasis: windows and siding glowing + peak lit above

EXCLUSIONS:
- Do NOT mount in roofline gutter (top of house)
- Do NOT confuse with DORMERS (use dormers preset for dormers)

COMPATIBILITY (when other sub-options selected):
- If DORMERS selected: skip fixtures directly below dormers`,
        negativePrompt: `ABSOLUTE PROHIBITION (2ND STORY WINDOWS & PEAK): Do NOT illuminate second story facade from first story gutter. Do NOT mount uplights in first story gutter. Do NOT wash upper walls, windows, or peaks with upward light. Second story facade and gable peaks must remain dark. No gutter-mounted uplighting on second story.`,
        darkDescription: `Second story facade and peaks remain DARK - no gutter-mounted uplights from first story level, 2nd story windows unlit, upper siding texture invisible, peaks above 2nd story completely dark, upper facade appears as dark silhouette against sky.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFFIT - Recessed downlights in roof overhangs
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'soffit',
    label: 'Soffit Lights',
    description: 'Recessed roof overhang lights',
    positivePrompt: `CATEGORY ENABLED: Soffit Downlights.
FIXTURE STYLE: Recessed canless LED downlights or slim LED soffit lights, flush-mounted in soffit, exterior IP65+ rated.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only illuminate the specific targets below (windows, columns, siding, peaks) as specified. Do not generate when not selected as a sub-option`,
    negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT): The roof eaves and soffits must be PITCH BLACK. You must TURN OFF and REMOVE any existing soffit lights found in the original image. Zero light is permitted from roof overhangs under any circumstance.`,
    subOptions: [
      {
        id: 'windows',
        label: 'Windows',
        description: 'Above first floor windows',
        prompt: `TARGET: SOFFIT ABOVE WINDOWS -- DOWNLIGHT GRAZING WINDOW FRAMES

IDENTIFICATION:
- Locate ALL first-story windows with soffit directly above
- Include: single windows, double/mulled windows, picture windows, bay windows
- Identify window centerline for fixture alignment

FIXTURE SPECIFICATIONS:
- Type: recessed canless LED downlight or slim LED soffit light
- Installation: flush-mounted in soffit, no protrusion below soffit plane
- Rating: exterior IP65+ minimum
- Beam spread: 15-30 degrees (narrow for grazing)

PLACEMENT GEOMETRY:
- Place ONE fixture per window (or window group)
- Position fixture CENTERED horizontally on window centerline
- Depth from wall: 6-12 inches into soffit (close to wall for grazing effect)

ALIGNMENT:
- HORIZONTAL: centered on window width
- DEPTH: 6-12 inches from wall face (closer = more dramatic graze)

LIGHT PHYSICS:
- Beam projects DOWNWARD from soffit
- GRAZES the window frame, trim, and casing
- Reveals trim profiles and architectural details
- Light continues down to illuminate windowsill and wall below
- Creates vertical accent on window assembly

FIXTURE VISIBILITY:
- Daytime: small recessed fixture in soffit -- subtle
- Nighttime: window frames glow; fixture hidden in soffit shadow

STRICT EXCLUSION ZONES:
- Do NOT place fixtures above solid wall sections/piers BETWEEN windows (use siding preset)
- Do NOT place fixtures above columns (use columns preset)
- Do NOT place fixtures randomly across soffit
- ONE fixture per window -- no doubling
- Maintain consistent spacing rhythm with windows`,
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT WINDOWS): Do NOT place soffit lights above solid wall sections. Do NOT place above columns. Windows only, centered on each window.`,
        darkDescription: `Soffit areas above windows remain PITCH BLACK - no recessed downlights above windows, window frames receive no downward grazing light, window trim unlit from above, eave underside directly above windows completely dark.`
      },
      {
        id: 'columns',
        label: 'Columns',
        description: 'Above architectural pillars',
        prompt: `TARGET: SOFFIT ABOVE COLUMNS -- DOWNLIGHT ON COLUMN SHAFTS

IDENTIFICATION:
- Locate ALL architectural columns, pillars, and porch posts with soffit directly above
- Types: round columns, square pillars, tapered columns, pilasters
- Identify column centerline for fixture alignment

FIXTURE SPECIFICATIONS:
- Type: recessed canless LED downlight or slim LED soffit light
- Installation: flush-mounted in soffit, no protrusion below soffit plane
- Rating: exterior IP65+ minimum
- Beam spread: 15-25 degrees (narrow for column shaft)

PLACEMENT GEOMETRY:
- Place ONE fixture per column
- Position fixture CENTERED directly above column axis
- Depth from wall: as close to back edge of soffit as possible (to graze column face)

ALIGNMENT:
- HORIZONTAL: centered on column width/diameter
- DEPTH: near back of soffit to maximize grazing angle on column face

LIGHT PHYSICS:
- Beam projects DOWNWARD from soffit
- Illuminates column CAPITAL (top detail)
- Light travels DOWN the column SHAFT
- Grazes column surface to reveal fluting, texture, or panel details
- Illuminates column BASE
- Creates dramatic vertical emphasis

COLUMN LIGHTING ANATOMY:
- Capital: brightest (closest to fixture)
- Shaft: even illumination traveling downward
- Base: receives full light travel
- Floor/porch: ambient spill around column base

FIXTURE VISIBILITY:
- Daytime: recessed fixture above column -- minimal visibility
- Nighttime: column glows dramatically; fixture hidden

STRICT EXCLUSION ZONES:
- Do NOT place fixtures above windows (use windows preset)
- Do NOT place fixtures above solid wall/siding sections (use siding preset)
- Do NOT skip columns in a row -- all columns must be lit for symmetry
- ONE fixture per column`,
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT COLUMNS): Do NOT place soffit lights above windows. Do NOT place above wall sections. Columns only, one fixture centered above each column.`,
        darkDescription: `Soffit areas above columns remain PITCH BLACK - no recessed downlights above columns, column capitals receive no downward light, column shafts unlit from above, eave underside directly above columns completely dark.`
      },
      {
        id: 'siding',
        label: 'Siding',
        description: 'Above wall piers',
        prompt: `TARGET: SOFFIT ABOVE WALL PIERS -- DOWNLIGHT GRAZING SIDING TEXTURE

IDENTIFICATION:
- Locate ALL vertical wall sections (piers) BETWEEN windows with soffit directly above
- These are the solid wall areas, not window or column locations
- Identify pier centerline for fixture alignment

FIXTURE SPECIFICATIONS:
- Type: recessed canless LED downlight or slim LED soffit light
- Installation: flush-mounted in soffit, no protrusion below soffit plane
- Rating: exterior IP65+ minimum
- Beam spread: 15-25 degrees (narrow for wall grazing)

PLACEMENT GEOMETRY:
- Place ONE fixture per wall pier section
- Position fixture CENTERED horizontally on pier width
- Depth from wall: 6-8 inches into soffit (close for dramatic texture graze)

ALIGNMENT:
- HORIZONTAL: centered on pier width (between windows)
- DEPTH: 6-8 inches from wall face

LIGHT PHYSICS:
- Beam projects DOWNWARD from soffit
- GRAZES the wall surface to reveal texture
- Effective on: lap siding, board and batten, brick, stone, stucco
- Creates vertical light stripe on wall section
- Scalloped pattern emerges when multiple piers are lit

TEXTURE REVELATION:
- Lap siding: horizontal shadow lines
- Board and batten: vertical shadow lines
- Brick/stone: mortar joint shadows, surface irregularities
- Stucco: subtle texture patterns

VISUAL RHYTHM:
- Alternating pattern: window (dark or window-lit) / pier (soffit-lit) / window / pier
- Creates rhythmic facade illumination

FIXTURE VISIBILITY:
- Daytime: small fixtures between window positions
- Nighttime: wall sections glow; scalloped pattern visible

STRICT EXCLUSION ZONES:
- Do NOT place fixtures above windows (use windows preset)
- Do NOT place fixtures above columns (use columns preset)
- Wall pier sections ONLY
- Maintain consistent rhythm with architectural elements`,
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT SIDING): Do NOT place soffit lights above windows. Do NOT place above columns. Wall pier sections only, between windows.`,
        darkDescription: `Soffit areas above wall piers remain PITCH BLACK - no recessed downlights above siding sections, wall pier texture receives no downward grazing, no scalloped illumination pattern, eave underside between windows completely dark.`
      },
      {
        id: 'peaks',
        label: 'Peaks',
        description: 'Apex of roof gables',
        prompt: `TARGET: SOFFIT AT PEAKS -- DOWNLIGHT FROM GABLE APEX

IDENTIFICATION:
- Locate ALL roof peaks and gables with accessible soffit at or near the apex
- Identify the highest point of the triangular gable soffit
- Note: not all gables have soffit at apex -- some have rake boards only

FIXTURE SPECIFICATIONS:
- Type: recessed canless LED downlight or slim LED soffit light
- Installation: flush-mounted in peak soffit area
- Rating: exterior IP65+ minimum
- Beam spread: 30-45 degrees (wider for apex coverage)

PLACEMENT GEOMETRY:
- Place ONE fixture per gable peak
- Position fixture as close to the APEX as soffit allows
- Center on gable's vertical centerline

ALIGNMENT:
- HORIZONTAL: centered on gable width
- VERTICAL: at apex or within 12-24 inches below apex point

LIGHT PHYSICS:
- Beam projects DOWNWARD from peak
- Washes the gable FACE (triangular wall section below)
- Illuminates gable vent, decorative trim, or accent window
- Light travels from apex toward gutter line
- Creates inverted triangle of illumination

PEAK LIGHTING EFFECT:
- Apex is origin point of light
- Illumination spreads downward and outward
- Gable face texture revealed
- Dramatic crown effect on home

FIXTURE VISIBILITY:
- Daytime: fixture tucked in peak soffit -- hard to see from ground
- Nighttime: gable face glows from above; fixture hidden in shadow

STRICT EXCLUSION ZONES:
- Do NOT place fixtures in lower horizontal eave soffits (unless specifically requested)
- Do NOT place on sloped roof surfaces
- Peak/apex area ONLY
- ONE fixture per gable peak
- Do NOT use for dormers -- dormers have separate preset`,
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT PEAKS): Do NOT place in horizontal eave soffits unless requested. Do NOT place on roof surface. Peak apex location only, one per gable.`,
        darkDescription: `Peak soffits remain PITCH BLACK - no recessed downlights in gable apex soffits, gable faces receive no downward illumination from peak, triangular gable walls unlit from above, peak area completely dark.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HARDSCAPE - Linear under-cap lights for walls, columns & steps
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hardscape',
    label: 'Hardscape Lights',
    description: 'Linear/puck lights for walls & steps',
    positivePrompt: `CATEGORY ENABLED: Hardscape Lights.
FIXTURE STYLE: Linear LED light bars (7", 13", or 19" lengths), low-profile brass housing, 12V low-voltage, IP65+ rated, mounted UNDER capstones or tread nosings.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only install on the specific hardscape elements specified (columns, walls, steps).`,
    negativePrompt: `HARD RULE: Do NOT generate any hardscape lighting. Retaining walls, stone columns, and outdoor steps must remain dark. No under-cap or under-tread lighting.`,
    subOptions: [
      {
        id: 'columns',
        label: 'Columns',
        description: 'Under capstone of pillars',
        prompt: `TARGET: HARDSCAPE COLUMNS & PILLARS -- LINEAR UNDER-CAP LIGHTS FOR PILLAR FACE ILLUMINATION

IDENTIFICATION:
- Locate ALL hardscape columns and pillars: driveway entry pillars, fence post pillars, gate pillars, decorative landscape pillars
- Must have a CAPSTONE (flat top cap) with overhang
- Materials: stone, brick, block, stucco-covered

FIXTURE SPECIFICATIONS:
- Type: linear LED hardscape light bar
- Lengths: 7", 13", or 19" (match to pillar face width)
- Housing: low-profile brass
- Voltage: 12V low-voltage
- Rating: IP65+ minimum
- Mounting: UNDER the capstone overhang

PLACEMENT GEOMETRY:
- Mount fixture UNDER the capstone on each visible pillar face
- Fixture tucked into the shadow gap beneath cap overhang
- One fixture per visible face (freestanding pillars may need 2-4 fixtures)

PILLAR FACE PROTOCOL:
- FREESTANDING PILLAR (visible all sides): fixture on each visible face
- CORNER PILLAR: fixtures on 2 exposed faces
- WALL-END PILLAR: fixture on 1-2 exposed faces
- SINGLE-FACE PILLAR: 1 fixture on front face

ALIGNMENT:
- HORIZONTAL: centered on pillar face width
- VERTICAL: tucked under capstone, as high as possible

LIGHT PHYSICS:
- Light projects DOWNWARD from under cap
- WASHES the pillar face below
- Reveals texture: stone, brick, mortar joints, block pattern
- Brightest at top (near fixture), falloff toward base
- Illuminates full pillar shaft

TEXTURE REVELATION:
- Natural stone: irregular surfaces catch light dramatically
- Brick: mortar joints create grid shadow pattern
- Block: clean lines with subtle texture
- Stucco: smooth wash with edge shadows

FIXTURE VISIBILITY:
- Daytime: fixture hidden under cap overhang
- Nighttime: pillar face glows; fixture invisible

WIRING:
- Wires routed through pillar core or along back edge
- Connection at pillar base or underground

STRICT EXCLUSION ZONES:
- Do NOT place fixtures on RETAINING WALLS (use walls preset)
- Do NOT place fixtures on STEPS (use steps preset)
- Do NOT place on TOP of capstone
- Do NOT use exposed/surface-mounted fixtures
- UNDER-CAP mounting only`,
        negativePrompt: `ABSOLUTE PROHIBITION (HARDSCAPE COLUMNS): Do NOT place on retaining walls. Do NOT place on steps. Under-cap mounting on pillars only.`,
        darkDescription: `Hardscape columns/pillars remain UNLIT - no linear lights under capstones, pillar faces completely dark, stone/brick texture invisible, pillar shafts appear as dark vertical masses, no downward wash on pillar surfaces.`
      },
      {
        id: 'walls',
        label: 'Retaining Walls',
        description: 'Under capstone of walls',
        prompt: `TARGET: RETAINING WALLS & SEAT WALLS -- LINEAR UNDER-CAP LIGHTS FOR WALL FACE TEXTURE WASH

IDENTIFICATION:
- Locate ALL retaining walls and seat walls with capstones
- Types: landscape retaining walls, terraced walls, seat walls, raised planter walls, boundary walls
- Must have a CAPSTONE (flat top cap) with overhang
- Materials: natural stone, manufactured stone, brick, block, concrete with stone veneer

FIXTURE SPECIFICATIONS:
- Type: linear LED hardscape light bar
- Lengths: 7", 13", or 19" (multiple units for long walls)
- Housing: low-profile brass
- Voltage: 12V low-voltage
- Rating: IP65+ minimum
- Mounting: UNDER the capstone overhang

PLACEMENT GEOMETRY:
- Mount fixtures in a continuous or near-continuous line under capstone
- Fixture tucked into shadow gap beneath cap overhang

WALL LENGTH PROTOCOL:
- SHORT WALLS (<4 ft): single fixture centered, or 2 fixtures at 1/3 points
- MEDIUM WALLS (4-10 ft): fixtures every 2-3 feet
- LONG WALLS (10+ ft): continuous fixtures with minimal gaps (1-2 inch max)

ALIGNMENT:
- HORIZONTAL: evenly distributed along wall length
- VERTICAL: tucked under capstone, as high as possible

LIGHT PHYSICS:
- Light projects DOWNWARD from under cap
- WASHES the entire wall face below
- Reveals texture across full wall length
- Creates dramatic shadow play on textured surfaces
- Brightest at top, gradual falloff to base

WALL SEGMENTS:
- If wall has corners or angles, continue fixtures around corners
- Inside corners: fixture on each wall face meeting at corner
- Outside corners: wrap fixtures to illuminate both faces

SEAT WALL SPECIAL CONSIDERATION:
- Seat walls at seating height (~18") receive full wash
- Light falls onto patio/ground surface below
- Creates ambient glow in seating area

FIXTURE VISIBILITY:
- Daytime: fixtures hidden under cap shadow
- Nighttime: wall face glows continuously; fixtures invisible

WIRING:
- Wires routed along back of wall or through wall core
- Daisy-chain connection between fixtures

STRICT EXCLUSION ZONES:
- Do NOT place fixtures on COLUMNS/PILLARS (use columns preset)
- Do NOT place fixtures on STEPS (use steps preset)
- Do NOT place on TOP of capstone
- UNDER-CAP mounting only
- Do NOT leave large dark gaps between fixtures on long walls`,
        negativePrompt: `ABSOLUTE PROHIBITION (RETAINING WALLS): Do NOT place on columns/pillars. Do NOT place on steps. Under-cap mounting on walls only. No large gaps on long walls.`,
        darkDescription: `Retaining walls remain UNLIT - no linear lights under capstones, wall face texture invisible, stone/brick pattern hidden in darkness, walls appear as dark horizontal masses, no continuous glow along wall length.`
      },
      {
        id: 'steps',
        label: 'Steps',
        description: 'Under tread of stairs',
        prompt: `TARGET: OUTDOOR STEPS & STAIRS -- UNDER-TREAD LIGHTS FOR RISER ILLUMINATION AND SAFETY

IDENTIFICATION:
- Locate ALL outdoor steps and stairs: front entry steps, porch steps, deck stairs, landscape steps, terraced steps
- Must have a TREAD (horizontal step surface) with a nosing overhang
- Materials: stone, concrete, brick, pavers, composite decking

FIXTURE SPECIFICATIONS:
- Type: linear LED hardscape light bar or step light
- Lengths: 7", 13", or 19" (match to step width)
- Housing: low-profile brass
- Voltage: 12V low-voltage
- Rating: IP65+ minimum
- Mounting: UNDER the tread nosing (front edge of step)

PLACEMENT GEOMETRY:
- Mount fixture UNDER the nosing of each tread
- Fixture faces DOWNWARD to illuminate the riser below
- One fixture per step (centered on step width)

STEP COVERAGE PROTOCOL:
- EVERY STEP: fixture under each tread for full safety illumination
- ALTERNATING (budget option): fixture under every other tread
- TOP AND BOTTOM (minimum): at least illuminate first and last step

ALIGNMENT:
- HORIZONTAL: centered on step width
- VERTICAL: tucked under tread nosing, as far forward as possible

LIGHT PHYSICS:
- Light projects DOWNWARD from under tread
- Illuminates the RISER (vertical face below the tread)
- Light spills onto the NEXT TREAD below
- Creates clear visual definition of each step edge
- Critical for safety: shows exactly where each step is

STEP ANATOMY ILLUMINATION:
- Tread nosing: origin of light (fixture location)
- Riser: receives direct downward wash
- Next tread: receives forward spill, shows landing surface
- Shadow line: defines step edge clearly

SAFETY EMPHASIS:
- Primary purpose is SAFETY -- showing step edges in darkness
- Prevents trips and falls
- Each step clearly visible and defined
- Consistent illumination on all steps

FIXTURE VISIBILITY:
- Daytime: fixtures hidden under tread nosing
- Nighttime: risers glow; step edges clearly defined; fixtures invisible

WIRING:
- Wires routed along back of steps or through step structure
- Daisy-chain connection from step to step
- Connection typically at bottom or top of stair run

STRICT EXCLUSION ZONES:
- Do NOT place fixtures on COLUMNS/PILLARS (use columns preset)
- Do NOT place fixtures on RETAINING WALLS (use walls preset)
- Do NOT place on TOP of treads (trip hazard)
- Do NOT place on risers facing outward (glare)
- UNDER-TREAD mounting only`,
        negativePrompt: `ABSOLUTE PROHIBITION (STEPS): Do NOT place on columns/pillars. Do NOT place on retaining walls. Under-tread mounting only. Do NOT create trip hazards.`,
        darkDescription: `Outdoor steps remain UNLIT - no under-tread lighting, risers completely dark, step edges undefined in darkness, stair treads visible only by ambient moonlight, no safety illumination on steps.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WELL LIGHTS - In-ground recessed accent lights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'well',
    label: 'Well Lights',
    description: 'In-ground recessed accent lights',
    positivePrompt: `CATEGORY ENABLED: Well Lights (In-Ground Recessed Accent Lights).
FIXTURE STYLE: Flush-mounted in-ground well light, brass or composite housing, tempered glass lens, IP67+ rated, completely flush with grade, zero protrusion.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only illuminate the specific targets specified by active sub-options.`,
    negativePrompt: `HARD RULE: Do NOT generate any in-ground well lights. No flush-mounted ground fixtures. Tree bases, statues, and architectural features must remain dark at ground level. No uplighting from recessed ground fixtures.`,
    subOptions: [
      {
        id: 'trees',
        label: 'Trees',
        description: 'In-ground uplighting at tree bases',
        prompt: `TARGET: TREES -- IN-GROUND WELL LIGHTS FOR TREE UPLIGHTING

IDENTIFICATION:
- Locate significant trees: specimen trees, focal point trees, tree groupings
- Identify trunk base and canopy spread
- Consider tree height and canopy density

FIXTURE SPECIFICATIONS:
- Type: in-ground well light (recessed)
- Housing: brass or composite with tempered glass lens
- Installation: flush with grade at tree base
- Protrusion: ZERO
- Beam spread: narrow (10-15°) for tall trees, medium (25-35°) for spreading canopies

PLACEMENT GEOMETRY:
- Place 1-3 fixtures per tree depending on trunk size and canopy
- SMALL TREE (trunk <8"): 1 fixture, offset 12-18" from trunk
- MEDIUM TREE (trunk 8-18"): 2 fixtures, opposing sides, 18-24" from trunk
- LARGE TREE (trunk >18"): 2-3 fixtures, triangulated, 24-36" from trunk
- Angle beams to illuminate trunk AND canopy

LIGHT PHYSICS:
- Beam originates at ground level, projects upward through canopy
- Reveals bark texture on trunk
- Creates dramatic shadows in foliage
- Moonlight filtering effect through leaves
- Natural falloff at canopy edge

STRICT EXCLUSION ZONES:
- Do NOT place in lawn areas (landscape bed only)
- Do NOT place on hardscape surfaces
- Do NOT aim at windows or neighboring properties`,
        negativePrompt: `ABSOLUTE PROHIBITION (WELL TREES): Do NOT place in lawn areas. Do NOT place on hardscape. Do NOT aim at windows. Landscape bed placement only at tree bases.`,
        darkDescription: `Trees have NO in-ground well lights - no flush fixtures near trunk bases, tree trunks unlit, canopy receives no upward illumination, trees appear as dark silhouettes, bark texture invisible, no dramatic tree uplighting effect.`
      },
      {
        id: 'statues',
        label: 'Statues & Focal Points',
        description: 'Accent lighting for sculptures and features',
        prompt: `TARGET: STATUES & FOCAL POINTS -- IN-GROUND WELL LIGHTS FOR SCULPTURAL ACCENT

IDENTIFICATION:
- Locate garden statues, sculptures, fountains, decorative urns
- Identify water features, birdbaths, art installations
- Consider viewing angles and primary approach

FIXTURE SPECIFICATIONS:
- Type: in-ground well light (recessed)
- Housing: brass or composite with tempered glass lens
- Installation: flush with grade
- Protrusion: ZERO
- Beam spread: narrow to medium (15-25°) for focused accent

PLACEMENT GEOMETRY:
- Place 1-2 fixtures per focal point
- Distance from object: 12-24" depending on height
- Primary fixture at 30-45° angle to main viewing direction
- Secondary fixture (if used) for fill or dramatic shadow
- Cross-lighting for 3D sculptural effect

LIGHT PHYSICS:
- Dramatic uplighting reveals form and texture
- Creates strong shadows for depth
- Highlights material (bronze, stone, ceramic)
- Silhouette effect against dark background

STRICT EXCLUSION ZONES:
- Do NOT create glare toward viewing positions
- Do NOT overlight - maintain drama
- Do NOT place in water (unless rated)`,
        negativePrompt: `ABSOLUTE PROHIBITION (WELL STATUES): Do NOT create glare toward viewers. Do NOT overlight focal points. Do NOT place in water unless specifically rated.`,
        darkDescription: `Statues and focal points remain UNLIT - no in-ground well lights near sculptures, statues appear as dark shapes, fountain features unlit, decorative urns invisible in darkness, no dramatic accent lighting on focal points.`
      },
      {
        id: 'architectural',
        label: 'Architectural Features',
        description: 'Wall and column grazing from ground level',
        prompt: `TARGET: ARCHITECTURAL FEATURES -- IN-GROUND WELL LIGHTS FOR WALL/COLUMN GRAZING

IDENTIFICATION:
- Locate stone walls, textured surfaces, garden columns
- Identify architectural elements: chimneys, wing walls, pilasters
- Consider surface material and texture depth

FIXTURE SPECIFICATIONS:
- Type: in-ground well light (recessed)
- Housing: brass or composite with tempered glass lens
- Installation: flush with grade at feature base
- Protrusion: ZERO
- Beam spread: narrow (10-20°) for wall grazing

PLACEMENT GEOMETRY:
- Place fixtures 6-12" from wall face for grazing effect
- One fixture per 4-6 feet of wall length
- Center fixtures on columns/pilasters
- Stagger placement for natural rhythm

LIGHT PHYSICS:
- WALL GRAZING technique: close placement reveals texture
- Light travels vertically up surface
- Emphasizes stone coursing, mortar joints, brick pattern
- Creates dramatic shadows from surface irregularities
- Natural intensity falloff toward top

STRICT EXCLUSION ZONES:
- Do NOT place far from wall (grazing requires proximity)
- Do NOT aim at windows
- Do NOT use for smooth/flat surfaces (no texture to reveal)`,
        negativePrompt: `ABSOLUTE PROHIBITION (WELL ARCHITECTURAL): Do NOT place far from wall face. Do NOT aim at windows. Close placement required for grazing effect.`,
        darkDescription: `Architectural features have NO in-ground well lights - no flush fixtures at wall bases, stone walls unlit from ground level, chimney bases dark, textured surfaces invisible, no wall grazing from recessed ground fixtures.`
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMANENT HOLIDAY LIGHTS - RGB/RGBW track lighting on rooflines
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'holiday',
    label: 'Permanent Holiday',
    description: 'RGB roofline accent lighting',
    positivePrompt: `CATEGORY ENABLED: Permanent Holiday Lighting (RGB/RGBW Track Lights).
FIXTURE STYLE: Linear RGB or RGBW LED track/channel system, mounted along rooflines, eaves, and architectural trim. Individually addressable LEDs capable of any color or pattern.
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement and color schemes. These are permanent installations that can display any color year-round.`,
    negativePrompt: `HARD RULE: Do NOT generate any permanent holiday lighting. No RGB strips on rooflines. No colored accent lights on eaves, fascia, or architectural trim. Rooflines must remain unlit by colored LEDs.`,
    subOptions: [
      {
        id: 'roofline',
        label: 'Roofline',
        description: 'Along eaves and fascia boards',
        prompt: `TARGET: ROOFLINE -- PERMANENT RGB LED TRACK ALONG EAVES AND FASCIA

IDENTIFICATION:
- Locate ALL horizontal eave lines and fascia boards
- Include: front eaves, side eaves, garage eaves, porch overhangs
- Identify soffit/fascia junction where track mounts

FIXTURE SPECIFICATIONS:
- Type: linear RGB/RGBW LED track or channel system
- Housing: aluminum channel with diffuser lens
- Installation: mounted on fascia board, under soffit lip, or in J-channel
- LED type: individually addressable RGB or RGBW
- Spacing: continuous run along entire eave length

PLACEMENT GEOMETRY:
- Install track along FULL LENGTH of each horizontal eave
- Mount at fascia/soffit junction for clean appearance
- Continuous runs - no gaps between sections
- Corner connectors at direction changes
- Follow exact contour of roofline

LIGHT BEHAVIOR:
- LEDs illuminate DOWNWARD from track
- Creates glowing outline effect on roofline
- Color can be any RGB value or white
- Can display static colors, fades, chases, or patterns
- Even illumination along entire run

COLOR OPTIONS FOR VISUALIZATION:
- Warm white (everyday elegant)
- Cool white (modern/crisp)
- Single color accent (any RGB)
- Multi-color patterns (holiday themes)
- Subtle color temperature shifts

MOUNTING DETAILS:
- Track hidden from ground view when possible
- Clean, professional installation
- Weatherproof connections
- Controller/driver concealed in attic or soffit

STRICT EXCLUSION ZONES:
- Do NOT install on sloped roof surfaces
- Do NOT install on vertical walls (use peaks/gables preset)
- Do NOT leave gaps in continuous runs
- Horizontal eaves and fascia ONLY`,
        negativePrompt: `ABSOLUTE PROHIBITION (HOLIDAY ROOFLINE): Do NOT install on sloped roof surfaces. Do NOT install on vertical walls. Horizontal eaves and fascia only. No gaps in runs.`,
        darkDescription: `Roofline has NO permanent holiday lighting - no RGB LED track along eaves, fascia boards completely dark, no glowing outline effect on horizontal rooflines, eave edges appear as dark silhouette against sky.`
      },
      {
        id: 'peaks',
        label: 'Peaks & Gables',
        description: 'Outlining roof peaks and gable edges',
        prompt: `TARGET: PEAKS & GABLES -- PERMANENT RGB LED TRACK OUTLINING ROOF PEAKS

IDENTIFICATION:
- Locate ALL roof peaks, gables, and dormers
- Identify sloped rake edges (diagonal rooflines)
- Include: front gables, side gables, dormer peaks

FIXTURE SPECIFICATIONS:
- Type: linear RGB/RGBW LED track or channel system
- Housing: aluminum channel with diffuser lens
- Installation: mounted along rake boards (diagonal trim)
- LED type: individually addressable RGB or RGBW

PLACEMENT GEOMETRY:
- Install track along BOTH SLOPED EDGES of each gable
- Start at lower corners, meet at apex
- Creates inverted V or triangle outline
- Continuous runs from eave to peak
- Connect to horizontal eave runs at corners

LIGHT BEHAVIOR:
- LEDs illuminate outward from rake edge
- Outlines the triangular gable shape
- Apex becomes focal point where lines meet
- Color synchronized with roofline track
- Can create chase effects running to peak

PEAK CONFIGURATIONS:
- SIMPLE GABLE: two runs meeting at apex
- DORMER: outline dormer face and roof edges
- MULTIPLE PEAKS: each peak outlined individually
- CROSS GABLES: outline all visible edges

MOUNTING DETAILS:
- Track mounted on rake board face or under rake trim
- Weatherproof connections at apex
- Continuous with horizontal eave runs for seamless look

STRICT EXCLUSION ZONES:
- Do NOT outline windows (separate preset if needed)
- Do NOT skip peaks - outline all prominent gables
- Do NOT leave apex unconnected
- Both sloped edges MUST be lit for symmetry`,
        negativePrompt: `ABSOLUTE PROHIBITION (HOLIDAY PEAKS): Do NOT outline windows. Do NOT skip prominent peaks. Both sloped edges must be lit. Apex must be connected.`,
        darkDescription: `Peaks and gables have NO permanent holiday lighting - no RGB LED track along rake edges, gable triangles unoutlined, apex unmarked, sloped rooflines appear as dark shapes against sky, no inverted V lighting effect.`
      }
    ]
  }
];


export const COLOR_TEMPERATURES: ColorTemperature[] = [
  {
    id: "2700k",
    kelvin: "2700K",
    color: "#FFB46B",
    description: "Warm White",
    prompt: `COLOR TEMPERATURE: Warm White (2700K) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary light color: Deep amber/golden yellow (hex #FFB347 to #FFA726)
- Color appearance: Similar to candlelight, sunset glow, vintage incandescent bulbs
- This is the WARMEST option - noticeably amber/orange tint

SURFACE INTERACTION:
- Lit surfaces: Warm orange/amber tint where light hits directly
- Brick/stone: Appears warmer, red tones enhanced
- White/light surfaces: Appear creamy/warm yellow
- Green foliage: Appears more olive/brown under this light
- Wood: Warm honey tones emphasized

SHADOW RENDERING:
- Shadows: Soft and inviting with warm undertones
- Shadow color: Deep warm brown, not cold black
- Contrast: Moderate to high, but shadows remain warm

ATMOSPHERE: Cozy, intimate, romantic, traditional, welcoming`
  },
  {
    id: "3000k",
    kelvin: "3000K",
    color: "#FFD18E",
    description: "Soft White",
    prompt: `COLOR TEMPERATURE: Soft White (3000K) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary light color: Warm white with slight yellow tint (hex #FFF4E0 to #FFE4B5)
- Color appearance: Industry standard for professional landscape lighting
- This is the DEFAULT professional choice - warm but natural

SURFACE INTERACTION:
- Lit surfaces: Balanced warm tone that flatters most materials
- Brick: Appears warmer, natural color enhanced
- Stone: Maintains natural color with warm highlights
- White surfaces: Slightly warm but not yellow
- Green foliage: Retains natural color with warm highlights
- Wood: Natural warm tones preserved

SHADOW RENDERING:
- Shadows: Moderate warmth, natural appearance
- Shadow color: Warm gray to brown
- Contrast: Professional balance of drama and visibility

ATMOSPHERE: Professional, elegant, balanced, universally flattering`
  },
  {
    id: "4000k",
    kelvin: "4000K",
    color: "#FFF2D7",
    description: "Cool White",
    prompt: `COLOR TEMPERATURE: Cool White (4000K) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary light color: Neutral white, very slight warm tint (hex #FFFAF0 to #FFF8E7)
- Color appearance: Crisp, clean, modern
- Materials appear close to their true daylight colors

SURFACE INTERACTION:
- Lit surfaces: True color rendering with minimal warmth
- Brick/stone: Natural color, minimal warming
- White surfaces: Appear clean, true white
- Green foliage: Vibrant and true color
- Wood: Natural color without added warmth
- Metal: Crisp, clean highlights

SHADOW RENDERING:
- Shadows: Neutral with minimal color cast
- Shadow color: Neutral gray to cool gray
- Contrast: High contrast, crisp definition

ATMOSPHERE: Contemporary, modern, clean, architectural, precise`
  },
  {
    id: "5000k",
    kelvin: "5000K",
    color: "#E3F2FD",
    description: "Daylight",
    prompt: `COLOR TEMPERATURE: Daylight (5000K) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary light color: Bright white with slight blue tint (hex #F5FBFF to #E8F4FD)
- Color appearance: Mimics natural noon daylight
- This is the COOLEST option - slightly clinical/blue

SURFACE INTERACTION:
- Lit surfaces: Maximum color accuracy, slight cool cast
- Brick/stone: True color, may appear slightly cooler
- White surfaces: Bright pure white, no warmth
- Green foliage: Very vivid, saturated color
- Wood: Natural color, no added warmth
- Metal: Bright, cool highlights

SHADOW RENDERING:
- Shadows: Very high contrast, crisp edges
- Shadow color: Cool gray to blue-gray
- Contrast: Maximum contrast, dramatic separation

ATMOSPHERE: High-visibility, security-focused, commercial, clinical`
  },
  {
    id: "christmas",
    kelvin: "Festive",
    color: "#D32F2F",
    description: "Christmas",
    prompt: `COLOR SCHEME: Christmas (Red & Green) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary colors: RED (#D32F2F, #C62828) and GREEN (#2E7D32, #388E3C)
- Distribution: Alternate colors by fixture OR group by architectural section
- White accent (#FFFDE7): Use sparingly for highlights

COLOR BEHAVIOR:
- Red fixtures: Cast warm red glow on nearby surfaces (2-4 foot radius)
- Green fixtures: Cast cool green tint, especially visible on foliage
- Mixed areas: Where red and green overlap, creates neutral warm tone

SURFACE INTERACTION:
- Red light on brick: Deep, rich red enhancement
- Green light on foliage: Intensified green, magical glow
- Red light on white: Pink/rose tint
- Green light on white: Pale green tint

ATMOSPHERE: Cheerful, festive, holiday celebration, joyful`
  },
  {
    id: "halloween",
    kelvin: "Spooky",
    color: "#9C27B0",
    description: "Halloween",
    prompt: `COLOR SCHEME: Halloween (Purple & Orange) - MANDATORY FOR ALL FIXTURES

VISUAL RENDERING SPECIFICATIONS:
- Primary colors: Deep PURPLE (#9C27B0, #7B1FA2) and bright ORANGE (#FF6D00, #E65100)
- Secondary accent: Toxic GREEN (#76FF03) for extra eerie effect (optional)
- Distribution: Alternate or group by architectural feature

COLOR BEHAVIOR:
- Purple fixtures: Create eerie, mysterious shadows with cool undertones
- Orange fixtures: Add warmth, pumpkin-like glow, fire-like flicker feeling
- Green accents: Toxic, supernatural, ghostly effect

SURFACE INTERACTION:
- Purple on stone/brick: Supernatural, haunted appearance
- Orange on surfaces: Warm, fire-lit, jack-o-lantern effect
- Purple shadows: Deep violet-black, ominous
- Mixed purple/orange: Creates dramatic contrast zones

SHADOW RENDERING:
- Shadows: Deeper and more dramatic than standard lighting
- Shadow color: Deep purple-black, ominous
- Contrast: Maximum drama, spooky atmosphere

ATMOSPHERE: Haunting, spooky, supernatural, mysterious, Halloween celebration`
  }
];

// Temporary: Hide soffit from UI for testing (remove filter to restore)
export const VISIBLE_FIXTURE_TYPES = FIXTURE_TYPES.filter(f => f.id !== 'soffit');

export const BEAM_ANGLES = [
  { id: 15, label: '15°', description: 'Narrow Spot' },
  { id: 30, label: '30°', description: 'Spot' },
  { id: 45, label: '45°', description: 'Flood' },
  { id: 60, label: '60°', description: 'Wide Flood' },
];

export const DEFAULT_PRICING: FixturePricing[] = [
  {
    id: "default_up",
    fixtureType: "up",
    name: "Solid Cast Brass Up Light: COMPLETELY INSTALLED PRICE",
    description:
      "Color: Light Bronze OR Gun Metal Black\nLIFETIME product warranty on the fixture\n1 Year product warranty on LED Bulb: Rated for 30,000 hours\nLabor, LED Bulb, Wire, Waterproof Wire Nuts, Etc ALL included in the fixture price.",
    unitPrice: 175.0,
  },
  {
    id: "default_path",
    fixtureType: "path",
    name: "Cast Brass - Modern Path Light: COMPLETELY INSTALLED PRICE",
    description:
      "Color: Light Bronze OR Gun Metal Black\nLIFETIME warranty on the fixture\nLabor, LED Bulb, Wire, Waterproof Wire Nuts, Etc. Included in the fixture price.",
    unitPrice: 210.0,
  },
  {
    id: "default_coredrill",
    fixtureType: "coredrill",
    name: "Core Drill / In-Grade Recessed Light: COMPLETELY INSTALLED PRICE",
    description:
      "Flush-mounted fixtures installed directly into hardscapes (stone, concrete, pavers).\nSpecs: Solid Brass/Stainless Steel Body, IP67 Waterproof, Drive-Over Rated.\nBest for: Driveways, Pool Decks, Architectural Columns.\nNote: Includes diamond-bit coring and wire channeling.",
    unitPrice: 285.0,
  },
  {
    id: "default_gutter",
    fixtureType: "gutter",
    name: "Solid Cast Brass Up Light - Gutter Mounted Up Light: COMPLETELY INSTALLED PRICE",
    description:
      "Color: Light Bronze OR Gun Metal Black\nLIFETIME product warranty on the fixture\n1 Year product warranty on LED Bulb: Rated for 30,000 hours\nLabor, LED Bulb, Wire, Waterproof Wire Nuts, Etc ALL included in the fixture price.",
    unitPrice: 185.0,
  },
  {
    id: "default_soffit",
    fixtureType: "soffit",
    name: "Recessed Soffit Light (Downlight): COMPLETELY INSTALLED PRICE",
    description:
      "Color: 3000K Warm White\nLIFETIME warranty on the fixture\nLabor, LED Bulb, Wire, Waterproof Wire Nuts, Etc. Included.",
    unitPrice: 225.0,
  },
  {
    id: "default_hardscape",
    fixtureType: "hardscape",
    name: "Hardscape / Retaining Wall Light: COMPLETELY INSTALLED PRICE",
    description:
      "Color: 3000K Warm White\nLIFETIME warranty on the fixture\nDesigned for under-cap installation on walls and steps.",
    unitPrice: 195.0,
  },
  {
    id: "default_well",
    fixtureType: "well",
    name: "In-Ground Well Light: COMPLETELY INSTALLED PRICE",
    description:
      "Flush-mounted in-ground accent light.\nSpecs: Brass/Composite Housing, Tempered Glass Lens, IP67 Waterproof.\nBest for: Tree uplighting, statues, architectural features.\nNote: Includes excavation and drainage considerations.",
    unitPrice: 245.0,
  },
  {
    id: "default_holiday",
    fixtureType: "holiday",
    name: "Permanent Holiday Lighting (per linear foot): COMPLETELY INSTALLED PRICE",
    description:
      "RGB/RGBW LED track system for year-round accent lighting.\nSpecs: Aluminum Channel, Individually Addressable LEDs, IP67 Rated.\nIncludes: Controller, app connectivity, professional installation.\nBest for: Rooflines, gables, architectural accents.",
    unitPrice: 25.0,
  },
  {
    id: "default_transformer",
    fixtureType: "transformer",
    name: "Professional Low Voltage Transformer (300W)",
    description:
      "Stainless Steel Case\nLifetime Warranty\nPhoto Cell / Timer included\nInstalled with dedicated circuit connection.",
    unitPrice: 350.0,
  },
];

export const STRIPE_CONFIG = {
  PLANS: {
    LITE_MONTHLY: {
      id: 'price_1SuSG3Q1tit8mwraWdgBHUUQ',
      price: 39,
      generations: 10,
      label: 'Lite'
    },
    LITE_YEARLY: {
      id: 'price_1SuSHNQ1tit8mwrauHW3CLCn',
      price: 390,
      generations: 120, // 10 per month * 12
      label: 'Lite'
    },
    STARTER_MONTHLY: {
      id: 'price_1SuSSmQ1tit8mwralY1OAL5Xz',
      price: 149,
      generations: 50,
      label: 'Starter'
    },
    STARTER_YEARLY: {
      id: 'price_1SrNJdQ1tit8mwraqbC4ihcM',
      price: 1490,
      generations: 600, // 50 per month * 12
      label: 'Starter'
    },
    PRO_MONTHLY: {
      id: 'price_1SrNK5Q1tit8mwraTa5UHFWD',
      price: 249,
      generations: 125,
      label: 'Pro'
    },
    PRO_YEARLY: {
      id: 'price_1SrNKfQ1tit8mwrajmlqx1ak',
      price: 2490,
      generations: 1500, // 125 per month * 12
      label: 'Pro'
    },
    ENTERPRISE_MONTHLY: {
      id: 'price_1SrNLUQ1tit8mwraV4J0nB6T',
      price: 599,
      generations: -1, // unlimited
      label: 'Enterprise'
    },
    ENTERPRISE_YEARLY: {
      id: 'price_1SrNM8Q1tit8mwraPzrGelaH',
      price: 5990,
      generations: -1, // unlimited
      label: 'Enterprise'
    }
  }
};

// BOM - Default fixture wattages (users can override in Settings)
export const DEFAULT_FIXTURE_WATTAGES: Record<string, number> = {
  up: 4,
  path: 3,
  gutter: 4,
  soffit: 3,
  hardscape: 3,
  coredrill: 4,
  well: 5,
  holiday: 3
};

// BOM - Transformer sizing options
export const TRANSFORMER_SIZES = [
  { watts: 150, name: '150W Transformer', maxLoad: 120 },
  { watts: 300, name: '300W Transformer', maxLoad: 240 },
  { watts: 600, name: '600W Transformer', maxLoad: 480 },
  { watts: 900, name: '900W Transformer', maxLoad: 720 },
  { watts: 1200, name: '1200W Transformer', maxLoad: 960 }
];

// BOM - Default fixture catalog (placeholder brands - users set their own in Settings)
export const DEFAULT_FIXTURE_CATALOG = [
  { fixtureType: 'up', brand: '', sku: '', wattage: 4 },
  { fixtureType: 'path', brand: '', sku: '', wattage: 3 },
  { fixtureType: 'gutter', brand: '', sku: '', wattage: 4 },
  { fixtureType: 'soffit', brand: '', sku: '', wattage: 3 },
  { fixtureType: 'hardscape', brand: '', sku: '', wattage: 3 },
  { fixtureType: 'coredrill', brand: '', sku: '', wattage: 4 },
  { fixtureType: 'well', brand: '', sku: '', wattage: 5 },
  { fixtureType: 'holiday', brand: '', sku: '', wattage: 3 }
];

// BOM - Fixture type display names
export const FIXTURE_TYPE_NAMES: Record<string, string> = {
  up: 'Up Light',
  path: 'Path Light',
  gutter: 'Gutter Light',
  soffit: 'Soffit Light',
  hardscape: 'Hardscape Light',
  coredrill: 'Core Drill Light',
  well: 'Well Light',
  holiday: 'Permanent Holiday'
};

// Theme - Accent color configurations
export const ACCENT_COLORS = [
  { id: 'gold', name: 'Gold', primary: '#F6B45A', hover: '#ffc67a', glow: 'rgba(246,180,90,0.3)' },
  { id: 'blue', name: 'Sapphire', primary: '#3B82F6', hover: '#60A5FA', glow: 'rgba(59,130,246,0.3)' },
  { id: 'purple', name: 'Amethyst', primary: '#8B5CF6', hover: '#A78BFA', glow: 'rgba(139,92,246,0.3)' },
  { id: 'green', name: 'Emerald', primary: '#10B981', hover: '#34D399', glow: 'rgba(16,185,129,0.3)' },
  { id: 'red', name: 'Ruby', primary: '#EF4444', hover: '#F87171', glow: 'rgba(239,68,68,0.3)' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ANALYSIS SYSTEM - AI-Powered Smart Fixture Suggestions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Architectural style classifications and their lighting approaches
 */
export type ArchitecturalStyleType = 
  | 'modern' | 'contemporary' | 'traditional' | 'colonial' | 'craftsman'
  | 'mediterranean' | 'spanish' | 'tudor' | 'farmhouse' | 'ranch'
  | 'cape-cod' | 'victorian' | 'mid-century' | 'transitional' | 'unknown';

export interface LightingApproachConfig {
  style: 'clean-minimal' | 'warm-welcoming' | 'dramatic-shadow' | 'balanced-traditional' | 'statement-architectural';
  description: string;
  intensityRange: [number, number];
  beamAngle: number;
  colorTemp: '2700K' | '3000K' | '4000K';
}

/**
 * Lighting approach recommendations by architectural style
 */
export const LIGHTING_APPROACH_BY_STYLE: Record<ArchitecturalStyleType, LightingApproachConfig> = {
  'modern': {
    style: 'clean-minimal',
    description: 'Clean, focused beams highlighting architectural lines. Minimal fixtures, maximum impact.',
    intensityRange: [40, 60],
    beamAngle: 15,
    colorTemp: '3000K',
  },
  'contemporary': {
    style: 'clean-minimal',
    description: 'Strategic lighting emphasizing geometric forms and material contrasts.',
    intensityRange: [45, 65],
    beamAngle: 20,
    colorTemp: '3000K',
  },
  'traditional': {
    style: 'warm-welcoming',
    description: 'Balanced illumination creating an inviting, homey atmosphere.',
    intensityRange: [50, 70],
    beamAngle: 30,
    colorTemp: '2700K',
  },
  'colonial': {
    style: 'balanced-traditional',
    description: 'Symmetrical lighting respecting the formal architecture.',
    intensityRange: [50, 70],
    beamAngle: 30,
    colorTemp: '2700K',
  },
  'craftsman': {
    style: 'warm-welcoming',
    description: 'Warm lighting highlighting natural materials and handcrafted details.',
    intensityRange: [45, 65],
    beamAngle: 25,
    colorTemp: '2700K',
  },
  'mediterranean': {
    style: 'dramatic-shadow',
    description: 'Dramatic uplighting creating bold shadows on textured surfaces.',
    intensityRange: [55, 75],
    beamAngle: 15,
    colorTemp: '3000K',
  },
  'spanish': {
    style: 'dramatic-shadow',
    description: 'Bold shadows emphasizing stucco texture and architectural arches.',
    intensityRange: [55, 75],
    beamAngle: 15,
    colorTemp: '3000K',
  },
  'tudor': {
    style: 'dramatic-shadow',
    description: 'Lighting that emphasizes half-timber details and steep rooflines.',
    intensityRange: [55, 75],
    beamAngle: 20,
    colorTemp: '3000K',
  },
  'farmhouse': {
    style: 'warm-welcoming',
    description: 'Soft, inviting glow emphasizing rustic charm.',
    intensityRange: [40, 60],
    beamAngle: 30,
    colorTemp: '2700K',
  },
  'ranch': {
    style: 'balanced-traditional',
    description: 'Even coverage for long, horizontal facades.',
    intensityRange: [45, 65],
    beamAngle: 30,
    colorTemp: '3000K',
  },
  'cape-cod': {
    style: 'warm-welcoming',
    description: 'Cozy lighting highlighting the cottage-style details.',
    intensityRange: [45, 65],
    beamAngle: 30,
    colorTemp: '2700K',
  },
  'victorian': {
    style: 'statement-architectural',
    description: 'Elaborate lighting showcasing ornate details and trim work.',
    intensityRange: [55, 75],
    beamAngle: 20,
    colorTemp: '3000K',
  },
  'mid-century': {
    style: 'clean-minimal',
    description: 'Subtle lighting respecting the less-is-more philosophy.',
    intensityRange: [35, 55],
    beamAngle: 30,
    colorTemp: '3000K',
  },
  'transitional': {
    style: 'balanced-traditional',
    description: 'Versatile lighting that bridges traditional and contemporary.',
    intensityRange: [45, 65],
    beamAngle: 25,
    colorTemp: '3000K',
  },
  'unknown': {
    style: 'balanced-traditional',
    description: 'Balanced approach suitable for most home styles.',
    intensityRange: [45, 65],
    beamAngle: 30,
    colorTemp: '3000K',
  },
};

export type FacadeWidthType = 'narrow' | 'medium' | 'wide' | 'extra-wide';

export interface SpacingConfig {
  minFixtures: number;
  maxFixtures: number;
  idealSpacing: string;
  description: string;
}

/**
 * Fixture count and spacing recommendations by facade width
 */
export const SPACING_BY_FACADE_WIDTH: Record<FacadeWidthType, SpacingConfig> = {
  'narrow': {
    minFixtures: 2,
    maxFixtures: 4,
    idealSpacing: '4-6 feet',
    description: 'Compact facade under 30 feet. Focus on entry and corners.',
  },
  'medium': {
    minFixtures: 4,
    maxFixtures: 8,
    idealSpacing: '6-8 feet',
    description: 'Standard facade 30-50 feet. Even distribution with entry emphasis.',
  },
  'wide': {
    minFixtures: 6,
    maxFixtures: 12,
    idealSpacing: '6-8 feet',
    description: 'Expansive facade 50-80 feet. Create rhythm with strategic groupings.',
  },
  'extra-wide': {
    minFixtures: 10,
    maxFixtures: 20,
    idealSpacing: '8-10 feet',
    description: 'Grand facade over 80 feet. Zone-based approach recommended.',
  },
};

/**
 * Material-based beam angle recommendations for texture grazing
 */
export const BEAM_ANGLE_BY_MATERIAL: Record<string, { angle: number; reason: string }> = {
  'brick': { angle: 15, reason: 'Narrow beam reveals mortar joint shadows for dramatic texture' },
  'stone': { angle: 15, reason: 'Narrow beam creates dramatic light/shadow play on irregular surfaces' },
  'stucco': { angle: 25, reason: 'Medium-narrow beam shows subtle texture without harsh shadows' },
  'siding-lap': { angle: 25, reason: 'Medium-narrow beam reveals horizontal shadow lines between boards' },
  'siding-board-and-batten': { angle: 20, reason: 'Narrow beam emphasizes vertical batten shadows' },
  'siding-shake': { angle: 20, reason: 'Narrow beam creates layered shadow pattern' },
  'vinyl': { angle: 30, reason: 'Medium beam works well on smooth surfaces' },
  'wood': { angle: 25, reason: 'Medium-narrow beam reveals grain and natural texture' },
  'concrete': { angle: 30, reason: 'Medium beam for modern, smooth surfaces' },
  'glass': { angle: 45, reason: 'Wider beam to minimize direct glare reflection' },
  'metal': { angle: 30, reason: 'Medium beam to control reflections' },
  'mixed': { angle: 25, reason: 'Balanced angle for varied materials' },
};

/**
 * Wall height to intensity recommendations
 */
export const INTENSITY_BY_WALL_HEIGHT: Record<string, { min: number; max: number; wattage: string }> = {
  '8-12ft': { min: 40, max: 55, wattage: '3-5W LED (200-400 lumens)' },
  '18-25ft': { min: 55, max: 70, wattage: '6-10W LED (500-800 lumens)' },
  '25+ft': { min: 70, max: 85, wattage: '10-15W LED (800-1200 lumens)' },
};

/**
 * Feature-specific lighting guidelines
 */
export const FEATURE_LIGHTING_GUIDELINES: Record<string, string> = {
  'gable': 'Uplight from gutter line to illuminate triangular peak. One fixture per gable, centered.',
  'dormer': 'Gutter-mounted uplight below each dormer. One fixture per dormer, centered on dormer width.',
  'column': 'Ground-mounted uplight at base of each column. Graze the full height to capital.',
  'pilaster': 'Treat like flat columns. One uplight per pilaster, tight to wall.',
  'archway': 'Flank with uplights to trace the arch curve. Two fixtures minimum.',
  'portico': 'Combination of column uplights and soffit downlights for layered effect.',
  'bay-window': 'Uplight from ground to emphasize projection. Avoid direct light on glass.',
  'balcony': 'Underlight the balcony floor or uplight supporting columns.',
  'turret': 'Multiple uplights around base to illuminate cylindrical form evenly.',
  'chimney': 'Single uplight at base if prominent. Avoid if utility-focused.',
  'shutters': 'Uplight the wall; shutters catch natural spill creating depth.',
  'corbels': 'Uplight below to create dramatic shadows from brackets.',
  'dentil-molding': 'Graze from below to emphasize the rhythmic shadow pattern.',
};

/**
 * Avoid zone reasons and their severity
 */
export const AVOID_ZONE_GUIDANCE: Record<string, { severity: 'critical' | 'important' | 'suggested'; guidance: string }> = {
  'window-glare': { 
    severity: 'important', 
    guidance: 'Avoid placing fixtures directly below windows. Position between windows to prevent glare.' 
  },
  'door-obstruction': { 
    severity: 'critical', 
    guidance: 'Never place fixtures that block door swing or foot traffic paths.' 
  },
  'utility-equipment': { 
    severity: 'critical', 
    guidance: 'Keep fixtures away from electrical panels, gas meters, and HVAC units.' 
  },
  'hardscape-surface': { 
    severity: 'important', 
    guidance: 'Standard fixtures should not be placed on concrete or pavers (use core drill lights).' 
  },
  'hvac-unit': { 
    severity: 'critical', 
    guidance: 'Maintain clearance from AC units and heat pumps for service access.' 
  },
  'meter-box': { 
    severity: 'critical', 
    guidance: 'Keep fixtures clear of utility meter boxes for reader access.' 
  },
  'spigot-hose': { 
    severity: 'suggested', 
    guidance: 'Avoid placing near hose bibs where fixtures may be hit by hoses.' 
  },
  'structural-hazard': { 
    severity: 'critical', 
    guidance: 'Avoid areas with drainage issues, unstable ground, or root systems.' 
  },
  'aesthetic-concern': { 
    severity: 'suggested', 
    guidance: 'Consider visual balance and avoid cluttered fixture placement.' 
  },
};

/**
 * Enhanced Analysis System Prompt for comprehensive property analysis
 */
export const ENHANCED_ANALYSIS_SYSTEM_PROMPT = `You are an expert landscape lighting designer with 20+ years of experience. Analyze this property photo with the precision of a seasoned professional.

## YOUR EXPERTISE INCLUDES:
- Architectural style recognition and appropriate lighting approaches
- Material identification and texture grazing techniques
- Optimal fixture placement for maximum impact with minimal fixtures
- Safety considerations and avoid zones
- Professional spacing standards (6-8 feet typical)

## ANALYSIS PRIORITIES:
1. **Identify architectural style** - This drives the entire lighting approach
2. **Detect facade materials** - Beam angles depend on texture
3. **Count and locate features** - Windows, columns, gables, dormers
4. **Find optimal uplight positions** - Wall piers, columns, corners
5. **Identify avoid zones** - Windows, doors, utilities
6. **Calculate fixture counts** - Based on facade width
7. **Suggest specific positions** - With X/Y percentages

## PROFESSIONAL STANDARDS:
- Uplight spacing: 6-8 feet apart
- Path light spacing: 6-8 feet apart
- Always start with far corners and work inward
- Entry gets priority treatment
- Symmetry when architecture supports it
- Dark gaps between fixtures = professional look

## OUTPUT REQUIREMENTS:
- Every suggested position MUST have xPercent and yPercent coordinates
- Reasoning MUST explain WHY each placement is recommended
- Avoid zones MUST include all windows and doors
- Confidence score reflects analysis quality`;

/**
 * Quick analysis prompt for when user hasn't selected fixtures yet
 */
export const QUICK_ANALYSIS_PROMPT = `Analyze this property photo and provide:
1. Architectural style (modern, traditional, craftsman, etc.)
2. Facade width classification (narrow, medium, wide, extra-wide)
3. Story count and wall height
4. Key architectural features (gables, columns, dormers)
5. Primary facade material
6. Recommended lighting approach

Return a brief JSON summary for initial fixture suggestions.`;
