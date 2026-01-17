// =====================
// ====== STORAGE ======
// =====================
const KEY = "reglife_state_v5";

const defaultState = {
  age: 14,
  cash: 50,
  health: 60,    // 0–100
  brains: 5,     // 1–10
  inventory: [],
  unlocks: { ps5: false, jobBonusPaid: false },
  lastAgeUpdateMs: Date.now(),
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      unlocks: { ...structuredClone(defaultState.unlocks), ...(parsed.unlocks || {}) },
    };
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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
// ====== AGE TICK =====
// =====================
function applyAgeTick() {
  const now = Date.now();
  const last = state.lastAgeUpdateMs || now;
  const elapsedMs = now - last;
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));

  if (hours > 0) {
    state.age += hours;
    state.lastAgeUpdateMs = last + hours * (60 * 60 * 1000);
    saveState();
  }
}

setInterval(() => {
  applyAgeTick();
  renderHeader();
  renderWorkGate();
}, 60 * 1000);

applyAgeTick();

// =====================
// ====== HEADER =======
// =====================
function renderHeader() {
  document.getElementById("age")?.textContent = String(state.age);
  document.getElementById("cash")?.textContent = `£${state.cash}`;
  document.getElementById("health")?.textContent = `${state.health}%`;
  document.getElementById("brains")?.textContent = String(state.brains);
}

// =====================
// ======= SHOP =========
// =====================
const SHOP_ITEMS = [
  { id: "jordan1", name: "Jordan 1s", price: 500 },
  { id: "stussy", name: "Stüssy Hoodie", price: 250 },
  { id: "ps5", name: "PS5", price: 1000, requiresUnlock: "ps5" },
];

function renderShop() {
  const grid = document.getElementById("shopGrid");
  const invList = document.getElementById("inventoryList");
  if (!grid || !invList) return; // only on homepage

  grid.innerHTML = "";

  SHOP_ITEMS.forEach((item) => {
    const owned = state.inventory.includes(item.id);
    const locked = item.requiresUnlock ? !state.unlocks[item.requiresUnlock] : false;
    const canAfford = state.cash >= item.price;

    const row = document.createElement("div");
    row.className = "shop-item";

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name + (owned ? " ✅" : "");

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = `£${item.price}`;

    meta.appendChild(name);
    meta.appendChild(price);

    if (locked) {
      const note = document.createElement("div");
      note.className = "note";
      note.textContent = "🔒 Pass the French quiz to unlock";
      meta.appendChild(note);
    }

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.type = "button";

    if (owned) {
      btn.textContent = "Owned";
      btn.disabled = true;
    } else if (locked) {
      btn.textContent = "Locked";
      btn.disabled = true;
    } else {
      btn.textContent = "Buy";
      btn.disabled = !canAfford;
    }

    btn.addEventListener("click", () => {
      if (owned || locked) return;
      if (state.cash < item.price) return;

      state.cash -= item.price;
      state.inventory.push(item.id);
      saveState();

      toast(`🛍️ Bought ${item.name}!`);
      renderHeader();
      renderShop();
    });

    row.appendChild(meta);
    row.appendChild(btn);
    grid.appendChild(row);
  });

  invList.innerHTML = "";
  if (state.inventory.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nothing yet. Earn cash and buy something 😈";
    invList.appendChild(li);
  } else {
    state.inventory.forEach((id) => {
      const item = SHOP_ITEMS.find((x) => x.id === id);
      const li = document.createElement("li");
      li.textContent = item ? item.name : id;
      invList.appendChild(li);
    });
  }
}

// =====================
// ======= WORK =========
// =====================
function renderWorkGate() {
  const box = document.getElementById("workMsg");
  if (!box) return;

  box.innerHTML = "";

  const ready = state.age >= 16 && state.brains >= 8 && state.brains <= 10 && state.health >= 80;

  if (ready) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent =
      "🎉 Congrats, you're ready to get a job, and earn some cash!! Here's a sign-on bonus of £3,000";
    box.appendChild(b);

    if (!state.unlocks.jobBonusPaid) {
      state.cash = 3000;
      state.unlocks.jobBonusPaid = true;
      saveState();
      renderHeader();
      toast("💷 Sign-on bonus paid: £3,000!");
    }
    return;
  }

  if (state.brains < 8) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent = "🧠 You're not smart enough to get a job - go back to school";
    box.appendChild(b);
  }

  if (state.health <= 70) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent = "💪 You're not in good enough shape to get a job - go to the gym and eat better";
    box.appendChild(b);
  }

  if (state.age <= 15) {
    const b = document.createElement("div");
    b.className = "task";
    b.textContent = "📅 You're too young to get a job - come back when you're 16";
    box.appendChild(b);
  }
}

// =====================
// ===== TASKS =========
// =====================
function completeTask(taskId) {
  switch (taskId) {
    case "pushups":
      state.cash += 10;
      state.health = clamp(state.health + 10, 0, 100);
      toast("✅ 10 push-ups done! +£10, Health +10%");
      break;

    case "run":
      state.cash += 15;
      state.health = clamp(state.health + 10, 0, 100);
      toast("✅ Run complete! +£15, Health +10%");
      break;

    case "healthy":
      state.health = clamp(state.health + 10, 0, 100);
      toast("🥗 Healthy meal! Health +10%");
      break;

    case "maccas":
      state.health = clamp(state.health - 10, 0, 100);
      toast("🍟 McDonalds… Health -10%");
      break;

    case "sleep":
      state.health = clamp(state.health - 10, 0, 100);
      state.brains = clamp(state.brains - 1, 1, 10);
      toast("😴 Slept in… Health -10%, Brains -1");
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

    default:
      toast("✅ Task complete!");
  }

  saveState();
  renderHeader();
  renderShop();
  renderWorkGate();
}

function wireTaskButtons() {
  document.querySelectorAll("button[data-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.getAttribute("data-task");
      if (!taskId) return;
      completeTask(taskId);
    });
  });
}

// =====================
// ===== FRENCH QUIZ ====
// =====================
const FRENCH_BANK = [
  { fr: "bonjour", en: "hello" },
  { fr: "merci", en: "thank you" },
  { fr: "au revoir", en: "goodbye" },
  { fr: "pomme", en: "apple" },
  { fr: "chien", en: "dog" },
  { fr: "chat", en: "cat" },
  { fr: "eau", en: "water" },
  { fr: "pain", en: "bread" },
  { fr: "fromage", en: "cheese" },
  { fr: "maison", en: "house" },
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(arr, n) {
  const copy = [...arr];
  shuffle(copy);
  return copy.slice(0, n);
}

function buildOptions(correct, pool) {
  const wrong = pickRandom(pool.filter((x) => x !== correct), 3);
  return shuffle([correct, ...wrong]);
}

function startFrenchQuiz() {
  const section = document.getElementById("quizSection");
  const progressEl = document.getElementById("quizProgress");
  const scoreEl = document.getElementById("quizScore");
  const questionEl = document.getElementById("quizQuestion");
  const optionsEl = document.getElementById("quizOptions");
  const statusEl = document.getElementById("quizStatus");

  if (!section || !progressEl || !scoreEl || !questionEl || !optionsEl || !statusEl) {
    toast("Quiz UI not found on this page.");
    return;
  }

  section.hidden = false;

  let qs = pickRandom(FRENCH_BANK, 5);
  let idx = 0;
  let score = 0;

  statusEl.textContent = "Get 4/5 to unlock the PS5 in the shop.";
  renderQ();

  function renderQ() {
    const q = qs[idx];
    progressEl.textContent = `Q${idx + 1} / 5`;
    scoreEl.textContent = `Score: ${score}`;
    questionEl.textContent = `What does “${q.fr}” mean?`;

    optionsEl.innerHTML = "";
    const opts = buildOptions(q.en, FRENCH_BANK.map((x) => x.en));

    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-option";
      b.textContent = opt;

      b.addEventListener("click", () => {
        [...optionsEl.querySelectorAll("button")].forEach((x) => (x.disabled = true));

        if (opt === q.en) {
          score++;
          b.classList.add("correct");
          statusEl.textContent = "✅ Correct!";
        } else {
          b.classList.add("wrong");
          statusEl.textContent = "❌ Nope!";
        }

        setTimeout(() => {
          idx++;
          if (idx >= 5) finish();
          else renderQ();
        }, 650);
      });

      optionsEl.appendChild(b);
    });
  }

  function finish() {
    scoreEl.textContent = `Score: ${score}`;
    if (score >= 4) {
      state.brains = clamp(state.brains + 1, 1, 10);
      state.cash += 50;

      const wasLocked = !state.unlocks.ps5;
      state.unlocks.ps5 = true;

      saveState();
      renderHeader();
      renderShop();
      renderWorkGate();

      statusEl.textContent = "🏆 Passed! +£50, Brains +1";
      if (wasLocked) toast("🎮 PS5 UNLOCKED in the Shop!");
    } else {
      statusEl.textContent = "Unlucky 😅 Get 4/5 to unlock the PS5. Try again!";
    }
  }

  section.scrollIntoView({ behavior: "smooth" });
}

// =====================
// ===== MATHS TEST =====
// =====================
let mathTimerId = null;

function startMathsTest() {
  const section = document.getElementById("mathSection");
  const progressEl = document.getElementById("mathProgress");
  const timerEl = document.getElementById("mathTimer");
  const scoreEl = document.getElementById("mathScore");
  const questionEl = document.getElementById("mathQuestion");
  const optionsEl = document.getElementById("mathOptions");
  const statusEl = document.getElementById("mathStatus");

  if (!section || !progressEl || !timerEl || !scoreEl || !questionEl || !optionsEl || !statusEl) {
    toast("Maths UI not found on this page.");
    return;
  }

  section.hidden = false;

  const qs = Array.from({ length: 5 }, () => {
    const a = 2 + Math.floor(Math.random() * 11);
    const b = 2 + Math.floor(Math.random() * 11);
    return { a, b, ans: a * b };
  });

  let idx = 0;
  let score = 0;
  let timeLeft = 30;
  let active = true;

  clearInterval(mathTimerId);
  timerEl.textContent = `⏱️ ${timeLeft}s`;

  statusEl.textContent = "30 seconds. Get 5/5 for Brains +1 🧠";

  mathTimerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏱️ ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(mathTimerId);
      active = false;
      statusEl.textContent = "⏱️ Time’s up! Try again.";
      toast("⏱️ Maths test failed");
      // lock options
      [...optionsEl.querySelectorAll("button")].forEach((b) => (b.disabled = true));
    }
  }, 1000);

  renderQ();

  function renderQ() {
    progressEl.textContent = `Q${idx + 1} / 5`;
    scoreEl.textContent = `Score: ${score}`;

    const q = qs[idx];
    questionEl.textContent = `${q.a} × ${q.b} = ?`;

    const wrongs = [];
    while (wrongs.length < 3) {
      const delta = [-6, -4, -2, 2, 4, 6][Math.floor(Math.random() * 6)];
      const w = q.ans + delta;
      if (w > 0 && w !== q.ans && !wrongs.includes(w)) wrongs.push(w);
    }
    const opts = shuffle([q.ans, ...wrongs]);

    optionsEl.innerHTML = "";
    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-option";
      b.textContent = String(opt);

      b.addEventListener("click", () => {
        if (!active) return;

        [...optionsEl.querySelectorAll("button")].forEach((x) => (x.disabled = true));

        if (opt === q.ans) {
          score++;
          b.classList.add("correct");
          statusEl.textContent = "✅ Correct!";
        } else {
          b.classList.add("wrong");
          statusEl.textContent = `❌ Nope — it was ${q.ans}`;
        }

        setTimeout(() => {
          idx++;
          if (idx >= 5) finish();
          else renderQ();
        }, 450);
      });

      optionsEl.appendChild(b);
    });
  }

  function finish() {
    clearInterval(mathTimerId);
    active = false;
    scoreEl.textContent = `Score: ${score}`;

    if (score === 5 && timeLeft > 0) {
      state.brains = clamp(state.brains + 1, 1, 10);
      saveState();
      renderHeader();
      renderWorkGate();
      toast("🧠 Maths smashed! Brains +1");
      statusEl.textContent = "🏆 Perfect score! Brains +1 🧠";
    } else {
      toast("❌ Maths test failed");
      statusEl.textContent = "Try again for 5/5 (and beat the timer).";
    }
  }

  section.scrollIntoView({ behavior: "smooth" });
}

// =====================
// ======= PUZZLE =======
// =====================
let puzzleTimerId = null;

function startPuzzle() {
  const section = document.getElementById("puzzleSection");
  const grid = document.getElementById("puzzleGrid");
  const status = document.getElementById("puzzleStatus");
  const timer = document.getElementById("puzzleTimer");

  if (!section || !grid || !status || !timer) {
    toast("Puzzle UI not found on this page.");
    return;
  }

  section.hidden = false;

  let next = 1;
  let timeLeft = 120;
  let active = true;

  timer.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
  status.textContent = "Go! Tap 1 → 20 in order.";
  grid.innerHTML = "";

  const nums = Array.from({ length: 20 }, (_, i) => i + 1);
  shuffle(nums);

  nums.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "puzzle-tile";
    btn.textContent = String(n);

    btn.addEventListener("click", () => {
      if (!active) return;

      if (n === next) {
        btn.classList.add("correct");
        btn.disabled = true;
        next++;

        if (next === 21) {
          clearInterval(puzzleTimerId);
          active = false;

          state.cash += 20;
          state.brains = clamp(state.brains + 1, 1, 10);
          saveState();
          renderHeader();
          renderShop();
          renderWorkGate();

          status.textContent = "✅ Puzzle complete! +£20 and Brains +1 🧠";
          toast("✅ Puzzle complete! +£20, Brains +1");
        } else {
          status.textContent = `Good! Next: ${next}`;
        }
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 250);
      }
    });

    grid.appendChild(btn);
  });

  clearInterval(puzzleTimerId);
  puzzleTimerId = setInterval(() => {
    timeLeft--;
    timer.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

    if (timeLeft <= 0) {
      clearInterval(puzzleTimerId);
      active = false;
      status.textContent = "⏱️ Time’s up! Try again.";
      toast("⏱️ Time’s up!");
    }
  }, 1000);

  section.scrollIntoView({ behavior: "smooth" });
}

// =====================
// ======= RESET ========
// =====================
function wireReset() {
  const btn = document.getElementById("resetBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!confirm("Reset everything?")) return;
    localStorage.removeItem(KEY);
    state = structuredClone(defaultState);
    saveState();
    location.reload();
  });
}

// =====================
// ===== INIT PAGE ======
// =====================
renderHeader();
renderShop();
renderWorkGate();
wireTaskButtons();
wireReset();
saveState();