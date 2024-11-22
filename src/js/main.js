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
        
        // Curve uniforms
        uBlendTexture: { value: defaultTexture },
        uCurveEnabled: createUniformValue(noiseModule.uniforms.uCurveEnabled.value),
        uCurveRotation: createUniformValue(noiseModule.uniforms.uCurveRotation.value),
        uCurveScale: createUniformValue(noiseModule.uniforms.uCurveScale.value),
        
        // Add selected curve texture
        uSelectedCurveTexture: { value: defaultTexture } // Initialize with defaultTexture or null
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

    // Update resolution in case of window resize
    perlinProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];

    // Update noise uniforms
    perlinProgram.uniforms.uNoiseEnabled.value = noiseModule.enabled.value;
    Object.entries(noiseModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            if (key === 'uBlendTexture' && uniform.value === null) {
                perlinProgram.uniforms[key].value = defaultTexture;
            } else {
                perlinProgram.uniforms[key].value = uniform.value;
            }
        }
    });

    // Update color uniforms
    perlinProgram.uniforms.uColorEnabled.value = colorModule.enabled.value;
    Object.entries(colorModule.uniforms).forEach(([key, uniform]) => {
        if (perlinProgram.uniforms[key]) {
            perlinProgram.uniforms[key].value = uniform.value;
        }
    });

    // Pass the selected curve texture to the shader
    perlinProgram.uniforms.uSelectedCurveTexture.value = noiseModule.uniforms.uSelectedCurveTexture.value || defaultTexture;

    renderer.render({ scene: perlinMesh, camera });
}

requestAnimationFrame(update);
