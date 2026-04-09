function bytesToBase64(bytes: Uint8Array) {
    let binary = ""
    const chunkSize = 0x8000

    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize)
        binary += String.fromCharCode(...chunk)
    }

    return btoa(binary)
}

function base64ToBytes(value: string) {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes
}

export function encodeColorArray(colors: Float32Array) {
    const bytes = new Uint8Array(colors.length)

    for (let index = 0; index < colors.length; index++) {
        bytes[index] = Math.round(
            Math.min(1, Math.max(0, colors[index])) * 255
        )
    }

    return bytesToBase64(bytes)
}

export function decodeColorArray(encoded: string) {
    const bytes = base64ToBytes(encoded)
    const colors = new Float32Array(bytes.length)

    for (let index = 0; index < bytes.length; index++) {
        colors[index] = bytes[index] / 255
    }

    return colors
}

export function isAllWhite(colors: Float32Array | ArrayLike<number>) {
    for (let index = 0; index < colors.length; index++) {
        if (Math.abs(colors[index] - 1) > 0.0001) {
            return false
        }
    }

    return true
}

