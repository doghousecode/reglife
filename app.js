// =====================
// ====== STORAGE ======
// =====================
const KEY = "reglife_state_v2";

const defaultState = {
  age: 14,
  cash: 50,
  health: 60,   // 0–100
  brains: 5,    // 1–10
  inventory: [], // item ids
  unlocks: { ps5: false }, // unlocked-by-quiz
  lastAgeUpdateMs: Date.now(),
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
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
// Age increases +1 every hour (based on elapsed time, not just open tab time)
function applyAgeTick() {
  const now = Date.now();
  const elapsedMs = now - (state.lastAgeUpdateMs || now);
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));

  if (hours > 0) {
    state.age += hours;
    state.lastAgeUpdateMs += hours * (60 * 60 * 1000);
    saveState();
  }
}

// check every 60s so it updates while page open
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
  const ageEl = document.getElementById("age");
  const cashEl = document.getElementById("cash");
  const healthEl = document.getElementById("health");
  const brainsEl = document.getElementById("brains");

  if (ageEl) ageEl.textContent = String(state.age);
  if (cashEl) cashEl.textContent = `£${state.cash}`;
  if (healthEl) healthEl.textContent = `${state.health}%`;
  if (brainsEl) brainsEl.textContent = String(state.brains);
}

// =====================
// ====== TASKS ========
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

    case "puzzle":
      startPuzzle();
      return; // reward happens on completion

    case "frenchQuiz":
      startFrenchQuiz();
      return; // reward/unlock happens on completion

    default:
      toast("✅ Task complete!");
  }

  saveState();
  renderHeader();
  renderShop();
  renderWorkGate();
}

// wire all buttons with data-task
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
// ======= SHOP =========
// =====================
const SHOP_ITEMS = [
  { id: "jordan1", name: "Jordan 1s", price: 500 },
  { id: "stussy", name: "Stüssy Hoodie", price: 750 },
  { id: "ps5", name: "Virtual PS5", price: 2000, requiresUnlock: "ps5" },
];

function renderShop() {
  const grid = document.getElementById("shopGrid");
  const invList = document.getElementById("inventoryList");
  if (!grid || !invList) return; // only exists on homepage

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

  // Inventory list
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
  const msg = document.getElementById("workMsg");
  if (!msg) return;

  if (state.age >= 16 && state.brains >= 8) {
    msg.textContent = "What job do you want?";
  } else {
    msg.textContent = "You’re not ready to work — go back to school.";
  }
}

// =====================
// ======= QUIZ =========
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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickRandom(arr, n) {
  const copy = [...arr];
  shuffle(copy);
  return copy.slice(0, n);
}

function buildOptions(correctEn) {
  const wrong = pickRandom(
    FRENCH_BANK.map((q) => q.en).filter((x) => x !== correctEn),
    3
  );
  return shuffle([correctEn, ...wrong]);
}

let quizActive = false;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;

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

  quizActive = true;
  quizQuestions = pickRandom(FRENCH_BANK, 5);
  quizIndex = 0;
  quizScore = 0;

  statusEl.textContent = "Get 4/5 to unlock the PS5 in the shop.";
  renderNextQuizQ();

  function renderNextQuizQ() {
    const q = quizQuestions[quizIndex];
    progressEl.textContent = `Q${quizIndex + 1} / 5`;
    scoreEl.textContent = `Score: ${quizScore}`;
    questionEl.textContent = `What does “${q.fr}” mean?`;

    optionsEl.innerHTML = "";
    const opts = buildOptions(q.en);

    opts.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        if (!quizActive) return;

        // lock all
        [...optionsEl.querySelectorAll("button")].forEach((b) => (b.disabled = true));

        if (opt === q.en) {
          quizScore += 1;
          btn.classList.add("correct");
          statusEl.textContent = "✅ Correct!";
        } else {
          btn.classList.add("wrong");
          statusEl.textContent = "❌ Nope!";
        }

        setTimeout(() => {
          quizIndex += 1;

          if (quizIndex >= 5) {
            finishQuiz();
          } else {
            renderNextQuizQ();
          }
        }, 650);
      });

      optionsEl.appendChild(btn);
    });
  }

  function finishQuiz() {
    quizActive = false;
    scoreEl.textContent = `Score: ${quizScore}`;

    if (quizScore >= 4) {
      // rewards: brains +1, cash +50, unlock PS5
      state.brains = clamp(state.brains + 1, 1, 10);
      state.cash += 50;

      const wasLocked = !state.unlocks.ps5;
      state.unlocks.ps5 = true;

      saveState();
      renderHeader();
      renderShop();
      renderWorkGate();

      statusEl.textContent = "🏆 Passed! +£50, Brains +1";

      if (wasLocked) {
        // “banner” effect = toast + auto-scroll to shop if on homepage later
        toast("🎮 PS5 UNLOCKED in the Shop!");
      }
    } else {
      statusEl.textContent = "Unlucky 😅 Get 4/5 to unlock the PS5. Try again!";
      saveState();
      renderHeader();
      renderWorkGate();
    }
  }

  // scroll to quiz area
  section.scrollIntoView({ behavior: "smooth" });
}

// =====================
// ======= PUZZLE =======
// =====================
let puzzleActive = false;
let nextNumber = 1;
let timeLeft = 120;
let timerId = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

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

  puzzleActive = true;
  nextNumber = 1;
  timeLeft = 120;
  timer.textContent = formatTime(timeLeft);
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
      if (!puzzleActive) return;

      if (n === nextNumber) {
        btn.classList.add("correct");
        btn.disabled = true;
        nextNumber += 1;

        if (nextNumber === 21) {
          stopTimer();
          puzzleActive = false;

          // reward: cash +20 and brains +1 (counts as “test”)
          state.cash += 20;
          state.brains = clamp(state.brains + 1, 1, 10);
          saveState();
          renderHeader();
          renderShop();
          renderWorkGate();

          status.textContent = "✅ Puzzle complete! +£20 and Brains +1 🧠";
          toast("✅ Puzzle complete! +£20, Brains +1");
        } else {
          status.textContent = `Good! Next: ${nextNumber}`;
        }
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 250);
      }
    });

    grid.appendChild(btn);
  });

  stopTimer();
  timerId = setInterval(() => {
    timeLeft -= 1;
    timer.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      stopTimer();
      puzzleActive = false;
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
saveState(); // ensures keys exist