#version 300 es
precision mediump float;

uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform bool uUseCircle; // Toggle for circle or noise
uniform vec2 uResolution; // Add resolution uniform
uniform float INTERNAL_IN_radius;
uniform float INTERNAL_IN_radiusOffset;
uniform float INTERNAL_IN_stroke;
uniform float INTERNAL_IN_strokeOffset;
uniform float INTERNAL_IN_multiplier;
uniform float INTERNAL_IN_multiplierOffset;
uniform float INTERNAL_IN_subtraction;
uniform float INTERNAL_IN_subtractionOffset;
uniform int INTERNAL_IN_iterations;
uniform vec2 INTERNAL_IN_pOffset;
uniform float INTERNAL_IN_colorScale;
uniform float INTERNAL_IN_colorOffset;
uniform float INTERNAL_IN_sdf1_filter_min;
uniform float INTERNAL_IN_sdf1_filter_max;
uniform float INTERNAL_IN_pTrimx;
uniform float INTERNAL_IN_pTrimy;
uniform float INTERNAL_IN_rotation;

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

float circleSDF(vec2 p) {
    // Apply rotation to input coordinates
    p = rotate2D(p, INTERNAL_IN_rotation);

    float r = INTERNAL_IN_radius;
    float ro = INTERNAL_IN_radiusOffset * 0.01;
    float str = INTERNAL_IN_stroke * 0.1;
    float stro = INTERNAL_IN_strokeOffset * 0.01;
    float m = INTERNAL_IN_multiplier;
    float mo = INTERNAL_IN_multiplierOffset * 0.01;
    float sub = INTERNAL_IN_subtraction;
    float subo = INTERNAL_IN_subtractionOffset * 0.01;
    vec2 po = INTERNAL_IN_pOffset * -0.10;
    vec2 pt = vec2(INTERNAL_IN_pTrimx, INTERNAL_IN_pTrimy) * -1.0;
    vec2 origP = p;
    p += pt;

    float tmp = getCircleDistance(p, r, str) * m - sub;

    // Iterative calculations
    for (int i = 1; i < 10; i++) { // WebGL requires a constant loop bound
        if (i >= INTERNAL_IN_iterations) break;

        p += po;
        r += ro;
        str += stro * float(i);
        m += mo * float(i);
        sub += subo * float(i);

        float current = getCircleDistance(p, r, str) * m - sub;
        tmp = min(current, tmp);
    }

    return tmp;
}

void main() {
    vec3 color;
    if (uUseCircle) {
        float dist = circleSDF(vUv * uResolution - uResolution * 0.5); // Use uResolution
        float alpha = smoothstep(INTERNAL_IN_sdf1_filter_max, INTERNAL_IN_sdf1_filter_min, dist);
        color = vec3(alpha) * INTERNAL_IN_colorScale + INTERNAL_IN_colorOffset;
    } else {
        float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
        color = hsv2rgb(vec3(hue, 1.0, uValue));
    }
    fragColor = vec4(color, 1.0);
}