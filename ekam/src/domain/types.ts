// Core domain model for ekam.
// The relationship model is deliberately small: two kinds of connection,
// one Primary slot per kind, and a waiting list for everything else.

export type Kind = 'romantic' | 'friendship';

/** `concierge` is reserved for a future human-matchmaking tier. */
export type Plan = 'free' | 'premium' | 'concierge';

export type Intent =
  | 'casual'
  | 'serious'
  | 'long-term'
  | 'marriage'
  | 'exploring'
  | 'friendship';

export type Gender = 'woman' | 'man' | 'nonbinary';

export type Reach = 'local' | 'regional' | 'national' | 'international' | 'global';

export type VerificationKey =
  | 'identity'
  | 'phone'
  | 'photo'
  | 'employment'
  | 'education'
  | 'profile';

/** When a piece of information becomes visible to someone else. */
export type ShareLevel = 'discovery' | 'mutual' | 'primary';
export type SharedField = 'profession' | 'education' | 'future' | 'languages';

export type Trait =
  | 'respect'
  | 'communication'
  | 'authenticity'
  | 'responsiveness'
  | 'reliability'
  | 'clarity'
  | 'overall';

export interface Place {
  city: string;
  /** Metro area used for "local" discovery, e.g. "Delhi NCR". */
  metro: string;
  /** Broad region used for "regional" discovery, e.g. "North India". */
  region: string;
  country: string;
}

export interface Portrait {
  from: string;
  to: string;
  ink: string;
  variant: 0 | 1 | 2 | 3;
}

export interface Future {
  marriageTimeline?: string;
  children?: string;
  relocation?: string;
  career?: string;
  family?: string;
  finances?: string;
  culture?: string;
  longTermGoals?: string;
}

export interface Profile {
  firstName: string;
  age: number;
  gender: Gender;
  /** Who they'd like to meet romantically. */
  seeking: Gender[];
  place: Place;
  profession: string;
  education?: string;
  bio: string;
  intent: Intent;
  /** Optional direction of travel, e.g. serious → marriage. */
  intentNext?: Intent;
  lifestyle: string[];
  interests: string[];
  values: string[];
  languages: string[];
  future: Future;
  prompt?: { q: string; a: string };
  portraits: Portrait[];
  /** Which kinds of connection this person is open to. */
  openTo: Kind[];
}

export interface DiscoveryFilters {
  minAge: number;
  maxAge: number;
  verifiedOnly: boolean;
  /** Empty means any intent. */
  intents: Intent[];
}

export interface Settings {
  feedbackVisible: boolean;
  incognito: boolean;
  anonymousDiscovery: boolean;
  discoveryPaused: boolean;
  reach: Reach;
  countries: string[];
  longDistance: boolean;
  relocation: boolean;
  international: boolean;
  sharing: Record<SharedField, ShareLevel>;
  /** Premium only; ignored on Free. */
  filters: DiscoveryFilters;
}

export interface History {
  memberSince: string;
  meaningfulInteractions: number;
  mutualConnections: number;
  completedConversations: number;
  meetings: number;
  movedToFriendship: number;
  /** Lengths (days) of past Primary connections. Never linked to identities. */
  durations: number[];
  beyondInitialPct: number;
  toMeetingPct: number;
  changes: { photos?: string; location?: string; intent?: string };
}

export interface User {
  id: string;
  profile: Profile;
  plan: Plan;
  verification: Record<VerificationKey, boolean>;
  settings: Settings;
  history: History;
  /** Demo-only: whether this fictional person can be signed in as. */
  persona?: { tagline: string };
}

export type FeedbackStatus = 'awaiting-release' | 'published' | 'held' | 'reported' | 'removed';

export interface FeedbackEntry {
  id: string;
  about: string;
  /** Kept server-side for moderation only; never rendered to members. */
  author: string;
  connectionId?: string;
  traits: Record<Trait, boolean>;
  comment?: string;
  at: string;
  status: FeedbackStatus;
  report?: { by: string; reason: ReportReason; at: string };
}

export type ReportReason =
  | 'harassing'
  | 'threatening'
  | 'discriminatory'
  | 'explicit'
  | 'doxxing'
  | 'abusive'
  | 'malicious'
  | 'unrelated';

export type ConnectionStatus = 'mutual' | 'primary' | 'paused' | 'closed';

export type Stage =
  | 'primary'
  | 'conversation'
  | 'voice'
  | 'video'
  | 'meeting'
  | 'relationship'
  | 'marriage';

export type CheckIn = 'continue' | 'unsure' | 'friendship' | 'close';

export interface Message {
  id: string;
  from: string;
  text: string;
  at: string;
  kind?: 'text' | 'system' | 'plan';
  failed?: boolean;
}

export interface DatePlan {
  area: string;
  budget: string;
  time: string;
  activity: string;
  venue: string;
}

export interface Connection {
  id: string;
  users: [string, string];
  kind: Kind;
  status: ConnectionStatus;
  mutualAt: string;
  primarySince?: string;
  stagesReached: Stage[];
  messages: Message[];
  meetingReady: Record<string, boolean>;
  datePlan?: DatePlan;
  pause?: { by: string; reason: string; at: string };
  closure?: { by: string; reason: string; note?: string; at: string };
  /** Pending invitation to become Primary, waiting on the other person's slot. */
  invite?: { by: string; at: string };
  checkins: Record<string, CheckIn>;
  fromRomance?: boolean;
  /** When the gentle "still interested" reminder was last sent. */
  remindedAt?: string;
  /** Users who have been invited to leave Connection Feedback. */
  feedbackDue: string[];
}

export interface Interest {
  from: string;
  to: string;
  kind: Kind;
  at: string;
}

export interface Notice {
  id: string;
  for: string;
  text: string;
  at: string;
  read: boolean;
  link?: string;
}

export interface DailyDiscovery {
  day: number;
  ids: string[];
}

export interface State {
  version: number;
  now: string;
  /** Simulated day offset, so the demo can move to "tomorrow". */
  day: number;
  viewerId: string;
  onboarded: boolean;
  offline: boolean;
  users: Record<string, User>;
  interests: Interest[];
  passes: { from: string; to: string; kind: Kind }[];
  connections: Connection[];
  feedback: FeedbackEntry[];
  notices: Notice[];
  /** Profile views. Incognito members are never recorded. */
  visits: { from: string; to: string; at: string }[];
  discovery: Record<string, Partial<Record<Kind, DailyDiscovery>>>;
}
