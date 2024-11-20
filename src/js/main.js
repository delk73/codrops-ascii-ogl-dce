import { Camera, Mesh, Plane, Program, Renderer, RenderTarget } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';

import vertex from '../shaders/vertex.glsl?raw';
import fragment from '../shaders/fragment.glsl?raw';
import asciiVertex from '../shaders/ascii-vertex.glsl?raw';
import asciiFragment from '../shaders/ascii-fragment.glsl?raw';

const renderer = new Renderer();
const gl = renderer.gl;
document.body.appendChild(gl.canvas);

const camera = new Camera(gl, { near: 0.1, far: 100 });
camera.position.set(0, 0, 3);

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
};
window.addEventListener('resize', resize);
resize();

// Setup Perlin noise shader
const perlinProgram = new Program(gl, {
  vertex,
  fragment: resolveLygia(fragment),
  uniforms: {
    uTime: { value: 0 },
    uFrequency: { value: 5.0 },
    uBrightness: { value: 0.5 },
    uSpeed: { value: 0.75 },
    uValue: { value: 0.4 },  // Start with a lower lightness value
    uUseCircle: { value: false }, // Toggle for circle or noise
    uResolution: { value: [gl.canvas.width, gl.canvas.height] }, // Update uniform name
    INTERNAL_IN_radius: { value: 0.5 },
    INTERNAL_IN_radiusOffset: { value: 0.1 },
    INTERNAL_IN_stroke: { value: 0.1 },
    INTERNAL_IN_strokeOffset: { value: 0.1 },
    INTERNAL_IN_multiplier: { value: 1.0 },
    INTERNAL_IN_multiplierOffset: { value: 0.1 },
    INTERNAL_IN_subtraction: { value: 0.1 },
    INTERNAL_IN_subtractionOffset: { value: 0.1 },
    INTERNAL_IN_iterations: { value: 10 },
    INTERNAL_IN_pOffset: { value: [0.0, 0.0] },
    INTERNAL_IN_colorScale: { value: 1.0 },
    INTERNAL_IN_colorOffset: { value: 0.0 },
    INTERNAL_IN_sdf1_filter_min: { value: 0.0 },
    INTERNAL_IN_sdf1_filter_max: { value: 1.0 },
    INTERNAL_IN_pTrimx: { value: 0.0 },
    INTERNAL_IN_pTrimy: { value: 0.0 },
    INTERNAL_IN_rotation: { value: 0.0 }
  },
  onError: (err) => {
    console.error('Perlin Program Error:', err);
  }
});

const perlinMesh = new Mesh(gl, {
  geometry: new Plane(gl, { width: 2, height: 2 }),
  program: perlinProgram,
});

const renderTarget = new RenderTarget(gl);

// Setup ASCII shader
const asciiProgram = new Program(gl, {
  vertex: asciiVertex,
  fragment: asciiFragment,
  uniforms: {
    uResolution: { value: [gl.canvas.width, gl.canvas.height] },
    uTexture: { value: renderTarget.texture },
  },
  onError: (err) => {
    console.error('ASCII Program Error:', err);
  }
});

const asciiMesh = new Mesh(gl, {
  geometry: new Plane(gl, { width: 2, height: 2 }),
  program: asciiProgram,
});

// Setup tweakpane controls
const pane = new Pane();
pane.addBinding(perlinProgram.uniforms.uFrequency, 'value', { min: 0, max: 10, label: 'Frequency' });
pane.addBinding(perlinProgram.uniforms.uSpeed, 'value', { min: 0, max: 2, label: 'Speed' });
pane.addBinding(perlinProgram.uniforms.uValue, 'value', { min: 0, max: 1, label: 'Lightness' });
pane.addBinding(perlinProgram.uniforms.uUseCircle, 'value', { label: 'Use Circle' }); // Add toggle for circle or noise

// Set up frame rate limiting
let lastTime = 0;
const frameRate = 30; // Target frame rate in frames per second
const frameInterval = 1000 / frameRate;

function update(time) {
  requestAnimationFrame(update);

  // Only update if enough time has passed since the last frame
  if (time - lastTime < frameInterval) return;
  lastTime = time;

  // Rendering code
  const elapsedTime = time * 0.001;
  perlinProgram.uniforms.uTime.value = elapsedTime;

  // Render Perlin noise to render target
  renderer.render({ scene: perlinMesh, camera, target: renderTarget });

  // Render ASCII shader to screen
  asciiProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  renderer.render({ scene: asciiMesh, camera });
}

// Start the render loop
requestAnimationFrame(update);
