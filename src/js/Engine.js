
import { Camera, Renderer } from 'ogl';

export class Engine {
    constructor() {
        this.renderer = new Renderer();
        this.gl = this.renderer.gl;
        this.camera = new Camera(this.gl, { near: 0.1, far: 100 });
        this.camera.position.set(0, 0, 3);
        
        document.body.appendChild(this.gl.canvas);
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.perspective({ 
            aspect: this.gl.canvas.width / this.gl.canvas.height 
        });
    }

    render(renderFn) {
        const update = (time) => {
            requestAnimationFrame(update);
            renderFn(time, this);
        };
        requestAnimationFrame(update);
    }
}