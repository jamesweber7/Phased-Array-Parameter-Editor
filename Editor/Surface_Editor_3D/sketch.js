var domain = {
  x: null,
  y: null,
  z: null
};
var range = {
  x: null,
  y: null,
  z: null
};
var unit = 1;

const default_func = (t) => {
  return t;
}

let input_point;

const ENDPOINTS = {
  C0_0 : 'C0_0',
  C0_1 : 'C0_1',
  D0_0 : 'D0_0',
  D0_1 : 'D0_1',
  C1_0 : 'C1_0',
  C1_1 : 'C1_1',
  D1_0 : 'D1_0',
  D1_1 : 'D1_1'
};
let equal_endpoints = [
  [
    ENDPOINTS.C0_0,
    ENDPOINTS.D0_0
  ]
];

let graph_vertices = [];

const edges = [];
const AXES = {
  X: 'x',
  Y: 'y',
};

const EDGES = {
  C0: 'c0',
  D0: 'd0',
  C1: 'c1',
  D1: 'd1'
};

const curve_types = {
  STEPS: 'Steps',
  BEZIER: 'Bezier'
}

const coons_edge_schemas = {
  AVERAGE: 'Average',
  STRAIGHT: 'Straight',
  FOUR_EDGE: 'Four-Edge',
  OPPOSE_EDGE: 'Oppose-Edge',
}

const interpolation_functions = {
  LINEAR: 'Linear',
  // linear interpolation
  linear : (x_pt, y_pt) => {
    let x = x_pt.x;
    const x_z = x_pt.y;

    let y = y_pt.x;
    const y_z = y_pt.y;

    if (x+y == 0)
      x = 2**-20, y = 2**-20;

    const z = x_z * (x / (x+y)) + y_z * (y / (x+y));
    return {
      x: x,
      y: y,
      z: z
    }
  },

  SIN: 'Sin',
  // sin interpolation
  sin : (x_pt,y_pt) => {
    let x = x_pt.x;
    const x_z = x_pt.y;

    let y = y_pt.x;
    const y_z = y_pt.y;

    if (x+y == 0)
      x = 2**-20, y = 2**-20;

      const x_factor = (sin(-PI*0.5+PI * x / (x+y)) + 1) / 2;
      const y_factor = (sin(-PI*0.5+PI * y / (x+y)) + 1) / 2;
      const z =  (x_z * x_factor + y_z * y_factor) / (x_factor+y_factor);
      return {
        x: x,
        y: y,
        z: z
      }
  },

  POLYNOMIAL: 'Polynomial',
  // polynomial interpolation
  polynomial : (x_pt,y_pt, deg=3) => {
    let x = x_pt.x;
    const x_z = x_pt.y;

    let y = y_pt.x;
    const y_z = y_pt.y;

    if (x+y == 0)
      x = 2**-20, y = 2**-20;

      const x_factor = (x / (x+y))**deg;
      const y_factor = (y / (x+y))**deg;
      const z =  (x_z * x_factor + y_z * y_factor) / (x_factor+y_factor);
      return {
        x: x,
        y: y,
        z: z
      }
  },

  COONS: 'Coons',
  // coons patch
  coons_generator : (edge_schema) => {
    if (!axesCurveInfoLoaded())
      return;

    const c0 = (s) => {
      const pt = getTValueOnCurve(getEdge(EDGES.C0), s);
      return createVector(
        pt.x,
        0,
        pt.y
      );
    };
    const d0 = (t) => {
      const pt = getTValueOnCurve(getEdge(EDGES.D0), t);
      return createVector(
        0,
        pt.x,
        pt.y
      );
    };

    const c0_0 = c0(0);
    const c0_1 = c0(1);
    const d0_1 = d0(1);

    let c1, d1;
    switch (edge_schema) {
      case coons_edge_schemas.AVERAGE:
        c1 = (s) => {
          const c0_s = c0(s);
          const x_pt = {
            x: c0_s.x,
            y: c0_s.z
          }
          const y_pt = {
            x: d0_1.y,
            y: d0_1.z
          }
          return objectToVector3(interpolation_functions.linear(x_pt, y_pt));
        }
        d1 = (t) => {
          const d0_t = d0(t);
          const x_pt = {
            x: c0_1.x,
            y: c0_1.z
          }
          const y_pt = {
            x: d0_t.y,
            y: d0_t.z
          }
          return objectToVector3(interpolation_functions.linear(x_pt, y_pt));
        }
        break;
    
      case coons_edge_schemas.STRAIGHT:
        c1 = (s) => {
            const x = getTValueOnCurve(getEdge(EDGES.C0), s).x;
            const x_half = x*0.5;
            const z = d0_1.z * (1 - x_half) + c0_1.z * x_half;
            return createVector(
              x,
              1,
              z
            )
        }
        d1 = (t) => {
          const y = getTValueOnCurve(getEdge(EDGES.D0), t).x;
          const y_half = 0.5*y;
          const z = c0_1.z * (1 - y_half) + d0_1.z * y_half
          return createVector(
            1,
            y,
            z
          )
        }
        break;
      
      case coons_edge_schemas.FOUR_EDGE:
        c1 = (t) => {
          const pt = getTValueOnCurve(getEdge(EDGES.C1), t);
          return createVector(
            pt.x,
            1,
            pt.y
          );
        }
        d1 = (t) => {
          const pt = getTValueOnCurve(getEdge(EDGES.D1), t);
          return createVector(
            1,
            pt.x,
            pt.y
          );
        }
        break;
      case coons_edge_schemas.OPPOSE_EDGE:
        c1 = (s) => {
          const pt = c0(s);
          pt.y = 1;
          return pt;
        }
        d1 = (t) => {
          const pt = d0(t);
          pt.x = 1;
          return pt;
        }
        break;
    }


    const c1_0 = c1(0);
    const c1_1 = c1(1);

    const Lc = (s,t) => {
      // (1-t)×c0(s)+t×c1(s)
      // (1-t) × c0(s)
      const a = p5.Vector.mult(c0(s), 1-t);
      // t × c1(s)
      const b = p5.Vector.mult(c1(s), t)
      // a + b
      return p5.Vector.add(a, b);
    }
    const Ld = (s,t) => {
      // (1-s)×d0(t)+s×d1(t)
      // (1-s) × d0(t)
      const a = p5.Vector.mult(d0(t), 1-s);
      // s × d1(t)
      const b = p5.Vector.mult(d1(t), s);
      // a + b
      return p5.Vector.add(a, b);
    }
    const B = (s, t) => {
      // c0_0×(1-s)×(1-t) + c0_1×s×(1-t) + c1_0×(1-s)×t + c1_1×s×t
      // c0_0×(1-s)×(1-t)
      const a = p5.Vector.mult(c0_0, (1-s)*(1-t));
      // c0_1×s×(1-t)
      const b = p5.Vector.mult(c0_1, s*(1-t));
      // c1_0×(1-s)×t
      const c = p5.Vector.mult(c1_0, (1-s)*t);
      // c1_1×s×t
      const d = p5.Vector.mult(c1_1, s*t);
      // a + b + c + d
      return p5.Vector.add(a, b).add(p5.Vector.add(c, d));
    }
    
    return (s, t) => {
      // Lc(s,t) + Ld(s,t) - B(s,t)
      // Lc(s,t) + Ld(s,t)
      const a = p5.Vector.add(Lc(s,t), Ld(s,t));
      // B(s,t)
      const b = B(s,t);
      // a - b
      return p5.Vector.sub(a, b);
    }
  }

}

let current_interpolation_func = {
  func: interpolation_functions.LINEAR,
  edge_schema: undefined,
  deg: undefined
};
let interpolation_func = interpolation_functions.linear;

let cam;

// topographical shader
let topoShader;

let text_graphics;
let text_graphics_info = {};
let roboto;
function preload() {
  roboto = loadFont("Roboto/Roboto-Regular.ttf");
  topoShader = loadShader('vertex.vert', 'fragment.frag');
}

function setup() {
  createCanvas(windowWidth*0.999, windowHeight*0.999, WEBGL);
  resizeRange();
  updateUnit();
  updateUnitSizes();

  setupDefaultEdges();

  domain.x = 1;
  domain.y = 1;
  domain.z = 1;

  cam = {
    rotation: {
        x: -PI*0.08,
        y: PI*0.65,
        z: 0
    },
    zoom: 400
  };
  
  updateTextGraphics();

  // Establish Communication with iframe parent
  window.addEventListener('message', receivedMessageFromParent);
  sendMessageToParent('Loaded');

  shader(topoShader);
  updateShaderRange();

  noLoop();
}

function windowResized() {
  resizeCanvas(windowWidth*0.999, windowHeight*0.999);
  updateUnit();
  updateUnitSizes();
  resizeRange();
  updateShaderRange();
  updateGraph();
  redraw();
}

function updateUnit() {
  unit = width / 1000;
}

// this software hasn't had much need for dynamic strokeweight resizing, so can just resize strokeweight here
function updateUnitSizes() {
  strokeWeight(1*unit);
  updateTextGraphics();
}

function updateTextGraphics(horiz_size=200, vert_size=20, text_size=16) {
  text_graphics_info = {
    horiz_size: horiz_size,
    vert_size: vert_size,
    text_size: text_size
  };
  text_graphics = createGraphics(horiz_size, vert_size);
  text_graphics.textAlign(LEFT, TOP);
  text_graphics.textSize(text_size*unit);
  text_graphics.textFont(roboto);
  text_graphics.clear();
  textFont(roboto);
}

function resizeRange() {
  const cushion = 0.2;
  const horizontal_range = width*cushion;
  const vertical_range = Math.min(height*cushion, horizontal_range); // range can't be taller than wide
  range.x = horizontal_range;
  range.y = horizontal_range;
  range.z = vertical_range;
}

function updateShaderRange() {
  topoShader.setUniform('uMin', -range.z/2);
  topoShader.setUniform('uMax', range.z/2);
}

function draw() {
  background(255);
  cameraTranslations();

  push();
  noFill();
  box(range.x, range.z, range.y);
  pop();

  if (!axesCurveInfoLoaded()) {
    drawBillboardedText("Loading...", 0, 0, 0);
    return;
  }

  
  drawGraphedVertices();

  if (input_point) {
    push();
    const value = getValueOnGraph(input_point);
    const translation = map_vertex(value);
    translate(translation.x, translation.z, translation.y);
    sphere(3*unit);
    pop();
  }
  
  drawEdgeTitles();
  drawAxisDirections();
}

function drawEdgeTitles() {
  edges.forEach(edge => {
    if (!edge.loaded)
      return;
    const offset = edge.name.length * unit * 4;
    const options = {
      horiz_size: (edge.name.length+2) * unit * 9,
      vert_size: 20,
      text_size: 16
    };
    let pos = {
      x: -range.x/2,
      y: range.z/2,
      z: -range.y/2,
    }
    let rotation = {
      x: 0,
      y: 0
    };
    switch (edge.id) {
      case EDGES.C0:
        pos.x = 0+offset;
        rotation.y = Math.PI;
        break;
      case EDGES.D0:
        pos.z = 0-offset;
        rotation.y = -Math.PI/2;
        break;
      case EDGES.C1:
        pos.x = 0-offset;
        pos.z = range.y/2;
        break;
      case EDGES.D1:
        pos.z = 0+offset;
        pos.x = range.x/2;
        rotation.y = Math.PI/2;
        break;
    }
    drawText(edge.name, pos.x, pos.y, pos.z, rotation, options);
  })
}

function drawAxisDirections() {
  const options = {
    horiz_size: unit*9,
    vert_size: 20,
    text_size: 16
  }
  drawBillboardedText("y", -range.x/2, range.z/2, range.y/2, options);
  drawBillboardedText("x", range.x/2, range.z/2, -range.y/2, options);
  drawBillboardedText("z", -range.x/2, -range.z/2, -range.y/2, options);
}


function domain_to_range(val, domain, range) {
  return range*(val / domain);
}

function drawGraphedVertices() {
  for (let i = 0; i < graph_vertices.length-1; i++) {
    beginShape(TRIANGLE_STRIP);
    // first vertex
    const first_vertex = graph_vertices[i+1][0];
    vertex(first_vertex.x, first_vertex.z, first_vertex.y);
    for (let j = 0; j < graph_vertices[i].length-1; j++) {
      const this_vertex = graph_vertices[i][j];
      vertex(this_vertex.x, this_vertex.z, this_vertex.y);
      const next_vertex = graph_vertices[i+1][j+1];
      vertex(next_vertex.x, next_vertex.z, next_vertex.y);
    }
    const last_vertex = graph_vertices[i][graph_vertices[i].length-1]
    vertex(last_vertex.x, last_vertex.z, last_vertex.y);
    endShape();
  }
}

function updateGraphVertices() {
  if (!axesCurveInfoLoaded())
    return;

  const max_vertices = 225;
  const unmapped_vertices = computeUnmappedVertices(max_vertices);
  
  graph_vertices = Array(unmapped_vertices.length);
  for (let i = 0; i < unmapped_vertices.length; i++) {
    graph_vertices[i] = Array(unmapped_vertices[i].length);
  }

  // map vertices
  for (let i = 0; i < graph_vertices.length; i++) {
    for (let j = 0; j < graph_vertices[i].length; j++) {
      graph_vertices[i][j] = map_vertex(unmapped_vertices[i][j]);
    }
  }
}

function computeUnmappedVertices(max_vertices=100) {
  if (current_interpolation_func.func == interpolation_functions.COONS) {
    // Coons patch
    return computeUnmappedCoonsVertices(max_vertices);
  }
  return computeUnmappedInterpolatedVertices(max_vertices);
}

function getMaxVerticesPerAxis(max_vertices) {
  const max_per_axis_ratio = 2;
  const min_per_curve_axis_ratio = 0.5;

  const equal_vertices_per_axis = Math.floor(max_vertices**0.5);

  const max_per_axis = Math.floor(equal_vertices_per_axis*max_per_axis_ratio);
  const min_per_curve_axis = Math.floor(equal_vertices_per_axis*min_per_curve_axis_ratio);


  let x_max_vertices, y_max_vertices;  
  const x = getEdge(EDGES.C0);
  const y = getEdge(EDGES.D0);
  // if x axis is steps
  if (x.curve_type == curve_types.STEPS) {
    x_max_vertices = x.steps.length*2;
    x_max_vertices = Math.min(x_max_vertices, max_per_axis);
    if (y.curve_type == curve_types.STEPS) {
      y_max_vertices = y.steps.length*2;
    } else {
      y_max_vertices = Math.floor(max_vertices/x_max_vertices);
    }
    y_max_vertices = Math.min(y_max_vertices, max_per_axis);
    y_max_vertices = Math.max(y_max_vertices, min_per_curve_axis);
  } else if (y.curve_type == curve_types.STEPS) {
    y_max_vertices = y.steps.length*2;
    y_max_vertices = Math.min(y_max_vertices, max_per_axis);

    x_max_vertices = Math.floor(max_vertices/y_max_vertices);
    x_max_vertices = Math.min(x_max_vertices, max_per_axis);
    x_max_vertices = Math.max(x_max_vertices, min_per_curve_axis);
  } else {
    // square matrix - both curve types are composite bezier curves
    x_max_vertices = equal_vertices_per_axis;
    y_max_vertices = equal_vertices_per_axis;
  }

  return {
    x: x_max_vertices,
    y: y_max_vertices
  };
}

function computeUnmappedInterpolatedVertices(max_vertices=100) {
  let max_vertices_per_axis = getMaxVerticesPerAxis(max_vertices);
  let x_max_vertices = max_vertices_per_axis.x;
  let y_max_vertices = max_vertices_per_axis.y;

  let x_axis_values = getValuesAlongCurve(getEdge(EDGES.C0), x_max_vertices);
  let y_axis_values = getValuesAlongCurve(getEdge(EDGES.D0), y_max_vertices);

  // unmapped
  const unmapped_vertices = Array2D(x_axis_values.length, y_axis_values.length);
  for (let i = 0; i < x_axis_values.length; i++) {
    for (let j = 0; j < y_axis_values.length; j++) {
      unmapped_vertices[i][j] = interpolation_func(x_axis_values[i], y_axis_values[j]);
    }
  }
  return unmapped_vertices;
}

function computeUnmappedCoonsVertices(max_vertices=100) {
  if (!interpolation_func)
    return [];
  const max_vertices_per_axis = Math.floor(max_vertices**0.5);

  const x_resolution = max_vertices_per_axis;
  const y_resolution = max_vertices_per_axis;

  // unmapped
  const unmapped_vertices = Array2D(x_resolution, y_resolution);
  for (let i = 0; i < x_resolution; i++) {
    const s = i/(x_resolution-1);
    for (let j = 0; j < y_resolution; j++) {
      const t = j/(y_resolution-1);
      unmapped_vertices[i][j] = interpolation_func(s, t);
    }
  }
  return unmapped_vertices;
}

function axesCurveInfoLoaded() {
  if (!getEdge(EDGES.C0).loaded)
    return false;
  if (!getEdge(EDGES.D0).loaded)
    return false;
  if (current_interpolation_func.func != interpolation_functions.COONS)
    return true;
  if (current_interpolation_func.edge_schema != coons_edge_schemas.FOUR_EDGE)
    return true;
  if (!getEdge(EDGES.C1).loaded)
    return false;
  if (!getEdge(EDGES.D1).loaded)
    return false;
  return true;
}

function isSingleEdgeInterpolationFunction(interp_function) {
  return singleEdgeInterpolationFunctions().contains(interp_function);
}

function singleEdgeInterpolationFunctions() {
  return [
    interpolation_functions.LINEAR,
    interpolation_functions.POLYNOMIAL,
    interpolation_functions.SIN,
  ]
}

function Array2D(size_i, size_j) {
  const arr = Array(size_i);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Array(size_j);
  }
  return arr;
}

function map_vertex(vertex) {
  const x_ = vertex.x;
  const y_ = vertex.y;
  const z_ = vertex.z;

  const x = range.x*(x_/domain.x-0.5);
  const y = range.y*(y_/domain.y-0.5);
  const z = range.z*(1-(z_/domain.z+0.5));

  return {
    x: x,
    y: y,
    z: z
  }
}

function getValuesAlongBezier(beziers, num_points=100) {
  const points = Array(num_points);
  for (let i = 0; i < num_points; i++) {
    const t = i / (num_points-1);
    points[i] = getTValueOnBeziers(beziers, t);
  }
  return points;
}

function getValuesAlongSteps(steps, max_points=100) {
  // if the maximum number of points is less than 2×the number of steps, increment by a multiple
  const num_points_unrestricted = steps.length*2;
  const inc = Math.max(1, Math.ceil(num_points_unrestricted/max_points));
  const num_points = Math.floor(num_points_unrestricted / inc);
  const points = Array(num_points);
  // left side of each step - skip odd points
  for (let i = 0; i < num_points/2; i++) {
    const index = i*inc;
    points[2*i] = {
      x: steps[index].x,
      y: steps[index].y
    };
  }
  // right side of each step
  for (let i = 0; i < num_points/2-1; i++) {
    const index = i*inc;
    points[2*i+1] = {
      x: steps[index+1].x,
      y: steps[index].y
    };
  } 
  // final point
  points[points.length-1] = {
    x: 1,
    y: steps[steps.length-1].y
  };
  return points;
}

function getValuesAlongCurve(edge, max_points=100) {
  switch (edge.curve_type) {
    case curve_types.BEZIER :
      return getValuesAlongBezier(edge.beziers, max_points);
    case curve_types.STEPS :
      return getValuesAlongSteps(edge.steps, max_points);
  }
}

// t: from 0 to 1
function getTValueOnBeziers(beziers, t) {
  const x_bez_i = Math.floor(t*beziers.length);
  if (x_bez_i == beziers.length)
    return beziers[beziers.length-1].c;
  const x_bez = beziers[x_bez_i];
  const x_bez_t = t*beziers.length-x_bez_i;
  const x_pt = get_point_along_bezier(x_bez, x_bez_t);
  return {
    x: x_pt.x,
    y: x_pt.y
  }
}

function mousePressed() {
  cursor(HAND);
  pmouseX = mouseX;
  pmouseY = mouseY;
}

function mouseReleased() {
  cursor(ARROW);
  pmouseX = mouseX;
  pmouseY = mouseY;
  redraw();
}

function mouseDragged() {
  dragCamera();
  redraw();
  pmouseX = mouseX;
  pmouseY = mouseY;
}

// function mouseMoved() {
//   pmouseX = mouseX;
//   pmouseY = mouseY;
// }

function mouseWheel(e) {
  zoomCamera(e);
  redraw();
}

function drawBillboardedText(text, x, y, z, options={}) {
  const rotation = {
    x: -cam.rotation.x,
    y: -cam.rotation.y
  };
  drawText(text, x, y, z, rotation, options);
}

function drawText(text, x, y, z, rotation={x: 0, y: 0}, options={}) {
  updateTextGraphics(options.horiz_size, options.vert_size, options.text_size);
  push();
  text_graphics.text(text,0,0);
  noStroke();
  texture(text_graphics);

  translate(x,y,z);
  rotateY(rotation.y);
  rotateX(rotation.x);
  translate(text_graphics_info.horiz_size/2, text_graphics_info.vert_size/2, 0);

  plane(text_graphics_info.horiz_size, text_graphics_info.vert_size);
  text_graphics.clear();
  pop();
}


function cameraTranslations() {
  camera(0, 0, cam.zoom, 0, 0, 0, 0, 1, 0);
  rotateX(cam.rotation.x);
  rotateY(cam.rotation.y);
  rotateZ(cam.rotation.z);
}

function dragCamera() {
  let sensitivity = 0.25;
  cam.rotation.y -= (pmouseX - mouseX) * sensitivity * PI / 180;
  // constrain within 90 deg of 0 so camera doesn't get all flipped + confused
  cam.rotation.x = constrain(cam.rotation.x + (pmouseY - mouseY) * sensitivity * PI / 180, -PI/2, PI/2);
}

function zoomCamera(e) {
  cam.zoom = max(cam.zoom+e.delta, 0.1);
}

/* Communication with iframe parent */

function sendMessageToParent(title, content='') {
  parent.postMessage({
    editor_source: true,
    source: "Graph",
    title: title,
    content: content,
  }, '*');
}

function receivedMessageFromParent(event) {
  if (!event || !event.data || !event.data.editor_source) 
    return;
  switch (event.data.title) {
    case "Update":
      updateReceived(event.data.content);
      break;
    case "Interpolation Function":
      updateInterpolationFunction(event.data.content);
      update();
      break;
    case "Update Equal Endpoint Schema": 
      // currently not being sent by parent, since surface editor can figure out when to update on its own
      updateEqualEndpointSchema();
      update();
      break;
    case "Update Input Point":
      updateInputPoint(event.data.content);
      updateParent();
      redraw();
      break;
    case "Send Output Values":
      sendOutputValuesToParent(event.data.content);
      break;
    case "Send State Serialization":
      sendStateSerializationToParent();
      break;
    case "Edge Name":
      updateEdgeName(event.data.content);
      break;
  }
}

function updateReceived(content) {
  const edge_id = content.edge;
  const edge = getEdge(edge_id);
  const curve_info = content.update_info.curve_info;
  const additional_messages = content.update_info.additional_messages;

  additional_messages.forEach(msg => {
    switch (msg.title) {
      case 'Endpoint':
        if (!additional_messages.some(msg2 => msg2.title === 'Received Endpoint Update')) {
          updateEqualEndpoints(edge, msg.content);
          return;
        }
        break;
    }
  })
  
  updateEdge(edge, curve_info);
  if (!edge.loaded)
    edgeLoaded(edge);
  update();
}

function updateEdge(edge, curve_info) {
  edge.curve_type = curve_info.type;
  switch (curve_info.type) {
    case 'Bezier':
      updateAxisBezier(edge, curve_info);
      break;
    case 'Steps':
      updateAxisSteps(edge, curve_info);
      break;
  }
  if (current_interpolation_func.func == interpolation_functions.COONS) {
    updateCoonsFunc(current_interpolation_func.edge_schema);
  }
}


function updateAxisBezier(edge, curve_info) {
  edge.beziers = parseBezierData(curve_info.data);
}

function updateAxisSteps(edge, curve_info) {
  edge.steps = parseStepData(curve_info.data);
}

function updateInterpolationFunction(content) {
  switch (content.func) {
    case 'Linear':
      current_interpolation_func.func = interpolation_functions.LINEAR;
      interpolation_func = interpolation_functions.linear;
      break;
    case 'Sin':
      current_interpolation_func.func = interpolation_functions.SIN;
      interpolation_func = interpolation_functions.sin;
      break;
    case 'Polynomial':
      current_interpolation_func.func = interpolation_functions.POLYNOMIAL;
      current_interpolation_func.deg = content.deg;
      interpolation_func = (x,y) => {
        return interpolation_functions.polynomial(x,y,content.deg);
      }
      break;
    case 'Coons':
      current_interpolation_func.func = interpolation_functions.COONS;
      current_interpolation_func.edge_schema = content.edge_schema;
      updateCoonsFunc(content.edge_schema);
      break;
  }
  updateEqualEndpointSchema(content.func, content.edge_schema);
}

function updateEqualEndpointSchema(func=current_interpolation_func.func, edge_schema=current_interpolation_func.edge_schema) {
  equal_endpoints = getEqualEndpoints(func, edge_schema);
  if (!equal_endpoints)
    return;
  if (!axesCurveInfoLoaded())
    return;
  let base_endpoints = []; // endpoints that must equal a certain value
  equal_endpoints.forEach(equal_set => {
    let outliers, val;

    // figure out if equal set contains already computed base endpoint(s)
    let base_found = false;
    for (let i = 0; i < base_endpoints.length && !base_found; i++) {
      if (equal_set.includes(base_endpoints[i].endpoint)) {
        val = base_endpoints[i].val;
        base_found = true;
      }
    }

    if (base_found) {
      // base endpoint(s) found
      outliers = equal_set;
      for (let i = 0; i < outliers.length; i++) {
        let is_in_base;
        do {
          is_in_base = false;
          for (let i = 0; i < base_endpoints.length && !is_in_base; i++) {
            if (outliers[i] === base_endpoints[i].endpoint) {
              is_in_base = true;
              outliers.splice(i, 0);
            }
          }
        } while (i < outliers.length && is_in_base)
      }
    } else {
      // compute base endpoint(s)
      const outlier_information = getOutlyingEndpoints(equal_set);
      if (!outlier_information)
        return;
      outliers = outlier_information.outliers;
      val = outlier_information.val;
    }

    outliers.forEach(endpoint => {
      updateEndpoint(endpoint, val);
    });
  })
}

function getOutlyingEndpoints(equal_set) {
  // get similar_collections: array of arrays of close values
  let similar_collections = [];
  const epsilon = 2**-5;

  equal_set.forEach(endpoint => {
    const val = getValueAtEndpoint(endpoint);
    if (isNaN(val)) // edge not loaded
      return;
    for (const similar_collection of similar_collections) {
      for (const collected of similar_collection) {
        const val2 = collected.val;
        if (Math.abs(val2-val) < epsilon) {
          similar_collection.push({
            val: val,
            endpoint: endpoint
          });
          return; // exit to next endpoint in equal set 
        }
      }
    }
    // val different from other vals
    similar_collections.push([{
      val: val,
      endpoint: endpoint
    }]);
  });

  // now have similar collections for close values
  // find array with most close values
  let best_collection = [];
  similar_collections.forEach(similar_collection => {
    if (similar_collection.length > best_collection.length) {
      best_collection = similar_collection;
    }
  })

  // now have best collection of close values, find value that appears most
  let counts = [];
  best_collection.forEach(collected => {
    if (counts[collected.val]) {
      counts[collected.val].cnt++;
      counts[collected.val].endpoints.push(collected.endpoint);
    } else {
      counts[collected.val] = {
        cnt: 1,
        endpoints: [collected.endpoint]
      };
    }
  })

  let mode = {
    count: -1
  };
  Object.keys(counts).forEach(val => {
    const count = counts[val];
    if (count.cnt >= mode.count) { // equal to prefer later vals
      mode = {
        count: count.cnt,
        val: val,
        endpoints: [
          count.endpoints
        ]
      };
    }
  });
  if (mode.count < 0)
    return;

  let outliers = [];
  equal_set.forEach(endpoint => {
    if (!mode.endpoints.includes(endpoint))
      outliers.push(endpoint);
  });
  return {
    val: mode.val,
    outliers: outliers,
    base: mode.endpoints
  };
}

function getEqualEndpoints(func=current_interpolation_func.func, edge_schema=current_interpolation_func.edge_schema) {
  switch (func) {
    case 'Linear':
    case 'Sin':
    case 'Polynomial':
      return [
        [
          ENDPOINTS.C0_0,
          ENDPOINTS.D0_0,
        ]
      ];
    case 'Coons':
      switch (edge_schema) {
        case coons_edge_schemas.AVERAGE:
        case coons_edge_schemas.STRAIGHT:
          return [
            [
              ENDPOINTS.C0_0,
              ENDPOINTS.D0_0,
            ]
          ];
        case coons_edge_schemas.FOUR_EDGE:
          return [
            [
              ENDPOINTS.C0_0,
              ENDPOINTS.D0_0,
            ],
            [
              ENDPOINTS.C0_1,
              ENDPOINTS.D1_0,
            ],
            [
              ENDPOINTS.D0_1,
              ENDPOINTS.C1_0,
            ],
            [
              ENDPOINTS.C1_1,
              ENDPOINTS.D1_1,
            ],
          ];
        case coons_edge_schemas.OPPOSE_EDGE:
          return [
            [
              ENDPOINTS.C0_0,
              ENDPOINTS.D0_0,
              ENDPOINTS.C0_1,
              ENDPOINTS.D0_1,
            ]
          ];
      }
      break;
  }
}

function getBezierData(beziers) {
  let bezData = Array(beziers.length);
  for (let i = 0; i < bezData.length; i++) {
    bezData[i] = {
      a: vectorToObject(beziers[i].a),
      b: vectorToObject(beziers[i].b),
      c: vectorToObject(beziers[i].c),
    }
  }
  return bezData;
}

function parseBezierData(bezData) {
  let beziers = Array(bezData.length);
  for (let i = 0; i < beziers.length; i++) {
    beziers[i] = {
      a: objectToVector(bezData[i].a),
      b: objectToVector(bezData[i].b),
      c: objectToVector(bezData[i].c),
    }
  }
  return beziers;
}

function getStepData(steps) {
  let stepData = Array(steps.length);
  for (let i = 0; i < stepData.length; i++) {
    stepData[i] = vectorToObject(steps[i]);
  }
  return stepData;
}

function parseStepData(stepData) {
  let steps = Array(stepData.length);
  for (let i = 0; i < steps.length; i++) {
    steps[i] = objectToVector(stepData[i]);
  }
  return steps;
}

function vectorToObject(vec) {
  return {
    x: vec.x,
    y: vec.y,
  };
}

function objectToVector(obj) {
  return createVector(obj.x, obj.y);
}

function objectToVector3(obj) {
  return createVector(obj.x, obj.y, obj.z);
}

function getTValueOnCurve(edge, t) {
  if (edge.curve_type == curve_types.BEZIER) {
    return getTValueOnBeziers(edge.beziers, t);
  } else {
    return getTValueOnSteps(edge.steps, t);
  }
}

function getValueOnGraph(pt) {
  if (!axesCurveInfoLoaded())
    return;
  if (current_interpolation_func.func == interpolation_functions.COONS) {
    // coons patch
    // get s, t
    const s = xToT(getEdge(EDGES.C0), pt.x);
    const t = xToT(getEdge(EDGES.D0), pt.y);
    return interpolation_func(s, t);
  }
  // single-edge interpolation function
  const x_val = getValueOnCurve(getEdge(EDGES.C0), pt.x);
  const y_val = getValueOnCurve(getEdge(EDGES.D0), pt.y);
  const z_val = interpolation_func({
    x: pt.x,
    y: x_val
  },
  {
    x: pt.y,
    y: y_val
  });
  return z_val;
}

function getValueOnCurve(edge, x) {
  switch (edge.curve_type) {
    case curve_types.BEZIER :
      return getValueOnBeziers(edge.beziers, x, 100);
    case curve_types.STEPS :
      return getValueOnSteps(edge.steps, x);
  }
}

function getValueOnBeziers(beziers, x, num_steps=100) {
  let bez;
  beziers.forEach(bezi => {
    if (bezi.a.x <= x && bezi.c.x >= x)
      bez = bezi;
  });
  if (!bez)
    return -1;
  const pt = _getPointOnBez(x, bez, 0, 1, num_steps);
  return pt.y;
}

// recursively find best t-value corresponding with an x-value
function _getPointOnBez(x, bez, min=0, max=1, num_steps=100) {
  num_steps --;
  const check_t = min+(max-min)*0.5;
  const check_pt = get_point_along_bezier(bez, check_t);
  if (num_steps <= 0)
    return check_pt;
  const check_x = check_pt.x;
  if (x < check_x) {
    return _getPointOnBez(x, bez, min, check_t, num_steps)
  } else if (x > check_x) {
    return _getPointOnBez(x, bez, check_t, max, num_steps)
  }
  return check_pt;
}

function get_point_along_bezier(bez, t) {
  return get_point_along_quadratic_bezier(bez.a, bez.b, bez.c, t);
}

function get_point_along_linear_bezier(a, b, t) {
  return p5.Vector.lerp(a, b, t);
}

function get_point_along_quadratic_bezier(a, b, c, t) {
  return p5.Vector.lerp(
      p5.Vector.lerp(a, b, t),
      p5.Vector.lerp(b, c, t),
      t
    );
}

function getValueOnSteps(steps, x) {
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].x > x) {
      return steps[i-1].y;
    }
  }
  return steps[steps.length-1].y;
}

// converting t to x val
function getTValueOnSteps(steps, t) {
  const step_id = Math.min(Math.floor(steps.length*2*t), steps.length*2-1);
  const index = Math.floor(step_id/2);
  const is_start = step_id % 2 == 0;
  let x, y;
  if (is_start) {
    x = steps[index].x;
  } else {
    if (index+1 < steps.length) {
      x = steps[index+1].x;
    } else {
      x = 1;
    }
  }
  y = steps[index].y;
  return {
    x: x,
    y: y
  }
}

// SLOW - iteratively gets closer to proper t value
// x ∈ [0, 1]
function xToT(edge, x, num_steps=100) {
  switch (edge.curve_type) {
    case curve_types.BEZIER:
      return xToTBezier(x, edge.beziers, num_steps);
    case curve_types.STEPS:
      return xToTSteps(x, edge.steps);
  }
}

function xToTBezier(x, beziers, num_steps=100) {
  let bez, index;
  beziers.forEach((bezi, i) => {
    if (bezi.a.x <= x && bezi.c.x >= x) {
      bez = bezi;
      index = i;
    } 
  });
  if (!bez)
    return -1;
  const bez_t = _xToTBez(x, bez, 0, 1, num_steps);
  return ((index+bez_t)/beziers.length);
}

// recursively find best t-value corresponding with an x-value
function _xToTBez(x, bez, min=0, max=1, num_steps=100) {
  num_steps --;
  const check_t = min+(max-min)*0.5;
  if (num_steps <= 0)
    return check_t;
  const check_x = get_point_along_bezier(bez, check_t).x;
  if (x < check_x) {
    return _xToTBez(x, bez, min, check_t, num_steps)
  } else if (x > check_x) {
    return _xToTBez(x, bez, check_t, max, num_steps)
  }
  return check_t;
}

function xToTSteps(x, steps) {
  for (let i = 0; i < steps.length-1; i++) {
    if (x < steps[i+1].x) {
      // this just returns the t corresponding with the starting point, not sure if this should sometimes include the ending point or not
      return i/(steps.length-1);
    }
  }
  return 1;
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

function updateCoonsFunc(edge_schema) {
  interpolation_func = interpolation_functions.coons_generator(edge_schema);
}

function updateEqualEndpoints(edge, endpoint_info) {
  let end = endpoint_info.end;
  let endpoint = getEndpoint(edge, end);
  
  let y = endpoint_info.y;
  equal_endpoints.forEach(equal_set => {
    if (equal_set.includes(endpoint)) {
      equal_set.forEach(endpoint2 => {
        if (endpoint2 != endpoint)
          updateEndpoint(endpoint2, y);
      })
    }
  })
}

function updateEndpoint(endpoint, y) {
  sendMessageToParent(
    'Update Endpoint',
    {
      endpoint: endpoint,
      y: y
    }
  );
}

function updateInputPoint(point) {
  input_point = point;
}

function update() {
  updateGraph();
  updateParent();
  redraw();
}

function updateGraph() {
  updateGraphVertices();
}

function updateParent() {
  let content = {};
  if (input_point && axesCurveInfoLoaded()) {
    content.output_value = getValueOnGraph(input_point).z;
  }
  sendMessageToParent('Graph Updated', content);
}

function getEndpoint(edge, end) {
  const isMin = end === 'min';
  switch (edge.id) {
    case EDGES.C0:
      return isMin ? ENDPOINTS.C0_0 : ENDPOINTS.C0_1;
    case EDGES.D0:
      return isMin ? ENDPOINTS.D0_0 : ENDPOINTS.D0_1;
    case EDGES.C1:
      return isMin ? ENDPOINTS.C1_0 : ENDPOINTS.C1_1;
    case EDGES.D1:
      return isMin ? ENDPOINTS.D1_0 : ENDPOINTS.D1_1;
  }
}

function endpointToEdge(endpoint) {
  return getEdge(endpointToEdgeId(endpoint));
}

function endpointToEdgeId(endpoint) {
  switch (endpoint) {
      case ENDPOINTS.C0_0:
      case ENDPOINTS.C0_1:
          return EDGES.C0;
      case ENDPOINTS.D0_0:
      case ENDPOINTS.D0_1:
          return EDGES.D0;
      case ENDPOINTS.C1_0:
      case ENDPOINTS.C1_1:
          return EDGES.C1;
      case ENDPOINTS.D1_0:
      case ENDPOINTS.D1_1:
          return EDGES.D1;
  }
}

function getValueAtEndpoint(endpoint) {
  const edge = endpointToEdge(endpoint);
  if (!edge.loaded)
    return;
  if (isMinEndpoint(endpoint)) {
    return getTValueOnCurve(edge, 0).y;
  }
  return getTValueOnCurve(edge, 1).y;
}

function isMinEndpoint(endpoint) {
  return [ENDPOINTS.C0_0,ENDPOINTS.D0_0,ENDPOINTS.C1_0,ENDPOINTS.D1_0].includes(endpoint);
}

function getEdge(edge_id) {
  for (const edge of edges) {
    if (edge.id == edge_id)
      return edge;
  }
}

function setupDefaultEdges() {
  edges.push(defaultEdge(EDGES.C0));
  edges.push(defaultEdge(EDGES.D0));
  edges.push(defaultEdge(EDGES.C1));
  edges.push(defaultEdge(EDGES.D1));
}

function defaultEdge(edge_id) {
  let axis;
  let name;
  switch (edge_id) {
    case EDGES.C0:
      axis = AXES.X;
      name = 'X Axis';
      break;
    case EDGES.C1:
      axis = AXES.X;
      name = 'X2 Axis';
      break;
    case EDGES.D0:
      axis = AXES.Y;
      name = 'Y Axis';
      break;
    case EDGES.D1:
      axis = AXES.Y;
      name = 'Y2 Axis';
      break;
  }
  return {
    id: edge_id,
    axis: axis,
    name: name,
    beziers: [],
    steps: [],
    loaded: false,
    curve_type: curve_types.BEZIER,
  }
}

function edgeLoaded(edge) {
  edge.loaded = true;
  if (!interpolation_func) {
    updateInterpolationFunction(current_interpolation_func);
  } else {
    updateEqualEndpointSchema(); // already gets updated on update interpolation function
  }
}

function updateEdgeName(edge_info) {
  const edge = getEdge(edge_info.id);
  edge.name = edge_info.name;
  if (edge.loaded)
    redraw();
}

function sendOutputValuesToParent(content) {
  const output_steps_x = content.output_steps_x ? content.output_steps_x : 20;
  const output_steps_y = content.output_steps_y ? content.output_steps_y : 20;
  const values = [];
  for (let i = 0; i < output_steps_x; i ++) {
    for (let j = 0; j < output_steps_y; j ++) {
      const xy_pt = {
        x: i/(output_steps_x-1),
        y: j/(output_steps_y-1)
      };
      values.push(getValueOnGraph(xy_pt));
    }
  }
  sendMessageToParent('Surface Output Values', values);
}

function sendStateSerializationToParent() {
  sendMessageToParent("State Serialization", serializeState());
}

function serializeState() {
  return {
    domain: domain,
    range: range,
    graph_vertices: graph_vertices,
    edges: serializeEdges(),
    interpolation_func_content: serializeInterpolationFunc(),
  }
}

/* This is fully set up for the 3D surface editor, but needs to also be set up for the 2D curve editor to function */
function deserializeState(serialized_state) {
  domain = serialized_state.domain;
  range = serialized_state.range;
  graph_vertices = serialized_state.graph_vertices;
  deserializeEdges(serialized_state.edges);
  deserializeInterpolationFunc(serialized_state.interpolation_func_content);
  update();
}

function serializeEdges() {
  const serialized_edges = Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    serialized_edges[i] = {
      id: edges[i].id,
      loaded: edges[i].loaded,
      axis: edges[i].axis,
      curve_type: edges[i].curve_type,
      beziers: getBezierData(edges[i].beziers),
      steps: getStepData(edges[i].steps)
    }
  }
  return serialized_edges;
}

function deserializeEdges(serialized_edges) {
  serialized_edges.forEach(serialized_edge => {
    edges.push({
      id: serialized_edge.id,
      loaded: serialized_edge.loaded,
      axis: serialized_edge.axis,
      curve_type: serialized_edge.curve_type,
      beziers: parseBezierData(serialized_edge.beziers),
      steps: parseStepData(serialized_edge.steps)
    })
  })
}

function serializeInterpolationFunc() {
  return {
    func: current_interpolation_func.func,
    edge_schema: current_interpolation_func.edge_schema,
    deg: current_interpolation_func.deg,
  } // updateInterpolationFunc(interpolation_func_content)
}

function deserializeInterpolationFunc(interpolation_func_content) {
  updateInterpolationFunction(interpolation_func_content);
}