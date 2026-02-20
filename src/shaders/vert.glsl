varying vec3 vPosition;
varying vec3 vNormal;
uniform float uTime;

// #include ../includes/enhancedRandom2D.glsl
float random2D(vec2 value)
{
    return 
    fract(sin(dot(value.xy, vec2(12.9898,78.233))) * 43758.5453123);
    fract(sin(distance(value*1.618033988749895, value)*2.0));
}

void main()
{
    // Position, world space
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Glitch
        float glitchTime = uTime - modelPosition.y;
    float glitchStrength = sin(glitchTime) + sin(glitchTime * 11.68) +  sin(glitchTime * 5.06);  
    glitchStrength /= 3.0;
    glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
    glitchStrength *= 0.15;
    // Random offset
    modelPosition.x += (random2D(modelPosition.xz + uTime) - 0.5) * glitchStrength;
    modelPosition.z += (random2D(modelPosition.zx + uTime) - 0.5) * glitchStrength;

    // Final position
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
    
       // Model normal
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
    // Varyings
    // World space
    vPosition = modelPosition.xyz;

    // object space
    // vPosition = position.xyz; // Using the original position in object space

    // Normal vector
    // vNormal = normal;
     vNormal = modelNormal.xyz;
}
