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

// **Added curve module enable flag**
uniform bool uCurveEnabled;

// **Added blend texture uniform**
uniform sampler2D uBlendTexture;

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

void processColor(inout vec3 color) {
    if (uColorEnabled) {
        float hue = fract(uHueOffset);
        if (uNoiseEnabled) {
            float noiseValue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
            noiseValue = mix(uNoiseMin, uNoiseMax, noiseValue);
            hue += noiseValue;
        }
        vec3 hsvColor = vec3(hue, uSaturation, uValue);
        vec3 rgbColor = hsv2rgb(hsvColor);
        
        // **Conditionally blend with the texture if curve module is enabled**
        if (uCurveEnabled) {
            vec3 blendColor = texture(uBlendTexture, vUv).rgb;
            color = mix(rgbColor, blendColor, 0.5); // Adjust the blend factor as needed
        } else {
            color = rgbColor;
        }
    }
}

void main() {
    vec3 color = vec3(1.0);
    
    if (uNoiseEnabled) {
        float noiseValue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
        noiseValue = mix(uNoiseMin, uNoiseMax, noiseValue);
        color = vec3(noiseValue);
    }
    
    processColor(color);
    
    fragColor = vec4(color, 1.0);
}