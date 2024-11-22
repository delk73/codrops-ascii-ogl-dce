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
        const swatchSelector = new SwatchSelector(gl);

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
            
            if (enabled) {
                // Try to select first swatch if available
                if (!module.uniforms.uBlendTexture.value && 
                    swatchSelector?.textures?.length > 0) {
                    console.log('Selecting first available texture');
                    swatchSelector.select(0);
                } else if (!module.uniforms.uBlendTexture.value) {
                    // If no texture available, create a zero texture
                    console.log('Creating zero texture for blend');
                    const img = new Image(1, 1);
                    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                    img.onload = () => {
                        const zeroTexture = new Texture(gl, {
                            image: img,
                            width: 1,
                            height: 1
                        });
                        module.uniforms.uBlendTexture.value = zeroTexture;
                    };
                }
            } else {
                // Clear texture when disabled
                module.uniforms.uBlendTexture.value = null;
                console.log('Cleared blend texture');
            }
        };

        // Add swatches after the controls
        const swatchElement = swatchSelector.mount(module.folder.element);

        // Add swatch selector with loading management
        swatchSelector.onSelect = async (texture) => {
            console.log('Swatch selected:', texture);
            if (loadingState.active) {
                console.log('Loading in progress, queuing texture');
                loadingState.queue.push(texture);
                return;
            }

            loadingState.active = true;
            try {
                // Wait for texture to be fully loaded
                if (!texture.loaded) {
                    await new Promise(resolve => {
                        const checkLoaded = () => {
                            if (texture.loaded) {
                                resolve();
                            } else {
                                requestAnimationFrame(checkLoaded);
                            }
                        };
                        checkLoaded();
                    });
                }

                // Only enable curve once texture is ready
                module.uniforms.uBlendTexture.value = texture;
                module.uniforms.uCurveEnabled.value = true;
                updateCurveControlsVisibility(true);
                console.log('Texture loaded and applied');
            } finally {
                loadingState.active = false;
                if (loadingState.queue.length > 0) {
                    const nextTexture = loadingState.queue.pop();
                    loadingState.queue = [];
                    swatchSelector.onSelect(nextTexture);
                }
            }
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