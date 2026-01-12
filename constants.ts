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

export const BEAM_ANGLES = [
  { id: 15, label: '15°', description: 'Narrow Spot' },
  { id: 30, label: '30°', description: 'Spot' },
  { id: 45, label: '45°', description: 'Flood' },
  { id: 60, label: '60°', description: 'Wide Flood' },
];

export const FIXTURE_TYPES = [
  {
    id: 'up',
    label: 'Up Lights',
    description: 'Ground-mounted accent lights for walls, columns & trees.',
    positivePrompt: "HARD RULE DO: Place ground-mounted up lights TIGHT against the house foundation. PRIORITY TARGETS: 1. Directly CENTERED under windows grazing up. 2. On the wall sections on EACH SIDE of windows (flanking). 3. At the base of Columns/Pillars. The light must originate from the ground next to the wall. IF AND ONLY IF there are EXISTING TREES, place lights at their base. HARD RULE DO NOT: Do NOT generate new trees. Do NOT place lights in open grass without a vertical target.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate any ground-mounted up lights. Do NOT place fixtures at the base of walls, columns, or trees aimed upward."
  },
  {
    id: 'path',
    label: 'Path Lights',
    description: 'Post-mounted lights for walkways.',
    positivePrompt: "HARD RULE DO: Identify EXISTING walkways. Place post-mounted path lights along the edges spaced 6-8 feet apart. HARD RULE DO NOT: Do NOT create new paths. Do NOT place path lights in the middle of the lawn. Do NOT place path lights if no path exists.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate any post-mounted path lights. Do NOT place lights along walkways or driveways."
  },
  {
    id: 'coredrill',
    label: 'Core Drill Lights',
    description: 'Flush-mounted in-grade lights for hardscapes.',
    positivePrompt: "HARD RULE DO: Identify paved hardscape surfaces (concrete) at the base of vertical structures. Install flush-mounted 'Core Drill' lights embedded directly INTO the concrete. TARGETS: Base of GARAGE door pillars and ARCHITECTURAL COLUMNS grazing light UP. HARD RULE DO NOT: Do NOT place on open driveways as markers. Do NOT place in grass. They MUST graze a vertical surface.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate flush-mounted core drill lights. Do NOT place lights in concrete or hardscapes."
  },
  {
    id: 'gutter',
    label: 'Gutter Up Lights',
    description: 'Roofline accent lights for dormers & peaks.',
    positivePrompt: "HARD RULE DO: Install VERY SMALL, DISCRETE fixtures on the OUTER gutter edge of the first floor. These lights MUST shine UPWARDS ONLY to illuminate dormers and 2nd story peaks. When lighting up dormers only place one gutter mounted up light DIRECTLY centered under the dormer. The fixture itself should be barely visible. HARD RULE DO NOT: Do NOT allow light to shine down. Do NOT illuminate the soffit or eaves below the gutter.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate gutter-mounted lights. Do NOT place lights on the roofline shining up."
  },
  {
    id: 'soffit',
    label: 'Soffit Lights',
    description: 'Recessed lights installed in the roof overhang.',
    positivePrompt: "HARD RULE DO: Install recessed downlights in the roof overhangs/eaves to wash light down onto the house facade. HARD RULE DO NOT: Do NOT place lights on the walls or ground. Only in the roof overhangs.",
    negativePrompt: "CRITICAL NEGATIVE CONSTRAINT: The roof eaves, overhangs, and soffits must be PITCH BLACK. Turn OFF any existing soffit lights found in the image. ZERO LIGHT allowed on the upper facade. If no soffit lights are requested, the house walls must NOT have downward scallops of light. Force the upper architecture into shadow."
  },
  {
    id: 'hardscape',
    label: 'Hardscape Lights',
    description: 'Linear or puck lights for retaining walls & steps.',
    positivePrompt: "HARD RULE DO: Install linear lights under the capstones of EXISTING retaining walls. Install tread lights on EXISTING stone steps. HARD RULE DO NOT: Do NOT create walls or steps. Do NOT place these lights on the house facade.",
    negativePrompt: "HARD RULE DO NOT: Do NOT generate hardscape lighting on walls."
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