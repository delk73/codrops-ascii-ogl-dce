#version 300 es
precision mediump float;

uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform bool uUseCircle; // Toggle for circle or noise
uniform vec2 uResolution; // Add resolution uniform

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
    float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
    color = hsv2rgb(vec3(hue, 1.0, uValue));
    fragColor = vec4(color, 1.0);
}