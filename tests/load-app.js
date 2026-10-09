const fs = require("node:fs");
const path = require("node:path");

function makeElement() {
  return {
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
    replaceChildren() {},
    append() {},
    appendChild() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return null;
    },
    focus() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    hidden: false,
    textContent: "",
    title: "",
    value: "",
    className: "",
  };
}

const EXPORTS = `
module.exports = {
  toDateKey,
  shiftDays,
  weekStartKey,
  heatLevel,
  calculateStats,
  formatMinutes,
  formatDate,
  cellTitle,
  streakMessage,
  heatLabel,
  streakState,
};
`;

function loadApp() {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "app.js"), "utf8")
    .replace(/render\(\);\s*$/, "");

  const sandboxModule = { exports: {} };
  const document = {
    getElementById: () => makeElement(),
    createElement: () => makeElement(),
  };
  const localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  const crypto = { randomUUID: () => "test-id" };
  const confirm = () => true;

  const factory = new Function(
    "module",
    "document",
    "localStorage",
    "crypto",
    "confirm",
    source + EXPORTS
  );
  factory(sandboxModule, document, localStorage, crypto, confirm);

  return sandboxModule.exports;
}

module.exports = { loadApp, makeElement };
