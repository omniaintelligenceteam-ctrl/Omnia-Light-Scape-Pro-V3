# Output Contract

- Return exactly one final rendered image.
- Also return a compact JSON summary confirming constraint compliance.

Required JSON summary fields:

```json
{
  "countsMatched": true,
  "typesMatched": true,
  "placementsMatched": true,
  "requiredCounts": {
    "uplight": 0,
    "path_light": 0,
    "well_light": 0,
    "flood": 0,
    "wall_wash": 0
  },
  "renderedCounts": {
    "uplight": 0,
    "path_light": 0,
    "well_light": 0,
    "flood": 0,
    "wall_wash": 0
  }
}
```

- If constraints cannot be satisfied, return no image and report mismatch in the JSON summary.
