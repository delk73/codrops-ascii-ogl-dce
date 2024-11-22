import { ShaderModule } from '../ShaderModule';
import { Texture } from 'ogl';

const API_URL = 'https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png';

// Add a simple rate limiter
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;
const requestQueue = [];

const enqueueRequest = (request) => {
    return new Promise((resolve, reject) => {
        requestQueue.push({ request, resolve, reject });
        processQueue();
    });
};

const processQueue = () => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
    const { request, resolve, reject } = requestQueue.shift();
    activeRequests++;
    request()
        .then(resolve)
        .catch(reject)
        .finally(() => {
            activeRequests--;
            setTimeout(processQueue, 1000); // Added 1000ms cooldown
        });
};

export const createCurveModule = (gl) => {
    // Create small preview display
    const preview = document.createElement('div');
    preview.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 256px;
        height: 32px;
        background: #2a2a2a;
        border: 1px solid #333;
    `;
    const img = document.createElement('img');
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
    `;
    preview.appendChild(img);
    document.body.appendChild(preview);

    // Create multiple preview displays for swatches
    const swatchContainer = document.createElement('div');
    swatchContainer.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 60px;
        display: flex;
        gap: 10px;
    `;
    const swatches = [];
    let selectedSwatchIndex = null; // Track selected swatch
    const NUM_SWATCHES = 6;
    for (let i = 0; i < NUM_SWATCHES; i++) {
        const img = document.createElement('img');
        img.style.cssText = `
            width: 100px;
            height: 100px;
            object-fit: contain;
            border: 1px solid #333;
            cursor: pointer; /* Change cursor to pointer */
        `;
        // Add click event listener
        img.addEventListener('click', () => {
            selectSwatch(i);
        });
        swatchContainer.appendChild(img);
        swatches.push(img);
    }
    document.body.appendChild(swatchContainer);

    // Create the module first so we can reference it
    const curveModule = new ShaderModule('Curve', {
        uBlendTexture: { value: null }, // Keep blend texture uniform
        uCurveId: {
            value: 1,
            control: { min: 1, max: 9999, step: 1 },
            label: 'Curve ID'
        },
        uCurveEnabled: { // **Add uCurveEnabled uniform**
            value: true, // Set to true by default
            control: { type: 'boolean' },
            label: 'Enable Curve'
        }
    });

    // Function to handle swatch selection
    const selectSwatch = (index) => {
        // Deselect previous swatch
        if (selectedSwatchIndex !== null) {
            swatches[selectedSwatchIndex].style.border = '1px solid #333';
        }
        // Select new swatch with cerulean blue border
        swatches[index].style.border = '3px solid #007BA7'; // Changed to cerulean blue
        selectedSwatchIndex = index;

        // Assign the selected texture to uBlendTexture
        const selectedSrc = swatches[index].src;
        const texture = new Texture(gl);
        texture.image = new Image();
        texture.image.src = selectedSrc;
        texture.image.onload = () => {
            curveModule.uniforms.uBlendTexture.value = texture; // Fixed: use curveModule instead of this
            console.log(`Swatch ${index} texture loaded and assigned.`);
        };
    };

    const loadCurveTexture = async (id, imgElement, attempt = 1) => {
        const localStorageKey = `curve_${id}`;
        // Check if the image is cached in localStorage
        const cachedImage = localStorage.getItem(localStorageKey);
        if (cachedImage) {
            try {
                const imageUrl = cachedImage;
                
                // Update specific swatch preview
                imgElement.src = imageUrl;
                
                // Create texture
                const image = new Image();
                const texture = new Texture(gl);
                
                return new Promise((resolve, reject) => {
                    image.onload = () => {
                        texture.image = image;
                        resolve(texture);
                    };
                    image.onerror = reject;
                    image.src = imageUrl;
                });
            } catch (error) {
                console.error('Error loading cached curve:', error);
                // If cached image fails, proceed to fetch from API
            }
        }

        try {
            const fetchRequest = () => fetch(`${API_URL}?id=${id}`);
            const response = await enqueueRequest(fetchRequest);
            
            if (!response.ok) {
                if (response.status === 429 && attempt < 3) {
                    // Retry after delay
                    await new Promise(res => setTimeout(res, 1000 * attempt));
                    return loadCurveTexture(id, imgElement, attempt + 1);
                }
                throw new Error('Failed to fetch curve');
            }
            
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            
            return new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    const base64data = reader.result;
                    // Cache the image in localStorage
                    try {
                        localStorage.setItem(localStorageKey, base64data);
                    } catch (e) {
                        console.warn('LocalStorage quota exceeded, cannot cache image.');
                    }

                    const imageUrl = base64data;
                    
                    // Update specific swatch preview
                    imgElement.src = imageUrl;
                    
                    // Create texture
                    const image = new Image();
                    const texture = new Texture(gl);
                    
                    image.onload = () => {
                        texture.image = image;
                        resolve(texture);
                    };
                    image.onerror = reject;
                    image.src = imageUrl;

                    // Assign texture to blend uniform
                    curveModule.uniforms.uBlendTexture.value = texture; // Fixed: use curveModule instead of this

                    // If this is part of swatches, ensure selection
                    // Optionally auto-select the first swatch after loading
                    if (selectedSwatchIndex === null) {
                        selectSwatch(0);
                    }

                    resolve(texture);
                };
                reader.onerror = reject;
            });
        } catch (error) {
            console.error('Error loading curve:', error);
            return null;
        }
    };

    // Add method to load 6 random curves
    const loadRandomCurves = async () => {
        try {
            const fetchRequest = () => fetch(`${API_URL}`);
            const response = await enqueueRequest(fetchRequest);
            
            if (!response.ok) {
                throw new Error('Failed to fetch curves');
            }
            
            const data = await response.json();
            const pngs = data.pngs;

            // Assign each PNG to the corresponding swatch
            swatches.forEach((swatch, index) => {
                const keys = Object.keys(pngs);
                if (keys[index]) {
                    swatch.src = `data:image/png;base64,${pngs[keys[index]]}`;
                    
                    // Optionally create texture for each swatch
                    const image = new Image();
                    const texture = new Texture(gl);
                    image.onload = () => {
                        texture.image = image;
                        // You can assign the texture to your shader uniforms or elsewhere as needed
                    };
                    image.onerror = (err) => {
                        console.error(`Error loading swatch ${keys[index]}:`, err);
                    };
                    image.src = swatch.src;
                }
            });
        } catch (err) {
            console.warn('Failed to load random curves:', err);
        }
    };

    // Create a button to fetch new swatches
    const button = document.createElement('button');
    button.textContent = 'Fetch New Swatches';
    button.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        padding: 10px 20px;
        background: #444;
        color: #fff;
        border: none;
        cursor: pointer;
    `;
    button.addEventListener('click', loadRandomCurves);
    document.body.appendChild(button);

    // Expose loadRandomCurves if needed externally
    curveModule.loadRandomCurves = loadRandomCurves;

    const originalSetup = curveModule.setupControls.bind(curveModule);
    curveModule.setupControls = (pane) => {
        originalSetup(pane);
        
        // Handle curve ID changes
        curveModule.controls.find(c => c.label === 'Curve ID')
            .on('change', async ({ value }) => {
                const texture = await loadCurveTexture(value, img);
                if (texture) {
                    curveModule.uniforms.uBlendTexture.value = texture; // Fixed: use curveModule instead of this
                }
            });

        // Load initial curve
        const initialId = curveModule.uniforms.uCurveId.value;
        loadCurveTexture(initialId, img)
            .then(texture => {
                if (texture) {
                    curveModule.uniforms.uBlendTexture.value = texture; // Added line
                }
            });

        // Toggle preview visibility with module
        preview.style.display = curveModule.enabled.value ? 'block' : 'none';
        curveModule.folder.addBinding(curveModule.enabled, 'value')
            .on('change', ({ value }) => {
                preview.style.display = value ? 'block' : 'none';
                // **Toggle uCurveEnabled based on module's enabled state**
                curveModule.uniforms.uCurveEnabled.value = value; // Fixed: use curveModule instead of this
            });

        // Initial load of random curves
        loadRandomCurves();
    };
    return curveModule;
};