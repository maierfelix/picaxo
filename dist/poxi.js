(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

/**
 * @param {Class} cls
 * @param {Array} prot
 */
function inherit(cls, prot) {
  var key = null;
  for (key in prot) {
    if (prot[key] instanceof Function) {
      cls.prototype[key] = prot[key];
    }
  }
}

/**
 * Returns a unique integer
 * @return {Number}
 */
var uidx = 0;
function uid() {
  return (uidx++);
}

/**
 * String to hashcode like on our island java
 * @param {String} str
 * @return {Number}
 */
function hashFromString(str) {
  var hash = 0;
  var length = str.length;
  for (var ii = 0; ii < length; ++ii) {
    var ch = str.charCodeAt(ii);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return (hash);
}

/**
 * @param {Number} width
 * @param {Number} height
 * @return {CanvasRenderingContext2D}
 */
function createCanvasBuffer(width, height) {
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  applyImageSmoothing(ctx, false);
  return (ctx);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Boolean} state
 */
function applyImageSmoothing(ctx, state) {
  ctx.imageSmoothingEnabled = state;
  ctx.oImageSmoothingEnabled = state;
  ctx.msImageSmoothingEnabled = state;
  ctx.webkitImageSmoothingEnabled = state;
}

/**
 * @param {String} path
 * @param {Function} resolve
 */
function loadImage(path, resolve) {
  var img = new Image();
  img.addEventListener("load", function () {
    resolve(img);
  });
  img.addEventListener("error", function () {
    throw new Error("Failed to load image ressource " + path);
  });
  img.src = path;
}

/**
 * @param {String} path
 * @param {Function} resolve
 */
function loadImageAsCanvas(path, resolve) {
  loadImage(path, function (img) {
    var width = img.width;
    var height = img.height;
    var buffer = createCanvasBuffer(width, height);
    buffer.drawImage(
      img,
      0, 0,
      width, height,
      0, 0,
      width, height
    );
    var view = buffer.canvas;
    resolve(view);
  });
}

/**
 * 0-255 => 0-1 with precision 1
 * @param {Number} a
 * @return {Number}
 */
function alphaByteToRgbAlpha(a) {
  return (Math.round((a * MAGIC_RGB_A_BYTE) * 10) / 10);
}

/**
 * Derivative of alphaByteToRgbAlpha
 * @param {Number} a
 * @return {Number}
 */


/**
 * @param {Array} color
 * @return {String}
 */
function colorToRgbaString(color) {
  var r = color[0];
  var g = color[1];
  var b = color[2];
  var a = color[3];
  return (("rgba(" + r + "," + g + "," + b + "," + a + ")"));
}

/**
 * @param {String} hex
 * @return {Array}
 */
function hexToRgba(hex) {
  var r = parseInt(hex.substring(1,3), 16);
  var g = parseInt(hex.substring(3,5), 16);
  var b = parseInt(hex.substring(5,7), 16);
  return ([r,g,b,1]);
}

/**
 * @param {Array} rgba
 * @return {Number}
 */
function rgbaToHex(rgba) {
  var r = rgba[0].toString(16);
  var g = rgba[1].toString(16);
  var b = rgba[2].toString(16);
  return parseInt(
    (r.length == 1 ? "0"+ r : r) +
    (g.length == 1 ? "0"+ g : g) +
    (b.length == 1 ? "0"+ b : b)
  , 16);
}

/**
 * Do rgba color arrays match
 * @param {Array} a
 * @param {Array} a
 * @return {Boolean}
 */
function colorsMatch(a, b) {
  return (
    a[0] === b[0] &&
    a[1] === b[1] &&
    a[2] === b[2] &&
    a[3] === b[3]
  );
}

/**
 * Checks if a color array is fully transparent
 * @param {Array} color
 * @return {Boolean}
 */
var transparent = [0, 0, 0, 0];
function isGhostColor(color) {
  return (colorsMatch(color, transparent));
}

/**
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 */
function sortAscending(a, b) {
  return (a - b);
}

/**
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 */

var TILE_SIZE = 8;
var MAGIC_SCALE = .125;
var MIN_SCALE = 0.1;
var MAX_SCALE = 32 + MAGIC_SCALE;
// trace ghost tiles by alpha=^2
var UNSET_TILE_COLOR = 2;
var BASE_TILE_COLOR = [0,0,0,0];

// 32-bit ints are allowed at maximum
var MAX_SAFE_INTEGER = (Math.pow( 2, 31 )) - 1;

// alpha byte to rgb-alpha conversion
var MAGIC_RGB_A_BYTE = 0.00392;

// factor when to hide the grid
var HIDE_GRID = 0.0;


// how fast we can scale with our mouse wheel
var ZOOM_SPEED = 15;

/**
 * If a tile batch exceeds the min size,
 * we buffer it inside a shadow canvas,
 * exceeding limit throws an out of bounds error
 */
var BATCH_BUFFER_SIZE = {
  MIN_W: 1,
  MIN_H: 1,
  MIN_L: 1
};

var DRAW_HASH = hashFromString("draw");

// Maximum allowed items inside stack
var STACK_LIMIT = 255;

/**
 * @param {Number} x
 * @return {Number}
 */
function zoomScale(x) {
  return (
    x >= 0 ? x + 1 :
    x < 0 ? x + 1 :
    x + 1
  );
}

/**
 * @param {Number} x
 * @param {Number} t
 * @return {Number}
 */
function roundTo(x, t) {
  var i = 1 / t;
  return (Math.round(x * i) / i);
}

/**
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} w1
 * @param {Number} h1
 * @param {Number} x2
 * @param {Number} y2
 * @param {Number} w2
 * @param {Number} h2
 * @return {Boolean}
 */
function intersectRectangles(x1, y1, w1, h1, x2, y2, w2, h2) {
  var x = Math.max(x1, x2);
  var w = Math.min(x1 + w1, x2 + w2);
  var y = Math.max(y1, y2);
  var h = Math.min(y1 + h1, y2 + h2);
  return (w >= x && h >= y);
}

/**
 * @class Camera
 */
var Camera = function Camera(instance) {
  this.x = 0;
  this.y = 0;
  this.s = MIN_SCALE + 6;
  this.dx = 0;
  this.dy = 0;
  this.lx = 0;
  this.ly = 0;
  this.width = 0;
  this.height = 0;
  this.instance = instance;
};

/**
 * @param {Number} dir
 */
Camera.prototype.scale = function scale (dir) {
  var x = (dir * (ZOOM_SPEED / 1e2)) * zoomScale(this.s);
  var oscale = this.s;
  if (this.s + x <= MIN_SCALE) { this.s = MIN_SCALE; }
  else if (this.s + x >= MAX_SCALE) { this.s = MAX_SCALE; }
  else { this.s += x; }
  this.s = roundTo(this.s, MAGIC_SCALE);
  this.x -= (this.lx) * (zoomScale(this.s) - zoomScale(oscale));
  this.y -= (this.ly) * (zoomScale(this.s) - zoomScale(oscale));
  this.instance.redraw();
};

/**
 * @param {Number} x
 * @param {Number} y
 */
Camera.prototype.click = function click (x, y) {
  var position = this.getRelativeOffset(x, y);
  this.dx = x;
  this.dy = y;
  this.lx = position.x;
  this.ly = position.y;
};

/**
 * @param {Number} x
 * @param {Number} y
 */
Camera.prototype.drag = function drag (x, y) {
  this.x += x - this.dx;
  this.y += y - this.dy;
  this.dx = x;
  this.dy = y;
  this.instance.redraw();
};

/**
 * @param {Number} x
 * @param {Number} y
 */
Camera.prototype.getRelativeOffset = function getRelativeOffset (x, y) {
  var xx = (x - this.x) / this.s;
  var yy = (y - this.y) / this.s;
  return ({
    x: xx,
    y: yy
  });
};

/**
 * @param {Number} width
 * @param {Number} height
 */
Camera.prototype.resize = function resize (width, height) {
  this.width = width;
  this.height = height;
};

/**
 * Fill enclosed tile area
 * @param {Number} x
 * @param {Number} y
 * @param {Array} color
 */
function fillBucket(x, y, color) {
  // TODO: add method to create temporary batches (e.g. insertRectangle by mouse)
  color = color || [255, 255, 255, 1];
  if (color[3] > 1) { throw new Error("Invalid alpha color!"); }
  // differentiate between empty and colored tiles
  var base = this.getStackRelativeTileColorAt(x, y) || BASE_TILE_COLOR;
  // clicked tile color and fill colors matches, abort
  if (colorsMatch(base, color)) { return; }
  // clear undone batches, since we dont need them anymore
  this.refreshStack();
  // we now need the most recent boundings
  this.updateGlobalBoundings();
  // save the current stack index
  var sindex = this.sindex;
  this.pushTileBatchOperation();
  var batch = this.getLatestTileBatchOperation();
  // flood fill
  var result = this.binaryFloodFill(x, y, base, color);
  // convert buffer into batched raw buffer
  batch.createRawBufferAt(result.buffer, result.x, result.y);
  // after filling, finally update the boundings to get the batch's size
  batch.updateBoundings();
  // make sure we only create a raw buffer if we got tiles to draw onto
  if (batch.tiles.length) { this.batchTilesToRawBuffer(batch, color); }
  // finalizing a batch also deletes the batch if we didn't change anything
  this.finalizeBatchOperation();
  // infinity got detected, but some batches could be drawn before, so clear them first
  return;
}

/**
 * Uses preallocated binary grid with the size of the absolute boundings
 * of our working area. In the next step we trace "alive" cells at the grid,
 * then we take the boundings of the used/filled area of our grid and crop out
 * the relevant part. Then we convert the filled grid area into a raw buffer
 * TODO: Fails with negative coordinates and infinity
 * @param {Number} x
 * @param {Number} y
 * @param {Array} base
 * @param {Array} color
 * @return {Object}
 */
function binaryFloodFill(x, y, base, color) {
  var this$1 = this;

  var bounds = this.boundings;
  var bx = bounds.x;
  var by = bounds.y;
  var gw = bounds.w;
  var gh = bounds.h;
  var isEmpty = base[3] === 0;
  var gridl = gw * gh;

  // allocate and do a basic fill onto the grid
  var grid = new Uint8ClampedArray(gw * gh);
  for (var ii = 0; ii < gridl; ++ii) {
    var xx = ii % gw;
    var yy = (ii / gw) | 0;
    var color$1 = this$1.getTileColorAt(bx + xx, by + yy);
    if (isEmpty) {
      if (color$1 !== null) { continue; }
    } else {
      if (color$1 === null) { continue; }
      if (!(base[0] === color$1[0] && base[1] === color$1[1] && base[2] === color$1[2])) { continue; }
    }
    // fill tiles with 1's if we got a color match
    grid[yy * gw + xx] = 1;
  }

  // trace connected tiles by [x,y]=2
  var queue = [{x: x, y: y}];
  while (queue.length > 0) {
    var point = queue.pop();
    var x$1 = point.x;
    var y$1 = point.y;
    var idx = y$1 * gw + x$1;
    // detected infinite filling, skip and return true=^infinite
    //if (!this.pointInsideAbsoluteBoundings(x, y)) return (true);
    // set this grid tile to 2, if it got traced earlier as a color match
    if (grid[idx] === 1) { grid[idx] = 2; }
    var nn = (y$1-1) * gw + x$1;
    var ee = y$1 * gw + (x$1+1);
    var ss = (y$1+1) * gw + x$1;
    var ww$1 = y$1 * gw + (x$1-1);
    if (nn < gridl && grid[nn] === 1) { queue.push({x: x$1, y:y$1-1}); }
    if (ee < gridl && grid[ee] === 1) { queue.push({x:x$1+1, y: y$1}); }
    if (ss < gridl && grid[ss] === 1) { queue.push({x: x$1, y:y$1+1}); }
    if (ww$1 < gridl && grid[ww$1] === 1) { queue.push({x:x$1-1, y: y$1}); }
  }

  // calculate crop factor
  var px = [];
  var py = [];
  for (var ii$1 = 0, length = grid.length; ii$1 < length; ++ii$1) {
    var xx$1 = ii$1 % gw;
    var yy$1 = (ii$1 / gw) | 0;
    if (grid[ii$1] !== 2) { continue; }
    px.push(xx$1);
    py.push(yy$1);
  }
  px.sort(sortAscending);
  py.sort(sortAscending);
  // calculate position
  var sx = px[0] | 0;
  var sy = py[0] | 0;
  // calculate rectangle size
  var ww = ((px[px.length - 1] - sx) | 0) + 1;
  var hh = ((py[py.length - 1] - sy) | 0) + 1;

  // convert cropped area into raw buffer
  var buffer = createCanvasBuffer(ww, hh);
  buffer.fillStyle = colorToRgbaString(color);
  for (var ii$2 = 0; ii$2 < ww * hh; ++ii$2) {
    var xx$2 = ii$2 % ww;
    var yy$2 = (ii$2 / ww) | 0;
    var gx = sx + xx$2;
    var gy = sy + yy$2;
    if (grid[gy * gw + gx] !== 2) { continue; }
    buffer.fillRect(
      xx$2, yy$2, 1, 1
    );
  }

  // finally free things from memory
  grid = null;
  px = null; py = null;

  return ({
    x: sx,
    y: sy,
    width: ww,
    height: hh,
    buffer: buffer
  });
}

/**
 * Sets a batch to background, appends the given bg color
 * and generates a camera width and height based buffered canvas
 * @param {Array} color
 */
function fillBackground(color) {
  var isempty = isGhostColor(color);
  this.pushTileBatchOperation();
  var batch = this.getLatestTileBatchOperation();
  batch.isBackground = true;
  batch.renderBackground(this.camera.width, this.camera.height, color);
  batch.updateBoundings();
  this.finalizeBatchOperation();
}


var _fill = Object.freeze({
	fillBucket: fillBucket,
	binaryFloodFill: binaryFloodFill,
	fillBackground: fillBackground
});

/**
 * @param {Object} op
 */
function enqueue(op) {
  // our stack index is out of position
  // => clean up all more recent batches
  this.refreshStack();
  this.stack.push(op);
  this.redo();
  this.undo();
  this.redo();
  // free the stack if necessary
  if (this.stack.length >= STACK_LIMIT / 4) {
    //throw new Error("Stack overflow!");
  }
}

/**
 * Manually refresh the stack,
 * clear future operations etc.
 */
function refreshStack() {
  if (this.sindex < this.stack.length - 1) {
    this.dequeue(this.sindex, this.stack.length - 1);
  } else {
    this.stack.splice(this.sindex + 1, this.stack.length);
  }
  this.updateGlobalBoundings();
}

/**
 * Dequeue items from stack
 * @param {Number} from
 * @param {Number} to
 */
function dequeue(from, to) {
  var this$1 = this;

  from = from + 1;
  var count = (to - (from - 1));
  var batches = this.batches;
  // free all following (more recent) tile batches
  for (var ii = count; ii > 0; --ii) {
    this$1.batches.splice(from + ii - 1, 1);
    this$1.refreshBatches();
    this$1.stack.splice(from + ii - 1, 1);
  }
}

/**
 * @param {Array} op
 * @param {Boolean} state
 */
function fire(op, state) {
  op.batch.tiles.map(function (tile) {
    var cindex = tile.cindex;
    if (state) {
      // redo
      tile.cindex -= (tile.cindex > 0 ? 1 : 0);
    } else {
      // undo
      tile.cindex += (tile.cindex < tile.colors.length - 1 ? 1 : 0);
    }
  });
}

function currentStackOperation() {
  return (this.stack[this.sindex]);
}

function undo() {
  if (this.sindex >= 0) {
    var op = this.currentStackOperation();
    this.fire(op, false);
    this.sindex--;
  }
}

function redo() {
  if (this.sindex < this.stack.length - 1) {
    this.sindex++;
    var op = this.currentStackOperation();
    this.fire(op, true);
  }
}


var _stack = Object.freeze({
	enqueue: enqueue,
	refreshStack: refreshStack,
	dequeue: dequeue,
	fire: fire,
	currentStackOperation: currentStackOperation,
	undo: undo,
	redo: redo
});

/**
 * @class Tile
 */
var Tile = function Tile() {
  this.x = 0;
  this.y = 0;
  this.id = uid();
  this.cindex = 0;
  this.colors = [BASE_TILE_COLOR];
};
/**
 * @param {Array} color
 * @return {Boolean}
 */
Tile.prototype.colorMatchesWithTile = function colorMatchesWithTile (color) {
  return (
    colorsMatch(this.colors[this.cindex], color)
  );
};
/**
 * @param {Number} cindex
 * @return {String}
 */
Tile.prototype.getColorAsRgbaString = function getColorAsRgbaString (cindex) {
  var c = this.colors[cindex || 0];
  var r = c[0];
  var g = c[1];
  var b = c[2];
  var a = c[3];
  return (
    ("rgba(" + r + "," + g + "," + b + "," + a + ")")
  );
};

/**
 * Set ctrl+a mode=true
 */
function selectAll() {
  this.modes.selectAll = true;
}

/**
 * Save last mouse position globally
 * @param {Number} x
 * @param {Number} y
 */
function hover(x, y) {
  this.mx = x;
  this.my = y;
}

/**
 * Erase a tile by mouse offset
 * @param {Number} x
 * @param {Number} y
 */
function eraseTileAtMouseOffset(x, y) {
  var position = this.getRelativeOffset(x, y);
  this.eraseTileAt(position.x, position.y);
}

/**
 * Erase a tile at given relative position
 * @param {Number} x
 * @param {Number} y
 */
function eraseTileAt(x, y) {
  var tile = this.getStackRelativeTileAt(x, y);
  this.pushTileBatchOperation();
  if (tile !== null) {
    var color = tile.colors.shift();
    this.createBatchTileAt(tile.x, tile.y, [0,0,0,0]);
  }
  this.finalizeBatchOperation();
}

/**
 * @param {Number} x
 * @param {Number} y
 */
function drawTileAtMouseOffset(x, y) {
  if (this.modes.draw) {
    var position = this.getRelativeOffset(x, y);
    this.createBatchTileAt(position.x, position.y, this._fillStyle);
  }
}

/**
 * @param {Number} x
 * @param {Number} y
 * @param {Array} color
 * @return {Tile}
 */
function drawTileAt(x, y, color) {
  this.pushTileBatchOperation();
  this.createBatchTileAt(x|0, y|0, color);
  this.finalizeBatchOperation();
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Object}
 */
function getRelativeOffset$1(x, y) {
  var rpos = this.camera.getRelativeOffset(x, y);
  var tpos = this.getTileOffsetAt(rpos.x, rpos.y);
  return (tpos);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function createTileAtMouseOffset(x, y) {
  var position = this.getRelativeOffset(x, y);
  var tile = this.createTileAt(position.x, position.y);
  return (tile);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function createTileAt(x, y) {
  var tile = new Tile();
  if (!this.offsetExceedsIntegerLimit(x, y)) {
    tile.x = x | 0;
    tile.y = y | 0;
  } else {
    throw new Error("Tile position exceeds 32-bit integer limit!");
  }
  return (tile);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function getTileByMouseOffset(x, y) {
  var position = this.getRelativeOffset(x, y);
  var tile = this.getTileAt(position.x, position.y);
  return (tile);
}

/**
 * Gets non-relative (stack independant) tile by given position
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function getTileAt(x, y) {
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var idx = batches.length - 1 - ii; // reversed
    var batch = batches[idx].tiles;
    for (var jj = 0; jj < batch.length; ++jj) {
      var tile = batch[jj];
      if (tile.x === x && tile.y === y) {
        return (tile);
      }
    }
  }
  return (null);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function getStackRelativeTileByMouseOffset(x, y) {
  var position = this.getRelativeOffset(x, y);
  var tile = this.getStackRelativeTileAt(position.x, position.y);
  return (tile);
}

/**
 * Gets stack relative (absolute) tile by given position
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
function getStackRelativeTileAt(x, y) {
  var sindex = this.sindex;
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var idx = batches.length - 1 - ii; // reversed
    var batch = batches[idx].tiles;
    if (sindex - idx < 0) { continue; }
    for (var jj = 0; jj < batch.length; ++jj) {
      var tile = batch[jj];
      if (tile.x === x && tile.y === y) {
        return (tile);
      }
    }
  }
  return (null);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Object}
 */
function getTileOffsetAt(x, y) {
  var half = TILE_SIZE / 2;
  var xx = roundTo(x - half, TILE_SIZE);
  var yy = roundTo(y - half, TILE_SIZE);
  return ({
    x: xx / TILE_SIZE,
    y: yy / TILE_SIZE
  });
}

/**
 * Get tile by it's id
 * @param {Number} id
 * @return {Tile}
 */
function getTileById(id) {
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var tiles = batches[ii].tiles;
    for (var jj = 0; jj < tiles.length; ++jj) {
      var tile = tiles[jj];
      if (tile.id === id) { return (tile); }
    }
  }
  return (null);
}

/**
 * Returns rnd(0-255) rgba color array with a=1
 * @return {Array}
 */
function getRandomRgbaColors() {
  var cmax = 256;
  var r = (Math.random() * cmax) | 0;
  var g = (Math.random() * cmax) | 0;
  var b = (Math.random() * cmax) | 0;
  return ([r, g, b, 1]);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */
function getTileColorAt(x, y) {
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var idx = batches.length - 1 - ii; // reversed
    var batch = batches[idx];
    var color = batch.getTileColorAt(x, y);
    if (color !== null) { return (color); }
  }
  return (null);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */
function getStackRelativeTileColorAt(x, y) {
  var sindex = this.sindex;
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var idx = batches.length - 1 - ii; // reversed
    var batch = batches[idx];
    if (sindex - idx < 0) { continue; }
    var color = batch.getTileColorAt(x, y);
    if (color !== null) { return (color); }
  }
  return (null);
}

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */
function getStackRelativeTileColorByMouseOffset(x, y) {
  var position = this.getRelativeOffset(x, y);
  return (this.getStackRelativeTileColorAt(position.x, position.y));
}


var _tiles = Object.freeze({
	selectAll: selectAll,
	hover: hover,
	eraseTileAtMouseOffset: eraseTileAtMouseOffset,
	eraseTileAt: eraseTileAt,
	drawTileAtMouseOffset: drawTileAtMouseOffset,
	drawTileAt: drawTileAt,
	getRelativeOffset: getRelativeOffset$1,
	createTileAtMouseOffset: createTileAtMouseOffset,
	createTileAt: createTileAt,
	getTileByMouseOffset: getTileByMouseOffset,
	getTileAt: getTileAt,
	getStackRelativeTileByMouseOffset: getStackRelativeTileByMouseOffset,
	getStackRelativeTileAt: getStackRelativeTileAt,
	getTileOffsetAt: getTileOffsetAt,
	getTileById: getTileById,
	getRandomRgbaColors: getRandomRgbaColors,
	getTileColorAt: getTileColorAt,
	getStackRelativeTileColorAt: getStackRelativeTileColorAt,
	getStackRelativeTileColorByMouseOffset: getStackRelativeTileColorByMouseOffset
});

/**
 * @class Texture
 */
var Texture = function Texture(buffer) {
  var view = buffer.canvas;
  this.view = view;
  this.context = buffer;
  this.texture = new PIXI.Sprite(PIXI.Texture.fromCanvas(view));
  this.data = buffer.getImageData(0, 0, view.width, view.height).data;
};

/**
 * @param {CanvasRenderingContext2D}
 * @param {Number} x
 * @param {Number} y
 */
function createRawBufferAt(ctx, x, y) {
  var view = ctx.canvas;
  this.x = x;
  this.y = y;
  this.width = view.width;
  this.height = view.height;
  this.isBuffered = true;
  this.isRawBuffer = true;
  this.isBackground = false;
  this.buffer = new Texture(ctx);
}

/**
 * Warning: does not update boundings!
 * @param {Number} x
 * @param {Number} y
 * @param {Array} color
 */
function createRawTileAt(x, y, color) {
  var tile = new Tile();
  tile.x = x;
  tile.y = y;
  tile.colors[0] = color;
  // push in without updating boundings each time
  this.tiles.push(tile);
}

/**
 * Access cached imageData
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */
function getRawColorAt(x, y) {
  // normalize our point
  var xx = x - this.x;
  var yy = y - this.y;
  // abort if point isn't inside our buffer boundings
  if (
    (xx < 0 || xx >= this.width) ||
    (yy < 0 || yy >= this.height)
  ) { return (null); }
  // now extract the data
  var data = this.buffer.data;
  // imagedata array is 1d
  var idx = (yy * this.width + xx) * 4;
  // get each color value
  var r = data[idx + 0];
  var g = data[idx + 1];
  var b = data[idx + 2];
  var a = data[idx + 3];
  var color = [r, g, b, alphaByteToRgbAlpha(a)];
  // dont return anything if we got no valid color
  if (a <= 0) { return (null); }
  // finally return the color array
  return (color);
}


var _raw = Object.freeze({
	createRawBufferAt: createRawBufferAt,
	createRawTileAt: createRawTileAt,
	getRawColorAt: getRawColorAt
});

/**
 * Determine if we should buffer the batch or not
 * Buffering a batch takes only in place, when drawImage is likely
 * faster than the (faster for single tiles) fillRect method
 * @return {Boolean}
 */
function exceedsBoundings() {
  if (this.tiles.length >= BATCH_BUFFER_SIZE.MIN_L) { return (true); }
  var size = this.getBoundings();
  return (
    size.w - 1 >= BATCH_BUFFER_SIZE.MIN_W ||
    size.h - 1 >= BATCH_BUFFER_SIZE.MIN_H
  );
}

/**
 * Check if points lies inside the batch
 * @param {Number} x
 * @param {Number} y
 * @return {Boolean}
 */
function pointInsideBoundings(x, y) {
  if (this.isBackground) { return (true); }
  var state = intersectRectangles(
    this.x, this.y, this.width, this.height,
    x, y, 0, 0
  );
  return (state);
}

/**
 * Updates the batch's relative position and size
 * @return {Void}
 */
function updateBoundings() {
  // dont calculate sizes of raw buffers
  if (this.isRawBuffer) { return; }
  // background boundings are infinite
  if (this.isBackground) {
    this.x = this.y = this.width = this.height = Infinity;
    return;
  }
  var info = this.getBoundings();
  this.x = info.x;
  this.y = info.y;
  this.width = info.w;
  this.height = info.h;
  return;
}

/**
 * Calculate cropped size of given batch
 * @return {Object}
 */
function getBoundings() {
  // raw buffers have static bounding
  if (this.isRawBuffer) {
    return ({
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height
    });
  }
  var px = [];
  var py = [];
  var tiles = this.tiles;
  for (var ii = 0; ii < tiles.length; ++ii) {
    var tile = tiles[ii];
    px.push(tile.x);
    py.push(tile.y);
  }
  px.sort(sortAscending);
  py.sort(sortAscending);
  var idx = px.length-1;
  // calculate rectangle position
  var xx = px[0] | 0;
  var yy = py[0] | 0;
  // calculate rectangle size
  var ww = ((px[idx] - px[0]) | 0) + 1;
  var hh = ((py[idx] - py[0]) | 0) + 1;
  return ({
    x: xx,
    y: yy,
    w: ww,
    h: hh
  });
}


var _bounds = Object.freeze({
	exceedsBoundings: exceedsBoundings,
	pointInsideBoundings: pointInsideBoundings,
	updateBoundings: updateBoundings,
	getBoundings: getBoundings
});

/**
 * @class Batch
 */
var Batch = function Batch() {
  this.id = uid();
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.index = 0;
  this.tiles = [];
  // background related, see 'renderBackground'
  this.buffer = null;
  this.bgcolor = null;
  this.bgbuffer = null;
  this.isBuffered = false;
  // This property indicates, if only the canvas buffer is available to us
  // e.g. used for inserted sprite images
  this.isRawBuffer = false;
  // If the batch should appear everywhere on the screen
  this.isBackground = false;
};

/**
 * Batch is completely empty
 * @return {Boolean}
 */
Batch.prototype.isEmpty = function() {
  return (
    !this.isBuffered &&
    !this.isRawBuffer &&
    !this.isBackground &&
    this.tiles.length <= 0
  );
};

/**
 * @param {Tile} tile
 */
Batch.prototype.addTile = function(tile) {
  this.tiles.push(tile);
  this.updateBoundings();
};

/**
 * Get tile at relative position
 * @param {Number} x
 * @param {Number} y
 * @return {Tile}
 */
Batch.prototype.getTileAt = function(x, y) {
  var tiles = this.tiles;
  var length = tiles.length;
  for (var ii = 0; ii < length; ++ii) {
    var tile = tiles[ii];
    if (tile.x === x && tile.y === y) { return (tile); }
  }
  return (null);
};

/**
 * Get tile color from buffered batch
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */
Batch.prototype.getTileColorAt = function(x, y) {
  // nothing buffered and no tiles
  if (this.isEmpty()) { return (null); }
  // use image data for raw buffers
  if (this.isRawBuffer) {
    var color = this.getRawColorAt(x, y);
    if (color !== null) { return (color); }
  }
  // return background color if batch is a filled background
  if (this.isBackground) { return (this.bgcolor); }
  // search tile based
  var tile = this.getTileAt(x, y);
  if (tile !== null) { return (tile.colors[tile.cindex]); }
  return (null);
};

/**
 * Creates a cropped canvas buffer
 */
Batch.prototype.renderBuffer = function() {
  var buffer = createCanvasBuffer(this.width, this.height);
  var bx = this.x | 0;
  var by = this.y | 0;
  var tiles = this.tiles;
  for (var ii = 0; ii < tiles.length; ++ii) {
    var tile = tiles[ii];
    var color = tile.colors[tile.cindex];
    var xx = (tile.x - bx) | 0;
    var yy = (tile.y - by) | 0;
    buffer.fillStyle = tile.getColorAsRgbaString();
    buffer.fillRect(
      xx, yy,
      1|0, 1|0
    );
  }
  this.buffer = new Texture(buffer);
  this.isBuffered = true;
  this.updateBoundings();
};

/**
 * @param {Number} width
 * @param {Number} height
 * @param {Array} color
 */
Batch.prototype.renderBackground = function(width, height, color) {
  var buffer = createCanvasBuffer(width, height);
  var r = color[0];
  var g = color[1];
  var b = color[2];
  var a = color[3];
  buffer.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
  buffer.fillRect(
    0, 0,
    width, height
  );
  this.bgcolor = color;
  this.bgbuffer = buffer.canvas;
};

inherit(Batch, _raw);
inherit(Batch, _bounds);

/**
 * Push in a new batch operation
 */
function pushTileBatchOperation() {
  var batch = new Batch();
  this.batches.push(batch);
}

/**
 * Refreshes all batch indexes
 */
function refreshBatches() {
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii];
    batch.index = ii;
  }
}

/**
 * Take the latest tile batch, buffer it (if exceeds bound sizes)
 * and finally push it into the operation stack
 * @return {Void}
 */
function finalizeBatchOperation() {
  var offset = this.batches.length - 1;
  var batch = this.batches[offset];
  if (batch.exceedsBoundings() && !batch.isRawBuffer) {
    batch.renderBuffer();
  } else {
    // dont push batch into stack if batch is empty
    if (batch.isEmpty() && !batch.isBackground) {
      this.batches.splice(offset, 1);
      this.refreshBatches();
      return;
    }
    // got a background fill batch, check if we have to push it into the stack
    if (batch.isBackground) {
      var last = this.batches[this.batches.length - 2];
      // last operation was a background fill too, check if their colors match
      if (last && last.isBackground) {
        if (colorsMatch(batch.bgcolor, last.bgcolor)) { return; }
      }
    }
  }
  this.enqueue({
    batch: batch
  });
  this.refreshBatches();
  this.refreshStack();
  return;
}

/**
 * @return {Batch}
 */
function getLatestTileBatchOperation() {
  var offset = this.batches.length - 1;
  return (this.batches[offset]);
}

/**
 * Clear latest batch operation if empty
 * @return {Void}
 */
function clearLatestTileBatch() {
  if (!this.batches.length) { return; }
  var batch = this.getLatestTileBatchOperation();
  // latest batch operation is empty, remove so 
  if (!batch.tiles.length) {
    var offset = this.batches.length - 1;
    this.batches.splice(offset, 1);
  }
  return;
}

/**
 * @param {Number} x
 * @param {Number} y
 */
function startBatchedDrawing(x, y) {
  this.modes.draw = true;
  var position = this.getRelativeOffset(x, y);
  this.pushTileBatchOperation();
  this.createBatchTileAt(position.x, position.y, this._fillStyle);
}

/**
 * Finally push the recently created batch into the stack
 * @param {Number} x
 * @param {Number} y
 */
function stopBatchedDrawing(x, y) {
  this.modes.draw = false;
  this.finalizeBatchOperation();
  this.clearLatestTileBatch();
}

/**
 * Main method to insert tiles into the active batch
 * @param {Number} x
 * @param {Number} y
 * @param {Array} color
 * @return {Void}
 */
function createBatchTileAt(x, y, color) {
  // try to overwrite older tiles color
  var otile = this.getTileAt(x, y);
  var batch = this.getLatestTileBatchOperation();
  // only push tile if necessary
  if (otile !== null) {
    if (
      otile.colorMatchesWithTile(color) ||
      otile.colors[otile.cindex][3] === UNSET_TILE_COLOR
    ) { return; }
  }
  var tile = this.createTileAt(x, y);
  tile.colors.unshift(color);
  batch.addTile(tile);
  return;
}

/**
 * Get batch by the given tile
 * @param {Tile} tile
 * @return {Batch}
 */
function getBatchByTile(tile) {
  var id = tile.id;
  var batches = this.batches;
  var x = tile.x;
  var y = tile.y;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii];
    var tiles = batch.tiles;
    for (var jj = 0; jj < tiles.length; ++jj) {
      var tile$1 = tiles[jj];
      if (tile$1.id === id) { return (batch); }
    }
  }
  return null;
}

/**
 * Get batch by the given tile
 * @param {Number} x
 * @param {Number} y
 * @return {Batch}
 */
function getStackRelativeBatchByPoint(x, y) {
  var batches = this.batches;
  var sindex = this.sindex;
  for (var ii = 0; ii < batches.length; ++ii) {
    var idx = batches.length - 1 - ii; // reversed
    if (sindex < idx) { continue; }
    var batch = batches[idx];
    if (batch.isBackground) { return (batch); }
    if (batch.pointInsideBoundings(x, y)) { return (batch); }
  }
  return null;
}

/**
 * Resize all background batches to stay smoothy
 * @param {Number} width
 * @param {Number} height
 */
function resizeBackgroundBatches(width, height) {
  var batches = this.batches;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii];
    if (!batch.isBackground) { continue; }
    batch.renderBackground(width, height, batch.bgcolor);
  }
}

/**
 * Check whether a point lies inside the used editor area
 * @param {Number} x
 * @param {Number} y
 * @return {Boolean}
 */
function pointInsideAbsoluteBoundings(x, y) {
  var bounds = this.boundings;
  var state = intersectRectangles(
    bounds.x, bounds.y, bounds.w, bounds.h,
    x, y, 0, 0
  );
  return (state);
}

/**
 * @param {Array} batches
 * @return {Object}
 */
function getAbsoluteBoundings(batches) {
  var px = []; var py = []; var pw = []; var ph = [];
  var sindex = this.sindex;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii];
    if (sindex < ii) { continue; }
    var info = batch.getBoundings();
    px.push(info.x);
    py.push(info.y);
    pw.push(info.x + info.w);
    ph.push(info.y + info.h);
  }
  px.sort(sortAscending);
  py.sort(sortAscending);
  pw.sort(sortAscending);
  ph.sort(sortAscending);
  // calculate rectangle position
  var xx = px[0]|0;
  var yy = py[0]|0;
  // calculate rectangle size
  var idx = pw.length-1;
  var ww = (-xx + pw[idx]);
  var hh = (-yy + ph[idx]);
  return ({
    x: xx,
    y: yy,
    w: ww,
    h: hh
  });
}

/**
 * Updates the global boundings of our stage, so we
 * always have access to our absolute stage boundings
 */
function updateGlobalBoundings() {
  var info = this.getAbsoluteBoundings(this.batches);
  var bounds = this.boundings;
  if (
    info.x !== bounds.x ||
    info.y !== bounds.y ||
    info.w !== bounds.w ||
    info.h !== bounds.h
  ) {
    bounds.x = info.x;
    bounds.y = info.y;
    bounds.w = info.w;
    bounds.h = info.h;
  }
}

/**
 * Check if given batch is inside camera view
 * @param {Batch} batch
 * @return {Boolean}
 */
function isBatchInsideView(batch) {
  var camera = this.camera;
  var scale = camera.s;
  var cw = camera.width;
  var ch = camera.height;
  var cx = camera.x;
  var cy = camera.y;
  var w = (batch.width * TILE_SIZE) * scale;
  var h = (batch.height * TILE_SIZE) * scale;
  var x = ((batch.x * TILE_SIZE) * scale) + cx;
  var y = ((batch.y * TILE_SIZE) * scale) + cy;
  // backgrounds are always visible
  if (batch.isBackground) { return (true); }
  return (
    (x + w >= 0 && x <= cw) &&
    (y + h >= 0 && y <= ch)
  );
}


var _batch = Object.freeze({
	pushTileBatchOperation: pushTileBatchOperation,
	refreshBatches: refreshBatches,
	finalizeBatchOperation: finalizeBatchOperation,
	getLatestTileBatchOperation: getLatestTileBatchOperation,
	clearLatestTileBatch: clearLatestTileBatch,
	startBatchedDrawing: startBatchedDrawing,
	stopBatchedDrawing: stopBatchedDrawing,
	createBatchTileAt: createBatchTileAt,
	getBatchByTile: getBatchByTile,
	getStackRelativeBatchByPoint: getStackRelativeBatchByPoint,
	resizeBackgroundBatches: resizeBackgroundBatches,
	pointInsideAbsoluteBoundings: pointInsideAbsoluteBoundings,
	getAbsoluteBoundings: getAbsoluteBoundings,
	updateGlobalBoundings: updateGlobalBoundings,
	isBatchInsideView: isBatchInsideView
});

/**
 * Inserts stroked arc at given position
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @param {Array} color
 */
function strokeArc(x, y, radius, color) {
  if (!color) { color = [255, 255, 255, 1]; }
  this.insertArc(x, y, radius, color);
}

/**
 * Inserts filled arc at given position
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} radius
 * @param {Array} color
 */
function insertArc(x1, y1, radius, color) {
  var this$1 = this;

  var x2 = radius;
  var y2 = 0;
  var err = 1 - x2; 
  this.pushTileBatchOperation();
  for (; x2 >= y2;) {
    this$1.createBatchTileAt(x2 + x1, y2 + y1, color);
    this$1.createBatchTileAt(y2 + x1, x2 + y1, color);
    this$1.createBatchTileAt(-x2 + x1, y2 + y1, color);
    this$1.createBatchTileAt(-y2 + x1, x2 + y1, color);
    this$1.createBatchTileAt(-x2 + x1, -y2 + y1, color);
    this$1.createBatchTileAt(-y2 + x1, -x2 + y1, color);
    this$1.createBatchTileAt(x2 + x1, -y2 + y1, color);
    this$1.createBatchTileAt(y2 + x1, -x2 + y1, color);
    y2++;
    if (err <= 0) {
      err += 2 * y2 + 1;
    }
    if (err > 0) {
      x2--;
      err += 2 * (y2 - x2) + 1;
    }
  }
  this.finalizeBatchOperation();
}

/**
 * Inserts filled rectangle at given position
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 * @param {Array} color
 */
function fillRect(x, y, width, height, color) {
  if (!color) { color = [255, 255, 255, 1]; }
  this.insertRectangleAt(
    x | 0, y | 0,
    width | 0, height | 0,
    color, true
  );
}

/**
 * Inserts stroked rectangle at given position
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 * @param {Array} color
 */
function strokeRect(x, y, width, height, color) {
  if (!color) { color = [255, 255, 255, 1]; }
  this.insertRectangleAt(
    x | 0, y | 0,
    width | 0, height | 0,
    color, false
  );
}

/**
 * Inserts rectangle at given position
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @param {Array} color
 * @param {Boolean} filled
 */
function insertRectangleAt(x1, y1, x2, y2, color, filled) {
  var this$1 = this;

  var width = Math.abs(x2);
  var height = Math.abs(y2);
  this.pushTileBatchOperation();
  var dx = (x2 < 0 ? -1 : 1);
  var dy = (y2 < 0 ? -1 : 1);
  var bx = x1;
  var by = y1;
  for (var yy = 0; yy < height; ++yy) {
    for (var xx = 0; xx < width; ++xx) {
      // ignore inner tiles if rectangle not filled
      if (!filled) {
        if (!(
          (xx === 0 || xx >= width-1) ||
          (yy === 0 || yy >= height-1))
        ) { continue; }
      }
      this$1.createBatchTileAt(bx + xx * dx, by + yy * dy, color);
    }
  }
  this.finalizeBatchOperation();
}

/**
 * Transforms passed canvas ctx into a single batch operation
 * Instead of drawing tiles for each pixel,
 * we just directly draw all of them into a canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x
 * @param {Number} y
 */
function drawImage(ctx, x, y) {
  var canvas = ctx.canvas;
  var width = canvas.width;
  var height = canvas.height;
  var xx = 0;
  var yy = 0;
  // start ctx insertion from given position
  var data = ctx.getImageData(0, 0, width, height).data;
  var position = this.getRelativeOffset(x, y);
  this.pushTileBatchOperation();
  var batch = this.getLatestTileBatchOperation();
  batch.createRawBufferAt(ctx, position.x, position.y);
  this.finalizeBatchOperation();
}


var _insert = Object.freeze({
	strokeArc: strokeArc,
	insertArc: insertArc,
	fillRect: fillRect,
	strokeRect: strokeRect,
	insertRectangleAt: insertRectangleAt,
	drawImage: drawImage
});

/**
 * Shade or tint
 * @param {Batch} batch
 * @param {Number} factor
 */
function applyColorLightness(batch, factor) {
  var this$1 = this;

  var tiles = batch.tiles;
  this.pushTileBatchOperation();
  for (var ii = 0; ii < tiles.length; ++ii) {
    var tile = tiles[ii];
    var color = tile.colors[tile.cindex];
    var t = factor < 0 ? 0 : 255;
    var p = factor < 0 ? -factor : factor;
    var r = (Math.round((t - color[0]) * p) + color[0]);
    var g = (Math.round((t - color[1]) * p) + color[1]);
    var b = (Math.round((t - color[2]) * p) + color[2]);
    var a = color[3];
    this$1.createBatchTileAt(tile.x, tile.y, [r,g,b,a]);
  }
  this.finalizeBatchOperation();
}

/**
 * Remove L shaped corners
 * http://deepnight.net/pixel-perfect-drawing/
 * @param {Batch} batch
 */
function applyPixelSmoothing(batch) {
  var tiles = batch.tiles;
  for (var ii = 0; ii < tiles.length; ++ii) {
    if (!(ii > 0 && ii + 1 < tiles.length)) { continue; }
    var o = tiles[ii];
    var e = tiles[ii + 1];
    var w = tiles[ii - 1];
    if (
      (w.x === o.x  || w.y === o.y) &&
      (e.x === o.x  || e.y === o.y) &&
      (w.x !== e.x) && (w.y !== e.y)
    ) {
      tiles.splice(ii, 1);
      ++ii;
    }
  }
}


var _transform = Object.freeze({
	applyColorLightness: applyColorLightness,
	applyPixelSmoothing: applyPixelSmoothing
});

/**
 * @class Editor
 */
var Editor = function Editor(instance) {
  this.instance = instance;
  this.modes = {
    draw: false,
    selectAll: false
  };
  this.batches = [];
  // mouse position, negative to be hidden initially
  this.mx = -1;
  this.my = -1;
  this._fillStyle = [255,255,255,1];
  this.camera = instance.camera;
  // stack related
  this.sindex = -1;
  this.stack = [];
  this.boundings = {
    x: 0, y: 0, w: 0, h: 0
  };
};

var prototypeAccessors$1 = { fillStyle: {} };

/**
 * @return {Array}
 */
prototypeAccessors$1.fillStyle.get = function () {
  return (this._fillStyle);
};
/**
 * @param {*} value
 */
prototypeAccessors$1.fillStyle.set = function (value) {
  if (typeof value === "string") {
    this._fillStyle = hexToRgba(value);
  }
  else if (value instanceof Array && value.length === 4) {
    this._fillStyle = value;
  }
  else { throw new Error("Unsupported or invalid color"); }
};

/**
 * @param {Number} x
 * @param {Number} y
 * @return {Boolean}
 */
Editor.prototype.offsetExceedsIntegerLimit = function offsetExceedsIntegerLimit (x, y) {
  return (
    Math.abs(x) > MAX_SAFE_INTEGER || Math.abs(y) > MAX_SAFE_INTEGER
  );
};

Object.defineProperties( Editor.prototype, prototypeAccessors$1 );

inherit(Editor, _fill);
inherit(Editor, _stack);
inherit(Editor, _tiles);
inherit(Editor, _batch);
inherit(Editor, _insert);
inherit(Editor, _transform);

/*!
 * pixi.js - v4.4.1
 * Compiled Tue, 28 Feb 2017 12:31:33 UTC
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
!function(t){if("object"==typeof exports&&"undefined"!=typeof module){ module.exports=t(); }else if("function"==typeof define&&define.amd){ define([],t); }else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.PIXI=t();}}(function(){var t;return function t(e,r,n){function i(s,a){if(!r[s]){if(!e[s]){var u="function"==typeof require&&require;if(!a&&u){ return u(s,!0); }if(o){ return o(s,!0); }var h=new Error("Cannot find module '"+s+"'");throw h.code="MODULE_NOT_FOUND",h}var l=r[s]={exports:{}};e[s][0].call(l.exports,function(t){var r=e[s][1][t];return i(r?r:t)},l,l.exports,t,e,r,n);}return r[s].exports}for(var o="function"==typeof require&&require,s=0;s<n.length;s++){ i(n[s]); }return i}({1:[function(t,e,r){"use strict";"use restrict";function n(t){var e=32;return t&=-t,t&&e--,65535&t&&(e-=16),16711935&t&&(e-=8),252645135&t&&(e-=4),858993459&t&&(e-=2),1431655765&t&&(e-=1),e}var i=32;r.INT_BITS=i,r.INT_MAX=2147483647,r.INT_MIN=-1<<i-1,r.sign=function(t){return(t>0)-(t<0)},r.abs=function(t){var e=t>>i-1;return(t^e)-e},r.min=function(t,e){return e^(t^e)&-(t<e)},r.max=function(t,e){return t^(t^e)&-(t<e)},r.isPow2=function(t){return!(t&t-1||!t)},r.log2=function(t){var e,r;return e=(t>65535)<<4,t>>>=e,r=(t>255)<<3,t>>>=r,e|=r,r=(t>15)<<2,t>>>=r,e|=r,r=(t>3)<<1,t>>>=r,e|=r,e|t>>1},r.log10=function(t){return t>=1e9?9:t>=1e8?8:t>=1e7?7:t>=1e6?6:t>=1e5?5:t>=1e4?4:t>=1e3?3:t>=100?2:t>=10?1:0},r.popCount=function(t){return t-=t>>>1&1431655765,t=(858993459&t)+(t>>>2&858993459),16843009*(t+(t>>>4)&252645135)>>>24},r.countTrailingZeros=n,r.nextPow2=function(t){return t+=0===t,--t,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t+1},r.prevPow2=function(t){return t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t-(t>>>1)},r.parity=function(t){return t^=t>>>16,t^=t>>>8,t^=t>>>4,t&=15,27030>>>t&1};var o=new Array(256);!function(t){for(var e=0;e<256;++e){var r=e,n=e,i=7;for(r>>>=1;r;r>>>=1){ n<<=1,n|=1&r,--i; }t[e]=n<<i&255;}}(o),r.reverse=function(t){return o[255&t]<<24|o[t>>>8&255]<<16|o[t>>>16&255]<<8|o[t>>>24&255]},r.interleave2=function(t,e){return t&=65535,t=16711935&(t|t<<8),t=252645135&(t|t<<4),t=858993459&(t|t<<2),t=1431655765&(t|t<<1),e&=65535,e=16711935&(e|e<<8),e=252645135&(e|e<<4),e=858993459&(e|e<<2),e=1431655765&(e|e<<1),t|e<<1},r.deinterleave2=function(t,e){return t=t>>>e&1431655765,t=858993459&(t|t>>>1),t=252645135&(t|t>>>2),t=16711935&(t|t>>>4),t=65535&(t|t>>>16),t<<16>>16},r.interleave3=function(t,e,r){return t&=1023,t=4278190335&(t|t<<16),t=251719695&(t|t<<8),t=3272356035&(t|t<<4),t=1227133513&(t|t<<2),e&=1023,e=4278190335&(e|e<<16),e=251719695&(e|e<<8),e=3272356035&(e|e<<4),e=1227133513&(e|e<<2),t|=e<<1,r&=1023,r=4278190335&(r|r<<16),r=251719695&(r|r<<8),r=3272356035&(r|r<<4),r=1227133513&(r|r<<2),t|r<<2},r.deinterleave3=function(t,e){return t=t>>>e&1227133513,t=3272356035&(t|t>>>2),t=251719695&(t|t>>>4),t=4278190335&(t|t>>>8),t=1023&(t|t>>>16),t<<22>>22},r.nextCombination=function(t){var e=t|t-1;return e+1|(~e&-~e)-1>>>n(t)+1};},{}],2:[function(t,e,r){"use strict";function n(t,e,r){r=r||2;var n=e&&e.length,o=n?e[0]*r:t.length,a=i(t,0,o,r,!0),u=[];if(!a){ return u; }var h,l,f,d,p,v,y;if(n&&(a=c(t,e,a,r)),t.length>80*r){h=f=t[0],l=d=t[1];for(var g=r;g<o;g+=r){ p=t[g],v=t[g+1],p<h&&(h=p),v<l&&(l=v),p>f&&(f=p),v>d&&(d=v); }y=Math.max(f-h,d-l);}return s(a,u,r,h,l,y),u}function i(t,e,r,n,i){var o,s;if(i===A(t,e,r,n)>0){ for(o=e;o<r;o+=n){ s=M(o,t[o],t[o+1],s); } }else { for(o=r-n;o>=e;o-=n){ s=M(o,t[o],t[o+1],s); } }return s&&T(s,s.next)&&(C(s),s=s.next),s}function o(t,e){if(!t){ return t; }e||(e=t);var r,n=t;do { if(r=!1,n.steiner||!T(n,n.next)&&0!==x(n.prev,n,n.next)){ n=n.next; }else{if(C(n),n=e=n.prev,n===n.next){ return null; }r=!0;} }while(r||n!==e);return e}function s(t,e,r,n,i,c,f){if(t){!f&&c&&v(t,n,i,c);for(var d,p,y=t;t.prev!==t.next;){ if(d=t.prev,p=t.next,c?u(t,n,i,c):a(t)){ e.push(d.i/r),e.push(t.i/r),e.push(p.i/r),C(t),t=p.next,y=p.next; }else if(t=p,t===y){f?1===f?(t=h(t,e,r),s(t,e,r,n,i,c,2)):2===f&&l(t,e,r,n,i,c):s(o(t),e,r,n,i,c,1);break} }}}function a(t){var e=t.prev,r=t,n=t.next;if(x(e,r,n)>=0){ return!1; }for(var i=t.next.next;i!==t.prev;){if(_(e.x,e.y,r.x,r.y,n.x,n.y,i.x,i.y)&&x(i.prev,i,i.next)>=0){ return!1; }i=i.next;}return!0}function u(t,e,r,n){var i=t.prev,o=t,s=t.next;if(x(i,o,s)>=0){ return!1; }for(var a=i.x<o.x?i.x<s.x?i.x:s.x:o.x<s.x?o.x:s.x,u=i.y<o.y?i.y<s.y?i.y:s.y:o.y<s.y?o.y:s.y,h=i.x>o.x?i.x>s.x?i.x:s.x:o.x>s.x?o.x:s.x,l=i.y>o.y?i.y>s.y?i.y:s.y:o.y>s.y?o.y:s.y,c=g(a,u,e,r,n),f=g(h,l,e,r,n),d=t.nextZ;d&&d.z<=f;){if(d!==t.prev&&d!==t.next&&_(i.x,i.y,o.x,o.y,s.x,s.y,d.x,d.y)&&x(d.prev,d,d.next)>=0){ return!1; }d=d.nextZ;}for(d=t.prevZ;d&&d.z>=c;){if(d!==t.prev&&d!==t.next&&_(i.x,i.y,o.x,o.y,s.x,s.y,d.x,d.y)&&x(d.prev,d,d.next)>=0){ return!1; }d=d.prevZ;}return!0}function h(t,e,r){var n=t;do{var i=n.prev,o=n.next.next;!T(i,o)&&w(i,n,n.next,o)&&S(i,o)&&S(o,i)&&(e.push(i.i/r),e.push(n.i/r),e.push(o.i/r),C(n),C(n.next),n=t=o),n=n.next;}while(n!==t);return n}function l(t,e,r,n,i,a){var u=t;do{for(var h=u.next.next;h!==u.prev;){if(u.i!==h.i&&b(u,h)){var l=P(u,h);return u=o(u,u.next),l=o(l,l.next),s(u,e,r,n,i,a),void s(l,e,r,n,i,a)}h=h.next;}u=u.next;}while(u!==t)}function c(t,e,r,n){var s,a,u,h,l,c=[];for(s=0,a=e.length;s<a;s++){ u=e[s]*n,h=s<a-1?e[s+1]*n:t.length,l=i(t,u,h,n,!1),l===l.next&&(l.steiner=!0),c.push(m(l)); }for(c.sort(f),s=0;s<c.length;s++){ d(c[s],r),r=o(r,r.next); }return r}function f(t,e){return t.x-e.x}function d(t,e){if(e=p(t,e)){var r=P(e,t);o(r,r.next);}}function p(t,e){var r,n=e,i=t.x,o=t.y,s=-(1/0);do{if(o<=n.y&&o>=n.next.y){var a=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(a<=i&&a>s){if(s=a,a===i){if(o===n.y){ return n; }if(o===n.next.y){ return n.next }}r=n.x<n.next.x?n:n.next;}}n=n.next;}while(n!==e);if(!r){ return null; }if(i===s){ return r.prev; }var u,h=r,l=r.x,c=r.y,f=1/0;for(n=r.next;n!==h;){ i>=n.x&&n.x>=l&&_(o<c?i:s,o,l,c,o<c?s:i,o,n.x,n.y)&&(u=Math.abs(o-n.y)/(i-n.x),(u<f||u===f&&n.x>r.x)&&S(n,t)&&(r=n,f=u)),n=n.next; }return r}function v(t,e,r,n){var i=t;do { null===i.z&&(i.z=g(i.x,i.y,e,r,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next; }while(i!==t);i.prevZ.nextZ=null,i.prevZ=null,y(i);}function y(t){var e,r,n,i,o,s,a,u,h=1;do{for(r=t,t=null,o=null,s=0;r;){for(s++,n=r,a=0,e=0;e<h&&(a++,n=n.nextZ,n);e++){  }for(u=h;a>0||u>0&&n;){ 0===a?(i=n,n=n.nextZ,u--):0!==u&&n?r.z<=n.z?(i=r,r=r.nextZ,a--):(i=n,n=n.nextZ,u--):(i=r,r=r.nextZ,a--),o?o.nextZ=i:t=i,i.prevZ=o,o=i; }r=n;}o.nextZ=null,h*=2;}while(s>1);return t}function g(t,e,r,n,i){return t=32767*(t-r)/i,e=32767*(e-n)/i,t=16711935&(t|t<<8),t=252645135&(t|t<<4),t=858993459&(t|t<<2),t=1431655765&(t|t<<1),e=16711935&(e|e<<8),e=252645135&(e|e<<4),e=858993459&(e|e<<2),e=1431655765&(e|e<<1),t|e<<1}function m(t){var e=t,r=t;do { e.x<r.x&&(r=e),e=e.next; }while(e!==t);return r}function _(t,e,r,n,i,o,s,a){return(i-s)*(e-a)-(t-s)*(o-a)>=0&&(t-s)*(n-a)-(r-s)*(e-a)>=0&&(r-s)*(o-a)-(i-s)*(n-a)>=0}function b(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!E(t,e)&&S(t,e)&&S(e,t)&&O(t,e)}function x(t,e,r){return(e.y-t.y)*(r.x-e.x)-(e.x-t.x)*(r.y-e.y)}function T(t,e){return t.x===e.x&&t.y===e.y}function w(t,e,r,n){return!!(T(t,e)&&T(r,n)||T(t,n)&&T(r,e))||x(t,e,r)>0!=x(t,e,n)>0&&x(r,n,t)>0!=x(r,n,e)>0}function E(t,e){var r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==e.i&&r.next.i!==e.i&&w(r,r.next,t,e)){ return!0; }r=r.next;}while(r!==t);return!1}function S(t,e){return x(t.prev,t,t.next)<0?x(t,e,t.next)>=0&&x(t,t.prev,e)>=0:x(t,e,t.prev)<0||x(t,t.next,e)<0}function O(t,e){var r=t,n=!1,i=(t.x+e.x)/2,o=(t.y+e.y)/2;do { r.y>o!=r.next.y>o&&i<(r.next.x-r.x)*(o-r.y)/(r.next.y-r.y)+r.x&&(n=!n),r=r.next; }while(r!==t);return n}function P(t,e){var r=new R(t.i,t.x,t.y),n=new R(e.i,e.x,e.y),i=t.next,o=e.prev;return t.next=e,e.prev=t,r.next=i,i.prev=r,n.next=r,r.prev=n,o.next=n,n.prev=o,n}function M(t,e,r,n){var i=new R(t,e,r);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function C(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ);}function R(t,e,r){this.i=t,this.x=e,this.y=r,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1;}function A(t,e,r,n){for(var i=0,o=e,s=r-n;o<r;o+=n){ i+=(t[s]-t[o])*(t[o+1]+t[s+1]),s=o; }return i}e.exports=n,n.deviation=function(t,e,r,n){var i=e&&e.length,o=i?e[0]*r:t.length,s=Math.abs(A(t,0,o,r));if(i){ for(var a=0,u=e.length;a<u;a++){var h=e[a]*r,l=a<u-1?e[a+1]*r:t.length;s-=Math.abs(A(t,h,l,r));} }var c=0;for(a=0;a<n.length;a+=3){var f=n[a]*r,d=n[a+1]*r,p=n[a+2]*r;c+=Math.abs((t[f]-t[p])*(t[d+1]-t[f+1])-(t[f]-t[d])*(t[p+1]-t[f+1]));}return 0===s&&0===c?0:Math.abs((c-s)/s)},n.flatten=function(t){for(var e=t[0][0].length,r={vertices:[],holes:[],dimensions:e},n=0,i=0;i<t.length;i++){for(var o=0;o<t[i].length;o++){ for(var s=0;s<e;s++){ r.vertices.push(t[i][o][s]); } }i>0&&(n+=t[i-1].length,r.holes.push(n));}return r};},{}],3:[function(t,e,r){"use strict";function n(){}function i(t,e,r){this.fn=t,this.context=e,this.once=r||!1;}function o(){this._events=new n,this._eventsCount=0;}var s=Object.prototype.hasOwnProperty,a="~";Object.create&&(n.prototype=Object.create(null),(new n).__proto__||(a=!1)),o.prototype.eventNames=function(){var t,e,r=[];if(0===this._eventsCount){ return r; }for(e in t=this._events){ s.call(t,e)&&r.push(a?e.slice(1):e); }return Object.getOwnPropertySymbols?r.concat(Object.getOwnPropertySymbols(t)):r},o.prototype.listeners=function(t,e){var r=a?a+t:t,n=this._events[r];if(e){ return!!n; }if(!n){ return[]; }if(n.fn){ return[n.fn]; }for(var i=0,o=n.length,s=new Array(o);i<o;i++){ s[i]=n[i].fn; }return s},o.prototype.emit=function(t,e,r,n,i,o){
var arguments$1 = arguments;
var this$1 = this;
var s=a?a+t:t;if(!this._events[s]){ return!1; }var u,h,l=this._events[s],c=arguments.length;if(l.fn){switch(l.once&&this.removeListener(t,l.fn,void 0,!0),c){case 1:return l.fn.call(l.context),!0;case 2:return l.fn.call(l.context,e),!0;case 3:return l.fn.call(l.context,e,r),!0;case 4:return l.fn.call(l.context,e,r,n),!0;case 5:return l.fn.call(l.context,e,r,n,i),!0;case 6:return l.fn.call(l.context,e,r,n,i,o),!0}for(h=1,u=new Array(c-1);h<c;h++){ u[h-1]=arguments$1[h]; }l.fn.apply(l.context,u);}else{var f,d=l.length;for(h=0;h<d;h++){ switch(l[h].once&&this$1.removeListener(t,l[h].fn,void 0,!0),c){case 1:l[h].fn.call(l[h].context);break;case 2:l[h].fn.call(l[h].context,e);break;case 3:l[h].fn.call(l[h].context,e,r);break;case 4:l[h].fn.call(l[h].context,e,r,n);break;default:if(!u){ for(f=1,u=new Array(c-1);f<c;f++){ u[f-1]=arguments$1[f]; } }l[h].fn.apply(l[h].context,u);} }}return!0},o.prototype.on=function(t,e,r){var n=new i(e,r||this),o=a?a+t:t;return this._events[o]?this._events[o].fn?this._events[o]=[this._events[o],n]:this._events[o].push(n):(this._events[o]=n,this._eventsCount++),this},o.prototype.once=function(t,e,r){var n=new i(e,r||this,!0),o=a?a+t:t;return this._events[o]?this._events[o].fn?this._events[o]=[this._events[o],n]:this._events[o].push(n):(this._events[o]=n,this._eventsCount++),this},o.prototype.removeListener=function(t,e,r,i){var o=a?a+t:t;if(!this._events[o]){ return this; }if(!e){ return 0===--this._eventsCount?this._events=new n:delete this._events[o],this; }var s=this._events[o];if(s.fn){ s.fn!==e||i&&!s.once||r&&s.context!==r||(0===--this._eventsCount?this._events=new n:delete this._events[o]); }else{for(var u=0,h=[],l=s.length;u<l;u++){ (s[u].fn!==e||i&&!s[u].once||r&&s[u].context!==r)&&h.push(s[u]); }h.length?this._events[o]=1===h.length?h[0]:h:0===--this._eventsCount?this._events=new n:delete this._events[o];}return this},o.prototype.removeAllListeners=function(t){var e;return t?(e=a?a+t:t,this._events[e]&&(0===--this._eventsCount?this._events=new n:delete this._events[e])):(this._events=new n,this._eventsCount=0),this},o.prototype.off=o.prototype.removeListener,o.prototype.addListener=o.prototype.on,o.prototype.setMaxListeners=function(){return this},o.prefixed=a,o.EventEmitter=o,"undefined"!=typeof e&&(e.exports=o);},{}],4:[function(e,r,n){!function(e){var n=/iPhone/i,i=/iPod/i,o=/iPad/i,s=/(?=.*\bAndroid\b)(?=.*\bMobile\b)/i,a=/Android/i,u=/(?=.*\bAndroid\b)(?=.*\bSD4930UR\b)/i,h=/(?=.*\bAndroid\b)(?=.*\b(?:KFOT|KFTT|KFJWI|KFJWA|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|KFARWI|KFASWI|KFSAWI|KFSAWA)\b)/i,l=/IEMobile/i,c=/(?=.*\bWindows\b)(?=.*\bARM\b)/i,f=/BlackBerry/i,d=/BB10/i,p=/Opera Mini/i,v=/(CriOS|Chrome)(?=.*\bMobile\b)/i,y=/(?=.*\bFirefox\b)(?=.*\bMobile\b)/i,g=new RegExp("(?:Nexus 7|BNTV250|Kindle Fire|Silk|GT-P1000)","i"),m=function(t,e){return t.test(e)},_=function(t){var e=t||navigator.userAgent,r=e.split("[FBAN");if("undefined"!=typeof r[1]&&(e=r[0]),r=e.split("Twitter"),"undefined"!=typeof r[1]&&(e=r[0]),this.apple={phone:m(n,e),ipod:m(i,e),tablet:!m(n,e)&&m(o,e),device:m(n,e)||m(i,e)||m(o,e)},this.amazon={phone:m(u,e),tablet:!m(u,e)&&m(h,e),device:m(u,e)||m(h,e)},this.android={phone:m(u,e)||m(s,e),tablet:!m(u,e)&&!m(s,e)&&(m(h,e)||m(a,e)),device:m(u,e)||m(h,e)||m(s,e)||m(a,e)},this.windows={phone:m(l,e),tablet:m(c,e),device:m(l,e)||m(c,e)},this.other={blackberry:m(f,e),blackberry10:m(d,e),opera:m(p,e),firefox:m(y,e),chrome:m(v,e),device:m(f,e)||m(d,e)||m(p,e)||m(y,e)||m(v,e)},this.seven_inch=m(g,e),this.any=this.apple.device||this.android.device||this.windows.device||this.other.device||this.seven_inch,this.phone=this.apple.phone||this.android.phone||this.windows.phone,this.tablet=this.apple.tablet||this.android.tablet||this.windows.tablet,"undefined"==typeof window){ return this }},b=function(){var t=new _;return t.Class=_,t};"undefined"!=typeof r&&r.exports&&"undefined"==typeof window?r.exports=_:"undefined"!=typeof r&&r.exports&&"undefined"!=typeof window?r.exports=b():"function"==typeof t&&t.amd?t("isMobile",[],e.isMobile=b()):e.isMobile=b();}(this);},{}],5:[function(t,e,r){"use strict";function n(t){if(null===t||void 0===t){ throw new TypeError("Object.assign cannot be called with null or undefined"); }return Object(t)}function i(){try{if(!Object.assign){ return!1; }var t=new String("abc");if(t[5]="de","5"===Object.getOwnPropertyNames(t)[0]){ return!1; }for(var e={},r=0;r<10;r++){ e["_"+String.fromCharCode(r)]=r; }var n=Object.getOwnPropertyNames(e).map(function(t){return e[t]});if("0123456789"!==n.join("")){ return!1; }var i={};return"abcdefghijklmnopqrst".split("").forEach(function(t){i[t]=t;}),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},i)).join("")}catch(t){return!1}}var o=Object.getOwnPropertySymbols,s=Object.prototype.hasOwnProperty,a=Object.prototype.propertyIsEnumerable;e.exports=i()?Object.assign:function(t,e){
var arguments$1 = arguments;
for(var r,i,u=n(t),h=1;h<arguments.length;h++){r=Object(arguments$1[h]);for(var l in r){ s.call(r,l)&&(u[l]=r[l]); }if(o){i=o(r);for(var c=0;c<i.length;c++){ a.call(r,i[c])&&(u[i[c]]=r[i[c]]); }}}return u};},{}],6:[function(t,e,r){var n=new ArrayBuffer(0),i=function(t,e,r,i){this.gl=t,this.buffer=t.createBuffer(),this.type=e||t.ARRAY_BUFFER,this.drawType=i||t.STATIC_DRAW,this.data=n,r&&this.upload(r),this._updateID=0;};i.prototype.upload=function(t,e,r){r||this.bind();var n=this.gl;t=t||this.data,e=e||0,this.data.byteLength>=t.byteLength?n.bufferSubData(this.type,e,t):n.bufferData(this.type,t,this.drawType),this.data=t;},i.prototype.bind=function(){var t=this.gl;t.bindBuffer(this.type,this.buffer);},i.createVertexBuffer=function(t,e,r){return new i(t,t.ARRAY_BUFFER,e,r)},i.createIndexBuffer=function(t,e,r){return new i(t,t.ELEMENT_ARRAY_BUFFER,e,r)},i.create=function(t,e,r,n){return new i(t,e,r,n)},i.prototype.destroy=function(){this.gl.deleteBuffer(this.buffer);},e.exports=i;},{}],7:[function(t,e,r){var n=t("./GLTexture"),i=function(t,e,r){this.gl=t,this.framebuffer=t.createFramebuffer(),this.stencil=null,this.texture=null,this.width=e||100,this.height=r||100;};i.prototype.enableTexture=function(t){var e=this.gl;this.texture=t||new n(e),this.texture.bind(),this.bind(),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texture.texture,0);},i.prototype.enableStencil=function(){if(!this.stencil){var t=this.gl;this.stencil=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,this.stencil),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.RENDERBUFFER,this.stencil),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_STENCIL,this.width,this.height);}},i.prototype.clear=function(t,e,r,n){this.bind();var i=this.gl;i.clearColor(t,e,r,n),i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT);},i.prototype.bind=function(){var t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer);},i.prototype.unbind=function(){var t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,null);},i.prototype.resize=function(t,e){var r=this.gl;this.width=t,this.height=e,this.texture&&this.texture.uploadData(null,t,e),this.stencil&&(r.bindRenderbuffer(r.RENDERBUFFER,this.stencil),r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_STENCIL,t,e));},i.prototype.destroy=function(){var t=this.gl;this.texture&&this.texture.destroy(),t.deleteFramebuffer(this.framebuffer),this.gl=null,this.stencil=null,this.texture=null;},i.createRGBA=function(t,e,r,o){var s=n.fromData(t,null,e,r);s.enableNearestScaling(),s.enableWrapClamp();var a=new i(t,e,r);return a.enableTexture(s),a.unbind(),a},i.createFloat32=function(t,e,r,o){var s=new n.fromData(t,o,e,r);s.enableNearestScaling(),s.enableWrapClamp();var a=new i(t,e,r);return a.enableTexture(s),a.unbind(),a},e.exports=i;},{"./GLTexture":9}],8:[function(t,e,r){var n=t("./shader/compileProgram"),i=t("./shader/extractAttributes"),o=t("./shader/extractUniforms"),s=t("./shader/setPrecision"),a=t("./shader/generateUniformAccessObject"),u=function(t,e,r,u,h){this.gl=t,u&&(e=s(e,u),r=s(r,u)),this.program=n(t,e,r,h),this.attributes=i(t,this.program),this.uniformData=o(t,this.program),this.uniforms=a(t,this.uniformData);};u.prototype.bind=function(){this.gl.useProgram(this.program);},u.prototype.destroy=function(){this.attributes=null,this.uniformData=null,this.uniforms=null;var t=this.gl;t.deleteProgram(this.program);},e.exports=u;},{"./shader/compileProgram":14,"./shader/extractAttributes":16,"./shader/extractUniforms":17,"./shader/generateUniformAccessObject":18,"./shader/setPrecision":22}],9:[function(t,e,r){var n=function(t,e,r,n,i){this.gl=t,this.texture=t.createTexture(),this.mipmap=!1,this.premultiplyAlpha=!1,this.width=e||-1,this.height=r||-1,this.format=n||t.RGBA,this.type=i||t.UNSIGNED_BYTE;};n.prototype.upload=function(t){this.bind();var e=this.gl;e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha);var r=t.videoWidth||t.width,n=t.videoHeight||t.height;n!==this.height||r!==this.width?e.texImage2D(e.TEXTURE_2D,0,this.format,this.format,this.type,t):e.texSubImage2D(e.TEXTURE_2D,0,0,0,this.format,this.type,t),this.width=r,this.height=n;};var i=!1;n.prototype.uploadData=function(t,e,r){this.bind();var n=this.gl;if(t instanceof Float32Array){if(!i){var o=n.getExtension("OES_texture_float");if(!o){ throw new Error("floating point textures not available"); }i=!0;}this.type=n.FLOAT;}else { this.type=this.type||n.UNSIGNED_BYTE; }n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha),e!==this.width||r!==this.height?n.texImage2D(n.TEXTURE_2D,0,this.format,e,r,0,this.format,this.type,t||null):n.texSubImage2D(n.TEXTURE_2D,0,0,0,e,r,this.format,this.type,t||null),this.width=e,this.height=r;},n.prototype.bind=function(t){var e=this.gl;void 0!==t&&e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,this.texture);},n.prototype.unbind=function(){var t=this.gl;t.bindTexture(t.TEXTURE_2D,null);},n.prototype.minFilter=function(t){var e=this.gl;this.bind(),this.mipmap?e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t?e.LINEAR_MIPMAP_LINEAR:e.NEAREST_MIPMAP_NEAREST):e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t?e.LINEAR:e.NEAREST);},n.prototype.magFilter=function(t){var e=this.gl;this.bind(),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,t?e.LINEAR:e.NEAREST);},n.prototype.enableMipmap=function(){var t=this.gl;this.bind(),this.mipmap=!0,t.generateMipmap(t.TEXTURE_2D);},n.prototype.enableLinearScaling=function(){this.minFilter(!0),this.magFilter(!0);},n.prototype.enableNearestScaling=function(){this.minFilter(!1),this.magFilter(!1);},n.prototype.enableWrapClamp=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE);},n.prototype.enableWrapRepeat=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT);},n.prototype.enableWrapMirrorRepeat=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.MIRRORED_REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.MIRRORED_REPEAT);},n.prototype.destroy=function(){var t=this.gl;t.deleteTexture(this.texture);},n.fromSource=function(t,e,r){var i=new n(t);return i.premultiplyAlpha=r||!1,i.upload(e),i},n.fromData=function(t,e,r,i){var o=new n(t);return o.uploadData(e,r,i),o},e.exports=n;},{}],10:[function(t,e,r){function n(t,e){if(this.nativeVaoExtension=null,n.FORCE_NATIVE||(this.nativeVaoExtension=t.getExtension("OES_vertex_array_object")||t.getExtension("MOZ_OES_vertex_array_object")||t.getExtension("WEBKIT_OES_vertex_array_object")),this.nativeState=e,this.nativeVaoExtension){this.nativeVao=this.nativeVaoExtension.createVertexArrayOES();var r=t.getParameter(t.MAX_VERTEX_ATTRIBS);this.nativeState={tempAttribState:new Array(r),attribState:new Array(r)};}this.gl=t,this.attributes=[],this.indexBuffer=null,this.dirty=!1;}var i=t("./setVertexAttribArrays");n.prototype.constructor=n,e.exports=n,n.FORCE_NATIVE=!1,n.prototype.bind=function(){return this.nativeVao?(this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao),this.dirty&&(this.dirty=!1,this.activate())):this.activate(),this},n.prototype.unbind=function(){return this.nativeVao&&this.nativeVaoExtension.bindVertexArrayOES(null),this},n.prototype.activate=function(){
var this$1 = this;
for(var t=this.gl,e=null,r=0;r<this.attributes.length;r++){var n=this$1.attributes[r];e!==n.buffer&&(n.buffer.bind(),e=n.buffer),t.vertexAttribPointer(n.attribute.location,n.attribute.size,n.type||t.FLOAT,n.normalized||!1,n.stride||0,n.start||0);}return i(t,this.attributes,this.nativeState),this.indexBuffer&&this.indexBuffer.bind(),this},n.prototype.addAttribute=function(t,e,r,n,i,o){return this.attributes.push({buffer:t,attribute:e,location:e.location,type:r||this.gl.FLOAT,normalized:n||!1,stride:i||0,start:o||0}),this.dirty=!0,this},n.prototype.addIndex=function(t){return this.indexBuffer=t,this.dirty=!0,this},n.prototype.clear=function(){return this.nativeVao&&this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao),this.attributes.length=0,this.indexBuffer=null,this},n.prototype.draw=function(t,e,r){var n=this.gl;return this.indexBuffer?n.drawElements(t,e||this.indexBuffer.data.length,n.UNSIGNED_SHORT,2*(r||0)):n.drawArrays(t,r,e||this.getSize()),this},n.prototype.destroy=function(){this.gl=null,this.indexBuffer=null,this.attributes=null,this.nativeState=null,this.nativeVao&&this.nativeVaoExtension.deleteVertexArrayOES(this.nativeVao),this.nativeVaoExtension=null,this.nativeVao=null;},n.prototype.getSize=function(){var t=this.attributes[0];return t.buffer.data.length/(t.stride/4||t.attribute.size)};},{"./setVertexAttribArrays":13}],11:[function(t,e,r){var n=function(t,e){var r=t.getContext("webgl",e)||t.getContext("experimental-webgl",e);if(!r){ throw new Error("This browser does not support webGL. Try using the canvas renderer"); }return r};e.exports=n;},{}],12:[function(t,e,r){var n={createContext:t("./createContext"),setVertexAttribArrays:t("./setVertexAttribArrays"),GLBuffer:t("./GLBuffer"),GLFramebuffer:t("./GLFramebuffer"),GLShader:t("./GLShader"),GLTexture:t("./GLTexture"),VertexArrayObject:t("./VertexArrayObject"),shader:t("./shader")};"undefined"!=typeof e&&e.exports&&(e.exports=n),"undefined"!=typeof window&&(window.PIXI=window.PIXI||{},window.PIXI.glCore=n);},{"./GLBuffer":6,"./GLFramebuffer":7,"./GLShader":8,"./GLTexture":9,"./VertexArrayObject":10,"./createContext":11,"./setVertexAttribArrays":13,"./shader":19}],13:[function(t,e,r){var n=function(t,e,r){var n;if(r){var i=r.tempAttribState,o=r.attribState;for(n=0;n<i.length;n++){ i[n]=!1; }for(n=0;n<e.length;n++){ i[e[n].attribute.location]=!0; }for(n=0;n<o.length;n++){ o[n]!==i[n]&&(o[n]=i[n],r.attribState[n]?t.enableVertexAttribArray(n):t.disableVertexAttribArray(n)); }}else { for(n=0;n<e.length;n++){var s=e[n];t.enableVertexAttribArray(s.attribute.location);} }};e.exports=n;},{}],14:[function(t,e,r){var n=function(t,e,r,n){var o=i(t,t.VERTEX_SHADER,e),s=i(t,t.FRAGMENT_SHADER,r),a=t.createProgram();if(t.attachShader(a,o),t.attachShader(a,s),n){ for(var u in n){ t.bindAttribLocation(a,n[u],u); } }return t.linkProgram(a),t.getProgramParameter(a,t.LINK_STATUS)||(console.error("Pixi.js Error: Could not initialize shader."),console.error("gl.VALIDATE_STATUS",t.getProgramParameter(a,t.VALIDATE_STATUS)),console.error("gl.getError()",t.getError()),""!==t.getProgramInfoLog(a)&&console.warn("Pixi.js Warning: gl.getProgramInfoLog()",t.getProgramInfoLog(a)),t.deleteProgram(a),a=null),t.deleteShader(o),t.deleteShader(s),a},i=function(t,e,r){var n=t.createShader(e);return t.shaderSource(n,r),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:(console.log(t.getShaderInfoLog(n)),null)};e.exports=n;},{}],15:[function(t,e,r){var n=function(t,e){switch(t){case"float":return 0;case"vec2":return new Float32Array(2*e);case"vec3":return new Float32Array(3*e);case"vec4":return new Float32Array(4*e);case"int":case"sampler2D":return 0;case"ivec2":return new Int32Array(2*e);case"ivec3":return new Int32Array(3*e);case"ivec4":return new Int32Array(4*e);case"bool":return!1;case"bvec2":return i(2*e);case"bvec3":return i(3*e);case"bvec4":return i(4*e);case"mat2":return new Float32Array([1,0,0,1]);case"mat3":return new Float32Array([1,0,0,0,1,0,0,0,1]);case"mat4":return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}},i=function(t){for(var e=new Array(t),r=0;r<e.length;r++){ e[r]=!1; }return e};e.exports=n;},{}],16:[function(t,e,r){var n=t("./mapType"),i=t("./mapSize"),o=function(t,e){for(var r={},o=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES),a=0;a<o;a++){var u=t.getActiveAttrib(e,a),h=n(t,u.type);r[u.name]={type:h,size:i(h),location:t.getAttribLocation(e,u.name),pointer:s};}return r},s=function(t,e,r,n){gl.vertexAttribPointer(this.location,this.size,t||gl.FLOAT,e||!1,r||0,n||0);};e.exports=o;},{"./mapSize":20,"./mapType":21}],17:[function(t,e,r){var n=t("./mapType"),i=t("./defaultValue"),o=function(t,e){for(var r={},o=t.getProgramParameter(e,t.ACTIVE_UNIFORMS),s=0;s<o;s++){var a=t.getActiveUniform(e,s),u=a.name.replace(/\[.*?\]/,""),h=n(t,a.type);r[u]={type:h,size:a.size,location:t.getUniformLocation(e,u),value:i(h,a.size)};}return r};e.exports=o;},{"./defaultValue":15,"./mapType":21}],18:[function(t,e,r){var n=function(t,e){var r={data:{}};r.gl=t;for(var n=Object.keys(e),a=0;a<n.length;a++){var u=n[a],h=u.split("."),l=h[h.length-1],c=s(h,r),f=e[u];c.data[l]=f,c.gl=t,Object.defineProperty(c,l,{get:i(l),set:o(l,f)});}return r},i=function(t){var e=a.replace("%%",t);return new Function(e)},o=function(t,e){var r,n=u.replace(/%%/g,t);return r=1===e.size?h[e.type]:l[e.type],r&&(n+="\nthis.gl."+r+";"),new Function("value",n)},s=function(t,e){for(var r=e,n=0;n<t.length-1;n++){var i=r[t[n]]||{data:{}};r[t[n]]=i,r=i;}return r},a=["return this.data.%%.value;"].join("\n"),u=["this.data.%%.value = value;","var location = this.data.%%.location;"].join("\n"),h={float:"uniform1f(location, value)",vec2:"uniform2f(location, value[0], value[1])",vec3:"uniform3f(location, value[0], value[1], value[2])",vec4:"uniform4f(location, value[0], value[1], value[2], value[3])",int:"uniform1i(location, value)",ivec2:"uniform2i(location, value[0], value[1])",ivec3:"uniform3i(location, value[0], value[1], value[2])",ivec4:"uniform4i(location, value[0], value[1], value[2], value[3])",bool:"uniform1i(location, value)",bvec2:"uniform2i(location, value[0], value[1])",bvec3:"uniform3i(location, value[0], value[1], value[2])",bvec4:"uniform4i(location, value[0], value[1], value[2], value[3])",mat2:"uniformMatrix2fv(location, false, value)",mat3:"uniformMatrix3fv(location, false, value)",mat4:"uniformMatrix4fv(location, false, value)",sampler2D:"uniform1i(location, value)"},l={float:"uniform1fv(location, value)",vec2:"uniform2fv(location, value)",vec3:"uniform3fv(location, value)",vec4:"uniform4fv(location, value)",int:"uniform1iv(location, value)",ivec2:"uniform2iv(location, value)",ivec3:"uniform3iv(location, value)",ivec4:"uniform4iv(location, value)",bool:"uniform1iv(location, value)",bvec2:"uniform2iv(location, value)",bvec3:"uniform3iv(location, value)",bvec4:"uniform4iv(location, value)",sampler2D:"uniform1iv(location, value)"};e.exports=n;},{}],19:[function(t,e,r){e.exports={compileProgram:t("./compileProgram"),defaultValue:t("./defaultValue"),extractAttributes:t("./extractAttributes"),extractUniforms:t("./extractUniforms"),generateUniformAccessObject:t("./generateUniformAccessObject"),setPrecision:t("./setPrecision"),mapSize:t("./mapSize"),mapType:t("./mapType")};},{"./compileProgram":14,"./defaultValue":15,"./extractAttributes":16,"./extractUniforms":17,"./generateUniformAccessObject":18,"./mapSize":20,"./mapType":21,"./setPrecision":22}],20:[function(t,e,r){var n=function(t){return i[t]},i={float:1,vec2:2,vec3:3,vec4:4,int:1,ivec2:2,ivec3:3,ivec4:4,bool:1,bvec2:2,bvec3:3,bvec4:4,mat2:4,mat3:9,mat4:16,sampler2D:1};e.exports=n;},{}],21:[function(t,e,r){var n=function(t,e){if(!i){var r=Object.keys(o);i={};for(var n=0;n<r.length;++n){var s=r[n];i[t[s]]=o[s];}}return i[e]},i=null,o={FLOAT:"float",FLOAT_VEC2:"vec2",FLOAT_VEC3:"vec3",FLOAT_VEC4:"vec4",INT:"int",INT_VEC2:"ivec2",INT_VEC3:"ivec3",INT_VEC4:"ivec4",BOOL:"bool",BOOL_VEC2:"bvec2",BOOL_VEC3:"bvec3",BOOL_VEC4:"bvec4",FLOAT_MAT2:"mat2",FLOAT_MAT3:"mat3",FLOAT_MAT4:"mat4",SAMPLER_2D:"sampler2D"};e.exports=n;},{}],22:[function(t,e,r){var n=function(t,e){return"precision"!==t.substring(0,9)?"precision "+e+" float;\n"+t:t};e.exports=n;},{}],23:[function(t,e,r){(function(t){function e(t,e){for(var r=0,n=t.length-1;n>=0;n--){var i=t[n];"."===i?t.splice(n,1):".."===i?(t.splice(n,1),r++):r&&(t.splice(n,1),r--);}if(e){ for(;r--;r){ t.unshift(".."); } }return t}function n(t,e){if(t.filter){ return t.filter(e); }for(var r=[],n=0;n<t.length;n++){ e(t[n],n,t)&&r.push(t[n]); }return r}var i=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/,o=function(t){return i.exec(t).slice(1)};r.resolve=function(){
var arguments$1 = arguments;
for(var r="",i=!1,o=arguments.length-1;o>=-1&&!i;o--){var s=o>=0?arguments$1[o]:t.cwd();if("string"!=typeof s){ throw new TypeError("Arguments to path.resolve must be strings"); }s&&(r=s+"/"+r,i="/"===s.charAt(0));}return r=e(n(r.split("/"),function(t){return!!t}),!i).join("/"),(i?"/":"")+r||"."},r.normalize=function(t){var i=r.isAbsolute(t),o="/"===s(t,-1);return t=e(n(t.split("/"),function(t){return!!t}),!i).join("/"),t||i||(t="."),t&&o&&(t+="/"),(i?"/":"")+t},r.isAbsolute=function(t){return"/"===t.charAt(0)},r.join=function(){var t=Array.prototype.slice.call(arguments,0);return r.normalize(n(t,function(t,e){if("string"!=typeof t){ throw new TypeError("Arguments to path.join must be strings"); }return t}).join("/"))},r.relative=function(t,e){function n(t){for(var e=0;e<t.length&&""===t[e];e++){  }for(var r=t.length-1;r>=0&&""===t[r];r--){  }return e>r?[]:t.slice(e,r-e+1)}t=r.resolve(t).substr(1),e=r.resolve(e).substr(1);for(var i=n(t.split("/")),o=n(e.split("/")),s=Math.min(i.length,o.length),a=s,u=0;u<s;u++){ if(i[u]!==o[u]){a=u;break} }for(var h=[],u=a;u<i.length;u++){ h.push(".."); }return h=h.concat(o.slice(a)),h.join("/")},r.sep="/",r.delimiter=":",r.dirname=function(t){var e=o(t),r=e[0],n=e[1];return r||n?(n&&(n=n.substr(0,n.length-1)),r+n):"."},r.basename=function(t,e){var r=o(t)[2];return e&&r.substr(-1*e.length)===e&&(r=r.substr(0,r.length-e.length)),r},r.extname=function(t){return o(t)[3]};var s="b"==="ab".substr(-1)?function(t,e,r){return t.substr(e,r)}:function(t,e,r){return e<0&&(e=t.length+e),t.substr(e,r)};}).call(this,t("_process"));},{_process:24}],24:[function(t,e,r){function n(){throw new Error("setTimeout has not been defined")}function i(){throw new Error("clearTimeout has not been defined")}function o(t){if(c===setTimeout){ return setTimeout(t,0); }if((c===n||!c)&&setTimeout){ return c=setTimeout,
setTimeout(t,0); }try{return c(t,0)}catch(e){try{return c.call(null,t,0)}catch(e){return c.call(this,t,0)}}}function s(t){if(f===clearTimeout){ return clearTimeout(t); }if((f===i||!f)&&clearTimeout){ return f=clearTimeout,clearTimeout(t); }try{return f(t)}catch(e){try{return f.call(null,t)}catch(e){return f.call(this,t)}}}function a(){y&&p&&(y=!1,p.length?v=p.concat(v):g=-1,v.length&&u());}function u(){if(!y){var t=o(a);y=!0;for(var e=v.length;e;){for(p=v,v=[];++g<e;){ p&&p[g].run(); }g=-1,e=v.length;}p=null,y=!1,s(t);}}function h(t,e){this.fun=t,this.array=e;}function l(){}var c,f,d=e.exports={};!function(){try{c="function"==typeof setTimeout?setTimeout:n;}catch(t){c=n;}try{f="function"==typeof clearTimeout?clearTimeout:i;}catch(t){f=i;}}();var p,v=[],y=!1,g=-1;d.nextTick=function(t){
var arguments$1 = arguments;
var e=new Array(arguments.length-1);if(arguments.length>1){ for(var r=1;r<arguments.length;r++){ e[r-1]=arguments$1[r]; } }v.push(new h(t,e)),1!==v.length||y||o(u);},h.prototype.run=function(){this.fun.apply(null,this.array);},d.title="browser",d.browser=!0,d.env={},d.argv=[],d.version="",d.versions={},d.on=l,d.addListener=l,d.once=l,d.off=l,d.removeListener=l,d.removeAllListeners=l,d.emit=l,d.binding=function(t){throw new Error("process.binding is not supported")},d.cwd=function(){return"/"},d.chdir=function(t){throw new Error("process.chdir is not supported")},d.umask=function(){return 0};},{}],25:[function(e,r,n){(function(e){!function(i){function o(t){throw new RangeError(L[t])}function s(t,e){for(var r=t.length,n=[];r--;){ n[r]=e(t[r]); }return n}function a(t,e){var r=t.split("@"),n="";r.length>1&&(n=r[0]+"@",t=r[1]),t=t.replace(D,".");var i=t.split("."),o=s(i,e).join(".");return n+o}function u(t){for(var e,r,n=[],i=0,o=t.length;i<o;){ e=t.charCodeAt(i++),e>=55296&&e<=56319&&i<o?(r=t.charCodeAt(i++),56320==(64512&r)?n.push(((1023&e)<<10)+(1023&r)+65536):(n.push(e),i--)):n.push(e); }return n}function h(t){return s(t,function(t){var e="";return t>65535&&(t-=65536,e+=B(t>>>10&1023|55296),t=56320|1023&t),e+=B(t)}).join("")}function l(t){return t-48<10?t-22:t-65<26?t-65:t-97<26?t-97:w}function c(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function f(t,e,r){var n=0;for(t=r?F(t/P):t>>1,t+=F(t/e);t>N*S>>1;n+=w){ t=F(t/N); }return F(n+(N+1)*t/(t+O))}function d(t){var e,r,n,i,s,a,u,c,d,p,v=[],y=t.length,g=0,m=C,_=M;for(r=t.lastIndexOf(R),r<0&&(r=0),n=0;n<r;++n){ t.charCodeAt(n)>=128&&o("not-basic"),v.push(t.charCodeAt(n)); }for(i=r>0?r+1:0;i<y;){for(s=g,a=1,u=w;i>=y&&o("invalid-input"),c=l(t.charCodeAt(i++)),(c>=w||c>F((T-g)/a))&&o("overflow"),g+=c*a,d=u<=_?E:u>=_+S?S:u-_,!(c<d);u+=w){ p=w-d,a>F(T/p)&&o("overflow"),a*=p; }e=v.length+1,_=f(g-s,e,0==s),F(g/e)>T-m&&o("overflow"),m+=F(g/e),g%=e,v.splice(g++,0,m);}return h(v)}function p(t){var e,r,n,i,s,a,h,l,d,p,v,y,g,m,_,b=[];for(t=u(t),y=t.length,e=C,r=0,s=M,a=0;a<y;++a){ v=t[a],v<128&&b.push(B(v)); }for(n=i=b.length,i&&b.push(R);n<y;){for(h=T,a=0;a<y;++a){ v=t[a],v>=e&&v<h&&(h=v); }for(g=n+1,h-e>F((T-r)/g)&&o("overflow"),r+=(h-e)*g,e=h,a=0;a<y;++a){ if(v=t[a],v<e&&++r>T&&o("overflow"),v==e){for(l=r,d=w;p=d<=s?E:d>=s+S?S:d-s,!(l<p);d+=w){ _=l-p,m=w-p,b.push(B(c(p+_%m,0))),l=F(_/m); }b.push(B(c(l,0))),s=f(r,g,n==i),r=0,++n;} }++r,++e;}return b.join("")}function v(t){return a(t,function(t){return A.test(t)?d(t.slice(4).toLowerCase()):t})}function y(t){return a(t,function(t){return I.test(t)?"xn--"+p(t):t})}var g="object"==typeof n&&n&&!n.nodeType&&n,m="object"==typeof r&&r&&!r.nodeType&&r,_="object"==typeof e&&e;_.global!==_&&_.window!==_&&_.self!==_||(i=_);var b,x,T=2147483647,w=36,E=1,S=26,O=38,P=700,M=72,C=128,R="-",A=/^xn--/,I=/[^\x20-\x7E]/,D=/[\x2E\u3002\uFF0E\uFF61]/g,L={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},N=w-E,F=Math.floor,B=String.fromCharCode;if(b={version:"1.4.1",ucs2:{decode:u,encode:h},decode:d,encode:p,toASCII:y,toUnicode:v},"function"==typeof t&&"object"==typeof t.amd&&t.amd){ t("punycode",function(){return b}); }else if(g&&m){ if(r.exports==g){ m.exports=b; }else { for(x in b){ b.hasOwnProperty(x)&&(g[x]=b[x]); } } }else { i.punycode=b; }}(this);}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{}],26:[function(t,e,r){"use strict";function n(t,e){return Object.prototype.hasOwnProperty.call(t,e)}e.exports=function(t,e,r,o){e=e||"&",r=r||"=";var s={};if("string"!=typeof t||0===t.length){ return s; }var a=/\+/g;t=t.split(e);var u=1e3;o&&"number"==typeof o.maxKeys&&(u=o.maxKeys);var h=t.length;u>0&&h>u&&(h=u);for(var l=0;l<h;++l){var c,f,d,p,v=t[l].replace(a,"%20"),y=v.indexOf(r);y>=0?(c=v.substr(0,y),f=v.substr(y+1)):(c=v,f=""),d=decodeURIComponent(c),p=decodeURIComponent(f),n(s,d)?i(s[d])?s[d].push(p):s[d]=[s[d],p]:s[d]=p;}return s};var i=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)};},{}],27:[function(t,e,r){"use strict";function n(t,e){if(t.map){ return t.map(e); }for(var r=[],n=0;n<t.length;n++){ r.push(e(t[n],n)); }return r}var i=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}};e.exports=function(t,e,r,a){return e=e||"&",r=r||"=",null===t&&(t=void 0),"object"==typeof t?n(s(t),function(s){var a=encodeURIComponent(i(s))+r;return o(t[s])?n(t[s],function(t){return a+encodeURIComponent(i(t))}).join(e):a+encodeURIComponent(i(t[s]))}).join(e):a?encodeURIComponent(i(a))+r+encodeURIComponent(i(t)):""};var o=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)},s=Object.keys||function(t){var e=[];for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&e.push(r); }return e};},{}],28:[function(t,e,r){"use strict";r.decode=r.parse=t("./decode"),r.encode=r.stringify=t("./encode");},{"./decode":26,"./encode":27}],29:[function(t,e,r){"use strict";function n(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null;}function i(t,e,r){if(t&&h.isObject(t)&&t instanceof n){ return t; }var i=new n;return i.parse(t,e,r),i}function o(t){return h.isString(t)&&(t=i(t)),t instanceof n?t.format():n.prototype.format.call(t)}function s(t,e){return i(t,!1,!0).resolve(e)}function a(t,e){return t?i(t,!1,!0).resolveObject(e):e}var u=t("punycode"),h=t("./util");r.parse=i,r.resolve=s,r.resolveObject=a,r.format=o,r.Url=n;var l=/^([a-z0-9.+-]+:)/i,c=/:[0-9]*$/,f=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,d=["<",">",'"',"`"," ","\r","\n","\t"],p=["{","}","|","\\","^","`"].concat(d),v=["'"].concat(p),y=["%","/","?",";","#"].concat(v),g=["/","?","#"],m=255,_=/^[+a-z0-9A-Z_-]{0,63}$/,b=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,x={javascript:!0,"javascript:":!0},T={javascript:!0,"javascript:":!0},w={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0},E=t("querystring");n.prototype.parse=function(t,e,r){
var this$1 = this;
if(!h.isString(t)){ throw new TypeError("Parameter 'url' must be a string, not "+typeof t); }var n=t.indexOf("?"),i=n!==-1&&n<t.indexOf("#")?"?":"#",o=t.split(i),s=/\\/g;o[0]=o[0].replace(s,"/"),t=o.join(i);var a=t;if(a=a.trim(),!r&&1===t.split("#").length){var c=f.exec(a);if(c){ return this.path=a,this.href=a,this.pathname=c[1],c[2]?(this.search=c[2],e?this.query=E.parse(this.search.substr(1)):this.query=this.search.substr(1)):e&&(this.search="",this.query={}),this }}var d=l.exec(a);if(d){d=d[0];var p=d.toLowerCase();this.protocol=p,a=a.substr(d.length);}if(r||d||a.match(/^\/\/[^@\/]+@[^@\/]+/)){var S="//"===a.substr(0,2);!S||d&&T[d]||(a=a.substr(2),this.slashes=!0);}if(!T[d]&&(S||d&&!w[d])){for(var O=-1,P=0;P<g.length;P++){var M=a.indexOf(g[P]);M!==-1&&(O===-1||M<O)&&(O=M);}var C,R;R=O===-1?a.lastIndexOf("@"):a.lastIndexOf("@",O),R!==-1&&(C=a.slice(0,R),a=a.slice(R+1),this.auth=decodeURIComponent(C)),O=-1;for(var P=0;P<y.length;P++){var M=a.indexOf(y[P]);M!==-1&&(O===-1||M<O)&&(O=M);}O===-1&&(O=a.length),this.host=a.slice(0,O),a=a.slice(O),this.parseHost(),this.hostname=this.hostname||"";var A="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!A){ for(var I=this.hostname.split(/\./),P=0,D=I.length;P<D;P++){var L=I[P];if(L&&!L.match(_)){for(var N="",F=0,B=L.length;F<B;F++){ N+=L.charCodeAt(F)>127?"x":L[F]; }if(!N.match(_)){var j=I.slice(0,P),k=I.slice(P+1),U=L.match(b);U&&(j.push(U[1]),k.unshift(U[2])),k.length&&(a="/"+k.join(".")+a),this$1.hostname=j.join(".");break}}} }this.hostname.length>m?this.hostname="":this.hostname=this.hostname.toLowerCase(),A||(this.hostname=u.toASCII(this.hostname));var X=this.port?":"+this.port:"",G=this.hostname||"";this.host=G+X,this.href+=this.host,A&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==a[0]&&(a="/"+a));}if(!x[p]){ for(var P=0,D=v.length;P<D;P++){var W=v[P];if(a.indexOf(W)!==-1){var H=encodeURIComponent(W);H===W&&(H=escape(W)),a=a.split(W).join(H);}} }var V=a.indexOf("#");V!==-1&&(this.hash=a.substr(V),a=a.slice(0,V));var Y=a.indexOf("?");if(Y!==-1?(this.search=a.substr(Y),this.query=a.substr(Y+1),e&&(this.query=E.parse(this.query)),a=a.slice(0,Y)):e&&(this.search="",this.query={}),a&&(this.pathname=a),w[p]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){var X=this.pathname||"",z=this.search||"";this.path=X+z;}return this.href=this.format(),this},n.prototype.format=function(){var t=this.auth||"";t&&(t=encodeURIComponent(t),t=t.replace(/%3A/i,":"),t+="@");var e=this.protocol||"",r=this.pathname||"",n=this.hash||"",i=!1,o="";this.host?i=t+this.host:this.hostname&&(i=t+(this.hostname.indexOf(":")===-1?this.hostname:"["+this.hostname+"]"),this.port&&(i+=":"+this.port)),this.query&&h.isObject(this.query)&&Object.keys(this.query).length&&(o=E.stringify(this.query));var s=this.search||o&&"?"+o||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||w[e])&&i!==!1?(i="//"+(i||""),r&&"/"!==r.charAt(0)&&(r="/"+r)):i||(i=""),n&&"#"!==n.charAt(0)&&(n="#"+n),s&&"?"!==s.charAt(0)&&(s="?"+s),r=r.replace(/[?#]/g,function(t){return encodeURIComponent(t)}),s=s.replace("#","%23"),e+i+r+s+n},n.prototype.resolve=function(t){return this.resolveObject(i(t,!1,!0)).format()},n.prototype.resolveObject=function(t){
var this$1 = this;
if(h.isString(t)){var e=new n;e.parse(t,!1,!0),t=e;}for(var r=new n,i=Object.keys(this),o=0;o<i.length;o++){var s=i[o];r[s]=this$1[s];}if(r.hash=t.hash,""===t.href){ return r.href=r.format(),r; }if(t.slashes&&!t.protocol){for(var a=Object.keys(t),u=0;u<a.length;u++){var l=a[u];"protocol"!==l&&(r[l]=t[l]);}return w[r.protocol]&&r.hostname&&!r.pathname&&(r.path=r.pathname="/"),r.href=r.format(),r}if(t.protocol&&t.protocol!==r.protocol){if(!w[t.protocol]){for(var c=Object.keys(t),f=0;f<c.length;f++){var d=c[f];r[d]=t[d];}return r.href=r.format(),r}if(r.protocol=t.protocol,t.host||T[t.protocol]){ r.pathname=t.pathname; }else{for(var p=(t.pathname||"").split("/");p.length&&!(t.host=p.shift());){  }t.host||(t.host=""),t.hostname||(t.hostname=""),""!==p[0]&&p.unshift(""),p.length<2&&p.unshift(""),r.pathname=p.join("/");}if(r.search=t.search,r.query=t.query,r.host=t.host||"",r.auth=t.auth,r.hostname=t.hostname||t.host,r.port=t.port,r.pathname||r.search){var v=r.pathname||"",y=r.search||"";r.path=v+y;}return r.slashes=r.slashes||t.slashes,r.href=r.format(),r}var g=r.pathname&&"/"===r.pathname.charAt(0),m=t.host||t.pathname&&"/"===t.pathname.charAt(0),_=m||g||r.host&&t.pathname,b=_,x=r.pathname&&r.pathname.split("/")||[],p=t.pathname&&t.pathname.split("/")||[],E=r.protocol&&!w[r.protocol];if(E&&(r.hostname="",r.port=null,r.host&&(""===x[0]?x[0]=r.host:x.unshift(r.host)),r.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===p[0]?p[0]=t.host:p.unshift(t.host)),t.host=null),_=_&&(""===p[0]||""===x[0])),m){ r.host=t.host||""===t.host?t.host:r.host,r.hostname=t.hostname||""===t.hostname?t.hostname:r.hostname,r.search=t.search,r.query=t.query,x=p; }else if(p.length){ x||(x=[]),x.pop(),x=x.concat(p),r.search=t.search,r.query=t.query; }else if(!h.isNullOrUndefined(t.search)){if(E){r.hostname=r.host=x.shift();var S=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@");S&&(r.auth=S.shift(),r.host=r.hostname=S.shift());}return r.search=t.search,r.query=t.query,h.isNull(r.pathname)&&h.isNull(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.href=r.format(),r}if(!x.length){ return r.pathname=null,r.search?r.path="/"+r.search:r.path=null,r.href=r.format(),r; }for(var O=x.slice(-1)[0],P=(r.host||t.host||x.length>1)&&("."===O||".."===O)||""===O,M=0,C=x.length;C>=0;C--){ O=x[C],"."===O?x.splice(C,1):".."===O?(x.splice(C,1),M++):M&&(x.splice(C,1),M--); }if(!_&&!b){ for(;M--;M){ x.unshift(".."); } }!_||""===x[0]||x[0]&&"/"===x[0].charAt(0)||x.unshift(""),P&&"/"!==x.join("/").substr(-1)&&x.push("");var R=""===x[0]||x[0]&&"/"===x[0].charAt(0);if(E){r.hostname=r.host=R?"":x.length?x.shift():"";var S=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@");S&&(r.auth=S.shift(),r.host=r.hostname=S.shift());}return _=_||r.host&&x.length,_&&!R&&x.unshift(""),x.length?r.pathname=x.join("/"):(r.pathname=null,r.path=null),h.isNull(r.pathname)&&h.isNull(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.auth=t.auth||r.auth,r.slashes=r.slashes||t.slashes,r.href=r.format(),r},n.prototype.parseHost=function(){var t=this.host,e=c.exec(t);e&&(e=e[0],":"!==e&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t);};},{"./util":30,punycode:25,querystring:28}],30:[function(t,e,r){"use strict";e.exports={isString:function(t){return"string"==typeof t},isObject:function(t){return"object"==typeof t&&null!==t},isNull:function(t){return null===t},isNullOrUndefined:function(t){return null==t}};},{}],31:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},a=t("mini-signals"),u=i(a),h=t("parse-uri"),l=i(h),c=t("./async"),f=n(c),d=t("./Resource"),p=i(d),v=100,y=/(#[\w-]+)?$/,g=function(){function t(){var e=this,r=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:10;o(this,t),this.baseUrl=r,this.progress=0,this.loading=!1,this.defaultQueryString="",this._beforeMiddleware=[],this._afterMiddleware=[],this._resourcesParsing=[],this._boundLoadResource=function(t,r){return e._loadResource(t,r)},this._queue=f.queue(this._boundLoadResource,n),this._queue.pause(),this.resources={},this.onProgress=new u.default,this.onError=new u.default,this.onLoad=new u.default,this.onStart=new u.default,this.onComplete=new u.default;}return t.prototype.add=function(t,e,r,n){
var this$1 = this;
if(Array.isArray(t)){for(var i=0;i<t.length;++i){ this$1.add(t[i]); }return this}if("object"===("undefined"==typeof t?"undefined":s(t))&&(n=e||t.callback||t.onComplete,r=t,e=t.url,t=t.name||t.key||t.url),"string"!=typeof e&&(n=r,r=e,e=t),"string"!=typeof e){ throw new Error("No url passed to add resource to loader."); }if("function"==typeof r&&(n=r,r=null),this.loading&&(!r||!r.parentResource)){ throw new Error("Cannot add resources while the loader is running."); }if(this.resources[t]){ throw new Error('Resource named "'+t+'" already exists.'); }if(e=this._prepareUrl(e),this.resources[t]=new p.default(t,e,r),"function"==typeof n&&this.resources[t].onAfterMiddleware.once(n),this.loading){for(var o=r.parentResource,a=[],u=0;u<o.children.length;++u){ o.children[u].isComplete||a.push(o.children[u]); }var h=o.progressChunk*(a.length+1),l=h/(a.length+2);o.children.push(this.resources[t]),o.progressChunk=l;for(var c=0;c<a.length;++c){ a[c].progressChunk=l; }this.resources[t].progressChunk=l;}return this._queue.push(this.resources[t]),this},t.prototype.pre=function(t){return this._beforeMiddleware.push(t),this},t.prototype.use=function(t){return this._afterMiddleware.push(t),this},t.prototype.reset=function(){
var this$1 = this;
this.progress=0,this.loading=!1,this._queue.kill(),this._queue.pause();for(var t in this.resources){var e=this$1.resources[t];e._onLoadBinding&&e._onLoadBinding.detach(),e.isLoading&&e.abort();}return this.resources={},this},t.prototype.load=function(t){
var this$1 = this;
if("function"==typeof t&&this.onComplete.once(t),this.loading){ return this; }for(var e=100/this._queue._tasks.length,r=0;r<this._queue._tasks.length;++r){ this$1._queue._tasks[r].data.progressChunk=e; }return this.loading=!0,this.onStart.dispatch(this),this._queue.resume(),this},t.prototype._prepareUrl=function(t){var e=(0,l.default)(t,{strictMode:!0}),r=void 0;if(r=e.protocol||!e.path||0===t.indexOf("//")?t:this.baseUrl.length&&this.baseUrl.lastIndexOf("/")!==this.baseUrl.length-1&&"/"!==t.charAt(0)?this.baseUrl+"/"+t:this.baseUrl+t,this.defaultQueryString){var n=y.exec(r)[0];r=r.substr(0,r.length-n.length),r+=r.indexOf("?")!==-1?"&"+this.defaultQueryString:"?"+this.defaultQueryString,r+=n;}return r},t.prototype._loadResource=function(t,e){var r=this;t._dequeue=e,f.eachSeries(this._beforeMiddleware,function(e,n){e.call(r,t,function(){n(t.isComplete?{}:null);});},function(){t.isComplete?r._onLoad(t):(t._onLoadBinding=t.onComplete.once(r._onLoad,r),t.load());});},t.prototype._onComplete=function(){this.loading=!1,this.onComplete.dispatch(this,this.resources);},t.prototype._onLoad=function(t){var e=this;t._onLoadBinding=null,t._dequeue(),this._resourcesParsing.push(t),f.eachSeries(this._afterMiddleware,function(r,n){r.call(e,t,n);},function(){t.onAfterMiddleware.dispatch(t),e.progress+=t.progressChunk,e.onProgress.dispatch(e,t),t.error?e.onError.dispatch(t.error,e,t):e.onLoad.dispatch(e,t),e._resourcesParsing.splice(e._resourcesParsing.indexOf(t),1),e._queue.idle()&&0===e._resourcesParsing.length&&(e.progress=v,e._onComplete());});},t}();r.default=g;},{"./Resource":32,"./async":33,"mini-signals":37,"parse-uri":38}],32:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(){}function s(t,e,r){e&&0===e.indexOf(".")&&(e=e.substring(1)),e&&(t[e]=r);}function a(t){return t.toString().replace("object ","")}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("parse-uri"),l=n(h),c=t("mini-signals"),f=n(c),d=!(!window.XDomainRequest||"withCredentials"in new XMLHttpRequest),p=null,v=0,y=200,g=204,m=1223,_=2,b=function(){function t(e,r,n){if(i(this,t),"string"!=typeof e||"string"!=typeof r){ throw new Error("Both name and url are required for constructing a resource."); }n=n||{},this._flags=0,this._setFlag(t.STATUS_FLAGS.DATA_URL,0===r.indexOf("data:")),this.name=e,this.url=r,this.extension=this._getExtension(),this.data=null,this.crossOrigin=n.crossOrigin===!0?"anonymous":n.crossOrigin,this.loadType=n.loadType||this._determineLoadType(),this.xhrType=n.xhrType,this.metadata=n.metadata||{},this.error=null,this.xhr=null,this.children=[],this.type=t.TYPE.UNKNOWN,this.progressChunk=0,this._dequeue=o,this._onLoadBinding=null,this._boundComplete=this.complete.bind(this),this._boundOnError=this._onError.bind(this),this._boundOnProgress=this._onProgress.bind(this),this._boundXhrOnError=this._xhrOnError.bind(this),this._boundXhrOnAbort=this._xhrOnAbort.bind(this),this._boundXhrOnLoad=this._xhrOnLoad.bind(this),this._boundXdrOnTimeout=this._xdrOnTimeout.bind(this),this.onStart=new f.default,this.onProgress=new f.default,this.onComplete=new f.default,this.onAfterMiddleware=new f.default;}return t.setExtensionLoadType=function(e,r){s(t._loadTypeMap,e,r);},t.setExtensionXhrType=function(e,r){s(t._xhrTypeMap,e,r);},t.prototype.complete=function(){if(this.data&&this.data.removeEventListener&&(this.data.removeEventListener("error",this._boundOnError,!1),this.data.removeEventListener("load",this._boundComplete,!1),this.data.removeEventListener("progress",this._boundOnProgress,!1),this.data.removeEventListener("canplaythrough",this._boundComplete,!1)),this.xhr&&(this.xhr.removeEventListener?(this.xhr.removeEventListener("error",this._boundXhrOnError,!1),this.xhr.removeEventListener("abort",this._boundXhrOnAbort,!1),this.xhr.removeEventListener("progress",this._boundOnProgress,!1),this.xhr.removeEventListener("load",this._boundXhrOnLoad,!1)):(this.xhr.onerror=null,this.xhr.ontimeout=null,this.xhr.onprogress=null,this.xhr.onload=null)),this.isComplete){ throw new Error("Complete called again for an already completed resource."); }this._setFlag(t.STATUS_FLAGS.COMPLETE,!0),this._setFlag(t.STATUS_FLAGS.LOADING,!1),this.onComplete.dispatch(this);},t.prototype.abort=function(e){
var this$1 = this;
if(!this.error){if(this.error=new Error(e),this.xhr){ this.xhr.abort(); }else if(this.xdr){ this.xdr.abort(); }else if(this.data){ if(this.data.src){ this.data.src=t.EMPTY_GIF; }else { for(;this.data.firstChild;){ this$1.data.removeChild(this$1.data.firstChild); } } }this.complete();}},t.prototype.load=function(e){var r=this;if(!this.isLoading){if(this.isComplete){ return void(e&&setTimeout(function(){return e(r)},1)); }switch(e&&this.onComplete.once(e),this._setFlag(t.STATUS_FLAGS.LOADING,!0),this.onStart.dispatch(this),this.crossOrigin!==!1&&"string"==typeof this.crossOrigin||(this.crossOrigin=this._determineCrossOrigin(this.url)),this.loadType){case t.LOAD_TYPE.IMAGE:this.type=t.TYPE.IMAGE,this._loadElement("image");break;case t.LOAD_TYPE.AUDIO:this.type=t.TYPE.AUDIO,this._loadSourceElement("audio");break;case t.LOAD_TYPE.VIDEO:this.type=t.TYPE.VIDEO,this._loadSourceElement("video");break;case t.LOAD_TYPE.XHR:default:d&&this.crossOrigin?this._loadXdr():this._loadXhr();}}},t.prototype._hasFlag=function(t){return!!(this._flags&t)},t.prototype._setFlag=function(t,e){this._flags=e?this._flags|t:this._flags&~t;},t.prototype._loadElement=function(t){this.metadata.loadElement?this.data=this.metadata.loadElement:"image"===t&&"undefined"!=typeof window.Image?this.data=new Image:this.data=document.createElement(t),this.crossOrigin&&(this.data.crossOrigin=this.crossOrigin),this.metadata.skipSource||(this.data.src=this.url),this.data.addEventListener("error",this._boundOnError,!1),this.data.addEventListener("load",this._boundComplete,!1),this.data.addEventListener("progress",this._boundOnProgress,!1);},t.prototype._loadSourceElement=function(t){
var this$1 = this;
if(this.metadata.loadElement?this.data=this.metadata.loadElement:"audio"===t&&"undefined"!=typeof window.Audio?this.data=new Audio:this.data=document.createElement(t),null===this.data){ return void this.abort("Unsupported element: "+t); }if(!this.metadata.skipSource){ if(navigator.isCocoonJS){ this.data.src=Array.isArray(this.url)?this.url[0]:this.url; }else if(Array.isArray(this.url)){ for(var e=0;e<this.url.length;++e){ this$1.data.appendChild(this$1._createSource(t,this$1.url[e])); } }else { this.data.appendChild(this._createSource(t,this.url)); } }this.data.addEventListener("error",this._boundOnError,!1),this.data.addEventListener("load",this._boundComplete,!1),this.data.addEventListener("progress",this._boundOnProgress,!1),this.data.addEventListener("canplaythrough",this._boundComplete,!1),this.data.load();},t.prototype._loadXhr=function(){"string"!=typeof this.xhrType&&(this.xhrType=this._determineXhrType());var e=this.xhr=new XMLHttpRequest;e.open("GET",this.url,!0),this.xhrType===t.XHR_RESPONSE_TYPE.JSON||this.xhrType===t.XHR_RESPONSE_TYPE.DOCUMENT?e.responseType=t.XHR_RESPONSE_TYPE.TEXT:e.responseType=this.xhrType,e.addEventListener("error",this._boundXhrOnError,!1),e.addEventListener("abort",this._boundXhrOnAbort,!1),e.addEventListener("progress",this._boundOnProgress,!1),e.addEventListener("load",this._boundXhrOnLoad,!1),e.send();},t.prototype._loadXdr=function(){"string"!=typeof this.xhrType&&(this.xhrType=this._determineXhrType());var t=this.xhr=new XDomainRequest;t.timeout=5e3,t.onerror=this._boundXhrOnError,t.ontimeout=this._boundXdrOnTimeout,t.onprogress=this._boundOnProgress,t.onload=this._boundXhrOnLoad,t.open("GET",this.url,!0),setTimeout(function(){return t.send()},1);},t.prototype._createSource=function(t,e,r){r||(r=t+"/"+e.substr(e.lastIndexOf(".")+1));var n=document.createElement("source");return n.src=e,n.type=r,n},t.prototype._onError=function(t){this.abort("Failed to load element using: "+t.target.nodeName);},t.prototype._onProgress=function(t){t&&t.lengthComputable&&this.onProgress.dispatch(this,t.loaded/t.total);},t.prototype._xhrOnError=function(){var t=this.xhr;this.abort(a(t)+" Request failed. Status: "+t.status+', text: "'+t.statusText+'"');},t.prototype._xhrOnAbort=function(){this.abort(a(this.xhr)+" Request was aborted by the user.");},t.prototype._xdrOnTimeout=function(){this.abort(a(this.xhr)+" Request timed out.");},t.prototype._xhrOnLoad=function(){var e=this.xhr,r="",n="undefined"==typeof e.status?y:e.status;""!==e.responseType&&"text"!==e.responseType&&"undefined"!=typeof e.responseType||(r=e.responseText),n===v&&r.length>0?n=y:n===m&&(n=g);var i=n/100|0;if(i!==_){ return void this.abort("["+e.status+"] "+e.statusText+": "+e.responseURL); }if(this.xhrType===t.XHR_RESPONSE_TYPE.TEXT){ this.data=r,this.type=t.TYPE.TEXT; }else if(this.xhrType===t.XHR_RESPONSE_TYPE.JSON){ try{this.data=JSON.parse(r),this.type=t.TYPE.JSON;}catch(t){return void this.abort("Error trying to parse loaded json: "+t)} }else if(this.xhrType===t.XHR_RESPONSE_TYPE.DOCUMENT){ try{if(window.DOMParser){var o=new DOMParser;this.data=o.parseFromString(r,"text/xml");}else{var s=document.createElement("div");s.innerHTML=r,this.data=s;}this.type=t.TYPE.XML;}catch(t){return void this.abort("Error trying to parse loaded xml: "+t)} }else { this.data=e.response||r; }this.complete();},t.prototype._determineCrossOrigin=function(t,e){if(0===t.indexOf("data:")){ return""; }e=e||window.location,p||(p=document.createElement("a")),p.href=t,t=(0,l.default)(p.href,{strictMode:!0});var r=!t.port&&""===e.port||t.port===e.port,n=t.protocol?t.protocol+":":"";return t.host===e.hostname&&r&&n===e.protocol?"":"anonymous"},t.prototype._determineXhrType=function(){return t._xhrTypeMap[this.extension]||t.XHR_RESPONSE_TYPE.TEXT},t.prototype._determineLoadType=function(){return t._loadTypeMap[this.extension]||t.LOAD_TYPE.XHR},t.prototype._getExtension=function(){var t=this.url,e="";if(this.isDataUrl){var r=t.indexOf("/");e=t.substring(r+1,t.indexOf(";",r));}else{var n=t.indexOf("?");n!==-1&&(t=t.substring(0,n)),e=t.substring(t.lastIndexOf(".")+1);}return e.toLowerCase()},t.prototype._getMimeFromXhrType=function(e){switch(e){case t.XHR_RESPONSE_TYPE.BUFFER:return"application/octet-binary";case t.XHR_RESPONSE_TYPE.BLOB:return"application/blob";case t.XHR_RESPONSE_TYPE.DOCUMENT:return"application/xml";case t.XHR_RESPONSE_TYPE.JSON:return"application/json";case t.XHR_RESPONSE_TYPE.DEFAULT:case t.XHR_RESPONSE_TYPE.TEXT:default:return"text/plain"}},u(t,[{key:"isDataUrl",get:function(){return this._hasFlag(t.STATUS_FLAGS.DATA_URL)}},{key:"isComplete",get:function(){return this._hasFlag(t.STATUS_FLAGS.COMPLETE)}},{key:"isLoading",get:function(){return this._hasFlag(t.STATUS_FLAGS.LOADING)}}]),t}();r.default=b,b.STATUS_FLAGS={NONE:0,DATA_URL:1,COMPLETE:2,LOADING:4},b.TYPE={UNKNOWN:0,JSON:1,XML:2,IMAGE:3,AUDIO:4,VIDEO:5,TEXT:6},b.LOAD_TYPE={XHR:1,IMAGE:2,AUDIO:3,VIDEO:4},b.XHR_RESPONSE_TYPE={DEFAULT:"text",BUFFER:"arraybuffer",BLOB:"blob",DOCUMENT:"document",JSON:"json",TEXT:"text"},b._loadTypeMap={gif:b.LOAD_TYPE.IMAGE,png:b.LOAD_TYPE.IMAGE,bmp:b.LOAD_TYPE.IMAGE,jpg:b.LOAD_TYPE.IMAGE,jpeg:b.LOAD_TYPE.IMAGE,tif:b.LOAD_TYPE.IMAGE,tiff:b.LOAD_TYPE.IMAGE,webp:b.LOAD_TYPE.IMAGE,tga:b.LOAD_TYPE.IMAGE,svg:b.LOAD_TYPE.IMAGE,"svg+xml":b.LOAD_TYPE.IMAGE,mp3:b.LOAD_TYPE.AUDIO,ogg:b.LOAD_TYPE.AUDIO,wav:b.LOAD_TYPE.AUDIO,mp4:b.LOAD_TYPE.VIDEO,webm:b.LOAD_TYPE.VIDEO},b._xhrTypeMap={xhtml:b.XHR_RESPONSE_TYPE.DOCUMENT,html:b.XHR_RESPONSE_TYPE.DOCUMENT,htm:b.XHR_RESPONSE_TYPE.DOCUMENT,xml:b.XHR_RESPONSE_TYPE.DOCUMENT,tmx:b.XHR_RESPONSE_TYPE.DOCUMENT,svg:b.XHR_RESPONSE_TYPE.DOCUMENT,tsx:b.XHR_RESPONSE_TYPE.DOCUMENT,gif:b.XHR_RESPONSE_TYPE.BLOB,png:b.XHR_RESPONSE_TYPE.BLOB,bmp:b.XHR_RESPONSE_TYPE.BLOB,jpg:b.XHR_RESPONSE_TYPE.BLOB,jpeg:b.XHR_RESPONSE_TYPE.BLOB,tif:b.XHR_RESPONSE_TYPE.BLOB,tiff:b.XHR_RESPONSE_TYPE.BLOB,webp:b.XHR_RESPONSE_TYPE.BLOB,tga:b.XHR_RESPONSE_TYPE.BLOB,json:b.XHR_RESPONSE_TYPE.JSON,text:b.XHR_RESPONSE_TYPE.TEXT,txt:b.XHR_RESPONSE_TYPE.TEXT,ttf:b.XHR_RESPONSE_TYPE.BUFFER,otf:b.XHR_RESPONSE_TYPE.BUFFER},b.EMPTY_GIF="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";},{"mini-signals":37,"parse-uri":38}],33:[function(t,e,r){"use strict";function n(){}function i(t,e,r){var n=0,i=t.length;!function o(s){return s||n===i?void(r&&r(s)):void e(t[n++],o)}();}function o(t){return function(){if(null===t){ throw new Error("Callback was already called."); }var e=t;t=null,e.apply(this,arguments);}}function s(t,e){function r(t,e,r){if(null!=r&&"function"!=typeof r){ throw new Error("task callback must be a function"); }if(a.started=!0,null==t&&a.idle()){ return void setTimeout(function(){return a.drain()},1); }var i={data:t,callback:"function"==typeof r?r:n};e?a._tasks.unshift(i):a._tasks.push(i),setTimeout(function(){return a.process()},1);}function i(t){return function(){s-=1,t.callback.apply(t,arguments),null!=arguments[0]&&a.error(arguments[0],t.data),s<=a.concurrency-a.buffer&&a.unsaturated(),a.idle()&&a.drain(),a.process();}}if(null==e){ e=1; }else if(0===e){ throw new Error("Concurrency must not be zero"); }var s=0,a={_tasks:[],concurrency:e,saturated:n,unsaturated:n,buffer:e/4,empty:n,drain:n,error:n,started:!1,paused:!1,push:function(t,e){r(t,!1,e);},kill:function(){s=0,a.drain=n,a.started=!1,a._tasks=[];},unshift:function(t,e){r(t,!0,e);},process:function(){for(;!a.paused&&s<a.concurrency&&a._tasks.length;){var e=a._tasks.shift();0===a._tasks.length&&a.empty(),s+=1,s===a.concurrency&&a.saturated(),t(e.data,o(i(e)));}},length:function(){return a._tasks.length},running:function(){return s},idle:function(){return a._tasks.length+s===0},pause:function(){a.paused!==!0&&(a.paused=!0);},resume:function(){if(a.paused!==!1){a.paused=!1;for(var t=1;t<=a.concurrency;t++){ a.process(); }}}};return a}r.__esModule=!0,r.eachSeries=i,r.queue=s;},{}],34:[function(t,e,r){"use strict";function n(t){for(var e="",r=0;r<t.length;){for(var n=[0,0,0],o=[0,0,0,0],s=0;s<n.length;++s){ r<t.length?n[s]=255&t.charCodeAt(r++):n[s]=0; }o[0]=n[0]>>2,o[1]=(3&n[0])<<4|n[1]>>4,o[2]=(15&n[1])<<2|n[2]>>6,o[3]=63&n[2];var a=r-(t.length-1);switch(a){case 2:o[3]=64,o[2]=64;break;case 1:o[3]=64;}for(var u=0;u<o.length;++u){ e+=i.charAt(o[u]); }}return e}r.__esModule=!0,r.encodeBinary=n;var i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";},{}],35:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var o=t("./Loader"),s=i(o),a=t("./Resource"),u=i(a),h=t("./async"),l=n(h),c=t("./b64"),f=n(c);s.default.Resource=u.default,s.default.async=l,s.default.base64=f,e.exports=s.default,r.default=s.default;},{"./Loader":31,"./Resource":32,"./async":33,"./b64":34}],36:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(){return function(t,e){if(!t.data){ return void e(); }if(t.xhr&&t.xhrType===a.default.XHR_RESPONSE_TYPE.BLOB){ if(window.Blob&&"string"!=typeof t.data){if(0===t.data.type.indexOf("image")){var r=function(){var r=l.createObjectURL(t.data);return t.blob=t.data,t.data=new Image,t.data.src=r,t.type=a.default.TYPE.IMAGE,t.data.onload=function(){l.revokeObjectURL(r),t.data.onload=null,e();},{v:void 0}}();if("object"===("undefined"==typeof r?"undefined":o(r))){ return r.v }}}else{var n=t.xhr.getResponseHeader("content-type");if(n&&0===n.indexOf("image")){ return t.data=new Image,t.data.src="data:"+n+";base64,"+h.default.encodeBinary(t.xhr.responseText),
t.type=a.default.TYPE.IMAGE,void(t.data.onload=function(){t.data.onload=null,e();}) }} }e();}}r.__esModule=!0;var o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};r.blobMiddlewareFactory=i;var s=t("../../Resource"),a=n(s),u=t("../../b64"),h=n(u),l=window.URL||window.webkitURL;},{"../../Resource":32,"../../b64":34}],37:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function i(t,e){return t._head?(t._tail._next=e,e._prev=t._tail,t._tail=e):(t._head=e,t._tail=e),e._owner=t,e}Object.defineProperty(r,"__esModule",{value:!0});var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=function(){function t(e,r,i){void 0===r&&(r=!1),n(this,t),this._fn=e,this._once=r,this._thisArg=i,this._next=this._prev=this._owner=null;}return o(t,[{key:"detach",value:function(){return null!==this._owner&&(this._owner.detach(this),!0)}}]),t}(),a=function(){function t(){n(this,t),this._head=this._tail=void 0;}return o(t,[{key:"handlers",value:function(){var t=!(arguments.length<=0||void 0===arguments[0])&&arguments[0],e=this._head;if(t){ return!!e; }for(var r=[];e;){ r.push(e),e=e._next; }return r}},{key:"has",value:function(t){if(!(t instanceof s)){ throw new Error("MiniSignal#has(): First arg must be a MiniSignalBinding object."); }return t._owner===this}},{key:"dispatch",value:function(){
var arguments$1 = arguments;
var this$1 = this;
var t=this._head;if(!t){ return!1; }for(;t;){ t._once&&this$1.detach(t),t._fn.apply(t._thisArg,arguments$1),t=t._next; }return!0}},{key:"add",value:function(t){var e=arguments.length<=1||void 0===arguments[1]?null:arguments[1];if("function"!=typeof t){ throw new Error("MiniSignal#add(): First arg must be a Function."); }return i(this,new s(t,!1,e))}},{key:"once",value:function(t){var e=arguments.length<=1||void 0===arguments[1]?null:arguments[1];if("function"!=typeof t){ throw new Error("MiniSignal#once(): First arg must be a Function."); }return i(this,new s(t,!0,e))}},{key:"detach",value:function(t){if(!(t instanceof s)){ throw new Error("MiniSignal#detach(): First arg must be a MiniSignalBinding object."); }return t._owner!==this?this:(t._prev&&(t._prev._next=t._next),t._next&&(t._next._prev=t._prev),t===this._head?(this._head=t._next,null===t._next&&(this._tail=null)):t===this._tail&&(this._tail=t._prev,this._tail._next=null),t._owner=null,this)}},{key:"detachAll",value:function(){var t=this._head;if(!t){ return this; }for(this._head=this._tail=null;t;){ t._owner=null,t=t._next; }return this}}]),t}();a.MiniSignalBinding=s,r.default=a,e.exports=r.default;},{}],38:[function(t,e,r){"use strict";e.exports=function(t,e){e=e||{};for(var r={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,loose:/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/}},n=r.parser[e.strictMode?"strict":"loose"].exec(t),i={},o=14;o--;){ i[r.key[o]]=n[o]||""; }return i[r.q.name]={},i[r.key[12]].replace(r.q.parser,function(t,e,n){e&&(i[r.q.name][e]=n);}),i};},{}],39:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var s=t("../core"),a=i(s),u=t("ismobilejs"),h=n(u),l=t("./accessibleTarget"),c=n(l);a.utils.mixins.delayMixin(a.DisplayObject.prototype,c.default);var f=9,d=100,p=0,v=0,y=2,g=1,m=-1e3,_=-1e3,b=2,x=function(){function t(e){o(this,t),!h.default.tablet&&!h.default.phone||navigator.isCocoonJS||this.createTouchHook();var r=document.createElement("div");r.style.width=d+"px",r.style.height=d+"px",r.style.position="absolute",r.style.top=p+"px",r.style.left=v+"px",r.style.zIndex=y,this.div=r,this.pool=[],this.renderId=0,this.debug=!1,this.renderer=e,this.children=[],this._onKeyDown=this._onKeyDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this.isActive=!1,this.isMobileAccessabillity=!1,window.addEventListener("keydown",this._onKeyDown,!1);}return t.prototype.createTouchHook=function(){var t=this,e=document.createElement("button");e.style.width=g+"px",e.style.height=g+"px",e.style.position="absolute",e.style.top=m+"px",e.style.left=_+"px",e.style.zIndex=b,e.style.backgroundColor="#FF0000",e.title="HOOK DIV",e.addEventListener("focus",function(){t.isMobileAccessabillity=!0,t.activate(),document.body.removeChild(e);}),document.body.appendChild(e);},t.prototype.activate=function(){this.isActive||(this.isActive=!0,window.document.addEventListener("mousemove",this._onMouseMove,!0),window.removeEventListener("keydown",this._onKeyDown,!1),this.renderer.on("postrender",this.update,this),this.renderer.view.parentNode&&this.renderer.view.parentNode.appendChild(this.div));},t.prototype.deactivate=function(){this.isActive&&!this.isMobileAccessabillity&&(this.isActive=!1,window.document.removeEventListener("mousemove",this._onMouseMove),window.addEventListener("keydown",this._onKeyDown,!1),this.renderer.off("postrender",this.update),this.div.parentNode&&this.div.parentNode.removeChild(this.div));},t.prototype.updateAccessibleObjects=function(t){
var this$1 = this;
if(t.visible){t.accessible&&t.interactive&&(t._accessibleActive||this.addChild(t),t.renderId=this.renderId);for(var e=t.children,r=e.length-1;r>=0;r--){ this$1.updateAccessibleObjects(e[r]); }}},t.prototype.update=function(){
var this$1 = this;
if(this.renderer.renderingToScreen){this.updateAccessibleObjects(this.renderer._lastObjectRendered);var t=this.renderer.view.getBoundingClientRect(),e=t.width/this.renderer.width,r=t.height/this.renderer.height,n=this.div;n.style.left=t.left+"px",n.style.top=t.top+"px",n.style.width=this.renderer.width+"px",n.style.height=this.renderer.height+"px";for(var i=0;i<this.children.length;i++){var o=this$1.children[i];if(o.renderId!==this$1.renderId){ o._accessibleActive=!1,a.utils.removeItems(this$1.children,i,1),this$1.div.removeChild(o._accessibleDiv),this$1.pool.push(o._accessibleDiv),o._accessibleDiv=null,i--,0===this$1.children.length&&this$1.deactivate(); }else{n=o._accessibleDiv;var s=o.hitArea,u=o.worldTransform;o.hitArea?(n.style.left=(u.tx+s.x*u.a)*e+"px",n.style.top=(u.ty+s.y*u.d)*r+"px",n.style.width=s.width*u.a*e+"px",n.style.height=s.height*u.d*r+"px"):(s=o.getBounds(),this$1.capHitArea(s),n.style.left=s.x*e+"px",n.style.top=s.y*r+"px",n.style.width=s.width*e+"px",n.style.height=s.height*r+"px");}}this.renderId++;}},t.prototype.capHitArea=function(t){t.x<0&&(t.width+=t.x,t.x=0),t.y<0&&(t.height+=t.y,t.y=0),t.x+t.width>this.renderer.width&&(t.width=this.renderer.width-t.x),t.y+t.height>this.renderer.height&&(t.height=this.renderer.height-t.y);},t.prototype.addChild=function(t){var e=this.pool.pop();e||(e=document.createElement("button"),e.style.width=d+"px",e.style.height=d+"px",e.style.backgroundColor=this.debug?"rgba(255,0,0,0.5)":"transparent",e.style.position="absolute",e.style.zIndex=y,e.style.borderStyle="none",e.addEventListener("click",this._onClick.bind(this)),e.addEventListener("focus",this._onFocus.bind(this)),e.addEventListener("focusout",this._onFocusOut.bind(this))),t.accessibleTitle?e.title=t.accessibleTitle:t.accessibleTitle||t.accessibleHint||(e.title="displayObject "+this.tabIndex),t.accessibleHint&&e.setAttribute("aria-label",t.accessibleHint),t._accessibleActive=!0,t._accessibleDiv=e,e.displayObject=t,this.children.push(t),this.div.appendChild(t._accessibleDiv),t._accessibleDiv.tabIndex=t.tabIndex;},t.prototype._onClick=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"click",e.eventData);},t.prototype._onFocus=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"mouseover",e.eventData);},t.prototype._onFocusOut=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"mouseout",e.eventData);},t.prototype._onKeyDown=function(t){t.keyCode===f&&this.activate();},t.prototype._onMouseMove=function(){this.deactivate();},t.prototype.destroy=function(){
var this$1 = this;
this.div=null;for(var t=0;t<this.children.length;t++){ this$1.children[t].div=null; }window.document.removeEventListener("mousemove",this._onMouseMove),window.removeEventListener("keydown",this._onKeyDown),this.pool=null,this.children=null,this.renderer=null;},t}();r.default=x,a.WebGLRenderer.registerPlugin("accessibility",x),a.CanvasRenderer.registerPlugin("accessibility",x);},{"../core":64,"./accessibleTarget":40,ismobilejs:4}],40:[function(t,e,r){"use strict";r.__esModule=!0,r.default={accessible:!1,accessibleTitle:null,accessibleHint:null,tabIndex:0,_accessibleActive:!1,_accessibleDiv:!1};},{}],41:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./accessibleTarget");Object.defineProperty(r,"accessibleTarget",{enumerable:!0,get:function(){return n(i).default}});var o=t("./AccessibilityManager");Object.defineProperty(r,"AccessibilityManager",{enumerable:!0,get:function(){return n(o).default}});},{"./AccessibilityManager":39,"./accessibleTarget":40}],42:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("./autoDetectRenderer"),a=t("./display/Container"),u=n(a),h=t("./ticker"),l=function(){function t(e,r,n,o){var a=arguments.length>4&&void 0!==arguments[4]&&arguments[4];i(this,t),this.renderer=(0,s.autoDetectRenderer)(e,r,n,o),this.stage=new u.default,this._ticker=null,this.ticker=a?h.shared:new h.Ticker,this.start();}return t.prototype.render=function(){this.renderer.render(this.stage);},t.prototype.stop=function(){this._ticker.stop();},t.prototype.start=function(){this._ticker.start();},t.prototype.destroy=function(t){this.stop(),this.ticker=null,this.stage.destroy(),this.stage=null,this.renderer.destroy(t),this.renderer=null;},o(t,[{key:"ticker",set:function(t){this._ticker&&this._ticker.remove(this.render,this),this._ticker=t,t&&t.add(this.render,this);},get:function(){return this._ticker}},{key:"view",get:function(){return this.renderer.view}},{key:"screen",get:function(){return this.renderer.screen}}]),t}();r.default=l;},{"./autoDetectRenderer":44,"./display/Container":47,"./ticker":117}],43:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function a(t,e){if(t instanceof Array){if("precision"!==t[0].substring(0,9)){var r=t.slice(0);return r.unshift("precision "+e+" float;"),r}}else if("precision"!==t.substring(0,9)){ return"precision "+e+" float;\n"+t; }return t}r.__esModule=!0;var u=t("pixi-gl-core"),h=t("./settings"),l=n(h),c=function(t){function e(r,n,s){return i(this,e),o(this,t.call(this,r,a(n,l.default.PRECISION_VERTEX),a(s,l.default.PRECISION_FRAGMENT)))}return s(e,t),e}(u.GLShader);r.default=c;},{"./settings":100,"pixi-gl-core":12}],44:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:800,e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:600,r=arguments[2],n=arguments[3];return!n&&a.isWebGLSupported()?new c.default(t,e,r):new h.default(t,e,r)}r.__esModule=!0,r.autoDetectRenderer=o;var s=t("./utils"),a=i(s),u=t("./renderers/canvas/CanvasRenderer"),h=n(u),l=t("./renderers/webgl/WebGLRenderer"),c=n(l);},{"./renderers/canvas/CanvasRenderer":76,"./renderers/webgl/WebGLRenderer":83,"./utils":121}],45:[function(t,e,r){"use strict";r.__esModule=!0;r.VERSION="4.4.1",r.PI_2=2*Math.PI,r.RAD_TO_DEG=180/Math.PI,r.DEG_TO_RAD=Math.PI/180,r.RENDERER_TYPE={UNKNOWN:0,WEBGL:1,CANVAS:2},r.BLEND_MODES={NORMAL:0,ADD:1,MULTIPLY:2,SCREEN:3,OVERLAY:4,DARKEN:5,LIGHTEN:6,COLOR_DODGE:7,COLOR_BURN:8,HARD_LIGHT:9,SOFT_LIGHT:10,DIFFERENCE:11,EXCLUSION:12,HUE:13,SATURATION:14,COLOR:15,LUMINOSITY:16},r.DRAW_MODES={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},r.SCALE_MODES={LINEAR:0,NEAREST:1},r.WRAP_MODES={CLAMP:0,REPEAT:1,MIRRORED_REPEAT:2},r.GC_MODES={AUTO:0,MANUAL:1},r.URL_FILE_EXTENSION=/\.(\w{3,4})(?:$|\?|#)/i,r.DATA_URI=/^\s*data:(?:([\w-]+)\/([\w+.-]+))?(?:;(charset=[\w-]+|base64))?,(.*)/i,r.SVG_SIZE=/<svg[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*>/i,r.SHAPES={POLY:0,RECT:1,CIRC:2,ELIP:3,RREC:4},r.PRECISION={LOW:"lowp",MEDIUM:"mediump",HIGH:"highp"},r.TRANSFORM_MODE={STATIC:0,DYNAMIC:1},r.TEXT_GRADIENT={LINEAR_VERTICAL:0,LINEAR_HORIZONTAL:1};},{}],46:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=t("../math"),o=function(){function t(){n(this,t),this.minX=1/0,this.minY=1/0,this.maxX=-(1/0),this.maxY=-(1/0),this.rect=null;}return t.prototype.isEmpty=function(){return this.minX>this.maxX||this.minY>this.maxY},t.prototype.clear=function(){this.updateID++,this.minX=1/0,this.minY=1/0,this.maxX=-(1/0),this.maxY=-(1/0);},t.prototype.getRectangle=function(t){return this.minX>this.maxX||this.minY>this.maxY?i.Rectangle.EMPTY:(t=t||new i.Rectangle(0,0,1,1),t.x=this.minX,t.y=this.minY,t.width=this.maxX-this.minX,t.height=this.maxY-this.minY,t)},t.prototype.addPoint=function(t){this.minX=Math.min(this.minX,t.x),this.maxX=Math.max(this.maxX,t.x),this.minY=Math.min(this.minY,t.y),this.maxY=Math.max(this.maxY,t.y);},t.prototype.addQuad=function(t){var e=this.minX,r=this.minY,n=this.maxX,i=this.maxY,o=t[0],s=t[1];e=o<e?o:e,r=s<r?s:r,n=o>n?o:n,i=s>i?s:i,o=t[2],s=t[3],e=o<e?o:e,r=s<r?s:r,n=o>n?o:n,i=s>i?s:i,o=t[4],s=t[5],e=o<e?o:e,r=s<r?s:r,n=o>n?o:n,i=s>i?s:i,o=t[6],s=t[7],e=o<e?o:e,r=s<r?s:r,n=o>n?o:n,i=s>i?s:i,this.minX=e,this.minY=r,this.maxX=n,this.maxY=i;},t.prototype.addFrame=function(t,e,r,n,i){var o=t.worldTransform,s=o.a,a=o.b,u=o.c,h=o.d,l=o.tx,c=o.ty,f=this.minX,d=this.minY,p=this.maxX,v=this.maxY,y=s*e+u*r+l,g=a*e+h*r+c;f=y<f?y:f,d=g<d?g:d,p=y>p?y:p,v=g>v?g:v,y=s*n+u*r+l,g=a*n+h*r+c,f=y<f?y:f,d=g<d?g:d,p=y>p?y:p,v=g>v?g:v,y=s*e+u*i+l,g=a*e+h*i+c,f=y<f?y:f,d=g<d?g:d,p=y>p?y:p,v=g>v?g:v,y=s*n+u*i+l,g=a*n+h*i+c,f=y<f?y:f,d=g<d?g:d,p=y>p?y:p,v=g>v?g:v,this.minX=f,this.minY=d,this.maxX=p,this.maxY=v;},t.prototype.addVertices=function(t,e,r,n){for(var i=t.worldTransform,o=i.a,s=i.b,a=i.c,u=i.d,h=i.tx,l=i.ty,c=this.minX,f=this.minY,d=this.maxX,p=this.maxY,v=r;v<n;v+=2){var y=e[v],g=e[v+1],m=o*y+a*g+h,_=u*g+s*y+l;c=m<c?m:c,f=_<f?_:f,d=m>d?m:d,p=_>p?_:p;}this.minX=c,this.minY=f,this.maxX=d,this.maxY=p;},t.prototype.addBounds=function(t){var e=this.minX,r=this.minY,n=this.maxX,i=this.maxY;this.minX=t.minX<e?t.minX:e,this.minY=t.minY<r?t.minY:r,this.maxX=t.maxX>n?t.maxX:n,this.maxY=t.maxY>i?t.maxY:i;},t.prototype.addBoundsMask=function(t,e){var r=t.minX>e.minX?t.minX:e.minX,n=t.minY>e.minY?t.minY:e.minY,i=t.maxX<e.maxX?t.maxX:e.maxX,o=t.maxY<e.maxY?t.maxY:e.maxY;if(r<=i&&n<=o){var s=this.minX,a=this.minY,u=this.maxX,h=this.maxY;this.minX=r<s?r:s,this.minY=n<a?n:a,this.maxX=i>u?i:u,this.maxY=o>h?o:h;}},t.prototype.addBoundsArea=function(t,e){var r=t.minX>e.x?t.minX:e.x,n=t.minY>e.y?t.minY:e.y,i=t.maxX<e.x+e.width?t.maxX:e.x+e.width,o=t.maxY<e.y+e.height?t.maxY:e.y+e.height;if(r<=i&&n<=o){var s=this.minX,a=this.minY,u=this.maxX,h=this.maxY;this.minX=r<s?r:s,this.minY=n<a?n:a,this.maxX=i>u?i:u,this.maxY=o>h?o:h;}},t}();r.default=o;},{"../math":69}],47:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../utils"),h=t("./DisplayObject"),l=n(h),c=function(t){function e(){i(this,e);var r=o(this,t.call(this));return r.children=[],r}return s(e,t),e.prototype.onChildrenChange=function(){},e.prototype.addChild=function(t){
var arguments$1 = arguments;
var this$1 = this;
var e=arguments.length;if(e>1){ for(var r=0;r<e;r++){ this$1.addChild(arguments$1[r]); } }else { t.parent&&t.parent.removeChild(t),t.parent=this,t.transform._parentID=-1,this.children.push(t),this._boundsID++,this.onChildrenChange(this.children.length-1),t.emit("added",this); }return t},e.prototype.addChildAt=function(t,e){if(e<0||e>this.children.length){ throw new Error(t+"addChildAt: The index "+e+" supplied is out of bounds "+this.children.length); }return t.parent&&t.parent.removeChild(t),t.parent=this,t.transform._parentID=-1,this.children.splice(e,0,t),this._boundsID++,this.onChildrenChange(e),t.emit("added",this),t},e.prototype.swapChildren=function(t,e){if(t!==e){var r=this.getChildIndex(t),n=this.getChildIndex(e);this.children[r]=e,this.children[n]=t,this.onChildrenChange(r<n?r:n);}},e.prototype.getChildIndex=function(t){var e=this.children.indexOf(t);if(e===-1){ throw new Error("The supplied DisplayObject must be a child of the caller"); }return e},e.prototype.setChildIndex=function(t,e){if(e<0||e>=this.children.length){ throw new Error("The supplied index is out of bounds"); }var r=this.getChildIndex(t);(0,u.removeItems)(this.children,r,1),this.children.splice(e,0,t),this.onChildrenChange(e);},e.prototype.getChildAt=function(t){if(t<0||t>=this.children.length){ throw new Error("getChildAt: Index ("+t+") does not exist."); }return this.children[t]},e.prototype.removeChild=function(t){
var arguments$1 = arguments;
var this$1 = this;
var e=arguments.length;if(e>1){ for(var r=0;r<e;r++){ this$1.removeChild(arguments$1[r]); } }else{var n=this.children.indexOf(t);if(n===-1){ return null; }t.parent=null,t.transform._parentID=-1,(0,u.removeItems)(this.children,n,1),this._boundsID++,this.onChildrenChange(n),t.emit("removed",this);}return t},e.prototype.removeChildAt=function(t){var e=this.getChildAt(t);return e.parent=null,e.transform._parentID=-1,(0,u.removeItems)(this.children,t,1),this._boundsID++,this.onChildrenChange(t),e.emit("removed",this),e},e.prototype.removeChildren=function(){
var this$1 = this;
var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments[1],r=t,n="number"==typeof e?e:this.children.length,i=n-r,o=void 0;if(i>0&&i<=n){o=this.children.splice(r,i);for(var s=0;s<o.length;++s){ o[s].parent=null,o[s].transform&&(o[s].transform._parentID=-1); }this._boundsID++,this.onChildrenChange(t);for(var a=0;a<o.length;++a){ o[a].emit("removed",this$1); }return o}if(0===i&&0===this.children.length){ return[]; }throw new RangeError("removeChildren: numeric values are outside the acceptable range.")},e.prototype.updateTransform=function(){
var this$1 = this;
this._boundsID++,this.transform.updateTransform(this.parent.transform),this.worldAlpha=this.alpha*this.parent.worldAlpha;for(var t=0,e=this.children.length;t<e;++t){var r=this$1.children[t];r.visible&&r.updateTransform();}},e.prototype.calculateBounds=function(){
var this$1 = this;
this._bounds.clear(),this._calculateBounds();for(var t=0;t<this.children.length;t++){var e=this$1.children[t];e.visible&&e.renderable&&(e.calculateBounds(),e._mask?(e._mask.calculateBounds(),this$1._bounds.addBoundsMask(e._bounds,e._mask._bounds)):e.filterArea?this$1._bounds.addBoundsArea(e._bounds,e.filterArea):this$1._bounds.addBounds(e._bounds));}this._lastBoundsID=this._boundsID;},e.prototype._calculateBounds=function(){},e.prototype.renderWebGL=function(t){
var this$1 = this;
if(this.visible&&!(this.worldAlpha<=0)&&this.renderable){ if(this._mask||this._filters){ this.renderAdvancedWebGL(t); }else{this._renderWebGL(t);for(var e=0,r=this.children.length;e<r;++e){ this$1.children[e].renderWebGL(t); }} }},e.prototype.renderAdvancedWebGL=function(t){
var this$1 = this;
t.flush();var e=this._filters,r=this._mask;if(e){this._enabledFilters||(this._enabledFilters=[]),this._enabledFilters.length=0;for(var n=0;n<e.length;n++){ e[n].enabled&&this$1._enabledFilters.push(e[n]); }this._enabledFilters.length&&t.filterManager.pushFilter(this,this._enabledFilters);}r&&t.maskManager.pushMask(this,this._mask),this._renderWebGL(t);for(var i=0,o=this.children.length;i<o;i++){ this$1.children[i].renderWebGL(t); }t.flush(),r&&t.maskManager.popMask(this,this._mask),e&&this._enabledFilters&&this._enabledFilters.length&&t.filterManager.popFilter();},e.prototype._renderWebGL=function(t){},e.prototype._renderCanvas=function(t){},e.prototype.renderCanvas=function(t){
var this$1 = this;
if(this.visible&&!(this.worldAlpha<=0)&&this.renderable){this._mask&&t.maskManager.pushMask(this._mask),this._renderCanvas(t);for(var e=0,r=this.children.length;e<r;++e){ this$1.children[e].renderCanvas(t); }this._mask&&t.maskManager.popMask(t);}},e.prototype.destroy=function(e){t.prototype.destroy.call(this);var r="boolean"==typeof e?e:e&&e.children,n=this.removeChildren(0,this.children.length);if(r){ for(var i=0;i<n.length;++i){ n[i].destroy(e); } }},a(e,[{key:"width",get:function(){return this.scale.x*this.getLocalBounds().width},set:function(t){var e=this.getLocalBounds().width;0!==e?this.scale.x=t/e:this.scale.x=1,this._width=t;}},{key:"height",get:function(){return this.scale.y*this.getLocalBounds().height},set:function(t){var e=this.getLocalBounds().height;0!==e?this.scale.y=t/e:this.scale.y=1,this._height=t;}}]),e}(l.default);r.default=c,c.prototype.containerUpdateTransform=c.prototype.updateTransform;},{"../utils":121,"./DisplayObject":48}],48:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("eventemitter3"),h=n(u),l=t("../const"),c=t("../settings"),f=n(c),d=t("./TransformStatic"),p=n(d),v=t("./Transform"),y=n(v),g=t("./Bounds"),m=n(g),_=t("../math"),b=function(t){function e(){i(this,e);var r=o(this,t.call(this)),n=f.default.TRANSFORM_MODE===l.TRANSFORM_MODE.STATIC?p.default:y.default;return r.tempDisplayObjectParent=null,r.transform=new n,r.alpha=1,r.visible=!0,r.renderable=!0,r.parent=null,r.worldAlpha=1,r.filterArea=null,r._filters=null,r._enabledFilters=null,r._bounds=new m.default,r._boundsID=0,r._lastBoundsID=-1,r._boundsRect=null,r._localBoundsRect=null,r._mask=null,r}return s(e,t),e.prototype.updateTransform=function(){this.transform.updateTransform(this.parent.transform),this.worldAlpha=this.alpha*this.parent.worldAlpha,this._bounds.updateID++;},e.prototype._recursivePostUpdateTransform=function(){this.parent?(this.parent._recursivePostUpdateTransform(),this.transform.updateTransform(this.parent.transform)):this.transform.updateTransform(this._tempDisplayObjectParent.transform);},e.prototype.getBounds=function(t,e){return t||(this.parent?(this._recursivePostUpdateTransform(),this.updateTransform()):(this.parent=this._tempDisplayObjectParent,this.updateTransform(),this.parent=null)),this._boundsID!==this._lastBoundsID&&this.calculateBounds(),e||(this._boundsRect||(this._boundsRect=new _.Rectangle),e=this._boundsRect),this._bounds.getRectangle(e)},e.prototype.getLocalBounds=function(t){var e=this.transform,r=this.parent;this.parent=null,this.transform=this._tempDisplayObjectParent.transform,t||(this._localBoundsRect||(this._localBoundsRect=new _.Rectangle),t=this._localBoundsRect);var n=this.getBounds(!1,t);return this.parent=r,this.transform=e,n},e.prototype.toGlobal=function(t,e){var r=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return r||(this._recursivePostUpdateTransform(),this.parent?this.displayObjectUpdateTransform():(this.parent=this._tempDisplayObjectParent,this.displayObjectUpdateTransform(),this.parent=null)),this.worldTransform.apply(t,e)},e.prototype.toLocal=function(t,e,r,n){return e&&(t=e.toGlobal(t,r,n)),n||(this._recursivePostUpdateTransform(),this.parent?this.displayObjectUpdateTransform():(this.parent=this._tempDisplayObjectParent,this.displayObjectUpdateTransform(),this.parent=null)),this.worldTransform.applyInverse(t,r)},e.prototype.renderWebGL=function(t){},e.prototype.renderCanvas=function(t){},e.prototype.setParent=function(t){if(!t||!t.addChild){ throw new Error("setParent: Argument must be a Container"); }return t.addChild(this),t},e.prototype.setTransform=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1,i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,o=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,s=arguments.length>6&&void 0!==arguments[6]?arguments[6]:0,a=arguments.length>7&&void 0!==arguments[7]?arguments[7]:0,u=arguments.length>8&&void 0!==arguments[8]?arguments[8]:0;return this.position.x=t,this.position.y=e,this.scale.x=r?r:1,this.scale.y=n?n:1,this.rotation=i,this.skew.x=o,this.skew.y=s,this.pivot.x=a,this.pivot.y=u,this},e.prototype.destroy=function(){this.removeAllListeners(),this.parent&&this.parent.removeChild(this),this.transform=null,this.parent=null,this._bounds=null,this._currentBounds=null,this._mask=null,this.filterArea=null,this.interactive=!1,this.interactiveChildren=!1;},a(e,[{key:"_tempDisplayObjectParent",get:function(){return null===this.tempDisplayObjectParent&&(this.tempDisplayObjectParent=new e),this.tempDisplayObjectParent}},{key:"x",get:function(){return this.position.x},set:function(t){this.transform.position.x=t;}},{key:"y",get:function(){return this.position.y},set:function(t){this.transform.position.y=t;}},{key:"worldTransform",get:function(){return this.transform.worldTransform}},{key:"localTransform",get:function(){return this.transform.localTransform}},{key:"position",get:function(){return this.transform.position},set:function(t){this.transform.position.copy(t);}},{key:"scale",get:function(){return this.transform.scale},set:function(t){this.transform.scale.copy(t);}},{key:"pivot",get:function(){return this.transform.pivot},set:function(t){this.transform.pivot.copy(t);}},{key:"skew",get:function(){return this.transform.skew},set:function(t){this.transform.skew.copy(t);}},{key:"rotation",get:function(){return this.transform.rotation},set:function(t){this.transform.rotation=t;}},{key:"worldVisible",get:function(){var t=this;do{if(!t.visible){ return!1; }t=t.parent;}while(t);return!0}},{key:"mask",get:function(){return this._mask},set:function(t){this._mask&&(this._mask.renderable=!0),this._mask=t,this._mask&&(this._mask.renderable=!1);}},{key:"filters",get:function(){return this._filters&&this._filters.slice()},set:function(t){this._filters=t&&t.slice();}}]),e}(h.default);r.default=b,b.prototype.displayObjectUpdateTransform=b.prototype.updateTransform;},{"../const":45,"../math":69,"../settings":100,"./Bounds":46,"./Transform":49,"./TransformStatic":51,eventemitter3:3}],49:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../math"),h=t("./TransformBase"),l=n(h),c=function(t){function e(){i(this,e);var r=o(this,t.call(this));return r.position=new u.Point(0,0),r.scale=new u.Point(1,1),r.skew=new u.ObservablePoint(r.updateSkew,r,0,0),r.pivot=new u.Point(0,0),r._rotation=0,r._cx=1,r._sx=0,r._cy=0,r._sy=1,r}return s(e,t),e.prototype.updateSkew=function(){this._cx=Math.cos(this._rotation+this.skew._y),this._sx=Math.sin(this._rotation+this.skew._y),this._cy=-Math.sin(this._rotation-this.skew._x),this._sy=Math.cos(this._rotation-this.skew._x);},e.prototype.updateLocalTransform=function(){var t=this.localTransform;t.a=this._cx*this.scale.x,t.b=this._sx*this.scale.x,t.c=this._cy*this.scale.y,t.d=this._sy*this.scale.y,t.tx=this.position.x-(this.pivot.x*t.a+this.pivot.y*t.c),t.ty=this.position.y-(this.pivot.x*t.b+this.pivot.y*t.d);},e.prototype.updateTransform=function(t){var e=this.localTransform;e.a=this._cx*this.scale.x,e.b=this._sx*this.scale.x,e.c=this._cy*this.scale.y,e.d=this._sy*this.scale.y,e.tx=this.position.x-(this.pivot.x*e.a+this.pivot.y*e.c),e.ty=this.position.y-(this.pivot.x*e.b+this.pivot.y*e.d);var r=t.worldTransform,n=this.worldTransform;n.a=e.a*r.a+e.b*r.c,n.b=e.a*r.b+e.b*r.d,n.c=e.c*r.a+e.d*r.c,n.d=e.c*r.b+e.d*r.d,n.tx=e.tx*r.a+e.ty*r.c+r.tx,n.ty=e.tx*r.b+e.ty*r.d+r.ty,this._worldID++;},e.prototype.setFromMatrix=function(t){t.decompose(this);},a(e,[{key:"rotation",get:function(){return this._rotation},set:function(t){this._rotation=t,this.updateSkew();}}]),e}(l.default);r.default=c;},{"../math":69,"./TransformBase":50}],50:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=t("../math"),o=function(){function t(){n(this,t),this.worldTransform=new i.Matrix,this.localTransform=new i.Matrix,this._worldID=0,this._parentID=0;}return t.prototype.updateLocalTransform=function(){},
t.prototype.updateTransform=function(t){var e=t.worldTransform,r=this.worldTransform,n=this.localTransform;r.a=n.a*e.a+n.b*e.c,r.b=n.a*e.b+n.b*e.d,r.c=n.c*e.a+n.d*e.c,r.d=n.c*e.b+n.d*e.d,r.tx=n.tx*e.a+n.ty*e.c+e.tx,r.ty=n.tx*e.b+n.ty*e.d+e.ty,this._worldID++;},t}();r.default=o,o.prototype.updateWorldTransform=o.prototype.updateTransform,o.IDENTITY=new o;},{"../math":69}],51:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../math"),h=t("./TransformBase"),l=n(h),c=function(t){function e(){i(this,e);var r=o(this,t.call(this));return r.position=new u.ObservablePoint(r.onChange,r,0,0),r.scale=new u.ObservablePoint(r.onChange,r,1,1),r.pivot=new u.ObservablePoint(r.onChange,r,0,0),r.skew=new u.ObservablePoint(r.updateSkew,r,0,0),r._rotation=0,r._cx=1,r._sx=0,r._cy=0,r._sy=1,r._localID=0,r._currentLocalID=0,r}return s(e,t),e.prototype.onChange=function(){this._localID++;},e.prototype.updateSkew=function(){this._cx=Math.cos(this._rotation+this.skew._y),this._sx=Math.sin(this._rotation+this.skew._y),this._cy=-Math.sin(this._rotation-this.skew._x),this._sy=Math.cos(this._rotation-this.skew._x),this._localID++;},e.prototype.updateLocalTransform=function(){var t=this.localTransform;this._localID!==this._currentLocalID&&(t.a=this._cx*this.scale._x,t.b=this._sx*this.scale._x,t.c=this._cy*this.scale._y,t.d=this._sy*this.scale._y,t.tx=this.position._x-(this.pivot._x*t.a+this.pivot._y*t.c),t.ty=this.position._y-(this.pivot._x*t.b+this.pivot._y*t.d),this._currentLocalID=this._localID,this._parentID=-1);},e.prototype.updateTransform=function(t){var e=this.localTransform;if(this._localID!==this._currentLocalID&&(e.a=this._cx*this.scale._x,e.b=this._sx*this.scale._x,e.c=this._cy*this.scale._y,e.d=this._sy*this.scale._y,e.tx=this.position._x-(this.pivot._x*e.a+this.pivot._y*e.c),e.ty=this.position._y-(this.pivot._x*e.b+this.pivot._y*e.d),this._currentLocalID=this._localID,this._parentID=-1),this._parentID!==t._worldID){var r=t.worldTransform,n=this.worldTransform;n.a=e.a*r.a+e.b*r.c,n.b=e.a*r.b+e.b*r.d,n.c=e.c*r.a+e.d*r.c,n.d=e.c*r.b+e.d*r.d,n.tx=e.tx*r.a+e.ty*r.c+r.tx,n.ty=e.tx*r.b+e.ty*r.d+r.ty,this._parentID=t._worldID,this._worldID++;}},e.prototype.setFromMatrix=function(t){t.decompose(this),this._localID++;},a(e,[{key:"rotation",get:function(){return this._rotation},set:function(t){this._rotation=t,this.updateSkew();}}]),e}(l.default);r.default=c;},{"../math":69,"./TransformBase":50}],52:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../display/Container"),u=n(a),h=t("../textures/RenderTexture"),l=n(h),c=t("../textures/Texture"),f=n(c),d=t("./GraphicsData"),p=n(d),v=t("../sprites/Sprite"),y=n(v),g=t("../math"),m=t("../utils"),_=t("../const"),b=t("../display/Bounds"),x=n(b),T=t("./utils/bezierCurveTo"),w=n(T),E=t("../renderers/canvas/CanvasRenderer"),S=n(E),O=void 0,P=new g.Matrix,M=new g.Point,C=new Float32Array(4),R=new Float32Array(4),A=function(t){function e(){var r=arguments.length>0&&void 0!==arguments[0]&&arguments[0];i(this,e);var n=o(this,t.call(this));return n.fillAlpha=1,n.lineWidth=0,n.nativeLines=r,n.lineColor=0,n.graphicsData=[],n.tint=16777215,n._prevTint=16777215,n.blendMode=_.BLEND_MODES.NORMAL,n.currentPath=null,n._webGL={},n.isMask=!1,n.boundsPadding=0,n._localBounds=new x.default,n.dirty=0,n.fastRectDirty=-1,n.clearDirty=0,n.boundsDirty=-1,n.cachedSpriteDirty=!1,n._spriteRect=null,n._fastRect=!1,n}return s(e,t),e.prototype.clone=function t(){
var this$1 = this;
var t=new e;t.renderable=this.renderable,t.fillAlpha=this.fillAlpha,t.lineWidth=this.lineWidth,t.lineColor=this.lineColor,t.tint=this.tint,t.blendMode=this.blendMode,t.isMask=this.isMask,t.boundsPadding=this.boundsPadding,t.dirty=0,t.cachedSpriteDirty=this.cachedSpriteDirty;for(var r=0;r<this.graphicsData.length;++r){ t.graphicsData.push(this$1.graphicsData[r].clone()); }return t.currentPath=t.graphicsData[t.graphicsData.length-1],t.updateLocalBounds(),t},e.prototype.lineStyle=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;if(this.lineWidth=t,this.lineColor=e,this.lineAlpha=r,this.currentPath){ if(this.currentPath.shape.points.length){var n=new g.Polygon(this.currentPath.shape.points.slice(-2));n.closed=!1,this.drawShape(n);}else { this.currentPath.lineWidth=this.lineWidth,this.currentPath.lineColor=this.lineColor,this.currentPath.lineAlpha=this.lineAlpha; } }return this},e.prototype.moveTo=function(t,e){var r=new g.Polygon([t,e]);return r.closed=!1,this.drawShape(r),this},e.prototype.lineTo=function(t,e){return this.currentPath.shape.points.push(t,e),this.dirty++,this},e.prototype.quadraticCurveTo=function(t,e,r,n){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);var i=20,o=this.currentPath.shape.points,s=0,a=0;0===o.length&&this.moveTo(0,0);for(var u=o[o.length-2],h=o[o.length-1],l=1;l<=i;++l){var c=l/i;s=u+(t-u)*c,a=h+(e-h)*c,o.push(s+(t+(r-t)*c-s)*c,a+(e+(n-e)*c-a)*c);}return this.dirty++,this},e.prototype.bezierCurveTo=function(t,e,r,n,i,o){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);var s=this.currentPath.shape.points,a=s[s.length-2],u=s[s.length-1];return s.length-=2,(0,w.default)(a,u,t,e,r,n,i,o,s),this.dirty++,this},e.prototype.arcTo=function(t,e,r,n,i){this.currentPath?0===this.currentPath.shape.points.length&&this.currentPath.shape.points.push(t,e):this.moveTo(t,e);var o=this.currentPath.shape.points,s=o[o.length-2],a=o[o.length-1],u=a-e,h=s-t,l=n-e,c=r-t,f=Math.abs(u*c-h*l);if(f<1e-8||0===i){ o[o.length-2]===t&&o[o.length-1]===e||o.push(t,e); }else{var d=u*u+h*h,p=l*l+c*c,v=u*l+h*c,y=i*Math.sqrt(d)/f,g=i*Math.sqrt(p)/f,m=y*v/d,_=g*v/p,b=y*c+g*h,x=y*l+g*u,T=h*(g+m),w=u*(g+m),E=c*(y+_),S=l*(y+_),O=Math.atan2(w-x,T-b),P=Math.atan2(S-x,E-b);this.arc(b+t,x+e,i,O,P,h*l>c*u);}return this.dirty++,this},e.prototype.arc=function(t,e,r,n,i){var o=arguments.length>5&&void 0!==arguments[5]&&arguments[5];if(n===i){ return this; }!o&&i<=n?i+=2*Math.PI:o&&n<=i&&(n+=2*Math.PI);var s=i-n,a=40*Math.ceil(Math.abs(s)/(2*Math.PI));if(0===s){ return this; }var u=t+Math.cos(n)*r,h=e+Math.sin(n)*r,l=this.currentPath?this.currentPath.shape.points:null;l?l[l.length-2]===u&&l[l.length-1]===h||l.push(u,h):(this.moveTo(u,h),l=this.currentPath.shape.points);for(var c=s/(2*a),f=2*c,d=Math.cos(c),p=Math.sin(c),v=a-1,y=v%1/v,g=0;g<=v;++g){var m=g+y*g,_=c+n+f*m,b=Math.cos(_),x=-Math.sin(_);l.push((d*b+p*x)*r+t,(d*-x+p*b)*r+e);}return this.dirty++,this},e.prototype.beginFill=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;return this.filling=!0,this.fillColor=t,this.fillAlpha=e,this.currentPath&&this.currentPath.shape.points.length<=2&&(this.currentPath.fill=this.filling,this.currentPath.fillColor=this.fillColor,this.currentPath.fillAlpha=this.fillAlpha),this},e.prototype.endFill=function(){return this.filling=!1,this.fillColor=null,this.fillAlpha=1,this},e.prototype.drawRect=function(t,e,r,n){return this.drawShape(new g.Rectangle(t,e,r,n)),this},e.prototype.drawRoundedRect=function(t,e,r,n,i){return this.drawShape(new g.RoundedRectangle(t,e,r,n,i)),this},e.prototype.drawCircle=function(t,e,r){return this.drawShape(new g.Circle(t,e,r)),this},e.prototype.drawEllipse=function(t,e,r,n){return this.drawShape(new g.Ellipse(t,e,r,n)),this},e.prototype.drawPolygon=function(t){
var arguments$1 = arguments;
var e=t,r=!0;if(e instanceof g.Polygon&&(r=e.closed,e=e.points),!Array.isArray(e)){e=new Array(arguments.length);for(var n=0;n<e.length;++n){ e[n]=arguments$1[n]; }}var i=new g.Polygon(e);return i.closed=r,this.drawShape(i),this},e.prototype.clear=function(){return(this.lineWidth||this.filling||this.graphicsData.length>0)&&(this.lineWidth=0,this.filling=!1,this.boundsDirty=-1,this.dirty++,this.clearDirty++,this.graphicsData.length=0),this.currentPath=null,this._spriteRect=null,this},e.prototype.isFastRect=function(){return 1===this.graphicsData.length&&this.graphicsData[0].shape.type===_.SHAPES.RECT&&!this.graphicsData[0].lineWidth},e.prototype._renderWebGL=function(t){this.dirty!==this.fastRectDirty&&(this.fastRectDirty=this.dirty,this._fastRect=this.isFastRect()),this._fastRect?this._renderSpriteRect(t):(t.setObjectRenderer(t.plugins.graphics),t.plugins.graphics.render(this));},e.prototype._renderSpriteRect=function(t){var e=this.graphicsData[0].shape;this._spriteRect||(this._spriteRect=new y.default(new f.default(f.default.WHITE)));var r=this._spriteRect;if(16777215===this.tint){ r.tint=this.graphicsData[0].fillColor; }else{var n=C,i=R;(0,m.hex2rgb)(this.graphicsData[0].fillColor,n),(0,m.hex2rgb)(this.tint,i),n[0]*=i[0],n[1]*=i[1],n[2]*=i[2],r.tint=(0,m.rgb2hex)(n);}r.alpha=this.graphicsData[0].fillAlpha,r.worldAlpha=this.worldAlpha*r.alpha,r.blendMode=this.blendMode,r.texture._frame.width=e.width,r.texture._frame.height=e.height,r.transform.worldTransform=this.transform.worldTransform,r.anchor.set(-e.x/e.width,-e.y/e.height),r._onAnchorUpdate(),r._renderWebGL(t);},e.prototype._renderCanvas=function(t){this.isMask!==!0&&t.plugins.graphics.render(this);},e.prototype._calculateBounds=function(){this.boundsDirty!==this.dirty&&(this.boundsDirty=this.dirty,this.updateLocalBounds(),this.cachedSpriteDirty=!0);var t=this._localBounds;this._bounds.addFrame(this.transform,t.minX,t.minY,t.maxX,t.maxY);},e.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,M);for(var e=this.graphicsData,r=0;r<e.length;++r){var n=e[r];if(n.fill&&n.shape&&n.shape.contains(M.x,M.y)){ return!0 }}return!1},e.prototype.updateLocalBounds=function(){
var this$1 = this;
var t=1/0,e=-(1/0),r=1/0,n=-(1/0);if(this.graphicsData.length){ for(var i=0,o=0,s=0,a=0,u=0,h=0;h<this.graphicsData.length;h++){var l=this$1.graphicsData[h],c=l.type,f=l.lineWidth;if(i=l.shape,c===_.SHAPES.RECT||c===_.SHAPES.RREC){ o=i.x-f/2,s=i.y-f/2,a=i.width+f,u=i.height+f,t=o<t?o:t,e=o+a>e?o+a:e,r=s<r?s:r,n=s+u>n?s+u:n; }else if(c===_.SHAPES.CIRC){ o=i.x,s=i.y,a=i.radius+f/2,u=i.radius+f/2,t=o-a<t?o-a:t,e=o+a>e?o+a:e,r=s-u<r?s-u:r,n=s+u>n?s+u:n; }else if(c===_.SHAPES.ELIP){ o=i.x,s=i.y,a=i.width+f/2,u=i.height+f/2,t=o-a<t?o-a:t,e=o+a>e?o+a:e,r=s-u<r?s-u:r,n=s+u>n?s+u:n; }else { for(var d=i.points,p=0,v=0,y=0,g=0,m=0,b=0,x=0,T=0,w=0;w+2<d.length;w+=2){ o=d[w],s=d[w+1],p=d[w+2],v=d[w+3],y=Math.abs(p-o),g=Math.abs(v-s),u=f,a=Math.sqrt(y*y+g*g),a<1e-9||(m=(u/a*g+y)/2,b=(u/a*y+g)/2,x=(p+o)/2,T=(v+s)/2,t=x-m<t?x-m:t,e=x+m>e?x+m:e,r=T-b<r?T-b:r,n=T+b>n?T+b:n); } }} }else { t=0,e=0,r=0,n=0; }var E=this.boundsPadding;this._localBounds.minX=t-E,this._localBounds.maxX=e+2*E,this._localBounds.minY=r-E,this._localBounds.maxY=n+2*E;},e.prototype.drawShape=function(t){this.currentPath&&this.currentPath.shape.points.length<=2&&this.graphicsData.pop(),this.currentPath=null;var e=new p.default(this.lineWidth,this.lineColor,this.lineAlpha,this.fillColor,this.fillAlpha,this.filling,this.nativeLines,t);return this.graphicsData.push(e),e.type===_.SHAPES.POLY&&(e.shape.closed=e.shape.closed||this.filling,this.currentPath=e),this.dirty++,e},e.prototype.generateCanvasTexture=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1,r=this.getLocalBounds(),n=l.default.create(r.width,r.height,t,e);O||(O=new S.default),this.transform.updateLocalTransform(),this.transform.localTransform.copy(P),P.invert(),P.tx-=r.x,P.ty-=r.y,O.render(this,n,!0,P);var i=f.default.fromCanvas(n.baseTexture._canvasRenderTarget.canvas,t);return i.baseTexture.resolution=e,i.baseTexture.update(),i},e.prototype.closePath=function(){var t=this.currentPath;return t&&t.shape&&t.shape.close(),this},e.prototype.addHole=function(){var t=this.graphicsData.pop();return this.currentPath=this.graphicsData[this.graphicsData.length-1],this.currentPath.addHole(t.shape),this.currentPath=null,this},e.prototype.destroy=function(e){
var this$1 = this;
t.prototype.destroy.call(this,e);for(var r=0;r<this.graphicsData.length;++r){ this$1.graphicsData[r].destroy(); }for(var n in this._webgl){ for(var i=0;i<this._webgl[n].data.length;++i){ this$1._webgl[n].data[i].destroy(); } }this._spriteRect&&this._spriteRect.destroy(),this.graphicsData=null,this.currentPath=null,this._webgl=null,this._localBounds=null;},e}(u.default);r.default=A,A._SPRITE_TEXTURE=null;},{"../const":45,"../display/Bounds":46,"../display/Container":47,"../math":69,"../renderers/canvas/CanvasRenderer":76,"../sprites/Sprite":101,"../textures/RenderTexture":111,"../textures/Texture":113,"../utils":121,"./GraphicsData":53,"./utils/bezierCurveTo":55}],53:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(e,r,i,o,s,a,u,h){n(this,t),this.lineWidth=e,this.nativeLines=u,this.lineColor=r,this.lineAlpha=i,this._lineTint=r,this.fillColor=o,this.fillAlpha=s,this._fillTint=o,this.fill=a,this.holes=[],this.shape=h,this.type=h.type;}return t.prototype.clone=function(){return new t(this.lineWidth,this.lineColor,this.lineAlpha,this.fillColor,this.fillAlpha,this.fill,this.nativeLines,this.shape)},t.prototype.addHole=function(t){this.holes.push(t);},t.prototype.destroy=function(){this.shape=null,this.holes=null;},t}();r.default=i;},{}],54:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../renderers/canvas/CanvasRenderer"),s=n(o),a=t("../../const"),u=function(){function t(e){i(this,t),this.renderer=e;}return t.prototype.render=function(t){
var this$1 = this;
var e=this.renderer,r=e.context,n=t.worldAlpha,i=t.transform.worldTransform,o=e.resolution;this._prevTint!==this.tint&&(this.dirty=!0),r.setTransform(i.a*o,i.b*o,i.c*o,i.d*o,i.tx*o,i.ty*o),t.dirty&&(this.updateGraphicsTint(t),t.dirty=!1),e.setBlendMode(t.blendMode);for(var s=0;s<t.graphicsData.length;s++){var u=t.graphicsData[s],h=u.shape,l=u._fillTint,c=u._lineTint;if(r.lineWidth=u.lineWidth,u.type===a.SHAPES.POLY){r.beginPath(),this$1.renderPolygon(h.points,h.closed,r);for(var f=0;f<u.holes.length;f++){ this$1.renderPolygon(u.holes[f].points,!0,r); }u.fill&&(r.globalAlpha=u.fillAlpha*n,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),u.lineWidth&&(r.globalAlpha=u.lineAlpha*n,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke());}else if(u.type===a.SHAPES.RECT){ (u.fillColor||0===u.fillColor)&&(r.globalAlpha=u.fillAlpha*n,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fillRect(h.x,h.y,h.width,h.height)),u.lineWidth&&(r.globalAlpha=u.lineAlpha*n,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.strokeRect(h.x,h.y,h.width,h.height)); }else if(u.type===a.SHAPES.CIRC){ r.beginPath(),r.arc(h.x,h.y,h.radius,0,2*Math.PI),r.closePath(),u.fill&&(r.globalAlpha=u.fillAlpha*n,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),u.lineWidth&&(r.globalAlpha=u.lineAlpha*n,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke()); }else if(u.type===a.SHAPES.ELIP){var d=2*h.width,p=2*h.height,v=h.x-d/2,y=h.y-p/2;r.beginPath();var g=.5522848,m=d/2*g,_=p/2*g,b=v+d,x=y+p,T=v+d/2,w=y+p/2;r.moveTo(v,w),r.bezierCurveTo(v,w-_,T-m,y,T,y),r.bezierCurveTo(T+m,y,b,w-_,b,w),r.bezierCurveTo(b,w+_,T+m,x,T,x),r.bezierCurveTo(T-m,x,v,w+_,v,w),r.closePath(),u.fill&&(r.globalAlpha=u.fillAlpha*n,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),u.lineWidth&&(r.globalAlpha=u.lineAlpha*n,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke());}else if(u.type===a.SHAPES.RREC){var E=h.x,S=h.y,O=h.width,P=h.height,M=h.radius,C=Math.min(O,P)/2|0;M=M>C?C:M,r.beginPath(),r.moveTo(E,S+M),r.lineTo(E,S+P-M),r.quadraticCurveTo(E,S+P,E+M,S+P),r.lineTo(E+O-M,S+P),r.quadraticCurveTo(E+O,S+P,E+O,S+P-M),r.lineTo(E+O,S+M),r.quadraticCurveTo(E+O,S,E+O-M,S),r.lineTo(E+M,S),r.quadraticCurveTo(E,S,E,S+M),r.closePath(),(u.fillColor||0===u.fillColor)&&(r.globalAlpha=u.fillAlpha*n,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),u.lineWidth&&(r.globalAlpha=u.lineAlpha*n,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke());}}},t.prototype.updateGraphicsTint=function(t){t._prevTint=t.tint;for(var e=(t.tint>>16&255)/255,r=(t.tint>>8&255)/255,n=(255&t.tint)/255,i=0;i<t.graphicsData.length;++i){var o=t.graphicsData[i],s=0|o.fillColor,a=0|o.lineColor;o._fillTint=((s>>16&255)/255*e*255<<16)+((s>>8&255)/255*r*255<<8)+(255&s)/255*n*255,o._lineTint=((a>>16&255)/255*e*255<<16)+((a>>8&255)/255*r*255<<8)+(255&a)/255*n*255;}},t.prototype.renderPolygon=function(t,e,r){r.moveTo(t[0],t[1]);for(var n=1;n<t.length/2;++n){ r.lineTo(t[2*n],t[2*n+1]); }e&&r.closePath();},t.prototype.destroy=function(){this.renderer=null;},t}();r.default=u,s.default.registerPlugin("graphics",u);},{"../../const":45,"../../renderers/canvas/CanvasRenderer":76}],55:[function(t,e,r){"use strict";function n(t,e,r,n,i,o,s,a){var u=arguments.length>8&&void 0!==arguments[8]?arguments[8]:[],h=20,l=0,c=0,f=0,d=0,p=0;u.push(t,e);for(var v=1,y=0;v<=h;++v){ y=v/h,l=1-y,c=l*l,f=c*l,d=y*y,p=d*y,u.push(f*t+3*c*y*r+3*l*d*i+p*s,f*e+3*c*y*n+3*l*d*o+p*a); }return u}r.__esModule=!0,r.default=n;},{}],56:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../utils"),u=t("../../const"),h=t("../../renderers/webgl/utils/ObjectRenderer"),l=n(h),c=t("../../renderers/webgl/WebGLRenderer"),f=n(c),d=t("./WebGLGraphicsData"),p=n(d),v=t("./shaders/PrimitiveShader"),y=n(v),g=t("./utils/buildPoly"),m=n(g),_=t("./utils/buildRectangle"),b=n(_),x=t("./utils/buildRoundedRectangle"),T=n(x),w=t("./utils/buildCircle"),E=n(w),S=function(t){function e(r){i(this,e);var n=o(this,t.call(this,r));return n.graphicsDataPool=[],n.primitiveShader=null,n.gl=r.gl,n.CONTEXT_UID=0,n}return s(e,t),e.prototype.onContextChange=function(){this.gl=this.renderer.gl,this.CONTEXT_UID=this.renderer.CONTEXT_UID,this.primitiveShader=new y.default(this.gl);},e.prototype.destroy=function(){
var this$1 = this;
l.default.prototype.destroy.call(this);for(var t=0;t<this.graphicsDataPool.length;++t){ this$1.graphicsDataPool[t].destroy(); }this.graphicsDataPool=null;},e.prototype.render=function(t){var e=this.renderer,r=e.gl,n=void 0,i=t._webGL[this.CONTEXT_UID];i&&t.dirty===i.dirty||(this.updateGraphics(t),i=t._webGL[this.CONTEXT_UID]);var o=this.primitiveShader;e.bindShader(o),e.state.setBlendMode(t.blendMode);for(var s=0,u=i.data.length;s<u;s++){n=i.data[s];var h=n.shader;e.bindShader(h),h.uniforms.translationMatrix=t.transform.worldTransform.toArray(!0),h.uniforms.tint=(0,a.hex2rgb)(t.tint),h.uniforms.alpha=t.worldAlpha,e.bindVao(n.vao),t.nativeLines?r.drawArrays(r.LINES,0,n.points.length/6):n.vao.draw(r.TRIANGLE_STRIP,n.indices.length);}},e.prototype.updateGraphics=function(t){
var this$1 = this;
var e=this.renderer.gl,r=t._webGL[this.CONTEXT_UID];if(r||(r=t._webGL[this.CONTEXT_UID]={lastIndex:0,data:[],gl:e,clearDirty:-1,dirty:-1}),r.dirty=t.dirty,t.clearDirty!==r.clearDirty){r.clearDirty=t.clearDirty;for(var n=0;n<r.data.length;n++){ this$1.graphicsDataPool.push(r.data[n]); }r.data.length=0,r.lastIndex=0;}for(var i=void 0,o=r.lastIndex;o<t.graphicsData.length;o++){var s=t.graphicsData[o];i=this$1.getWebGLData(r,0),s.type===u.SHAPES.POLY&&(0,m.default)(s,i),s.type===u.SHAPES.RECT?(0,b.default)(s,i):s.type===u.SHAPES.CIRC||s.type===u.SHAPES.ELIP?(0,E.default)(s,i):s.type===u.SHAPES.RREC&&(0,T.default)(s,i),r.lastIndex++;}this.renderer.bindVao(null);for(var a=0;a<r.data.length;a++){ i=r.data[a],i.dirty&&i.upload(); }},e.prototype.getWebGLData=function(t,e){var r=t.data[t.data.length-1];return(!r||r.points.length>32e4)&&(r=this.graphicsDataPool.pop()||new p.default(this.renderer.gl,this.primitiveShader,this.renderer.state.attribsState),r.reset(e),t.data.push(r)),r.dirty=!0,r},e}(l.default);r.default=S,f.default.registerPlugin("graphics",S);},{"../../const":45,"../../renderers/webgl/WebGLRenderer":83,"../../renderers/webgl/utils/ObjectRenderer":93,"../../utils":121,"./WebGLGraphicsData":57,"./shaders/PrimitiveShader":58,"./utils/buildCircle":59,"./utils/buildPoly":61,"./utils/buildRectangle":62,"./utils/buildRoundedRectangle":63}],57:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("pixi-gl-core"),s=n(o),a=function(){function t(e,r,n){i(this,t),this.gl=e,this.color=[0,0,0],this.points=[],this.indices=[],this.buffer=s.default.GLBuffer.createVertexBuffer(e),this.indexBuffer=s.default.GLBuffer.createIndexBuffer(e),this.dirty=!0,this.glPoints=null,this.glIndices=null,this.shader=r,this.vao=new s.default.VertexArrayObject(e,n).addIndex(this.indexBuffer).addAttribute(this.buffer,r.attributes.aVertexPosition,e.FLOAT,!1,24,0).addAttribute(this.buffer,r.attributes.aColor,e.FLOAT,!1,24,8);}return t.prototype.reset=function(){this.points.length=0,this.indices.length=0;},t.prototype.upload=function(){this.glPoints=new Float32Array(this.points),this.buffer.upload(this.glPoints),this.glIndices=new Uint16Array(this.indices),this.indexBuffer.upload(this.glIndices),this.dirty=!1;},t.prototype.destroy=function(){this.color=null,this.points=null,this.indices=null,this.vao.destroy(),this.buffer.destroy(),this.indexBuffer.destroy(),this.gl=null,this.buffer=null,this.indexBuffer=null,this.glPoints=null,this.glIndices=null;},t}();r.default=a;},{"pixi-gl-core":12}],58:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../../Shader"),u=n(a),h=function(t){function e(r){return i(this,e),o(this,t.call(this,r,["attribute vec2 aVertexPosition;","attribute vec4 aColor;","uniform mat3 translationMatrix;","uniform mat3 projectionMatrix;","uniform float alpha;","uniform vec3 tint;","varying vec4 vColor;","void main(void){","   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);","   vColor = aColor * vec4(tint * alpha, alpha);","}"].join("\n"),["varying vec4 vColor;","void main(void){","   gl_FragColor = vColor;","}"].join("\n")))}return s(e,t),e}(u.default);r.default=h;},{"../../../Shader":43}],59:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){var r=t.shape,n=r.x,i=r.y,o=void 0,h=void 0;if(t.type===a.SHAPES.CIRC?(o=r.radius,h=r.radius):(o=r.width,h=r.height),0!==o&&0!==h){var l=Math.floor(30*Math.sqrt(r.radius))||Math.floor(15*Math.sqrt(r.width+r.height)),c=2*Math.PI/l;if(t.fill){var f=(0,u.hex2rgb)(t.fillColor),d=t.fillAlpha,p=f[0]*d,v=f[1]*d,y=f[2]*d,g=e.points,m=e.indices,_=g.length/6;m.push(_);for(var b=0;b<l+1;b++){ g.push(n,i,p,v,y,d),g.push(n+Math.sin(c*b)*o,i+Math.cos(c*b)*h,p,v,y,d),m.push(_++,_++); }m.push(_-1);}if(t.lineWidth){var x=t.points;t.points=[];for(var T=0;T<l+1;T++){ t.points.push(n+Math.sin(c*T)*o,i+Math.cos(c*T)*h); }(0,s.default)(t,e),t.points=x;}}}r.__esModule=!0,r.default=i;var o=t("./buildLine"),s=n(o),a=t("../../../const"),u=t("../../../utils");},{"../../../const":45,"../../../utils":121,"./buildLine":60}],60:[function(t,e,r){"use strict";function n(t,e){var r=t.points;if(0!==r.length){var n=new o.Point(r[0],r[1]),i=new o.Point(r[r.length-2],r[r.length-1]);if(n.x===i.x&&n.y===i.y){r=r.slice(),r.pop(),r.pop(),i=new o.Point(r[r.length-2],r[r.length-1]);var a=i.x+.5*(n.x-i.x),u=i.y+.5*(n.y-i.y);r.unshift(a,u),r.push(a,u);}var h=e.points,l=e.indices,c=r.length/2,f=r.length,d=h.length/6,p=t.lineWidth/2,v=(0,s.hex2rgb)(t.lineColor),y=t.lineAlpha,g=v[0]*y,m=v[1]*y,_=v[2]*y,b=r[0],x=r[1],T=r[2],w=r[3],E=0,S=0,O=-(x-w),P=b-T,M=0,C=0,R=0,A=0,I=Math.sqrt(O*O+P*P);O/=I,P/=I,O*=p,P*=p,h.push(b-O,x-P,g,m,_,y),h.push(b+O,x+P,g,m,_,y);for(var D=1;D<c-1;++D){b=r[2*(D-1)],x=r[2*(D-1)+1],T=r[2*D],w=r[2*D+1],E=r[2*(D+1)],S=r[2*(D+1)+1],O=-(x-w),P=b-T,I=Math.sqrt(O*O+P*P),O/=I,P/=I,O*=p,P*=p,M=-(w-S),C=T-E,I=Math.sqrt(M*M+C*C),M/=I,C/=I,M*=p,C*=p;var L=-P+x-(-P+w),N=-O+T-(-O+b),F=(-O+b)*(-P+w)-(-O+T)*(-P+x),B=-C+S-(-C+w),j=-M+T-(-M+E),k=(-M+E)*(-C+w)-(-M+T)*(-C+S),U=L*j-B*N;if(Math.abs(U)<.1){ U+=10.1,h.push(T-O,w-P,g,m,_,y),h.push(T+O,w+P,g,m,_,y); }else{var X=(N*k-j*F)/U,G=(B*F-L*k)/U,W=(X-T)*(X-T)+(G-w)*(G-w);W>196*p*p?(R=O-M,A=P-C,I=Math.sqrt(R*R+A*A),R/=I,A/=I,R*=p,A*=p,h.push(T-R,w-A),h.push(g,m,_,y),h.push(T+R,w+A),h.push(g,m,_,y),h.push(T-R,w-A),h.push(g,m,_,y),f++):(h.push(X,G),h.push(g,m,_,y),h.push(T-(X-T),w-(G-w)),h.push(g,m,_,y));}}b=r[2*(c-2)],x=r[2*(c-2)+1],T=r[2*(c-1)],w=r[2*(c-1)+1],O=-(x-w),P=b-T,I=Math.sqrt(O*O+P*P),O/=I,P/=I,O*=p,P*=p,h.push(T-O,w-P),h.push(g,m,_,y),h.push(T+O,w+P),h.push(g,m,_,y),l.push(d);for(var H=0;H<f;++H){ l.push(d++); }l.push(d-1);}}function i(t,e){var r=0,n=t.points;if(0!==n.length){var i=e.points,o=n.length/2,a=(0,s.hex2rgb)(t.lineColor),u=t.lineAlpha,h=a[0]*u,l=a[1]*u,c=a[2]*u;for(r=1;r<o;r++){var f=n[2*(r-1)],d=n[2*(r-1)+1],p=n[2*r],v=n[2*r+1];i.push(f,d),i.push(h,l,c,u),i.push(p,v),i.push(h,l,c,u);}}}r.__esModule=!0,r.default=function(t,e){t.nativeLines?i(t,e):n(t,e);};var o=t("../../../math"),s=t("../../../utils");},{"../../../math":69,"../../../utils":121}],61:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){t.points=t.shape.points.slice();var r=t.points;if(t.fill&&r.length>=6){for(var n=[],i=t.holes,o=0;o<i.length;o++){var u=i[o];n.push(r.length/2),r=r.concat(u.points);}var l=e.points,c=e.indices,f=r.length/2,d=(0,a.hex2rgb)(t.fillColor),p=t.fillAlpha,v=d[0]*p,y=d[1]*p,g=d[2]*p,m=(0,h.default)(r,n,2);if(!m){ return; }for(var _=l.length/6,b=0;b<m.length;b+=3){ c.push(m[b]+_),c.push(m[b]+_),c.push(m[b+1]+_),c.push(m[b+2]+_),c.push(m[b+2]+_); }for(var x=0;x<f;x++){ l.push(r[2*x],r[2*x+1],v,y,g,p); }}t.lineWidth>0&&(0,s.default)(t,e);}r.__esModule=!0,r.default=i;var o=t("./buildLine"),s=n(o),a=t("../../../utils"),u=t("earcut"),h=n(u);},{"../../../utils":121,"./buildLine":60,earcut:2}],62:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){var r=t.shape,n=r.x,i=r.y,o=r.width,u=r.height;if(t.fill){var h=(0,a.hex2rgb)(t.fillColor),l=t.fillAlpha,c=h[0]*l,f=h[1]*l,d=h[2]*l,p=e.points,v=e.indices,y=p.length/6;p.push(n,i),p.push(c,f,d,l),p.push(n+o,i),p.push(c,f,d,l),p.push(n,i+u),p.push(c,f,d,l),p.push(n+o,i+u),p.push(c,f,d,l),v.push(y,y,y+1,y+2,y+3,y+3);}if(t.lineWidth){var g=t.points;t.points=[n,i,n+o,i,n+o,i+u,n,i+u,n,i],(0,s.default)(t,e),t.points=g;}}r.__esModule=!0,r.default=i;var o=t("./buildLine"),s=n(o),a=t("../../../utils");},{"../../../utils":121,"./buildLine":60}],63:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){var r=t.shape,n=r.x,i=r.y,o=r.width,a=r.height,h=r.radius,f=[];if(f.push(n,i+h),s(n,i+a-h,n,i+a,n+h,i+a,f),s(n+o-h,i+a,n+o,i+a,n+o,i+a-h,f),s(n+o,i+h,n+o,i,n+o-h,i,f),s(n+h,i,n,i,n,i+h+1e-10,f),t.fill){for(var d=(0,c.hex2rgb)(t.fillColor),p=t.fillAlpha,v=d[0]*p,y=d[1]*p,g=d[2]*p,m=e.points,_=e.indices,b=m.length/6,x=(0,u.default)(f,null,2),T=0,w=x.length;T<w;T+=3){ _.push(x[T]+b),_.push(x[T]+b),_.push(x[T+1]+b),_.push(x[T+2]+b),_.push(x[T+2]+b); }for(var E=0,S=f.length;E<S;E++){ m.push(f[E],f[++E],v,y,g,p); }}if(t.lineWidth){var O=t.points;t.points=f,(0,l.default)(t,e),t.points=O;}}function o(t,e,r){var n=e-t;return t+n*r}function s(t,e,r,n,i,s){for(var a=arguments.length>6&&void 0!==arguments[6]?arguments[6]:[],u=20,h=a,l=0,c=0,f=0,d=0,p=0,v=0,y=0,g=0;y<=u;++y){ g=y/u,l=o(t,r,g),c=o(e,n,g),f=o(r,i,g),d=o(n,s,g),p=o(l,f,g),v=o(c,d,g),h.push(p,v); }return h}r.__esModule=!0,r.default=i;var a=t("earcut"),u=n(a),h=t("./buildLine"),l=n(h),c=t("../../../utils");},{"../../../utils":121,"./buildLine":60,earcut:2}],64:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0,r.autoDetectRenderer=r.Application=r.Filter=r.SpriteMaskFilter=r.Quad=r.RenderTarget=r.ObjectRenderer=r.WebGLManager=r.Shader=r.CanvasRenderTarget=r.TextureUvs=r.VideoBaseTexture=r.BaseRenderTexture=r.RenderTexture=r.BaseTexture=r.Texture=r.Spritesheet=r.CanvasGraphicsRenderer=r.GraphicsRenderer=r.GraphicsData=r.Graphics=r.TextStyle=r.Text=r.SpriteRenderer=r.CanvasTinter=r.CanvasSpriteRenderer=r.Sprite=r.TransformBase=r.TransformStatic=r.Transform=r.Container=r.DisplayObject=r.Bounds=r.glCore=r.WebGLRenderer=r.CanvasRenderer=r.ticker=r.utils=r.settings=void 0;var o=t("./const");Object.keys(o).forEach(function(t){"default"!==t&&"__esModule"!==t&&Object.defineProperty(r,t,{enumerable:!0,get:function(){return o[t]}});});var s=t("./math");Object.keys(s).forEach(function(t){"default"!==t&&"__esModule"!==t&&Object.defineProperty(r,t,{enumerable:!0,get:function(){return s[t]}});});var a=t("pixi-gl-core");Object.defineProperty(r,"glCore",{enumerable:!0,get:function(){return i(a).default}});var u=t("./display/Bounds");Object.defineProperty(r,"Bounds",{enumerable:!0,get:function(){return i(u).default}});var h=t("./display/DisplayObject");Object.defineProperty(r,"DisplayObject",{enumerable:!0,get:function(){return i(h).default}});var l=t("./display/Container");Object.defineProperty(r,"Container",{enumerable:!0,get:function(){return i(l).default}});var c=t("./display/Transform");Object.defineProperty(r,"Transform",{enumerable:!0,get:function(){return i(c).default}});var f=t("./display/TransformStatic");Object.defineProperty(r,"TransformStatic",{enumerable:!0,get:function(){return i(f).default}});var d=t("./display/TransformBase");Object.defineProperty(r,"TransformBase",{
enumerable:!0,get:function(){return i(d).default}});var p=t("./sprites/Sprite");Object.defineProperty(r,"Sprite",{enumerable:!0,get:function(){return i(p).default}});var v=t("./sprites/canvas/CanvasSpriteRenderer");Object.defineProperty(r,"CanvasSpriteRenderer",{enumerable:!0,get:function(){return i(v).default}});var y=t("./sprites/canvas/CanvasTinter");Object.defineProperty(r,"CanvasTinter",{enumerable:!0,get:function(){return i(y).default}});var g=t("./sprites/webgl/SpriteRenderer");Object.defineProperty(r,"SpriteRenderer",{enumerable:!0,get:function(){return i(g).default}});var m=t("./text/Text");Object.defineProperty(r,"Text",{enumerable:!0,get:function(){return i(m).default}});var _=t("./text/TextStyle");Object.defineProperty(r,"TextStyle",{enumerable:!0,get:function(){return i(_).default}});var b=t("./graphics/Graphics");Object.defineProperty(r,"Graphics",{enumerable:!0,get:function(){return i(b).default}});var x=t("./graphics/GraphicsData");Object.defineProperty(r,"GraphicsData",{enumerable:!0,get:function(){return i(x).default}});var T=t("./graphics/webgl/GraphicsRenderer");Object.defineProperty(r,"GraphicsRenderer",{enumerable:!0,get:function(){return i(T).default}});var w=t("./graphics/canvas/CanvasGraphicsRenderer");Object.defineProperty(r,"CanvasGraphicsRenderer",{enumerable:!0,get:function(){return i(w).default}});var E=t("./textures/Spritesheet");Object.defineProperty(r,"Spritesheet",{enumerable:!0,get:function(){return i(E).default}});var S=t("./textures/Texture");Object.defineProperty(r,"Texture",{enumerable:!0,get:function(){return i(S).default}});var O=t("./textures/BaseTexture");Object.defineProperty(r,"BaseTexture",{enumerable:!0,get:function(){return i(O).default}});var P=t("./textures/RenderTexture");Object.defineProperty(r,"RenderTexture",{enumerable:!0,get:function(){return i(P).default}});var M=t("./textures/BaseRenderTexture");Object.defineProperty(r,"BaseRenderTexture",{enumerable:!0,get:function(){return i(M).default}});var C=t("./textures/VideoBaseTexture");Object.defineProperty(r,"VideoBaseTexture",{enumerable:!0,get:function(){return i(C).default}});var R=t("./textures/TextureUvs");Object.defineProperty(r,"TextureUvs",{enumerable:!0,get:function(){return i(R).default}});var A=t("./renderers/canvas/utils/CanvasRenderTarget");Object.defineProperty(r,"CanvasRenderTarget",{enumerable:!0,get:function(){return i(A).default}});var I=t("./Shader");Object.defineProperty(r,"Shader",{enumerable:!0,get:function(){return i(I).default}});var D=t("./renderers/webgl/managers/WebGLManager");Object.defineProperty(r,"WebGLManager",{enumerable:!0,get:function(){return i(D).default}});var L=t("./renderers/webgl/utils/ObjectRenderer");Object.defineProperty(r,"ObjectRenderer",{enumerable:!0,get:function(){return i(L).default}});var N=t("./renderers/webgl/utils/RenderTarget");Object.defineProperty(r,"RenderTarget",{enumerable:!0,get:function(){return i(N).default}});var F=t("./renderers/webgl/utils/Quad");Object.defineProperty(r,"Quad",{enumerable:!0,get:function(){return i(F).default}});var B=t("./renderers/webgl/filters/spriteMask/SpriteMaskFilter");Object.defineProperty(r,"SpriteMaskFilter",{enumerable:!0,get:function(){return i(B).default}});var j=t("./renderers/webgl/filters/Filter");Object.defineProperty(r,"Filter",{enumerable:!0,get:function(){return i(j).default}});var k=t("./Application");Object.defineProperty(r,"Application",{enumerable:!0,get:function(){return i(k).default}});var U=t("./autoDetectRenderer");Object.defineProperty(r,"autoDetectRenderer",{enumerable:!0,get:function(){return U.autoDetectRenderer}});var X=t("./utils"),G=n(X),W=t("./ticker"),H=n(W),V=t("./settings"),Y=i(V),z=t("./renderers/canvas/CanvasRenderer"),q=i(z),K=t("./renderers/webgl/WebGLRenderer"),Z=i(K);r.settings=Y.default,r.utils=G,r.ticker=H,r.CanvasRenderer=q.default,r.WebGLRenderer=Z.default;},{"./Application":42,"./Shader":43,"./autoDetectRenderer":44,"./const":45,"./display/Bounds":46,"./display/Container":47,"./display/DisplayObject":48,"./display/Transform":49,"./display/TransformBase":50,"./display/TransformStatic":51,"./graphics/Graphics":52,"./graphics/GraphicsData":53,"./graphics/canvas/CanvasGraphicsRenderer":54,"./graphics/webgl/GraphicsRenderer":56,"./math":69,"./renderers/canvas/CanvasRenderer":76,"./renderers/canvas/utils/CanvasRenderTarget":78,"./renderers/webgl/WebGLRenderer":83,"./renderers/webgl/filters/Filter":85,"./renderers/webgl/filters/spriteMask/SpriteMaskFilter":88,"./renderers/webgl/managers/WebGLManager":92,"./renderers/webgl/utils/ObjectRenderer":93,"./renderers/webgl/utils/Quad":94,"./renderers/webgl/utils/RenderTarget":95,"./settings":100,"./sprites/Sprite":101,"./sprites/canvas/CanvasSpriteRenderer":102,"./sprites/canvas/CanvasTinter":103,"./sprites/webgl/SpriteRenderer":105,"./text/Text":107,"./text/TextStyle":108,"./textures/BaseRenderTexture":109,"./textures/BaseTexture":110,"./textures/RenderTexture":111,"./textures/Spritesheet":112,"./textures/Texture":113,"./textures/TextureUvs":114,"./textures/VideoBaseTexture":115,"./ticker":117,"./utils":121,"pixi-gl-core":12}],65:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){return t<0?-1:t>0?1:0}function o(){for(var t=0;t<16;t++){var e=[];d.push(e);for(var r=0;r<16;r++){ for(var n=i(u[t]*u[r]+l[t]*h[r]),o=i(h[t]*u[r]+c[t]*h[r]),s=i(u[t]*l[r]+l[t]*c[r]),p=i(h[t]*l[r]+c[t]*c[r]),v=0;v<16;v++){ if(u[v]===n&&h[v]===o&&l[v]===s&&c[v]===p){e.push(v);break} } }}for(var y=0;y<16;y++){var g=new a.default;g.set(u[y],h[y],l[y],c[y],0,0),f.push(g);}}r.__esModule=!0;var s=t("./Matrix"),a=n(s),u=[1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1,0,1],h=[0,1,1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1],l=[0,-1,-1,-1,0,1,1,1,0,1,1,1,0,-1,-1,-1],c=[1,1,0,-1,-1,-1,0,1,-1,-1,0,1,1,1,0,-1],f=[],d=[];o();var p={E:0,SE:1,S:2,SW:3,W:4,NW:5,N:6,NE:7,MIRROR_VERTICAL:8,MIRROR_HORIZONTAL:12,uX:function(t){return u[t]},uY:function(t){return h[t]},vX:function(t){return l[t]},vY:function(t){return c[t]},inv:function(t){return 8&t?15&t:7&-t},add:function(t,e){return d[t][e]},sub:function(t,e){return d[t][p.inv(e)]},rotate180:function(t){return 4^t},isSwapWidthHeight:function(t){return 2===(3&t)},byDirection:function(t,e){return 2*Math.abs(t)<=Math.abs(e)?e>=0?p.S:p.N:2*Math.abs(e)<=Math.abs(t)?t>0?p.E:p.W:e>0?t>0?p.SE:p.SW:t>0?p.NE:p.NW},matrixAppendRotationInv:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,i=f[p.inv(e)];i.tx=r,i.ty=n,t.append(i);}};r.default=p;},{"./Matrix":66}],66:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("./Point"),a=n(s),u=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1,s=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0;i(this,t),this.a=e,this.b=r,this.c=n,this.d=o,this.tx=s,this.ty=a,this.array=null;}return t.prototype.fromArray=function(t){this.a=t[0],this.b=t[1],this.c=t[3],this.d=t[4],this.tx=t[2],this.ty=t[5];},t.prototype.set=function(t,e,r,n,i,o){return this.a=t,this.b=e,this.c=r,this.d=n,this.tx=i,this.ty=o,this},t.prototype.toArray=function(t,e){this.array||(this.array=new Float32Array(9));var r=e||this.array;return t?(r[0]=this.a,r[1]=this.b,r[2]=0,r[3]=this.c,r[4]=this.d,r[5]=0,r[6]=this.tx,r[7]=this.ty,r[8]=1):(r[0]=this.a,r[1]=this.c,r[2]=this.tx,r[3]=this.b,r[4]=this.d,r[5]=this.ty,r[6]=0,r[7]=0,r[8]=1),r},t.prototype.apply=function(t,e){e=e||new a.default;var r=t.x,n=t.y;return e.x=this.a*r+this.c*n+this.tx,e.y=this.b*r+this.d*n+this.ty,e},t.prototype.applyInverse=function(t,e){e=e||new a.default;var r=1/(this.a*this.d+this.c*-this.b),n=t.x,i=t.y;return e.x=this.d*r*n+-this.c*r*i+(this.ty*this.c-this.tx*this.d)*r,e.y=this.a*r*i+-this.b*r*n+(-this.ty*this.a+this.tx*this.b)*r,e},t.prototype.translate=function(t,e){return this.tx+=t,this.ty+=e,this},t.prototype.scale=function(t,e){return this.a*=t,this.d*=e,this.c*=t,this.b*=e,this.tx*=t,this.ty*=e,this},t.prototype.rotate=function(t){var e=Math.cos(t),r=Math.sin(t),n=this.a,i=this.c,o=this.tx;return this.a=n*e-this.b*r,this.b=n*r+this.b*e,this.c=i*e-this.d*r,this.d=i*r+this.d*e,this.tx=o*e-this.ty*r,this.ty=o*r+this.ty*e,this},t.prototype.append=function(t){var e=this.a,r=this.b,n=this.c,i=this.d;return this.a=t.a*e+t.b*n,this.b=t.a*r+t.b*i,this.c=t.c*e+t.d*n,this.d=t.c*r+t.d*i,this.tx=t.tx*e+t.ty*n+this.tx,this.ty=t.tx*r+t.ty*i+this.ty,this},t.prototype.setTransform=function(t,e,r,n,i,o,s,a,u){var h=Math.sin(s),l=Math.cos(s),c=Math.cos(u),f=Math.sin(u),d=-Math.sin(a),p=Math.cos(a),v=l*i,y=h*i,g=-h*o,m=l*o;return this.a=c*v+f*g,this.b=c*y+f*m,this.c=d*v+p*g,this.d=d*y+p*m,this.tx=t+(r*v+n*g),this.ty=e+(r*y+n*m),this},t.prototype.prepend=function(t){var e=this.tx;if(1!==t.a||0!==t.b||0!==t.c||1!==t.d){var r=this.a,n=this.c;this.a=r*t.a+this.b*t.c,this.b=r*t.b+this.b*t.d,this.c=n*t.a+this.d*t.c,this.d=n*t.b+this.d*t.d;}return this.tx=e*t.a+this.ty*t.c+t.tx,this.ty=e*t.b+this.ty*t.d+t.ty,this},t.prototype.decompose=function(t){var e=this.a,r=this.b,n=this.c,i=this.d,o=-Math.atan2(-n,i),s=Math.atan2(r,e),a=Math.abs(o+s);return a<1e-5?(t.rotation=s,e<0&&i>=0&&(t.rotation+=t.rotation<=0?Math.PI:-Math.PI),t.skew.x=t.skew.y=0):(t.skew.x=o,t.skew.y=s),t.scale.x=Math.sqrt(e*e+r*r),t.scale.y=Math.sqrt(n*n+i*i),t.position.x=this.tx,t.position.y=this.ty,t},t.prototype.invert=function(){var t=this.a,e=this.b,r=this.c,n=this.d,i=this.tx,o=t*n-e*r;return this.a=n/o,this.b=-e/o,this.c=-r/o,this.d=t/o,this.tx=(r*this.ty-n*i)/o,this.ty=-(t*this.ty-e*i)/o,this},t.prototype.identity=function(){return this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0,this},t.prototype.clone=function(){var e=new t;return e.a=this.a,e.b=this.b,e.c=this.c,e.d=this.d,e.tx=this.tx,e.ty=this.ty,e},t.prototype.copy=function(t){return t.a=this.a,t.b=this.b,t.c=this.c,t.d=this.d,t.tx=this.tx,t.ty=this.ty,t},o(t,null,[{key:"IDENTITY",get:function(){return new t}},{key:"TEMP_MATRIX",get:function(){return new t}}]),t}();r.default=u;},{"./Point":68}],67:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),o=function(){function t(e,r){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;n(this,t),this._x=i,this._y=o,this.cb=e,this.scope=r;}return t.prototype.set=function(t,e){var r=t||0,n=e||(0!==e?r:0);this._x===r&&this._y===n||(this._x=r,this._y=n,this.cb.call(this.scope));},t.prototype.copy=function(t){this._x===t.x&&this._y===t.y||(this._x=t.x,this._y=t.y,this.cb.call(this.scope));},i(t,[{key:"x",get:function(){return this._x},set:function(t){this._x!==t&&(this._x=t,this.cb.call(this.scope));}},{key:"y",get:function(){return this._y},set:function(t){this._y!==t&&(this._y=t,this.cb.call(this.scope));}}]),t}();r.default=o;},{}],68:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;n(this,t),this.x=e,this.y=r;}return t.prototype.clone=function(){return new t(this.x,this.y)},t.prototype.copy=function(t){this.set(t.x,t.y);},t.prototype.equals=function(t){return t.x===this.x&&t.y===this.y},t.prototype.set=function(t,e){this.x=t||0,this.y=e||(0!==e?this.x:0);},t}();r.default=i;},{}],69:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./Point");Object.defineProperty(r,"Point",{enumerable:!0,get:function(){return n(i).default}});var o=t("./ObservablePoint");Object.defineProperty(r,"ObservablePoint",{enumerable:!0,get:function(){return n(o).default}});var s=t("./Matrix");Object.defineProperty(r,"Matrix",{enumerable:!0,get:function(){return n(s).default}});var a=t("./GroupD8");Object.defineProperty(r,"GroupD8",{enumerable:!0,get:function(){return n(a).default}});var u=t("./shapes/Circle");Object.defineProperty(r,"Circle",{enumerable:!0,get:function(){return n(u).default}});var h=t("./shapes/Ellipse");Object.defineProperty(r,"Ellipse",{enumerable:!0,get:function(){return n(h).default}});var l=t("./shapes/Polygon");Object.defineProperty(r,"Polygon",{enumerable:!0,get:function(){return n(l).default}});var c=t("./shapes/Rectangle");Object.defineProperty(r,"Rectangle",{enumerable:!0,get:function(){return n(c).default}});var f=t("./shapes/RoundedRectangle");Object.defineProperty(r,"RoundedRectangle",{enumerable:!0,get:function(){return n(f).default}});},{"./GroupD8":65,"./Matrix":66,"./ObservablePoint":67,"./Point":68,"./shapes/Circle":70,"./shapes/Ellipse":71,"./shapes/Polygon":72,"./shapes/Rectangle":73,"./shapes/RoundedRectangle":74}],70:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("./Rectangle"),s=n(o),a=t("../../const"),u=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0;i(this,t),this.x=e,this.y=r,this.radius=n,this.type=a.SHAPES.CIRC;}return t.prototype.clone=function(){return new t(this.x,this.y,this.radius)},t.prototype.contains=function(t,e){if(this.radius<=0){ return!1; }var r=this.radius*this.radius,n=this.x-t,i=this.y-e;return n*=n,i*=i,n+i<=r},t.prototype.getBounds=function(){return new s.default(this.x-this.radius,this.y-this.radius,2*this.radius,2*this.radius)},t}();r.default=u;},{"../../const":45,"./Rectangle":73}],71:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("./Rectangle"),s=n(o),a=t("../../const"),u=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;i(this,t),this.x=e,this.y=r,this.width=n,this.height=o,this.type=a.SHAPES.ELIP;}return t.prototype.clone=function(){return new t(this.x,this.y,this.width,this.height)},t.prototype.contains=function(t,e){if(this.width<=0||this.height<=0){ return!1; }var r=(t-this.x)/this.width,n=(e-this.y)/this.height;return r*=r,n*=n,r+n<=1},t.prototype.getBounds=function(){return new s.default(this.x-this.width,this.y-this.height,this.width,this.height)},t}();r.default=u;},{"../../const":45,"./Rectangle":73}],72:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../Point"),s=n(o),a=t("../../const"),u=function(){function t(){
var arguments$1 = arguments;
for(var e=arguments.length,r=Array(e),n=0;n<e;n++){ r[n]=arguments$1[n]; }if(i(this,t),Array.isArray(r[0])&&(r=r[0]),r[0]instanceof s.default){for(var o=[],u=0,h=r.length;u<h;u++){ o.push(r[u].x,r[u].y); }r=o;}this.closed=!0,this.points=r,this.type=a.SHAPES.POLY;}return t.prototype.clone=function(){return new t(this.points.slice())},t.prototype.close=function(){var t=this.points;t[0]===t[t.length-2]&&t[1]===t[t.length-1]||t.push(t[0],t[1]);},t.prototype.contains=function(t,e){
var this$1 = this;
for(var r=!1,n=this.points.length/2,i=0,o=n-1;i<n;o=i++){var s=this$1.points[2*i],a=this$1.points[2*i+1],u=this$1.points[2*o],h=this$1.points[2*o+1],l=a>e!=h>e&&t<(u-s)*((e-a)/(h-a))+s;l&&(r=!r);}return r},t}();r.default=u;},{"../../const":45,"../Point":68}],73:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),o=t("../../const"),s=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,s=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;n(this,t),this.x=e,this.y=r,this.width=i,this.height=s,this.type=o.SHAPES.RECT;}return t.prototype.clone=function(){return new t(this.x,this.y,this.width,this.height)},t.prototype.copy=function(t){return this.x=t.x,this.y=t.y,this.width=t.width,this.height=t.height,this},t.prototype.contains=function(t,e){return!(this.width<=0||this.height<=0)&&(t>=this.x&&t<this.x+this.width&&e>=this.y&&e<this.y+this.height)},t.prototype.pad=function(t,e){t=t||0,e=e||(0!==e?t:0),this.x-=t,this.y-=e,this.width+=2*t,this.height+=2*e;},t.prototype.fit=function(t){this.x<t.x&&(this.width+=this.x,this.width<0&&(this.width=0),this.x=t.x),this.y<t.y&&(this.height+=this.y,this.height<0&&(this.height=0),this.y=t.y),this.x+this.width>t.x+t.width&&(this.width=t.width-this.x,this.width<0&&(this.width=0)),this.y+this.height>t.y+t.height&&(this.height=t.height-this.y,this.height<0&&(this.height=0));},t.prototype.enlarge=function(t){var e=Math.min(this.x,t.x),r=Math.max(this.x+this.width,t.x+t.width),n=Math.min(this.y,t.y),i=Math.max(this.y+this.height,t.y+t.height);this.x=e,this.width=r-e,this.y=n,this.height=i-n;},i(t,[{key:"left",get:function(){return this.x}},{key:"right",get:function(){return this.x+this.width}},{key:"top",get:function(){return this.y}},{key:"bottom",get:function(){return this.y+this.height}}],[{key:"EMPTY",get:function(){return new t(0,0,0,0)}}]),t}();r.default=s;},{"../../const":45}],74:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=t("../../const"),o=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,s=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:20;n(this,t),this.x=e,this.y=r,this.width=o,this.height=s,this.radius=a,this.type=i.SHAPES.RREC;}return t.prototype.clone=function(){return new t(this.x,this.y,this.width,this.height,this.radius)},t.prototype.contains=function(t,e){if(this.width<=0||this.height<=0){ return!1; }if(t>=this.x&&t<=this.x+this.width&&e>=this.y&&e<=this.y+this.height){if(e>=this.y+this.radius&&e<=this.y+this.height-this.radius||t>=this.x+this.radius&&t<=this.x+this.width-this.radius){ return!0; }var r=t-(this.x+this.radius),n=e-(this.y+this.radius),i=this.radius*this.radius;if(r*r+n*n<=i){ return!0; }if(r=t-(this.x+this.width-this.radius),r*r+n*n<=i){ return!0; }if(n=e-(this.y+this.height-this.radius),r*r+n*n<=i){ return!0; }if(r=t-(this.x+this.radius),r*r+n*n<=i){ return!0 }}return!1},t}();r.default=o;},{"../../const":45}],75:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../utils"),h=t("../math"),l=t("../const"),c=t("../settings"),f=n(c),d=t("../display/Container"),p=n(d),v=t("../textures/RenderTexture"),y=n(v),g=t("eventemitter3"),m=n(g),_=new h.Matrix,b=function(t){function e(r,n,s,a){i(this,e);var c=o(this,t.call(this));if((0,u.sayHello)(r),a){ for(var d in f.default.RENDER_OPTIONS){ "undefined"==typeof a[d]&&(a[d]=f.default.RENDER_OPTIONS[d]); } }else { a=f.default.RENDER_OPTIONS; }return c.type=l.RENDERER_TYPE.UNKNOWN,c.screen=new h.Rectangle(0,0,n||800,s||600),c.view=a.view||document.createElement("canvas"),c.resolution=a.resolution||f.default.RESOLUTION,c.transparent=a.transparent,c.autoResize=a.autoResize||!1,c.blendModes=null,c.preserveDrawingBuffer=a.preserveDrawingBuffer,c.clearBeforeRender=a.clearBeforeRender,c.roundPixels=a.roundPixels,c._backgroundColor=0,c._backgroundColorRgba=[0,0,0,0],c._backgroundColorString="#000000",c.backgroundColor=a.backgroundColor||c._backgroundColor,c._tempDisplayObjectParent=new p.default,c._lastObjectRendered=c._tempDisplayObjectParent,c}return s(e,t),e.prototype.resize=function(t,e){this.screen.width=t,this.screen.height=e,this.view.width=t*this.resolution,this.view.height=e*this.resolution,this.autoResize&&(this.view.style.width=t+"px",this.view.style.height=e+"px");},e.prototype.generateTexture=function(t,e,r){var n=t.getLocalBounds(),i=y.default.create(0|n.width,0|n.height,e,r);return _.tx=-n.x,_.ty=-n.y,this.render(t,i,!1,_,!0),i},e.prototype.destroy=function(t){t&&this.view.parentNode&&this.view.parentNode.removeChild(this.view),this.type=l.RENDERER_TYPE.UNKNOWN,this.view=null,this.screen=null,this.resolution=0,this.transparent=!1,this.autoResize=!1,this.blendModes=null,this.preserveDrawingBuffer=!1,this.clearBeforeRender=!1,this.roundPixels=!1,this._backgroundColor=0,this._backgroundColorRgba=null,this._backgroundColorString=null,this.backgroundColor=0,this._tempDisplayObjectParent=null,this._lastObjectRendered=null;},a(e,[{key:"width",get:function(){return this.view.width}},{key:"height",get:function(){return this.view.height}},{key:"backgroundColor",get:function(){return this._backgroundColor},set:function(t){this._backgroundColor=t,this._backgroundColorString=(0,u.hex2string)(t),(0,u.hex2rgb)(t,this._backgroundColorRgba);}}]),e}(m.default);r.default=b;},{"../const":45,"../display/Container":47,"../math":69,"../settings":100,"../textures/RenderTexture":111,"../utils":121,eventemitter3:3}],76:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../SystemRenderer"),u=n(a),h=t("./utils/CanvasMaskManager"),l=n(h),c=t("./utils/CanvasRenderTarget"),f=n(c),d=t("./utils/mapCanvasBlendModesToPixi"),p=n(d),v=t("../../utils"),y=t("../../const"),g=t("../../settings"),m=n(g),_=function(t){function e(r,n){var s=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};i(this,e);var a=o(this,t.call(this,"Canvas",r,n,s));return a.type=y.RENDERER_TYPE.CANVAS,a.rootContext=a.view.getContext("2d",{alpha:a.transparent}),a.refresh=!0,a.maskManager=new l.default(a),a.smoothProperty="imageSmoothingEnabled",a.rootContext.imageSmoothingEnabled||(a.rootContext.webkitImageSmoothingEnabled?a.smoothProperty="webkitImageSmoothingEnabled":a.rootContext.mozImageSmoothingEnabled?a.smoothProperty="mozImageSmoothingEnabled":a.rootContext.oImageSmoothingEnabled?a.smoothProperty="oImageSmoothingEnabled":a.rootContext.msImageSmoothingEnabled&&(a.smoothProperty="msImageSmoothingEnabled")),a.initPlugins(),a.blendModes=(0,p.default)(),a._activeBlendMode=null,a.context=null,a.renderingToScreen=!1,a.resize(r,n),a}return s(e,t),e.prototype.render=function(t,e,r,n,i){if(this.view){this.renderingToScreen=!e,this.emit("prerender");var o=this.resolution;e?(e=e.baseTexture||e,e._canvasRenderTarget||(e._canvasRenderTarget=new f.default(e.width,e.height,e.resolution),e.source=e._canvasRenderTarget.canvas,e.valid=!0),this.context=e._canvasRenderTarget.context,this.resolution=e._canvasRenderTarget.resolution):this.context=this.rootContext;var s=this.context;if(e||(this._lastObjectRendered=t),!i){var a=t.parent,u=this._tempDisplayObjectParent.transform.worldTransform;n?(n.copy(u),this._tempDisplayObjectParent.transform._worldID=-1):u.identity(),t.parent=this._tempDisplayObjectParent,t.updateTransform(),t.parent=a;}s.setTransform(1,0,0,1,0,0),s.globalAlpha=1,s.globalCompositeOperation=this.blendModes[y.BLEND_MODES.NORMAL],navigator.isCocoonJS&&this.view.screencanvas&&(s.fillStyle="black",s.clear()),(void 0!==r?r:this.clearBeforeRender)&&this.renderingToScreen&&(this.transparent?s.clearRect(0,0,this.width,this.height):(s.fillStyle=this._backgroundColorString,s.fillRect(0,0,this.width,this.height)));var h=this.context;this.context=s,t.renderCanvas(this),this.context=h,this.resolution=o,this.emit("postrender");}},e.prototype.clear=function(t){var e=this.context;t=t||this._backgroundColorString,!this.transparent&&t?(e.fillStyle=t,e.fillRect(0,0,this.width,this.height)):e.clearRect(0,0,this.width,this.height);},e.prototype.setBlendMode=function(t){this._activeBlendMode!==t&&(this._activeBlendMode=t,this.context.globalCompositeOperation=this.blendModes[t]);},e.prototype.destroy=function(e){this.destroyPlugins(),t.prototype.destroy.call(this,e),this.context=null,this.refresh=!0,this.maskManager.destroy(),this.maskManager=null,this.smoothProperty=null;},e.prototype.resize=function(e,r){t.prototype.resize.call(this,e,r),this.smoothProperty&&(this.rootContext[this.smoothProperty]=m.default.SCALE_MODE===y.SCALE_MODES.LINEAR);},e}(u.default);r.default=_,v.pluginTarget.mixin(_);},{"../../const":45,"../../settings":100,"../../utils":121,"../SystemRenderer":75,"./utils/CanvasMaskManager":77,"./utils/CanvasRenderTarget":78,"./utils/mapCanvasBlendModesToPixi":80}],77:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=t("../../../const"),o=function(){function t(e){n(this,t),this.renderer=e;}return t.prototype.pushMask=function(t){var e=this.renderer;e.context.save();var r=t.alpha,n=t.transform.worldTransform,i=e.resolution;e.context.setTransform(n.a*i,n.b*i,n.c*i,n.d*i,n.tx*i,n.ty*i),t._texture||(this.renderGraphicsShape(t),e.context.clip()),t.worldAlpha=r;},t.prototype.renderGraphicsShape=function(t){var e=this.renderer.context,r=t.graphicsData.length;if(0!==r){e.beginPath();for(var n=0;n<r;n++){var o=t.graphicsData[n],s=o.shape;if(o.type===i.SHAPES.POLY){var a=s.points;e.moveTo(a[0],a[1]);for(var u=1;u<a.length/2;u++){ e.lineTo(a[2*u],a[2*u+1]); }a[0]===a[a.length-2]&&a[1]===a[a.length-1]&&e.closePath();}else if(o.type===i.SHAPES.RECT){ e.rect(s.x,s.y,s.width,s.height),e.closePath(); }else if(o.type===i.SHAPES.CIRC){ e.arc(s.x,s.y,s.radius,0,2*Math.PI),e.closePath(); }else if(o.type===i.SHAPES.ELIP){var h=2*s.width,l=2*s.height,c=s.x-h/2,f=s.y-l/2,d=.5522848,p=h/2*d,v=l/2*d,y=c+h,g=f+l,m=c+h/2,_=f+l/2;e.moveTo(c,_),e.bezierCurveTo(c,_-v,m-p,f,m,f),e.bezierCurveTo(m+p,f,y,_-v,y,_),e.bezierCurveTo(y,_+v,m+p,g,m,g),e.bezierCurveTo(m-p,g,c,_+v,c,_),e.closePath();}else if(o.type===i.SHAPES.RREC){var b=s.x,x=s.y,T=s.width,w=s.height,E=s.radius,S=Math.min(T,w)/2|0;E=E>S?S:E,e.moveTo(b,x+E),e.lineTo(b,x+w-E),e.quadraticCurveTo(b,x+w,b+E,x+w),e.lineTo(b+T-E,x+w),e.quadraticCurveTo(b+T,x+w,b+T,x+w-E),e.lineTo(b+T,x+E),e.quadraticCurveTo(b+T,x,b+T-E,x),e.lineTo(b+E,x),e.quadraticCurveTo(b,x,b,x+E),e.closePath();}}}},t.prototype.popMask=function(t){t.context.restore();},t.prototype.destroy=function(){},t}();r.default=o;},{"../../../const":45}],78:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("../../../settings"),a=n(s),u=function(){function t(e,r,n){i(this,t),this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.resolution=n||a.default.RESOLUTION,this.resize(e,r);}return t.prototype.clear=function(){this.context.setTransform(1,0,0,1,0,0),this.context.clearRect(0,0,this.canvas.width,this.canvas.height);},t.prototype.resize=function(t,e){this.canvas.width=t*this.resolution,this.canvas.height=e*this.resolution;},t.prototype.destroy=function(){this.context=null,this.canvas=null;},o(t,[{key:"width",get:function(){return this.canvas.width},set:function(t){this.canvas.width=t;}},{key:"height",get:function(){return this.canvas.height},set:function(t){this.canvas.height=t;}}]),t}();r.default=u;},{"../../../settings":100}],79:[function(t,e,r){"use strict";function n(t){var e=document.createElement("canvas");e.width=6,e.height=1;var r=e.getContext("2d");return r.fillStyle=t,r.fillRect(0,0,6,1),e}function i(){if("undefined"==typeof document){ return!1; }var t=n("#ff00ff"),e=n("#ffff00"),r=document.createElement("canvas");r.width=6,r.height=1;var i=r.getContext("2d");i.globalCompositeOperation="multiply",i.drawImage(t,0,0),i.drawImage(e,2,0);var o=i.getImageData(2,0,1,1);if(!o){ return!1; }var s=o.data;return 255===s[0]&&0===s[1]&&0===s[2]}r.__esModule=!0,r.default=i;},{}],80:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];return(0,a.default)()?(t[o.BLEND_MODES.NORMAL]="source-over",t[o.BLEND_MODES.ADD]="lighter",t[o.BLEND_MODES.MULTIPLY]="multiply",t[o.BLEND_MODES.SCREEN]="screen",t[o.BLEND_MODES.OVERLAY]="overlay",t[o.BLEND_MODES.DARKEN]="darken",t[o.BLEND_MODES.LIGHTEN]="lighten",t[o.BLEND_MODES.COLOR_DODGE]="color-dodge",t[o.BLEND_MODES.COLOR_BURN]="color-burn",t[o.BLEND_MODES.HARD_LIGHT]="hard-light",t[o.BLEND_MODES.SOFT_LIGHT]="soft-light",t[o.BLEND_MODES.DIFFERENCE]="difference",t[o.BLEND_MODES.EXCLUSION]="exclusion",t[o.BLEND_MODES.HUE]="hue",t[o.BLEND_MODES.SATURATION]="saturate",t[o.BLEND_MODES.COLOR]="color",t[o.BLEND_MODES.LUMINOSITY]="luminosity"):(t[o.BLEND_MODES.NORMAL]="source-over",t[o.BLEND_MODES.ADD]="lighter",t[o.BLEND_MODES.MULTIPLY]="source-over",t[o.BLEND_MODES.SCREEN]="source-over",t[o.BLEND_MODES.OVERLAY]="source-over",t[o.BLEND_MODES.DARKEN]="source-over",t[o.BLEND_MODES.LIGHTEN]="source-over",t[o.BLEND_MODES.COLOR_DODGE]="source-over",t[o.BLEND_MODES.COLOR_BURN]="source-over",t[o.BLEND_MODES.HARD_LIGHT]="source-over",t[o.BLEND_MODES.SOFT_LIGHT]="source-over",t[o.BLEND_MODES.DIFFERENCE]="source-over",t[o.BLEND_MODES.EXCLUSION]="source-over",t[o.BLEND_MODES.HUE]="source-over",t[o.BLEND_MODES.SATURATION]="source-over",
t[o.BLEND_MODES.COLOR]="source-over",t[o.BLEND_MODES.LUMINOSITY]="source-over"),t}r.__esModule=!0,r.default=i;var o=t("../../../const"),s=t("./canUseNewCanvasBlendModes"),a=n(s);},{"../../../const":45,"./canUseNewCanvasBlendModes":79}],81:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../const"),s=t("../../settings"),a=n(s),u=function(){function t(e){i(this,t),this.renderer=e,this.count=0,this.checkCount=0,this.maxIdle=a.default.GC_MAX_IDLE,this.checkCountMax=a.default.GC_MAX_CHECK_COUNT,this.mode=a.default.GC_MODE;}return t.prototype.update=function(){this.count++,this.mode!==o.GC_MODES.MANUAL&&(this.checkCount++,this.checkCount>this.checkCountMax&&(this.checkCount=0,this.run()));},t.prototype.run=function(){
var this$1 = this;
for(var t=this.renderer.textureManager,e=t._managedTextures,r=!1,n=0;n<e.length;n++){var i=e[n];!i._glRenderTargets&&this$1.count-i.touched>this$1.maxIdle&&(t.destroyTexture(i,!0),e[n]=null,r=!0);}if(r){for(var o=0,s=0;s<e.length;s++){ null!==e[s]&&(e[o++]=e[s]); }e.length=o;}},t.prototype.unload=function(t){
var this$1 = this;
var e=this.renderer.textureManager;t._texture&&t._texture._glRenderTargets&&e.destroyTexture(t._texture,!0);for(var r=t.children.length-1;r>=0;r--){ this$1.unload(t.children[r]); }},t}();r.default=u;},{"../../const":45,"../../settings":100}],82:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("pixi-gl-core"),s=t("../../const"),a=t("./utils/RenderTarget"),u=n(a),h=t("../../utils"),l=function(){function t(e){i(this,t),this.renderer=e,this.gl=e.gl,this._managedTextures=[];}return t.prototype.bindTexture=function(){},t.prototype.getTexture=function(){},t.prototype.updateTexture=function(t,e){var r=this.gl,n=!!t._glRenderTargets;if(!t.hasLoaded){ return null; }var i=this.renderer.boundTextures;if(void 0===e){e=0;for(var a=0;a<i.length;++a){ if(i[a]===t){e=a;break} }}i[e]=t,r.activeTexture(r.TEXTURE0+e);var h=t._glTextures[this.renderer.CONTEXT_UID];if(h){ n?t._glRenderTargets[this.renderer.CONTEXT_UID].resize(t.width,t.height):h.upload(t.source); }else{if(n){var l=new u.default(this.gl,t.width,t.height,t.scaleMode,t.resolution);l.resize(t.width,t.height),t._glRenderTargets[this.renderer.CONTEXT_UID]=l,h=l.texture;}else { h=new o.GLTexture(this.gl,null,null,null,null),h.bind(e),h.premultiplyAlpha=!0,h.upload(t.source); }t._glTextures[this.renderer.CONTEXT_UID]=h,t.on("update",this.updateTexture,this),t.on("dispose",this.destroyTexture,this),this._managedTextures.push(t),t.isPowerOfTwo?(t.mipmap&&h.enableMipmap(),t.wrapMode===s.WRAP_MODES.CLAMP?h.enableWrapClamp():t.wrapMode===s.WRAP_MODES.REPEAT?h.enableWrapRepeat():h.enableWrapMirrorRepeat()):h.enableWrapClamp(),t.scaleMode===s.SCALE_MODES.NEAREST?h.enableNearestScaling():h.enableLinearScaling();}return h},t.prototype.destroyTexture=function(t,e){if(t=t.baseTexture||t,t.hasLoaded&&t._glTextures[this.renderer.CONTEXT_UID]&&(this.renderer.unbindTexture(t),t._glTextures[this.renderer.CONTEXT_UID].destroy(),t.off("update",this.updateTexture,this),t.off("dispose",this.destroyTexture,this),delete t._glTextures[this.renderer.CONTEXT_UID],!e)){var r=this._managedTextures.indexOf(t);r!==-1&&(0,h.removeItems)(this._managedTextures,r,1);}},t.prototype.removeAll=function(){
var this$1 = this;
for(var t=0;t<this._managedTextures.length;++t){var e=this$1._managedTextures[t];e._glTextures[this$1.renderer.CONTEXT_UID]&&delete e._glTextures[this$1.renderer.CONTEXT_UID];}},t.prototype.destroy=function(){
var this$1 = this;
for(var t=0;t<this._managedTextures.length;++t){var e=this$1._managedTextures[t];this$1.destroyTexture(e,!0),e.off("update",this$1.updateTexture,this$1),e.off("dispose",this$1.destroyTexture,this$1);}this._managedTextures=null;},t}();r.default=l;},{"../../const":45,"../../utils":121,"./utils/RenderTarget":95,"pixi-gl-core":12}],83:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../SystemRenderer"),u=n(a),h=t("./managers/MaskManager"),l=n(h),c=t("./managers/StencilManager"),f=n(c),d=t("./managers/FilterManager"),p=n(d),v=t("./utils/RenderTarget"),y=n(v),g=t("./utils/ObjectRenderer"),m=n(g),_=t("./TextureManager"),b=n(_),x=t("../../textures/BaseTexture"),T=n(x),w=t("./TextureGarbageCollector"),E=n(w),S=t("./WebGLState"),O=n(S),P=t("./utils/mapWebGLDrawModesToPixi"),M=n(P),C=t("./utils/validateContext"),R=n(C),A=t("../../utils"),I=t("pixi-gl-core"),D=n(I),L=t("../../const"),N=0,F=function(t){function e(r,n){var s=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};i(this,e);var a=o(this,t.call(this,"WebGL",r,n,s));return a.legacy=!!s.legacy,a.legacy&&(D.default.VertexArrayObject.FORCE_NATIVE=!0),a.type=L.RENDERER_TYPE.WEBGL,a.handleContextLost=a.handleContextLost.bind(a),a.handleContextRestored=a.handleContextRestored.bind(a),a.view.addEventListener("webglcontextlost",a.handleContextLost,!1),a.view.addEventListener("webglcontextrestored",a.handleContextRestored,!1),a._contextOptions={alpha:a.transparent,antialias:s.antialias,premultipliedAlpha:a.transparent&&"notMultiplied"!==a.transparent,stencil:!0,preserveDrawingBuffer:s.preserveDrawingBuffer},a._backgroundColorRgba[3]=a.transparent?0:1,a.maskManager=new l.default(a),a.stencilManager=new f.default(a),a.emptyRenderer=new m.default(a),a.currentRenderer=a.emptyRenderer,a.initPlugins(),s.context&&(0,R.default)(s.context),a.gl=s.context||D.default.createContext(a.view,a._contextOptions),a.CONTEXT_UID=N++,a.state=new O.default(a.gl),a.renderingToScreen=!0,a.boundTextures=null,a._activeShader=null,a._activeVao=null,a._activeRenderTarget=null,a._initContext(),a.filterManager=new p.default(a),a.drawModes=(0,M.default)(a.gl),a._nextTextureLocation=0,a.setBlendMode(0),a}return s(e,t),e.prototype._initContext=function(){
var this$1 = this;
var t=this.gl;t.isContextLost()&&t.getExtension("WEBGL_lose_context")&&t.getExtension("WEBGL_lose_context").restoreContext();var e=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS);this.boundTextures=new Array(e),this.emptyTextures=new Array(e),this.textureManager=new b.default(this),this.textureGC=new E.default(this),this.state.resetToDefault(),this.rootRenderTarget=new y.default(t,this.width,this.height,null,this.resolution,!0),this.rootRenderTarget.clearColor=this._backgroundColorRgba,this.bindRenderTarget(this.rootRenderTarget);var r=new D.default.GLTexture.fromData(t,null,1,1),n={_glTextures:{}};n._glTextures[this.CONTEXT_UID]={};for(var i=0;i<e;i++){var o=new T.default;o._glTextures[this$1.CONTEXT_UID]=r,this$1.boundTextures[i]=n,this$1.emptyTextures[i]=o,this$1.bindTexture(null,i);}this.emit("context",t),this.resize(this.screen.width,this.screen.height);},e.prototype.render=function(t,e,r,n,i){if(this.renderingToScreen=!e,this.emit("prerender"),this.gl&&!this.gl.isContextLost()){if(this._nextTextureLocation=0,e||(this._lastObjectRendered=t),!i){var o=t.parent;t.parent=this._tempDisplayObjectParent,t.updateTransform(),t.parent=o;}this.bindRenderTexture(e,n),this.currentRenderer.start(),(void 0!==r?r:this.clearBeforeRender)&&this._activeRenderTarget.clear(),t.renderWebGL(this),this.currentRenderer.flush(),this.textureGC.update(),this.emit("postrender");}},e.prototype.setObjectRenderer=function(t){this.currentRenderer!==t&&(this.currentRenderer.stop(),this.currentRenderer=t,this.currentRenderer.start());},e.prototype.flush=function(){this.setObjectRenderer(this.emptyRenderer);},e.prototype.resize=function(t,e){u.default.prototype.resize.call(this,t,e),this.rootRenderTarget.resize(t,e),this._activeRenderTarget===this.rootRenderTarget&&(this.rootRenderTarget.activate(),this._activeShader&&(this._activeShader.uniforms.projectionMatrix=this.rootRenderTarget.projectionMatrix.toArray(!0)));},e.prototype.setBlendMode=function(t){this.state.setBlendMode(t);},e.prototype.clear=function(t){this._activeRenderTarget.clear(t);},e.prototype.setTransform=function(t){this._activeRenderTarget.transform=t;},e.prototype.clearRenderTexture=function(t,e){var r=t.baseTexture,n=r._glRenderTargets[this.CONTEXT_UID];return n&&n.clear(e),this},e.prototype.bindRenderTexture=function(t,e){var r=void 0;if(t){var n=t.baseTexture;n._glRenderTargets[this.CONTEXT_UID]||this.textureManager.updateTexture(n,0),this.unbindTexture(n),r=n._glRenderTargets[this.CONTEXT_UID],r.setFrame(t.frame);}else { r=this.rootRenderTarget; }return r.transform=e,this.bindRenderTarget(r),this},e.prototype.bindRenderTarget=function(t){return t!==this._activeRenderTarget&&(this._activeRenderTarget=t,t.activate(),this._activeShader&&(this._activeShader.uniforms.projectionMatrix=t.projectionMatrix.toArray(!0)),this.stencilManager.setMaskStack(t.stencilMaskStack)),this},e.prototype.bindShader=function(t,e){return this._activeShader!==t&&(this._activeShader=t,t.bind(),e!==!1&&(t.uniforms.projectionMatrix=this._activeRenderTarget.projectionMatrix.toArray(!0))),this},e.prototype.bindTexture=function(t,e,r){
var this$1 = this;
if(t=t||this.emptyTextures[e],t=t.baseTexture||t,t.touched=this.textureGC.count,r){ e=e||0; }else{for(var n=0;n<this.boundTextures.length;n++){ if(this$1.boundTextures[n]===t){ return n; } }void 0===e&&(this._nextTextureLocation++,this._nextTextureLocation%=this.boundTextures.length,e=this.boundTextures.length-this._nextTextureLocation-1);}var i=this.gl,o=t._glTextures[this.CONTEXT_UID];return o?(this.boundTextures[e]=t,i.activeTexture(i.TEXTURE0+e),i.bindTexture(i.TEXTURE_2D,o.texture)):this.textureManager.updateTexture(t,e),e},e.prototype.unbindTexture=function(t){
var this$1 = this;
var e=this.gl;t=t.baseTexture||t;for(var r=0;r<this.boundTextures.length;r++){ this$1.boundTextures[r]===t&&(this$1.boundTextures[r]=this$1.emptyTextures[r],e.activeTexture(e.TEXTURE0+r),e.bindTexture(e.TEXTURE_2D,this$1.emptyTextures[r]._glTextures[this$1.CONTEXT_UID].texture)); }return this},e.prototype.createVao=function(){return new D.default.VertexArrayObject(this.gl,this.state.attribState)},e.prototype.bindVao=function(t){return this._activeVao===t?this:(t?t.bind():this._activeVao&&this._activeVao.unbind(),this._activeVao=t,this)},e.prototype.reset=function(){return this.setObjectRenderer(this.emptyRenderer),this._activeShader=null,this._activeRenderTarget=this.rootRenderTarget,this.rootRenderTarget.activate(),this.state.resetToDefault(),this},e.prototype.handleContextLost=function(t){t.preventDefault();},e.prototype.handleContextRestored=function(){this._initContext(),this.textureManager.removeAll();},e.prototype.destroy=function(e){this.destroyPlugins(),this.view.removeEventListener("webglcontextlost",this.handleContextLost),this.view.removeEventListener("webglcontextrestored",this.handleContextRestored),this.textureManager.destroy(),t.prototype.destroy.call(this,e),this.uid=0,this.maskManager.destroy(),this.stencilManager.destroy(),this.filterManager.destroy(),this.maskManager=null,this.filterManager=null,this.textureManager=null,this.currentRenderer=null,this.handleContextLost=null,this.handleContextRestored=null,this._contextOptions=null,this.gl.useProgram(null),this.gl.getExtension("WEBGL_lose_context")&&this.gl.getExtension("WEBGL_lose_context").loseContext(),this.gl=null;},e}(u.default);r.default=F,A.pluginTarget.mixin(F);},{"../../const":45,"../../textures/BaseTexture":110,"../../utils":121,"../SystemRenderer":75,"./TextureGarbageCollector":81,"./TextureManager":82,"./WebGLState":84,"./managers/FilterManager":89,"./managers/MaskManager":90,"./managers/StencilManager":91,"./utils/ObjectRenderer":93,"./utils/RenderTarget":95,"./utils/mapWebGLDrawModesToPixi":98,"./utils/validateContext":99,"pixi-gl-core":12}],84:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("./utils/mapWebGLBlendModesToPixi"),s=n(o),a=0,u=1,h=2,l=3,c=4,f=function(){function t(e){i(this,t),this.activeState=new Uint8Array(16),this.defaultState=new Uint8Array(16),this.defaultState[0]=1,this.stackIndex=0,this.stack=[],this.gl=e,this.maxAttribs=e.getParameter(e.MAX_VERTEX_ATTRIBS),this.attribState={tempAttribState:new Array(this.maxAttribs),attribState:new Array(this.maxAttribs)},this.blendModes=(0,s.default)(e),this.nativeVaoExtension=e.getExtension("OES_vertex_array_object")||e.getExtension("MOZ_OES_vertex_array_object")||e.getExtension("WEBKIT_OES_vertex_array_object");}return t.prototype.push=function(){
var this$1 = this;
var t=this.stack[this.stackIndex];t||(t=this.stack[this.stackIndex]=new Uint8Array(16)),++this.stackIndex;for(var e=0;e<this.activeState.length;e++){ t[e]=this$1.activeState[e]; }},t.prototype.pop=function(){var t=this.stack[--this.stackIndex];this.setState(t);},t.prototype.setState=function(t){this.setBlend(t[a]),this.setDepthTest(t[u]),this.setFrontFace(t[h]),this.setCullFace(t[l]),this.setBlendMode(t[c]);},t.prototype.setBlend=function(t){t=t?1:0,this.activeState[a]!==t&&(this.activeState[a]=t,this.gl[t?"enable":"disable"](this.gl.BLEND));},t.prototype.setBlendMode=function(t){t!==this.activeState[c]&&(this.activeState[c]=t,this.gl.blendFunc(this.blendModes[t][0],this.blendModes[t][1]));},t.prototype.setDepthTest=function(t){t=t?1:0,this.activeState[u]!==t&&(this.activeState[u]=t,this.gl[t?"enable":"disable"](this.gl.DEPTH_TEST));},t.prototype.setCullFace=function(t){t=t?1:0,this.activeState[l]!==t&&(this.activeState[l]=t,this.gl[t?"enable":"disable"](this.gl.CULL_FACE));},t.prototype.setFrontFace=function(t){t=t?1:0,this.activeState[h]!==t&&(this.activeState[h]=t,this.gl.frontFace(this.gl[t?"CW":"CCW"]));},t.prototype.resetAttributes=function(){
var this$1 = this;
for(var t=0;t<this.attribState.tempAttribState.length;t++){ this$1.attribState.tempAttribState[t]=0; }for(var e=0;e<this.attribState.attribState.length;e++){ this$1.attribState.attribState[e]=0; }for(var r=1;r<this.maxAttribs;r++){ this$1.gl.disableVertexAttribArray(r); }},t.prototype.resetToDefault=function(){
var this$1 = this;
this.nativeVaoExtension&&this.nativeVaoExtension.bindVertexArrayOES(null),this.resetAttributes();for(var t=0;t<this.activeState.length;++t){ this$1.activeState[t]=32; }this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL,!1),this.setState(this.defaultState);},t}();r.default=f;},{"./utils/mapWebGLBlendModesToPixi":97}],85:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("./extractUniformsFromSrc"),a=n(s),u=t("../../../utils"),h=t("../../../const"),l=t("../../../settings"),c=n(l),f={},d=function(){function t(e,r,n){
var this$1 = this;
i(this,t),this.vertexSrc=e||t.defaultVertexSrc,this.fragmentSrc=r||t.defaultFragmentSrc,this.blendMode=h.BLEND_MODES.NORMAL,this.uniformData=n||(0,a.default)(this.vertexSrc,this.fragmentSrc,"projectionMatrix|uSampler"),this.uniforms={};for(var o in this.uniformData){ this$1.uniforms[o]=this$1.uniformData[o].value; }this.glShaders={},f[this.vertexSrc+this.fragmentSrc]||(f[this.vertexSrc+this.fragmentSrc]=(0,u.uid)()),this.glShaderKey=f[this.vertexSrc+this.fragmentSrc],this.padding=4,this.resolution=c.default.RESOLUTION,this.enabled=!0;}return t.prototype.apply=function(t,e,r,n,i){t.applyFilter(this,e,r,n);},o(t,null,[{key:"defaultVertexSrc",get:function(){return["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 projectionMatrix;","uniform mat3 filterMatrix;","varying vec2 vTextureCoord;","varying vec2 vFilterCoord;","void main(void){","   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);","   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;","   vTextureCoord = aTextureCoord ;","}"].join("\n")}},{key:"defaultFragmentSrc",get:function(){return["varying vec2 vTextureCoord;","varying vec2 vFilterCoord;","uniform sampler2D uSampler;","uniform sampler2D filterSampler;","void main(void){","   vec4 masky = texture2D(filterSampler, vFilterCoord);","   vec4 sample = texture2D(uSampler, vTextureCoord);","   vec4 color;","   if(mod(vFilterCoord.x, 1.0) > 0.5)","   {","     color = vec4(1.0, 0.0, 0.0, 1.0);","   }","   else","   {","     color = vec4(0.0, 1.0, 0.0, 1.0);","   }","   gl_FragColor = mix(sample, masky, 0.5);","   gl_FragColor *= sample.a;","}"].join("\n")}}]),t}();r.default=d;},{"../../../const":45,"../../../settings":100,"../../../utils":121,"./extractUniformsFromSrc":86}],86:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e,r){var n=o(t,r),i=o(e,r);return Object.assign(n,i)}function o(t){for(var e=new RegExp("^(projectionMatrix|uSampler|filterArea|filterClamp)$"),r={},n=void 0,i=t.replace(/\s+/g," ").split(/\s*;\s*/),o=0;o<i.length;o++){var s=i[o].trim();if(s.indexOf("uniform")>-1){var a=s.split(" "),h=a[1],l=a[2],c=1;l.indexOf("[")>-1&&(n=l.split(/\[|]/),l=n[0],c*=Number(n[1])),l.match(e)||(r[l]={value:u(h,c),name:l,type:h});}}return r}r.__esModule=!0,r.default=i;var s=t("pixi-gl-core"),a=n(s),u=a.default.shader.defaultValue;},{"pixi-gl-core":12}],87:[function(t,e,r){"use strict";function n(t,e,r){var n=t.identity();return n.translate(e.x/r.width,e.y/r.height),n.scale(r.width,r.height),n}function i(t,e,r){var n=t.identity();n.translate(e.x/r.width,e.y/r.height);var i=r.width/e.width,o=r.height/e.height;return n.scale(i,o),n}function o(t,e,r,n){var i=n.worldTransform.copy(s.Matrix.TEMP_MATRIX),o=n._texture.baseTexture,a=t.identity(),u=r.height/r.width;a.translate(e.x/r.width,e.y/r.height),a.scale(1,u);var h=r.width/o.width,l=r.height/o.height;return i.tx/=o.width*h,i.ty/=o.width*h,i.invert(),a.prepend(i),a.scale(1,1/u),a.scale(h,l),a.translate(n.anchor.x,n.anchor.y),a}r.__esModule=!0,r.calculateScreenSpaceMatrix=n,r.calculateNormalizedScreenSpaceMatrix=i,r.calculateSpriteMatrix=o;var s=t("../../../math");},{"../../../math":69}],88:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../Filter"),u=n(a),h=t("../../../../math"),l=(t("path"),function(t){function e(r){i(this,e);var n=new h.Matrix,s=o(this,t.call(this,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 otherMatrix;\n\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n}\n","varying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform float alpha;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n    // check clip! this will stop the mask bleeding out from the edges\n    vec2 text = abs( vMaskCoord - 0.5 );\n    text = step(0.5, text);\n\n    float clip = 1.0 - max(text.y, text.x);\n    vec4 original = texture2D(uSampler, vTextureCoord);\n    vec4 masky = texture2D(mask, vMaskCoord);\n\n    original *= (masky.r * masky.a * alpha * clip);\n\n    gl_FragColor = original;\n}\n"));return r.renderable=!1,s.maskSprite=r,s.maskMatrix=n,s}return s(e,t),e.prototype.apply=function(t,e,r){var n=this.maskSprite;this.uniforms.mask=n._texture,this.uniforms.otherMatrix=t.calculateSpriteMatrix(this.maskMatrix,n),this.uniforms.alpha=n.worldAlpha,t.applyFilter(this,e,r);},e}(u.default));r.default=l;},{"../../../../math":69,"../Filter":85,path:23}],89:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function a(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var u=t("./WebGLManager"),h=i(u),l=t("../utils/RenderTarget"),c=i(l),f=t("../utils/Quad"),d=i(f),p=t("../../../math"),v=t("../../../Shader"),y=i(v),g=t("../filters/filterTransforms"),m=n(g),_=t("bit-twiddle"),b=i(_),x=function t(){a(this,t),this.renderTarget=null,this.sourceFrame=new p.Rectangle,this.destinationFrame=new p.Rectangle,this.filters=[],this.target=null,this.resolution=1;},T=function(t){function e(r){a(this,e);var n=o(this,t.call(this,r));return n.gl=n.renderer.gl,n.quad=new d.default(n.gl,r.state.attribState),n.shaderCache={},n.pool={},n.filterData=null,n}return s(e,t),e.prototype.pushFilter=function(t,e){var r=this.renderer,n=this.filterData;if(!n){n=this.renderer._activeRenderTarget.filterStack;var i=new x;i.sourceFrame=i.destinationFrame=this.renderer._activeRenderTarget.size,i.renderTarget=r._activeRenderTarget,this.renderer._activeRenderTarget.filterData=n={index:0,stack:[i]},this.filterData=n;}var o=n.stack[++n.index];o||(o=n.stack[n.index]=new x);var s=e[0].resolution,a=0|e[0].padding,u=t.filterArea||t.getBounds(!0),h=o.sourceFrame,l=o.destinationFrame;h.x=(u.x*s|0)/s,h.y=(u.y*s|0)/s,h.width=(u.width*s|0)/s,h.height=(u.height*s|0)/s,n.stack[0].renderTarget.transform||h.fit(n.stack[0].destinationFrame),h.pad(a),l.width=h.width,l.height=h.height;var c=this.getPotRenderTarget(r.gl,h.width,h.height,s);o.target=t,o.filters=e,o.resolution=s,o.renderTarget=c,c.setFrame(l,h),r.bindRenderTarget(c),c.clear();},e.prototype.popFilter=function(){
var this$1 = this;
var t=this.filterData,e=t.stack[t.index-1],r=t.stack[t.index];this.quad.map(r.renderTarget.size,r.sourceFrame).upload();var n=r.filters;if(1===n.length){ n[0].apply(this,r.renderTarget,e.renderTarget,!1,r),this.freePotRenderTarget(r.renderTarget); }else{var i=r.renderTarget,o=this.getPotRenderTarget(this.renderer.gl,r.sourceFrame.width,r.sourceFrame.height,r.resolution);o.setFrame(r.destinationFrame,r.sourceFrame),o.clear();var s=0;for(s=0;s<n.length-1;++s){n[s].apply(this$1,i,o,!0,r);var a=i;i=o,o=a;}n[s].apply(this,i,e.renderTarget,!1,r),this.freePotRenderTarget(i),this.freePotRenderTarget(o);}t.index--,0===t.index&&(this.filterData=null);},e.prototype.applyFilter=function(t,e,r,n){var i=this.renderer,o=i.gl,s=t.glShaders[i.CONTEXT_UID];s||(t.glShaderKey?(s=this.shaderCache[t.glShaderKey],s||(s=new y.default(this.gl,t.vertexSrc,t.fragmentSrc),t.glShaders[i.CONTEXT_UID]=this.shaderCache[t.glShaderKey]=s)):s=t.glShaders[i.CONTEXT_UID]=new y.default(this.gl,t.vertexSrc,t.fragmentSrc),i.bindVao(null),this.quad.initVao(s)),i.bindVao(this.quad.vao),i.bindRenderTarget(r),n&&(o.disable(o.SCISSOR_TEST),i.clear(),o.enable(o.SCISSOR_TEST)),r===i.maskManager.scissorRenderTarget&&i.maskManager.pushScissorMask(null,i.maskManager.scissorData),i.bindShader(s);var a=this.renderer.emptyTextures[0];this.renderer.boundTextures[0]=a,this.syncUniforms(s,t),i.state.setBlendMode(t.blendMode),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,e.texture.texture),this.quad.vao.draw(this.renderer.gl.TRIANGLES,6,0),o.bindTexture(o.TEXTURE_2D,a._glTextures[this.renderer.CONTEXT_UID].texture);},e.prototype.syncUniforms=function(t,e){
var this$1 = this;
var r=e.uniformData,n=e.uniforms,i=1,o=void 0;if(t.uniforms.filterArea){o=this.filterData.stack[this.filterData.index];var s=t.uniforms.filterArea;s[0]=o.renderTarget.size.width,s[1]=o.renderTarget.size.height,s[2]=o.sourceFrame.x,s[3]=o.sourceFrame.y,t.uniforms.filterArea=s;}if(t.uniforms.filterClamp){o=o||this.filterData.stack[this.filterData.index];var a=t.uniforms.filterClamp;a[0]=0,a[1]=0,a[2]=(o.sourceFrame.width-1)/o.renderTarget.size.width,a[3]=(o.sourceFrame.height-1)/o.renderTarget.size.height,t.uniforms.filterClamp=a;}for(var u in r){ if("sampler2D"===r[u].type&&0!==n[u]){if(n[u].baseTexture){ t.uniforms[u]=this$1.renderer.bindTexture(n[u].baseTexture,i); }else{t.uniforms[u]=i;var h=this$1.renderer.gl;this$1.renderer.boundTextures[i]=this$1.renderer.emptyTextures[i],h.activeTexture(h.TEXTURE0+i),n[u].texture.bind();}i++;}else if("mat3"===r[u].type){ void 0!==n[u].a?t.uniforms[u]=n[u].toArray(!0):t.uniforms[u]=n[u]; }else if("vec2"===r[u].type){ if(void 0!==n[u].x){var l=t.uniforms[u]||new Float32Array(2);l[0]=n[u].x,l[1]=n[u].y,t.uniforms[u]=l;}else { t.uniforms[u]=n[u]; } }else{ "float"===r[u].type?t.uniforms.data[u].value!==r[u]&&(t.uniforms[u]=n[u]):t.uniforms[u]=n[u]; } }},e.prototype.getRenderTarget=function(t,e){var r=this.filterData.stack[this.filterData.index],n=this.getPotRenderTarget(this.renderer.gl,r.sourceFrame.width,r.sourceFrame.height,e||r.resolution);return n.setFrame(r.destinationFrame,r.sourceFrame),n},e.prototype.returnRenderTarget=function(t){this.freePotRenderTarget(t);},e.prototype.calculateScreenSpaceMatrix=function(t){var e=this.filterData.stack[this.filterData.index];return m.calculateScreenSpaceMatrix(t,e.sourceFrame,e.renderTarget.size)},e.prototype.calculateNormalizedScreenSpaceMatrix=function(t){var e=this.filterData.stack[this.filterData.index];return m.calculateNormalizedScreenSpaceMatrix(t,e.sourceFrame,e.renderTarget.size,e.destinationFrame)},e.prototype.calculateSpriteMatrix=function(t,e){var r=this.filterData.stack[this.filterData.index];return m.calculateSpriteMatrix(t,r.sourceFrame,r.renderTarget.size,e)},e.prototype.destroy=function(){this.shaderCache={},this.emptyPool();},e.prototype.getPotRenderTarget=function(t,e,r,n){e=b.default.nextPow2(e*n),r=b.default.nextPow2(r*n);var i=(65535&e)<<16|65535&r;this.pool[i]||(this.pool[i]=[]);var o=this.pool[i].pop();if(!o){var s=this.renderer.boundTextures[0];t.activeTexture(t.TEXTURE0),o=new c.default(t,e,r,null,1),t.bindTexture(t.TEXTURE_2D,s._glTextures[this.renderer.CONTEXT_UID].texture);}return o.resolution=n,o.defaultFrame.width=o.size.width=e/n,o.defaultFrame.height=o.size.height=r/n,o},e.prototype.emptyPool=function(){
var this$1 = this;
for(var t in this.pool){var e=this$1.pool[t];if(e){ for(var r=0;r<e.length;r++){ e[r].destroy(!0); } }}this.pool={};},e.prototype.freePotRenderTarget=function(t){var e=t.size.width*t.resolution,r=t.size.height*t.resolution,n=(65535&e)<<16|65535&r;this.pool[n].push(t);},e}(h.default);r.default=T;},{"../../../Shader":43,"../../../math":69,"../filters/filterTransforms":87,"../utils/Quad":94,"../utils/RenderTarget":95,"./WebGLManager":92,"bit-twiddle":1}],90:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("./WebGLManager"),u=n(a),h=t("../filters/spriteMask/SpriteMaskFilter"),l=n(h),c=function(t){function e(r){i(this,e);var n=o(this,t.call(this,r));return n.scissor=!1,n.scissorData=null,n.scissorRenderTarget=null,n.enableScissor=!0,n.alphaMaskPool=[],n.alphaMaskIndex=0,n}return s(e,t),e.prototype.pushMask=function(t,e){if(e.texture){ this.pushSpriteMask(t,e); }else if(this.enableScissor&&!this.scissor&&this.renderer._activeRenderTarget.root&&!this.renderer.stencilManager.stencilMaskStack.length&&e.isFastRect()){var r=e.worldTransform,n=Math.atan2(r.b,r.a);n=Math.round(n*(180/Math.PI)),n%90?this.pushStencilMask(e):this.pushScissorMask(t,e);}else { this.pushStencilMask(e); }},e.prototype.popMask=function(t,e){e.texture?this.popSpriteMask(t,e):this.enableScissor&&!this.renderer.stencilManager.stencilMaskStack.length?this.popScissorMask(t,e):this.popStencilMask(t,e);},e.prototype.pushSpriteMask=function(t,e){var r=this.alphaMaskPool[this.alphaMaskIndex];r||(r=this.alphaMaskPool[this.alphaMaskIndex]=[new l.default(e)]),r[0].resolution=this.renderer.resolution,r[0].maskSprite=e,t.filterArea=e.getBounds(!0),this.renderer.filterManager.pushFilter(t,r),this.alphaMaskIndex++;},e.prototype.popSpriteMask=function(){this.renderer.filterManager.popFilter(),this.alphaMaskIndex--;},e.prototype.pushStencilMask=function(t){this.renderer.currentRenderer.stop(),this.renderer.stencilManager.pushStencil(t);},e.prototype.popStencilMask=function(){this.renderer.currentRenderer.stop(),this.renderer.stencilManager.popStencil();},e.prototype.pushScissorMask=function(t,e){e.renderable=!0;var r=this.renderer._activeRenderTarget,n=e.getBounds();n.fit(r.size),e.renderable=!1,this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);var i=this.renderer.resolution;this.renderer.gl.scissor(n.x*i,(r.root?r.size.height-n.y-n.height:n.y)*i,n.width*i,n.height*i),this.scissorRenderTarget=r,this.scissorData=e,this.scissor=!0;},e.prototype.popScissorMask=function(){this.scissorRenderTarget=null,this.scissorData=null,this.scissor=!1;var t=this.renderer.gl;t.disable(t.SCISSOR_TEST);},e}(u.default);r.default=c;},{"../filters/spriteMask/SpriteMaskFilter":88,"./WebGLManager":92}],91:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("./WebGLManager"),u=n(a),h=function(t){function e(r){i(this,e);var n=o(this,t.call(this,r));return n.stencilMaskStack=null,n}return s(e,t),e.prototype.setMaskStack=function(t){this.stencilMaskStack=t;var e=this.renderer.gl;0===t.length?e.disable(e.STENCIL_TEST):e.enable(e.STENCIL_TEST);},e.prototype.pushStencil=function(t){this.renderer.setObjectRenderer(this.renderer.plugins.graphics),this.renderer._activeRenderTarget.attachStencilBuffer();var e=this.renderer.gl,r=this.stencilMaskStack;0===r.length&&(e.enable(e.STENCIL_TEST),e.clear(e.STENCIL_BUFFER_BIT),e.stencilFunc(e.ALWAYS,1,1)),r.push(t),e.colorMask(!1,!1,!1,!1),e.stencilOp(e.KEEP,e.KEEP,e.INCR),this.renderer.plugins.graphics.render(t),e.colorMask(!0,!0,!0,!0),e.stencilFunc(e.NOTEQUAL,0,r.length),e.stencilOp(e.KEEP,e.KEEP,e.KEEP);},e.prototype.popStencil=function(){this.renderer.setObjectRenderer(this.renderer.plugins.graphics);
var t=this.renderer.gl,e=this.stencilMaskStack,r=e.pop();0===e.length?t.disable(t.STENCIL_TEST):(t.colorMask(!1,!1,!1,!1),t.stencilOp(t.KEEP,t.KEEP,t.DECR),this.renderer.plugins.graphics.render(r),t.colorMask(!0,!0,!0,!0),t.stencilFunc(t.NOTEQUAL,0,e.length),t.stencilOp(t.KEEP,t.KEEP,t.KEEP));},e.prototype.destroy=function(){u.default.prototype.destroy.call(this),this.stencilMaskStack.stencilStack=null;},e}(u.default);r.default=h;},{"./WebGLManager":92}],92:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(e){n(this,t),this.renderer=e,this.renderer.on("context",this.onContextChange,this);}return t.prototype.onContextChange=function(){},t.prototype.destroy=function(){this.renderer.off("context",this.onContextChange,this),this.renderer=null;},t}();r.default=i;},{}],93:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../managers/WebGLManager"),u=n(a),h=function(t){function e(){return i(this,e),o(this,t.apply(this,arguments))}return s(e,t),e.prototype.start=function(){},e.prototype.stop=function(){this.flush();},e.prototype.flush=function(){},e.prototype.render=function(t){},e}(u.default);r.default=h;},{"../managers/WebGLManager":92}],94:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("pixi-gl-core"),s=n(o),a=t("../../../utils/createIndicesForQuads"),u=n(a),h=function(){function t(e,r){
var this$1 = this;
i(this,t),this.gl=e,this.vertices=new Float32Array([-1,-1,1,-1,1,1,-1,1]),this.uvs=new Float32Array([0,0,1,0,1,1,0,1]),this.interleaved=new Float32Array(16);for(var n=0;n<4;n++){ this$1.interleaved[4*n]=this$1.vertices[2*n],this$1.interleaved[4*n+1]=this$1.vertices[2*n+1],this$1.interleaved[4*n+2]=this$1.uvs[2*n],this$1.interleaved[4*n+3]=this$1.uvs[2*n+1]; }this.indices=(0,u.default)(1),this.vertexBuffer=s.default.GLBuffer.createVertexBuffer(e,this.interleaved,e.STATIC_DRAW),this.indexBuffer=s.default.GLBuffer.createIndexBuffer(e,this.indices,e.STATIC_DRAW),this.vao=new s.default.VertexArrayObject(e,r);}return t.prototype.initVao=function(t){this.vao.clear().addIndex(this.indexBuffer).addAttribute(this.vertexBuffer,t.attributes.aVertexPosition,this.gl.FLOAT,!1,16,0).addAttribute(this.vertexBuffer,t.attributes.aTextureCoord,this.gl.FLOAT,!1,16,8);},t.prototype.map=function(t,e){var r=0,n=0;return this.uvs[0]=r,this.uvs[1]=n,this.uvs[2]=r+e.width/t.width,this.uvs[3]=n,this.uvs[4]=r+e.width/t.width,this.uvs[5]=n+e.height/t.height,this.uvs[6]=r,this.uvs[7]=n+e.height/t.height,r=e.x,n=e.y,this.vertices[0]=r,this.vertices[1]=n,this.vertices[2]=r+e.width,this.vertices[3]=n,this.vertices[4]=r+e.width,this.vertices[5]=n+e.height,this.vertices[6]=r,this.vertices[7]=n+e.height,this},t.prototype.upload=function(){
var this$1 = this;
for(var t=0;t<4;t++){ this$1.interleaved[4*t]=this$1.vertices[2*t],this$1.interleaved[4*t+1]=this$1.vertices[2*t+1],this$1.interleaved[4*t+2]=this$1.uvs[2*t],this$1.interleaved[4*t+3]=this$1.uvs[2*t+1]; }return this.vertexBuffer.upload(this.interleaved),this},t.prototype.destroy=function(){var t=this.gl;t.deleteBuffer(this.vertexBuffer),t.deleteBuffer(this.indexBuffer);},t}();r.default=h;},{"../../../utils/createIndicesForQuads":119,"pixi-gl-core":12}],95:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../../math"),s=t("../../../const"),a=t("../../../settings"),u=n(a),h=t("pixi-gl-core"),l=function(){function t(e,r,n,a,l,c){i(this,t),this.gl=e,this.frameBuffer=null,this.texture=null,this.clearColor=[0,0,0,0],this.size=new o.Rectangle(0,0,1,1),this.resolution=l||u.default.RESOLUTION,this.projectionMatrix=new o.Matrix,this.transform=null,this.frame=null,this.defaultFrame=new o.Rectangle,this.destinationFrame=null,this.sourceFrame=null,this.stencilBuffer=null,this.stencilMaskStack=[],this.filterData=null,this.scaleMode=void 0!==a?a:u.default.SCALE_MODE,this.root=c,this.root?(this.frameBuffer=new h.GLFramebuffer(e,100,100),this.frameBuffer.framebuffer=null):(this.frameBuffer=h.GLFramebuffer.createRGBA(e,100,100),this.scaleMode===s.SCALE_MODES.NEAREST?this.frameBuffer.texture.enableNearestScaling():this.frameBuffer.texture.enableLinearScaling(),this.texture=this.frameBuffer.texture),this.setFrame(),this.resize(r,n);}return t.prototype.clear=function(t){var e=t||this.clearColor;this.frameBuffer.clear(e[0],e[1],e[2],e[3]);},t.prototype.attachStencilBuffer=function(){this.root||this.frameBuffer.enableStencil();},t.prototype.setFrame=function(t,e){this.destinationFrame=t||this.destinationFrame||this.defaultFrame,this.sourceFrame=e||this.sourceFrame||t;},t.prototype.activate=function(){var t=this.gl;this.frameBuffer.bind(),this.calculateProjection(this.destinationFrame,this.sourceFrame),this.transform&&this.projectionMatrix.append(this.transform),this.destinationFrame!==this.sourceFrame?(t.enable(t.SCISSOR_TEST),t.scissor(0|this.destinationFrame.x,0|this.destinationFrame.y,this.destinationFrame.width*this.resolution|0,this.destinationFrame.height*this.resolution|0)):t.disable(t.SCISSOR_TEST),t.viewport(0|this.destinationFrame.x,0|this.destinationFrame.y,this.destinationFrame.width*this.resolution|0,this.destinationFrame.height*this.resolution|0);},t.prototype.calculateProjection=function(t,e){var r=this.projectionMatrix;e=e||t,r.identity(),this.root?(r.a=1/t.width*2,r.d=-1/t.height*2,r.tx=-1-e.x*r.a,r.ty=1-e.y*r.d):(r.a=1/t.width*2,r.d=1/t.height*2,r.tx=-1-e.x*r.a,r.ty=-1-e.y*r.d);},t.prototype.resize=function(t,e){if(t|=0,e|=0,this.size.width!==t||this.size.height!==e){this.size.width=t,this.size.height=e,this.defaultFrame.width=t,this.defaultFrame.height=e,this.frameBuffer.resize(t*this.resolution,e*this.resolution);var r=this.frame||this.size;this.calculateProjection(r);}},t.prototype.destroy=function(){this.frameBuffer.destroy(),this.frameBuffer=null,this.texture=null;},t}();r.default=l;},{"../../../const":45,"../../../math":69,"../../../settings":100,"pixi-gl-core":12}],96:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){var r=!e;if(r){var n=document.createElement("canvas");n.width=1,n.height=1,e=a.default.createContext(n);}for(var i=e.createShader(e.FRAGMENT_SHADER);;){var s=u.replace(/%forloop%/gi,o(t));if(e.shaderSource(i,s),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)){ break; }t=t/2|0;}return r&&e.getExtension("WEBGL_lose_context")&&e.getExtension("WEBGL_lose_context").loseContext(),t}function o(t){for(var e="",r=0;r<t;++r){ r>0&&(e+="\nelse "),r<t-1&&(e+="if(test == "+r+".0){}"); }return e}r.__esModule=!0,r.default=i;var s=t("pixi-gl-core"),a=n(s),u=["precision mediump float;","void main(void){","float test = 0.1;","%forloop%","gl_FragColor = vec4(0.0);","}"].join("\n");},{"pixi-gl-core":12}],97:[function(t,e,r){"use strict";function n(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[];return e[i.BLEND_MODES.NORMAL]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.ADD]=[t.ONE,t.DST_ALPHA],e[i.BLEND_MODES.MULTIPLY]=[t.DST_COLOR,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.SCREEN]=[t.ONE,t.ONE_MINUS_SRC_COLOR],e[i.BLEND_MODES.OVERLAY]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.DARKEN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.LIGHTEN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.COLOR_DODGE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.COLOR_BURN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.HARD_LIGHT]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.SOFT_LIGHT]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.DIFFERENCE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.EXCLUSION]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.HUE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.SATURATION]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.COLOR]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[i.BLEND_MODES.LUMINOSITY]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e}r.__esModule=!0,r.default=n;var i=t("../../../const");},{"../../../const":45}],98:[function(t,e,r){"use strict";function n(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return e[i.DRAW_MODES.POINTS]=t.POINTS,e[i.DRAW_MODES.LINES]=t.LINES,e[i.DRAW_MODES.LINE_LOOP]=t.LINE_LOOP,e[i.DRAW_MODES.LINE_STRIP]=t.LINE_STRIP,e[i.DRAW_MODES.TRIANGLES]=t.TRIANGLES,e[i.DRAW_MODES.TRIANGLE_STRIP]=t.TRIANGLE_STRIP,e[i.DRAW_MODES.TRIANGLE_FAN]=t.TRIANGLE_FAN,e}r.__esModule=!0,r.default=n;var i=t("../../../const");},{"../../../const":45}],99:[function(t,e,r){"use strict";function n(t){var e=t.getContextAttributes();e.stencil||console.warn("Provided WebGL context does not have a stencil buffer, masks may not render correctly");}r.__esModule=!0,r.default=n;},{}],100:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./utils/maxRecommendedTextures"),o=n(i),s=t("./utils/canUploadSameBuffer"),a=n(s);r.default={TARGET_FPMS:.06,MIPMAP_TEXTURES:!0,RESOLUTION:1,FILTER_RESOLUTION:1,SPRITE_MAX_TEXTURES:(0,o.default)(32),SPRITE_BATCH_SIZE:4096,RETINA_PREFIX:/@([0-9\.]+)x/,RENDER_OPTIONS:{view:null,antialias:!1,forceFXAA:!1,autoResize:!1,transparent:!1,backgroundColor:0,clearBeforeRender:!0,preserveDrawingBuffer:!1,roundPixels:!1},TRANSFORM_MODE:0,GC_MODE:0,GC_MAX_IDLE:3600,GC_MAX_CHECK_COUNT:600,WRAP_MODE:0,SCALE_MODE:0,PRECISION_VERTEX:"highp",PRECISION_FRAGMENT:"mediump",CAN_UPLOAD_SAME_BUFFER:(0,a.default)()};},{"./utils/canUploadSameBuffer":118,"./utils/maxRecommendedTextures":122}],101:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../math"),h=t("../utils"),l=t("../const"),c=t("../textures/Texture"),f=n(c),d=t("../display/Container"),p=n(d),v=new u.Point,y=function(t){function e(r){i(this,e);var n=o(this,t.call(this));return n._anchor=new u.ObservablePoint(n._onAnchorUpdate,n),n._texture=null,n._width=0,n._height=0,n._tint=null,n._tintRGB=null,n.tint=16777215,n.blendMode=l.BLEND_MODES.NORMAL,n.shader=null,n.cachedTint=16777215,n.texture=r||f.default.EMPTY,n.vertexData=new Float32Array(8),n.vertexTrimmedData=null,n._transformID=-1,n._textureID=-1,n._transformTrimmedID=-1,n._textureTrimmedID=-1,n.pluginName="sprite",n}return s(e,t),e.prototype._onTextureUpdate=function(){this._textureID=-1,this._textureTrimmedID=-1,this._width&&(this.scale.x=(0,h.sign)(this.scale.x)*this._width/this.texture.orig.width),this._height&&(this.scale.y=(0,h.sign)(this.scale.y)*this._height/this.texture.orig.height);},e.prototype._onAnchorUpdate=function(){this._transformID=-1,this._transformTrimmedID=-1;},e.prototype.calculateVertices=function(){if(this._transformID!==this.transform._worldID||this._textureID!==this._texture._updateID){this._transformID=this.transform._worldID,this._textureID=this._texture._updateID;var t=this._texture,e=this.transform.worldTransform,r=e.a,n=e.b,i=e.c,o=e.d,s=e.tx,a=e.ty,u=this.vertexData,h=t.trim,l=t.orig,c=this._anchor,f=0,d=0,p=0,v=0;h?(d=h.x-c._x*l.width,f=d+h.width,v=h.y-c._y*l.height,p=v+h.height):(d=-c._x*l.width,f=d+l.width,v=-c._y*l.height,p=v+l.height),u[0]=r*d+i*v+s,u[1]=o*v+n*d+a,u[2]=r*f+i*v+s,u[3]=o*v+n*f+a,u[4]=r*f+i*p+s,u[5]=o*p+n*f+a,u[6]=r*d+i*p+s,u[7]=o*p+n*d+a;}},e.prototype.calculateTrimmedVertices=function(){if(this.vertexTrimmedData){if(this._transformTrimmedID===this.transform._worldID&&this._textureTrimmedID===this._texture._updateID){ return }}else { this.vertexTrimmedData=new Float32Array(8); }this._transformTrimmedID=this.transform._worldID,this._textureTrimmedID=this._texture._updateID;var t=this._texture,e=this.vertexTrimmedData,r=t.orig,n=this._anchor,i=this.transform.worldTransform,o=i.a,s=i.b,a=i.c,u=i.d,h=i.tx,l=i.ty,c=-n._x*r.width,f=c+r.width,d=-n._y*r.height,p=d+r.height;e[0]=o*c+a*d+h,e[1]=u*d+s*c+l,e[2]=o*f+a*d+h,e[3]=u*d+s*f+l,e[4]=o*f+a*p+h,e[5]=u*p+s*f+l,e[6]=o*c+a*p+h,e[7]=u*p+s*c+l;},e.prototype._renderWebGL=function(t){this.calculateVertices(),t.setObjectRenderer(t.plugins[this.pluginName]),t.plugins[this.pluginName].render(this);},e.prototype._renderCanvas=function(t){t.plugins[this.pluginName].render(this);},e.prototype._calculateBounds=function(){var t=this._texture.trim,e=this._texture.orig;!t||t.width===e.width&&t.height===e.height?(this.calculateVertices(),this._bounds.addQuad(this.vertexData)):(this.calculateTrimmedVertices(),this._bounds.addQuad(this.vertexTrimmedData));},e.prototype.getLocalBounds=function(e){return 0===this.children.length?(this._bounds.minX=this._texture.orig.width*-this._anchor._x,this._bounds.minY=this._texture.orig.height*-this._anchor._y,this._bounds.maxX=this._texture.orig.width*(1-this._anchor._x),this._bounds.maxY=this._texture.orig.height*(1-this._anchor._x),e||(this._localBoundsRect||(this._localBoundsRect=new u.Rectangle),e=this._localBoundsRect),this._bounds.getRectangle(e)):t.prototype.getLocalBounds.call(this,e)},e.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,v);var e=this._texture.orig.width,r=this._texture.orig.height,n=-e*this.anchor.x,i=0;return v.x>n&&v.x<n+e&&(i=-r*this.anchor.y,v.y>i&&v.y<i+r)},e.prototype.destroy=function(e){t.prototype.destroy.call(this,e),this._anchor=null;var r="boolean"==typeof e?e:e&&e.texture;if(r){var n="boolean"==typeof e?e:e&&e.baseTexture;this._texture.destroy(!!n);}this._texture=null,this.shader=null;},e.from=function(t){return new e(f.default.from(t))},e.fromFrame=function(t){var r=h.TextureCache[t];if(!r){ throw new Error('The frameId "'+t+'" does not exist in the texture cache'); }return new e(r)},e.fromImage=function(t,r,n){return new e(f.default.fromImage(t,r,n))},a(e,[{key:"width",get:function(){return Math.abs(this.scale.x)*this._texture.orig.width},set:function(t){var e=(0,h.sign)(this.scale.x)||1;this.scale.x=e*t/this._texture.orig.width,this._width=t;}},{key:"height",get:function(){return Math.abs(this.scale.y)*this._texture.orig.height},set:function(t){var e=(0,h.sign)(this.scale.y)||1;this.scale.y=e*t/this._texture.orig.height,this._height=t;}},{key:"anchor",get:function(){return this._anchor},set:function(t){this._anchor.copy(t);}},{key:"tint",get:function(){return this._tint},set:function(t){this._tint=t,this._tintRGB=(t>>16)+(65280&t)+((255&t)<<16);}},{key:"texture",get:function(){return this._texture},set:function(t){this._texture!==t&&(this._texture=t,this.cachedTint=16777215,this._textureID=-1,this._textureTrimmedID=-1,t&&(t.baseTexture.hasLoaded?this._onTextureUpdate():t.once("update",this._onTextureUpdate,this)));}}]),e}(p.default);r.default=y;},{"../const":45,"../display/Container":47,"../math":69,"../textures/Texture":113,"../utils":121}],102:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../renderers/canvas/CanvasRenderer"),s=n(o),a=t("../../const"),u=t("../../math"),h=t("./CanvasTinter"),l=n(h),c=new u.Matrix,f=function(){function t(e){i(this,t),this.renderer=e;}return t.prototype.render=function(t){var e=t._texture,r=this.renderer,n=e._frame.width,i=e._frame.height,o=t.transform.worldTransform,s=0,h=0;if(!(e.orig.width<=0||e.orig.height<=0)&&e.baseTexture.source&&(r.setBlendMode(t.blendMode),e.valid)){r.context.globalAlpha=t.worldAlpha;var f=e.baseTexture.scaleMode===a.SCALE_MODES.LINEAR;r.smoothProperty&&r.context[r.smoothProperty]!==f&&(r.context[r.smoothProperty]=f),e.trim?(s=e.trim.width/2+e.trim.x-t.anchor.x*e.orig.width,h=e.trim.height/2+e.trim.y-t.anchor.y*e.orig.height):(s=(.5-t.anchor.x)*e.orig.width,h=(.5-t.anchor.y)*e.orig.height),e.rotate&&(o.copy(c),o=c,u.GroupD8.matrixAppendRotationInv(o,e.rotate,s,h),s=0,h=0),s-=n/2,h-=i/2,r.roundPixels?(r.context.setTransform(o.a,o.b,o.c,o.d,o.tx*r.resolution|0,o.ty*r.resolution|0),s|=0,h|=0):r.context.setTransform(o.a,o.b,o.c,o.d,o.tx*r.resolution,o.ty*r.resolution);var d=e.baseTexture.resolution;16777215!==t.tint?(t.cachedTint!==t.tint&&(t.cachedTint=t.tint,t.tintedTexture=l.default.getTintedTexture(t,t.tint)),r.context.drawImage(t.tintedTexture,0,0,n*d,i*d,s*r.resolution,h*r.resolution,n*r.resolution,i*r.resolution)):r.context.drawImage(e.baseTexture.source,e._frame.x*d,e._frame.y*d,n*d,i*d,s*r.resolution,h*r.resolution,n*r.resolution,i*r.resolution);}},t.prototype.destroy=function(){this.renderer=null;},t}();r.default=f,s.default.registerPlugin("sprite",f);},{"../../const":45,"../../math":69,"../../renderers/canvas/CanvasRenderer":76,"./CanvasTinter":103}],103:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("../../utils"),o=t("../../renderers/canvas/utils/canUseNewCanvasBlendModes"),s=n(o),a={getTintedTexture:function(t,e){var r=t.texture;e=a.roundColor(e);var n="#"+("00000"+(0|e).toString(16)).substr(-6);if(r.tintCache=r.tintCache||{},r.tintCache[n]){ return r.tintCache[n]; }var i=a.canvas||document.createElement("canvas");if(a.tintMethod(r,e,i),a.convertTintToImage){var o=new Image;o.src=i.toDataURL(),r.tintCache[n]=o;}else { r.tintCache[n]=i,a.canvas=null; }return i},tintWithMultiply:function(t,e,r){var n=r.getContext("2d"),i=t._frame.clone(),o=t.baseTexture.resolution;i.x*=o,i.y*=o,i.width*=o,i.height*=o,r.width=Math.ceil(i.width),r.height=Math.ceil(i.height),n.fillStyle="#"+("00000"+(0|e).toString(16)).substr(-6),n.fillRect(0,0,i.width,i.height),n.globalCompositeOperation="multiply",n.drawImage(t.baseTexture.source,i.x,i.y,i.width,i.height,0,0,i.width,i.height),n.globalCompositeOperation="destination-atop",n.drawImage(t.baseTexture.source,i.x,i.y,i.width,i.height,0,0,i.width,i.height);},tintWithOverlay:function(t,e,r){var n=r.getContext("2d"),i=t._frame.clone(),o=t.baseTexture.resolution;i.x*=o,i.y*=o,i.width*=o,i.height*=o,r.width=Math.ceil(i.width),r.height=Math.ceil(i.height),n.globalCompositeOperation="copy",n.fillStyle="#"+("00000"+(0|e).toString(16)).substr(-6),n.fillRect(0,0,i.width,i.height),n.globalCompositeOperation="destination-atop",n.drawImage(t.baseTexture.source,i.x,i.y,i.width,i.height,0,0,i.width,i.height);},tintWithPerPixel:function(t,e,r){var n=r.getContext("2d"),o=t._frame.clone(),s=t.baseTexture.resolution;o.x*=s,o.y*=s,o.width*=s,o.height*=s,r.width=Math.ceil(o.width),r.height=Math.ceil(o.height),n.globalCompositeOperation="copy",n.drawImage(t.baseTexture.source,o.x,o.y,o.width,o.height,0,0,o.width,o.height);for(var a=(0,i.hex2rgb)(e),u=a[0],h=a[1],l=a[2],c=n.getImageData(0,0,o.width,o.height),f=c.data,d=0;d<f.length;d+=4){ f[d+0]*=u,f[d+1]*=h,f[d+2]*=l; }n.putImageData(c,0,0);},roundColor:function(t){var e=a.cacheStepsPerColorChannel,r=(0,i.hex2rgb)(t);return r[0]=Math.min(255,r[0]/e*e),r[1]=Math.min(255,r[1]/e*e),r[2]=Math.min(255,r[2]/e*e),(0,i.rgb2hex)(r)},cacheStepsPerColorChannel:8,convertTintToImage:!1,canUseMultiply:(0,s.default)(),tintMethod:0};a.tintMethod=a.canUseMultiply?a.tintWithMultiply:a.tintWithPerPixel,r.default=a;},{"../../renderers/canvas/utils/canUseNewCanvasBlendModes":79,"../../utils":121}],104:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(e){n(this,t),this.vertices=new ArrayBuffer(e),this.float32View=new Float32Array(this.vertices),this.uint32View=new Uint32Array(this.vertices);}return t.prototype.destroy=function(){this.vertices=null,this.positions=null,this.uvs=null,this.colors=null;},t}();r.default=i;},{}],105:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../renderers/webgl/utils/ObjectRenderer"),u=n(a),h=t("../../renderers/webgl/WebGLRenderer"),l=n(h),c=t("../../utils/createIndicesForQuads"),f=n(c),d=t("./generateMultiTextureShader"),p=n(d),v=t("../../renderers/webgl/utils/checkMaxIfStatmentsInShader"),y=n(v),g=t("./BatchBuffer"),m=n(g),_=t("../../settings"),b=n(_),x=t("pixi-gl-core"),T=n(x),w=t("bit-twiddle"),E=n(w),S=0,O=0,P=function(t){function e(r){i(this,e);var n=o(this,t.call(this,r));n.vertSize=5,n.vertByteSize=4*n.vertSize,n.size=b.default.SPRITE_BATCH_SIZE,n.buffers=[];for(var s=1;s<=E.default.nextPow2(n.size);s*=2){ n.buffers.push(new m.default(4*s*n.vertByteSize)); }n.indices=(0,f.default)(n.size),n.shader=null,n.currentIndex=0,n.groups=[];for(var a=0;a<n.size;a++){ n.groups[a]={textures:[],textureCount:0,ids:[],size:0,start:0,blend:0}; }return n.sprites=[],n.vertexBuffers=[],n.vaos=[],n.vaoMax=2,n.vertexCount=0,n.renderer.on("prerender",n.onPrerender,n),n}return s(e,t),e.prototype.onContextChange=function(){
var this$1 = this;
var t=this.renderer.gl;this.renderer.legacy?this.MAX_TEXTURES=1:(this.MAX_TEXTURES=Math.min(t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),b.default.SPRITE_MAX_TEXTURES),this.MAX_TEXTURES=(0,y.default)(this.MAX_TEXTURES,t));var e=this.shader=(0,p.default)(t,this.MAX_TEXTURES);this.indexBuffer=T.default.GLBuffer.createIndexBuffer(t,this.indices,t.STATIC_DRAW),this.renderer.bindVao(null);for(var r=0;r<this.vaoMax;r++){ this$1.vertexBuffers[r]=T.default.GLBuffer.createVertexBuffer(t,null,t.STREAM_DRAW),this$1.vaos[r]=this$1.renderer.createVao().addIndex(this$1.indexBuffer).addAttribute(this$1.vertexBuffers[r],e.attributes.aVertexPosition,t.FLOAT,!1,this$1.vertByteSize,0).addAttribute(this$1.vertexBuffers[r],e.attributes.aTextureCoord,t.UNSIGNED_SHORT,!0,this$1.vertByteSize,8).addAttribute(this$1.vertexBuffers[r],e.attributes.aColor,t.UNSIGNED_BYTE,!0,this$1.vertByteSize,12),e.attributes.aTextureId&&this$1.vaos[r].addAttribute(this$1.vertexBuffers[r],e.attributes.aTextureId,t.FLOAT,!1,this$1.vertByteSize,16); }this.vao=this.vaos[0],this.currentBlendMode=99999,this.boundTextures=new Array(this.MAX_TEXTURES);},e.prototype.onPrerender=function(){this.vertexCount=0;},e.prototype.render=function(t){this.currentIndex>=this.size&&this.flush(),t._texture._uvs&&(this.sprites[this.currentIndex++]=t);},e.prototype.flush=function(){
var this$1 = this;
if(0!==this.currentIndex){var t=this.renderer.gl,e=this.MAX_TEXTURES,r=E.default.nextPow2(this.currentIndex),n=E.default.log2(r),i=this.buffers[n],o=this.sprites,s=this.groups,a=i.float32View,u=i.uint32View,h=this.boundTextures,l=this.renderer.boundTextures,c=this.renderer.textureGC.count,f=0,d=void 0,p=void 0,v=1,y=0,g=s[0],m=void 0,_=void 0,x=o[0].blendMode;g.textureCount=0,g.start=0,g.blend=x,S++;var w=void 0;for(w=0;w<e;++w){ h[w]=l[w],h[w]._virtalBoundId=w; }for(w=0;w<this.currentIndex;++w){var P=o[w];if(d=P._texture.baseTexture,x!==P.blendMode&&(x=P.blendMode,p=null,y=e,S++),p!==d&&(p=d,d._enabled!==S)){if(y===e&&(S++,g.size=w-g.start,y=0,g=s[v++],g.blend=x,g.textureCount=0,g.start=w),d.touched=c,d._virtalBoundId===-1){ for(var M=0;M<e;++M){var C=(M+O)%e,R=h[C];if(R._enabled!==S){O++,R._virtalBoundId=-1,d._virtalBoundId=C,h[C]=d;break}} }d._enabled=S,g.textureCount++,g.ids[y]=d._virtalBoundId,g.textures[y++]=d;}if(m=P.vertexData,_=P._texture._uvs.uvsUint32,this$1.renderer.roundPixels){var A=this$1.renderer.resolution;a[f]=(m[0]*A|0)/A,a[f+1]=(m[1]*A|0)/A,a[f+5]=(m[2]*A|0)/A,a[f+6]=(m[3]*A|0)/A,a[f+10]=(m[4]*A|0)/A,a[f+11]=(m[5]*A|0)/A,a[f+15]=(m[6]*A|0)/A,a[f+16]=(m[7]*A|0)/A;}else { a[f]=m[0],a[f+1]=m[1],a[f+5]=m[2],a[f+6]=m[3],a[f+10]=m[4],a[f+11]=m[5],a[f+15]=m[6],a[f+16]=m[7]; }u[f+2]=_[0],u[f+7]=_[1],u[f+12]=_[2],u[f+17]=_[3],u[f+3]=u[f+8]=u[f+13]=u[f+18]=P._tintRGB+(255*Math.min(P.worldAlpha,1)<<24),a[f+4]=a[f+9]=a[f+14]=a[f+19]=d._virtalBoundId,f+=20;}for(g.size=w-g.start,b.default.CAN_UPLOAD_SAME_BUFFER?this.vertexBuffers[this.vertexCount].upload(i.vertices,0,!0):(this.vaoMax<=this.vertexCount&&(this.vaoMax++,this.vertexBuffers[this.vertexCount]=T.default.GLBuffer.createVertexBuffer(t,null,t.STREAM_DRAW),this.vaos[this.vertexCount]=this.renderer.createVao().addIndex(this.indexBuffer).addAttribute(this.vertexBuffers[this.vertexCount],this.shader.attributes.aVertexPosition,t.FLOAT,!1,this.vertByteSize,0).addAttribute(this.vertexBuffers[this.vertexCount],this.shader.attributes.aTextureCoord,t.UNSIGNED_SHORT,!0,this.vertByteSize,8).addAttribute(this.vertexBuffers[this.vertexCount],this.shader.attributes.aColor,t.UNSIGNED_BYTE,!0,this.vertByteSize,12),this.shader.attributes.aTextureId&&this.vaos[this.vertexCount].addAttribute(this.vertexBuffers[this.vertexCount],this.shader.attributes.aTextureId,t.FLOAT,!1,this.vertByteSize,16)),this.renderer.bindVao(this.vaos[this.vertexCount]),this.vertexBuffers[this.vertexCount].upload(i.vertices,0,!1),this.vertexCount++),w=0;w<e;++w){ l[w]._virtalBoundId=-1; }for(w=0;w<v;++w){for(var I=s[w],D=I.textureCount,L=0;L<D;L++){ p=I.textures[L],l[I.ids[L]]!==p&&this$1.renderer.bindTexture(p,I.ids[L],!0),p._virtalBoundId=-1; }this$1.renderer.state.setBlendMode(I.blend),t.drawElements(t.TRIANGLES,6*I.size,t.UNSIGNED_SHORT,6*I.start*2);}this.currentIndex=0;}},e.prototype.start=function(){this.renderer.bindShader(this.shader),b.default.CAN_UPLOAD_SAME_BUFFER&&(this.renderer.bindVao(this.vaos[this.vertexCount]),this.vertexBuffers[this.vertexCount].bind());},e.prototype.stop=function(){this.flush();},e.prototype.destroy=function(){
var this$1 = this;
for(var e=0;e<this.vaoMax;e++){ this$1.vertexBuffers[e]&&this$1.vertexBuffers[e].destroy(),this$1.vaos[e]&&this$1.vaos[e].destroy(); }this.indexBuffer&&this.indexBuffer.destroy(),this.renderer.off("prerender",this.onPrerender,this),t.prototype.destroy.call(this),this.shader&&(this.shader.destroy(),this.shader=null),this.vertexBuffers=null,this.vaos=null,this.indexBuffer=null,this.indices=null,this.sprites=null;for(var r=0;r<this.buffers.length;++r){ this$1.buffers[r].destroy(); }},e}(u.default);r.default=P,l.default.registerPlugin("sprite",P);},{"../../renderers/webgl/WebGLRenderer":83,"../../renderers/webgl/utils/ObjectRenderer":93,"../../renderers/webgl/utils/checkMaxIfStatmentsInShader":96,"../../settings":100,"../../utils/createIndicesForQuads":119,"./BatchBuffer":104,"./generateMultiTextureShader":106,"bit-twiddle":1,"pixi-gl-core":12}],106:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){var r="precision highp float;\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\nattribute float aTextureId;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\n\nvoid main(void){\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = aTextureCoord;\n    vTextureId = aTextureId;\n    vColor = vec4(aColor.rgb * aColor.a, aColor.a);\n}\n",n=u;n=n.replace(/%count%/gi,e),n=n.replace(/%forloop%/gi,o(e));for(var i=new a.default(t,r,n),s=[],h=0;h<e;h++){ s[h]=h; }return i.bind(),i.uniforms.uSamplers=s,i}function o(t){var e="";e+="\n",e+="\n";for(var r=0;r<t;r++){ r>0&&(e+="\nelse "),r<t-1&&(e+="if(textureId == "+r+".0)"),e+="\n{",e+="\n\tcolor = texture2D(uSamplers["+r+"], vTextureCoord);",e+="\n}"; }return e+="\n",e+="\n"}r.__esModule=!0,r.default=i;var s=t("../../Shader"),a=n(s),u=(t("path"),["varying vec2 vTextureCoord;","varying vec4 vColor;","varying float vTextureId;","uniform sampler2D uSamplers[%count%];","void main(void){","vec4 color;","float textureId = floor(vTextureId+0.5);","%forloop%","gl_FragColor = color * vColor;","}"].join("\n"));},{"../../Shader":43,path:23}],107:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../sprites/Sprite"),h=n(u),l=t("../textures/Texture"),c=n(l),f=t("../math"),d=t("../utils"),p=t("../const"),v=t("../settings"),y=n(v),g=t("./TextStyle"),m=n(g),_=t("../utils/trimCanvas"),b=n(_),x={texture:!0,children:!1,baseTexture:!0},T=function(t){function e(r,n,s){i(this,e),s=s||document.createElement("canvas"),s.width=3,s.height=3;var a=c.default.fromCanvas(s);a.orig=new f.Rectangle,a.trim=new f.Rectangle;var u=o(this,t.call(this,a));return u.canvas=s,u.context=u.canvas.getContext("2d"),u.resolution=y.default.RESOLUTION,u._text=null,u._style=null,u._styleListener=null,u._font="",u.text=r,u.style=n,u.localStyleID=-1,u}return s(e,t),e.prototype.updateText=function(t){
var this$1 = this;
var r=this._style;if(this.localStyleID!==r.styleID&&(this.dirty=!0,this.localStyleID=r.styleID),this.dirty||!t){this._font=e.getFontStyle(r),this.context.font=this._font;for(var n=r.wordWrap?this.wordWrap(this._text):this._text,i=n.split(/(?:\r\n|\r|\n)/),o=new Array(i.length),s=0,a=e.calculateFontProperties(this._font),u=0;u<i.length;u++){var h=this$1.context.measureText(i[u]).width+(i[u].length-1)*r.letterSpacing;o[u]=h,s=Math.max(s,h);}var l=s+r.strokeThickness;r.dropShadow&&(l+=r.dropShadowDistance),this.canvas.width=Math.ceil((l+2*r.padding)*this.resolution);var c=r.lineHeight||a.fontSize+r.strokeThickness,f=Math.max(c,a.fontSize+r.strokeThickness)+(i.length-1)*c;r.dropShadow&&(f+=r.dropShadowDistance),this.canvas.height=Math.ceil((f+2*r.padding)*this.resolution),this.context.scale(this.resolution,this.resolution),this.context.clearRect(0,0,this.canvas.width,this.canvas.height),this.context.font=this._font,this.context.strokeStyle=r.stroke,this.context.lineWidth=r.strokeThickness,this.context.textBaseline=r.textBaseline,this.context.lineJoin=r.lineJoin,this.context.miterLimit=r.miterLimit;var d=void 0,p=void 0;if(r.dropShadow){this.context.shadowBlur=r.dropShadowBlur,this.context.globalAlpha=r.dropShadowAlpha,r.dropShadowBlur>0?this.context.shadowColor=r.dropShadowColor:this.context.fillStyle=r.dropShadowColor;for(var v=Math.cos(r.dropShadowAngle)*r.dropShadowDistance,y=Math.sin(r.dropShadowAngle)*r.dropShadowDistance,g=0;g<i.length;g++){ d=r.strokeThickness/2,
p=r.strokeThickness/2+g*c+a.ascent,"right"===r.align?d+=s-o[g]:"center"===r.align&&(d+=(s-o[g])/2),r.fill&&(this$1.drawLetterSpacing(i[g],d+v+r.padding,p+y+r.padding),r.stroke&&r.strokeThickness&&(this$1.context.strokeStyle=r.dropShadowColor,this$1.drawLetterSpacing(i[g],d+v+r.padding,p+y+r.padding,!0),this$1.context.strokeStyle=r.stroke)); }}this.context.shadowBlur=0,this.context.globalAlpha=1,this.context.fillStyle=this._generateFillStyle(r,i);for(var m=0;m<i.length;m++){ d=r.strokeThickness/2,p=r.strokeThickness/2+m*c+a.ascent,"right"===r.align?d+=s-o[m]:"center"===r.align&&(d+=(s-o[m])/2),r.stroke&&r.strokeThickness&&this$1.drawLetterSpacing(i[m],d+r.padding,p+r.padding,!0),r.fill&&this$1.drawLetterSpacing(i[m],d+r.padding,p+r.padding); }this.updateTexture();}},e.prototype.drawLetterSpacing=function(t,e,r){
var this$1 = this;
var n=arguments.length>3&&void 0!==arguments[3]&&arguments[3],i=this._style,o=i.letterSpacing;if(0===o){ return void(n?this.context.strokeText(t,e,r):this.context.fillText(t,e,r)); }for(var s=String.prototype.split.call(t,""),a=e,u=0,h="";u<t.length;){ h=s[u++],n?this$1.context.strokeText(h,a,r):this$1.context.fillText(h,a,r),a+=this$1.context.measureText(h).width+o; }},e.prototype.updateTexture=function(){if(this._style.trim){var t=(0,b.default)(this.canvas);this.canvas.width=t.width,this.canvas.height=t.height,this.context.putImageData(t.data,0,0);}var e=this._texture,r=this._style;e.baseTexture.hasLoaded=!0,e.baseTexture.resolution=this.resolution,e.baseTexture.realWidth=this.canvas.width,e.baseTexture.realHeight=this.canvas.height,e.baseTexture.width=this.canvas.width/this.resolution,e.baseTexture.height=this.canvas.height/this.resolution,e.trim.width=e._frame.width=this.canvas.width/this.resolution,e.trim.height=e._frame.height=this.canvas.height/this.resolution,e.trim.x=-r.padding,e.trim.y=-r.padding,e.orig.width=e._frame.width-2*r.padding,e.orig.height=e._frame.height-2*r.padding,this._onTextureUpdate(),e.baseTexture.emit("update",e.baseTexture),this.dirty=!1;},e.prototype.renderWebGL=function(e){this.resolution!==e.resolution&&(this.resolution=e.resolution,this.dirty=!0),this.updateText(!0),t.prototype.renderWebGL.call(this,e);},e.prototype._renderCanvas=function(e){this.resolution!==e.resolution&&(this.resolution=e.resolution,this.dirty=!0),this.updateText(!0),t.prototype._renderCanvas.call(this,e);},e.prototype.wordWrap=function(t){
var this$1 = this;
for(var e="",r=this._style,n=t.split("\n"),i=r.wordWrapWidth,o=0;o<n.length;o++){for(var s=i,a=n[o].split(" "),u=0;u<a.length;u++){var h=this$1.context.measureText(a[u]).width;if(r.breakWords&&h>i){ for(var l=a[u].split(""),c=0;c<l.length;c++){var f=this$1.context.measureText(l[c]).width;f>s?(e+="\n"+l[c],s=i-f):(0===c&&(e+=" "),e+=l[c],s-=f);} }else{var d=h+this$1.context.measureText(" ").width;0===u||d>s?(u>0&&(e+="\n"),e+=a[u],s=i-h):(s-=d,e+=" "+a[u]);}}o<n.length-1&&(e+="\n");}return e},e.prototype.getLocalBounds=function(e){return this.updateText(!0),t.prototype.getLocalBounds.call(this,e)},e.prototype._calculateBounds=function(){this.updateText(!0),this.calculateVertices(),this._bounds.addQuad(this.vertexData);},e.prototype._onStyleChange=function(){this.dirty=!0;},e.prototype._generateFillStyle=function(t,e){if(!Array.isArray(t.fill)){ return t.fill; }if(navigator.isCocoonJS){ return t.fill[0]; }var r=void 0,n=void 0,i=void 0,o=void 0,s=this.canvas.width/this.resolution,a=this.canvas.height/this.resolution,u=t.fill.slice(),h=t.fillGradientStops.slice();if(!h.length){ for(var l=u.length+1,c=1;c<l;++c){ h.push(c/l); } }if(u.unshift(t.fill[0]),h.unshift(0),u.push(t.fill[t.fill.length-1]),h.push(1),t.fillGradientType===p.TEXT_GRADIENT.LINEAR_VERTICAL){r=this.context.createLinearGradient(s/2,0,s/2,a),n=(u.length+1)*e.length,i=0;for(var f=0;f<e.length;f++){i+=1;for(var d=0;d<u.length;d++){ o=h[d]?h[d]/e.length+f/e.length:i/n,r.addColorStop(o,u[d]),i++; }}}else{r=this.context.createLinearGradient(0,a/2,s,a/2),n=u.length+1,i=1;for(var v=0;v<u.length;v++){ o=h[v]?h[v]:i/n,r.addColorStop(o,u[v]),i++; }}return r},e.prototype.destroy=function(e){"boolean"==typeof e&&(e={children:e}),e=Object.assign({},x,e),t.prototype.destroy.call(this,e),this.context=null,this.canvas=null,this._style=null;},e.getFontStyle=function(t){t=t||{},t instanceof m.default||(t=new m.default(t));var e="number"==typeof t.fontSize?t.fontSize+"px":t.fontSize,r=t.fontFamily;Array.isArray(t.fontFamily)||(r=t.fontFamily.split(","));for(var n=r.length-1;n>=0;n--){var i=r[n].trim();/([\"\'])[^\'\"]+\1/.test(i)||(i='"'+i+'"'),r[n]=i;}return t.fontStyle+" "+t.fontVariant+" "+t.fontWeight+" "+e+" "+r.join(",")},e.calculateFontProperties=function(t){if(e.fontPropertiesCache[t]){ return e.fontPropertiesCache[t]; }var r={},n=e.fontPropertiesCanvas,i=e.fontPropertiesContext;i.font=t;var o=Math.ceil(i.measureText("|MÉq").width),s=Math.ceil(i.measureText("M").width),a=2*s;s=1.4*s|0,n.width=o,n.height=a,i.fillStyle="#f00",i.fillRect(0,0,o,a),i.font=t,i.textBaseline="alphabetic",i.fillStyle="#000",i.fillText("|MÉq",0,s);var u=i.getImageData(0,0,o,a).data,h=u.length,l=4*o,c=0,f=0,d=!1;for(c=0;c<s;++c){for(var p=0;p<l;p+=4){ if(255!==u[f+p]){d=!0;break} }if(d){ break; }f+=l;}for(r.ascent=s-c,f=h-l,d=!1,c=a;c>s;--c){for(var v=0;v<l;v+=4){ if(255!==u[f+v]){d=!0;break} }if(d){ break; }f-=l;}return r.descent=c-s,r.fontSize=r.ascent+r.descent,e.fontPropertiesCache[t]=r,r},a(e,[{key:"width",get:function(){return this.updateText(!0),Math.abs(this.scale.x)*this._texture.orig.width},set:function(t){this.updateText(!0);var e=(0,d.sign)(this.scale.x)||1;this.scale.x=e*t/this._texture.orig.width,this._width=t;}},{key:"height",get:function(){return this.updateText(!0),Math.abs(this.scale.y)*this._texture.orig.height},set:function(t){this.updateText(!0);var e=(0,d.sign)(this.scale.y)||1;this.scale.y=e*t/this._texture.orig.height,this._height=t;}},{key:"style",get:function(){return this._style},set:function(t){t=t||{},t instanceof m.default?this._style=t:this._style=new m.default(t),this.localStyleID=-1,this.dirty=!0;}},{key:"text",get:function(){return this._text},set:function(t){t=String(""===t||null===t||void 0===t?" ":t),this._text!==t&&(this._text=t,this.dirty=!0);}}]),e}(h.default);r.default=T,T.fontPropertiesCache={},T.fontPropertiesCanvas=document.createElement("canvas"),T.fontPropertiesContext=T.fontPropertiesCanvas.getContext("2d");},{"../const":45,"../math":69,"../settings":100,"../sprites/Sprite":101,"../textures/Texture":113,"../utils":121,"../utils/trimCanvas":125,"./TextStyle":108}],108:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function i(t){return"number"==typeof t?(0,h.hex2string)(t):("string"==typeof t&&0===t.indexOf("0x")&&(t=t.replace("0x","#")),t)}function o(t){if(Array.isArray(t)){for(var e=0;e<t.length;++e){ t[e]=i(t[e]); }return t}return i(t)}function s(t,e){if(!Array.isArray(t)||!Array.isArray(e)){ return!1; }if(t.length!==e.length){ return!1; }for(var r=0;r<t.length;++r){ if(t[r]!==e[r]){ return!1; } }return!0}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../const"),h=t("../utils"),l={align:"left",breakWords:!1,dropShadow:!1,dropShadowAlpha:1,dropShadowAngle:Math.PI/6,dropShadowBlur:0,dropShadowColor:"#000000",dropShadowDistance:5,fill:"black",fillGradientType:u.TEXT_GRADIENT.LINEAR_VERTICAL,fillGradientStops:[],fontFamily:"Arial",fontSize:26,fontStyle:"normal",fontVariant:"normal",fontWeight:"normal",letterSpacing:0,lineHeight:0,lineJoin:"miter",miterLimit:10,padding:0,stroke:"black",strokeThickness:0,textBaseline:"alphabetic",trim:!1,wordWrap:!1,wordWrapWidth:100},c=function(){function t(e){n(this,t),this.styleID=0,Object.assign(this,l,e);}return t.prototype.clone=function(){
var this$1 = this;
var e={};for(var r in l){ e[r]=this$1[r]; }return new t(e)},t.prototype.reset=function(){Object.assign(this,l);},a(t,[{key:"align",get:function(){return this._align},set:function(t){this._align!==t&&(this._align=t,this.styleID++);}},{key:"breakWords",get:function(){return this._breakWords},set:function(t){this._breakWords!==t&&(this._breakWords=t,this.styleID++);}},{key:"dropShadow",get:function(){return this._dropShadow},set:function(t){this._dropShadow!==t&&(this._dropShadow=t,this.styleID++);}},{key:"dropShadowAlpha",get:function(){return this._dropShadowAlpha},set:function(t){this._dropShadowAlpha!==t&&(this._dropShadowAlpha=t,this.styleID++);}},{key:"dropShadowAngle",get:function(){return this._dropShadowAngle},set:function(t){this._dropShadowAngle!==t&&(this._dropShadowAngle=t,this.styleID++);}},{key:"dropShadowBlur",get:function(){return this._dropShadowBlur},set:function(t){this._dropShadowBlur!==t&&(this._dropShadowBlur=t,this.styleID++);}},{key:"dropShadowColor",get:function(){return this._dropShadowColor},set:function(t){var e=o(t);this._dropShadowColor!==e&&(this._dropShadowColor=e,this.styleID++);}},{key:"dropShadowDistance",get:function(){return this._dropShadowDistance},set:function(t){this._dropShadowDistance!==t&&(this._dropShadowDistance=t,this.styleID++);}},{key:"fill",get:function(){return this._fill},set:function(t){var e=o(t);this._fill!==e&&(this._fill=e,this.styleID++);}},{key:"fillGradientType",get:function(){return this._fillGradientType},set:function(t){this._fillGradientType!==t&&(this._fillGradientType=t,this.styleID++);}},{key:"fillGradientStops",get:function(){return this._fillGradientStops},set:function(t){s(this._fillGradientStops,t)||(this._fillGradientStops=t,this.styleID++);}},{key:"fontFamily",get:function(){return this._fontFamily},set:function(t){this.fontFamily!==t&&(this._fontFamily=t,this.styleID++);}},{key:"fontSize",get:function(){return this._fontSize},set:function(t){this._fontSize!==t&&(this._fontSize=t,this.styleID++);}},{key:"fontStyle",get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this.styleID++);}},{key:"fontVariant",get:function(){return this._fontVariant},set:function(t){this._fontVariant!==t&&(this._fontVariant=t,this.styleID++);}},{key:"fontWeight",get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this.styleID++);}},{key:"letterSpacing",get:function(){return this._letterSpacing},set:function(t){this._letterSpacing!==t&&(this._letterSpacing=t,this.styleID++);}},{key:"lineHeight",get:function(){return this._lineHeight},set:function(t){this._lineHeight!==t&&(this._lineHeight=t,this.styleID++);}},{key:"lineJoin",get:function(){return this._lineJoin},set:function(t){this._lineJoin!==t&&(this._lineJoin=t,this.styleID++);}},{key:"miterLimit",get:function(){return this._miterLimit},set:function(t){this._miterLimit!==t&&(this._miterLimit=t,this.styleID++);}},{key:"padding",get:function(){return this._padding},set:function(t){this._padding!==t&&(this._padding=t,this.styleID++);}},{key:"stroke",get:function(){return this._stroke},set:function(t){var e=o(t);this._stroke!==e&&(this._stroke=e,this.styleID++);}},{key:"strokeThickness",get:function(){return this._strokeThickness},set:function(t){this._strokeThickness!==t&&(this._strokeThickness=t,this.styleID++);}},{key:"textBaseline",get:function(){return this._textBaseline},set:function(t){this._textBaseline!==t&&(this._textBaseline=t,this.styleID++);}},{key:"trim",get:function(){return this._trim},set:function(t){this._trim!==t&&(this._trim=t,this.styleID++);}},{key:"wordWrap",get:function(){return this._wordWrap},set:function(t){this._wordWrap!==t&&(this._wordWrap=t,this.styleID++);}},{key:"wordWrapWidth",get:function(){return this._wordWrapWidth},set:function(t){this._wordWrapWidth!==t&&(this._wordWrapWidth=t,this.styleID++);}}]),t}();r.default=c;},{"../const":45,"../utils":121}],109:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("./BaseTexture"),u=n(a),h=t("../settings"),l=n(h),c=function(t){function e(){var r=arguments.length>0&&void 0!==arguments[0]?arguments[0]:100,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:100,s=arguments[2],a=arguments[3];i(this,e);var u=o(this,t.call(this,null,s));return u.resolution=a||l.default.RESOLUTION,u.width=r,u.height=n,u.realWidth=u.width*u.resolution,u.realHeight=u.height*u.resolution,u.scaleMode=void 0!==s?s:l.default.SCALE_MODE,u.hasLoaded=!0,u._glRenderTargets={},u._canvasRenderTarget=null,u.valid=!1,u}return s(e,t),e.prototype.resize=function(t,e){t===this.width&&e===this.height||(this.valid=t>0&&e>0,this.width=t,this.height=e,this.realWidth=this.width*this.resolution,this.realHeight=this.height*this.resolution,this.valid&&this.emit("update",this));},e.prototype.destroy=function(){t.prototype.destroy.call(this,!0),this.renderer=null;},e}(u.default);r.default=c;},{"../settings":100,"./BaseTexture":110}],110:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../utils"),u=t("../settings"),h=n(u),l=t("eventemitter3"),c=n(l),f=t("../utils/determineCrossOrigin"),d=n(f),p=t("bit-twiddle"),v=n(p),y=function(t){function e(r,n,s){i(this,e);var u=o(this,t.call(this));return u.uid=(0,a.uid)(),u.touched=0,u.resolution=s||h.default.RESOLUTION,u.width=100,u.height=100,u.realWidth=100,u.realHeight=100,u.scaleMode=void 0!==n?n:h.default.SCALE_MODE,u.hasLoaded=!1,u.isLoading=!1,u.source=null,u.origSource=null,u.imageType=null,u.sourceScale=1,u.premultipliedAlpha=!0,u.imageUrl=null,u.isPowerOfTwo=!1,u.mipmap=h.default.MIPMAP_TEXTURES,u.wrapMode=h.default.WRAP_MODE,u._glTextures={},u._enabled=0,u._virtalBoundId=-1,r&&u.loadSource(r),u}return s(e,t),e.prototype.update=function(){"svg"!==this.imageType&&(this.realWidth=this.source.naturalWidth||this.source.videoWidth||this.source.width,this.realHeight=this.source.naturalHeight||this.source.videoHeight||this.source.height,this._updateDimensions()),this.emit("update",this);},e.prototype._updateDimensions=function(){this.width=this.realWidth/this.resolution,this.height=this.realHeight/this.resolution,this.isPowerOfTwo=v.default.isPow2(this.realWidth)&&v.default.isPow2(this.realHeight);},e.prototype.loadSource=function(t){var e=this.isLoading;this.hasLoaded=!1,this.isLoading=!1,e&&this.source&&(this.source.onload=null,this.source.onerror=null);var r=!this.source;if(this.source=t,(t.src&&t.complete||t.getContext)&&t.width&&t.height){ this._updateImageType(),"svg"===this.imageType?this._loadSvgSource():this._sourceLoaded(),r&&this.emit("loaded",this); }else if(!t.getContext){this.isLoading=!0;var n=this;if(t.onload=function(){if(n._updateImageType(),t.onload=null,t.onerror=null,n.isLoading){ return n.isLoading=!1,n._sourceLoaded(),"svg"===n.imageType?void n._loadSvgSource():void n.emit("loaded",n) }},t.onerror=function(){t.onload=null,t.onerror=null,n.isLoading&&(n.isLoading=!1,n.emit("error",n));},t.complete&&t.src){if(t.onload=null,t.onerror=null,"svg"===n.imageType){ return void n._loadSvgSource(); }this.isLoading=!1,t.width&&t.height?(this._sourceLoaded(),e&&this.emit("loaded",this)):e&&this.emit("error",this);}}},e.prototype._updateImageType=function(){if(this.imageUrl){var t=(0,a.decomposeDataUri)(this.imageUrl),e=void 0;if(t&&"image"===t.mediaType){var r=t.subType.split("+")[0];if(e=(0,a.getUrlFileExtension)("."+r),!e){ throw new Error("Invalid image type in data URI.") }}else { e=(0,a.getUrlFileExtension)(this.imageUrl),e||(e="png"); }this.imageType=e;}},e.prototype._loadSvgSource=function(){if("svg"===this.imageType){var t=(0,a.decomposeDataUri)(this.imageUrl);t?this._loadSvgSourceUsingDataUri(t):this._loadSvgSourceUsingXhr();}},e.prototype._loadSvgSourceUsingDataUri=function(t){var e=void 0;if("base64"===t.encoding){if(!atob){ throw new Error("Your browser doesn't support base64 conversions."); }e=atob(t.data);}else { e=t.data; }this._loadSvgSourceUsingString(e);},e.prototype._loadSvgSourceUsingXhr=function(){var t=this,e=new XMLHttpRequest;e.onload=function(){if(e.readyState!==e.DONE||200!==e.status){ throw new Error("Failed to load SVG using XHR."); }t._loadSvgSourceUsingString(e.response);},e.onerror=function(){return t.emit("error",t)},e.open("GET",this.imageUrl,!0),e.send();},e.prototype._loadSvgSourceUsingString=function(t){var e=(0,a.getSvgSize)(t),r=e.width,n=e.height;if(!r||!n){ throw new Error("The SVG image must have width and height defined (in pixels), canvas API needs them."); }this.realWidth=Math.round(r*this.sourceScale),this.realHeight=Math.round(n*this.sourceScale),this._updateDimensions();var i=document.createElement("canvas");i.width=this.realWidth,i.height=this.realHeight,i._pixiId="canvas_"+(0,a.uid)(),i.getContext("2d").drawImage(this.source,0,0,r,n,0,0,this.realWidth,this.realHeight),this.origSource=this.source,this.source=i,a.BaseTextureCache[i._pixiId]=this,this.isLoading=!1,this._sourceLoaded(),this.emit("loaded",this);},e.prototype._sourceLoaded=function(){this.hasLoaded=!0,this.update();},e.prototype.destroy=function(){this.imageUrl&&(delete a.BaseTextureCache[this.imageUrl],delete a.TextureCache[this.imageUrl],this.imageUrl=null,navigator.isCocoonJS||(this.source.src="")),this.source&&this.source._pixiId&&delete a.BaseTextureCache[this.source._pixiId],this.source=null,this.dispose();},e.prototype.dispose=function(){this.emit("dispose",this);},e.prototype.updateSourceImage=function(t){this.source.src=t,this.loadSource(this.source);},e.fromImage=function(t,r,n,i){var o=a.BaseTextureCache[t];if(!o){var s=new Image;void 0===r&&0!==t.indexOf("data:")&&(s.crossOrigin=(0,d.default)(t)),o=new e(s,n),o.imageUrl=t,i&&(o.sourceScale=i),o.resolution=(0,a.getResolutionOfUrl)(t),s.src=t,a.BaseTextureCache[t]=o;}return o},e.fromCanvas=function(t,r){t._pixiId||(t._pixiId="canvas_"+(0,a.uid)());var n=a.BaseTextureCache[t._pixiId];return n||(n=new e(t,r),a.BaseTextureCache[t._pixiId]=n),n},e.from=function(t,r,n){if("string"==typeof t){ return e.fromImage(t,void 0,r,n); }if(t instanceof HTMLImageElement){var i=t.src,o=a.BaseTextureCache[i];return o||(o=new e(t,r),o.imageUrl=i,n&&(o.sourceScale=n),o.resolution=(0,a.getResolutionOfUrl)(i),a.BaseTextureCache[i]=o),o}return t instanceof HTMLCanvasElement?e.fromCanvas(t,r):t},e}(c.default);r.default=y;},{"../settings":100,"../utils":121,"../utils/determineCrossOrigin":120,"bit-twiddle":1,eventemitter3:3}],111:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("./BaseRenderTexture"),u=n(a),h=t("./Texture"),l=n(h),c=function(t){function e(r,n){i(this,e);var s=null;if(!(r instanceof u.default)){var a=arguments[1],h=arguments[2],l=arguments[3],c=arguments[4];console.warn("Please use RenderTexture.create("+a+", "+h+") instead of the ctor directly."),s=arguments[0],n=null,r=new u.default(a,h,l,c);}var f=o(this,t.call(this,r,n));return f.legacyRenderer=s,f.valid=!0,f._updateUvs(),f}return s(e,t),e.prototype.resize=function(t,e,r){this.valid=t>0&&e>0,this._frame.width=this.orig.width=t,this._frame.height=this.orig.height=e,r||this.baseTexture.resize(t,e),this._updateUvs();},e.create=function(t,r,n,i){return new e(new u.default(t,r,n,i))},e}(l.default);r.default=c;},{"./BaseRenderTexture":109,"./Texture":113}],112:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),o=t("../"),s=t("../utils"),a=function(){function t(e,r){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;n(this,t),this.baseTexture=e,this.textures={},this.data=r,this.resolution=this._updateResolution(i||this.baseTexture.imageUrl),this._frames=this.data.frames,this._frameKeys=Object.keys(this._frames),this._batchIndex=0,this._callback=null;}return i(t,null,[{key:"BATCH_SIZE",get:function(){return 1e3}}]),t.prototype._updateResolution=function(t){var e=this.data.meta.scale,r=(0,s.getResolutionOfUrl)(t,null);return null===r&&(r=void 0!==e?parseFloat(e):1),1!==r&&(this.baseTexture.resolution=r,this.baseTexture.update()),r},t.prototype.parse=function(e){this._batchIndex=0,this._callback=e,this._frameKeys.length<=t.BATCH_SIZE?(this._processFrames(0),this._parseComplete()):this._nextBatch();},t.prototype._processFrames=function(e){
var this$1 = this;
for(var r=e,n=t.BATCH_SIZE;r-e<n&&r<this._frameKeys.length;){var i=this$1._frameKeys[r],a=this$1._frames[i].frame;if(a){var u=null,h=null,l=new o.Rectangle(0,0,this$1._frames[i].sourceSize.w/this$1.resolution,this$1._frames[i].sourceSize.h/this$1.resolution);u=this$1._frames[i].rotated?new o.Rectangle(a.x/this$1.resolution,a.y/this$1.resolution,a.h/this$1.resolution,a.w/this$1.resolution):new o.Rectangle(a.x/this$1.resolution,a.y/this$1.resolution,a.w/this$1.resolution,a.h/this$1.resolution),this$1._frames[i].trimmed&&(h=new o.Rectangle(this$1._frames[i].spriteSourceSize.x/this$1.resolution,this$1._frames[i].spriteSourceSize.y/this$1.resolution,a.w/this$1.resolution,a.h/this$1.resolution)),this$1.textures[i]=new o.Texture(this$1.baseTexture,u,l,h,this$1._frames[i].rotated?2:0),s.TextureCache[i]=this$1.textures[i];}r++;}},t.prototype._parseComplete=function(){var t=this._callback;this._callback=null,this._batchIndex=0,t.call(this,this.textures);},t.prototype._nextBatch=function(){var e=this;this._processFrames(this._batchIndex*t.BATCH_SIZE),this._batchIndex++,setTimeout(function(){e._batchIndex*t.BATCH_SIZE<e._frameKeys.length?e._nextBatch():e._parseComplete();},0);},t.prototype.destroy=function(){
var this$1 = this;
var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];for(var e in this.textures){ this$1.textures[e].destroy(); }this._frames=null,this._frameKeys=null,this.data=null,this.textures=null,t&&this.baseTexture.destroy(),this.baseTexture=null;},t}();r.default=a;},{"../":64,"../utils":121}],113:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function a(){var t=document.createElement("canvas");t.width=10,t.height=10;var e=t.getContext("2d");return e.fillStyle="white",e.fillRect(0,0,10,10),new b(new c.default(t))}function u(t){t.destroy=function(){},t.on=function(){},t.once=function(){},t.emit=function(){};}r.__esModule=!0;var h=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),l=t("./BaseTexture"),c=n(l),f=t("./VideoBaseTexture"),d=n(f),p=t("./TextureUvs"),v=n(p),y=t("eventemitter3"),g=n(y),m=t("../math"),_=t("../utils"),b=function(t){function e(r,n,s,a,u){i(this,e);var h=o(this,t.call(this));if(h.noFrame=!1,n||(h.noFrame=!0,n=new m.Rectangle(0,0,1,1)),r instanceof e&&(r=r.baseTexture),h.baseTexture=r,h._frame=n,h.trim=a,h.valid=!1,h.requiresUpdate=!1,h._uvs=null,h.orig=s||n,h._rotate=Number(u||0),u===!0){ h._rotate=2; }else if(h._rotate%2!==0){ throw new Error("attempt to use diamond-shaped UVs. If you are sure, set rotation manually"); }return r.hasLoaded?(h.noFrame&&(n=new m.Rectangle(0,0,r.width,r.height),r.on("update",h.onBaseTextureUpdated,h)),h.frame=n):r.once("loaded",h.onBaseTextureLoaded,h),h._updateID=0,h.transform=null,h}return s(e,t),e.prototype.update=function(){this.baseTexture.update();},e.prototype.onBaseTextureLoaded=function(t){this._updateID++,this.noFrame?this.frame=new m.Rectangle(0,0,t.width,t.height):this.frame=this._frame,this.baseTexture.on("update",this.onBaseTextureUpdated,this),this.emit("update",this);},e.prototype.onBaseTextureUpdated=function(t){this._updateID++,this._frame.width=t.width,this._frame.height=t.height,this.emit("update",this);},e.prototype.destroy=function(t){this.baseTexture&&(t&&(_.TextureCache[this.baseTexture.imageUrl]&&delete _.TextureCache[this.baseTexture.imageUrl],this.baseTexture.destroy()),this.baseTexture.off("update",this.onBaseTextureUpdated,this),this.baseTexture.off("loaded",this.onBaseTextureLoaded,this),this.baseTexture=null),this._frame=null,this._uvs=null,this.trim=null,this.orig=null,this.valid=!1,this.off("dispose",this.dispose,this),this.off("update",this.update,this);},e.prototype.clone=function(){return new e(this.baseTexture,this.frame,this.orig,this.trim,this.rotate)},e.prototype._updateUvs=function(){this._uvs||(this._uvs=new v.default),this._uvs.set(this._frame,this.baseTexture,this.rotate),this._updateID++;},e.fromImage=function(t,r,n,i){var o=_.TextureCache[t];return o||(o=new e(c.default.fromImage(t,r,n,i)),_.TextureCache[t]=o),o},e.fromFrame=function(t){var e=_.TextureCache[t];if(!e){ throw new Error('The frameId "'+t+'" does not exist in the texture cache'); }return e},e.fromCanvas=function(t,r){return new e(c.default.fromCanvas(t,r))},e.fromVideo=function(t,r){return"string"==typeof t?e.fromVideoUrl(t,r):new e(d.default.fromVideo(t,r))},e.fromVideoUrl=function(t,r){return new e(d.default.fromUrl(t,r))},e.from=function(t){if("string"==typeof t){var r=_.TextureCache[t];if(!r){var n=null!==t.match(/\.(mp4|webm|ogg|h264|avi|mov)$/);return n?e.fromVideoUrl(t):e.fromImage(t)}return r}return t instanceof HTMLImageElement?new e(c.default.from(t)):t instanceof HTMLCanvasElement?e.fromCanvas(t):t instanceof HTMLVideoElement?e.fromVideo(t):t instanceof c.default?new e(t):t},e.fromLoader=function(t,r,n){var i=new c.default(t,void 0,(0,_.getResolutionOfUrl)(r)),o=new e(i);return i.imageUrl=r,n||(n=r),_.BaseTextureCache[n]=i,_.TextureCache[n]=o,n!==r&&(_.BaseTextureCache[r]=i,_.TextureCache[r]=o),o},e.addTextureToCache=function(t,e){_.TextureCache[e]=t;},e.removeTextureFromCache=function(t){var e=_.TextureCache[t];return delete _.TextureCache[t],delete _.BaseTextureCache[t],e},h(e,[{key:"frame",get:function(){return this._frame},set:function(t){if(this._frame=t,this.noFrame=!1,t.x+t.width>this.baseTexture.width||t.y+t.height>this.baseTexture.height){ throw new Error("Texture Error: frame does not fit inside the base Texture dimensions: "+("X: "+t.x+" + "+t.width+" > "+this.baseTexture.width+" ")+("Y: "+t.y+" + "+t.height+" > "+this.baseTexture.height)); }this.valid=t&&t.width&&t.height&&this.baseTexture.hasLoaded,this.trim||this.rotate||(this.orig=t),this.valid&&this._updateUvs();}},{key:"rotate",get:function(){return this._rotate},set:function(t){this._rotate=t,this.valid&&this._updateUvs();}},{key:"width",get:function(){return this.orig.width}},{key:"height",get:function(){return this.orig.height}}]),e}(g.default);r.default=b,b.EMPTY=new b(new c.default),u(b.EMPTY),b.WHITE=a(),u(b.WHITE);},{"../math":69,"../utils":121,"./BaseTexture":110,"./TextureUvs":114,"./VideoBaseTexture":115,eventemitter3:3}],114:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../math/GroupD8"),s=n(o),a=function(){function t(){i(this,t),this.x0=0,this.y0=0,this.x1=1,this.y1=0,this.x2=1,this.y2=1,this.x3=0,this.y3=1,this.uvsUint32=new Uint32Array(4);}return t.prototype.set=function(t,e,r){var n=e.width,i=e.height;if(r){var o=t.width/2/n,a=t.height/2/i,u=t.x/n+o,h=t.y/i+a;r=s.default.add(r,s.default.NW),this.x0=u+o*s.default.uX(r),this.y0=h+a*s.default.uY(r),r=s.default.add(r,2),this.x1=u+o*s.default.uX(r),this.y1=h+a*s.default.uY(r),r=s.default.add(r,2),this.x2=u+o*s.default.uX(r),this.y2=h+a*s.default.uY(r),r=s.default.add(r,2),this.x3=u+o*s.default.uX(r),this.y3=h+a*s.default.uY(r);}else { this.x0=t.x/n,this.y0=t.y/i,this.x1=(t.x+t.width)/n,this.y1=t.y/i,this.x2=(t.x+t.width)/n,this.y2=(t.y+t.height)/i,this.x3=t.x/n,this.y3=(t.y+t.height)/i; }this.uvsUint32[0]=(65535*this.y0&65535)<<16|65535*this.x0&65535,this.uvsUint32[1]=(65535*this.y1&65535)<<16|65535*this.x1&65535,this.uvsUint32[2]=(65535*this.y2&65535)<<16|65535*this.x2&65535,this.uvsUint32[3]=(65535*this.y3&65535)<<16|65535*this.x3&65535;},t}();r.default=a;},{"../math/GroupD8":65}],115:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function u(t,e){e||(e="video/"+t.substr(t.lastIndexOf(".")+1));var r=document.createElement("source");return r.src=t,r.type=e,r}r.__esModule=!0;var h=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),l=t("./BaseTexture"),c=i(l),f=t("../utils"),d=t("../ticker"),p=n(d),v=function(t){function e(r,n){if(o(this,e),!r){ throw new Error("No video source element specified."); }(r.readyState===r.HAVE_ENOUGH_DATA||r.readyState===r.HAVE_FUTURE_DATA)&&r.width&&r.height&&(r.complete=!0);var i=s(this,t.call(this,r,n));return i.width=r.videoWidth,i.height=r.videoHeight,i._autoUpdate=!0,i._isAutoUpdating=!1,i.autoPlay=!0,i.update=i.update.bind(i),i._onCanPlay=i._onCanPlay.bind(i),r.addEventListener("play",i._onPlayStart.bind(i)),r.addEventListener("pause",i._onPlayStop.bind(i)),i.hasLoaded=!1,i.__loaded=!1,i._isSourceReady()?i._onCanPlay():(r.addEventListener("canplay",i._onCanPlay),r.addEventListener("canplaythrough",i._onCanPlay)),i}return a(e,t),e.prototype._isSourcePlaying=function(){
var t=this.source;return t.currentTime>0&&t.paused===!1&&t.ended===!1&&t.readyState>2},e.prototype._isSourceReady=function(){return 3===this.source.readyState||4===this.source.readyState},e.prototype._onPlayStart=function(){this.hasLoaded||this._onCanPlay(),!this._isAutoUpdating&&this.autoUpdate&&(p.shared.add(this.update,this),this._isAutoUpdating=!0);},e.prototype._onPlayStop=function(){this._isAutoUpdating&&(p.shared.remove(this.update,this),this._isAutoUpdating=!1);},e.prototype._onCanPlay=function(){this.hasLoaded=!0,this.source&&(this.source.removeEventListener("canplay",this._onCanPlay),this.source.removeEventListener("canplaythrough",this._onCanPlay),this.width=this.source.videoWidth,this.height=this.source.videoHeight,this.__loaded||(this.__loaded=!0,this.emit("loaded",this)),this._isSourcePlaying()?this._onPlayStart():this.autoPlay&&this.source.play());},e.prototype.destroy=function(){this._isAutoUpdating&&p.shared.remove(this.update,this),this.source&&this.source._pixiId&&(delete f.BaseTextureCache[this.source._pixiId],delete this.source._pixiId),t.prototype.destroy.call(this);},e.fromVideo=function(t,r){t._pixiId||(t._pixiId="video_"+(0,f.uid)());var n=f.BaseTextureCache[t._pixiId];return n||(n=new e(t,r),f.BaseTextureCache[t._pixiId]=n),n},e.fromUrl=function(t,r){var n=document.createElement("video");if(n.setAttribute("webkit-playsinline",""),n.setAttribute("playsinline",""),Array.isArray(t)){ for(var i=0;i<t.length;++i){ n.appendChild(u(t[i].src||t[i],t[i].mime)); } }else { n.appendChild(u(t.src||t,t.mime)); }return n.load(),e.fromVideo(n,r)},h(e,[{key:"autoUpdate",get:function(){return this._autoUpdate},set:function(t){t!==this._autoUpdate&&(this._autoUpdate=t,!this._autoUpdate&&this._isAutoUpdating?(p.shared.remove(this.update,this),this._isAutoUpdating=!1):this._autoUpdate&&!this._isAutoUpdating&&(p.shared.add(this.update,this),this._isAutoUpdating=!0));}}]),e}(c.default);r.default=v,v.fromUrls=v.fromUrl;},{"../ticker":117,"../utils":121,"./BaseTexture":110}],116:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("../settings"),a=n(s),u=t("eventemitter3"),h=n(u),l="tick",c=function(){function t(){var e=this;i(this,t),this._emitter=new h.default,this._requestId=null,this._maxElapsedMS=100,this.autoStart=!1,this.deltaTime=1,this.elapsedMS=1/a.default.TARGET_FPMS,this.lastTime=0,this.speed=1,this.started=!1,this._tick=function(t){e._requestId=null,e.started&&(e.update(t),e.started&&null===e._requestId&&e._emitter.listeners(l,!0)&&(e._requestId=requestAnimationFrame(e._tick)));};}return t.prototype._requestIfNeeded=function(){null===this._requestId&&this._emitter.listeners(l,!0)&&(this.lastTime=performance.now(),this._requestId=requestAnimationFrame(this._tick));},t.prototype._cancelIfNeeded=function(){null!==this._requestId&&(cancelAnimationFrame(this._requestId),this._requestId=null);},t.prototype._startIfPossible=function(){this.started?this._requestIfNeeded():this.autoStart&&this.start();},t.prototype.add=function(t,e){return this._emitter.on(l,t,e),this._startIfPossible(),this},t.prototype.addOnce=function(t,e){return this._emitter.once(l,t,e),this._startIfPossible(),this},t.prototype.remove=function(t,e){return this._emitter.off(l,t,e),this._emitter.listeners(l,!0)||this._cancelIfNeeded(),this},t.prototype.start=function(){this.started||(this.started=!0,this._requestIfNeeded());},t.prototype.stop=function(){this.started&&(this.started=!1,this._cancelIfNeeded());},t.prototype.update=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:performance.now(),e=void 0;t>this.lastTime?(e=this.elapsedMS=t-this.lastTime,e>this._maxElapsedMS&&(e=this._maxElapsedMS),this.deltaTime=e*a.default.TARGET_FPMS*this.speed,this._emitter.emit(l,this.deltaTime)):this.deltaTime=this.elapsedMS=0,this.lastTime=t;},o(t,[{key:"FPS",get:function(){return 1e3/this.elapsedMS}},{key:"minFPS",get:function(){return 1e3/this._maxElapsedMS},set:function(t){var e=Math.min(Math.max(0,t)/1e3,a.default.TARGET_FPMS);this._maxElapsedMS=1/e;}}]),t}();r.default=c;},{"../settings":100,eventemitter3:3}],117:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0,r.Ticker=r.shared=void 0;var i=t("./Ticker"),o=n(i),s=new o.default;s.autoStart=!0,r.shared=s,r.Ticker=o.default;},{"./Ticker":116}],118:[function(t,e,r){"use strict";function n(){var t=!!navigator.platform&&/iPad|iPhone|iPod/.test(navigator.platform);return!t}r.__esModule=!0,r.default=n;},{}],119:[function(t,e,r){"use strict";function n(t){for(var e=6*t,r=new Uint16Array(e),n=0,i=0;n<e;n+=6,i+=4){ r[n+0]=i+0,r[n+1]=i+1,r[n+2]=i+2,r[n+3]=i+0,r[n+4]=i+2,r[n+5]=i+3; }return r}r.__esModule=!0,r.default=n;},{}],120:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:window.location;if(0===t.indexOf("data:")){ return""; }e=e||window.location,a||(a=document.createElement("a")),a.href=t,t=s.default.parse(a.href);var r=!t.port&&""===e.port||t.port===e.port;return t.hostname===e.hostname&&r&&t.protocol===e.protocol?"":"anonymous"}r.__esModule=!0,r.default=i;var o=t("url"),s=n(o),a=void 0;},{url:29}],121:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}function o(){return++A}function s(t,e){return e=e||[],e[0]=(t>>16&255)/255,e[1]=(t>>8&255)/255,e[2]=(255&t)/255,e}function a(t){return t=t.toString(16),t="000000".substr(0,6-t.length)+t,"#"+t}function u(t){return(255*t[0]<<16)+(255*t[1]<<8)+(255*t[2]|0)}function h(t,e){var r=T.default.RETINA_PREFIX.exec(t);return r?parseFloat(r[1]):void 0!==e?e:1}function l(t){var e=b.DATA_URI.exec(t);if(e){ return{mediaType:e[1]?e[1].toLowerCase():void 0,subType:e[2]?e[2].toLowerCase():void 0,encoding:e[3]?e[3].toLowerCase():void 0,data:e[4]} }}function c(t){var e=b.URL_FILE_EXTENSION.exec(t);if(e){ return e[1].toLowerCase() }}function f(t){var e=b.SVG_SIZE.exec(t),r={};return e&&(r[e[1]]=Math.round(parseFloat(e[3])),r[e[5]]=Math.round(parseFloat(e[7]))),r}function d(){I=!0;}function p(t){if(!I){if(navigator.userAgent.toLowerCase().indexOf("chrome")>-1){var e=["\n %c %c %c Pixi.js "+b.VERSION+" - ✰ "+t+" ✰  %c  %c  http://www.pixijs.com/  %c %c ♥%c♥%c♥ \n\n","background: #ff66a5; padding:5px 0;","background: #ff66a5; padding:5px 0;","color: #ff66a5; background: #030307; padding:5px 0;","background: #ff66a5; padding:5px 0;","background: #ffc3dc; padding:5px 0;","background: #ff66a5; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;"];window.console.log.apply(console,e);}else { window.console&&window.console.log("Pixi.js "+b.VERSION+" - "+t+" - http://www.pixijs.com/"); }I=!0;}}function v(){var t={stencil:!0,failIfMajorPerformanceCaveat:!0};try{if(!window.WebGLRenderingContext){ return!1; }var e=document.createElement("canvas"),r=e.getContext("webgl",t)||e.getContext("experimental-webgl",t),n=!(!r||!r.getContextAttributes().stencil);if(r){var i=r.getExtension("WEBGL_lose_context");i&&i.loseContext();}return r=null,n}catch(t){return!1}}function y(t){return 0===t?0:t<0?-1:1}function g(t,e,r){var n=t.length;if(!(e>=n||0===r)){r=e+r>n?n-e:r;for(var i=n-r,o=e;o<i;++o){ t[o]=t[o+r]; }t.length=i;}}function m(){var t=void 0;for(t in D){ D[t].destroy(); }for(t in L){ L[t].destroy(); }}function _(){var t=void 0;for(t in D){ delete D[t]; }for(t in L){ delete L[t]; }}r.__esModule=!0,r.BaseTextureCache=r.TextureCache=r.mixins=r.pluginTarget=r.EventEmitter=r.isMobile=void 0,r.uid=o,r.hex2rgb=s,r.hex2string=a,r.rgb2hex=u,r.getResolutionOfUrl=h,r.decomposeDataUri=l,r.getUrlFileExtension=c,r.getSvgSize=f,r.skipHello=d,r.sayHello=p,r.isWebGLSupported=v,r.sign=y,r.removeItems=g,r.destroyTextureCache=m,r.clearTextureCache=_;var b=t("../const"),x=t("../settings"),T=i(x),w=t("eventemitter3"),E=i(w),S=t("./pluginTarget"),O=i(S),P=t("./mixin"),M=n(P),C=t("ismobilejs"),R=n(C),A=0,I=!1;r.isMobile=R,r.EventEmitter=E.default,r.pluginTarget=O.default,r.mixins=M;var D=r.TextureCache={},L=r.BaseTextureCache={};},{"../const":45,"../settings":100,"./mixin":123,"./pluginTarget":124,eventemitter3:3,ismobilejs:4}],122:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){return s.default.tablet||s.default.phone?4:t}r.__esModule=!0,r.default=i;var o=t("ismobilejs"),s=n(o);},{ismobilejs:4}],123:[function(t,e,r){"use strict";function n(t,e){if(t&&e){ for(var r=Object.keys(e),n=0;n<r.length;++n){var i=r[n];Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));} }}function i(t,e){s.push(t,e);}function o(){for(var t=0;t<s.length;t+=2){ n(s[t],s[t+1]); }s.length=0;}r.__esModule=!0,r.mixin=n,r.delayMixin=i,r.performMixins=o;var s=[];},{}],124:[function(t,e,r){"use strict";function n(t){t.__plugins={},t.registerPlugin=function(e,r){t.__plugins[e]=r;},t.prototype.initPlugins=function(){
var this$1 = this;
this.plugins=this.plugins||{};for(var e in t.__plugins){ this$1.plugins[e]=new t.__plugins[e](this$1); }},t.prototype.destroyPlugins=function(){
var this$1 = this;
for(var t in this.plugins){ this$1.plugins[t].destroy(),this$1.plugins[t]=null; }this.plugins=null;};}r.__esModule=!0,r.default={mixin:function(t){n(t);}};},{}],125:[function(t,e,r){"use strict";function n(t){var e=t.width,r=t.height,n=t.getContext("2d"),i=n.getImageData(0,0,e,r),o=i.data,s=o.length,a={top:null,left:null,right:null,bottom:null},u=void 0,h=void 0,l=void 0;for(u=0;u<s;u+=4){ 0!==o[u+3]&&(h=u/4%e,l=~~(u/4/e),null===a.top&&(a.top=l),null===a.left?a.left=h:h<a.left&&(a.left=h),null===a.right?a.right=h+1:a.right<h&&(a.right=h+1),null===a.bottom?a.bottom=l:a.bottom<l&&(a.bottom=l)); }e=a.right-a.left,r=a.bottom-a.top+1;var c=n.getImageData(a.left,a.top,e,r);return{height:r,width:e,data:c}}r.__esModule=!0,r.default=n;},{}],126:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){}var o=t("./core"),s=n(o),a=t("./mesh"),u=n(a),h=t("./particles"),l=n(h),c=t("./extras"),f=n(c),d=t("./filters"),p=n(d),v=t("./prepare"),y=n(v),g=t("./loaders"),m=n(g),_=t("./interaction"),b=n(_);s.SpriteBatch=function(){throw new ReferenceError("SpriteBatch does not exist any more, please use the new ParticleContainer instead.")},s.AssetLoader=function(){throw new ReferenceError("The loader system was overhauled in pixi v3, please see the new PIXI.loaders.Loader class.")},Object.defineProperties(s,{Stage:{enumerable:!0,get:function(){return i("You do not need to use a PIXI Stage any more, you can simply render any container."),s.Container}},DisplayObjectContainer:{enumerable:!0,get:function(){return i("DisplayObjectContainer has been shortened to Container, please use Container from now on."),s.Container}},Strip:{enumerable:!0,get:function(){return i("The Strip class has been renamed to Mesh and moved to mesh.Mesh, please use mesh.Mesh from now on."),u.Mesh}},Rope:{enumerable:!0,get:function(){return i("The Rope class has been moved to mesh.Rope, please use mesh.Rope from now on."),u.Rope}},ParticleContainer:{enumerable:!0,get:function(){return i("The ParticleContainer class has been moved to particles.ParticleContainer, please use particles.ParticleContainer from now on."),l.ParticleContainer}},MovieClip:{enumerable:!0,get:function(){return i("The MovieClip class has been moved to extras.AnimatedSprite, please use extras.AnimatedSprite."),f.AnimatedSprite}},TilingSprite:{enumerable:!0,get:function(){return i("The TilingSprite class has been moved to extras.TilingSprite, please use extras.TilingSprite from now on."),f.TilingSprite}},BitmapText:{enumerable:!0,get:function(){return i("The BitmapText class has been moved to extras.BitmapText, please use extras.BitmapText from now on."),f.BitmapText}},blendModes:{enumerable:!0,get:function(){return i("The blendModes has been moved to BLEND_MODES, please use BLEND_MODES from now on."),s.BLEND_MODES}},scaleModes:{enumerable:!0,get:function(){return i("The scaleModes has been moved to SCALE_MODES, please use SCALE_MODES from now on."),s.SCALE_MODES}},BaseTextureCache:{enumerable:!0,get:function(){return i("The BaseTextureCache class has been moved to utils.BaseTextureCache, please use utils.BaseTextureCache from now on."),s.utils.BaseTextureCache}},TextureCache:{enumerable:!0,get:function(){return i("The TextureCache class has been moved to utils.TextureCache, please use utils.TextureCache from now on."),s.utils.TextureCache}},math:{enumerable:!0,get:function(){return i("The math namespace is deprecated, please access members already accessible on PIXI."),s}},AbstractFilter:{enumerable:!0,get:function(){return i("AstractFilter has been renamed to Filter, please use PIXI.Filter"),s.Filter}},TransformManual:{enumerable:!0,get:function(){return i("TransformManual has been renamed to TransformBase, please update your pixi-spine"),s.TransformBase}},TARGET_FPMS:{enumerable:!0,get:function(){return i("PIXI.TARGET_FPMS has been deprecated, please use PIXI.settings.TARGET_FPMS"),s.settings.TARGET_FPMS},set:function(t){i("PIXI.TARGET_FPMS has been deprecated, please use PIXI.settings.TARGET_FPMS"),s.settings.TARGET_FPMS=t;}},FILTER_RESOLUTION:{enumerable:!0,get:function(){return i("PIXI.FILTER_RESOLUTION has been deprecated, please use PIXI.settings.FILTER_RESOLUTION"),s.settings.FILTER_RESOLUTION},set:function(t){i("PIXI.FILTER_RESOLUTION has been deprecated, please use PIXI.settings.FILTER_RESOLUTION"),s.settings.FILTER_RESOLUTION=t;}},RESOLUTION:{enumerable:!0,get:function(){return i("PIXI.RESOLUTION has been deprecated, please use PIXI.settings.RESOLUTION"),s.settings.RESOLUTION},set:function(t){i("PIXI.RESOLUTION has been deprecated, please use PIXI.settings.RESOLUTION"),s.settings.RESOLUTION=t;}},MIPMAP_TEXTURES:{enumerable:!0,get:function(){return i("PIXI.MIPMAP_TEXTURES has been deprecated, please use PIXI.settings.MIPMAP_TEXTURES"),s.settings.MIPMAP_TEXTURES},set:function(t){i("PIXI.MIPMAP_TEXTURES has been deprecated, please use PIXI.settings.MIPMAP_TEXTURES"),s.settings.MIPMAP_TEXTURES=t;}},SPRITE_BATCH_SIZE:{enumerable:!0,get:function(){return i("PIXI.SPRITE_BATCH_SIZE has been deprecated, please use PIXI.settings.SPRITE_BATCH_SIZE"),s.settings.SPRITE_BATCH_SIZE},set:function(t){i("PIXI.SPRITE_BATCH_SIZE has been deprecated, please use PIXI.settings.SPRITE_BATCH_SIZE"),s.settings.SPRITE_BATCH_SIZE=t;}},SPRITE_MAX_TEXTURES:{enumerable:!0,get:function(){return i("PIXI.SPRITE_MAX_TEXTURES has been deprecated, please use PIXI.settings.SPRITE_MAX_TEXTURES"),s.settings.SPRITE_MAX_TEXTURES},set:function(t){i("PIXI.SPRITE_MAX_TEXTURES has been deprecated, please use PIXI.settings.SPRITE_MAX_TEXTURES"),s.settings.SPRITE_MAX_TEXTURES=t;}},RETINA_PREFIX:{enumerable:!0,get:function(){return i("PIXI.RETINA_PREFIX has been deprecated, please use PIXI.settings.RETINA_PREFIX"),s.settings.RETINA_PREFIX},set:function(t){i("PIXI.RETINA_PREFIX has been deprecated, please use PIXI.settings.RETINA_PREFIX"),s.settings.RETINA_PREFIX=t;}},DEFAULT_RENDER_OPTIONS:{enumerable:!0,get:function(){return i("PIXI.DEFAULT_RENDER_OPTIONS has been deprecated, please use PIXI.settings.DEFAULT_RENDER_OPTIONS"),s.settings.RENDER_OPTIONS}}});for(var x=[{parent:"TRANSFORM_MODE",target:"TRANSFORM_MODE"},{parent:"GC_MODES",target:"GC_MODE"},{parent:"WRAP_MODES",target:"WRAP_MODE"},{parent:"SCALE_MODES",target:"SCALE_MODE"},{parent:"PRECISION",target:"PRECISION_FRAGMENT"}],T=function(t){var e=x[t];Object.defineProperty(s[e.parent],"DEFAULT",{enumerable:!0,get:function(){return i("PIXI."+e.parent+".DEFAULT has been deprecated, please use PIXI.settings."+e.target),s.settings[e.target]},set:function(t){i("PIXI."+e.parent+".DEFAULT has been deprecated, please use PIXI.settings."+e.target),s.settings[e.target]=t;}});},w=0;w<x.length;w++){ T(w); }Object.defineProperties(s.settings,{PRECISION:{enumerable:!0,get:function(){return i("PIXI.settings.PRECISION has been deprecated, please use PIXI.settings.PRECISION_FRAGMENT"),s.settings.PRECISION_FRAGMENT},set:function(t){i("PIXI.settings.PRECISION has been deprecated, please use PIXI.settings.PRECISION_FRAGMENT"),s.settings.PRECISION_FRAGMENT=t;}}}),Object.defineProperties(f,{MovieClip:{enumerable:!0,get:function(){return i("The MovieClip class has been renamed to AnimatedSprite, please use AnimatedSprite from now on."),f.AnimatedSprite}}}),s.DisplayObject.prototype.generateTexture=function(t,e,r){return i("generateTexture has moved to the renderer, please use renderer.generateTexture(displayObject)"),t.generateTexture(this,e,r)},s.Graphics.prototype.generateTexture=function(t,e){return i("graphics generate texture has moved to the renderer. Or to render a graphics to a texture using canvas please use generateCanvasTexture"),this.generateCanvasTexture(t,e)},s.RenderTexture.prototype.render=function(t,e,r,n){this.legacyRenderer.render(t,this,r,e,!n),i("RenderTexture.render is now deprecated, please use renderer.render(displayObject, renderTexture)");},s.RenderTexture.prototype.getImage=function(t){return i("RenderTexture.getImage is now deprecated, please use renderer.extract.image(target)"),this.legacyRenderer.extract.image(t)},s.RenderTexture.prototype.getBase64=function(t){return i("RenderTexture.getBase64 is now deprecated, please use renderer.extract.base64(target)"),this.legacyRenderer.extract.base64(t)},s.RenderTexture.prototype.getCanvas=function(t){return i("RenderTexture.getCanvas is now deprecated, please use renderer.extract.canvas(target)"),this.legacyRenderer.extract.canvas(t)},s.RenderTexture.prototype.getPixels=function(t){return i("RenderTexture.getPixels is now deprecated, please use renderer.extract.pixels(target)"),this.legacyRenderer.pixels(t)},s.Sprite.prototype.setTexture=function(t){this.texture=t,i("setTexture is now deprecated, please use the texture property, e.g : sprite.texture = texture;");},f.BitmapText.prototype.setText=function(t){this.text=t,i("setText is now deprecated, please use the text property, e.g : myBitmapText.text = 'my text';");},s.Text.prototype.setText=function(t){this.text=t,i("setText is now deprecated, please use the text property, e.g : myText.text = 'my text';");},s.Text.prototype.setStyle=function(t){this.style=t,i("setStyle is now deprecated, please use the style property, e.g : myText.style = style;");},s.Text.prototype.determineFontProperties=function(t){return i("determineFontProperties is now deprecated, please use the static calculateFontProperties method, e.g : Text.calculateFontProperties(fontStyle);"),s.Text.calculateFontProperties(t)},Object.defineProperties(s.TextStyle.prototype,{font:{get:function(){i("text style property 'font' is now deprecated, please use the 'fontFamily', 'fontSize', 'fontStyle', 'fontVariant' and 'fontWeight' properties from now on");var t="number"==typeof this._fontSize?this._fontSize+"px":this._fontSize;return this._fontStyle+" "+this._fontVariant+" "+this._fontWeight+" "+t+" "+this._fontFamily},set:function(t){
var this$1 = this;
i("text style property 'font' is now deprecated, please use the 'fontFamily','fontSize',fontStyle','fontVariant' and 'fontWeight' properties from now on"),t.indexOf("italic")>1?this._fontStyle="italic":t.indexOf("oblique")>-1?this._fontStyle="oblique":this._fontStyle="normal",t.indexOf("small-caps")>-1?this._fontVariant="small-caps":this._fontVariant="normal";var e=t.split(" "),r=-1;this._fontSize=26;for(var n=0;n<e.length;++n){ if(e[n].match(/(px|pt|em|%)/)){r=n,this$1._fontSize=e[n];break} }this._fontWeight="normal";for(var o=0;o<r;++o){ if(e[o].match(/(bold|bolder|lighter|100|200|300|400|500|600|700|800|900)/)){this$1._fontWeight=e[o];break} }if(r>-1&&r<e.length-1){this._fontFamily="";for(var s=r+1;s<e.length;++s){ this$1._fontFamily+=e[s]+" "; }this._fontFamily=this._fontFamily.slice(0,-1);}else { this._fontFamily="Arial"; }this.styleID++;}}}),s.Texture.prototype.setFrame=function(t){this.frame=t,i("setFrame is now deprecated, please use the frame property, e.g: myTexture.frame = frame;");},Object.defineProperties(p,{AbstractFilter:{get:function(){return i("AstractFilter has been renamed to Filter, please use PIXI.Filter"),s.AbstractFilter}},SpriteMaskFilter:{get:function(){return i("filters.SpriteMaskFilter is an undocumented alias, please use SpriteMaskFilter from now on."),s.SpriteMaskFilter}}}),s.utils.uuid=function(){return i("utils.uuid() is deprecated, please use utils.uid() from now on."),s.utils.uid()},s.utils.canUseNewCanvasBlendModes=function(){return i("utils.canUseNewCanvasBlendModes() is deprecated, please use CanvasTinter.canUseMultiply from now on"),s.CanvasTinter.canUseMultiply};var E=!0;Object.defineProperty(s.utils,"_saidHello",{set:function(t){t&&(i("PIXI.utils._saidHello is deprecated, please use PIXI.utils.skipHello()"),this.skipHello()),E=t;},get:function(){return E}}),Object.defineProperty(y.canvas,"UPLOADS_PER_FRAME",{set:function(){i("PIXI.CanvasPrepare.UPLOADS_PER_FRAME has been removed. Please set renderer.plugins.prepare.limiter.maxItemsPerFrame on your renderer");},get:function(){return i("PIXI.CanvasPrepare.UPLOADS_PER_FRAME has been removed. Please use renderer.plugins.prepare.limiter"),NaN}}),Object.defineProperty(y.webgl,"UPLOADS_PER_FRAME",{set:function(){i("PIXI.WebGLPrepare.UPLOADS_PER_FRAME has been removed. Please set renderer.plugins.prepare.limiter.maxItemsPerFrame on your renderer");},get:function(){return i("PIXI.WebGLPrepare.UPLOADS_PER_FRAME has been removed. Please use renderer.plugins.prepare.limiter"),NaN}}),Object.defineProperties(m.Resource.prototype,{isJson:{get:function(){return i("The isJson property is deprecated, please use `resource.type === Resource.TYPE.JSON`."),this.type===m.Loader.Resource.TYPE.JSON}},isXml:{get:function(){return i("The isXml property is deprecated, please use `resource.type === Resource.TYPE.XML`."),this.type===m.Loader.Resource.TYPE.XML}},isImage:{get:function(){return i("The isImage property is deprecated, please use `resource.type === Resource.TYPE.IMAGE`."),this.type===m.Loader.Resource.TYPE.IMAGE}},isAudio:{get:function(){return i("The isAudio property is deprecated, please use `resource.type === Resource.TYPE.AUDIO`."),this.type===m.Loader.Resource.TYPE.AUDIO}},isVideo:{get:function(){return i("The isVideo property is deprecated, please use `resource.type === Resource.TYPE.VIDEO`."),this.type===m.Loader.Resource.TYPE.VIDEO}}}),Object.defineProperties(m.Loader.prototype,{before:{get:function(){return i("The before() method is deprecated, please use pre()."),this.pre}},after:{get:function(){return i("The after() method is deprecated, please use use()."),this.use}}}),Object.defineProperty(b.interactiveTarget,"defaultCursor",{set:function(t){i("Property defaultCursor has been replaced with 'cursor'. "),this.cursor=t;},get:function(){return i("Property defaultCursor has been replaced with 'cursor'. "),this.cursor},enumerable:!0}),Object.defineProperty(b.InteractionManager,"defaultCursorStyle",{set:function(t){i("Property defaultCursorStyle has been replaced with 'cursorStyles.default'. "),this.cursorStyles.default=t;},get:function(){return i("Property defaultCursorStyle has been replaced with 'cursorStyles.default'. "),this.cursorStyles.default}}),Object.defineProperty(b.InteractionManager,"currentCursorStyle",{set:function(t){i("Property currentCursorStyle has been removed.See the currentCursorMode property, which works differently."),this.currentCursorMode=t;},get:function(){return i("Property currentCursorStyle has been removed.See the currentCursorMode property, which works differently."),this.currentCursorMode}});},{"./core":64,"./extras":137,"./filters":148,"./interaction":155,"./loaders":158,"./mesh":167,"./particles":170,"./prepare":180}],127:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../core"),s=n(o),a=new s.Rectangle,u=function(){function t(e){i(this,t),this.renderer=e,e.extract=this;}return t.prototype.image=function t(e){var t=new Image;return t.src=this.base64(e),t},t.prototype.base64=function(t){return this.canvas(t).toDataURL()},t.prototype.canvas=function(t){var e=this.renderer,r=void 0,n=void 0,i=void 0,o=void 0;t&&(o=t instanceof s.RenderTexture?t:e.generateTexture(t)),o?(r=o.baseTexture._canvasRenderTarget.context,n=o.baseTexture._canvasRenderTarget.resolution,i=o.frame):(r=e.rootContext,i=a,i.width=this.renderer.width,i.height=this.renderer.height);var u=i.width*n,h=i.height*n,l=new s.CanvasRenderTarget(u,h),c=r.getImageData(i.x*n,i.y*n,u,h);return l.context.putImageData(c,0,0),l.canvas},t.prototype.pixels=function(t){var e=this.renderer,r=void 0,n=void 0,i=void 0,o=void 0;return t&&(o=t instanceof s.RenderTexture?t:e.generateTexture(t)),o?(r=o.baseTexture._canvasRenderTarget.context,n=o.baseTexture._canvasRenderTarget.resolution,i=o.frame):(r=e.rootContext,i=a,i.width=e.width,i.height=e.height),r.getImageData(0,0,i.width*n,i.height*n).data},t.prototype.destroy=function(){this.renderer.extract=null,this.renderer=null;},t}();r.default=u,s.CanvasRenderer.registerPlugin("extract",u);},{"../../core":64}],128:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./webgl/WebGLExtract");Object.defineProperty(r,"webgl",{enumerable:!0,get:function(){return n(i).default}});var o=t("./canvas/CanvasExtract");Object.defineProperty(r,"canvas",{enumerable:!0,get:function(){return n(o).default}});},{"./canvas/CanvasExtract":127,"./webgl/WebGLExtract":129}],129:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../../core"),s=n(o),a=new s.Rectangle,u=4,h=function(){function t(e){i(this,t),this.renderer=e,e.extract=this;}return t.prototype.image=function t(e){var t=new Image;return t.src=this.base64(e),t},t.prototype.base64=function(t){return this.canvas(t).toDataURL()},t.prototype.canvas=function(t){var e=this.renderer,r=void 0,n=void 0,i=void 0,o=!1,h=void 0;t&&(h=t instanceof s.RenderTexture?t:this.renderer.generateTexture(t)),h?(r=h.baseTexture._glRenderTargets[this.renderer.CONTEXT_UID],n=r.resolution,i=h.frame,o=!1):(r=this.renderer.rootRenderTarget,n=r.resolution,o=!0,i=a,i.width=r.size.width,i.height=r.size.height);var l=i.width*n,c=i.height*n,f=new s.CanvasRenderTarget(l,c);if(r){e.bindRenderTarget(r);var d=new Uint8Array(u*l*c),p=e.gl;p.readPixels(i.x*n,i.y*n,l,c,p.RGBA,p.UNSIGNED_BYTE,d);var v=f.context.getImageData(0,0,l,c);v.data.set(d),f.context.putImageData(v,0,0),o&&(f.context.scale(1,-1),f.context.drawImage(f.canvas,0,-c));}return f.canvas},t.prototype.pixels=function(t){var e=this.renderer,r=void 0,n=void 0,i=void 0,o=void 0;t&&(o=t instanceof s.RenderTexture?t:this.renderer.generateTexture(t)),o?(r=o.baseTexture._glRenderTargets[this.renderer.CONTEXT_UID],n=r.resolution,i=o.frame):(r=this.renderer.rootRenderTarget,n=r.resolution,i=a,i.width=r.size.width,i.height=r.size.height);var h=i.width*n,l=i.height*n,c=new Uint8Array(u*h*l);if(r){e.bindRenderTarget(r);var f=e.gl;f.readPixels(i.x*n,i.y*n,h,l,f.RGBA,f.UNSIGNED_BYTE,c);}return c},t.prototype.destroy=function(){this.renderer.extract=null,this.renderer=null;},t}();r.default=h,s.WebGLRenderer.registerPlugin("extract",h);},{"../../core":64}],130:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../core"),h=n(u),l=function(t){function e(r,n){i(this,e);var s=o(this,t.call(this,r[0]instanceof h.Texture?r[0]:r[0].texture));return s._textures=null,s._durations=null,s.textures=r,s._autoUpdate=n!==!1,s.animationSpeed=1,s.loop=!0,s.onComplete=null,s.onFrameChange=null,s._currentTime=0,s.playing=!1,s}return s(e,t),e.prototype.stop=function(){this.playing&&(this.playing=!1,this._autoUpdate&&h.ticker.shared.remove(this.update,this));},e.prototype.play=function(){this.playing||(this.playing=!0,this._autoUpdate&&h.ticker.shared.add(this.update,this));},e.prototype.gotoAndStop=function(t){this.stop();var e=this.currentFrame;this._currentTime=t,e!==this.currentFrame&&this.updateTexture();},e.prototype.gotoAndPlay=function(t){var e=this.currentFrame;this._currentTime=t,e!==this.currentFrame&&this.updateTexture(),this.play();},e.prototype.update=function(t){
var this$1 = this;
var e=this.animationSpeed*t,r=this.currentFrame;if(null!==this._durations){var n=this._currentTime%1*this._durations[this.currentFrame];for(n+=e/60*1e3;n<0;){ this$1._currentTime--,n+=this$1._durations[this$1.currentFrame]; }var i=Math.sign(this.animationSpeed*t);for(this._currentTime=Math.floor(this._currentTime);n>=this._durations[this.currentFrame];){ n-=this$1._durations[this$1.currentFrame]*i,this$1._currentTime+=i; }this._currentTime+=n/this._durations[this.currentFrame];}else { this._currentTime+=e; }this._currentTime<0&&!this.loop?(this.gotoAndStop(0),this.onComplete&&this.onComplete()):this._currentTime>=this._textures.length&&!this.loop?(this.gotoAndStop(this._textures.length-1),this.onComplete&&this.onComplete()):r!==this.currentFrame&&this.updateTexture();},e.prototype.updateTexture=function(){this._texture=this._textures[this.currentFrame],this._textureID=-1,this.onFrameChange&&this.onFrameChange(this.currentFrame);},e.prototype.destroy=function(){this.stop(),t.prototype.destroy.call(this);},e.fromFrames=function(t){for(var r=[],n=0;n<t.length;++n){ r.push(h.Texture.fromFrame(t[n])); }return new e(r)},e.fromImages=function(t){for(var r=[],n=0;n<t.length;++n){ r.push(h.Texture.fromImage(t[n])); }return new e(r)},a(e,[{key:"totalFrames",get:function(){return this._textures.length}},{key:"textures",get:function(){return this._textures},set:function(t){
var this$1 = this;
if(t[0]instanceof h.Texture){ this._textures=t,this._durations=null; }else{this._textures=[],this._durations=[];for(var e=0;e<t.length;e++){ this$1._textures.push(t[e].texture),this$1._durations.push(t[e].time); }}}},{key:"currentFrame",get:function(){var t=Math.floor(this._currentTime)%this._textures.length;return t<0&&(t+=this._textures.length),t}}]),e}(h.Sprite);r.default=l;},{"../core":64}],131:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }
return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("../core"),l=i(h),c=t("../core/math/ObservablePoint"),f=n(c),d=function(t){function e(r){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};o(this,e);var i=s(this,t.call(this));return i._textWidth=0,i._textHeight=0,i._glyphs=[],i._font={tint:void 0!==n.tint?n.tint:16777215,align:n.align||"left",name:null,size:0},i.font=n.font,i._text=r,i.maxWidth=0,i.maxLineHeight=0,i._anchor=new f.default(function(){i.dirty=!0;},i,0,0),i.dirty=!1,i.updateText(),i}return a(e,t),e.prototype.updateText=function(){
var this$1 = this;
for(var t=e.fonts[this._font.name],r=this._font.size/t.size,n=new l.Point,i=[],o=[],s=null,a=0,u=0,h=0,c=-1,f=0,d=0,p=0;p<this.text.length;p++){var v=this$1.text.charCodeAt(p);if(/(\s)/.test(this$1.text.charAt(p))&&(c=p,f=a),/(?:\r\n|\r|\n)/.test(this$1.text.charAt(p))){ o.push(a),u=Math.max(u,a),h++,n.x=0,n.y+=t.lineHeight,s=null; }else if(c!==-1&&this$1.maxWidth>0&&n.x*r>this$1.maxWidth){ l.utils.removeItems(i,c,p-c),p=c,c=-1,o.push(f),u=Math.max(u,f),h++,n.x=0,n.y+=t.lineHeight,s=null; }else{var y=t.chars[v];y&&(s&&y.kerning[s]&&(n.x+=y.kerning[s]),i.push({texture:y.texture,line:h,charCode:v,position:new l.Point(n.x+y.xOffset,n.y+y.yOffset)}),a=n.x+(y.texture.width+y.xOffset),n.x+=y.xAdvance,d=Math.max(d,y.yOffset+y.texture.height),s=v);}}o.push(a),u=Math.max(u,a);for(var g=[],m=0;m<=h;m++){var _=0;"right"===this$1._font.align?_=u-o[m]:"center"===this$1._font.align&&(_=(u-o[m])/2),g.push(_);}for(var b=i.length,x=this.tint,T=0;T<b;T++){var w=this$1._glyphs[T];w?w.texture=i[T].texture:(w=new l.Sprite(i[T].texture),this$1._glyphs.push(w)),w.position.x=(i[T].position.x+g[i[T].line])*r,w.position.y=i[T].position.y*r,w.scale.x=w.scale.y=r,w.tint=x,w.parent||this$1.addChild(w);}for(var E=b;E<this._glyphs.length;++E){ this$1.removeChild(this$1._glyphs[E]); }if(this._textWidth=u*r,this._textHeight=(n.y+t.lineHeight)*r,0!==this.anchor.x||0!==this.anchor.y){ for(var S=0;S<b;S++){ this$1._glyphs[S].x-=this$1._textWidth*this$1.anchor.x,this$1._glyphs[S].y-=this$1._textHeight*this$1.anchor.y; } }this.maxLineHeight=d*r;},e.prototype.updateTransform=function(){this.validate(),this.containerUpdateTransform();},e.prototype.getLocalBounds=function(){return this.validate(),t.prototype.getLocalBounds.call(this)},e.prototype.validate=function(){this.dirty&&(this.updateText(),this.dirty=!1);},e.registerFont=function(t,r){var n={},i=t.getElementsByTagName("info")[0],o=t.getElementsByTagName("common")[0];n.font=i.getAttribute("face"),n.size=parseInt(i.getAttribute("size"),10),n.lineHeight=parseInt(o.getAttribute("lineHeight"),10),n.chars={};for(var s=t.getElementsByTagName("char"),a=0;a<s.length;a++){var u=s[a],h=parseInt(u.getAttribute("id"),10),c=new l.Rectangle(parseInt(u.getAttribute("x"),10)+r.frame.x,parseInt(u.getAttribute("y"),10)+r.frame.y,parseInt(u.getAttribute("width"),10),parseInt(u.getAttribute("height"),10));n.chars[h]={xOffset:parseInt(u.getAttribute("xoffset"),10),yOffset:parseInt(u.getAttribute("yoffset"),10),xAdvance:parseInt(u.getAttribute("xadvance"),10),kerning:{},texture:new l.Texture(r.baseTexture,c)};}for(var f=t.getElementsByTagName("kerning"),d=0;d<f.length;d++){var p=f[d],v=parseInt(p.getAttribute("first"),10),y=parseInt(p.getAttribute("second"),10),g=parseInt(p.getAttribute("amount"),10);n.chars[y]&&(n.chars[y].kerning[v]=g);}return e.fonts[n.font]=n,n},u(e,[{key:"tint",get:function(){return this._font.tint},set:function(t){this._font.tint="number"==typeof t&&t>=0?t:16777215,this.dirty=!0;}},{key:"align",get:function(){return this._font.align},set:function(t){this._font.align=t||"left",this.dirty=!0;}},{key:"anchor",get:function(){return this._anchor},set:function(t){"number"==typeof t?this._anchor.set(t):this._anchor.copy(t);}},{key:"font",get:function(){return this._font},set:function(t){t&&("string"==typeof t?(t=t.split(" "),this._font.name=1===t.length?t[0]:t.slice(1).join(" "),this._font.size=t.length>=2?parseInt(t[0],10):e.fonts[this._font.name].size):(this._font.name=t.name,this._font.size="number"==typeof t.size?t.size:parseInt(t.size,10)),this.dirty=!0);}},{key:"text",get:function(){return this._text},set:function(t){t=t.toString()||" ",this._text!==t&&(this._text=t,this.dirty=!0);}},{key:"textWidth",get:function(){return this.validate(),this._textWidth}},{key:"textHeight",get:function(){return this.validate(),this._textHeight}}]),e}(l.Container);r.default=d,d.fonts={};},{"../core":64,"../core/math/ObservablePoint":67}],132:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),s=t("../core/math/Matrix"),a=n(s),u=new a.default,h=function(){function t(e,r){i(this,t),this._texture=e,this.mapCoord=new a.default,this.uClampFrame=new Float32Array(4),this.uClampOffset=new Float32Array(2),this._lastTextureID=-1,this.clampOffset=0,this.clampMargin="undefined"==typeof r?.5:r;}return t.prototype.update=function(t){var e=this._texture;if(e&&e.valid&&(t||this._lastTextureID!==e._updateID)){this._lastTextureID=e._updateID;var r=e._uvs;this.mapCoord.set(r.x1-r.x0,r.y1-r.y0,r.x3-r.x0,r.y3-r.y0,r.x0,r.y0);var n=e.orig,i=e.trim;i&&(u.set(n.width/i.width,0,0,n.height/i.height,-i.x/i.width,-i.y/i.height),this.mapCoord.append(u));var o=e.baseTexture,s=this.uClampFrame,a=this.clampMargin/o.resolution,h=this.clampOffset;s[0]=(e._frame.x+a+h)/o.width,s[1]=(e._frame.y+a+h)/o.height,s[2]=(e._frame.x+e._frame.width-a+h)/o.width,s[3]=(e._frame.y+e._frame.height-a+h)/o.height,this.uClampOffset[0]=h/o.realWidth,this.uClampOffset[1]=h/o.realHeight;}},o(t,[{key:"texture",get:function(){return this._texture},set:function(t){this._texture=t,this._lastTextureID=-1;}}]),t}();r.default=h;},{"../core/math/Matrix":66}],133:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("../core"),l=i(h),c=t("../core/sprites/canvas/CanvasTinter"),f=n(c),d=t("./TextureTransform"),p=n(d),v=new l.Point,y=function(t){function e(r){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:100,i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:100;o(this,e);var a=s(this,t.call(this,r));return a.tileTransform=new l.TransformStatic,a._width=n,a._height=i,a._canvasPattern=null,a.uvTransform=r.transform||new p.default(r),a.pluginName="tilingSprite",a.uvRespectAnchor=!1,a}return a(e,t),e.prototype._onTextureUpdate=function(){this.uvTransform&&(this.uvTransform.texture=this._texture);},e.prototype._renderWebGL=function(t){var e=this._texture;e&&e.valid&&(this.tileTransform.updateLocalTransform(),this.uvTransform.update(),t.setObjectRenderer(t.plugins[this.pluginName]),t.plugins[this.pluginName].render(this));},e.prototype._renderCanvas=function(t){var e=this._texture;if(e.baseTexture.hasLoaded){var r=t.context,n=this.worldTransform,i=t.resolution,o=e.baseTexture,s=e.baseTexture.resolution,a=this.tilePosition.x/this.tileScale.x%e._frame.width,u=this.tilePosition.y/this.tileScale.y%e._frame.height;if(!this._canvasPattern){var h=new l.CanvasRenderTarget(e._frame.width,e._frame.height,s);16777215!==this.tint?(this.cachedTint!==this.tint&&(this.cachedTint=this.tint,this.tintedTexture=f.default.getTintedTexture(this,this.tint)),h.context.drawImage(this.tintedTexture,0,0)):h.context.drawImage(o.source,-e._frame.x,-e._frame.y),this._canvasPattern=h.context.createPattern(h.canvas,"repeat");}r.globalAlpha=this.worldAlpha,r.setTransform(n.a*i,n.b*i,n.c*i,n.d*i,n.tx*i,n.ty*i),t.setBlendMode(this.blendMode),r.fillStyle=this._canvasPattern,r.scale(this.tileScale.x/s,this.tileScale.y/s);var c=this.anchor.x*-this._width,d=this.anchor.y*-this._height;this.uvRespectAnchor?(r.translate(a,u),r.fillRect(-a+c,-u+d,this._width/this.tileScale.x*s,this._height/this.tileScale.y*s)):(r.translate(a+c,u+d),r.fillRect(-a,-u,this._width/this.tileScale.x*s,this._height/this.tileScale.y*s));}},e.prototype._calculateBounds=function(){var t=this._width*-this._anchor._x,e=this._height*-this._anchor._y,r=this._width*(1-this._anchor._x),n=this._height*(1-this._anchor._y);this._bounds.addFrame(this.transform,t,e,r,n);},e.prototype.getLocalBounds=function(e){return 0===this.children.length?(this._bounds.minX=this._width*-this._anchor._x,this._bounds.minY=this._height*-this._anchor._y,this._bounds.maxX=this._width*(1-this._anchor._x),this._bounds.maxY=this._height*(1-this._anchor._x),e||(this._localBoundsRect||(this._localBoundsRect=new l.Rectangle),e=this._localBoundsRect),this._bounds.getRectangle(e)):t.prototype.getLocalBounds.call(this,e)},e.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,v);var e=this._width,r=this._height,n=-e*this.anchor._x;if(v.x>n&&v.x<n+e){var i=-r*this.anchor._y;if(v.y>i&&v.y<i+r){ return!0 }}return!1},e.prototype.destroy=function(){t.prototype.destroy.call(this),this.tileTransform=null,this.uvTransform=null;},e.from=function(t,r,n){return new e(l.Texture.from(t),r,n)},e.fromFrame=function(t,r,n){var i=l.utils.TextureCache[t];if(!i){ throw new Error('The frameId "'+t+'" does not exist in the texture cache '+this); }return new e(i,r,n)},e.fromImage=function(t,r,n,i,o){return new e(l.Texture.fromImage(t,i,o),r,n)},u(e,[{key:"clampMargin",get:function(){return this.uvTransform.clampMargin},set:function(t){this.uvTransform.clampMargin=t,this.uvTransform.update(!0);}},{key:"tileScale",get:function(){return this.tileTransform.scale},set:function(t){this.tileTransform.scale.copy(t);}},{key:"tilePosition",get:function(){return this.tileTransform.position},set:function(t){this.tileTransform.position.copy(t);}},{key:"width",get:function(){return this._width},set:function(t){this._width=t;}},{key:"height",get:function(){return this._height},set:function(t){this._height=t;}}]),e}(l.Sprite);r.default=y;},{"../core":64,"../core/sprites/canvas/CanvasTinter":103,"./TextureTransform":132}],134:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}var o=t("../core"),s=n(o),a=s.DisplayObject,u=new s.Matrix;a.prototype._cacheAsBitmap=!1,a.prototype._cacheData=!1;var h=function t(){i(this,t),this.originalRenderWebGL=null,this.originalRenderCanvas=null,this.originalCalculateBounds=null,this.originalGetLocalBounds=null,this.originalUpdateTransform=null,this.originalHitTest=null,this.originalDestroy=null,this.originalMask=null,this.originalFilterArea=null,this.sprite=null;};Object.defineProperties(a.prototype,{cacheAsBitmap:{get:function(){return this._cacheAsBitmap},set:function(t){if(this._cacheAsBitmap!==t){this._cacheAsBitmap=t;var e=void 0;t?(this._cacheData||(this._cacheData=new h),e=this._cacheData,e.originalRenderWebGL=this.renderWebGL,e.originalRenderCanvas=this.renderCanvas,e.originalUpdateTransform=this.updateTransform,e.originalCalculateBounds=this._calculateBounds,e.originalGetLocalBounds=this.getLocalBounds,e.originalDestroy=this.destroy,e.originalContainsPoint=this.containsPoint,e.originalMask=this._mask,e.originalFilterArea=this.filterArea,this.renderWebGL=this._renderCachedWebGL,this.renderCanvas=this._renderCachedCanvas,this.destroy=this._cacheAsBitmapDestroy):(e=this._cacheData,e.sprite&&this._destroyCachedDisplayObject(),this.renderWebGL=e.originalRenderWebGL,this.renderCanvas=e.originalRenderCanvas,this._calculateBounds=e.originalCalculateBounds,this.getLocalBounds=e.originalGetLocalBounds,this.destroy=e.originalDestroy,this.updateTransform=e.originalUpdateTransform,this.containsPoint=e.originalContainsPoint,this._mask=e.originalMask,this.filterArea=e.originalFilterArea);}}}}),a.prototype._renderCachedWebGL=function(t){!this.visible||this.worldAlpha<=0||!this.renderable||(this._initCachedDisplayObject(t),this._cacheData.sprite._transformID=-1,this._cacheData.sprite.worldAlpha=this.worldAlpha,this._cacheData.sprite._renderWebGL(t));},a.prototype._initCachedDisplayObject=function(t){if(!this._cacheData||!this._cacheData.sprite){var e=this.alpha;this.alpha=1,t.currentRenderer.flush();var r=this.getLocalBounds().clone();if(this._filters){var n=this._filters[0].padding;r.pad(n);}var i=t._activeRenderTarget,o=t.filterManager.filterStack,a=s.RenderTexture.create(0|r.width,0|r.height),h=u;h.tx=-r.x,h.ty=-r.y,this.transform.worldTransform.identity(),this.renderWebGL=this._cacheData.originalRenderWebGL,t.render(this,a,!0,h,!0),t.bindRenderTarget(i),t.filterManager.filterStack=o,this.renderWebGL=this._renderCachedWebGL,this.updateTransform=this.displayObjectUpdateTransform,this._mask=null,this.filterArea=null;var l=new s.Sprite(a);l.transform.worldTransform=this.transform.worldTransform,l.anchor.x=-(r.x/r.width),l.anchor.y=-(r.y/r.height),l.alpha=e,l._bounds=this._bounds,this._calculateBounds=this._calculateCachedBounds,this.getLocalBounds=this._getCachedLocalBounds,this._cacheData.sprite=l,this.transform._parentID=-1,this.updateTransform(),this.containsPoint=l.containsPoint.bind(l);}},a.prototype._renderCachedCanvas=function(t){!this.visible||this.worldAlpha<=0||!this.renderable||(this._initCachedDisplayObjectCanvas(t),this._cacheData.sprite.worldAlpha=this.worldAlpha,this._cacheData.sprite.renderCanvas(t));},a.prototype._initCachedDisplayObjectCanvas=function(t){if(!this._cacheData||!this._cacheData.sprite){var e=this.getLocalBounds(),r=this.alpha;this.alpha=1;var n=t.context,i=s.RenderTexture.create(0|e.width,0|e.height),o=u;this.transform.localTransform.copy(o),o.invert(),o.tx-=e.x,o.ty-=e.y,this.renderCanvas=this._cacheData.originalRenderCanvas,t.render(this,i,!0,o,!1),t.context=n,this.renderCanvas=this._renderCachedCanvas,this._calculateBounds=this._calculateCachedBounds,this._mask=null,this.filterArea=null;var a=new s.Sprite(i);a.transform.worldTransform=this.transform.worldTransform,a.anchor.x=-(e.x/e.width),a.anchor.y=-(e.y/e.height),a._bounds=this._bounds,a.alpha=r,this.updateTransform(),this.updateTransform=this.displayObjectUpdateTransform,this._cacheData.sprite=a,this.containsPoint=a.containsPoint.bind(a);}},a.prototype._calculateCachedBounds=function(){this._cacheData.sprite._calculateBounds();},a.prototype._getCachedLocalBounds=function(){return this._cacheData.sprite.getLocalBounds()},a.prototype._destroyCachedDisplayObject=function(){this._cacheData.sprite._texture.destroy(!0),this._cacheData.sprite=null;},a.prototype._cacheAsBitmapDestroy=function(){this.cacheAsBitmap=!1,this.destroy();};},{"../core":64}],135:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}var i=t("../core"),o=n(i);o.DisplayObject.prototype.name=null,o.Container.prototype.getChildByName=function(t){
var this$1 = this;
for(var e=0;e<this.children.length;e++){ if(this$1.children[e].name===t){ return this$1.children[e]; } }return null};},{"../core":64}],136:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}var i=t("../core"),o=n(i);o.DisplayObject.prototype.getGlobalPosition=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:new o.Point,e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return this.parent?this.parent.toGlobal(this.position,t,e):(t.x=this.position.x,t.y=this.position.y),t};},{"../core":64}],137:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0,r.BitmapText=r.TilingSpriteRenderer=r.TilingSprite=r.AnimatedSprite=r.TextureTransform=void 0;var i=t("./TextureTransform");Object.defineProperty(r,"TextureTransform",{enumerable:!0,get:function(){return n(i).default}});var o=t("./AnimatedSprite");Object.defineProperty(r,"AnimatedSprite",{enumerable:!0,get:function(){return n(o).default}});var s=t("./TilingSprite");Object.defineProperty(r,"TilingSprite",{enumerable:!0,get:function(){return n(s).default}});var a=t("./webgl/TilingSpriteRenderer");Object.defineProperty(r,"TilingSpriteRenderer",{enumerable:!0,get:function(){return n(a).default}});var u=t("./BitmapText");Object.defineProperty(r,"BitmapText",{enumerable:!0,get:function(){return n(u).default}}),t("./cacheAsBitmap"),t("./getChildByName"),t("./getGlobalPosition");},{"./AnimatedSprite":130,"./BitmapText":131,"./TextureTransform":132,"./TilingSprite":133,"./cacheAsBitmap":134,"./getChildByName":135,"./getGlobalPosition":136,"./webgl/TilingSpriteRenderer":138}],138:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../core"),u=n(a),h=t("../../core/const"),l=(t("path"),new u.Matrix),c=new Float32Array(4),f=function(t){function e(r){i(this,e);var n=o(this,t.call(this,r));return n.shader=null,n.simpleShader=null,n.quad=null,n}return s(e,t),e.prototype.onContextChange=function(){var t=this.renderer.gl;this.shader=new u.Shader(t,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform mat3 uTransform;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = (uTransform * vec3(aTextureCoord, 1.0)).xy;\n}\n","varying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform vec4 uColor;\nuniform mat3 uMapCoord;\nuniform vec4 uClampFrame;\nuniform vec2 uClampOffset;\n\nvoid main(void)\n{\n    vec2 coord = mod(vTextureCoord - uClampOffset, vec2(1.0, 1.0)) + uClampOffset;\n    coord = (uMapCoord * vec3(coord, 1.0)).xy;\n    coord = clamp(coord, uClampFrame.xy, uClampFrame.zw);\n\n    vec4 sample = texture2D(uSampler, coord);\n    vec4 color = vec4(uColor.rgb * uColor.a, uColor.a);\n\n    gl_FragColor = sample * color ;\n}\n"),this.simpleShader=new u.Shader(t,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform mat3 uTransform;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = (uTransform * vec3(aTextureCoord, 1.0)).xy;\n}\n","varying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform vec4 uColor;\n\nvoid main(void)\n{\n    vec4 sample = texture2D(uSampler, vTextureCoord);\n    vec4 color = vec4(uColor.rgb * uColor.a, uColor.a);\n    gl_FragColor = sample * color;\n}\n"),this.renderer.bindVao(null),this.quad=new u.Quad(t,this.renderer.state.attribState),this.quad.initVao(this.shader);},e.prototype.render=function(t){var e=this.renderer,r=this.quad;e.bindVao(r.vao);var n=r.vertices;n[0]=n[6]=t._width*-t.anchor.x,n[1]=n[3]=t._height*-t.anchor.y,n[2]=n[4]=t._width*(1-t.anchor.x),n[5]=n[7]=t._height*(1-t.anchor.y),t.uvRespectAnchor&&(n=r.uvs,n[0]=n[6]=-t.anchor.x,n[1]=n[3]=-t.anchor.y,n[2]=n[4]=1-t.anchor.x,n[5]=n[7]=1-t.anchor.y),r.upload();var i=t._texture,o=i.baseTexture,s=t.tileTransform.localTransform,a=t.uvTransform,f=o.isPowerOfTwo&&i.frame.width===o.width&&i.frame.height===o.height;f&&(o._glTextures[e.CONTEXT_UID]?f=o.wrapMode!==h.WRAP_MODES.CLAMP:o.wrapMode===h.WRAP_MODES.CLAMP&&(o.wrapMode=h.WRAP_MODES.REPEAT));var d=f?this.simpleShader:this.shader;e.bindShader(d);var p=i.width,v=i.height,y=t._width,g=t._height;l.set(s.a*p/y,s.b*p/g,s.c*v/y,s.d*v/g,s.tx/y,s.ty/g),l.invert(),f?l.append(a.mapCoord):(d.uniforms.uMapCoord=a.mapCoord.toArray(!0),d.uniforms.uClampFrame=a.uClampFrame,d.uniforms.uClampOffset=a.uClampOffset),d.uniforms.uTransform=l.toArray(!0);var m=c;u.utils.hex2rgb(t.tint,m),m[3]=t.worldAlpha,d.uniforms.uColor=m,d.uniforms.translationMatrix=t.transform.worldTransform.toArray(!0),d.uniforms.uSampler=e.bindTexture(i),e.setBlendMode(t.blendMode),r.vao.draw(this.renderer.gl.TRIANGLES,6,0);},e}(u.ObjectRenderer);r.default=f,u.WebGLRenderer.registerPlugin("tilingSprite",f);},{"../../core":64,"../../core/const":45,path:23}],139:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("../../core"),l=i(h),c=t("./BlurXFilter"),f=n(c),d=t("./BlurYFilter"),p=n(d),v=function(t){function e(r,n,i,a){o(this,e);var u=s(this,t.call(this));return u.blurXFilter=new f.default(r,n,i,a),u.blurYFilter=new p.default(r,n,i,a),u.padding=0,u.resolution=i||l.settings.RESOLUTION,u.quality=n||4,u.blur=r||8,u}return a(e,t),e.prototype.apply=function(t,e,r){var n=t.getRenderTarget(!0);this.blurXFilter.apply(t,e,n,!0),this.blurYFilter.apply(t,n,r,!1),t.returnRenderTarget(n);},u(e,[{key:"blur",get:function(){return this.blurXFilter.blur},set:function(t){this.blurXFilter.blur=this.blurYFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurXFilter.strength),Math.abs(this.blurYFilter.strength));}},{key:"quality",get:function(){return this.blurXFilter.quality},set:function(t){this.blurXFilter.quality=this.blurYFilter.quality=t;}},{key:"blurX",get:function(){return this.blurXFilter.blur},set:function(t){this.blurXFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurXFilter.strength),Math.abs(this.blurYFilter.strength));}},{key:"blurY",get:function(){return this.blurYFilter.blur},set:function(t){this.blurYFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurXFilter.strength),Math.abs(this.blurYFilter.strength));}}]),e}(l.Filter);r.default=v;},{"../../core":64,"./BlurXFilter":140,"./BlurYFilter":141}],140:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("../../core"),l=i(h),c=t("./generateBlurVertSource"),f=n(c),d=t("./generateBlurFragSource"),p=n(d),v=t("./getMaxBlurKernelSize"),y=n(v),g=function(t){function e(r,n,i,a){o(this,e),a=a||5;var u=(0,f.default)(a,!0),h=(0,p.default)(a),c=s(this,t.call(this,u,h));return c.resolution=i||l.settings.RESOLUTION,c._quality=0,c.quality=n||4,c.strength=r||8,c.firstRun=!0,c}return a(e,t),e.prototype.apply=function(t,e,r,n){
var this$1 = this;
if(this.firstRun){var i=t.renderer.gl,o=(0,y.default)(i);this.vertexSrc=(0,f.default)(o,!0),this.fragmentSrc=(0,p.default)(o),this.firstRun=!1;}if(this.uniforms.strength=1/r.size.width*(r.size.width/e.size.width),this.uniforms.strength*=this.strength,this.uniforms.strength/=this.passes,1===this.passes){ t.applyFilter(this,e,r,n); }else{for(var s=t.getRenderTarget(!0),a=e,u=s,h=0;h<this.passes-1;h++){t.applyFilter(this$1,a,u,!0);var l=u;u=a,a=l;}t.applyFilter(this,a,r,n),t.returnRenderTarget(s);}},u(e,[{key:"blur",get:function(){return this.strength},set:function(t){this.padding=2*Math.abs(t),this.strength=t;}},{key:"quality",get:function(){return this._quality},set:function(t){this._quality=t,this.passes=t;}}]),e}(l.Filter);r.default=g;},{"../../core":64,"./generateBlurFragSource":142,"./generateBlurVertSource":143,"./getMaxBlurKernelSize":144}],141:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),h=t("../../core"),l=i(h),c=t("./generateBlurVertSource"),f=n(c),d=t("./generateBlurFragSource"),p=n(d),v=t("./getMaxBlurKernelSize"),y=n(v),g=function(t){function e(r,n,i,a){o(this,e),a=a||5;var u=(0,f.default)(a,!1),h=(0,p.default)(a),c=s(this,t.call(this,u,h));return c.resolution=i||l.settings.RESOLUTION,c._quality=0,c.quality=n||4,c.strength=r||8,c.firstRun=!0,c}return a(e,t),e.prototype.apply=function(t,e,r,n){
var this$1 = this;
if(this.firstRun){var i=t.renderer.gl,o=(0,y.default)(i);this.vertexSrc=(0,f.default)(o,!1),this.fragmentSrc=(0,p.default)(o),this.firstRun=!1;}if(this.uniforms.strength=1/r.size.height*(r.size.height/e.size.height),this.uniforms.strength*=this.strength,this.uniforms.strength/=this.passes,1===this.passes){ t.applyFilter(this,e,r,n); }else{for(var s=t.getRenderTarget(!0),a=e,u=s,h=0;h<this.passes-1;h++){t.applyFilter(this$1,a,u,!0);var l=u;u=a,a=l;}t.applyFilter(this,a,r,n),t.returnRenderTarget(s);}},u(e,[{key:"blur",get:function(){return this.strength},set:function(t){this.padding=2*Math.abs(t),this.strength=t;}},{key:"quality",get:function(){return this._quality},set:function(t){this._quality=t,this.passes=t;}}]),e}(l.Filter);r.default=g;},{"../../core":64,"./generateBlurFragSource":142,"./generateBlurVertSource":143,"./getMaxBlurKernelSize":144}],142:[function(t,e,r){"use strict";function n(t){for(var e=i[t],r=e.length,n=o,s="",a="gl_FragColor += texture2D(uSampler, vBlurTexCoords[%index%]) * %value%;",u=void 0,h=0;h<t;h++){var l=a.replace("%index%",h);u=h,h>=r&&(u=t-h-1),l=l.replace("%value%",e[u]),s+=l,s+="\n";}return n=n.replace("%blur%",s),n=n.replace("%size%",t)}r.__esModule=!0,r.default=n;var i={5:[.153388,.221461,.250301],7:[.071303,.131514,.189879,.214607],9:[.028532,.067234,.124009,.179044,.20236],11:[.0093,.028002,.065984,.121703,.175713,.198596],13:[.002406,.009255,.027867,.065666,.121117,.174868,.197641],15:[489e-6,.002403,.009246,.02784,.065602,.120999,.174697,.197448]},o=["varying vec2 vBlurTexCoords[%size%];","uniform sampler2D uSampler;","void main(void)","{","    gl_FragColor = vec4(0.0);","    %blur%","}"].join("\n");},{}],143:[function(t,e,r){"use strict";function n(t,e){var r=Math.ceil(t/2),n=i,o="",s=void 0;s=e?"vBlurTexCoords[%index%] = aTextureCoord + vec2(%sampleIndex% * strength, 0.0);":"vBlurTexCoords[%index%] = aTextureCoord + vec2(0.0, %sampleIndex% * strength);";for(var a=0;a<t;a++){var u=s.replace("%index%",a);u=u.replace("%sampleIndex%",a-(r-1)+".0"),o+=u,o+="\n";}return n=n.replace("%blur%",o),n=n.replace("%size%",t)}r.__esModule=!0,r.default=n;var i=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform float strength;","uniform mat3 projectionMatrix;","varying vec2 vBlurTexCoords[%size%];","void main(void)","{","gl_Position = vec4((projectionMatrix * vec3((aVertexPosition), 1.0)).xy, 0.0, 1.0);","%blur%","}"].join("\n");},{}],144:[function(t,e,r){"use strict";function n(t){for(var e=t.getParameter(t.MAX_VARYING_VECTORS),r=15;r>e;){ r-=2; }return r}r.__esModule=!0,r.default=n;},{}],145:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){
function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../../core"),h=n(u),l=(t("path"),function(t){function e(){i(this,e);var r=o(this,t.call(this,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","varying vec2 vTextureCoord;\nuniform sampler2D uSampler;\nuniform float m[20];\n\nvoid main(void)\n{\n    vec4 c = texture2D(uSampler, vTextureCoord);\n    // Un-premultiply alpha before applying the color matrix. See issue #3539.\n    if (c.a > 0.0) {\n      c.rgb /= c.a;\n    }\n    vec4 result;\n    result.r = (m[0] * c.r);\n        result.r += (m[1] * c.g);\n        result.r += (m[2] * c.b);\n        result.r += (m[3] * c.a);\n        result.r += m[4];\n\n    result.g = (m[5] * c.r);\n        result.g += (m[6] * c.g);\n        result.g += (m[7] * c.b);\n        result.g += (m[8] * c.a);\n        result.g += m[9];\n\n    result.b = (m[10] * c.r);\n       result.b += (m[11] * c.g);\n       result.b += (m[12] * c.b);\n       result.b += (m[13] * c.a);\n       result.b += m[14];\n\n    result.a = (m[15] * c.r);\n       result.a += (m[16] * c.g);\n       result.a += (m[17] * c.b);\n       result.a += (m[18] * c.a);\n       result.a += m[19];\n\n    // Premultiply alpha again.\n    result.rgb *= result.a;\n\n    gl_FragColor = result;\n}\n"));return r.uniforms.m=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],r}return s(e,t),e.prototype._loadMatrix=function(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],r=t;e&&(this._multiply(r,this.uniforms.m,t),r=this._colorMatrix(r)),this.uniforms.m=r;},e.prototype._multiply=function(t,e,r){return t[0]=e[0]*r[0]+e[1]*r[5]+e[2]*r[10]+e[3]*r[15],t[1]=e[0]*r[1]+e[1]*r[6]+e[2]*r[11]+e[3]*r[16],t[2]=e[0]*r[2]+e[1]*r[7]+e[2]*r[12]+e[3]*r[17],t[3]=e[0]*r[3]+e[1]*r[8]+e[2]*r[13]+e[3]*r[18],t[4]=e[0]*r[4]+e[1]*r[9]+e[2]*r[14]+e[3]*r[19]+e[4],t[5]=e[5]*r[0]+e[6]*r[5]+e[7]*r[10]+e[8]*r[15],t[6]=e[5]*r[1]+e[6]*r[6]+e[7]*r[11]+e[8]*r[16],t[7]=e[5]*r[2]+e[6]*r[7]+e[7]*r[12]+e[8]*r[17],t[8]=e[5]*r[3]+e[6]*r[8]+e[7]*r[13]+e[8]*r[18],t[9]=e[5]*r[4]+e[6]*r[9]+e[7]*r[14]+e[8]*r[19]+e[9],t[10]=e[10]*r[0]+e[11]*r[5]+e[12]*r[10]+e[13]*r[15],t[11]=e[10]*r[1]+e[11]*r[6]+e[12]*r[11]+e[13]*r[16],t[12]=e[10]*r[2]+e[11]*r[7]+e[12]*r[12]+e[13]*r[17],t[13]=e[10]*r[3]+e[11]*r[8]+e[12]*r[13]+e[13]*r[18],t[14]=e[10]*r[4]+e[11]*r[9]+e[12]*r[14]+e[13]*r[19]+e[14],t[15]=e[15]*r[0]+e[16]*r[5]+e[17]*r[10]+e[18]*r[15],t[16]=e[15]*r[1]+e[16]*r[6]+e[17]*r[11]+e[18]*r[16],t[17]=e[15]*r[2]+e[16]*r[7]+e[17]*r[12]+e[18]*r[17],t[18]=e[15]*r[3]+e[16]*r[8]+e[17]*r[13]+e[18]*r[18],t[19]=e[15]*r[4]+e[16]*r[9]+e[17]*r[14]+e[18]*r[19]+e[19],t},e.prototype._colorMatrix=function(t){var e=new Float32Array(t);return e[4]/=255,e[9]/=255,e[14]/=255,e[19]/=255,e},e.prototype.brightness=function(t,e){var r=[t,0,0,0,0,0,t,0,0,0,0,0,t,0,0,0,0,0,1,0];this._loadMatrix(r,e);},e.prototype.greyscale=function(t,e){var r=[t,t,t,0,0,t,t,t,0,0,t,t,t,0,0,0,0,0,1,0];this._loadMatrix(r,e);},e.prototype.blackAndWhite=function(t){var e=[.3,.6,.1,0,0,.3,.6,.1,0,0,.3,.6,.1,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.hue=function(t,e){t=(t||0)/180*Math.PI;var r=Math.cos(t),n=Math.sin(t),i=Math.sqrt,o=1/3,s=i(o),a=r+(1-r)*o,u=o*(1-r)-s*n,h=o*(1-r)+s*n,l=o*(1-r)+s*n,c=r+o*(1-r),f=o*(1-r)-s*n,d=o*(1-r)-s*n,p=o*(1-r)+s*n,v=r+o*(1-r),y=[a,u,h,0,0,l,c,f,0,0,d,p,v,0,0,0,0,0,1,0];this._loadMatrix(y,e);},e.prototype.contrast=function(t,e){var r=(t||0)+1,n=-128*(r-1),i=[r,0,0,0,n,0,r,0,0,n,0,0,r,0,n,0,0,0,1,0];this._loadMatrix(i,e);},e.prototype.saturate=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,e=arguments[1],r=2*t/3+1,n=(r-1)*-.5,i=[r,n,n,0,0,n,r,n,0,0,n,n,r,0,0,0,0,0,1,0];this._loadMatrix(i,e);},e.prototype.desaturate=function(){this.saturate(-1);},e.prototype.negative=function(t){var e=[0,1,1,0,0,1,0,1,0,0,1,1,0,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.sepia=function(t){var e=[.393,.7689999,.18899999,0,0,.349,.6859999,.16799999,0,0,.272,.5339999,.13099999,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.technicolor=function(t){var e=[1.9125277891456083,-.8545344976951645,-.09155508482755585,0,11.793603434377337,-.3087833385928097,1.7658908555458428,-.10601743074722245,0,-70.35205161461398,-.231103377548616,-.7501899197440212,1.847597816108189,0,30.950940869491138,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.polaroid=function(t){var e=[1.438,-.062,-.062,0,0,-.122,1.378,-.122,0,0,-.016,-.016,1.483,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.toBGR=function(t){var e=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.kodachrome=function(t){var e=[1.1285582396593525,-.3967382283601348,-.03992559172921793,0,63.72958762196502,-.16404339962244616,1.0835251566291304,-.05498805115633132,0,24.732407896706203,-.16786010706155763,-.5603416277695248,1.6014850761964943,0,35.62982807460946,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.browni=function(t){var e=[.5997023498159715,.34553243048391263,-.2708298674538042,0,47.43192855600873,-.037703249837783157,.8609577587992641,.15059552388459913,0,-36.96841498319127,.24113635128153335,-.07441037908422492,.44972182064877153,0,-7.562075277591283,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.vintage=function(t){var e=[.6279345635605994,.3202183420819367,-.03965408211312453,0,9.651285835294123,.02578397704808868,.6441188644374771,.03259127616149294,0,7.462829176470591,.0466055556782719,-.0851232987247891,.5241648018700465,0,5.159190588235296,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.colorTone=function(t,e,r,n,i){t=t||.2,e=e||.15,r=r||16770432,n=n||3375104;var o=(r>>16&255)/255,s=(r>>8&255)/255,a=(255&r)/255,u=(n>>16&255)/255,h=(n>>8&255)/255,l=(255&n)/255,c=[.3,.59,.11,0,0,o,s,a,t,0,u,h,l,e,0,o-u,s-h,a-l,0,0];this._loadMatrix(c,i);},e.prototype.night=function(t,e){t=t||.1;var r=[t*-2,-t,0,0,0,-t,0,t,0,0,0,t,2*t,0,0,0,0,0,1,0];this._loadMatrix(r,e);},e.prototype.predator=function(t,e){var r=[11.224130630493164*t,-4.794486999511719*t,-2.8746118545532227*t,0*t,.40342438220977783*t,-3.6330697536468506*t,9.193157196044922*t,-2.951810836791992*t,0*t,-1.316135048866272*t,-3.2184197902679443*t,-4.2375030517578125*t,7.476448059082031*t,0*t,.8044459223747253*t,0,0,0,1,0];this._loadMatrix(r,e);},e.prototype.lsd=function(t){var e=[2,-.4,.5,0,0,-.5,2,-.4,0,0,-.4,-.5,3,0,0,0,0,0,1,0];this._loadMatrix(e,t);},e.prototype.reset=function(){var t=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0];this._loadMatrix(t,!1);},a(e,[{key:"matrix",get:function(){return this.uniforms.m},set:function(t){this.uniforms.m=t;}}]),e}(h.Filter));r.default=l,l.prototype.grayscale=l.prototype.greyscale;},{"../../core":64,path:23}],146:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../../core"),h=n(u),l=(t("path"),function(t){function e(r,n){i(this,e);var s=new h.Matrix;r.renderable=!1;var a=o(this,t.call(this,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 filterMatrix;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vFilterCoord;\n\nvoid main(void)\n{\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n   vTextureCoord = aTextureCoord;\n}","varying vec2 vFilterCoord;\nvarying vec2 vTextureCoord;\n\nuniform vec2 scale;\n\nuniform sampler2D uSampler;\nuniform sampler2D mapSampler;\n\nuniform vec4 filterClamp;\n\nvoid main(void)\n{\n   vec4 map =  texture2D(mapSampler, vFilterCoord);\n\n   map -= 0.5;\n   map.xy *= scale;\n\n   gl_FragColor = texture2D(uSampler, clamp(vec2(vTextureCoord.x + map.x, vTextureCoord.y + map.y), filterClamp.xy, filterClamp.zw));\n}\n"));return a.maskSprite=r,a.maskMatrix=s,a.uniforms.mapSampler=r.texture,a.uniforms.filterMatrix=s,a.uniforms.scale={x:1,y:1},null!==n&&void 0!==n||(n=20),a.scale=new h.Point(n,n),a}return s(e,t),e.prototype.apply=function(t,e,r){var n=1/r.destinationFrame.width*(r.size.width/e.size.width);this.uniforms.filterMatrix=t.calculateSpriteMatrix(this.maskMatrix,this.maskSprite),this.uniforms.scale.x=this.scale.x*n,this.uniforms.scale.y=this.scale.y*n,t.applyFilter(this,e,r);},a(e,[{key:"map",get:function(){return this.uniforms.mapSampler},set:function(t){this.uniforms.mapSampler=t;}}]),e}(h.Filter));r.default=l;},{"../../core":64,path:23}],147:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../core"),u=n(a),h=(t("path"),function(t){function e(){return i(this,e),o(this,t.call(this,"\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nuniform vec4 filterArea;\n\nvarying vec2 vTextureCoord;\n\nvec2 mapCoord( vec2 coord )\n{\n    coord *= filterArea.xy;\n    coord += filterArea.zw;\n\n    return coord;\n}\n\nvec2 unmapCoord( vec2 coord )\n{\n    coord -= filterArea.zw;\n    coord /= filterArea.xy;\n\n    return coord;\n}\n\nvoid texcoords(vec2 fragCoord, vec2 resolution,\n               out vec2 v_rgbNW, out vec2 v_rgbNE,\n               out vec2 v_rgbSW, out vec2 v_rgbSE,\n               out vec2 v_rgbM) {\n    vec2 inverseVP = 1.0 / resolution.xy;\n    v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n    v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n    v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n    v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n    v_rgbM = vec2(fragCoord * inverseVP);\n}\n\nvoid main(void) {\n\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n   vTextureCoord = aTextureCoord;\n\n   vec2 fragCoord = vTextureCoord * filterArea.xy;\n\n   texcoords(fragCoord, filterArea.xy, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n}",'varying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nvarying vec2 vTextureCoord;\nuniform sampler2D uSampler;\nuniform vec4 filterArea;\n\n/**\n Basic FXAA implementation based on the code on geeks3d.com with the\n modification that the texture2DLod stuff was removed since it\'s\n unsupported by WebGL.\n \n --\n \n From:\n https://github.com/mitsuhiko/webgl-meincraft\n \n Copyright (c) 2011 by Armin Ronacher.\n \n Some rights reserved.\n \n Redistribution and use in source and binary forms, with or without\n modification, are permitted provided that the following conditions are\n met:\n \n * Redistributions of source code must retain the above copyright\n notice, this list of conditions and the following disclaimer.\n \n * Redistributions in binary form must reproduce the above\n copyright notice, this list of conditions and the following\n disclaimer in the documentation and/or other materials provided\n with the distribution.\n \n * The names of the contributors may not be used to endorse or\n promote products derived from this software without specific\n prior written permission.\n \n THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#ifndef FXAA_REDUCE_MIN\n#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n#define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent\n//texture reads can be a bottleneck\nvec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,\n          vec2 v_rgbNW, vec2 v_rgbNE,\n          vec2 v_rgbSW, vec2 v_rgbSE,\n          vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n    \n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n                  dir * rcpDirMin)) * inverseVP;\n    \n    vec3 rgbA = 0.5 * (\n                       texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n                       texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n                                     texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n                                     texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n    \n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\nvoid main() {\n\n      vec2 fragCoord = vTextureCoord * filterArea.xy;\n\n      vec4 color;\n\n    color = fxaa(uSampler, fragCoord, filterArea.xy, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\n      gl_FragColor = color;\n}\n'))}return s(e,t),e}(u.Filter));r.default=h;},{"../../core":64,path:23}],148:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./fxaa/FXAAFilter");Object.defineProperty(r,"FXAAFilter",{enumerable:!0,get:function(){return n(i).default}});var o=t("./noise/NoiseFilter");Object.defineProperty(r,"NoiseFilter",{enumerable:!0,get:function(){return n(o).default}});var s=t("./displacement/DisplacementFilter");Object.defineProperty(r,"DisplacementFilter",{enumerable:!0,get:function(){return n(s).default}});var a=t("./blur/BlurFilter");Object.defineProperty(r,"BlurFilter",{enumerable:!0,get:function(){return n(a).default}});var u=t("./blur/BlurXFilter");Object.defineProperty(r,"BlurXFilter",{enumerable:!0,get:function(){return n(u).default}});var h=t("./blur/BlurYFilter");Object.defineProperty(r,"BlurYFilter",{enumerable:!0,get:function(){return n(h).default}});var l=t("./colormatrix/ColorMatrixFilter");Object.defineProperty(r,"ColorMatrixFilter",{enumerable:!0,get:function(){return n(l).default}});var c=t("./void/VoidFilter");Object.defineProperty(r,"VoidFilter",{enumerable:!0,get:function(){return n(c).default}});},{"./blur/BlurFilter":139,"./blur/BlurXFilter":140,"./blur/BlurYFilter":141,"./colormatrix/ColorMatrixFilter":145,"./displacement/DisplacementFilter":146,"./fxaa/FXAAFilter":147,"./noise/NoiseFilter":149,"./void/VoidFilter":150}],149:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../../core"),h=n(u),l=(t("path"),function(t){function e(){i(this,e);var r=o(this,t.call(this,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","precision highp float;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nuniform float noise;\nuniform sampler2D uSampler;\n\nfloat rand(vec2 co)\n{\n    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);\n}\n\nvoid main()\n{\n    vec4 color = texture2D(uSampler, vTextureCoord);\n\n    float diff = (rand(gl_FragCoord.xy) - 0.5) * noise;\n\n    color.r += diff;\n    color.g += diff;\n    color.b += diff;\n\n    gl_FragColor = color;\n}\n"));return r.noise=.5,r}return s(e,t),a(e,[{key:"noise",get:function(){return this.uniforms.noise},set:function(t){this.uniforms.noise=t;}}]),e}(h.Filter));r.default=l;},{"../../core":64,path:23}],150:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../core"),u=n(a),h=(t("path"),function(t){function e(){i(this,e);var r=o(this,t.call(this,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","varying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\n\nvoid main(void)\n{\n   gl_FragColor = texture2D(uSampler, vTextureCoord);\n}\n"));return r.glShaderKey="void",r}return s(e,t),e}(u.Filter));r.default=h;},{"../../core":64,path:23}],151:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("../core"),s=n(o),a=function(){function t(){i(this,t),this.global=new s.Point,this.target=null,this.originalEvent=null,this.identifier=null;}return t.prototype.getLocalPosition=function(t,e,r){return t.worldTransform.applyInverse(r||this.global,e)},t}();r.default=a;},{"../core":64}],152:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(){n(this,t),this.stopped=!1,this.target=null,this.currentTarget=null,this.type=null,this.data=null;}return t.prototype.stopPropagation=function(){this.stopped=!0;},t.prototype._reset=function(){this.stopped=!1,this.currentTarget=null,this.target=null;},t}();r.default=i;},{}],153:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},h=t("../core"),l=i(h),c=t("./InteractionData"),f=n(c),d=t("./InteractionEvent"),p=n(d),v=t("./InteractionTrackingData"),y=n(v),g=t("eventemitter3"),m=n(g),_=t("./interactiveTarget"),b=n(_);l.utils.mixins.delayMixin(l.DisplayObject.prototype,b.default);var x="MOUSE",T=function(t){function e(r,n){o(this,e);var i=s(this,t.call(this));return n=n||{},i.renderer=r,i.autoPreventDefault=void 0===n.autoPreventDefault||n.autoPreventDefault,i.interactionFrequency=n.interactionFrequency||10,i.mouse=new f.default,i.mouse.identifier=x,i.mouse.global.set(-999999),i.activeInteractionData={},i.activeInteractionData[x]=i.mouse,i.interactionDataPool=[],i.eventData=new p.default,i.interactionDOMElement=null,i.moveWhenInside=!1,i.eventsAdded=!1,i.mouseOverRenderer=!1,i.supportsTouchEvents="ontouchstart"in window,i.supportsPointerEvents=!!window.PointerEvent,i.onPointerUp=i.onPointerUp.bind(i),i.processPointerUp=i.processPointerUp.bind(i),i.onPointerCancel=i.onPointerCancel.bind(i),i.processPointerCancel=i.processPointerCancel.bind(i),i.onPointerDown=i.onPointerDown.bind(i),i.processPointerDown=i.processPointerDown.bind(i),i.onPointerMove=i.onPointerMove.bind(i),i.processPointerMove=i.processPointerMove.bind(i),i.onPointerOut=i.onPointerOut.bind(i),i.processPointerOverOut=i.processPointerOverOut.bind(i),i.onPointerOver=i.onPointerOver.bind(i),i.cursorStyles={default:"inherit",pointer:"pointer"},i.currentCursorMode=null,i.cursor=null,i._tempPoint=new l.Point,i.resolution=1,i.setTargetElement(i.renderer.view,i.renderer.resolution),i}return a(e,t),e.prototype.setTargetElement=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;this.removeEvents(),this.interactionDOMElement=t,this.resolution=e,this.addEvents();},e.prototype.addEvents=function(){this.interactionDOMElement&&(l.ticker.shared.add(this.update,this),window.navigator.msPointerEnabled?(this.interactionDOMElement.style["-ms-content-zooming"]="none",this.interactionDOMElement.style["-ms-touch-action"]="none"):this.supportsPointerEvents&&(this.interactionDOMElement.style["touch-action"]="none"),this.supportsPointerEvents?(window.document.addEventListener("pointermove",this.onPointerMove,!0),this.interactionDOMElement.addEventListener("pointerdown",this.onPointerDown,!0),this.interactionDOMElement.addEventListener("pointerleave",this.onPointerOut,!0),this.interactionDOMElement.addEventListener("pointerover",this.onPointerOver,!0),window.addEventListener("pointercancel",this.onPointerCancel,!0),window.addEventListener("pointerup",this.onPointerUp,!0)):(window.document.addEventListener("mousemove",this.onPointerMove,!0),this.interactionDOMElement.addEventListener("mousedown",this.onPointerDown,!0),this.interactionDOMElement.addEventListener("mouseout",this.onPointerOut,!0),this.interactionDOMElement.addEventListener("mouseover",this.onPointerOver,!0),window.addEventListener("mouseup",this.onPointerUp,!0),this.supportsTouchEvents&&(this.interactionDOMElement.addEventListener("touchstart",this.onPointerDown,!0),this.interactionDOMElement.addEventListener("touchcancel",this.onPointerCancel,!0),this.interactionDOMElement.addEventListener("touchend",this.onPointerUp,!0),this.interactionDOMElement.addEventListener("touchmove",this.onPointerMove,!0))),this.eventsAdded=!0);},e.prototype.removeEvents=function(){this.interactionDOMElement&&(l.ticker.shared.remove(this.update,this),window.navigator.msPointerEnabled?(this.interactionDOMElement.style["-ms-content-zooming"]="",this.interactionDOMElement.style["-ms-touch-action"]=""):this.supportsPointerEvents&&(this.interactionDOMElement.style["touch-action"]=""),this.supportsPointerEvents?(window.document.removeEventListener("pointermove",this.onPointerMove,!0),this.interactionDOMElement.removeEventListener("pointerdown",this.onPointerDown,!0),this.interactionDOMElement.removeEventListener("pointerleave",this.onPointerOut,!0),this.interactionDOMElement.removeEventListener("pointerover",this.onPointerOver,!0),window.removeEventListener("pointercancel",this.onPointerCancel,!0),window.removeEventListener("pointerup",this.onPointerUp,!0)):(window.document.removeEventListener("mousemove",this.onPointerMove,!0),this.interactionDOMElement.removeEventListener("mousedown",this.onPointerDown,!0),this.interactionDOMElement.removeEventListener("mouseout",this.onPointerOut,!0),this.interactionDOMElement.removeEventListener("mouseover",this.onPointerOver,!0),window.removeEventListener("mouseup",this.onPointerUp,!0),this.supportsTouchEvents&&(this.interactionDOMElement.removeEventListener("touchstart",this.onPointerDown,!0),this.interactionDOMElement.removeEventListener("touchcancel",this.onPointerCancel,!0),this.interactionDOMElement.removeEventListener("touchend",this.onPointerUp,!0),this.interactionDOMElement.removeEventListener("touchmove",this.onPointerMove,!0))),this.interactionDOMElement=null,this.eventsAdded=!1);},e.prototype.update=function(t){
var this$1 = this;
if(this._deltaTime+=t,!(this._deltaTime<this.interactionFrequency)&&(this._deltaTime=0,this.interactionDOMElement)){if(this.didMove){ return void(this.didMove=!1); }this.cursor=null;for(var e in this.activeInteractionData){ if(this$1.activeInteractionData.hasOwnProperty(e)){var r=this$1.activeInteractionData[e];if(r.originalEvent&&"touch"!==r.pointerType){var n=this$1.configureInteractionEventForDOMEvent(this$1.eventData,r.originalEvent,r);this$1.processInteractive(n,this$1.renderer._lastObjectRendered,this$1.processPointerOverOut,!0);}} }this.setCursorMode(this.cursor);}},e.prototype.setCursorMode=function(t){if(t=t||"default",this.currentCursorMode!==t){this.currentCursorMode=t;var e=this.cursorStyles[t];if(e){ switch("undefined"==typeof e?"undefined":u(e)){case"string":this.interactionDOMElement.style.cursor=e;break;case"function":e(t);break;case"object":Object.assign(this.interactionDOMElement.style,e);} }}},e.prototype.dispatchEvent=function(t,e,r){r.stopped||(r.currentTarget=t,r.type=e,t.emit(e,r),t[e]&&t[e](r));},e.prototype.mapPositionToPoint=function(t,e,r){var n=void 0;n=this.interactionDOMElement.parentElement?this.interactionDOMElement.getBoundingClientRect():{x:0,y:0,width:0,height:0};var i=navigator.isCocoonJS?this.resolution:1/this.resolution;t.x=(e-n.left)*(this.interactionDOMElement.width/n.width)*i,t.y=(r-n.top)*(this.interactionDOMElement.height/n.height)*i;},e.prototype.processInteractive=function(t,e,r,n,i){
var this$1 = this;
if(!e||!e.visible){ return!1; }var o=t.data.global;i=e.interactive||i;var s=!1,a=i;e.hitArea?a=!1:n&&e._mask&&(e._mask.containsPoint(o)||(n=!1));var u=n;if(e.interactiveChildren&&e.children){ for(var h=e.children,l=h.length-1;l>=0;l--){var c=h[l];if(this$1.processInteractive(t,c,r,n,a)){if(!c.parent){ continue; }s=!0,a=!1,u=!1,c.interactive&&(n=!1);}} }return n=u,i&&(n&&!s&&(e.hitArea?(e.worldTransform.applyInverse(o,this._tempPoint),s=e.hitArea.contains(this._tempPoint.x,this._tempPoint.y)):e.containsPoint&&(s=e.containsPoint(o))),e.interactive&&(s&&!t.target&&(t.target=e),r(t,e,s))),s},e.prototype.onPointerDown=function(t){
var this$1 = this;
var e=this.normalizeToPointerData(t);this.autoPreventDefault&&e[0].isNormalized&&t.preventDefault();for(var r=e.length,n=0;n<r;n++){var i=e[n],o=this$1.getInteractionDataForPointerId(i),s=this$1.configureInteractionEventForDOMEvent(this$1.eventData,i,o);if(s.data.originalEvent=t,this$1.processInteractive(s,this$1.renderer._lastObjectRendered,this$1.processPointerDown,!0),this$1.emit("pointerdown",s),"touch"===i.pointerType){ this$1.emit("touchstart",s); }else if("mouse"===i.pointerType){var a=2===i.button||3===i.which;this$1.emit(a?"rightdown":"mousedown",this$1.eventData);}}},e.prototype.processPointerDown=function(t,e,r){var n=t.data.originalEvent,i=t.data.identifier;if(r){ if(e.trackedPointers[i]||(e.trackedPointers[i]=new y.default(i)),this.dispatchEvent(e,"pointerdown",t),"touchstart"===n.type||"touch"===n.pointerType){ this.dispatchEvent(e,"touchstart",t); }else if("mousedown"===n.type||"mouse"===n.pointerType){var o=2===n.button||3===n.which;o?e.trackedPointers[i].rightDown=!0:e.trackedPointers[i].leftDown=!0,this.dispatchEvent(e,o?"rightdown":"mousedown",t);} }},e.prototype.onPointerComplete=function(t,e,r){
var this$1 = this;
for(var n=this.normalizeToPointerData(t),i=n.length,o=0;o<i;o++){var s=n[o],a=this$1.getInteractionDataForPointerId(s),u=this$1.configureInteractionEventForDOMEvent(this$1.eventData,s,a);if(u.data.originalEvent=t,this$1.processInteractive(u,this$1.renderer._lastObjectRendered,r,!0),this$1.emit(e?"pointercancel":"pointerup",u),"mouse"===s.pointerType){var h=2===s.button||3===s.which;this$1.emit(h?"rightup":"mouseup",u);}else{ "touch"===s.pointerType&&(this$1.emit(e?"touchcancel":"touchend",u),this$1.releaseInteractionDataForPointerId(s.pointerId,a)); }}},e.prototype.onPointerCancel=function(t){this.onPointerComplete(t,!0,this.processPointerCancel);},e.prototype.processPointerCancel=function(t,e){
var r=t.data.originalEvent,n=t.data.identifier;void 0!==e.trackedPointers[n]&&(delete e.trackedPointers[n],this.dispatchEvent(e,"pointercancel",t),"touchcancel"!==r.type&&"touch"!==r.pointerType||this.dispatchEvent(e,"touchcancel",t));},e.prototype.onPointerUp=function(t){this.onPointerComplete(t,!1,this.processPointerUp);},e.prototype.processPointerUp=function(t,e,r){var n=t.data.originalEvent,i=t.data.identifier,o=e.trackedPointers[i],s="touchend"===n.type||"touch"===n.pointerType,a=0===n.type.indexOf("mouse")||"mouse"===n.pointerType;if(a){var u=2===n.button||3===n.which,h=y.default.FLAGS,l=u?h.RIGHT_DOWN:h.LEFT_DOWN,c=void 0!==o&&o.flags&l;r?(this.dispatchEvent(e,u?"rightup":"mouseup",t),c&&this.dispatchEvent(e,u?"rightclick":"click",t)):c&&this.dispatchEvent(e,u?"rightupoutside":"mouseupoutside",t),o&&(u?o.rightDown=r:o.leftDown=r);}r?(this.dispatchEvent(e,"pointerup",t),s&&this.dispatchEvent(e,"touchend",t),o&&(this.dispatchEvent(e,"pointertap",t),s&&(this.dispatchEvent(e,"tap",t),o.over=!1))):o&&(this.dispatchEvent(e,"pointerupoutside",t),s&&this.dispatchEvent(e,"touchendoutside",t)),o&&o.none&&delete e.trackedPointers[i];},e.prototype.onPointerMove=function(t){
var this$1 = this;
var e=this.normalizeToPointerData(t);"mouse"===e[0].pointerType&&(this.didMove=!0,this.cursor=null);for(var r=e.length,n=0;n<r;n++){var i=e[n],o=this$1.getInteractionDataForPointerId(i),s=this$1.configureInteractionEventForDOMEvent(this$1.eventData,i,o);s.data.originalEvent=t;var a="touch"!==i.pointerType||this$1.moveWhenInside;this$1.processInteractive(s,this$1.renderer._lastObjectRendered,this$1.processPointerMove,a),this$1.emit("pointermove",s),"touch"===i.pointerType&&this$1.emit("touchmove",s),"mouse"===i.pointerType&&this$1.emit("mousemove",s);}"mouse"===e[0].pointerType&&this.setCursorMode(this.cursor);},e.prototype.processPointerMove=function(t,e,r){var n=t.data.originalEvent,i="touchmove"===n.type||"touch"===n.pointerType,o="mousemove"===n.type||"mouse"===n.pointerType;o&&this.processPointerOverOut(t,e,r),this.moveWhenInside&&!r||(this.dispatchEvent(e,"pointermove",t),i&&this.dispatchEvent(e,"touchmove",t),o&&this.dispatchEvent(e,"mousemove",t));},e.prototype.onPointerOut=function(t){var e=this.normalizeToPointerData(t),r=e[0];"mouse"===r.pointerType&&(this.mouseOverRenderer=!1,this.setCursorMode(null));var n=this.getInteractionDataForPointerId(r),i=this.configureInteractionEventForDOMEvent(this.eventData,r,n);i.data.originalEvent=r,this.processInteractive(i,this.renderer._lastObjectRendered,this.processPointerOverOut,!1),this.emit("pointerout",i),"mouse"===r.pointerType&&this.emit("mouseout",i);},e.prototype.processPointerOverOut=function(t,e,r){var n=t.data.originalEvent,i=t.data.identifier,o="mouseover"===n.type||"mouseout"===n.type||"mouse"===n.pointerType,s=e.trackedPointers[i];r&&!s&&(s=e.trackedPointers[i]=new y.default(i)),void 0!==s&&(r&&this.mouseOverRenderer?(s.over||(s.over=!0,this.dispatchEvent(e,"pointerover",t),o&&this.dispatchEvent(e,"mouseover",t)),o&&null===this.cursor&&(this.cursor=e.cursor)):s.over&&(s.over=!1,this.dispatchEvent(e,"pointerout",this.eventData),o&&this.dispatchEvent(e,"mouseout",t),s.none&&delete e.trackedPointers[i]));},e.prototype.onPointerOver=function(t){var e=this.normalizeToPointerData(t),r=e[0],n=this.getInteractionDataForPointerId(r),i=this.configureInteractionEventForDOMEvent(this.eventData,r,n);i.data.originalEvent=r,"mouse"===r.pointerType&&(this.mouseOverRenderer=!0),this.emit("pointerover",i),"mouse"===r.pointerType&&this.emit("mouseover",i);},e.prototype.getInteractionDataForPointerId=function(t){var e=t.pointerId;if(e===x||"mouse"===t.pointerType){ return this.mouse; }if(this.activeInteractionData[e]){ return this.activeInteractionData[e]; }var r=this.interactionDataPool.pop()||new f.default;return r.identifier=e,this.activeInteractionData[e]=r,r},e.prototype.releaseInteractionDataForPointerId=function(t){var e=this.activeInteractionData[t];e&&(delete this.activeInteractionData[t],this.interactionDataPool.push(e));},e.prototype.configureInteractionEventForDOMEvent=function(t,e,r){return t.data=r,this.mapPositionToPoint(r.global,e.clientX,e.clientY),navigator.isCocoonJS&&"touch"===e.pointerType&&(r.global.x=r.global.x/this.resolution,r.global.y=r.global.y/this.resolution),"touch"===e.pointerType&&(e.globalX=r.global.x,e.globalY=r.global.y),r.originalEvent=e,t._reset(),t},e.prototype.normalizeToPointerData=function(t){var e=[];if(this.supportsTouchEvents&&t instanceof TouchEvent){ for(var r=0,n=t.changedTouches.length;r<n;r++){var i=t.changedTouches[r];"undefined"==typeof i.button&&(i.button=t.touches.length?1:0),"undefined"==typeof i.buttons&&(i.buttons=t.touches.length?1:0),"undefined"==typeof i.isPrimary&&(i.isPrimary=1===t.touches.length),"undefined"==typeof i.width&&(i.width=i.radiusX||1),"undefined"==typeof i.height&&(i.height=i.radiusY||1),"undefined"==typeof i.tiltX&&(i.tiltX=0),"undefined"==typeof i.tiltY&&(i.tiltY=0),"undefined"==typeof i.pointerType&&(i.pointerType="touch"),"undefined"==typeof i.pointerId&&(i.pointerId=i.identifier||0),"undefined"==typeof i.pressure&&(i.pressure=i.force||.5),"undefined"==typeof i.rotation&&(i.rotation=i.rotationAngle||0),"undefined"==typeof i.layerX&&(i.layerX=i.offsetX=i.clientX),"undefined"==typeof i.layerY&&(i.layerY=i.offsetY=i.clientY),i.isNormalized=!0,e.push(i);} }else{ !(t instanceof MouseEvent)||this.supportsPointerEvents&&t instanceof window.PointerEvent?e.push(t):("undefined"==typeof t.isPrimary&&(t.isPrimary=!0),"undefined"==typeof t.width&&(t.width=1),"undefined"==typeof t.height&&(t.height=1),"undefined"==typeof t.tiltX&&(t.tiltX=0),"undefined"==typeof t.tiltY&&(t.tiltY=0),"undefined"==typeof t.pointerType&&(t.pointerType="mouse"),"undefined"==typeof t.pointerId&&(t.pointerId=x),"undefined"==typeof t.pressure&&(t.pressure=.5),"undefined"==typeof t.rotation&&(t.rotation=0),t.isNormalized=!0,e.push(t)); }return e},e.prototype.destroy=function(){this.removeEvents(),this.removeAllListeners(),this.renderer=null,this.mouse=null,this.eventData=null,this.interactionDOMElement=null,this.onPointerDown=null,this.processPointerDown=null,this.onPointerUp=null,this.processPointerUp=null,this.onPointerCancel=null,this.processPointerCancel=null,this.onPointerMove=null,this.processPointerMove=null,this.onPointerOut=null,this.processPointerOverOut=null,this.onPointerOver=null,this._tempPoint=null;},e}(m.default);r.default=T,l.WebGLRenderer.registerPlugin("interaction",T),l.CanvasRenderer.registerPlugin("interaction",T);},{"../core":64,"./InteractionData":151,"./InteractionEvent":152,"./InteractionTrackingData":154,"./interactiveTarget":156,eventemitter3:3}],154:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),o=function(){function t(e){n(this,t),this._pointerId=e,this._flags=t.FLAGS.NONE;}return t.prototype._doSet=function(t,e){e?this._flags=this._flags|t:this._flags=this._flags&~t;},i(t,[{key:"pointerId",get:function(){return this._pointerId}},{key:"flags",get:function(){return this._flags},set:function(t){this._flags=t;}},{key:"none",get:function(){return this._flags===this.constructor.FLAGS.NONE}},{key:"over",get:function(){return 0!==(this._flags&this.constructor.FLAGS.OVER)},set:function(t){this._doSet(this.constructor.FLAGS.OVER,t);}},{key:"rightDown",get:function(){return 0!==(this._flags&this.constructor.FLAGS.RIGHT_DOWN)},set:function(t){this._doSet(this.constructor.FLAGS.RIGHT_DOWN,t);}},{key:"leftDown",get:function(){return 0!==(this._flags&this.constructor.FLAGS.LEFT_DOWN)},set:function(t){this._doSet(this.constructor.FLAGS.LEFT_DOWN,t);}}]),t}();r.default=o,o.FLAGS=Object.freeze({NONE:0,OVER:1,LEFT_DOWN:2,RIGHT_DOWN:4});},{}],155:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./InteractionData");Object.defineProperty(r,"InteractionData",{enumerable:!0,get:function(){return n(i).default}});var o=t("./InteractionManager");Object.defineProperty(r,"InteractionManager",{enumerable:!0,get:function(){return n(o).default}});var s=t("./interactiveTarget");Object.defineProperty(r,"interactiveTarget",{enumerable:!0,get:function(){return n(s).default}});},{"./InteractionData":151,"./InteractionManager":153,"./interactiveTarget":156}],156:[function(t,e,r){"use strict";r.__esModule=!0,r.default={interactive:!1,interactiveChildren:!0,hitArea:null,get buttonMode(){return"pointer"===this.cursor},set buttonMode(t){t?this.cursor="pointer":"pointer"===this.cursor&&(this.cursor=null);},cursor:null,get trackedPointers(){return void 0===this._trackedPointers&&(this._trackedPointers={}),this._trackedPointers},_trackedPointers:void 0};},{}],157:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){t.bitmapFont=h.BitmapText.registerFont(t.data,e);}r.__esModule=!0,r.parse=i,r.default=function(){return function(t,e){if(!t.data||t.type!==u.Resource.TYPE.XML){ return void e(); }if(0===t.data.getElementsByTagName("page").length||0===t.data.getElementsByTagName("info").length||null===t.data.getElementsByTagName("info")[0].getAttribute("face")){ return void e(); }var r=t.isDataUrl?"":s.dirname(t.url);t.isDataUrl&&("."===r&&(r=""),this.baseUrl&&r&&("/"===this.baseUrl.charAt(this.baseUrl.length-1)&&(r+="/"),r=r.replace(this.baseUrl,""))),r&&"/"!==r.charAt(r.length-1)&&(r+="/");var n=r+t.data.getElementsByTagName("page")[0].getAttribute("file");if(a.utils.TextureCache[n]){ i(t,a.utils.TextureCache[n]),e(); }else{var o={crossOrigin:t.crossOrigin,loadType:u.Resource.LOAD_TYPE.IMAGE,metadata:t.metadata.imageMetadata,parentResource:t};this.add(t.name+"_image",n,o,function(r){i(t,r.texture),e();});}}};var o=t("path"),s=n(o),a=t("../core"),u=t("resource-loader"),h=t("../extras");},{"../core":64,"../extras":137,path:23,"resource-loader":35}],158:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./loader");Object.defineProperty(r,"Loader",{enumerable:!0,get:function(){return n(i).default}});var o=t("./bitmapFontParser");Object.defineProperty(r,"bitmapFontParser",{enumerable:!0,get:function(){return n(o).default}}),Object.defineProperty(r,"parseBitmapFontData",{enumerable:!0,get:function(){return o.parse}});var s=t("./spritesheetParser");Object.defineProperty(r,"spritesheetParser",{enumerable:!0,get:function(){return n(s).default}});var a=t("./textureParser");Object.defineProperty(r,"textureParser",{enumerable:!0,get:function(){return n(a).default}});var u=t("resource-loader");Object.defineProperty(r,"Resource",{enumerable:!0,get:function(){return u.Resource}});},{"./bitmapFontParser":157,"./loader":159,"./spritesheetParser":160,"./textureParser":161,"resource-loader":35}],159:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("resource-loader"),u=n(a),h=t("resource-loader/lib/middlewares/parsing/blob"),l=t("eventemitter3"),c=n(l),f=t("./textureParser"),d=n(f),p=t("./spritesheetParser"),v=n(p),y=t("./bitmapFontParser"),g=n(y),m=function(t){function e(r,n){i(this,e);var s=o(this,t.call(this,r,n));c.default.call(s);for(var a=0;a<e._pixiMiddleware.length;++a){ s.use(e._pixiMiddleware[a]()); }return s.onStart.add(function(t){return s.emit("start",t)}),s.onProgress.add(function(t,e){return s.emit("progress",t,e)}),s.onError.add(function(t,e,r){return s.emit("error",t,e,r)}),s.onLoad.add(function(t,e){return s.emit("load",t,e)}),s.onComplete.add(function(t,e){return s.emit("complete",t,e)}),s}return s(e,t),e.addPixiMiddleware=function(t){e._pixiMiddleware.push(t);},e}(u.default);r.default=m;for(var _ in c.default.prototype){ m.prototype[_]=c.default.prototype[_]; }m._pixiMiddleware=[h.blobMiddlewareFactory,d.default,v.default,g.default];var b=u.default.Resource;b.setExtensionXhrType("fnt",b.XHR_RESPONSE_TYPE.DOCUMENT);},{"./bitmapFontParser":157,"./spritesheetParser":160,"./textureParser":161,eventemitter3:3,"resource-loader":35,"resource-loader/lib/middlewares/parsing/blob":36}],160:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0,r.default=function(){return function(t,e){var r=void 0,n=t.name+"_image";if(!t.data||t.type!==i.Resource.TYPE.JSON||!t.data.frames||this.resources[n]){ return void e(); }var o={crossOrigin:t.crossOrigin,loadType:i.Resource.LOAD_TYPE.IMAGE,metadata:t.metadata.imageMetadata,parentResource:t};r=t.isDataUrl?t.data.meta.image:s.default.dirname(t.url.replace(this.baseUrl,""))+"/"+t.data.meta.image,this.add(n,r,o,function(r){var n=new a.Spritesheet(r.texture.baseTexture,t.data,t.url);n.parse(function(){t.spritesheet=n,t.textures=n.textures,e();});});}};var i=t("resource-loader"),o=t("path"),s=n(o),a=t("../core");},{"../core":64,path:23,"resource-loader":35}],161:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0,r.default=function(){return function(t,e){t.data&&t.type===i.Resource.TYPE.IMAGE&&(t.texture=s.default.fromLoader(t.data,t.url,t.name)),e();}};var i=t("resource-loader"),o=t("../core/textures/Texture"),s=n(o);},{"../core/textures/Texture":113,"resource-loader":35}],162:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("../core"),h=n(u),l=new h.Point,c=new h.Polygon,f=function(t){function e(r,n,s,a,u){i(this,e);var l=o(this,t.call(this));return l._texture=null,l.uvs=s||new Float32Array([0,0,1,0,1,1,0,1]),l.vertices=n||new Float32Array([0,0,100,0,100,100,0,100]),l.indices=a||new Uint16Array([0,1,3,2]),l.dirty=0,l.indexDirty=0,l.blendMode=h.BLEND_MODES.NORMAL,l.canvasPadding=0,l.drawMode=u||e.DRAW_MODES.TRIANGLE_MESH,l.texture=r,l.shader=null,l.tintRgb=new Float32Array([1,1,1]),l._glDatas={},l.pluginName="mesh",l}return s(e,t),e.prototype._renderWebGL=function(t){t.setObjectRenderer(t.plugins[this.pluginName]),t.plugins[this.pluginName].render(this);},e.prototype._renderCanvas=function(t){t.plugins[this.pluginName].render(this);},e.prototype._onTextureUpdate=function(){},e.prototype._calculateBounds=function(){this._bounds.addVertices(this.transform,this.vertices,0,this.vertices.length);},e.prototype.containsPoint=function(t){if(!this.getBounds().contains(t.x,t.y)){ return!1; }this.worldTransform.applyInverse(t,l);for(var r=this.vertices,n=c.points,i=this.indices,o=this.indices.length,s=this.drawMode===e.DRAW_MODES.TRIANGLES?3:1,a=0;a+2<o;a+=s){var u=2*i[a],h=2*i[a+1],f=2*i[a+2];if(n[0]=r[u],n[1]=r[u+1],n[2]=r[h],n[3]=r[h+1],n[4]=r[f],n[5]=r[f+1],c.contains(l.x,l.y)){ return!0 }}return!1},a(e,[{key:"texture",get:function(){return this._texture},set:function(t){this._texture!==t&&(this._texture=t,t&&(t.baseTexture.hasLoaded?this._onTextureUpdate():t.once("update",this._onTextureUpdate,this)));}},{key:"tint",get:function(){return h.utils.rgb2hex(this.tintRgb)},set:function(t){this.tintRgb=h.utils.hex2rgb(t,this.tintRgb);}}]),e}(h.Container);r.default=f,f.DRAW_MODES={TRIANGLE_MESH:0,TRIANGLES:1};},{"../core":64}],163:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),u=t("./Plane"),h=n(u),l=10,c=function(t){function e(r,n,s,a,u){i(this,e);var h=o(this,t.call(this,r,4,4)),c=h.uvs;return c[6]=c[14]=c[22]=c[30]=1,c[25]=c[27]=c[29]=c[31]=1,h._origWidth=r.width,h._origHeight=r.height,h._uvw=1/h._origWidth,h._uvh=1/h._origHeight,h.width=r.width,h.height=r.height,c[2]=c[10]=c[18]=c[26]=h._uvw*n,c[4]=c[12]=c[20]=c[28]=1-h._uvw*a,c[9]=c[11]=c[13]=c[15]=h._uvh*s,c[17]=c[19]=c[21]=c[23]=1-h._uvh*u,h.leftWidth="undefined"!=typeof n?n:l,h.rightWidth="undefined"!=typeof a?a:l,h.topHeight="undefined"!=typeof s?s:l,h.bottomHeight="undefined"!=typeof u?u:l,h}return s(e,t),e.prototype.updateHorizontalVertices=function(){var t=this.vertices;t[9]=t[11]=t[13]=t[15]=this._topHeight,t[17]=t[19]=t[21]=t[23]=this._height-this._bottomHeight,t[25]=t[27]=t[29]=t[31]=this._height;},e.prototype.updateVerticalVertices=function(){var t=this.vertices;t[2]=t[10]=t[18]=t[26]=this._leftWidth,t[4]=t[12]=t[20]=t[28]=this._width-this._rightWidth,t[6]=t[14]=t[22]=t[30]=this._width;},e.prototype._renderCanvas=function(t){var e=t.context;e.globalAlpha=this.worldAlpha;var r=this.worldTransform,n=t.resolution;t.roundPixels?e.setTransform(r.a*n,r.b*n,r.c*n,r.d*n,r.tx*n|0,r.ty*n|0):e.setTransform(r.a*n,r.b*n,r.c*n,r.d*n,r.tx*n,r.ty*n);var i=this._texture.baseTexture,o=i.source,s=i.width,a=i.height;this.drawSegment(e,o,s,a,0,1,10,11),this.drawSegment(e,o,s,a,2,3,12,13),this.drawSegment(e,o,s,a,4,5,14,15),this.drawSegment(e,o,s,a,8,9,18,19),this.drawSegment(e,o,s,a,10,11,20,21),this.drawSegment(e,o,s,a,12,13,22,23),this.drawSegment(e,o,s,a,16,17,26,27),this.drawSegment(e,o,s,a,18,19,28,29),this.drawSegment(e,o,s,a,20,21,30,31);},e.prototype.drawSegment=function(t,e,r,n,i,o,s,a){var u=this.uvs,h=this.vertices,l=(u[s]-u[i])*r,c=(u[a]-u[o])*n,f=h[s]-h[i],d=h[a]-h[o];l<1&&(l=1),c<1&&(c=1),f<1&&(f=1),d<1&&(d=1),t.drawImage(e,u[i]*r,u[o]*n,l,c,h[i],h[o],f,d);},a(e,[{key:"width",get:function(){return this._width},set:function(t){this._width=t,this.updateVerticalVertices();}},{key:"height",get:function(){return this._height},set:function(t){this._height=t,this.updateHorizontalVertices();}},{key:"leftWidth",get:function(){return this._leftWidth},set:function(t){this._leftWidth=t;var e=this.uvs,r=this.vertices;e[2]=e[10]=e[18]=e[26]=this._uvw*t,r[2]=r[10]=r[18]=r[26]=t,this.dirty=!0;}},{key:"rightWidth",get:function(){return this._rightWidth},set:function(t){this._rightWidth=t;var e=this.uvs,r=this.vertices;e[4]=e[12]=e[20]=e[28]=1-this._uvw*t,r[4]=r[12]=r[20]=r[28]=this._width-t,this.dirty=!0;}},{key:"topHeight",get:function(){return this._topHeight},set:function(t){this._topHeight=t;var e=this.uvs,r=this.vertices;e[9]=e[11]=e[13]=e[15]=this._uvh*t,r[9]=r[11]=r[13]=r[15]=t,this.dirty=!0;}},{key:"bottomHeight",get:function(){return this._bottomHeight},set:function(t){this._bottomHeight=t;var e=this.uvs,r=this.vertices;e[17]=e[19]=e[21]=e[23]=1-this._uvh*t,r[17]=r[19]=r[21]=r[23]=this._height-t,this.dirty=!0;}}]),e}(h.default);r.default=c;},{"./Plane":164}],164:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("./Mesh"),u=n(a),h=function(t){function e(r,n,s){i(this,e);var a=o(this,t.call(this,r));return a._ready=!0,a.verticesX=n||10,a.verticesY=s||10,a.drawMode=u.default.DRAW_MODES.TRIANGLES,a.refresh(),a}return s(e,t),e.prototype.refresh=function(){
var this$1 = this;
for(var t=this.verticesX*this.verticesY,e=[],r=[],n=[],i=[],o=this.texture,s=this.verticesX-1,a=this.verticesY-1,u=o.width/s,h=o.height/a,l=0;l<t;l++){ if(o._uvs){var c=l%this$1.verticesX,f=l/this$1.verticesX|0;e.push(c*u,f*h),n.push(o._uvs.x0+(o._uvs.x1-o._uvs.x0)*(c/(this$1.verticesX-1)),o._uvs.y0+(o._uvs.y3-o._uvs.y0)*(f/(this$1.verticesY-1)));}else { n.push(0); } }for(var d=s*a,p=0;p<d;p++){var v=p%s,y=p/s|0,g=y*this$1.verticesX+v,m=y*this$1.verticesX+v+1,_=(y+1)*this$1.verticesX+v,b=(y+1)*this$1.verticesX+v+1;i.push(g,m,_),i.push(m,b,_);}this.vertices=new Float32Array(e),this.uvs=new Float32Array(n),this.colors=new Float32Array(r),this.indices=new Uint16Array(i),this.indexDirty=!0;},e.prototype._onTextureUpdate=function(){u.default.prototype._onTextureUpdate.call(this),this._ready&&this.refresh();},e}(u.default);r.default=h;},{"./Mesh":162}],165:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=t("./Mesh"),h=i(u),l=t("../core"),c=n(l),f=function(t){function e(r,n){o(this,e);var i=s(this,t.call(this,r));return i.points=n,i.vertices=new Float32Array(4*n.length),i.uvs=new Float32Array(4*n.length),i.colors=new Float32Array(2*n.length),i.indices=new Uint16Array(2*n.length),i._ready=!0,i.refresh(),i}return a(e,t),e.prototype.refresh=function(){var t=this.points;if(!(t.length<1)&&this._texture._uvs){this.vertices.length/4!==t.length&&(this.vertices=new Float32Array(4*t.length),this.uvs=new Float32Array(4*t.length),this.colors=new Float32Array(2*t.length),this.indices=new Uint16Array(2*t.length));var e=this.uvs,r=this.indices,n=this.colors,i=this._texture._uvs,o=new c.Point(i.x0,i.y0),s=new c.Point(i.x2-i.x0,Number(i.y2-i.y0));e[0]=0+o.x,e[1]=0+o.y,e[2]=0+o.x,e[3]=s.y+o.y,n[0]=1,n[1]=1,r[0]=0,r[1]=1;for(var a=t.length,u=1;u<a;u++){var h=4*u,l=u/(a-1);e[h]=l*s.x+o.x,e[h+1]=0+o.y,e[h+2]=l*s.x+o.x,e[h+3]=s.y+o.y,h=2*u,n[h]=1,n[h+1]=1,h=2*u,r[h]=h,r[h+1]=h+1;}this.dirty++,this.indexDirty++;}},e.prototype._onTextureUpdate=function(){t.prototype._onTextureUpdate.call(this),this._ready&&this.refresh();},e.prototype.updateTransform=function(){
var this$1 = this;
var t=this.points;if(!(t.length<1)){for(var e=t[0],r=void 0,n=0,i=0,o=this.vertices,s=t.length,a=0;a<s;a++){var u=t[a],h=4*a;r=a<t.length-1?t[a+1]:u,i=-(r.x-e.x),n=r.y-e.y;var l=10*(1-a/(s-1));l>1&&(l=1);var c=Math.sqrt(n*n+i*i),f=this$1._texture.height/2;n/=c,i/=c,n*=f,i*=f,o[h]=u.x+n,o[h+1]=u.y+i,o[h+2]=u.x-n,o[h+3]=u.y-i,e=u;}this.containerUpdateTransform();}},e}(h.default);r.default=f;},{"../core":64,"./Mesh":162}],166:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var s=t("../../core"),a=i(s),u=t("../Mesh"),h=n(u),l=function(){function t(e){o(this,t),this.renderer=e;}return t.prototype.render=function(t){var e=this.renderer,r=e.context,n=t.worldTransform,i=e.resolution;e.roundPixels?r.setTransform(n.a*i,n.b*i,n.c*i,n.d*i,n.tx*i|0,n.ty*i|0):r.setTransform(n.a*i,n.b*i,n.c*i,n.d*i,n.tx*i,n.ty*i),e.setBlendMode(t.blendMode),t.drawMode===h.default.DRAW_MODES.TRIANGLE_MESH?this._renderTriangleMesh(t):this._renderTriangles(t);},t.prototype._renderTriangleMesh=function(t){
var this$1 = this;
for(var e=t.vertices.length/2,r=0;r<e-2;r++){var n=2*r;this$1._renderDrawTriangle(t,n,n+2,n+4);}},t.prototype._renderTriangles=function(t){
var this$1 = this;
for(var e=t.indices,r=e.length,n=0;n<r;n+=3){var i=2*e[n],o=2*e[n+1],s=2*e[n+2];this$1._renderDrawTriangle(t,i,o,s);}},t.prototype._renderDrawTriangle=function(t,e,r,n){var i=this.renderer.context,o=t.uvs,s=t.vertices,a=t._texture;if(a.valid){var u=a.baseTexture,h=u.source,l=u.width,c=u.height,f=o[e]*u.width,d=o[r]*u.width,p=o[n]*u.width,v=o[e+1]*u.height,y=o[r+1]*u.height,g=o[n+1]*u.height,m=s[e],_=s[r],b=s[n],x=s[e+1],T=s[r+1],w=s[n+1];if(t.canvasPadding>0){var E=t.canvasPadding/t.worldTransform.a,S=t.canvasPadding/t.worldTransform.d,O=(m+_+b)/3,P=(x+T+w)/3,M=m-O,C=x-P,R=Math.sqrt(M*M+C*C);m=O+M/R*(R+E),x=P+C/R*(R+S),M=_-O,C=T-P,R=Math.sqrt(M*M+C*C),_=O+M/R*(R+E),T=P+C/R*(R+S),M=b-O,C=w-P,R=Math.sqrt(M*M+C*C),b=O+M/R*(R+E),w=P+C/R*(R+S);}i.save(),i.beginPath(),i.moveTo(m,x),i.lineTo(_,T),i.lineTo(b,w),i.closePath(),i.clip();var A=f*y+v*p+d*g-y*p-v*d-f*g,I=m*y+v*b+_*g-y*b-v*_-m*g,D=f*_+m*p+d*b-_*p-m*d-f*b,L=f*y*b+v*_*p+m*d*g-m*y*p-v*d*b-f*_*g,N=x*y+v*w+T*g-y*w-v*T-x*g,F=f*T+x*p+d*w-T*p-x*d-f*w,B=f*y*w+v*T*p+x*d*g-x*y*p-v*d*w-f*T*g;i.transform(I/A,N/A,D/A,F/A,L/A,B/A),i.drawImage(h,0,0,l*u.resolution,c*u.resolution,0,0,l,c),i.restore();}},t.prototype.renderMeshFlat=function(t){var e=this.renderer.context,r=t.vertices,n=r.length/2;e.beginPath();for(var i=1;i<n-2;++i){var o=2*i,s=r[o],a=r[o+1],u=r[o+2],h=r[o+3],l=r[o+4],c=r[o+5];e.moveTo(s,a),e.lineTo(u,h),e.lineTo(l,c);}e.fillStyle="#FF0000",e.fill(),e.closePath();},t.prototype.destroy=function(){this.renderer=null;},t}();r.default=l,a.CanvasRenderer.registerPlugin("mesh",l);},{"../../core":64,"../Mesh":162}],167:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./Mesh");Object.defineProperty(r,"Mesh",{enumerable:!0,get:function(){return n(i).default}});var o=t("./webgl/MeshRenderer");Object.defineProperty(r,"MeshRenderer",{enumerable:!0,get:function(){return n(o).default}});var s=t("./canvas/CanvasMeshRenderer");Object.defineProperty(r,"CanvasMeshRenderer",{enumerable:!0,get:function(){return n(s).default}});var a=t("./Plane");Object.defineProperty(r,"Plane",{enumerable:!0,get:function(){return n(a).default}});var u=t("./NineSlicePlane");Object.defineProperty(r,"NineSlicePlane",{enumerable:!0,get:function(){return n(u).default}});var h=t("./Rope");Object.defineProperty(r,"Rope",{enumerable:!0,get:function(){return n(h).default}});},{"./Mesh":162,"./NineSlicePlane":163,"./Plane":164,"./Rope":165,"./canvas/CanvasMeshRenderer":166,"./webgl/MeshRenderer":168}],168:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=t("../../core"),h=i(u),l=t("pixi-gl-core"),c=n(l),f=t("../Mesh"),d=n(f),p=(t("path"),function(t){function e(r){o(this,e);var n=s(this,t.call(this,r));return n.shader=null,n}return a(e,t),e.prototype.onContextChange=function(){var t=this.renderer.gl;this.shader=new h.Shader(t,"attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 translationMatrix;\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = aTextureCoord;\n}\n","varying vec2 vTextureCoord;\nuniform float alpha;\nuniform vec3 tint;\n\nuniform sampler2D uSampler;\n\nvoid main(void)\n{\n    gl_FragColor = texture2D(uSampler, vTextureCoord) * vec4(tint * alpha, alpha);\n}\n");},e.prototype.render=function(t){var e=this.renderer,r=e.gl,n=t._texture;if(n.valid){var i=t._glDatas[e.CONTEXT_UID];i||(e.bindVao(null),i={shader:this.shader,vertexBuffer:c.default.GLBuffer.createVertexBuffer(r,t.vertices,r.STREAM_DRAW),uvBuffer:c.default.GLBuffer.createVertexBuffer(r,t.uvs,r.STREAM_DRAW),indexBuffer:c.default.GLBuffer.createIndexBuffer(r,t.indices,r.STATIC_DRAW),vao:null,dirty:t.dirty,indexDirty:t.indexDirty},i.vao=new c.default.VertexArrayObject(r).addIndex(i.indexBuffer).addAttribute(i.vertexBuffer,i.shader.attributes.aVertexPosition,r.FLOAT,!1,8,0).addAttribute(i.uvBuffer,i.shader.attributes.aTextureCoord,r.FLOAT,!1,8,0),t._glDatas[e.CONTEXT_UID]=i),e.bindVao(i.vao),t.dirty!==i.dirty&&(i.dirty=t.dirty,i.uvBuffer.upload(t.uvs)),t.indexDirty!==i.indexDirty&&(i.indexDirty=t.indexDirty,i.indexBuffer.upload(t.indices)),i.vertexBuffer.upload(t.vertices),e.bindShader(i.shader),i.shader.uniforms.uSampler=e.bindTexture(n),e.state.setBlendMode(t.blendMode),i.shader.uniforms.translationMatrix=t.worldTransform.toArray(!0),i.shader.uniforms.alpha=t.worldAlpha,i.shader.uniforms.tint=t.tintRgb;var o=t.drawMode===d.default.DRAW_MODES.TRIANGLE_MESH?r.TRIANGLE_STRIP:r.TRIANGLES;i.vao.draw(o,t.indices.length,0);}},e}(h.ObjectRenderer));r.default=p,h.WebGLRenderer.registerPlugin("mesh",p);},{"../../core":64,"../Mesh":162,path:23,"pixi-gl-core":12}],169:[function(t,e,r){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);
}r.__esModule=!0;var a=t("../core"),u=n(a),h=function(t){function e(){var r=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1500,n=arguments[1],s=arguments.length>2&&void 0!==arguments[2]?arguments[2]:16384;i(this,e);var a=o(this,t.call(this)),h=16384;return s>h&&(s=h),s>r&&(s=r),a._properties=[!1,!0,!1,!1,!1],a._maxSize=r,a._batchSize=s,a._glBuffers={},a._bufferToUpdate=0,a.interactiveChildren=!1,a.blendMode=u.BLEND_MODES.NORMAL,a.roundPixels=!0,a.baseTexture=null,a.setProperties(n),a}return s(e,t),e.prototype.setProperties=function(t){t&&(this._properties[0]="scale"in t?!!t.scale:this._properties[0],this._properties[1]="position"in t?!!t.position:this._properties[1],this._properties[2]="rotation"in t?!!t.rotation:this._properties[2],this._properties[3]="uvs"in t?!!t.uvs:this._properties[3],this._properties[4]="alpha"in t?!!t.alpha:this._properties[4]);},e.prototype.updateTransform=function(){this.displayObjectUpdateTransform();},e.prototype.renderWebGL=function(t){var e=this;this.visible&&!(this.worldAlpha<=0)&&this.children.length&&this.renderable&&(this.baseTexture||(this.baseTexture=this.children[0]._texture.baseTexture,this.baseTexture.hasLoaded||this.baseTexture.once("update",function(){return e.onChildrenChange(0)})),t.setObjectRenderer(t.plugins.particle),t.plugins.particle.render(this));},e.prototype.onChildrenChange=function(t){var e=Math.floor(t/this._batchSize);e<this._bufferToUpdate&&(this._bufferToUpdate=e);},e.prototype.renderCanvas=function(t){
var this$1 = this;
if(this.visible&&!(this.worldAlpha<=0)&&this.children.length&&this.renderable){var e=t.context,r=this.worldTransform,n=!0,i=0,o=0,s=0,a=0,u=t.blendModes[this.blendMode];u!==e.globalCompositeOperation&&(e.globalCompositeOperation=u),e.globalAlpha=this.worldAlpha,this.displayObjectUpdateTransform();for(var h=0;h<this.children.length;++h){var l=this$1.children[h];if(l.visible){var c=l._texture.frame;if(e.globalAlpha=this$1.worldAlpha*l.alpha,l.rotation%(2*Math.PI)===0){ n&&(e.setTransform(r.a,r.b,r.c,r.d,r.tx*t.resolution,r.ty*t.resolution),n=!1),i=l.anchor.x*(-c.width*l.scale.x)+l.position.x+.5,o=l.anchor.y*(-c.height*l.scale.y)+l.position.y+.5,s=c.width*l.scale.x,a=c.height*l.scale.y; }else{n||(n=!0),l.displayObjectUpdateTransform();var f=l.worldTransform;t.roundPixels?e.setTransform(f.a,f.b,f.c,f.d,f.tx*t.resolution|0,f.ty*t.resolution|0):e.setTransform(f.a,f.b,f.c,f.d,f.tx*t.resolution,f.ty*t.resolution),i=l.anchor.x*-c.width+.5,o=l.anchor.y*-c.height+.5,s=c.width,a=c.height;}var d=l._texture.baseTexture.resolution;e.drawImage(l._texture.baseTexture.source,c.x*d,c.y*d,c.width*d,c.height*d,i*d,o*d,s*d,a*d);}}}},e.prototype.destroy=function(e){
var this$1 = this;
if(t.prototype.destroy.call(this,e),this._buffers){ for(var r=0;r<this._buffers.length;++r){ this$1._buffers[r].destroy(); } }this._properties=null,this._buffers=null;},e}(u.Container);r.default=h;},{"../core":64}],170:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./ParticleContainer");Object.defineProperty(r,"ParticleContainer",{enumerable:!0,get:function(){return n(i).default}});var o=t("./webgl/ParticleRenderer");Object.defineProperty(r,"ParticleRenderer",{enumerable:!0,get:function(){return n(o).default}});},{"./ParticleContainer":169,"./webgl/ParticleRenderer":172}],171:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var o=t("pixi-gl-core"),s=n(o),a=t("../../core/utils/createIndicesForQuads"),u=n(a),h=function(){function t(e,r,n,o){
var this$1 = this;
i(this,t),this.gl=e,this.vertSize=2,this.vertByteSize=4*this.vertSize,this.size=o,this.dynamicProperties=[],this.staticProperties=[];for(var s=0;s<r.length;++s){var a=r[s];a={attribute:a.attribute,size:a.size,uploadFunction:a.uploadFunction,offset:a.offset},n[s]?this$1.dynamicProperties.push(a):this$1.staticProperties.push(a);}this.staticStride=0,this.staticBuffer=null,this.staticData=null,this.dynamicStride=0,this.dynamicBuffer=null,this.dynamicData=null,this.initBuffers();}return t.prototype.initBuffers=function(){
var this$1 = this;
var t=this.gl,e=0;this.indices=(0,u.default)(this.size),this.indexBuffer=s.default.GLBuffer.createIndexBuffer(t,this.indices,t.STATIC_DRAW),this.dynamicStride=0;for(var r=0;r<this.dynamicProperties.length;++r){var n=this$1.dynamicProperties[r];n.offset=e,e+=n.size,this$1.dynamicStride+=n.size;}this.dynamicData=new Float32Array(this.size*this.dynamicStride*4),this.dynamicBuffer=s.default.GLBuffer.createVertexBuffer(t,this.dynamicData,t.STREAM_DRAW);var i=0;this.staticStride=0;for(var o=0;o<this.staticProperties.length;++o){var a=this$1.staticProperties[o];a.offset=i,i+=a.size,this$1.staticStride+=a.size;}this.staticData=new Float32Array(this.size*this.staticStride*4),this.staticBuffer=s.default.GLBuffer.createVertexBuffer(t,this.staticData,t.STATIC_DRAW),this.vao=new s.default.VertexArrayObject(t).addIndex(this.indexBuffer);for(var h=0;h<this.dynamicProperties.length;++h){var l=this$1.dynamicProperties[h];this$1.vao.addAttribute(this$1.dynamicBuffer,l.attribute,t.FLOAT,!1,4*this$1.dynamicStride,4*l.offset);}for(var c=0;c<this.staticProperties.length;++c){var f=this$1.staticProperties[c];this$1.vao.addAttribute(this$1.staticBuffer,f.attribute,t.FLOAT,!1,4*this$1.staticStride,4*f.offset);}},t.prototype.uploadDynamic=function(t,e,r){
var this$1 = this;
for(var n=0;n<this.dynamicProperties.length;n++){var i=this$1.dynamicProperties[n];i.uploadFunction(t,e,r,this$1.dynamicData,this$1.dynamicStride,i.offset);}this.dynamicBuffer.upload();},t.prototype.uploadStatic=function(t,e,r){
var this$1 = this;
for(var n=0;n<this.staticProperties.length;n++){var i=this$1.staticProperties[n];i.uploadFunction(t,e,r,this$1.staticData,this$1.staticStride,i.offset);}this.staticBuffer.upload();},t.prototype.destroy=function(){this.dynamicProperties=null,this.dynamicData=null,this.dynamicBuffer.destroy(),this.staticProperties=null,this.staticData=null,this.staticBuffer.destroy();},t}();r.default=h;},{"../../core/utils/createIndicesForQuads":119,"pixi-gl-core":12}],172:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var u=t("../../core"),h=i(u),l=t("./ParticleShader"),c=n(l),f=t("./ParticleBuffer"),d=n(f),p=function(t){function e(r){o(this,e);var n=s(this,t.call(this,r));return n.shader=null,n.indexBuffer=null,n.properties=null,n.tempMatrix=new h.Matrix,n.CONTEXT_UID=0,n}return a(e,t),e.prototype.onContextChange=function(){var t=this.renderer.gl;this.CONTEXT_UID=this.renderer.CONTEXT_UID,this.shader=new c.default(t),this.properties=[{attribute:this.shader.attributes.aVertexPosition,size:2,uploadFunction:this.uploadVertices,offset:0},{attribute:this.shader.attributes.aPositionCoord,size:2,uploadFunction:this.uploadPosition,offset:0},{attribute:this.shader.attributes.aRotation,size:1,uploadFunction:this.uploadRotation,offset:0},{attribute:this.shader.attributes.aTextureCoord,size:2,uploadFunction:this.uploadUvs,offset:0},{attribute:this.shader.attributes.aColor,size:1,uploadFunction:this.uploadAlpha,offset:0}];},e.prototype.start=function(){this.renderer.bindShader(this.shader);},e.prototype.render=function(t){var e=t.children,r=t._maxSize,n=t._batchSize,i=this.renderer,o=e.length;if(0!==o){o>r&&(o=r);var s=t._glBuffers[i.CONTEXT_UID];s||(s=t._glBuffers[i.CONTEXT_UID]=this.generateBuffers(t)),this.renderer.setBlendMode(t.blendMode);var a=i.gl,u=t.worldTransform.copy(this.tempMatrix);u.prepend(i._activeRenderTarget.projectionMatrix),this.shader.uniforms.projectionMatrix=u.toArray(!0),this.shader.uniforms.uAlpha=t.worldAlpha;var h=e[0]._texture.baseTexture;this.shader.uniforms.uSampler=i.bindTexture(h);for(var l=0,c=0;l<o;l+=n,c+=1){var f=o-l;f>n&&(f=n);var d=s[c];d.uploadDynamic(e,l,f),t._bufferToUpdate===c&&(d.uploadStatic(e,l,f),t._bufferToUpdate=c+1),i.bindVao(d.vao),d.vao.draw(a.TRIANGLES,6*f);}}},e.prototype.generateBuffers=function(t){
var this$1 = this;
for(var e=this.renderer.gl,r=[],n=t._maxSize,i=t._batchSize,o=t._properties,s=0;s<n;s+=i){ r.push(new d.default(e,this$1.properties,o,i)); }return r},e.prototype.uploadVertices=function(t,e,r,n,i,o){for(var s=0,a=0,u=0,h=0,l=0;l<r;++l){var c=t[e+l],f=c._texture,d=c.scale.x,p=c.scale.y,v=f.trim,y=f.orig;v?(a=v.x-c.anchor.x*y.width,s=a+v.width,h=v.y-c.anchor.y*y.height,u=h+v.height):(s=y.width*(1-c.anchor.x),a=y.width*-c.anchor.x,u=y.height*(1-c.anchor.y),h=y.height*-c.anchor.y),n[o]=a*d,n[o+1]=h*p,n[o+i]=s*d,n[o+i+1]=h*p,n[o+2*i]=s*d,n[o+2*i+1]=u*p,n[o+3*i]=a*d,n[o+3*i+1]=u*p,o+=4*i;}},e.prototype.uploadPosition=function(t,e,r,n,i,o){for(var s=0;s<r;s++){var a=t[e+s].position;n[o]=a.x,n[o+1]=a.y,n[o+i]=a.x,n[o+i+1]=a.y,n[o+2*i]=a.x,n[o+2*i+1]=a.y,n[o+3*i]=a.x,n[o+3*i+1]=a.y,o+=4*i;}},e.prototype.uploadRotation=function(t,e,r,n,i,o){for(var s=0;s<r;s++){var a=t[e+s].rotation;n[o]=a,n[o+i]=a,n[o+2*i]=a,n[o+3*i]=a,o+=4*i;}},e.prototype.uploadUvs=function(t,e,r,n,i,o){for(var s=0;s<r;++s){var a=t[e+s]._texture._uvs;a?(n[o]=a.x0,n[o+1]=a.y0,n[o+i]=a.x1,n[o+i+1]=a.y1,n[o+2*i]=a.x2,n[o+2*i+1]=a.y2,n[o+3*i]=a.x3,n[o+3*i+1]=a.y3,o+=4*i):(n[o]=0,n[o+1]=0,n[o+i]=0,n[o+i+1]=0,n[o+2*i]=0,n[o+2*i+1]=0,n[o+3*i]=0,n[o+3*i+1]=0,o+=4*i);}},e.prototype.uploadAlpha=function(t,e,r,n,i,o){for(var s=0;s<r;s++){var a=t[e+s].alpha;n[o]=a,n[o+i]=a,n[o+2*i]=a,n[o+3*i]=a,o+=4*i;}},e.prototype.destroy=function(){this.renderer.gl&&this.renderer.gl.deleteBuffer(this.indexBuffer),t.prototype.destroy.call(this),this.shader.destroy(),this.indices=null,this.tempMatrix=null;},e}(h.ObjectRenderer);r.default=p,h.WebGLRenderer.registerPlugin("particle",p);},{"../../core":64,"./ParticleBuffer":171,"./ParticleShader":173}],173:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function o(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function s(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}r.__esModule=!0;var a=t("../../core/Shader"),u=n(a),h=function(t){function e(r){return i(this,e),o(this,t.call(this,r,["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","attribute float aColor;","attribute vec2 aPositionCoord;","attribute vec2 aScale;","attribute float aRotation;","uniform mat3 projectionMatrix;","varying vec2 vTextureCoord;","varying float vColor;","void main(void){","   vec2 v = aVertexPosition;","   v.x = (aVertexPosition.x) * cos(aRotation) - (aVertexPosition.y) * sin(aRotation);","   v.y = (aVertexPosition.x) * sin(aRotation) + (aVertexPosition.y) * cos(aRotation);","   v = v + aPositionCoord;","   gl_Position = vec4((projectionMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vColor = aColor;","}"].join("\n"),["varying vec2 vTextureCoord;","varying float vColor;","uniform sampler2D uSampler;","uniform float uAlpha;","void main(void){","  vec4 color = texture2D(uSampler, vTextureCoord) * vColor * uAlpha;","  if (color.a == 0.0) discard;","  gl_FragColor = color;","}"].join("\n")))}return s(e,t),e}(u.default);r.default=h;},{"../../core/Shader":43}],174:[function(t,e,r){"use strict";Math.sign||(Math.sign=function(t){return t=Number(t),0===t||isNaN(t)?t:t>0?1:-1});},{}],175:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}var i=t("object-assign"),o=n(i);Object.assign||(Object.assign=o.default);},{"object-assign":5}],176:[function(t,e,r){"use strict";t("./Object.assign"),t("./requestAnimationFrame"),t("./Math.sign"),window.ArrayBuffer||(window.ArrayBuffer=Array),window.Float32Array||(window.Float32Array=Array),window.Uint32Array||(window.Uint32Array=Array),window.Uint16Array||(window.Uint16Array=Array);},{"./Math.sign":174,"./Object.assign":175,"./requestAnimationFrame":177}],177:[function(t,e,r){(function(t){"use strict";var e=16;if(Date.now&&Date.prototype.getTime||(Date.now=function(){return(new Date).getTime()}),!t.performance||!t.performance.now){var r=Date.now();t.performance||(t.performance={}),t.performance.now=function(){return Date.now()-r};}for(var n=Date.now(),i=["ms","moz","webkit","o"],o=0;o<i.length&&!t.requestAnimationFrame;++o){var s=i[o];t.requestAnimationFrame=t[s+"RequestAnimationFrame"],t.cancelAnimationFrame=t[s+"CancelAnimationFrame"]||t[s+"CancelRequestAnimationFrame"];}t.requestAnimationFrame||(t.requestAnimationFrame=function(t){if("function"!=typeof t){ throw new TypeError(t+"is not a function"); }var r=Date.now(),i=e+n-r;return i<0&&(i=0),n=r,setTimeout(function(){n=Date.now(),t(performance.now());},i)}),t.cancelAnimationFrame||(t.cancelAnimationFrame=function(t){return clearTimeout(t)});}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{}],178:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){return e instanceof c.Text&&(e.updateText(!0),!0)}function a(t,e){if(e instanceof c.TextStyle){var r=c.Text.getFontStyle(e);return c.Text.fontPropertiesCache[r]||c.Text.calculateFontProperties(r),!0}return!1}function u(t,e){if(t instanceof c.Text){e.indexOf(t.style)===-1&&e.push(t.style),e.indexOf(t)===-1&&e.push(t);var r=t._texture.baseTexture;return e.indexOf(r)===-1&&e.push(r),!0}return!1}function h(t,e){return t instanceof c.TextStyle&&(e.indexOf(t)===-1&&e.push(t),!0)}r.__esModule=!0;var l=t("../core"),c=i(l),f=t("./limiters/CountLimiter"),d=n(f),p=c.ticker.shared;c.settings.UPLOADS_PER_FRAME=4;var v=function(){function t(e){var r=this;o(this,t),this.limiter=new d.default(c.settings.UPLOADS_PER_FRAME),this.renderer=e,this.uploadHookHelper=null,this.queue=[],this.addHooks=[],this.uploadHooks=[],this.completes=[],this.ticking=!1,this.delayedTick=function(){r.queue&&r.prepareItems();},this.register(u,s),this.register(h,a);}return t.prototype.upload=function(t,e){"function"==typeof t&&(e=t,t=null),t&&this.add(t),this.queue.length?(e&&this.completes.push(e),this.ticking||(this.ticking=!0,p.addOnce(this.tick,this))):e&&e();},t.prototype.tick=function(){setTimeout(this.delayedTick,0);},t.prototype.prepareItems=function(){
var this$1 = this;
for(this.limiter.beginFrame();this.queue.length&&this.limiter.allowedToUpload();){for(var t=this.queue[0],e=!1,r=0,n=this.uploadHooks.length;r<n;r++){ if(this$1.uploadHooks[r](this$1.uploadHookHelper,t)){this$1.queue.shift(),e=!0;break} }e||this$1.queue.shift();}if(this.queue.length){ p.addOnce(this.tick,this); }else{this.ticking=!1;var i=this.completes.slice(0);this.completes.length=0;for(var o=0,s=i.length;o<s;o++){ i[o](); }}},t.prototype.register=function(t,e){return t&&this.addHooks.push(t),e&&this.uploadHooks.push(e),this},t.prototype.add=function(t){
var this$1 = this;
for(var e=0,r=this.addHooks.length;e<r&&!this.addHooks[e](t,this.queue);e++){  }if(t instanceof c.Container){ for(var n=t.children.length-1;n>=0;n--){ this$1.add(t.children[n]); } }return this},t.prototype.destroy=function(){this.ticking&&p.remove(this.tick,this),this.ticking=!1,this.addHooks=null,this.uploadHooks=null,this.renderer=null,this.completes=null,this.queue=null,this.limiter=null,this.uploadHookHelper=null;},t}();r.default=v;},{"../core":64,"./limiters/CountLimiter":181}],179:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function u(t,e){if(e instanceof c.BaseTexture){var r=e.source,n=0===r.width?t.canvas.width:Math.min(t.canvas.width,r.width),i=0===r.height?t.canvas.height:Math.min(t.canvas.height,r.height);return t.ctx.drawImage(r,0,0,n,i,0,0,t.canvas.width,t.canvas.height),!0}return!1}function h(t,e){if(t instanceof c.BaseTexture){ return e.indexOf(t)===-1&&e.push(t),!0; }if(t._texture&&t._texture instanceof c.Texture){var r=t._texture.baseTexture;return e.indexOf(r)===-1&&e.push(r),!0}return!1}r.__esModule=!0;var l=t("../../core"),c=i(l),f=t("../BasePrepare"),d=n(f),p=16,v=function(t){function e(r){o(this,e);var n=s(this,t.call(this,r));return n.uploadHookHelper=n,n.canvas=document.createElement("canvas"),n.canvas.width=p,n.canvas.height=p,n.ctx=n.canvas.getContext("2d"),n.register(h,u),n}return a(e,t),e.prototype.destroy=function(){t.prototype.destroy.call(this),this.ctx=null,this.canvas=null;},e}(d.default);r.default=v,c.CanvasRenderer.registerPlugin("prepare",v);},{"../../core":64,"../BasePrepare":178}],180:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}r.__esModule=!0;var i=t("./webgl/WebGLPrepare");Object.defineProperty(r,"webgl",{enumerable:!0,get:function(){return n(i).default}});var o=t("./canvas/CanvasPrepare");Object.defineProperty(r,"canvas",{enumerable:!0,get:function(){return n(o).default}});var s=t("./BasePrepare");Object.defineProperty(r,"BasePrepare",{enumerable:!0,get:function(){return n(s).default}});var a=t("./limiters/CountLimiter");Object.defineProperty(r,"CountLimiter",{enumerable:!0,get:function(){return n(a).default}});var u=t("./limiters/TimeLimiter");Object.defineProperty(r,"TimeLimiter",{enumerable:!0,get:function(){return n(u).default}});},{"./BasePrepare":178,"./canvas/CanvasPrepare":179,"./limiters/CountLimiter":181,"./limiters/TimeLimiter":182,"./webgl/WebGLPrepare":183}],181:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(e){n(this,t),this.maxItemsPerFrame=e,this.itemsLeft=0;}return t.prototype.beginFrame=function(){this.itemsLeft=this.maxItemsPerFrame;},t.prototype.allowedToUpload=function(){return this.itemsLeft-- >0},t}();r.default=i;},{}],182:[function(t,e,r){"use strict";function n(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}r.__esModule=!0;var i=function(){function t(e){n(this,t),this.maxMilliseconds=e,this.frameStart=0;}return t.prototype.beginFrame=function(){this.frameStart=Date.now();},t.prototype.allowedToUpload=function(){return Date.now()-this.frameStart<this.maxMilliseconds},t}();r.default=i;},{}],183:[function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function i(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}function o(t,e){if(!(t instanceof e)){ throw new TypeError("Cannot call a class as a function") }}function s(t,e){if(!t){ throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); }return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e){ throw new TypeError("Super expression must either be null or a function, not "+typeof e); }t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);}function u(t,e){return e instanceof d.BaseTexture&&(e._glTextures[t.CONTEXT_UID]||t.textureManager.updateTexture(e),!0)}function h(t,e){return e instanceof d.Graphics&&((e.dirty||e.clearDirty||!e._webGL[t.plugins.graphics.CONTEXT_UID])&&t.plugins.graphics.updateGraphics(e),!0)}function l(t,e){if(t instanceof d.BaseTexture){ return e.indexOf(t)===-1&&e.push(t),!0; }if(t._texture&&t._texture instanceof d.Texture){var r=t._texture.baseTexture;return e.indexOf(r)===-1&&e.push(r),!0}return!1}function c(t,e){return t instanceof d.Graphics&&(e.push(t),!0)}r.__esModule=!0;var f=t("../../core"),d=i(f),p=t("../BasePrepare"),v=n(p),y=function(t){function e(r){o(this,e);var n=s(this,t.call(this,r));return n.uploadHookHelper=n.renderer,n.register(l,u).register(c,h),n}return a(e,t),e}(v.default);r.default=y,d.WebGLRenderer.registerPlugin("prepare",y);},{"../../core":64,"../BasePrepare":178}],184:[function(t,e,r){(function(e){"use strict";function n(t){if(t&&t.__esModule){ return t; }var e={};if(null!=t){ for(var r in t){ Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]); } }return e.default=t,e}r.__esModule=!0,r.loader=r.prepare=r.particles=r.mesh=r.loaders=r.interaction=r.filters=r.extras=r.extract=r.accessibility=void 0;var i=t("./polyfill");Object.keys(i).forEach(function(t){"default"!==t&&"__esModule"!==t&&Object.defineProperty(r,t,{enumerable:!0,get:function(){return i[t]}});});var o=t("./deprecation");Object.keys(o).forEach(function(t){"default"!==t&&"__esModule"!==t&&Object.defineProperty(r,t,{enumerable:!0,get:function(){return o[t]}});});var s=t("./core");Object.keys(s).forEach(function(t){"default"!==t&&"__esModule"!==t&&Object.defineProperty(r,t,{enumerable:!0,get:function(){return s[t]}});});var a=t("./accessibility"),u=n(a),h=t("./extract"),l=n(h),c=t("./extras"),f=n(c),d=t("./filters"),p=n(d),v=t("./interaction"),y=n(v),g=t("./loaders"),m=n(g),_=t("./mesh"),b=n(_),x=t("./particles"),T=n(x),w=t("./prepare"),E=n(w);s.utils.mixins.performMixins(),r.accessibility=u,r.extract=l,r.extras=f,r.filters=p,r.interaction=y,r.loaders=m,r.mesh=b,r.particles=T,r.prepare=E;var S=m&&m.Loader?new m.Loader:null;r.loader=S,e.PIXI=r;}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{"./accessibility":41,"./core":64,"./deprecation":126,"./extract":128,"./extras":137,"./filters":148,"./interaction":155,"./loaders":158,"./mesh":167,"./particles":170,"./polyfill":176,"./prepare":180}]},{},[184])(184)});

/**
 * @param {Number} width
 * @param {Number} height
 */
function resize$1(width, height) {
  if (width >= 0) { this.width = width; }
  if (height >= 0) { this.height = height; }
  this.renderer.resize(width, height);
  this.camera.resize(width, height);
  // re-generate our bg
  this.generateBackground();
  // re-generate background batches
  this.editor.resizeBackgroundBatches(width, height);
  this.clear();
  this.render();
}

function clear() {
  var stage = this.stage;
  while (stage.children.length > 0) {
    stage.removeChild(stage.children[0]);
  }
}

function render() {
  this.renderBackground();
  this.renderBatches();
  if (this.camera.s > (MIN_SCALE + HIDE_GRID)) {
    //this.renderGrid();
  }
  this.drawHoveredTile();
  this.drawActiveCursor();
  //this.renderStats();
  this.renderer.render(this.stage);
}

function renderBackground() {
  var width = this.camera.width;
  var height = this.camera.height;
  this.stage.addChild(this.bg);
}

function renderBatches() {
  var this$1 = this;

  var sindex = this.editor.sindex;
  var batches = this.editor.stack;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii].batch;
    // batch index is higher than stack index, so ignore this batch
    if (sindex - ii < 0) { continue; }
    if (!this$1.editor.isBatchInsideView(batch)) { continue; }
    if (batch.isBackground) { this$1.drawBackgroundBatch(batch); }
    // draw batched buffer (faster, drawImage)
    else if (batch.isBuffered) { this$1.drawBatchedBuffer(batch); }
    // draw batched tiles (slower, fillRect)
    else { this$1.drawBatchedTiles(batch); }
  }
  // draw currently drawn tiles
  if (this.editor.modes.draw) {
    var length = this.editor.batches.length;
    if (length > 0) { this.drawBatchedTiles(this.editor.batches[length - 1]); }
  }
}

/**
 * @return {Void}
 */
function drawActiveCursor() {
  if (!this.cursor) { return; } // no cursor available
  var view = this.cursors[this.cursor];
  if (!view) { return; } // cursor got not loaded yet
  var drawing = this.editor.modes.draw;
  // cursor gets a bit transparent when user is drawing
  view.alpha = drawing ? 0.5 : 1.0;
  var mx = this.editor.mx;
  var my = this.editor.my;
  var w = 1 + (view.texture.width / 6) | 0;
  var h = 1 + (view.texture.height / 6) | 0;
  var x = ((mx + (w / 2))) | 0;
  var y = ((my + (h / 2))) | 0;
  view.position.x = x;
  view.position.y = y;
  view.scale.x = 0.2;
  view.scale.y = 0.2;
  this.stage.addChild(view);
  return;
}

/**
 * @param {Batch} batch
 */
function drawBackgroundBatch(batch) {
  var ctx = this.ctx;
  var buffer = batch.bgbuffer;
  var width = buffer.width | 0;
  var height = buffer.height | 0;
  ctx.drawImage(
    buffer,
    0, 0,
    width, height,
    0, 0,
    width, height
  );
}

/**
 * @param {Batch} batch
 */
function drawBatchedTiles(batch) {
  var this$1 = this;

  var cx = this.camera.x | 0;
  var cy = this.camera.y | 0;
  var cs = roundTo(this.camera.s, 0.125);
  var ww = (TILE_SIZE * cs) | 0;
  var hh = (TILE_SIZE * cs) | 0;
  var ctx = this.ctx;
  var tiles = batch.tiles;
  for (var jj = 0; jj < tiles.length; ++jj) {
    var tile = tiles[jj];
    var x = ((cx + ((tile.x * TILE_SIZE) * cs))) | 0;
    var y = ((cy + ((tile.y * TILE_SIZE) * cs))) | 0;
    var color = rgbaToHex(tile.colors[tile.cindex]);
    var r = color[0];
    var g = color[1];
    var b = color[2];
    var a = color[3];
    var graphics = new PIXI.Graphics();
    graphics.beginFill(color, 1);
    graphics.drawRect(x, y, ww, hh);
    graphics.endFill();
    this$1.stage.addChild(graphics);
  }
}

/**
 * @param {Batch} batch
 */
function drawBatchedBuffer(batch) {
  var cx = this.camera.x | 0;
  var cy = this.camera.y | 0;
  var cs = roundTo(this.camera.s, 0.125);
  var bx = batch.x * TILE_SIZE;
  var by = batch.y * TILE_SIZE;
  var x = (cx + (bx * cs)) | 0;
  var y = (cy + (by * cs)) | 0;
  var ww = (TILE_SIZE * cs) | 0;
  var hh = (TILE_SIZE * cs) | 0;
  var entity = batch.buffer.texture;
  entity.position.x = x;
  entity.position.y = y;
  entity.scale.x = ww;
  entity.scale.y = hh;
  this.stage.addChild(entity);
}

function drawHoveredTile() {
  var cx = this.camera.x | 0;
  var cy = this.camera.y | 0;
  var cs = roundTo(this.camera.s, 0.125);
  var mx = this.editor.mx;
  var my = this.editor.my;
  var relative = this.editor.getRelativeOffset(mx, my);
  var rx = relative.x * TILE_SIZE;
  var ry = relative.y * TILE_SIZE;
  var x = (cx + (rx * cs)) | 0;
  var y = (cy + (ry * cs)) | 0;
  var entity = this.hover;
  entity.position.x = x;
  entity.position.y = y;
  entity.scale.x = cs;
  entity.scale.y = cs;
  this.stage.addChild(entity);
}

function renderStats() {
  // render mouse hovered color
  var mx = this.editor.mx;
  var my = this.editor.my;
  var relative = this.editor.getRelativeOffset(mx, my);
  var rx = relative.x;
  var ry = relative.y;
  var color = this.editor.getStackRelativeTileColorAt(rx, ry);
  this.ctx.fillStyle = "#ffffff";
  this.ctx.fillText(("x:" + rx + ", y:" + ry), 16, 32);
  if (color !== null) {
    var r = color[0];
    var g = color[1];
    var b = color[2];
    var a = color[3];
    this.ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    this.ctx.fillRect(
      6, 42, 8, 8
    );
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText((r + "," + g + "," + b + "," + a), 20, 48);
  }
}


var _render = Object.freeze({
	resize: resize$1,
	clear: clear,
	render: render,
	renderBackground: renderBackground,
	renderBatches: renderBatches,
	drawActiveCursor: drawActiveCursor,
	drawBackgroundBatch: drawBackgroundBatch,
	drawBatchedTiles: drawBatchedTiles,
	drawBatchedBuffer: drawBatchedBuffer,
	drawHoveredTile: drawHoveredTile,
	renderStats: renderStats
});

/**
 * Generates texture for hovered tile
 */
function generateHoverTile() {
  var size = TILE_SIZE;
  var buffer = createCanvasBuffer(size, size);
  var view = buffer.canvas;
  buffer.fillStyle = "rgba(255, 255, 255, 0.2)";
  buffer.fillRect(
    0, 0,
    size, size
  );
  var texture = new PIXI.Sprite(PIXI.Texture.fromCanvas(view));
  this.hover = texture;
}

/**
 * Background grid as transparency placeholder
 */
function generateBackground() {
  var size = TILE_SIZE;
  var cw = this.width;
  var ch = this.height;
  var ctx = createCanvasBuffer(cw, ch);
  var view = ctx.canvas;
  // dark rectangles
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(0, 0, cw, ch);
  // bright rectangles
  ctx.fillStyle = "#212121";
  for (var yy = 0; yy < ch; yy += size*2) {
    for (var xx = 0; xx < cw; xx += size*2) {
      // applied 2 times to increase saturation
      ctx.fillRect(xx, yy, size, size);
      ctx.fillRect(xx, yy, size, size);
    }
  }
  for (var yy$1 = size; yy$1 < ch; yy$1 += size*2) {
    for (var xx$1 = size; xx$1 < cw; xx$1 += size*2) {
      ctx.fillRect(xx$1, yy$1, size, size);
    }
  }
  // free old texture from memory
  if (this.bg !== null) {
    this.bg.destroy(true);
    this.bg = null;
  }
  var texture = new PIXI.Sprite(PIXI.Texture.fromCanvas(view));
  this.bg = texture;
}


var _generate = Object.freeze({
	generateHoverTile: generateHoverTile,
	generateBackground: generateBackground
});

// by this we make pixi available to our global scope
// at very first we tell pixi to render in pixel art friendly mode
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

/**
 * @class Poxi
 */
var Poxi = function Poxi(obj) {
  // cached things
  this.bg = null;
  this.hover = null;
  // renderer things
  this.ctx = null;
  this.view = null;
  this.stage = null;
  this.renderer = null;
  this.events = {};
  this.camera = new Camera(this);
  this.editor = new Editor(this);
  // fps
  this.last = 0;
  this.width = 0;
  this.height = 0;
  this.frames = 0;
  this.states = {
    paused: true
  };
  this.cursor = null;
  this.cursors = {};
  this.createBuffers();
  this.createPixiStage();
  // apply sizing
  if (obj.width >= 0 && obj.height >= 0) {
    this.resize(obj.width, obj.height);
  } else {
    this.resize(view.width, view.height);
  }
  this.init();
};

var prototypeAccessors = { activeCursor: {} };

Poxi.prototype.init = function init () {
  this.camera.scale(0);
  this.renderLoop();
  this.redraw();
};

Poxi.prototype.createBuffers = function createBuffers () {
  this.generateHoverTile();
};

Poxi.prototype.createPixiStage = function createPixiStage () {
  var renderer = PIXI.autoDetectRenderer(
    this.width, this.height,
    { antialias: false, transparent: true, resolution: 1 }
  );
  this.view = renderer.view;
  this.renderer = renderer;
  var stage = new PIXI.DisplayObjectContainer();
  this.stage = stage;
};

Poxi.prototype.renderLoop = function renderLoop () {
    var this$1 = this;

  // try again to render in 16ms
  if (this.states.paused === true) {
    setTimeout(function () { return this$1.renderLoop(); }, 16);
  } else {
    requestAnimationFrame(function () {
      this$1.events[DRAW_HASH].fn();
      this$1.frames++;
      this$1.renderLoop();
    });
  }
};

/**
 * @param {HTMLCanvasElement} el
 */
Poxi.prototype.isViewElement = function isViewElement (el) {
  return (
    el && el instanceof HTMLCanvasElement
  );
};

/**
 * Event emitter
 * @param {String} kind
 * @param {Function} fn
 */
Poxi.prototype.on = function on (kind, fn) {
  if (!(typeof kind === "string")) {
    throw new Error("Expected emitter kind to be string");
  }
  if (!(fn instanceof Function)) {
    throw new Error("Received emitter trigger is not a function");
  }
  var hash = hashFromString(kind);
  if (this.events[hash]) { this.events[hash] = null; } // safely clean old emitters
  this.events[hash] = {
    fn: fn
  };
  this.processEmitter(hash, fn);
};

/**
 * @param {Number} hash
 * @param {Function} fn
 */
Poxi.prototype.processEmitter = function processEmitter (hash, fn) {
  // begin drawing as soon as we got something to do there
  if (this.frames === 0 && hash === DRAW_HASH) {
    this.states.paused = false;
  }
};

/**
 * Simply redraws the stage synchronous
 */
Poxi.prototype.redraw = function redraw () {
  if (this.events[DRAW_HASH] !== void 0) {
    this.events[DRAW_HASH].fn();
    this.frames++;
  }
};

/**
 * Export the current view to base64 encoded png string
 * @return {String}
 */
Poxi.prototype.exportAsDataUrl = function exportAsDataUrl () {
  var editor = this.editor;
  var batches = editor.batches;
  var bounds = editor.boundings;
  var rx = bounds.x;
  var ry = bounds.y;
  var width = bounds.w;
  var height = bounds.h;
  var ctx = createCanvasBuffer(width, height);
  var view = ctx.canvas;
  var sindex = editor.sindex;
  for (var ii = 0; ii < batches.length; ++ii) {
    var batch = batches[ii];
    // ignore future batches
    if (sindex < ii) { continue; }
    // background
    if (batch.isBackground) {
      ctx.fillStyle = colorToRgbaString(batch.bgcolor);
      ctx.fillRect(
        0, 0,
        view.width, view.height
      );
      continue;
    }
    // buffer
    if (batch.isBuffered) {
      ctx.drawImage(
        batch.buffer.view,
        (batch.x - rx) | 0, (batch.y - ry) | 0,
        batch.width | 0, batch.height | 0
      );
      continue;
    }
    // tiles
    if (batch.tiles.length) {
      var tiles = batch.tiles;
      for (var ii$1 = 0; ii$1 < tiles.length; ++ii$1) {
        var tile = tiles[ii$1];
        var x = (tile.x - rx) | 0;
        var y = (tile.y - ry) | 0;
        var color = colorToRgbaString(tile.colors[tile.cindex]);
        ctx.fillStyle = color;
        ctx.fillRect(
          x, y,
          1, 1
        );
      }
      continue;
    }
  }
  return (view.toDataURL());
};

/**
 * @param {String} kind
 * @param {String} path
 */
Poxi.prototype.addCursor = function addCursor (kind, path) {
    var this$1 = this;

  var cursor = this.cursor;
  // reserve property, so we have access
  // to it even before the image got loaded
  this.cursors[kind] = null;
  loadImageAsCanvas(path, function (canvas) {
    this$1.cursors[kind] = new PIXI.Sprite(PIXI.Texture.fromCanvas(canvas));
  });
};

/**
 * Set active cursor
 * @param {String} kind
 */
prototypeAccessors.activeCursor.set = function (kind) {
  if (this.cursors[kind] !== void 0) {
    this.cursor = kind;
  } else {
    this.cursor = null;
  }
};

Object.defineProperties( Poxi.prototype, prototypeAccessors );

inherit(Poxi, _render);
inherit(Poxi, _generate);

// apply to window
if (typeof window !== "undefined") {
  window.Poxi = Poxi;
} else {
  throw new Error("Please run Poxi inside a browser");
}

})));
