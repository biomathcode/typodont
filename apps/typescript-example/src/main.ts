import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

import { TypodontViewer } from "typodont"

const container = document.getElementById("viewer")

if (container) {
  const viewer = new TypodontViewer(container);
}






