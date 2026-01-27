
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
  
  masterInstruction: `YOU ARE A LIGHTING VISUALIZATION TOOL ONLY.

ABSOLUTE CONSTRAINTS - VIOLATION IS FORBIDDEN:

0. FRAMING & COMPOSITION PRESERVATION (CRITICAL):
   - The output image must have the EXACT SAME framing and composition as the source image
   - Keep the ENTIRE house in frame - do NOT crop, zoom in, or cut off any part of the home
   - All edges of the property visible in the source must remain visible in the output
   - The aspect ratio and boundaries must match the source image exactly
   - If the source shows the full front facade, the output MUST show the full front facade
   - Do NOT zoom in on specific areas or features

1. ARCHITECTURAL PRESERVATION (ZERO TOLERANCE):
   - The home's structure, shape, roofline, windows, doors, columns, and ALL architectural features must remain EXACTLY as shown in the source image

2. HARDSCAPE PRESERVATION (ZERO TOLERANCE):
   - Driveways must remain EXACTLY as shown - same shape, length, width, material
   - Sidewalks and walkways must remain EXACTLY as shown - do NOT add new paths
   - Patios, steps, and retaining walls must remain EXACTLY as shown

3. LANDSCAPE PRESERVATION (ZERO TOLERANCE):
   - Trees must remain EXACTLY as shown - same size, shape, position, species
   - Shrubs, bushes, and plants must remain EXACTLY as shown
   - Lawn areas must remain EXACTLY as shown - same shape and boundaries
   - Flower beds and mulch areas must remain EXACTLY as shown


4. ENVIRONMENTAL PRESERVATION:
   - Neighboring structures, fences, and property elements remain unchanged
   - Vehicles, if present, remain unchanged
   - Outdoor furniture and decorations remain unchanged
   - Mailboxes, house numbers, and accessories remain unchanged

5. NIGHTTIME SKY REQUIREMENTS (MANDATORY - CRITICAL):
   - The sky MUST be PURE BLACK - completely dark with NO ambient glow, NO gradients, NO blue tones
   - Include a REALISTIC FULL MOON in the sky - clearly visible, properly sized, with natural lunar detail
   - Moon position: place in an aesthetically pleasing location (upper portion of sky, not behind house)
   - Moon appearance: realistic full moon with visible surface features (craters, maria), soft white/pale yellow glow
   - SUBTLE MOONLIGHT EFFECT: The moon provides ONLY the slightest ambient light
   - Moonlight should create a VERY FAINT outline/silhouette effect on:
     * The roofline and edges of the home
     * The tree line and background vegetation silhouettes
   - This moonlight is EXTREMELY SUBTLE - just enough to see the outline shapes, NOT to illuminate surfaces
   - The PRIMARY light sources remain the landscape lighting fixtures
   - Shadows must still be deep and dramatic - moonlight does NOT fill in shadows
   - NO stars - keep the rest of the sky completely black
   - NO clouds - clear night sky with visible moon

6. PERMITTED MODIFICATIONS (ONLY THESE):
   - Convert daytime sky to PURE BLACK nighttime sky with FULL MOON (REQUIRED)
   - Add very subtle moonlight that creates faint outline/silhouette of roofline and tree line
   - REMOVE all other ambient daylight - the scene should be dark except for fixture lighting and subtle moon outline
   - Shadows should be deep, dark, and dramatic
   - ADD ONLY the specific light fixtures and light effects explicitly requested
   - Light fixtures may ONLY be placed in locations specified by active prompts
   - The contrast between lit surfaces and unlit surfaces should be DRAMATIC

7. LIGHT GENERATION RULES:
   - Generate ONLY the fixture types that are explicitly ENABLED
   - Place fixtures ONLY in locations specified by active sub-option prompts
   - The moon provides ONLY subtle edge/outline lighting on roofline and tree silhouettes
   - Moonlight should NOT illuminate surfaces - only create faint silhouette outlines
   - Do NOT add decorative string lights unless explicitly requested
   - Do NOT add interior lights glowing through windows unless explicitly requested
   - Do NOT add street lights, car headlights, or ambient city glow
   - Light color temperature and beam characteristics follow active prompt specs
   - Unlit areas should remain in deep shadow for maximum contrast

8. DRAMATIC LIGHTING STYLE (CRITICAL FOR REALISM):
   - Each fixture creates a DISTINCT, ISOLATED pool of light - NOT a uniform wash
   - DARK GAPS must exist between fixture illumination zones
   - Light does NOT blend into continuous wall wash - each fixture has SEPARATION
   - Narrow beam angles (15-30°) create tight columns, not wide floods
   - Inverse square law applies: brightness decreases rapidly with distance from source
   - Beam edges are SOFT and FEATHERED (6-12 inch transition), never crisp circles
   - Unlit wall sections between fixtures remain in DEEP SHADOW
   - The dramatic interplay of LIGHT and DARK is the primary visual goal
   - Professional landscape lighting has intentional dark areas - shadows are as important as light

VALIDATION CHECK (PERFORM BEFORE GENERATING):
- Source image FRAMING = Output image FRAMING (IDENTICAL - whole house in frame)
- Source image architecture = Output image architecture (IDENTICAL)
- Source image hardscape = Output image hardscape (IDENTICAL)
- Source image landscaping = Output image landscaping (IDENTICAL)
- Only differences: sky darkness + requested light fixtures/effects`,

  globalNegativePrompt: `new architectural features, new windows, new doors, new dormers, new columns, new trim, new shutters, new porches, new decks, new balconies, new railings, roof changes, roof modifications, new hardscape, new driveways, new sidewalks, new walkways, new patios, new steps, new retaining walls, new pavers, new concrete, new landscaping, new trees, new shrubs, new bushes, new plants, new flowers, new mulch beds, new planters, new garden features, lawn changes, seasonal changes, snow, fall leaves, different foliage, new vehicles, new furniture, new outdoor objects, string lights, fairy lights, holiday lighting, christmas lights, interior window glow, glowing windows from inside, street lights, car lights, car headlights, urban ambient glow, city glow, bright moonlight, harsh moonlight, stars, starlight, blue sky, gradient sky, ambient sky glow, twilight, dusk colors, light fixtures not specified, paint color changes, siding changes, brick changes, stone changes, material changes, fence changes, gate changes, property modifications, house modifications, structure modifications, added features, removed features, altered features, security lights, security floodlights, motion sensor lights, existing security fixtures turned on, lit security lights`,

  closingReinforcement: `MASTER RULE - STRICT CATEGORY ENFORCEMENT:
- ONLY generate fixtures for categories that are EXPLICITLY ENABLED
- If soffit/downlights are NOT selected, there must be ZERO soffit fixtures in the image
- If path lights are NOT selected, there must be ZERO path lights in the image
- If up lights are NOT selected, there must be ZERO up lights in the image
- NEVER add fixtures "for realism" or "to complete the design"
- ABSENCE of a category selection means ABSOLUTE PROHIBITION of that fixture type

*** CRITICAL SUB-OPTION RULE ***:
- Within each fixture category, ONLY the SELECTED sub-options receive lights
- Example: If "Up Lights" is enabled with ONLY "Trees" selected, then:
  * Trees = LIT
  * Siding, Windows, Columns, Landscaping = MUST REMAIN DARK
- This rule is ABSOLUTE and NON-NEGOTIABLE

*** STRICT RULE - NO SECURITY LIGHTS ***:
- Even if security fixtures exist on the home in the source image, they MUST remain OFF and DARK
- Do NOT turn on, activate, or show light emanating from ANY existing security fixtures
- This applies regardless of what other lighting is selected
- Security lights are FORBIDDEN from being lit - NO EXCEPTIONS

*** STRICT RULE - UP LIGHT FOUNDATION PROXIMITY ***:
- ALL up lights MUST be placed WITHIN 6 INCHES of the home's foundation
- EXCEPTION: Tree up lights - these are placed at the base of trees, not the foundation
- For siding, windows, columns, entry, and all other up light sub-options: fixtures MUST be tight against the foundation
- The fixture base should be nearly touching the foundation - 6 inches MAX distance

*** STRICT RULE - UP LIGHT BEAM HEIGHT ***:
- ALL up lights on siding AND 1st story windows MUST shine ALL THE WAY UP to the soffit line above them
- The light beam must travel the FULL HEIGHT of the wall section from ground to soffit
- The up light effect should wash the ENTIRE vertical surface from foundation to soffit
- This applies to EVERY up light on siding and windows, regardless of how many fixtures there are
- Each up light creates a vertical column of light that reaches the soffit line above it

*** HARD RULE - UP LIGHT WATTAGE & SOFFIT FALLOFF ***:
- The light beam MUST reach and FALL OFF at the soffit line DIRECTLY ABOVE the fixture
- Adjust the perceived wattage/intensity based on how HIGH the soffit is above the fixture:
  * Taller walls = brighter/higher wattage appearance to reach the soffit
  * Shorter walls = softer/lower wattage appearance
- The UNDERSIDE OF THE SOFFIT must be NOTICEABLY LIT by the up light
- The light should "kiss" the soffit - illuminating its underside before falling off
- The soffit directly above each up light should show visible illumination on its underside
- This creates the proper "wall wash" effect that terminates at the architectural soffit line

*** CRITICAL - DRAMATIC CONTRAST WITH DARK GAPS ***:
- Each up light creates a DISTINCT vertical column of light
- DARK GAPS must be visible between each fixture's illumination zone
- Do NOT create uniform wall wash - fixtures must have VISIBLE SEPARATION
- Professional landscape lighting has intentional dark areas for drama
- The wall between light pools should show the material (brick/siding) in shadow
- If all lights blend together into continuous wash = WRONG
- If lights have dark gaps between them = CORRECT
- Beam edges should be SOFT and FEATHERED, never crisp circles
- Inverse square law: light is brightest near fixture, dims rapidly with distance

FINAL REMINDER:
You are converting a daytime photo to nighttime and adding ONLY the specified lighting fixtures.
The home, landscaping, hardscape, and all physical features must be PIXEL-PERFECT identical to the source.
If you are uncertain whether a feature exists in the source, do NOT add it.
When in doubt, preserve the source image exactly.
ONLY generate lights that are explicitly enabled above.

SKY REQUIREMENT: The sky MUST be PURE BLACK with a FULL MOON visible. No stars, no gradients, no blue tones.
MOONLIGHT REQUIREMENT: The moon provides ONLY the slightest ambient light - just enough to create a faint outline/silhouette of the roofline and tree line. This is EXTREMELY SUBTLE edge lighting, NOT surface illumination.
CONTRAST REQUIREMENT: Maximize the contrast between lit surfaces (from fixtures) and unlit surfaces (deep shadows).
The dramatic interplay of light and shadow on the house is the primary visual goal.`
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
  prompt: `TARGET: WALL PIERS / SIDING SECTIONS -- VERTICAL SURFACE GRAZING

IDENTIFICATION SCAN:
- Locate every vertical solid wall section BETWEEN windows across the entire home facade
- Wall pier materials: siding (lap, board & batten, shake), stucco, brick, stone, block
- Include: corner siding at far left and far right of structure
- Include: wall sections between window groupings
- Include: blank wall expanses with no windows

FIXTURE SPECIFICATIONS:
- Type: ground-staked brass up light (bullet or cylinder style)
- Housing: solid brass/bronze, low-profile
- Height: 6-8 inches above grade
- Beam: narrow to medium (15-30 degrees) for wall grazing

PLACEMENT GEOMETRY:
- Place ONE ground-staked fixture at the BASE of EACH wall pier
- Distance from wall: 6 inches (tighter against foundation if landscaping obstructs)
- Place fixtures in planting bed or mulch ONLY -- never on concrete, pavers, or hardscape

PLACEMENT SEQUENCE:
1. Start with FAR LEFT corner of facade if under landscaping bed
2. Then FAR RIGHT corner of facade if under landscaping bed
3. Fill INWARD identifying each wall pier between windows, add 2 for large blank sections
4. Every vertical wall section receives atleast one fixture

WALL PIER IDENTIFICATION:
- Measure from window edge to window edge
- The solid wall between = one pier = one fixture
- Wide piers (>6 ft): consider two fixtures at 1/3 points
- Narrow piers (<2 ft): single centered fixture

LIGHT PHYSICS:
- WALL GRAZING technique: fixture close to wall (6 inches) creates dramatic texture reveal
- Beam originates as bright hotspot at ground level
- Light travels VERTICALLY UP the wall surface
- Natural intensity falloff: brightest at base, gradually dimmer toward top
- Beam MUST reach soffit/roofline directly above
- If 2nd story present, light must travel full height to upper roofline
- Cast subtle shadows from architectural trim, shutters, and surface texture

TEXTURE REVELATION BY MATERIAL:
- LAP SIDING: horizontal shadow lines between each board
- BOARD & BATTEN: vertical shadow lines at battens
- BRICK: mortar joint grid pattern emphasized
- STONE: irregular surface creates dramatic light/shadow play
- STUCCO: subtle texture with soft shadows
- SHAKE/SHINGLE: layered shadow pattern

REALISM REQUIREMENTS:
- Characteristic of low-voltage LED landscape lighting
- Slight light spill onto adjacent surfaces (not perfectly contained beams)
- Fixtures appear as small dark brass cylinders, nearly invisible at night
- Light appears natural, not theatrical or over-saturated

SPACING RHYTHM:
- Consistent fixture placement creates visual rhythm across facade
- Alternating pattern: window (ambient glow) / pier (direct uplight) / window / pier
- Symmetry preferred when architecture allows

HOT SPOT AVOIDANCE & WATTAGE:
- CRITICAL: Avoid hot spots (overly bright area at fixture base). Light should be EVEN from base to soffit.
- Angle fixture so beam starts on wall 12-18 inches above ground, NOT at fixture height
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED (800-1200 lumens)
- Light BRIGHTEST at mid-wall, not at base
- Tilt fixture BACK 15-20 degrees from vertical to throw light UP and reduce hot spot

HOT SPOT AVOIDANCE & WATTAGE:
- CRITICAL: Avoid hot spots (overly bright area at fixture base). Light should be EVEN from base to soffit.
- Angle fixture so beam starts on wall 12-18 inches above ground, NOT at fixture height
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED (800-1200 lumens)
- Light BRIGHTEST at mid-wall, not at base
- Tilt fixture BACK 15-20 degrees from vertical to throw light UP and reduce hot spot

STRICT EXCLUSION ZONES:
- Wall sections immediately adjacent to windows receive SPILL light only, not direct fixtures`,
  negativePrompt: `ABSOLUTE PROHIBITION (SIDING): skip the corners/ends of the home - both left and right ends MUST have up lights. start placement in the middle of the facade.place up lights directly under windows.  place on concrete, hardscape, or open lawn - ONLY in landscaping beds.  aim beams at window glass.`

      },
      {
  id: 'windows',
  label: '1st Story Windows',
  description: 'Centered on glass (single) or mullion between (double)',
  prompt: `TARGET: 1ST STORY WINDOW ASSEMBLIES -- CENTERED UPLIGHTING

IDENTIFICATION SCAN:
- Locate ALL first-story windows across the home facade
- Include: single windows, double/mulled windows, triple windows, picture windows, bay windows
- Identify the window TYPE to determine fixture placement point
- Note window trim, casing, and any shutters present

WINDOW CLASSIFICATION & PLACEMENT POINT:
- SINGLE WINDOW (one pane): fixture centered on the horizontal middle of the glass
- DOUBLE/MULLED WINDOW (two panes): fixture centered on the vertical MULLION (divider) between panes
- TRIPLE WINDOW (three panes): fixture centered on the middle pane OR on center mullion
- PICTURE WINDOW (large single): fixture centered on window width
- BAY WINDOW: one fixture centered on each flat window section

FIXTURE SPECIFICATIONS:
- Type: ground-staked brass up light (bullet or cylinder style)
- Housing: solid brass/bronze, low-profile
- Height: 6-8 inches above grade
- Beam: medium spread (20-40 degrees) for soft wall washing

PLACEMENT GEOMETRY:
- Find the CENTER AXIS of the window unit (vertical centerline)
- Drop a plumb line from that center point to ground level
- Stake the fixture at that exact ground point
- Setback from foundation wall: 4-6 inches
- Place in planting bed or mulch ONLY

CENTERING PRECISION:
- Fixture must align with window centerline -- NOT offset left or right
- For windows with shutters: center on WINDOW, ignore shutter width
- For windows with trim/casing: center on GLASS, not outer trim edge
- Visual test: fixture should appear directly below window center when viewed straight-on

LIGHT PHYSICS:
- WALL WASHING technique with slight graze for soft illumination
- Beam originates at ground level below window
- Light travels VERTICALLY UP, grazing the window frame and trim
- Illuminates: sill, frame, casing, trim details, header
- Light CONTINUES ABOVE window to soffit/roofline
- Brightest at base with natural intensity falloff upward
- Glass receives AMBIENT GLOW only -- no direct beam on glass surface

WINDOW FRAME ILLUMINATION:
- Bottom sill: receives direct light first
- Side casings: light grazes vertically along trim
- Header/top trim: receives light traveling upward
- Muntins/grilles (if present): cast subtle shadow patterns
- Shutters (if present): catch side spill, add depth

OBSTRUCTION OVERRIDE PROTOCOL:
- IGNORE landscaping obstructions entirely
- If bushes, shrubs, or plants block the ideal fixture location:
  - Place fixture BEHIND the foliage
  - Press fixture close to foundation (tighter than 4 inches if needed)
  - Light will filter through/around foliage naturally
- Do NOT skip any window due to landscaping obstacles
- Do NOT relocate fixture off-center to avoid plants

REALISM REQUIREMENTS:
- Characteristic of low-voltage LED landscape lighting
- Window frame and trim softly illuminated, not harshly lit
- Glass appears to glow from reflected/ambient light, not direct beam
- Slight spill onto wall areas immediately adjacent to window
- Fixture nearly invisible at night -- light effect is the focus

FIXTURE COUNT RULE:
- ONE fixture per window unit -- no exceptions
- Double window = ONE fixture (on mullion)
- Triple window = ONE fixture (centered middle window)
- Do NOT use multiple fixtures for a single window assembly

HOT SPOT AVOIDANCE & WATTAGE:
- CRITICAL: Avoid hot spots (overly bright area at fixture base). Light should be EVEN from base to soffit.
- Angle fixture so beam starts on wall 12-18 inches above ground, NOT at fixture height
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED (800-1200 lumens)
- Light BRIGHTEST at mid-wall, not at base
- Tilt fixture BACK 15-20 degrees from vertical to throw light UP and reduce hot spot

STRICT EXCLUSION ZONES:
- Do NOT place fixtures directly under SHUTTERS
- Do NOT place fixtures on BLANK SIDING or wall piers between windows
- Do NOT place fixtures on concrete, pavers, driveways, or walkways
- Do NOT aim beam directly AT the glass surface
- Do NOT skip windows because of landscaping
- Do NOT use multiple fixtures per window
- Do NOT place off-center from window axis
- Adjacent wall piers receive SPILL LIGHT only, not dedicated fixtures

RELATIONSHIP TO SIDING PRESET:
- If SIDING preset is also active: windows get centered fixtures, wall piers get separate fixtures
- If ONLY windows preset is active: wall piers between windows remain darker (spill light only)
- These presets are complementary, not overlapping`,
  negativePrompt: `ABSOLUTE PROHIBITION (1ST STORY WINDOWS): Do NOT place fixtures off-center from windows. Do NOT skip windows due to landscaping. Do NOT place on wall piers between windows. Do NOT aim directly at glass. Do NOT use multiple fixtures per window. ONE fixture centered under each window only.`
},
      {
        id: 'entryway',
        label: 'Entryway',
        description: 'Flanking main entry door',
        prompt: `TARGET: MAIN ENTRYWAY -- ARCHITECTURAL PORTAL FRAMING WITH FLANKING UPLIGHTS

IDENTIFICATION:
- Locate the PRIMARY entrance door
- Identify architectural features: decorative trim/casing, sidelights, transom, columns/pilasters, archway, portico, pediment

FIXTURE PLACEMENT (CRITICAL):
- Place EXACTLY TWO ground-staked brass up lights: one LEFT and one RIGHT of the entry door
- Distance from wall/column surface: 4-6 inches
- Beams angled to graze the architecture and visually converge overhead

PLACEMENT BY SCENARIO:
- COLUMNS/PILASTERS flank door: place at base of each column, 4-6 inches from face, angled upward along shaft
- SIDELIGHTS flank door: place at outer edge of sidelight assembly, grazing vertical trim/casing
- PLAIN WALL/TRIM only: place at outer edges of door casing, grazing vertical molding up to soffit line
- PORTICO/ROOF OVERHANG above door: angle beams to illuminate underside of overhang
- ARCHWAY surrounds door: illuminate arch legs to trace the curve overhead

SETBACK & ANGLE:
- Keep fixtures 4-6 inches from vertical surface
- Stake in planting bed/mulch (NOT on porch floor or steps)
- Beam angled slightly inward toward door frame

LIGHT PHYSICS:
- Use WALL GRAZING for textured surfaces (stone/brick) or WALL WASHING for smooth surfaces
- Hotspot at ground level beside each door edge
- Beams travel upward grazing the framing elements
- Illuminate header, transom, or underside of portico/roof overhang
- Beams converge to create a subtle halo above the door
- Small spill onto door surface is acceptable

SHADOWS & TEXTURE:
- Grazing reveals trim profiles, column fluting, and surface texture
- Door hardware may catch subtle reflections

FIXTURE APPEARANCE:
- Small cylindrical brass/bronze ground-stake fixtures
- Low-profile, nearly invisible at night
- Fixtures MUST be a symmetrical pair

STRICT EXCLUSION ZONES:
- No fixtures in the CENTER of walkway or porch (trip hazard)
- No fixtures on concrete, pavers, or steps
- No downlighting
- No lighting directed toward viewer/street
- Door is FRAMED by light, not blasted with light
- Maintain perfect symmetry`,
        negativePrompt: `ABSOLUTE PROHIBITION (ENTRYWAY): Do NOT place lights in the center walking path. Do NOT place only one fixture -- must be a symmetrical pair. Do NOT aim lights directly at the door surface.`
      },
      {
        id: 'columns',
        label: 'Columns',
        description: 'Base of architectural pillars',
        prompt: `TARGET: ARCHITECTURAL COLUMNS, PILLARS & POSTS -- VERTICAL SHAFT GRAZING

IDENTIFICATION:
- Locate ALL vertical columnar elements across the facade
- Types: round classical columns, square pillars, tapered columns, porch posts, pilasters, stone/brick piers

FIXTURE PLACEMENT:
- Place ONE ground-staked brass up light at the BASE of EACH column
- Center fixture on the column footprint (front face)

PLACEMENT BY COLUMN TYPE:
- ROUND COLUMNS: center on front face, 3-4 inches from surface; beam grazes shaft for vertical highlight with soft side shadows
- SQUARE PILLARS: center on front face, 4-6 inches from surface; light grazes flat plane to reveal panel details
- TAPERED COLUMNS: base-centered; light follows taper upward
- PILASTERS: at base, tight to wall; grazes raised surface; subtle edge shadows
- STONE/BRICK PIERS: 4-6 inches from face; dramatic texture grazing to reveal mortar joints

SETBACK DISTANCE:
- Smooth surfaces (painted wood/vinyl): 6-8 inches for soft wash
- Textured surfaces (stone/brick/fluted): 3-6 inches for dramatic graze
- If in planting bed or at porch edge, place in bed/mulch -- NOT on porch floor

LIGHT PHYSICS:
- Use WALL GRAZING technique
- Hotspot at base of column
- Beam travels VERTICALLY UP the full column shaft in a narrow illumination corridor
- MUST reach CAPITAL, ENTABLATURE, and SOFFIT above
- Falloff: brightest at base but sufficient intensity to illuminate full height
- Fluted columns produce rhythmic light/shadow pattern per groove

SHADOW & TEXTURE:
- Grazing reveals surface texture and architectural details
- Round columns show vertical highlight with wrapping shadows
- Square columns show crisp edge definition
- Trim and shaft elements cast thin shadows

FIXTURE APPEARANCE:
- Small brass/bronze ground stake
- Low-profile and discreet

MULTIPLE COLUMN PROTOCOL:
- For rows of columns, EACH column receives its own fixture
- Same setback and centering for visual rhythm
- Spaces BETWEEN columns stay darker for contrast

HOT SPOT AVOIDANCE & WATTAGE:
- CRITICAL: Avoid hot spots (overly bright area at fixture base). Light should be EVEN from base to soffit.
- Angle fixture so beam starts on wall 12-18 inches above ground, NOT at fixture height
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED (800-1200 lumens)
- Light BRIGHTEST at mid-wall, not at base
- Tilt fixture BACK 15-20 degrees from vertical to throw light UP and reduce hot spot

STRICT EXCLUSION ZONES:
- No fixtures in gaps BETWEEN columns
- No fixtures on porch floor or deck surface
- No side lighting from distance
- No horizontal beam spread
- No downlighting from above
- Avoid broad flood beams
- Fixtures should be visually unobtrusive`,
        negativePrompt: `ABSOLUTE PROHIBITION (COLUMNS): Do NOT place lights in the open space between columns. Do NOT skip columns in a row -- all must be lit for symmetry. Do NOT use broad flood fixtures.`
      },
      {
  id: 'trees',
  label: 'Trees',
  description: 'Uplighting trees and large shrubs',
  prompt: `TARGET: TREES & LARGE SHRUBS -- CANOPY UPLIGHTING

IDENTIFICATION SCAN:
- Locate ALL significant trees within 15 feet of the home
- Include: deciduous trees, evergreens, ornamental trees, large specimen shrubs
- Note trunk location, canopy spread, and branch structure

FIXTURE SPECIFICATIONS:
- Type: ground-staked brass up light (bullet or well light style)
- Housing: solid brass/bronze, low-profile
- Beam: narrow to medium (15-35 degrees) depending on tree size
- For large canopy trees: use 2-3 fixtures around trunk

PLACEMENT GEOMETRY:
- Single trunk trees: place fixture 1-2 feet from trunk base
- Multi-trunk trees: place fixtures to illuminate each major trunk
- Angle beam UP into the canopy center
- For trees near house: position fixture so light grazes toward home

TREE SIZE PROTOCOL:
- SMALL trees (under 15 ft): ONE fixture, narrow beam
- MEDIUM trees (15-25 ft): ONE or TWO fixtures, medium beam
- LARGE trees (over 25 ft): TWO or THREE fixtures around trunk base

LIGHT PHYSICS:
- Beam originates at ground level near trunk
- Light travels UP through branch structure into canopy
- Illuminates: trunk texture, primary branches, leaf/needle mass
- Creates dramatic silhouette and shadow play
- Moonlighting effect on ground below (light filtering through leaves)

CANOPY ILLUMINATION:
- Deciduous trees: branch architecture visible, leaves glow
- Evergreens: needle texture emphasized, dense glow
- Palm trees: illuminate trunk texture and frond undersides
- Ornamental trees: highlight unique form and features

REALISM REQUIREMENTS:
- Warm, soft glow characteristic of low-voltage LED
- Natural light falloff through canopy
- Some light escapes through gaps in foliage
- Ground receives dappled shadow patterns
- Fixture nearly invisible at night

HOT SPOT AVOIDANCE & WATTAGE:
- CRITICAL: Avoid hot spots (overly bright area at fixture base). Light should be EVEN from base to soffit.
- Angle fixture so beam starts on wall 12-18 inches above ground, NOT at fixture height
- 1ST STORY ONLY (8-12 ft): 3-5 watt LED (200-400 lumens)
- 2ND STORY REACH (18-25 ft): 6-10 watt LED (500-800 lumens)
- TALL FACADES (25+ ft): 10-15 watt LED (800-1200 lumens)
- Light BRIGHTEST at mid-wall, not at base
- Tilt fixture BACK 15-20 degrees from vertical to throw light UP and reduce hot spot

STRICT EXCLUSION ZONES:
- Do NOT place fixtures where they will be hit by mowers
- Do NOT aim light toward windows or neighbor properties
- Do NOT over-light small ornamental trees
- Do NOT place on hardscape or lawn (use bed areas when possible)
- Do NOT create hot spots on trunk -- light should reach canopy`,
  negativePrompt: `ABSOLUTE PROHIBITION (TREES): Do NOT aim tree lights toward house windows. Do NOT place in open lawn if avoidable. Do NOT over-light small trees with multiple fixtures.`
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
  prompt: `TARGET: PEDESTRIAN WALKWAYS & SIDEWALKS -- POOL-OF-LIGHT WAYFINDING

IDENTIFICATION:
- Locate all pedestrian walkways: front walk from street/driveway to front door, side paths, garden paths, patio transitions
- Distinguish from driveways (vehicle paths)

FIXTURE SPECIFICATIONS:
- Style: cast brass "china hat" or dome-top path light
- Height: 22 inches tall
- Material: solid brass with aged bronze patina finish
- Light distribution: 360-degree omnidirectional downward projection
- Ground light pool diameter: approximately 6-8 feet

PLACEMENT PRIORITY (CRITICAL):
- PREFERRED: Place fixtures IN landscaping beds/mulch alongside the pathway, NOT in the path itself
- Position fixtures at the edge of planting beds where they meet the pathway
- If no landscaping exists, place at pathway edge in grass/groundcover
- AVOID: Placing fixtures directly in the middle of walkways or on hardscape
- Fixtures illuminate the path from the SIDE, not obstruct foot traffic
- Setback from path edge: 6-8 inches INTO the landscaping bed

PLACEMENT GEOMETRY:
- Place fixtures in a STAGGERED ZIGZAG pattern along the path
- Alternate left and right sides for depth and coverage
- Spacing: 8-10 feet apart along the zigzag line

PLACEMENT SPECIFICS:
- First fixture: near the PATH START (street or driveway junction)
- Last fixture: near the DESTINATION (porch, steps, door threshold)
- For NARROW WALKWAYS (<4 ft wide): single-side placement, fixtures every 6-8 feet
- For CURVED PATHS: place on OUTSIDE of curves for visibility; add fixture on INSIDE of tight turns

LIGHT BEHAVIOR:
- Light projects DOWNWARD through 360-degree spread beneath the hat
- Creates soft, circular pools of light on the ground
- Pools should TOUCH or SLIGHTLY OVERLAP to avoid dark gaps
- Glare shield from hat prevents direct bulb visibility
- Fixture silhouette visible by day; warm glow at night

FUNCTIONAL PURPOSE:
- Define the walking path with a "breadcrumb trail" of light pools
- Improve safety and wayfinding
- Create welcoming approach to the home

STRICT EXCLUSION ZONES:
- Do NOT place fixtures ON concrete, pavers, or any hardscape surface
- Do NOT place fixtures IN the walking path -- always in adjacent beds
- Do NOT place in open lawn areas away from path edge
- Do NOT place along driveways (use driveway preset)
- No uplighting -- downward projection only
- No direct glare toward street or windows
- No exposed bulbs -- hat must shield the light source`,
  negativePrompt: `ABSOLUTE PROHIBITION (PATHWAY): Do NOT place path lights on concrete or pavement. Do NOT place path lights IN the walkway. Always place in adjacent landscaping beds. Do NOT place along driveways. Do NOT create dark gaps between light pools.`
},
      {
        id: 'driveway',
        label: 'Driveway',
        description: 'Along vehicle entry',
        prompt: `TARGET: DRIVEWAY EDGES -- VEHICLE ENTRY DELINEATION LIGHTING

IDENTIFICATION:
- Locate the DRIVEWAY: apron (where it meets street), full LENGTH of both edges, terminus (garage/carport/parking area)
- Identify curves, bends, and widening areas (turnarounds, parking pads)

FIXTURE SPECIFICATIONS:
- Style: cast brass "china hat" or dome-top path light
- Height: 22 inches tall
- Material: solid brass with aged bronze patina finish
- Light distribution: 360-degree omnidirectional downward projection
- Ground light pool diameter: approximately 6-8 feet

PLACEMENT GEOMETRY:
- Place fixtures on BOTH SIDES of the driveway along left and right edges

PATTERN BY DRIVEWAY LENGTH:
- SHORT DRIVEWAYS (<40 ft): PARALLEL placement -- fixtures directly across from each other; spacing 10-12 feet apart on each edge
- LONG DRIVEWAYS (40+ ft): STAGGERED ZIGZAG -- alternating left/right; spacing 10-15 feet along the zigzag line

PLACEMENT SPECIFICS:
- Setback: 6-8 inches into lawn/landscape from pavement edge
- First fixtures: at the DRIVEWAY APRON (one on each side at street entry)
- Last fixtures: near the TERMINUS (garage or parking area)
- Edge should be clearly defined by light pools

CURVE & BEND PROTOCOL:
- On OUTSIDE curves: place fixtures closer (8-10 feet apart)
- On INSIDE curves: add an extra fixture
- Curves require MORE fixtures to maintain edge definition

WIDENING AREAS:
- Continue fixtures around the perimeter of turnarounds and parking pads
- Maintain consistent spacing

LIGHT BEHAVIOR:
- Light projects DOWNWARD through 360-degree spread
- Creates soft circular pools on the ground
- Pools should TOUCH or SLIGHTLY OVERLAP to define edges continuously
- Pavement receives spill light from adjacent pools

FUNCTIONAL PURPOSE:
- Guide vehicles safely along the driveway
- Prevent veering onto lawn
- Define entry visible from street
- Create welcoming approach
- Deter intruders by eliminating dark zones

FIXTURE VISIBILITY:
- 22-inch height places light at bumper/wheel-well level
- Fixtures appear as brass sentinels along the drive
- Create a glowing corridor at night

STRICT EXCLUSION ZONES:
- No fixtures ON driveway pavement
- No fixtures along pedestrian walkways (use pathway preset)
- No fixtures in garden beds NOT bordering driveway
- No fixtures in open lawn areas NOT bordering driveway
- No single-side lighting on driveways over 20 feet long
- No dark gaps between light pools
- No uplighting
- No fixtures blocking vehicle path at garage/terminus
- Do NOT mix driveway lights with pedestrian pathway lights in the same run`,
        negativePrompt: `ABSOLUTE PROHIBITION (DRIVEWAY): Do NOT place path lights on driveway pavement. Do NOT use single-side lighting on long driveways. Do NOT leave dark gaps between pools. Do NOT place along pedestrian walkways.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (LANDSCAPING): Do NOT place path lights along walkways or driveways. Do NOT place on bed edges. Do NOT place in open lawn. Interior bed placement only.`
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
        prompt: `TARGET: GARAGE PIERS -- WALL GRAZING FROM FLUSH IN-GROUND FIXTURES

IDENTIFICATION:
- Locate ALL vertical wall surfaces (piers) associated with garage doors
- Identify: FAR LEFT pier, FAR RIGHT pier, and CENTER pier(s) between doors (if applicable)

PIER COUNT BY GARAGE CONFIGURATION:
- SINGLE-CAR GARAGE (one door): 2 fixtures (left pier + right pier)
- DOUBLE-WIDE DOOR (one large door): 2 fixtures (left pier + right pier)
- TWO SINGLE DOORS with center pier: 3 fixtures (left + center + right)
- THREE-CAR GARAGE: 4 fixtures (left + center + center + right)

FIXTURE SPECIFICATIONS:
- Type: flush-mounted core drill well light
- Housing: brass/bronze with tempered glass lens
- Installation: recessed into concrete driveway, level with grade
- Protrusion: ZERO -- completely flush with pavement
- Light output: upward projection for wall grazing

PLACEMENT GEOMETRY:
- Drill fixtures into driveway concrete at the BASE of each pier
- Distance from wall face: 4-6 inches
- Center fixture on pier WIDTH (horizontally centered on the pier face)
- ONE fixture per pier

LIGHT PHYSICS:
- Use WALL GRAZING technique
- Beam originates at ground level and projects STRAIGHT UP along pier face
- Reveals texture: stone, brick, mortar joints, wood grain, stucco patterns
- Light travels vertically to illuminate soffit/roofline above garage
- Brightest at base with natural vertical falloff

VISIBILITY & SAFETY:
- Daytime: small circular lens flush with concrete -- barely visible
- Nighttime: dramatic vertical light columns on piers
- Zero protrusion = vehicle-safe and trip-free
- Fixtures rated for drive-over traffic loads

RELATIONSHIP TO DOORS:
- Garage DOORS remain relatively dark (no direct light on door panels)
- PIERS glow dramatically
- Creates a "picture frame" effect framing the door openings

STRICT EXCLUSION ZONES:
- Do NOT place fixtures IN FRONT OF garage doors (center of door opening)
- Do NOT place fixtures in the CENTER of the driveway driving path
- Do NOT place in lawn, mulch, or planting beds
- Do NOT place fixtures directly ON the door surface
- Do NOT aim beams at door panels
- Fixtures must be FLUSH-MOUNTED only -- no above-ground fixtures
- Maximum 6 inches from wall to maintain proper grazing angle`,
        negativePrompt: `ABSOLUTE PROHIBITION (GARAGE SIDES): Do NOT place lights in front of garage doors. Do NOT place in center of driveway. Do NOT use protruding fixtures. Flush-mount in concrete only, aimed at PIERS.`
      },
      {
        id: 'garage_door',
        label: 'Garage Door',
        description: 'Wash light on door face and siding above',
        prompt: `TARGET: GARAGE DOOR PANELS -- WALL WASHING FROM FLUSH IN-GROUND FIXTURES

IDENTIFICATION:
- Locate EACH garage door panel
- Types: single-car doors, double-wide doors (16-18 ft), multiple single doors
- Identify wall area ABOVE each door up to soffit line

FIXTURE SPECIFICATIONS:
- Type: flush-mounted core drill well light
- Housing: brass/bronze with tempered glass lens
- Installation: recessed into concrete driveway, level with grade
- Protrusion: ZERO -- completely flush with pavement
- Beam spread: WIDE (for wall washing, not narrow grazing)

PLACEMENT GEOMETRY:
- Drill fixtures into driveway concrete, CENTERED in front of each door
- Distance from door face: 24-36 inches (further back than pier grazing)
- For DOUBLE-WIDE DOORS: use TWO fixtures at the 1/3 and 2/3 points across door width

FIXTURE COUNT BY DOOR TYPE:
- 1 SINGLE DOOR: 1 fixture (centered)
- 1 DOUBLE-WIDE DOOR: 2 fixtures (at 1/3 points)
- 2 SEPARATE SINGLE DOORS: 2 fixtures (one per door)
- 3 SINGLE DOORS: 3 fixtures (one per door)

LIGHT PHYSICS:
- Use WALL WASHING technique (not narrow grazing)
- Beam originates at ground and projects upward at slight angle
- Light WASHES the entire door surface evenly
- Light CONTINUES ABOVE the door to illuminate header, trim, and wall/siding up to soffit
- Wider beam spread creates smooth, even illumination

COVERAGE OBJECTIVE:
- Full door face illumination from bottom to top
- Continuation above door -- light does NOT stop at door top
- Soffit receives ambient glow from wash

VISIBILITY & SAFETY:
- Daytime: flush lens barely visible
- Nighttime: doors glow warmly as focal points
- Zero protrusion = vehicle-safe
- Fixtures in approach zone must be drive-over rated

STRICT EXCLUSION ZONES:
- Do NOT place fixtures at PIER bases (use garage_sides preset)
- Do NOT place in lawn, mulch, or planting beds
- Do NOT use narrow grazing beams -- wide wash only
- Do NOT let light stop at door top -- MUST continue to soffit
- Minimum 24 inches from door face to prevent harsh grazing
- Do NOT use single fixture for double-wide doors`,
        negativePrompt: `ABSOLUTE PROHIBITION (GARAGE DOOR): Do NOT place lights at pier bases. Do NOT use narrow grazing beams. Light MUST wash above door to soffit. Do NOT place closer than 24 inches to door face.`
      },
      {
        id: 'sidewalks',
        label: 'Sidewalks',
        description: 'Embedded marker lights in walkways',
        prompt: `TARGET: SIDEWALKS & WALKWAYS -- EMBEDDED MARKER LIGHTS FOR PATH DEFINITION

IDENTIFICATION:
- Locate all CONCRETE pedestrian walkways: front walk, side paths, driveway-to-entry paths, patio transitions
- Include paver/flagstone paths with concrete joints
- EXCLUDE: driveways, grass/lawn paths, mulch beds, loose gravel paths

FIXTURE SPECIFICATIONS:
- Type: flush-mounted core drill well light or paver dot light
- Housing: brass or stainless steel
- Lens: tempered glass or polycarbonate
- Installation: recessed into concrete/paver surface, level with grade
- Protrusion: ZERO
- Light intensity: LOW -- marker glow, not area illumination
- Distribution: wide diffused or omnidirectional

PLACEMENT GEOMETRY:
- Embed fixtures along the EDGES of the path (not center)

PATTERN OPTIONS:
- STAGGERED EDGE (recommended): alternate left/right edges; 6-8 feet spacing along path; 2-3 inch inset from edge
- PARALLEL EDGE (for walkways >4 ft wide): fixtures on both edges opposite each other; 8-10 feet spacing per edge
- SINGLE EDGE (for narrow walkways <3 ft): one side only; 5-6 feet spacing

PLACEMENT SPECIFICS:
- Setback from edge: 2-3 inches
- First fixture: near path START (street/driveway junction)
- Last fixture: near path END (porch, steps)
- Add fixtures at CURVES to maintain edge definition

LIGHT BEHAVIOR:
- MARKER LIGHTING only -- soft, low glow
- Each fixture creates small illumination pool (2-3 ft diameter)
- No uplighting -- light stays on ground plane
- "Breadcrumb trail" effect guiding the way
- Fixtures appear as embedded jewels

STEP/ELEVATION PROTOCOL:
- Place fixture at TOP and BOTTOM of any steps
- Indicate elevation changes with light markers

WALKING SURFACE ILLUMINATION:
- Reveals surface texture and color
- Subtle shadows add visual interest
- Safety-focused: shows path edges and changes

VISIBILITY & SAFETY:
- Daytime: small circular flush lens
- Nighttime: gentle glow defines path
- Zero protrusion = trip-free
- Durable for foot traffic

STRICT EXCLUSION ZONES:
- Do NOT place in driveways (use driveway preset)
- Do NOT place in grass, lawn, or mulch
- Do NOT place in CENTER of wide walkways
- Do NOT aim at vertical walls -- ground plane only
- No protruding fixtures
- No high-power uplights
- Maximum spacing: 10 feet`,
        negativePrompt: `ABSOLUTE PROHIBITION (SIDEWALKS): Do NOT embed lights in driveways. Do NOT place in lawn or mulch. Do NOT aim at vertical walls. Edge placement only, not center of walkway.`
      },
      {
        id: 'driveway',
        label: 'Driveway',
        description: 'Surface marker lights',
        prompt: `TARGET: DRIVEWAY SURFACE -- EMBEDDED MARKER LIGHTS FOR EDGE DEFINITION

IDENTIFICATION:
- Locate the DRIVEWAY: apron (street entry), full length of BOTH edges, terminus (garage/parking)
- Identify curves, bends, and widening areas (turnarounds, parking pads)

FIXTURE SPECIFICATIONS:
- Type: flush-mounted core drill well light or driveway marker
- Housing: brass or stainless steel
- Lens: tempered glass or polycarbonate
- Installation: recessed into concrete/asphalt/pavers, level with surface
- Protrusion: ZERO
- Light intensity: LOW -- marker glow
- Rating: VEHICLE TRAFFIC rated

PLACEMENT GEOMETRY:
- Embed fixtures along BOTH EDGES of the driveway to define the corridor

PATTERN OPTIONS:
- STAGGERED EDGE: alternate left/right edges; 10-15 feet spacing along length; 3-4 inches from pavement edge
- PARALLEL EDGE: fixtures on both edges across from each other; 12-15 feet spacing per edge; pairs mark driveway width

PLACEMENT SPECIFICS:
- First fixtures: at DRIVEWAY APRON (street entry) -- one on each side
- Last fixtures: near TERMINUS (garage or parking area)
- Both edges must be lit to define corridor
- Setback from edge: 3-4 inches (avoid edge damage)

CURVE & TURN PROTOCOL:
- On curves: place fixtures CLOSER (8-10 feet apart)
- More fixtures on OUTSIDE of curves
- Add fixtures on INSIDE of tight turns

WIDENING AREAS:
- Continue around full PERIMETER of turnarounds and parking pads
- Maintain consistent spacing

LIGHT BEHAVIOR:
- MARKER LIGHTING with soft glow
- Each fixture creates small illuminated patch (2-4 ft diameter) on pavement
- No uplighting -- light stays on ground plane
- "Runway" edge definition effect

GROUND PLANE ONLY:
- No vertical wall grazing
- Lighting remains on pavement surface

VISIBILITY & SAFETY:
- Daytime: flush lens appearance
- Nighttime: glowing edge markers define corridor
- Zero protrusion
- Vehicle-load rated fixtures

STRICT EXCLUSION ZONES:
- Do NOT place along pedestrian walkways (use sidewalks preset)
- Do NOT place in grass, lawn, or planting beds
- Do NOT aim at vertical walls
- No protruding fixtures
- No high-intensity uplights
- Stay 3-4 inches from pavement edge`,
        negativePrompt: `ABSOLUTE PROHIBITION (DRIVEWAY): Do NOT embed lights along pedestrian walkways. Do NOT place in grass or beds. Do NOT aim at walls. Edge markers only, ground plane illumination.`
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
        prompt: `TARGET: DORMERS -- GUTTER-MOUNTED UPLIGHTS FOR UPPER-STORY DORMER ILLUMINATION

IDENTIFICATION:
- Locate ALL dormers on the roofline
- Types: gable dormers, shed dormers, hipped dormers, eyebrow dormers
- Identify dormer face (front wall), dormer window, and dormer roof

FIXTURE SPECIFICATIONS (STRICT - MANDATORY):
- Type: VERY SMALL compact mini bullet up light - TINY fixture
- Housing: DARK BRONZE finish - this is REQUIRED, no brass or silver
- Color: Dark bronze / dark brown / oil-rubbed bronze finish only
- Size: VERY SMALL/MINI/COMPACT fixture - smaller than a fist - NOT large floodlights
- Profile: ULTRA LOW-PROFILE design that sits discreetly INSIDE the gutter trough
- Mounting: INSIDE the gutter trough ONLY - fixture sits IN the gutter channel
- Beam spread: narrow to medium -- focused wash on dormer face

PLACEMENT GEOMETRY (STRICT RULE - CRITICAL):
*** EXACTLY ONE (1) FIXTURE PER DORMER - THIS IS MANDATORY ***
- Each dormer receives ONE and ONLY ONE gutter-mounted up light
- The fixture MUST be placed INSIDE the gutter inner wall directly BELOW the dormer
- The fixture MUST be CENTERED horizontally under the dormer (aligned with the dormer's vertical centerline)
- The fixture sits INSIDE the horizontal gutter channel/trough - NOT on the lip, NOT on fascia
- COUNT RULE: If the house has 2 dormers, place exactly 2 lights. If 3 dormers, exactly 3 lights.
- FORBIDDEN: Multiple lights per dormer, lights placed between dormers, lights on roof shingles, lights on gutter lip

MOUNTING LOCATION (STRICT):
- INSIDE GUTTER TROUGH ONLY: fixture sits IN the inner gutter channel, aims up at dormer
- The fixture is small enough to fit inside the gutter without blocking water flow
- FORBIDDEN: On gutter lip, on fascia board, on roof surface

ALIGNMENT:
- HORIZONTAL: centered on dormer width
- VERTICAL: on gutter/fascia line at base of main roof slope below dormer

LIGHT PHYSICS:
- Beam projects UPWARD from gutter line
- Washes the dormer FACE (front wall and trim)
- Illuminates dormer window frame (not direct glare into glass)
- Light grazes dormer siding texture
- Reveals architectural trim and details
- Subtle spillover onto dormer roof edges

TARGET REACH - MANDATORY:
- Light beam MUST reach and illuminate the dormer face completely
- Fixture mounts against INNER GUTTER WALL, beam travels up to dormer
- Distance from gutter to dormer is typically 10-25 feet - beam MUST span this distance
- The dormer face should be visibly illuminated, not just the space between
- Light must fully wash the dormer - never fall short of the target

WIRING:
- Wires concealed in gutter trough or routed through downspout
- Low-voltage connections at gutter level

RATIONALE -- WHY GUTTER MOUNTING:
- Dormers are 15-25+ feet above ground -- too high for effective ground uplighting
- Gutter mounting places light source inside the gutter inner wall below from dormer face
- Prevents "black hole" effect of unlit dormers
- Creates glowing dormer against dark roofline

FIXTURE VISIBILITY:
- Daytime: small fixture on gutter line -- subtle
- Nighttime: dormer glows; fixture hidden by roof angle from ground view

STRICT EXCLUSION ZONES:
- Do NOT mount fixtures ON the dormer face or dormer roof
- Do NOT mount on sloped main roof surface
- Do NOT aim directly INTO dormer window glass
- Do NOT use one fixture for multiple dormers -- one fixture per dormer
- Do NOT skip dormers -- all dormers should be lit for balance
- Ensure SYMMETRIC placement for balanced facade`,
        negativePrompt: `ABSOLUTE PROHIBITION (DORMERS): EXACTLY ONE VERY SMALL DARK BRONZE light per dormer - no more, no less. Fixture must be TINY and mount INSIDE the gutter inner wall , CENTERED directly below dormer. Do NOT use large fixtures. Do NOT use brass or silver fixtures. Do NOT mount on gutter lip or fascia. Do NOT mount multiple lights per dormer. Do NOT place lights between dormers. Do NOT mount on dormer surface or roof shingles. Do NOT aim into window glass.`
      },
      {
        id: 'peaks',
        label: 'Peaks & Gables',
        description: 'Apex of roof gables',
        prompt: `TARGET: ROOF PEAKS & GABLES -- GUTTER-MOUNTED UPLIGHTS FOR TRIANGULAR PEAK ILLUMINATION

IDENTIFICATION:
- Locate ALL prominent gables on the roofline
- Types: front-facing gables, side gables, cross gables, stacked gables, decorative gable ends
- Distinguish from DORMERS (dormers are separate structures; gables are part of main roof)
- Identify: gable TRIANGLE (the triangular wall section), gutter line at gable BASE, gable APEX (peak point)

FIXTURE SPECIFICATIONS (STRICT - MANDATORY):
- Type: SMALL compact brass bullet or mini flood up light with gutter-mount bracket
- Housing: CAST BRASS or BRONZE - this is REQUIRED, no other material
- Size: SMALL/COMPACT fixture - NOT large floodlights
- Profile: LOW-PROFILE design that sits discreetly INSIDE the gutter trough
- Mounting: INSIDE the gutter trough ONLY - fixture sits IN the gutter channel
- Beam spread: narrow to medium -- focused vertical emphasis

HARD RULE - MANDATORY:
- Fixture MUST be placed INSIDE the gutter trough - NOT on roof, NOT on shingles, NOT on gutter lip
- The fixture sits IN the gutter channel itself, aiming upward
- FORBIDDEN: Placing fixture on roof surface, on shingles, on gutter edge/lip, or anywhere outside the gutter

PLACEMENT GEOMETRY:
- Place ONE fixture per gable peak
- Mount INSIDE the gutter trough at the BASE of the gable triangle
- Center fixture on the gable's VERTICAL CENTERLINE (directly under the apex)

MOUNTING (ONLY OPTION):
- INSIDE GUTTER TROUGH ONLY: fixture sits IN the gutter channel, aims straight up toward apex

ALIGNMENT:
- HORIZONTAL: centered on gable width (aligned with apex above)
- VERTICAL: at gutter/fascia line where gable triangle meets horizontal roofline

LIGHT PHYSICS:
- Beam projects STRAIGHT UP along gable face toward apex
- WALL GRAZING technique for vertical emphasis
- Reveals siding texture on gable face (lap siding, board and batten, shingles, stone)
- Illuminates gable vent, decorative trim, or accent features
- Light travels from gutter line to apex with natural falloff
- Creates dramatic triangular illumination

TARGET REACH - MANDATORY:
- Light beam MUST travel from INNER GUTTER WALL all the way to the gable APEX
- Fixture mounts against inner gutter wall, beam projects upward along gable face
- Gable heights vary from 8-30+ feet - beam MUST span the full height
- The entire triangular gable face should show wall grazing effect
- Light intensity at apex should still be visible (with natural falloff)
- Light must reach the peak - never fall short of the apex

GABLE HIERARCHY (if budget limited):
- Priority 1: MAIN FRONT-FACING GABLE (most prominent)
- Priority 2: Flanking front gables
- Priority 3: Side-facing gables visible from approach
- Priority 4: Rear or less visible gables
- Avoid leaving prominent gables unlit

FIXTURE VISIBILITY:
- Daytime: subtle fixture on gutter line
- Nighttime: gable face glows dramatically; fixture hidden

HEIGHT & DRAMA:
- Gutter mounting creates proper grazing angle for tall gables
- Elevates perceived height of home
- Eye follows light path from gutter to apex

STRICT EXCLUSION ZONES:
- Do NOT place fixtures meant for DORMERS (separate preset)
- Do NOT mount on sloped roof surface
- Do NOT mount at the apex (fixture at BASE looking UP)
- Do NOT aim outward or downward -- UPWARD only
- Do NOT place off-center from gable vertical axis
- ONE fixture per peak -- no doubling up
- Do NOT leave gaps in gable lighting -- maintain consistent illumination across facade`,
        negativePrompt: `ABSOLUTE PROHIBITION (PEAKS & GABLES): Fixture must be INSIDE the gutter trough ONLY. Do NOT mount on roof surface or shingles. Do NOT mount on gutter lip or edge. Do NOT mount at the apex. Do NOT use for dormers. Do NOT place off-center. Base-mounted INSIDE GUTTER, centered under apex, upward projection only.`
      },
      {
        id: 'secondStoryFacade',
        label: '2nd Story Facade',
        description: 'Upper facade windows & siding',
        prompt: `TARGET: 2ND STORY FACADE -- FIRST-STORY GUTTER-MOUNTED UPLIGHTS FOR UPPER FACADE ILLUMINATION

HARD RULE - CRITICAL MOUNTING REQUIREMENT:
*** FIXTURES MUST BE MOUNTED IN THE FIRST STORY GUTTER ***
*** FIXTURES MUST AIM UPWARD TO ILLUMINATE THE SECOND STORY ABOVE ***
*** FIXTURES MUST NEVER AIM DOWNWARD ***

IDENTIFICATION:
- Locate the FIRST STORY GUTTER LINE (the gutter between 1st and 2nd floors)
- Identify the second story facade ABOVE this gutter line
- Note: upper-level windows, siding sections, decorative trim, shutters on the 2nd story
- Focus on second story areas that can be washed with uplight FROM BELOW

FIXTURE SPECIFICATIONS (STRICT - MANDATORY):
- Type: SMALL compact brass bullet or mini flood UP LIGHT with gutter-mount bracket
- Housing: CAST BRASS or BRONZE - this is REQUIRED, no other material
- Size: SMALL/COMPACT fixture - NOT large floodlights
- Profile: LOW-PROFILE design that sits discreetly INSIDE the first story gutter trough
- Mounting: INSIDE the first story gutter trough ONLY - fixture sits IN the gutter channel
- Beam spread: medium to wide -- soft wall wash coverage projecting UPWARD

HARD RULE - MANDATORY:
- Fixture MUST be placed INSIDE the gutter trough - NOT on roof, NOT on shingles, NOT on gutter lip
- The fixture sits IN the gutter channel itself, aiming upward
- FORBIDDEN: Placing fixture on roof surface, on shingles, on gutter edge/lip, or anywhere outside the gutter

PLACEMENT GEOMETRY:
- Mount fixtures INSIDE the FIRST STORY GUTTER TROUGH (NOT the roofline gutter)
- Space fixtures evenly along the first story gutter line
- Typical spacing: 4-6 feet apart depending on beam spread and facade width
- Position to illuminate the second story wall ABOVE the fixtures
- Aim to wash BOTH windows AND the siding/wall areas around them on the 2nd story

MOUNTING LOCATION (ONLY OPTION - FIRST STORY GUTTER TROUGH ONLY):
- INSIDE FIRST STORY GUTTER TROUGH ONLY: fixture sits IN the gutter channel, aims UPWARD at 2nd story facade above

ALIGNMENT:
- HORIZONTAL: evenly distributed across facade width along the first story gutter
- VERTICAL: mounted at the first story gutter/fascia line, projecting light UPWARD onto second story wall

LIGHT PHYSICS:
- Beam projects UPWARD from first story gutter line onto second story facade
- WALL GRAZING/WASHING technique for broad, even upward illumination
- Light travels UP from first story gutter to illuminate 2nd story above
- Light WILL fall on second story windows -- this is expected and acceptable
- Illuminates second story window frames, muntins, and trim details
- Reveals siding texture on 2nd story (lap siding, board and batten, shingles, brick, stone)
- Creates warm glow on upper facade visible from street level
- Soft light on window glass adds warmth and architectural interest

WINDOW ILLUMINATION GUIDANCE:
- Light falling on second story windows IS ACCEPTABLE for this application
- The goal is overall second story facade illumination, not window avoidance
- Light on window glass creates reflective warmth at night
- Window frames and trim will be highlighted by the upward wash
- In most cases, light will naturally fall on windows -- this is intentional

SIDING & WALL COVERAGE:
- Prioritize even coverage across the second story wall surface
- Light washes UPWARD from first story gutter to second story roofline
- Reveal architectural texture and material variations
- Create smooth gradient traveling upward
- Avoid harsh hot spots -- aim for gentle wash effect

TARGET REACH - MANDATORY:
- Light beam MUST travel from first story INNER GUTTER WALL to illuminate the FULL second story height
- Fixture mounts against inner gutter wall, beam projects upward to 2nd story facade
- Typical 2nd story height: 8-12 feet above first story gutter line
- Light should reach up to the roofline/soffit of the second story
- Even coverage across the entire second story wall surface
- Light must illuminate the full 2nd story - never fall short

FIXTURE VISIBILITY:
- Daytime: subtle fixtures along first story gutter line -- discreet
- Nighttime: second story facade glows warmly; fixtures hidden at lower level

ARCHITECTURAL EMPHASIS:
- First story gutter mounting creates ideal upward angle for second story illumination
- Brings life to often-neglected upper portions of home
- Balances with ground-level lighting for complete facade treatment
- Creates welcoming, finished appearance from curb

STRICT EXCLUSION ZONES:
- Do NOT mount in the ROOFLINE gutter (top of house) -- FIRST STORY GUTTER ONLY
- Do NOT mount on roof surface or shingles -- INSIDE GUTTER TROUGH ONLY
- Do NOT mount on gutter lip or edge -- INSIDE the gutter channel ONLY
- Do NOT aim fixtures DOWNWARD -- UPWARD PROJECTION ONLY
- Do NOT confuse with DORMER lighting (separate preset for dormers only)
- Do NOT confuse with PEAKS & GABLES lighting (separate preset for gable triangles)
- Do NOT mount on sloped roof surface
- Do NOT create harsh shadows or uneven coverage
- Do NOT over-space fixtures leaving dark gaps between pools of light`,
        negativePrompt: `ABSOLUTE PROHIBITION (2ND STORY FACADE): Do NOT illuminate second story facade from first story gutter. Do NOT mount uplights in first story gutter. Do NOT wash upper walls or windows with upward light. Second story facade must remain dark. No gutter-mounted uplighting on second story siding or windows.`
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
INSTRUCTION: Refer STRICTLY to the active sub-option prompts for exact placement. Only illuminate the specific targets below (windows, columns, siding, peaks) as specified.`,
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
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT WINDOWS): Do NOT place soffit lights above solid wall sections. Do NOT place above columns. Windows only, centered on each window.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT COLUMNS): Do NOT place soffit lights above windows. Do NOT place above wall sections. Columns only, one fixture centered above each column.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT SIDING): Do NOT place soffit lights above windows. Do NOT place above columns. Wall pier sections only, between windows.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (SOFFIT PEAKS): Do NOT place in horizontal eave soffits unless requested. Do NOT place on roof surface. Peak apex location only, one per gable.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (HARDSCAPE COLUMNS): Do NOT place on retaining walls. Do NOT place on steps. Under-cap mounting on pillars only.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (RETAINING WALLS): Do NOT place on columns/pillars. Do NOT place on steps. Under-cap mounting on walls only. No large gaps on long walls.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (STEPS): Do NOT place on columns/pillars. Do NOT place on retaining walls. Under-tread mounting only. Do NOT create trip hazards.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (WELL TREES): Do NOT place in lawn areas. Do NOT place on hardscape. Do NOT aim at windows. Landscape bed placement only at tree bases.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (WELL STATUES): Do NOT create glare toward viewers. Do NOT overlight focal points. Do NOT place in water unless specifically rated.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (WELL ARCHITECTURAL): Do NOT place far from wall face. Do NOT aim at windows. Close placement required for grazing effect.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (HOLIDAY ROOFLINE): Do NOT install on sloped roof surfaces. Do NOT install on vertical walls. Horizontal eaves and fascia only. No gaps in runs.`
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
        negativePrompt: `ABSOLUTE PROHIBITION (HOLIDAY PEAKS): Do NOT outline windows. Do NOT skip prominent peaks. Both sloped edges must be lit. Apex must be connected.`
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
    prompt: `Use Warm White (2700K) for all lights.
    VISUAL RENDERING REQUIREMENTS:
    - Color: Deep amber/golden yellow (hex #FFB347)
    - Similar to: Candlelight, sunset glow, incandescent bulbs
    - Render surfaces with warm orange/amber tint where light hits
    - Shadows appear soft and inviting with warm undertones
    - Creates cozy, intimate, romantic atmosphere
    - Green foliage appears more olive/brown under this light
    - White surfaces appear creamy/warm yellow
    - This is the WARMEST option - noticeably amber/orange`
  },
  {
    id: "3000k",
    kelvin: "3000K",
    color: "#FFD18E",
    description: "Soft White",
    prompt: `Use Soft White (3000K) for all lights.
    VISUAL RENDERING REQUIREMENTS:
    - Color: Warm white with slight yellow tint (hex #FFF4E0)
    - Industry standard for professional landscape lighting
    - Balanced warm tone that flatters most materials
    - Brick appears warmer, stone maintains natural color
    - Shadows have moderate warmth
    - Green foliage retains natural color with warm highlights
    - White surfaces appear slightly warm but not yellow
    - This is the DEFAULT professional choice - warm but natural`
  },
  {
    id: "4000k",
    kelvin: "4000K",
    color: "#FFF2D7",
    description: "Cool White",
    prompt: `Use Cool White (4000K) for all lights.
    VISUAL RENDERING REQUIREMENTS:
    - Color: Neutral white, very slight warm tint (hex #FFFAF0)
    - Crisp, clean, modern appearance
    - Materials appear close to their true daylight colors
    - Excellent color rendering for architectural details
    - Shadows are neutral with minimal color cast
    - Green foliage appears vibrant and true
    - White surfaces appear clean white
    - Best for: Contemporary architecture, modern landscapes`
  },
  {
    id: "5000k",
    kelvin: "5000K",
    color: "#E3F2FD",
    description: "Daylight",
    prompt: `Use Daylight (5000K) for all lights.
    VISUAL RENDERING REQUIREMENTS:
    - Color: Bright white with slight blue tint (hex #F5FBFF)
    - Mimics natural noon daylight
    - Very high contrast, crisp shadows
    - Colors appear most vibrant and saturated
    - Can appear slightly clinical/cool
    - Green foliage appears very vivid
    - White surfaces appear bright pure white
    - Best for: Security lighting, commercial, high-visibility needs`
  },
  {
    id: "christmas",
    kelvin: "Festive",
    color: "#D32F2F",
    description: "Christmas",
    prompt: `Use Red and Green colors for all lights for a festive Christmas look.
    VISUAL RENDERING REQUIREMENTS:
    - Alternate RED (#D32F2F) and GREEN (#2E7D32) lights
    - Group colors by section OR alternate per fixture
    - Red lights cast warm red glow on nearby surfaces
    - Green lights cast cool green tint on foliage
    - Creates cheerful, festive holiday atmosphere
    - Can add white (#FFFDE7) accents sparingly`
  },
  {
    id: "halloween",
    kelvin: "Spooky",
    color: "#9C27B0",
    description: "Halloween",
    prompt: `Use Orange and Purple colors for all lights for a spooky Halloween look.
    VISUAL RENDERING REQUIREMENTS:
    - Primary: Deep PURPLE (#9C27B0) and bright ORANGE (#FF6D00)
    - Purple creates eerie, mysterious shadows
    - Orange adds warmth and pumpkin-like glow
    - Creates haunting, spooky atmosphere
    - Shadows should appear deeper and more dramatic
    - Can add touches of GREEN (#76FF03) for extra creepy effect`
  }
];

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
    STARTER_MONTHLY: {
      id: 'price_1SrNHlQ1tit8mwraqKGAf2GL',
      price: 175,
      generations: 50,
      label: 'Starter'
    },
    STARTER_YEARLY: {
      id: 'price_1SrNJdQ1tit8mwraqbC4ihcM',
      price: 1750,
      generations: 600, // 50 per month * 12
      label: 'Starter'
    },
    PRO_MONTHLY: {
      id: 'price_1SrNK5Q1tit8mwraTa5UHFWD',
      price: 250,
      generations: 125,
      label: 'Pro'
    },
    PRO_YEARLY: {
      id: 'price_1SrNKfQ1tit8mwrajmlqx1ak',
      price: 2500,
      generations: 1500, // 125 per month * 12
      label: 'Pro'
    },
    BUSINESS_MONTHLY: {
      id: 'price_1SrNLUQ1tit8mwraV4J0nB6T',
      price: 750,
      generations: -1, // unlimited
      label: 'Business'
    },
    BUSINESS_YEARLY: {
      id: 'price_1SrNM8Q1tit8mwraPzrGelaH',
      price: 7500,
      generations: -1, // unlimited
      label: 'Business'
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
