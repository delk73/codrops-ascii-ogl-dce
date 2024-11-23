#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform bool uASCIIEnabled;
uniform float uCharSize;
uniform float uBrightness;

out vec4 fragColor;

float character(int n, vec2 p) {
    p = floor(p * vec2(-4.0, 4.0) + 2.5);
    if(clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
        int a = int(round(p.x) + 5.0 * round(p.y));
        if(((n >> a) & 1) == 1) return 1.0;
    }
    return 0.0;
}

void main() {
    vec2 pix = gl_FragCoord.xy;
    vec3 col = texture(uTexture, pix / uResolution.xy).rgb;
    
    if (uASCIIEnabled) {
        vec2 charPos = floor(pix / uCharSize) * uCharSize;
        vec3 charCol = texture(uTexture, charPos / uResolution.xy).rgb;
        
        // Calculate luminance preserving color ratios
        vec3 color_ratios = col / (length(col) + 0.0001);
        float luma = dot(charCol, vec3(0.299, 0.587, 0.114));
        
        int n = 4096;
        if (luma > 0.2) n = 65600;
        if (luma > 0.3) n = 163153;
        if (luma > 0.4) n = 15255086;
        if (luma > 0.5) n = 13121101;
        if (luma > 0.6) n = 15252014;
        if (luma > 0.7) n = 13195790;
        if (luma > 0.8) n = 11512810;
        
        vec2 p = mod(pix / (uCharSize/2.0), 2.0) - vec2(1.0);
        float char = character(n, p);
        
        // Apply ASCII pattern while preserving color
        col = color_ratios * length(col) * char * uBrightness;
    }
    
    fragColor = vec4(col, 1.0);
}

