export type TypodontNotationMode = "FDI" | "Universal" | "Palmer"

export type TypodontToothDetail = {
    id: string
    meshName: string
    notations: {
        fdi: string
        universal: string
        palmer: string
    }
    type: string
    quadrant: "upper-right" | "upper-left" | "lower-left" | "lower-right"
    arch: "upper" | "lower"
    side: "left" | "right"
}

const TOOTH_TYPE_BY_POSITION: Record<string, string> = {
    "1": "Central Incisor",
    "2": "Lateral Incisor",
    "3": "Canine",
    "4": "First Premolar",
    "5": "Second Premolar",
    "6": "First Molar",
    "7": "Second Molar",
    "8": "Third Molar"
}

const UNIVERSAL_BY_FDI: Record<string, string> = {
    "11": "8",
    "12": "7",
    "13": "6",
    "14": "5",
    "15": "4",
    "16": "3",
    "17": "2",
    "18": "1",
    "21": "9",
    "22": "10",
    "23": "11",
    "24": "12",
    "25": "13",
    "26": "14",
    "27": "15",
    "28": "16",
    "31": "24",
    "32": "23",
    "33": "22",
    "34": "21",
    "35": "20",
    "36": "19",
    "37": "18",
    "38": "17",
    "41": "25",
    "42": "26",
    "43": "27",
    "44": "28",
    "45": "29",
    "46": "30",
    "47": "31",
    "48": "32"
}

const QUADRANT_BY_FDI: Record<string, TypodontToothDetail["quadrant"]> = {
    "1": "upper-right",
    "2": "upper-left",
    "3": "lower-left",
    "4": "lower-right"
}

const PALMER_QUADRANT_BY_FDI: Record<string, string> = {
    "1": "UR",
    "2": "UL",
    "3": "LL",
    "4": "LR"
}

export function normalizeToothId(identifier: string) {
    const match = identifier.trim().match(/(?:teeth[-_])?([1-4][1-8])$/i)
    if (!match) return undefined
    return `teeth-${match[1]}`
}

export function toMeshName(identifier: string) {
    const toothId = normalizeToothId(identifier)
    if (!toothId) return undefined
    return toothId.replace("-", "_")
}

export function getFDINotation(identifier: string) {
    return normalizeToothId(identifier)?.slice(-2)
}

export function getToothDetail(identifier: string, meshName?: string) {
    const toothId = normalizeToothId(identifier)
    if (!toothId) return undefined

    const fdi = toothId.slice(-2)
    const quadrantKey = fdi[0]
    const positionKey = fdi[1]
    const quadrant = QUADRANT_BY_FDI[quadrantKey]
    const palmerQuadrant = PALMER_QUADRANT_BY_FDI[quadrantKey]
    const type = TOOTH_TYPE_BY_POSITION[positionKey]
    const universal = UNIVERSAL_BY_FDI[fdi]

    if (!quadrant || !palmerQuadrant || !type || !universal) {
        return undefined
    }

    return {
        id: toothId,
        meshName: meshName ?? toMeshName(toothId) ?? toothId,
        notations: {
            fdi,
            universal,
            palmer: `${positionKey}${palmerQuadrant}`
        },
        type,
        quadrant,
        arch: quadrant.startsWith("upper") ? "upper" : "lower",
        side: quadrant.endsWith("right") ? "right" : "left"
    } satisfies TypodontToothDetail
}

export function getNotationLabel(
    tooth: TypodontToothDetail,
    notation: TypodontNotationMode
) {
    if (notation === "Universal") return tooth.notations.universal
    if (notation === "Palmer") return tooth.notations.palmer
    return tooth.notations.fdi
}
