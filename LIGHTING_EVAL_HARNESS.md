# Lighting Evaluation Harness

This project now includes a batch evaluation utility for generated night renders:

- `runLightingEvaluationBatch` in `services/lightingEvaluationService.ts`
- `lightingEvaluationResultsToCsv` in `services/lightingEvaluationService.ts`

## What It Scores

For each generated render, it evaluates:

- Placement verification (including gutter semantics if expected placements are provided)
- Annotation artifact leakage (text, labels, UI overlays)
- Photorealism (Gemini check + deterministic heuristic check)
- Composite score (0-100)

## Pass Criteria (Default)

An image is marked as `passed` when all are true:

- Composite score >= `85`
- Placement verification passes
- Artifact check passes
- Photoreal check passes (AI + heuristic)

You can override the composite threshold with `minCompositeScore`.

## Example Usage (Browser Dev Console)

```ts
import { runLightingEvaluationBatch, lightingEvaluationResultsToCsv } from './services/lightingEvaluationService';

const batch = await runLightingEvaluationBatch([
  {
    id: 'case-001',
    generatedImage: 'data:image/jpeg;base64,...',
    imageMimeType: 'image/jpeg',
    expectedPlacements: [], // optional
    gutterLines: [], // optional
    requirePlacement: false,
  },
], { minCompositeScore: 85 });

console.log(batch.summary);
console.log(batch.results);
console.log(lightingEvaluationResultsToCsv(batch.results));
```

## Notes

- The harness calls Gemini verification APIs, so it consumes API quota.
- For reliable comparisons, keep camera framing and fixture sets consistent across cases.
