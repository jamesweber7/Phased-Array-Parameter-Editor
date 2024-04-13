/* 
 * UI Functions
 * Helper Functions for UI
*/

function setupMagicBoxes() {
    // toggle magic box functionality
    [...document.getElementsByClassName('wand')].forEach(wand => {
        const wand_id = wand.id;
        const id = wand_id.replace('-wand', '')
        const mb_id = `${id}-mb`;
        const mb = document.getElementById(mb_id);
        
        addMagicBoxFunctionality(wand, mb);
    });
}

function createMagicBox(id, default_hidden=true) {
    const wand = document.createElement('div');
    wand.id = `${id}-wand`;
    wand.className = 'wand';
    const mb = document.createElement('div');
    mb.id = `${id}-mb`;
    addMagicBoxFunctionality(wand, mb, default_hidden);
    return {
        mb: mb,
        wand: wand
    };
}

// Magic Box: Clicking on wand hides/shows magic box
// T Flip Flop
function addMagicBoxFunctionality(wand, mb, default_hidden=true) {
    wand.addEventListener('click', () => {
        mb.classList.toggle('hidden');
    });
    if (default_hidden)
        mb.classList.add('hidden');
}

// if wand is selected, mb is/is not visible
// SR Flip Flop
function addSRFunctionality(set, reset, mb, default_set=true, tag='hidden') {
    set.addEventListener('click', () => {
        mb.classList.remove(tag);
    });
    reset.addEventListener('click', () => {
        mb.classList.add(tag);
    });
    if (!default_set) {
        mb.classList.add(tag);
    }
}

// Only Select One el at a time
function onlyOneSelected(els) {
    els.forEach(el => {
        el.addEventListener('click', () => {
            els.forEach(el2 => {
                el2.classList.remove('selected');
            });
            el.classList.add('selected');
        });
    })
}

function verticalDotsIcon(scale=0.5, style='') {
    const div = document.createElement('div');
    div.style = style;
    div.style.transform = `scale(${scale})`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '100');
    for (let y = 20; y <= 80; y += 30) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', "10");
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', "10");
        circle.setAttribute('fill', 'black');
        svg.append(circle);
    }
    div.append(svg);
    return div;
}

function getButton(buttons, innerText) {
    for (const btn of buttons) {
        if (btn.innerText == innerText)
            return btn;
    }
}