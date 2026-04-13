/**
 * hostscript.jsx — ExtendScript host functions for the Indie Comic CEP panel.
 *
 * This file is loaded into Illustrator's ExtendScript engine when the panel opens
 * (via <ScriptPath> in manifest.xml). All functions prefixed with indieComic_ are
 * callable from the panel via CSInterface.evalScript().
 *
 * Return convention: every function returns a JSON string:
 *   { "ok": true,  "value": ... }   on success
 *   { "ok": false, "error": "..." } on failure
 *
 * The panel parses this JSON in the evalScript callback.
 */

// ── Helpers ───────────────────────────────────────────────────────────────

function _ok(value) {
  return JSON.stringify({ ok: true, value: value !== undefined ? value : null });
}

function _err(message) {
  return JSON.stringify({ ok: false, error: String(message) });
}

function _requireDocument() {
  if (app.documents.length === 0) {
    throw new Error("No document is open in Illustrator.");
  }
  return app.activeDocument;
}

function _getOrCreateLayer(doc, name) {
  try {
    return doc.layers.getByName(name);
  } catch (e) {
    var layer = doc.layers.add();
    layer.name = name;
    return layer;
  }
}

function _resolveFont(name) {
  try {
    return app.textFonts.getByName(name);
  } catch (e) {
    try {
      return app.textFonts.getByName("ArialMT");
    } catch (e2) {
      return app.textFonts[0];
    }
  }
}

// ── indieComic_checkDocument ───────────────────────────────────────────────
// Returns the name of the active document, or an error if none is open.

function indieComic_checkDocument() {
  try {
    var doc = _requireDocument();
    return _ok(doc.name);
  } catch (e) {
    return _err(e.message);
  }
}

// ── indieComic_browseForFile ───────────────────────────────────────────────
// Opens a native file dialog and returns the chosen file's full path.
// Returns { ok: true, value: "/path/to/script.txt" } or { ok: false }.

function indieComic_browseForFile() {
  try {
    var f = File.openDialog("Select your script.txt file", "*.txt");
    if (!f) {
      return _err("No file selected.");
    }
    return _ok(f.fsName);
  } catch (e) {
    return _err(e.message);
  }
}

// ── indieComic_createWordBalloon ───────────────────────────────────────────
// Requires: one TextFrame and one PathItem (line) selected in the document.
// Creates a word balloon ellipse + curved tail, merged into a compound shape.

function indieComic_createWordBalloon() {
  try {
    var doc = _requireDocument();
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
      return _err("Nothing selected. Select a text frame and a line.");
    }

    var tf       = null;
    var linePath = null;

    for (var i = 0; i < sel.length; i++) {
      if (sel[i].typename === "TextFrame")  tf       = sel[i];
      else if (sel[i].typename === "PathItem") linePath = sel[i];
    }

    if (!tf)       return _err("No text frame in selection.");
    if (!linePath) return _err("No line in selection.");
    if (linePath.pathPoints.length < 2) {
      return _err("The selected line needs at least 2 points.");
    }

    var myBlack = new GrayColor(); myBlack.gray = 100;
    var myWhite = new GrayColor(); myWhite.gray = 0;

    // Ellipse sized to the text frame with 10pt padding on each side
    var ellipse = doc.activeLayer.pathItems.ellipse(
      tf.position[1] + 10,
      tf.position[0] - 10,
      tf.width  + 20,
      tf.height + 20,
      false, true
    );
    ellipse.stroked    = true;
    ellipse.strokeColor = myBlack;
    ellipse.fillColor   = myWhite;

    var pointBegin = linePath.pathPoints[0].anchor;
    var pointEnd   = linePath.pathPoints[1].anchor;

    var upperLeft = { anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2], [pointBegin[0], pointBegin[1]], [pointEnd[0] - 2, pointEnd[1] - 2]
    ]};
    var upperRight = { anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2], [pointBegin[0], pointBegin[1]], [pointEnd[0] + 2, pointEnd[1] - 2]
    ]};
    var lowerLeft = { anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2], [pointBegin[0], pointBegin[1]], [pointEnd[0] + 2, pointEnd[1] - 2]
    ]};
    var lowerRight = { anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2], [pointBegin[0], pointBegin[1]], [pointEnd[0] - 2, pointEnd[1] - 2]
    ]};

    var tail;
    if      (pointEnd[0] > pointBegin[0] && pointEnd[1] < pointBegin[1]) tail = _makeTail(doc, upperLeft,   50, myBlack, myWhite);
    else if (pointEnd[0] < pointBegin[0] && pointEnd[1] < pointBegin[1]) tail = _makeTail(doc, upperRight,  50, myBlack, myWhite);
    else if (pointEnd[0] > pointBegin[0] && pointEnd[1] > pointBegin[1]) tail = _makeTail(doc, lowerLeft,  -50, myBlack, myWhite);
    else if (pointEnd[0] < pointBegin[0] && pointEnd[1] > pointBegin[1]) tail = _makeTail(doc, lowerRight, -50, myBlack, myWhite);
    else {
      ellipse.remove();
      return _err("Line appears to be perfectly straight. Use a diagonal line.");
    }

    // Deselect source objects; select only the new shapes before merging
    tf.selected       = false;
    linePath.selected = false;
    ellipse.selected  = true;
    tail.selected     = true;

    try {
      app.executeMenuCommand("makeCompoundShape");
    } catch (e) {
      return _err("Balloon created but compound merge failed. " +
                  "Use Object > Compound Path > Make manually.");
    }

    return _ok("Word balloon created.");

  } catch (e) {
    return _err(e.message);
  }
}

function _makeTail(doc, anchorVals, tailVal, strokeColor, fillColor) {
  var path      = doc.pathItems.add();
  path.closed   = true;
  path.filled   = true;
  path.stroked  = true;
  path.strokeColor = strokeColor;
  path.fillColor   = fillColor;

  for (var j = 0; j < anchorVals.anchors.length; j++) {
    var handle = path.pathPoints.add();
    handle.anchor = anchorVals.anchors[j];

    if (j === 0 || j === 2) {
      var pt = anchorVals.anchors[j];
      handle.rightDirection = [pt[0], pt[1] + tailVal];
      handle.leftDirection  = [pt[0], pt[1] + tailVal];
      handle.pointType = PointType.SMOOTH;
    } else {
      handle.rightDirection = anchorVals.anchors[j];
      handle.leftDirection  = anchorVals.anchors[j];
      handle.pointType = PointType.CORNER;
    }
  }
  return path;
}

// ── indieComic_loadPageDialogue ────────────────────────────────────────────
// Reads script.txt and creates text frames on the "Dialogue" layer for the
// requested page. Parameters are passed as primitives from the panel.
//
//   pageNumber  {number}  e.g. 3
//   scriptPath  {string}  absolute filesystem path to script.txt
//   fontName    {string}  e.g. "ComicGeek"
//   fontSize    {number}  points, e.g. 7

function indieComic_loadPageDialogue(pageNumber, scriptPath, fontName, fontSize) {
  try {
    var doc = _requireDocument();

    if (isNaN(pageNumber) || pageNumber < 1) {
      return _err("Page number must be 1 or greater.");
    }

    var scriptFile = new File(scriptPath);
    if (!scriptFile.exists) {
      return _err("Script file not found at:\n" + scriptPath);
    }

    scriptFile.open("r");
    var txtFile = scriptFile.read();
    scriptFile.close();

    // Line-anchored search to avoid "Page 2" matching "Page 20"
    function findPageMarker(text, n, fromIndex) {
      var start = fromIndex || 0;
      var re    = new RegExp("(^|\\r?\\n)Page " + n + "(\\r?\\n|$)");
      var m     = re.exec(text.slice(start));
      if (!m) return -1;
      return start + m.index + m[1].length;
    }

    var topOfPage    = findPageMarker(txtFile, pageNumber, 0);
    var bottomOfPage = findPageMarker(txtFile, pageNumber + 1,
                         topOfPage === -1 ? 0 : topOfPage + ("Page " + pageNumber).length);

    if (topOfPage === -1) {
      return _err("Could not find \"Page " + pageNumber + "\" in the script file.");
    }
    if (bottomOfPage === -1) bottomOfPage = txtFile.length;

    var scriptPage = txtFile.slice(topOfPage, bottomOfPage);
    var lines      = scriptPage.split(/\r?\n/);
    var myFont     = _resolveFont(fontName);

    _getOrCreateLayer(doc, "Bubbles");
    var dialogueLayer = _getOrCreateLayer(doc, "Dialogue");

    var count          = 0;
    var previousLayer  = doc.activeLayer;

    for (var i = 0; i < lines.length; i++) {
      var colonPos = lines[i].indexOf(":");
      if (colonPos === -1) continue;

      var dialogue = lines[i].slice(colonPos + 1).replace(/^\s+/, "");
      if (!dialogue) continue;

      doc.activeLayer = dialogueLayer;
      var rectRef     = doc.pathItems.rectangle(50 - (count * 50), -150, 100, 100);
      var areaTextRef = doc.textFrames.areaText(rectRef);
      doc.activeLayer = previousLayer;

      areaTextRef.contents = dialogue;
      areaTextRef.textRange.size = fontSize;
      areaTextRef.textRange.characterAttributes.textFont = myFont;

      count++;
    }

    if (count === 0) {
      return _err("No dialogue found on page " + pageNumber + ". " +
                  "Lines must contain a colon (CHARACTER: text).");
    }

    return _ok("Loaded " + count + " dialogue line" + (count !== 1 ? "s" : "") +
               " for page " + pageNumber + ".");

  } catch (e) {
    return _err(e.message);
  }
}
