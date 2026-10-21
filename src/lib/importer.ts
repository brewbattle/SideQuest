import Papa from "papaparse";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  questionSchema,
  type CourseId,
  type Material,
  type Question,
} from "./model";
const MAX_SIZE = 20 * 1024 * 1024;
export function parseQuestions(value: unknown): Question[] {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "questions" in value
      ? (value as { questions: unknown }).questions
      : null;
  if (!Array.isArray(items) || items.length === 0 || items.length > 1000)
    throw Error(
      "Provide an array of 1–1,000 questions, or an object with a questions array.",
    );
  return items.map((raw, i) => {
    try {
      const q = questionSchema.parse(raw);
      return {
        ...q,
        id: crypto.randomUUID(),
        source: { ...q.source, kind: "course" as const },
        reviewed: false,
        examId: undefined,
      };
    } catch (e) {
      throw Error(
        `Question ${i + 1}: ${e instanceof Error ? e.message : "Invalid content"}`,
      );
    }
  });
}
export function parseCSV(text: string): Question[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length) throw Error(`CSV: ${parsed.errors[0].message}`);
  const raw = parsed.data.map((r, i) => {
    let options: unknown = [];
    if (r.options) {
      try {
        options = JSON.parse(r.options);
      } catch {
        options = r.options
          .split("|")
          .map((text, j) => ({ id: String(j), text: text.trim() }));
      }
    }
    return {
      id: `row-${i}`,
      course: r.course,
      topic: r.topic,
      concept: r.concept || r.topic,
      type: r.type || "choice",
      title: r.title || r.topic,
      prompt: r.prompt,
      options,
      answer: r.type === "numeric" ? Number(r.answer) : r.answer,
      explanation: r.explanation,
      misconception: r.misconception || "",
      difficulty: Number(r.difficulty || 1),
      source: {
        kind: "course",
        label: r.source || "",
        reference: r.sourceReference || "",
        locator: r.locator || "",
      },
      reviewed: false,
      ...(r.imageUrl
        ? {
            image: {
              url: r.imageUrl,
              alt: r.imageAlt,
              credit: r.imageCredit,
              building: r.imageBuilding,
              sourceUrl: r.imageSource,
              verified: r.imageVerified === "true",
            },
          }
        : {}),
      ...(r.graph ? { graph: JSON.parse(r.graph) } : {}),
      ...(r.transaction ? { transaction: JSON.parse(r.transaction) } : {}),
      ...(r.matches ? { matches: JSON.parse(r.matches) } : {}),
    };
  });
  return parseQuestions(raw);
}
export async function importFile(
  file: File,
  course: CourseId,
): Promise<{ questions: Question[]; material?: Material }> {
  if (file.size > MAX_SIZE)
    throw Error(
      "Files must be smaller than 20 MB. Split larger course packs into readings.",
    );
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json")
    return { questions: parseQuestions(JSON.parse(await file.text())) };
  if (ext === "csv") return { questions: parseCSV(await file.text()) };
  let text = "",
    needsOCR = false;
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    if (pdf.numPages > 300) {
      await pdf.destroy();
      throw Error("Please split PDFs longer than 300 pages.");
    }
    const pages: string[] = [];
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const line = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        pages.push(`[Page ${i}]\n${line}`);
        if (line.trim().length < 30) needsOCR = true;
      }
    } finally {
      await pdf.destroy();
    }
    text = pages.join("\n\n");
  } else if (["txt", "md", "markdown"].includes(ext || "")) {
    text = await file.text();
  } else throw Error("Choose text, Markdown, JSON, CSV, or a text-based PDF.");
  if (text.length > 2000000)
    throw Error("Extracted text is too large; split this material.");
  if (!text.trim()) throw Error("This file has no readable text.");
  return {
    questions: [],
    material: {
      id: crypto.randomUUID(),
      course,
      title: file.name,
      text,
      added: Date.now(),
      kind:
        ext === "pdf"
          ? "pdf"
          : ["md", "markdown"].includes(ext || "")
            ? "markdown"
            : "text",
      needsOCR,
    },
  };
}
