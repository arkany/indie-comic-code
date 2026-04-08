/**
 * Indie Comic Lettering — UXP Plugin for Adobe Illustrator
 *
 * Exposes three tools as a panel:
 *   1. Word Balloon  — creates a balloon + tail from a selected text frame + line
 *   2. Page Dialogue — loads dialogue from script.txt into text frames
 *   3. Settings      — font name/size, persisted to plugin data folder
 */

"use strict";

const { app, PointType }  = require("illustrator");
const { storage, shell }  = require("uxp");
const fs                   = storage.localFileSystem;

// ── Settings ──────────────────────────────────────────────────────────────

const SETTINGS_FILENAME = "settings.json";
const DEFAULT_SETTINGS  = { fontName: "ComicGeek", fontSize: 7 };

let settings = { ...DEFAULT_SETTINGS };
let scriptFilePath = null;

async function loadSettings() {
  try {
    const dataFolder = await fs.getDataFolder();
    const entries    = await dataFolder.getEntries();
    const file       = entries.find(e => e.name === SETTINGS_FILENAME);
    if (file) {
      const raw = await file.read({ format: storage.formats.utf8 });
      Object.assign(settings, JSON.parse(raw));
    }
  } catch (_) {
    // No saved settings yet — use defaults
  }
  applySettingsToUI();
}

async function saveSettings() {
  const fontName = document.getElementById("font-name").value.trim();
  const fontSize = parseInt(document.getElementById("font-size").value, 10);

  if (!fontName) {
    return setStatus("settings-status", "Font name cannot be empty.", "error");
  }
  if (isNaN(fontSize) || fontSize < 4 || fontSize > 72) {
    return setStatus("settings-status", "Font size must be between 4 and 72.", "error");
  }

  settings = { fontName, fontSize };

  try {
    const dataFolder = await fs.getDataFolder();
    const file = await dataFolder.createFile(SETTINGS_FILENAME, { overwrite: true });
    await file.write(JSON.stringify(settings, null, 2), { format: storage.formats.utf8 });
    setStatus("settings-status", "Settings saved.", "success");
  } catch (e) {
    setStatus("settings-status", "Could not save: " + e.message, "error");
  }
}

function applySettingsToUI() {
  document.getElementById("font-name").value = settings.fontName;
  document.getElementById("font-size").value = settings.fontSize;
}

// ── Word Balloon ───────────────────────────────────────────────────────────

function createWordBalloon() {
  try {
    const doc = app.activeDocument;
    const sel = doc.selection;

    if (!sel || sel.length === 0) {
      return setStatus("balloon-status",
        "Nothing selected. Select a text frame and a line.", "error");
    }

    let tf       = null;
    let linePath = null;

    for (const item of sel) {
      if (item.typename === "TextFrame")  tf       = item;
      else if (item.typename === "PathItem") linePath = item;
    }

    if (!tf) {
      return setStatus("balloon-status",
        "No text frame in selection.", "error");
    }
    if (!linePath) {
      return setStatus("balloon-status",
        "No line in selection.", "error");
    }
    if (linePath.pathPoints.length < 2) {
      return setStatus("balloon-status",
        "The selected path needs at least 2 points.", "error");
    }

    const myBlack      = new app.GrayColor();
    myBlack.gray       = 100;
    const myWhite      = new app.GrayColor();
    myWhite.gray       = 0;

    // Create ellipse around the text frame with 10pt padding on each side
    const ellipse = doc.activeLayer.pathItems.ellipse(
      tf.position[1] + 10,
      tf.position[0] - 10,
      tf.width  + 20,
      tf.height + 20,
      false,
      true
    );
    ellipse.stroked    = true;
    ellipse.strokeColor = myBlack;
    ellipse.fillColor   = myWhite;

    const pointBegin = linePath.pathPoints[0].anchor;
    const pointEnd   = linePath.pathPoints[1].anchor;

    // Build anchor sets for each direction
    const upperLeft = { anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2],
      [pointBegin[0],   pointBegin[1]  ],
      [pointEnd[0] - 2, pointEnd[1] - 2]
    ]};
    const upperRight = { anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2],
      [pointBegin[0],   pointBegin[1]  ],
      [pointEnd[0] + 2, pointEnd[1] - 2]
    ]};
    const lowerLeft = { anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2],
      [pointBegin[0],   pointBegin[1]  ],
      [pointEnd[0] + 2, pointEnd[1] - 2]
    ]};
    const lowerRight = { anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2],
      [pointBegin[0],   pointBegin[1]  ],
      [pointEnd[0] - 2, pointEnd[1] - 2]
    ]};

    let tail;
    if      (pointEnd[0] > pointBegin[0] && pointEnd[1] < pointBegin[1]) tail = balloonTail(doc, upperLeft,  50);
    else if (pointEnd[0] < pointBegin[0] && pointEnd[1] < pointBegin[1]) tail = balloonTail(doc, upperRight, 50);
    else if (pointEnd[0] > pointBegin[0] && pointEnd[1] > pointBegin[1]) tail = balloonTail(doc, lowerLeft, -50);
    else if (pointEnd[0] < pointBegin[0] && pointEnd[1] > pointBegin[1]) tail = balloonTail(doc, lowerRight,-50);
    else {
      ellipse.remove();
      return setStatus("balloon-status",
        "Line appears to be straight. Use a diagonal line.", "error");
    }

    // Select both shapes and merge into a compound shape
    ellipse.selected = true;
    tail.selected    = true;

    try {
      app.executeMenuCommand("makeCompoundShape");
    } catch (e) {
      setStatus("balloon-status",
        "Balloon created but compound merge failed. " +
        "Use Object > Compound Path > Make manually.", "error");
      return;
    }

    setStatus("balloon-status", "Word balloon created.", "success");

  } catch (e) {
    setStatus("balloon-status", "Error: " + e.message, "error");
  }
}

/**
 * Creates the tail path for a word balloon.
 * @param {Document} doc
 * @param {{ anchors: number[][] }} anchorVals
 * @param {number} tailVal  Positive = curves up, negative = curves down
 * @returns {PathItem}
 */
function balloonTail(doc, anchorVals, tailVal) {
  const path    = doc.pathItems.add();
  path.stroked  = true;

  for (let j = 0; j < anchorVals.anchors.length; j++) {
    const handle = path.pathPoints.add();
    handle.anchor = anchorVals.anchors[j];

    if (j === 0 || j === 2) {
      const pt = anchorVals.anchors[j];
      handle.rightDirection = [pt[0], pt[1] + tailVal];
      handle.leftDirection  = [pt[0], pt[1] + tailVal];
      handle.pointType      = PointType.SMOOTH;
    } else {
      handle.rightDirection = anchorVals.anchors[j];
      handle.leftDirection  = anchorVals.anchors[j];
      handle.pointType      = PointType.CORNER;
    }
  }

  return path;
}

// ── Page Dialogue ──────────────────────────────────────────────────────────

async function browseForScript() {
  try {
    const file = await fs.getFileForOpening({
      types: ["txt"],
      allowMultiple: false
    });
    if (!file) return;
    scriptFilePath = await fs.createPersistentToken(file);
    document.getElementById("script-path-display").textContent = file.name;
    setStatus("dialogue-status", "Script file selected: " + file.name, "success");
  } catch (e) {
    setStatus("dialogue-status", "Could not open file: " + e.message, "error");
  }
}

async function loadPageDialogue() {
  const pageNumber = parseInt(document.getElementById("page-number").value, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return setStatus("dialogue-status", "Enter a valid page number.", "error");
  }

  if (!scriptFilePath) {
    return setStatus("dialogue-status", "Browse to a script.txt file first.", "error");
  }

  let txtFile;
  try {
    const fileEntry = await fs.getEntryForPersistentToken(scriptFilePath);
    txtFile = await fileEntry.read({ format: storage.formats.utf8 });
  } catch (e) {
    return setStatus("dialogue-status", "Could not read script file: " + e.message, "error");
  }

  const pageStart = "Page " + pageNumber;
  const pageEnd   = "Page " + (pageNumber + 1);

  const topOfPage    = txtFile.indexOf(pageStart);
  let   bottomOfPage = txtFile.indexOf(pageEnd);

  if (topOfPage === -1) {
    return setStatus("dialogue-status",
      "Could not find \"" + pageStart + "\" in the script.", "error");
  }
  if (bottomOfPage === -1) bottomOfPage = txtFile.length;

  const scriptPage = txtFile.slice(topOfPage, bottomOfPage);
  const lines      = scriptPage.split("\n");

  // Resolve font with fallback
  let myFont;
  try {
    myFont = app.textFonts.getByName(settings.fontName);
  } catch (_) {
    try {
      myFont = app.textFonts.getByName("ArialMT");
    } catch (_2) {
      myFont = app.textFonts[0];
    }
  }

  const doc = app.activeDocument;

  // Ensure "Dialogue" layer exists
  let dialogueLayer;
  try {
    dialogueLayer = doc.layers.getByName("Dialogue");
  } catch (_) {
    dialogueLayer = doc.layers.add();
    dialogueLayer.name = "Dialogue";
  }

  let count = 0;
  lines.forEach((line, i) => {
    const colonPos = line.indexOf(":");
    if (colonPos === -1) return;

    const dialogue = line.slice(colonPos + 1).trim();
    if (!dialogue) return;

    // Stack frames in a column: each 100×100pt, spaced 50pt downward
    const rectRef = doc.pathItems.rectangle(50 - (count * 50), -150, 100, 100);
    const frame   = doc.textFrames.areaText(rectRef);

    frame.contents = dialogue;
    frame.textRange.size = settings.fontSize;
    frame.textRange.characterAttributes.textFont = myFont;

    count++;
  });

  if (count === 0) {
    setStatus("dialogue-status",
      "No dialogue found on page " + pageNumber + ". " +
      "Lines must contain a colon (CHARACTER: text).", "error");
  } else {
    setStatus("dialogue-status",
      "Loaded " + count + " dialogue line" + (count !== 1 ? "s" : "") +
      " for page " + pageNumber + ".", "success");
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function setStatus(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className   = "status" + (type ? " " + type : "");
}

// ── Tab switching ──────────────────────────────────────────────────────────

function initTabs() {
  const tabs   = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });

      panels.forEach(panel => {
        const isTarget = panel.id === "tab-" + target;
        panel.classList.toggle("active", isTarget);
        panel.hidden = !isTarget;
      });
    });
  });
}

// ── Entrypoint ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  await loadSettings();

  document.getElementById("btn-balloon")
    .addEventListener("click", createWordBalloon);

  document.getElementById("btn-browse")
    .addEventListener("click", browseForScript);

  document.getElementById("btn-load-dialogue")
    .addEventListener("click", loadPageDialogue);

  document.getElementById("btn-save-settings")
    .addEventListener("click", saveSettings);
});
