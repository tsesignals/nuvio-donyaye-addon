const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://donyayeserial-new1.top"; // Update domain if it rotates

const manifest = {
  id: "org.donyaye-serial.nuvio",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "Donyaye Serial streams for Nuvio",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: [],
  idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

// 1. Resolve title from IMDB ID using Cinemeta
async function getMediaMeta(type, imdbId) {
  try {
    const metaType = type === "series" ? "series" : "movie";
    const res = await axios.get(`https://v3-cinemeta.strem.io/meta/${metaType}/${imdbId}.json`, { timeout: 5000 });
    return res.data?.meta || null;
  } catch (err) {
    console.error("Cinemeta lookup failed:", err.message);
    return null;
  }
}

// 2. Search Donyaye Serial for the content page
async function searchDonyayeSerial(title) {
  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 8000
    });

    const $ = cheerio.load(html);
    // Find the first post link in search results
    const postLink = $("article a, .post-title a, h2 a").first().attr("href");
    return postLink || null;
  } catch (err) {
    console.error("Search failed:", err.message);
    return null;
  }
}

// 3. Extract direct download/stream links from the post page
async function extractStreams(pageUrl, type, season, episode) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 8000
    });

    const $ = cheerio.load(html);
    const streams = [];

    // Format season and episode tags (e.g., S01E01)
    const sPad = String(season).padStart(2, "0");
    const ePad = String(episode).padStart(2, "0");
    const targetTag = `S${sPad}E${ePad}`.toLowerCase();

    // Iterate through all anchor tags containing media files
    $("a[href*='.mp4'], a[href*='.mkv']").each((_, el) => {
      const link = $(el).attr("href");
      const text = $(el).text().trim() || "";

      if (!link) return;

      if (type === "series") {
        // Match specific season and episode markers
        const lowerLink = link.toLowerCase();
        if (lowerLink.includes(targetTag) || lowerLink.includes(`s${season}e${episode}`)) {
          streams.push({
            title: `Donyaye Serial - ${text || `S${sPad}E${ePad}`}`,
            url: link
          });
        }
      } else {
        // Movies: return available qualities
        streams.push({
          title: `Donyaye Serial - ${text || "Play Movie"}`,
          url: link
        });
      }
    });

    return streams;
  } catch (err) {
    console.error("Extraction failed:", err.message);
    return [];
  }
}

// Main stream handler
builder.defineStreamHandler(async ({ type, id }) => {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] || null;
  const episode = parts[2] || null;

  // Step 1: Get metadata
  const meta = await getMediaMeta(type, imdbId);
  if (!meta || !meta.name) {
    return { streams: [] };
  }

  // Step 2: Search site
  const postUrl = await searchDonyayeSerial(meta.name);
  if (!postUrl) {
    return { streams: [] };
  }

  // Step 3: Scrape stream links
  const streams = await extractStreams(postUrl, type, season, episode);

  return { streams };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Addon running on: ${url}`);
});
