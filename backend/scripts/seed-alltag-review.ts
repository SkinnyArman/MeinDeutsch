import { appDataSource } from "../src/db/pool.js";
import { ExpressionAttempt } from "../src/models/expression-attempt.model.js";
import { ExpressionPrompt } from "../src/models/expression-prompt.model.js";
import { ExpressionReviewItem } from "../src/models/expression-review-item.model.js";
import { User } from "../src/models/user.model.js";

const DEFAULT_EMAIL = "armanwithamini@gmail.com";

const normalizeExpression = (text: string): string => text.trim().toLowerCase();

const seed = async (): Promise<void> => {
  const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
  const email = (emailArg?.split("=")[1] ?? process.env.SEED_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();

  await appDataSource.initialize();

  const userRepo = appDataSource.getRepository(User);
  const promptRepo = appDataSource.getRepository(ExpressionPrompt);
  const attemptRepo = appDataSource.getRepository(ExpressionAttempt);
  const reviewRepo = appDataSource.getRepository(ExpressionReviewItem);

  let user = await userRepo.findOne({ where: { email } });
  if (!user) {
    user = userRepo.create({
      email,
      googleSub: `seed-${email}`,
      displayName: "Seed User",
      avatarUrl: null
    });
    user = await userRepo.save(user);
  }

  const englishText = "Let's nail down the details for our trip this weekend.";
  const nativeLikeVersion = "Lass uns die Details fuer unsere Reise am Wochenende festlegen.";
  const alternatives = [
    "Lass uns die Einzelheiten fuer unser Wochenende klaeren.",
    "Lass uns die Details fuer unser Wochenende besprechen."
  ];

  const prompts = await promptRepo.find({
    where: {
      userId: user.id,
      englishText
    },
    order: { createdAt: "DESC" },
    take: 1
  });

  const prompt = prompts[0] ?? await promptRepo.save(promptRepo.create({
    userId: user.id,
    englishText,
    generatedContext: "idiom_planning_seed"
  }));

  const now = new Date();
  const earlier = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  await attemptRepo.save(
    attemptRepo.create({
      userId: user.id,
      promptId: prompt.id,
      englishText,
      userAnswerText: "Lass uns im kleinsten Detail fuer unsere Reise dieses Wochenende planen.",
      naturalnessScore: 55,
      feedback: "Verwende hier eher 'Details' statt 'im kleinsten Detail'.",
      nativeLikeVersion,
      alternatives,
      createdAt: earlier
    })
  );

  await attemptRepo.save(
    attemptRepo.create({
      userId: user.id,
      promptId: prompt.id,
      englishText,
      userAnswerText: "Lass uns die Details fuer unsere Reise dieses Wochenende planen.",
      naturalnessScore: 60,
      feedback: "Besser, aber 'am Wochenende festlegen' klingt natuerlicher.",
      nativeLikeVersion,
      alternatives,
      createdAt: now
    })
  );

  const normalizedEnglishText = normalizeExpression(englishText);
  const existingReview = await reviewRepo.findOne({
    where: {
      userId: user.id,
      normalizedEnglishText,
      status: "active"
    }
  });

  if (existingReview) {
    existingReview.initialScore = 55;
    existingReview.lastScore = 60;
    existingReview.successCount = 0;
    existingReview.reviewAttemptCount = 0;
    existingReview.nextReviewAt = new Date(Date.now() - 60 * 1000);
    existingReview.lastReviewedAt = null;
    existingReview.baselineNativeLikeVersion = nativeLikeVersion;
    existingReview.baselineAlternatives = alternatives;
    existingReview.baselineFeedback = "Nutze die native Version als Hauptziel.";
    existingReview.scoreHistory = [
      { score: 55, at: earlier.toISOString() },
      { score: 60, at: now.toISOString() }
    ];
    await reviewRepo.save(existingReview);
  } else {
    await reviewRepo.save(reviewRepo.create({
      userId: user.id,
      englishText,
      normalizedEnglishText,
      initialScore: 55,
      lastScore: 60,
      successCount: 0,
      reviewAttemptCount: 0,
      nextReviewAt: new Date(Date.now() - 60 * 1000),
      lastReviewedAt: null,
      status: "active",
      baselineNativeLikeVersion: nativeLikeVersion,
      baselineAlternatives: alternatives,
      baselineFeedback: "Nutze die native Version als Hauptziel.",
      scoreHistory: [
        { score: 55, at: earlier.toISOString() },
        { score: 60, at: now.toISOString() }
      ]
    }));
  }

  console.log(`Seeded Alltag review data for ${email}`);
  await appDataSource.destroy();
};

seed().catch(async (error) => {
  console.error("Failed to seed Alltag review data", error);
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
  }
  process.exit(1);
});
