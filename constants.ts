import type { ColorTemperature, FixturePricing } from "./types";

export const COLOR_TEMPERATURES: ColorTemperature[] = [
  {
    id: "2700k",
    kelvin: "2700K",
    color: "#FFB46B",
    description: "Warm White",
    prompt: "Use Warm White (2700K) for all lights. Warm and cozy."
  },
  {
    id: "3000k",
    kelvin: "3000K",
    color: "#FFD18E",
    description: "Soft White",
    prompt: "Use Soft White (3000K) for all lights. Professional standard."
  },
  {
    id: "4000k",
    kelvin: "4000K",
    color: "#FFF2D7",
    description: "Cool White",
    prompt: "Use Cool White (4000K) for all lights. Crisp and neutral."
  },
  {
    id: "5000k",
    kelvin: "5000K",
    color: "#E3F2FD",
    description: "Daylight",
    prompt: "Use Daylight (5000K) for all lights. Bright white."
  },
  {
    id: "christmas",
    kelvin: "Festive",
    color: "#D32F2F",
    description: "Christmas",
    prompt: "Use Red and Green colors for all lights." 
  },
  { 
    id: "halloween", 
    kelvin: "Spooky",
    color: "#9C27B0",
    description: "Halloween",
    prompt: "Use Orange and Purple colors for all lights." 
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
    positivePrompt: "Instruction: Place ground-mounted up lights TIGHT against the foundation. Targets: Under windows, flanking windows, base of columns. Light must graze the surface.",
    negativePrompt: "Restriction: Do NOT generate ground-mounted up lights."
  },
  {
    id: 'path',
    label: 'Path Lights',
    description: 'Post-mounted lights for walkways.',
    positivePrompt: "Instruction: Place post-mounted path lights along existing walkways spaced 6-8 feet apart.",
    negativePrompt: "Restriction: Do NOT generate path lights."
  },
  {
    id: 'coredrill',
    label: 'Core Drill Lights',
    description: 'Flush-mounted in-grade lights for hardscapes.',
    positivePrompt: "Instruction: Install flush-mounted 'Core Drill' lights in concrete/hardscape at the base of columns or garage pillars.",
    negativePrompt: "Restriction: Do NOT generate flush-mounted core drill lights."
  },
  {
    id: 'gutter',
    label: 'Gutter Up Lights',
    description: 'Roofline accent lights for dormers & peaks.',
    positivePrompt: "Instruction: Install small fixtures on the gutter lip shining UPWARDS to illuminate dormers/peaks. No downlight.",
    negativePrompt: "Restriction: Do NOT generate gutter-mounted lights."
  },
  {
    id: 'soffit',
    label: 'Soffit Lights',
    description: 'Recessed lights installed in the roof overhang.',
    positivePrompt: "Instruction: Install recessed downlights in the roof overhangs/eaves.",
    negativePrompt: "Restriction: The roof eaves and soffits must be PITCH BLACK. Zero light on the upper facade from above."
  },
  {
    id: 'hardscape',
    label: 'Hardscape Lights',
    description: 'Linear or puck lights for retaining walls & steps.',
    positivePrompt: "Instruction: Install linear lights under capstones of existing retaining walls or on steps.",
    negativePrompt: "Restriction: Do NOT generate hardscape lighting."
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