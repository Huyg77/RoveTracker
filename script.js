const STORAGE_KEY = "rove-hitpoints-v1";

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

const monsterGroups = document.getElementById("monsterGroups");
const dialog = document.getElementById("hpDialog");
const form = document.getElementById("hpForm");
const hpInput = document.getElementById("hpInput");
const dialogMonster = document.getElementById("dialogMonster");
const dialogTitle = document.getElementById("dialogTitle");
const closeButton = document.getElementById("closeButton");
const clearButton = document.getElementById("clearButton");
const resetButton = document.getElementById("resetButton");

let selectedId = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createGroup(monster) {
  const group = document.createElement("section");
  group.className = "monster-group";

  const title = document.createElement("h2");
  title.className = "group-title";
  title.innerHTML = `<span>${monster}</span> Monster ${monster}`;

  const grid = document.createElement("div");
  grid.className = "hp-grid";

  for (let number = 1; number <= 8; number++) {
    const id = `${monster}${number}`;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hp-card";
    card.dataset.id = id;
    card.setAttribute("aria-label", `Monster ${monster}, veld ${number}`);

    card.innerHTML = `
      <span class="hp-value ${state[id] === undefined ? "empty" : ""}">
        ${state[id] === undefined ? "—" : state[id]}
      </span>
      <span class="slot-number">${number}</span>
    `;

    card.addEventListener("click", () => openEditor(monster, number));
    grid.appendChild(card);
  }

  group.append(title, grid);
  return group;
}

function render() {
  monsterGroups.replaceChildren(
    createGroup("A"),
    createGroup("B"),
    createGroup("C")
  );
}

function openEditor(monster, number) {
  selectedId = `${monster}${number}`;
  dialogMonster.textContent = `MONSTER ${monster}`;
  dialogTitle.textContent = `Veld ${number}`;
  hpInput.value = state[selectedId] ?? "";
  dialog.showModal();
  requestAnimationFrame(() => {
    hpInput.focus();
    hpInput.select();
  });
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedId) return;

  const value = hpInput.value.trim();
  if (value === "") return;

  state[selectedId] = Math.max(0, Number.parseInt(value, 10));
  saveState();
  render();
  closeDialog();
});

clearButton.addEventListener("click", () => {
  if (!selectedId) return;

  delete state[selectedId];
  saveState();
  render();
  closeDialog();
});

closeButton.addEventListener("click", closeDialog);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

resetButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Alle ingevulde hitpoints wissen? Dit kan niet ongedaan worden gemaakt."
  );

  if (!confirmed) return;

  Object.keys(state).forEach((key) => delete state[key]);
  saveState();
  render();
});

render();
