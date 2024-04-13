var beziers = [];
var mapped_beziers = [];
var beziers_changed = false;
var steps = [];
var mapped_steps = [];
var steps_changed = false;
var jnd_step_ranges = [];
var using_jnds = false;
var outputParameterInfo = {};

var selectedPoint = null;
var selectedStep = null;

var inputPoint = null;

var isVisibleTemplate = false;

var bounds = {};

var sc = 1.0;
var tr = new p5.Vector(0.0, 0.0);

var axis=undefined;

const CURVE_TYPES = {
  BEZIER: 'Bezier',
  STEPS: 'Steps'
}
var current_curve_type = CURVE_TYPES.BEZIER;

var additional_messages_in_update = []; 

function setup() {
  createCanvas(windowWidth*0.999, windowHeight*0.999);
  bounds = createBounds();
  
  setInitialBeziers();
  setInitialSteps();

  // Establish Communication with iframe parent
  window.addEventListener('message', receivedMessageFromParent);
  sendMessageToParent('Loaded');

  noLoop();
  rectMode(CORNERS);
}

function windowResized() {
  resizeCanvas(windowWidth*0.999, windowHeight*0.999);
  // bounds = createBounds();
  resizeBeziers();
  resizeSteps();
}

function resizeBeziers() {
  beziers = unmapBeziers(mapped_beziers);
}

function resizeSteps() {
  steps = unmapSteps(mapped_steps);
}

function draw() {
  translate(tr);
  scale(sc);
  background(100);
  
  drawAxes();
  drawBounds();

  drawTemplate();
  drawCurve();

  drawInputPoint();
}

function drawCurve() {
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER:
      drawBeziers();
      break;
    case CURVE_TYPES.STEPS:
      drawSteps();
      break;
  }
}

function drawBeziers() {
  const numSteps = 200;
  const numStepsPerBezier = numSteps / beziers.length;
  beziers.forEach(bez => {
    drawQuadraticBezierCurve(bez, numStepsPerBezier);
  })
  if (selectedPoint) {
    fill(255, 0, 255);
    getSelectedPoints().forEach(pt => {
      circle(pt.x, pt.y, 10*bounds.unit);
    })
  }
}

function drawSteps() {
  stroke(0);
  if (current_curve_type == CURVE_TYPES.STEPS) {
    strokeWeight(2*bounds.unit);
  } else {
    strokeWeight(1*bounds.unit);
  }
  if (steps.length < 2) {
    line(bounds.west, bounds.center_y, bounds.east, bounds.center_y);
    return;
  }

  let pt1, pt2;
  for (let i = 1; i < steps.length; i++) {
    pt1 = steps[i-1];
    pt2 = steps[i];
    line(pt1.x, pt1.y, pt2.x, pt1.y);
    line(pt2.x, pt1.y, pt2.x, pt2.y);
  }
  line(pt2.x, pt2.y, bounds.east, pt2.y);

  if (using_jnds && !(isVisibleTemplate && current_curve_type == CURVE_TYPES.BEZIER))
    drawJNDStepRanges();
}

function drawJNDStepRanges() {
  fill(0,255,0,50);
  noStroke();

  let pt1, pt2;
  for (let i = 0; i < steps.length; i++) {
    pt1 = steps[i];
    if (i+1 < steps.length) {
      pt2 = steps[i+1];
    } else {
      pt2 = {
        x: bounds.east,
        y: steps[i].y
      }
    }
    rect(pt1.x, jnd_step_ranges[i].min, pt2.x, jnd_step_ranges[i].max);
    if (pt1.y > jnd_step_ranges[i].min || pt1.y < jnd_step_ranges[i].max) {
      push();
      fill(255, 0, 0, 100);
      
      if (pt1.y > jnd_step_ranges[i].min) {
        rect(pt1.x, pt1.y, pt2.x, jnd_step_ranges[i].min);
      } else {
        rect(pt1.x, pt1.y, pt2.x, jnd_step_ranges[i].max);
      }

      stroke(255, 0, 0);
      strokeWeight(2*bounds.unit);
      line(pt1.x, pt1.y, pt2.x, pt1.y);

      pop();
    }
  }
}

function drawInputPoint() {
  let pt = getInputPoint();
  if (pt) {
    noStroke();
    fill(0, 0, 255);
    circle(pt.x, pt.y, 10*bounds.unit)
  }
}

function drawTemplate() {
  if (isVisibleTemplate && current_curve_type != CURVE_TYPES.STEPS) {
    drawSteps();
  }
}

function setTemplate() {
  // in the future, you can maybe add functionality to save whatever curve there currently is as a template
  // for now, just using whatever is currently set as steps as the template
}

function showTemplate() {
  isVisibleTemplate = true;
  update();
}

function hideTemplate() {
  isVisibleTemplate = false;
  update();
}

function drawAxes() {
  const CUSHION = width/100/sc;

  const TOP_LEFT = transformVector(createVector(0,0));
  const BOTTOM_RIGHT = transformVector(createVector(width, height));

  const TOP = TOP_LEFT.y;
  const LEFT = TOP_LEFT.x;
  const BOTTOM = BOTTOM_RIGHT.y;
  const RIGHT = BOTTOM_RIGHT.x;

  const STEP_HORIZONTAL = (bounds.east-bounds.west)/10;
  const STEP_VERTICAL = (bounds.south-bounds.north)/10;

  stroke(0, 50);
  strokeWeight(1/sc*bounds.unit);
  const START_X = bounds.west+STEP_HORIZONTAL*floor((LEFT-bounds.west)/STEP_HORIZONTAL);
  for (let x = START_X; x < RIGHT+CUSHION; x+=STEP_HORIZONTAL) {
    line(x, TOP, x, BOTTOM);
  }
  const START_Y = bounds.north+STEP_VERTICAL*floor((TOP-bounds.north)/STEP_VERTICAL);
  for (let y = START_Y; y < BOTTOM+CUSHION; y+=STEP_VERTICAL) {
    line(LEFT, y, RIGHT, y);
  }

  labelCorners();
}

function labelCorners() {
  fill(0);
  textSize(16*bounds.unit);
  const range = getUIInputRange();
  let bottom_left_text, top_right_text;
  if (!range) {
    bottom_left_text = "(0,0)";
    top_right_text = "(1,1)";
  } else {
    bottom_left_text = `(${range.input.min},${range.output.min})`
    top_right_text = `(${range.input.max},${range.output.max})`
  }

  textAlign(RIGHT, TOP);
  text(bottom_left_text, bounds.west-bounds.unit*5, bounds.south);
  textAlign(LEFT, BOTTOM);
  text(top_right_text, bounds.east+bounds.unit*5, bounds.north);
}

function drawBounds() {
  stroke(0);
  strokeWeight(1*bounds.unit);
  line(bounds.west, bounds.north, bounds.east, bounds.north);
  line(bounds.east, bounds.north, bounds.east, bounds.south);
  line(bounds.east, bounds.south, bounds.west, bounds.south);
  line(bounds.west, bounds.south, bounds.west, bounds.north);
}

function createBounds() {

  const center_x = width/2;
  const center_y = height/2;

  const min_axis = min(width, height);

  const unit = min_axis / 330;

  const cushion = 20*unit;

  const min_range = min_axis - cushion*2;

  const north = center_y-min_range/2;
  const east = center_x+min_range/2;
  const south = center_y+min_range/2;
  const west = center_x-min_range/2;
  return {
    'north': north,
    'east': east,
    'south': south,
    'west': west,
    'center_x': center_x,
    'center_y': center_y,
    'unit':  unit, // for certain sizes
  }
}

function setInitialBeziers() {
  mapped_beziers = [
    {
      'a': createVector(0, 0),
      'b': createVector(0.5, 1),
      'c': createVector(1, 1)
    }
  ]
  beziers = unmapBeziers(mapped_beziers);
}

function setInitialSteps() {
  setLinearSteps(5);
}
function mousePressed(e) {
  const mouse = mouseVector();
  const transformedMouse = transformVector(mouse);

  if (mouseButton == RIGHT)
    return rightMousePressed(mouse, transformedMouse);

  // drag canvas
  if (keyIsPressed && key == ' ')
    return cursor(HAND);
    
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER :
      selectPoint(transformedMouse);
      if (!getSelectedPoints().length) {
        addBezier(transformedMouse);
      }
      break;
    case CURVE_TYPES.STEPS :
      selectStep(transformedMouse);
      break;
  }
  
  // drag canvas
  if (selectedStep == null && selectedPoint == null)
    return cursor(HAND);

  // updates
  update();
}

function selectPoint(pt) {
  const select_radius = 20;
  let closest;
  beziers.forEach((bez, i) => {
    ['a', 'b', 'c'].forEach(id => {
      const pt2 = bez[id];
      const d = pt.dist(pt2);
      if (!closest || d < closest.d) {
        closest = {
          d: d,
          i: i,
          id: id
        }
      }
      
    });
  });
  if (closest.d < select_radius) {
    return setSelectedPoint({
      'i': closest.i,
      'id': closest.id
    });
  }
  return noSelectedPoint();
}

function rightMousePressed(mouse, transformedMouse) {
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER :
      selectPoint(transformedMouse);
      deletePoint(selectedPoint);
      noSelectedPoint();
      update();
      break;
  }
}

function addBezier(near_pt, numSteps=100) {
  const step = 1/numSteps;
  let min_dist = Number.MAX_SAFE_INTEGER;
  let closest = null;
  const add_radius = 20;
  for (let i = 0; i < beziers.length; i++) {
    let bez = beziers[i];
    for (let t = 0; t < 1; t+=step) {
      const f = get_point_along_bezier(bez, t);
      const distance = f.dist(near_pt)
      if (distance < min_dist) {
        min_dist = distance;
        closest = {
          'i': i,
          't': t
        }
      }
    }
  }
  if (min_dist < add_radius) {
    const bez = beziers[closest.i];
    const pt = get_point_along_bezier(bez, closest.t);
    bs = get_bs_split_bezier(bez, closest.t);
    const bez2 = bez; // should be copy
    const bez1 = copyBezier(bez2); // should NOT be copy
    bez1.c = pt.copy();
    bez1.b = bs.b1;
    bez2.a = pt.copy();
    bez2.b = bs.b2;
    beziers.splice(closest.i, 0, bez1);
    selectPoint(pt);
  }
}

function get_point_along_bezier(bez, t) {
  return get_point_along_quadratic_bezier(bez.a, bez.b, bez.c, t);
}

function get_point_along_linear_bezier(a, b, t) {
  return p5.Vector.lerp(a, b, t);
}

function get_point_along_quadratic_bezier(a, b, c, t) {
  return get_point_along_linear_bezier(
    get_point_along_linear_bezier(a, b, t),
    get_point_along_linear_bezier(b, c, t),
    t
  );
}

function get_point_along_cubic_bezier(a, b, c, d, t) {
  return get_point_along_linear_bezier(
    get_point_along_quadratic_bezier(a, b, c, t),
    get_point_along_quadratic_bezier(b, c, d, t),
    t
  );
}

function get_bs_split_bezier(bez, t) {
  // tangent = tangent line to bezier at f
  // b1 = where tangent crosses a→b
  // b2 = where tangent crosses b→c

  const a = bez.a;
  const b = bez.b;
  const c = bez.c;

  // d = a+t×(b-a)
  const d = addVectors(a, subVectors(b, a).mult(t));
  // e = b+t×(c-b)
  const e = addVectors(b, subVectors(c, b).mult(t));

  return {
    'b1': d,
    'b2': e
  }
}

function mouseReleased() {
  cursor(ARROW);
  noSelectedPoint();
  noSelectedStep();
  // updates
  update();
}

function mouseDragged(e) {
  e.preventDefault();
  const mouse = mouseVector();
  const transformedMouse = transformVector(mouse);
  if (mouseButton === RIGHT)
    return;
  if (keyIsPressed && key == ' ' || (selectedStep == null && selectedPoint == null)) {
    translateCanvas(createVector(e.movementX, e.movementY));
    redraw();
    return;
  } else {
    switch (current_curve_type) {
      case CURVE_TYPES.BEZIER:
        dragPoints(transformedMouse);
        break;
      case CURVE_TYPES.STEPS:
        dragStep(transformedMouse);
        break;
    }
  }
  // updates
  update();
}

function mouseWheel(e) {
  if (document.activeElement.tagName == 'INPUT')
    return;
  sc -= e.delta/1000;
  redraw();
}

function mouseVector() {
  return createVector(mouseX, mouseY);
}

function transformVector(vec) {
  const transformed = vec.copy();
  transformed.sub(tr);
  transformed.mult(1/sc);
  return transformed;
}

function untransformVector(vec) {
  const untransformed = vec.copy();
  untransformed.mult(sc);
  untransformed.add(tr);
  return untransformed;
}

function translateCanvas(translationVec) {
  tr.add(translationVec);
}

function dragPoints(pt) {
  updatePoints(getSelectedPoints(), pt);
}

// joins two adjacent beziers
function deletePoint(pt) {
  if (!pt)
    return;
  if (pt.id != 'a' && pt.id != 'c')
    return;
  const is_min = pt.id === 'a';
  // can't delete left or right endpoints
  if (is_min && pt.i === 0)
    return;
  if (!is_min && pt.i === beziers.length-1)
    return;
  const index1 = is_min ? pt.i-1 : pt.i;
  const index2 = index1+1;
  const bez1 = beziers[index1];
  const bez2 = beziers[index2];

  const dir_intersection = directed_intersection(bez1.a, bez1.b, bez2.c, bez2.b);

  let new_b;  
  if (dir_intersection.between) {
    new_b = dir_intersection.intersection_point;
  } else {
    new_b = get_point_along_linear_bezier(bez1.b, bez2.b, 0.5);
  }
  
  // delete bez1
  beziers.splice(index1, 1);
  // bez ← bez2
  const bez = bez2;

  // bez gets left endpoint from bez1
  bez.a = bez1.a;
  // bez gets right endpoint from bez2
  /* bez.c ← bez2.c (bez already = bez2) */

  // bez gets b point from new_b
  updatePoints([bez.b], new_b);
}

// shift points to pt
function updatePoints(points, pt) {
  if (!points)
    return;
  const new_beziers = copyBeziers(beziers);
  let min_bez_info, max_bez_info;
  pt = constrainPointToBounds(pt);
  points.forEach(pti => {
    const bezInfo = getBezierFromPoint(pti);
    const new_pt = new_beziers[bezInfo.i][bezInfo.id];
    const to_pt = pt;
    // constrain new point to between adjacent control points to maintain monotonicity in x-direction 
    if (bezInfo.id === 'b') {
      to_pt.x = constrain(to_pt.x, new_beziers[bezInfo.i].a.x, new_beziers[bezInfo.i].c.x);
    } else {
      let l_bound, r_bound;
      if (bezInfo.id === 'a') {
        r_bound = new_beziers[bezInfo.i].c.x;
        if (bezInfo.i-1 >= 0) {
          l_bound = new_beziers[bezInfo.i-1].a.x;
        } else {
          l_bound = bounds.west;
        }
      } else if (bezInfo.id === 'c') { 
        l_bound = new_beziers[bezInfo.i].a.x;
        if (bezInfo.i+1 <= new_beziers.length-1) {
          r_bound = new_beziers[bezInfo.i+1].c.x;
        } else {
          r_bound = bounds.east;
        }
      }      
      to_pt.x = constrain(to_pt.x, l_bound, r_bound);
    }
    // update endpoint
    // can be a bit slow, I'm not sure what the best way to speed this up would be
    if (bezInfo.i == 0 && bezInfo.id == 'a' ||
        bezInfo.i == new_beziers.length - 1 && bezInfo.id == 'c') {
        additional_messages_in_update.push({
          title: 'Endpoint',
          content: {
            end: bezInfo.id === 'a' ? 'min' : 'max',
            y: mapVector(new_pt).y
          }
        });
    }
    if (bezInfo.id != 'b') {
      shiftBPointWithEndPoint(bezInfo.i, bezInfo.id, pt, new_beziers);
      new_pt.x = pt.x;
      new_pt.y = pt.y;
    } else {
      new_pt.x = pt.x;
      new_pt.y = pt.y;
    }
    constrainBezierPoints(bezInfo.i, new_beziers);
    if (!min_bez_info || bezInfo.i < min_bez_info.i) {
      min_bez_info = bezInfo;
    }
    if (!max_bez_info || bezInfo.i > max_bez_info.i) {
      max_bez_info = bezInfo;
    }
  });
  straightenNeighboringBPoint(min_bez_info.i-1, min_bez_info.i, new_beziers);
  straightenNeighboringBPoint(max_bez_info.i+1, max_bez_info.i, new_beziers);

  // bound endpoints in x-direction
  new_beziers[0].a.x = bounds.west;
  new_beziers[new_beziers.length-1].c.x = bounds.east;
  // bound endpoints in y-direction
  new_beziers[0].a.y = constrain(new_beziers[0].a.y, bounds.north, bounds.south);
  new_beziers[new_beziers.length-1].c.y = constrain(new_beziers[new_beziers.length-1].c.y, bounds.north, bounds.south);

  beziers = new_beziers
  mapped_beziers = mapBeziers(beziers);
}

function intersection(a, b, c, d) {
  let denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  
  if (denominator == 0) // parallel
    return c;
  
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  
  return createVector(
    a.x + t * (b.x - a.x),
    a.y + t * (b.y - a.y)
  );
}

function directed_intersection(seg1_from, seg1_to, seg2_from, seg2_to) {
  const denominator1 = (seg1_to.x - seg1_from.x) * (seg2_to.y - seg2_from.y) - (seg1_to.y - seg1_from.y) * (seg2_to.x - seg2_from.x);
  const denominator2 = -denominator1;
  
  const _orientations = {
    BETWEEN: 'between',
    OVER_SEGMENT: 'over',
    OVER_SEG1: 'over_seg1',
    OVER_SEG2: 'over_seg2',
    BEHIND: 'behind',
  }

  if (denominator1 == denominator2) // parallel (denominators 0)
    return {}
  
  const t = ((seg2_from.x - seg1_from.x) * (seg2_to.y - seg2_from.y) - (seg2_from.y - seg1_from.y) * (seg2_to.x - seg2_from.x)) / denominator1;

  const t2 = ((seg1_from.x - seg2_from.x) * (seg1_to.y - seg1_from.y) - (seg1_from.y - seg2_from.y) * (seg1_to.x - seg1_from.x)) / (-denominator1);
  
  const pt = createVector(
    seg1_from.x + t * (seg1_to.x - seg1_from.x),
    seg1_from.y + t * (seg1_to.y - seg1_from.y)
  );

  let orientation;
  if (t > 1 && t2 > 1) {
    orientation = _orientations.BETWEEN;
  } else if (t >= 0 && t <= 1) {
    orientation = _orientations.OVER_SEG1;
  } else if (t2 >= 0 && t2 <= 1) {
    orientation = _orientations.OVER_SEG2;
  } else if (t < 0 || t2 < 0) {
    orientation = _orientations.BEHIND;
  }
  
  return {
    intersection_point: pt,
    between: orientation === _orientations.BETWEEN,
    over_segment: orientation === _orientations.OVER_SEG1 || orientation === _orientations.OVER_SEG2,
    over_seg1: orientation === _orientations.OVER_SEG1,
    over_seg2: orientation === _orientations.OVER_SEG2,
    behind: orientation === _orientations.BEHIND,
  };
}


// Shift B Point with Same Vector that Shifts End Point
function shiftBPointWithEndPoint(i, id, to_pt, beziers) {
  if ((i == 0 && id == 'a') || (i == beziers.length-1 && id == 'c'))
    return;
  const bez = beziers[i];
  const pt = bez[id];
  const b_pt = bez.b;
  const diff_vector = p5.Vector.sub(to_pt, pt);
  let b_to_pt = p5.Vector.add(b_pt, diff_vector);

  // bound to between endpoints
  let intersection_pt1, intersection_pt2;
  
  if (id === 'c') {
    b_to_pt.x = Math.min(b_to_pt.x, pt.x); // shouldn't be moving to the wrong side of the shifting endpoint; if it does, that's a small error, and further error handling makes the curve go wonky.
    if (i+1 <= beziers.length-1) {
      intersection_pt1 = beziers[i+1].b;
    } else {
      // this is a strange case that I don't think should come up, but if it does this should be a good enough solution
      intersection_pt1 = b_to_pt;
    }
    intersection_pt2 = bez.c;
  } else if (id === 'a') {
    b_to_pt.x = Math.max(b_to_pt.x, pt.x); // shouldn't be moving to the wrong side of the shifting endpoint; if it does, that's a small error, and further error handling makes the curve go wonky.
    if (i-1 >= 0) {
      intersection_pt1 = beziers[i-1].b;
    } else {
      // this is a strange case that I don't think should come up, but if it does this should be a good enough solution
      intersection_pt1 = b_to_pt;
    }
    intersection_pt2 = bez.a;
  }
  b_to_pt = boundPointToEndpoints(b_to_pt, bez.a, bez.c, intersection_pt1, intersection_pt2);
  // if (b_to_pt.x < bez.a.x || b_to_pt.x > bez.c.x) {
  //   // need to constrain b point to between endpoints
  // }
  // // if (b_to_pt.x < bez.a.x) {
  // //   b_to_pt.x = bez.a.x;
  // // } else if (b_to_pt.x > bez.c.x) {
  // //   b_to_pt.x = bez.c.x;
  // // }

  // bound in y-direction
  b_to_pt = boundBPointInYDirection(b_to_pt, pt);

  pt.x = to_pt.x;
  pt.y = to_pt.y;
  b_pt.x = b_to_pt.x;
  b_pt.y = b_to_pt.y;
}


function straightenNeighboringBPoint(straighten, control, beziers) {
  if (straighten < 0 || straighten > beziers.length - 1)
    return;
  if (straighten <= 0 || straighten >= beziers.length - 1)
    return straightenBPointRetainMagnitude(straighten, control, beziers);

  let needs_recurse = false;

  const straighten_bez = beziers[straighten];
  const straighten_pt = straighten_bez.b;

  const control_bez = beziers[control];
  const control_pt = control_bez.b;

  const inflection_pt = straighten > control ? straighten_bez.a : straighten_bez.c;

  const lay_pt = straighten > control ? straighten_bez.c : straighten_bez.a;
  
  const a = control_pt;
  const b = inflection_pt;
  const c = straighten_pt;
  const d = lay_pt;

  const min_mag = 10;

  let new_pt;
  const epsilon = 2**-10;
  if (Math.abs(inflection_pt.x - control_pt.x) < epsilon) {
    const current_mag = p5.Vector.sub(inflection_pt, straighten_pt).mag();
    const mag = Math.max(current_mag, min_mag);
    const y_dir = Math.sign(inflection_pt.y - control_pt.y);
    new_pt = createVector(
      inflection_pt.x,
      inflection_pt.y + y_dir*mag
    );
    needs_recurse = true;
  } else {
    new_pt = intersection(a, b, c, d);
  }

  // maintain monotonicity in the x-direction
  if (new_pt.x-epsilon < straighten_bez.a.x || new_pt.x+epsilon > straighten_bez.c.x) {
    new_pt = boundPointToEndpoints(new_pt, straighten_bez.a, straighten_bez.c, control_pt, inflection_pt);
    needs_recurse = true;
  }

  // edge cases sometimes result in the point being placed on one of its endpoints
  if (p5.Vector.sub(new_pt, inflection_pt).mag() < epsilon) {
    new_pt = straightenBPointRetainMagnitude(straighten, control, beziers);
  }

  // bound point in y-direction
  const y_bounded = boundBPointInYDirection(new_pt, control_pt);
  if (p5.Vector.sub(new_pt, y_bounded).mag() > epsilon) {
    new_pt = y_bounded;
    needs_recurse = true;
  }

  straighten_pt.x = new_pt.x;
  straighten_pt.y = new_pt.y;

  if (needs_recurse)
    straightenNeighboringBPoint(straighten+(straighten-control), straighten, beziers);
}


function straightenBPointRetainMagnitude(straighten, control, beziers) {
  const straighten_bez = beziers[straighten];
  const straighten_pt = straighten_bez.b;

  const control_bez = beziers[control];
  const control_pt = control_bez.b;

  const inflection_pt = straighten < control ? control_bez.a : control_bez.c;

  const epsilon = 2**-10;

  // Calculate Updated Point (Across from Inflection Point)
  const mag = p5.Vector.sub(straighten_pt, inflection_pt).mag();
  const dir = p5.Vector.sub(inflection_pt, control_pt).setMag(mag);
  let new_pt;
  if (Math.abs(inflection_pt.x - control_pt.x) < epsilon) {
    const y_dir = Math.sign(inflection_pt.y - control_pt.y)
    new_pt = createVector(
      inflection_pt.x,
      inflection_pt.y + y_dir*mag
    );
  } else {
    new_pt = p5.Vector.add(inflection_pt, dir);
  }

  // bound to between endpoints
  new_pt = boundPointToEndpoints(new_pt, straighten_bez.a, straighten_bez.c, control_pt, inflection_pt);  

  // bound in y-direction
  new_pt = boundBPointInYDirection(new_pt, control_pt);

  // Update Point
  straighten_pt.x = new_pt.x;
  straighten_pt.y = new_pt.y;
  return new_pt;
}

function boundPointToEndpoints(b, a, c, intersection_pt1, intersection_pt2) {
  // maintain monotonicity in x-direction
  if (b.x < a.x) {
    // passed over left side of bez
    // place at intersection between intersection_pt1, intersection_pt2, and vertical line through left point
    b = intersection(intersection_pt1, intersection_pt2, createVector(a.x, 0), createVector(a.x, 1));
  } else if (b.x > c.x) {
    // passed over right side of bez
    // place at intersection between intersection_pt1, intersection_pt2, and vertical line through right point
    b = intersection(intersection_pt1, intersection_pt2, createVector(c.x, 0), createVector(c.x, 1));
  }
  return b;
}

function boundBPointInYDirection(pt, control_pt) {
  const y_min = bounds.north;
  const y_max = bounds.south;

  let bounded_pt = pt;
  if (pt.y > y_max || pt.y < y_min) {
    let y_val;
    if (pt.y > y_max) {
      y_val = y_max;
    } else {
      y_val = y_min;
    }
    // horizontal line at y_val
    // It would be more semantically accurate to have this be the true right bound, but I just need the line that travels horizontally at y_val, and therefore passes through any two points with different x-values and the same y-value = y_val
    const left = createVector(
      0,
      y_val 
    );
    const right = createVector(
      1,  
      y_val
    );
    // line passing through control pt and inflection pt
    const intersection_pt1 = control_pt;
    const intersection_pt2 = pt;
    // intersection between horizontal + line passing through control pt and inflection pt
    bounded_pt = intersection(left, right, intersection_pt1, intersection_pt2);
  }
  return bounded_pt;
}

// Recursively shift 'B' points in each bezier to maintain straight connections between curves
function recursiveStraightenBPoints(i, prev_pt, right=undefined) {
  // Exit Case
  if (i < 0 || i > beziers.length-1)
    return;

  const current_bez = beziers[i];
  const current_pt = current_bez.b;

  const inflection_pt = right ? current_bez.a : current_bez.c;

  // Calculate Updated Point (Across from Inflection Point)
  const mag = p5.Vector.sub(current_pt, inflection_pt).mag();
  const dir = p5.Vector.sub(inflection_pt, prev_pt).setMag(mag);
  const new_pt = p5.Vector.add(inflection_pt, dir);
  // Update Point
  current_pt.x = new_pt.x;
  current_pt.y = new_pt.y;

  // Recurse
  const next_i = right ? i-1 : i+1;
  recursiveStraightenBPoints(next_i, new_pt, right);
}

function getBezierFromPoint(pt) {
  for (let i = 0; i < beziers.length; i++) {
    const bez = beziers[i];
    for (let id of ['a', 'b', 'c']) {
      if (bez[id] == pt) {
        return {
          'i': i,
          'id': id,
        }
      }
    }
  }
  return {
    'i': -1,
    'id': -1,
  }
}

function getSelectedPoints() {
  if (!selectedPoint)
    return [];
  const i = selectedPoint.i;
  const id = selectedPoint.id;
  let selectedPoints = [];
  selectedPoints.push(beziers[i][id]);
  if (id == 'a') {
    if (i-1 >= 0) {
      selectedPoints.push(beziers[i-1]['c']);
    }
  } else if (id == 'c') {
    if (i+1 < beziers.length) {
      selectedPoints.push(beziers[i+1]['a']);
    }
  }
  return selectedPoints;
}

function setSelectedPoint(pt) {
  selectedPoint = pt;
}

function noSelectedPoint() {
  setSelectedPoint(null);
}

function isPoint(pt) {
  return !!pt && typeof pt.x == 'number' && typeof pt.y == 'number';
}

function slope(pt1, pt2) {
  return (pt2.y - pt1.y) / (pt2.x - pt1.x);
}

function drawQuadraticBezierCurve(bez, numSteps = 100) {
  const step = 1/numSteps; 

  const a = bez.a;
  const b = bez.b;
  const c = bez.c;

  // draw curve
  stroke(255);
  strokeWeight(1.5*bounds.unit);
  let last_f = get_point_along_bezier(bez, 0);
  for (let t = step; t < 1; t+=step) {
    const f = get_point_along_bezier(bez, t)
    line(last_f.x, last_f.y, f.x, f.y)
    last_f = f;
  }
  // draw control points + connecting lines
  fill(255);
  stroke(0);
  strokeWeight(0.3*bounds.unit);
  line(a.x, a.y, b.x, b.y);
  line(c.x, c.y, b.x, b.y);
  fill(255);
  circle(b.x, b.y, 7*bounds.unit);
  fill(255, 0, 0);
  circle(a.x, a.y, 7*bounds.unit);
  circle(c.x, c.y, 7*bounds.unit);
}

function addVectors(a, b) {
  return a.copy().add(b)
}

function subVectors(a, b) {
  return a.copy().sub(b)
}

function multVectors(a, b) {
  return a.copy().mult(b)
}

function copyBezier(bez) {
  return {
    'a': bez.a.copy(),
    'b': bez.b.copy(),
    'c': bez.c.copy()
  };
}

function copyBeziers(beziers) {
  const new_beziers = Array(beziers.length);
  for (let i = 0; i < new_beziers.length; i++) {
    new_beziers[i] = copyBezier(beziers[i]);
  }
  return new_beziers;
}

function getUIInputRange() {
  return;
}

function getInputPoint() {
  return inputPoint;
}

function updateInputPoint(inputPointInformation) {
  const mapped_x = inputPointInformation.x;
  const unmapped_x = unmapX(mapped_x);
  inputPoint = createVector(unmapped_x, getValueOnCurve(unmapped_x));
  redraw();
}

function recalculateInputPoint() {
  if (inputPoint)
    inputPoint.y = getValueOnCurve(inputPoint.x);
}

function getValueOnCurve(x) {
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER :
      return getValueOnBeziers(x);
    case CURVE_TYPES.STEPS :
      return getValueOnSteps(x);
  }
}


function getValueOnBeziers(x) {
  let bez;
  beziers.forEach(bezi => {
    if (bezi.a.x <= x && bezi.c.x >= x)
      bez = bezi;
  });
  if (!bez)
    return 0;
  // get y - should be able to get exact val algebraically, just don't feel like mathing atm
  let best = get_point_along_bezier(bez, 0);
  const numSteps = 100;
  const step = 1/numSteps;
  for (let t = step; t < 1; t += step) {
    const f = get_point_along_bezier(bez, t);
    if (Math.abs(x-f.x) < Math.abs(x-best.x))
      best = f;
  }
  const y = best.y;
  return y;
}

function getValueOnSteps(x) {
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].x > x) {
      return steps[i-1].y;
    }
  }
  return steps[steps.length-1].y;
}

// update all ui elements that may need to be updated
function update() {
  recalculateInputPoint();
  updateParent();
  redraw();
}

function constrainPointToBounds(pt) {
  return createVector(
    constrain(pt.x, bounds.west, bounds.east),
    constrain(pt.y, bounds.north, bounds.south),
  );
}

// b.x ∈ [a.x, c.x]
function constrainBPoint(bez) {
  bez.b.x = constrain(bez.b.x, bez.a.x, bez.c.x);
}

// a.x < c.x < a.x
function constrainEndPoints(i) {
  const bez = beziers[i];
  bez.a.x = Math.min(bez.a.x, bez.c.x);
  bez.c.x = Math.max(bez.a.x, bez.c.x);
  if (i-1 >= 0)
    bez.c.x = Math.min(bez.c.x, beziers[i-1].a.x);
  if (i+1 <= beziers.length-1)
    bez.a.x = Math.max(bez.a.x, beziers[i+1].c.x);
}

// Does NOT Include Global Bound Checking
function constrainBezierPoints(i, beziers) {
  // constrainBPoint(beziers[i]);
  // constrainEndPoints(i);
}

/* Communication with iframe parent */

function sendMessageToParent(title, content='') {
  window.parent.postMessage({
    editor_source: true,
    source: axis,
    title: title,
    content: content,
  }, '*');
}

function receivedMessageFromParent(event) {
  if (!event || !event.data || !event.data.editor_source) 
    return;
  const content = event.data.content;
  switch (event.data.title) {
    case 'axis':
      axis = content;
      updateParent();
      break;
    case 'Curve Type':
      updateCurveType(content);
      break;
    case 'Step Count':
      updateStepCount(content);
      update();
      break;
    case 'Update Endpoint':
      updateEndpoint(content);
      break;
    case 'Update Input Point':
      updateInputPoint(content);
      break;
    case 'Show Template':
      setTemplate();
      showTemplate();
      break;
    case 'Hide Template':
      hideTemplate();
      break;
    case 'Horizontally Invert':
      invertHorizontal();
      break;
    case 'Output Parameter Information':
      setOutputParameterInfo(content);
      break;
  }
}

function updateParent() {
  sendMessageToParent("Axis Updated", {
    curve_info: getCurveInfo(),
    additional_messages: additional_messages_in_update
  });
  additional_messages_in_update = [];
}

function getCurveInfo() {
  let data;
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER:
      data = getBezierData();
      break;
    case CURVE_TYPES.STEPS:
      data = getStepData();
      break;
  }
  return {
    type: current_curve_type,
    data: data
  };
}

function getBezierData() {
  let bezData = Array(mapped_beziers.length);
  for (let i = 0; i < bezData.length; i++) {
    bezData[i] = {
      a: vectorToObject(mapped_beziers[i].a),
      b: vectorToObject(mapped_beziers[i].b),
      c: vectorToObject(mapped_beziers[i].c),
    }
  }
  return bezData;
}

function getStepData() {
  let stepData = Array(mapped_steps.length);
  for (let i = 0; i < stepData.length; i++) {
    stepData[i] = vectorToObject(mapped_steps[i]);
  }
  return stepData;
}

function mapPoint(pt, from1, to1, from2, to2) {
  const mapped_x = map(pt.x, from1.x, to1.x, from2.x, to2.x);
  const mapped_y = map(pt.y, from1.y, to1.y, from2.y, to2.y);
  return createVector(mapped_x, mapped_y);
}

function mapX(unmapped_x) {
  return map(unmapped_x, bounds.west, bounds.east, 0, 1);
}

function mapY(unmapped_y) {
  return map(unmapped_y, bounds.south, bounds.north, 0, 1);
}

function mapVector(vec) {
  const from1 = createVector(
    bounds.west,
    bounds.south
  );
  const to1 = createVector(
    bounds.east,
    bounds.north
  );
  const from2 = createVector(
    0,
    0
  );
  const to2 = createVector(
    1,
    1
  );
  return mapPoint(vec, from1, to1, from2, to2);
}

function unmapX(mapped_x) {
  return map(mapped_x, 0, 1, bounds.west, bounds.east);
}

function unmapY(mapped_y) {
  return map(mapped_y, 0, 1, bounds.south, bounds.north);
}

function unmapVector(vec) {
  const from2 = createVector(
    bounds.west,
    bounds.south
  );
  const to2 = createVector(
    bounds.east,
    bounds.north
  );
  const from1 = createVector(
    0,
    0
  );
  const to1 = createVector(
    1,
    1
  );
  return mapPoint(vec, from1, to1, from2, to2);
}

function mapVectorToObject(vec) {
  return vectorToObject(mapVector(vec));
}

function vectorToObject(vec) {
  return {
    x: vec.x,
    y: vec.y,
  };
}

function unmapBeziers(mapped_beziers) {
  let beziers = Array(mapped_beziers.length);
  for (let i = 0; i < beziers.length; i++) {
    beziers[i] = unmapBezier(mapped_beziers[i]);
  }
  return beziers;
}

function unmapBezier(mapped_bezier) {
  return {
    'a': unmapVector(mapped_bezier.a),
    'b': unmapVector(mapped_bezier.b),
    'c': unmapVector(mapped_bezier.c),
  }
}

function mapBeziers(unmapped_beziers) {
  let mapped_beziers = Array(unmapped_beziers.length);
  for (let i = 0; i < mapped_beziers.length; i++) {
    mapped_beziers[i] = mapBezier(unmapped_beziers[i]);
  }
  return mapped_beziers;
}

function mapBezier(unmapped_bezier) {
  return {
    'a': mapVector(unmapped_bezier.a),
    'b': mapVector(unmapped_bezier.b),
    'c': mapVector(unmapped_bezier.c),
  }
}

function updateCurveType(curve_info) {
  switch (curve_info.type) {
    case 'Bezier':
      updateToBezier();
      break;
    case 'Steps':
      updateToSteps();
      break;
    case 'Linear Steps':
      updateToLinearSteps();
      setLinearSteps(curve_info.num_steps);
      break;
    case 'Natural Steps':
      updateToNaturalSteps();
      setNaturalSteps(curve_info.num_steps);
      break;
  }
  addEndpointMessagesToUpdate();
  update();
}

function addEndpointMessagesToUpdate() {
  additional_messages_in_update.push({
    title: 'Endpoint',
    content: {
      end: 'min',
      y: mapY(getValueOnCurve(bounds.west))
    }
  });
  additional_messages_in_update.push({
    title: 'Endpoint',
    content: {
      end: 'max',
      y: mapY(getValueOnCurve(bounds.east))
    }
  });
}

// Does NOT Update to steps
function updateStepCount(step_info) {
  if (!step_info.num_steps || step_info.num_steps < 1)
    return;
  switch (step_info.type) {
    case 'Linear Steps':
      setLinearSteps(step_info.num_steps);
      break;
    case 'Natural Steps':
      setNaturalSteps(step_info.num_steps);
      break;
  }
}

function updateToSteps() {
  current_curve_type = CURVE_TYPES.STEPS;
}

function updateToLinearSteps() {
  using_jnds = false;
  updateToSteps();
}

function updateToNaturalSteps() {
  using_jnds = true;
  updateToSteps();
}

function setLinearSteps(numSteps) {
  if (numSteps == 1) {
    mapped_steps = [
      {
        x: 0,
        y: 0.5
      }
    ];
    steps = unmapSteps(mapped_steps);
    return;
  }
  mapped_steps = Array(numSteps);
  
  for (let i = 0; i <= (numSteps-1); i++) {
    mapped_steps[i] = {
      x: i / numSteps,
      y: i / (numSteps-1)
    };
  }
  steps = unmapSteps(mapped_steps);
}

function unmapSteps(mapped_steps) {
  let steps = Array(mapped_steps.length);
  for (let i = 0; i < steps.length; i++) {
    steps[i] = unmapStep(mapped_steps[i]);
  }
  return steps;
}

function unmapStep(mapped_step)  {
  return {
    x: unmapX(mapped_step.x),
    y: unmapY(mapped_step.y),
  }
}

function setNaturalSteps(numSteps) {
  setWeberSteps(numSteps);
}

function setWeberSteps(numSteps) {
  if (numSteps <= 1) {
    mapped_steps = [
      {
        x: 0,
        y: 0.5
      }
    ];
    steps = unmapSteps(mapped_steps);
    updateJNDStepRanges();
    return;
  }
  mapped_steps = Array(numSteps);
  
  const base = 1;  

  const weberFraction = getWeberFraction();

  // descend

  let nextY = base;
  for (let i = 0; i <= (numSteps-1); i++) {
    mapped_steps[i] = {
      x: i / numSteps,
      y: nextY
    };
    // Sₙ = Sₙ₋₁ / (1 + W)
    nextY = nextY / (1 + weberFraction);
  }

  // map steps xₙ = max × wⁿ from 0 to max
  const min_unmapped = mapped_steps[numSteps-1].y;
  const max_unmapped = mapped_steps[0].y;

  for (let i = 0; i < numSteps; i++) {
    mapped_steps[i].y = map(mapped_steps[i].y, min_unmapped, max_unmapped, 0, base);
  }


  steps = unmapSteps(mapped_steps);
  updateJNDStepRanges();

  // undo descend to ascend by default
  invertHorizontalSteps();
}

function updateJNDStepRanges() {
  const numSteps = steps.length;
  if (numSteps <= 1) {
    jnd_step_ranges = [{
      min: bounds.south,
      max: bounds.north
    }];
    return;
  }

  if (jnd_step_ranges.length != numSteps)
    jnd_step_ranges = Array(numSteps);

  const base = 1;  

  const weberFraction = getWeberFraction();
  const minOutput = getMinOutput();

  // JND ranges

  // W: Weber Fraction
  // Sₙ₋₁ > Sₙ > Sₙ₊₁
  // ΔSₙ = Sₙ×W s.t. Sₙ₋₁ = Sₙ + ΔSₙ

  // MIN: Sₙ in terms of Sₙ₊₁ (smaller step)
  // Sₙ = Sₙ₊₁ + ΔSₙ₊₁ = Sₙ₊₁ + Sₙ₊₁×W
  // Sₙ = Sₙ₊₁ + Sₙ₊₁×W

  // MAX: Sₙ in terms of Sₙ₋₁ (larger step)
  // Sₙ₋₁ = Sₙ + Sₙ×W = Sₙ×(1+W)
  // Sₙ = Sₙ₋₁ / (1 + W)
  
  // set JND ranges for each step
  // from biggest non-max step to second smallest non-zero step
  for (let i = 0; i < mapped_steps.length; i++) {
    const max_vals = [Number.MAX_SAFE_INTEGER];
    const min_vals = [Number.MIN_SAFE_INTEGER];
    if (i-1 >= 0) {
      if (mapped_steps[i-1].y > mapped_steps[i].y) {
        max_vals.push(mapped_steps[i-1].y);
      } else {
        min_vals.push(mapped_steps[i-1].y);
      }
      if (mapped_steps[i-1].y < minOutput)
        min_vals.push(minOutput);
    }
    if (i+1 <= numSteps-1) {
      if (mapped_steps[i+1].y > mapped_steps[i].y) {
        max_vals.push(mapped_steps[i+1].y);
      } else {
        min_vals.push(mapped_steps[i+1].y);
      }
      if (mapped_steps[i+1].y < minOutput)
        min_vals.push(minOutput);
    }
    const minMax = Math.min(...max_vals);
    const maxMin = Math.max(...min_vals);
    let max = minMax / (1+weberFraction);
    let min = maxMin * (1+weberFraction);
    if (min < 0) {
      min = 0;
    } else if (min < minOutput) {
      min = minOutput;
    }
    min = constrain(min, 0, 1);
    max = constrain(max, min, 1);
    jnd_step_ranges[i] = {
      // Sₙ = <Sₙ + (<Sₙ × W)
      min: min,
      // Sₙ = >Sₙ / (1 + W)
      max: max,
    };
  }

  // jnd ranges mapped from 0 to base
  // map jnd ranges from south to north
  for (let i = 0; i < steps.length; i++) {
    jnd_step_ranges[i].min = map(jnd_step_ranges[i].min, 0, base, bounds.south, bounds.north);
    jnd_step_ranges[i].max = map(jnd_step_ranges[i].max, 0, base, bounds.south, bounds.north);
  }
}

function getWeberFraction() {
  let weberFraction = outputParameterInfo.jndInfo;
  if (!weberFraction)
    weberFraction = 0.28;
  return weberFraction;
}

function getMinOutput() {
  const base = 1;  
  let minOutput = outputParameterInfo.minimumDistinguishableOutput;
  if (!minOutput)
    minOutput = base * 0.05;
  return minOutput;
}

function setPowerFunctionSteps(numSteps) {
  if (numSteps == 1) {
    steps = [
      {
        x: bounds.west,
        y: bounds.center_y
      }
    ];
    return;
  }
  steps = Array(numSteps);
  
  const h = bounds.south - bounds.north;
  const w = bounds.east - bounds.west;
  for (let i = 0; i <= (numSteps-1); i++) {
    steps[i] = {
      x: bounds.west + w * i / numSteps,
      y: bounds.south - h * naturalFunction(i / (numSteps-1))
    };
  }
}


function naturalFunction(x) {
  return powerFunction(x);
}

function powerFunction(x) {
  // axⁿ
  // const a = 1;
  const n = 1.5;
  return x**n;
}

function updateToBezier() {
  current_curve_type = CURVE_TYPES.BEZIER;
}

function updateEndpoint(content) {
  additional_messages_in_update.push({
    title: 'Received Endpoint Update'
  });
  const end = content.end;
  const y = content.y;
  const x = end === 'min' ? 0 : 1;
  const mappedPoint = createVector(x, y);
  const point = unmapVector(mappedPoint);
  if (current_curve_type === CURVE_TYPES.BEZIER) {
    const endpoint = end === 'min' ? beziers[0].a : beziers[beziers.length-1].c;
    const drag_points = [endpoint];
    updatePoints(drag_points, point);
  } else {
    // steps
    const endstep_index = end === 'min' ? 0 : steps.length-1;
    updateStepHorizontal(endstep_index, point.y);
  }  
  update();
}

function selectStep(pt) {
  const select_radius = 20;
  let closest = {
    d: select_radius+1
  };
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let nextStep;
    if (i+1 < steps.length)  {
      nextStep = steps[i+1];
    } else {
      nextStep = {
        x: bounds.east,
        y: step.y
      };
    }
    if (step.x > pt.x + select_radius)
      break;

    // horizontal
    if (pt.x >= step.x && pt.x <= nextStep.x) {
      const d = abs(pt.y - step.y);
      if (d < closest.d) {
        closest = {
          d: d,
          i: i,
          horizontal: true
        }
      }
    }
    // vertical
    if (pt.y >= min(step.y, nextStep.y) && pt.y <= max(step.y, nextStep.y)) {
      const d = abs(pt.x - nextStep.x);
      if (d < closest.d) {
        closest = {
          d: d,
          i: i+1,
          horizontal: false
        }
      }
    }
  }
  if (closest.d < select_radius) {
    if (closest.horizontal) {
      cursor('row-resize');
    } else {
      cursor('col-resize');
    }
    return setSelectedStep({
      'i': closest.i,
      'horizontal': closest.horizontal
    });
  }
  return noSelectedStep();
}

function noSelectedStep() {
  setSelectedStep(null);
}

function setSelectedStep(step) {
  selectedStep = step;
}

function getSelectedStep() {
  return selectedStep;
}
function dragStep(pt) {
  const selected = getSelectedStep();
  if (!selected)
    return;

  let constrained_pt = constrainPointToBounds(pt);
  if (selected.horizontal) {
    updateStepHorizontal(selected.i, constrained_pt.y);
  } else {
    updateStepVertical(selected.i, constrained_pt.x);
  }
}

function updateStepHorizontal(index, y_val) {
  // update endpoint
  // can be a bit slow, I'm not sure what the best way to speed this up would be
  if (index === 0 || index === steps.length-1) {
      additional_messages_in_update.push({
        title: 'Endpoint',
        content: {
          end: index === 0 ? 'min' : 'max',
          y: mapY(y_val)
        }
      });
  }
  steps[index].y = y_val;
  mapped_steps[index].y = mapY(y_val);
  updateJNDStepRanges();
}

function updateStepVertical(index, x_val) {
  steps[index].x = x_val;
  mapped_steps[index].x = mapX(x_val);
}


// horizontally invert curve
function invertHorizontal() {
  switch (current_curve_type) {
    case CURVE_TYPES.BEZIER:
      invertHorizontalBeziers();
      break;
    case CURVE_TYPES.STEPS:
      invertHorizontalSteps();
      break;
  }
  update();
}

function invertHorizontalBeziers() {
  beziers.reverse();
  for (let i = 0; i < beziers.length; i++) {
    const original_c = beziers[i].c;
    beziers[i].c = beziers[i].a;
    beziers[i].a = original_c;
    ['a', 'b', 'c'].forEach(id => {
      beziers[i][id].x = bounds.east - (beziers[i][id].x - bounds.west);
    })
  }
  mapped_beziers = mapBeziers(beziers);
}

function invertHorizontalSteps() {
  const new_steps = Array(mapped_steps.length);
  mapped_steps.push({
    x: 1,
    y: mapped_steps[mapped_steps.length-1].y
  })
  for (let i = 0; i < new_steps.length; i++) {
    const i_ = mapped_steps.length-1-i;
    new_steps[i] = {
      x: 1 - mapped_steps[i_].x,
      y: mapped_steps[abs(i_-1) % mapped_steps.length].y
    }
  }
  mapped_steps = new_steps;

  steps = unmapSteps(mapped_steps);
  if (using_jnds)
    invertHorizontalJNDStepRanges();
}

function invertHorizontalJNDStepRanges() {
  jnd_step_ranges.reverse();
}

function setOutputParameterInfo(outputParameterInformation) {
  outputParameterInfo = outputParameterInformation;
  if (using_jnds) {
    updateJNDStepRanges();
    redraw();
  }
}