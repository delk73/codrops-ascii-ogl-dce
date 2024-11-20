#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform bool uCircleEnabled;
uniform bool uASCIIEnabled;
uniform float uRadius;
uniform float uStroke;
uniform float uCharSize;
uniform float uBrightness;
uniform float uMultiply;
uniform float uSmoothMin;
uniform float uSmoothMax;
out vec4 fragColor;

float character(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if(clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
    int a = int(round(p.x) + 5.0 * round(p.y));
    if(((n >> a) & 1) == 1) return 1.0;
  }
  return 0.0;
}

float getCircleDistance(vec2 p, float r, float str) {
    return str == 0.0 ? 
        (length(p) - r) : 
        (abs(length(p) - r) - str);
}

void main() {
    vec2 pix = gl_FragCoord.xy;
    vec3 col;
    
    if (uASCIIEnabled) {
        vec2 charPos = floor(pix / uCharSize) * uCharSize;
        col = texture(uTexture, charPos / uResolution.xy).rgb;
        
        float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
        int n = 4096;
        if (gray > 0.2) n = 65600;
        if (gray > 0.3) n = 163153;
        if (gray > 0.4) n = 15255086;
        if (gray > 0.5) n = 13121101;
        if (gray > 0.6) n = 15252014;
        if (gray > 0.7) n = 13195790;
        if (gray > 0.8) n = 11512810;
        vec2 p = mod(pix / (uCharSize/2.0), 2.0) - vec2(1.0);
        col = col * character(n, p) * uBrightness;
    } else {
        col = texture(uTexture, pix / uResolution.xy).rgb;
    }

    if (uCircleEnabled) {
        vec2 center = uResolution / 2.0;
        float radius = min(uResolution.x, uResolution.y) * uRadius;
        vec2 maskPos = uASCIIEnabled ? floor(pix / uCharSize) * uCharSize + vec2(uCharSize/2.0) : pix;
        float dist = getCircleDistance(maskPos - center, radius, uStroke * radius);
        
        // Adjust the smoothstep and multiply calculation
        float mask = 1.0 - smoothstep(uSmoothMin * radius, uSmoothMax * radius, dist);
        mask = clamp(mask * uMultiply, 0.0, 1.0);
        
        col *= mask;
    }

    fragColor = vec4(col, 1.0);
}