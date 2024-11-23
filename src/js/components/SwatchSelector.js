import { Texture } from 'ogl';

export class SwatchSelector {
    constructor(gl, options = {}) {
        this.gl = gl;
        this.options = {
            size: 32,
            columns: 7,
            gap: 1,        
            ...options
        };
        this.swatches = [];
        this.selectedIndex = null;
        this.onSelect = null;
        this.textures = [];
        this.onReload = null;
        this.element = null;
    }

    createReloadButton() {
        const button = document.createElement('button');
        button.innerHTML = '↻';
        button.style.cssText = `
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border: 1px solid #333;
            cursor: pointer;
            margin: 1px;
            background: #2a2a2a;
            color: #fff;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        button.addEventListener('click', () => this.onReload?.());
        return button;
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
            background: #1a1a1a;
        `;
        return swatch;
    }

    mount(container) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            margin-top: 8px;
        `;

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.options.columns}, 1fr);
            gap: ${this.options.gap}px;
            align-items: center;
        `;

        // Create swatches
        for (let i = 0; i < this.options.columns - 1; i++) {
            const swatch = this.createSwatchElement();
            swatch.addEventListener('click', () => this.select(i));
            grid.appendChild(swatch);
            this.swatches.push(swatch);
        }

        grid.appendChild(this.createReloadButton());
        wrapper.appendChild(grid);
        container.appendChild(wrapper);
        this.element = wrapper;

        return wrapper;
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
        sources.forEach((src, i) => {
            if (this.swatches[i]) {
                this.swatches[i].src = src;
                
                // Create texture for each source
                const texture = new Texture(this.gl);
                const image = new Image();
                image.onload = () => {
                    texture.image = image;
                    texture.needsUpdate = true;
                };
                image.src = src;
                this.textures[i] = texture;
            }
        });
    }
}