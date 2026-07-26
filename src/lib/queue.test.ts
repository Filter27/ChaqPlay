import { describe, expect, it } from "vitest";
import type { Track } from "../types";
import { buildFollowingQueue } from "./queue";

const tracks = ["a", "b", "c"].map((id): Track => ({
  id,
  title: id,
  artist: "Prueba",
  duration: null,
  thumbnail: "",
  source: "youtube",
}));

describe("buildFollowingQueue", () => {
  it("conserva en orden las pistas posteriores", () => {
    expect(buildFollowingQueue(tracks, "a").map((track) => track.id)).toEqual(["b", "c"]);
  });

  it("queda vacía después de la última pista", () => {
    expect(buildFollowingQueue(tracks, "c")).toEqual([]);
  });

  it("no inventa una cola para un identificador desconocido", () => {
    expect(buildFollowingQueue(tracks, "missing")).toEqual([]);
  });
});
