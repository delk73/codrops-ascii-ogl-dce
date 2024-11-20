import { ShaderModule } from '../ShaderModule';

export const createCircleModule = () => new ShaderModule('Circle', {
    uRadius: { 
        value: 0.3, 
        control: { min: 0.1, max: 0.8 },
        label: 'Radius'
    },
    uStroke: { 
        value: 0.001, 
        control: { min: -1.0, max: 1.0 },
        label: 'Stroke Width'
    },
    uStep: {
        value: 16.0,
        control: { min: 8.0, max: 32.0, step: 8.0 },
        label: 'Grid Size'
    }
});