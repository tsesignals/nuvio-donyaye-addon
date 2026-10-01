const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const builder = new addonBuilder({
  id: "org.donyaye-serial.nuvio",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "Streams from Donyaye Serial",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
});

builder.defineStreamHandler(async ({ type, id }) => {
  // Your scraping/link resolving logic goes here
  return { streams: [] };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
