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
const circleModule = createCircleModule(gl);  // Pass gl context here

const asciiModule = createAsciiModule();

noiseModule.enabled.value = true;
circleModule.enabled.value = true;  // Enable circle by default


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
        uFrequencyX: createUniformValue(noiseModule.uniforms.uFrequencyX.value),
        uFrequencyY: createUniformValue(noiseModule.uniforms.uFrequencyY.value),
        uSpeed: createUniformValue(noiseModule.uniforms.uSpeed.value),
        uNoiseMin: createUniformValue(noiseModule.uniforms.uNoiseMin.value),
        uNoiseMax: createUniformValue(noiseModule.uniforms.uNoiseMax.value),                
        uNoiseType: createUniformValue(noiseModule.uniforms.uNoiseType.value),
        uNoiseLUTSmoothing: createUniformValue(noiseModule.uniforms.uNoiseLUTSmoothing.value),
        
        // Circle uniforms
        uCircleEnabled: createUniformValue(circleModule.enabled.value),
        uRadius: createUniformValue(circleModule.uniforms.uRadius.value),
        uStroke: createUniformValue(circleModule.uniforms.uStroke.value),
        uMultiply: createUniformValue(circleModule.uniforms.uMultiply.value),
        uSmoothMin: createUniformValue(circleModule.uniforms.uSmoothMin.value),
        uSmoothMax: createUniformValue(circleModule.uniforms.uSmoothMax.value),
        uBlendMode: createUniformValue(circleModule.uniforms.uBlendMode.value),
        uBlendStrength: createUniformValue(circleModule.uniforms.uBlendStrength.value),
        
        // Circle curve uniforms - update these
        uCircleCurveEnabled: { value: false },
        uCircleCurveTexture: { value: defaultTexture },
        uCircleCurveScale: { value: 1.0 },
        uCircleCurveOffset: { value: 0.0 },
        uLUTSmoothing: { value: 0.0 },
        
        // Keep other uniforms
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

const renderTarget = new RenderTarget(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height
});

const asciiProgram = new Program(gl, {
    vertex: asciiVertex,
    fragment: asciiFragment,
    uniforms: {
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        uTexture: { value: renderTarget.texture },
        uASCIIEnabled: { value: false },
        uCharSize: { value: 16.0 },
        uBrightness: { value: 1.0 }
    }
});

const asciiMesh = new Mesh(gl, {
    geometry: new Plane(gl, { width: 2, height: 2 }),
    program: asciiProgram
});

// Setup controls after programs are created
const pane = new Pane();
[noiseModule, circleModule, asciiModule].forEach(module => 
    module.setupControls(pane)
);

// Set initial states
noiseModule.enabled.value = true;
asciiModule.enabled.value = false;

// Update loop
function update(time) {
    requestAnimationFrame(update);
    const t = time * 0.001;
    
    // Update times and resolutions
    perlinProgram.uniforms.uTime.value = t;
    perlinProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    asciiProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];

    // Update module uniforms
    Object.entries(noiseModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            if (key.includes('Texture')) {
                perlinProgram.uniforms[key].value = uniform.value || defaultTexture;
            } else {
                perlinProgram.uniforms[key].value = uniform.value;
            }
        }
    });

    // Update circle uniforms
    Object.entries(circleModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            if (key === 'uCircleCurveTexture') {
                perlinProgram.uniforms[key].value = uniform.value || defaultTexture;
            } else {
                perlinProgram.uniforms[key].value = uniform.value;
            }
        }
    });

    // First render perlin with all effects
    if (asciiModule.enabled.value) {
        renderer.render({
            scene: perlinMesh,
            camera,
            target: renderTarget
        });
        
        // Then apply ASCII with blending
        asciiProgram.uniforms.uASCIIEnabled.value = true;
        Object.entries(asciiModule.uniforms).forEach(([key, uniform]) => {
            if (asciiProgram.uniforms[key]) {
                asciiProgram.uniforms[key].value = uniform.value;
            }
        });
        
        renderer.render({
            scene: asciiMesh,
            camera
        });
    } else {
        renderer.render({
            scene: perlinMesh,
            camera
        });
    }
}

requestAnimationFrame(update);
