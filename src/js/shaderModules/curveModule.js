import { ShaderModule } from '../ShaderModule';
import { Texture } from 'ogl';

const API_URL = 'https://api.allorigins.win/raw?url=https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png';

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
            processQueue();
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

    const loadCurveTexture = async (id, attempt = 1) => {
        const localStorageKey = `curve_${id}`;
        // Check if the image is cached in localStorage
        const cachedImage = localStorage.getItem(localStorageKey);
        if (cachedImage) {
            try {
                const imageUrl = cachedImage;
                
                // Update preview
                img.src = imageUrl;
                
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
                    return loadCurveTexture(id, attempt + 1);
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
                    
                    // Update preview
                    img.src = imageUrl;
                    
                    // Create texture
                    const image = new Image();
                    const texture = new Texture(gl);
                    
                    image.onload = () => {
                        texture.image = image;
                        resolve(texture);
                    };
                    image.onerror = reject;
                    image.src = imageUrl;
                };
                reader.onerror = reject;
            });
        } catch (error) {
            console.error('Error loading curve:', error);
            return null;
        }
    };

    // Add pre-fetching function
    const prefetchCurves = (startId, endId) => {
        for (let id = startId; id <= endId; id++) {
            loadCurveTexture(id).catch(err => {
                console.warn(`Pre-fetch failed for curve ID ${id}:`, err);
            });
        }
    };

    const curveModule = new ShaderModule('Curve', {
        uCurveTexture: { value: null },
        uCurveId: {
            value: 1,
            control: { min: 1, max: 9999, step: 1 },
            label: 'Curve ID'
        }
    });

    // Expose prefetchCurves if needed externally
    curveModule.prefetchCurves = prefetchCurves;

    const originalSetup = curveModule.setupControls.bind(curveModule);
    curveModule.setupControls = (pane) => {
        originalSetup(pane);
        
        // Handle curve ID changes
        curveModule.controls.find(c => c.label === 'Curve ID')
            .on('change', async ({ value }) => {
                const texture = await loadCurveTexture(value);
                if (texture) curveModule.uniforms.uCurveTexture.value = texture;
                // Optionally pre-fetch adjacent curves
                prefetchCurves(value + 1, value + 5);
                prefetchCurves(value - 5, value - 1);
            });

        // Load initial curve
        const initialId = curveModule.uniforms.uCurveId.value;
        loadCurveTexture(initialId)
            .then(texture => {
                if (texture) curveModule.uniforms.uCurveTexture.value = texture;
                // Pre-fetch adjacent curves
                prefetchCurves(initialId + 1, initialId + 5);
                prefetchCurves(initialId - 5, initialId - 1);
            });

        // Toggle preview visibility with module
        preview.style.display = curveModule.enabled.value ? 'block' : 'none';
        curveModule.folder.addBinding(curveModule.enabled, 'value')
            .on('change', ({ value }) => {
                preview.style.display = value ? 'block' : 'none';
            });
    };
    return curveModule;
};