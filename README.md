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
   twice. Every income row and every bill needs its "When" (and the card line its due date) before
   Continue works; missing ones turn coral.
4. **Spending.** One monthly amount (two for couples, one per partner), with the
   weekly equivalent shown underneath and a running "what's left after Bills" line.
   If Spending is more than what is left after Bills, the line turns coral and
   Continue refuses until it is lowered.
5. **Upcoming.** One number: 5% of take-home pay, rounded up to the next $50,
   prefilled and editable, with a "Reset to 5%" link if they change it. No list.
   The share and rounding step live in `config.js`.
6. **Financial Goals.** "What do you have left to put towards Financial Goals?"
   The tracker shows all four buckets against take-home pay. Bills and Upcoming
   link back to their lists, Spending is editable in place, and Financial Goals is
   always whatever is left. If the plan is over, the Financial Goals row turns
   coral and "See my map" refuses until Spending, Upcoming or Bills are trimmed.
   Under that, **the Financial Waterfall** graphic (`waterfall.png`) with its ten
   steps as tappable choices; the step they tap becomes the goal ("3. Max out
   401(k) employer match"), or they type their own. The steps are in `config.js`.
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
- Upcoming is `upcomingShare` (5%) of take-home, rounded up to `upcomingRoundTo`
  ($50), unless the member types their own number.
- Bills marked Credit card are summed into the Credit card auto-pay line; the Bills
  total counts each bill once.
- Financial Goals = take-home pay − Bills − Spending − Upcoming. The four buckets
  therefore always add up to take-home pay. A negative remainder blocks the plan.
- Every amount is a whole dollar, rounded **up** at the row level ($730 a year is
  $61 a month), so totals are whole dollars too and the four buckets still add up
  to take-home pay exactly.
- Percentages are shares of monthly take-home pay into the Hub, shown with two
  decimals like Rose's sheet (88.04%).

## Files

| File | What it is | Who edits it |
|---|---|---|
| `config.js` | Access code, allowed embed hosts, every question and reminder, tips, quick-add suggestions and their groups, cadence factors, footnote | Rose's team |
| `plan.js` | The math: monthly conversion, totals, the arrow numbers, the plan table, CSV / TSV export | Cez |
| `app.js` | The screens: questions, list editors, balance check, plan, PNG export, gate | Cez |
| `styles.css` | Look and feel (white / navy / coral, Poppins + Lato). The four bucket colors are the `--c-*` tokens at the top | Cez |
| `logo.png` | The 30 Minute Money logo | Rose's team |
| `waterfall.png` | The Financial Waterfall graphic on the Financial Goals screen | Rose's team |
| `index.html` | Page shell | Cez |

## Publish (GitHub Pages)

The public version lives at https://team-rose-han.github.io/cashflow-planner/ and is
served from the `main` branch of the `Team-Rose-Han/cashflow-planner` repo. To
publish a new version, put the contents of this folder (not the folder itself) at the
root of that repo and push to `main`; GitHub Pages picks it up within a minute or
two. Bump the `?v=` number on the three script tags and the stylesheet link in
`index.html` with each release so members' browsers load the new files instead of
cached ones.

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
