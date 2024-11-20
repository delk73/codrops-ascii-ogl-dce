
import { ShaderModule } from '../ShaderModule';

export const createCircleModule = () => new ShaderModule('Circle', {
    uRadius: { 
        value: 0.3, 
        control: { min: 0.1, max: 0.8 },
        label: 'Radius'
    },
    uStroke: { 
        value: 0.05, 
        control: { min: 0.0, max: 0.2 },
        label: 'Stroke Width'
    }
});