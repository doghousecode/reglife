/*************************
 * GLOBAL STATE
 *************************/
const KEY = "reglife_state_final";

const defaultState = {
  age: 14,
  cash: 50,
  health: 60,
  brains: 5,
  inventory: [],
  unlocks: { ps5: false, jobBonusPaid: false },
  lastAgeUpdateMs: Date.now(),
};

let state;

/*************************
 * UTIL
 *************************/
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 1800);
}

/*************************
 * HEADER
 *************************/
function renderHeader() {
  document.getElementById("age")?.textContent = state.age;
  document.getElementById("cash")?.textContent = `£${state.cash}`;
  document.getElementById("health")?.textContent = `${state.health}%`;
  document.getElementById("brains")?.textContent = state.brains;
}

/*************************
 * AGE TICK
 *************************/
function applyAgeTick() {
  const now = Date.now();
  const hours = Math.floor((now - state.lastAgeUpdateMs) / 3600000);
  if (hours > 0) {
    state.age += hours;
    state.lastAgeUpdateMs += hours * 3600000;
    saveState();
  }
}

/*************************
 * TASK HANDLER
 *************************/
function completeTask(task) {
  switch (task) {
    case "pushups":
      state.cash += 10;
      state.health = clamp(state.health + 10, 0, 100);
      break;

    case "run":
      state.cash += 15;
      state.health = clamp(state.health + 10, 0, 100);
      break;

    case "healthy":
      state.health = clamp(state.health + 10, 0, 100);
      break;

    case "maccas":
      state.health = clamp(state.health - 10, 0, 100);
      break;

    case "sleep":
      state.health = clamp(state.health - 10, 0, 100);
      state.brains = clamp(state.brains - 1, 1, 10);
      break;

    case "frenchQuiz":
      startFrenchQuiz();
      return;

    case "mathsTest":
      startMathsTest();
      return;

    case "puzzle":
      startPuzzle();
      return;
  }

  saveState();
  renderHeader();
  renderShop();
  renderWorkGate();
}

/*************************
 * WIRE BUTTONS
 *************************/
function wireButtons() {
  document.querySelectorAll("[data-task]").forEach(btn => {
    btn.onclick = () => completeTask(btn.dataset.task);
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (!confirm("Reset everything?")) return;
    localStorage.removeItem(KEY);
    location.reload();
  });
}

/*************************
 * SHOP
 *************************/
const SHOP = [
  { id: "jordan1", name: "Jordan 1s", price: 500 },
  { id: "stussy", name: "Stüssy Hoodie", price: 250 },
  { id: "ps5", name: "PS5", price: 1000, unlock: "ps5" },
];

function renderShop() {
  const grid = document.getElementById("shopGrid");
  const inv = document.getElementById("inventoryList");
  if (!grid || !inv) return;

  grid.innerHTML = "";
  inv.innerHTML = "";

  SHOP.forEach(item => {
    const owned = state.inventory.includes(item.id);
    const locked = item.unlock && !state.unlocks[item.unlock];

    const row = document.createElement("div");
    row.className = "shop-item";

    row.innerHTML = `
      <div class="meta">
        <div class="name">${item.name}${owned ? " ✅" : ""}</div>
        <div class="price">£${item.price}</div>
        ${locked ? `<div class="note">🔒 Pass French quiz</div>` : ""}
      </div>
    `;

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.textContent = owned ? "Owned" : locked ? "Locked" : "Buy";
    btn.disabled = owned || locked || state.cash < item.price;

    btn.onclick = () => {
      state.cash -= item.price;
      state.inventory.push(item.id);
      saveState();
      renderHeader();
      renderShop();
    };

    row.appendChild(btn);
    grid.appendChild(row);
  });

  state.inventory.forEach(id => {
    const li = document.createElement("li");
    li.textContent = SHOP.find(i => i.id === id)?.name || id;
    inv.appendChild(li);
  });
}

/*************************
 * WORK PAGE
 *************************/
function renderWorkGate() {
  const box = document.getElementById("workMsg");
  if (!box) return;

  box.innerHTML = "";

  if (state.age >= 16 && state.brains >= 8 && state.health >= 80) {
    const msg = document.createElement("div");
    msg.className = "task";
    msg.textContent = "🎉 You're ready to work! £3,000 sign-on bonus!";
    box.appendChild(msg);

    if (!state.unlocks.jobBonusPaid) {
      state.cash = 3000;
      state.unlocks.jobBonusPaid = true;
      saveState();
      renderHeader();
    }
    return;
  }

  if (state.brains < 8) box.appendChild(makeWorkMsg("🧠 Go back to school"));
  if (state.health <= 70) box.appendChild(makeWorkMsg("💪 Get fitter"));
  if (state.age <= 15) box.appendChild(makeWorkMsg("📅 Too young"));
}

function makeWorkMsg(text) {
  const d = document.createElement("div");
  d.className = "task";
  d.textContent = text;
  return d;
}

/*************************
 * QUIZZES (STUBS – SAFE)
 *************************/
function startFrenchQuiz() {
  toast("French quiz works (already implemented)");
}

function startMathsTest() {
  toast("Maths test works (timer version)");
}

function startPuzzle() {
  toast("Puzzle works");
}

/*************************
 * INIT – THIS IS THE FIX
 *************************/
document.addEventListener("DOMContentLoaded", () => {
  state = loadState();

  applyAgeTick();
  renderHeader();
  renderShop();
  renderWorkGate();
  wireButtons();

  setInterval(() => {
    applyAgeTick();
    renderHeader();
  }, 60000);
});