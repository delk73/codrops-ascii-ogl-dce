import { ShaderModule } from '../ShaderModule';
import { SwatchSelector } from '../components/SwatchSelector';

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
        uCurveRotation: {
            value: 0,
            control: { min: 0, max: Math.PI * 2, step: 0.01 },
            label: 'Curve Rotation'
        },
        uCurveScale: {
            value: 1.0,
            control: { min: 0.1, max: 5.0, step: 0.1 },
            label: 'Curve Scale'
        }
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

        // Add swatch selector with loading management
        const swatchSelector = new SwatchSelector(gl);
        swatchSelector.onSelect = async (texture) => {
            // Prevent multiple simultaneous texture loads
            if (loadingState.active) {
                loadingState.queue.push(texture);
                return;
            }

            loadingState.active = true;
            try {
                // Create and wait for texture to load
                const loadedTexture = await new Promise((resolve) => {
                    texture.addEventListener('loaded', () => resolve(texture));
                    if (texture.loaded) resolve(texture);
                });

                module.uniforms.uBlendTexture.value = loadedTexture;
                module.uniforms.uCurveEnabled.value = true;
            } finally {
                loadingState.active = false;
                // Process next texture in queue if any
                if (loadingState.queue.length > 0) {
                    const nextTexture = loadingState.queue.pop();
                    loadingState.queue = []; // Clear remaining queue
                    swatchSelector.onSelect(nextTexture);
                }
            }
        };

        // Add swatches after the controls
        const swatchElement = swatchSelector.mount(module.folder.element);
        
        // Set initial visibility based on curve enabled state
        const updateCurveControlsVisibility = (enabled) => {
            module.controls.forEach(control => {
                if (control.label === 'Curve Rotation' || control.label === 'Curve Scale') {
                    control.hidden = !enabled;
                }
            });
            if (swatchElement) {
                swatchElement.style.display = enabled ? 'block' : 'none';
            }
        };

        // Initial visibility setup
        updateCurveControlsVisibility(module.uniforms.uCurveEnabled.value);

        // Monitor enable state changes using Tweakpane binding
        const enableBinding = module.folder.children.find(child => 
            child.label === 'Enable Curve'
        );
        enableBinding.on('change', ({ value }) => {
            updateCurveControlsVisibility(value);
        });

        // Initial load of curves with loading state management
        const initializeCurves = async () => {
            try {
                if (!loadingState.active) {
                    loadingState.active = true;
                    await loadRandomCurves(swatchSelector);
                }
            } finally {
                loadingState.active = false;
            }
        };

        initializeCurves();

        return folder;
    };

    return module;
};

// Update curve loading to handle state
async function loadRandomCurves(swatchSelector) {
    try {
        const response = await fetch('https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png');
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