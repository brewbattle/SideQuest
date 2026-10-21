import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  Flag,
  Gamepad2,
  Heart,
  HelpCircle,
  Leaf,
  MoreHorizontal,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Volume2,
  VolumeX,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  availableQuestions,
  buildQueue,
  createSession,
  finishSession,
  levelInfo,
} from "./lib/engine";
import {
  courses,
  freshState,
  stateSchema,
  type AppState,
  type Question,
} from "./lib/model";
import { demos } from "./lib/bank";
import {
  downloadJSON,
  exportStored,
  loadState,
  saveState,
} from "./lib/storage";
import {
  Avatar,
  Brand,
  CourseIcon,
  Dialog,
  Empty,
  Island,
  Pill,
} from "./components/UI";
import Game from "./components/Game";
import Library, { QuestionEditor } from "./components/Library";
import type { UpdateState } from "./components/Game";
function Preferences({
  state,
  update,
  onClose,
  onRestore,
}: {
  state: AppState;
  update: UpdateState;
  onClose: () => void;
  onRestore: (state: AppState) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<AppState | null>(null),
    [error, setError] = useState("");
  return (
    <Dialog title="Make yourself at home." onClose={onClose}>
      <div className="preferences">
        <div className="avatar-customizer">
          <Avatar avatar={state.avatar} size={100} />
          <div>
            <div className="eyebrow">YOUR LITTLE SIDEKICK</div>
            <h3>A little more you.</h3>
            <div className="swatches">
              {(["mint", "lilac", "peach", "blue"] as const).map((color) => (
                <button
                  key={color}
                  aria-label={`${color} avatar color`}
                  aria-pressed={state.avatar.color === color}
                  className={`swatch ${color}`}
                  onClick={() =>
                    update((p) => ({ ...p, avatar: { ...p.avatar, color } }))
                  }
                >
                  {state.avatar.color === color && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="hat-options">
          {(["sprout", "star", "none"] as const).map((hat) => (
            <button
              key={hat}
              className={`button ${state.avatar.hat === hat ? "selected" : ""}`}
              onClick={() =>
                update((p) => ({ ...p, avatar: { ...p.avatar, hat } }))
              }
            >
              {hat === "sprout"
                ? "Little sprout"
                : hat === "star"
                  ? "Lucky star"
                  : "Just me"}
            </button>
          ))}
        </div>
        <div className="setting-row">
          <div>
            <b>A little sound</b>
            <p>Gentle notes after an answer. Off by default.</p>
          </div>
          <button
            aria-label="Toggle sound"
            aria-pressed={state.sound}
            className={`toggle ${state.sound ? "on" : ""}`}
            onClick={() => update((p) => ({ ...p, sound: !p.sound }))}
          >
            <span />
          </button>
        </div>
        <div className="privacy-box">
          <ShieldCheck size={22} />
          <div>
            <b>Your learning stays yours.</b>
            <p>
              Progress, course materials, reports, and your paused quest are
              stored in this browser. No account, analytics, AI calls, or server
              uploads. Clearing site data clears your saves. Use a backup to
              move devices or domains.
            </p>
          </div>
        </div>
        <h3>Take your progress with you.</h3>
        <p className="muted">
          A backup includes your private materials. Keep it somewhere you trust.
          Browser storage is local, not a cloud backup.
        </p>
        <div className="backup-actions">
          <button
            className="button"
            onClick={() =>
              downloadJSON(
                state,
                `sidequest-backup-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            <Download size={17} /> Export backup
          </button>
          <button className="button" onClick={() => file.current?.click()}>
            <Upload size={17} /> Restore backup
          </button>
        </div>
        <input
          type="file"
          aria-label="Restore a SideQuest backup"
          accept=".json"
          ref={file}
          className="visually-hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 50 * 1024 * 1024)
                throw Error("Backup must be under 50 MB.");
              setBackup(stateSchema.parse(JSON.parse(await f.text())));
              setError("");
            } catch {
              setError(
                "This is not a valid SideQuest v1 backup. Nothing was changed.",
              );
            }
            e.target.value = "";
          }}
        />
        {backup && (
          <div className="restore-confirm">
            <b>Replace this device’s save?</b>
            <p>
              This backup contains {backup.xp} XP, {backup.materials.length}{" "}
              materials, and {backup.questions.length} questions. Export your
              current save first if you want to keep both.
            </p>
            <div>
              <button className="button" onClick={() => setBackup(null)}>
                Keep current save
              </button>
              <button
                className="button primary"
                onClick={() => {
                  onRestore(backup);
                  setBackup(null);
                  onClose();
                }}
              >
                Restore this backup
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="fineprint">
          Reduced-motion preferences are respected automatically. Your sidekick
          and sounds never affect learning rewards.
        </p>
      </div>
    </Dialog>
  );
}
function Report({
  q,
  state,
  update,
  onClose,
  onEdit,
}: {
  q: Question;
  state: AppState;
  update: UpdateState;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [reason, setReason] = useState(""),
    [sent, setSent] = useState(false);
  return (
    <Dialog title="Help this question get better." onClose={onClose}>
      <div className="editor">
        <Pill>
          {q.course} · {q.title}
        </Pill>
        <p className="muted">
          Reports stay on this device and are included in your backup. Reported
          questions are excluded from future sessions until reviewed and
          corrected.
        </p>
        {sent ? (
          <div className="success">
            <Check size={18} />
            Saved. Thanks for looking closely.
          </div>
        ) : (
          <>
            <label>
              What needs another look?
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="An incorrect answer, unclear explanation, wrong exam topic, or image issue…"
                maxLength={3000}
              />
            </label>
            <button
              className="button primary full"
              disabled={!reason.trim()}
              onClick={() => {
                update((p) => ({
                  ...p,
                  reports: [
                    ...p.reports,
                    {
                      id: crypto.randomUUID(),
                      qid: q.id,
                      reason: reason.trim(),
                      at: Date.now(),
                    },
                  ],
                }));
                setSent(true);
              }}
            >
              Save report <Flag size={15} />
            </button>
          </>
        )}
        <details className="source-details">
          <summary>
            Inspect the answer & source <ChevronRight size={16} />
          </summary>
          <div>
            <p>
              <b>Answer key:</b> {String(q.answer)}
            </p>
            <p>{q.explanation}</p>
            <p>
              <b>{q.source.label}</b> · {q.source.reference} {q.source.locator}
            </p>
            {q.source.materialId && (
              <pre>
                {
                  state.materials.find((m) => m.id === q.source.materialId)
                    ?.text
                }
              </pre>
            )}
          </div>
        </details>
        <button className="button full" onClick={onEdit}>
          Open content editor <ArrowUpRight size={16} />
        </button>
      </div>
    </Dialog>
  );
}
function Learning({ state }: { state: AppState }) {
  const stats = Object.entries(state.stats);
  return (
    <section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">IDEAS THAT ARE STARTING TO STICK</div>
          <h1>A little stronger, every time.</h1>
          <p>No streak to protect. Just understanding to build.</p>
        </div>
        <Pill>
          <Zap size={14} />
          {state.xp} XP earned
        </Pill>
      </div>
      <div className="learning-summary">
        <div>
          <span>Concepts explored</span>
          <strong>{stats.length}</strong>
        </div>
        <div>
          <span>Ready for a revisit</span>
          <strong>{stats.filter(([, s]) => s.due <= Date.now()).length}</strong>
        </div>
        <div>
          <span>Little quests completed</span>
          <strong>{state.history.length}</strong>
        </div>
      </div>
      <p className="fineprint learning-note">
        Sandbox and self-reviewed answers contribute to practice history. These
        stats don’t certify exam readiness. Uncertain answers return sooner, and
        incorrect ideas are revisited through different examples when available.
      </p>
      {stats.length === 0 ? (
        <Empty title="Your first idea is waiting.">
          Play a little, and this space will show what you’re understanding and
          what could use another look.
        </Empty>
      ) : (
        courses.map((c) => {
          const items = stats.filter(([k]) => k.startsWith(c.id + ":"));
          if (!items.length) return null;
          return (
            <div className="concept-section" key={c.id}>
              <h2>
                <CourseIcon id={c.id} />
                {c.code} <span>{c.name}</span>
              </h2>
              {items.map(([key, s]) => (
                <div key={key} className="concept-row">
                  <div>
                    <b>
                      {key.split(":").slice(1).join(":").replaceAll("-", " ")}
                    </b>
                    <span>
                      {s.correct} understood / {s.attempts} attempts
                    </span>
                  </div>
                  <div className="mastery-bar">
                    <span
                      style={{ width: `${(s.correct / s.attempts) * 100}%` }}
                    />
                  </div>
                  <Pill className={s.due <= Date.now() ? "warning" : ""}>
                    {s.due <= Date.now()
                      ? "Ready to revisit"
                      : s.streak >= 3
                        ? "Growing confidence"
                        : "Taking root"}
                  </Pill>
                </div>
              ))}
            </div>
          );
        })
      )}
      <div className="section-heading">
        <h2>Your recent little wins</h2>
      </div>
      <div className="history-list">
        {state.history.slice(0, 6).map((h) => (
          <div key={h.id}>
            <span className="history-icon">
              <Check size={17} />
            </span>
            <div>
              <b>{h.questions} ideas explored</b>
              <span>
                {h.concepts.slice(0, 2).join(" · ")} ·{" "}
                {new Date(h.at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <Pill>+{h.xp} XP</Pill>
          </div>
        ))}
      </div>
    </section>
  );
}
export default function App() {
  const [state, setState] = useState<AppState>(freshState),
    [loaded, setLoaded] = useState(false),
    [saveError, setSaveError] = useState(""),
    [storageBlocked, setStorageBlocked] = useState(false),
    [tab, setTab] = useState("play"),
    [libraryTab, setLibraryTab] = useState("materials"),
    [settings, setSettings] = useState(false),
    [playing, setPlaying] = useState(false),
    [editor, setEditor] = useState<Question | null>(null),
    [report, setReport] = useState<Question | null>(null),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const [bank, setBank] = useState<"demo" | "course">("demo"),
    [mode, setMode] = useState<"learn" | "challenge">("learn"),
    [duration, setDuration] = useState(3),
    [selectedCourse, setSelectedCourse] = useState("all"),
    [topic, setTopic] = useState("");
  useEffect(() => {
    let current = true;
    loadState()
      .then((s) => {
        if (current) {
          setState(s);
          setBank(
            availableQuestions(s, demos, "course").length ? "course" : "demo",
          );
          setLoaded(true);
        }
      })
      .catch(() => {
        if (current) {
          setSaveError(
            "Your browser save could not be opened. Existing data will not be overwritten. Export the original save or restore a valid backup in settings.",
          );
          setStorageBlocked(true);
          setLoaded(true);
        }
      });
    return () => {
      current = false;
    };
  }, []);
  const saveGeneration = useRef(0);
  useEffect(() => {
    if (!loaded || storageBlocked) return;
    const generation = ++saveGeneration.current;
    saveState(state)
      .then(() => {
        if (generation === saveGeneration.current) setSaveError("");
      })
      .catch(() =>
        setSaveError(
          "This change could not be saved to browser storage. Keep this tab open and export a backup from settings before leaving.",
        ),
      );
  }, [state, loaded, storageBlocked]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const pause = useCallback(() => setPlaying(false), []),
    closeSettings = useCallback(() => setSettings(false), []),
    closeEditor = useCallback(() => setEditor(null), []),
    closeReport = useCallback(() => setReport(null), []);
  const openLibrary = (next = "materials") => {
    setLibraryTab(next);
    setTab("library");
  };
  const ready = availableQuestions(state, demos, "course"),
    level = levelInfo(state.xp),
    review = Object.values(state.stats).filter(
      (s) => s.due <= Date.now(),
    ).length;
  const pool = availableQuestions(state, demos, bank).filter(
    (q) => !state.reports.some((r) => r.qid === q.id),
  );
  const topics = [
    ...new Set(
      pool
        .filter((q) => selectedCourse === "all" || q.course === selectedCourse)
        .map((q) => q.topic),
    ),
  ];
  const launch = (
    course = selectedCourse,
    minutes = duration,
    mixTopic = topic,
    resume = false,
  ) => {
    if (resume && state.active && !state.active.finished) {
      setPlaying(true);
      return;
    }
    const queue = buildQueue(pool, state.stats, course, mixTopic);
    if (!queue.length) {
      setNotice(
        bank === "course"
          ? "No reviewed questions match this exam scope yet. Import course materials, set the next exam, and review a few questions in your library."
          : "No questions match this selection. Try another topic or class.",
      );
      return;
    }
    setState((p) => ({
      ...finishSession(p),
      active: createSession(queue, minutes * 60, mode, bank, course),
    }));
    setPlaying(true);
  };
  const again = () => {
    const s = state.active!;
    const replayPool = availableQuestions(state, demos, s.bank).filter(
      (q) => !state.reports.some((r) => r.qid === q.id),
    );
    const queue = buildQueue(replayPool, state.stats, s.course, "");
    if (!queue.length) {
      setPlaying(false);
      setNotice(
        "No eligible questions remain in this set. Review your library or choose a different class.",
      );
      return;
    }
    setState((p) => ({
      ...p,
      active: createSession(queue, s.duration, s.mode, s.bank, s.course),
    }));
  };
  if (!loaded)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-dot" />
        <p>Getting your little world ready…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand-link"
          aria-label="SideQuest home"
          onClick={(e) => {
            e.preventDefault();
            setTab("play");
          }}
        >
          <Brand />
        </a>
        <div className="workspace-label">ALI’S LITTLE LEARNING WORLD</div>
        <nav aria-label="Main navigation">
          {[
            { id: "play", icon: Gamepad2, label: "Let’s play" },
            { id: "learning", icon: Leaf, label: "Your learning" },
            { id: "library", icon: BookOpen, label: "Your library" },
          ].map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <n.icon size={20} />
              {n.label}
              {n.id === "play" && (
                <span className="nav-spark" aria-hidden="true">
                  ✦
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-courses">
          <div className="workspace-label">
            YOUR CLASSES <span>4</span>
          </div>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCourse(c.id);
                setTopic("");
                setTab("play");
              }}
              className={`sidebar-course ${selectedCourse === c.id && tab === "play" ? "selected-course" : ""}`}
            >
              <span className={`course-dot ${c.color}`} />
              <span>
                {c.code}
                <small>{c.name}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="gentle-note">
            <span className="gentle-flower">✳</span>
            <p>
              A few minutes is plenty.
              <br />
              <b>You’re doing this for you.</b>
            </p>
          </div>
          <button
            className="nav-item settings-link"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={19} /> Make it yours <MoreHorizontal size={18} />
          </button>
          <div className="sidebar-profile">
            <Avatar avatar={state.avatar} size={42} />
            <div>
              <b>Ali</b>
              <span>Level {level.level} · Curious explorer</span>
            </div>
            <span className="profile-status" />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            Your little escape <ChevronRight size={14} />
            <span>
              {tab === "play"
                ? "Let’s play"
                : tab === "learning"
                  ? "Your learning"
                  : "Your library"}
            </span>
          </div>
          <Brand small />
          <div className="top-actions">
            {!online ? (
              <Pill className="warning">
                <WifiOff size={13} />
                Offline · still playable
              </Pill>
            ) : (
              <span className="local-status">
                <span
                  className={saveError ? "saved-dot warning-dot" : "saved-dot"}
                />
                {saveError ? "Save needs attention" : "Saved on this device"}
              </span>
            )}
            <button
              className="icon-button sound-button"
              aria-label={state.sound ? "Mute sound" : "Turn sound on"}
              onClick={() => setState((p) => ({ ...p, sound: !p.sound }))}
            >
              {state.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <span className="xp-pill">
              <Zap size={15} fill="currentColor" />
              {state.xp} XP
            </span>
            <button
              className="profile-button"
              aria-label="Customize your avatar"
              onClick={() => setSettings(true)}
            >
              <Avatar avatar={state.avatar} size={36} />
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          {saveError && (
            <div className="error storage-error" role="alert">
              {saveError}
              <div>
                <button
                  className="text-button"
                  onClick={() =>
                    downloadJSON(state, "sidequest-emergency-backup.json")
                  }
                >
                  Export current session
                </button>
                {storageBlocked && (
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        downloadJSON(
                          await exportStored(),
                          "sidequest-original-save.json",
                        );
                      } catch {
                        setNotice(
                          "The original browser save is not accessible. Try this browser’s normal profile or import your latest backup.",
                        );
                      }
                    }}
                  >
                    Export original save
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => setSettings(true)}
                >
                  Open backup settings
                </button>
              </div>
            </div>
          )}
          {tab === "play" ? (
            <>
              <div className="home-heading">
                <div>
                  <div className="eyebrow">
                    <span className="hello-sun">☼</span> A LITTLE PLAY. A LOT OF
                    PROGRESS.
                  </div>
                  <h1>
                    Hey Ali, take a little side quest<span>.</span>
                  </h1>
                  <p>Turn a spare moment into an “oh, I get it.”</p>
                </div>
                <span className="semester-label">
                  Wesleyan <span>FALL ’26</span>
                </span>
              </div>
              <div className="home-columns">
                <div className="play-column">
                  <section className="hero">
                    <div className="hero-copy">
                      <Pill>
                        <span className="spark-glyph">✦</span> SMALL GAMES. BIG
                        IDEAS.
                      </Pill>
                      <h2>
                        Your next level
                        <br />
                        starts here.
                      </h2>
                      <p>
                        A little economics. A little human nature.
                        <br className="desktop-break" /> A few good “aha!”
                        moments.
                      </p>
                      <button
                        className="just-play"
                        onClick={() => launch("all", 3, "", true)}
                      >
                        <Play size={20} fill="currentColor" /> Just Play{" "}
                        <span>
                          <ArrowRight size={22} />
                        </span>
                      </button>
                      <span className="hero-caption">
                        <Clock3 size={13} /> About 3 minutes <i /> No pressure,
                        ever
                      </span>
                    </div>
                    <Island />
                    <span className="hero-footer">
                      {bank === "demo"
                        ? "PRACTICE SANDBOX · NOT EXAM-VERIFIED"
                        : "YOUR REVIEWED NEXT-EXAM CONTENT"}
                    </span>
                  </section>
                  <div className="play-options">
                    <div className="mode-control" aria-label="Play mode">
                      <button
                        aria-pressed={mode === "learn"}
                        className={mode === "learn" ? "active" : ""}
                        onClick={() => setMode("learn")}
                      >
                        <Sparkles size={15} /> Learn through play
                      </button>
                      <button
                        aria-pressed={mode === "challenge"}
                        className={mode === "challenge" ? "active" : ""}
                        onClick={() => setMode("challenge")}
                      >
                        <Target size={15} /> Challenge
                      </button>
                    </div>
                    <span className="option-hint">
                      {mode === "learn"
                        ? "A tiny lesson, then your turn."
                        : "Less guidance. Give it a go."}
                    </span>
                  </div>
                  {state.active && !state.active.finished && (
                    <div className="resume-card">
                      <span className="resume-icon">
                        <Play size={18} />
                      </span>
                      <div>
                        <b>Your quest is right where you left it.</b>
                        <span>
                          {state.active.results.length} ideas explored ·{" "}
                          {Math.ceil(state.active.remaining / 60)} min left ·{" "}
                          {state.active.bank === "demo"
                            ? "Sandbox"
                            : "Exam prep"}
                        </span>
                      </div>
                      <button
                        className="button"
                        onClick={() => setPlaying(true)}
                      >
                        Resume <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <section className="class-section">
                    <div className="section-heading">
                      <h2>
                        Pick your playground{" "}
                        <span>4 classes, lots to explore</span>
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => openLibrary("scope")}
                      >
                        Exam scope <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <div className="course-cards">
                      {courses.map((c, i) => {
                        const count = pool.filter(
                          (q) => q.course === c.id,
                        ).length;
                        return (
                          <button
                            key={c.id}
                            className={`course-card ${c.color}`}
                            onClick={() => {
                              setSelectedCourse(c.id);
                              setTopic("");
                              launch(c.id, duration, "");
                            }}
                          >
                            <div className="course-card-top">
                              <span className="course-symbol">
                                <CourseIcon id={c.id} size={25} />
                              </span>
                              <span
                                className="course-card-number"
                                aria-hidden="true"
                              >
                                0{i + 1}
                              </span>
                              <ArrowUpRight size={18} />
                            </div>
                            <div className="course-code">{c.code}</div>
                            <h3>{c.name}</h3>
                            <p>{c.description}</p>
                            <div className="course-card-bottom">
                              <span>
                                {bank === "demo"
                                  ? `${count} sandbox challenges`
                                  : `${count} reviewed exam questions`}
                              </span>
                              <span className="mini-play">
                                <Play size={11} fill="currentColor" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  <section className="custom-session">
                    <div>
                      <span className="custom-icon">
                        <Compass size={21} />
                      </span>
                      <h3>A quest your way.</h3>
                      <p>A little time, a particular curiosity.</p>
                    </div>
                    <div className="custom-controls">
                      <label>
                        CLASS
                        <select
                          aria-label="Session class"
                          value={selectedCourse}
                          onChange={(e) => {
                            setSelectedCourse(e.target.value);
                            setTopic("");
                          }}
                        >
                          <option value="all">Mix it up · all classes</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} · {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        TOPIC
                        <select
                          aria-label="Session topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                        >
                          <option value="">A little of everything</option>
                          {topics.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="custom-bottom">
                      <div className="time-choices" aria-label="Session length">
                        {[2, 5, 10].map((n) => (
                          <button
                            aria-pressed={duration === n}
                            key={n}
                            className={duration === n ? "active" : ""}
                            onClick={() => setDuration(n)}
                          >
                            {n} min
                          </button>
                        ))}
                      </div>
                      <button className="button dark" onClick={() => launch()}>
                        Start my quest <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>
                </div>
                <aside className="adventure-column">
                  <section className="adventure-card">
                    <div className="rail-heading">
                      <h2>Your adventure</h2>
                      <button
                        className="icon-button"
                        aria-label="Customize your sidekick"
                        onClick={() => setSettings(true)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </div>
                    <div className="avatar-scene">
                      <span className="avatar-star star-one">✦</span>
                      <span className="avatar-star star-two">✧</span>
                      <div className="avatar-disc">
                        <Avatar avatar={state.avatar} size={100} />
                      </div>
                      <span className="level-badge">LEVEL {level.level}</span>
                    </div>
                    <h3>
                      {level.level < 3
                        ? "Curious explorer"
                        : level.level < 7
                          ? "Idea adventurer"
                          : "Thoughtful trailblazer"}
                    </h3>
                    <p>Every good thought takes you further.</p>
                    <div className="xp-label">
                      <span>
                        <Zap size={13} />
                        {level.progress} XP
                      </span>
                      <span>{150} XP</span>
                    </div>
                    <div className="level-bar">
                      <span
                        style={{ width: `${(level.progress / 150) * 100}%` }}
                      />
                    </div>
                    <span className="level-remaining">
                      {level.next} XP to your next level
                    </span>
                    <div className="adventure-divider" />
                    <div className="revisit">
                      <span className="revisit-icon">
                        <Leaf size={20} />
                      </span>
                      <div>
                        <b>
                          {review
                            ? `${review} ideas ready to revisit`
                            : "Room for a little growth"}
                        </b>
                        <p>
                          {review
                            ? "A fresh example can make it click."
                            : "No streaks. No catching up."}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-button rail-link"
                      onClick={() => setTab("learning")}
                    >
                      See your learning <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="source-card">
                    <span className="source-icon">
                      <BookOpen size={20} />
                    </span>
                    <h3>
                      Real learning.
                      <br />
                      Real course materials.
                    </h3>
                    <p>
                      {ready.length
                        ? `${ready.length} reviewed questions are ready for your upcoming exams.`
                        : state.materials.length
                          ? "Your course materials are saved here. Review source-backed questions before using exam prep."
                          : "Your syllabi haven’t arrived yet. Try the sandbox, then bring your next exam into play."}
                    </p>
                    <div className="bank-switch">
                      <button
                        aria-pressed={bank === "demo"}
                        className={bank === "demo" ? "active" : ""}
                        onClick={() => {
                          setBank("demo");
                          setTopic("");
                        }}
                      >
                        Sandbox
                      </button>
                      <button
                        aria-pressed={bank === "course"}
                        className={bank === "course" ? "active" : ""}
                        onClick={() => {
                          setBank("course");
                          setTopic("");
                        }}
                      >
                        Exam prep{" "}
                        {ready.length > 0 && <span>{ready.length}</span>}
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => openLibrary()}
                    >
                      Add your materials <ArrowUpRight size={15} />
                    </button>
                  </section>
                  <div className="little-note">
                    <Heart size={16} />
                    <p>
                      For the in-between moments.
                      <br />
                      Not another thing on your to-do list.
                    </p>
                  </div>
                </aside>
              </div>
              <footer className="home-footer">
                <span>
                  <ShieldCheck size={14} /> Private. Local-first. Yours.
                </span>
                <span>
                  Made for your kind of free time{" "}
                  <span className="footer-star">✦</span>
                </span>
              </footer>
            </>
          ) : tab === "library" ? (
            <Library
              key={libraryTab}
              initialTab={libraryTab}
              state={state}
              update={setState}
              onEdit={setEditor}
            />
          ) : (
            <Learning state={state} />
          )}
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {[
            { id: "play", icon: Gamepad2, label: "Play" },
            { id: "learning", icon: Leaf, label: "Learning" },
            { id: "library", icon: BookOpen, label: "Library" },
          ].map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => setTab(n.id)}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
            </button>
          ))}
          <button onClick={() => setSettings(true)}>
            <Settings2 size={21} />
            <span>You</span>
          </button>
        </nav>
      </div>
      {playing && state.active && (
        <Game
          state={state}
          update={setState}
          onPause={pause}
          onAgain={again}
          onReport={setReport}
        />
      )}{" "}
      {settings && (
        <Preferences
          state={state}
          update={setState}
          onClose={closeSettings}
          onRestore={(s) => {
            setState(s);
            setStorageBlocked(false);
          }}
        />
      )}
      {editor && (
        <QuestionEditor
          key={editor.id}
          original={editor}
          state={state}
          update={setState}
          onClose={closeEditor}
        />
      )}{" "}
      {report && (
        <Report
          q={report}
          state={state}
          update={setState}
          onClose={closeReport}
          onEdit={() => {
            setEditor(report);
            setReport(null);
          }}
        />
      )}
      {notice && (
        <Dialog
          title="A little more source material first."
          onClose={() => setNotice("")}
        >
          <div className="editor">
            <span className="empty-icon">
              <HelpCircle size={30} />
            </span>
            <p>{notice}</p>
            <button
              className="button primary full"
              onClick={() => {
                setNotice("");
                openLibrary();
              }}
            >
              Open your library <ArrowRight size={16} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setNotice("");
                setBank("demo");
                setTopic("");
              }}
            >
              Explore the practice sandbox instead
            </button>
          </div>
        </Dialog>
      )}
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
    </div>
  );
}
