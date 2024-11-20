import { ShaderModule } from '../ShaderModule';

export const createCircleModule = () => new ShaderModule('Circle', {
    uRadius: { 
        value: 0.3, 
        control: { min: 0.1, max: 0.8, step: 0.0001 },  // Added fine step control
        label: 'Radius'
    },
    uStroke: { 
        value: 0.1337, 
        control: { min: -1.0, max: 1.0, step: 0.0001 },  // Added fine step control
        label: 'Stroke Width'
    },
    uMultiply: {
        value: 1.0,
        control: { min: 0.0, max: 10.0, step: 0.01 },
        label: 'Multiply'
    },
    uSmoothMin: {
        value: -0.5,
        control: { min: -1.0, max: 1.0, step: 0.01 },
        label: 'Smooth Min'
    },
    uSmoothMax: {
        value: 0.5,
        control: { min: -1.0, max: 1.0, step: 0.01 },
        label: 'Smooth Max'
    }
});