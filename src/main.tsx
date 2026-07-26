import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// Ambas ventanas comparten el mismo HTML. La URL decide qué árbol React cargar.
const isSpectrumWindow = new URLSearchParams(window.location.search).has("spectrum");

// La carga dinámica evita que la ventana pequeña importe toda la biblioteca,
// las búsquedas y el reproductor que solamente necesita la ventana principal.
void (async () => {
  const Component = isSpectrumWindow
    ? (await import("./SpectrumWindow")).default
    : (await import("./App")).default;

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Component />
    </StrictMode>,
  );
})();
