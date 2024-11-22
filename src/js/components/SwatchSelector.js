import { Texture } from 'ogl';

export class SwatchSelector {
    constructor(gl, options = {}) {
        this.gl = gl;
        this.options = {
            size: 32,
            columns: 3,
            gap: 4,
            ...options
        };
        this.swatches = [];
        this.selectedIndex = null;
        this.onSelect = null;
        this.textures = [];  // Store actual textures
        this.texturesLoaded = false;
    }

    createSwatchElement() {
        const swatch = document.createElement('img');
        swatch.style.cssText = `
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            object-fit: contain;
            border: 1px solid #333;
            cursor: pointer;
            margin: 2px;
        `;
        return swatch;
    }

    mount(container) {
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.options.columns}, 1fr);
            gap: ${this.options.gap}px;
            margin-top: 8px;
        `;
        container.appendChild(grid);

        for (let i = 0; i < 6; i++) {
            const swatch = this.createSwatchElement();
            swatch.addEventListener('click', () => this.select(i));
            grid.appendChild(swatch);
            this.swatches.push(swatch);
        }

        return grid;
    }

    select(index) {
        if (this.selectedIndex !== null) {
            this.swatches[this.selectedIndex].style.border = '1px solid #333';
        }
        this.swatches[index].style.border = '2px solid #007BA7';
        this.selectedIndex = index;
        
        // Use the already created texture
        if (this.onSelect && this.textures[index]) {
            this.onSelect(this.textures[index]);
        }
    }

    updateSources(sources) {
        if (this.texturesLoaded) return; // Skip if already loaded
        
        const textureLoads = sources.map((src, i) => {
            if (!this.swatches[i]) return null;
            
            this.swatches[i].src = src;
            return new Promise((resolve) => {
                const texture = new Texture(this.gl);
                const image = new Image();
                image.onload = () => {
                    texture.image = image;
                    texture.needsUpdate = true;
                    this.textures[i] = texture;
                    resolve();
                };
                image.src = src;
            });
        }).filter(Boolean);

        Promise.all(textureLoads).then(() => {
            this.texturesLoaded = true;
            // Select first texture once all are loaded
            if (this.textures.length > 0) this.select(0);
        });
    }
}