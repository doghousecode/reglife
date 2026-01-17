document.addEventListener("DOMContentLoaded", () => {
  const KEY = "reglife_state_v8";

  const defaultState = {
    age: 14,
    cash: 50,
    health: 60,
    brains: 5,
    inventory: [],
    unlocks: { ps5: false, jobBonusPaid: false },
    lastAgeUpdateMs: Date.now(),
    emojiUsedSayings: [], // store used sayings across sessions (simple array)
  };

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

  // ---------- age tick ----------
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

  // ---------- secret avatar head tap (+1 year) ----------
  function wireSecretAvatarTap() {
    const avatar = document.querySelector("img.hero-avatar");
    if (!avatar) return;

    // only on homepage (where shop exists)
    if (!$("shopSection")) return;

    avatar.parentElement.style.position = "relative";

    // avoid adding twice
    if (avatar.parentElement.querySelector("#secretAgeTap")) return;

    const hit = document.createElement("button");
    hit.id = "secretAgeTap";
    hit.type = "button";
    hit.setAttribute("aria-label", "Secret age cheat");

    hit.style.position = "absolute";
    hit.style.width = "78px";
    hit.style.height = "78px";
    hit.style.left = "50%";
    hit.style.top = "0px";
    hit.style.transform = "translateX(-50%)";
    hit.style.opacity = "0";
    hit.style.border = "0";
    hit.style.background = "transparent";
    hit.style.cursor = "pointer";
    hit.style.pointerEvents = "auto";

    hit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.age += 1;
      saveState();
      renderHeader();
      renderWorkGate();
      toast("🤫 Secret: Age +1");
    });

    avatar.parentElement.appendChild(hit);
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
    if (!grid || !invList) return;

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

  // ---------- work page ----------
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
        state.brains = clamp(state.brains + 1, 1, 10); // requested
        toast("🥗 Healthy meal! Health +10%, Brains +1");
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

      case "emojiGame":
        startEmojiGame();
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

  // ---------- French quiz (UI) ----------
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

  function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  function startFrenchQuiz() {
    const section = $("quizSection");
    const progressEl = $("quizProgress");
    const scoreEl = $("quizScore");
    const questionEl = $("quizQuestion");
    const optionsEl = $("quizOptions");
    const statusEl = $("quizStatus");

    if (!section || !progressEl || !scoreEl || !questionEl || !optionsEl || !statusEl) {
      toast("French quiz UI not found on this page.");
      return;
    }

    // hide other sections if present
    $("mathSection") && ($("mathSection").hidden = true);
    $("puzzleSection") && ($("puzzleSection").hidden = true);
    $("emojiSection") && ($("emojiSection").hidden = true);

    section.hidden = false;

    const qs = pickRandom(FRENCH_BANK, 5);
    let idx = 0;
    let score = 0;

    statusEl.textContent = "Get 4/5 to unlock the PS5 in the shop.";

    renderQ();

    function renderQ() {
      const q = qs[idx];
      progressEl.textContent = `Q${idx + 1} / 5`;
      scoreEl.textContent = `Score: ${score}`;
      questionEl.textContent = `What does “${q.fr}” mean?`;

      const allEn = FRENCH_BANK.map(x => x.en);
      const wrongs = shuffle(allEn.filter(x => x !== q.en)).slice(0, 3);
      const opts = shuffle([q.en, ...wrongs]);

      optionsEl.innerHTML = "";
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
          }, 450);
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
        toast("🏆 Passed! +£50, Brains +1");
        if (wasLocked) toast("🎮 PS5 UNLOCKED in the Shop!");
      } else {
        statusEl.textContent = "Unlucky 😅 Get 4/5 to unlock the PS5. Try again!";
        toast("Unlucky 😅 Try again");
      }
    }

    section.scrollIntoView({ behavior: "smooth" });
  }

  // ---------- maths test ----------
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

    $("quizSection") && ($("quizSection").hidden = true);
    $("puzzleSection") && ($("puzzleSection").hidden = true);
    $("emojiSection") && ($("emojiSection").hidden = true);

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

    section.scrollIntoView({ behavior: "smooth" });
  }

  // ---------- puzzle ----------
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

    $("quizSection") && ($("quizSection").hidden = true);
    $("mathSection") && ($("mathSection").hidden = true);
    $("emojiSection") && ($("emojiSection").hidden = true);

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

  // ---------- Emoji Charades (vanilla JS version) ----------
  const EMOJI_BANK = [
    { saying: "Break the ice", emojis: "🔨🧊", hint: "Starting a conversation" },
    { saying: "Spill the beans", emojis: "🫘💦", hint: "Revealing a secret" },
    { saying: "Time flies", emojis: "⏰🪰", hint: "Time goes fast" },
    { saying: "Under the weather", emojis: "🤒☁️", hint: "Feeling ill" },
    { saying: "Hit the nail on the head", emojis: "🔨📌🧠", hint: "Exactly right" },
    { saying: "Piece of cake", emojis: "🍰✅", hint: "Very easy" },
    { saying: "Costs an arm and a leg", emojis: "💸🦾🦵", hint: "Very expensive" },
    { saying: "The ball is in your court", emojis: "🎾🏟️👉", hint: "Your decision now" },
    { saying: "When pigs fly", emojis: "🐷🪽", hint: "Never going to happen" },
    { saying: "Bite the bullet", emojis: "😬🔫", hint: "Do something hard" },
    { saying: "A blessing in disguise", emojis: "🎁🥸", hint: "Good thing hidden" },
    { saying: "Let the cat out of the bag", emojis: "🐱🛍️😱", hint: "Accidentally reveal" },
    { saying: "Don’t judge a book by its cover", emojis: "📘👀🚫", hint: "Looks deceive" },
    { saying: "Actions speak louder than words", emojis: "🏃‍♂️📣<️⃣", hint: "Do > say" },
    { saying: "Once in a blue moon", emojis: "🌕🔵", hint: "Very rarely" },
  ];

  const normalize = (text) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\b(a|an|the|is|are|was|were)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  let emojiGame = {
    started: false,
    current: null,
    showAnswer: false,
    score: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    combo: 1,
    hintShown: false,
  };

  function startEmojiGame() {
    const section = $("emojiSection");
    if (!section) {
      toast("Emoji UI not found on this page.");
      return;
    }

    // hide others
    $("quizSection") && ($("quizSection").hidden = true);
    $("mathSection") && ($("mathSection").hidden = true);
    $("puzzleSection") && ($("puzzleSection").hidden = true);

    section.hidden = false;
    $("emojiStart").hidden = false;
    $("emojiGame").hidden = true;

    // wire buttons once
    wireEmojiUI();
    section.scrollIntoView({ behavior: "smooth" });
  }

  function wireEmojiUI() {
    const playBtn = $("emojiPlayBtn");
    const submitBtn = $("emojiSubmitBtn");
    const nextBtn = $("emojiNextBtn");
    const resetBtn = $("emojiResetBtn");
    const hintBtn = $("emojiHintBtn");
    const input = $("emojiInput");

    if (!playBtn || !submitBtn || !nextBtn || !resetBtn || !hintBtn || !input) return;

    if (!playBtn._wired) {
      playBtn._wired = true;

      playBtn.addEventListener("click", () => {
        emojiGame.started = true;
        emojiGame.score = 0;
        emojiGame.total = 0;
        emojiGame.streak = 0;
        emojiGame.bestStreak = 0;
        emojiGame.combo = 1;
        emojiGame.showAnswer = false;
        emojiGame.hintShown = false;

        $("emojiStart").hidden = true;
        $("emojiGame").hidden = false;

        nextEmojiQuestion(true);
      });

      submitBtn.addEventListener("click", () => {
        checkEmojiAnswer();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkEmojiAnswer();
      });

      nextBtn.addEventListener("click", () => {
        nextEmojiQuestion(false);
      });

      resetBtn.addEventListener("click", () => {
        emojiGame.started = false;
        emojiGame.current = null;
        $("emojiStart").hidden = false;
        $("emojiGame").hidden = true;
        $("emojiFeedback").textContent = "";
        $("emojiHint").style.display = "none";
        $("emojiInput").value = "";
      });

      hintBtn.addEventListener("click", () => {
        if (!emojiGame.current) return;
        emojiGame.hintShown = true;
        const hint = $("emojiHint");
        hint.textContent = `💡 ${emojiGame.current.hint}`;
        hint.style.display = "block";
      });
    }
  }

  function pickEmojiQuestion() {
    const used = new Set(state.emojiUsedSayings || []);
    const pool = EMOJI_BANK.filter((q) => !used.has(q.saying));
    const list = pool.length ? pool : EMOJI_BANK;
    const q = list[Math.floor(Math.random() * list.length)];

    // mark used (but keep it bounded)
    const nextUsed = [...(state.emojiUsedSayings || []), q.saying].slice(-40);
    state.emojiUsedSayings = nextUsed;
    saveState();

    return q;
  }

  function renderEmojiHeader() {
    $("emojiScore").textContent = String(emojiGame.score);
    $("emojiTotal").textContent = String(emojiGame.total);

    const accWrap = $("emojiAccuracyWrap");
    const acc = $("emojiAccuracy");
    if (emojiGame.total > 0) {
      accWrap.hidden = false;
      acc.textContent = `${Math.round((emojiGame.score / emojiGame.total) * 100)}%`;
    } else {
      accWrap.hidden = true;
    }

    const comboWrap = $("emojiComboWrap");
    const combo = $("emojiCombo");
    if (emojiGame.combo > 1) {
      comboWrap.hidden = false;
      combo.textContent = `×${emojiGame.combo}`;
    } else {
      comboWrap.hidden = true;
    }
  }

  function nextEmojiQuestion(first) {
    emojiGame.current = pickEmojiQuestion();
    emojiGame.showAnswer = false;
    emojiGame.hintShown = false;

    $("emojiClue").textContent = emojiGame.current.emojis;
    $("emojiHint").style.display = "none";
    $("emojiFeedback").textContent = first ? "Type your answer and hit Submit." : "";
    $("emojiInput").value = "";
    $("emojiInput").focus();

    $("emojiNextBtn").hidden = true;
    renderEmojiHeader();
  }

  function checkEmojiAnswer() {
    if (!emojiGame.current) return;

    const guess = ($("emojiInput").value || "").trim();
    if (!guess) return;

    const user = normalize(guess);
    const correct = normalize(emojiGame.current.saying);

    const close =
      user === correct ||
      correct.includes(user) ||
      user.includes(correct) ||
      user.split(" ").filter((w) => correct.includes(w) && w.length > 2).length >=
        Math.ceil(correct.split(" ").length * 0.6);

    emojiGame.total += 1;

    if (close) {
      emojiGame.streak += 1;
      emojiGame.bestStreak = Math.max(emojiGame.bestStreak, emojiGame.streak);

      if (emojiGame.streak >= 5) emojiGame.combo = 3;
      else if (emojiGame.streak >= 3) emojiGame.combo = 2;
      else emojiGame.combo = 1;

      emojiGame.score += emojiGame.combo;

      // Reward: small cash + brains pop (keeps it “Reglife”)
      state.cash += 10 * emojiGame.combo;
      state.brains = clamp(state.brains + 1, 1, 10);

      saveState();
      renderHeader();
      renderShop();
      renderWorkGate();

      $("emojiFeedback").textContent = `✅ Correct! "${emojiGame.current.saying}"  +£${10 * emojiGame.combo}, Brains +1`;
      toast("✅ Emoji win! +Brains");
    } else {
      emojiGame.streak = 0;
      emojiGame.combo = 1;
      $("emojiFeedback").textContent = `❌ Nope. It was: "${emojiGame.current.saying}"`;
    }

    $("emojiNextBtn").hidden = false;
    renderEmojiHeader();
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
  wireSecretAvatarTap();
  saveState();

  setInterval(() => {
    applyAgeTick();
    renderHeader();
    renderWorkGate();
  }, 60000);
});