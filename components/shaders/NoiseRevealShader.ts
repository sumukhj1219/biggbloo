export const NoiseRevealShader = {
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    varying vec2 vUv;

    uniform sampler2D uTexture;
    uniform sampler2D uNoiseTexture;
    uniform float uTime;
    uniform float uThreshold;
    uniform vec3 uEdgeColor;

    void main() {
      vec2 wobble = vec2(
        sin(uTime * 0.8 + vUv.y * 6.0),
        cos(uTime * 0.6 + vUv.x * 6.0)
      ) * 0.06;
      vec2 noiseUv = vUv * 1.5 + vec2(uTime * 0.06, uTime * 0.04) + wobble;
      float n = texture2D(uNoiseTexture, noiseUv).r;

      float mask = smoothstep(uThreshold - 0.04, uThreshold + 0.04, n);
      if (mask < 0.02) discard;

      vec4 texColor = texture2D(uTexture, vUv);
      vec3 color = mix(uEdgeColor, texColor.rgb, smoothstep(uThreshold, uThreshold + 0.08, n));
      gl_FragColor = vec4(color, texColor.a * mask);
    }
  `,
};
