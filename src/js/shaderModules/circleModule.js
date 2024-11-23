import { ShaderModule } from '../ShaderModule';
import { SwatchSelector } from '../components/SwatchSelector';
import { Texture } from 'ogl';  // Add this import

export const createCircleModule = (gl) => {
    // Create default texture
    const defaultTexture = new Texture(gl, {
        image: new Uint8Array([255, 255, 255, 255]),
        width: 1,
        height: 1,
    });

    const module = new ShaderModule('Circle', {
        uRadius: { 
            value: 0.3, 
            control: { min: 0.1, max: 0.8, step: 0.0001 },  // Added fine step control
            label: 'Radius'
        },
        uStroke: { 
            value: 0.1337, 
            control: { min: -1.0, max: 1.0, step: 0.0001 },  // Added fine step control
            label: 'Stroke Width'
        },
        uMultiply: {
            value: 1.0,
            control: { min: 0.0, max: 10.0, step: 0.01 },
            label: 'Multiply'
        },
        uSmoothMin: {
            value: -0.5,
            control: { min: -1.0, max: 1.0, step: 0.01 },
            label: 'Smooth Min'
        },
        uSmoothMax: {
            value: 0.5,
            control: { min: -1.0, max: 1.0, step: 0.01 },
            label: 'Smooth Max'
        },
        uBlendMode: {
            value: 0,
            control: { 
                options: {
                    Multiply: 0,
                    Add: 1,
                    Subtract: 2,
                    Overlay: 3,
                }
            },
            label: 'Blend Mode'
        },
        uBlendStrength: {
            value: 1.0,
            control: { min: 0.0, max: 1.0, step: 0.01 },
            label: 'Blend Strength'
        },
        // Add curve uniforms
        uCircleCurveEnabled: { 
            value: false,
            control: true,
            label: 'Enable Curve'
        },
        uCircleCurveScale: {
            value: 1.0,
            control: { min: 0.1, max: 2.0, step: 0.01 },
            label: 'Curve Scale'
        },
        uCircleCurveOffset: {
            value: 0.0,
            control: { min: -1.0, max: 1.0, step: 0.01 },
            label: 'Curve Offset'
        },
        uCircleCurveTexture: { value: defaultTexture }  // Initialize with default texture
    });

    const originalSetup = module.setupControls.bind(module);
    module.setupControls = (pane) => {
        const folder = originalSetup(pane);
        const swatchSelector = new SwatchSelector(gl, {
            size: 32,
            columns: 7,
            gap: 1
        });

        const updateCurveControlsVisibility = (enabled) => {
            const shouldShow = enabled && module.enabled.value;
            
            module.controls.forEach(control => {
                if (control.label === 'Curve Scale' || control.label === 'Curve Offset') {
                    control.hidden = !shouldShow;
                }
            });
            
            if (swatchSelector.element) {
                swatchSelector.element.style.display = shouldShow ? 'block' : 'none';
            }
        };

        swatchSelector.onReload = async () => {
            await loadRandomCurves(swatchSelector, gl);  // Pass gl to loadRandomCurves
            if (module.uniforms.uCircleCurveEnabled.value) {
                swatchSelector.select(0);
            }
        };

        swatchSelector.onSelect = (texture) => {
            if (!texture || !module.uniforms.uCircleCurveEnabled.value) return;
            module.uniforms.uCircleCurveTexture.value = texture;
        };

        const swatchElement = swatchSelector.mount(module.folder.element);

        const enableBinding = module.folder.children.find(child => 
            child.label === 'Enable Curve'
        );
        enableBinding.on('change', ({ value }) => {
            updateCurveControlsVisibility(value);
            if (value && swatchSelector.textures.length > 0) {
                swatchSelector.select(0);
            }
        });

        loadRandomCurves(swatchSelector, gl).then(() => {  // Pass gl to loadRandomCurves
            updateCurveControlsVisibility(module.uniforms.uCircleCurveEnabled.value);
        });

        return folder;
    };

    module.onEnable = (enabled) => {
        updateCurveControlsVisibility(module.uniforms.uCircleCurveEnabled.value);
    };

    return module;
};

// Update loadRandomCurves to accept gl parameter
async function loadRandomCurves(swatchSelector, gl) {
    try {
        const response = await fetch('https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png?n=7');
        if (!response.ok) throw new Error('Failed to fetch curves');
        
        const data = await response.json();
        const sources = Object.values(data.pngs).map(png => `data:image/png;base64,${png}`);
        
        // Pass gl to updateSources
        swatchSelector.updateSources(sources, gl);
    } catch (err) {
        console.warn('Failed to load curves:', err);
    }
}