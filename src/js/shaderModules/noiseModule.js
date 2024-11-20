import { ShaderModule } from '../ShaderModule';

export const createNoiseModule = () => new ShaderModule('Noise', {
    uFrequency: { 
        value: 5.0, 
        control: { min: 0, max: 10 },
        label: 'Frequency'
    },
    uSpeed: { 
        value: 0.75, 
        control: { min: 0, max: 2 },
        label: 'Speed'
    },
    uNoiseMin: {
        value: 0.0,
        control: { min: 0.0, max: 1.0, step: 0.01 },
        label: 'Min'
    },
    uNoiseMax: {
        value: 1.0,
        control: { min: 0.0, max: 1.0, step: 0.01 },
        label: 'Max'
    }
});