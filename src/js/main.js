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

// Create modules and ensure they're enabled by default
const noiseModule = createNoiseModule(gl);
const circleModule = createCircleModule();
const colorModule = createColorModule();
const asciiModule = createAsciiModule();

noiseModule.enabled.value = true;
colorModule.enabled.value = true;

// Create a deep copy of uniforms to prevent reference issues
const createUniformValue = (value) => {
    if (Array.isArray(value)) {
        return { value: [...value] };
    }
    return { value };
};

// Create program with properly structured uniforms
const perlinProgram = new Program(gl, {
    vertex,
    fragment: resolveLygia(fragment),
    uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        
        // Noise uniforms - match exact values from noiseModule
        uNoiseEnabled: { value: true },
        uFrequency: { value: noiseModule.uniforms.uFrequency.value },
        uSpeed: { value: noiseModule.uniforms.uSpeed.value },
        uNoiseMin: { value: noiseModule.uniforms.uNoiseMin.value },
        uNoiseMax: { value: noiseModule.uniforms.uNoiseMax.value },
        
        // Color uniforms - match exact values from colorModule
        uColorEnabled: { value: colorModule.enabled.value },
        uHueOffset: { value: colorModule.uniforms.uHueOffset.value },
        uSaturation: { value: colorModule.uniforms.uSaturation.value },
        uValue: { value: colorModule.uniforms.uValue.value }
    }
});

const perlinMesh = new Mesh(gl, {
    geometry: new Plane(gl, { width: 2, height: 2 }),
    program: perlinProgram
});

const renderTarget = new RenderTarget(gl);

// Setup ASCII program with its uniforms
const asciiProgram = new Program(gl, {
    vertex: asciiVertex,
    fragment: asciiFragment,
    uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        uTexture: { value: renderTarget.texture },
        ...asciiModule.getUniforms()
    }
});

const asciiMesh = new Mesh(gl, {
    geometry: new Plane(gl, { width: 2, height: 2 }),
    program: asciiProgram
});

// Setup controls after programs are created
const pane = new Pane();
[noiseModule, circleModule, colorModule, asciiModule].forEach(module => 
    module.setupControls(pane)
);

// Set initial states
noiseModule.enabled.value = true;
asciiModule.enabled.value = false;

// Update loop
function update(time) {
    requestAnimationFrame(update);
    
    const t = time * 0.001;
    perlinProgram.uniforms.uTime.value = t;

    // Update noise uniforms
    for (const [key, uniform] of Object.entries(noiseModule.uniforms)) {
        if (perlinProgram.uniforms[key]) {
            perlinProgram.uniforms[key].value = uniform.value;
        }
    }

    // Update color uniforms
    perlinProgram.uniforms.uColorEnabled.value = colorModule.enabled.value;
    for (const [key, uniform] of Object.entries(colorModule.uniforms)) {
        if (perlinProgram.uniforms[key]) {
            perlinProgram.uniforms[key].value = uniform.value;
        }
    }

    renderer.render({ scene: perlinMesh, camera });
}

requestAnimationFrame(update);
