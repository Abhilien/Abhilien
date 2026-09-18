/**
 * Life events and what the tradition reads them from.
 *
 * Each event names the houses that signify it and the graha that is its natural
 * significator (karaka). These are the standard Parashari attributions; where a
 * reading would be contested the event is given more than one primary house
 * rather than a single disputed one.
 *
 * Note on the difficult categories: bereavement and serious illness are
 * accepted as INPUT, because they are facts the person already knows and are
 * often the best-dated events in a life. Nothing in this module ever predicts
 * them. Rectification runs backwards — from known events to a birth time — and
 * the output is a time, never a forecast.
 */
import type { Graha, BhavaNumber } from '../core/types.js';

export type EventType =
  | 'Marriage'
  | 'ChildBirth'
  | 'CareerStart'
  | 'CareerChange'
  | 'Promotion'
  | 'JobLoss'
  | 'BusinessStart'
  | 'PropertyPurchase'
  | 'VehiclePurchase'
  | 'MoveAbroad'
  | 'HigherEducation'
  | 'Graduation'
  | 'Separation'
  | 'LossOfFather'
  | 'LossOfMother'
  | 'SiblingMarriage'
  | 'MajorIllness'
  | 'MajorGain'
  | 'MajorLoss'
  | 'SpiritualInitiation';

export interface EventSignature {
  /** Houses the tradition reads this event from, most direct first. */
  primary: BhavaNumber[];
  /** Supporting houses. */
  secondary: BhavaNumber[];
  /** Natural significator. */
  karaka: Graha;
  /** Plain description, shown when explaining a match. */
  label: string;
}

const h = (...n: number[]) => n as BhavaNumber[];

export const EVENT_SIGNATURES: Record<EventType, EventSignature> = {
  Marriage:            { primary: h(7),     secondary: h(2, 11),    karaka: 'Venus',   label: 'marriage' },
  ChildBirth:          { primary: h(5),     secondary: h(9, 11, 2), karaka: 'Jupiter', label: 'the birth of a child' },
  CareerStart:         { primary: h(10),    secondary: h(6, 2, 11), karaka: 'Saturn',  label: 'starting work' },
  CareerChange:        { primary: h(10),    secondary: h(6, 3, 11), karaka: 'Saturn',  label: 'a change of work' },
  Promotion:           { primary: h(10),    secondary: h(11, 6),    karaka: 'Sun',     label: 'a promotion' },
  JobLoss:             { primary: h(10),    secondary: h(12, 8, 6), karaka: 'Saturn',  label: 'losing a job' },
  BusinessStart:       { primary: h(7, 10), secondary: h(11, 3),    karaka: 'Mercury', label: 'starting a business' },
  PropertyPurchase:    { primary: h(4),     secondary: h(11, 2),    karaka: 'Mars',    label: 'buying property' },
  VehiclePurchase:     { primary: h(4),     secondary: h(11),       karaka: 'Venus',   label: 'buying a vehicle' },
  MoveAbroad:          { primary: h(12),    secondary: h(9, 3, 7),  karaka: 'Rahu',    label: 'moving abroad' },
  HigherEducation:     { primary: h(9),     secondary: h(4, 5, 2),  karaka: 'Jupiter', label: 'higher education' },
  Graduation:          { primary: h(4),     secondary: h(5, 9, 2),  karaka: 'Mercury', label: 'completing education' },
  Separation:          { primary: h(7),     secondary: h(8, 12, 6), karaka: 'Venus',   label: 'separation or divorce' },
  LossOfFather:        { primary: h(9),     secondary: h(4, 8, 12), karaka: 'Sun',     label: 'the loss of a father' },
  LossOfMother:        { primary: h(4),     secondary: h(9, 8, 12), karaka: 'Moon',    label: 'the loss of a mother' },
  SiblingMarriage:     { primary: h(3),     secondary: h(11, 7),    karaka: 'Mars',    label: 'a sibling’s marriage' },
  MajorIllness:        { primary: h(6),     secondary: h(8, 12),    karaka: 'Saturn',  label: 'a serious illness' },
  MajorGain:           { primary: h(11),    secondary: h(2, 9, 5),  karaka: 'Jupiter', label: 'a major gain' },
  MajorLoss:           { primary: h(12),    secondary: h(8, 6),     karaka: 'Saturn',  label: 'a major loss' },
  SpiritualInitiation: { primary: h(9, 12), secondary: h(5, 8),     karaka: 'Ketu',    label: 'a spiritual turning point' },
};

/** How precisely the person remembers an event's date. */
export type EventPrecision = 'Day' | 'Month' | 'Year';

export interface LifeEvent {
  type: EventType;
  /** When it happened. */
  date: Date;
  /** Defaults to `Day`. A year-precision event contributes far less. */
  precision?: EventPrecision;
  note?: string;
}

/**
 * Weight an event's contribution by how well its date is known.
 *
 * A dasha boundary moves about 2.7 days for every minute of birth time in a
 * typical chart, so an event dated to the year carries almost no information
 * about the minute, and pretending otherwise is how rectification tools produce
 * confident nonsense.
 */
export const PRECISION_WEIGHT: Record<EventPrecision, number> = {
  Day: 1, Month: 0.6, Year: 0.25,
};
