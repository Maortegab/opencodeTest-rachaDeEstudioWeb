const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

const appIds = [...appSource.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
const htmlIds = [...htmlSource.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

test("RF-1: cada id que busca app.js existe en index.html", () => {
  assert.ok(appIds.length > 0);
  const missing = appIds.filter((id) => !htmlIds.includes(id));
  assert.deepStrictEqual(missing, []);
});

test("RF-1: app.js no busca el mismo id dos veces", () => {
  const duplicated = appIds.filter((id, i) => appIds.indexOf(id) !== i);
  assert.deepStrictEqual(duplicated, []);
});

test("RF-1: los ids extra de index.html son solo los títulos con aria-labelledby", () => {
  const extra = htmlIds.filter((id) => !appIds.includes(id));
  assert.deepStrictEqual(extra.sort(), [
    "form-title",
    "main",
    "sessions-title",
    "streak-title",
  ]);
});

test("const. 4: app.js es un script global sin import/export", () => {
  assert.ok(!/^\s*import\s/m.test(appSource));
  assert.ok(!/^\s*export\s/m.test(appSource));
});

test("const. 4: index.html no usa módulos ES", () => {
  assert.ok(!htmlSource.includes('type="module"'));
  assert.ok(htmlSource.includes('<script src="app.js">'));
});

test("const. 5: app.js no hace peticiones de red", () => {
  assert.ok(!appSource.includes("fetch("));
  assert.ok(!appSource.includes("XMLHttpRequest"));
  assert.ok(!appSource.includes("https://"));
  assert.ok(!appSource.includes("http://"));
});
