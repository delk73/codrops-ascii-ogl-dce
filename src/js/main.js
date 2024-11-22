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
import { createColorModule } from './shaderModules/colorModule';
import { createCurveModule } from './shaderModules/curveModule';  // Add this line to import curveModule

// Ensure prefetchCurves is accessible
// If prefetchCurves is exported from curveModule.js, import it here
// import { prefetchCurves } from './shaderModules/curveModule';

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

// Create shader modules in desired order
const asciiModule = createAsciiModule();
const circleModule = createCircleModule();
const colorModule = createColorModule();
const noiseModule = createNoiseModule();
const curveModule = createCurveModule(gl);  // Initialize curveModule

// Set default enabled states
asciiModule.enabled.value = true;
colorModule.enabled.value = true;
noiseModule.enabled.value = true;
curveModule.enabled.value = true;  // Enable curveModule

// Setup Perlin noise shader with combined uniforms
const perlinProgram = new Program(gl, {
  vertex,
  fragment: resolveLygia(fragment),
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: [gl.canvas.width, gl.canvas.height] },
    ...noiseModule.getUniforms(),
    ...colorModule.getUniforms(),
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

// Setup modules in desired order
asciiModule.setupControls(pane);
circleModule.setupControls(pane);
colorModule.setupControls(pane);
noiseModule.setupControls(pane);
curveModule.setupControls(pane);  // Initialize curveModule controls

// Remove bulk prefetching

// Set curve ID to 9999
curveModule.uniforms.uCurveId.value = 9999;

// Remove or adjust any references to bulk prefetching

// Set up frame rate limiting
let lastTime = 0;
const frameRate = 30; // Target frame rate in frames per second
const frameInterval = 1000 / frameRate;

// Update the render loop
function update(time) {
    requestAnimationFrame(update);

    if (time - lastTime < frameInterval) return;
    lastTime = time;

    const elapsedTime = time * 0.001;
    perlinProgram.uniforms.uTime.value = elapsedTime;

    // Update uniforms
    [noiseModule, circleModule, colorModule].forEach(module => {
        Object.entries(module.uniforms).forEach(([key, uniform]) => {
            if (key in perlinProgram.uniforms) {
                perlinProgram.uniforms[key].value = uniform.value;
            }
        });
    });

    [circleModule, asciiModule].forEach(module => {
        Object.entries(module.uniforms).forEach(([key, uniform]) => {
            if (key in asciiProgram.uniforms) {
                asciiProgram.uniforms[key].value = uniform.value;
            }
        });
    });

    // Render pipeline
    renderer.render({ scene: perlinMesh, camera, target: renderTarget });
    asciiProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    renderer.render({ scene: asciiMesh, camera });
}

requestAnimationFrame(update);
