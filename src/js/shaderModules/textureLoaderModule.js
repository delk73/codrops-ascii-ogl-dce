import { ShaderModule } from '../ShaderModule';
import { Texture } from 'ogl';

export const createTextureLoaderModule = (gl) => {
    const loadTexture = async (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.onload = () => {
                    const texture = new Texture(gl, {
                        image,
                        generateMipmaps: true
                    });
                    textureModule.uniforms.uImageTexture.value = texture;
                    resolve(texture); // Ensure to resolve the promise
                };
                image.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const textureModule = new ShaderModule('Texture', {
        uImageTexture: {
            value: null
        },
        uTextureOpacity: {
            value: 1.0,
            control: { min: 0.0, max: 1.0, step: 0.01 },
            label: 'Texture Opacity'
        },
        uTextureScale: {
            value: 1.0,
            control: { min: 0.1, max: 5.0, step: 0.1 },
            label: 'Texture Scale'
        }
    });

    // Add custom setup for file input
    const originalSetup = textureModule.setupControls.bind(textureModule);
    textureModule.setupControls = (pane) => {
        originalSetup(pane);
        
        // Add file input button
        textureModule.folder.addButton({
            title: 'Load Texture',
        }).on('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png,image/jpeg';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) loadTexture(file);
            };
            input.click();
        });
    };

    return textureModule;
};