// =====================
// ====== STORAGE ======
// =====================
const KEY = "reglife_state_v4";

const defaultState = {
  age: 14,
  cash: 50,
  health: 60,
  brains: 5,
  inventory: [],
  unlocks: { ps5: false, jobBonusPaid: false },
  lastAgeUpdateMs: Date.now(),
};

function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(defaultState);
  const parsed = JSON.parse(raw);
  return {
    ...structuredClone(defaultState),
    ...parsed,
    unlocks: { ...structuredClone(defaultState.unlocks), ...(parsed.unlocks || {}) },
  };
}

let state = loadState();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 1800);
}

// =====================
// ===== HEADER ========
// =====================
function renderHeader() {
  document.getElementById("age")?.textContent = state.age;
  document.getElementById("cash")?.textContent = `£${state.cash}`;
  document.getElementById("health")?.textContent = `${state.health}%`;
  document.getElementById("brains")?.textContent = state.brains;
}

// =====================
// ===== WORK PAGE =====
// =====================
function renderWorkGate() {
  const box = document.getElementById("workMsg");
  if (!box) return;

  box.innerHTML = "";

  const ready =
    state.age >= 16 &&
    state.brains >= 8 &&
    state.health >= 80;

  if (ready) {
    const btn = document.createElement("div");
    btn.className = "task";
    btn.textContent =
      "🎉 Congrats! You're ready to get a job and earn some cash! Sign-on bonus: £3,000";

    if (!state.unlocks.jobBonusPaid) {
      state.cash = 3000;
      state.unlocks.jobBonusPaid = true;
      saveState();
      renderHeader();
      toast("💷 £3,000 sign-on bonus added!");
    }

    box.appendChild(btn);
    return;
  }

  if (state.brains < 8) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent = "🧠 You're not smart enough to get a job — go back to school";
    box.appendChild(b);
  }

  if (state.health <= 70) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent =
      "💪 You're not in good enough shape to get a job — go to the gym and eat better";
    box.appendChild(b);
  }

  if (state.age <= 15) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent =
      "📅 You're too young to get a job — come back when you're 16";
    box.appendChild(b);
  }
}

// =====================
// ===== TASKS =========
// =====================
function completeTask(taskId) {
  if (taskId === "mathsTest") {
    startMathsTest();
    return;
  }
}

// =====================
// ===== MATHS TEST ====
// =====================
let mathTimerId = null;
let mathTimeLeft = 30;
let mathIndex = 0;
let mathScore = 0;
let mathQs = [];

function startMathsTest() {
  const section = document.getElementById("mathSection");
  const timerEl = document.getElementById("mathTimer");
  const qEl = document.getElementById("mathQuestion");
  const optEl = document.getElementById("mathOptions");
  const statusEl = document.getElementById("mathStatus");
  const progressEl = document.getElementById("mathProgress");
  const scoreEl = document.getElementById("mathScore");

  section.hidden = false;
  mathIndex = 0;
  mathScore = 0;
  mathTimeLeft = 30;

  mathQs = Array.from({ length: 5 }, () => {
    const a = 2 + Math.floor(Math.random() * 11);
    const b = 2 + Math.floor(Math.random() * 11);
    return { a, b, ans: a * b };
  });

  clearInterval(mathTimerId);
  mathTimerId = setInterval(() => {
    mathTimeLeft--;
    timerEl.textContent = `⏱️ ${mathTimeLeft}s`;
    if (mathTimeLeft <= 0) {
      clearInterval(mathTimerId);
      statusEl.textContent = "⏱️ Time's up! Try again.";
      toast("⏱️ Maths test failed");
    }
  }, 1000);

  function renderQ() {
    const q = mathQs[mathIndex];
    progressEl.textContent = `Q${mathIndex + 1} / 5`;
    scoreEl.textContent = `Score: ${mathScore}`;
    qEl.textContent = `${q.a} × ${q.b} = ?`;

    const opts = [q.ans, q.ans + 2, q.ans - 2, q.ans + 4].sort(
      () => Math.random() - 0.5
    );

    optEl.innerHTML = "";
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.textContent = o;
      b.onclick = () => {
        if (o === q.ans) mathScore++;
        mathIndex++;
        if (mathIndex === 5) finish();
        else renderQ();
      };
      optEl.appendChild(b);
    });
  }

  function finish() {
    clearInterval(mathTimerId);
    if (mathScore === 5 && mathTimeLeft > 0) {
      state.brains = clamp(state.brains + 1, 1, 10);
      toast("🧠 Maths smashed! Brains +1");
    } else {
      toast("❌ Maths test failed");
    }
    saveState();
    renderHeader();
  }

  renderQ();
}

// =====================
// ===== INIT =========
// =====================
document
  .querySelectorAll("button[data-task]")
  .forEach((b) =>
    b.addEventListener("click", () => completeTask(b.dataset.task))
  );

renderHeader();
renderWorkGate();
saveState();