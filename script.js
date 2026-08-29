"use strict";

/* ============================================================
   STORAGE
   ============================================================ */
const STORAGE_KEY = "rove-hitpoints-v1";
const HP_HISTORY_KEY = "rove-hp-history-v1";
const ACTION_HISTORY_KEY = "rove-action-history-v1";
const ROUND_KEY = "rove-current-round-v1";
const TURN_STATE_KEY = "rove-turn-state-v1";
const CONFIG_KEY = "rove-config-v1";
const ABILITY_KEY = "rove-round-abilities-v1";

const DEFAULT_CONFIG = { heroes: 3, monsters: 3 };
const HEROES = ["H1", "H2", "H3", "H4"];
const MONSTERS = ["A", "B", "C", "D", "E", "F"];

function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Could not read localStorage key "${key}":`, error);
    return fallback;
  }
}

const state = loadJson(STORAGE_KEY, {});
const hpHistory = loadJson(HP_HISTORY_KEY, {});
const actionHistory = loadJson(ACTION_HISTORY_KEY, []);
const roundAbilities = loadJson(ABILITY_KEY, {});

const config = {
  ...DEFAULT_CONFIG,
  ...loadJson(CONFIG_KEY, {})
};

config.heroes = clampInt(config.heroes, 2, 4);
config.monsters = clampInt(config.monsters, 3, 6);

let historyIndex = actionHistory.length - 1;

let currentRound = Math.max(
  1,
  Number.parseInt(localStorage.getItem(ROUND_KEY) || "1", 10) || 1
);

const turnState = loadJson(TURN_STATE_KEY, {
  heroes: {},
  counters: {},
  monsters: {}
});

turnState.heroes ||= {};
turnState.counters ||= {};
turnState.monsters ||= {};

let selectedId = null;
let selectedType = null; // "hero" | "monster"
let tempValue = null;


/* ============================================================
   DOM
   ============================================================ */
const heroesElement = document.getElementById("heroes");
const monsterGroups = document.getElementById("monsterGroups");

const hpDialog = document.getElementById("hpDialog");
const dialogMonster = document.getElementById("dialogMonster");
const dialogTitle = document.getElementById("dialogTitle");
const closeButton = document.getElementById("closeButton");
const clearButton = document.getElementById("clearButton");
const hpValueDisplay = document.getElementById("hpValueDisplay");
const saveButton = document.getElementById("saveButton");
const hpStepButtons = document.querySelectorAll(".hp-step-button");
const hpAdjustButtons = document.querySelectorAll(".hp-adjust-button");
const hpHistoryElement = document.getElementById("hpHistory");

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");

const configButton = document.getElementById("configButton");
const configDialog = document.getElementById("configDialog");
const configCloseButton = document.getElementById("configCloseButton");
const configCancelButton = document.getElementById("configCancelButton");
const configSaveButton = document.getElementById("configSaveButton");
const heroCountSelect = document.getElementById("heroCountSelect");
const monsterCountSelect = document.getElementById("monsterCountSelect");

const roundTrackerButton = document.getElementById("roundTrackerButton");
const currentRoundElement = document.getElementById("currentRound");
const roundDialog = document.getElementById("roundDialog");
const roundDialogValue = document.getElementById("roundDialogValue");
const roundMinusButton = document.getElementById("roundMinusButton");
const roundPlusButton = document.getElementById("roundPlusButton");
const roundCloseButton = document.getElementById("roundCloseButton");

const resetButton = document.getElementById("resetButton");
const wakeLockButton = document.getElementById("wakeLockButton");


/* ============================================================
   HELPERS / STORAGE
   ============================================================ */
function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Number.parseInt(value, 10) || min));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveHpHistory() {
  localStorage.setItem(HP_HISTORY_KEY, JSON.stringify(hpHistory));
}

function saveActionHistory() {
  localStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(actionHistory));
}

function saveTurnState() {
  localStorage.setItem(TURN_STATE_KEY, JSON.stringify(turnState));
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function saveAbilities() {
  localStorage.setItem(ABILITY_KEY, JSON.stringify(roundAbilities));
}

function saveRound() {
  localStorage.setItem(ROUND_KEY, String(currentRound));
}

function applyHpValue(id, value) {
  if (value === undefined || value === null) delete state[id];
  else state[id] = value;

  saveState();
}


/* ============================================================
   UNDO / REDO
   ============================================================ */
function updateHistoryButtons() {
  undoButton.disabled = historyIndex < 0;
  redoButton.disabled = historyIndex >= actionHistory.length - 1;
}

function addAction(action) {
  actionHistory.splice(historyIndex + 1);
  actionHistory.push(action);
  historyIndex = actionHistory.length - 1;

  saveActionHistory();
  updateHistoryButtons();
}

function undo() {
  if (historyIndex < 0) return;

  const action = actionHistory[historyIndex];
  if (!action) return;

  if (action.type === "hp") {
    applyHpValue(action.id, action.oldValue);
  } else if (action.type === "config") {
    restoreConfig(action.oldConfig);
  } else if (action.type === "ability") {
    setAbility(action.monster, action.oldValue);
  }

  historyIndex--;

  saveActionHistory();
  render();
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= actionHistory.length - 1) return;

  const action = actionHistory[historyIndex + 1];
  if (!action) return;

  if (action.type === "hp") {
    applyHpValue(action.id, action.newValue);
  } else if (action.type === "config") {
    restoreConfig(action.newConfig);
  } else if (action.type === "ability") {
    setAbility(action.monster, action.newValue);
  }

  historyIndex++;

  saveActionHistory();
  render();
  updateHistoryButtons();
}

function restoreConfig(value) {
  config.heroes = clampInt(value.heroes, 2, 4);
  config.monsters = clampInt(value.monsters, 3, 6);

  saveConfig();
  ensureTurnState();
}


/* ============================================================
   CONFIGURATION
   ============================================================ */
function ensureTurnState() {
  HEROES.forEach((hero, index) => {
    if (index >= config.heroes) {
      delete turnState.heroes[index + 1];
      delete turnState.counters[index + 1];
    } else {
      turnState.heroes[index + 1] ??= false;
      turnState.counters[index + 1] ??= false;
    }
  });

  MONSTERS.forEach((monster, index) => {
    if (index >= config.monsters) {
      delete turnState.monsters[monster];
    } else {
      turnState.monsters[monster] ??= false;
    }
  });

  saveTurnState();
}

function openConfig() {
  heroCountSelect.value = String(config.heroes);
  monsterCountSelect.value = String(config.monsters);

  configDialog.showModal();
}

function closeConfig() {
  if (configDialog.open) configDialog.close();
}

function saveConfiguration() {
  const newConfig = {
    heroes: clampInt(heroCountSelect.value, 2, 4),
    monsters: clampInt(monsterCountSelect.value, 3, 6)
  };

  if (
    newConfig.heroes === config.heroes &&
    newConfig.monsters === config.monsters
  ) {
    closeConfig();
    return;
  }

  const oldConfig = { ...config };

  config.heroes = newConfig.heroes;
  config.monsters = newConfig.monsters;

  ensureTurnState();

  addAction({
    type: "config",
    oldConfig,
    newConfig: { ...newConfig }
  });

  saveConfig();
  render();
  closeConfig();
}


/* ============================================================
   HEROES
   ============================================================ */
function renderHeroes() {
  heroesElement.replaceChildren();

  HEROES.slice(0, config.heroes).forEach((hero, index) => {
    const heroNumber = index + 1;

    const panel = document.createElement("section");
    panel.className = "hero-panel";

    const label = document.createElement("button");
    label.type = "button";
    label.className = "hero-label";
    label.textContent = hero;

    const turnUsed = turnState.heroes[heroNumber] === true;

    label.classList.toggle("used", turnUsed);
    label.setAttribute("aria-pressed", String(turnUsed));
    label.setAttribute("aria-label", `${hero} turn`);

    label.addEventListener("click", () => {
      turnState.heroes[heroNumber] = !turnState.heroes[heroNumber];

      saveTurnState();
      renderHeroes();
    });

    const hpWrap = document.createElement("div");
    hpWrap.className = "hero-hp";

    const hpButton = document.createElement("button");
    hpButton.type = "button";
    hpButton.className = "hero-hp-button";

    const hasHp = state[hero] !== undefined;

    hpButton.textContent = hasHp ? state[hero] : "—";

    if (!hasHp) {
      hpButton.classList.add("empty");
    }

    hpButton.setAttribute(
      "aria-label",
      `${hero} hitpoints change`
    );

    hpButton.addEventListener("click", () => openHeroEditor(hero));

    hpWrap.append(hpButton);

    const hpLabel = document.createElement("h6");
    hpLabel.textContent = "hp";

    hpWrap.append(hpLabel);

    const status = document.createElement("div");
    status.className = "hero-status";

    const counter = document.createElement("button");
    counter.type = "button";
    counter.className = "hero-counter";

    counter.innerHTML =
      '<span class="counter-symbol" aria-hidden="true"></span>';

    const counterUsed = turnState.counters[heroNumber] === true;

    counter.classList.toggle("used", counterUsed);
    counter.setAttribute("aria-pressed", String(counterUsed));
    counter.setAttribute("aria-label", `${hero} counter`);

    counter.addEventListener("click", () => {
      turnState.counters[heroNumber] =
        !turnState.counters[heroNumber];

      saveTurnState();
      renderHeroes();
    });

    status.append(counter);
    panel.append(label, hpWrap, status);
    heroesElement.appendChild(panel);
  });
}

function openHeroEditor(hero) {
  selectedId = hero;
  selectedType = "hero";

  dialogMonster.textContent = hero;
  dialogTitle.textContent = "Hero hitpoints";

  tempValue = state[hero] ?? null;

  updateValueDisplay();
  renderHpHistory(hero);

  hpDialog.showModal();
}


/* ============================================================
   MONSTERS
   ============================================================ */
function getActiveMonsters() {
  return MONSTERS.slice(0, config.monsters);
}

function createGroup(monster) {
  const group = document.createElement("section");
  group.className = "monster-group";

  const heading = document.createElement("div");
  heading.className = "group-heading";

  const title = document.createElement("button");
  title.type = "button";
  title.className = "group-title";
  title.textContent = monster;

  const used = turnState.monsters[monster] === true;

  title.classList.toggle("used", used);
  title.setAttribute("aria-pressed", String(used));
  title.setAttribute(
    "aria-label",
    `Monster ${monster} turn`
  );

  title.addEventListener("click", () => {
    turnState.monsters[monster] =
      !turnState.monsters[monster];

    saveTurnState();

    title.classList.toggle(
      "used",
      turnState.monsters[monster] === true
    );

    title.setAttribute(
      "aria-pressed",
      String(turnState.monsters[monster] === true)
    );
  });

  const ability = document.createElement("button");
  ability.type = "button";
  ability.className = "ability-button";
  ability.textContent = getAbility(monster);

  ability.title = `Change round ability ${monster}`;

  ability.setAttribute(
    "aria-label",
    `Round ability for monster ${monster}: ${getAbility(monster)}`
  );

  ability.addEventListener(
    "click",
    () => changeAbility(monster)
  );

  heading.append(title, ability);

  const grid = document.createElement("div");
  grid.className = "hp-grid";

  for (let number = 1; number <= 8; number++) {
    const id = `${monster}${number}`;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "hp-card";
    card.dataset.id = id;

    card.setAttribute(
      "aria-label",
      `Monster ${monster}, field ${number}`
    );

    const hasValue = state[id] !== undefined;

    card.innerHTML = `
      <span class="hp-value ${hasValue ? "" : "empty"}">${hasValue ? state[id] : "—"}</span>
      <span class="slot-number">${number}</span>
    `;

    card.addEventListener(
      "click",
      () => openMonsterEditor(monster, number)
    );

    grid.appendChild(card);
  }

  group.append(heading, grid);

  return group;
}

function getAbility(monster) {
  const value = clampInt(
    roundAbilities[monster] ?? 1,
    1,
    4
  );

  roundAbilities[monster] = value;

  return value;
}

function setAbility(monster, value) {
  roundAbilities[monster] = clampInt(value, 1, 4);
  saveAbilities();
}

function changeAbility(monster) {
  const oldValue = getAbility(monster);
  const newValue = oldValue >= 4 ? 1 : oldValue + 1;

  setAbility(monster, newValue);

  addAction({
    type: "ability",
    monster,
    oldValue,
    newValue
  });

  render();
}

function openMonsterEditor(monster, number) {
  selectedId = `${monster}${number}`;
  selectedType = "monster";

  dialogMonster.textContent = `MONSTER ${monster}`;
  dialogTitle.textContent = `Field ${number}`;

  tempValue = state[selectedId] ?? null;

  updateValueDisplay();
  renderHpHistory(selectedId);

  hpDialog.showModal();
}

function renderMonsters() {
  monsterGroups.replaceChildren(
    ...getActiveMonsters().map(createGroup)
  );
}


/* ============================================================
   HP EDITOR
   ============================================================ */
function updateValueDisplay() {
  if (tempValue === null || tempValue === undefined) {
    hpValueDisplay.textContent = "—";
    hpValueDisplay.classList.add("empty");
  } else {
    hpValueDisplay.textContent = tempValue;
    hpValueDisplay.classList.remove("empty");
  }
}

function changeTempValue(amount) {
  const current = tempValue == null ? 0 : tempValue;

  tempValue = Math.max(0, current + amount);

  updateValueDisplay();
}

function addHpHistory(id, value) {
  hpHistory[id] ||= [];

  hpHistory[id].push(value);

  if (hpHistory[id].length > 20) {
    hpHistory[id].shift();
  }

  saveHpHistory();
}

function renderHpHistory(id) {
  hpHistoryElement.replaceChildren();

  const history = hpHistory[id] || [];

  if (history.length === 0) {
    const empty = document.createElement("span");

    empty.className = "hp-history-empty";
    empty.textContent = "No changes yet";

    hpHistoryElement.appendChild(empty);

    return;
  }

  [...history].reverse().forEach((value) => {
    const item = document.createElement("span");

    item.textContent = value;

    hpHistoryElement.appendChild(item);
  });
}

function closeHpDialog() {
  if (hpDialog.open) {
    hpDialog.close();
  }

  selectedId = null;
  selectedType = null;
  tempValue = null;
}

function saveHitpoints() {
  if (!selectedId) return;

  const id = selectedId;

  const newValue =
    tempValue == null ? null : tempValue;

  const oldValue = state[id];

  if (
    oldValue === newValue ||
    (oldValue === undefined && newValue === null)
  ) {
    closeHpDialog();
    return;
  }

  if (oldValue !== undefined && oldValue !== null) {
    addHpHistory(id, oldValue);
  }

  addAction({
    type: "hp",
    id,
    oldValue,
    newValue
  });

  applyHpValue(id, newValue);

  render();
  closeHpDialog();
}


/* ============================================================
   ROUND
   ============================================================ */
function updateRoundUI() {
  currentRoundElement.textContent = currentRound;
  roundDialogValue.textContent = currentRound;
}

function openRoundEditor() {
  updateRoundUI();

  roundDialog.showModal();

  roundTrackerButton.setAttribute(
    "aria-expanded",
    "true"
  );
}

function closeRoundDialog() {
  if (roundDialog.open) {
    roundDialog.close();
  }

  roundTrackerButton.setAttribute(
    "aria-expanded",
    "false"
  );
}

function changeRound(amount) {
  currentRound = Math.max(
    1,
    currentRound + amount
  );

  saveRound();
  updateRoundUI();
  resetTurnStatus();
}

function resetTurnStatus() {
  turnState.heroes = {};
  turnState.counters = {};
  turnState.monsters = {};

  ensureTurnState();
  render();
}


/* ============================================================
   RESET
   ============================================================ */
function resetAll() {
  const confirmed = window.confirm(
    "Clear all entered hitpoints, round abilities, and turn statuses? Heroes and monsters will remain visible."
  );

  if (!confirmed) return;

  Object.keys(state).forEach(
    (key) => delete state[key]
  );

  Object.keys(hpHistory).forEach(
    (key) => delete hpHistory[key]
  );

  Object.keys(roundAbilities).forEach(
    (key) => delete roundAbilities[key]
  );

  actionHistory.length = 0;
  historyIndex = -1;

  turnState.heroes = {};
  turnState.counters = {};
  turnState.monsters = {};

  saveState();
  saveHpHistory();
  saveAbilities();
  saveActionHistory();

  ensureTurnState();

  render();
  updateHistoryButtons();
}


/* ============================================================
   EVENTS
   ============================================================ */
hpStepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!selectedId) return;

    changeTempValue(
      Number.parseInt(button.dataset.step, 10)
    );
  });
});

hpAdjustButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!selectedId) return;

    changeTempValue(
      Number.parseInt(button.dataset.hpChange, 10)
    );
  });
});

saveButton.addEventListener(
  "click",
  saveHitpoints
);

clearButton.addEventListener("click", () => {
  if (!selectedId) return;

  tempValue = null;

  updateValueDisplay();
});

closeButton.addEventListener(
  "click",
  closeHpDialog
);

hpDialog.addEventListener("click", (event) => {
  if (event.target === hpDialog) {
    closeHpDialog();
  }
});

undoButton.addEventListener(
  "click",
  undo
);

redoButton.addEventListener(
  "click",
  redo
);

configButton.addEventListener(
  "click",
  openConfig
);

configCloseButton.addEventListener(
  "click",
  closeConfig
);

configCancelButton.addEventListener(
  "click",
  closeConfig
);

configSaveButton.addEventListener(
  "click",
  saveConfiguration
);

configDialog.addEventListener("click", (event) => {
  if (event.target === configDialog) {
    closeConfig();
  }
});

roundTrackerButton.addEventListener(
  "click",
  openRoundEditor
);

roundMinusButton.addEventListener(
  "click",
  () => changeRound(-1)
);

roundPlusButton.addEventListener(
  "click",
  () => changeRound(1)
);

roundCloseButton.addEventListener(
  "click",
  closeRoundDialog
);

roundDialog.addEventListener("click", (event) => {
  if (event.target === roundDialog) {
    closeRoundDialog();
  }
});

roundDialog.addEventListener("close", () => {
  roundTrackerButton.setAttribute(
    "aria-expanded",
    "false"
  );
});

resetButton.addEventListener(
  "click",
  resetAll
);


/* ============================================================
   INITIAL RENDER
   ============================================================ */
ensureTurnState();
saveConfig();
render();

function render() {
  renderHeroes();
  renderMonsters();
  updateRoundUI();
}


/* ============================================================
   SCREEN WAKE LOCK
   ============================================================ */
let wakeLock = null;
let wakeLockEnabled = false;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    wakeLockButton.disabled = true;
    wakeLockButton.textContent = "Not supported";

    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");

    wakeLockEnabled = true;

    wakeLockButton.textContent = "WakeLock ✓";

    wakeLockButton.setAttribute(
      "aria-pressed",
      "true"
    );

    wakeLock.addEventListener(
      "release",
      () => {
        wakeLock = null;

        if (wakeLockEnabled) {
          wakeLockButton.textContent = "WakeLock";

          wakeLockButton.setAttribute(
            "aria-pressed",
            "false"
          );
        }
      },
      { once: true }
    );
  } catch (error) {
    wakeLock = null;

    console.warn(
      "Could not enable Wake Lock:",
      error
    );
  }
}

async function releaseWakeLock() {
  wakeLockEnabled = false;

  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch (error) {
      console.warn(
        "Could not release Wake Lock:",
        error
      );
    }

    wakeLock = null;
  }

  wakeLockButton.textContent = "WakeLock";

  wakeLockButton.setAttribute(
    "aria-pressed",
    "false"
  );
}

wakeLockButton.addEventListener(
  "click",
  async () => {
    if (wakeLock) {
      await releaseWakeLock();
    } else {
      wakeLockEnabled = true;
      await requestWakeLock();
    }
  }
);

document.addEventListener(
  "visibilitychange",
  async () => {
    if (
      document.visibilityState === "visible" &&
      wakeLockEnabled &&
      !wakeLock
    ) {
      await requestWakeLock();
    }
  }
);


/* ============================================================
   OFFLINE PWA
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() =>
        console.log(
          "Rove service worker registered."
        )
      )
      .catch((error) =>
        console.error(
          "Could not register service worker:",
          error
        )
      );
  });
}
