import type { ColorTemperature, FixturePricing } from "./types";

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

export const FIXTURE_TYPES = [
  {
    id: 'up',
    label: 'Up Lights',
    description: 'Ground-mounted accent lights for walls, columns & trees.',
    positivePrompt: "PRIORITY 1: Place up lights at the base of ARCHITECTURAL COLUMNS, PILLARS, or POSTS, grazing the light upward. PRIORITY 2: Place up lights at the base of facade walls or under windows depending on landscaping. PRIORITY 3 (STRICT): ONLY IF there are EXISTING TREES in the original photo, place lights at their base. WARNING: DO NOT GENERATE TREES. If the lawn is empty, KEEP IT EMPTY.",
    negativePrompt: "Do not generate any ground-mounted up lights. Do not place fixtures at the base of walls, columns, or trees aimed upward."
  },
  {
    id: 'path',
    label: 'Path Lights',
    description: 'Post-mounted lights for walkways & driveways.',
    positivePrompt: "Identify any EXISTING walkways or driveways. IF a walkway exists, place post-mounted path lights along its edges spaced 6-8 feet apart. IF a driveway exists, place lights along the edge. DO NOT create new walkways or paths to place lights on. If no path exists, skip this step.",
    negativePrompt: "Do not generate any post-mounted path lights along walkways or driveways. Do not generate bollard lights."
  },
  {
    id: 'coredrill',
    label: 'Core Drill Lights',
    description: 'Flush-mounted in-grade lights for hardscapes.',
    positivePrompt: "Identify paved hardscape surfaces (concrete, stone). Install flush-mounted 'Core Drill' lights embedded directly INTO the concrete. Priority 1: Place at the base of GARAGE walls/pillars grazing up. Priority 2: Place at the base of ARCHITECTURAL COLUMNS grazing up. Priority 3: Place along the edges of DRIVEWAYS and WALKWAYS flush with the surface. The fixture MUST be flush with the ground.",
    negativePrompt: "Do not place in soil, mulch, or grass. Do not generate raised fixtures."
  },
  {
    id: 'gutter',
    label: 'Gutter Up Lights',
    description: 'Roofline accent lights for dormers & peaks.',
    positivePrompt: "Install Gutter Mounted Up Lights on the gutter edge/fascia of the first floor shining upwards. These fixtures aim up and wash light up to highlight dormers and the 2nd story home features. Use exactly 1 light per dormer centered directly below it. Gutter Mounted Up Lights only highlight features directly above them.",
    negativePrompt: "Do not generate any gutter-mounted lights. Do not generate fixtures attached to the roofline or fascia."
  },
  {
    id: 'soffit',
    label: 'Soffit Lights',
    description: 'Recessed lights installed in the roof overhang.',
    positivePrompt: "Install recessed soffit lights (downlights) in the roof overhangs/eaves to wash light down onto the house facade. Place them symmetrically along the roofline to create a soft down-washing effect on the walls.",
    negativePrompt: "STRICTLY FORBIDDEN: Do NOT install soffit lights. Do NOT place downlights in the roof eaves or overhangs. Do NOT wash light down onto the house facade from the roof. The upper sections of the house/roofline must remain dark unless illuminated from below."
  },
  {
    id: 'hardscape',
    label: 'Hardscape Lights',
    description: 'Linear or puck lights for retaining walls & steps.',
    positivePrompt: "IF there are EXISTING retaining walls or stone steps, install hardscape lighting under the capstones. DO NOT create walls or steps. Install tread lights on any visible outdoor steps to illuminate the tread below.",
    negativePrompt: "Do not generate hardscape lighting on walls or steps."
  }
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