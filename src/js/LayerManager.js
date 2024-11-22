
import { Program, Mesh, Plane, RenderTarget } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';

export class LayerManager {
    constructor(engine) {
        this.engine = engine;
        this.gl = engine.gl;
        this.modules = new Map();
        this.programs = new Map();
        this.pane = new Pane();
        this.renderTarget = new RenderTarget(this.gl);
    }

    addModule(name, module) {
        this.modules.set(name, module);
        module.setupControls(this.pane);
        return this;
    }

    createProgram(name, { vertex, fragment, uniforms = {} }) {
        const combinedUniforms = {
            uTime: { value: 0 },
            uResolution: { value: [this.gl.canvas.width, this.gl.canvas.height] },
            ...uniforms
        };

        // Add uniforms from all modules
        this.modules.forEach(module => {
            Object.assign(combinedUniforms, module.getUniforms());
        });

        const program = new Program(this.gl, {
            vertex,
            fragment: resolveLygia(fragment),
            uniforms: combinedUniforms
        });

        const mesh = new Mesh(this.gl, {
            geometry: new Plane(this.gl, { width: 2, height: 2 }),
            program
        });

        this.programs.set(name, { program, mesh });
        return this;
    }

    updateUniforms(time) {
        this.programs.forEach(({ program }) => {
            if (program.uniforms.uTime) {
                program.uniforms.uTime.value = time * 0.001;
            }

            this.modules.forEach(module => {
                Object.entries(module.uniforms).forEach(([key, uniform]) => {
                    if (key in program.uniforms) {
                        program.uniforms[key].value = uniform.value;
                    }
                });
            });
        });
    }
}