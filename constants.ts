
import type { ColorTemperature, FixturePricing } from "./types";

export const UP_LIGHT_SUBOPTIONS = [
  { 
  id: 'siding', 
  label: 'Siding', 
  description: 'Ground Staked Up Lights on Pier siding', 
  prompt: `TARGET: WALL PIERS / SIDING SECTIONS
Identify every vertical solid wall section (siding, stucco, brick, stone) BETWEEN windows across the entire home facade.

FIXTURE PLACEMENT:
- Position one ground-staked brass up light at the BASE of each wall pier
- Fixture distance from wall: 6 inches (or tighter against foundation if landscaping obstructs)
- Place fixtures in planting bed/mulch, NOT on concrete or hardscape
- Start with the FAR LEFT and FAR RIGHT corners of the structure, then fill between

LIGHT PHYSICS:
- Use WALL GRAZING technique: light source close to wall creates dramatic texture reveal on siding/stone
- The light beam originates as a small bright hotspot at ground level
- Beam travels VERTICALLY UP the wall with natural intensity falloff (brightest at base, gradually dimmer toward top)
- Light MUST reach the soffit/roofline directly above - illuminating 2nd story if present
- Cast subtle shadows from any architectural trim, shutters, or texture

REALISM:
- Warm, soft glow characteristic of low-voltage LED landscape lighting
- Slight light spill onto adjacent surfaces (not perfectly contained)
- The fixture itself is a small dark brass cylinder, nearly invisible at night

STRICT EXCLUSIONS:
- Do NOT place lights directly under window glass
- Do NOT place fixtures on walkways or driveways
- Do NOT illuminate the soffit from above (no downlights)
- Wall sections adjacent to selected windows receive ONLY spill light, not direct fixtures`,
  },
  {
   id: 'windows',
  label: '1st Story Windows',
  description: 'Centered on glass (Single) or mullion between (Double)',
  prompt:`TARGET: FIRST-STORY WINDOW ASSEMBLIES — PRECISION CENTERED UPLIGHTING

IDENTIFICATION SCAN:
Locate ALL first-story windows across the entire facade. Classify each as:
- SINGLE WINDOW: One pane of glass in its own frame
- DOUBLE/MULLED UNIT: Two or more window panes joined side-by-side sharing a common frame, separated by a vertical mullion (the wood/vinyl divider strip between panes)

FIXTURE PLACEMENT GEOMETRY (CRITICAL):
For SINGLE windows: Position exactly ONE ground-staked uplight directly below the HORIZONTAL CENTER of the glass pane. Imagine a vertical plumb line dropped from the center of the glass to the ground — the fixture stakes at that exact point.

For DOUBLE/MULLED windows: Position exactly ONE fixture centered on the VERTICAL MULLION (the divider between the two glass panes). The light beam should split evenly across both panes, grazing the mullion's edge.

SETBACK DISTANCE: Fixture placed 4-6 inches from foundation wall, staked in planting bed or mulch.

OBSTRUCTION PROTOCOL (MANDATORY):
If shrubs, bushes, or plants obstruct the window base — DO NOT SKIP THE WINDOW. Place the fixture BEHIND the foliage, pressed against the foundation. The light beam will filter through branches, creating interesting shadow patterns on the wall while still achieving the vertical wash effect. Landscaping is NOT a reason to omit a fixture.

LIGHT BEHAVIOR & PHYSICS:
- Technique: WALL WASHING with slight graze characteristics
- Beam origin: Small, intense hotspot at ground level directly below window center
- Beam travel: Light projects VERTICALLY UPWARD, washing across the wall surface beneath the window sill, continuing UP and OVER the window frame, illuminating the header/lintel, and terminating at the soffit or roofline above
- Falloff gradient: Brightest intensity at the base, naturally diminishing toward the top — NOT uniform brightness
- The window glass itself reflects ambient light and shows subtle warm interior glow spill (if interior lights are on) but receives NO direct beam on the glass surface
- Slight light spill (penumbra) bleeds onto adjacent wall areas — this is realistic and expected

FIXTURE APPEARANCE:
- Small cylindrical brass or bronze ground stake fixture
- Low-profile, nearly invisible in nighttime scene
- Characteristic of professional low-voltage landscape lighting

STRICT EXCLUSION ZONES — MUST REMAIN UNLIT BY DIRECT FIXTURES:
- NO fixtures placed directly under SHUTTERS (shutters flank the window, not the window center)
- NO fixtures on blank wall sections or siding BETWEEN windows — these areas receive only ambient spill, not dedicated fixtures
- NO fixtures on concrete walkways, porches, driveways, or hardscape — must be in soil/mulch/bed
- NO downlighting from above — all light travels UPWARD from ground level
- Wall piers and siding sections to the left and right of windows remain darker, creating visual rhythm and contrast`,

  negativePrompt: `ABSOLUTE PROHIBITIONS:
- No fixtures centered under shutters or decorative trim flanking windows
- No fixtures on wall piers or siding sections between windows — those areas stay darker
- No fixtures placed on concrete, pavers, or hardscape surfaces
- No light beams aiming horizontally or downward
- No overly uniform "floodlit" appearance — maintain natural falloff gradient
- No skipped windows due to landscaping obstruction — fixture goes BEHIND plants
- No direct illumination ON the glass surface itself — light washes the WALL around the window
- No multiple fixtures per single window unit
- No fixtures under second-story windows (first floor only)`
  },
  {
  id: 'columns',
  label: 'Columns',
  description: 'Base of architectural pillars',
  prompt: `TARGET: ARCHITECTURAL COLUMNS, PILLARS & POSTS — VERTICAL SHAFT GRAZING

IDENTIFICATION SCAN:
Locate ALL vertical columnar elements across the facade, including:
- Classical columns (round shafts with capital and base details — Doric, Ionic, Corinthian, Tuscan)
- Square pillars or box columns (common on craftsman, colonial, farmhouse styles)
- Tapered columns (wider at base, narrower at top — common on craftsman/bungalow porches)
- Porch posts (simple vertical supports, wood or wrapped)
- Pilasters (half-columns attached flat against the wall surface)
- Stone or brick piers (masonry support columns)

FIXTURE PLACEMENT GEOMETRY (CRITICAL):
Position ONE ground-staked uplight at the BASE of EACH column, centered on the column's footprint.

Placement specifics by column type:
- ROUND COLUMNS: Fixture centered on the front face of the column base/plinth, 3-4 inches from the surface. Beam grazes the curved shaft, creating a vertical highlight with soft shadow falloff on the sides.
- SQUARE PILLARS: Fixture centered on the front face, 4-6 inches from surface. Light grazes the flat plane, revealing any panel details or trim.
- TAPERED COLUMNS: Fixture at the wider base, centered. Light follows the taper upward, emphasizing the diminishing perspective.
- PILASTERS: Fixture at the base of the pilaster, tight to the wall. Light grazes the raised surface, casting subtle shadow at the pilaster edges.
- STONE/BRICK PIERS: Fixture 4-6 inches from face for dramatic texture grazing. Close proximity reveals mortar joints and stone irregularities.

SETBACK DISTANCE:
- Smooth surfaces (painted wood, vinyl wrap): 6-8 inches for soft wash
- Textured surfaces (stone, brick, fluted columns): 3-6 inches for dramatic graze with shadow play
- Fixture staked in planting bed, mulch, or at the edge of porch/patio — NOT on the porch floor itself

LIGHT BEHAVIOR & PHYSICS:
- Technique: WALL GRAZING — light source close to surface creates dramatic vertical texture reveal
- Beam origin: Tight, intense hotspot at the column base, illuminating any plinth, pedestal, or decorative base molding
- Beam travel: Light projects VERTICALLY UP the full column shaft in a narrow corridor of illumination
- The beam MUST reach and illuminate:
  * The column CAPITAL (decorative top element — volutes, acanthus leaves, simple molding)
  * The ENTABLATURE or beam the column supports
  * The SOFFIT or porch ceiling directly above the column
- Falloff gradient: Brightest at base, naturally diminishing toward capital — but light must still visibly reach the top
- On FLUTED columns (vertical grooves), the grazing angle creates rhythmic light/shadow patterns in each channel — this is the signature effect

SHADOW & TEXTURE DYNAMICS:
- Grazing light at acute angle reveals surface imperfections, wood grain, stone texture, or architectural details
- Round columns display a vertical "racing stripe" of light on the front face with soft shadow wrapping the sides
- Square columns show crisp vertical edges with shadow on perpendicular faces
- Any rings, bands, or horizontal trim elements on the shaft catch the light and cast thin shadow lines

FIXTURE APPEARANCE:
- Small cylindrical brass or bronze ground stake fixture (well light or bullet-style uplight)
- Low-profile, nearly invisible at night — the column is the star, not the fixture

MULTIPLE COLUMN PROTOCOL:
If the facade features a ROW of columns (colonnade or porch lineup):
- EVERY column receives its own dedicated fixture
- Spacing creates rhythmic repetition of vertical light shafts
- Uniform fixture placement (same setback, same centering) for visual consistency
- The SPACES BETWEEN columns remain darker, creating contrast and visual rhythm

STRICT EXCLUSION ZONES:
- NO fixtures placed in the OPEN GAPS between columns — only at column bases
- NO fixtures on porch flooring, decking, or hardscape — must be in bed/mulch or at hardscape edge
- NO fixtures aimed at the SIDE of a column from a distance — must be directly in front, grazing upward
- NO horizontal light spread — beam is vertical and contained to the column width
- NO downlighting from above — all light travels UPWARD from ground level
- NO washing the entire porch or colonnade with broad floodlights — each column is individually articulated`,

  negativePrompt: `ABSOLUTE PROHIBITIONS:
- No fixtures placed in empty spaces BETWEEN columns — light the columns, not the gaps
- No fixtures placed on porch floor, deck surface, or concrete pad
- No fixtures positioned far from columns casting light sideways across multiple columns
- No broad floodlighting that washes the entire porch uniformly
- No columns left dark while others are lit — illuminate ALL columns for symmetry
- No beams that stop mid-shaft — light must travel full height to capital and soffit above
- No downlighting or pendant/sconce lighting — ground-mounted uplights only
- No fixtures visible as bright glare spots — they should disappear into the landscape
- No horizontal beam spread wider than the column itself`
  },
   { 
    id: 'trees', 
    label: 'Trees', 
    description: 'Under prominent trees',
    prompt: "TARGET: TREES. Place up lights at the base of prominent trees/landscape features. \nSTRICT EXCLUSION: Do NOT place lights on the house architecture (no walls, no windows).",
    negativePrompt: "ABSOLUTE PROHIBITION (TREES): Do NOT place lights under trees."
  },
  {
    id: 'entryway',
    label: 'Entryway',
    description: 'Flanking the main entrance door',
    prompt: `TARGET: MAIN ENTRYWAY — ARCHITECTURAL PORTAL FRAMING WITH FLANKING UPLIGHTS
IDENTIFICATION:
Locate the PRIMARY entrance door of the home. This is typically the most architecturally prominent door, often featuring one or more of the following: decorative trim/casing, sidelights (vertical glass panels), a transom window above, columns or pilasters, an archway, a portico, a covered porch, or a pediment.

FIXTURE PLACEMENT GEOMETRY (CRITICAL):
Position exactly TWO ground-staked uplights — one on the LEFT side and one on the RIGHT side of the entry door assembly. These fixtures create a symmetrical "gateway of light" framing the entrance.

Placement specifics:
- If COLUMNS or PILASTERS flank the door: Place fixtures at the base of each column, 4-6 inches from the column face, angled to graze upward along the column shaft
- If SIDELIGHTS flank the door: Place fixtures at the outer edge of each sidelight assembly, grazing the vertical trim/casing
- If plain WALL/TRIM only: Place fixtures at the outer edges of the door casing/trim, grazing the vertical molding that frames the door
- If an ARCHWAY surrounds the door: Place fixtures to illuminate the arch legs (vertical portions), allowing light to trace the curve overhead

SETBACK & ANGLE:
- Fixtures positioned 4-6 inches from the wall/column surface
- Staked in planting bed, mulch, or decorative gravel — NOT on the porch floor, landing, or walkway
- Beam angle tilted slightly inward toward the door frame to create a converging "embrace" of light

LIGHT BEHAVIOR & PHYSICS:
- Technique: WALL GRAZING for textured surfaces (stone, brick columns, carved trim) or WALL WASHING for smooth surfaces
- Beam origin: Intense hotspot at ground level beside each door edge
- Beam travel: Light projects VERTICALLY UPWARD, grazing the door casing, columns, or pilasters, continuing to illuminate:
  * The header/lintel above the door
  * Any transom window frame (not the glass directly)
  * The underside of a portico, pediment, or porch ceiling
  * Terminating at the soffit line or porch roof above
- Falloff: Brightest at base, naturally diminishing upward — creates dramatic vertical emphasis
- The two light beams CONVERGE overhead, merging at the area above the door to create a subtle "halo" effect framing the entry from above
- Slight spill onto the door surface itself is acceptable and adds warmth, but the PRIMARY beam grazes the FRAMING, not the door face

SHADOWS & TEXTURE:
- Light rakes across trim profiles, column fluting, or stone texture to reveal depth and craftsmanship
- Door hardware (handles, knockers) may catch subtle reflected light
- Any decorative brackets, corbels, or keystones above the door receive upward illumination

FIXTURE APPEARANCE:
- Small cylindrical brass or bronze ground stake fixtures
- Low-profile, nearly invisible at night
- Fixtures appear as matching pair — symmetrical placement is essential

STRICT EXCLUSION ZONES:
- NO fixture placed directly in the CENTER of the walkway or porch landing — this is the walking path (trip hazard and aesthetically incorrect)
- NO fixtures on concrete, pavers, porch flooring, or steps — must be in planting bed/mulch flanking the hardscape
- NO downlighting — all light travels UPWARD from ground level
- NO illumination directed AT the viewer/camera — fixtures aim at the architecture, not outward
- The door itself is framed by light, not blasted with direct beam — the SURROUND is the focus`,

  negativePrompt: `ABSOLUTE PROHIBITIONS:
- No fixture in the center of the entry path or doormat area — only LEFT and RIGHT flanking positions
- No fixtures placed on porch floor, concrete landing, or steps
- No single fixture — must be a PAIR (one left, one right) for symmetry
- No fixtures aimed outward toward the street or viewer
- No downlighting or sconces — ground-mounted uplights only
- No light beams that stop at door height — must continue to soffit/porch ceiling above
- No asymmetrical placement — left and right fixtures must mirror each other
- No fixtures hidden behind large shrubs that would block the beam path to the door frame
- No harsh spotlight effect — soft graze with natural falloff`
}

];

export const PATH_LIGHT_SUBOPTIONS = [
  {
    id: 'pathway',
    label: 'Pathway',
    description: 'Walkways & sidewalks',
    prompt: `TARGET: PEDESTRIAN WALKWAYS & SIDEWALKS — POOL-OF-LIGHT PATH ILLUMINATION

IDENTIFICATION SCAN:
Locate ALL dedicated pedestrian walkways on the property, including:
- Front walkway from sidewalk/street to front door
- Side walkways connecting front to backyard
- Concrete sidewalks
- Flagstone or paver stepping stone paths
- Any defined walking surface separate from the driveway

FIXTURE SPECIFICATIONS:
- Style: CAST brass "china hat" or dome-top path light
- Height: 22 inches tall (stem + hat assembly)
- Material: Solid brass with aged bronze patina finish
- Light distribution: 360-degree omnidirectional spread casting light in a full circle around the fixture
- Pool diameter: Each fixture casts a circular pool of light approximately 6-8 feet in diameter on the ground

PLACEMENT GEOMETRY (CRITICAL):
STAGGERED ZIGZAG PATTERN — Fixtures alternate LEFT and RIGHT sides of the walkway, creating a zigzag rhythm rather than parallel pairs facing each other.

Spacing rules:
- Distance between fixtures: 8-10 feet apart measured along the zigzag line from fixture to fixture (this accounts for 6-8 foot pools with slight overlap)
- Setback from path edge: 6-8 inches into the planting bed, NOT on the concrete/paver surface itself
- First fixture: Position near the BEGINNING of the walkway (where it meets street, sidewalk, or driveway)
- Last fixture: Position near the END of the walkway (at porch, steps, or door threshold)

STAGGER PATTERN EXAMPLE:
- Fixture 1: LEFT side, near path start
- Fixture 2: RIGHT side, 8-10 feet along path
- Fixture 3: LEFT side, 8-10 feet further
- (Continue alternating...)

For NARROW walkways (under 4 feet wide): Single-side placement is acceptable, all fixtures on one side spaced 6-8 feet apart.

For CURVED walkways: Follow the curve with fixtures placed on the OUTSIDE of bends for better visibility and on INSIDE of tight curves to illuminate the turn.

LIGHT BEHAVIOR & PHYSICS:
- Light projects DOWNWARD from beneath the hat/shade, NOT upward
- The brass dome/hat acts as a glare shield, preventing direct view of the light source
- Creates soft, circular "pools of light" on the ground and low surrounding foliage
- Pools should SLIGHTLY OVERLAP (touching edges) for continuous navigable illumination — no dark gaps between fixtures
- Light gently spills onto adjacent plantings, revealing texture of groundcover, low shrubs, and mulch
- The fixture stem/post is visible as a dark brass silhouette; the hat catches subtle ambient reflection

SHADOW & ATMOSPHERE:
- Soft, diffused shadows radiate outward from any objects within the light pool
- Low plantings beside the path receive gentle side-lighting
- Creates inviting "runway" effect guiding visitors toward the entrance
- Pools of warm light on the path surface with softer darkness between — NOT harsh floodlit uniformity

FIXTURE VISIBILITY:
- The 22-inch height places the light source at approximately knee level
- Fixtures are visible as elegant brass forms during day, glowing lanterns at night
- Hat/dome slightly overhangs the stem, casting a small shadow ring directly beneath

STRICT EXCLUSION ZONES:
- NO fixtures placed ON the concrete, pavers, or walking surface — always in adjacent bed/mulch
- NO fixtures along DRIVEWAYS — driveways are excluded from pathway lighting
- NO fixtures in open lawn areas away from defined paths
- NO fixtures in garden beds that don't border a walkway
- NO fixtures creating glare into windows or toward the street
- NO uplighting effect — all light projects DOWNWARD through 360-degree spread
- NO fixtures spaced so far apart that dark gaps interrupt safe navigation`,
    negativePrompt: `ABSOLUTE PROHIBITIONS:
- No fixtures placed directly on walkway surface (concrete, pavers, flagstone)
- No fixtures along driveways — pathway lights are for pedestrian walkways only
- No fixtures in standalone garden beds away from paths
- No parallel/mirrored placement directly across from each other — use STAGGERED zigzag pattern
- No fixtures taller than 22 inches or shorter than 18 inches
- No uplighting or light projected upward — downward 360-degree spread only
- No dark gaps between light pools — maintain slight overlap for continuous navigation
- No harsh spotlight effect — soft diffused pools only
- No fixtures with visible exposed bulbs — must have dome/hat shade
- No excessive quantity creating "runway landing strip" over-lit appearance
- No fixtures in the middle of the path blocking foot traffic`
  },
  {
    id: 'driveway',
  label: 'Driveway',
  description: 'Along vehicle entry',
  prompt: `TARGET: DRIVEWAY EDGES -- VEHICLE ENTRY DELINEATION LIGHTING

IDENTIFICATION SCAN:
Locate the DRIVEWAY -- the paved vehicle surface connecting the street/road to the garage, carport, or parking area. Identify:
- The driveway APRON (where it meets the street)
- The full LENGTH of the driveway edges where pavement meets lawn/landscape
- The driveway TERMINUS (at garage door, carport, or parking pad)
- Any CURVES or BENDS in the driveway path
- Any WIDENING areas (turnarounds, parking courts)

FIXTURE SPECIFICATIONS:
- Style: CAST brass "china hat" or dome-top path light
- Height: 22 inches tall (stem + hat assembly)
- Material: Solid brass with aged bronze patina finish
- Light distribution: 360-degree omnidirectional spread casting light in a full circle around the fixture
- Pool diameter: Each fixture casts a circular pool of light approximately 6-8 feet in diameter on the ground

PLACEMENT GEOMETRY (CRITICAL):
BOTH SIDES of the driveway -- fixtures placed along LEFT and RIGHT edges to clearly define the vehicle corridor.

Pattern options based on driveway length:

For SHORT DRIVEWAYS (under 40 feet):
- PARALLEL PLACEMENT: Fixtures directly across from each other on both sides
- Creates formal, symmetrical "runway" appearance
- Spacing: 10-12 feet apart along each edge

For LONG DRIVEWAYS (40+ feet):
- STAGGERED ZIGZAG PATTERN: Fixtures alternate LEFT and RIGHT sides
- Creates rhythm and visual interest over distance
- Spacing: 10-15 feet apart measured along the zigzag line

Placement specifics:
- Setback from pavement edge: 6-8 inches into lawn or landscape bed -- NOT on the driveway surface
- First fixtures: Position at the DRIVEWAY APRON where it meets the street, one on each side, marking the entrance
- Last fixtures: Position near the TERMINUS at garage/parking area, marking the destination
- The driveway edges should be clearly "outlined" by the light pools

CURVE & BEND PROTOCOL:
- On OUTSIDE of curves: Place fixtures slightly closer together (8-10 feet) to illuminate the sweep
- On INSIDE of tight curves: Add a fixture to illuminate the turning point
- Curves require MORE fixtures than straight runs to maintain clear edge definition

WIDENING AREAS (turnarounds, parking courts):
- Continue fixtures around the perimeter of widened areas
- Maintain consistent spacing to define the full paved boundary

LIGHT BEHAVIOR & PHYSICS:
- Light projects DOWNWARD from beneath the hat/shade in 360-degree spread
- Creates soft, circular "pools of light" on the ground that illuminate the pavement EDGE and adjacent lawn
- Pools should TOUCH or SLIGHTLY OVERLAP along each side for continuous edge definition
- The driveway pavement itself receives light spill from adjacent pools -- NOT direct overhead lighting
- Provides clear visual boundary between "drive here" (pavement) and "don't drive here" (lawn)

FUNCTIONAL PURPOSE:
- Guides vehicles safely along the driveway, especially at night or in poor visibility
- Prevents drivers from veering off pavement onto lawn
- Defines entry point visible from street (wayfinding for guests)
- Creates welcoming "approach" to the home
- Deters intruders by eliminating dark zones along the driveway corridor

FIXTURE VISIBILITY:
- The 22-inch height places light source at bumper/wheel-well level of vehicles
- Fixtures visible as elegant brass sentinels lining the drive
- At night, creates a glowing corridor effect guiding vehicles home

STRICT EXCLUSION ZONES:
- NO fixtures placed ON the driveway pavement surface -- always in adjacent lawn/bed
- NO fixtures along pedestrian WALKWAYS -- those are separate (pathway preset)
- NO fixtures in garden beds that don't border the driveway
- NO fixtures in the middle of lawn areas away from driveway edge
- NO fixtures at garage door threshold blocking vehicle path
- NO uplighting -- all light projects DOWNWARD through 360-degree spread
- NO single-side-only placement on long driveways -- both sides must be lit for proper edge definition`,

  negativePrompt: `ABSOLUTE PROHIBITIONS:
- No fixtures placed on driveway pavement surface
- No fixtures along pedestrian walkways -- driveway lights are for vehicle entry only
- No fixtures in garden beds away from driveway edge
- No fixtures in open lawn areas not bordering the driveway
- No single-side lighting on driveways over 20 feet long -- must light BOTH edges
- No dark gaps between light pools that would obscure the driveway edge
- No uplighting or light projected upward -- downward 360-degree spread only
- No fixtures taller than 22 inches or shorter than 18 inches
- No harsh spotlight effect -- soft diffused pools only
- No fixtures blocking vehicle access at garage/parking terminus
- No mixing driveway lights with pedestrian pathway lights in the same run
- No random scattered placement -- must follow driveway edge geometry precisely`
},
  {
    id: 'landscaping',
    label: 'Landscaping',
    description: 'Garden beds & planters',
    prompt: "TARGET: GARDEN BEDS ONLY. Place post-mounted path lights STRICTLY inside mulch beds, flower beds, and planters. \nACTION: Illuminate vegetation. \nSTRICT EXCLUSION: Do NOT place lights along walkways. Do NOT place lights along the driveway.",
    negativePrompt: "ABSOLUTE PROHIBITION (LANDSCAPING): Do NOT place lights in garden beds."
  }
];

export const CORE_DRILL_SUBOPTIONS = [
  {
    id: 'garage_sides',
    label: 'Garage Sides',
    description: 'Piers flanking & between doors',
    prompt: "TARGET: GARAGE PIERS. Place flush-mounted core drill lights in the concrete directly at the base of the vertical wall/pillar sections FLANKING (sides) and BETWEEN the garage doors. \nACTION: Graze the light vertically UP the garage piers. \nSTRICT EXCLUSION: Do NOT place lights in the middle of the driveway. Do NOT place lights in front of the garage doors themselves.",
    negativePrompt: "ABSOLUTE PROHIBITION (GARAGE PIERS): Do NOT place lights at the base of garage door piers (sides/between)."
  },
  {
    id: 'garage_door',
    label: 'Garage Door',
    description: 'Wash light on door face and siding above it',
    prompt: "TARGET: GARAGE DOORS. Place flush-mounted core drill lights in the concrete centered directly in front of the garage door panels. One light per car garage. If its a two car garage place two. \nACTION: Wash light UP onto the garage door surface and aboce it. \nSTRICT EXCLUSION: Do NOT place lights on the piers or walls between/beside doors.",
    negativePrompt: "ABSOLUTE PROHIBITION (GARAGE DOOR): Do NOT place lights in front of the garage doors to wash the door face."
  },
  {
    id: 'columns',
    label: 'Columns',
    description: 'Architectural pillars on hardscape',
    prompt: "TARGET: HARDSCAPE COLUMNS. Place flush-mounted core drill lights in the concrete/stone directly at the base of architectural columns or porch posts. \nACTION: Graze the light vertically UP the column. \nSTRICT EXCLUSION: Do NOT place lights in the open driveway.",
    negativePrompt: "ABSOLUTE PROHIBITION (HARDSCAPE COLUMNS): Do NOT place lights at the base of architectural columns."
  },
  {
    id: 'sidewalks',
    label: 'Sidewalks',
    description: 'Pedestrian concrete paths',
    prompt: "TARGET: SIDEWALKS & WALKWAYS. Place flush-mounted core drill lights directly embedded into the concrete surface of pedestrian walkways. \nSPACING: Distribute them evenly along edges of the path. \nACTION: Illuminate the walking surface (marker light). \nSTRICT EXCLUSION: Do NOT place in the driveway. Do NOT place in grass. Do NOT graze vertical walls.",
    negativePrompt: "ABSOLUTE PROHIBITION (SIDEWALKS): Do NOT place lights embedded in the sidewalk."
  },
  {
    id: 'driveway',
    label: 'Driveway',
    description: 'Surface marker lights',
    prompt: "TARGET: DRIVEWAY SURFACE. Place flush-mounted core drill lights directly embedded in the driveway pavement (markers). \nSPACING: Place them along the edges of the paved surface. \nACTION: Illuminate the ground surface (marker light). \nSTRICT EXCLUSION: Do NOT graze vertical walls. Do NOT place in grass.",
    negativePrompt: "ABSOLUTE PROHIBITION (DRIVEWAY SURFACE): Do NOT place marker lights on the driveway surface."
  }
];

export const GUTTER_LIGHT_SUBOPTIONS = [
  {
    id: 'dormers',
    label: 'Dormers',
    description: 'gutter mounted up light on each 2nd story dormer',
    prompt: "TARGET: DORMERS ONLY. Locate every 2nd-story dormer window. You must place a gutter-mounted up light on the horizontal gutter/fascia line that runs below the dormer. ALIGNMENT: The light must be perfectly centered on the vertical axis of the dormer window above it. POSITION: The fixture sits ON/INSIDE the horizontal gutter lip. ACTION: The light shines VERTICALLY UP from the horizontal gutter to wash the face of the dormer. STRICT EXCLUSION: Do NOT place lights on the slanted roof or on the dormer itself. It must be on the gutter line below.",
    negativePrompt: "ABSOLUTE PROHIBITION (DORMERS): Do NOT place lights on the dormers."
  },
  {
    id: 'architecture',
    label: 'Peaks & Gables',
    description: 'Gutter mount up lights directly under upper roofline architecture',
    prompt: "TARGET: ROOF PEAKS ONLY. Identify prominent triangular roof peaks and gables. Place a gutter-mounted up light on the horizontal gutter line aligned with the CENTER vertical axis of the peak. \nACTION: Highlight the triangular height of the architecture. \nSTRICT EXCLUSION: Do NOT place lights specifically on dormer windows unless they coincide with a main peak.",
    negativePrompt: "ABSOLUTE PROHIBITION (PEAKS): Do NOT place lights on prominent roof peaks or gables (unless they are also dormers)."
  }
];

export const SOFFIT_LIGHT_SUBOPTIONS = [
  {
    id: 'windows',
    label: 'Windows',
    description: 'Above first floor windows',
    prompt: "TARGET: SOFFIT ABOVE WINDOWS. Place recessed downlights in the roof overhang/soffit DIRECTLY CENTERED above the glass pane of first-story windows. \nACTION: Shine light DOWN to graze the glass. \nSTRICT EXCLUSION: Do NOT place lights above solid wall sections/piers. Do NOT place lights above columns.",
    negativePrompt: "ABSOLUTE PROHIBITION (SOFFIT WINDOWS): Do NOT place lights above windows."
  },
  {
    id: 'columns',
    label: 'Columns',
    description: 'Above architectural pillars',
    prompt: "TARGET: SOFFIT ABOVE COLUMNS. Place recessed downlights in the roof overhang/soffit DIRECTLY CENTERED above the top of architectural columns or porch posts. \nACTION: Shine light DOWN to illuminate the column shaft. \nSTRICT EXCLUSION: Do NOT place lights above windows. Do NOT place lights above wall siding.",
    negativePrompt: "ABSOLUTE PROHIBITION (SOFFIT COLUMNS): Do NOT place lights above columns."
  },
  {
    id: 'siding',
    label: 'Siding',
    description: 'Above wall piers',
    prompt: "TARGET: SOFFIT ABOVE WALL PIERS. Place recessed downlights in the roof overhang/soffit DIRECTLY CENTERED above the vertical solid wall sections located BETWEEN windows. \nACTION: Shine light DOWN to graze the siding texture (Scalloping effect). \nSTRICT EXCLUSION: Do NOT place lights above windows. Do NOT place lights above columns.",
    negativePrompt: "ABSOLUTE PROHIBITION (SOFFIT SIDING): Do NOT place lights above solid wall sections/piers."
  },
  {
    id: 'peaks',
    label: 'Peaks',
    description: 'Apex of roof gables',
    prompt: "TARGET: SOFFIT PEAKS. Place recessed downlights in the roof overhang/soffit DIRECTLY at the apex (highest point) of triangular roof peaks and gables. \nACTION: Shine light DOWN from the peak. \nSTRICT EXCLUSION: Do NOT place lights in the lower horizontal soffits unless requested.",
    negativePrompt: "ABSOLUTE PROHIBITION (SOFFIT PEAKS): Do NOT place lights in the peaks of the roof."
  }
];

export const HARDSCAPE_LIGHT_SUBOPTIONS = [
  {
    id: 'columns',
    label: 'Columns',
    description: 'Under capstone of pillars',
    prompt: "TARGET: HARDSCAPE COLUMNS ONLY. Place linear hardscape lights under the capstone of stone/brick columns. \nACTION: Shine light DOWN the column face. \nSTRICT EXCLUSION: Do NOT place lights on retaining walls. Do NOT place lights on steps.",
    negativePrompt: "ABSOLUTE PROHIBITION (HARDSCAPE COLUMNS): Do NOT place hardscape lights on columns."
  },
  {
    id: 'walls',
    label: 'Retaining Walls',
    description: 'Under capstone of walls',
    prompt: "TARGET: RETAINING WALLS ONLY. Place linear hardscape lights under the capstone of horizontal retaining walls. \nACTION: Wash light DOWN the wall texture. \nSTRICT EXCLUSION: Do NOT place lights on columns. Do NOT place lights on steps.",
    negativePrompt: "ABSOLUTE PROHIBITION (RETAINING WALLS): Do NOT place hardscape lights on retaining walls."
  },
  {
    id: 'steps',
    label: 'Steps',
    description: 'Under tread of stairs',
    prompt: "TARGET: STEPS ONLY. Place linear hardscape lights or tread lights under the nose of stone/concrete steps. \nACTION: Illuminate the tread below. \nSTRICT EXCLUSION: Do NOT place lights on columns. Do NOT place lights on retaining walls.",
    negativePrompt: "ABSOLUTE PROHIBITION (STEPS): Do NOT place hardscape lights on steps."
  }
];
export const FIXTURE_TYPES = [
  {
    id: 'up',
    label: 'Up Lights',
    description: 'Ground-mounted accent lights',
    positivePrompt: "CATEGORY ENABLED: Ground-Mounted Up Lights. \nINSTRUCTION: You are authorized to place ground-mounted uplights. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Windows', 'Siding', 'Columns') for exact placement coordinates. If specific sub-options are provided, ignore generic placement and follow the sub-options exactly.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate any ground-mounted up lights. The base of the house, walls, and trees must remain completely dark at ground level."
  },
  {
    id: 'path',
    label: 'Path Lights',
    description: 'Post-mounted walkway lights',
    positivePrompt: "CATEGORY ENABLED: Path Lights. \nINSTRUCTION: You are authorized to place post-mounted path lights. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Pathway', 'Driveway', 'Landscaping') for exact placement. Do not guess.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate any post-mounted path lights. Walkways, driveways, and garden borders must remain dark."
  },
  {
    id: 'coredrill',
    label: 'Core Drill Lights',
    description: 'Flush-mounted in-grade lights',
    positivePrompt: "CATEGORY ENABLED: Core Drill (In-Grade) Lights. \nINSTRUCTION: You are authorized to place flush-mounted lights embedded in concrete/hardscape. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Garage Sides', 'Driveway', 'Sidewalks'). Only place lights in the hardscape surfaces specified.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate flush-mounted core drill lights. Do NOT place any lights inside concrete surfaces."
  },
  {
    id: 'gutter',
    label: 'Gutter Up Lights',
    description: 'Roofline accent lights',
    positivePrompt: "CATEGORY ENABLED: Gutter-Mounted Up Lights. \nINSTRUCTION: You are authorized to place small fixtures on the gutter/fascia line shining UPWARDS. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Dormers', 'Peaks'). Do not light the whole roofline, only the specific targets requested.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate gutter-mounted lights. The roofline and dormers must remain dark from above."
  },
  {
    id: 'soffit',
    label: 'Soffit Lights',
    description: 'Recessed roof overhang lights',
    positivePrompt: "CATEGORY ENABLED: Soffit Downlights. \nINSTRUCTION: You are authorized to place recessed can lights in the roof overhangs/eaves shining DOWN. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Windows', 'Columns', 'Siding'). Do not create a general wash unless requested.",
    negativePrompt: "ABSOLUTE PROHIBITION (SOFFIT): The roof eaves and soffits must be PITCH BLACK. You must TURN OFF and remove any existing soffit lights found in the original image. Zero light allowed from the roof overhangs."
  },
  {
    id: 'hardscape',
    label: 'Hardscape Lights',
    description: 'Linear/puck lights for walls & steps',
    positivePrompt: "CATEGORY ENABLED: Hardscape Lights. \nINSTRUCTION: You are authorized to place linear or puck lights attached to stone/brick hardscapes. \nPLACEMENT RULE: Refer STRICTLY to the active sub-option prompts (e.g., 'Retaining Walls', 'Steps', 'Columns').",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate hardscape lighting on walls or steps."
  }
];

export const COLOR_TEMPERATURES: ColorTemperature[] = [
  {
    id: "2700k",
    kelvin: "2700K",
    color: "#FFB46B",
    description: "Warm White",
    prompt: "Use Warm White (2700K) for all lights. The light should be very warm, cozy, and golden."
  },
  {
    id: "3000k",
    kelvin: "3000K",
    color: "#FFD18E",
    description: "Soft White",
    prompt: "Use Soft White (3000K) for all lights. This is the standard professional landscape lighting color."
  },
  {
    id: "4000k",
    kelvin: "4000K",
    color: "#FFF2D7",
    description: "Cool White",
    prompt: "Use Cool White (4000K) for all lights. The light should be crisp and neutral."
  },
  {
    id: "5000k",
    kelvin: "5000K",
    color: "#E3F2FD",
    description: "Daylight",
    prompt: "Use Daylight (5000K) for all lights. The light should be bright white, mimicking noon daylight."
  },
  {
    id: "christmas",
    kelvin: "Festive",
    color: "#D32F2F",
    description: "Christmas",
    prompt: "Use Red and Green colors for all lights for a festive Christmas look. Alternate colors or group them by section." 
  },
  { 
    id: "halloween", 
    kelvin: "Spooky",
    color: "#9C27B0",
    description: "Halloween",
    prompt: "Use Orange and Purple colors for all lights for a spooky Halloween look. Create a haunting atmosphere." 
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
    MONTHLY: {
      id: 'price_pro_monthly',
      price: 29
    },
    YEARLY: {
      id: 'price_pro_yearly',
      price: 299
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
  coredrill: 4
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
  { fixtureType: 'coredrill', brand: '', sku: '', wattage: 4 }
];

// BOM - Fixture type display names
export const FIXTURE_TYPE_NAMES: Record<string, string> = {
  up: 'Up Light',
  path: 'Path Light',
  gutter: 'Gutter Light',
  soffit: 'Soffit Light',
  hardscape: 'Hardscape Light',
  coredrill: 'Core Drill Light'
};
