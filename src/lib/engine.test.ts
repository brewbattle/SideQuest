import { describe, expect, it } from "vitest";
import {
  availableQuestions,
  answerQuestion,
  buildQueue,
  conceptKey,
  createSession,
  finishSession,
  initialLedger,
  isCorrect,
  scopeIsCurrent,
  spacedReview,
  totals,
  transact,
} from "./engine";
import { demos } from "./bank";
import { freshState, questionSchema, stateSchema } from "./model";
import { parseCSV, parseQuestions } from "./importer";
describe("validated content and answer keys", () => {
  it("covers exactly the four classes and never claims course verification for demonstrations", () => {
    expect(new Set(demos.map((q) => q.course))).toEqual(
      new Set(["ECON110", "ECON127", "PSYC260", "ARHA244"]),
    );
    expect(new Set(demos.map((q) => q.id)).size).toBe(demos.length);
    for (const q of demos) {
      expect(questionSchema.safeParse(q).success).toBe(true);
      expect(q.source.kind).toBe("demo");
      expect(q.reviewed).toBe(false);
      expect(q.source.reference).toContain("Not checked");
    }
  });
  it("validates numerical answers with a tolerance and rejects empty or invalid numbers", () => {
    const q = demos.find((q) => q.type === "numeric")!;
    expect(isCorrect(q, "65")).toBe(true);
    for (const input of ["", "   ", "NaN", "Infinity", "45"])
      expect(isCorrect(q, input)).toBe(false);
  });
  it("preserves answer keys when shuffling choices and interleaves classes", () => {
    const first = buildQueue(demos, {}, "all", "", 0, () => 0.8),
      second = buildQueue(demos, {}, "all", "", 0, () => 0.2);
    expect(first).toHaveLength(demos.length);
    expect(new Set(first.map((q) => q.id)).size).toBe(demos.length);
    for (const q of first)
      expect(q.answer).toEqual(second.find((x) => x.id === q.id)?.answer);
    for (let i = 1; i < 10; i++)
      expect(first[i].course).not.toBe(first[i - 1].course);
  });
  it("rejects fabricated image metadata, malformed answer keys and unsafe image URLs", () => {
    const q = demos[1];
    expect(
      questionSchema.safeParse({ ...q, type: "image", image: undefined })
        .success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({ ...q, answer: "not-an-option" }).success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({
        ...q,
        type: "image",
        image: {
          url: "javascript:alert(1)",
          alt: "x",
          credit: "x",
          building: "x",
          sourceUrl: "https://example.com",
          verified: true,
        },
      }).success,
    ).toBe(false);
  });
  it("imports atomic validated drafts without trusting IDs or approval flags", () => {
    const q = { ...demos[1], reviewed: true, examId: "pretend" };
    const imported = parseQuestions([q])[0];
    expect(imported.id).not.toBe(q.id);
    expect(imported.reviewed).toBe(false);
    expect(imported.examId).toBeUndefined();
    expect(() => parseQuestions([q, { bad: true }])).toThrow("Question 2");
  });
  it("reads quoted CSV with a stable correct option reference", () => {
    const text =
      'course,topic,type,prompt,options,answer,explanation,source,sourceReference\nECON127,Inventory,choice,What changes when inventory is purchased?,"Cash and inventory|Revenue and cash",0,Cash becomes inventory without an immediate expense.,Test notes,Page 1';
    const [q] = parseCSV(text);
    expect(q.answer).toBe("0");
    expect(q.options[0].text).toBe("Cash and inventory");
    expect(q.reviewed).toBe(false);
  });
});
describe("accounting is a balanced deterministic system", () => {
  it("computes all transaction categories without confusing cash with profit", () => {
    const cases = [
      { kind: "purchase" as const, amount: 220, cash: 580, profit: 0 },
      { kind: "sale" as const, amount: 180, cost: 100, cash: 980, profit: 80 },
      {
        kind: "creditSale" as const,
        amount: 120,
        cost: 70,
        cash: 800,
        profit: 50,
      },
      { kind: "borrow" as const, amount: 300, cash: 1100, profit: 0 },
      { kind: "prepayment" as const, amount: 150, cash: 950, profit: 0 },
      { kind: "expense" as const, amount: 60, cash: 740, profit: -60 },
      { kind: "equipment" as const, amount: 200, cash: 600, profit: 0 },
      {
        kind: "fulfill" as const,
        amount: 150,
        cost: 80,
        cash: 800,
        profit: 70,
      },
      { kind: "repay" as const, amount: 100, cash: 700, profit: 0 },
    ];
    for (const item of cases) {
      const after = transact(initialLedger, item),
        t = totals(after);
      expect(after.cash).toBe(item.cash);
      expect(t.profit).toBe(item.profit);
      expect(t.assets).toBe(t.liabilities + t.equity);
    }
    expect(initialLedger.cash).toBe(800);
  });
  it("runs the full shop sequence with consistent financial statements", () => {
    let ledger = { ...initialLedger };
    for (const q of demos.filter((q) => q.transaction))
      ledger = transact(ledger, q.transaction!);
    const t = totals(ledger);
    expect(t.profit).toBe(140);
    expect(ledger.cash).toBe(950);
    expect(ledger.inventory).toBe(370);
    expect(ledger.receivables).toBe(120);
    expect(ledger.equipment).toBe(500);
    expect(ledger.deferred).toBe(200);
    expect(t.assets).toBe(1940);
    expect(t.liabilities).toBe(800);
    expect(t.equity).toBe(1140);
  });
  it("rejects a transaction the shop cannot support", () =>
    expect(() =>
      transact(initialLedger, { kind: "purchase", amount: 10000 }),
    ).toThrow());
});
describe("adaptive review and progress", () => {
  it("returns uncertain and incorrect concepts sooner than confident correct concepts", () => {
    const good = spacedReview(undefined, true, false, 100),
      unsure = spacedReview(undefined, true, true, 100),
      wrong = spacedReview(undefined, false, false, 100);
    expect(wrong.due).toBeLessThan(unsure.due);
    expect(unsure.due).toBeLessThan(good.due);
    expect(wrong.correct).toBe(0);
    expect(good.correct).toBe(1);
  });
  it("gives due material priority while retaining new material", () => {
    const q = demos[3],
      stats = { [conceptKey(q)]: spacedReview(undefined, false, false, 0) };
    const queue = buildQueue(demos, stats, "all", "", 700000, () => 0.5);
    expect(queue[0].concept).toBe(q.concept);
    expect(queue).toHaveLength(demos.length);
  });
  it("makes answering and finishing idempotent, and caps repeat XP", () => {
    const q = demos[1];
    let state = freshState();
    state.active = createSession([q], 180, "learn", "demo", "all");
    state = answerQuestion(state, "0", false, 1000);
    expect(state.xp).toBe(15);
    expect(answerQuestion(state, "0", false, 1001)).toBe(state);
    state = finishSession(state);
    expect(finishSession(state).history).toHaveLength(1);
    state.active = createSession([q], 180, "learn", "demo", "all");
    state = answerQuestion(state, "0", false, 1002);
    expect(state.xp).toBe(15);
    expect(state.active?.results[0].xp).toBe(0);
    expect(stateSchema.safeParse(state).success).toBe(true);
  });
  it("uses a fresh example later after a misconception", () => {
    const a = demos[0],
      alternate = demos[1];
    let state = freshState();
    state.active = createSession(
      [a, ...demos.slice(2, 8), alternate],
      180,
      "learn",
      "demo",
      "all",
    );
    state = answerQuestion(state, "left", false);
    expect(state.active?.questions[3].id).toBe(alternate.id);
  });
  it("keeps unreviewed, stale, out-of-scope and reported questions out of exam play", () => {
    const state = freshState();
    const q = {
      ...demos[1],
      source: { ...demos[1].source, kind: "course" as const },
      reviewed: true,
      examId: state.scopes.ECON110.id,
    };
    state.questions = [q];
    expect(availableQuestions(state, demos, "course")).toHaveLength(0);
    state.scopes.ECON110 = {
      ...state.scopes.ECON110,
      title: "Upcoming test",
      date: "2099-12-01",
      topics: [q.topic],
      confirmed: true,
    };
    expect(availableQuestions(state, demos, "course")).toHaveLength(1);
    state.questions[0].examId = "old-exam";
    expect(availableQuestions(state, demos, "course")).toHaveLength(0);
    state.questions[0].examId = state.scopes.ECON110.id;
    state.reports = [
      { id: "report", qid: q.id, reason: "Source mismatch", at: 0 },
    ];
    expect(availableQuestions(state, demos, "course")).toHaveLength(0);
    expect(
      scopeIsCurrent({ ...state.scopes.ECON110, date: "2000-01-01" }),
    ).toBe(false);
  });
  it("round-trips a paused session, sources and accounting ledger through a backup", () => {
    const state = freshState();
    state.active = createSession(demos, 600, "learn", "demo", "all");
    state.active.remaining = 389;
    const restored = stateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(restored.active?.remaining).toBe(389);
    expect(restored.active?.questions).toHaveLength(demos.length);
    expect(restored.active?.ledger).toEqual(initialLedger);
    expect(stateSchema.safeParse({ ...state, xp: -5 }).success).toBe(false);
  });
});

describe("bounded sessions and new shop rounds", () => {
  it("caps a large imported bank so a saved session always fits its validated schema", () => {
    const bank = Array.from({ length: 150 }, (_, i) => ({
      ...demos[1],
      id: `large-${i}`,
    }));
    const questions = buildQueue(bank, {}, "all", "");
    expect(questions).toHaveLength(100);
    expect(
      stateSchema.safeParse({
        ...freshState(),
        active: createSession(questions, 600, "learn", "course", "all"),
      }).success,
    ).toBe(true);
  });
  it("opens a visible new shop round before an unaffordable next transaction", async () => {
    const { advanceSession, money } = await import("./engine");
    const q = demos.find((q) => q.title === "Stock the shelves")!;
    let state = freshState();
    state.active = createSession(
      [q, { ...q, id: "purchase2" }],
      180,
      "learn",
      "demo",
      "ECON127",
    );
    state = answerQuestion(state, "0", false);
    state.active!.ledger.cash = 100;
    state.active!.ledger.capital -= 480;
    state = advanceSession(state);
    expect(state.active!.newShopRound).toBe(true);
    expect(state.active!.ledger).toEqual(initialLedger);
    const cents = transact(initialLedger, {
      kind: "sale",
      amount: 180.25,
      cost: 100.1,
    });
    expect(totals(cents).profit).toBe(80.15);
    expect(money(80.15)).toBe("$80.15");
    expect(
      questionSchema.safeParse({
        ...q,
        transaction: { kind: "purchase", amount: 10000 },
      }).success,
    ).toBe(false);
  });
});
