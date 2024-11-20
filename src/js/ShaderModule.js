
export class ShaderModule {
    constructor(name, uniforms, folder = null) {
        this.name = name;
        this.uniforms = uniforms;
        this.folder = folder;
        this.enabled = { value: false };
    }

    setupControls(pane) {
        this.folder = pane.addFolder({
            title: this.name,
            expanded: true,
        });

        // Add enable/disable toggle
        this.folder.addBinding(this.enabled, 'value', {
            label: 'Enable'
        });

        // Add uniform controls
        Object.entries(this.uniforms).forEach(([key, uniform]) => {
            if (uniform.control) {
                this.folder.addBinding(uniform, 'value', {
                    ...uniform.control,
                    label: uniform.label || key
                });
            }
        });

        return this;
    }

    getUniforms() {
        const result = {};
        Object.entries(this.uniforms).forEach(([key, uniform]) => {
            result[key] = { value: uniform.value };
        });
        return result;
    }
}