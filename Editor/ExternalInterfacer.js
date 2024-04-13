/* Communication Interface with External Software */
class ExternalInterfacer {
    static initialized = false;

    // when to give external software output
    static UPDATE_MODES = {
        ON_UPDATE: 'ON_UPDATE', // update external software every time output is updated
        BY_REQUEST: 'BY_REQUEST' // only update external software when specifically requested
    }
    static OUTPUT_FORMATS = {
        JAVASCRIPT_ARRAY: 'JAVASCRIPT_ARRAY',
        JSON: 'JSON', // same as JAVASCRIPT_ARRAY but just converted to a string
        CSV: 'CSV'
    }

    static update_mode;

    static output_format;
    static output_steps_x;
    static output_steps_y;

    static _parent_source = "*";

    static _needs_update = 0;

    static init(options={}) {
        this.initialized = true;
        this.setUpdateMode(options.update_mode);
        this.setOutputFormat(options.output_format);
        this.setOutputSteps(options.output_steps_x, options.output_steps_y);
        this.sendMessageToExternalSoftware('Initialized');
    }

    static setUpdateMode(update_mode=this.UPDATE_MODES.BY_REQUEST) {
        this.update_mode = update_mode;
    }

    static setOutputFormat(output_format=this.OUTPUT_FORMATS.JAVASCRIPT_ARRAY) {
        this.output_format = output_format;
    }

    static setOutputSteps(output_steps_x=20, output_steps_y=20) {
        this.output_steps_x = output_steps_x;
        this.output_steps_y = output_steps_y;
    }

    static surfaceUpdated() {
        if (this.update_mode === this.UPDATE_MODES.ON_UPDATE) {
            this.getOutput();
        }
    }

    static getOutput() {
        this._needs_update ++;
        requestSurfaceOutputValues(this.output_steps_x, this.output_steps_y);
    }

    static updateSurfaceOutputValues(values) {
        if (this._needs_update > 0) {
            this._needs_update --;
            const formatted = this.formatOutputValues(values);
            this.sendOutputValuesToExternalSoftware(formatted);
        }
    }

    static formatOutputValues(values) {
        switch (this.output_format) {
            case this.OUTPUT_FORMATS.JAVASCRIPT_ARRAY:
                return values;
            case this.OUTPUT_FORMATS.JSON:
                return JSON.stringify(values);
            case this.OUTPUT_FORMATS.CSV:
                return this.convertToCsv(values);
        }
    }

    static convertToCsv(values) {
        const precision = 20;
        let str;
        str = 'x,y,z';
        values.forEach(val => {
            str += `\n${val.x.toFixed(precision)},${val.y.toFixed(precision)},${val.z.toFixed(precision)}`;
        })
        return str;
    }

    static sendOutputValuesToExternalSoftware(values) {
        this.sendMessageToExternalSoftware('Output', values);
    }

    static getStateSerialization() {
        requestStateSerialization();
    }

    static updateStateSerialization(state_serialization) {
        this.sendStateSerializationToExternalSoftware(state_serialization);
    }

    static sendStateSerializationToExternalSoftware(state_serialization) {
        this.sendMessageToExternalSoftware('State Serialization', state_serialization);
    }

    static receivedMessageFromExternalSoftware(event) {
        if (!event || !event.data)
            return;
        switch (event.data.title) {
            case "Init":
                ExternalInterfacer.init(event.data.content);
                break;
            case "Set Update Mode":
                ExternalInterfacer.setUpdateMode(event.data.content);
                break;
            case "Set Output Format":
                ExternalInterfacer.setOutputFormat(event.data.content);
                break;
            case "Set Output Steps":
                ExternalInterfacer.setOutputSteps(event.data.content.output_steps_x, event.data.content.output_steps_y);
                break;
            case "Get Output":
                ExternalInterfacer.getOutput();
                break;
            case "Get State Serialization":
                ExternalInterfacer.getStateSerialization();
                break;
        }
    }

    static loaded() {
        this.sendMessageToExternalSoftware('Loaded');
    }

    static sendMessageToExternalSoftware(title, content='') {
        window.parent.postMessage({
            source: 'Parameter Editor',
            title: title,
            content: content,
        }, this._parent_source);
    }
}