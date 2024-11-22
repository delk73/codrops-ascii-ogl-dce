import { Engine } from './Engine';
import { LayerManager } from './LayerManager';
import vertex from '../shaders/vertex.glsl?raw';
import fragment from '../shaders/fragment.glsl?raw';
import asciiVertex from '../shaders/ascii-vertex.glsl?raw';
import asciiFragment from '../shaders/ascii-fragment.glsl?raw';

import { createNoiseModule } from './shaderModules/noiseModule';
import { createCircleModule } from './shaderModules/circleModule';
import { createAsciiModule } from './shaderModules/asciiModule';
import { createColorModule } from './shaderModules/colorModule';
import { createCurveModule } from './shaderModules/curveModule';

// Initialize engine
const engine = new Engine();
const layers = new LayerManager(engine);

// Add modules in order
layers
    .addModule('noise', createNoiseModule())
    .addModule('circle', createCircleModule())
    .addModule('ascii', createAsciiModule())
    .addModule('color', createColorModule())
    .addModule('curve', createCurveModule(engine.gl));

// Create shader programs
layers
    .createProgram('perlin', { vertex, fragment })
    .createProgram('ascii', { 
        vertex: asciiVertex, 
        fragment: asciiFragment,
        uniforms: { uTexture: { value: layers.renderTarget.texture } }
    });

// Set default states
layers.modules.get('noise').enabled.value = true;
layers.modules.get('curve').enabled.value = true;
layers.modules.get('ascii').enabled.value = false;

// Frame rate limiting
let lastTime = 0;
const frameInterval = 1000 / 30;

// Render loop
engine.render((time, engine) => {
    if (time - lastTime < frameInterval) return;
    lastTime = time;

    layers.updateUniforms(time);

    // Render pipeline
    engine.renderer.render({
        scene: layers.programs.get('perlin').mesh,
        camera: engine.camera,
        target: layers.renderTarget
    });

    engine.renderer.render({
        scene: layers.programs.get('ascii').mesh,
        camera: engine.camera
    });
});
