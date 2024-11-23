#version 300 es
precision mediump float;

// Common uniforms
uniform float uTime;
uniform vec2 uResolution;

// Noise module uniforms
uniform float uSpeed;
uniform float uNoiseMin;
uniform float uNoiseMax;

// Replace single frequency uniform with separate X and Y frequency uniforms
uniform float uFrequencyX;
uniform float uFrequencyY;

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

// Circle curve uniforms
uniform bool uCircleCurveEnabled;
uniform sampler2D uCircleCurveTexture;
uniform float uCircleCurveScale;
uniform float uCircleCurveOffset;

uniform int uBlendMode;
uniform float uBlendStrength;

uniform int uNoiseType;

// Remove uDitheringIntensity uniform

uniform float uLUTSmoothing;

// Add noise LUT smoothing uniform
uniform float uNoiseLUTSmoothing;

in vec2 vUv;
out vec4 fragColor;

#include "lygia/generative/cnoise.glsl"
#include "lygia/generative/snoise.glsl"
#include "lygia/generative/voronoi.glsl"

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

vec3 blendColors(vec3 noise, vec3 circle) {
    vec3 result;
    
    if (uBlendMode == 0) { // Multiply
        result = noise * circle;
    } else if (uBlendMode == 1) { // Add
        result = noise + circle;
    } else if (uBlendMode == 2) { // Subtract
        result = noise - circle;
    } else if (uBlendMode == 3) { // Overlay
        result = mix(
            2.0 * noise * circle,
            1.0 - 2.0 * (1.0 - noise) * (1.0 - circle),
            step(0.5, noise)
        );
    }
    
    return mix(noise, result, uBlendStrength);
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// Use the same sampleLUT function for both circle and noise
vec3 sampleLUT(sampler2D lut, float value, float smoothing) {
    if (smoothing <= 0.0) {
        return texture(lut, vec2(value, 0.0)).rgb;
    }

    float texel = 1.0 / float(textureSize(lut, 0).x);
    float samples = max(1.0, floor(smoothing * 2.0)) * 2.0 + 1.0;
    vec3 total = vec3(0.0);
    
    for(float i = 0.0; i < samples; i++) {
        float offset = (i - (samples - 1.0) * 0.5) * texel;
        vec2 coord = vec2(clamp(value + offset * smoothing, 0.0, 1.0), 0.0);
        total += texture(lut, coord).rgb;
    }
    
    return total / samples;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec3 color = vec3(0.5);
    float baseNoise = 0.0;
    
    if (uNoiseEnabled) {
        // Multiply vUv by separate FrequencyX and FrequencyY values
        vec3 noiseInput = vec3(vUv * vec2(uFrequencyX, uFrequencyY), uTime * uSpeed);
        
        // Select noise type
        if (uNoiseType == 0) {
            baseNoise = abs(cnoise(noiseInput));
        } 
        else if (uNoiseType == 1) {
            baseNoise = abs(snoise(noiseInput));
        }
        else {
            baseNoise = voronoi(noiseInput).x;
        }
        
        baseNoise = mix(uNoiseMin, uNoiseMax, baseNoise);
        
        color = vec3(baseNoise);
    }

    // Update noise curve sampling
    if (uCurveEnabled && uNoiseEnabled) {  
        float scaledNoise = clamp(baseNoise * uCurveScale + uCurveOffset, 0.0, 1.0);
        color = sampleLUT(uSelectedCurveTexture, scaledNoise, uNoiseLUTSmoothing);
    }

    vec3 noiseColor = color;
    vec3 circleColor = vec3(0.0);
    
    if (uCircleEnabled) {
        float d = circleSDF(uv, uRadius);
        d *= uMultiply;
        float circle = smoothstep(uSmoothMin, uSmoothMax, abs(d) - uStroke);
        float rawCircle = 1.0 - circle;

        // Update circle curve sampling
        if (uCircleCurveEnabled) {
            float scaledCircle = clamp(rawCircle * uCircleCurveScale + uCircleCurveOffset, 0.0, 1.0);
            circleColor = sampleLUT(uCircleCurveTexture, scaledCircle, uLUTSmoothing);
        } else {
            circleColor = vec3(rawCircle);
        }
        
        if (uNoiseEnabled) {
            color = blendColors(noiseColor, circleColor);
        } else {
            color = circleColor;
        }
    }

    fragColor = vec4(color, 1.0);
}