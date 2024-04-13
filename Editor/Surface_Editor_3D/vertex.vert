attribute vec3 aPosition;
varying float yValue;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

void main() {
  yValue = aPosition.y;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
