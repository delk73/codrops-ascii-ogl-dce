import { Camera, Mesh, Plane, Program, Renderer, RenderTarget } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';

import vertex from '../shaders/vertex.glsl?raw';
import fragment from '../shaders/fragment.glsl?raw';
import asciiVertex from '../shaders/ascii-vertex.glsl?raw';
import asciiFragment from '../shaders/ascii-fragment.glsl?raw';

import { createNoiseModule } from './shaderModules/noiseModule';
import { createCircleModule } from './shaderModules/circleModule';
import { createAsciiModule } from './shaderModules/asciiModule';

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

// Create shader modules
const noiseModule = createNoiseModule();
const circleModule = createCircleModule();
const asciiModule = createAsciiModule();

// Setup Perlin noise shader with combined uniforms
const perlinProgram = new Program(gl, {
  vertex,
  fragment: resolveLygia(fragment),
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: [gl.canvas.width, gl.canvas.height] },
    ...noiseModule.getUniforms(),
    ...circleModule.getUniforms()
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
    ...circleModule.getUniforms(),  // Add circle uniforms to ASCII shader
    ...asciiModule.getUniforms()
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

// Setup modules
noiseModule.setupControls(pane);
circleModule.setupControls(pane);
asciiModule.setupControls(pane);

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

  // Update all uniforms regardless of enabled state
  // The shader will handle the enable/disable logic
  Object.entries(noiseModule.uniforms).forEach(([key, uniform]) => {
    if (key in perlinProgram.uniforms) {
      perlinProgram.uniforms[key].value = uniform.value;
    }
  });

  Object.entries(circleModule.uniforms).forEach(([key, uniform]) => {
    if (key in perlinProgram.uniforms) {
      perlinProgram.uniforms[key].value = uniform.value;
    }
  });

  // Update ASCII uniforms
  Object.entries(circleModule.uniforms).forEach(([key, uniform]) => {
    if (key in asciiProgram.uniforms) {
      asciiProgram.uniforms[key].value = uniform.value;
    }
  });
  
  Object.entries(asciiModule.uniforms).forEach(([key, uniform]) => {
    if (key in asciiProgram.uniforms) {
      asciiProgram.uniforms[key].value = uniform.value;
    }
  });

  // Render Perlin noise to render target
  renderer.render({ scene: perlinMesh, camera, target: renderTarget });

  // Render ASCII shader to screen
  asciiProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  renderer.render({ scene: asciiMesh, camera });
}

// Start the render loop
requestAnimationFrame(update);
