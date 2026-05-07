import * as THREE from "three"

export type TextSpriteOptions = {
    fontFamily?: string
    fontSizePx?: number
    paddingPx?: number
    textColor?: string
    backgroundColor?: string
    borderColor?: string
    borderWidthPx?: number
    maxWidthPx?: number
    worldScale?: number
}

export type TextSprite = {
    sprite: THREE.Sprite
    setText: (text: string) => void
    dispose: () => void
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + width, y, x + width, y + height, r)
    ctx.arcTo(x + width, y + height, x, y + height, r)
    ctx.arcTo(x, y + height, x, y, r)
    ctx.arcTo(x, y, x + width, y, r)
    ctx.closePath()
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
) {
    const words = text.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let currentLine = ""

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(nextLine).width <= maxWidth) {
            currentLine = nextLine
            continue
        }

        if (currentLine) lines.push(currentLine)
        currentLine = word
    }

    if (currentLine) lines.push(currentLine)
    return lines.length > 0 ? lines : [""]
}

export function createTextSprite(
    initialText: string,
    options: TextSpriteOptions = {}
): TextSprite {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) {
        throw new Error("createTextSprite: 2D canvas is unavailable")
    }

    const cfg: Required<TextSpriteOptions> = {
        fontFamily: options.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif',
        fontSizePx: options.fontSizePx ?? 14,
        paddingPx: options.paddingPx ?? 8,
        textColor: options.textColor ?? "#102a43",
        backgroundColor: options.backgroundColor ?? "rgba(255,255,255,0.94)",
        borderColor: options.borderColor ?? "rgba(16,42,67,0.16)",
        borderWidthPx: options.borderWidthPx ?? 1,
        maxWidthPx: options.maxWidthPx ?? 240,
        worldScale: options.worldScale ?? 0.01
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    })

    const sprite = new THREE.Sprite(material)

    const setText = (text: string) => {
        const font = `${cfg.fontSizePx}px ${cfg.fontFamily}`
        ctx.font = font
        ctx.textBaseline = "top"

        const lines = wrapText(ctx, text, cfg.maxWidthPx)
        const lineHeight = Math.round(cfg.fontSizePx * 1.3)
        const textWidth = Math.min(
            cfg.maxWidthPx,
            Math.ceil(Math.max(1, ...lines.map((line) => ctx.measureText(line).width)))
        )

        canvas.width = textWidth + cfg.paddingPx * 2 + cfg.borderWidthPx * 2
        canvas.height =
            lineHeight * lines.length + cfg.paddingPx * 2 + cfg.borderWidthPx * 2

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = font
        ctx.textBaseline = "top"

        drawRoundedRect(
            ctx,
            cfg.borderWidthPx / 2,
            cfg.borderWidthPx / 2,
            canvas.width - cfg.borderWidthPx,
            canvas.height - cfg.borderWidthPx,
            10
        )
        ctx.fillStyle = cfg.backgroundColor
        ctx.fill()
        ctx.strokeStyle = cfg.borderColor
        ctx.lineWidth = cfg.borderWidthPx
        ctx.stroke()

        ctx.fillStyle = cfg.textColor
        let y = cfg.paddingPx + cfg.borderWidthPx
        for (const line of lines) {
            ctx.fillText(line, cfg.paddingPx + cfg.borderWidthPx, y)
            y += lineHeight
        }

        texture.needsUpdate = true
        sprite.scale.set(
            canvas.width * cfg.worldScale,
            canvas.height * cfg.worldScale,
            1
        )
    }

    setText(initialText)

    return {
        sprite,
        setText,
        dispose: () => {
            texture.dispose()
            material.dispose()
        }
    }
}

