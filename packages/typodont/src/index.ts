export { TypodontViewer } from "./viewer"
export type {
    TypodontInitialToothState,
    TypodontInteractionKeyOptions,
    TypodontLightingOptions,
    ToothMesh,
    TypodontSelectionChangeDetail,
    TypodontToothTransform,
    TypodontViewerOptions,
    TypodontViewerState
} from "./viewer"

export type {
    TypodontActionDefinition,
    TypodontPlugin,
    TypodontPreviewHit,
    TypodontToothHit,
    TypodontToolDefinition
} from "./plugin"
export {
    getFDINotation,
    getNotationLabel,
    getToothDetail,
    normalizeToothId,
    toMeshName
} from "./toothMetadata"
export type { TypodontNotationMode, TypodontToothDetail } from "./toothMetadata"
export {
    DEFAULT_DRACO_DECODER_PATH,
    resolveTypodontModelSource
} from "./modelSource"
export type { TypodontModelLicense, TypodontModelSource } from "./modelSource"

export { RotateToolPlugin } from "./plugins/rotateTool"
export { ScaleToolPlugin } from "./plugins/scaleTool"
export { PaintToolPlugin } from "./plugins/paintTool"
export type { PaintToolState } from "./plugins/paintTool"
export { AnnotationToolPlugin } from "./plugins/annotationTool"
export { LabelsToolPlugin } from "./plugins/labelsTool"
export type { LabelsToolPluginOptions } from "./plugins/labelsTool"
export { VisualizationToolPlugin } from "./plugins/visualizationTool"
export { EnvironmentLightingToolPlugin } from "./plugins/environmentLightingTool"
export type {
    EnvironmentLightingMode,
    EnvironmentLightingToolPluginOptions
} from "./plugins/environmentLightingTool"
export { ExportPlugin } from "./plugins/exportPlugin"
export type { ExportPluginOptions } from "./plugins/exportPlugin"

export { loadTypodont } from "./loader"
