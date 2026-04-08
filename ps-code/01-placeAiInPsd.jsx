#target photoshop

// 01-placeAiInPsd.jsx
// Places the matching Illustrator lettering file into the active Photoshop document
// as an embedded Smart Object. The AI file is resolved by replacing the "01-PSD"
// folder segment with "02-Lettering" and using the same base filename.
//
// Example:
//   Open file:  /project/01-PSD/05.psd
//   Looks for:  /project/02-Lettering/05.ai
//
// Requirements: The project must follow the standard folder layout described in README.md.

var PSD_FOLDER       = "01-PSD";
var LETTERING_FOLDER = "02-Lettering";

if (app.documents.length === 0) {
  alert("No document is open.");
  //@ts-ignore
  exit();
}

var pageName     = app.activeDocument.name;
var nameShorten  = pageName.replace(".psd", "");

var docFolder    = new File(app.activeDocument.path);
var docFolderStr = docFolder.toString();

// Strip the PSD folder suffix to get the project root
var psdIdx = docFolderStr.lastIndexOf(PSD_FOLDER);
var projectRoot;
if (psdIdx !== -1) {
  projectRoot = docFolderStr.substring(0, psdIdx);
} else {
  projectRoot = docFolderStr + "/";
}

var aiDocPath = projectRoot + LETTERING_FOLDER + "/" + nameShorten + ".ai";
var aiDoc     = new File(aiDocPath);

if (!aiDoc.exists) {
  alert("Could not find the Illustrator file at:\n" + aiDocPath +
        "\n\nMake sure the file exists and that your project uses the standard layout:\n" +
        "  <project>/02-Lettering/<pagename>.ai");
  //@ts-ignore
  exit();
}

placeFile(aiDoc);

// -------------------------------------------------------------------------
// placeFile(file)
// Places a file as an embedded Smart Object using ActionDescriptor.
// Note: cTID('Plc ') — the trailing space is intentional; it is part of
// the 4-character event code for the "Place" action.
// Reference: https://community.adobe.com/t5/photoshop/id/td-p/429707
// -------------------------------------------------------------------------
function placeFile(file) {
  function cTID(s) { return app.charIDToTypeID(s); }
  function sTID(s) { return app.stringIDToTypeID(s); }

  var desc = new ActionDescriptor();
  desc.putPath(cTID('null'), new File(file));
  desc.putEnumerated(cTID('FTcs'), cTID('QCSt'), cTID('Qcsa'));

  var offsetDesc = new ActionDescriptor();
  offsetDesc.putUnitDouble(cTID('Hrzn'), cTID('#Pxl'), 0.0);
  offsetDesc.putUnitDouble(cTID('Vrtc'), cTID('#Pxl'), 0.0);
  desc.putObject(cTID('Ofst'), cTID('Ofst'), offsetDesc);

  desc.putBoolean(cTID('AntA'), true);

  // 'Plc ' — Place file as Smart Object (trailing space is part of the event ID)
  executeAction(cTID('Plc '), desc, DialogModes.NO);
}
