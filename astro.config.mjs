import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import keystatic from "@keystatic/astro";
import { fileURLToPath } from "node:url";
import { writeImageVariants } from "./src/lib/responsive-images.ts";

// Smaller AVIF/WebP copies of the Keystatic images in public/images, written into the production build.
const responsiveImages = {
  name: "responsive-images",
  hooks: {
    "astro:build:done": ({ dir, logger }) => writeImageVariants(fileURLToPath(dir), message => logger.info(message)),
  },
};

export default defineConfig({
  site: "https://tivi-dev.github.io",
  base: process.env.NODE_ENV === "production" ? "/Tivi-Dev" : "/",

  integrations: [
    react(),
    markdoc(),
    ...(process.env.NODE_ENV === "production" ? [] : [keystatic()]),
    responsiveImages,
  ],
});
