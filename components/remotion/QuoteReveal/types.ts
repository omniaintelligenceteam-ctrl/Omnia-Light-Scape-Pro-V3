export interface QuoteLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteVideoProps {
  // Company
  companyName: string;
  companyLogo?: string;

  // Client
  clientName: string;
  projectName: string;

  // Images
  beforeImage?: string;
  afterImage?: string;

  // Quote Details
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;

  // CTA
  approvalUrl?: string;
  expiresAt?: string;
}

// Video timing constants (in frames at 30fps)
export const VIDEO_FPS = 30;
export const INTRO_DURATION = 90;        // 3 seconds
export const BEFORE_DURATION = 90;       // 3 seconds
export const TRANSITION_DURATION = 120;  // 4 seconds
export const LINE_ITEMS_DURATION = 240;  // 8 seconds
export const TOTAL_DURATION = 90;        // 3 seconds
export const CTA_DURATION = 120;         // 4 seconds

export const SCENE_STARTS = {
  intro: 0,
  before: INTRO_DURATION,
  transition: INTRO_DURATION + BEFORE_DURATION,
  lineItems: INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION,
  total: INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION + LINE_ITEMS_DURATION,
  cta: INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION + LINE_ITEMS_DURATION + TOTAL_DURATION,
};

export const TOTAL_FRAMES = INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION + LINE_ITEMS_DURATION + TOTAL_DURATION + CTA_DURATION;
