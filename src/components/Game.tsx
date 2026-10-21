import {
  useCallback,
  useEffect,
  useId,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Flag,
  Lightbulb,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  advanceSession,
  answerQuestion,
  conceptKey,
  finishSession,
  isCorrect,
  money,
  totals,
} from "../lib/engine";
import type { AppState, Ledger, Question } from "../lib/model";
import { Avatar, CourseIcon, Dialog, Pill } from "./UI";
export type UpdateState = Dispatch<SetStateAction<AppState>>;
function chime(correct: boolean) {
  try {
    const ctx = new AudioContext(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(correct ? 523 : 262, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      correct ? 784 : 330,
      ctx.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
    osc.onended = () => void ctx.close();
  } catch {
    /* Sound is optional. */
  }
}
export function LedgerView({
  before,
  after,
}: {
  before: Ledger;
  after?: Ledger;
}) {
  const l = after ?? before,
    t = totals(l),
    b = totals(before);
  const figures: [string, number, number][] = [
    ["Cash", l.cash, before.cash],
    ["Inventory", l.inventory, before.inventory],
    ["Profit", t.profit, b.profit],
    ["Assets", t.assets, b.assets],
    ["Liabilities", t.liabilities, b.liabilities],
    ["Equity", t.equity, b.equity],
  ];
  return (
    <div className="shop">
      <div className="shop-label">
        <span>ALI’S RESALE CO.</span>
        <span>Accrual accounting</span>
      </div>
      <div className="ledger-grid">
        {figures.map(([label, value, old]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{money(value)}</strong>
            {after && value !== old && (
              <small className={value > old ? "positive" : "neutral"}>
                {value > old ? "+" : ""}
                {money(value - old)}
              </small>
            )}
          </div>
        ))}
      </div>
      {after && (
        <details className="statements">
          <summary>
            See financial statements <ChevronDown size={14} />
          </summary>
          <div className="statement-columns">
            <div>
              <b>Income statement · shop to date</b>
              <p>
                Revenue <span>{money(l.revenue)}</span>
              </p>
              <p>
                Expenses incl. COGS <span>{money(l.expenses)}</span>
              </p>
              <p>
                <strong>Net profit</strong>
                <strong>{money(t.profit)}</strong>
              </p>
            </div>
            <div>
              <b>Balance sheet · right now</b>
              <p>
                Cash <span>{money(l.cash)}</span>
              </p>
              <p>
                Inventory <span>{money(l.inventory)}</span>
              </p>
              <p>
                Receivables <span>{money(l.receivables)}</span>
              </p>
              <p>
                Equipment <span>{money(l.equipment)}</span>
              </p>
              <p>
                Loan + unearned revenue{" "}
                <span>
                  {money(l.loan)} + {money(l.deferred)}
                </span>
              </p>
              <p>
                Capital + retained profit{" "}
                <span>
                  {money(l.capital)} + {money(t.profit)}
                </span>
              </p>
            </div>
          </div>
          <p className="equation">
            Assets {money(t.assets)} = liabilities {money(t.liabilities)} +
            equity {money(t.equity)} <Check size={15} />
          </p>
        </details>
      )}
    </div>
  );
}
function Graph({
  q,
  value,
  onChange,
  reveal,
}: {
  q: Question;
  value: string;
  onChange: (s: string) => void;
  reveal: boolean;
}) {
  const g = q.graph!;
  const direction = reveal ? g.shift : value;
  const offset = direction === "right" ? 42 : direction === "left" ? -42 : 0;
  const supply = g.curve === "supply",
    d = supply ? "M100 190L250 60" : "M100 60L250 190";
  const id = useId().replace(/:/g, "");
  return (
    <div className="graph-wrap">
      <svg
        viewBox="0 0 390 260"
        role="img"
        aria-label={`${g.curve} curve graph. Horizontal axis: ${g.xLabel}. Vertical axis: ${g.yLabel}. ${direction ? `New curve shifted ${direction}.` : "Use the buttons to shift the curve."}`}
      >
        <defs>
          <marker
            id={id}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" fill="#8b958e" />
          </marker>
        </defs>
        {[70, 110, 150, 190].map((y) => (
          <path
            key={y}
            d={`M55 ${y}H345`}
            stroke="#e5e9e0"
            strokeDasharray="3 5"
          />
        ))}
        <path
          d="M55 25V215H350"
          stroke="#8b958e"
          strokeWidth="1.5"
          markerEnd={`url(#${id})`}
        />
        <text
          x="19"
          y="133"
          transform="rotate(-90 19 133)"
          fontSize="11"
          fill="#68726c"
        >
          {g.yLabel}
        </text>
        <text x="205" y="245" textAnchor="middle" fontSize="11" fill="#68726c">
          {g.xLabel}
        </text>
        <text x="42" y="230" fontSize="10" fill="#68726c">
          0
        </text>
        <path d={d} stroke="#a1ada5" strokeWidth="3" strokeDasharray="6 5" />
        <text x="260" y={supply ? 58 : 196} fill="#7a877e" fontSize="12">
          {supply ? "S₀" : "D₀"}
        </text>
        {direction && (
          <g
            style={{
              transform: `translateX(${offset}px)`,
              transition: "transform .35s ease",
            }}
          >
            <path
              d={d}
              stroke={reveal ? "#388065" : "#8263a9"}
              strokeWidth="3.5"
            />
            <text
              x="258"
              y={supply ? 55 : 194}
              fill={reveal ? "#388065" : "#8263a9"}
              fontSize="12"
            >
              {supply ? "S₁" : "D₁"}
            </text>
          </g>
        )}
      </svg>
      <div className="graph-legend">
        <i /> Original curve{" "}
        <i className={reveal ? "correct-line" : "new-line"} />
        {reveal ? "Correct shift" : "Your new curve"}
      </div>
      {!reveal && (
        <div className="graph-buttons">
          <button
            className={`button ${value === "left" ? "selected" : ""}`}
            onClick={() => onChange("left")}
          >
            <ArrowLeft size={16} /> Shift left
          </button>
          <button
            className={`button ${value === "right" ? "selected" : ""}`}
            onClick={() => onChange("right")}
          >
            Shift right <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Source({ q, state }: { q: Question; state: AppState }) {
  const material = state.materials.find((m) => m.id === q.source.materialId);
  return (
    <details className="source-details">
      <summary>
        <span>Source & answer reasoning</span>
        <ChevronDown size={16} />
      </summary>
      <div>
        <b>{q.source.label}</b>
        <p>
          {q.source.reference}
          {q.source.locator && ` · ${q.source.locator}`}
        </p>
        {q.source.reference.startsWith("https://") && (
          <a href={q.source.reference} target="_blank" rel="noreferrer">
            Open source ↗
          </a>
        )}
        {material && (
          <details>
            <summary>Read saved material: {material.title}</summary>
            <pre>{material.text}</pre>
          </details>
        )}
        <p>
          <b>Why this answer:</b> {q.explanation}
        </p>
        {q.source.kind === "demo" && (
          <p className="fineprint">
            Original sandbox content. No assigned reading, exam coverage, study
            result, or building attribution is claimed.
          </p>
        )}
        {q.image && (
          <p>
            Image: {q.image.credit} ·{" "}
            <a href={q.image.sourceUrl} target="_blank" rel="noreferrer">
              Image provenance ↗
            </a>{" "}
            · Building: {q.image.building}
          </p>
        )}
      </div>
    </details>
  );
}
export default function Game({
  state,
  update,
  onPause,
  onAgain,
  onReport,
}: {
  state: AppState;
  update: UpdateState;
  onPause: () => void;
  onAgain: () => void;
  onReport: (q: Question) => void;
}) {
  const s = state.active!;
  const q = s.questions[s.index];
  const result = s.results[s.index];
  const [choice, setChoice] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [matches, setMatches] = useState<Record<string, string>>({}),
    [short, setShort] = useState(""),
    [rubric, setRubric] = useState(false),
    [imageError, setImageError] = useState(false);
  const close = useCallback(() => onPause(), [onPause]);
  useEffect(() => {
    setChoice("");
    setUncertain(false);
    setMatches({});
    setShort("");
    setRubric(false);
    setImageError(false);
  }, [q?.id, s.index]);
  useEffect(() => {
    if (s.finished || result) return;
    const timer = window.setInterval(() => {
      if (
        document.hidden ||
        document.querySelectorAll("[role=dialog]").length > 1
      )
        return;
      update((prev) => {
        if (!prev.active || prev.active.finished) return prev;
        const remaining = Math.max(0, prev.active.remaining - 1);
        const next = { ...prev, active: { ...prev.active, remaining } };
        return remaining === 0 ? finishSession(next) : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [s.finished, result, update]);
  const answer = (value: string) => {
    if (state.sound) chime(isCorrect(q, value));
    update((prev) => answerQuestion(prev, value, uncertain));
  };
  const next = () => update((prev) => advanceSession(prev));
  const end = () => update((prev) => finishSession(prev));
  const time = `${Math.floor(s.remaining / 60)}:${String(s.remaining % 60).padStart(2, "0")}`;
  if (s.finished) {
    const improved = [
      ...new Set(
        s.questions.filter((_, i) => s.results[i]?.correct).map((x) => x.topic),
      ),
    ];
    const xp = s.results.reduce((sum, r) => sum + r.xp, 0);
    return (
      <Dialog
        title="A little further than before."
        onClose={close}
        className="summary-dialog"
      >
        <div className="session-summary">
          <div className="summary-avatar">
            <Sparkles />
            <Avatar avatar={state.avatar} size={112} />
            <Sparkles />
          </div>
          <Pill>QUEST COMPLETE</Pill>
          <h2>Nice little side quest, Ali.</h2>
          <p>
            {s.results.length
              ? `You gave ${s.results.length} idea${s.results.length === 1 ? "" : "s"} your attention. That counts.`
              : "A good stopping point. Come back whenever you like."}
          </p>
          <div className="summary-stats">
            <div>
              <strong>+{xp}</strong>
              <span>XP earned</span>
            </div>
            <div>
              <strong>
                {s.results.filter((r) => r.correct).length}/{s.results.length}
              </strong>
              <span>understood</span>
            </div>
            <div>
              <strong>
                {
                  new Set(
                    s.questions.slice(0, s.results.length).map(conceptKey),
                  ).size
                }
              </strong>
              <span>concepts explored</span>
            </div>
          </div>
          {improved.length > 0 && (
            <div className="improved">
              <span>A LITTLE STRONGER IN</span>
              <div>
                {improved.slice(0, 4).map((x) => (
                  <Pill key={x}>
                    <Check size={13} />
                    {x}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          {s.results.some((r) => !r.correct || r.uncertain) && (
            <p className="fineprint">
              We’ll bring the tricky ideas back with a fresh example.
            </p>
          )}
          <button className="button primary full" onClick={onAgain}>
            Play again <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={onPause}>
            That’s enough for now <Check size={16} />
          </button>
          <p className="fineprint">
            {s.bank === "demo"
              ? "Sandbox practice · not verified exam coverage"
              : "Your reviewed next-exam question bank"}{" "}
            · Saved on this device
          </p>
        </div>
      </Dialog>
    );
  }
  if (!q) return null;
  return (
    <Dialog
      title={
        s.mode === "learn"
          ? "A little learning adventure"
          : "Challenge accepted"
      }
      onClose={close}
      wide
      className="game-dialog"
    >
      <div className="game-topline">
        <Pill className={s.bank === "demo" ? "sandbox" : ""}>
          {s.bank === "demo" ? "SANDBOX PRACTICE" : "VERIFIED EXAM PREP"}
        </Pill>
        <span
          className="game-clock"
          aria-label={`${time} of active play remaining`}
        >
          {time} <span>left</span>
        </span>
        <button
          className="icon-button"
          aria-label={state.sound ? "Mute sound" : "Enable sound"}
          onClick={() => update((p) => ({ ...p, sound: !p.sound }))}
        >
          {state.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button className="text-button" onClick={onPause}>
          <Pause size={15} /> Save & leave
        </button>
      </div>
      <div className="session-progress">
        <span
          style={{ width: `${(s.results.length / s.questions.length) * 100}%` }}
        />
      </div>
      <div className="game-body">
        <div className="game-course">
          <span className={`course-symbol ${q.course.toLowerCase()}`}>
            <CourseIcon id={q.course} size={19} />
          </span>
          <span>
            {q.course.replace(/(\D+)(\d+)/, "$1 $2")}{" "}
            <span className="dot">·</span> {q.topic}
          </span>
          <span className="game-index">
            {s.index + 1} of {s.questions.length}
          </span>
        </div>
        <div className="question-kicker">
          {q.type === "accounting"
            ? "THE RESALE GAME"
            : q.type === "graph"
              ? "MOVE THE CURVE"
              : q.type === "match"
                ? "CONNECT THE DOTS"
                : q.type === "short"
                  ? "THINK IT THROUGH"
                  : q.type === "image"
                    ? "TRAIN YOUR EYE"
                    : "A QUICK BRAIN STRETCH"}
        </div>
        <h2 className="question-title">{q.title}</h2>
        {s.mode === "learn" && q.intro && !result && (
          <div className="tiny-lesson">
            <Lightbulb size={18} />
            <p>{q.intro}</p>
          </div>
        )}
        <p className="question-prompt">{q.prompt}</p>
        {q.type === "accounting" && s.newShopRound && !result && (
          <div className="notice">
            <p>
              A fresh shop round: this transaction needs more cash, inventory,
              or prepaid orders than the previous round had. The balances below
              reset to your shop’s starting position.
            </p>
          </div>
        )}
        {q.type === "accounting" && (
          <LedgerView
            before={result?.ledgerBefore ?? s.ledger}
            after={result?.ledgerAfter}
          />
        )}
        {q.type === "graph" && (
          <Graph q={q} value={choice} onChange={setChoice} reveal={!!result} />
        )}
        {q.comparisonImage && (
          <figure className="building-image comparison-image">
            <img
              src={q.comparisonImage.url}
              alt={q.comparisonImage.alt}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            <figcaption>
              Comparison view · {q.comparisonImage.credit} ·{" "}
              <a
                href={q.comparisonImage.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Image source ↗
              </a>
            </figcaption>
          </figure>
        )}
        {q.image && (
          <figure className="building-image">
            {imageError ? (
              <div className="image-unavailable">
                <p>
                  This image couldn’t load. Check its URL in the library or add
                  a local image.
                </p>
                <button className="button" onClick={() => onReport(q)}>
                  Report image issue
                </button>
              </div>
            ) : (
              <img
                src={q.image.url}
                alt={q.image.alt}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            )}
            <figcaption>
              {q.image.credit} ·{" "}
              <a href={q.image.sourceUrl} target="_blank" rel="noreferrer">
                Image source ↗
              </a>
            </figcaption>
          </figure>
        )}
        {!result && (
          <>
            <div className="question-input">
              {["choice", "accounting", "image"].includes(q.type) &&
                q.options.map((o, i) => (
                  <button
                    key={o.id}
                    className="answer-option"
                    disabled={imageError}
                    onClick={() => answer(o.id)}
                  >
                    <span className="answer-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{o.text}</span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              {q.type === "graph" && (
                <button
                  className="button primary full"
                  disabled={!choice}
                  onClick={() => answer(choice)}
                >
                  Lock it in <Check size={17} />
                </button>
              )}
              {q.type === "numeric" && (
                <>
                  <form
                    className="number-answer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (choice.trim()) answer(choice);
                    }}
                  >
                    <label htmlFor="number-answer">
                      Your answer {q.unit && `(${q.unit})`}
                    </label>
                    <div>
                      <input
                        id="number-answer"
                        inputMode="decimal"
                        type="number"
                        step="any"
                        placeholder="Give it a go…"
                        value={choice}
                        onChange={(e) => setChoice(e.target.value)}
                      />
                      <button
                        className="button primary"
                        disabled={!choice.trim()}
                      >
                        Check <ArrowRight size={17} />
                      </button>
                    </div>
                  </form>
                  <span className="fineprint">Or keep it tap-friendly</span>
                  <div className="quick-numbers">
                    {q.options.map((o) => (
                      <button
                        key={o.id}
                        className="button"
                        onClick={() => answer(o.id)}
                      >
                        {q.unit}
                        {o.text}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {q.type === "match" && (
                <>
                  <div className="match-list">
                    {q.matches?.map((m) => (
                      <label key={m.id}>
                        <span>{m.left}</span>
                        <select
                          aria-label={`Match: ${m.left}`}
                          value={matches[m.id] ?? ""}
                          onChange={(e) =>
                            setMatches((p) => ({
                              ...p,
                              [m.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Choose a match</option>
                          {q.options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.text}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <button
                    className="button primary full"
                    disabled={q.matches?.some((m) => !matches[m.id])}
                    onClick={() =>
                      answer(
                        JSON.stringify(q.matches?.map((m) => matches[m.id])),
                      )
                    }
                  >
                    Connect them <Check size={16} />
                  </button>
                </>
              )}
              {q.type === "short" && (
                <div className="short-answer">
                  <label htmlFor="short-answer">
                    Your thought <span>(optional · stays on this device)</span>
                  </label>
                  <textarea
                    id="short-answer"
                    value={short}
                    onChange={(e) => setShort(e.target.value)}
                    placeholder="A sentence is plenty. Thinking it through in your head works, too."
                  />
                  {!rubric ? (
                    <button
                      className="button primary full"
                      onClick={() => setRubric(true)}
                    >
                      Compare with the model answer <ArrowRight size={17} />
                    </button>
                  ) : (
                    <div className="model-answer">
                      <b>ONE GOOD ANSWER</b>
                      <p>{q.answer}</p>
                      <span className="fineprint">
                        Self-check: did your reasoning include the key idea?
                      </span>
                      <div>
                        <button
                          className="button"
                          onClick={() => answer("self-fail")}
                        >
                          Still learning
                        </button>
                        <button
                          className="button primary"
                          onClick={() => answer("self-pass")}
                        >
                          Got the idea <Check size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <label className="uncertainty">
              <input
                type="checkbox"
                checked={uncertain}
                onChange={(e) => setUncertain(e.target.checked)}
              />{" "}
              I’m a little unsure <span>We’ll revisit this sooner</span>
            </label>
          </>
        )}
        {result && (
          <div
            className={`answer-feedback ${result.correct ? "correct" : "learning"}`}
            role="status"
          >
            <div className="feedback-title">
              <span>
                {result.correct ? <Check size={19} /> : <Lightbulb size={19} />}
              </span>
              <h3>
                {result.correct
                  ? q.type === "short"
                    ? "Good self-check."
                    : "You’ve got the idea."
                  : "A useful thing to discover."}
              </h3>
              <Pill>
                <Zap size={13} />+{result.xp} XP
              </Pill>
            </div>
            {!result.correct && q.type !== "short" && (
              <p className="correct-answer">
                <b>Best answer:</b>{" "}
                {q.options.find((o) => o.id === String(q.answer))?.text ??
                  (q.type === "graph"
                    ? `Shift ${q.answer}`
                    : q.type === "match"
                      ? q.matches
                          ?.map(
                            (m) =>
                              `${m.left} → ${q.options.find((o) => o.id === m.rightId)?.text}`,
                          )
                          .join("; ")
                      : q.answer)}
              </p>
            )}
            <p>{q.explanation}</p>
            {!result.correct && q.misconception && (
              <p className="misconception">
                <b>The easy mix-up:</b> {q.misconception}
              </p>
            )}
            <Source q={q} state={state} />
            <div className="feedback-actions">
              <button className="text-button" onClick={() => onReport(q)}>
                <Flag size={14} /> Report or edit
              </button>
              <button className="button primary" onClick={next}>
                {s.index + 1 >= s.questions.length
                  ? "Finish quest"
                  : "Next little challenge"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
        <div className="game-footer">
          <span>
            <span className="saved-dot" />
            Progress saved automatically
          </span>
          <button className="text-button" onClick={end}>
            Finish here <X size={13} />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
