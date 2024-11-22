#version 300 es
precision mediump float;

// Common uniforms
uniform float uTime;
uniform vec2 uResolution;

// Noise module uniforms
uniform float uFrequency;
uniform float uSpeed;
uniform float uNoiseMin;
uniform float uNoiseMax;

// Color module uniforms
uniform float uHueOffset;
uniform float uSaturation;
uniform float uValue;

// Module enable flags
uniform bool uNoiseEnabled;
uniform bool uColorEnabled;
uniform sampler2D uBlendTexture;
uniform bool uCurveEnabled;

// Replace rotation uniform with offset
uniform float uCurveOffset;
// Keep scale uniform
uniform float uCurveScale;

// Add a new uniform for the selected curve texture
uniform sampler2D uSelectedCurveTexture;

// Circle uniforms
uniform bool uCircleEnabled;
uniform float uRadius;
uniform float uStroke;
uniform float uMultiply;
uniform float uSmoothMin;
uniform float uSmoothMax;

in vec2 vUv;
out vec4 fragColor;

#include "lygia/generative/cnoise.glsl"

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Remove rotate2D function since we don't need it anymore

// Function to create a synthetic UV heatmap texture
vec3 uvHeatmap(vec2 uv) {
    // Normalize UV coordinates to range [0, 1]
    uv = fract(uv);

    // Create a heatmap color based on UV coordinates
    float r = uv.x;  // Red channel based on x-coordinate
    float g = uv.y;  // Green channel based on y-coordinate
    float b = 1.0 - uv.x * uv.y;  // Blue channel based on product of x and y

    return vec3(r, g, b);  // Combine into a color
}

float circleSDF(vec2 p, float r) {
    return length(p) - r;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec3 color = vec3(0.5);
    float baseNoise = 0.0;
    
    if (uNoiseEnabled) {
        // Get raw noise value
        baseNoise = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));        
        
        // Map noise to min/max range
        baseNoise = mix(uNoiseMin, uNoiseMax, baseNoise);
        
        if (uColorEnabled) {
            float hue = fract(baseNoise + uHueOffset);
            color = hsv2rgb(vec3(hue, uSaturation, uValue));
        } else {
            color = vec3(baseNoise);
        }
    }

    // Apply curve texture if enabled
    if (uCurveEnabled && uNoiseEnabled) {  
        // Apply scale first, then offset to the noise value
        float scaledNoise = baseNoise * uCurveScale;
        float offsetNoise = clamp(scaledNoise + uCurveOffset, 0.0, 1.0);
        
        // Use transformed noise for LUT lookup
        vec2 lutUV = vec2(offsetNoise, 0.5);
        vec3 curveColor = texture(uSelectedCurveTexture, lutUV).rgb;
        color = curveColor;
    }

    if (uCircleEnabled) {
        float d = circleSDF(uv, uRadius);
        d *= uMultiply;
        
        // Apply stroke effect
        float circle = smoothstep(uSmoothMin, uSmoothMax, abs(d) - uStroke);
        color = vec3(1.0 - circle);
    }

    fragColor = vec4(color, 1.0);
}