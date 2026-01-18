
import type { ColorTemperature, FixturePricing } from "./types";

export const UP_LIGHT_SUBOPTIONS = [
  { 
    id: 'siding', 
    label: 'Siding', 
    description: 'Ground Staked Up Lights on Pier siding', 
    prompt: "TARGET: WALL PIERS. Iterate through every section of the home individually Place ground staked up lights centered on the vertical wall sections and between windows across each section of the home. Always start with lights on the far right and left side of the structure. \nACTION: Graze the solid wall material. \nVERTICAL TRAVEL: The light beam MUST travel straight up the entire height of the wall. It must NOT stop at the first floor if the wall continues. The light must reach the highest soffit or roofline available directly above it, illuminating any 2nd story sections. \nSTRICT EXCLUSION: Do NOT place soffit lights or lights under the window glass. Only on the wall sections between them.",
    negativePrompt: "ABSOLUTE PROHIBITION (SIDING): Do NOT place lights on the solid wall sections or siding. Light ONLY the windows or columns if selected."
  },
  {
    id: 'windows',
    label: '1st Story Windows',
    description: 'Centered on glass (Single) or mullion Between (Double)',
    prompt: `
      TARGET: UP LIGHT UNDER 1ST STORY WINDOW ASSEMBLIES CENTERED.
      
      PLACEMENT LOGIC (CRITICAL):
      1. SINGLE WINDOWS: Place one ground-mounted up light aligned with the EXACT HORIZONTAL CENTER of the glass pane.
      2. DOUBLE/JOINED WINDOWS: If two windows are connected side-by-side (mulled unit), place exactly ONE fixture centered on the VERTICAL DIVIDER (mullion) directly between the two glass panes.
      
      GEOMETRY RULE: Find the center axis of the window unit. Drop a plumb line straight down to the ground. The fixture must be staked in the ground at that exact point.
      
      \nACTION: Graze the center of window or mullion and light up to soffit above.

      OBSTRUCTION OVERRIDE (CRITICAL): IGNORE LANDSCAPING. If bushes or plants block the base of the window, place the fixture BEHIND the plant, directly against the foundation wall. Do not skip a window just because a bush is in front of it.

      STRICT EXCLUSION ZONES: MUST REMAIN DARK
      - Do NOT place lights under shutters.
      - Do NOT place lights on the blank siding or wall space to the left/right of the window, MUST REMAIN DARK.
      - Do NOT place lights on concrete (must be in beds/soil).
    `,
    negativePrompt: "ABSOLUTE PROHIBITION (1st STORY WINDOWS): Do NOT place lights under glass windows."
  },
  {
    id: 'entryway',
    label: 'Entryway',
    description: 'Flanking the main entrance door',
    prompt: "TARGET: MAIN ENTRYWAY FLANKS & FRAMING. Place ground-mounted up lights at the base of the walls, archways, columns, or architectural trim immediately to the LEFT and RIGHT of the main entry door. \nACTION: Frame the entrance with light and shine the light above it to the soffit line. Graze the vertical surfaces. CRITICAL: If door framing, casing, or trim is present, the light MUST graze it to outline the door structure and define the entry portal. \nSTRICT EXCLUSION: Do NOT place a light directly in the center walking path (trip hazard).",
    negativePrompt: "ABSOLUTE PROHIBITION (ENTRYWAY): Do NOT place lights flanking the main entry door."
  },
  { 
    id: 'columns', 
    label: 'Columns', 
    description: 'Base of architectural pillars', 
    prompt: "TARGET: ARCHITECTURAL COLUMNS. Place up lights at the exact base of vertical columns, pillars, or posts. \nACTION: Graze the light vertically up the shaft of the column to accentuate height. \nVERTICAL TRAVEL: The beam must travel the full height of the column and illuminate the soffit/overhang directly above it. \nSTRICT EXCLUSION: Do NOT place lights in the open space between columns.",
    negativePrompt: "ABSOLUTE PROHIBITION (COLUMNS): Do NOT place lights on architectural columns or pillars."
  },
   { 
    id: 'trees', 
    label: 'Trees', 
    description: 'Under prominent trees',
    prompt: "TARGET: TREES. Place up lights at the base of prominent trees/landscape features. \nSTRICT EXCLUSION: Do NOT place lights on the house architecture (no walls, no windows).",
    negativePrompt: "ABSOLUTE PROHIBITION (TREES): Do NOT place lights under trees."
  }

];

export const PATH_LIGHT_SUBOPTIONS = [
  {
    id: 'pathway',
    label: 'Pathway',
    description: 'Walkways & sidewalks', 
    prompt: "TARGET: PEDESTRIAN WALKWAYS ONLY. Place post-mounted path lights STRICTLY along the edges of sidewalks, concrete paths, and stepping stones. \nACTION: Define the walking path. \nSTRICT EXCLUSION: Do NOT place lights along the driveway. Do NOT place lights in garden beds.",
    negativePrompt: "ABSOLUTE PROHIBITION (PATHWAY): Do NOT place lights along walkways or sidewalks."
  },
  {
    id: 'driveway',
    label: 'Driveway',
    description: 'Along vehicle entry',
    prompt: "TARGET: DRIVEWAY EDGES ONLY. Place post-mounted path lights STRICTLY along the border where the driveway pavement meets the grass. \nACTION: Define the vehicle entry. \nSTRICT EXCLUSION: Do NOT place lights along pedestrian walkways. Do NOT place lights in garden beds.",
    negativePrompt: "ABSOLUTE PROHIBITION (DRIVEWAY): Do NOT place lights along the driveway."
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
