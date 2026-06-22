import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("PWA shell", () => {
  it("declares the web app manifest from index.html", () => {
    const index = readProjectFile("index.html");
    const manifest = JSON.parse(readProjectFile("public/manifest.webmanifest"));

    expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(manifest).toEqual(expect.objectContaining({
      name: "PlotForge",
      short_name: "PlotForge",
      display: "standalone",
      start_url: "/",
      scope: "/",
      theme_color: "#0a0d12",
    }));
    expect(manifest.icons[0]).toEqual(expect.objectContaining({
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
    }));
  });

  it("registers a production service worker and caches the shell", () => {
    const main = readProjectFile("src/main.jsx");
    const worker = readProjectFile("public/sw.js");

    expect(main).toContain("navigator.serviceWorker.register(\"/sw.js\")");
    expect(worker).toContain("plotforge-shell-v1");
    expect(worker).toContain("\"/manifest.webmanifest\"");
    expect(worker).toContain("self.addEventListener(\"fetch\"");
  }, 15000);
});
