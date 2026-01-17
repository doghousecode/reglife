document.addEventListener("DOMContentLoaded", () => {
  console.log("Reglife JS loaded ✅");

  const ageEl = document.getElementById("age");
  const cashEl = document.getElementById("cash");

  if (ageEl) ageEl.textContent = "14";
  if (cashEl) cashEl.textContent = "£50";

  alert("JS is running");
});