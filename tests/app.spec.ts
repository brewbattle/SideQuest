import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { demos } from "../src/lib/bank";
import { freshState } from "../src/lib/model";
async function solve(page: Page, wrong = false) {
  const title = await page.locator(".question-title").textContent();
  const q = demos.find((q) => q.title === title)!;
  expect(q).toBeTruthy();
  if (q.type === "graph") {
    await page
      .getByRole("button", {
        name: `Shift ${wrong ? (q.answer === "left" ? "right" : "left") : q.answer}`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Lock it in" }).click();
  } else if (q.type === "short") {
    await page
      .getByRole("button", { name: "Compare with the model answer" })
      .click();
    await page
      .getByRole("button", {
        name: wrong ? "Still learning" : "Got the idea",
        exact: true,
      })
      .click();
  } else if (q.type === "numeric") {
    await page.getByLabel("Your answer").fill(wrong ? "0" : String(q.answer));
    await page.getByRole("button", { name: "Check", exact: true }).click();
  } else if (q.type === "match") {
    for (const m of q.matches!)
      await page
        .getByLabel(`Match: ${m.left}`, { exact: true })
        .selectOption(
          wrong ? q.options.find((o) => o.id !== m.rightId)!.id : m.rightId,
        );
    await page.getByRole("button", { name: "Connect them" }).click();
  } else {
    const option = q.options.find((o) =>
      wrong ? o.id !== q.answer : o.id === q.answer,
    )!;
    await page
      .locator(".answer-option")
      .filter({ hasText: option.text })
      .click();
  }
  await expect(page.locator(".answer-feedback")).toBeVisible();
  return q;
}
async function readSave(page: Page) {
  return page.evaluate(async () => {
    const req = indexedDB.open("keyval-store");
    return new Promise<any>((resolve, reject) => {
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const r = db
          .transaction("keyval")
          .objectStore("keyval")
          .get("sidequest-v1");
        r.onsuccess = () => {
          resolve(r.result);
          db.close();
        };
        r.onerror = () => reject(r.error);
      };
    });
  });
}
test("a varied playable quest scores, explains, saves and resumes across visits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Hey Ali/ })).toBeVisible();
  await page.getByRole("button", { name: "Just Play", exact: true }).click();
  const formats = new Set<string>();
  for (let i = 0; i < 8; i++) {
    const q = await solve(page, i === 1);
    formats.add(q.type);
    if (i === 0) {
      await page
        .getByText("Source & answer reasoning", { exact: true })
        .click();
      await expect(
        page.getByText(q.source.reference, { exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Next little challenge" }).click();
  }
  expect(formats.size).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Save & leave" }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readSave(page))?.active?.results.length)
    .toBe(8);
  const saved = await readSave(page);
  expect(saved.xp).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  expect(await page.locator(".game-index").textContent()).toBe("9 of 24");
  await page.getByRole("button", { name: "Finish here", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nice little side quest, Ali." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "That’s enough for now" }).click();
  await expect
    .poll(async () => (await readSave(page))?.history?.length)
    .toBe(1);
  expect(errors).toEqual([]);
});
test("the resale shop updates statements and keeps the accounting equation balanced", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".course-card").filter({ hasText: "ECON 127" }).click();
  for (let i = 0; i < 8; i++) {
    await solve(page);
    const numbers = await page.locator(".ledger-grid strong").allTextContents();
    const n = numbers.map((s) => Number(s.replace(/[^\d-]/g, "")));
    expect(n[3]).toBe(n[4] + n[5]);
    await page.getByText("See financial statements", { exact: false }).click();
    await expect(
      page.getByText("Income statement · shop to date"),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 7 ? "Finish quest" : "Next little challenge",
        exact: true,
      })
      .click();
  }
  await expect(page.getByText("XP earned", { exact: true })).toBeVisible();
  const saved = await readSave(page);
  expect(saved.active.results).toHaveLength(8);
  expect(saved.active.ledger.cash).toBe(950);
  expect(saved.active.ledger.revenue - saved.active.ledger.expenses).toBe(140);
});
test("exam play stays gated until source-backed questions and next-exam coverage are reviewed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exam prep", exact: true }).click();
  await page.getByRole("button", { name: "Just Play", exact: true }).click();
  await expect(page.getByText(/No reviewed questions match/)).toBeVisible();
  await page
    .getByRole("button", { name: "Open your library", exact: true })
    .click();
  await page.getByRole("button", { name: "Exam scope", exact: true }).click();
  await page
    .locator(".scope-card")
    .filter({ hasText: "ECON 127" })
    .getByRole("button", { name: "Set exam coverage" })
    .click();
  await page.getByLabel("Exam name").fill("Test-only upcoming exam");
  const date = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA");
  await page.getByLabel("Exam date").fill(date);
  await page.getByLabel("Included topics").fill("Inventory");
  await page.getByLabel("I verified this coverage").check();
  await page
    .getByRole("button", { name: "Save exam scope", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Course materials", exact: true })
    .click();
  await page.locator(".inline-label select").selectOption("ECON127");
  const q = {
    ...demos.find((q) => q.title === "Stock the shelves")!,
    title: "Test-only source question",
    topic: "Inventory",
    source: {
      kind: "course",
      label: "Test fixture notes",
      reference: "Test-only notes, p. 1",
    },
    reviewed: true,
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "questions.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([q])),
  });
  await expect(
    page.getByText("Imported 1 file.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Question bank/ }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test-only source question" })
    .click();
  await page
    .getByText(
      "I checked the source, correct answer, image (if any), and this exam’s coverage.",
      { exact: true },
    )
    .click();
  await page
    .getByRole("button", { name: "Save & approve for exam prep" })
    .click();
  await page.getByRole("button", { name: "Let’s play", exact: true }).click();
  await page.getByRole("button", { name: "Just Play", exact: true }).click();
  await expect(page.locator(".question-title")).toHaveText(
    "Test-only source question",
  );
  await expect(
    page.getByText("VERIFIED EXAM PREP", { exact: true }),
  ).toBeVisible();
});
test("text and scanned PDFs import privately and are distinguished", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Your library", exact: true }).click();
  const pdf = await PDFDocument.create();
  const p = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  p.drawText(
    "Test-only course notes: inventory is recorded as an asset when purchased.",
    { x: 40, y: 700, size: 12, font },
  );
  const data = await pdf.save();
  await page.locator("input[type=file]").setInputFiles({
    name: "readable-notes.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(data),
  });
  await expect(
    page.getByText("readable-notes.pdf", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button")
    .filter({ hasText: "readable-notes.pdf" })
    .click();
  await expect(page.locator(".reader pre")).toContainText(
    "inventory is recorded as an asset",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  const scanned = await PDFDocument.create();
  scanned.addPage();
  await page.locator("input[type=file]").setInputFiles({
    name: "scanned.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await scanned.save()),
  });
  await expect(
    page.locator(".material-row").filter({ hasText: "scanned.pdf" }),
  ).toContainText("Needs OCR");
});
test("game and reload work offline after the initial cache, without sending private data", async ({
  page,
  context,
}) => {
  const outbound: string[] = [];
  page.on("request", (req) => {
    if (
      !req.url().startsWith("http://127.0.0.1:3000") &&
      !req.url().startsWith("data:") &&
      !req.url().startsWith("blob:")
    )
      outbound.push(req.url());
  });
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: "Just Play", exact: true }).click();
  await solve(page);
  await page.getByRole("button", { name: "Next little challenge" }).click();
  await context.setOffline(true);
  await solve(page);
  await page.getByRole("button", { name: "Save & leave" }).click();
  await expect
    .poll(async () => (await readSave(page))?.active?.results.length)
    .toBe(2);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  expect(outbound).toEqual([]);
});
test("backups export and restore progress, while malformed backups are rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Customize your avatar" }).click();
  await page.getByRole("button", { name: "lilac avatar color" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  expect((await download).suggestedFilename()).toContain("sidequest-backup");
  const input = page.locator(".preferences input[type=file]");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"xp":99999}'),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid");
  const state = freshState();
  state.xp = 42;
  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await expect(page.getByText("Replace this device’s save?")).toBeVisible();
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(page.locator(".xp-pill")).toHaveText("42 XP");
  await page.reload();
  await expect(page.locator(".xp-pill")).toHaveText("42 XP");
});
test("mobile layout stays within the viewport and core controls work by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".mobile-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Just Play", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A home for your materials." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("desktop rendering and core accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
  ).toEqual([]);
});
