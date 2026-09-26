export const GridShaders = {
  vertexShader: `
    attribute float aProgress;
    attribute float aPhase;
    attribute float aDirection;
    varying float vProgress;
    varying float vPhase;
    varying float vDirection;

    void main() {
      vProgress = aProgress;
      vPhase = aPhase;
      vDirection = aDirection;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying float vProgress;
    varying float vPhase;
    varying float vDirection;

    uniform float uTime;
    uniform vec3 uBeamColor;

    void main() {
      float speed = 0.05;
      float pulsePos = fract(uTime * speed * vDirection + vPhase);

      float behind = pulsePos - vProgress;
      if (behind < 0.0) behind += 1.0;

      float tailLength = 0.35;
      float brightness = behind < tailLength ? (1.0 - behind / tailLength) : 0.0;
      brightness = pow(brightness, 2.0);

      gl_FragColor = vec4(uBeamColor, brightness);
    }
  `,
};
