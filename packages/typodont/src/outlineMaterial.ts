import * as THREE from "three"

export function createOutlineMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color("black") },
            opacity: { value: 1 },
            thickness: { value: 0.03 },
            screenspace: { value: 0 },
            size: { value: new THREE.Vector2(1, 1) }
        },

        vertexShader: `
    #include <common>
    uniform float thickness;

    void main() {

      vec3 newPosition = position + normal * thickness;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(newPosition, 1.0);
    }
    `,

        fragmentShader: `
    uniform vec3 color;
    uniform float opacity;

    void main() {
      gl_FragColor = vec4(color, opacity);
    }
    `,

        side: THREE.BackSide,
        transparent: true
    })
}