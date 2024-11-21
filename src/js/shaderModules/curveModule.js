import { ShaderModule } from '../ShaderModule';
import { Texture } from 'ogl';

const API_URL = 'https://api.allorigins.win/raw?url=https://sdfk-functionapp.azurewebsites.net/api/CC01_get_curve_png';

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

    const loadCurveTexture = async (id) => {
        try {
            const response = await fetch(`${API_URL}?id=${id}`);
            if (!response.ok) throw new Error('Failed to fetch curve');
            
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            // Update preview
            img.src = imageUrl;
            
            // Create texture
            const image = new Image();
            const texture = new Texture(gl);
            
            return new Promise((resolve, reject) => {
                image.onload = () => {
                    texture.image = image;
                    resolve(texture);
                    URL.revokeObjectURL(imageUrl);
                };
                image.onerror = reject;
                image.src = imageUrl;
            });
        } catch (error) {
            console.error('Error loading curve:', error);
            return null;
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

    const originalSetup = curveModule.setupControls.bind(curveModule);
    curveModule.setupControls = (pane) => {
        originalSetup(pane);
        
        // Handle curve ID changes
        curveModule.controls.find(c => c.label === 'Curve ID')
            .on('change', async ({ value }) => {
                const texture = await loadCurveTexture(value);
                if (texture) curveModule.uniforms.uCurveTexture.value = texture;
            });

        // Load initial curve
        loadCurveTexture(curveModule.uniforms.uCurveId.value)
            .then(texture => {
                if (texture) curveModule.uniforms.uCurveTexture.value = texture;
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
