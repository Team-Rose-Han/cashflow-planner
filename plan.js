// ============================================================
//  Cashflow Planner — the math
//  Plain, reviewable arithmetic. No AI decides anything.
//
//  Scope: this tool has ONE job, turning a member's take-home pay into the
//  four monthly transfers out of the Hub (Bills, Spending, Upcoming,
//  Financial Goals) and the list of expenses behind them. Which accounts
//  exist is the Money Flywheel Mapper's job. Which goal to fund is the
//  Financial Goal Selector's job.
//
//  The one rule: every dollar that lands in the Hub is assigned to a
//  bucket. Financial Goals is always the remainder, so the four buckets
//  add up to take-home pay by construction. If the remainder is negative
//  the plan is "over" and the member trims before they can finish.
// ============================================================
(function () {
  const C = window.PLANNER_CONFIG;

  // ---------------------------------------------------------
  //  NUMBERS
  // ---------------------------------------------------------
  const money = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
  const round2 = (n) => Math.round(n * 100) / 100;
  // Every amount in the tool is a whole dollar, rounded up (cents never help a plan).
  const up = (n) => Math.ceil(round2(n) - 1e-9);
  const fmt0 = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(up(Math.abs(n)) * (n < 0 ? -1 : 1)).toLocaleString("en-US");
  const fmt = fmt0;
  const fmtSmart = fmt0;
  const pct = (part, whole) => (whole > 0 ? (100 * part) / whole : 0);
  const fmtPct = (p) => p.toFixed(2) + "%";
  const trim = (s) => (s || "").trim();
  function possessive(name) { const n = trim(name); if (!n) return ""; return /s$/i.test(n) ? `${n}'` : `${n}'s`; }

  // How many times a month a row lands. Income rounds down, expenses round up.
  function factor(freq, kind) {
    const c = C.cadence[freq] || C.cadence.monthly;
    return kind === "income" ? c.income : c.expense;
  }
  // Upcoming rows are rough yearly estimates; the list only suggests the one fixed
  // monthly transfer (rounded up), which the member can override.
  const upcomingMonthly = (row) => up(money(row.amount) / 12);
  const monthlyOf = (row, kind) => (kind === "upcoming" ? upcomingMonthly(row) : up(money(row.amount) * factor(row.freq, kind)));
  const sumMonthly = (rows, kind) => round2((rows || []).reduce((s, r) => s + monthlyOf(r, kind), 0));
  // Bills marked "Credit card" are paid through one Credit card auto-pay line.
  const onCard = (r) => r.via === "card";
  const cardTotal = (s) => sumMonthly((s.bills || []).filter(onCard), "expense");
  // Upcoming is a share of take-home pay (5% by default), rounded up to the nearest $50.
  function upcomingSuggested(s) {
    const step = Number(C.upcomingRoundTo) || 1;
    const income = sumMonthly(s.incomes, "income");
    return Math.ceil((income * (Number(C.upcomingShare) || 0)) / step - 1e-9) * step;
  }
  // The number that counts: the member's own if they typed one, else the suggestion.
  const upcomingAmount = (s) => (s.upcomingAmount != null && String(s.upcomingAmount).trim() !== "" ? up(money(s.upcomingAmount)) : upcomingSuggested(s));

  // ---------------------------------------------------------
  //  ACCOUNTS
  //  Couples get one Spending account per partner, in each person's own name,
  //  matching the Money Flywheel Mapper. Everything else is shared.
  // ---------------------------------------------------------
  const shared = (s) => s.partner === "shared";
  function spendingAccounts(s) {
    const B = C.buckets.spending;
    if (!shared(s)) return [{ id: "spending", key: "spending", name: B.name, type: B.type }];
    return [
      { id: "spending", key: "spending", name: `${B.name} · ${trim(s.name) || "You"}`, type: B.type },
      { id: "spending2", key: "spending", name: `${B.name} · ${trim(s.partnerName) || "Partner"}`, type: B.type },
    ];
  }
  function accounts(s) {
    const B = C.buckets;
    return [
      { id: "hub", key: "hub", name: shared(s) ? "Household Hub" : "Personal Hub", type: C.hub.type },
      { id: "bills", key: "bills", name: B.bills.name, type: B.bills.type },
      ...spendingAccounts(s),
      { id: "upcoming", key: "upcoming", name: B.upcoming.name, type: B.upcoming.type },
      { id: "goals", key: "goals", name: B.goals.name, type: B.goals.type },
    ];
  }
  function planTitle(s) {
    const you = trim(s.name), them = shared(s) ? trim(s.partnerName) : "";
    const who = you && them ? `${you} & ${them}` : you || (them ? `You & ${them}` : "");
    const p = possessive(who);
    return p ? `${p} Updated Money Flywheel Map` : "Your Updated Money Flywheel Map";
  }

  // ---------------------------------------------------------
  //  TOTALS
  // ---------------------------------------------------------
  function totals(s) {
    const income = sumMonthly(s.incomes, "income");
    const bills = sumMonthly(s.bills, "expense");
    const spend = spendingAccounts(s).map((a) => ({ ...a, amount: up(money((s.spending || {})[a.id])) }));
    const spending = round2(spend.reduce((t, a) => t + a.amount, 0));
    const upcoming = upcomingAmount(s);
    const goals = round2(income - bills - spending - upcoming);
    const over = goals < -0.004;
    const afterBills = round2(income - bills), afterSpending = round2(income - bills - spending);
    return {
      income, bills, spend, spending, upcoming, goals, over,
      afterBills, afterSpending,
      card: cardTotal(s),
      overSpending: spending > afterBills + 0.004,   // Spending alone outruns what is left after Bills
      overUpcoming: upcoming > afterSpending + 0.004, // Upcoming outruns what is left after Spending
      share: {
        bills: pct(bills, income), spending: pct(spending, income),
        upcoming: pct(upcoming, income), goals: pct(Math.max(goals, 0), income),
      },
    };
  }

  // The numbers that go on the arrows of the Money Flywheel map, in map order.
  function arrows(s) {
    const t = totals(s);
    const out = [{ id: "income", from: "Paycheck", to: shared(s) ? "Household Hub" : "Personal Hub", amount: t.income }];
    out.push({ id: "bills", from: "Hub", to: C.buckets.bills.name, amount: t.bills, share: t.share.bills });
    t.spend.forEach((a) => out.push({ id: a.id, from: "Hub", to: a.name, amount: a.amount, share: pct(a.amount, t.income) }));
    out.push({ id: "upcoming", from: "Hub", to: C.buckets.upcoming.name, amount: t.upcoming, share: t.share.upcoming });
    out.push({ id: "goals", from: "Hub", to: C.buckets.goals.name, amount: t.goals, share: t.share.goals });
    return out;
  }

  // ---------------------------------------------------------
  //  THE PLAN
  //  One section per account, each with its rows, exactly like Rose's sheet:
  //  Expense | Notes | Date | Amount, then the monthly total and its share.
  // ---------------------------------------------------------
  function notesFor(row, kind) {
    const notes = trim(row.notes); // older saved plans may still carry a note
    let tag = "";
    if (kind === "upcoming") tag = `about ${fmt(money(row.amount))} a year`;
    else {
      const c = C.cadence[row.freq] || C.cadence.monthly;
      if (c.note) tag = `${fmt(money(row.amount))} ${c.note}`;
    }
    return notes && tag ? `${notes} · ${tag}` : notes || tag;
  }
  const kept = (rows) => (rows || []).filter((r) => trim(r.name) || money(r.amount) > 0);
  const toRow = (r, kind, extra = {}) => ({
    expense: trim(r.name) || "(unnamed)",
    notes: notesFor(r, kind),
    date: kind === "upcoming" ? "" : trim(r.when),
    amount: monthlyOf(r, kind),
    ...extra,
  });
  function sectionRows(rows, kind) { return kept(rows).map((r) => toRow(r, kind)); }
  // Bills: the ones paid straight from the account, then one bold Credit card
  // auto-pay line with the card charges listed under it (sub rows, not re-counted).
  function billRows(s) {
    const bank = kept(s.bills).filter((r) => !onCard(r)).map((r) => toRow(r, "expense"));
    const card = kept(s.bills).filter(onCard);
    if (!card.length) return bank;
    const total = card.reduce((t, r) => t + monthlyOf(r, "expense"), 0);
    return [...bank,
      { expense: "Credit card auto-pay", notes: `${card.length} ${card.length === 1 ? "charge" : "charges"} on the card`, date: trim(s.cardDay), amount: round2(total), bold: true },
      ...card.map((r) => toRow(r, "expense", { sub: true }))];
  }
  // Upcoming: one line, the fixed transfer. The list only ever informed the number.
  function upcomingRows(s) {
    return [{ expense: "Upcoming cushion", notes: "", date: "", amount: upcomingAmount(s) }];
  }
  function plan(s) {
    const t = totals(s);
    const acc = accounts(s);
    const byId = (id) => acc.find((a) => a.id === id);
    const sections = [];
    const hubRows = sectionRows(s.incomes, "income");
    if (s.payrollMatch) hubRows.push({ expense: C.payrollLabel || "401(k) match · set in payroll", notes: "comes out before take-home pay", date: "", amount: 0, sub: true, blank: true });
    sections.push({ account: byId("hub"), rows: hubRows, total: t.income, share: null, income: true });
    sections.push({ account: byId("bills"), rows: billRows(s), total: t.bills, share: t.share.bills });
    t.spend.forEach((a) => sections.push({ account: byId(a.id), rows: [{ expense: a.name, notes: "", date: "", amount: a.amount }], total: a.amount, share: pct(a.amount, t.income) }));
    sections.push({ account: byId("upcoming"), rows: upcomingRows(s), total: t.upcoming, share: t.share.upcoming });
    sections.push({ account: byId("goals"), rows: [{ expense: "Current financial goal", notes: trim(s.goalName) || C.goalPlaceholder || "", date: "", amount: t.goals }], total: t.goals, share: t.share.goals });
    return { title: planTitle(s), sections, totals: t, arrows: arrows(s) };
  }

  // The member's own bank label for an account: "Capital One *2948", or "" if blank.
  function accountLabel(s, id) {
    const a = (s.accounts || {})[id] || {};
    const bank = trim(a.bank), last4 = String(a.last4 || "").replace(/\D/g, "").slice(0, 4);
    if (!bank && !last4) return "";
    return `${bank}${bank && last4 ? " " : ""}${last4 ? "*" + last4 : ""}`;
  }

  // ---------------------------------------------------------
  //  EXPORT: the same layout as the spreadsheet, as CSV or tab-separated text
  // ---------------------------------------------------------
  function table(s) {
    const p = plan(s);
    const num = (n) => String(up(n));
    const lines = [[p.title], ["Account", "Expense", "Notes", "Date", "Amount", "Monthly Total", "% of take-home"]];
    p.sections.forEach((sec) => {
      const label = [sec.account.name, accountLabel(s, sec.account.id)].filter(Boolean).join(" | ");
      const rows = sec.rows.length ? sec.rows : [{ expense: "", notes: "", date: "", amount: 0 }];
      rows.forEach((r, i) => {
        lines.push([i === 0 ? label : "", (r.sub ? "    " : "") + r.expense, r.notes, r.date, r.blank ? "" : num(r.amount), i === 0 ? num(sec.total) : "", i === 0 && sec.share != null ? fmtPct(sec.share) : ""]);
      });
    });
    lines.push([]);
    lines.push(["", "Take-home pay into the Hub", "", "", "", num(p.totals.income), ""]);
    lines.push(["", "Allocated to the four buckets", "", "", "", num(p.totals.bills + p.totals.spending + p.totals.upcoming + p.totals.goals), p.totals.over ? "OVER" : "100.00%"]);
    lines.push([]);
    lines.push(["Arrow", "From", "To", "", "Per month", "", ""]);
    p.arrows.forEach((a) => lines.push(["", a.from, a.to, "", num(a.amount), "", a.share != null ? fmtPct(a.share) : ""]));
    return lines;
  }
  const csvCell = (v) => { const t = String(v == null ? "" : v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = (s) => table(s).map((row) => row.map(csvCell).join(",")).join("\r\n");
  const tsv = (s) => table(s).map((row) => row.map((v) => String(v == null ? "" : v).replace(/[\t\n]/g, " ")).join("\t")).join("\n");

  window.PLANNER = { money, round2, up, fmt, fmt0, fmtSmart, pct, fmtPct, trim, possessive, factor, upcomingMonthly, upcomingSuggested, upcomingAmount, onCard, cardTotal, monthlyOf, sumMonthly, shared, spendingAccounts, accounts, planTitle, totals, arrows, plan, accountLabel, table, csv, tsv };
})();
