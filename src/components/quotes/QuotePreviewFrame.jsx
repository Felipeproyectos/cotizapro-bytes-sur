import { useEffect, useRef, useState } from "react";

// Muestra el HTML exacto del PDF, escalado al ancho disponible
export default function QuotePreviewFrame({ html }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const [height, setHeight] = useState(1123);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 794));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setHeight(1123);
  }, [html]);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(doc.body.scrollHeight, 1123));
  };

  const handleLoad = () => {
    measure();
    setTimeout(measure, 350); // re-mide tras cargar el logo
  };

  return (
    <div ref={wrapRef} className="relative overflow-hidden bg-white" style={{ height: Math.round(height * scale) }}>
      <iframe
        ref={frameRef}
        srcDoc={html}
        onLoad={handleLoad}
        title="Vista previa de la cotización"
        style={{
          width: 794,
          height,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}