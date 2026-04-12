# Indie Comic Lettering — UXP Plugin for Illustrator

A panel plugin for Adobe Illustrator that provides a UI for the indie comic lettering workflow. Requires Illustrator 2022 (26.0) or later.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Balloon** | Select a text frame + a line → click Create Word Balloon → done. No external action sets required. |
| **Dialogue** | Pick a page number and a `script.txt` file → click Load Dialogue → text frames appear on a "Dialogue" layer. |
| **Settings** | Font name and size, saved to disk so they persist between sessions. |

---

## Setup

### 1. Install Adobe UXP Developer Tool

Download the **Adobe UXP Developer Tool** from the [Adobe Developer Console](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/uxp_guide/uxp-misc/uxp-developer-tool/).

Install and launch it.

### 2. Add the plugin in developer mode

1. Open the UXP Developer Tool
2. Click **Add Plugin**
3. Navigate to this folder and select `manifest.json`
4. Click **Load** next to the plugin entry

Illustrator must be running. The panel will appear under **Window > Extensions > Indie Comic**.

### 3. Reload after changes

Click **Reload** in the UXP Developer Tool whenever you edit `index.js` or `index.html`.

---

## Distribution (packaging as `.ccx`)

To share the plugin with others:

1. In the UXP Developer Tool, click the **•••** menu next to the plugin
2. Choose **Package**
3. This produces a signed `.ccx` file that can be double-clicked to install

For public distribution via the Adobe Exchange marketplace, you'll need to go through Adobe's review process. See the [UXP plugin distribution docs](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/plugin_review/).

---

## Script file format

The Dialogue tab reads a plain-text `script.txt`. Format:

```
Page 1
CHARACTER: Dialogue line here.
CAPTION: Narration text here.

Page 2
HERO: Another line.
```

- Page markers: `Page N` (capital P, space, then the number)
- Dialogue lines: anything with a colon — the speaker name is stripped, only the text after the colon is placed in the text frame

---

## File structure

This plugin does **not** rely on a fixed folder layout (unlike the ExtendScript scripts). You browse directly to the `script.txt` file using the file picker. The selection is remembered for the session.

---

## Moving to its own repo

This folder is self-contained. To extract it:

```bash
cp -r uxp-plugin/ ~/indie-comic-uxp-plugin/
cd ~/indie-comic-uxp-plugin/
git init
git add .
git commit -m "Initial UXP plugin scaffold"
```

---

## Compatibility

| App | Min version |
|-----|-------------|
| Adobe Illustrator | 26.0 (2022) |
| UXP | 6.0 |

Tested on Illustrator 2025 (29.x).
