#target illustrator

// word_bubble.jsx
// Creates a word balloon from a selected TextFrame + a selected PathItem (line).
// The line defines the tail direction and endpoint. The text frame defines balloon size.
//
// Usage: Select both a text frame and a single-line path, then run this script.
// Requirements: No external action set required.

(function () {

  var myBlack = new GrayColor();
  myBlack.gray = 100;

  var myWhite = new GrayColor();
  myWhite.gray = 0;

  var newEllipse;
  var linez;

  if (app.documents.length === 0) {
    alert("No document is open.");
    return;
  }

  var doc = app.activeDocument;
  var selectedItems = doc.selection;

  if (!selectedItems || selectedItems.length === 0) {
    alert("Nothing selected.\nSelect a text frame AND a line, then run the script.");
    return;
  }

  // Separate the two required items from the selection
  var tf = null;
  var linePath = null;

  for (var i = 0; i < selectedItems.length; i++) {
    if (selectedItems[i].typename === "TextFrame") {
      tf = selectedItems[i];
    } else if (selectedItems[i].typename === "PathItem") {
      linePath = selectedItems[i];
    }
  }

  if (!tf) {
    alert("No text frame found in selection.\nSelect a text frame AND a line.");
    return;
  }
  if (!linePath) {
    alert("No line found in selection.\nSelect a text frame AND a line.");
    return;
  }

  // --- Create the balloon ellipse around the text frame ---
  newEllipse = doc.activeLayer.pathItems.ellipse(
    tf.position[1] + 10,   // top
    tf.position[0] - 10,   // left
    tf.width + 20,         // width (10px padding each side)
    tf.height + 20,        // height
    false,
    true
  );
  newEllipse.stroked = true;
  newEllipse.strokeColor = myBlack;
  newEllipse.fillColor = myWhite;

  // --- Determine tail direction from the line endpoints ---
  var pointBegin = linePath.pathPoints[0].anchor;
  var pointEnd   = linePath.pathPoints[1].anchor;

  // Anchor points for each tail direction. The tail narrows to a point at pointEnd
  // and widens at the balloon edge (pointBegin side).
  var upperLeft = {
    anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2],
      [pointBegin[0], pointBegin[1]],
      [pointEnd[0] - 2, pointEnd[1] - 2]
    ]
  };

  var upperRight = {
    anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2],
      [pointBegin[0], pointBegin[1]],
      [pointEnd[0] + 2, pointEnd[1] - 2]
    ]
  };

  // Note: lowerLeft and lowerRight are mirrors of upperRight/upperLeft respectively,
  // but the tailVal sign is flipped (-50) so the curve bows the other way.
  var lowerLeft = {
    anchors: [
      [pointEnd[0] - 2, pointEnd[1] + 2],
      [pointBegin[0], pointBegin[1]],
      [pointEnd[0] + 2, pointEnd[1] - 2]
    ]
  };

  var lowerRight = {
    anchors: [
      [pointEnd[0] + 2, pointEnd[1] + 2],
      [pointBegin[0], pointBegin[1]],
      [pointEnd[0] - 2, pointEnd[1] - 2]
    ]
  };

  // Directional logic: compare endpoint coordinates to determine quadrant
  if (pointEnd[0] > pointBegin[0] && pointEnd[1] < pointBegin[1]) {
    balloonWithTail(upperLeft, 50);
  } else if (pointEnd[0] < pointBegin[0] && pointEnd[1] < pointBegin[1]) {
    balloonWithTail(upperRight, 50);
  } else if (pointEnd[0] > pointBegin[0] && pointEnd[1] > pointBegin[1]) {
    balloonWithTail(lowerLeft, -50);
  } else if (pointEnd[0] < pointBegin[0] && pointEnd[1] > pointBegin[1]) {
    balloonWithTail(lowerRight, -50);
  } else {
    alert("The line appears to be perfectly straight (horizontal or vertical).\nTry a diagonal line instead.");
    return;
  }

  // Select both the ellipse and the tail, then make a compound shape
  newEllipse.selected = true;
  linez.selected = true;

  try {
    // makeCompoundShape merges the ellipse and tail into a single editable compound shape.
    // This no longer requires an external "ComicActions" action set.
    app.executeMenuCommand("makeCompoundShape");
  } catch (e) {
    alert("Could not create compound shape automatically.\n" +
          "Tip: Select the ellipse and tail manually, then use Object > Compound Path > Make.");
  }


  // -------------------------------------------------------------------------
  // balloonWithTail(anchorVals, tailVal)
  //   anchorVals - object with .anchors array of 3 [x,y] points
  //   tailVal    - bezier handle offset; positive curves up, negative curves down
  // -------------------------------------------------------------------------
  function balloonWithTail(anchorVals, tailVal) {
    linez = doc.pathItems.add();
    linez.stroked = true;

    for (var j = 0; j < anchorVals.anchors.length; j++) {
      var handle = linez.pathPoints.add();
      handle.anchor = anchorVals.anchors[j];

      if (j === 0 || j === 2) {
        // Tip and base edge points — smooth curve handles offset vertically
        var pt = anchorVals.anchors[j];
        handle.rightDirection = [pt[0], pt[1] + tailVal];
        handle.leftDirection  = [pt[0], pt[1] + tailVal];
        handle.pointType = PointType.SMOOTH;
      } else {
        // Middle point (the tip of the tail) — corner point, no curvature
        handle.rightDirection = anchorVals.anchors[j];
        handle.leftDirection  = anchorVals.anchors[j];
        handle.pointType = PointType.CORNER;
      }
    }
  }

}());
