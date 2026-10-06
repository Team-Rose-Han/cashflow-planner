// ============================================================
//  Cashflow Planner — UI
//  One screen at a time:
//    1. you          first name, solo or shared, partner's name
//    2. income       what lands in the Hub each month
//    3. bills        the list of autopays, converted to monthly
//    4. spending     the monthly Spending transfer (one per partner)
//    5. upcoming     the list of irregular costs, converted to monthly
//    6. balance      the four buckets against take-home pay; Financial
//                    Goals is the remainder; the member can't finish while over
//    7. plan         the spreadsheet, the arrow numbers, and the downloads
// ============================================================
(function () {
  const C = window.PLANNER_CONFIG;
  const P = window.PLANNER;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ---------------------------------------------------------
  //  STATE (saved in the member's browser only)
  // ---------------------------------------------------------
  const STORE = "cfp_state_v1";
  const blank = () => ({ name: "", partner: "", partnerName: "", incomes: [], bills: [], cardDay: "", spending: {}, upcoming: [], upcomingAmount: "", goalName: "", accounts: {}, step: 0, reached: 0 });
  let state = blank();
  try { const saved = JSON.parse(localStorage.getItem(STORE) || "null"); if (saved && typeof saved === "object" && Array.isArray(saved.incomes)) state = { ...blank(), ...saved }; } catch (e) {}
  // Older saved plans: Upcoming rows had a cadence or a "needed by" mode; now they are yearly estimates.
  (state.upcoming || []).forEach((r) => {
    if (r.mode === "monthly" || r.freq === "monthly") r.amount = String(P.money(r.amount) * 12);
    delete r.mode; delete r.by; delete r.freq;
  });
  if (state.cardDay == null) state.cardDay = "";
  if (state.upcomingAmount == null) state.upcomingAmount = "";
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

  // ---------------------------------------------------------
  //  GATE (same as the Money Flywheel Mapper)
  // ---------------------------------------------------------
  function embeddedOnAllowedHost() {
    try {
      if (window.self === window.top) return false;
      const ref = document.referrer ? new URL(document.referrer).hostname : "";
      return C.allowedEmbedHosts.some((h) => ref === h || ref.endsWith("." + h));
    } catch (e) { return false; }
  }
  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function unlocked() {
    try { if (localStorage.getItem("msm_unlocked") === "1") return true; } catch (e) {}
    return embeddedOnAllowedHost();
  }
  function showApp() { $("#gate").hidden = true; $("#app").hidden = false; render(); }
  function initGate() {
    if (unlocked()) return showApp();
    $("#gate").hidden = false;
    $("#gateform").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("#code").value.trim().toUpperCase();
      const err = $("#gateerr");
      if (!code) return;
      if (!window.crypto || !crypto.subtle) { err.textContent = "This page needs to be opened over https to check the code."; return; }
      if ((await sha256Hex(code)) === C.accessCodeHash) {
        try { localStorage.setItem("msm_unlocked", "1"); } catch (e2) {}
        showApp();
      } else {
        err.textContent = "That code didn't match. It's on the Cashflow Planner page inside the community.";
        $("#code").select();
      }
    });
  }

  // ---------------------------------------------------------
  //  WHICH SCREEN
  // ---------------------------------------------------------
  const STAGES = [
    { id: "you", label: "You" }, { id: "income", label: "Income" }, { id: "bills", label: "Bills" },
    { id: "spending", label: "Spending" }, { id: "upcoming", label: "Upcoming" }, { id: "balance", label: "Financial Goals" }, { id: "plan", label: "Your map" },
  ];
  const SCREENS = [
    { id: "name", stage: "you" },
    { id: "partner", stage: "you" },
    { id: "partnerName", stage: "you", when: (s) => s.partner === "shared" },
    { id: "income", stage: "income" },
    { id: "bills", stage: "bills" },
    { id: "spending", stage: "spending" },
    { id: "upcoming", stage: "upcoming" },
    { id: "balance", stage: "balance" },
    { id: "plan", stage: "plan" },
  ];
  const screens = () => SCREENS.filter((s) => !s.when || s.when(state));
  function current() {
    const list = screens();
    const i = Math.max(0, Math.min(state.step, list.length - 1));
    return { list, i, s: list[i] };
  }
  function setStep(i) {
    const list = screens();
    state.step = Math.max(0, Math.min(i, list.length - 1));
    state.reached = Math.max(state.reached || 0, state.step);
    save(); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const next = () => setStep(current().i + 1);
  const back = () => setStep(current().i - 1);
  function goTo(id) { const i = screens().findIndex((s) => s.id === id); if (i >= 0) setStep(i); }

  // Continue is allowed only when the screen is complete.
  function blocker(id) {
    const t = P.totals(state);
    if (id === "name" && !P.trim(state.name)) return "Please enter your first name.";
    if (id === "partnerName" && !P.trim(state.partnerName)) return "Please enter your partner's first name.";
    if (id === "income" && t.income <= 0) return "Add at least one source of take-home pay so there is something to plan.";
    if (id === "income" && missingDates("income").length) return "Add when each paycheck lands (the \"When\" field), so the plan knows your paydays.";
    if (id === "bills" && missingDates("bills").length) return "Add the day each bill comes out (the \"When\" field), so you can see the whole month at a glance.";
    if (id === "bills" && t.bills > t.income + 0.004) return `Your bills add up to ${P.fmt(t.bills - t.income)} more than what lands in your Hub. The plan can't balance until that changes: double-check each amount and how often it's charged (a yearly bill marked "every month" is the usual culprit), or go back and add income you left out.`;
    if (id === "spending" && t.overSpending) return `That's ${P.fmt(t.spending - t.afterBills)} more than what's left after Bills (${P.fmt(t.afterBills)}). Lower Spending, or go back and check your Bills.`;
    if (id === "upcoming" && t.overUpcoming) return `Upcoming adds up to ${P.fmt(t.upcoming)}, but only ${P.fmt(t.afterSpending)} is left after Bills and Spending. Trim the list, or go back and lower Spending.`;
    if (id === "balance" && t.over) return `Your plan is ${P.fmt(-t.goals)} a month over. Trim Spending or Upcoming, or go back to Bills, until Financial Goals is $0 or more.`;
    return "";
  }

  // Every income row and every bill needs a "when"; the credit card line needs its due date.
  function missingDates(id) {
    const list = id === "income" ? state.incomes : state.bills;
    const rows = list.filter((r) => (P.trim(r.name) || P.money(r.amount) > 0) && !P.trim(r.when)).map((r) => r.id);
    if (id === "bills" && state.bills.some(P.onCard) && !P.trim(state.cardDay)) rows.push("cardday");
    return rows;
  }
  function markMissingDates(panel, id) {
    const missing = new Set(missingDates(id));
    $$(".row", panel).forEach((rowEl) => { const w = $(".f-when", rowEl); if (w) w.classList.toggle("missing", missing.has(rowEl.dataset.row)); });
    const cd = $("#cardday", panel); if (cd) cd.classList.toggle("missing", missing.has("cardday"));
  }

  // ---------------------------------------------------------
  //  SMALL PIECES
  // ---------------------------------------------------------
  const navHtml = (opts = {}) => `<div class="nav">
      <button class="btn ghost" id="back" ${opts.noBack ? "disabled" : ""}>Back</button>
      <div class="right">${opts.extra || ""}<button class="btn${opts.coral ? " coral" : ""}" id="next">${esc(opts.label || "Continue")}</button></div>
    </div><p class="err" id="qerr" aria-live="polite"></p>`;
  function wireNav(panel, id) {
    const b = $("#back", panel), n = $("#next", panel);
    if (b) b.addEventListener("click", back);
    if (n) n.addEventListener("click", () => {
      const why = blocker(id);
      if (why) { $("#qerr", panel).textContent = why; if (id === "bills" || id === "income") { markMissingDates(panel, id); const first = $(".missing", panel); if (first) first.focus(); } return; }
      next();
    });
  }
  const moneyIn = (attrs, value) => `<div class="moneyin"><span class="cur">$</span><input type="text" inputmode="decimal" autocomplete="off" ${/placeholder=/.test(attrs) ? "" : 'placeholder="0"'} ${attrs} value="${esc(value || "")}"></div>`;
  const prettyMoney = (v) => { const n = P.money(v); return n > 0 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : ""; };

  // ---------------------------------------------------------
  //  SCREENS: YOU
  // ---------------------------------------------------------
  function renderName(panel) {
    panel.innerHTML = `<div class="question"><h2>What's your first name?</h2>
      <form class="textrow" id="f"><input id="name" type="text" maxlength="40" placeholder="First name" value="${esc(state.name)}" autocomplete="given-name"><button class="btn" type="submit">Continue</button></form>
      <p class="err" id="qerr" aria-live="polite"></p></div>
      <div class="nav"><button class="btn ghost" disabled>Back</button></div>`;
    $("#f", panel).addEventListener("submit", (e) => {
      e.preventDefault();
      state.name = $("#name", panel).value.trim();
      const why = blocker("name"); if (why) { $("#qerr", panel).textContent = why; return; }
      next();
    });
    setTimeout(() => $("#name", panel).focus(), 0);
  }
  function renderPartner(panel) {
    const opts = [
      { v: "solo", t: "Just me", s: "My own accounts, my own plan" },
      { v: "shared", t: "Me and my partner", s: "We share some or all of our accounts, so this is our household plan" },
    ];
    panel.innerHTML = `<div class="question"><h2>Who is this cashflow plan for?</h2>
      <div class="options">${opts.map((o) => `<button class="opt" data-v="${o.v}" aria-pressed="${state.partner === o.v}"><span class="t">${esc(o.t)}</span><span class="s">${esc(o.s)}</span></button>`).join("")}</div></div>
      <div class="nav"><button class="btn ghost" id="back">Back</button></div>`;
    $$(".opt", panel).forEach((b) => b.addEventListener("click", () => {
      const was = state.partner;
      state.partner = b.dataset.v;
      if (was !== state.partner) { delete state.spending.spending2; delete state.accounts.spending2; }
      save(); next();
    }));
    $("#back", panel).addEventListener("click", back);
  }
  function renderPartnerName(panel) {
    panel.innerHTML = `<div class="question"><h2>What's your partner's first name?</h2>
      <form class="textrow" id="f"><input id="pname" type="text" maxlength="40" placeholder="Partner's first name" value="${esc(state.partnerName)}" autocomplete="off"><button class="btn" type="submit">Continue</button></form>
      <p class="err" id="qerr" aria-live="polite"></p></div>
      <div class="nav"><button class="btn ghost" id="back">Back</button></div>`;
    $("#f", panel).addEventListener("submit", (e) => {
      e.preventDefault();
      state.partnerName = $("#pname", panel).value.trim();
      const why = blocker("partnerName"); if (why) { $("#qerr", panel).textContent = why; return; }
      next();
    });
    $("#back", panel).addEventListener("click", back);
    setTimeout(() => $("#pname", panel).focus(), 0);
  }

  // ---------------------------------------------------------
  //  SCREENS: THE LISTS (income, bills, upcoming)
  //  One editor, three column sets:
  //    income    name · when · amount · how often
  //    bills     name · when · amount · how often · paid from (Bills account / Credit card)
  //    upcoming  what for · roughly per year  (the list only suggests the one fixed transfer)
  // ---------------------------------------------------------
  const hubName = () => (P.shared(state) ? "Household Hub" : "Personal Hub");
  const LISTS = {
    income: {
      key: "incomes", kind: "income", defaultFreq: "biweekly",
      h2: () => C.questions.income.replace("{hub}", hubName()),
      what: () => C.hubWhat, chips: () => C.incomeSuggestions, tip: () => C.tips.income,
      ph: { name: "e.g. Take-home paycheck", when: "e.g. 1st & 15th, every other Friday, etc." },
      head: ["Name", "When", "Amount", "How often", "Per month", ""],
      add: "Add income", total: "Take-home pay into the Hub", empty: "No income yet. Pick a suggestion above or add a row.",
    },
    bills: {
      key: "bills", kind: "expense", defaultFreq: "monthly",
      h2: () => C.questions.bills,
      what: () => C.buckets.bills.what, chips: () => C.billSuggestions, tip: () => C.tips.bills,
      ph: { name: "e.g. Rent", when: "e.g. 1st, 15th" },
      head: ["Name", "When", "Amount", "How often", "Paid from", "Per month", ""],
      add: "Add a bill", total: "Bills, per month", empty: "No bills yet. Pick from the suggestions above or add a row.",
    },
  };
  function chipsHtml(chips, rows) {
    const used = new Set(rows.map((r) => P.trim(r.name).toLowerCase()));
    const one = (c, freq) => {
      const name = typeof c === "string" ? c : c.name, hint = typeof c === "string" ? "" : c.hint || "";
      return `<button type="button" class="chip${used.has(name.toLowerCase()) ? " used" : ""}" data-chip="${esc(name)}" ${freq ? `data-freq="${esc(freq)}"` : ""} ${hint ? `data-hint="${esc(hint)}"` : ""}>${esc(name)}</button>`;
    };
    if (Array.isArray(chips) && chips.length && !chips[0].group) return `<div class="chips">${chips.map((c) => one(c)).join("")}</div>`;
    return `<div class="chipgroups">${chips.map((g) => `<div class="chipgroup"><span class="eyebrow">${esc(g.group)}</span><div class="chips">${g.items.map((c) => one(c, g.freq)).join("")}</div></div>`).join("")}</div>`;
  }
  function rowHtml(L, r) {
    const perMonth = `<span class="mo">${P.fmt0(P.monthlyOf(r, L.kind))}<small>/mo</small></span>`;
    const rm = `<button type="button" class="rm" aria-label="Remove row">×</button>`;
    const name = `<input class="f-name" data-f="name" type="text" maxlength="60" placeholder="${esc(L.ph.name)}" value="${esc(r.name)}" aria-label="Name">`;
    if (L.kind === "upcoming") {
      return `<div class="row upcoming" data-row="${r.id}">${name}
        ${moneyIn(`data-f="amount" aria-label="About how much this year" ${r.hint ? `placeholder="e.g. ${esc(r.hint)}"` : ""}`, prettyMoney(r.amount))}${perMonth}${rm}</div>`;
    }
    const freqs = C.cadenceFor[L.kind === "income" ? "income" : "bills"];
    const freq = `<select data-f="freq" aria-label="How often">${freqs.map((f) => `<option value="${f}" ${r.freq === f ? "selected" : ""}>${esc(C.cadence[f].label)}</option>`).join("")}</select>`;
    const when = `<input class="f-when" data-f="when" type="text" maxlength="20" placeholder="${esc(L.ph.when)}" value="${esc(r.when || "")}" aria-label="When">`;
    const via = L.kind === "expense" ? `<select data-f="via" aria-label="Paid from"><option value="bank" ${r.via !== "card" ? "selected" : ""}>Bills account</option><option value="card" ${r.via === "card" ? "selected" : ""}>Credit card</option></select>` : "";
    return `<div class="row ${L.kind === "income" ? "income" : "bills"}" data-row="${r.id}">${name}${when}
      ${moneyIn(`data-f="amount" aria-label="Amount"`, prettyMoney(r.amount))}${freq}${via}${perMonth}${rm}</div>`;
  }
  function cardBoxHtml() {
    const card = state.bills.filter(P.onCard);
    if (!card.length) return "";
    return `<div class="cardbox" id="cardbox">
      <div><span class="nm">Credit card auto-pay</span><span class="sub">${esc(C.cardNote)}</span></div>
      <label class="when">Paid from Bills on the <input id="cardday" type="text" maxlength="20" placeholder="e.g. 24th" value="${esc(state.cardDay || "")}" aria-label="Credit card due date"></label>
      <span class="amt" id="cardtotal">${P.fmt(P.cardTotal(state))}<small>/mo on the card</small></span>
    </div>`;
  }
  function renderList(panel, id) {
    const L = LISTS[id];
    const rows = state[L.key];
    const total = P.sumMonthly(rows, L.kind);
    panel.innerHTML = `<div class="question">
        <h2>${esc(L.h2())}</h2>
        <p class="what">${esc(L.what())}</p>
        ${L.tip() ? `<p class="tip">${esc(L.tip())}</p>` : ""}
        ${id === "income" ? "" : `<div class="tracker" id="tracker" data-stage="${id}">${trackerHtml(id)}</div>`}
        <div class="quick"><div class="quick-head"><span class="quick-title">Quick add</span></div>${chipsHtml(L.chips(), rows)}</div>
        <div class="rows ${id}" id="rows">
          <div class="rowhead">${L.head.map((h, i) => `<span${i === L.head.length - 2 ? ' style="text-align:right"' : ""}>${esc(h)}</span>`).join("")}</div>
          ${rows.length ? rows.map((r) => rowHtml(L, r)).join("") : `<div class="empty">${esc(L.empty)}</div>`}
          ${id === "bills" ? cardBoxHtml() : ""}
          <div class="rowfoot"><button type="button" class="btn ghost small" id="add">+ ${esc(L.add)}</button><span class="total">${P.fmt(total)}<small>${esc(L.total)}</small></span></div>
        </div>
      </div>${navHtml()}`;
    wireNav(panel, id);

    const newRow = (name, freq, hint) => {
      const r = { id: uid(), name: name || "", when: "", amount: "" };
      if (hint) r.hint = hint;
      if (L.kind !== "upcoming") { r.freq = freq || L.defaultFreq; if (L.kind === "expense") r.via = "bank"; }
      rows.push(r); save(); return r;
    };
    const focusRow = (r, field) => { const el = $(`[data-row="${r.id}"] [data-f="${field}"]`, panel); if (el) el.focus(); };
    const refresh = () => {
      $(".rowfoot .total", panel).innerHTML = `${P.fmt(P.sumMonthly(rows, L.kind))}<small>${esc(L.total)}</small>`;
      refreshTracker(panel);
      rows.forEach((r) => { const mo = $(`[data-row="${r.id}"] .mo`, panel); if (mo) mo.innerHTML = `${P.fmt0(P.monthlyOf(r, L.kind))}<small>/mo</small>`; });
      const ct = $("#cardtotal", panel); if (ct) ct.innerHTML = `${P.fmt(P.cardTotal(state))}<small>/mo on the card</small>`;
    };

    $("#add", panel).addEventListener("click", () => { const r = newRow(); renderList(panel, id); focusRow(r, "name"); });
    $$(".chip", panel).forEach((ch) => ch.addEventListener("click", () => {
      const r = newRow(ch.dataset.chip, ch.dataset.freq, ch.dataset.hint);
      renderList(panel, id); focusRow(r, "amount");
    }));
    $$(".row", panel).forEach((rowEl) => {
      const r = rows.find((x) => x.id === rowEl.dataset.row);
      $$("[data-f]", rowEl).forEach((inp) => {
        const set = () => {
          r[inp.dataset.f] = inp.value; save();
          if (inp.dataset.f === "via") { renderList(panel, id); return; } // the card box appears or disappears
          refresh();
        };
        inp.addEventListener("input", set);
        inp.addEventListener("change", set);
        if (inp.dataset.f === "when") inp.addEventListener("input", () => inp.classList.remove("missing"));
        if (inp.dataset.f === "amount") inp.addEventListener("blur", () => { inp.value = prettyMoney(inp.value); });
      });
      $(".rm", rowEl).addEventListener("click", () => { state[L.key] = rows.filter((x) => x.id !== r.id); save(); renderList(panel, id); });
    });
    const cd = $("#cardday", panel);
    if (cd) cd.addEventListener("input", () => { state.cardDay = cd.value; save(); cd.classList.remove("missing"); });
  }

  // ---------------------------------------------------------
  //  SCREEN: SPENDING
  // ---------------------------------------------------------
  function renderSpending(panel) {
    const t = P.totals(state);
    const accs = P.spendingAccounts(state);
    const per = (a) => `<div class="spend"><span class="nm">${esc(a.name)}</span>${moneyIn(`data-acc="${a.id}" aria-label="${esc(a.name)} per month"`, prettyMoney(state.spending[a.id]))}<span class="week" data-week="${a.id}">${weekLine(state.spending[a.id])}</span></div>`;
    panel.innerHTML = `<div class="question">
        <h2>${esc(C.questions.spending)}</h2>
        <p class="what">${esc(C.buckets.spending.what)}</p>
        ${C.tips.spending ? `<p class="tip">${esc(C.tips.spending)}</p>` : ""}
        <div class="tracker" id="tracker" data-stage="spending">${trackerHtml("spending")}</div>
        <div class="spendgrid">${accs.map(per).join("")}</div>
      </div>${navHtml()}`;
    wireNav(panel, "spending");
    $$("[data-acc]", panel).forEach((inp) => {
      inp.addEventListener("input", () => {
        state.spending[inp.dataset.acc] = inp.value; save();
        $(`[data-week="${inp.dataset.acc}"]`, panel).textContent = weekLine(inp.value);
        refreshTracker(panel);
        $("#qerr", panel).textContent = "";
      });
      inp.addEventListener("blur", () => { inp.value = prettyMoney(inp.value); });
    });
    setTimeout(() => { const f = $("[data-acc]", panel); if (f) f.focus(); }, 0);
  }
  // ---------------------------------------------------------
  //  THE TRACKER
  //  Same strip on Bills, Spending, Upcoming and Balance: take-home pay,
  //  how much is spoken for so far, and what is left to allocate. Each
  //  bucket's segment appears on its own page; later buckets read "next".
  // ---------------------------------------------------------
  const ORDER = ["bills", "spending", "upcoming", "goals"];
  function trackerHtml(stage) {
    const t = P.totals(state);
    const idx = ORDER.indexOf(stage);
    const amt = { bills: t.bills, spending: t.spending, upcoming: t.upcoming, goals: Math.max(t.goals, 0) };
    const name = (k) => C.buckets[k].name;
    const spoken = P.round2(ORDER.slice(0, idx + 1).reduce((sum, k) => sum + amt[k], 0));
    const left = P.round2(t.income - spoken);
    const over = left < -0.004;
    const final = stage === "goals";
    const w = (n) => (t.income > 0 ? Math.max(0, Math.min(100, (100 * n) / t.income)) : 0);
    // Take-home − Bills − Spending − Upcoming (− Financial Goals) = Left. Buckets not
    // reached yet are drawn faded with "next", so the sequence is visible.
    const tiles = ORDER.map((k, i) => {
      if (i > idx) return `<span class="op dim">−</span><div class="m bucket-tile ${k} next"><span class="lbl">${esc(name(k))}</span><span class="val">next</span></div>`;
      return `<span class="op">−</span><div class="m bucket-tile ${k}${i === idx ? " now" : ""}"><span class="lbl">${esc(name(k))}</span><span class="val">${P.fmt(amt[k])}</span></div>`;
    }).join("");
    const leftTile = final && !over
      ? `<div class="m left done"><span class="lbl">Left to allocate</span><span class="val">$0</span><span class="note">every dollar has a job</span></div>`
      : `<div class="m left${over ? " over" : ""}"><span class="lbl">${over ? "Over by" : "Left to allocate"}</span><span class="val">${P.fmt(Math.abs(left))}</span></div>`;
    const segs = ORDER.slice(0, idx + 1).map((k) => `<div class="seg ${k}" style="width:${w(amt[k])}%"></div>`).join("");
    const legend = ORDER.map((k, i) => {
      if (i <= idx) return `<span${i === idx ? ' class="now"' : ""}><i class="${k}"></i>${esc(name(k))} ${P.fmtPct(P.pct(amt[k], t.income))}</span>`;
      return `<span class="next"><i class="${k} dim"></i>${esc(name(k))} · ${k === "goals" ? "whatever is left" : "next"}</span>`;
    }).join("");
    return `<div class="math">
        <div class="m in"><span class="lbl">Take-home pay</span><span class="val">${P.fmt(t.income)}</span></div>
        ${tiles}
        <span class="op eq">=</span>
        ${leftTile}
      </div>
      <div class="bar slim" role="img" aria-label="How much of take-home pay is spoken for">${segs}${over ? `<div class="seg over" style="width:${w(-left)}%"></div>` : ""}</div>
      <div class="legend">${legend}</div>`;
  }
  function refreshTracker(panel) { const el = $("#tracker", panel); if (el) el.innerHTML = trackerHtml(el.dataset.stage); }

  const weekLine = (v) => { const n = P.money(v); return n > 0 ? `about ${P.fmt0((n * 12) / 52)} a week` : "per month"; };

  // ---------------------------------------------------------
  //  SCREEN: UPCOMING
  //  One number: 5% of take-home, rounded up to $50, editable.
  // ---------------------------------------------------------
  function renderUpcoming(panel) {
    const own = String(state.upcomingAmount || "").trim() !== "";
    const sug = P.upcomingSuggested(state);
    const B = C.upcomingBox;
    panel.innerHTML = `<div class="question">
        <h2>${esc(C.questions.upcoming)}</h2>
        <p class="what">${esc(C.buckets.upcoming.what)}</p>
        ${C.tips.upcoming ? `<p class="tip">${esc(C.tips.upcoming)}</p>` : ""}
        <div class="tracker" id="tracker" data-stage="upcoming">${trackerHtml("upcoming")}</div>
        <div class="fixedbox" id="upbox">
          <div><span class="nm">${esc(B.title)}</span><span class="sub">${esc(B.sub)}</span></div>
          ${moneyIn(`id="upamount" aria-label="Upcoming per month"`, prettyMoney(own ? state.upcomingAmount : sug))}
          <span class="hint" id="uphint">${esc(B.nudge)} ${own ? `<button type="button" class="linkbtn" id="usesug">${esc(B.resetLabel)} (${P.fmt0(sug)})</button>` : ""}</span>
        </div>
      </div>${navHtml()}`;
    wireNav(panel, "upcoming");
    const up = $("#upamount", panel);
    const hint = () => { $("#uphint", panel).innerHTML = `${esc(B.nudge)} ${String(state.upcomingAmount || "").trim() !== "" ? `<button type="button" class="linkbtn" id="usesug">${esc(B.resetLabel)} (${P.fmt0(sug)})</button>` : ""}`; wireReset(); };
    const wireReset = () => { const b = $("#usesug", panel); if (b) b.addEventListener("click", () => { state.upcomingAmount = ""; save(); up.value = prettyMoney(P.upcomingSuggested(state)); refreshTracker(panel); hint(); $("#qerr", panel).textContent = ""; }); };
    up.addEventListener("input", () => { state.upcomingAmount = up.value; save(); refreshTracker(panel); hint(); $("#qerr", panel).textContent = ""; });
    up.addEventListener("blur", () => { up.value = prettyMoney(String(state.upcomingAmount || "").trim() ? state.upcomingAmount : P.upcomingSuggested(state)); });
    wireReset();
    setTimeout(() => up.focus(), 0);
  }

  // ---------------------------------------------------------
  //  SCREEN: BALANCE
  //  The four buckets against take-home pay. Spending is editable here;
  //  Bills and Upcoming link back to their lists; Goals is the remainder.
  // ---------------------------------------------------------
  function verdictHtml(t) {
    if (t.income <= 0) return `<div class="verdict over"><span>⚠</span><span>There is no income yet. <b>Go back to Income</b> and add your take-home pay.</span></div>`;
    if (t.over) return `<div class="verdict over"><span>⚠</span><span><b>${P.fmt(-t.goals)} a month over.</b> Bills, Spending and Upcoming add up to more than your take-home pay. Lower Spending here, or go back and trim Upcoming or Bills.</span></div>`;
    return "";
  }
  // The Financial Waterfall graphic with a tap target over each step's text.
  function waterfallHtml() {
    const steps = C.waterfall || [], spots = C.waterfallSpots || [];
    return `<div class="waterfall">
        <img src="waterfall.png" alt="The Financial Waterfall: ten steps from getting one month ahead on your bills to paying off the mortgage early" width="1475" height="1067">
        ${steps.map((g, i) => { const sp = spots[i] || [0, 0, 0, 0]; return `<button type="button" class="wf-hit${state.goalName === g ? " on" : ""}" data-goal="${esc(g)}" style="left:${sp[0]}%;top:${sp[1]}%;width:${sp[2]}%;height:${sp[3]}%" aria-label="${esc(g)}" title="${esc(g)}"></button>`; }).join("")}
      </div>`;
  }
  function renderBalance(panel) {
    const t = P.totals(state);
    const B = C.buckets;
    const spendRows = t.spend.map((a) => `<div class="bucket spending"><span class="swatch spending"></span><div><span class="nm">${esc(a.name)}</span><br><span class="sub">${esc(B.spending.what.split(".")[0])}.</span></div>
        ${moneyIn(`data-acc="${a.id}" aria-label="${esc(a.name)} per month"`, prettyMoney(state.spending[a.id]))}
        <span class="amt" data-amt="${a.id}">${P.fmt(a.amount)}<small>${P.fmtPct(P.pct(a.amount, t.income))} of take-home</small></span></div>`).join("");
    panel.innerHTML = `<div class="question">
        <h2>${esc(C.questions.balance)}</h2>
        ${C.tips.balance ? `<p class="what">${esc(C.tips.balance)}</p>` : ""}
        <div class="tracker" id="tracker" data-stage="goals">${trackerHtml("goals")}</div>
        <div class="buckets">
          <div class="bucket"><span class="swatch bills"></span><div><span class="nm">${esc(B.bills.name)}</span><br><span class="sub">${state.bills.length} ${state.bills.length === 1 ? "bill" : "bills"} on autopay${t.card > 0 ? `, ${P.fmt(t.card)} of it on the credit card` : ""}</span></div>
            <button type="button" class="edit" data-go="bills">Edit bills</button>
            <span class="amt" data-amt="bills">${P.fmt(t.bills)}<small>${P.fmtPct(t.share.bills)} of take-home</small></span></div>
          ${spendRows}
          <div class="bucket upcoming"><span class="swatch upcoming"></span><div><span class="nm">${esc(B.upcoming.name)}</span><br><span class="sub">Your fixed monthly cushion (5% of take-home to start)</span></div>
            ${moneyIn(`id="upamount" aria-label="Upcoming per month"`, prettyMoney(String(state.upcomingAmount || "").trim() ? state.upcomingAmount : P.upcomingSuggested(state)))}
            <span class="amt" data-amt="upcoming">${P.fmt(t.upcoming)}<small>${P.fmtPct(t.share.upcoming)} of take-home</small></span></div>
          <div class="bucket goals${t.over ? " over" : ""}" id="goalsrow"><span class="swatch goals"></span><div><span class="nm">${esc(B.goals.name)}</span><br><span class="sub">Whatever is left after the other three</span></div>
            <span></span>
            <span class="amt" data-amt="goals">${P.fmt(t.goals)}<small>${P.fmtPct(t.share.goals)} of take-home</small></span></div>
        </div>
        <div id="verdict">${verdictHtml(t)}</div>
        <div class="goalrow">
          <label class="eyebrow" for="goal">${esc(C.goalPrompt)}</label>
          ${waterfallHtml()}
          <div class="textrow"><input id="goal" type="text" maxlength="80" placeholder="Tap your step above, or type your own goal" value="${esc(state.goalName)}" autocomplete="off"></div>
        </div>
      </div>${navHtml({ label: "See my map", coral: true })}`;
    wireNav(panel, "balance");
    $$("[data-go]", panel).forEach((b) => b.addEventListener("click", () => goTo(b.dataset.go)));
    const update = () => {
      const t2 = P.totals(state);
      refreshTracker(panel);
      t2.spend.forEach((a) => { $(`[data-amt="${a.id}"]`, panel).innerHTML = `${P.fmt(a.amount)}<small>${P.fmtPct(P.pct(a.amount, t2.income))} of take-home</small>`; });
      $(`[data-amt="upcoming"]`, panel).innerHTML = `${P.fmt(t2.upcoming)}<small>${P.fmtPct(t2.share.upcoming)} of take-home</small>`;
      $(`[data-amt="goals"]`, panel).innerHTML = `${P.fmt(t2.goals)}<small>${P.fmtPct(t2.share.goals)} of take-home</small>`;
      $("#goalsrow", panel).classList.toggle("over", t2.over);
      $("#verdict", panel).innerHTML = verdictHtml(t2);
      $("#qerr", panel).textContent = "";
    };
    $$("[data-acc]", panel).forEach((inp) => {
      inp.addEventListener("input", () => { state.spending[inp.dataset.acc] = inp.value; save(); update(); });
      inp.addEventListener("blur", () => { inp.value = prettyMoney(inp.value); });
    });
    const up = $("#upamount", panel);
    up.addEventListener("input", () => { state.upcomingAmount = up.value; save(); update(); });
    up.addEventListener("blur", () => { up.value = prettyMoney(String(state.upcomingAmount || "").trim() ? state.upcomingAmount : P.upcomingSuggested(state)); });
    const goal = $("#goal", panel);
    goal.addEventListener("input", () => { state.goalName = goal.value; save(); $$("[data-goal]", panel).forEach((c) => c.classList.toggle("on", c.dataset.goal === goal.value.trim())); });
    $$("[data-goal]", panel).forEach((c) => c.addEventListener("click", () => { goal.value = c.dataset.goal; goal.dispatchEvent(new Event("input")); }));
  }

  // ---------------------------------------------------------
  //  SCREEN: THE PLAN
  // ---------------------------------------------------------
  // A donut of the four buckets (five for couples), same colors as the tracker. Each
  // slice is named with its share and amount in the list beside it, so color is never
  // the only way to tell slices apart. A 2px gap separates slices.
  function donutHtml(p) {
    const t = p.totals;
    const parts = p.arrows.filter((a) => a.id !== "income").map((a) => ({ id: a.id, key: a.id.startsWith("spending") ? "spending" : a.id, name: a.to, amount: Math.max(a.amount, 0) }));
    const sum = parts.reduce((n, x) => n + x.amount, 0);
    const R = 78, SW = 30, C = 2 * Math.PI * R, GAP = 2;
    let offset = 0, arcs = "";
    parts.forEach((x) => {
      if (x.amount <= 0 || sum <= 0) return;
      const frac = x.amount / sum, len = frac * C, gap = len > GAP * 2 ? GAP : 0;
      const pc = P.fmtPct(P.pct(x.amount, sum));
      arcs += `<circle class="slice ${x.key}" r="${R}" cx="0" cy="0" fill="none" stroke-width="${SW}" stroke-dasharray="${Math.max(len - gap, 0.5)} ${C}" stroke-dashoffset="${-(offset + gap / 2)}" data-name="${esc(x.name)}" data-amount="${esc(P.fmt(x.amount))}" data-pct="${esc(pc)}" tabindex="0" aria-label="${esc(x.name)}: ${esc(P.fmt(x.amount))}, ${esc(pc)}"></circle>`;
      offset += len;
    });
    const list = parts.map((x) => `<li><i class="${x.key}"></i><span class="nm">${esc(x.name)}</span><span class="pc">${P.fmtPct(P.pct(x.amount, sum))}</span><span class="am">${P.fmt0(x.amount)}</span></li>`).join("");
    return `<div class="pie">
        <svg class="donut" viewBox="-100 -100 200 200" role="img" aria-label="How take-home pay is split across the buckets">
          <g transform="rotate(-90)">${arcs}</g>
          <text class="big" x="0" y="-2" text-anchor="middle">${esc(P.fmt0(t.income))}</text><text class="small" x="0" y="18" text-anchor="middle">take-home / mo</text>
        </svg>
        <ul class="pie-list">${list}</ul>
        <div class="pie-tip" id="pietip" hidden></div>
      </div>`;
  }
  function wirePie(root) {
    const tip = $("#pietip", root);
    const show = (el, ev) => {
      tip.innerHTML = `<b>${esc(el.dataset.name)}</b><span>${esc(el.dataset.amount)} a month · ${esc(el.dataset.pct)}</span>`;
      tip.hidden = false;
      const box = root.querySelector(".pie").getBoundingClientRect();
      const x = (ev && ev.clientX != null ? ev.clientX : el.getBoundingClientRect().left) - box.left;
      const y = (ev && ev.clientY != null ? ev.clientY : el.getBoundingClientRect().top) - box.top;
      tip.style.left = `${x + 14}px`; tip.style.top = `${y - 10}px`;
    };
    $$(".slice", root).forEach((el) => {
      el.addEventListener("mouseenter", (e) => show(el, e));
      el.addEventListener("mousemove", (e) => show(el, e));
      el.addEventListener("mouseleave", () => (tip.hidden = true));
      el.addEventListener("focus", () => show(el));
      el.addEventListener("blur", () => (tip.hidden = true));
      el.addEventListener("click", (e) => show(el, e));
    });
  }
  function acctCell(acc, n) {
    const printed = P.accountLabel(state, acc.id);
    return `<td class="acct" rowspan="${n}"><span>${esc(acc.name)}</span><span class="ty">${esc(acc.type)}</span><span class="printed" data-printed="${acc.id}">${esc(printed)}</span></td>`;
  }
  function renderPlan() {
    const p = P.plan(state);
    const t = p.totals;
    $("#plantitle").textContent = p.title;
    $("#plansub").textContent = C.tips.plan || ""; $("#plansub").hidden = !C.tips.plan;

    // The Money Flywheel Map with this plan's numbers on the arrows.
    const acc = P.accounts(state);
    const acctLine = (id, name) => {
      const a = state.accounts[id] || {};
      return `<label class="acct-row"><input class="bank" data-acct="${id}" data-k="bank" type="text" maxlength="24" placeholder="Bank" value="${esc(a.bank || "")}" aria-label="Bank for ${esc(name)}"><input class="last4" data-acct="${id}" data-k="last4" type="text" inputmode="numeric" maxlength="4" placeholder="····" value="${esc(a.last4 || "")}" aria-label="Last four digits of ${esc(name)}"></label><span class="acct printed" data-printed="${id}">${esc(P.accountLabel(state, id))}</span>`;
    };
    const node = (a, cls, amount) => `<div class="node ${cls}" data-id="${a.id}"><span class="type">${esc(a.type)}</span><span class="name">${esc(a.name)}</span>${acctLine(a.id, a.name)}<span class="amt">${P.fmt0(amount)}</span></div>`;
    const hub = acc.find((a) => a.id === "hub");
    const buckets = p.arrows.filter((a) => a.id !== "income").map((ar) => ({ acc: acc.find((a) => a.id === ar.id), amount: ar.amount }));
    const cols = `grid-template-columns:repeat(${buckets.length}, minmax(0, 1fr))`;
    const goalName = P.trim(state.goalName);
    const goalPill = `<div class="node pill goal${goalName ? "" : " later"}" data-id="goalpill"><span class="type">Current goal</span><span class="name">${esc(goalName || C.goalPlaceholder || "Pick your goal")}</span><span class="amt">${P.fmt0(t.goals)}</span></div>`;
    const map = `<div class="fmap" id="fmap">
        <div class="fm-row"><div class="node pill" data-id="income"><span class="name">${P.shared(state) ? "Paychecks" : "Paycheck"}</span><span class="amt">${P.fmt0(t.income)}</span></div></div>
        <div class="fm-row">${node(hub, "hub", t.income)}</div>
        <div class="fm-row fm-buckets" style="${cols}">${buckets.map((b) => node(b.acc, "bkt", b.amount)).join("")}</div>
        <div class="fm-row fm-goal" style="${cols}"><div class="fm-goalcell" style="grid-column:${buckets.length}">${goalPill}</div></div>
        <svg class="links" aria-hidden="true"></svg>
      </div>`;

    let body = "";
    p.sections.forEach((sec) => {
      const rows = sec.rows.length ? sec.rows : [{ expense: "Nothing listed", notes: "", date: "", amount: 0, empty: true }];
      rows.forEach((r, i) => {
        const cls = [i === 0 ? "sec-first" : "", sec.income ? "income" : "", r.bold ? "bold" : "", r.sub ? "subrow" : ""].filter(Boolean).join(" ");
        body += `<tr class="${cls}">${i === 0 ? acctCell(sec.account, rows.length) : ""}
          <td class="exp${r.empty || r.sub ? " sub" : ""}">${esc(r.expense)}${r.notes ? `<span class="note">${esc(r.notes)}</span>` : ""}</td><td>${esc(r.date)}</td><td class="num">${r.empty ? "" : P.fmt(r.amount)}</td>
          ${i === 0 ? `<td class="num total${t.over && sec.account.id === "goals" ? " over" : ""}" rowspan="${rows.length}">${P.fmt(sec.total)}</td>` : ""}</tr>`;
      });
    });
    const assigned = t.bills + t.spending + t.upcoming + Math.max(t.goals, 0);
    $("#plan").innerHTML = `
      ${map}
      ${donutHtml(p)}
      <div class="table-wrap"><table class="plan">
        <colgroup><col class="c-acct"><col class="c-exp"><col class="c-date"><col class="c-amt"><col class="c-total"></colgroup>
        <thead><tr><th class="caption" colspan="5">Cashflow Plan</th></tr>
        <tr><th>Account</th><th>Expense</th><th>Date</th><th class="num">Amount</th><th class="num">Monthly total</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr><td colspan="4">Take-home pay into the Hub</td><td class="num">${P.fmt(t.income)}</td></tr>
          <tr><td colspan="4">Assigned to the four buckets <span class="${t.over ? "bad" : "ok"}">${t.over ? `(over by ${P.fmt(-t.goals)})` : "(100% ✓)"}</span></td><td class="num">${P.fmt(assigned)}</td></tr>
        </tfoot>
      </table></div>
      `;
    const refreshLabels = () => $$("[data-printed]", $("#plan")).forEach((el) => { el.textContent = P.accountLabel(state, el.dataset.printed); });
    $$("[data-acct]", $("#plan")).forEach((inp) => inp.addEventListener("input", () => {
      const id = inp.dataset.acct, k = inp.dataset.k;
      if (k === "last4") inp.value = inp.value.replace(/\D/g, "").slice(0, 4);
      state.accounts[id] = { ...(state.accounts[id] || {}), [k]: inp.value };
      // Same bank for every personal account (the Mapper's rule): typing it once fills the empty boxes.
      if (k === "bank") $$('[data-k="bank"]', $("#plan")).forEach((o) => { if (o !== inp && !o.value.trim()) { o.value = inp.value; state.accounts[o.dataset.acct] = { ...(state.accounts[o.dataset.acct] || {}), bank: inp.value }; } });
      save(); refreshLabels();
    }));
    $("#plannav").innerHTML = `<button class="btn ghost" id="planback">Back</button><span class="copied" id="copied" aria-live="polite"></span>`;
    $("#planback").addEventListener("click", back);
    wirePie($("#plan"));
    requestAnimationFrame(drawMapLinks);
    if (mapObserver) mapObserver.disconnect();
    mapObserver = new ResizeObserver(drawMapLinks);
    mapObserver.observe($("#fmap"));
  }
  let mapObserver = null;
  // Arrows with the monthly amount sitting upright at each arrow's midpoint.
  function drawMapLinks() {
    const map = $("#fmap");
    const svg = map && $("svg.links", map);
    if (!svg) return;
    if (window.innerWidth <= 720) { svg.innerHTML = ""; return; }
    const mr = map.getBoundingClientRect();
    const rect = (id) => { const el = map.querySelector(`[data-id="${id}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left - mr.left, y: b.top - mr.top, w: b.width, h: b.height, cx: b.left - mr.left + b.width / 2, bottom: b.bottom - mr.top }; };
    const amountOf = (id) => { const el = map.querySelector(`[data-id="${id}"] .amt`); return el ? el.textContent.replace(/\s+/g, "") : ""; };
    let out = `<defs><marker id="farr" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path class="head" d="M0,0 L9,4.5 L0,9 z"/></marker></defs>`;
    const tag = (x, y, text) => {
      const w = text.length * 7.6 + 14, h = 20;
      return `<rect class="tagbg" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="4"/><text class="flow" x="${x}" y="${y + 4.5}" text-anchor="middle">${esc(text)}</text>`;
    };
    const arrow = (from, to, label, nudge = 0) => {
      out += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" marker-end="url(#farr)"/>`;
      out += tag((from.x + to.x) / 2 + nudge, (from.y + to.y) / 2, label);
    };
    const inc = rect("income"), hub = rect("hub");
    if (inc && hub) arrow({ x: inc.cx, y: inc.bottom }, { x: hub.cx, y: hub.y - 1 }, amountOf("income"));
    const ids = Array.from(map.querySelectorAll(".fm-buckets .node")).map((n) => n.dataset.id);
    ids.forEach((id) => { const b = rect(id); if (hub && b) arrow({ x: hub.cx, y: hub.bottom }, { x: b.cx, y: b.y - 1 }, amountOf(id)); });
    const g = rect("goals"), gp = rect("goalpill");
    if (g && gp) arrow({ x: g.cx, y: g.bottom }, { x: gp.cx, y: gp.y - 1 }, amountOf("goals"));
    svg.innerHTML = out;
  }

  // ---------------------------------------------------------
  //  EXPORTS
  // ---------------------------------------------------------
  async function exportPng() {
    if (!window.html2canvas) return;
    const card = $("#plancard");
    card.classList.add("exporting");
    let canvas;
    try { canvas = await html2canvas(card, { backgroundColor: "#ffffff", scale: 2, useCORS: true, ignoreElements: (el) => el.id === "planactions" || el.id === "plannav" }); }
    finally { card.classList.remove("exporting"); }
    const url = canvas.toDataURL("image/png");
    $("#shot").src = url; $("#dl").href = url; $("#overlay").hidden = false;
  }
  function downloadCsv() {
    const blob = new Blob(["﻿" + P.csv(state)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(P.trim(state.name) || "my").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cashflow-plan.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function copyTsv() {
    const text = P.tsv(state);
    const note = $("#copied");
    const done = () => { note.textContent = "Copied. Open a blank Google Sheet, click cell A1 and paste."; setTimeout(() => (note.textContent = ""), 6000); };
    try { await navigator.clipboard.writeText(text); done(); return; } catch (e) {}
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { note.textContent = "Copying is blocked here. Use the CSV download instead."; }
    ta.remove();
  }

  // ---------------------------------------------------------
  //  RENDER: show exactly one screen
  // ---------------------------------------------------------
  function renderProgress() {
    const { list, s } = current();
    const firstIndex = (stage) => list.findIndex((x) => x.stage === stage);
    const nowIdx = STAGES.findIndex((st) => st.id === s.stage);
    $("#progress").innerHTML = STAGES.map((st, i) => {
      const cls = i < nowIdx ? "done" : i === nowIdx ? "now" : "";
      const can = firstIndex(st.id) <= (state.reached || 0);
      return `<span class="${cls}" ${can ? `role="button" tabindex="0" data-stage="${st.id}" style="cursor:pointer"` : ""}>${esc(st.label)}</span>`;
    }).join("");
    $$("[data-stage]", $("#progress")).forEach((el) => {
      const go = () => goTo(list.find((x) => x.stage === el.dataset.stage).id);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }
  function render() {
    const { s } = current();
    const panel = $("#panel"), card = $("#plancard");
    $("#progress").hidden = false;
    $("#restart").hidden = false;
    renderProgress();
    panel.hidden = s.id === "plan";
    card.hidden = s.id !== "plan";
    if (s.id === "name") renderName(panel);
    else if (s.id === "partner") renderPartner(panel);
    else if (s.id === "partnerName") renderPartnerName(panel);
    else if (s.id === "income" || s.id === "bills") renderList(panel, s.id);
    else if (s.id === "upcoming") renderUpcoming(panel);
    else if (s.id === "spending") renderSpending(panel);
    else if (s.id === "balance") renderBalance(panel);
    else if (s.id === "plan") renderPlan();
    postHeight();
  }
  function postHeight() {
    try { if (window.parent !== window) window.parent.postMessage({ plannerHeight: document.documentElement.scrollHeight }, "*"); } catch (e) {}
  }

  // "Start over" asks twice: the first click arms it, the second erases.
  let armed = null;
  function restart() {
    const b = $("#restart");
    if (armed) { clearTimeout(armed); armed = null; state = blank(); save(); b.textContent = "Start over"; render(); return; }
    b.textContent = "Click again to erase everything";
    armed = setTimeout(() => { armed = null; b.textContent = "Start over"; }, 4000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#tagline").textContent = C.tagline || "";
    $("#footnote").textContent = C.footnote || "";
    $("#png").addEventListener("click", exportPng);
    $("#csv").addEventListener("click", downloadCsv);
    $("#copy").addEventListener("click", copyTsv);
    $("#print").addEventListener("click", () => window.print());
    $("#restart").addEventListener("click", restart);
    $("#close").addEventListener("click", () => ($("#overlay").hidden = true));
    $("#overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) $("#overlay").hidden = true; });
    new ResizeObserver(postHeight).observe(document.body);
    initGate();
  });
})();
