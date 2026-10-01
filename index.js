const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://donyayeserial-new1.top"; // Update if their active search domain changes

const manifest = {
  id: "org.donyaye-serial.nuvio",
  version: "1.2.0",
  name: "Donyaye Serial",
  description: "Donyaye Serial streams with qualities and subtitles for Nuvio",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: [],
  idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

// 1. Fetch metadata from Cinemeta using IMDB ID
async function getMediaMeta(type, imdbId) {
  try {
    const metaType = type === "series" ? "series" : "movie";
    const res = await axios.get(
      `https://v3-cinemeta.strem.io/meta/${metaType}/${imdbId}.json`,
      { timeout: 6000 }
    );
    return res.data?.meta || null;
  } catch (err) {
    console.error("Cinemeta lookup failed:", err.message);
    return null;
  }
}

// 2. Search Donyaye Serial for the post page
async function searchDonyayeSerial(title) {
  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 8000
    });

    const $ = cheerio.load(html);
    const postLink = $("article a, .post-title a, h2 a").first().attr("href");
    return postLink || null;
  } catch (err) {
    console.error("Search failed:", err.message);
    return null;
  }
}

// 3. Helper to format a clean, detailed stream label for Nuvio
function parseStreamDetails(url) {
  const decoded = decodeURIComponent(url);
  const filename = decoded.split("/").pop();

  // Extract Resolution
  const resMatch = filename.match(/\b(480p|720p|1080p|2160p|4k)\b/i);
  const resolution = resMatch ? resMatch[0].toUpperCase() : "HD";

  // Extract Source & Codec
  const sourceMatch = filename.match(/\b(BluRay|WEB-DL|WEBRip|HDTV)\b/i);
  const codecMatch = filename.match(/\b(x265|x264|hevc|10bit)\b/i);
  const source = sourceMatch ? sourceMatch[0] : "";
  const codec = codecMatch ? codecMatch[0] : "";

  // Extract Dubbed or Subtitle Tag
  let tag = "";
  if (/softsub|زیرنویس/i.test(decoded)) {
    tag = "SoftSub (زیرنویس)";
  } else if (/dub|دوبله|farsi/i.test(decoded)) {
    tag = "Persian Dub (دوبله)";
  }

  const qualityTitle = [resolution, source, codec, tag]
    .filter(Boolean)
    .join(" • ");

  return {
    name: `Donyaye Serial\n${resolution}`,
    title: qualityTitle || filename
  };
}

// 4. Scrape the post page for matching stream URLs
async function extractStreams(pageUrl, type, season, episode) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 8000
    });

    const $ = cheerio.load(html);
    const streams = [];

    // Target tags: e.g. S01E01 or s1e1
    const sPad = String(season).padStart(2, "0");
    const ePad = String(episode).padStart(2, "0");
    const targetTag1 = `s${sPad}e${ePad}`.toLowerCase();
    const targetTag2 = `s${season}e${episode}`.toLowerCase();

    $("a[href*='.mp4'], a[href*='.mkv']").each((_, el) => {
      const link = $(el).attr("href");
      if (!link) return;

      const lowerLink = link.toLowerCase();

      if (type === "series") {
        if (lowerLink.includes(targetTag1) || lowerLink.includes(targetTag2)) {
          const info = parseStreamDetails(link);
          streams.push({
            name: info.name,
            title: info.title,
            url: link
          });
        }
      } else {
        const info = parseStreamDetails(link);
        streams.push({
          name: info.name,
          title: info.title,
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

// 5. Main Stream Handler
builder.defineStreamHandler(async ({ type, id }) => {
  const parts = id.split(":");
  const imdbId = parts[0];
  const season = parts[1] || null;
  const episode = parts[2] || null;

  // Resolve media title
  const meta = await getMediaMeta(type, imdbId);
  if (!meta || !meta.name) {
    return { streams: [] };
  }

  // Find post page on Donyaye Serial
  const postUrl = await searchDonyayeSerial(meta.name);
  if (!postUrl) {
    return { streams: [] };
  }

  // Extract links
  const streams = await extractStreams(postUrl, type, season, episode);

  return { streams };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Addon running on: ${url}`);
});
