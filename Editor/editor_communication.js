/* 
 * Editor Communication
 * Communicate with 3D Surface Editor and 2D Curve Editors
*/
document.addEventListener('DOMContentLoaded', setup);

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

const edges = [
    /* {
        id,
        name,
        iframe,
        loaded?
    } */
    createEdge(EDGES.C0),
    createEdge(EDGES.D0)
];

const surface_iframe = document.getElementById('3d-graph').contentWindow;

const BASE_URL = window.location.href;
const SURFACE_EDITOR_LOCAL_URL = 'Surface_Editor_3D/index.html';
const SURFACE_EDITOR_URL = `${BASE_URL}${SURFACE_EDITOR_LOCAL_URL}`;
const CURVE_EDITOR_LOCAL_URL = 'Curve_Editor_2D/index.html';
const CURVE_EDITOR_URL = `${BASE_URL}${CURVE_EDITOR_LOCAL_URL}`;

let numLoaded = 0;

var outputParameterInfo = {
    type: null, // AM frequency, Drawing Frequency, Amplitude
    maximum: null, // e.g. 40 (kHz)
    unitType: null, // e.g. kHz
    jndInfo: null, // weber fraction, or possibly some other information if necessary
    minimumDistinguishableOutput: null,
    set: false // info has not been set yet
}

let state_serialization = {};


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

function setup() {
    // Receive Message from iFrames
    window.addEventListener('message', receivedMessageFromIframe);
}

function establishCommunicationWithEdge(edge) {
    // iframes are the first to establish communication, so nothing currently needs to happen here right now
}


function sendMessage(iframe, title, content='') {
    iframe.postMessage({
        editor_source: true,
        source: 'Parent',
        title: title,
        content: content
    }, getUrl(iframe));
}

function receivedMessageFromIframe(event) {
    if (!event || !event.data || !event.data.editor_source)
        return;
    switch (event.data.title) {
        case "Loaded":
            iframeLoaded();
            break;
        case "Axis Updated":
            axisUpdated(event.data);
            break;
        case "Graph Updated":
            graphUpdated(event.data.content);
            break;
        case "Update Endpoint":
            updateEndpoint(event.data.content);
            break;
        case "Surface Output Values":
            updateSurfaceOutputValues(event.data.content);
            break;
        case "State Serialization":
            stateSerializationReceived(event.data.content);
            break;
    }
}

function iframeLoaded() {
    numLoaded ++;
    if (numLoaded == edges.length+1)
        iframesLoaded();
}

function iframesLoaded() {
    edges.forEach(edge => {
        edge.loaded = true;
        sendMessage(edge.iframe, 'axis', edge.id);
        if (outputParameterInfo.set)
            sendOutputParameterInfoToEdge(edge);
    })
}

function getUrl(iframe) {
    if (iframe == surface_iframe)
        return SURFACE_EDITOR_URL;
    for (const edge of edges) {
        if (iframe == edge.iframe)
            return CURVE_EDITOR_URL;
    }
}

function axisUpdated(data) {
    const update_info = data.content;
    const curve_info = update_info.curve_info;
    const additional_messages = update_info.additional_messages;
    updateSurface(data);
}

function updateSurface(data) {
    const edge_id = data.source;
    sendMessage(surface_iframe, "Update", {
        edge: edge_id,
        update_info: data.content
    });
}

function updatePolynomialDegree(deg) {
    sendMessage(surface_iframe, 'Interpolation Function', {
        func: 'Polynomial',
        deg: deg
    });
}

function updateInterpolationFunction(interp_function) {
    // interp_function based on interp_btn.innerText (from #interpolation-functions > button)
    let content;
    switch (interp_function) {
        case 'Sin':
            content = {
                func: 'Sin'
            };
            break;
        case 'Linear':
            content = {
                func: 'Linear'
            };
            break;
        case 'Polynomial':
            content = {
                func: 'Polynomial',
                deg: Number.parseFloat(document.getElementById('polynomial-degree').value)
            };
            break;
        case 'Standard':
            content = {
                func: 'Coons',
                edge_schema: 'Average'
            };
            break;
        case 'Straight-Edge':
            content = {
                func: 'Coons',
                edge_schema: 'Straight'
            };
            break;
        case 'Four-Edge':
            content = {
                func: 'Coons',
                edge_schema: 'Four-Edge'
            };
            break;
        case 'Oppose-Edge':
            content = {
                func: 'Coons',
                edge_schema: 'Oppose-Edge'
            };
            break;
    }
    sendMessage(surface_iframe, 'Interpolation Function', content);
}

function updateEqualEndpointSchema() {
    sendMessage(surface_iframe, 'Update Equal Endpoint Schema');
}

function updateInputPoint(x, y) {
    if (arguments[0] == null) {
        return;
    }
    x = constrain(x, 0, 1);
    y = constrain(y, 0, 1);
    sendMessage(surface_iframe, 'Update Input Point', {
        x: x,
        y: y
    });
    edges.forEach(edge => {
        if (edge.axis == AXES.X)
            sendMessage(edge.iframe, 'Update Input Point', {
                x: x
            });
        if (edge.axis == AXES.Y)
            sendMessage(edge.iframe, 'Update Input Point', {
                x: y
            });
    })
}

function constrain(val, min, max) {
    return Math.min(max, Math.max(val, min));
}

function round(val, precision=0) {
    return Math.round(val*10**precision)/(10**precision)
}

function graphUpdated(content) {
    if (content.output_value != undefined) {
        updateOutputValue(content.output_value);
    }
    ExternalInterfacer.surfaceUpdated();
}

function updateEndpoint(content) {
    const endpoint = content.endpoint;
    const y = content.y;
    const edge = endpointToEdge(endpoint);
    if (!edge.loaded)
        return;
    const iframe = edge.iframe;
    if (!iframe)
        return;
    let isMin = isMinEndpoint(endpoint);
    sendMessage(iframe, 'Update Endpoint', {
        y: y,
        end: isMin ? 'min' : 'max',
    });
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

function isMinEndpoint(endpoint) {
    return [ENDPOINTS.C0_0,ENDPOINTS.D0_0,ENDPOINTS.C1_0,ENDPOINTS.D1_0].includes(endpoint);
}

function updateCurveType(edge, curve_type) {
    // curve_type based on curve_btn.innerText from ui
    const iframe = edge.iframe;
    let content;
    switch (curve_type) {
        case 'Curve':
            content = {
                type: 'Bezier'
            };
            break;
        case 'Steps':
            content = {
                type: 'Steps'
            };
            break;
    }
    sendMessage(iframe, 'Curve Type', content);
}

function updateStepType(edge, step_type, num_steps) {
    // step_type based on step_btn.innerText from ui
    const iframe = edge.iframe;

    let content = {
        type: undefined,
        num_steps: num_steps
    };
    switch (step_type) {
        case 'Linear':
            content.type = 'Linear Steps';
            break;
        case 'Natural':
            content.type = 'Natural Steps';
            break;
    }
    sendMessage(iframe, 'Curve Type', content);
}

function updateEdgeStepCount(edge, num_steps) {
    const iframe = edge.iframe;

    if (num_steps < 1)
        return;
    if (getCurveType(edge) != 'Steps' && !usingTemplate(edge))
        return;

    sendMessage(
        iframe, 
        'Step Count',
        {
            type: getStepType(edge),
            num_steps: num_steps
        }
    );
}

function getAxesTitles() {
    return [
        'X-Axis',
        'Y-Axis'
    ];
    // needs to change to be dynamic
}

function sendOutputParameterInfoToEdge(edge) {
    sendMessage(edge.iframe, 'Output Parameter Information', outputParameterInfo);
}

function createEdge(edge_id, options={}) {
    let axis = options.axis;
    if (!axis) {
        switch (edge_id) {
            case EDGES.C0:
            case EDGES.C1:
                axis = AXES.X;
                break;
            case EDGES.D0:
            case EDGES.D1:
                axis = AXES.Y;
                break;
        }
    }
    let name = options.name;
    if (!name) {
        name = defaultEdgeName(edge_id);
    }
    return {
        id: edge_id,
        name: name,
        axis: axis,
        iframe: options.iframe ? options.iframe : undefined,
        loaded: options.loaded != undefined ? options.loaded : false,
        setup: false,
        grid_neighbors: options.grid_neighbors ? options.grid_neighbors : null,
    };
}

function updateEdgeName(edge, name) {
    edge.name = name;
    const label = getEdgeContainer(edge).getElementsByClassName('edge-label')[0];
    if (label.value != name) {
        label.value = name;
    }
    sendMessage(surface_iframe, "Edge Name", {
        id: edge.id,
        name: name
    });
}

function defaultEdgeName(edge_id) {
    switch (edge_id) {
        case EDGES.C0:
            return 'X Axis';
        case EDGES.C1:
            return 'X2 Axis';
        case EDGES.D0:
            return 'Y Axis';
        case EDGES.D1:
            return 'Y2 Axis';
    }
}

// return array of edges not including edge
function otherEdges(edge) {
    const other_edges = [];
    edges.forEach(edge2 => {
        if (edge2 != edge)
            other_edges.push(edge2);
    })
    return other_edges;
}

function requestSurfaceOutputValues(output_steps_x, output_steps_y) {
    sendMessage(surface_iframe, "Send Output Values", {
        output_steps_x: output_steps_x,
        output_steps_y: output_steps_y
    });
}

function updateSurfaceOutputValues(values) {
    ExternalInterfacer.updateSurfaceOutputValues(values);
}

function requestStateSerialization() {
    sendMessage(surface_iframe, "Send State Serialization");
}

function stateSerializationReceived(state_serialization) {
    ExternalInterfacer.updateStateSerialization(state_serialization);
}
