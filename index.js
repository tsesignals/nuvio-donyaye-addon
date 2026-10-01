import { addonBuilder, serveHTTP } from "stremio-addon-sdk";

const builder = new addonBuilder({
  id: "org.donyaye-serial.nuvio",
  version: "1.0.0",
  name: "Donyaye Serial",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
});

builder.defineStreamHandler(async ({ type, id }) => {
  // Your scraping and link resolving logic here
  return { streams: [] };
});

// Use the environment port provided by the host, or default to 7000 locally
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
