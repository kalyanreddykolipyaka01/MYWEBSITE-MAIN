/* =========================================
   California Trip — script.js (Firebase sync)
========================================= */

/* ===== 17 people (first 5 letters code) =====
   Using the exact mapping you provided (case-insensitive codes) */
const PEOPLE = [
  { code: "NIKHI", name: "NIKHITHARED" },
  { code: "KEERT", name: "KEERTHI" },
  { code: "KALYA", name: "KALYANRE" },
  { code: "DINES", name: "DINESHKUMAR" },
  { code: "SRIKA", name: "SRIKANTH" },
  { code: "ABHIS", name: "ABHISH" },
  { code: "SEVIK", name: "SEVIKA" },
  { code: "VAISH", name: "VAISHNAVI" },
  { code: "PRASH", name: "PRASHAN" },
  { code: "TEJAS", name: "TEJASWIREDDY" },
  { code: "CHARA", name: "CHARANRE" },
  { code: "SRINI", name: "SRINIKA" },
  { code: "SANDE", name: "SANDEEP" },
  { code: "PRUDH", name: "PRUDHVI" },
  { code: "SRIJA", name: "SRIJA" },
  { code: "VIVEK", name: "VIVEKREDDY" },
  { code: "THIRU", name: "THIRUMALA" }
];

/* ===== Local-only keys ===== */
const LS_CURRENT = "currentUserCode"; // remember who is logged-in on this device

/* ===== Cached shared responses (from Firebase) =====
   Shape: { [code]: {status: "Interested"|"Not Interested", ts: ISOString} } */
let RESPONSES_CACHE = {};

/* ===== DOM helpers ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ===== Firebase helpers ===== */
function getDB() {
  try {
    // will throw if firebase not loaded or not initialized
    return firebase?.database();
  } catch { return null; }
}
async function fbSaveResponse(code, status) {
  const db = getDB();
  const ts = new Date().toISOString();
  if (!db) {
    // no firebase configured → update cache only (not cross-device)
    RESPONSES_CACHE[code] = { status, ts };
    return;
  }
  await db.ref(`responses/${code}`).set({ status, ts });
}
function fbSubscribeResponses(onChange) {
  const db = getDB();
  if (!db) {
    // no realtime subscription without Firebase
    onChange(RESPONSES_CACHE);
    return () => {};
  }
  const ref = db.ref("responses");
  ref.on("value", snap => onChange(snap.val() || {}));
  return () => ref.off();
}
async function fbGetResponsesOnce() {
  const db = getDB();
  if (!db) return RESPONSES_CACHE;
  const snap = await db.ref("responses").get();
  return snap.val() || {};
}

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", () => {
  setupStartScreen();
  buildPeopleGrid();
  wireNavigation();
  decideInitialScreen();

  // Live-sync: update UI whenever responses change in Firebase
  fbSubscribeResponses((all) => {
    RESPONSES_CACHE = all || {};
    updatePeopleBadges();
    if ($("#screen-emergency")?.classList.contains("active")) {
      renderEmergencyWithData(RESPONSES_CACHE);
    }
  });
});

/* ===== Router ===== */
function show(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id)?.classList.add("active");
  if (id === "screen-emergency") renderEmergency();
}
function decideInitialScreen() {
  const savedUser = localStorage.getItem(LS_CURRENT);
  if (savedUser && PEOPLE.find(p => p.code === savedUser)) show("screen-emergency");
  else show("screen-start");
}

/* ===== Screen 1: 4 checkboxes gate ===== */
function setupStartScreen() {
  const btn   = $("#btn-start-continue");
  const boxes = $$(".ack");
  if (!btn) return;
  const update = () => { btn.disabled = !boxes.every(b => b.checked); };
  update();
  boxes.forEach(b => { b.addEventListener("change", update); b.addEventListener("input", update); });
  btn.addEventListener("click", (e)=>{ e.preventDefault(); show("screen-response"); });
}

/* ===== Screen 2: Response (login + choose) ===== */
function buildPeopleGrid() {
  const grid = $("#people-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const current = localStorage.getItem(LS_CURRENT);

  PEOPLE.forEach(person => {
    const status = (RESPONSES_CACHE[person.code]?.status) || "Pending";

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

    bYes.addEventListener("click", async () => {
      await saveResponse(person.code, "Interested", badge);
    });
    bNo.addEventListener("click", async () => {
      await saveResponse(person.code, "Not Interested", badge);
    });

    group.appendChild(bYes); group.appendChild(bNo);

    card.appendChild(title); card.appendChild(help); card.appendChild(badge); card.appendChild(group);
    grid.appendChild(card);
  });

  // lock all, then unlock only the validated user (if any)
  lockAllCards(true);
  if (current) unlockCard(current);

  // wire login + next + reset
  $("#btn-validate")?.addEventListener("click", onValidateCode);
  $("#btn-response-next")?.addEventListener("click", () => show("screen-emergency"));
  $("#btn-reset")?.addEventListener("click", resetCurrentUser);
}

function lockAllCards(lock=true){
  $$("#people-grid .person .btn-group button").forEach(b => b.disabled = lock);
}
function unlockCard(code){
  $$("#people-grid .person").forEach(card=>{
    const lock = card.dataset.code !== code;
    card.querySelectorAll(".btn-group button").forEach(b => b.disabled = lock);
  });
}
function updatePeopleBadges(){
  $$("#people-grid .person").forEach(card=>{
    const code = card.dataset.code;
    const badge = card.querySelector(".badge");
    const status = (RESPONSES_CACHE[code]?.status) || "Pending";
    badge.className = "badge " + (
      status === "Interested" ? "ok" :
      status === "Not Interested" ? "no" : "pending"
    );
    badge.textContent = status;
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

async function saveResponse(code, status, badgeEl) {
  // optimistic UI
  badgeEl.className = "badge " + (status === "Interested" ? "ok" : "no");
  badgeEl.textContent = status;

  await fbSaveResponse(code, status);

  // Update local cache immediately for fallback cases
  RESPONSES_CACHE[code] = { status, ts: new Date().toISOString() };

  // If emergency screen is open, refresh it
  if ($("#screen-emergency")?.classList.contains("active")) {
    renderEmergencyWithData(RESPONSES_CACHE);
  }
}

function resetCurrentUser() {
  localStorage.removeItem(LS_CURRENT);
  $("#code-feedback").textContent = "";
  $("#code-feedback").className = "feedback";
  $("#code-input").value = "";
  lockAllCards(true);
}

/* ===== Screen 3: Emergency + Table + Gate ===== */
async function renderEmergency() {
  const all = await fbGetResponsesOnce();
  RESPONSES_CACHE = all || RESPONSES_CACHE;
  renderEmergencyWithData(RESPONSES_CACHE);
}

function renderEmergencyWithData(responses) {
  const tbody = $("#responses-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  PEOPLE.forEach((p, i) => {
    const status = responses[p.code]?.status || "Pending";
    const when = responses[p.code]?.ts ? new Date(responses[p.code].ts).toLocaleString() : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${p.name}</td><td>${status}</td><td>${when}</td>`;
    tbody.appendChild(tr);
  });

  // Gate message
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
  $("#btn-emergency-continue")?.addEventListener("click", async () => {
    const latest = await fbGetResponsesOnce();
    const missing = PEOPLE.filter(p => (latest[p.code]?.status || "Pending") !== "Interested");
    if (missing.length) { alert("Everyone must be 'Interested' to open the Roadmap."); return; }
    show("day-1");
  });
}

/* ===== Navigation for Next/Previous buttons ===== */
function wireNavigation(){
  document.body.addEventListener("click", async (e)=>{
    const btn = e.target.closest("[data-goto]");
    if (!btn) return;
    const target = btn.getAttribute("data-goto");

    if (target === "day-1") {
      // enforce gate using latest shared data
      const latest = await fbGetResponsesOnce();
      const notReady = PEOPLE.filter(p => (latest[p.code]?.status || "Pending") !== "Interested");
      if (notReady.length) { alert("Everyone must be 'Interested' to open the Roadmap."); return; }
    }
    show(target);
  });
}
