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

// Circle curve uniforms
uniform bool uCircleCurveEnabled;
uniform sampler2D uCircleCurveTexture;
uniform float uCircleCurveScale;
uniform float uCircleCurveOffset;

uniform int uBlendMode;
uniform float uBlendStrength;

uniform int uNoiseType;

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

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec3 color = vec3(0.5);
    float baseNoise = 0.0;
    
    if (uNoiseEnabled) {
        vec3 noiseInput = vec3(vUv * uFrequency, uTime * uSpeed);
        
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

    vec3 noiseColor = color;
    vec3 circleColor = vec3(0.0);
    
    if (uCircleEnabled) {
        float d = circleSDF(uv, uRadius);
        d *= uMultiply;
        float circle = smoothstep(uSmoothMin, uSmoothMax, abs(d) - uStroke);
        float rawCircle = 1.0 - circle;

        if (uCircleCurveEnabled) {
            float scaledCircle = clamp(rawCircle * uCircleCurveScale + uCircleCurveOffset, 0.0, 1.0);
            vec2 lutUV = vec2(scaledCircle, 0.5);
            circleColor = texture(uCircleCurveTexture, lutUV).rgb;
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