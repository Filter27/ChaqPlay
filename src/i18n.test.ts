import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("returns the Spanish interface text", () => {
    expect(translate("es", "showSpectrum")).toBe("Mostrar espectro");
  });

  it("returns the English interface text", () => {
    expect(translate("en", "showSpectrum")).toBe("Show spectrum");
  });
});
