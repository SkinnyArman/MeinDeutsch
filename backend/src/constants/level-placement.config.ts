import { CEFR_LEVELS } from "../ai/analysis.client.js";

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type LevelPlacementSkill = "grammar" | "vocabulary" | "reading" | "word_order";

export interface LevelPlacementOption {
  id: string;
  text: string;
}

export interface LevelPlacementQuestion {
  id: string;
  targetLevel: CefrLevel;
  skill: LevelPlacementSkill;
  prompt: string;
  options: LevelPlacementOption[];
  correctOptionId: string;
}

export interface LevelSelfAssessmentOption {
  level: CefrLevel | "unknown";
  label: string;
  description: string;
}

export const LEVEL_SELF_ASSESSMENT_OPTIONS: LevelSelfAssessmentOption[] = [
  { level: "unknown", label: "I don't know", description: "Start neutral and let the questions decide." },
  { level: "A1", label: "A1", description: "I know basic words and fixed phrases." },
  { level: "A2", label: "A2", description: "I can handle simple everyday situations." },
  { level: "B1", label: "B1", description: "I can talk about familiar topics with some detail." },
  { level: "B2", label: "B2", description: "I can discuss opinions and abstract topics." },
  { level: "C1", label: "C1", description: "I can express myself flexibly and precisely." }
];

export const LEVEL_PLACEMENT_WRITING_PROMPT =
  "Schreib 3-5 Saetze auf Deutsch: Was moechtest du in den naechsten Monaten lernen oder verbessern, und warum?";

export const LEVEL_PLACEMENT_QUESTIONS: LevelPlacementQuestion[] = [
  {
    id: "a1-article-bread",
    targetLevel: "A1",
    skill: "grammar",
    prompt: "Choose the correct article: ___ Brot ist frisch.",
    options: [
      { id: "a", text: "Der" },
      { id: "b", text: "Die" },
      { id: "c", text: "Das" },
      { id: "d", text: "Den" }
    ],
    correctOptionId: "c"
  },
  {
    id: "a1-present-sein",
    targetLevel: "A1",
    skill: "grammar",
    prompt: "Complete the sentence: Ich ___ Student.",
    options: [
      { id: "a", text: "bin" },
      { id: "b", text: "bist" },
      { id: "c", text: "ist" },
      { id: "d", text: "sind" }
    ],
    correctOptionId: "a"
  },
  {
    id: "a1-vocab-time",
    targetLevel: "A1",
    skill: "vocabulary",
    prompt: "What does 'morgen' usually mean?",
    options: [
      { id: "a", text: "yesterday" },
      { id: "b", text: "tomorrow" },
      { id: "c", text: "evening" },
      { id: "d", text: "never" }
    ],
    correctOptionId: "b"
  },
  {
    id: "a2-perfect-gehen",
    targetLevel: "A2",
    skill: "grammar",
    prompt: "Choose the correct Perfekt form: Gestern ___ ich ins Kino ___.",
    options: [
      { id: "a", text: "habe ... gegangen" },
      { id: "b", text: "bin ... gegangen" },
      { id: "c", text: "habe ... gehen" },
      { id: "d", text: "bin ... gehen" }
    ],
    correctOptionId: "b"
  },
  {
    id: "a2-dative-mit",
    targetLevel: "A2",
    skill: "grammar",
    prompt: "Complete the sentence: Ich fahre mit ___ Bus zur Arbeit.",
    options: [
      { id: "a", text: "der" },
      { id: "b", text: "die" },
      { id: "c", text: "dem" },
      { id: "d", text: "den" }
    ],
    correctOptionId: "c"
  },
  {
    id: "a2-word-order-weil",
    targetLevel: "A2",
    skill: "word_order",
    prompt: "Choose the correct sentence.",
    options: [
      { id: "a", text: "Ich bleibe zu Hause, weil ich bin krank." },
      { id: "b", text: "Ich bleibe zu Hause, weil bin ich krank." },
      { id: "c", text: "Ich bleibe zu Hause, weil ich krank bin." },
      { id: "d", text: "Ich bleibe zu Hause, weil krank ich bin." }
    ],
    correctOptionId: "c"
  },
  {
    id: "a2-reading-sign",
    targetLevel: "A2",
    skill: "reading",
    prompt: "A sign says: 'Heute wegen Krankheit geschlossen.' What does it mean?",
    options: [
      { id: "a", text: "Open later today" },
      { id: "b", text: "Closed today because of illness" },
      { id: "c", text: "Closed every day" },
      { id: "d", text: "Only open for sick people" }
    ],
    correctOptionId: "b"
  },
  {
    id: "b1-konjunktiv-wuerde",
    targetLevel: "B1",
    skill: "grammar",
    prompt: "Complete the polite request: Ich ___ gern einen Termin vereinbaren.",
    options: [
      { id: "a", text: "werde" },
      { id: "b", text: "wurde" },
      { id: "c", text: "wuerde" },
      { id: "d", text: "war" }
    ],
    correctOptionId: "c"
  },
  {
    id: "b1-relative-pronoun",
    targetLevel: "B1",
    skill: "grammar",
    prompt: "Choose the correct relative pronoun: Das ist der Mann, ___ mir geholfen hat.",
    options: [
      { id: "a", text: "der" },
      { id: "b", text: "den" },
      { id: "c", text: "dem" },
      { id: "d", text: "dessen" }
    ],
    correctOptionId: "a"
  },
  {
    id: "b1-collocation-decision",
    targetLevel: "B1",
    skill: "vocabulary",
    prompt: "Which phrase is most natural?",
    options: [
      { id: "a", text: "eine Entscheidung machen" },
      { id: "b", text: "eine Entscheidung treffen" },
      { id: "c", text: "eine Entscheidung gehen" },
      { id: "d", text: "eine Entscheidung stellen" }
    ],
    correctOptionId: "b"
  },
  {
    id: "b1-reading-appointment",
    targetLevel: "B1",
    skill: "reading",
    prompt: "Text: 'Falls Sie den Termin nicht wahrnehmen koennen, sagen Sie bitte spaetestens 24 Stunden vorher ab.' What should you do?",
    options: [
      { id: "a", text: "Cancel at least 24 hours in advance if you cannot come" },
      { id: "b", text: "Arrive 24 hours early" },
      { id: "c", text: "Only cancel after the appointment" },
      { id: "d", text: "Bring a written confirmation" }
    ],
    correctOptionId: "a"
  },
  {
    id: "b1-obwohl-order",
    targetLevel: "B1",
    skill: "word_order",
    prompt: "Choose the correct sentence.",
    options: [
      { id: "a", text: "Obwohl es regnet, gehe ich spazieren." },
      { id: "b", text: "Obwohl es regnet, ich gehe spazieren." },
      { id: "c", text: "Obwohl regnet es, gehe ich spazieren." },
      { id: "d", text: "Obwohl es regnet, spazieren ich gehe." }
    ],
    correctOptionId: "a"
  },
  {
    id: "b2-passive",
    targetLevel: "B2",
    skill: "grammar",
    prompt: "Choose the correct passive sentence.",
    options: [
      { id: "a", text: "Der Antrag wird morgen bearbeitet." },
      { id: "b", text: "Der Antrag bearbeitet morgen." },
      { id: "c", text: "Der Antrag ist morgen bearbeiten." },
      { id: "d", text: "Der Antrag wurde morgen bearbeiten." }
    ],
    correctOptionId: "a"
  },
  {
    id: "b2-nominalization",
    targetLevel: "B2",
    skill: "vocabulary",
    prompt: "Which version sounds most formal/natural?",
    options: [
      { id: "a", text: "Weil die Preise steigen, kaufen Leute weniger." },
      { id: "b", text: "Aufgrund steigender Preise kaufen Verbraucher weniger." },
      { id: "c", text: "Durch Preise hoch kaufen Menschen nicht." },
      { id: "d", text: "Wegen die Preise kaufen Leute weniger." }
    ],
    correctOptionId: "b"
  },
  {
    id: "b2-subjective-claim",
    targetLevel: "B2",
    skill: "reading",
    prompt: "Text: 'Die Massnahme duerfte langfristig zu einer Entlastung fuehren.' What does 'duerfte' express here?",
    options: [
      { id: "a", text: "a strict obligation" },
      { id: "b", text: "a cautious assumption" },
      { id: "c", text: "a past permission" },
      { id: "d", text: "a direct command" }
    ],
    correctOptionId: "b"
  },
  {
    id: "b2-dass-word-order",
    targetLevel: "B2",
    skill: "word_order",
    prompt: "Choose the best sentence.",
    options: [
      { id: "a", text: "Ich halte es fuer wichtig, dass man regelmaessig Feedback bekommt." },
      { id: "b", text: "Ich halte es fuer wichtig, dass bekommt man regelmaessig Feedback." },
      { id: "c", text: "Ich halte wichtig es, dass man bekommt Feedback regelmaessig." },
      { id: "d", text: "Ich halte es wichtig fuer, dass man regelmaessig bekommt Feedback." }
    ],
    correctOptionId: "a"
  },
  {
    id: "b2-preposition-verbs",
    targetLevel: "B2",
    skill: "grammar",
    prompt: "Complete the sentence: Viele Studierende klagen ___ den hohen Zeitdruck.",
    options: [
      { id: "a", text: "mit" },
      { id: "b", text: "auf" },
      { id: "c", text: "ueber" },
      { id: "d", text: "fuer" }
    ],
    correctOptionId: "c"
  },
  {
    id: "c1-konjunktiv-indirect",
    targetLevel: "C1",
    skill: "grammar",
    prompt: "Choose the correct indirect speech form: Er sagte, er ___ keine Zeit.",
    options: [
      { id: "a", text: "hat" },
      { id: "b", text: "habe" },
      { id: "c", text: "haette gehabt haben" },
      { id: "d", text: "haben wuerde" }
    ],
    correctOptionId: "b"
  },
  {
    id: "c1-nuance-gleichwohl",
    targetLevel: "C1",
    skill: "vocabulary",
    prompt: "Which word best replaces 'trotzdem' in a formal text?",
    options: [
      { id: "a", text: "gleichwohl" },
      { id: "b", text: "sowieso" },
      { id: "c", text: "irgendwie" },
      { id: "d", text: "dabei" }
    ],
    correctOptionId: "a"
  },
  {
    id: "c1-reading-implicit",
    targetLevel: "C1",
    skill: "reading",
    prompt: "Text: 'Die Reform ist weniger ein grosser Wurf als ein vorsichtiger Schritt in die richtige Richtung.' What is the author's view?",
    options: [
      { id: "a", text: "The reform is completely useless" },
      { id: "b", text: "The reform is ambitious and radical" },
      { id: "c", text: "The reform is limited but mildly positive" },
      { id: "d", text: "The reform should be reversed immediately" }
    ],
    correctOptionId: "c"
  }
];
