import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileText,
  ImagePlus,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  courses,
  questionSchema,
  type AppState,
  type CourseId,
  type Material,
  type Question,
} from "../lib/model";
import { scopeIsCurrent } from "../lib/engine";
import { importFile } from "../lib/importer";
import { downloadJSON } from "../lib/storage";
import { CourseIcon, Dialog, Empty, Pill } from "./UI";
import type { UpdateState } from "./Game";
const blank = (course: CourseId): Question => ({
  id: crypto.randomUUID(),
  course,
  topic: "",
  concept: "",
  type: "choice",
  title: "",
  prompt: "",
  options: [
    { id: "0", text: "" },
    { id: "1", text: "" },
    { id: "2", text: "" },
  ],
  answer: "0",
  explanation: "",
  misconception: "",
  difficulty: 1,
  source: { kind: "course", label: "", reference: "" },
  reviewed: false,
});
export function QuestionEditor({
  original,
  state,
  update,
  onClose,
}: {
  original: Question;
  state: AppState;
  update: UpdateState;
  onClose: () => void;
}) {
  const isDemo = original.source.kind === "demo";
  const [draft, setDraft] = useState<Question>(() =>
      isDemo
        ? {
            ...original,
            id: crypto.randomUUID(),
            source: { kind: "course", label: "", reference: "" },
            reviewed: false,
          }
        : original,
    ),
    [approve, setApprove] = useState(false),
    [error, setError] = useState(""),
    [advanced, setAdvanced] = useState("");
  const set = <K extends keyof Question>(key: K, value: Question[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));
  const scope = state.scopes[draft.course],
    canApprove =
      scopeIsCurrent(scope) &&
      scope.topics.includes(draft.topic) &&
      !!draft.source.reference.trim() &&
      !!draft.source.label.trim() &&
      (!draft.source.materialId ||
        state.materials.some(
          (m) => m.id === draft.source.materialId && !m.needsOCR,
        ));
  const save = () => {
    try {
      let input = draft;
      if (advanced.trim()) input = { ...input, ...JSON.parse(advanced) };
      input = {
        ...input,
        source: { ...input.source, kind: "course" },
        reviewed: approve && canApprove,
        examId: approve && canApprove ? scope.id : undefined,
      };
      const parsed = questionSchema.parse(input);
      if (
        parsed.course !== draft.course ||
        parsed.topic !== draft.topic ||
        parsed.id !== draft.id ||
        JSON.stringify(parsed.source) !== JSON.stringify(input.source)
      )
        throw Error(
          "Advanced settings must preserve the question ID, course, topic, and source.",
        );
      if (approve && (!canApprove || !scope.topics.includes(parsed.topic)))
        throw Error("Set a current exam and source before approving.");
      update((p) => ({
        ...p,
        questions: [...p.questions.filter((q) => q.id !== parsed.id), parsed],
        reports: p.reports.filter((r) => r.qid !== parsed.id),
      }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the question fields.");
    }
  };
  const imageInput = useRef<HTMLInputElement>(null);
  const image = (url: string) =>
    set("image", {
      url,
      alt: draft.image?.alt ?? "",
      building: draft.image?.building ?? "",
      credit: draft.image?.credit ?? "",
      sourceUrl: draft.image?.sourceUrl ?? "",
      verified: true,
    });
  return (
    <Dialog
      title={
        original.title ? `Review: ${original.title}` : "Make a little challenge"
      }
      onClose={onClose}
      wide
    >
      <div className="editor">
        <p className="muted">
          Check the source, reasoning, and exam relevance. New or edited content
          stays in drafts until you approve it.
        </p>
        <div className="form-grid">
          <label>
            Class
            <select
              value={draft.course}
              onChange={(e) => set("course", e.target.value as CourseId)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Game type
            <select
              value={draft.type}
              onChange={(e) => {
                const type = e.target.value as Question["type"];
                setDraft((p) => ({
                  ...p,
                  type,
                  answer: type === "numeric" ? 0 : "0",
                }));
              }}
            >
              {[
                ["choice", "Choose & reason"],
                ["numeric", "Number puzzle"],
                ["short", "Explain it"],
                ["image", "Building image"],
                ["graph", "Move a curve"],
                ["accounting", "Resale transaction"],
                ["match", "Match ideas"],
              ].map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <input
              list="exam-topics"
              value={draft.topic}
              onChange={(e) => set("topic", e.target.value)}
            />
            <datalist id="exam-topics">
              {scope.topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label>
            Concept to track
            <input
              value={draft.concept}
              onChange={(e) => set("concept", e.target.value)}
              placeholder="e.g. revenue recognition"
            />
          </label>
        </div>
        <label>
          Short title
          <input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="A tiny question with a big idea"
          />
        </label>
        <label>
          The challenge
          <textarea
            value={draft.prompt}
            onChange={(e) => set("prompt", e.target.value)}
          />
        </label>
        <label>
          A tiny teaching example <span>(optional · Learn mode)</span>
          <textarea
            rows={2}
            value={draft.intro ?? ""}
            onChange={(e) => set("intro", e.target.value)}
          />
        </label>
        {["choice", "accounting", "image", "numeric", "match"].includes(
          draft.type,
        ) && (
          <div className="editor-options">
            <span className="field-label">
              {draft.type === "match"
                ? "Matching targets"
                : "Tap-friendly answers"}
            </span>
            {draft.options.map((o, i) => (
              <div key={i}>
                <span>{String.fromCharCode(65 + i)}</span>
                <input
                  aria-label={`Answer ${i + 1}`}
                  value={o.text}
                  onChange={(e) =>
                    set(
                      "options",
                      draft.options.map((item, j) =>
                        j === i
                          ? {
                              ...item,
                              text: e.target.value,
                              ...(draft.type === "numeric"
                                ? { id: e.target.value }
                                : {}),
                            }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  className="icon-button"
                  aria-label={`Remove answer ${i + 1}`}
                  onClick={() =>
                    set(
                      "options",
                      draft.options.filter((_, j) => i !== j),
                    )
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {draft.options.length < 8 && (
              <button
                className="text-button"
                onClick={() =>
                  set("options", [
                    ...draft.options,
                    { id: crypto.randomUUID(), text: "" },
                  ])
                }
              >
                <Plus size={14} /> Add answer
              </button>
            )}
          </div>
        )}
        {["choice", "accounting", "image"].includes(draft.type) ? (
          <label>
            Correct answer
            <select
              value={String(draft.answer)}
              onChange={(e) => set("answer", e.target.value)}
            >
              {draft.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.text || `Answer ${Number(o.id) + 1}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            {draft.type === "short" ? "Model answer" : "Correct answer key"}
            <input
              value={String(draft.answer)}
              onChange={(e) =>
                set(
                  "answer",
                  draft.type === "numeric"
                    ? Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          </label>
        )}
        <label>
          Why is this correct?
          <textarea
            value={draft.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            placeholder="Explain the reasoning in a few clear sentences."
          />
        </label>
        <label>
          The easy mix-up <span>(optional)</span>
          <input
            value={draft.misconception}
            onChange={(e) => set("misconception", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Difficulty
            <select
              value={draft.difficulty}
              onChange={(e) => set("difficulty", Number(e.target.value))}
            >
              <option value={1}>1 · Getting started</option>
              <option value={2}>2 · Connecting ideas</option>
              <option value={3}>3 · Stretching</option>
            </select>
          </label>
          <label>
            Supporting material
            <select
              value={draft.source.materialId ?? ""}
              onChange={(e) => {
                const material = state.materials.find(
                  (m) => m.id === e.target.value,
                );
                set("source", {
                  ...draft.source,
                  materialId: material?.id,
                  label: material?.title ?? draft.source.label,
                  reference: material ? material.title : draft.source.reference,
                });
              }}
            >
              <option value="">External / other source</option>
              {state.materials
                .filter((m) => m.course === draft.course)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                    {m.needsOCR ? " (needs OCR)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Source title
            <input
              value={draft.source.label}
              onChange={(e) =>
                set("source", { ...draft.source, label: e.target.value })
              }
            />
          </label>
          <label>
            Source citation or HTTPS link
            <input
              value={draft.source.reference}
              onChange={(e) =>
                set("source", { ...draft.source, reference: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Page, section, or passage location
          <input
            value={draft.source.locator ?? ""}
            onChange={(e) =>
              set("source", { ...draft.source, locator: e.target.value })
            }
            placeholder="e.g. p. 12, ‘Recognition of revenue’"
          />
        </label>
        {draft.type === "image" && (
          <div className="image-editor">
            <h3>A verified image of the actual building</h3>
            <p className="fineprint">
              Use an image you have permission to use. Uploaded images stay in
              your browser. HTTPS image URLs need a connection.
            </p>
            <label>
              Image URL
              <input
                value={
                  draft.image?.url.startsWith("data:")
                    ? ""
                    : (draft.image?.url ?? "")
                }
                onChange={(e) => image(e.target.value)}
                placeholder={
                  draft.image?.url.startsWith("data:")
                    ? "Local image attached"
                    : "https://…"
                }
              />
            </label>
            <input
              className="visually-hidden"
              type="file"
              aria-label="Upload a building image"
              ref={imageInput}
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError("Use an image smaller than 2 MB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => image(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            <button
              className="button"
              onClick={() => imageInput.current?.click()}
            >
              <ImagePlus size={16} /> Upload image
            </button>
            {draft.image?.url && (
              <img
                className="image-preview"
                src={draft.image.url}
                alt="Image under review"
              />
            )}
            {(
              [
                ["building", "Verified building name"],
                [
                  "alt",
                  "Describe visible features without revealing the answer",
                ],
                ["credit", "Photographer / credit / license"],
                ["sourceUrl", "Original image page (HTTPS)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={draft.image?.[key] ?? ""}
                  onChange={(e) =>
                    set("image", {
                      ...(draft.image ?? {
                        url: "",
                        alt: "",
                        credit: "",
                        building: "",
                        sourceUrl: "",
                        verified: true,
                      }),
                      [key]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
        {["graph", "accounting", "match"].includes(draft.type) && (
          <div className="notice">
            <AlertCircle size={17} />
            <p>
              This game also needs{" "}
              {draft.type === "graph"
                ? "a graph configuration"
                : draft.type === "accounting"
                  ? "a transaction with amount and inventory cost when relevant"
                  : "matching pairs"}
              . Edit the structured settings below, or use the JSON import
              template.
            </p>
          </div>
        )}
        <details className="advanced">
          <summary>
            Structured game settings <ChevronDown size={15} />
          </summary>
          <p className="fineprint">
            Optional JSON object for graph, transaction, matches, numeric
            tolerance, or units. Complete schema and examples are in the project
            README.
          </p>
          <textarea
            className="code-input"
            value={advanced}
            placeholder={JSON.stringify(
              {
                ...(draft.graph ? { graph: draft.graph } : {}),
                ...(draft.transaction
                  ? { transaction: draft.transaction }
                  : {}),
                ...(draft.matches ? { matches: draft.matches } : {}),
              },
              null,
              2,
            )}
            onChange={(e) => setAdvanced(e.target.value)}
          />
        </details>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="approval">
          <ShieldCheck size={23} />
          <div>
            <b>
              {canApprove
                ? `Ready for ${scope.title}`
                : "Keep as a draft for now"}
            </b>
            {!canApprove && (
              <p>
                Set a future exam date and topic list in Exam scope, match this
                topic exactly, and include a readable source.
              </p>
            )}
            <label>
              <input
                type="checkbox"
                checked={approve}
                disabled={!canApprove}
                onChange={(e) => setApprove(e.target.checked)}
              />
              I checked the source, correct answer, image (if any), and this
              exam’s coverage.
            </label>
          </div>
        </div>
        <button className="button primary full" onClick={save}>
          {approve ? "Save & approve for exam prep" : "Save question draft"}{" "}
          <Check size={17} />
        </button>
      </div>
    </Dialog>
  );
}
function ExamScope({
  state,
  update,
}: {
  state: AppState;
  update: UpdateState;
}) {
  const [editing, setEditing] = useState<CourseId | null>(null),
    [title, setTitle] = useState(""),
    [date, setDate] = useState(""),
    [topics, setTopics] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <div className="notice">
        <ShieldCheck size={19} />
        <p>
          Only reviewed questions matched to a confirmed, upcoming exam appear
          in Exam prep. Changing the exam creates a new scope; older questions
          need to be reviewed again.
        </p>
      </div>
      <div className="scope-grid">
        {courses.map((c) => {
          const scope = state.scopes[c.id];
          return (
            <div key={c.id} className="scope-card">
              <span className={`course-symbol ${c.color}`}>
                <CourseIcon id={c.id} />
              </span>
              <h3>{c.code}</h3>
              <Pill className={scopeIsCurrent(scope) ? "verified" : ""}>
                {scopeIsCurrent(scope)
                  ? "Coverage confirmed"
                  : "Needs exam scope"}
              </Pill>
              <h4>{scope.title || "What’s coming up?"}</h4>
              <p>
                {scope.date
                  ? new Date(scope.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    )
                  : "No exam date supplied"}
              </p>
              <p className="fineprint">
                {scope.topics.join(" · ") ||
                  "Import your syllabus or exam guide, then confirm the included topics."}
              </p>
              <button
                className="button full"
                onClick={() => {
                  setEditing(c.id);
                  setTitle(scope.title);
                  setDate(scope.date);
                  setTopics(scope.topics.join("\n"));
                  setConfirmed(false);
                }}
              >
                Set exam coverage <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
      {editing && (
        <Dialog
          title={`Next exam · ${courses.find((c) => c.id === editing)?.code}`}
          onClose={() => setEditing(null)}
        >
          <div className="editor">
            <p className="muted">
              Use your syllabus, instructor announcement, or exam study guide.
              We won’t guess what’s on your exam.
            </p>
            <label>
              Exam name
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm 2"
              />
            </label>
            <label>
              Exam date
              <input
                type="date"
                value={date}
                min={new Date().toLocaleDateString("en-CA")}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Included topics{" "}
              <span>(one per line; question topics must match)</span>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Revenue recognition\nInventory"
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I verified this coverage in my course materials.
            </label>
            <button
              className="button primary full"
              disabled={
                !title.trim() ||
                !date ||
                !topics.trim() ||
                !confirmed ||
                date < new Date().toLocaleDateString("en-CA")
              }
              onClick={() => {
                update((p) => ({
                  ...p,
                  scopes: {
                    ...p.scopes,
                    [editing]: {
                      id: crypto.randomUUID(),
                      title: title.trim(),
                      date,
                      topics: [
                        ...new Set(
                          topics
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        ),
                      ],
                      confirmed: true,
                    },
                  },
                }));
                setEditing(null);
              }}
            >
              Save exam scope <Check size={17} />
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
export default function Library({
  state,
  update,
  onEdit,
  initialTab = "materials",
}: {
  state: AppState;
  update: UpdateState;
  onEdit: (q: Question) => void;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab),
    [course, setCourse] = useState<CourseId>("ECON110"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [title, setTitle] = useState(""),
    [reader, setReader] = useState<Material | null>(null),
    [search, setSearch] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const ingest = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    setError("");
    setMessage("");
    let count = 0;
    try {
      for (const f of Array.from(files)) {
        const result = await importFile(f, course);
        update((p) => ({
          ...p,
          questions: [...p.questions, ...result.questions],
          materials: result.material
            ? [...p.materials, result.material]
            : p.materials,
        }));
        count += 1;
        if (result.material?.needsOCR)
          setMessage(
            "Imported with an OCR warning: one or more PDF pages have little or no selectable text. Use a trusted OCR tool locally and re-import before making questions.",
          );
      }
      setMessage(
        (p) =>
          p ||
          `Imported ${count} file${count === 1 ? "" : "s"}. Materials are private; questions start as drafts.`,
      );
    } catch (e) {
      setError(
        `${count ? `${count} file(s) imported. ` : ""}${e instanceof Error ? e.message : "Import failed."}`,
      );
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  const template = () =>
    downloadJSON(
      {
        questions: [
          {
            ...blank(course),
            topic: "Replace with a topic in your exam scope",
            concept: "a-specific-concept",
            title: "Write a short title",
            prompt: "Write a question grounded in your course source.",
            options: [
              { id: "a", text: "Correct answer" },
              { id: "b", text: "A plausible misconception" },
            ],
            answer: "a",
            explanation: "Explain why a is correct, using the source.",
            source: {
              kind: "course",
              label: "Your actual source title",
              reference: "Citation or HTTPS URL",
              locator: "Page or section",
            },
            reviewed: false,
          },
        ],
      },
      "sidequest-question-template.json",
    );
  return (
    <section className="library">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR LEARNING, YOUR SOURCES</div>
          <h1>A home for your materials.</h1>
          <p>Bring the real course in. Keep the little games accurate.</p>
        </div>
        <button className="button" onClick={template}>
          <Download size={16} /> Question template
        </button>
      </div>
      <div className="library-tabs">
        {[
          ["materials", "Course materials"],
          ["questions", `Question bank · ${state.questions.length}`],
          ["scope", "Exam scope"],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "scope" ? (
        <ExamScope state={state} update={update} />
      ) : (
        <>
          <div className="library-controls">
            <label className="inline-label">
              Class
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value as CourseId)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            {tab === "questions" && (
              <>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search questions"
                    value={search}
                    placeholder="Find a topic or question…"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  onClick={() => onEdit(blank(course))}
                >
                  <Plus size={17} /> New question
                </button>
              </>
            )}
          </div>
          {tab === "materials" ? (
            <>
              <div className="import-panel">
                <div
                  className="upload-area"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!busy) void ingest(e.dataTransfer.files);
                  }}
                >
                  <span className="upload-icon">
                    <Upload size={26} />
                  </span>
                  <h3>A syllabus. A reading. A good starting point.</h3>
                  <p>Drop files here, or choose from your device.</p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => file.current?.click()}
                  >
                    {busy ? "Reading your files…" : "Choose files"}{" "}
                    <Plus size={16} />
                  </button>
                  <span className="fineprint">
                    TXT, Markdown, CSV, JSON, text-based PDF · up to 20 MB each
                  </span>
                </div>
                <div className="import-note">
                  <ShieldCheck size={21} />
                  <h4>Private by design.</h4>
                  <p>
                    Files are read in your browser and saved on this device.
                    Nothing is uploaded to a server or sent to an AI service.
                  </p>
                  <p>
                    Text and PDFs become source materials. JSON and CSV can
                    import structured question drafts. Review them before they
                    enter exam play.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setTab("scope")}
                  >
                    Set your next exam <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <details className="paste-panel">
                <summary>
                  Or paste a reading or your notes <ChevronDown size={16} />
                </summary>
                <div className="editor">
                  <label>
                    Title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midterm 2 study guide"
                    />
                  </label>
                  <label>
                    Source text
                    <textarea
                      rows={6}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste the text here. It stays on your device."
                    />
                  </label>
                  <button
                    className="button"
                    disabled={
                      !title.trim() || !text.trim() || text.length > 2000000
                    }
                    onClick={() => {
                      update((p) => ({
                        ...p,
                        materials: [
                          ...p.materials,
                          {
                            id: crypto.randomUUID(),
                            course,
                            title: title.trim(),
                            text,
                            added: Date.now(),
                            kind: "text",
                            needsOCR: false,
                          },
                        ],
                      }));
                      setText("");
                      setTitle("");
                      setMessage(
                        "Source material saved. You can now create questions that reference it.",
                      );
                    }}
                  >
                    Save material <Check size={16} />
                  </button>
                </div>
              </details>
              <div className="section-heading">
                <h2>
                  On your bookshelf{" "}
                  <span>
                    {state.materials.filter((m) => m.course === course).length}
                  </span>
                </h2>
              </div>
              {state.materials.filter((m) => m.course === course).length ===
              0 ? (
                <Empty title="Your course hasn’t moved in yet.">
                  No syllabus, reading, or study guide is available for this
                  class. Import one above. Until then, only the clearly labeled
                  sandbox is playable.
                </Empty>
              ) : (
                <div className="material-list">
                  {state.materials
                    .filter((m) => m.course === course)
                    .map((m) => (
                      <button
                        key={m.id}
                        className="material-row"
                        onClick={() => setReader(m)}
                      >
                        <span className="material-icon">
                          <FileText size={23} />
                        </span>
                        <span>
                          <b>{m.title}</b>
                          <small>
                            {m.needsOCR
                              ? "Needs OCR · check scanned or low-text pages"
                              : `${m.text.length.toLocaleString()} characters · saved privately`}{" "}
                            · {new Date(m.added).toLocaleDateString()}
                          </small>
                        </span>
                        {m.needsOCR ? (
                          <Pill className="warning">Needs OCR</Pill>
                        ) : (
                          <ArrowRight size={17} />
                        )}
                      </button>
                    ))}
                </div>
              )}
              <div className="architecture-note">
                <ImagePlus size={23} />
                <div>
                  <b>Architecture deserves the real thing.</b>
                  <p>
                    No building photographs were available. Image challenges
                    require the actual building image, its provenance and
                    credit, plus your source-checked identification. Add these
                    in a new “Building image” question.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="notice">
                <ShieldCheck size={19} />
                <p>
                  Imported questions start in review. Only questions you approve
                  for the current exam scope enter Exam prep. Reported questions
                  are held out until corrected and reviewed again.
                </p>
              </div>
              {state.questions.filter(
                (q) =>
                  q.course === course &&
                  `${q.title} ${q.topic}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              ).length === 0 ? (
                <Empty
                  title="A small, excellent question bank starts here."
                  action={
                    <button
                      className="button"
                      onClick={() => onEdit(blank(course))}
                    >
                      <Plus size={16} /> Make your first question
                    </button>
                  }
                >
                  Import a JSON/CSV question set, or build a question from a
                  saved source. No unreviewed AI content enters the game.
                </Empty>
              ) : (
                <div className="question-list">
                  {state.questions
                    .filter(
                      (q) =>
                        q.course === course &&
                        `${q.title} ${q.topic}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((q) => (
                      <button
                        key={q.id}
                        className="question-row"
                        onClick={() => onEdit(q)}
                      >
                        <div>
                          <span className="eyebrow">
                            {q.topic} · {q.type}
                          </span>
                          <h3>{q.title}</h3>
                          <p>
                            {q.source.label}{" "}
                            {q.source.locator && `· ${q.source.locator}`}
                          </p>
                        </div>
                        <Pill
                          className={
                            q.reviewed && q.examId === state.scopes[q.course].id
                              ? "verified"
                              : ""
                          }
                        >
                          {state.reports.some((r) => r.qid === q.id)
                            ? "Reported"
                            : q.reviewed &&
                                q.examId === state.scopes[q.course].id
                              ? "Reviewed"
                              : "Draft"}
                        </Pill>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success" role="status">
          <Check size={17} />
          {message}
        </div>
      )}
      <input
        className="visually-hidden"
        type="file"
        aria-label="Import course files"
        multiple
        ref={file}
        accept=".txt,.md,.markdown,.pdf,.csv,.json"
        onChange={(e) => void ingest(e.target.files)}
      />
      {reader && (
        <Dialog title={reader.title} onClose={() => setReader(null)} wide>
          <div className="reader">
            {reader.needsOCR && (
              <div className="notice warning">
                <AlertCircle size={20} />
                <p>
                  Some pages have little or no selectable text. This may be a
                  scanned or mixed PDF. Run OCR locally, check it against the
                  original, and import the readable version.
                </p>
              </div>
            )}
            <pre>{reader.text}</pre>
            <button
              className="button primary"
              disabled={reader.needsOCR}
              onClick={() => {
                onEdit({
                  ...blank(reader.course),
                  source: {
                    kind: "course",
                    label: reader.title,
                    reference: reader.title,
                    materialId: reader.id,
                  },
                });
                setReader(null);
              }}
            >
              Create a question from this source <Plus size={16} />
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
