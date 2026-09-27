import type {
  CheckIn,
  Intent,
  Kind,
  Reach,
  ReportReason,
  ShareLevel,
  SharedField,
  Stage,
  Trait,
  VerificationKey,
} from './types';

export const INTENT_LABEL: Record<Intent, string> = {
  casual: 'Casual dating',
  serious: 'Serious dating',
  'long-term': 'Long-term relationship',
  marriage: 'Marriage',
  exploring: 'Exploring compatibility',
  friendship: 'Friendship',
};

export const KIND_LABEL: Record<Kind, string> = {
  romantic: 'Romantic',
  friendship: 'Friendship',
};

export const REACH_LABEL: Record<Reach, { title: string; detail: string }> = {
  local: { title: 'Local', detail: 'Your city and surrounding area' },
  regional: { title: 'Regional', detail: 'Your wider region' },
  national: { title: 'National', detail: 'Anywhere in your country' },
  international: { title: 'International', detail: 'Countries you choose' },
  global: { title: 'Global', detail: 'Anywhere' },
};

export const REACH_ORDER: Reach[] = ['local', 'regional', 'national', 'international', 'global'];

export const VERIFICATION_LABEL: Record<VerificationKey, string> = {
  identity: 'Identity',
  phone: 'Phone',
  photo: 'Photo',
  employment: 'Employment',
  education: 'Education',
  profile: 'Profile details',
};

export const TRAIT_LABEL: Record<Trait, string> = {
  respect: 'Respect',
  communication: 'Communication',
  authenticity: 'Authenticity',
  responsiveness: 'Responsiveness',
  reliability: 'Reliability',
  clarity: 'Clarity of intentions',
  overall: 'Overall experience',
};

/** How each trait is phrased when someone leaves feedback. */
export const TRAIT_PROMPT: Record<Trait, string> = {
  respect: 'Respectful',
  communication: 'Good communicator',
  authenticity: 'Genuine',
  responsiveness: 'Responsive',
  reliability: 'Reliable',
  clarity: 'Clear about intentions',
  overall: 'A good experience overall',
};

export const STAGE_LABEL: Record<Stage, string> = {
  primary: 'Primary',
  conversation: 'Conversation',
  voice: 'Voice',
  video: 'Video',
  meeting: 'Meeting',
  relationship: 'Relationship',
  marriage: 'Marriage consideration',
};

export const STAGES_ROMANTIC: Stage[] = [
  'primary',
  'conversation',
  'voice',
  'video',
  'meeting',
  'relationship',
  'marriage',
];
export const STAGES_FRIENDSHIP: Stage[] = ['primary', 'conversation', 'voice', 'video', 'meeting'];

export const CHECKIN_LABEL: Record<CheckIn, string> = {
  continue: "I'd like to continue",
  unsure: "I'm unsure",
  friendship: "I'd prefer friendship",
  close: "I'd like to close this connection",
};

export const CLOSURE_REASONS = [
  "I don't feel a romantic connection.",
  "Our long-term goals don't align.",
  "I'd prefer friendship.",
  "I've decided to pursue another connection.",
  'Something else.',
];

export const FRIEND_CLOSURE_REASONS = [
  "I don't think we're a good fit as friends.",
  "I don't have the time I'd like to give this right now.",
  "I've decided to focus on another connection.",
  'Something else.',
];

export const PAUSE_REASONS = ['Travel', 'Work', 'Personal circumstances', 'Taking time to think'];

export const REPORT_LABEL: Record<ReportReason, string> = {
  harassing: 'Harassing',
  threatening: 'Threatening',
  discriminatory: 'Discriminatory',
  explicit: 'Sexually explicit',
  doxxing: 'Shares private information',
  abusive: 'Abusive',
  malicious: 'Malicious or retaliatory',
  unrelated: 'Unrelated to the interaction',
};

export const SHARE_LABEL: Record<ShareLevel, string> = {
  discovery: 'Everyone in Discovery',
  mutual: 'After mutual interest',
  primary: 'Primary connection only',
};

export const FIELD_LABEL: Record<SharedField, string> = {
  profession: 'Profession & employer',
  education: 'Education',
  future: 'Family & future plans',
  languages: 'Languages & culture',
};
