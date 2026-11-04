import { renderCarta } from "./carta";
import { renderEjecutiva } from "./ejecutiva";
import { renderMinimal } from "./minimal";

export const QUOTE_DESIGNS = [
  { key: "carta", name: "Carta", tagline: "Encabezado claro sobre blanco" },
  { key: "ejecutiva", name: "Ejecutiva", tagline: "Banda oscura con datos alineados" },
  { key: "minimal", name: "Minimal", tagline: "Tipográfica, sin bloques de color" },
];

export const DEFAULT_QUOTE_DESIGN = "carta";

export function buildQuoteHtml(quote, company, design) {
  const key = design || company?.quote_design || DEFAULT_QUOTE_DESIGN;
  if (key === "ejecutiva") return renderEjecutiva(quote, company);
  if (key === "minimal") return renderMinimal(quote, company);
  return renderCarta(quote, company);
}