"use strict";

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEY = "rove-hitpoints-v1";
const ACTIVE_MONSTERS_KEY = "rove-active-monsters-v1";
const ROUND_KEY = "rove-current-round-v1";
const TURN_STATE_KEY = "rove-turn-state-v1";
const HP_HISTORY_KEY = "rove-hp-history-v1";
const ACTION_HISTORY_KEY = "rove-action-history-v1";

const DEFAULT_MONSTERS = ["A", "B", "C"];
const OPTIONAL_MONSTERS = ["D", "E", "F"];

// ============================================================
// HELPERS
// ============================================================

function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn(`Kon localStorage-key "${key}" niet lezen:`, error);
    return fallback;
  }
}

// ============================================================
// STATE
// ============================================================

const state = loadJson(STORAGE_KEY, {});
const hpHistory = loadJson(HP_HISTORY_KEY, {});
const actionHistory = loadJson(ACTION_HISTORY_KEY, []);

let historyIndex = actionHistory.length - 1;

let activeMonsters = loadJson(
  ACTIVE_MONSTERS_KEY,
  DEFAULT_MONSTERS
);

// A, B en C moeten altijd aanwezig zijn.
// D, E en F zijn optioneel.
activeMonsters = DEFAULT_MONSTERS.concat(
  OPTIONAL_MONSTERS.filter((monster) =>
    activeMonsters.includes(monster)
  )
);

let currentRound = Math.max(
  1,
  Number.parseInt(
    localStorage.getItem(ROUND_KEY) || "1",
    10
  ) || 1
);

// ============================================================
// DOM
// ============================================================

const monsterGroups =
  document.getElementById("monsterGroups");

const dialog =
  document.getElementById("hpDialog");

const hpInput =
  document.getElementById("hpInput");

const dialogMonster =
  document.getElementById("dialogMonster");

const dialogTitle =
  document.getElementById("dialogTitle");

const closeButton =
  document.getElementById("closeButton");

const clearButton =
  document.getElementById("clearButton");

const resetButton =
  document.getElementById("resetButton");

const addMonsterButton =
  document.getElementById("addMonsterButton");

const roundTrackerButton =
  document.getElementById("roundTrackerButton");

const currentRoundElement =
  document.getElementById("currentRound");

const roundDialog =
  document.getElementById("roundDialog");

const roundDialogValue =
  document.getElementById("roundDialogValue");

const roundMinusButton =
  document.getElementById("roundMinusButton");

const roundPlusButton =
  document.getElementById("roundPlusButton");

const roundCloseButton =
  document.getElementById("roundCloseButton");

const hpValueDisplay =
  document.getElementById("hpValueDisplay");

const saveButton =
  document.getElementById("saveButton");

const hpStepButtons =
  document.querySelectorAll(".hp-step-button");

const hpHistoryElement =
  document.getElementById("hpHistory");

const undoButton =
  document.getElementById("undoButton");

const redoButton =
  document.getElementById("redoButton");

const hpAdjustButtons =
  document.querySelectorAll(".hp-adjust-button");

const wakeLockButton =
  document.getElementById("wakeLockButton");

// ============================================================
// TURN STATE
// ============================================================

const turnState = loadJson(
  TURN_STATE_KEY,
  {
    heroes: {
      1: false,
      2: false,
      3: false
    },

    counters: {
      1: false,
      2: false,
      3: false
    },

    monsters: {}
  }
);

turnState.heroes ||= {
  1: false,
  2: false,
  3: false
};

turnState.counters ||= {
  1: false,
  2: false,
  3: false
};

turnState.monsters ||= {};

let selectedId = null;

// Tijdelijke waarde binnen de HP-editor.
// null = leeg
let tempValue = null;

// ============================================================
// STORAGE
// ============================================================

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

function saveHpHistory() {
  localStorage.setItem(
    HP_HISTORY_KEY,
    JSON.stringify(hpHistory)
  );
}

function saveActionHistory() {
  localStorage.setItem(
    ACTION_HISTORY_KEY,
    JSON.stringify(actionHistory)
  );
}

function saveTurnState() {
  localStorage.setItem(
    TURN_STATE_KEY,
    JSON.stringify(turnState)
  );
}

function saveActiveMonsters() {
  localStorage.setItem(
    ACTIVE_MONSTERS_KEY,
    JSON.stringify(activeMonsters)
  );
}

function saveRound() {
  localStorage.setItem(
    ROUND_KEY,
    String(currentRound)
  );
}

// ============================================================
// UNDO / REDO
// ============================================================

function updateHistoryButtons() {
  undoButton.disabled = historyIndex < 0;

  redoButton.disabled =
    historyIndex >= actionHistory.length - 1;
}

function addAction(action) {
  // Alles na de huidige positie verwijderen.
  // Dit is standaard undo/redo-gedrag:
  //
  // A → B → C
  // undo → B
  // nieuwe actie → D
  //
  // C wordt dan verwijderd uit de redo-history.
  actionHistory.splice(historyIndex + 1);

  actionHistory.push(action);

  historyIndex =
    actionHistory.length - 1;

  saveActionHistory();
  updateHistoryButtons();
}

function applyHpValue(id, value) {
  if (value === undefined || value === null) {
    delete state[id];
  } else {
    state[id] = value;
  }

  saveState();
}

function undo() {
  if (historyIndex < 0) {
    return;
  }

  const action =
    actionHistory[historyIndex];

  if (!action) {
    return;
  }

  if (action.type === "hp") {
    applyHpValue(
      action.id,
      action.oldValue
    );
  }

  if (action.type === "addMonster") {
    const index =
      activeMonsters.indexOf(action.monster);

    if (index !== -1) {
      activeMonsters.splice(index, 1);
    }

    saveActiveMonsters();
  }

  historyIndex--;

  saveActionHistory();

  render();
  updateHistoryButtons();
}

function redo() {
  if (
    historyIndex >=
    actionHistory.length - 1
  ) {
    return;
  }

  const nextIndex =
    historyIndex + 1;

  const action =
    actionHistory[nextIndex];

  if (!action) {
    return;
  }

  if (action.type === "hp") {
    applyHpValue(
      action.id,
      action.newValue
    );
  }

  if (action.type === "addMonster") {
    if (
      !activeMonsters.includes(
        action.monster
      )
    ) {
      activeMonsters.push(
        action.monster
      );
    }

    saveActiveMonsters();
  }

  historyIndex = nextIndex;

  saveActionHistory();

  render();
  updateHistoryButtons();
}

// ============================================================
// ROUND TRACKER
// ============================================================

function updateRoundUI() {
  currentRoundElement.textContent =
    currentRound;

  roundDialogValue.textContent =
    currentRound;
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

  // Nieuwe ronde = alle turn indicators resetten.
  resetTurnStatus();
}

// ============================================================
// HERO TURNS
// ============================================================

function renderHeroTurns() {
  document
    .querySelectorAll(".hero-turn")
    .forEach((button) => {
      const hero =
        button.dataset.hero;

      const isUsed =
        turnState.heroes[hero] === true;

      button.classList.toggle(
        "used",
        isUsed
      );

      button.setAttribute(
        "aria-pressed",
        String(isUsed)
      );
    });
}

function renderHeroCounters() {
  document
    .querySelectorAll(".hero-counter")
    .forEach((button) => {
      const counter =
        button.dataset.counter;

      const isUsed =
        turnState.counters[counter] === true;

      button.classList.toggle(
        "used",
        isUsed
      );

      button.setAttribute(
        "aria-pressed",
        String(isUsed)
      );
    });
}

document
  .querySelectorAll(".hero-turn")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const hero =
          button.dataset.hero;

        turnState.heroes[hero] =
          !turnState.heroes[hero];

        saveTurnState();
        renderHeroTurns();
      }
    );
  });

document
  .querySelectorAll(".hero-counter")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const counter =
          button.dataset.counter;

        turnState.counters[counter] =
          !turnState.counters[counter];

        saveTurnState();
        renderHeroCounters();
      }
    );
  });

// ============================================================
// RESET TURN STATUS
// ============================================================

function resetTurnStatus() {
  turnState.heroes = {
    1: false,
    2: false,
    3: false
  };

  turnState.counters = {
    1: false,
    2: false,
    3: false
  };

  turnState.monsters = {};

  saveTurnState();

  renderHeroTurns();
  renderHeroCounters();

  // Monster buttons worden opnieuw opgebouwd.
  render();
}

// ============================================================
// MONSTER GROUPS
// ============================================================

function createGroup(monster) {
  const group =
    document.createElement("section");

  group.className =
    "monster-group";

  // ----------------------------------------------------------
  // Monster title / turn button
  // ----------------------------------------------------------

  const title =
    document.createElement("button");

  title.type = "button";
  title.className = "group-title";

  title.setAttribute(
    "aria-pressed",
    "false"
  );

  title.innerHTML = `
    <span>${monster}</span>
  `;

  const isUsed =
    turnState.monsters[monster] === true;

  title.classList.toggle(
    "used",
    isUsed
  );

  title.setAttribute(
    "aria-pressed",
    String(isUsed)
  );

  title.addEventListener(
    "click",
    () => {
      turnState.monsters[monster] =
        !turnState.monsters[monster];

      saveTurnState();

      const newIsUsed =
        turnState.monsters[monster] === true;

      title.classList.toggle(
        "used",
        newIsUsed
      );

      title.setAttribute(
        "aria-pressed",
        String(newIsUsed)
      );
    }
  );

  // ----------------------------------------------------------
  // HP grid
  // ----------------------------------------------------------

  const grid =
    document.createElement("div");

  grid.className = "hp-grid";

  for (
    let number = 1;
    number <= 8;
    number++
  ) {
    const id =
      `${monster}${number}`;

    const card =
      document.createElement("button");

    card.type = "button";
    card.className = "hp-card";
    card.dataset.id = id;

    card.setAttribute(
      "aria-label",
      `Monster ${monster}, veld ${number}`
    );

    const hasValue =
      state[id] !== undefined;

    card.innerHTML = `
      <span class="hp-value ${
        hasValue ? "" : "empty"
      }">
        ${
          hasValue
            ? state[id]
            : "—"
        }
      </span>

      <span class="slot-number">
        ${number}
      </span>
    `;

    card.addEventListener(
      "click",
      () => {
        openEditor(
          monster,
          number
        );
      }
    );

    grid.appendChild(card);
  }

  group.append(
    title,
    grid
  );

  return group;
}

// ============================================================
// MONSTERS
// ============================================================

function updateAddButton() {
  const nextMonster =
    OPTIONAL_MONSTERS.find(
      (monster) =>
        !activeMonsters.includes(
          monster
        )
    );

  if (nextMonster) {
    addMonsterButton.disabled =
      false;

    addMonsterButton.title =
      `Monster ${nextMonster} toevoegen`;

    addMonsterButton.setAttribute(
      "aria-label",
      `Monster ${nextMonster} toevoegen`
    );
  } else {
    addMonsterButton.disabled =
      true;

    addMonsterButton.title =
      "Alle monsters D, E en F zijn toegevoegd";

    addMonsterButton.setAttribute(
      "aria-label",
      "Alle monsters D, E en F zijn toegevoegd"
    );
  }
}

function addNextMonster() {
  const nextMonster =
    OPTIONAL_MONSTERS.find(
      (monster) =>
        !activeMonsters.includes(
          monster
        )
    );

  if (!nextMonster) {
    return;
  }

  activeMonsters.push(
    nextMonster
  );

  saveActiveMonsters();

  addAction({
    type: "addMonster",
    monster: nextMonster
  });

  render();
}

function render() {
  monsterGroups.replaceChildren(
    ...activeMonsters.map(
      createGroup
    )
  );

  updateAddButton();
}

// ============================================================
// HP HISTORY
// ============================================================

function addHpHistory(
  id,
  value
) {
  hpHistory[id] ||= [];

  hpHistory[id].push(value);

  // Maximaal 20 oude waarden bewaren.
  if (
    hpHistory[id].length > 20
  ) {
    hpHistory[id].shift();
  }

  saveHpHistory();
}

function renderHpHistory(id) {
  hpHistoryElement.replaceChildren();

  const history =
    hpHistory[id] || [];

  if (history.length === 0) {
    const empty =
      document.createElement("span");

    empty.className =
      "hp-history-empty";

    empty.textContent =
      "Nog geen wijzigingen";

    hpHistoryElement.appendChild(
      empty
    );

    return;
  }

  [...history]
    .reverse()
    .forEach((value) => {
      const item =
        document.createElement("span");

      item.textContent = value;

      hpHistoryElement.appendChild(
        item
      );
    });
}

// ============================================================
// HP EDITOR
// ============================================================

function updateValueDisplay() {
  if (
    tempValue === null ||
    tempValue === undefined
  ) {
    hpValueDisplay.textContent =
      "—";

    hpValueDisplay.classList.add(
      "empty"
    );
  } else {
    hpValueDisplay.textContent =
      tempValue;

    hpValueDisplay.classList.remove(
      "empty"
    );
  }
}

function changeTempValue(amount) {
  const current =
    tempValue === null ||
    tempValue === undefined
      ? 0
      : tempValue;

  tempValue = Math.max(
    0,
    current + amount
  );

  updateValueDisplay();
}

function openEditor(
  monster,
  number
) {
  selectedId =
    `${monster}${number}`;

  dialogMonster.textContent =
    `MONSTER ${monster}`;

  dialogTitle.textContent =
    `Veld ${number}`;

  // Begin met de huidige opgeslagen waarde.
  tempValue =
    state[selectedId] ?? null;

  updateValueDisplay();

  renderHpHistory(
    selectedId
  );

  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) {
    dialog.close();
  }

  selectedId = null;
  tempValue = null;
}

// ============================================================
// SAVE HP
// ============================================================

function saveHitpoints() {
  if (!selectedId) {
    return;
  }

  const id = selectedId;

  const newValue =
    tempValue === null ||
    tempValue === undefined
      ? null
      : tempValue;

  const oldValue =
    state[id];

  // Geen verandering.
  if (
    oldValue === newValue ||
    (
      oldValue === undefined &&
      newValue === null
    )
  ) {
    closeDialog();
    return;
  }

  // Bewaar oude waarde in de zichtbare
  // HP-history.
  if (
    oldValue !== undefined &&
    oldValue !== null
  ) {
    addHpHistory(
      id,
      oldValue
    );
  }

  // Voeg toe aan undo/redo.
  addAction({
    type: "hp",
    id,
    oldValue,
    newValue
  });

  // State aanpassen.
  applyHpValue(
    id,
    newValue
  );

  render();

  closeDialog();
}

// ============================================================
// HP BUTTONS
// ============================================================

// −1 / +1
hpStepButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        if (!selectedId) {
          return;
        }

        const step =
          Number.parseInt(
            button.dataset.step,
            10
          );

        changeTempValue(
          step
        );
      }
    );
  }
);

// −5 / −3 / −1 / +1 / +3 / +5
hpAdjustButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        if (!selectedId) {
          return;
        }

        const amount =
          Number.parseInt(
            button.dataset.hpChange,
            10
          );

        changeTempValue(
          amount
        );
      }
    );
  }
);

// Opslaan
saveButton.addEventListener(
  "click",
  saveHitpoints
);

// Leegmaken
//
// Dit maakt de tijdelijke waarde leeg.
// De wijziging wordt pas definitief
// zodra op "Opslaan" wordt gedrukt.
clearButton.addEventListener(
  "click",
  () => {
    if (!selectedId) {
      return;
    }

    tempValue = null;

    updateValueDisplay();
  }
);

// Sluiten
closeButton.addEventListener(
  "click",
  closeDialog
);

// Klik buiten modal = sluiten
dialog.addEventListener(
  "click",
  (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  }
);

// ============================================================
// UNDO / REDO BUTTONS
// ============================================================

undoButton.addEventListener(
  "click",
  undo
);

redoButton.addEventListener(
  "click",
  redo
);

// ============================================================
// ROUND DIALOG
// ============================================================

roundTrackerButton.addEventListener(
  "click",
  openRoundEditor
);

roundMinusButton.addEventListener(
  "click",
  () => {
    changeRound(-1);
  }
);

roundPlusButton.addEventListener(
  "click",
  () => {
    changeRound(1);
  }
);

roundCloseButton.addEventListener(
  "click",
  closeRoundDialog
);

roundDialog.addEventListener(
  "click",
  (event) => {
    if (
      event.target === roundDialog
    ) {
      closeRoundDialog();
    }
  }
);

roundDialog.addEventListener(
  "close",
  () => {
    roundTrackerButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }
);

// ============================================================
// ADD MONSTER
// ============================================================

addMonsterButton.addEventListener(
  "click",
  addNextMonster
);

// ============================================================
// RESET HP
// ============================================================

resetButton.addEventListener(
  "click",
  () => {
    const confirmed =
      window.confirm(
        "Alle ingevulde hitpoints wissen? De toegevoegde monsters blijven zichtbaar."
      );

    if (!confirmed) {
      return;
    }

    Object.keys(state).forEach(
      (key) => {
        delete state[key];
      }
    );

    Object.keys(hpHistory).forEach(
      (key) => {
        delete hpHistory[key];
      }
    );

    // Reset ook undo/redo.
    actionHistory.length = 0;
    historyIndex = -1;

    saveState();
    saveHpHistory();
    saveActionHistory();

    render();
    updateHistoryButtons();
  }
);

// ============================================================
// INITIAL RENDER
// ============================================================

render();
renderHeroTurns();
renderHeroCounters();
updateRoundUI();
updateHistoryButtons();

// ============================================================
// SCREEN WAKE LOCK
// ============================================================

let wakeLock = null;
let wakeLockEnabled = false;

async function requestWakeLock() {
  if (
    !("wakeLock" in navigator)
  ) {
    wakeLockButton.disabled =
      true;

    wakeLockButton.textContent =
      "Niet ondersteund";

    return;
  }

  try {
    wakeLock =
      await navigator.wakeLock.request(
        "screen"
      );

    wakeLockEnabled = true;

    wakeLockButton.textContent =
      "WakeLock ✓";

    wakeLockButton.setAttribute(
      "aria-pressed",
      "true"
    );

    wakeLock.addEventListener(
      "release",
      () => {
        wakeLock = null;

        if (wakeLockEnabled) {
          wakeLockButton.textContent =
            "WakeLock";

          wakeLockButton.setAttribute(
            "aria-pressed",
            "false"
          );
        }
      },
      {
        once: true
      }
    );
  } catch (error) {
    wakeLock = null;

    console.warn(
      "Wake Lock kon niet worden ingeschakeld:",
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
        "Wake Lock kon niet worden vrijgegeven:",
        error
      );
    }

    wakeLock = null;
  }

  wakeLockButton.textContent =
    "Scherm wakker";

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

// Wake Lock opnieuw aanvragen
// wanneer de pagina weer zichtbaar wordt.
document.addEventListener(
  "visibilitychange",
  async () => {
    if (
      document.visibilityState ===
        "visible" &&
      wakeLockEnabled &&
      !wakeLock
    ) {
      await requestWakeLock();
    }
  }
);

// ============================================================
// SERVICE WORKER / OFFLINE PWA
// ============================================================

if (
  "serviceWorker" in navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "./service-worker.js"
        )
        .then(() => {
          console.log(
            "Rove service worker geregistreerd."
          );
        })
        .catch((error) => {
          console.error(
            "Service worker kon niet worden geregistreerd:",
            error
          );
        });
    }
  );
}
