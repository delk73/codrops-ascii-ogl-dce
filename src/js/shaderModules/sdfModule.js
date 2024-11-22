import { ShaderModule } from '../ShaderModule';

export const createSDFModule = () => new ShaderModule('SDF', {
    uFilterMin: {
        value: 0.3,
        control: { min: 0.0, max: 1.0, step: 0.01 },
        label: 'Filter Min'
    },
    uFilterMax: {
        value: 0.7,
        control: { min: 0.0, max: 1.0, step: 0.01 },
        label: 'Filter Max'
    },
    uColorScale: {
        value: 1.0,
        control: { min: 0.1, max: 5.0, step: 0.1 },
        label: 'Color Scale'
    },
    uColorOffset: {
        value: 0.0,
        control: { min: -1.0, max: 1.0, step: 0.1 },
        label: 'Color Offset'
    }
});