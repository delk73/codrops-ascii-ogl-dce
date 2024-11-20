import { ShaderModule } from '../ShaderModule';

export const createCircleModule = () => new ShaderModule('Circle', {
    uRadius: { 
        value: 0.3, 
        control: { min: 0.1, max: 0.8, step: 0.01 },  // Added fine step control
        label: 'Radius'
    },
    uStroke: { 
        value: 0.001, 
        control: { min: -1.0, max: 1.0, step: 0.001 },  // Added fine step control
        label: 'Stroke Width'
    }
});