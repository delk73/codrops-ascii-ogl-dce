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
        this.onReload = null; // Add reload callback
    }

    createReloadButton() {
        const button = document.createElement('button');
        button.innerHTML = '↻';
        button.style.cssText = `
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border: 1px solid #333;
            cursor: pointer;
            margin: 2px;
            background: #2a2a2a;
            color: #fff;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
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
        `;
        return swatch;
    }



    mount(container) {
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: ${this.options.gap}px;
            margin-top: 8px;
        `;
        container.appendChild(grid);

        // Add 6 swatches
        for (let i = 0; i < 7; i++) {
            const swatch = this.createSwatchElement();
            swatch.addEventListener('click', () => this.select(i));
            grid.appendChild(swatch);
            this.swatches.push(swatch);
        }

        // Add reload button as the 6th item
        const reloadButton = document.createElement('button');
        reloadButton.innerHTML = '↻';
        reloadButton.style.cssText = `
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            background: #444;
            color: #fff;
            border: 1px solid #333;
            cursor: pointer;
            margin: 2px;
            font-size: ${this.options.size * 0.4}px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        reloadButton.addEventListener('click', () => this.onReload?.());
        grid.appendChild(reloadButton);

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