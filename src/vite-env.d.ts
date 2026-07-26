/// <reference types="vite/client" />

// hls.js publica la compilación ligera sin un mapa de tipos propio, pero su
// API pública es la misma que la versión completa.
declare module "hls.js/light" {
  import Hls from "hls.js";
  export default Hls;
}

interface Window {
  __TAURI_INTERNALS__?: unknown;
}
