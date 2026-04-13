/**
 * main.js — CEP panel logic for Indie Comic Lettering.
 *
 * Communicates with Illustrator via CSInterface.evalScript(), which executes
 * functions defined in jsx/hostscript.jsx inside Illustrator's ExtendScript engine.
 *
 * All evalScript calls receive a JSON string back:
 *   { ok: true,  value: ... }   → success
 *   { ok: false, error: "..." } → failure
 */

"use strict";

const cs = new CSInterface();

// ── Settings (persisted via localStorage) ─────────────────────────────────

const SETTINGS_KEY = "indieComic_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { fontName: "ComicGeek", fontSize: 7 };
  } catch (_) {
    return { fontName: "ComicGeek", fontSize: 7 };
  }
}

function saveSettings() {
  const fontName = document.getElementById("font-name").value.trim();
  const fontSize = parseInt(document.getElementById("font-size").value, 10);

  if (!fontName) {
    return setStatus("settings-status", "Font name cannot be empty.", "error");
  }
  if (isNaN(fontSize) || fontSize < 4 || fontSize > 72) {
    return setStatus("settings-status", "Font size must be between 4 and 72.", "error");
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ fontName, fontSize }));
  setStatus("settings-status", "Settings saved.", "success");
}

function applySettingsToUI() {
  const s = loadSettings();
  document.getElementById("font-name").value = s.fontName;
  document.getElementById("font-size").value = s.fontSize;
}

// ── Word Balloon ───────────────────────────────────────────────────────────

function createWordBalloon() {
  setStatus("balloon-status", "Working…");
  cs.evalScript("indieComic_createWordBalloon()", (result) => {
    handleResult("balloon-status", result);
  });
}

// ── Page Dialogue ──────────────────────────────────────────────────────────

// Stored as a module-level variable so it persists across Browse calls.
let _scriptFilePath = null;

function browseForFile() {
  cs.evalScript("indieComic_browseForFile()", (result) => {
    const data = parseResult(result);
    if (!data) return;

    if (data.ok && data.value) {
      _scriptFilePath = data.value;
      // Show just the filename, not the full path
      const fileName = _scriptFilePath.replace(/.*[/\\]/, "");
      document.getElementById("script-path-display").textContent = fileName;
      document.getElementById("script-path-display").title = _scriptFilePath;
      setStatus("dialogue-status", "Selected: " + fileName, "success");
    } else {
      setStatus("dialogue-status", data.error || "No file selected.", "");
    }
  });
}

function loadPageDialogue() {
  const pageNumber = parseInt(document.getElementById("page-number").value, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return setStatus("dialogue-status", "Enter a valid page number (1 or greater).", "error");
  }
  if (!_scriptFilePath) {
    return setStatus("dialogue-status", "Browse to a script.txt file first.", "error");
  }

  const settings = loadSettings();

  // Escape the path for safe embedding in the evalScript string.
  // Backslashes (Windows paths) must be doubled.
  const escapedPath = _scriptFilePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const fontName    = settings.fontName.replace(/"/g, '\\"');
  const fontSize    = settings.fontSize;

  setStatus("dialogue-status", "Loading…");

  cs.evalScript(
    `indieComic_loadPageDialogue(${pageNumber}, "${escapedPath}", "${fontName}", ${fontSize})`,
    (result) => { handleResult("dialogue-status", result); }
  );
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function parseResult(result) {
  // evalScript returns "EvalScript Error" on a hard JS error in the host
  if (result === "EvalScript Error" || result === null || result === undefined) {
    return { ok: false, error: "A scripting error occurred. Check the Illustrator console." };
  }
  try {
    return JSON.parse(result);
  } catch (_) {
    return { ok: false, error: "Unexpected response: " + result };
  }
}

function handleResult(statusId, result) {
  const data = parseResult(result);
  if (data.ok) {
    setStatus(statusId, data.value || "Done.", "success");
  } else {
    setStatus(statusId, data.error || "Unknown error.", "error");
  }
}

function setStatus(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  el.className = "status" + (type ? " " + type : "");
}

// ── Tab switching ──────────────────────────────────────────────────────────

function initTabs() {
  const tabs   = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
        t.setAttribute("tabindex", t === tab ? "0" : "-1");
      });
      panels.forEach(panel => {
        const isTarget = panel.id === "tab-" + tab.dataset.tab;
        panel.classList.toggle("active", isTarget);
        panel.hidden = !isTarget;
      });
    });
  });
}

// ── Theme sync ─────────────────────────────────────────────────────────────
// Reads the host app's UI theme color and applies a matching CSS class.

function syncTheme() {
  const hostEnv = cs.getHostEnvironment();
  if (!hostEnv) return;
  const theme = JSON.parse(hostEnv).appSkinInfo;
  const brightness = theme.panelBackgroundColor.color.red; // 0–255
  document.body.classList.toggle("theme-light", brightness > 127);
}

// ── Entrypoint ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  applySettingsToUI();
  syncTheme();

  document.getElementById("btn-balloon").addEventListener("click", createWordBalloon);
  document.getElementById("btn-browse").addEventListener("click", browseForFile);
  document.getElementById("btn-load-dialogue").addEventListener("click", loadPageDialogue);
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);

  // CEP theme-change event — fires when the user switches Illustrator's UI theme
  cs.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, syncTheme);
});
