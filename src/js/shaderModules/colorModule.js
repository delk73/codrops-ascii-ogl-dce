import { ShaderModule } from '../ShaderModule';

export const createColorModule = () => new ShaderModule('Color', {
    uHueOffset: { 
        value: 0.0, 
        control: { min: 0, max: 1 },
        label: 'Hue Offset'
    },
    uSaturation: { 
        value: 1.0, 
        control: { min: 0, max: 1 },
        label: 'Saturation'
    },
    uValue: { 
        value: 0.4, 
        control: { min: 0, max: 1 },
        label: 'Lightness'
    }
});