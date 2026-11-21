// One plain sentence per program: what makes it different. Keyed by template name (UI copy, not data).
const BLURBS: Partial<Record<string, string>> = {
  "Full body": "Whole body every session. Best when your week is busy.",
  "Upper / Lower": "Upper body one day, legs the next. Each muscle twice a week.",
  "Bro split": "One muscle group per day, trained hard once a week.",
  "Push / Pull / Legs": "Pressing, pulling, legs, twice through. Most volume, most days.",
};

export const programBlurb = (name: string): string | undefined => BLURBS[name];
