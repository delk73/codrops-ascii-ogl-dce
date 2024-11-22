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

// Add new uniforms
uniform float uCurveRotation;
uniform float uCurveScale;

// Add a new uniform for the selected curve texture
uniform sampler2D uSelectedCurveTexture;

in vec2 vUv;
out vec4 fragColor;

#include "lygia/generative/cnoise.glsl"

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(
        p.x * c - p.y * s,
        p.x * s + p.y * c
    );
}

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

void main() {
    vec3 color = vec3(0.5);
    
    if (uNoiseEnabled) {
        // Get raw noise value
        float noise = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));        
        
        // Map noise to min/max range
        noise = mix(uNoiseMin, uNoiseMax, noise);
        
        if (uColorEnabled) {
            float hue = fract(noise + uHueOffset);
            color = hsv2rgb(vec3(hue, uSaturation, uValue));
        } else {
            color = vec3(noise);
        }

    }

    // Apply curve texture if enabled
    if (uCurveEnabled) {  
        // Generate base noise value
        float noise = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
        
        // Use noise value as the x-coordinate for LUT lookup
        // We'll use a fixed y-coordinate (0.5) since we're treating this as a 1D LUT
        vec2 lutUV = vec2(noise, 0.5);
        
        // Apply the same rotation/scale transforms to maintain consistency
        lutUV -= 0.5;
        lutUV *= uCurveScale;
        lutUV = rotate2D(lutUV, uCurveRotation);
        lutUV += 0.5;
        
        // Sample the curve texture using our noise-based UV
        vec3 curveColor = texture(uSelectedCurveTexture, lutUV).rgb;
        
        // The curve color is now directly mapped to our noise value
        color = curveColor;
        
        // Ensure values stay in valid range
        color = clamp(color, 0.0, 1.0);
    }

    // Set the fragment color
    fragColor = vec4(color, 1.0);

}