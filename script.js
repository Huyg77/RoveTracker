const STORAGE_KEY = "rove-hitpoints-v1";
const ACTIVE_MONSTERS_KEY = "rove-active-monsters-v1";
const ROUND_KEY = "rove-current-round-v1";
const TURN_STATE_KEY = "rove-turn-state-v1";

const DEFAULT_MONSTERS = ["A", "B", "C"];
const OPTIONAL_MONSTERS = ["D", "E", "F"];

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

let activeMonsters = JSON.parse(
  localStorage.getItem(ACTIVE_MONSTERS_KEY) ||
  JSON.stringify(DEFAULT_MONSTERS)
);

let currentRound = Math.max(
  1,
  Number.parseInt(localStorage.getItem(ROUND_KEY) || "1", 10)
);

// Zorg ervoor dat A-C altijd actief blijven.
// Alleen D-F kunnen optioneel zijn.
activeMonsters = DEFAULT_MONSTERS.concat(
  OPTIONAL_MONSTERS.filter((monster) => activeMonsters.includes(monster))
);

// ------------------------------------------------------------
// DOM elementen
// ------------------------------------------------------------

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

const roundTrackerButton = document.getElementById("roundTrackerButton");
const currentRoundElement = document.getElementById("currentRound");

const roundDialog = document.getElementById("roundDialog");
const roundDialogValue = document.getElementById("roundDialogValue");
const roundMinusButton = document.getElementById("roundMinusButton");
const roundPlusButton = document.getElementById("roundPlusButton");
const roundCloseButton = document.getElementById("roundCloseButton");

// ------------------------------------------------------------
// Turn state
// ------------------------------------------------------------

const turnState = JSON.parse(
  localStorage.getItem(TURN_STATE_KEY)
) || {
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
};

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

// ------------------------------------------------------------
// Storage
// ------------------------------------------------------------

function saveTurnState() {
  localStorage.setItem(
    TURN_STATE_KEY,
    JSON.stringify(turnState)
  );
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
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

// ------------------------------------------------------------
// Round tracker
// ------------------------------------------------------------

function updateRoundUI() {
  currentRoundElement.textContent = currentRound;
  roundDialogValue.textContent = currentRound;
}

function openRoundEditor() {
  updateRoundUI();
  roundDialog.showModal();
}

function closeRoundDialog() {
  if (roundDialog.open) {
    roundDialog.close();
  }
}

function changeRound(amount) {
  currentRound = Math.max(
    1,
    currentRound + amount
  );

  saveRound();
  updateRoundUI();

  // Bij een nieuwe ronde worden alle turn-indicators gereset.
  resetTurnStatus();
}

// ------------------------------------------------------------
// Hero turns
// ------------------------------------------------------------

function renderHeroTurns() {
  document
    .querySelectorAll(".hero-turn")
    .forEach((button) => {
      const hero = button.dataset.hero;
      const isUsed = turnState.heroes[hero] === true;

      button.classList.toggle("used", isUsed);
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
      const counter = button.dataset.counter;
      const isUsed = turnState.counters[counter] === true;

      button.classList.toggle("used", isUsed);

      button.setAttribute(
        "aria-pressed",
        String(isUsed)
      );
    });
}

document
  .querySelectorAll(".hero-counter")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const counter = button.dataset.counter;

      turnState.counters[counter] =
        !turnState.counters[counter];

      saveTurnState();
      renderHeroCounters();
    });
  });

// ÉÉN hero click listener.
// Let op: er staat verderop GEEN tweede hero listener meer.
document
  .querySelectorAll(".hero-turn")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const hero = button.dataset.hero;

      turnState.heroes[hero] =
        !turnState.heroes[hero];

      saveTurnState();
      renderHeroTurns();
    });
  });

// ------------------------------------------------------------
// Monster groups
// ------------------------------------------------------------

function createGroup(monster) {
  const group = document.createElement("section");
  group.className = "monster-group";

  const title = document.createElement("button");

  title.type = "button";
  title.className = "group-title";
  title.setAttribute("aria-pressed", "false");

  title.innerHTML = `<span>${monster}</span>`;

  // Opgeslagen turn-status toepassen.
  const isUsed = turnState.monsters[monster] === true;

  title.classList.toggle("used", isUsed);
  title.setAttribute(
    "aria-pressed",
    String(isUsed)
  );

  // ÉÉN monster click listener.
  title.addEventListener("click", () => {
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
  });

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
      `Monster ${monster}, veld ${number}`
    );

    card.innerHTML = `
      <span class="hp-value ${
        state[id] === undefined ? "empty" : ""
      }">
        ${
          state[id] === undefined
            ? "—"
            : state[id]
        }
      </span>
      <span class="slot-number">${number}</span>
    `;

    card.addEventListener("click", () => {
      openEditor(monster, number);
    });

    grid.appendChild(card);
  }

  group.append(title, grid);

  return group;
}

// ------------------------------------------------------------
// Reset turn status
// ------------------------------------------------------------

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

  render();
  renderHeroTurns();
  renderHeroCounters();
}

// ------------------------------------------------------------
// Monsters
// ------------------------------------------------------------

function updateAddButton() {
  const nextMonster = OPTIONAL_MONSTERS.find(
    (monster) =>
      !activeMonsters.includes(monster)
  );

  if (nextMonster) {
    addMonsterButton.disabled = false;

    addMonsterButton.title =
      `Monster ${nextMonster} toevoegen`;

    addMonsterButton.setAttribute(
      "aria-label",
      `Monster ${nextMonster} toevoegen`
    );
  } else {
    addMonsterButton.disabled = true;

    addMonsterButton.title =
      "Alle monsters D, E en F zijn toegevoegd";

    addMonsterButton.setAttribute(
      "aria-label",
      "Alle monsters D, E en F zijn toegevoegd"
    );
  }
}

function render() {
  monsterGroups.replaceChildren(
    ...activeMonsters.map(createGroup)
  );

  updateAddButton();
}

function addNextMonster() {
  const nextMonster = OPTIONAL_MONSTERS.find(
    (monster) =>
      !activeMonsters.includes(monster)
  );

  if (!nextMonster) return;

  activeMonsters.push(nextMonster);

  saveActiveMonsters();
  render();
}

// ------------------------------------------------------------
// Hitpoint editor
// ------------------------------------------------------------

function openEditor(monster, number) {
  selectedId = `${monster}${number}`;

  dialogMonster.textContent =
    `MONSTER ${monster}`;

  dialogTitle.textContent =
    `Veld ${number}`;

  hpInput.value =
    state[selectedId] ?? "";

  dialog.showModal();

  requestAnimationFrame(() => {
    hpInput.focus();
    hpInput.select();
  });
}

function closeDialog() {
  if (dialog.open) {
    dialog.close();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedId) return;

  const value = hpInput.value.trim();

  if (value === "") return;

  state[selectedId] =
    Math.max(
      0,
      Number.parseInt(value, 10)
    );

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

closeButton.addEventListener(
  "click",
  closeDialog
);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closeDialog();
  }
});

// ------------------------------------------------------------
// Round dialog
// ------------------------------------------------------------

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
    if (event.target === roundDialog) {
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

roundTrackerButton.addEventListener(
  "click",
  () => {
    roundTrackerButton.setAttribute(
      "aria-expanded",
      "true"
    );
  }
);

// ------------------------------------------------------------
// Add monster
// ------------------------------------------------------------

addMonsterButton.addEventListener(
  "click",
  addNextMonster
);

// ------------------------------------------------------------
// Reset HP
// ------------------------------------------------------------

resetButton.addEventListener(
  "click",
  () => {
    const confirmed = window.confirm(
      "Alle ingevulde hitpoints wissen? De toegevoegde monsters blijven zichtbaar."
    );

    if (!confirmed) return;

    Object.keys(state).forEach(
      (key) => delete state[key]
    );

    saveState();
    render();
  }
);

// ------------------------------------------------------------
// Initial render
// ------------------------------------------------------------

render();
renderHeroTurns();
renderHeroCounters();
updateRoundUI();

// ------------------------------------------------------------
// Screen Wake Lock
// ------------------------------------------------------------

const wakeLockButton =
  document.getElementById("wakeLockButton");

let wakeLock = null;
let wakeLockEnabled = false;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    wakeLockButton.disabled = true;
    wakeLockButton.textContent =
      "Niet ondersteund";
    return;
  }

  try {
    wakeLock =
      await navigator.wakeLock.request("screen");

    wakeLockEnabled = true;

    wakeLockButton.textContent =
      "Scherm wakker ✓";

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
            "Scherm wakker";

          wakeLockButton.setAttribute(
            "aria-pressed",
            "false"
          );
        }
      }
    );
  } catch (error) {
    console.warn(
      "Wake Lock kon niet worden ingeschakeld:",
      error
    );
  }
}

async function releaseWakeLock() {
  wakeLockEnabled = false;

  if (wakeLock) {
    await wakeLock.release();
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

// Bij terugkeer naar de pagina Wake Lock opnieuw aanvragen.
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

// ------------------------------------------------------------
// Service Worker / offline PWA
// ------------------------------------------------------------

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("./service-worker.js")
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
