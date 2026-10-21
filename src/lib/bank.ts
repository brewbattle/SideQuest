import { questionSchema, type CourseId, type Question } from "./model";
const source = {
  kind: "demo" as const,
  label: "SideQuest original practice",
  reference:
    "General concept demonstration. Not checked against Ali’s syllabus, readings, or next exam.",
};
let id = 0;
function q(
  course: CourseId,
  topic: string,
  concept: string,
  partial: Partial<Question> &
    Pick<Question, "title" | "prompt" | "answer" | "explanation">,
): Question {
  return questionSchema.parse({
    id: `demo-${++id}`,
    course,
    topic,
    concept,
    type: "choice",
    options: [],
    difficulty: 1,
    misconception: "",
    source,
    reviewed: false,
    ...partial,
  });
}
const opts = (...texts: string[]) =>
  texts.map((text, i) => ({ id: String(i), text }));
export const demos: Question[] = [
  q("ECON110", "Supply & demand", "demand-shifts", {
    type: "graph",
    title: "A new favorite",
    intro:
      "A demand curve shows how much buyers want at each price. A change in tastes can move the whole curve.",
    prompt:
      "A popular athlete wears a particular sneaker. More people want it at every price. Move the demand curve.",
    answer: "right",
    graph: {
      curve: "demand",
      shift: "right",
      xLabel: "Quantity of sneakers",
      yLabel: "Price ($)",
    },
    explanation:
      "Greater willingness to buy at each price shifts demand to the right. With an unchanged upward-sloping supply curve, the new equilibrium price and quantity rise.",
    misconception:
      "A higher price alone moves you along a demand curve. A change in popularity moves the curve itself.",
  }),
  q("ECON110", "Supply & demand", "demand-shifts", {
    title: "The trend cools down",
    prompt:
      "A clothing trend fades. At every price, fewer buyers want those hoodies. With supply unchanged, what happens to equilibrium?",
    options: opts(
      "Price falls; quantity falls",
      "Price rises; quantity falls",
      "Price falls; quantity rises",
    ),
    answer: "0",
    explanation:
      "Demand shifts left. The new intersection with supply has both a lower price and a lower quantity.",
    misconception:
      "The demand shift changes both the price and the quantity traded; it is not a movement along the original demand curve.",
  }),
  q("ECON110", "Supply & demand", "supply-shifts", {
    type: "graph",
    title: "A shipping shortcut",
    intro:
      "Supply describes what sellers offer at each price. Lower production or delivery costs can increase supply.",
    prompt:
      "A cheaper shipping method reduces sellers’ costs. Move the supply curve to show the change.",
    answer: "right",
    graph: {
      curve: "supply",
      shift: "right",
      xLabel: "Quantity of goods",
      yLabel: "Price ($)",
    },
    explanation:
      "Lower costs let sellers offer more at each price, shifting supply right. With demand unchanged, equilibrium quantity increases and price decreases.",
    misconception:
      "An increase in supply means a shift right, even though the equilibrium price goes down.",
  }),
  q("ECON110", "Everyday decisions", "opportunity-cost", {
    type: "numeric",
    title: "The real cost of a ticket",
    intro:
      "Opportunity cost includes money spent and the value of the best alternative you give up.",
    prompt:
      "A game ticket costs $20. Going means giving up a shift that would pay $45. Ignoring everything else, what is the total opportunity cost?",
    unit: "$",
    options: opts("20", "45", "65").map((o) => ({ ...o, id: o.text })),
    answer: 65,
    explanation:
      "$20 paid + $45 in forgone earnings = $65. The ticket price alone leaves out the best alternative you give up.",
    misconception: "An opportunity cost does not have to appear on a receipt.",
  }),
  q("ECON110", "Everyday decisions", "opportunity-cost", {
    type: "short",
    title: "One hour, two good options",
    prompt:
      "You have one free hour. You choose basketball over your best alternative, a walk with a friend. What is the opportunity cost? Say it in a sentence, or compare with the model answer.",
    answer: "The value of the walk with your friend that you gave up.",
    explanation:
      "The opportunity cost is the value of your best forgone alternative: the walk with your friend. It is not the sum of every possible activity you could have done.",
  }),
  q("ECON110", "Everyday decisions", "marginal-decisions", {
    title: "One more item?",
    prompt:
      "Your next resale item would bring in $32 and add $24 to your costs. You have spare capacity. What does selling that extra item do to profit?",
    options: opts("Raises it by $8", "Raises it by $32", "Lowers it by $24"),
    answer: "0",
    explanation:
      "The additional benefit is $32 and the additional cost is $24. The net change in profit is +$8. Compare the change caused by this decision.",
    misconception:
      "Revenue is not profit. The extra item brings costs as well as sales.",
  }),
  q("ECON127", "Resale shop", "inventory-purchase", {
    type: "accounting",
    title: "Stock the shelves",
    intro:
      "Buying inventory exchanges one asset for another. Inventory becomes an expense when it is sold.",
    prompt:
      "Buy $220 of shoes for resale, paying cash. What changes right now?",
    transaction: { kind: "purchase", amount: 220 },
    options: opts(
      "Cash −$220; inventory +$220; profit unchanged",
      "Cash −$220; profit −$220",
      "Inventory +$220; revenue +$220",
    ),
    answer: "0",
    explanation:
      "Cash falls $220 and inventory rises $220. Total assets and profit stay the same. Buying merchandise is not yet cost of goods sold.",
    misconception: "Cash leaving the business is not always an expense.",
  }),
  q("ECON127", "Resale shop", "inventory-sale", {
    type: "accounting",
    title: "The first sale",
    prompt:
      "Sell a pair of shoes for $180 cash. The pair cost your shop $100. How much profit does this transaction earn?",
    transaction: { kind: "sale", amount: 180, cost: 100 },
    options: opts("$80", "$180", "$100"),
    answer: "0",
    explanation:
      "Recognize $180 of revenue and $100 of cost of goods sold. Profit rises $80; cash rises $180 and inventory falls $100.",
    misconception: "Sales revenue is not the amount you get to keep as profit.",
  }),
  q("ECON127", "Resale shop", "borrowing", {
    type: "accounting",
    title: "A little working capital",
    prompt:
      "Borrow $300 from a lender and receive the cash. What is the effect?",
    transaction: { kind: "borrow", amount: 300 },
    options: opts(
      "Cash +$300; loan payable +$300; no profit",
      "Cash +$300; revenue +$300",
      "Cash +$300; owner’s capital +$300",
    ),
    answer: "0",
    explanation:
      "The cash is an asset, and the obligation to repay is a liability. Borrowing does not create revenue or profit.",
    misconception: "A cash inflow is not necessarily income.",
  }),
  q("ECON127", "Resale shop", "prepayments", {
    type: "accounting",
    title: "Hold that hoodie",
    intro:
      "Under accrual accounting, receiving money and earning revenue can happen at different times.",
    prompt:
      "A customer pays $150 now for a hoodie you will deliver later. How should you record the payment today?",
    transaction: { kind: "prepayment", amount: 150 },
    options: opts(
      "Cash +$150; unearned revenue +$150",
      "Cash +$150; sales revenue +$150",
      "Cash +$150; inventory −$150",
    ),
    answer: "0",
    explanation:
      "You owe the customer a hoodie, so the prepayment creates a liability (unearned revenue). Revenue is recognized when you satisfy the delivery obligation.",
    misconception:
      "Receiving cash does not prove that revenue has been earned.",
  }),
  q("ECON127", "Resale shop", "operating-expenses", {
    type: "accounting",
    title: "Keep the lights on",
    prompt: "Pay $60 cash for this month’s shop electricity. What changes?",
    transaction: { kind: "expense", amount: 60 },
    options: opts(
      "Cash −$60; profit −$60; equity −$60",
      "Cash −$60; inventory +$60",
      "Cash −$60; liability +$60",
    ),
    answer: "0",
    explanation:
      "The electricity has been used, so it is a current expense. Cash and profit fall $60. Lower profit also reduces equity.",
    misconception:
      "An operating expense reduces equity through profit, not through an owner withdrawal.",
  }),
  q("ECON127", "Resale shop", "inventory-sale", {
    type: "accounting",
    title: "A sale on account",
    prompt:
      "Sell sports equipment for $120 on account; its inventory cost is $70. Which entry is wrong?",
    transaction: { kind: "creditSale", amount: 120, cost: 70 },
    options: opts(
      "Increase cash by $120",
      "Increase accounts receivable by $120",
      "Record cost of goods sold of $70",
    ),
    answer: "0",
    explanation:
      "The customer has not paid yet. Accounts receivable rises $120, not cash. Revenue rises $120 and the inventory cost of $70 is expensed, for $50 profit.",
    misconception: "Accrual revenue can be earned before cash arrives.",
  }),
  q("ECON127", "Resale shop", "prepayments", {
    type: "accounting",
    title: "Delivery day",
    prompt:
      "Deliver a prepaid $150 order. The item cost $80 and is in your inventory. What happens now?",
    transaction: { kind: "fulfill", amount: 150, cost: 80 },
    options: opts(
      "Unearned revenue −$150; profit +$70; cash unchanged",
      "Cash +$150; profit +$150",
      "Unearned revenue +$150; profit unchanged",
    ),
    answer: "0",
    explanation:
      "Delivery earns $150 revenue and releases the $150 liability. Record $80 cost of goods sold. Profit rises $70. Cash was received earlier, so it does not change now.",
  }),
  q("ECON127", "Resale shop", "equipment", {
    type: "accounting",
    title: "A better photo setup",
    prompt:
      "Pay $200 cash for durable shop photography equipment. Ignore depreciation for this transaction. What is the immediate effect?",
    transaction: { kind: "equipment", amount: 200 },
    options: opts(
      "Cash −$200; equipment +$200; profit unchanged",
      "Cash −$200; profit −$200",
      "Revenue +$200; equipment +$200",
    ),
    answer: "0",
    explanation:
      "The equipment provides future benefits, so this purchase exchanges cash for another asset. Depreciation may expense its cost over time; none is recorded in this transaction.",
  }),
  q("PSYC260", "People & situations", "attribution", {
    title: "The late friend",
    intro:
      "An attribution is an explanation for behavior. We can overemphasize personality and overlook the situation.",
    prompt:
      "A friend arrives late. You decide “they’re inconsiderate” before learning their bus broke down. Which idea best fits?",
    options: opts(
      "Overweighting a personal explanation",
      "Cognitive dissonance",
      "Social facilitation",
    ),
    answer: "0",
    explanation:
      "You focused on the person’s character while overlooking a situational cause. A more useful explanation considers both the person and the context.",
    misconception:
      "The mistake is not simply being wrong. It is weighting personal causes too heavily relative to the situation.",
  }),
  q("PSYC260", "People & situations", "attribution", {
    title: "Same behavior, new context",
    prompt:
      "A classmate is unusually quiet during a discussion. Which response best avoids jumping to a personal attribution?",
    options: opts(
      "Ask whether something about the setting made speaking difficult",
      "Decide they are always shy",
      "Assume they dislike the topic",
    ),
    answer: "0",
    explanation:
      "Looking for contextual constraints helps you test a situational explanation rather than treating a single behavior as proof of a stable trait.",
  }),
  q("PSYC260", "Social influence", "conformity", {
    title: "Go with the group?",
    intro:
      "Normative influence involves wanting acceptance. Informational influence involves treating others as evidence about what is correct.",
    prompt:
      "In a hypothetical experiment, a participant privately knows the answer but publicly agrees with the group to avoid looking different. Which explanation best fits?",
    options: opts(
      "Normative social influence",
      "Informational social influence",
      "A change in sensory ability",
    ),
    answer: "0",
    explanation:
      "The participant wants social acceptance despite privately holding a different belief. This differs from using others’ judgments as information when uncertain.",
    misconception:
      "Public agreement does not necessarily mean private belief changed.",
  }),
  q("PSYC260", "Social influence", "conformity", {
    title: "What would happen?",
    prompt:
      "Imagine a hypothetical task in which people agree with others because they fear social disapproval. If responses become completely private, what would that explanation predict?",
    options: opts(
      "Less agreement driven by approval-seeking",
      "More pressure to agree publicly",
      "Proof that all conformity disappears",
    ),
    answer: "0",
    explanation:
      "Privacy removes some social cost of disagreeing, so an approval-seeking explanation predicts less conformity. This is a prediction from a hypothetical design, not a reported finding from an assigned study.",
    misconception:
      "A prediction about one mechanism does not establish that every form of conformity disappears.",
  }),
  q("PSYC260", "Reading & evidence", "causal-evidence", {
    type: "match",
    title: "Read like a researcher",
    prompt:
      "Hypothetical reading: volunteers are randomly assigned to a noisy or quiet room. A later memory score is lower in the noisy-room group. Match each part to its role.",
    options: [
      { id: "design", text: "Design" },
      { id: "result", text: "Result" },
      { id: "limit", text: "Limitation" },
    ],
    matches: [
      {
        id: "a",
        left: "Random assignment to room conditions",
        rightId: "design",
      },
      {
        id: "b",
        left: "Lower memory scores in the noisy-room group",
        rightId: "result",
      },
      {
        id: "c",
        left: "Volunteers may differ from the wider population",
        rightId: "limit",
      },
    ],
    answer: '["design","result","limit"]',
    explanation:
      "Assignment describes the design; the score difference is the observed result; the volunteer sample limits generalization. Random assignment helps causal inference but does not make the sample representative. This passage is fictional practice, not an assigned study.",
  }),
  q("PSYC260", "Reading & evidence", "causal-evidence", {
    type: "short",
    title: "Correlation isn’t the whole story",
    prompt:
      "A hypothetical survey links more group participation with higher wellbeing. Why can’t the survey alone show that participation causes wellbeing? Write a thought, or use the model answer.",
    answer:
      "Wellbeing could affect participation, or another variable could affect both. A survey association alone does not isolate a causal effect.",
    explanation:
      "Reverse causation and third variables are plausible alternatives. Explain which alternative mechanism could produce the same association before making a causal claim.",
  }),
  q("ARHA244", "Visual reading toolkit", "visual-evidence", {
    title: "Show your evidence",
    intro:
      "A strong visual argument connects a specific visible feature to a claim, then explains why that feature matters.",
    prompt:
      "Which note would make the strongest starting point for a visual comparison? No assigned buildings are shown in this practice exercise.",
    options: opts(
      "Both façades repeat columns, but one creates a deeper shadow at the entrance",
      "Both buildings feel important",
      "The buildings are old, so they have the same purpose",
    ),
    answer: "0",
    explanation:
      "The first note names visible features and a meaningful difference that can be checked against images. It provides evidence for an argument without guessing a date, architect, or function.",
    misconception:
      "An impression or an age-based assumption is not a specific visual observation.",
  }),
  q("ARHA244", "Visual reading toolkit", "visual-evidence", {
    type: "short",
    title: "Look, then interpret",
    prompt:
      "Before identifying a building’s period from a photograph, name two visible details you would inspect. No building identification is being made here.",
    answer:
      "For example: the shapes of arches or openings, the structure of supports, façade organization, materials, and the relationship of plan to exterior.",
    explanation:
      "Start with observable evidence. A period or attribution needs support from your course sources and the actual building. A generic visual resemblance alone does not verify an identification.",
  }),
  q("ARHA244", "Visual reading toolkit", "architectural-drawings", {
    title: "Choose your lens",
    prompt:
      "You want to compare how rooms connect and how a visitor moves through a building. Which kind of drawing is the most direct starting point?",
    options: opts(
      "A plan",
      "A front elevation",
      "A close-up of a decorative detail",
    ),
    answer: "0",
    explanation:
      "A plan represents the horizontal arrangement of spaces and circulation. An elevation shows a vertical face; a detail image helps with a specific feature. This is general vocabulary practice, not assigned-building coverage.",
  }),
  q("ARHA244", "Visual reading toolkit", "architectural-drawings", {
    type: "match",
    title: "Three ways of looking",
    prompt:
      "Match each general architectural drawing to what it helps you see. Assigned-building image games unlock when you import verified images.",
    options: [
      { id: "plan", text: "Plan" },
      { id: "elevation", text: "Elevation" },
      { id: "section", text: "Section" },
    ],
    matches: [
      { id: "a", left: "Horizontal arrangement of rooms", rightId: "plan" },
      { id: "b", left: "A vertical exterior face", rightId: "elevation" },
      {
        id: "c",
        left: "An imagined vertical cut through interior spaces",
        rightId: "section",
      },
    ],
    answer: '["plan","elevation","section"]',
    explanation:
      "Plans describe horizontal organization, elevations represent faces, and sections reveal vertical spatial relationships. These views answer different questions about a building.",
  }),
];
