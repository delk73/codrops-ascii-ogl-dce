import { Camera, Mesh, Plane, Program, Renderer, RenderTarget, Texture } from 'ogl';
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

// Create a default 1x1 texture to avoid null references
const defaultTexture = new Texture(gl, {
    image: new Uint8Array([255, 255, 255, 255]),
    width: 1,
    height: 1,
    magFilter: gl.LINEAR,
    minFilter: gl.LINEAR,
});

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
circleModule.enabled.value = true;  // Enable circle by default
colorModule.enabled.value = false;

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
        uDebugMode: { value: 0 },
        
        // Noise uniforms
        uNoiseEnabled: createUniformValue(noiseModule.enabled.value),
        uFrequency: createUniformValue(noiseModule.uniforms.uFrequency.value),
        uSpeed: createUniformValue(noiseModule.uniforms.uSpeed.value),
        uNoiseMin: createUniformValue(noiseModule.uniforms.uNoiseMin.value),
        uNoiseMax: createUniformValue(noiseModule.uniforms.uNoiseMax.value),
        
        // Color uniforms
        uColorEnabled: createUniformValue(colorModule.enabled.value),
        uHueOffset: createUniformValue(colorModule.uniforms.uHueOffset.value),
        uSaturation: createUniformValue(colorModule.uniforms.uSaturation.value),
        uValue: createUniformValue(colorModule.uniforms.uValue.value),
        
        // Circle uniforms
        uCircleEnabled: createUniformValue(circleModule.enabled.value),
        uRadius: createUniformValue(circleModule.uniforms.uRadius.value),
        uStroke: createUniformValue(circleModule.uniforms.uStroke.value),
        uMultiply: createUniformValue(circleModule.uniforms.uMultiply.value),
        uSmoothMin: createUniformValue(circleModule.uniforms.uSmoothMin.value),
        uSmoothMax: createUniformValue(circleModule.uniforms.uSmoothMax.value),
        
        // Curve uniforms - remove duplicate and ensure defaults
        uBlendTexture: { value: defaultTexture },
        uCurveEnabled: { value: false }, // Explicit default
        uCurveOffset: { value: 0.0 },    // Explicit default
        uCurveScale: { value: 1.0 },     // Explicit default
        uSelectedCurveTexture: { value: defaultTexture }
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

    // Update uniforms with null checks
    Object.entries(noiseModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            // Handle texture uniforms
            if (key.includes('Texture')) {
                perlinProgram.uniforms[key].value = uniform.value || defaultTexture;
            } else {
                // Handle numeric/boolean uniforms
                perlinProgram.uniforms[key].value = uniform.value ?? perlinProgram.uniforms[key].value;
            }
        }
    });

    // Update circle uniforms
    Object.entries(circleModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            perlinProgram.uniforms[key].value = uniform.value;
        }
    });

    renderer.render({ scene: perlinMesh, camera });
}

requestAnimationFrame(update);
