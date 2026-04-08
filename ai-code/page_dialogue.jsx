#target illustrator

// page_dialogue.jsx
// Reads a script.txt file and creates text frames in Illustrator for each dialogue
// line on the requested page. Assumes the project folder structure described in README.md.
//
// Expected folder layout (relative to the open .ai file):
//   ../00-assets/script.txt   (script file)
//
// Script format:
//   Page 1
//   CHARACTER: Dialogue here.
//   CAPTION: Narration here.
//
//   Page 2
//   ...

var SCRIPT_FOLDER    = "00-assets";
var LETTERING_FOLDER = "02-Lettering";
var FONT_NAME        = "ComicGeek";
var FONT_SIZE        = 7;  // points

if (app.documents.length === 0) {
  alert("No document is open.");
  //@ts-ignore
  exit();
}

var doc = app.activeDocument;

// --- Add layers (ignore error if they already exist) ---
var bubbleLayer;
try {
  bubbleLayer = doc.layers.getByName("Bubbles");
} catch (e) {
  bubbleLayer = doc.layers.add();
  bubbleLayer.name = "Bubbles";
}

var dialogueLayer;
try {
  dialogueLayer = doc.layers.getByName("Dialogue");
} catch (e) {
  dialogueLayer = doc.layers.add();
  dialogueLayer.name = "Dialogue";
}

// --- Resolve font (fall back gracefully if ComicGeek isn't installed) ---
var myFont;
try {
  myFont = app.textFonts.getByName(FONT_NAME);
} catch (e) {
  try {
    myFont = app.textFonts.getByName("ArialMT");
  } catch (e2) {
    myFont = app.textFonts[0]; // absolute fallback: whatever is first
    alert("Font \"" + FONT_NAME + "\" not found. Using \"" + myFont.name + "\" instead.\n" +
          "Install ComicGeek from blambot.com for the intended look.");
  }
}

// --- Prompt for page number ---
var pageRequest = prompt("What page would you like?", "1");
if (pageRequest === null || pageRequest === "") {
  // User cancelled — exit silently
  //@ts-ignore
  exit();
}
var pageNumber    = parseInt(pageRequest, 10);
if (isNaN(pageNumber) || pageNumber < 1) {
  alert("Please enter a valid page number (1 or greater).");
  //@ts-ignore
  exit();
}
var pageNumberEnd = pageNumber + 1;

// --- Build path to script.txt ---
// Strip the lettering folder suffix to get the project root.
// Using lastIndexOf avoids issues if the folder name appears more than once in the path.
var docFolderStr = File(doc.path).toString();
var letteringIdx = docFolderStr.lastIndexOf(LETTERING_FOLDER);
var projectRoot;
if (letteringIdx !== -1) {
  projectRoot = docFolderStr.substring(0, letteringIdx);
} else {
  // Fallback: go one level up from the doc folder
  projectRoot = docFolderStr + "/";
}

var scriptDocPath = projectRoot + SCRIPT_FOLDER + "/script.txt";
var scriptFile    = new File(scriptDocPath);

if (!scriptFile.exists) {
  alert("Could not find script file at:\n" + scriptDocPath +
        "\n\nMake sure your project uses the standard folder layout:\n" +
        "  <project>/00-assets/script.txt");
  //@ts-ignore
  exit();
}

// --- Read the file ---
scriptFile.open("r");
var txtFile = scriptFile.read();
scriptFile.close();

// --- Slice out the target page section ---
// Use line-anchored regex to avoid "Page 2" matching "Page 20".
function findPageMarker(text, n, fromIndex) {
  var re    = new RegExp("(^|\\r?\\n)Page " + n + "(\\r?\\n|$)");
  var slice = text.slice(fromIndex || 0);
  var m     = re.exec(slice);
  if (m === null) { return -1; }
  // Return position adjusted for the leading newline captured in group 1
  return (fromIndex || 0) + m.index + m[1].length;
}

var topOfPage    = findPageMarker(txtFile, pageNumber, 0);
var bottomOfPage = findPageMarker(txtFile, pageNumberEnd, topOfPage === -1 ? 0 : topOfPage + ("Page " + pageNumber).length);

if (topOfPage === -1) {
  alert("Could not find \"Page " + pageNumber + "\" in the script file.\n" +
        "Check that the page marker matches the format: \"Page 1\", \"Page 2\", etc.");
  //@ts-ignore
  exit();
}

// If there's no next-page marker, take everything to the end of the file
if (bottomOfPage === -1) {
  bottomOfPage = txtFile.length;
}

var scriptPage = txtFile.slice(topOfPage, bottomOfPage);

// --- Parse lines and create text frames ---
var textArray  = [];
var allBreaks  = scriptPage.match(/\n/g);

if (!allBreaks || allBreaks.length === 0) {
  alert("No lines found on page " + pageNumber + ".");
  //@ts-ignore
  exit();
}

var startLine = 0;
var endLine   = scriptPage.indexOf("\n");

for (var i = 0; i < allBreaks.length; i++) {
  var newDialogue = scriptPage.slice(startLine, endLine);
  var colonPos    = newDialogue.search(":");

  if (colonPos !== -1) {
    // Strip the "CHARACTER:" prefix, keep only the dialogue text
    newDialogue = newDialogue.slice(colonPos + 1).replace(/^\s+/, "");
    if (newDialogue.length > 0) {
      textArray.push(newDialogue);
      addDialogue(newDialogue, textArray.length - 1);
    }
  }

  startLine = endLine + 1;
  endLine   = scriptPage.indexOf("\n", startLine);
  if (endLine === -1) { endLine = scriptPage.length; }
}

if (textArray.length === 0) {
  alert("No dialogue lines found on page " + pageNumber + ".\n" +
        "Dialogue lines must contain a colon, e.g.:\n  CHARACTER: Hello there.");
}

// -------------------------------------------------------------------------
// addDialogue(text, index)
// Creates an area text frame stacked vertically down the artboard.
// Each frame is 100pt wide x 100pt tall, spaced 50pt apart.
// -------------------------------------------------------------------------
function addDialogue(text, index) {
  // Stack frames in a column starting at the top-left of the artboard.
  // Each frame is offset 50pt downward from the previous one.
  var top  = 50 - (index * 50);
  var left = -150;

  // Create items on the Dialogue layer, not whatever happens to be active
  var previousLayer = doc.activeLayer;
  doc.activeLayer   = dialogueLayer;
  var rectRef     = doc.pathItems.rectangle(top, left, 100, 100);
  var areaTextRef = doc.textFrames.areaText(rectRef);
  doc.activeLayer = previousLayer;

  areaTextRef.contents = text;
  areaTextRef.textRange.size = FONT_SIZE;
  areaTextRef.textRange.characterAttributes.textFont = myFont;
}
