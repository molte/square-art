// Number of bits per byte
const BYTE_SIZE = 8;

// An array of booleans
class BitArray {
  // Initialises a new instance of BitArray. If input is a positive number, the
  // BitArray will have this number of elements. If input is a Uint8Array, the
  // underlying ArrayBuffer will be used to store the contents of the BitArray.
  constructor(input) {
    if (typeof input == 'number') {
      this.length = input;
      this.resetBuffer();
    } else if (input.constructor == Uint8Array) {
      this.buffer = input.buffer;
      this.uint8View = input;
      this.bytes = input.length;
    }
  }
  
  // Gets and sets, respectively, the number of bytes in the BitArray. Notice
  // that running
  //   bitArray.bytes = bitArray.bytes;
  // may actually change the length of the array.
  get bytes() {
    return Math.ceil(this.length / BYTE_SIZE);
  }
  set bytes(n) {
    this.length = BYTE_SIZE * n;
  }
  
  // Creates a new ArrayBuffer (populated with zeros) to store the contents of
  // the BitArray.
  resetBuffer() {
    this.setBuffer(new ArrayBuffer(this.bytes));
  }
  
  // Instructs the BitArrayt to use the given ArrayBuffer to store its contents.
  setBuffer(buffer) {
    this.buffer = buffer;
    this.uint8View = new Uint8Array(this.buffer);
  }
  
  // Returns the value of the BitArray at the given index. The return value is a
  // boolean.
  get(bitIndex) {
    var byteIndex = Math.floor(bitIndex / BYTE_SIZE);
    var byte = this.uint8View[byteIndex];
    return (byte >> bitIndex - byteIndex * BYTE_SIZE & 1) > 0;
  }
  
  // Toggles the state of the value at the given index between true and false.
  toggle(bitIndex) {
    var byteIndex = Math.floor(bitIndex / BYTE_SIZE);
    var comp = 1 << (bitIndex - byteIndex * BYTE_SIZE);
    this.uint8View[byteIndex] ^= comp;
  }
  
  // Returns a new BitArray with the same data, but compressed with the DEFLATE
  // algorithm.
  compressed() {
    return new BitArray(pako.deflateRaw(this.uint8View));
  }
  
  // Assuming the current BitArray has been compressed with the 'compressed'
  // method, returns a new BitArray with the uncompressed data.
  uncompressed() {
    return new BitArray(pako.inflateRaw(this.uint8View));
  }
  
  // Returns a base64 string representation of the BitArray data.
  toBase64() {
    return btoa(this.uint8View.reduce((data, byte) => data + String.fromCharCode(byte), ''));
  }
  
  // Returns the base64 string representation of the compressed BitArray.
  toCompressedBase64() {
    return this.compressed().toBase64();
  }
  
  // Initialises a new BitArray whose data is representable as the given
  // base64-encoded string.
  static fromBase64(base64) {
    var binary = atob(base64);
    var ba = new BitArray(BYTE_SIZE * binary.length);
    for (var k = 0; k < binary.length; k++) {
      ba.uint8View[k] = binary.charCodeAt(k);
    }
    return ba;
  }
  
  // Initialises a new BitArray whose data -- in compressed form -- is
  // representable as the given base64-encoded string.
  static fromCompressedBase64(base64) {
    return BitArray.fromBase64(base64).uncompressed();
  }
}

// Define shortcuts for DOM elements
var cursorPosContainerElement = document.getElementById('cursor-pos');
var cursorPosXElement = document.getElementById('cursor-pos-x');
var cursorPosYElement = document.getElementById('cursor-pos-y');
var canvasElement = document.getElementById('drawing-board');

// Drawing context for the canvas
var context = canvasElement.getContext('2d');

// Position coordinates of the canvas element on the webpage
var canvasPosition = [canvasElement.offsetLeft, canvasElement.offsetTop];

// Number of rows and columns of squares
var size = 32;

// Pixels per square
var padding = canvasElement.width / size;

// Storage container for the pattern drawn on the canvas
var patttern;

// Draws a grid of helper lines separating the squares
function drawGrid() {
  context.beginPath();
  context.strokeStyle = '#999';
  
  for (var i = 0; i <= size; i++) {
    context.moveTo(i * padding, 0);
    context.lineTo(i * padding, size * padding);
    
    context.moveTo(0, i * padding);
    context.lineTo(size * padding, i * padding);
  }
  
  context.stroke();
}

// Fills the square in column x and row y with colour.
function fillSquare(x, y) {
  context.beginPath();
  context.fillStyle = '#333';
  context.fillRect(x * padding, y * padding, padding, padding);
}

// Switches the state of the boolean representing the square in column x and row
// y. The method does not update the canvas to reflect this change.
function toggleSquare(x, y) {
  var i = x + y * size;
  pattern.toggle(i);
}

// Clears the canvas and draws the pattern and helper grid anew.
function redrawCanvas() {
  context.clearRect(0, 0, size * padding, size * padding);
  
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      if (pattern.get(x + y * size)) {
        fillSquare(x, y);
      }
    }
  }
  
  drawGrid();
}

// Reads the URL hash and updates the drawing pattern if the hash contains an
// encoded pattern.
function updatePatternFromHash() {
  var hash = window.location.hash;    
  if (hash && hash.length > 1) {
    pattern = BitArray.fromCompressedBase64(hash.slice(1));
  } else {
    pattern = new BitArray(size * size);
  }
}

// Returns the position of the cursor in units of squares at the time the given
// event was fired.
function computeCursorPosition(event) {
  var x = Math.floor((event.pageX - canvasPosition[0]) / padding);
  var y = Math.floor((event.pageY - canvasPosition[1]) / padding);
  return [x, y];
}

// Toggle the filling of the square the user clicks
canvasElement.addEventListener('click', function(event) {
  var x, y;
  [x, y] = computeCursorPosition(event);
  
  toggleSquare(x, y);
  redrawCanvas();
  
  // Remember the previous pattern if the user clicks the browser back button
  window.history.pushState(pattern.buffer, '', '#' + pattern.toCompressedBase64());
  
  event.preventDefault();
});

// Update the cursor position indicator when the cursor moves inside the canvas
canvasElement.addEventListener('mousemove', function(event) {
  var x, y;
  [x, y] = computeCursorPosition(event);
  
  cursorPosXElement.innerText = x;
  cursorPosYElement.innerText = y;
});

// Only show the cursor position when hovering over the canvas
canvasElement.addEventListener('mouseenter', function(event) {
  cursorPosContainerElement.className = '';
});
canvasElement.addEventListener('mouseleave', function(event) {
  cursorPosContainerElement.className = 'hidden';
});

// Clear canvas when asked
document.getElementById('reset-canvas').addEventListener('click', function(event) {
  pattern.resetBuffer();
  redrawCanvas();
  window.history.pushState(null, '', '#');
});

// Monitor when user clicks the brower back button (or similar)
window.addEventListener('popstate', function(event) {
  // If a pattern state is saved, use this; otherwise read off the pattern (if
  // it is there) from the URL hash
  if (event.state) {
    pattern.setBuffer(event.state);
  } else {
    updatePatternFromHash();
  }
  redrawCanvas();
});

// Read pattern from URL hash and prepare canvas on pageload
updatePatternFromHash();
redrawCanvas();
