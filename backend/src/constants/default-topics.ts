export interface DefaultTopicDefinition {
  name: string;
  description: string;
}

export const DEFAULT_TOPICS: DefaultTopicDefinition[] = [
  { name: "Nature", description: "Environment, forests, animals, and protecting nature" },
  { name: "School", description: "School life, classes, teachers, and learning" },
  { name: "University", description: "Studying, lectures, exams, and student life" },
  { name: "Work", description: "Jobs, colleagues, meetings, and everyday office life" },
  { name: "Daily Routine", description: "Mornings, evenings, habits, and everyday errands" },
  { name: "Food & Cooking", description: "Meals, recipes, restaurants, and eating habits" },
  { name: "Travel & Transport", description: "Trips, public transport, traffic, and holidays" },
  { name: "Health", description: "Doctor visits, fitness, sleep, and feeling well" },
  { name: "Friends & Family", description: "Relationships, gatherings, and everyday social life" },
  { name: "Hobbies & Free Time", description: "Sports, music, films, and weekend activities" },
  { name: "Shopping", description: "Groceries, stores, prices, and online shopping" },
  { name: "Weather & Seasons", description: "Weather talk, seasons, and small talk classics" }
];
