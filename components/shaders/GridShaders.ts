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
      // vDirection (+1 or -1) flips which way the time term moves the pulse,
      // so lines travel toward progress 1 OR progress 0, randomly per line —
      // on top of vPhase, which only offsets where each line starts.
      float pulsePos = fract(uTime * speed * vDirection + vPhase);

      // Distance "behind" the beam's head, wrapping across the 0/1 seam.
      float behind = pulsePos - vProgress;
      if (behind < 0.0) behind += 1.0;

      float tailLength = 0.35;
      float brightness = behind < tailLength ? (1.0 - behind / tailLength) : 0.0;
      brightness = pow(brightness, 2.0);

      // Nothing moving here → fully transparent, not a dim base color.
      gl_FragColor = vec4(uBeamColor, brightness);
    }
  `,
};
