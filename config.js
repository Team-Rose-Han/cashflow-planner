// ============================================================
//  Cashflow Planner — settings Rose's team can edit safely
//  Everything in this file is words and lists. No logic lives here.
// ============================================================
window.PLANNER_CONFIG = {
  brand: "30 Minute Money",
  toolName: "Cashflow Planner",
  tagline: "Decide where every dollar of your take-home pay goes, and get the exact amounts to plug into your Money Flywheel Map.",

  // ---- Gate -------------------------------------------------
  // Same access code as the Money Flywheel Mapper. Change it by hashing a new code:
  //   printf 'NEWCODE' | shasum -a 256      (Mac terminal)
  // The code is compared in UPPERCASE, so "freedom" and "FREEDOM" both work.
  accessCodeHash: "ecdee7b6d15473195b595217a51932ca794692632c77bb37059209c4e82e02fb",

  // When the tool is embedded (iframe) on one of these hosts, no code is asked.
  allowedEmbedHosts: ["programs.rosehan.com", "rosehan.com", "circle.so"],

  // ---- Links --------------------------------------------------
  // Leave a url empty and the link disappears.
  links: {
    // The Financial Goal Selector opens INSIDE the Planner (a modal) once a url is set, so
    // nothing the member typed is lost. The monthly Financial Goals amount is appended as
    // ?monthly=1296&embed=1. When the member picks a goal, the Selector sends it back with
    //   window.parent.postMessage({ goalSelected: "Emergency fund" }, "*")
    // and the Planner fills in the goal field and closes the modal.
    goalSelector: { label: "Pick my goal with the Financial Goal Selector", url: "" },
  },
  // Printed in the plan's Financial Goals row when the goal is left blank.
  goalPlaceholder: "To be chosen in the Financial Goal Selector",

  // ---- The accounts -------------------------------------------
  // Name and type match the boxes on the Money Flywheel map. "what" is the one-line
  // reminder shown on that bucket's screen (and under Spending on the balance screen).
  // Spending for couples is split into two accounts automatically, one per partner.
  hub: { name: "Hub", type: "Checking" },
  buckets: {
    bills: {
      name: "Bills", type: "Checking",
      what: "If you couldn't get out of bed for a month, what would still get charged?",
    },
    spending: {
      name: "Spending", type: "Checking",
      what: "Your day-to-day money: groceries, gas, Ubers, parking meters, shopping, eating out, fun. Whatever lands here is yours to spend, 100% guilt-free.",
    },
    upcoming: {
      name: "Upcoming", type: "Savings",
      what: "Big, lumpy, slightly unpredictable expenses that Spending can't absorb: Christmas presents, the spontaneous girls trip, major dental work you've been meaning to get done. You know they're coming, you just don't know when. Set a little aside every month so the money's there.",
    },
    goals: {
      name: "Financial Goals", type: "Savings",
      what: "Everything left after Bills, Spending and Upcoming. It flows to the one goal you're on right now.",
    },
  },

  // ---- The question at the top of each screen --------------------
  // {hub} becomes "Personal Hub" or "Household Hub".
  questions: {
    income: "What will land in your {hub} every month?",
    bills: "What are all your Bills?",
    spending: "How much goes to Spending each month?",
    upcoming: "What are you setting aside for in Upcoming?",
    balance: "What do you have left to put towards Financial Goals?",
  },
  // The reminder box under the Income question. The buckets above cover the other screens.
  hubWhat: "Your Hub is where all your income lands before it gets split into BILLS, SPENDING, UPCOMING and FINANCIAL GOALS. List each steady source of take-home pay.",

  // ---- Short tips under each question (leave "" to hide) --------
  tips: {
    income: "Use take-home pay (what actually lands in your account), not your gross salary.",
    bills: "To find them all: scroll through the last two months of bank and credit card statements, open the subscriptions list on your phone (App Store or Google Play), and search your email for \"renewal\" to catch the yearly ones.",
    spending: "Pick a number you can actually live on. If it's too tight you'll raid the other accounts; if it's too loose, nothing reaches your goals.",
    upcoming: "Here are two easy ways to find your number: 1) Walk through the next 12 months of your calendar and name the big events (trips, holidays, weddings, car registration). 2) Use the search function in your credit card transactions to filter for any charge over $500 that wasn't a bill.",
    balance: "Whatever is left after Bills, Spending and Upcoming is what goes to Financial Goals every month.",
    plan: "",
  },

  // ---- Bills on a credit card -------------------------------------
  // Shown under the Bills list once any bill is marked "Credit card".
  cardNote: "Bills marked as being paid from your \"Credit card\" are added up into one Credit card auto-pay line, paid from your Bills account once a month. Each bill is only counted once.",

  // ---- Quick-add suggestions ------------------------------------
  // Clicking one adds a row with the name filled in. Edit freely.
  incomeSuggestions: [
    "Take-home paycheck", "Partner's take-home paycheck", "Pay from my business",
    "Rental income", "Social security or pension income", "Child support", "Other steady income",
  ],
  // Groups appear in this order. A group with "freq" starts its rows at that cadence.
  billSuggestions: [
    { group: "Housing", items: ["Rent / Mortgage", "HOA dues", "Property tax"] },
    { group: "Utilities", items: ["Electric", "Gas", "Water", "Sewer", "Trash", "Internet", "Cell phone"] },
    { group: "Transportation", items: ["Car payment", "Car registration"] },
    { group: "Insurance", items: ["Health insurance", "Car insurance", "Home / renters insurance", "Life insurance", "Disability insurance", "Pet insurance", "Umbrella insurance", "Phone / device insurance"] },
    { group: "Health", items: ["Prescriptions", "Medical payment plan", "Wellness memberships (sauna, massage)", "Health tracking (Oura, Whoop)", "Fertility / egg storage"] },
    { group: "Debt payments", items: ["Credit card auto-pay", "Student loans", "Personal loan", "Buy now, pay later", "IRS / tax payment plan", "Family loan repayment"] },
    { group: "Family & home", items: ["Daycare", "Tuition", "Kids' activities & sports"] },
    { group: "Subscriptions", items: ["Streaming", "Music", "Gym", "Meal delivery", "Cloud storage", "Software & apps", "Supplements", "Memberships"] },
    { group: "Once a year", freq: "yearly", items: ["Credit card annual fee", "Car registration", "Amazon Prime", "Costco membership"] },
  ],
  // Each chip carries a prompt that appears in the amount field, so members fill in a
  // multiplication instead of guessing a yearly total.
  upcomingSuggestions: [
    { name: "Travel", hint: "2 trips × $1,500" },
    { name: "Christmas presents", hint: "8 people × $75" },
    { name: "Birthdays", hint: "6 people × $50" },
    { name: "Weddings", hint: "2 weddings × $600" },
    { name: "Car tires & repairs", hint: "$800" },
    { name: "Dental work", hint: "$1,200" },
    { name: "Vet bills", hint: "$500" },
    { name: "Clothing", hint: "4 seasons × $200" },
    { name: "Home repairs", hint: "$1,000" },
    { name: "New phone / laptop", hint: "$1,000" },
  ],
  // The suggested Upcoming transfer is the list's monthly total rounded UP to this.
  upcomingRoundTo: 50,
  // Words on the Upcoming screen's "your number" box.
  upcomingBox: {
    title: "Your Upcoming number",
    sub: "This is the one fixed amount that goes into the UPCOMING account every month. You don't track every item in here; it's a general cushion, and Spending absorbs the occasional shortfall.",
    stuckLabel: "Stuck? Start at 5% of take-home",
    stuckNote: "Started at 5% of take-home. Adjust whenever.",
  },
  // The "stuck" button sets the transfer to this share of take-home pay, rounded up.
  upcomingStuckShare: 0.05,
  goalSuggestions: [
    "Emergency fund", "Pay off credit cards", "General savings", "Roth IRA",
    "House down payment", "Pay off student loans", "Investing",
  ],

  // ---- How often a row happens ------------------------------------
  // "income" and "expense" are how many times a month it counts, on purpose
  // conservative: paychecks round down, bills round up. "note" is written into the
  // Notes column of the plan when the row is not monthly.
  cadence: {
    weekly:      { label: "Every week",     income: 4,      expense: 52 / 12, note: "every week" },
    biweekly:    { label: "Every 2 weeks",  income: 2,      expense: 26 / 12, note: "every 2 weeks" },
    semimonthly: { label: "Twice a month",  income: 2,      expense: 2,       note: "twice a month" },
    monthly:     { label: "Every month",    income: 1,      expense: 1,       note: "" },
    quarterly:   { label: "Every 3 months", income: 1 / 3,  expense: 1 / 3,   note: "every 3 months" },
    halfyear:    { label: "Every 6 months", income: 1 / 6,  expense: 1 / 6,   note: "every 6 months" },
    yearly:      { label: "Every year",     income: 1 / 12, expense: 1 / 12,  note: "every year" },
  },
  // Which cadences each list offers, in order.
  cadenceFor: {
    income: ["weekly", "biweekly", "semimonthly", "monthly", "yearly"],
    bills:  ["monthly", "weekly", "biweekly", "quarterly", "halfyear", "yearly"],
  },

  footnote: "This tool teaches Rose's money system. It is education, not personalized financial, tax or legal advice.",
};
