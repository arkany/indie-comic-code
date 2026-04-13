# Indie Comic Lettering — CEP Extension for Illustrator

A panel extension for Adobe Illustrator built on CEP (Common Extensibility Platform).
The panel is HTML/CSS/JS; all Illustrator API calls go through `CSInterface.evalScript()`
into the ExtendScript functions defined in `jsx/hostscript.jsx`.

Requires Illustrator 2022 (26.0) or later. CEP 11, which ships with CC 2021+.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Balloon** | Select a text frame + a line → click Create Word Balloon |
| **Dialogue** | Browse to `script.txt`, enter a page number, click Load Dialogue |
| **Settings** | Font name and size, saved to `localStorage` |

---

## Setup

### 1. Get CSInterface.js

CSInterface is the Adobe-provided bridge between the panel and the host app.
Download it and place it at `js/CSInterface.js`:

```
https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/CSInterface.js
```

(Raw download link — click "Raw" on that page, then save as `CSInterface.js`.)

### 2. Enable developer mode

CEP normally requires extensions to be signed. For development, enable player debug mode:

**macOS:**
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

**Windows (run as Administrator):**
```
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f
```

Restart Illustrator after running this command.

### 3. Install the extension (symlink)

Point CEP's extension folder at this directory so you can edit in place:

**macOS:**
```bash
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions/
ln -s /path/to/indie-comic-code/cep-extension \
      ~/Library/Application\ Support/Adobe/CEP/extensions/com.indiecomic.lettering
```

**Windows:**
```
mklink /D "%APPDATA%\Adobe\CEP\extensions\com.indiecomic.lettering" "C:\path\to\indie-comic-code\cep-extension"
```

### 4. Open the panel in Illustrator

Launch Illustrator → **Window > Extensions > Indie Comic**

If the menu item doesn't appear, double-check:
- PlayerDebugMode is set to `1`
- The symlink/folder is named exactly `com.indiecomic.lettering`
- `CSXS/manifest.xml` is present and valid

### 5. Debug the panel

With `.debug` in the extension folder, open a Chromium-based browser and navigate to:

```
http://localhost:8088
```

This opens DevTools for the panel's Chromium frame. `console.log()` in `main.js` appears here.

For ExtendScript errors, use the **ExtendScript Toolkit** or check Illustrator's JavaScript console
(`Help > Illustrator Scripting > Open Script Editor`).

---

## File structure

```
cep-extension/
├── CSXS/
│   └── manifest.xml       # Extension metadata, host versions, panel geometry
├── jsx/
│   └── hostscript.jsx     # ExtendScript functions (runs inside Illustrator)
├── js/
│   ├── CSInterface.js     # Adobe bridge library (download separately — see above)
│   └── main.js            # Panel logic; calls evalScript() to invoke host functions
├── css/
│   └── main.css           # Panel styles; light/dark theme via CSS variables
├── index.html             # Panel HTML
├── .debug                 # Enables remote DevTools on port 8088 (dev only)
└── README.md
```

---

## How it works

1. Illustrator loads `jsx/hostscript.jsx` when the panel opens (via `<ScriptPath>` in `manifest.xml`)
2. Functions defined there (prefixed `indieComic_`) become available in the ExtendScript engine
3. The panel calls them via `cs.evalScript("indieComic_createWordBalloon()", callback)`
4. Each function returns a JSON string `{ ok: true, value: "..." }` or `{ ok: false, error: "..." }`
5. The callback in `main.js` parses the JSON and updates the panel UI

---

## Packaging for distribution

To distribute the extension without requiring developer mode:

1. Install the **Adobe Extension Manager** or use the **ExManCmd** CLI
2. Package the `cep-extension/` folder (without `.debug`) as a `.zxp` file:
   ```bash
   ZXPSignCmd -sign cep-extension/ indie-comic.zxp certificate.p12 password
   ```
3. Users install the `.zxp` via **Anastasiy's Extension Manager** or **ExManCmd**

For a self-signed certificate (development/testing):
```bash
ZXPSignCmd -selfSignedCert US CA "Indie Comic" developer password certificate.p12
```

ZXPSignCmd is part of the [Adobe ZXP/UXP Packager](https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD).

---

## Script file format

```
Page 1
CHARACTER: Dialogue line here.
CAPTION: Narration text here.

Page 2
HERO: Another line.
```

- Page markers: `Page N` (capital P, space, then the number)
- Any line with a colon is treated as dialogue — the speaker name is stripped

---

## Compatibility

| App | Min version |
|-----|-------------|
| Adobe Illustrator | 26.0 (2022) |
| CEP | 11.0 |

Tested on Illustrator 2025 (29.x) / macOS.
