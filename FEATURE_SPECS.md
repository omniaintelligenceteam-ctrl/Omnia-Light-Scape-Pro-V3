# Feature Specs

## 1. AI Fixture Auto-Count

### The Wow Moment
User uploads a photo → AI analyzes it → Suggests exact fixture counts with reasoning:
- "6 columns detected → 6 up lights"
- "4 large trees → 4 up lights (2 per tree for larger specimens)"
- "Front walkway ~40ft → 5 path lights"
- "2 garage doors → 4 gutter lights"

User clicks "Accept All" or adjusts → proceeds to generation.

### How It Works

**Step 1: Vision Analysis**
```typescript
// New API endpoint: /api/analyze-photo
const analyzePhoto = async (imageBase64: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash', // Fast vision model
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
        { text: ANALYSIS_PROMPT }
      ]
    }
  });
  return JSON.parse(response.text); // Returns structured feature data
};
```

**Step 2: Analysis Prompt**
```
Analyze this residential property photo for landscape lighting design.

Identify and count:
1. Architectural columns/pillars (include porch columns, decorative columns)
2. Large trees (trunk diameter >8 inches, suitable for uplighting)
3. Medium trees/large shrubs (accent lighting candidates)
4. Windows on first story
5. Entryway/front door area
6. Walkways/paths (estimate length in feet)
7. Driveways (estimate length)
8. Garage doors
9. Roof lines/soffits (linear feet estimate)
10. Special features (fountains, statues, architectural details)

Return JSON:
{
  "features": [
    { "type": "column", "count": 6, "location": "front porch" },
    { "type": "large_tree", "count": 2, "location": "front yard left and right" },
    ...
  ],
  "property_style": "colonial|modern|mediterranean|ranch|craftsman",
  "estimated_frontage": 60,
  "notes": "Two-story home with prominent columns"
}
```

**Step 3: Fixture Mapping Logic**
```typescript
const FIXTURE_RULES = {
  column: { fixture: 'up_light', ratio: 1, note: '1 up light per column' },
  large_tree: { fixture: 'up_light', ratio: 2, note: '2 up lights for large trees' },
  medium_tree: { fixture: 'up_light', ratio: 1, note: '1 up light per medium tree' },
  walkway_ft: { fixture: 'path_light', ratio: 0.125, note: '1 path light per 8ft' },
  garage_door: { fixture: 'gutter_light', ratio: 2, note: '2 gutter lights per garage door' },
  // ... etc
};

const suggestFixtures = (features: Feature[]) => {
  return features.map(f => ({
    ...f,
    suggestedFixture: FIXTURE_RULES[f.type].fixture,
    suggestedCount: Math.ceil(f.count * FIXTURE_RULES[f.type].ratio),
    reasoning: FIXTURE_RULES[f.type].note
  }));
};
```

**Step 4: UI Component**
```
┌─────────────────────────────────────────────────────┐
│  🔍 AI Analysis Complete                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Detected Features:                                 │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏛️ 6 Columns (front porch)                  │   │
│  │    → 6 Up Lights                      [ 6 ] │   │
│  ├─────────────────────────────────────────────┤   │
│  │ 🌳 2 Large Trees (front yard)               │   │
│  │    → 4 Up Lights (2 per tree)         [ 4 ] │   │
│  ├─────────────────────────────────────────────┤   │
│  │ 🚶 ~40ft Walkway                            │   │
│  │    → 5 Path Lights                    [ 5 ] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Property Style: Colonial                           │
│  Total Fixtures: 15                                 │
│                                                     │
│  [Adjust Counts]     [Accept & Generate]            │
└─────────────────────────────────────────────────────┘
```

### Files to Create/Modify
- `api/analyze-photo.ts` — New endpoint
- `components/FeatureAnalysis.tsx` — New UI component
- `components/ImageUpload.tsx` — Add "Analyze" step before fixture selection
- `constants.ts` — Add fixture mapping rules

### Estimated Effort
- API endpoint: 2 hours
- UI component: 3-4 hours
- Integration: 2 hours
- Testing/tuning: 2-3 hours
- **Total: ~1 day**

---

## 6. AI Follow-up Drafts

### The Value
Quote sent 5 days ago, no response. Instead of:
- Forgetting about it
- Sending a generic "just following up"

You get:
- Notification: "Lee's quote ($2,977) has been pending 5 days"
- AI-drafted personalized email ready to send
- One click to send or edit

### How It Works

**Step 1: Follow-up Trigger Logic**
```typescript
// Run daily via cron or on app load
const checkStaleQuotes = async (userId: string) => {
  const staleQuotes = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'quoted')
    .lt('quote_sent_at', daysAgo(3)) // Configurable threshold
    .is('follow_up_sent_at', null);
  
  return staleQuotes;
};
```

**Step 2: AI Draft Generation**
```typescript
const generateFollowUp = async (project: Project, company: CompanyProfile) => {
  const prompt = `
    Write a friendly, professional follow-up email for a landscape lighting quote.
    
    Context:
    - Client name: ${project.clientDetails.name}
    - Property address: ${project.clientDetails.address}
    - Quote amount: $${project.quote.total}
    - Days since quote: ${daysSince(project.quote_sent_at)}
    - Fixtures included: ${summarizeFixtures(project.quote.lineItems)}
    - Company name: ${company.name}
    
    Tone: Warm but professional. Not pushy. Offer to answer questions.
    Length: 3-4 sentences max.
    
    Return only the email body, no subject line.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt
  });
  
  return {
    subject: `Following up on your lighting design - ${project.clientDetails.address}`,
    body: response.text,
    projectId: project.id
  };
};
```

**Step 3: UI Integration**

Option A: **Smart Alerts Banner** (you already have this component!)
```
┌─────────────────────────────────────────────────────┐
│ 📬 3 quotes need follow-up                    [View]│
└─────────────────────────────────────────────────────┘
```

Option B: **Project Card Badge**
```
┌─────────────────────────────────────────────┐
│ Lee                              [QUOTED]   │
│ $2,977                    🔔 5 days pending │
│ [Draft Follow-up] [View Quote]              │
└─────────────────────────────────────────────┘
```

**Step 4: Follow-up Modal**
```
┌─────────────────────────────────────────────────────┐
│  📧 Follow-up: Lee - 123 Main St                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  To: lee@email.com                                  │
│  Subject: Following up on your lighting design      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Hi Lee,                                      │   │
│  │                                              │   │
│  │ I wanted to check in on the lighting design  │   │
│  │ we put together for 123 Main St. I know     │   │
│  │ these decisions take time — happy to answer  │   │
│  │ any questions or adjust the design if needed.│   │
│  │                                              │   │
│  │ Best,                                        │   │
│  │ [Your Name]                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Regenerate]  [Edit]  [Send]                       │
└─────────────────────────────────────────────────────┘
```

### Files to Create/Modify
- `api/follow-up/generate.ts` — AI draft endpoint
- `api/follow-up/send.ts` — Send via Resend
- `components/FollowUpModal.tsx` — New component
- `components/SmartAlertsBanner.tsx` — Add follow-up alerts
- `components/pipeline/ProjectCard.tsx` — Add pending badge
- Database: Add `follow_up_sent_at`, `follow_up_count` columns

### Settings Integration
In Settings > Follow-ups:
- Follow-up threshold (default: 5 days)
- Auto-draft on/off
- Email template customization
- Exclude certain clients

### Estimated Effort
- API endpoints: 2-3 hours
- Follow-up modal: 2-3 hours
- Smart alerts integration: 1-2 hours
- Settings UI: 1-2 hours
- Testing: 2 hours
- **Total: ~1 day**

---

## Implementation Priority

**Do #6 first** — it's lower risk and immediately valuable. You already have:
- Email sending (Resend)
- SmartAlertsBanner component
- Project status tracking

**Then #1** — higher impact but needs more tuning to get the AI analysis accurate.

---

*Generated by G — 2026-01-26*
