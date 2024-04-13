/* 
 * UI
 * Control/Add Functionality to UI
*/
document.addEventListener('DOMContentLoaded', setup);

let graph_x_input = document.getElementById('x-input');
let graph_y_input = document.getElementById('y-input');

let interpolation_functions_container = document.getElementById('interpolation-functions');

let surface_extra_controls = document.getElementById('graph-extra-controls');

const SURFACE_ID = 'surface';

let grid_ui = {
    left: [
        SURFACE_ID,
    ],
    top_right: [
        
    ],
    bottom_right: [
        
    ]
}

function setup() {
    setupMagicBoxes();

    setupGraph();
    setupEdges();

    setupInterpolationFunctions();
}

function setupGraph() {
    graph_x_input.oninput = graphInputPointUpdated;
    graph_y_input.oninput = graphInputPointUpdated;
    
    const interpolation_functions_container = document.getElementById('interpolation-functions');
    const interp_buttons = [...interpolation_functions_container.getElementsByTagName('button')];
    onlyOneSelected(interp_buttons);
}

function setupEdges() {
    edges.forEach(edge => {
        if (!edge.setup)
            setupEdge(edge);
    });
}

function setupEdge(edge) {
    createEdgeUI(edge);
    establishCommunicationWithEdge(edge);
    edge.setup = true;
}

function getGridCell(id) {
    for (const cell in grid_ui)
        for (const id2 of grid_ui[cell])
            if (id === id2)
                return document.getElementsByClassName('grid-'+cell.replaceAll('_', '-'))[0];
}

function getGridNeighbors(id) {
    for (const cell in grid_ui)
        if (grid_ui[cell].includes(id))
            return grid_ui[cell];
}

function showGridCellElement(id) {
    [...getGridCell(id).children].forEach(child => {
        if (child.id.includes(id)) {
            child.classList.remove('hidden');
        } else {
            child.classList.add('hidden');
        }
    });
}

function createEdgeUI(edge) {
    addEdgeToGridCell(edge);
    addEdgeContent(edge);
    addAxisExtraControlUI(edge);
    showGridCellElement(edge.id);
}

function addEdgeToGridCell(edge) {
    // grid location
    if (edge.axis == AXES.X) {
        grid_ui.top_right.push(edge.id);
    } else {
        grid_ui.bottom_right.push(edge.id);
    }
    edge.grid_neighbors = getGridNeighbors(edge.id);

    const grid_cell = getGridCell(edge.id);

    const container = document.createElement('div');
    container.id = `${edge.id}-container`;
    container.className = 'edge-container';
    grid_cell.append(container);
    return container;
}

function getEdgeContainer(edge) {
    return document.getElementById(`${edge.id}-container`);
}

function addEdgeContent(edge) {
    const container = getEdgeContainer(edge);
    
    // label row
    const label_row = document.createElement('div');
    label_row.className = 'edge-label-row';

    // create label
    const label = document.createElement('input');
    label.id = `${edge.id}-label`;
    label.className = 'unformatted-input edge-label';
    label.type = 'text';
    label.value = edge.name;
    label.onclick = highlightInput;
    label.oninput = () => {
        updateEdgeName(edge, label.value);
        resizeInput(label);
    }
    resizeInput(label);
    label_row.append(label);

    const grid_location = edge.grid_neighbors.indexOf(edge.id);
    const grid_length = edge.grid_neighbors.length;

    // arrows to switch between edges
    const arrow_l = document.createElement('button');
    arrow_l.id = `${edge.id}-arrow-left`;
    arrow_l.innerText = '<';
    arrow_l.className = 'grid-switch-arrow grid-switch-arrow-left';
    label_row.append(arrow_l);
    if (grid_location-1 < 0)
        arrow_l.classList.add('hidden');
    arrow_l.onclick = () => {
        shiftGridCellLeft(edge);
    }

    const arrow_r = document.createElement('button');
    arrow_l.id = `${edge.id}-arrow-right`;
    arrow_r.innerText = '>';
    arrow_r.className = 'grid-switch-arrow grid-switch-arrow-right';
    label_row.append(arrow_r);
    if (grid_location+1 > grid_length-1)
        arrow_r.classList.add('hidden');
    arrow_r.onclick = () => {
        shiftGridCellRight(edge);
    }

    container.append(label_row);

    if (edge.iframe)
        return;
    // create iframe
    const iframe = document.createElement('iframe');
    iframe.id = `${edge.id}-iframe`;
    iframe.src = CURVE_EDITOR_LOCAL_URL;
    iframe.className = 'edge-iframe';
    container.append(iframe);

    edge.iframe = iframe.contentWindow;
}

function shiftGridCellLeft(edge) {
    shiftGridCell(edge, {left: true});
}

function shiftGridCellRight(edge) {
    shiftGridCell(edge, {left: false});
}

function shiftGridCell(edge, l_option={left:true}) {
    const left = l_option.left;

    const grid_neighbors = edge.grid_neighbors;
    const grid_location = grid_neighbors.indexOf(edge.id);

    const next_edge_pos = left ? grid_location-1 : grid_location+1;
    if (next_edge_pos < 0 || next_edge_pos > grid_neighbors.length-1)
        return;

    const next_edge_id = grid_neighbors[next_edge_pos];
    const next_edge = getEdge(next_edge_id);

    setGridCell(next_edge);
}

function setGridCell(edge) {
    showGridCellElement(edge.id);
    updateSwitchGridArrows(edge);
}

function updateSwitchGridArrows(edge) {
    const grid_neighbors = edge.grid_neighbors;
    const grid_location = grid_neighbors.indexOf(edge.id);

    const container = getEdgeContainer(edge);
    const arrows = [...container.getElementsByClassName('grid-switch-arrow')];
    
    arrows.forEach(arrow => {
        if (arrow.classList.contains('grid-switch-arrow-left')) {
            // left arrow
            if (grid_location-1 < 0) {
                arrow.classList.add('hidden');
            } else {
                arrow.classList.remove('hidden');
            }
        } else if (arrow.classList.contains('grid-switch-arrow-right')) {
            // right arrow
            if (grid_location+1 > grid_neighbors.length-1) {
                arrow.classList.add('hidden');
            } else {
                arrow.classList.remove('hidden');
            }
        }
    })
}

function graphInputPointUpdated() {
    const x_text = graph_x_input.value;
    const y_text = graph_y_input.value;
    if (x_text == '' || y_text == '')
        return updateInputPoint(null);
    let x = Number.parseFloat(x_text);
    let y = Number.parseFloat(y_text);
    updateInputPoint(x, y);
}

function setupInterpolationFunctions() {
    const interpolation_function_buttons = [...interpolation_functions_container.getElementsByTagName('button')];
    onlyOneSelected(interpolation_function_buttons);
    interpolation_function_buttons.forEach(interp_btn => {
        interp_btn.addEventListener('click', () => {
            interpolationFunctionButtonPressed(interp_btn.innerText);
        });
    });
    // polynomial degree for polynomial interpolation function
    document.getElementById('polynomial-degree').oninput = () => {
        if (!document.getElementById('polynomial-degree').value)
            return;
        let deg;
        try {
            deg = Number.parseFloat(document.getElementById('polynomial-degree').value);
        } catch {
            return;
        }
        if (isNaN(deg))
            return;
        if (deg < 0)    // deg should never really be 0, but I think it can help users understand polynomial interpolation better if they can play around with it a bit
            return;
        updatePolynomialPath();
        if (document.getElementById('polynomial-interpolation-btn').classList.contains('selected')) {
            updatePolynomialDegree(deg)
        }
    }
}

function interpolationFunctionButtonPressed(interp_function) {
    updateInterpolationFunction(interp_function);
    if (interp_function === 'Four-Edge') {
        if (!isFourEdgesSetUp())
            setupFourEdges();
    } else {
        switchToFrontEdges();
    }
}

function updatePolynomialPath() {
    const degree = Number.parseFloat(document.getElementById('polynomial-degree').value);
    // num points added to path
    const resolution = 100;
    const w = 100, h = 100;
    let d = "M0 100";
    for (let i = 1; i < resolution; i++) {
        const x = i / resolution;   // from 0 to 1
        const x_factor = x <= 0.5 ? x * 2 : (1-(x%1)) * 2;
        const y_factor = x_factor ** degree;
        const y = x <= 0.5 ? y_factor*0.5 : 1 - y_factor*0.5;
        d += ` L${x*w} ${(1-y)*h}`;
    }
    d += ` L${w} 0`;
    const pathEl = document.getElementById('polynomial-svg-path');
    pathEl.setAttribute('d', d);
}

function addAxisExtraControlUI(edge) {
    const id = `${edge.id}-extra-controls`;

    const edge_container = getEdgeContainer(edge);

    const extra_controls_container = document.createElement('div');
    extra_controls_container.id = id;
    extra_controls_container.className = 'axis-extra-controls dropdown';

    edge_container.prepend(extra_controls_container);

    const extra_controls_mb_info = createMagicBox(id);
    const extra_controls_wand = extra_controls_mb_info.wand;
    const extra_controls_mb = extra_controls_mb_info.mb;

    extra_controls_wand.classList.add('extra-controls-wand');
    extra_controls_mb.classList.add('extra-controls-mb');

    extra_controls_container.append(extra_controls_wand);
    extra_controls_container.append(extra_controls_mb);

    const icon = verticalDotsIcon(0.3, "cursor: pointer; display: block; float: left; opacity: 0.6; position: relative; top: -30px;");
    extra_controls_wand.append(icon);

    const curve_types = [
        'Curve',
        'Steps'
    ];
    const selected_curve_type = 'Curve';

    const step_types = [
        'Linear',
        'Natural'
    ];
    const selected_step_type = 'Linear';

    const curve_types_container = document.createElement('div');
    extra_controls_mb.append(curve_types_container);
    curve_types_container.id = `${edge.id}-axis-curve-types`;
    curve_types_container.className = 'curve-types';
    
    const curve_types_buttons = [];
    curve_types.forEach(curve_type => {
        const btn = document.createElement('button');
        btn.classList.add('curve-type');
        btn.innerText = curve_type;
        if (curve_type == selected_curve_type)
            btn.classList.add('selected');
        if (curve_type == 'Steps')
            btn.addEventListener('click', () => {
                if (!outputParameterInfo.type)
                    openJndPopup();
            });
        curve_types_buttons.push(btn);
        curve_types_container.append(btn);
        btn.addEventListener('click', () => {
            curveBtnClicked(btn, edge);
        });
    });
    onlyOneSelected(curve_types_buttons);

    const step_types_container = document.createElement('div');
    step_types_container.id = `${edge.id}-axis-step-types`;
    step_types_container.className = 'step-types';

    const step_count_el = document.createElement('input');
    step_count_el.id = `${edge.id}-axis-step-count`;
    step_count_el.className = 'step-count';
    step_count_el.setAttribute('type', 'number');
    step_count_el.setAttribute('value', 5);
    step_count_el.setAttribute('step', 1);
    step_count_el.setAttribute('min', 1);
    step_count_el.addEventListener('input', () => {
        const num_steps = Number.parseInt(step_count_el.value);
        updateEdgeStepCount(edge, num_steps);
    })

    step_types_container.append(step_count_el);

    const step_types_buttons = [];
    step_types.forEach(step_type => {
        const btn = document.createElement('button');
        btn.innerText = step_type;
        step_types_buttons.push(btn);
        step_types_container.append(btn);
        btn.classList.add('step-type');
        if (step_type == selected_step_type)
            btn.classList.add('selected');
        btn.addEventListener('click', () => {
            stepTypeBtnClicked(btn, edge, step_count_el);
        })
    });
    onlyOneSelected(step_types_buttons);

    const jnd_button = document.createElement('button');
    jnd_button.innerText = 'JND Menu';
    jnd_button.addEventListener('click', openJndPopup);

    step_types_container.append(jnd_button);

    const step_button = getButton(curve_types_buttons, 'Steps');
    const curve_button = getButton(curve_types_buttons, 'Curve');
    addSRFunctionality(step_button, curve_button, step_types_container, false);

    extra_controls_mb.append(step_types_container);

    // Other ExtraControl Buttons
    addMiscEdgeExtraControlButtons(extra_controls_mb, edge);
}


function curveBtnClicked(curve_btn, edge) {
    updateCurveType(edge, curve_btn.innerText);
}

function stepTypeBtnClicked(curve_btn, edge, step_count_el) {
    const num_steps = Number.parseFloat(step_count_el.value);
    updateStepType(edge, curve_btn.innerText, num_steps);
}

function addMiscEdgeExtraControlButtons(extra_controls_mb, edge) {
    const iframe = edge.iframe;

    const template = document.createElement('button');
    template.innerText = 'Template';
    template.addEventListener('click', () => {
        template.classList.toggle('selected');
        if (template.classList.contains('selected')) {
            sendMessage(iframe, 'Show Template');
            if (getCurveType(edge) != 'Curve')
                getExtraControlButton(edge, 'Curve').click();
        } else {
            sendMessage(iframe, 'Hide Template');
        }
    });
    extra_controls_mb.append(template);

    const a = document.createElement('button');
    a.innerText = 'Flip';
    a.addEventListener('click', () => {
        sendMessage(iframe, 'Horizontally Invert');
    })
    extra_controls_mb.append(a);
}

function getExtraControls(edge) {
    return document.getElementById(`${edge.id}-extra-controls`);
}

function getExtraControlButton(edge, innerText) {
    const buttons = [...getExtraControls(edge).getElementsByTagName('button')];
    return getButton(buttons, innerText);
}

/* Based on curve_type_btn.innerText */
function getCurveType(edge) {
    const extra_controls = getExtraControls(edge);
    const curve_types_container = extra_controls.getElementsByClassName('curve-types')[0];
    const curve_type_buttons = [...curve_types_container.getElementsByClassName('curve-type')];
    for (let curve_type_btn of curve_type_buttons) {
        if (curve_type_btn.classList.contains('selected'))
            return curve_type_btn.innerText;
    }
}

/* Based on `${step_type_btn.innerText} Steps` */
function getStepType(edge) {
    const extra_controls = getExtraControls(edge);
    const step_types_container = extra_controls.getElementsByClassName('step-types')[0];
    const step_type_buttons = [...step_types_container.getElementsByClassName('step-type')];
    for (let step_type_btn of step_type_buttons) {
        if (step_type_btn.classList.contains('selected'))
            return `${step_type_btn.innerText} Steps`;
    }
}

function usingTemplate(edge) {
    const template_btn = getExtraControlButton(edge, 'Template');
    return template_btn.classList.contains('selected');
}

function updateOutputValue(val) {
    val = round(val, 10);
    document.getElementById('z-output').innerText = val;
}

function openJndPopup() {
    if (!document.getElementById("incorporating-jnds-window"))
        createIncorporatingJNDSPopUp();
}

/*
 C. Lim, G. Park, and H. Seifi, "Designing Distinguishable Mid-Air Ultrasound Tactons with Temporal Parameters," in Proc. ACM CHI Conf. Human Factors in Computing Systems (CHI2024), 2024.

 K. Wojna, O. Georgiou, D. Beattie, W. Frier, M. Wright, and C. Lutteroth, "An Exploration of Just Noticeable Differences in Mid-Air Haptics," in 2023 IEEE World Haptics Conference (WHC), Delft, Netherlands, 2023, pp. 410-416, doi: 10.1109/WHC56415.2023.10224388. 

 I. Rutten, W. Frier, and D. Geerts, "Discriminating Between Intensities and Velocities of Mid-Air Haptic Patterns," in Haptics: Science, Technology, Applications: 12th International Conference, EuroHaptics 2020, Proceedings, Leiden, The Netherlands, Sept. 6-9, 2020, pp. 78-86, doi: 10.1007/978-3-030-58147-3_9.

 T. Howard, G. Gallagher, A. Lécuyer, C. Pacchierotti, and M. Marchal, "Investigating the Recognition of Local Shapes Using Mid-air Ultrasound Haptics," in 2019 IEEE World Haptics Conference (WHC), Tokyo, Japan, 2019, pp. 503-508, doi: 10.1109/WHC.2019.8816127.
*/
function defaultJNDInformation() {
    return [
        {
            'Output_Parameter' : 'Drawing Frequency',
            'Weber_Fraction' : 20.7,
            'Minimum_Distinguishable_Output': 0.5,
            'Minimum_Distinguishable_Output_Unit_Type': 'Hz',
        },
        {
            'Output_Parameter' : 'AM Frequency',
            'Weber_Fraction' : 60,
            'Minimum_Distinguishable_Output': 200,
            'Minimum_Distinguishable_Output_Unit_Type': 'Hz',
        },
        {
            'Output_Parameter' : 'Amplitude',
            'Weber_Fraction' : 28.5,
            'Minimum_Distinguishable_Output': 600,
            'Minimum_Distinguishable_Output_Unit_Type': 'Pa',
        },
    ]
}

function createIncorporatingJNDSPopUp() {
    const popup = document.createElement('popup');
    popup.id = "incorporating-jnds-window";

    // title
    const title = document.createElement('div');
    title.style = 'font-size: 40px;';
    title.innerText = 'Incorporating JNDs';
    popup.append(title);

    // description
    const desc = document.createElement('div');
    desc.className = 'descriptor';
    desc.innerText = "Incorporate Just Noticeable Differences into the curve, based on your output parameter specifications";
    popup.append(desc);

    
    /*----------  row1 - output parameter type ----------*/
    
    
    const outputParameterRow = document.createElement('row');

    // output parameter label
    const outputParameterLabel = document.createElement('label');
    outputParameterLabel.innerText = 'Output Parameter';
    outputParameterRow.append(outputParameterLabel);

    // Select Output Parameter:
    /*
        <select>
            <option>Drawing Frequency</option>
            <option>AM Frequency</option>
            <option>Amplitude</option>
        </select>
    */
    const outputParameterSelectEl = document.createElement('select');
    outputParameterSelectEl.onchange = setPropertiesForNewOutputParameter;

    const options = [
        {
            innerText: "Drawing Frequency",
            tooltip: "The frequency the focal point rotates in a circle in temporal space around a user's palm"
        },
        {
            innerText: "AM Frequency"
        },
        {
            innerText: "Amplitude"
        },
    ];
    options.forEach(option => {
        const opEl = document.createElement('option');
        opEl.innerText = option.innerText;
        if (option.tooltip)
            opEl.title = option.tooltip;
        outputParameterSelectEl.append(opEl);
    });
    outputParameterRow.append(outputParameterSelectEl);

    // help ? information for output parameter row
    const outputParameterHelp = document.createElement('help');
    outputParameterHelp.title = 'What does your output parameter represent?';
    outputParameterHelp.innerText = '?';
    outputParameterRow.append(outputParameterHelp);

    // append row1 output parameter row
    popup.append(outputParameterRow);

    
    /*----------  row2 - maximum output  ----------*/
    
    
    const maxOutputRow = document.createElement('row');

    // maximum output label
    const maxOutputLabel = document.createElement('label');
    maxOutputLabel.innerText = 'Maximum Output';
    maxOutputRow.append(maxOutputLabel);

    // maximum output value
    const maxOutInput = document.createElement('input');
    maxOutInput.id = 'max-output';
    maxOutInput.className = 'no-step-arrows';
    maxOutInput.type = 'number';
    maxOutInput.style = 'width: 82px;';
    // default value assigned by output type
    maxOutputRow.append(maxOutInput);

    // output unit type
    /*
        <select>
            <option>kHz</option>
            <option>Hz</option>
        </select>
    */
    // options and default value assigned by output type
    const maxOutUnitSelect = document.createElement('select');
    maxOutUnitSelect.id = 'unit-type';
    maxOutputRow.append(maxOutUnitSelect);

    // append row2 maximum output
    popup.append(maxOutputRow);


    /*----------  row 3 - jnd fraction  ----------*/
    
    const jndFractionRow = document.createElement('row');

    // jnd fraction label
    const jndFractionLabel = document.createElement('label');
    jndFractionLabel.innerText = 'Weber Fraction';
    jndFractionRow.append(jndFractionLabel);

    // jnd fraction input
    const jndFractionInput = document.createElement('input');
    jndFractionInput.id = 'weber-fraction';
    jndFractionInput.className = 'no-step-arrows';
    jndFractionInput.type = 'number';
    jndFractionInput.min = 0;
    jndFractionInput.max = 100;
    // default value given by output parameter type
    jndFractionRow.append(jndFractionInput);

    // percent decorator %
    const jndPercentDecorator = document.createElement('input-decorator');
    jndPercentDecorator.innerText = '%';
    jndFractionRow.append(jndPercentDecorator);

    // help ? information for jnd fraction row
    const jndFractionHelp = document.createElement('help');
    jndFractionHelp.className = 'jnd-fraction-help';
    jndFractionHelp.title = 'The amount that a given output needs to change by in order to be distinguishable as a different output';
    jndFractionHelp.innerText = '?';
    jndFractionRow.append(jndFractionHelp);

    // tip on how increasing and decreasing jnd fractions
    const jndFractionTip = document.createElement('div');
    jndFractionTip.className = 'descriptor';
    jndFractionTip.innerText = "Increasing the Weber Fraction will make changes in output more easily noticeable and noticeable to more people.\nIt will require a greater change in output before JND steps.";
    jndFractionRow.append(jndFractionTip);

    // append jndFractionRow
    popup.append(jndFractionRow);

    
    /*----------  row4 - Minimum Distinguishable Output  ----------*/

    const minOutputRow = document.createElement('row');

    // minimum distinguishable output label
    const minOutputLabel = document.createElement('label');
    minOutputLabel.innerText = 'Minimum Distinguishable Output';
    minOutputRow.append(minOutputLabel);

    // min output output
    // 40kHz
    const minOutOutput = document.createElement('output');
    minOutOutput.id = 'min-distinguishable-output';
    // value defined by output parameter type
    minOutputRow.append(minOutOutput);

    // append minOutputRow to popup
    popup.append(minOutputRow);

    
    /*----------  row5 - Add To Axis Buttons  ----------*/
    
    
    const addToAxisRow = document.createElement('row');
    addToAxisRow.id = 'add-to-axis-row';

    // buttons added for each axis
    edges.forEach(edge => {
        const button = document.createElement('button');
        button.innerText = `Use JNDs in ${edge.name}`;
        button.onclick = () => {
            savePopupInfo();
            // send and set up jnds to edge
            setupJNDsForAxis(edge);
            // send jnd info to edge, but don't make it use jnds
            otherEdges(edge).forEach(edge2 => {
                sendOutputParameterInfoToEdge(edge2);
            });
            closePopup();
        }
        addToAxisRow.append(button);
    });

    // append addToAxisRow to popup
    popup.append(addToAxisRow);

    
    /*----------  row6 - close popup  ----------*/
    
    const closePopupRow = document.createElement('row');

    const closePopupButton = document.createElement('button');
    closePopupButton.id = 'close-incorporating-jnds-window';
    closePopupButton.innerText = 'Close without incorporating JNDs on any axes (you can always add them later)';
    closePopupButton.onclick = () => {
        savePopupInfo();
        closePopup();
        // update edges
        edges.forEach(edge => {
            sendOutputParameterInfoToEdge(edge);
        });
    }
    closePopupRow.append(closePopupButton);

    // add closePopupRow to popup
    popup.append(closePopupRow);

    
    /*----------  End of Rows  ----------*/
    
    // add popup to document
    document.body.append(popup);

    // resize and reposition popup
    popup.style.top = '0px';
    popup.style.left = '0px';

    const popupClientRect = popup.getBoundingClientRect();
    const popup_width = Math.min(0.8 * document.body.clientWidth, popupClientRect.width);
    popup.style.transform = `scale(${popup_width / popupClientRect.width}) translate(${0.5 * (document.body.clientWidth - popupClientRect.width)}px, ${0.5 * (document.body.clientHeight - popupClientRect.height)}px)`

    // set default values
    setPropertiesForNewOutputParameter();

    // output parameter updated
    function setPropertiesForNewOutputParameter() {
        const outputParameter = outputParameterSelectEl.value;

        let defaultMaxOutput;
        let outputUnitTypes; // first is default
        let defaultWeberFraction;
        let minDistinguishableOutput;
        switch (outputParameter) {
            case 'Drawing Frequency':
                defaultMaxOutput = 40;
                outputUnitTypes = [
                    'Hz',
                ];
                defaultWeberFraction = 20.7;
                minDistinguishableOutput = 0.5;
                break;
            case 'AM Frequency':
                defaultMaxOutput = 30;
                outputUnitTypes = [
                    'Hz'
                ];
                defaultWeberFraction = 60;
                minDistinguishableOutput = 200;
                break;
            case 'Amplitude':
                defaultMaxOutput = 2000;
                outputUnitTypes = [
                    'Pa',
                    'dB'
                ];
                defaultWeberFraction = 28.5;
                minDistinguishableOutput = 600;
                break;
        }

        updateJNDsUI(defaultMaxOutput, outputUnitTypes, defaultWeberFraction, minDistinguishableOutput);
        
    }

    function updateJNDsUI(defaultMaxOutput, outputUnitTypes, defaultWeberFraction, minDistinguishableOutput) {
        maxOutInput.value = defaultMaxOutput;
        maxOutInput.placeholder = defaultMaxOutput;

        [...maxOutUnitSelect.getElementsByTagName('option')].forEach(option => {
            option.remove();
        })
        outputUnitTypes.forEach(unitType => {
            const option = document.createElement('option');
            option.innerText = unitType;
            maxOutUnitSelect.append(option);
        })

        jndFractionInput.value = defaultWeberFraction;
        jndFractionInput.placeholder = defaultWeberFraction;

        minOutOutput.value = `${minDistinguishableOutput} ${outputUnitTypes[0]}`;
    }

    function savePopupInfo() {
        outputParameterInfo.type = outputParameterSelectEl.value;
        outputParameterInfo.maximum = Number.parseFloat(maxOutInput.value);
        outputParameterInfo.unitType = maxOutUnitSelect.value;
        outputParameterInfo.jndInfo = Number.parseFloat(jndFractionInput.value) / 100;
        outputParameterInfo.minimumDistinguishableOutput = Number.parseFloat(minOutOutput.value.substring(minOutOutput.value.indexOf(' ')));
        outputParameterInfo.set = true;
    }
    
    function closePopup() {
        popup.remove();
    }
}

function setupJNDsForAxis(edge) {
    sendOutputParameterInfoToEdge(edge);
    getExtraControlButton(edge, 'Natural').click();
}

function getEdge(edge_id) {
    for (const edge of edges) {
        if (edge.id == edge_id) {
            return edge;
        }
    }
}

function isFourEdgesSetUp() {
    if (!getEdge(EDGES.C1) || !getEdge(EDGES.D1))
        return false;
    if (!getEdge(EDGES.C1).setup || !getEdge(EDGES.D1).setup)
        return false;
    return true;
}

function setupFourEdges() {
    const C1 = createEdge(EDGES.C1);
    const D1 = createEdge(EDGES.D1);

    edges.push(C1);
    edges.push(D1);

    if (getEdge(EDGES.C0).name == defaultEdgeName(EDGES.C0))
        updateEdgeName(getEdge(EDGES.C0), 'X1 Axis');
    if (getEdge(EDGES.D0).name == defaultEdgeName(EDGES.D0))
        updateEdgeName(getEdge(EDGES.D0), 'Y1 Axis');

    setupEdge(C1);
    setupEdge(D1);
}

function highlightInput() {
    this.select();
}

function resizeInput(input=this) {
    input.style.width = input.value.length+2 + 'ch';
}

function switchToFrontEdges() {
    setGridCell(getEdge(EDGES.C0));
    setGridCell(getEdge(EDGES.D0));
}