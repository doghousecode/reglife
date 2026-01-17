// ===== STATE =====
let age = Number(localStorage.getItem("age")) || 14;
let cash = Number(localStorage.getItem("cash")) || 50;
let health = Number(localStorage.getItem("health")) || 60;
let brains = Number(localStorage.getItem("brains")) || 5;
let inventory = JSON.parse(localStorage.getItem("inventory") || "[]");

// ===== SAVE / RENDER =====
function save() {
  localStorage.setItem("age", age);
  localStorage.setItem("cash", cash);
  localStorage.setItem("health", health);
  localStorage.setItem("brains", brains);
  localStorage.setItem("inventory", JSON.stringify(inventory));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function renderStats() {
  document.getElementById("age")?.innerText = age;
  document.getElementById("cash")?.innerText = `£${cash}`;
  document.getElementById("health")?.innerText = `${health}%`;
  document.getElementById("brains")?.innerText = brains;
}

// ===== AGE TIMER =====
setInterval(() => {
  age += 1;
  save();
  renderStats();
}, 60 * 60 * 1000);

// ===== TASKS =====
function doTask(type) {
  if (type === "pushups") {
    health = clamp(health + 10, 0, 100);
    cash += 10;
  }

  if (type === "run") {
    health = clamp(health + 10, 0, 100);
    cash += 15;
  }

  if (type === "healthy") {
    health = clamp(health + 10, 0, 100);
  }

  if (type === "maccas") {
    health = clamp(health - 10, 0, 100);
  }

  if (type === "sleep") {
    brains = clamp(brains - 1, 1, 10);
    health = clamp(health - 10, 0, 100);
  }

  if (type === "puzzle") {
    brains = clamp(brains + 1, 1, 10);
    cash += 20;
  }

  save();
  alert("Task complete!");
}

// ===== QUIZ =====
function startFrenchQuiz() {
  const pass = confirm("Did you pass the French quiz?");
  if (pass) {
    brains = clamp(brains + 1, 1, 10);
    cash += 50;
    if (!inventory.includes("ps5")) {
      inventory.push("ps5");
      alert("🎮 PS5 unlocked!");
    }
    save();
  }
}

// ===== WORK PAGE =====
const msg = document.getElementById("workMsg");
if (msg) {
  if (age >= 16 && brains >= 8) {
    msg.innerText = "What job do you want?";
  } else {
    msg.innerText = "You're not ready to work — go back to school.";
  }
}

// ===== SHOP =====
const shop = document.getElementById("shopGrid");
if (shop) {
  ["Jordan 1s", "Hoodie", "PS5"].forEach(item => {
    const owned = inventory.includes(item.toLowerCase().replace(" ", ""));
    const el = document.createElement("div");
    el.innerText = owned ? `${item} ✅` : item;
    shop.appendChild(el);
  });
}

// ===== RESET =====
document.getElementById("resetBtn")?.addEventListener("click", () => {
  if (!confirm("Reset everything?")) return;
  localStorage.clear();
  location.reload();
});

renderStats();