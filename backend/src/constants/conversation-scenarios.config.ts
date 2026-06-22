export interface ConversationScenarioConfig {
  id: string;
  label: string;
  category: string;
  // The role the AI plays and the setting, fed into the system prompt.
  aiRole: string;
  setting: string;
}

// Categories group scenarios in the picker.
export const CONVERSATION_CATEGORIES = [
  "Alltag",
  "Dienstleistungen",
  "Arbeit & Schule",
  "Reisen",
  "Sozial",
  "Gesundheit"
] as const;

export const CONVERSATION_SCENARIOS: ConversationScenarioConfig[] = [
  // Alltag (everyday)
  {
    id: "cafe",
    label: "Im Café",
    category: "Alltag",
    aiRole: "a friendly barista in a German café",
    setting: "The learner just walked in to order. Take their order and chat lightly."
  },
  {
    id: "bakery",
    label: "Beim Bäcker",
    category: "Alltag",
    aiRole: "a baker behind the counter at a busy German bakery",
    setting: "The learner wants to buy bread and pastries; help them choose."
  },
  {
    id: "supermarket",
    label: "Im Supermarkt",
    category: "Alltag",
    aiRole: "a supermarket employee stocking shelves",
    setting: "The learner can't find some products and asks for help."
  },
  {
    id: "shopping",
    label: "Kleidung kaufen",
    category: "Dienstleistungen",
    aiRole: "a helpful shop assistant in a clothing store",
    setting: "The learner is looking for something to buy and needs help with sizes and styles."
  },
  {
    id: "hairdresser",
    label: "Beim Friseur",
    category: "Dienstleistungen",
    aiRole: "a hairdresser greeting a client in the chair",
    setting: "The learner explains what haircut they want; discuss the details."
  },
  {
    id: "bank",
    label: "Bei der Bank",
    category: "Dienstleistungen",
    aiRole: "a bank clerk at the service desk",
    setting: "The learner has a simple banking request (account, card, transfer)."
  },
  {
    id: "apartment",
    label: "Wohnungssuche",
    category: "Dienstleistungen",
    aiRole: "a landlord showing an apartment for rent",
    setting: "The learner is a prospective tenant viewing the flat and asking questions."
  },
  {
    id: "restaurant",
    label: "Im Restaurant",
    category: "Dienstleistungen",
    aiRole: "a waiter at a casual German restaurant",
    setting: "The learner is ordering food and drinks; take the order and make suggestions."
  },
  // Arbeit & Schule
  {
    id: "colleague",
    label: "Mit Kollegen",
    category: "Arbeit & Schule",
    aiRole: "a friendly coworker at the office kitchen",
    setting: "Small talk about the workday, projects, and weekend plans."
  },
  {
    id: "interview",
    label: "Vorstellungsgespräch",
    category: "Arbeit & Schule",
    aiRole: "a recruiter conducting a relaxed job interview",
    setting: "The learner is the candidate; ask about their background and motivation."
  },
  {
    id: "professor",
    label: "In der Sprechstunde",
    category: "Arbeit & Schule",
    aiRole: "a university professor in office hours",
    setting: "The learner is a student asking about a course, an assignment, or an exam."
  },
  // Reisen
  {
    id: "travel",
    label: "Am Bahnhof",
    category: "Reisen",
    aiRole: "a train station information desk attendant",
    setting: "The learner needs help with tickets, platforms, and connections."
  },
  {
    id: "hotel",
    label: "An der Hotelrezeption",
    category: "Reisen",
    aiRole: "a hotel receptionist at check-in",
    setting: "The learner is checking in and asking about the room and the area."
  },
  {
    id: "directions",
    label: "Nach dem Weg fragen",
    category: "Reisen",
    aiRole: "a friendly passer-by on a German street",
    setting: "The learner is lost and asks for directions to a place."
  },
  // Sozial
  {
    id: "neighbor",
    label: "Nachbarn",
    category: "Sozial",
    aiRole: "a chatty neighbor meeting the learner in the stairwell",
    setting: "Everyday small talk about the building, weather, and local life."
  },
  {
    id: "friends",
    label: "Mit Freunden",
    category: "Sozial",
    aiRole: "a close friend catching up over coffee",
    setting: "Relaxed, informal conversation about life, plans, and opinions."
  },
  {
    id: "party",
    label: "Auf einer Party",
    category: "Sozial",
    aiRole: "a guest at a house party meeting the learner for the first time",
    setting: "Getting to know each other with light, friendly small talk."
  },
  // Gesundheit
  {
    id: "doctor",
    label: "Beim Arzt",
    category: "Gesundheit",
    aiRole: "a calm general practitioner (Hausarzt)",
    setting: "The learner is a patient describing a minor health problem."
  },
  {
    id: "pharmacy",
    label: "In der Apotheke",
    category: "Gesundheit",
    aiRole: "a pharmacist at the counter",
    setting: "The learner asks for something for a minor ailment and how to take it."
  }
];

export const CONVERSATION_SCENARIO_BY_ID: Record<string, ConversationScenarioConfig> =
  CONVERSATION_SCENARIOS.reduce<Record<string, ConversationScenarioConfig>>((acc, scenario) => {
    acc[scenario.id] = scenario;
    return acc;
  }, {});

export const CONVERSATION_SCENARIO_IDS = CONVERSATION_SCENARIOS.map((s) => s.id);

// Small situational variations so the same scene opens differently each time
// (anti-repetition without per-scenario authoring).
export const CONVERSATION_OPENING_ANGLES = [
  "It is a calm, quiet moment.",
  "It is busy and a bit hectic right now.",
  "It is near closing time.",
  "It is early in the morning.",
  "You are in a cheerful, talkative mood.",
  "You are friendly but a little in a hurry.",
  "It is the first time you meet this person.",
  "You vaguely recognise the learner as a regular."
];
