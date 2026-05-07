import type { Preview } from "@storybook/react-vite"

import "../src/index.css"

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      expanded: true,
    },
    backgrounds: {
      default: "clinic",
      values: [
        { name: "clinic", value: "#edf3f7" },
        { name: "warm", value: "#fff8ef" },
        { name: "slate", value: "#0f172a" },
      ],
    },
  },
}

export default preview
