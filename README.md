# Graphical Multi-Input Surface Editor for Mid-Air Haptic Parameter Control


**Author:** James Weber

**Date:** April 12, 2024

Submitted as an Honors Thesis to Barrett, The Honors College at Arizona State University.

-------------------------------------------------

Paper: [Design of a Graphical Multi-Input Surface Editor for Mid-Air Haptic Parameter Control](Design_of_a_Graphical_Multi-Input_Surface_Editor_for_Mid-Air_Haptic_Parameter_Control.pdf)

Entry in KEEP digital library: <https://keep.lib.asu.edu/items/192726>

Use: <https://main.d3jc0fo8rfy14f.amplifyapp.com/>

-------------------------------------------------

This is a surface and curve editor tailored for ultrasonic phased array mid-air haptic parameter control. The editor can be used to design a function which maps the relationship between one or two user-defined input parameters and a phased array output parameter.

![Screenshot of surface editor, with edge along the x-axis labeled "Vehicle Velocity" and being defined by 2D curve editor (top right) using just noticeable difference ranges to make non-linear steps. Edge along y-axis labeled "Vehicle Roughness" and is defined by 2D curve editor (bottom right) using a smooth curve ](images/Example-Image.png)

### What are the parameters?
The surface editor is tailored for modeling relationships between user-defined input parameters and a phased array output parameter.

The output parameter can be any phased array output parameter, but the editor is modeled specifically for amplitude, amplitude modulation frequency, and drawing frequency. z-values correspond with output for the specified parameter.

Input parameters are whatever variables that you want to affect phased array output. x- and y-values correspond with inputs from the input parameters.

## Use
The editor can be used on its own from [Editor/index.html](Editor/index.html), or it can be used in an external software interfacing with [ParameterEditor.js](ParameterEditor.js).

Design a 3D surface's edges with the 2D curve editors. 

In the 2D curve editors, drag control points, and click along the curve to add more control points. Change the curve type to steps, and use information about just noticeable differences to better understand how end-users will perceive changes in output.

In the 3D surface editor, choose an ideal interpolation method to define how the surface blends between its edges.

## Interfacing with the Editor via ParameterEditor

### Getting Started

You can set up the editor by including this code snippet in your HTML page.

```
<script src="https://parameter-editor.s3.amazonaws.com/ParameterEditor.js"></script>
```

Another option is to download this repository and directly integrate it into your software.


### Initialization

```
ParameterEditor.init(); // initialize the editor
```

Initialization will connect to the editor via an HTML iframe element. The editor can connect to an existing iframe element, or create a new one

```
ParameterEditor.init({id: iframe_id}); // connect to existing an iframe with id=iframe_id
```

Initialization Options
```
options: {
    id {string}, // id of iframe to connect with
    output_format {string}, // format for output values
    output_steps_x {number}, // number of steps along x-axis to take surface output 
    output_steps_y {number}, // number of steps along y-axis to take surface output 
    listeners {Array<Function>} // listeners to receive editor data on updates
}
ParameterEditor.init(options);
```

---------------------

### Getting Output

Get a table of outputs from the designed surface
```
ParameterEditor.getOutput().then((output_values) => {
    output_values.forEach(val => {
        console.log(val); // {x: number, y: number, z: number}
    })
})
```

Get updated output values with an event listener which listens for updates in the surface editor (Modeled after [EventTarget: addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener))
```
ParameterEditor.addUpdateListener((output_values) => {
    // called every update
    console.log(output_values);
})
```

Stop listening for updates (Modeled after [EventTarget: removeEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener))
```
// Start listening for updates
ParameterEditor.addUpdateListener(on_update);
// Stop listening for updates
ParameterEditor.removeUpdateListener(on_update);
```

Format output values
```
ParameterEditor.setOutputFormat(format);
```
Supported formats:
```
ParameterEditor.OUTPUT_FORMATS.JAVASCRIPT_ARRAY // JavaScript array
ParameterEditor.OUTPUT_FORMATS.JSON // JSON text data
ParameterEditor.OUTPUT_FORMATS.CSV // CSV text data
```

Set number of output values per input axis
```
// total number of output values = output_steps_x * output_steps_y
ParameterEditor.setOutputSteps(output_steps_x, output_steps_y);
```

## File Structure
```
- Editor
  - index.html
  - ExternalInterfacer.js
  - external_communication.js
  - editor_communication.js
  - ui.js
  + Surface_Editor_3D
    - index.html
    - sketch.js
  + Curve_Editor_2D
    - index.html
    - sketch.js
(some files omitted)
```

### Editor

The Editor directory contains logic for interfacing with the ParameterEditor, and for combining and communicating with the 3D surface editor and the 2D curve editors.

**editor_communication.js** handles communication with the editors

**ui.js** deals with logic behind the user interface

**ExternalInterfacer.js** interfaces with ParameterEditor

**external_communication.js** initializes communication with ParameterEditor through ExternalInterfacer

### Curve_Editor_2D

The Curve_Editor_2D directory contains the logic for the 2D curve editor. All logic is performed by **sketch.js**, which handles communication with **Editor/editor_communication.js**, and models the curve via user interaction.

### Surface_Editor_3D

The Surface_Editor_3D directory contains the logic for the 3D surface editor. All logic is performed by **sketch.js**, which handles communication with **Editor/editor_communication.js**, and models the surface based on its edges and interpolation method.


## License

This project is licensed under the MIT License. For more details, see the [LICENSE](LICENSE) file in the repository.

### MIT License

Copyright (c) 2024 James Weber

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
