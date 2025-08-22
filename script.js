/* =========================================
   California Trip — script.js
========================================= */

/* ===== 17 people (first 5 letters code) ===== */
const PEOPLE = [
  { code: "NIKHI", name: "NIKHITHA REDD" },
  { code: "KEERT", name: "KEERTHI" },
  { code: "KALYA", name: "KALYANRE" },
  { code: "DINES", name: "DINESH KUMAR" },
  { code: "SRIKA", name: "SRIKANTH" },
  { code: "ABHIS", name: "ABHISH" },
  { code: "SEVIK", name: "SEVIKA" },
  { code: "VAISH", name: "VAISHNAVI" },
  { code: "PRASH", name: "PRASHAN" },
  { code: "TEJAS", name: "TEJASWI REDDY" },
  { code: "CHARA", name: "CHARANRE" },
  { code: "SRINI", name: "SRINIKA" },
  { code: "SANDE", name: "SANDEEP" },
  { code: "PRUDH", name: "PRUDHVI" },
  { code: "SRIJA", name: "SRIJA" },
  { code: "VIVEK", name: "VIVEK REDDY" },
  { code: "THIRU", name: "THIRUMALA" }
];

/* ===== Storage keys ===== */
const LS_RESPONSES = "trip_responses"; // { [code]: {status, ts} }
const LS_CURRENT   = "currentUserCode"; // "NIKHI", ...

/* ===== DOM helpers ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

document.addEventListener("DOMContentLoaded", () => {
  setupStartScreen();
  buildPeopleGrid();
  wireNavigation();
  decideInitialScreen();
});

/* ===== Router ===== */
function show(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  const node = document.getElementById(id);
  if (node) node.classList.add("active");
  if (id === "screen-emergency") renderEmergency();
}

function decideInitialScreen() {
  const savedUser = localStorage.getItem(LS_CURRENT);
  if (savedUser && PEOPLE.find(p => p.code === savedUser)) {
    // Returning user → skip to Emergency
    show("screen-emergency");
  } else {
    show("screen-start");
  }
}

/* ===== Screen 1: 4 checkboxes gate ===== */
function setupStartScreen() {
  const btn   = $("#btn-start-continue");
  const boxes = $$(".ack");

  if (!btn || boxes.length < 4) return;

  const update = () => {
    btn.disabled = !boxes.every(b => b.checked);
  };

  // initial + listeners
  update();
  boxes.forEach(b => {
    b.addEventListener("change", update);
    b.addEventListener("input", update);
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    show("screen-response");
  });
}

/* ===== Screen 2: Response ===== */
function buildPeopleGrid() {
  const grid = $("#people-grid");
  if (!grid) return;

  grid.innerHTML = "";
  const responses = readResponses();
  const current = localStorage.getItem(LS_CURRENT);

  PEOPLE.forEach(person => {
    const status = responses[person.code]?.status ?? "Pending";

    const card = document.createElement("div");
    card.className = "person";
    card.dataset.code = person.code;

    const title = document.createElement("h4");
    title.textContent = person.name.toUpperCase();

    const help = document.createElement("div");
    help.className = "muted";
    help.textContent = "Choose a response";

    const badge = document.createElement("span");
    badge.className = "badge " + (
      status === "Interested" ? "ok" :
      status === "Not Interested" ? "no" : "pending"
    );
    badge.textContent = status;

    const group = document.createElement("div");
    group.className = "btn-group";
    const bYes = document.createElement("button");
    bYes.className = "btn";
    bYes.textContent = "Interested";
    const bNo = document.createElement("button");
    bNo.className = "btn";
    bNo.textContent = "Not Interested";

    bYes.addEventListener("click", () => saveResponse(person.code, "Interested", badge));
    bNo.addEventListener("click", () => saveResponse(person.code, "Not Interested", badge));

    group.appendChild(bYes);
    group.appendChild(bNo);

    card.appendChild(title);
    card.appendChild(help);
    card.appendChild(badge);
    card.appendChild(group);
    grid.appendChild(card);
  });

  // lock/unlock based on who validated
  lockAllCards(true);
  const currentCode = current ?? null;
  if (currentCode) unlockCard(currentCode);

  // wire login + next + reset
  const validateBtn = $("#btn-validate");
  const nextBtn = $("#btn-response-next");
  const resetBtn = $("#btn-reset");
  if (validateBtn) validateBtn.onclick = onValidateCode;
  if (nextBtn) nextBtn.onclick = () => show("screen-emergency");
  if (resetBtn) resetBtn.onclick = resetCurrentUser;
}

function lockAllCards(lock=true){
  $$("#people-grid .person .btn-group").forEach(g => {
    g.querySelectorAll("button").forEach(b => b.disabled = lock);
  });
}
function unlockCard(code){
  $$("#people-grid .person").forEach(card=>{
    const lock = card.dataset.code !== code;
    card.querySelectorAll(".btn-group button").forEach(b => b.disabled = lock);
  });
}

function onValidateCode() {
  const input    = $("#code-input");
  const feedback = $("#code-feedback");
  const code = (input?.value || "").trim().toUpperCase();
  const match = PEOPLE.find(p => p.code === code);

  if (!match) {
    feedback.textContent = "Not found. Enter the first 5 letters of your first name (case-insensitive).";
    feedback.className = "feedback err";
    localStorage.removeItem(LS_CURRENT);
    lockAllCards(true);
    return;
  }

  localStorage.setItem(LS_CURRENT, code);
  feedback.textContent = `Welcome ${match.name}! Your card is unlocked below.`;
  feedback.className = "feedback ok";
  unlockCard(code);
}

function saveResponse(code, status, badgeEl) {
  const responses = readResponses();
  responses[code] = { status, ts: new Date().toISOString() };
  localStorage.setItem(LS_RESPONSES, JSON.stringify(responses));
  badgeEl.className = "badge " + (status === "Interested" ? "ok" : "no");
  badgeEl.textContent = status;
}

function resetCurrentUser() {
  localStorage.removeItem(LS_CURRENT);
  const feedback = $("#code-feedback");
  if (feedback) { feedback.textContent = ""; feedback.className = "feedback"; }
  const input = $("#code-input"); if (input) input.value = "";
  lockAllCards(true);
}

/* ===== Screen 3: Emergency + Table + Gate ===== */
function renderEmergency() {
  const tbody = $("#responses-table tbody");
  if (!tbody) return;

  const responses = readResponses();
  tbody.innerHTML = "";

  PEOPLE.forEach((p, i) => {
    const status = responses[p.code]?.status || "Pending";
    const when = responses[p.code]?.ts ? new Date(responses[p.code].ts).toLocaleString() : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${p.name}</td><td>${status}</td><td>${when}</td>`;
    tbody.appendChild(tr);
  });

  // Gate
  const notReady = PEOPLE.filter(p => (responses[p.code]?.status || "Pending") !== "Interested");
  const banner = $("#gate-banner");
  if (banner) {
    if (notReady.length) {
      banner.classList.remove("hidden");
      banner.textContent = `⛔ Roadmap locked. Not Interested / Missing: ${notReady.map(n => n.name).join(", ")}`;
    } else {
      banner.classList.add("hidden");
      banner.textContent = "";
    }
  }

  // Buttons
  $("#btn-emergency-back")?.addEventListener("click", () => show("screen-response"));
  $("#btn-emergency-continue")?.addEventListener("click", () => {
    if (notReady.length) { alert("Everyone must be 'Interested' to open the Roadmap."); return; }
    show("day-1");
  });
}

/* ===== Navigation for Next/Previous buttons ===== */
function wireNavigation(){
  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-goto]");
    if (!btn) return;
    const target = btn.getAttribute("data-goto");

    if (target === "day-1") {
      // entering roadmap → enforce gate
      const responses = readResponses();
      const notReady = PEOPLE.filter(p => (responses[p.code]?.status || "Pending") !== "Interested");
      if (notReady.length) { alert("Everyone must be 'Interested' to open the Roadmap."); return; }
    }
    show(target);
  });
}

/* ===== Storage helpers ===== */
function readResponses() {
  try { return JSON.parse(localStorage.getItem(LS_RESPONSES) || "{}"); }
  catch { return {}; }
}
