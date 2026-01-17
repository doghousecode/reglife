// ----- Load saved data (or start fresh) -----
let cash = Number(localStorage.getItem("cash")) || 0;
let streak = Number(localStorage.getItem("streak")) || 0;
let selectedTask = null;

let inventory = JSON.parse(localStorage.getItem("inventory") || "[]");
let unlocks = JSON.parse(localStorage.getItem("unlocks") || "{}");

const cashEl = document.getElementById("cash");
const streakEl = document.getElementById("streak");
const selectedTaskEl = document.getElementById("selectedTask");
const completeBtn = document.getElementById("completeBtn");
const resetBtn = document.getElementById("resetBtn");
const taskButtons = document.querySelectorAll(".task");

const taskFrenchBtn = document.getElementById("taskFrench");

// Puzzle elements
const puzzleGrid = document.getElementById("puzzleGrid");
const puzzleStatus = document.getElementById("puzzleStatus");
const puzzleTimer = document.getElementById("puzzleTimer");

// Shop elements
const shopGrid = document.getElementById("shopGrid");
const inventoryList = document.getElementById("inventoryList");

// Quiz elements
const quizSection = document.getElementById("quizSection");
const quizLockedMsg = document.getElementById("quizLockedMsg");
const quizCard = document.getElementById("quizCard");
const quizProgress = document.getElementById("quizProgress");
const quizScoreEl = document.getElementById("quizScore");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizStatusEl = document.getElementById("quizStatus");

function save() {
  localStorage.setItem("cash", String(cash));
  localStorage.setItem("streak", String(streak));
  localStorage.setItem("inventory", JSON.stringify(inventory));
  localStorage.setItem("unlocks", JSON.stringify(unlocks));
}

function hasUnlock(key) {
  return unlocks && unlocks[key] === true;
}

function unlock(key) {
  unlocks[key] = true;
  save();
}

function render() {
  cashEl.textContent = `£${cash}`;
  streakEl.textContent = `${streak}`;
  selectedTaskEl.textContent = selectedTask ? selectedTask : "None";
  completeBtn.disabled = !selectedTask;

  // Unlock French task if PS5 owned
  const ps5Unlocked = hasUnlock("ps5");
  if (taskFrenchBtn) {
    taskFrenchBtn.disabled = !ps5Unlocked;
    taskFrenchBtn.classList.toggle("locked", !ps5Unlocked);
    taskFrenchBtn.textContent = ps5Unlocked
      ? "French Vocab Quiz"
      : "🔒 French Vocab Quiz (Unlock with PS5)";
  }

  renderShop();
  renderInventory();
  renderQuizLockState();
}

taskButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    taskButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    selectedTask = btn.dataset.task;
    render();
  });
});

completeBtn.addEventListener("click", () => {
  if (!selectedTask) return;

  if (selectedTask === "2-Minute Puzzle") {
    startPuzzle();
    return; // reward happens when puzzle is completed
  }

  if (selectedTask === "French Vocab Quiz") {
    startQuiz();
    return; // reward happens when quiz ends
  }

  // normal task reward
  cash += 10;
  streak += 1;
  save();
  render();
});

resetBtn.addEventListener("click", () => {
  cash = 0;
  streak = 0;
  selectedTask = null;
  inventory = [];
  unlocks = {};
  save();

  // reset UI selection
  taskButtons.forEach((b) => b.classList.remove("selected"));

  // reset puzzle/quiz state
  stopTimer();
  puzzleActive = false;
  puzzleStatus.textContent = "Select “2-Minute Puzzle” then tap “Complete Task” to start.";
  puzzleTimer.textContent = "2:00";
  buildPuzzleGrid();

  quizCard.hidden = true;
  quizStatusEl.textContent = "";
  quizOptionsEl.innerHTML = "";

  render();
});


// =====================
// ======= SHOP =========
// =====================
const SHOP_ITEMS = [
  { id: "jordan1", name: "Jordan 1s", price: 500 },
  { id: "stussy", name: "Stüssy Hoodie", price: 750 },
  { id: "ps5", name: "Virtual PS5", price: 2000, unlock: "ps5" },
];

function renderShop() {
  if (!shopGrid) return;

  shopGrid.innerHTML = "";
  SHOP_ITEMS.forEach((item) => {
    const owned = inventory.includes(item.id);
    const canAfford = cash >= item.price;

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

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "buy-btn";
    btn.textContent = owned ? "Owned" : "Buy";
    btn.disabled = owned || !canAfford;

    btn.addEventListener("click", () => {
      if (owned) return;
      if (cash < item.price) return;

      cash -= item.price;
      inventory.push(item.id);

      if (item.unlock) {
        unlock(item.unlock);
        // hype moment
        alert("🎮 PS5 UNLOCKED! French Quiz is now available in Tasks!");
      }

      save();
      render();

      // mobile-friendly: jump to tasks so he sees the unlock
      document.querySelector(".tasks").scrollIntoView({ behavior: "smooth" });
    });

    row.appendChild(meta);
    row.appendChild(btn);
    shopGrid.appendChild(row);
  });
}

function renderInventory() {
  if (!inventoryList) return;

  const niceName = (id) => {
    const found = SHOP_ITEMS.find((x) => x.id === id);
    return found ? found.name : id;
  };

  inventoryList.innerHTML = "";

  if (!inventory.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing yet. Earn cash and buy something 😈";
    inventoryList.appendChild(li);
    return;
  }

  inventory.forEach((id) => {
    const li = document.createElement("li");
    li.textContent = niceName(id);
    inventoryList.appendChild(li);
  });
}


// =====================
// ======= PUZZLE =======
// =====================
let puzzleActive = false;
let nextNumber = 1;
let timeLeft = 120;       // seconds
let timerId = null;

function shuffle(array) {
  // Fisher–Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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
  // start puzzle state
  puzzleActive = true;
  nextNumber = 1;
  puzzleStatus.textContent = "Go! Tap 1 → 20 in order.";
  buildPuzzleGrid();

  // start timer
  stopTimer();
  timeLeft = 120;
  puzzleTimer.textContent = formatTime(timeLeft);

  timerId = setInterval(() => {
    timeLeft -= 1;
    puzzleTimer.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      stopTimer();
      puzzleActive = false;
      puzzleStatus.textContent = "⏱️ Time’s up! Try again.";
    }
  }, 1000);

  // mobile-friendly: jump to puzzle
  document.getElementById("puzzleSection").scrollIntoView({ behavior: "smooth" });
}

function buildPuzzleGrid() {
  puzzleGrid.innerHTML = "";

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

          // ✅ reward
          cash += 25;
          streak += 1;
          save();
          render();

          puzzleStatus.textContent = "✅ Puzzle complete! +£25 and streak +1 🔥";
        } else {
          puzzleStatus.textContent = `Good! Next: ${nextNumber}`;
        }
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 250);
      }
    });

    puzzleGrid.appendChild(btn);
  });
}

// show a grid immediately (not active until started)
buildPuzzleGrid();


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

let quizActive = false;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;

function renderQuizLockState() {
  const ps5Unlocked = hasUnlock("ps5");
  if (!quizLockedMsg || !quizCard) return;

  quizLockedMsg.hidden = ps5Unlocked;
  quizCard.hidden = !ps5Unlocked || !quizActive;
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
  const options = shuffle([correctEn, ...wrong]);
  return options;
}

function startQuiz() {
  if (!hasUnlock("ps5")) {
    alert("🔒 Buy the PS5 in the Shop to unlock the quiz!");
    document.getElementById("shopSection").scrollIntoView({ behavior: "smooth" });
    return;
  }

  quizActive = true;
  quizQuestions = pickRandom(FRENCH_BANK, 5);
  quizIndex = 0;
  quizScore = 0;

  quizStatusEl.textContent = "Answer 5 questions. Get 4/5 to earn rewards.";
  quizCard.hidden = false;

  renderQuizQuestion();
  quizSection.scrollIntoView({ behavior: "smooth" });
}

function renderQuizQuestion() {
  const q = quizQuestions[quizIndex];
  quizProgress.textContent = `Q${quizIndex + 1} / 5`;
  quizScoreEl.textContent = `Score: ${quizScore}`;
  quizQuestionEl.textContent = `What does “${q.fr}” mean?`;

  quizOptionsEl.innerHTML = "";
  const options = buildOptions(q.en);

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.textContent = opt;

    btn.addEventListener("click", () => handleAnswer(btn, opt === q.en));
    quizOptionsEl.appendChild(btn);
  });
}

function handleAnswer(btn, correct) {
  if (!quizActive) return;

  // lock options
  [...quizOptionsEl.querySelectorAll("button")].forEach((b) => (b.disabled = true));

  if (correct) {
    quizScore += 1;
    btn.classList.add("correct");
    quizStatusEl.textContent = "✅ Correct!";
  } else {
    btn.classList.add("wrong");
    quizStatusEl.textContent = "❌ Nope. Next one!";
  }

  setTimeout(() => {
    quizIndex += 1;

    if (quizIndex >= 5) {
      endQuiz();
    } else {
      renderQuizQuestion();
    }
  }, 650);
}

function endQuiz() {
  quizActive = false;
  quizScoreEl.textContent = `Score: ${quizScore}`;

  if (quizScore >= 4) {
    cash += 50;
    streak += 1;
    save();
    render();
    quizStatusEl.textContent = "🏆 You passed! +£50 and streak +1 🔥";
  } else {
    quizStatusEl.textContent = "Unlucky 😅 Get 4/5 to earn rewards. Try again!";
  }
}

// initial render
render();