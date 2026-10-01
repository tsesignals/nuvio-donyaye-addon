const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.donyaye-serial.nuvio",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "Donyaye Serial links for Nuvio",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: [],
  idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  // Parsing IMDB ID and episode markers
  const [imdbId, season, episode] = id.split(":");

  // Placeholder stream to confirm Nuvio connectivity
  return {
    streams: [
      {
        title: "Test Stream (Addon Working)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  };
});

const port = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Addon running on: ${url}`);
});
