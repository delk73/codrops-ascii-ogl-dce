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
    }
});