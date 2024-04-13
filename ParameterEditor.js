/* Communication Interface with the Surface Editor*/
class ParameterEditor {
    static loaded = false;
    static initialized = false;

    // Constants which set when to 
    static UPDATE_MODES = {
        ON_UPDATE: 'ON_UPDATE', // update external software every time output is updated
        BY_REQUEST: 'BY_REQUEST' // only update external software when specifically requested
    }
    static OUTPUT_FORMATS = {
        JAVASCRIPT_ARRAY: 'JAVASCRIPT_ARRAY',
        JSON: 'JSON', // same as JAVASCRIPT_ARRAY but just converted to a string
        CSV: 'CSV'
    }

    static id;
    static iframe;

    static update_mode;
    static listeners;
    
    /** Initialize Connection with Parameter Editor 
     * 
     * @param {Object} options (optional) {
     *      (optional) id {string}, // id of iframe to connect with
     *      (optional) output_format {string}, // format for output values
     *      (optional) output_steps_x {number}, // number of steps along x-axis to take surface output 
     *      (optional) output_steps_y {number}, // number of steps along y-axis to take surface output 
     *      (optional) listeners {Array<Function>} // listeners to receive editor data on updates
     * }
    */
    static init(options={}) {
        // options to be sent to iframe
        this._init_options = {
            output_format: options.output_format,
            output_steps_x: options.output_steps_x,
            output_steps_y: options.output_steps_y,
        };
        this._setId(options.id);
        this._initializeListeners(options.listeners);
        this._initializeIframe();
    }

    /**
     * This method asynchronously returns output data that can be used to save the editor's state
     *
     * @returns {Array<Object>} output_values : [
     *   {
     *     x: <number>, // The X coordinate or value.
     *     y: <number>, // The Y coordinate or value.
     *     z: <number>, // The Z coordinate or value.
     *   },
     *   // ... more x, y, z value coordinates
     * ]
     * Example usage:
     * getOutput().then(output_values => {
     *      output_values.forEach(val => {
     *          console.log(val);
     *      });
     * });
     */
    static async getOutput() {
        return await this._requestFromEditor({title: 'Get Output'}, 'Output');
    }

    /**
     * Registers an event listener for updates to the editor's surface.
     * When an update occurs, this listener invokes the provided callback function, `on_update`, 
     * passing it the event data structured as follows:
     *
     * @param {Function} on_update - Callback function to handle the event data. It accepts a single parameter:
     *   output_values: [
     *        {
     *          x: <number>, // The X coordinate or value.
     *          y: <number>, // The Y coordinate or value.
     *          z: <number>, // The Z coordinate or value.
     *        },
     *        // ... more x, y, z value coordinates
     *    ]
     *
     * Example usage:
     * addUpdateListener(function(output_values) {
     *   output_values.forEach(val => {
     *     console.log(`X: ${val.x}, Y: ${val.y}, Z: ${val.z}`);
     *   });
     * });
     */
    static addUpdateListener(on_update) {
        if (!on_update)
            return;
        if (!this.listeners.length)
            this._listenForOutput();
        this.listeners.push(on_update);
    }

    /**
     * Registers an update event listener
     * When an update occurs, this listener invokes the provided callback function, `on_update`, 
     * passing it the event data structured as follows:
     *
     * @param {Function} on_update - Callback function to identify which update event listener to remove
     * Example usage:
     * // update listener added earlier in code
     * addUpdateListener(on_update);
     * // ... later in code
     * // remove update listener
     * removeUpdateListener(on_update);
     */
    static removeUpdateListener(on_update) {
        this.listeners = this.listeners.filter(listener => listener != on_update);
        if (!this.listeners.length)
            this._stopListeningForOutput();
    }

    /**
     * Set the format for outputs returned by the editor
     *
     * @param {string} output_format // value from ParameterEditor.OUTPUT_FORMATS
     */
    static setOutputFormat(output_format=this.OUTPUT_FORMATS.JAVASCRIPT_ARRAY) {
        this._sendMessageToEditor("Set Output Format", output_format);
    }

    /**
     * Set the number of vertices in the x or y directions for outputs returned by the editor
     *
     * @param {number} output_steps_x // number of vertices in the x direction
     * @param {number} output_steps_y // number of vertices in the y direction
     */
    static setOutputSteps(output_steps_x=20, output_steps_y=20) {
        this._sendMessageToEditor("Set Output Steps", {
            output_steps_x: output_steps_x,
            output_steps_y: output_steps_y
        });
    }

    
    /*----------  Private  ----------*/

    static _editor_source_local = 'Editor'
    static _editor_source = `${window.location.href}${this._editor_source_local}`;

    static _init_options;
    

    static _setId(id='editor') {
        this.id = id;
    }

    static _initializeListeners(listeners=[]) {
        this.listeners = listeners;
        if (this.listeners.length) {
            // start listening for updates
            this._init_options.update_mode = this.UPDATE_MODES.ON_UPDATE;
            window.addEventListener('message', ParameterEditor._receiveOutputFromEditor);
        } else {
            this._init_options.update_mode = this.UPDATE_MODES.BY_REQUEST;
        }
    }

    static _initializeIframe() {
        let el = document.getElementById(this.id);;
        while (el && el.tagName != 'IFRAME') {
            this._incrementId();
            el = document.getElementById(this.id);
        }
        if (!el) {
            el = document.createElement('iframe');
            el.id = this.id;
            el.style.width = '98vw';
            el.style.height = '96vh';
            el.style.margin = '0px';
            document.body.append(el);
        }
        el.src = this._editor_source;
        el.style.minWidth = '312px';
        el.style.minHeight = '312px';

        this.iframe = el.contentWindow;

        this._waitForIframeLoad();
    }

    // element already exists with id
    static _incrementId() {
        const digit_regex = /\d+$/;
        const digit_match = this.id.match(digit_regex)[0];
        const id_num = digit_match ? digit_match[0] : 0;
        this._setId(`editor${id_num}`);
    }

    static _waitForIframeLoad() {
        const loaded_received = (event) => {
            if (!this._validateMessage(event))
                return;
            if (event.data.title === "Loaded") {
                this._iframeLoaded();
                window.removeEventListener('message', loaded_received);
            }
        };
        window.addEventListener('message', loaded_received);
    }

    static _iframeLoaded() {
        this.loaded = true;
        this._waitForInit();
    }

    static _waitForInit() {
        this._requestFromEditor({title: 'Init', content: this._init_options}, 'Initialized')
            .then(() => {
                this._initialized();
            })
    }

    static _initialized() {
        this.initialized = true;
    }

    static _setUpdateMode(update_mode=this.UPDATE_MODES.BY_REQUEST) {
        this.update_mode = update_mode;
        this._sendMessageToEditor("Set Update Mode", update_mode);
    }

    static _outputReceived(data) {
        this.listeners.forEach(on_update => {
            on_update(data);
        });
    }

    static _listenForOutput() {
        if (this.update_mode === this.UPDATE_MODES.ON_UPDATE)
            return;
        this._setUpdateMode(this.UPDATE_MODES.ON_UPDATE);
        window.addEventListener('message', ParameterEditor._receiveOutputFromEditor);
    }

    static _stopListeningForOutput() {
        if (ParameterEditor.update_mode === ParameterEditor.UPDATE_MODES.BY_REQUEST)
            return;
        ParameterEditor._setUpdateMode(ParameterEditor.UPDATE_MODES.BY_REQUEST);
        window.removeEventListener('message', ParameterEditor._receiveOutputFromEditor);
    }

    static _receiveOutputFromEditor(event) {
        if (!ParameterEditor._validateMessage(event))
            return;
        if (event.data.title != "Output")
            return;
        ParameterEditor._outputReceived(event.data.content);
    }

    static async _requestFromEditor(send_message, receive_title) {
        let content;
        await new Promise((resolve) => {
            const message_received = (event) => {
                if (!this._validateMessage(event))
                    return;
                if (event.data.title === receive_title) {
                    content = event.data.content;
                    window.removeEventListener('message', message_received);
                    resolve();
                }
            };
            window.addEventListener('message', message_received);
            this._sendMessageToEditor(send_message.title, send_message.content);
        });
        return content;
    }

    static _validateMessage(event) {
        if (!event || !event.data || event.data.source != 'Parameter Editor')
            return;
        return true;
    }

    static _sendMessageToEditor(title, content='') {
        this.iframe.postMessage({
            source: 'External Software',
            title: title,
            content: content,
        }, this._editor_source);
    }

    /* Bi-directional state serialization is not fully implemented for the editor. It should be fully implemented for the surface editor, but requires functionality for the 2D curve editor and the parent editor's ui needs to be updated */
    // /**
    //  * This method asynchronously returns serialization data that can be used to save the editor's state
    //  *
    //  * @returns {Object} serialization_data
    //  * Example usage:
    //  * getStateSerialization().then(serialization_data => {
    //  *      console.log(serialization_data);
    //  * });
    //  */
    // static async getStateSerialization() {
    //     return await this._requestFromEditor({title: 'Get State Serialization'}, 'State Serialization');
    // }
}