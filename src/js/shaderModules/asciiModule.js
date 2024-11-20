
import { ShaderModule } from '../ShaderModule';

export const createAsciiModule = () => new ShaderModule('ASCII', {
    uCharSize: { 
        value: 16.0, 
        control: { min: 8.0, max: 32.0, step: 8.0 },
        label: 'Character Size'
    },
    uBrightness: { 
        value: 1.0, 
        control: { min: 0.0, max: 2.0, step: 0.1 },
        label: 'Brightness'
    }
});