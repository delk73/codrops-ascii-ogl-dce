#version 300 es
precision mediump float;

uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform bool uUseCircle;
uniform float uRadius;    // Add radius uniform
uniform float uStroke;    // Add stroke uniform
uniform vec2 uResolution;

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

float getCircleDistance(vec2 p, float r, float str) {
    return str == 0.0 ? 
        (length(p) - r) : 
        (abs(length(p) - r) - str);
}

void main() {
    vec3 color;
    
    if (uUseCircle) {
        // Center and scale UV coordinates
        vec2 center = vUv - 0.5;
        center *= 2.0; // Scale to -1 to 1 range
        
        // Rotate the position over time
        center = rotate2D(center, uTime * uSpeed);
        
        // Get circle distance
        float circle = getCircleDistance(center, uRadius, uStroke);
        
        // Create color based on circle
        float mask = 1.0 - smoothstep(-0.01, 0.01, circle);
        color = vec3(mask * uValue);
    } else {
        float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
        color = hsv2rgb(vec3(hue, 1.0, uValue));
    }
    
    fragColor = vec4(color, 1.0);
}