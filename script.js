// 16x16:AABEEYIgMAaICCgKQiEUFEIhKAqICDAGgiBEEQAAAAA=

const BYTE_SIZE = 8;

class BitArray {
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
  
  get bytes() {
    return Math.ceil(this.length / BYTE_SIZE);
  }
  set bytes(n) {
    this.length = BYTE_SIZE * n;
  }
  
  resetBuffer() {
    this.setBuffer(new ArrayBuffer(this.bytes));
  }
  
  setBuffer(buffer) {
    this.buffer = buffer;
    this.uint8View = new Uint8Array(this.buffer);
  }
  
  get(bitIndex) {
    var byteIndex = Math.floor(bitIndex / BYTE_SIZE);
    var byte = this.uint8View[byteIndex];
    return (byte >> bitIndex - byteIndex * BYTE_SIZE & 1) > 0;
  }
  
  toggle(bitIndex) {
    var byteIndex = Math.floor(bitIndex / BYTE_SIZE);
    var comp = 1 << (bitIndex - byteIndex * BYTE_SIZE);
    this.uint8View[byteIndex] ^= comp;
  }
  
  compressed() {
    return new BitArray(pako.deflateRaw(this.uint8View));
  }
  
  uncompressed() {
    return new BitArray(pako.inflateRaw(this.uint8View));
  }
  
  toBase64() {
    return btoa(this.uint8View.reduce((data, byte) => data + String.fromCharCode(byte), ''));
  }
  
  toCompressedBase64() {
    return this.compressed().toBase64();
  }
  
  static fromBase64(base64) {
    var binary = atob(base64);
    var ba = new BitArray(BYTE_SIZE * binary.length);
    for (var k = 0; k < binary.length; k++) {
      ba.uint8View[k] = binary.charCodeAt(k);
    }
    return ba;
  }
  
  static fromCompressedBase64(base64) {
    return BitArray.fromBase64(base64).uncompressed();
  }
}

// function uint8ToBase64(uint8Array) {
//   return btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), ''));
// }

// function base64ToUint8(base64) {
//   var binary = atob(base64);
//   var uint8Array = new Uint8Array(binary.length);
//   for (var k = 0; k < binary.length; k++) {
//     uint8Array[k] = binary.charCodeAt(k);
//   }
//   return uint8Array;
// }

var cursorPosContainerElement = document.getElementById('cursor-pos');
var cursorPosXElement = document.getElementById('cursor-pos-x');
var cursorPosYElement = document.getElementById('cursor-pos-y');

var canvasElement = document.getElementById("drawing-board");
var context = canvasElement.getContext('2d');

var canvasPosition = [canvasElement.offsetLeft, canvasElement.offsetTop];

var size = 32; // number of boxes
var padding = canvasElement.width / size; // pixels per box
var patttern;

// var pattern = new Array(size * size); // memory
// for (var k = 0; k < pattern.length; k++) {
//   pattern[k] = false;
// }

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

function fillSquare(x, y) {
  context.beginPath();
  context.fillStyle = '#333';
  context.fillRect(x * padding, y * padding, padding, padding);
}

// function clearSquare(x, y) {
//   context.clearRect(x * padding, y * padding, padding, padding);
// }

function drawSquare(x, y, fill) {
  context.beginPath();
  context.fillStyle = fill ? '#333' : 'white';
  context.fillRect(x * padding, y * padding, padding, padding);
  
  // context.beginPath();
  // context.lineJoin = 'miter';
  // context.lineCap = 'square';
  // context.moveTo(x * padding, y * padding);
  // context.lineTo((x + 1) * padding, y * padding);
  // context.lineTo((x + 1) * padding, (y + 1) * padding);
  // context.lineTo(x * padding, (y + 1) * padding);
  // context.closePath();
  // context.stroke();
  
  // if (fill) {
  //   drawSquare(x, y);
  // } else {
  //   clearSquare(x, y);
  // }
}

function toggleSquare(x, y) {
  var i = x + y * size;
  // var z = !pattern[i];
  // // drawSquare(x, y, z);
  // pattern[i] = z;
  pattern.toggle(i);
}

function redrawCanvas() {
  context.clearRect(0, 0, size * padding, size * padding);
  
  for (var x = 0; x < size; x++) {
    for (var y = 0; y < size; y++) {
      // drawSquare(x, y, pattern[x + y * size]);
      // drawSquare(x, y, pattern.get(x + y * size));
      if (pattern.get(x + y * size)) {
        fillSquare(x, y);
      }
    }
  }
  
  drawGrid();
}

function getHexPattern() {
  var chunkSize = 5;
  var hex = '';
  
  var n, k, l, i;
  for (k = 0; k < pattern.length / chunkSize; k++) {
    n = 0;
    
    for (l = 0; l < chunkSize; l++) {
      i = k * chunkSize + l;
      if (i >= pattern.length) break;
      
      // if (pattern[i]) {
      if (pattern.get(i)) {
        n |= (1 << l);
      }
    }
    
    hex = n.toString(Math.pow(2, chunkSize)) + hex;
  }
  
  return hex;
}

function updatePatternFromHash() {
  var hash = window.location.hash;    
  if (hash && hash.length > 1) {
    pattern = BitArray.fromCompressedBase64(hash.slice(1));
  } else {
    pattern = new BitArray(size * size);
  }
}

function computeCursorPosition(event) {
  var x = Math.floor((event.pageX - canvasPosition[0]) / padding);
  var y = Math.floor((event.pageY - canvasPosition[1]) / padding);
  return [x, y];
}

canvasElement.addEventListener('click', function(event) {
  var x, y;
  [x, y] = computeCursorPosition(event);
  
  toggleSquare(x, y);
  redrawCanvas();
  window.history.pushState(pattern.buffer, '', '#' + pattern.toCompressedBase64());
  
  event.preventDefault();
});

canvasElement.addEventListener('mousemove', function(event) {
  var x, y;
  [x, y] = computeCursorPosition(event);
  
  cursorPosXElement.innerText = x;
  cursorPosYElement.innerText = y;
});

canvasElement.addEventListener('mouseenter', function(event) {
  cursorPosContainerElement.className = '';
});

canvasElement.addEventListener('mouseleave', function(event) {
  cursorPosContainerElement.className = 'hidden';
});

document.getElementById('reset-canvas').addEventListener('click', function(event) {
  pattern.resetBuffer();
  redrawCanvas();
  window.history.pushState(null, '', '#');
});

window.addEventListener('popstate', function(event) {
  if (event.state) {
    pattern.setBuffer(event.state);
  } else {
    updatePatternFromHash();
  }
  redrawCanvas();
});

updatePatternFromHash();
redrawCanvas();

