precision mediump float;
varying float yValue;
uniform float uMin;
uniform float uMax;

vec4 getColorForValue(float value) {
  vec4 white = vec4(1.0);
  vec4 red = vec4(1.0, 0.0, 0.0, 1.0);
  vec4 yellow = vec4(1.0, 1.0, 0.0, 1.0);
  vec4 green = vec4(0.0, 1.0, 0.0, 1.0);
  vec4 blue = vec4(0.0, 0.0, 1.0, 1.0);

  value = clamp(value, 0.0, 1.0);
  float color_value = value * 4.0;
  float color_fract = fract(color_value);

  if (color_value < 1.0) {
    return mix(white, red, color_fract);
  } else if (color_value < 2.0) {
    return mix(red, yellow, color_fract);
  } else if (color_value < 3.0) {
    return mix(yellow, green, color_fract);
  }
  return mix(green, blue, color_fract);
}

void main() {
  float normalizedY = (yValue - uMin) / (uMax - uMin);
  gl_FragColor = getColorForValue(normalizedY);
}
