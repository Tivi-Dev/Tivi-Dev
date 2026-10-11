import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import keystatic from "@keystatic/astro";

export default defineConfig({
  site: "https://tivi-dev.github.io",
  base: process.env.NODE_ENV === "production" ? "/Tivi-Dev" : "/",

  integrations: [
    react(),
    markdoc(),
    ...(process.env.NODE_ENV === "production" ? [] : [keystatic()]),
  ],
});
