export class ShaderModule {
    constructor(name, uniforms, folder = null) {
        this.name = name;
        this.uniforms = uniforms;
        this.folder = folder;
        // Add enabled uniform to be used in shader
        this.uniforms[`u${name}Enabled`] = { value: false };
        this.enabled = this.uniforms[`u${name}Enabled`];
        this.controls = []; // Store control references
    }

    setupControls(pane) {
        this.folder = pane.addFolder({
            title: this.name,
            expanded: true,
        });

        // Add enable/disable toggle
        this.folder.addBinding(this.enabled, 'value', {
            label: 'Enable'
        }).on('change', () => {
            // Show/hide controls based on enabled state
            this.controls.forEach(control => {
                control.hidden = !this.enabled.value;
            });
        });

        // Add uniform controls
        Object.entries(this.uniforms).forEach(([key, uniform]) => {
            if (uniform.control && key !== `u${this.name}Enabled`) {
                const control = this.folder.addBinding(uniform, 'value', {
                    ...uniform.control,
                    label: uniform.label || key,
                    hidden: !this.enabled.value // Initially hidden if disabled
                });
                this.controls.push(control);
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