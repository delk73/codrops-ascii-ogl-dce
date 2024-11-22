import { ShaderModule } from '../ShaderModule';
import { SwatchSelector } from '../components/SwatchSelector';
import { Texture } from 'ogl';

export const createNoiseModule = (gl) => {
    const module = new ShaderModule('Noise', {
        uFrequency: { 
            value: 5.0, 
            control: { min: 0, max: 10 },
            label: 'Frequency'
        },
        uSpeed: { 
            value: 0.75, 
            control: { min: 0, max: 2 },
            label: 'Speed'
        },
        uNoiseMin: {
            value: 0.0,
            control: { min: 0.0, max: 1.0, step: 0.01 },
            label: 'Min'
        },
        uNoiseMax: {
            value: 1.0,
            control: { min: 0.0, max: 1.0, step: 0.01 },
            label: 'Max'
        },
        uBlendTexture: { value: null },
        uCurveEnabled: { 
            value: false,
            control: true,
            label: 'Enable Curve'
        },
        uCurveOffset: {
            value: 0.0,
            control: { min: -1.0, max: 1.0, step: 0.01 },
            label: 'Curve Offset'
        },
        uCurveScale: {
            value: 1.0,
            control: { min: 0.1, max: 2.0, step: 0.01 },
            label: 'Curve Scale'
        },
        // Add a new uniform for the selected curve texture
        uSelectedCurveTexture: { value: null }
    });

    let textureLoadPromise = null;

    // Add texture loading state tracking
    const loadingState = {
        active: false,
        queue: [],
        current: null
    };

    // Override setupControls
    const originalSetup = module.setupControls.bind(module);
    module.setupControls = (pane) => {
        const folder = originalSetup(pane);
        const swatchSelector = new SwatchSelector(gl);

        // Add reload handler
        swatchSelector.onReload = async () => {
            try {
                await loadRandomCurves(swatchSelector);
                // Select first swatch after reload
                if (module.uniforms.uCurveEnabled.value) {
                    swatchSelector.select(0);
                }
            } catch (err) {
                console.warn('Failed to reload curves:', err);
            }
        };

        // Set initial visibility based on curve enabled state
        const updateCurveControlsVisibility = (enabled) => {
            const shouldShowCurveControls = enabled && module.enabled.value;
            
            module.controls.forEach(control => {
                if (control.label === 'Curve Offset' || control.label === 'Curve Scale') {
                    control.hidden = !shouldShowCurveControls;
                }
            });
            
            if (swatchElement) {
                swatchElement.style.display = shouldShowCurveControls ? 'block' : 'none';
            }
            
            if (!shouldShowCurveControls) {
                module.uniforms.uBlendTexture.value = null;
                module.uniforms.uSelectedCurveTexture.value = null;
            }
        };

        // Add swatches after the controls
        const swatchElement = swatchSelector.mount(module.folder.element);

        // Add swatch selector with loading management
        swatchSelector.onSelect = (texture) => {
            if (!texture || !module.uniforms.uCurveEnabled.value) return;
            module.uniforms.uSelectedCurveTexture.value = texture;
            updateCurveControlsVisibility(true);
        };

        // Initial load of curves with loading state management
        const initializeCurves = async () => {
            try {
                if (!loadingState.active) {
                    loadingState.active = true;
                    await loadRandomCurves(swatchSelector);
                    // Now that curves are loaded, we can safely update visibility
                    updateCurveControlsVisibility(module.uniforms.uCurveEnabled.value);
                }
            } finally {
                loadingState.active = false;
            }
        };

        // Monitor enable state changes using Tweakpane binding
        const enableBinding = module.folder.children.find(child => 
            child.label === 'Enable Curve'
        );
        enableBinding.on('change', ({ value }) => {
            updateCurveControlsVisibility(value);
        });

        // Initialize curves first, then set up visibility
        initializeCurves();

        return folder;
    };

    // Add listener for noise module enable/disable
    module.onEnable = (enabled) => {
        updateCurveControlsVisibility(module.uniforms.uCurveEnabled.value);
    };

    return module;
};

// Update curve loading to handle state
async function loadRandomCurves(swatchSelector) {
    try {
        const response = await fetch('https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png?n=7');
        if (!response.ok) throw new Error('Failed to fetch curves');
        
        const data = await response.json();
        const sources = Object.values(data.pngs).map(png => `data:image/png;base64,${png}`);
        
        // Ensure all images are loaded before updating UI
        await Promise.all(sources.map(src => 
            new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = reject;
                img.src = src;
            })
        ));

        swatchSelector.updateSources(sources);
    } catch (err) {
        console.warn('Failed to load curves:', err);
    }
}