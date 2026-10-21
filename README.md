# SideQuest

Ali’s pocket-sized learning game for ECON 110, ECON 127 (Accounting), PSYC 260 (Social Psychology), and ARHA 244 (European Architecture). React + TypeScript + Vite, with a stateless Express server. No Excel, VBA, or QAC content.

## Run

Node 24.19.0 is pinned in `.node-version` (Node 22–24 is accepted by the package). From this checkout:

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

Vite binds `0.0.0.0:5173`. For production:

```sh
npm run build
npm start
```

The server binds `0.0.0.0:$PORT` (default 3000). `GET /api/health` returns `{"status":"ok","storage":"browser-only","version":"1.0.0"}`. No keys or database are required; see `.env.example`. The browser never contacts an AI service.

## What’s playable

- **Just Play** starts or resumes a mixed, roughly three-minute quest. Custom sessions offer 2, 5, and 10 minutes, class/topic filtering, Learn and Challenge modes. The quest ends when active time or the available question set runs out. The timer pauses on feedback and in a hidden tab. Finish or leave any time.
- Labeled supply/demand curve shifts; numerical puzzles with deterministic answer checking; economic decision scenarios.
- A resale shop with purchases, inventory sales, credit sales, borrowing, prepayments, fulfillment, equipment and expenses. Each transaction preserves assets = liabilities + equity. Financial statements expose the calculations. Starting cash is $800, inventory $400, equipment $300, debt $300, unearned revenue $200, and owner capital $1,000.
- Psychology scenarios, predictions from clearly hypothetical designs, evidence/limitation matching and optional short explanations. No hypothetical result is attributed to a real study.
- General architecture observation and drawing-vocabulary practice. Actual-building image questions require an image of that building, source URL, credit, descriptive alt text and a verified identification. **No generated or substitute building images are included.**
- Concept-level spaced review. Confident correct answers start at a one-day interval, uncertain answers at one hour, and errors at ten minutes. Due concepts are prioritized. Fresh alternate examples return later in the same quest after errors when available. Choices shuffle without changing answer keys.
- Optional sound, sidekick customization, levels and XP. No streaks, energy limits or daily obligations. XP is capped per question per calendar day: 15 for a correct answer, 3 for an incorrect attempt, 8 for a self-reviewed explanation. Correcting a mistake earns only the remaining difference. Repeating taps or ending a session does not generate more XP.
- Report a question, inspect its source/reasoning, and edit it. Reports stay local and exclude that question from future queues. An existing active quest uses a saved question snapshot; edits take effect in the next quest.

## Source availability and next exams

The original `brewbattle/SideQuest` checkout and GitHub remote were empty. No syllabus, reading, notes, assignment, exam guide, or building image was present. After explicit network requests, the linked Drive folder redirects to Google sign-in and the earlier dashboard returns a ChatGPT sign-in requirement (HTTP 401). No authenticated Google or ChatGPT site session is available in the cloud machine, so their course contents could not be read. No Google owner-access notification has been sent. **All 24 bundled challenges are original general-concept sandbox demonstrations. None are verified course coverage.** In particular, the ECON 110 models are not asserted to belong to Ali’s syllabus. There are no claimed assigned readings, quotations, named study results, or building attributions.

The sandbox and exam question bank are separate; they never silently mix. To activate exam prep:

1. Open **Your library → Course materials** and import a syllabus, study guide, reading or notes for the selected class.
2. Open **Exam scope**. Enter the actual next exam’s title, future date, and included topics, one per line. Confirm them against course materials. Past exam dates do not qualify. Changing coverage creates a new scope ID and requires renewed question review.
3. Import structured question drafts (JSON/CSV), or create questions from a saved material. Importing text does not pretend to automatically produce trustworthy questions.
4. Review the question, answer, reasoning, source citation/page, and any image. Match its topic to the exam scope and explicitly approve it.
5. Choose **Exam prep** on Play. Only reviewed, nonreported, in-scope questions for the current upcoming exam enter this pool. An empty pool shows the import route instead of serving past material or substituting sandbox questions.

Approval is a human review assertion, not an automated claim that a document supports an answer. Recheck sources before approving. A server AI generation pipeline is intentionally absent; a future one must remain optional, keep keys server-side and produce unapproved drafts.

## Import and edit content

Text (`.txt`), Markdown and text-based PDF files are extracted **in the browser** into private source materials, not sent to a server. PDF extraction runs in a bundled local worker. Pages with less than 30 extracted characters trigger a **Needs OCR** flag, including mixed scanned/text PDFs. This heuristic can flag sparse title or image pages: inspect the original. Use a trusted local OCR tool, check its output against the original, and re-import. OCR-flagged materials cannot be used to approve questions.

JSON accepts an array of questions or `{ "questions": [...] }`. CSV requires headers; `options` can be a JSON array of `{id,text}` or pipe-separated text (IDs then start at `0`). `answer` references the option ID, not its current screen position. Numeric answers are numbers with numeric quick-answer option IDs. Imported IDs are replaced and approval flags are always cleared. Import validation is atomic per file; if one file in a batch fails, earlier successfully imported files are retained and reported. Maximum 20 MB per import, 1,000 questions per question file, 300 PDF pages, and 2 million extracted characters per material.

Choose **Question template** to download an editable starter. A minimal real-course question looks like:

```json
{
  "id": "will-be-replaced-on-import",
  "course": "ECON127",
  "topic": "Inventory",
  "concept": "inventory-purchase",
  "type": "choice",
  "title": "Your source-backed question title",
  "prompt": "Write a question supported by your actual course material.",
  "options": [
    { "id": "a", "text": "Correct option" },
    { "id": "b", "text": "Plausible misconception" }
  ],
  "answer": "a",
  "explanation": "Explain the reasoning using that material.",
  "misconception": "Explain why the alternative is tempting.",
  "difficulty": 1,
  "source": {
    "kind": "course",
    "label": "Actual reading or notes title",
    "reference": "Citation or HTTPS URL",
    "locator": "Page / section"
  },
  "reviewed": false
}
```

Required structured fields are validated in `src/lib/model.ts`. Supported courses: `ECON110`, `ECON127`, `PSYC260`, `ARHA244`. Types: `choice`, `graph`, `numeric`, `accounting`, `image`, `short`, `match`. Difficulty: 1–3. Optional `intro` supplies the tiny lesson in Learn mode. Additional settings:

- **Graph:** `"graph":{"curve":"demand","shift":"right","xLabel":"Quantity","yLabel":"Price ($)"}`, with `answer: "right"` (or `left`). This renderer supports a single supply or demand curve; other course models need a separate game implementation.
- **Accounting:** `"transaction":{"kind":"sale","amount":180,"cost":100}`. Kinds: `purchase`, `sale`, `creditSale`, `borrow`, `prepayment`, `expense`, `equipment`, `fulfill`, `repay`. A sale/fulfillment needs its inventory `cost`. Human reviewers must check that the prompt, amounts, answer and transaction agree. If the ongoing shop cannot support a transaction, a new round starts at the standard balances (shown before the answer). Use transactions affordable with those initial balances: cash expenses/purchases up to $800, inventory costs up to $400, fulfillment up to $200, and principal repayment up to $300. The validator enforces these limits and at most two decimal places. Larger source-based problems can use the numeric or choice game.
- **Numeric:** a numeric `answer`, optional `tolerance` (default 0.001) and `unit`, and at least two numeric quick options including the answer. No coercion of empty inputs to zero.
- **Short:** a string model `answer`, shown on request. Learners explicitly self-assess; the app does not claim to grade free text semantically. Casual typing is optional, and typed thoughts are not transmitted.
- **Match:** `"matches":[{"id":"a","left":"First idea","rightId":"x"},{"id":"b","left":"Second idea","rightId":"y"}]`, `options` with IDs `x` and `y`, and `answer: "[\"x\",\"y\"]"` in pair order.
- **Image:** `"image":{"url":"https://…","alt":"Visible features without giving away the answer","building":"Verified actual building name","credit":"Photographer / license","sourceUrl":"https://original-image-page…","verified":true}`. An uploaded PNG/JPEG/WebP up to 2 MB becomes a local data URL. For two-building comparisons, add a `comparisonImage` object with the same verified metadata; both actual images are shown. HTTPS remote images are permitted but require a connection, send a request to that image host and may be unavailable offline; use uploads for private/offline play. Source-page links open only when clicked. No source text is rendered as HTML.

CSV fields: `course,topic,concept,type,title,prompt,options,answer,explanation,misconception,difficulty,source,sourceReference,locator`, with optional JSON `graph,transaction,matches` and image fields `imageUrl,imageAlt,imageCredit,imageBuilding,imageSource,imageVerified`. `src/lib/bank.ts` demonstrates each game format, **not verified course content**.

## Persistence, privacy and offline behavior

IndexedDB stores a versioned, validated snapshot: progress by concept, per-question XP awards, preferences, sources, reports, question drafts, exam scopes, history and the active session. Writes serialize so old snapshots cannot overtake new ones. Course packs are stored separately from the frequently updated session; content changes commit atomically with progress. Sessions are capped at 100 questions. Storage failures are visible; an unreadable save is preserved rather than silently overwritten. Backups are JSON, validated before restore and require explicit replacement confirmation. Export/import in **Make it yours** moves data across devices or deployment domains. A backup contains your personal materials: keep it private. Browser storage can be cleared or evicted, so backups matter. There is no server sync or account security boundary; someone using the same browser profile can access its data.

A production service worker precaches only this app’s static shell, bundled fonts, question bank and PDF worker. Personal IndexedDB content is not in its cache. After the first successful load/cache, reload and core play work offline. An open session does not call the backend each turn and remains playable if the network drops. External course images need network access unless uploaded locally. Cached revisits fall back to the app shell within about 1.8 seconds when the server is slow or returns an error. Initial visits still require the server; on Render Free a cold start uses Render’s loading page. The frontend has no server connection handshake that blocks gameplay. Dev mode does not register the production service worker.

## Checks

```sh
npm run check
npm test
npm run build
npm run test:e2e
```

Playwright uses system Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` to another installed executable when needed. It starts the production server, or reuses one already at port 3000. Browser checks cover complete gameplay/scoring, balanced accounting and statements, source/exam approval, actual PDF extraction and OCR flags, backups, offline reload, mobile layout, keyboard controls and WCAG AA automated checks. Vitest covers domain calculations, content validation/source separation, adaptive scheduling, shuffled answer mapping, XP idempotence and backup schemas. Automated accessibility checks supplement keyboard/mobile testing; they do not certify all assistive-technology behavior.

## Deploy on Render

Current Render documentation was read on **October 21, 2026**:

- [Node/Express deployment](https://render.com/docs/deploy-node-express-app)
- [Web-service port binding](https://render.com/docs/web-services): listen on `0.0.0.0` and `process.env.PORT`.
- [Node versions](https://render.com/docs/node-version): pin with `NODE_VERSION`, `.node-version`, or bounded `engines`.
- [Persistent disks](https://render.com/docs/disks): default filesystems are ephemeral; persistence requires an attached paid-service disk under its mount path.
- [Free service limits](https://render.com/docs/free): web services spin down after 15 idle minutes; startup can take about a minute. Free services cannot attach persistent disks.
- [Blueprint specification](https://render.com/docs/blueprint-spec).

`render.yaml` defines a Node web service, a lockfile install including build tools, production build, `npm start`, pinned Node version, and `/api/health`. It needs **no secrets, database, uploads directory or persistent disk**. The Node server only serves public application assets. Nothing personal should be committed to this public app repository.

1. The implementation is published on `main` at [brewbattle/SideQuest](https://github.com/brewbattle/SideQuest). Keep private course materials out of Git.
2. Open [Deploy SideQuest on Render](https://render.com/deploy?repo=https://github.com/brewbattle/SideQuest), sign in, connect the repository if prompted, and apply `render.yaml` from `main`. The Blueprint uses the free plan. Choose a unique service name if `sidequest` is taken.
3. When deployment succeeds, open the service’s actual `onrender.com` URL. Confirm `/api/health`, complete a sandbox question, reload, and verify progress is retained. Import a device backup if moving from a local preview.
4. Add real course sources and confirm the next exam scope in your own browser. These never need to enter Render.

**No Render credentials or authenticated Render deployment integration were available in this workspace. No deployment has been created and no public URL is claimed.** GitHub publication is complete. The remaining step is account authorization and applying this Blueprint in your Render account. The official Render CLI v2.30.0 was installed and verified against its release SHA-256, but its device-grant request was blocked by the cloud network proxy (CONNECT 403). For agent-driven deployment, permit `api.render.com` and provide `RENDER_API_KEY` through secure environment settings, never through chat or Git. No API key is required by the application itself. An optional always-on paid instance avoids Free cold starts; it does not change the browser-only storage model. A future sync feature must use authenticated durable storage such as managed Postgres, never the service’s ephemeral filesystem.
