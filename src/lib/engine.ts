import type {
  Answer,
  AppState,
  ConceptStat,
  CourseId,
  Ledger,
  Question,
  Session,
  Transaction,
} from "./model";
export const initialLedger: Ledger = {
  cash: 800,
  inventory: 400,
  equipment: 300,
  receivables: 0,
  loan: 300,
  deferred: 200,
  capital: 1000,
  revenue: 0,
  expenses: 0,
};
const round = (n: number) => Math.round(n * 100) / 100;
export function totals(l: Ledger) {
  const assets = round(l.cash + l.inventory + l.equipment + l.receivables),
    liabilities = round(l.loan + l.deferred),
    profit = round(l.revenue - l.expenses),
    equity = round(l.capital + profit);
  return { assets, liabilities, profit, equity };
}
export function transact(before: Ledger, t: Transaction): Ledger {
  const l = { ...before };
  const a = t.amount,
    c = t.cost ?? 0;
  switch (t.kind) {
    case "purchase":
      l.cash -= a;
      l.inventory += a;
      break;
    case "sale":
      l.cash += a;
      l.inventory -= c;
      l.revenue += a;
      l.expenses += c;
      break;
    case "creditSale":
      l.receivables += a;
      l.inventory -= c;
      l.revenue += a;
      l.expenses += c;
      break;
    case "borrow":
      l.cash += a;
      l.loan += a;
      break;
    case "prepayment":
      l.cash += a;
      l.deferred += a;
      break;
    case "expense":
      l.cash -= a;
      l.expenses += a;
      break;
    case "equipment":
      l.cash -= a;
      l.equipment += a;
      break;
    case "fulfill":
      l.deferred -= a;
      l.inventory -= c;
      l.revenue += a;
      l.expenses += c;
      break;
    case "repay":
      l.cash -= a;
      l.loan -= a;
      break;
  }
  for (const key of Object.keys(l) as (keyof Ledger)[]) l[key] = round(l[key]);
  const total = totals(l);
  if (Math.abs(total.assets - total.liabilities - total.equity) > 0.01)
    throw Error("Accounting equation out of balance.");
  if (l.cash < 0 || l.inventory < 0 || l.loan < 0 || l.deferred < 0)
    throw Error("This shop cannot support the transaction.");
  return l;
}
export const conceptKey = (q: Question) => `${q.course}:${q.concept}`;
export function spacedReview(
  old: ConceptStat | undefined,
  correct: boolean,
  uncertain: boolean,
  now: number,
): ConceptStat {
  const strong = correct && !uncertain,
    streak = strong ? (old?.streak ?? 0) + 1 : 0;
  // Uncertain correct answers return sooner; errors reappear after ten minutes.
  const interval = strong
    ? Math.min(30 * 86400000, (old?.interval || 43200000) * 2)
    : correct
      ? 3600000
      : 600000;
  return {
    attempts: (old?.attempts ?? 0) + 1,
    correct: (old?.correct ?? 0) + (correct ? 1 : 0),
    streak,
    due: now + interval,
    interval,
    last: now,
  };
}
export function scopeIsCurrent(
  scope: AppState["scopes"][CourseId],
  today = new Date().toLocaleDateString("en-CA"),
) {
  return (
    scope.confirmed &&
    /^\d{4}-\d{2}-\d{2}$/.test(scope.date) &&
    scope.date >= today &&
    scope.title.trim().length > 0 &&
    scope.topics.length > 0
  );
}
export function availableQuestions(
  state: AppState,
  demos: Question[],
  bank: "demo" | "course",
) {
  if (bank === "demo") return demos;
  return state.questions.filter(
    (q) =>
      q.source.kind === "course" &&
      q.reviewed &&
      scopeIsCurrent(state.scopes[q.course]) &&
      q.examId === state.scopes[q.course].id &&
      state.scopes[q.course].topics.includes(q.topic) &&
      !state.reports.some((r) => r.qid === q.id),
  );
}
export function shuffled<T>(items: T[], random = Math.random): T[] {
  return [...items]
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}
export function buildQueue(
  bank: Question[],
  stats: AppState["stats"],
  course: string,
  topic: string,
  now = Date.now(),
  random = Math.random,
): Question[] {
  const candidates = bank.filter(
    (q) =>
      (course === "all" || q.course === course) &&
      (!topic || q.topic === topic),
  );
  const scored = candidates
    .map((q) => {
      const s = stats[conceptKey(q)],
        targetDifficulty = s ? Math.min(3, 1 + Math.floor(s.streak / 2)) : 1;
      return {
        q,
        rank: !s ? 1 : s.due <= now ? 0 : 2,
        difficultyGap: Math.abs(q.difficulty - targetDifficulty),
        noise: random(),
      };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.difficultyGap - b.difficultyGap ||
        a.noise - b.noise,
    );
  // Interleave courses and concepts; schedule alternate examples after a gap.
  const output: Question[] = [];
  while (scored.length) {
    let index = scored.findIndex(
      (x) =>
        x.q.concept !== output.at(-1)?.concept &&
        (course !== "all" || x.q.course !== output.at(-1)?.course),
    );
    if (index < 0)
      index = scored.findIndex((x) => x.q.concept !== output.at(-1)?.concept);
    if (index < 0) index = 0;
    output.push(scored.splice(index, 1)[0].q);
  }
  return output
    .slice(0, 100)
    .map((q) => ({ ...q, options: shuffled(q.options, random) }));
}
export function createSession(
  questions: Question[],
  duration: number,
  mode: Session["mode"],
  bank: Session["bank"],
  course: string,
): Session {
  return {
    id: crypto.randomUUID(),
    questions,
    index: 0,
    results: [],
    duration,
    remaining: duration,
    mode,
    bank,
    course,
    ledger: { ...initialLedger },
    startedAt: Date.now(),
    finished: false,
    newShopRound: false,
  };
}
export function isCorrect(q: Question, choice: string) {
  if (q.type === "short") return choice === "self-pass";
  if (q.type === "numeric")
    return (
      choice.trim() !== "" &&
      Number.isFinite(Number(choice)) &&
      Math.abs(Number(choice) - Number(q.answer)) <= (q.tolerance ?? 0.001)
    );
  return String(q.answer) === choice;
}
export function answerQuestion(
  state: AppState,
  choice: string,
  uncertain: boolean,
  now = Date.now(),
): AppState {
  const s = state.active;
  if (!s || s.finished || s.results.length > s.index || s.remaining <= 0)
    return state;
  const q = s.questions[s.index];
  if (!q) return state;
  const correct = isCorrect(q, choice),
    awardKey = `${q.id}:${new Date(now).toLocaleDateString("en-CA")}`,
    previous = state.awards[awardKey] ?? 0,
    target = correct ? (q.type === "short" ? 8 : 15) : 3,
    xp = Math.max(0, target - previous);
  let ledger = s.ledger;
  let before: Ledger | undefined;
  if (q.transaction) {
    before = { ...ledger };
    try {
      ledger = transact(ledger, q.transaction);
    } catch {
      before = { ...initialLedger };
      ledger = transact(initialLedger, q.transaction);
    }
  }
  const result: Answer = {
    qid: q.id,
    choice,
    correct,
    uncertain,
    xp,
    at: now,
    ...(before ? { ledgerBefore: before, ledgerAfter: ledger } : {}),
  };
  let questions = s.questions;
  if (!correct || uncertain) {
    const later = questions.findIndex(
      (candidate, i) =>
        i > s.index + 1 &&
        candidate.course === q.course &&
        candidate.concept === q.concept,
    );
    if (later > s.index + 3) {
      questions = [...questions];
      const [alternate] = questions.splice(later, 1);
      questions.splice(s.index + 3, 0, alternate);
    }
  }
  return {
    ...state,
    xp: state.xp + xp,
    awards: { ...state.awards, [awardKey]: Math.max(previous, target) },
    stats: {
      ...state.stats,
      [conceptKey(q)]: spacedReview(
        state.stats[conceptKey(q)],
        correct,
        uncertain,
        now,
      ),
    },
    active: { ...s, ledger, questions, results: [...s.results, result] },
  };
}
export function finishSession(state: AppState): AppState {
  const s = state.active;
  if (!s) return state;
  const history = state.history.some((h) => h.id === s.id)
    ? state.history
    : [
        {
          id: s.id,
          at: Date.now(),
          questions: s.results.length,
          correct: s.results.filter((r) => r.correct).length,
          xp: s.results.reduce((n, r) => n + r.xp, 0),
          concepts: [
            ...new Set(
              s.questions.slice(0, s.results.length).map((q) => q.topic),
            ),
          ],
        },
        ...state.history,
      ].slice(0, 500);
  return { ...state, history, active: { ...s, finished: true } };
}
export function levelInfo(xp: number) {
  const level = Math.floor(xp / 150) + 1;
  return { level, progress: xp % 150, next: 150 - (xp % 150) };
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

export function advanceSession(state: AppState): AppState {
  const s = state.active;
  if (!s || s.results.length <= s.index) return state;
  const index = s.index + 1;
  if (index >= s.questions.length || s.remaining <= 0)
    return finishSession(state);
  let ledger = s.ledger,
    newShopRound = false;
  const transaction = s.questions[index].transaction;
  if (transaction) {
    try {
      transact(ledger, transaction);
    } catch {
      ledger = { ...initialLedger };
      newShopRound = true;
    }
  }
  return { ...state, active: { ...s, index, ledger, newShopRound } };
}
