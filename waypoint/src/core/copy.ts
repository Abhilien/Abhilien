// Tone rules: the product never shames. Every generated or templated line
// goes through `toneCheck`, and a unit test runs it over all ladder copy.

const BANNED = [
  /\bagain\b/i,
  /\bfail(ed|ure)?\b/i,
  /\byou should have\b/i,
  /\blazy\b/i,
  /\bjust do it\b/i,
  /\boverdue\b/i,
  /\bwasted\b/i,
  /\bbehind schedule\b/i,
  /\bdisappoint/i,
  /!{2,}/,
];

export function toneCheck(text: string): { ok: boolean; hits: string[] } {
  const hits = BANNED.filter((re) => re.test(text)).map((re) => re.source);
  return { ok: hits.length === 0, hits };
}

export const MICROCOPY = {
  captureSaved: 'Got it.',
  started: "That's the hard part done.",
  stopHere: 'Stopping is allowed. I saved your place.',
  welcomeBack: 'Welcome back. No catching up needed. I tucked older stuff away.',
  dropped: 'Dropped. Not everything deserves doing.',
  emptyLater: 'Nothing waiting. Suspicious, but nice.',
  nothingDue: 'Nothing urgent. Enjoy it.',
  overwhelmPause: "Pause. You don't have to fix everything.",
  resetDay: "The day isn't over. What would make today feel okay?",
  rest: 'Nothing is urgent. A break is a fine choice.',
} as const;
