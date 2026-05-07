import type { Meta, StoryObj } from "@storybook/react-vite"
import { TypodontStoryCanvas } from "./TypodontStoryCanvas"

const meta = {
  title: "Typodont/Clinical Workflows",
  component: TypodontStoryCanvas,
  tags: ["autodocs"],
  args: {
    height: 640,
    showDebug: true,
    panKey: "Shift",
    rotateKey: "Alt",
    lightIntensity: 0.6,
  },
  argTypes: {
    panKey: {
      control: "text",
      description: "KeyboardEvent.key used to temporarily pan with left drag.",
    },
    rotateKey: {
      control: "text",
      description:
        "KeyboardEvent.key used to temporarily rotate with left drag across modes.",
    },
    lightIntensity: {
      control: { type: "range", min: 0.02, max: 1.2, step: 0.02 },
      description: "Initial environment map intensity for environment stories.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Interactive clinical stories for typodont: labels, paint, annotations, deformity presets, environment maps, export state, and same-canvas inspector workflows.",
      },
    },
  },
} satisfies Meta<typeof TypodontStoryCanvas>

export default meta

type Story = StoryObj<typeof meta>

export const Selector: Story = {
  args: {
    scenario: "selector",
  },
}

export const NavigationInteractions: Story = {
  args: {
    scenario: "visualization",
    panKey: "Shift",
    rotateKey: "Alt",
  },
}

export const MobileSelector: Story = {
  args: {
    scenario: "selector",
    showDebug: false,
    mobileView: true,
  },
}

export const PaintAndAnnotate: Story = {
  args: {
    scenario: "paint",
  },
}

export const DeformityPresets: Story = {
  args: {
    scenario: "deformity",
  },
}

export const ClinicalVisualization: Story = {
  args: {
    scenario: "visualization",
  },
}

export const EnvironmentMaps: Story = {
  args: {
    scenario: "environment",
    lightIntensity: 0.45,
  },
}

export const HiddenTeeth: Story = {
  args: {
    scenario: "hidden",
  },
}
