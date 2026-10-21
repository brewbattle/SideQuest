import { z } from "zod";
export const courseIds = ["ECON110", "ECON127", "PSYC260", "ARHA244"] as const;
export type CourseId = (typeof courseIds)[number];
export const courses = [
  {
    id: "ECON110",
    code: "ECON 110",
    name: "Economics",
    short: "Think like an economist",
    color: "sage",
    icon: "chart",
    description: "Small shifts. Big consequences.",
  },
  {
    id: "ECON127",
    code: "ECON 127",
    name: "Accounting",
    short: "Open your resale shop",
    color: "peach",
    icon: "shop",
    description: "Your shop. Your next smart move.",
  },
  {
    id: "PSYC260",
    code: "PSYC 260",
    name: "Social Psychology",
    short: "Get inside the human mind",
    color: "lilac",
    icon: "brain",
    description: "People are a fascinating puzzle.",
  },
  {
    id: "ARHA244",
    code: "ARHA 244",
    name: "European Architecture",
    short: "Train your eye for the details",
    color: "blue",
    icon: "building",
    description: "Learn to look a little closer.",
  },
] as const;
const shortText = z.string().min(1).max(1000);
export const imageSchema = z.object({
  url: z
    .string()
    .max(2800000)
    .refine(
      (s) =>
        /^https:\/\//.test(s) ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s),
      "Use HTTPS or an uploaded PNG/JPEG/WebP.",
    ),
  alt: shortText,
  credit: shortText,
  building: shortText,
  sourceUrl: z
    .url()
    .refine((s) => s.startsWith("https://"), "Image source must use HTTPS."),
  verified: z.literal(true),
});
export const transactionSchema = z.object({
  kind: z.enum([
    "purchase",
    "sale",
    "creditSale",
    "borrow",
    "prepayment",
    "expense",
    "equipment",
    "fulfill",
    "repay",
  ]),
  amount: z
    .number()
    .positive()
    .max(100000)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
      "Use at most two decimal places for currency.",
    ),
  cost: z
    .number()
    .min(0)
    .max(100000)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
      "Use at most two decimal places for currency.",
    )
    .optional(),
});
export const questionSchema = z
  .object({
    id: shortText,
    course: z.enum(courseIds),
    topic: shortText,
    concept: shortText,
    type: z.enum([
      "choice",
      "graph",
      "numeric",
      "accounting",
      "image",
      "short",
      "match",
    ]),
    title: shortText,
    prompt: z.string().min(5).max(5000),
    intro: z.string().max(2000).optional(),
    options: z
      .array(z.object({ id: shortText, text: shortText }))
      .max(8)
      .default([]),
    answer: z.union([z.string().min(1).max(2000), z.number().finite()]),
    explanation: z.string().min(5).max(6000),
    misconception: z.string().max(3000).default(""),
    difficulty: z.number().int().min(1).max(3).default(1),
    source: z.object({
      kind: z.enum(["demo", "course"]),
      label: shortText,
      reference: shortText,
      materialId: z.string().optional(),
      locator: z.string().max(1000).optional(),
    }),
    reviewed: z.boolean().default(false),
    examId: z.string().optional(),
    image: imageSchema.optional(),
    comparisonImage: imageSchema.optional(),
    graph: z
      .object({
        curve: z.enum(["demand", "supply"]),
        shift: z.enum(["left", "right"]),
        xLabel: shortText,
        yLabel: shortText,
      })
      .optional(),
    transaction: transactionSchema.optional(),
    matches: z
      .array(z.object({ id: shortText, left: shortText, rightId: shortText }))
      .min(2)
      .max(5)
      .optional(),
    tolerance: z.number().min(0).max(1).optional(),
    unit: z.string().max(50).optional(),
  })
  .superRefine((q, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length)
      error("Option IDs must be unique.");
    if (
      ["choice", "accounting", "image"].includes(q.type) &&
      (q.options.length < 2 || !q.options.some((o) => o.id === q.answer))
    )
      error("Answer must reference one of at least two options.");
    if (
      q.type === "numeric" &&
      (typeof q.answer !== "number" ||
        q.options.length < 2 ||
        q.options.some((o) => !Number.isFinite(Number(o.id))) ||
        !q.options.some((o) => Number(o.id) === q.answer))
    )
      error(
        "Numeric questions need a numeric answer and at least two numeric quick-answer options including the answer.",
      );
    if (q.type === "graph" && (!q.graph || q.answer !== q.graph.shift))
      error("A graph must declare its curve and correct shift.");
    if (
      q.type === "accounting" &&
      (!q.transaction ||
        (["sale", "creditSale", "fulfill"].includes(q.transaction.kind) &&
          q.transaction.cost === undefined))
    )
      error(
        "Accounting needs a transaction; sales and fulfillment also need inventory cost.",
      );
    if (q.transaction) {
      const t = q.transaction;
      if (
        ["purchase", "expense", "equipment"].includes(t.kind) &&
        t.amount > 800
      )
        error(
          "This starter-shop game supports cash purchases or expenses up to $800. Use a numeric or choice question for larger scenarios.",
        );
      if ((t.cost ?? 0) > 400)
        error(
          "The starter shop has $400 of inventory. Use an inventory cost at or below $400.",
        );
      if (t.kind === "fulfill" && t.amount > 200)
        error(
          "The starter shop has $200 of unearned revenue. Use a fulfillment amount at or below $200.",
        );
      if (t.kind === "repay" && t.amount > 300)
        error(
          "The starter shop has $300 of debt. Use a principal repayment at or below $300.",
        );
    }
    if (q.type === "image" && !q.image)
      error(
        "Building identification needs a verified image, source, credit, building name, and descriptive alt text.",
      );
    if (
      q.type === "match" &&
      (!q.matches ||
        !q.matches.every((m) => q.options.some((o) => o.id === m.rightId)) ||
        new Set(q.matches.map((m) => m.rightId)).size !== q.matches.length ||
        JSON.stringify(q.matches.map((m) => m.rightId)) !== q.answer)
    )
      error(
        "Matching needs distinct valid pairs and a JSON array answer in pair order.",
      );
    if (q.source.kind === "course" && !q.source.reference.trim())
      error("Course content needs a traceable source reference.");
  });
export type Question = z.infer<typeof questionSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export const ledgerSchema = z.object({
  cash: z.number(),
  inventory: z.number(),
  equipment: z.number(),
  receivables: z.number(),
  loan: z.number(),
  deferred: z.number(),
  capital: z.number(),
  revenue: z.number(),
  expenses: z.number(),
});
export type Ledger = z.infer<typeof ledgerSchema>;
export const statSchema = z.object({
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  due: z.number(),
  interval: z.number(),
  last: z.number(),
});
export type ConceptStat = z.infer<typeof statSchema>;
export const scopeSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  date: z.string(),
  topics: z.array(z.string().max(200)),
  confirmed: z.boolean(),
});
export type Scope = z.infer<typeof scopeSchema>;
export const materialSchema = z.object({
  id: shortText,
  course: z.enum(courseIds),
  title: shortText,
  text: z.string().max(2000000),
  added: z.number(),
  kind: z.enum(["text", "markdown", "pdf"]),
  needsOCR: z.boolean(),
});
export type Material = z.infer<typeof materialSchema>;
const answerSchema = z.object({
  qid: z.string(),
  choice: z.string(),
  correct: z.boolean(),
  uncertain: z.boolean(),
  xp: z.number(),
  at: z.number(),
  ledgerBefore: ledgerSchema.optional(),
  ledgerAfter: ledgerSchema.optional(),
});
export type Answer = z.infer<typeof answerSchema>;
export const sessionSchema = z
  .object({
    id: z.string(),
    questions: z.array(questionSchema).max(100),
    index: z.number().int().nonnegative(),
    results: z.array(answerSchema),
    duration: z.number().positive(),
    remaining: z.number().nonnegative(),
    mode: z.enum(["learn", "challenge"]),
    bank: z.enum(["demo", "course"]),
    course: z.string(),
    ledger: ledgerSchema,
    startedAt: z.number(),
    finished: z.boolean(),
    newShopRound: z.boolean().default(false),
  })
  .refine(
    (s) =>
      s.index <= s.questions.length &&
      s.results.length <= s.questions.length &&
      s.results.length >= s.index &&
      s.results.length <= s.index + 1 &&
      s.results.every((r, i) => r.qid === s.questions[i]?.id),
    "Invalid session position",
  );
export type Session = z.infer<typeof sessionSchema>;
export const stateSchema = z.object({
  version: z.literal(1),
  xp: z.number().nonnegative(),
  avatar: z.object({
    color: z.enum(["mint", "lilac", "peach", "blue"]),
    hat: z.enum(["sprout", "star", "none"]),
  }),
  sound: z.boolean(),
  questions: z.array(questionSchema).max(10000),
  materials: z.array(materialSchema).max(500),
  stats: z.record(z.string(), statSchema),
  scopes: z.record(z.enum(courseIds), scopeSchema),
  reports: z.array(
    z.object({
      id: z.string(),
      qid: z.string(),
      reason: z.string().max(3000),
      at: z.number(),
    }),
  ),
  awards: z.record(z.string(), z.number()),
  history: z
    .array(
      z.object({
        id: z.string(),
        at: z.number(),
        questions: z.number(),
        correct: z.number(),
        xp: z.number(),
        concepts: z.array(z.string()),
      }),
    )
    .max(500),
  active: sessionSchema.nullable(),
});
export type AppState = z.infer<typeof stateSchema>;
export function freshState(): AppState {
  return {
    version: 1,
    xp: 0,
    avatar: { color: "mint", hat: "sprout" },
    sound: false,
    questions: [],
    materials: [],
    stats: {},
    scopes: Object.fromEntries(
      courseIds.map((id) => [
        id,
        {
          id: crypto.randomUUID(),
          title: "",
          date: "",
          topics: [],
          confirmed: false,
        },
      ]),
    ) as unknown as AppState["scopes"],
    reports: [],
    awards: {},
    history: [],
    active: null,
  };
}
