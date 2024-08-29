/*
 **************************************************************************************************
 * Global State
 **************************************************************************************************
 */

const elements = {
  canvas: document.getElementById("canvas"),
  downloadButton: document.getElementById("download-button"),
  resetButton: document.getElementById("clear-button"),
  undoButton: document.getElementById("undo-button"),
  redoButton: document.getElementById("redo-button"),
  clearButton: document.getElementById("clear-button"),
  strokeWidthInput: document.querySelector(".stroke-width input"),
  strokeWidthText: document.getElementById("stroke-width-number"),
};

const CTX = canvas.getContext("2d");

class Line {
  constructor(color, width) {
    logger.debug("creating new line with color and width", color, width);
    this.color = color;
    this.width = width;
    this.path = new Path2D();
  }
}

let GLOBAL_STATE = {
  canvasRect: elements.canvas.getBoundingClientRect(),
  isDrawing: true,
  color: "black",
  lineWidth: 1,
  // For now I'm choosing to implement undo/redo as a stack rather than "history replay" because
  // it leads to some interesting UX choices, but we could also have more of an explicit state
  // machine if we wanted to
  undoList: [],
  lines: [],
};

/*
 **************************************************************************************************
 * Utility functions
 **************************************************************************************************
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
};

const LOG_LEVEL = LOG_LEVELS.INFO;

const logger = {
  debug(...args) {
    LOG_LEVEL <= LOG_LEVELS.DEBUG && console.debug(...args);
  },
  log(...args) {
    LOG_LEVEL <= LOG_LEVELS.INFO && console.info(...args);
  },
  warn(...args) {
    LOG_LEVEL <= LOG_LEVELS.WARN && console.warn(...args);
  },
};

function clearCanvas() {
  CTX.clearRect(0, 0, canvas.width, canvas.height);
}

function getCurrentLine() {
  let currentLine = GLOBAL_STATE.lines[GLOBAL_STATE.lines.length - 1];
  if (!currentLine) {
    throw new Error("there is no current line.  the mousedown handler did not create one properly");
  }

  return currentLine;
}

function setCurrentColor(color) {
  logger.log("setting current color to", color);
  GLOBAL_STATE.color = color;
}

function setLineWidth(lineWidth) {
  logger.log("setting lineWidth to", lineWidth);
  GLOBAL_STATE.lineWidth = lineWidth;
  elements.strokeWidthText.innerText = lineWidth;
  elements.strokeWidthInput.value = lineWidth;
}

function downloadCanvas() {
  const link = document.createElement("a");
  link.download = "filename.png";
  link.href = elements.canvas.toDataURL();
  link.click();
}

function undo() {
  if (!GLOBAL_STATE.lines.length) {
    return;
  }

  const lastLine = GLOBAL_STATE.lines.pop();
  GLOBAL_STATE.undoList.push(lastLine);
  render();
}

function redo() {
  if (!GLOBAL_STATE.undoList.length) {
    return;
  }

  const lastLine = GLOBAL_STATE.undoList.pop();
  GLOBAL_STATE.lines.push(lastLine);
  render();
}

function relativeCoords(event) {
  return [event.x - GLOBAL_STATE.canvasRect.x, event.y - GLOBAL_STATE.canvasRect.y];
}

/*
 **************************************************************************************************
 * Elements listeners setup:
 **************************************************************************************************
 */

// Stroke width
elements.strokeWidthInput.addEventListener("change", (e) => {
  setLineWidth(e.target.value);
});
setLineWidth(GLOBAL_STATE.lineWidth);

// Color buttons:
for (const button of document.querySelectorAll(".colors-button")) {
  button.addEventListener("click", () => {
    // This is kinda hacky, but we just depend on the color name being the second name in the class
    // list
    const color = button.classList[1];
    setCurrentColor(color);

    // Turn off the currently selected color:
    const currentSelected = document.querySelector(".colors-button.selected");
    if (currentSelected) currentSelected.classList.toggle("selected");

    // Set the current button as selected:
    button.classList.toggle("selected");
  });
}

// History buttons:
elements.undoButton.addEventListener("click", undo);
elements.redoButton.addEventListener("click", redo);

// Clear:
elements.clearButton.addEventListener("click", () => {
  clearCanvas();
  GLOBAL_STATE.lines = [];
});

// Download
elements.downloadButton.addEventListener("click", downloadCanvas);

window.addEventListener("resize", () => {
  // if we don't do this, resizing the window will mess up our relativeCoords function:
  canvasRect = canvas.getBoundingClientRect();
});

/*
 **************************************************************************************************
 * Drawing
 **************************************************************************************************
 */

function render() {
  clearCanvas();
  for (const line of GLOBAL_STATE.lines) {
    CTX.lineWidth = line.width;
    CTX.strokeStyle = line.color;
    CTX.stroke(line.path);
  }
}

function onMouseMove(e) {
  if (!GLOBAL_STATE.isDrawing) {
    return;
  }

  getCurrentLine().path.lineTo(...relativeCoords(e));
  render();
}

elements.canvas.addEventListener("mousedown", (e) => {
  logger.debug("received mousedown event", e);
  // when the user presses their mouse button, we should push a new line and start drawing:
  GLOBAL_STATE.lines.push(new Line(GLOBAL_STATE.color, GLOBAL_STATE.lineWidth));
  GLOBAL_STATE.isDrawing = true;
  getCurrentLine().path.moveTo(...relativeCoords(e));
  elements.canvas.addEventListener("mousemove", onMouseMove);
});

elements.canvas.addEventListener("mouseup", (e) => {
  logger.debug("received mouseup event", e);
  // when the user lifts up on their mouse, we should stop drawing, or caring about mose move
  // events:
  GLOBAL_STATE.isDrawing = false;
  elements.canvas.removeEventListener("mousemove", onMouseMove);
});
