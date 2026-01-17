document.addEventListener("DOMContentLoaded", () => {
  const KEY = "reglife_state_v6";

  const defaultState = {
    age: 14,
    cash: 50,
    health: 60,  // 0–100
    brains: 5,   // 1–10
    inventory: [],
    unlocks: { ps5: false, jobBonusPaid: false },
    lastAgeUpdateMs: Date.now(),
  };

  // ---------- helpers ----------
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const $ = (id) => document.getElementById(id);

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

  function toast(msg) {
    const el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.hidden = true), 1800);
  }

  // ---------- age tick (+1 per hour) ----------
  function applyAgeTick() {
    const now = Date.now();
    const last = state.lastAgeUpdateMs || now;
    const hours = Math.floor((now - last) / 3600000);
    if (hours > 0) {
      state.age += hours;
      state.lastAgeUpdateMs = last + hours * 3600000;
      saveState();
    }
  }

  // ---------- header ----------
  function renderHeader() {
    $("age") && ($("age").textContent = String(state.age));
    $("cash") && ($("cash").textContent = `£${state.cash}`);
    $("health") && ($("health").textContent = `${state.health}%`);
    $("brains") && ($("brains").textContent = String(state.brains));
  }

  // ---------- shop ----------
  const SHOP_ITEMS = [
    { id: "jordan1", name: "Jordan 1s", price: 500 },
    { id: "stussy", name: "Stüssy Hoodie", price: 250 },
    { id: "ps5", name: "PS5", price: 1000, requiresUnlock: "ps5" },
  ];

  function renderShop() {
    const grid = $("shopGrid");
    const invList = $("inventoryList");
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

  // ---------- work page (button-style messages) ----------
  function renderWorkGate() {
    const box = $("workMsg");
    if (!box) return;

    box.innerHTML = "";

    const ready = state.age >= 16 && state.brains >= 8 && state.brains <= 10 && state.health >= 80;

    if (ready) {
      const msg = document.createElement("div");
      msg.className = "task";
      msg.textContent =
        "🎉 Congrats, you're ready to get a job, and earn some cash!! Here's a sign-on bonus of £3,000";
      box.appendChild(msg);

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
      const m = document.createElement("div");
      m.className = "task";
      m.textContent = "🧠 you're not smart enough to get a job - go back to school";
      box.appendChild(m);
    }

    if (state.health <= 70) {
      const m = document.createElement("div");
      m.className = "task";
      m.textContent = "💪 you're not in good enough shape to get a job - go to the gym and eat better";
      box.appendChild(m);
    }

    if (state.age <= 15) {
      const m = document.createElement("div");
      m.className = "task";
      m.textContent = "📅 you're too young to get a job - come back when you're 16";
      box.appendChild(m);
    }
  }

  // ---------- tasks ----------
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
        const id = btn.getAttribute("data-task");
        if (id) completeTask(id);
      });
    });
  }

  // ---------- french quiz (simple 5Q, 4/5 pass unlocks PS5) ----------
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
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startFrenchQuiz() {
    // If your current school.html has the full French quiz UI, we can re-hook it later.
    // For now: quick pass/fail prompt that unlocks PS5 and boosts brains.
    const pass = confirm("French quiz: did you pass (4/5 or better)?");
    if (!pass) {
      toast("Unlucky 😅 Try again.");
      return;
    }

    state.brains = clamp(state.brains + 1, 1, 10);
    state.cash += 50;
    const wasLocked = !state.unlocks.ps5;
    state.unlocks.ps5 = true;

    saveState();
    renderHeader();
    renderShop();
    renderWorkGate();

    toast("🏆 Passed! +£50, Brains +1");
    if (wasLocked) toast("🎮 PS5 UNLOCKED in the Shop!");
  }

  // ---------- maths test (30s, 5Q, needs 5/5 before time runs out) ----------
  let mathTimerId = null;

  function startMathsTest() {
    const section = $("mathSection");
    const progressEl = $("mathProgress");
    const timerEl = $("mathTimer");
    const scoreEl = $("mathScore");
    const questionEl = $("mathQuestion");
    const optionsEl = $("mathOptions");
    const statusEl = $("mathStatus");

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
          }, 350);
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
  }

  // ---------- puzzle (optional; only runs if UI exists) ----------
  let puzzleTimerId = null;

  function startPuzzle() {
    const section = $("puzzleSection");
    const grid = $("puzzleGrid");
    const status = $("puzzleStatus");
    const timer = $("puzzleTimer");
    if (!section || !grid || !status || !timer) {
      toast("Puzzle UI not found on this page.");
      return;
    }

    section.hidden = false;

    let next = 1;
    let timeLeft = 120;
    let active = true;

    const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    timer.textContent = fmt(timeLeft);
    status.textContent = "Go! Tap 1 → 20 in order.";
    grid.innerHTML = "";

    const nums = shuffle(Array.from({ length: 20 }, (_, i) => i + 1));
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
          setTimeout(() => btn.classList.remove("wrong"), 200);
        }
      });

      grid.appendChild(btn);
    });

    clearInterval(puzzleTimerId);
    puzzleTimerId = setInterval(() => {
      timeLeft--;
      timer.textContent = fmt(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(puzzleTimerId);
        active = false;
        status.textContent = "⏱️ Time’s up! Try again.";
        toast("⏱️ Time’s up!");
      }
    }, 1000);
  }

  // ---------- reset ----------
  function wireReset() {
    $("resetBtn")?.addEventListener("click", () => {
      if (!confirm("Reset everything?")) return;
      localStorage.removeItem(KEY);
      state = structuredClone(defaultState);
      saveState();
      location.reload();
    });
  }

  // ---------- init ----------
  applyAgeTick();
  renderHeader();
  renderShop();
  renderWorkGate();
  wireTaskButtons();
  wireReset();
  saveState();

  // keep age fresh
  setInterval(() => {
    applyAgeTick();
    renderHeader();
    renderWorkGate();
  }, 60000);
});