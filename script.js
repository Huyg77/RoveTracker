const STORAGE_KEY = "rove-hitpoints-v1";
const ACTIVE_MONSTERS_KEY = "rove-active-monsters-v1";
const DEFAULT_MONSTERS = ["A", "B", "C"];
const OPTIONAL_MONSTERS = ["D", "E", "F"];

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
let activeMonsters = JSON.parse(
  localStorage.getItem(ACTIVE_MONSTERS_KEY) || JSON.stringify(DEFAULT_MONSTERS)
);

// Zorg ervoor dat bestaande/ongeldige opgeslagen instellingen nooit de basis A-C verwijderen.
activeMonsters = DEFAULT_MONSTERS.concat(
  OPTIONAL_MONSTERS.filter((monster) => activeMonsters.includes(monster))
);

const monsterGroups = document.getElementById("monsterGroups");
const dialog = document.getElementById("hpDialog");
const form = document.getElementById("hpForm");
const hpInput = document.getElementById("hpInput");
const dialogMonster = document.getElementById("dialogMonster");
const dialogTitle = document.getElementById("dialogTitle");
const closeButton = document.getElementById("closeButton");
const clearButton = document.getElementById("clearButton");
const resetButton = document.getElementById("resetButton");
const addMonsterButton = document.getElementById("addMonsterButton");

let selectedId = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveActiveMonsters() {
  localStorage.setItem(ACTIVE_MONSTERS_KEY, JSON.stringify(activeMonsters));
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

function updateAddButton() {
  const nextMonster = OPTIONAL_MONSTERS.find(
    (monster) => !activeMonsters.includes(monster)
  );

  if (nextMonster) {
    addMonsterButton.disabled = false;
    addMonsterButton.title = `Monster ${nextMonster} toevoegen`;
    addMonsterButton.setAttribute(
      "aria-label",
      `Monster ${nextMonster} toevoegen`
    );
  } else {
    addMonsterButton.disabled = true;
    addMonsterButton.title = "Alle monsters D, E en F zijn toegevoegd";
    addMonsterButton.setAttribute(
      "aria-label",
      "Alle monsters D, E en F zijn toegevoegd"
    );
  }
}

function render() {
  monsterGroups.replaceChildren(
    ...activeMonsters.map((monster) => createGroup(monster))
  );
  updateAddButton();
}

function addNextMonster() {
  const nextMonster = OPTIONAL_MONSTERS.find(
    (monster) => !activeMonsters.includes(monster)
  );

  if (!nextMonster) return;

  activeMonsters.push(nextMonster);
  saveActiveMonsters();
  render();
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

addMonsterButton.addEventListener("click", addNextMonster);

resetButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Alle ingevulde hitpoints wissen? De toegevoegde monsters blijven zichtbaar."
  );

  if (!confirmed) return;

  Object.keys(state).forEach((key) => delete state[key]);
  saveState();
  render();
});

render();
