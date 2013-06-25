/*global Raphael, SeedRandom*/
var pl = {};

// -----------------------------------------------------------------------------

pl.util = {
  // Assume it's just max/array with one argument.
  // Inclusive, exclusive
  random: function(min, max) {
    if (min instanceof Array) {
      return min[this.random(min.length)];
    }
    if (min === 'color') {
      return pl.color.vary(
        this.random(
          max ||
            ['#0000FF',
             // '#00FF00',
             '#000000',
             '#FF0000'],
          100));
    }
    if (min === 'direction') {
      return this.random(['up', 'down', 'right', 'left']);
    }
    if (min === undefined &&
        max === undefined) {
      return SeedRandom.random();
    }
    if (min !== undefined &&
        max === undefined) {
      max = min;
      min = 0;
    }
    return (
      Math.floor(
        SeedRandom.random() *
          (max - min)) +
        min);
  },

  rotateArray: function(array, reverse) {
    array = array.slice(0);
    if (reverse) {
      array.push(array.shift());
    } else {
      array.unshift(array.pop());
    }
    return array;
  },

  extend: function(original) {
    Array.prototype.slice
      .call(arguments, 1)
      .forEach(function(mixin) {
        Object.keys(mixin).forEach(function(key) {
          original[key] = mixin[key];
        });
      });
    return original;
  },

  makeTicket: function() {
    var length = 4,
        stringInitial = Math.floor(
          Math.random() * 10000000000)
        .toString(16)
        .toUpperCase();
    if (stringInitial.length > length) {
      return stringInitial.substr(0, length);
    }
    while (stringInitial.length < length) {
      stringInitial = '0' + stringInitial;
    }
    return stringInitial;
  }
};

// -----------------------------------------------------------------------------

pl.color = {
  vary: function(color, intensity) {
    intensity = intensity || 10;
    var m = color.match(/^#([0-9a-f]{6})$/i)[1];
    var parsed = [
      parseInt(m.substr(0,2),16),
      parseInt(m.substr(2,2),16),
      parseInt(m.substr(4,2),16)
    ];
    var processed = parsed.map(
      function(channel) {
        var raw = channel +
              (pl.util.random(intensity * 2) -
               intensity),
            normalized = Math.min(255, Math.max(0, raw));
        return normalized;
      });
    return 'rgb(' + processed[0] + ', ' +
      processed[1] + ', ' +
      processed[2] + ')';
  }
};

// -----------------------------------------------------------------------------

pl.Brush = function(shadowBrush) {
  if (shadowBrush) {
    this.shadowBrush = shadowBrush;
  }
};

pl.Brush.prototype = {
  constructor: pl.Brush,
  point: Object.freeze([0, 0]),
  _offset: Object.freeze([0, 0]),
  zoom: 3,
  directions: Object.freeze(['up', 'right', 'down', 'left']),

  reset: function() {},

  directionTranslate: function(point, length, direction) {
    var table = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];
    var index = this.directions.indexOf(direction);
    point = [
      point[0] + table[index][0] * length,
      point[1] + table[index][1] * length
    ];
    return point;
  },

  adjustPoint: function(point) {
    var x = Math.round(this._offset[0] + this.zoom * point[0]),
        y = Math.round(this._offset[1] + this.zoom * point[1]);
    return [x, y];
  },

  line: function(length, direction) {},
  // Could add a hor, vert format
  move: function(length, direction) {
    this.point = this.directionTranslate(
      this.point, length, direction);
  },

  rotate: function(reverse) {
    this.directions = pl.util.rotateArray(this.directions, reverse);
  },

  drawSequence: function(sequence) {
    var self = this,
        windowCenter = [
      window.innerWidth / 2,
      window.innerHeight / 2 ],
        imageCenter;

    function shadowWalker(pattern) {
      // console.log(pattern);
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              shadowWalker(stamp[1]);
            }
          } else {
            self.shadowBrush[stamp[0]]
              .apply(
                self.shadowBrush,
                stamp.slice(1)
              ); }}); }

    function walker(pattern) {
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              walker(stamp[1]);
            }
          } else {
            self[stamp[0]]
              .apply(
                self,
                stamp.slice(1)
              ); }}); }

    this.reset();
    this.boundaries = undefined;
    this.shadowBrush = this.shadowBrush ||
      new pl.ShadowBrush();
    this.shadowBrush.reset();
    this.shadowBrush.boundaries = undefined;
    shadowWalker(sequence);
    imageCenter = [
      (this.shadowBrush.boundaries[0] +
       this.shadowBrush.boundaries[2]) / 2,
      (this.shadowBrush.boundaries[1] +
       this.shadowBrush.boundaries[3]) / 2
    ];
    // try {

    // } catch (error) {
    //   if ( ! this.shadowBrush.boundaries[0]) {
    //     console.log('blank image');
    //   }
    //   imageCenter = windowCenter;
    // }
    this._offset = [
      windowCenter[0] - imageCenter[0],
      windowCenter[1] - imageCenter[1]];
    walker(sequence);
  },
  init: function() {}
};

// -----------------------------------------------------------------------------

pl.ShadowBrush = function() {};

pl.ShadowBrush.prototype = pl.util.extend(
  new pl.Brush(),
  { constructor: pl.ShadowBrush,
    boundaries: undefined,

    reset: function() {
      this.point = [0, 0];
    },

    trackPoint: function(point) {
      var x = Math.round(this._offset[0] + this.zoom * point[0]),
          y = Math.round(this._offset[1] + this.zoom * point[1]);
      if ( ! this.boundaries) {
        this.boundaries = [x, y, x, y];
      } else {
        this.boundaries[0] = Math.min(this.boundaries[0], x);
        this.boundaries[1] = Math.min(this.boundaries[1], y);
        this.boundaries[2] = Math.max(this.boundaries[2], x);
        this.boundaries[3] = Math.max(this.boundaries[3], y);
      }
      return [x, y];
    },

    circle: function(radius) {
      var newPoint = ([
        this.point[0] - radius,
        this.point[1] - radius]);
      var newPoint2 = ([
        this.point[0] + radius,
        this.point[1] + radius]);
      this.trackPoint(newPoint);
      this.trackPoint(newPoint2);
    },

    rect: function(width, height, style) {
      var adjOldPoint = this.trackPoint(this.point),
          verticalLength = Math.abs(width),
          verticalDirection = (height > 0) ? 'down' : 'up',
          horizontalLength = Math.abs(height),
          horizontalDirection = (width > 0) ? 'right' : 'left';
      this.point = this.directionTranslate(
        this.point,
        horizontalLength,
        horizontalDirection);
      this.point = this.directionTranslate(
        this.point,
        verticalLength,
        verticalDirection);
      this.trackPoint(this.point);
    },

    line: function(length, direction) {
      this.trackPoint(this.point);
      this.move(length, direction);
      this.trackPoint(this.point);
    }

  });

// -----------------------------------------------------------------------------

pl.RaphaelBrush = function() {};

pl.RaphaelBrush.prototype = pl.util.extend(
  new pl.Brush(),
  { constructor: pl.RaphaelBrush,

    init: function() {
      this.paper = new Raphael(
        0, 0,
        window.innerWidth,
        window.innerHeight
      );
    },

    reset: function() {
      this.paper.clear();
      this.paper.setSize(
        window.innerWidth,
        window.innerHeight
      );
      this.point = [0, 0];
    },

    line: function(length, direction, style) {
      var adjOldPoint = this.adjustPoint(this.point);
      this.move(length, direction);
      var adjPoint = this.adjustPoint(this.point);
      var pathString = (
        'M' + adjOldPoint[0] +
          ' ' + adjOldPoint[1] +
          'L' + adjPoint[0] +
          ' ' + adjPoint[1]
      );
      this.paper.path(pathString)
        .attr(style);
    },

    rect: function(width, height, style) {
      var adjOldPoint = this.adjustPoint(this.point),
          verticalLength = Math.abs(width),
          verticalDirection = (height > 0) ? 'down' : 'up',
          horizontalLength = Math.abs(height),
          horizontalDirection = (width > 0) ? 'right' : 'left';

      this.point = this.directionTranslate(
        this.point,
        horizontalLength,
        horizontalDirection);
      this.point = this.directionTranslate(
        this.point,
        verticalLength,
        verticalDirection);
      var adjPoint = this.adjustPoint(this.point);
      var x  = Math.min(adjOldPoint[0], adjPoint[0]),
          y  = Math.min(adjOldPoint[1], adjPoint[1]),
          x2 = Math.max(adjOldPoint[0], adjPoint[0]),
          y2 = Math.max(adjOldPoint[1], adjPoint[1]);

      this.paper.rect(x, y, x2 - x, y2 - y)
        .attr(style);
    },

    circle: function(radius, style) {
      var adjPoint = this.adjustPoint(this.point);
      this.paper.circle(adjPoint[0], adjPoint[1], radius)
        .attr(style);
    }
  }
);

// -----------------------------------------------------------------------------

pl.Generator = function() {};

pl.Generator.prototype = {
  constructor: pl.Generator,
  depth: 5,
  sequencesLength: 17,

  maybeRange: function(thing) {
    if (thing instanceof Array) {
      return pl.util.random(thing);
    } else {
      return thing;
    }},

  maybeCall: function(thing) {
    return (thing instanceof Function) ?
      thing() :
      thing; },

  make: function() {
    var sequences = [],
        random = pl.util.random.bind(pl.util);
    for (var i = 0, iL = this.depth; i < iL; i++) {
      var currentSequence = [];
      for (var j = 0, jL = this.sequencesLength; j < jL; j++) {
        currentSequence.push(pl.sequenceFactory.make());
      }
      if (sequences.length) {
        currentSequence.splice(
          pl.util.random(sequences.length),
          0, [ 2 + random(2) * 2, sequences[0] ]);
      }
      sequences.unshift(currentSequence);
    }
    return [[4, sequences[0]]];
  }
};

// -----------------------------------------------------------------------------

pl.sequenceFactory = {
  random: pl.util.random.bind(pl.util),

  makeMake: function() {
    var self = this,
        wheel = [],
        wheelLength;
    Object.keys(this.recipes)
      .forEach(function(recipeKey) {
        var probability = self.recipes[recipeKey]
            .probability || 1;
        for (var i = 0; i < probability; i++) {
          wheel.push(self.recipes[recipeKey]);
        }
      });
    wheelLength = wheel.length;
    this.make = function() {
      var object = wheel[this.random(wheelLength)],
          result = object.func.call(this);
      return result;
    };
  },

  make: function(/*optional*/ option) {
    this.makeMake();
    return this.make();
  },

  getOptions: function() {
    return Object.keys(this.recipes);
  },

  recipes: {
    rotate: {
      probability: 20,
      maxLength: 0,
      func: function() {
        var random = this.random;
        return ['rotate', !! random(2)];
      }
    },

    move: {
      probability: 30,
      maxLength: 0,
      func: function() {
        var random = this.random;
        return [
          'move',
          random(5, 10),
          random('direction'),
          { 'stroke-width': random(5) }
        ]; }
    },

    line: {
      probability: 20,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'line',
          random(5, 10),
          random('direction'),
          { 'stroke-width': random(5) }
        ]; }
    },

    circle: {
      probability: 5,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'circle',
          random(10),
          { 'stroke-width': 2,
            'fill-opacity': random(),
            'fill': random('color') } ]; }
    },

    ambientRect: {
      probability: 10,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'rect',
          random(-60, 60),
          random(-60, 60),
          { 'stroke-width': random(3),
            'stroke-opacity': random() * 0.5 + 0.1,
            'fill-opacity': random() / 10,
            'fill': random('color') } ]; }
    },

    highlightRect: {
      probability: 10,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return ['rect', random(-10, 10), random(-10, 10),
                { 'stroke-width': 2,
                  'stroke-opacity': 1 ,
                  'fill-opacity': 1,
                  'fill': random('color') }]; }
    },

    snake: {
      probability: 5,
      func: function() {
        var random = this.random,
            blank;
        function makeMove(direction) {
          var type = blank ? 'line' : random(
            ['line', 'move']
          );
          if (type === 'move') blank = true;
          return [
            type,
            random(1, 15),
            direction,
            {'stroke-width': random(1, 5)}];
        }

        var up = makeMove('up'),
            left = makeMove('left'),
            right = left.slice(0);
        right[2] = 'right';
        return [
          random(1, 4),
          [left, up, right, up]
        ]; }
    },

    target: {
      probability: 3,
      func: function() {
        var scale = 4;
        return [
          1,
          [['circle', scale * 1, {'fill': 'black'}],
           ['circle', scale * 2, {'stroke-width': this.random(2)}]
          ]]; }
    },

    racket: {
      probability: 3,
      func: function() {
        var random = this.random;
        var scale = 4;
        return [
          1,
          [['line', random(4, 9),
            random('direction'),
            {'stroke-width': random(1, 4)}],
           ['circle', scale * 2, {'stroke-width': this.random(2)}]
          ]]; }
    },

    equal: {
      probability: 5,
      func: function() {
        var random = this.random;
        var horizSegmentLength = random(1, 1),
            vertSegmentLength = random(1, 15),
            horiz = random(1, 5),
            vert = random(1, 5);
        return [
          1,
          [['line', horizSegmentLength, 'left', {'stroke-width': horiz}],
           ['move', vertSegmentLength, 'up'],
           ['line', horizSegmentLength, 'right', {'stroke-width': horiz}]
          ]]; }
    }

  }
};

// -----------------------------------------------------------------------------

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
})();

(function() {
  var hidden = "hidden";

  function onchange (evt) {
    var v = 'visible', h = 'hidden',
        evtMap = {
          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
        };

    evt = evt || window.event;
    if (evt.type in evtMap)
      document.body.className = evtMap[evt.type];
    else
      document.body.className = this[hidden] ? "hidden" : "visible";
  }

  // Standards:
  if (hidden in document)
    document.addEventListener("visibilitychange", onchange);
  else if ((hidden = "mozHidden") in document)
    document.addEventListener("mozvisibilitychange", onchange);
  else if ((hidden = "webkitHidden") in document)
    document.addEventListener("webkitvisibilitychange", onchange);
  else if ((hidden = "msHidden") in document)
    document.addEventListener("msvisibilitychange", onchange);
  // IE 9 and lower:
  else if ('onfocusin' in document)
    document.onfocusin = document.onfocusout = onchange;
  // All others:
  else
    window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

})();

// -----------------------------------------------------------------------------

var generator = new pl.Generator(),
    sequences,
    ticket,
    brush = new pl.RaphaelBrush();

brush.init();

var zoomLevel = 0,
    zoomSpeed = 5;

function zoom() {
  zoomLevel++;
  window.requestAnimFrame(zoom);
  brush.paper.setViewBox(
    zoomLevel * zoomSpeed,
    zoomLevel * zoomSpeed,
    window.innerWidth - zoomLevel * 2 * zoomSpeed,
    window.innerHeight - zoomLevel * 2 * zoomSpeed,
    true
  );
}

function refresh() {
  setTimeout(refresh, 2000);
  if (document.body.className !== 'hidden') {
    ticket = pl.util.makeTicket();
    sequences = generator.make();
    zoomLevel = 0;
    brush.drawSequence(sequences);
    document.getElementById('ticket-label')
      .innerHTML = ticket;
  }
}

// (function () {
//   SeedRandom.seed('test');
//   sequences = generator.make();
//   brush.drawSequence(sequences);
// } ());

refresh();
// Uncomment on a fast machine
// zoom();
