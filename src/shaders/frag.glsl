uniform float uTime;
uniform vec3 uColor;
uniform float uAberrationStrength; // New uniform for controlling aberration

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    // Normal
    vec3 normal = normalize(vNormal);
    if(!gl_FrontFacing)
        normal *= -1.0;
    
    // Fresnel for aberration offset calculation
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = pow(fresnel, 2.0);
    
    // Calculate aberration offset based on fresnel and distance from center
    vec2 screenPos = gl_FragCoord.xy / vec2(1024.0); // Adjust resolution as needed
    vec2 centerOffset = screenPos - 0.5;
    float distanceFromCenter = length(centerOffset);
    
    // Create chromatic aberration offset
    float aberrationOffset = uAberrationStrength * distanceFromCenter * fresnel;
    
    // Sample each color channel at slightly different positions
    vec2 redOffset = centerOffset * (1.0 + aberrationOffset * 1.05);
    vec2 greenOffset = centerOffset * (1.0 + aberrationOffset * 0.05);
    vec2 blueOffset = centerOffset * (1.0 - aberrationOffset * 1.05);
    
    // Calculate stripes for each channel with slight offset
    float stripesRed = mod((vPosition.y + redOffset.y * 0.1 - uTime * 0.08) * 20.0, 1.0);
    stripesRed = pow(stripesRed, 3.0);
    
    float stripesGreen = mod((vPosition.y + greenOffset.y * 0.1 - uTime * 0.06) * 20.0, 1.0);
    stripesGreen = pow(stripesGreen, 3.0);
    
    float stripesBlue = mod((vPosition.y + blueOffset.y * 0.1 - uTime * 0.07) * 20.0, 1.0);
    stripesBlue = pow(stripesBlue, 3.0);
    
    // Falloff
    float falloff = smoothstep(0.8, 0.2, fresnel);
    
    // Calculate holographic effect for each channel
    float holographicRed = stripesRed * fresnel;
    holographicRed += fresnel * 1.25;
    holographicRed *= falloff;
    
    float holographicGreen = stripesGreen * fresnel;
    holographicGreen += fresnel * 1.25;
    holographicGreen *= falloff;
    
    float holographicBlue = stripesBlue * fresnel;
    holographicBlue += fresnel * 1.25;
    holographicBlue *= falloff;
    
    // Apply chromatic aberration to the base color
    vec3 aberratedColor;
    aberratedColor.r = uColor.r * (1.0 + aberrationOffset * 4.3);
    aberratedColor.g = uColor.g;
    aberratedColor.b = uColor.b * (1.0 - aberrationOffset * 0.4);
    
    // Combine everything with individual channel intensities
    vec3 finalColor = aberratedColor * vec3(holographicRed, holographicGreen, holographicBlue);
    
    // Add some spectral dispersion effect
    float spectralShift = sin(uTime * 2.0 + distanceFromCenter * 10.0) * 0.1;
    finalColor.r += spectralShift * fresnel * 0.2;
    finalColor.b -= spectralShift * fresnel * 0.2;
    
    // Calculate average alpha from all channels
    float alpha = (holographicRed + holographicGreen + holographicBlue) / 3.0;
    
    gl_FragColor = vec4(finalColor, alpha);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
