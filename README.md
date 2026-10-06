# Cashflow Planner

A members-only tool for the 30 Minute Money community. Members list what lands in
their Hub and what comes out of each bucket, and the tool gives them their version
of Rose's Cashflow Plan spreadsheet plus the exact monthly numbers for the arrows on
their Money Flywheel map.

Static site: no server, no database, no monthly cost beyond hosting. Same look,
gate and deploy as the Money Flywheel Mapper.

## One job

| Tool | Job | Status |
|---|---|---|
| **Money Flywheel Mapper** | Which accounts to open, and the map of how money flows between them | Built |
| **Cashflow Planner** (this folder) | The list of expenses, and the four monthly transfers out of the Hub that use up every dollar of take-home pay | Built |
| **Financial Goal Selector** | The one goal the Financial Goals account funds right now | Next |

The Planner assumes the four buckets already exist (Bills, Spending, Upcoming,
Financial Goals). It does not teach what each is for beyond a one-line reminder on
each screen; the live training does that.

## The flow, one screen at a time

1. **You.** First name. Then "Who is this plan for?": just me, or me and my partner
   (shared accounts). A partner gets their own name and their own Spending account,
   exactly like the Mapper's couple maps.
2. **Income.** What will land in the Hub each month. Each row: name, when, amount
   and how often (every week, every 2 weeks, twice a month, monthly, yearly). The
   tool converts everything to a monthly number. Quick-add chips: take-home
   paycheck, partner's paycheck, pay from my business, rental income, child support.
3. **Bills.** Rose's definition sits at the top ("if you couldn't get out of bed
   tomorrow, what would still get charged next month?"). Quick-add chips are grouped
   (housing, utilities, transportation, insurance, debt, family & home,
   subscriptions, once a year). Yearly, quarterly and weekly bills are converted to
   monthly and the plan notes the real charge ("$95.00 every year"). Each bill has a
   **Paid from** choice: Bills account, or Credit card. Card charges are added up
   into one **Credit card auto-pay** line with its own due date, and the plan lists
   the individual charges under it in grey, like Rose's sheet. Nothing is counted
   twice. Every bill needs its "When" (and the card line its due date) before
   Continue works; missing ones turn coral.
4. **Spending.** One monthly amount (two for couples, one per partner), with the
   weekly equivalent shown underneath and a running "what's left after Bills" line.
   If Spending is more than what is left after Bills, the line turns coral and
   Continue refuses until it is lowered.
5. **Upcoming.** A general cushion, not a ledger. The list is a thinking aid: each
   row is what for and roughly how much per year, divided by 12. Under it, one
   fixed number, **Your Upcoming transfer**, prefilled with the list's monthly total
   rounded up to the next $50 and editable. That fixed number is what goes on the
   map; the list can be skipped entirely. Same over-budget check as Spending.
6. **Financial Goals.** "What do you have left to put towards Financial Goals?"
   The tracker shows all four buckets against take-home pay. Bills and Upcoming
   link back to their lists, Spending is editable in place, and Financial Goals is
   always whatever is left. If the plan is over, the Financial Goals row turns
   coral, the bar shows a striped overflow segment, and "See my map" refuses until
   Spending, Upcoming or Bills are trimmed. The member names the one financial goal
   the money goes to (free text, with chips), or picks it in the **Financial Goal
   Selector**, which opens inside the Planner as a modal (see below) so nothing
   typed so far is lost.
7. **Your map.** "<Name>'s Updated Money Flywheel Map": the map drawn with this
   plan's numbers on the arrows (Paycheck → Hub, Hub → Bills, Spending, Upcoming,
   Financial Goals), a donut of how take-home pay is split (name, amount and share
   on hover), then the spreadsheet: Account | Expense | Date | Amount | Monthly
   total, one block per account, with a footer that shows take-home pay and the
   amount assigned (100% ✓). The CSV keeps a "% of take-home" column. Each box on
   the map has a bank and last-four field, like the Mapper's final map; typing the
   bank once fills the empty boxes (same bank for every personal account), and the
   labels print as "Capital One *2948" on the map, in the table and in the CSV. Details such as "$730.00 every year" or the goal name
   sit in small grey type under the expense name. Each account has a bank and
   last-four field, printed on the map and the table as "Capital One *2948".

Buttons on the plan: **Download as PNG** (the tiles and table as one image),
**Download spreadsheet (CSV)** (opens in Excel, Numbers or Google Sheets),
**Copy for Google Sheets** (tab-separated text: open a blank sheet, click A1,
paste) and **Print**.

Everything is saved in the member's browser only, so they can come back and
adjust. "Start over" asks for a second click before erasing.

## The math

- Every row is converted to a monthly number. Paychecks round **down** (every week
  = 4 a month, every 2 weeks = 2 a month; the extra paychecks in a year are bonus
  rounds). Bills round **up** (every week = 52/12, every 2 weeks = 26/12). The
  factors live in `config.js` under `cadence`.
- Upcoming: each item is a yearly estimate divided by 12. The suggested transfer is
  the list total rounded up to `upcomingRoundTo` (default $50). If the member types
  their own number, that number is used until they clear it or click "Use the
  suggestion". The plan shows one bold "Upcoming cushion" line with the items
  under it in grey as what it roughly covers.
- Bills marked Credit card are summed into the Credit card auto-pay line; the Bills
  total counts each bill once.
- Financial Goals = take-home pay − Bills − Spending − Upcoming. The four buckets
  therefore always add up to take-home pay. A negative remainder blocks the plan.
- Every amount is a whole dollar, rounded **up** at the row level ($730 a year is
  $61 a month), so totals are whole dollars too and the four buckets still add up
  to take-home pay exactly.
- Percentages are shares of monthly take-home pay into the Hub, shown with two
  decimals like Rose's sheet (88.04%).

## Plugging in the Financial Goal Selector

Paste the Selector's URL into `links.goalSelector.url` in `config.js`. A coral
button then appears under the goal field on the Financial Goals screen. It opens
the Selector in a modal inside the Planner, with the monthly Financial Goals
amount in the URL (`?monthly=1539&embed=1`). The Selector hands the choice back with

```js
window.parent.postMessage({ goalSelected: "Emergency fund" }, "*");
```

and the Planner fills in the goal field, closes the modal, and the member carries
on. Nothing they typed is touched. Two things the Selector needs: a `?embed=1`
mode that skips its own gate (or lists the Planner's host in its
`allowedEmbedHosts`), and that one `postMessage` when a goal is chosen.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `config.js` | Access code, allowed embed hosts, every question and reminder, tips, quick-add suggestions and their groups, cadence factors, footnote | Rose's team |
| `plan.js` | The math: monthly conversion, totals, the arrow numbers, the plan table, CSV / TSV export | Cez |
| `app.js` | The screens: questions, list editors, balance check, plan, PNG export, gate | Cez |
| `styles.css` | Look and feel (white / navy / coral, Poppins + Lato). The four bucket colors are the `--c-*` tokens at the top | Cez |
| `logo.png` | The 30 Minute Money logo | Rose's team |
| `index.html` | Page shell | Cez |

## Deploy (about five minutes, no code)

1. Go to https://app.netlify.com/drop and drag this whole folder onto the page.
2. Netlify gives you a URL like `https://something.netlify.app`. Rename the site in
   Site settings, or add a custom domain (Domain management → Add domain, then one
   CNAME record).
3. Every later change: drag the folder again, or connect the folder to a Git repo.

Cloudflare Pages and Vercel work the same way.

## Put it inside Circle (custom page)

```html
<div style="max-width:1180px;margin:0 auto">
  <iframe id="planner" src="https://YOUR-URL-HERE/" title="Cashflow Planner"
    style="width:100%;height:1600px;border:0;border-radius:16px;background:#ffffff"
    allow="clipboard-write" loading="lazy"></iframe>
</div>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.plannerHeight) {
      document.getElementById("planner").style.height = (e.data.plannerHeight + 40) + "px";
    }
  });
</script>
<p style="font-size:13px;color:#6b6661">On the phone app, or if the tool doesn't load,
  <a href="https://YOUR-URL-HERE/" target="_blank" rel="noopener">open it full screen</a>
  and use the access code <b>FREEDOM</b>.</p>
```

If Circle strips the `<script>` part, the iframe keeps a fixed height and scrolls
inside itself; raise the `height` value if the bottom of the plan is cut off.
Restrict the page to the spaces or access groups that should see it.

## How the gate works

Same as the Mapper: embedded on an allowed host (`allowedEmbedHosts`) it asks for
nothing; opened directly it asks for the access code once and remembers the unlock
in that browser (the unlock is shared with the Mapper when both tools are on the
same domain). The page is marked `noindex`. To change the code, run
`printf 'NEWCODE' | shasum -a 256` and paste the result into `accessCodeHash`.

## Built since the first version

- The plan page draws the Money Flywheel Map itself, so uploading the Mapper's PNG
  is not needed. The arrow numbers are `PLANNER.arrows(state)`, in map order, if
  another tool ever wants them.
- The donut uses the `--c-bills`, `--c-spending`, `--c-upcoming`, `--c-goals`
  tokens in `styles.css`, checked for colorblind separation.

## Things to review with Rose

- **Financial Goals is always the remainder.** A member who wants to "pay
  themselves first" lowers Spending or Upcoming until the remainder is the number
  they want. If you would rather let them type a Goals amount and have Spending
  absorb the difference, that is a small change in `plan.js`.
- **Business owners** enter "Pay from my business" as an income row. The business
  side (Revenue → Biz Hub → Taxes) is not planned here.
- **The Notes column** was removed from the editors. The plan still has one, filled
  in by the tool (the real charge for non-monthly bills, "by Sep 2027" for
  Upcoming, the goal name). Bringing a free-text note back is a one-line change.
- **A lump-sum credit card payment** still works: add a "Credit card auto-pay" row
  paid from the Bills account and leave the other bills marked Bills account.
