const express = require("express");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.static(__dirname));

const IA_SEARCH = "https://archive.org/advancedsearch.php";
const IA_METADATA = "https://archive.org/metadata/";
const ALLOWED_LICENSE_HINTS = [
  "creativecommons.org/publicdomain/",
  "creativecommons.org/licenses/by/",
  "creativecommons.org/licenses/by-sa/",
  "creativecommons.org/licenses/zero/1.0",
  "creativecommons.org/publicdomain/zero/1.0"
];
const READABLE_EXTENSIONS = new Set(["pdf", "djvu", "cbz", "cbr", "epub", "jp2", "zip"]);

function cleanText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return typeof value === "string" ? value : "";
}
function isLicenseConfirmed(metadata = {}) {
  const license = cleanText(metadata.licenseurl).toLowerCase();
  const rights = cleanText(metadata.rights).toLowerCase();
  return ALLOWED_LICENSE_HINTS.some(hint => license.includes(hint)) ||
    rights.includes("public domain") || rights.includes("public-domain") ||
    rights.includes("creative commons attribution") || rights.includes("cc by-sa");
}
function isReadableFile(file) {
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return READABLE_EXTENSIONS.has(ext) && !/_(text|djvu\.xml|scandata|files\.xml)$/i.test(name);
}

app.get("/api/comics", async (req, res) => {
  const name = String(req.query.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Character name is required." });
  const safeName = name.replace(/[^a-z0-9\s'-]/gi, " ").replace(/\s+/g, " ").trim();
  if (!safeName) return res.status(400).json({ error: "Please provide a valid character name." });

  try {
    const query = `((title:(Marvel) OR creator:(Marvel) OR subject:(Marvel) OR description:(Marvel)) AND (title:(${safeName}) OR subject:(${safeName}) OR description:(${safeName}))) AND mediatype:texts`;
    const searchUrl = new URL(IA_SEARCH);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("fl[]", "identifier,title,year,creator,description,subject,collection,licenseurl,rights");
    searchUrl.searchParams.set("rows", "35");
    searchUrl.searchParams.set("page", "1");
    searchUrl.searchParams.set("output", "json");
    searchUrl.searchParams.set("sort[]", "year asc");

    const searchResponse = await fetch(searchUrl, { headers: { "User-Agent": "MarvelHybridComicReader/1.0" } });
    if (!searchResponse.ok) throw new Error(`Internet Archive search returned HTTP ${searchResponse.status}`);
    const searchPayload = await searchResponse.json();
    const docs = searchPayload.response?.docs || [];

    const checked = await Promise.all(docs.slice(0, 25).map(async doc => {
      try {
        const metaResponse = await fetch(`${IA_METADATA}${encodeURIComponent(doc.identifier)}`, { headers: { "User-Agent": "MarvelHybridComicReader/1.0" } });
        if (!metaResponse.ok) return null;
        const item = await metaResponse.json();
        const metadata = item.metadata || {};
        const files = Array.isArray(item.files) ? item.files : [];
        const marvelMetadata = [
          metadata.title, metadata.creator, metadata.publisher, metadata.subject,
          metadata.description, metadata.collection, doc.title, doc.creator,
          doc.subject, doc.description, doc.collection
        ].map(cleanText).join(" ").toLowerCase();
        // Strict publisher/topic gate: do not mix in unrelated public-domain comics.
        if (!marvelMetadata.includes("marvel")) return null;
        const readable = files.some(isReadableFile);
        const licenseConfirmed = isLicenseConfirmed(metadata) || isLicenseConfirmed(doc);
        const title = cleanText(metadata.title) || cleanText(doc.title) || doc.identifier;
        const description = cleanText(metadata.description) || cleanText(doc.description);
        const creator = cleanText(metadata.creator) || cleanText(doc.creator);
        const year = cleanText(metadata.year) || cleanText(doc.year);
        const cover = `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`;
        const detailUrl = `https://archive.org/details/${encodeURIComponent(doc.identifier)}`;
        const readerUrl = `https://archive.org/stream/${encodeURIComponent(doc.identifier)}?ui=embed`;
        return {
          identifier: doc.identifier,
          title,
          description: description.replace(/<[^>]*>/g, " ").slice(0, 900),
          creator,
          year,
          cover,
          detailUrl,
          readerUrl,
          readable,
          licenseConfirmed,
          canRead: readable && licenseConfirmed,
          rightsLabel: licenseConfirmed ? "Open licence / public-domain indication" : "Rights not confirmed — external item only"
        };
      } catch (_) { return null; }
    }));

    const comics = checked.filter(Boolean).filter(item => item.canRead || item.readable).slice(0, 18);
    res.json({
      source: "Internet Archive",
      comics,
      message: comics.length
        ? "Showing Marvel-related archive records only. In-page reading is enabled only when a readable file and an explicit public-domain/open-licence signal are present."
        : `No readable Marvel-related comic records were found for “${name}”. This source may not host that Marvel issue; no unrelated publishers are shown.`,
      attributionText: "Marvel-related metadata from Internet Archive. This is not an official Marvel catalogue. Rights vary by item; only items with an explicit public-domain/open-licence signal can be opened in the embedded reader."
    });
  } catch (error) {
    console.error("Internet Archive search error:", error.message);
    res.status(502).json({ error: "Could not contact Internet Archive. Check your internet connection and try again." });
  }
});

app.listen(PORT, () => console.log(`Marvel Explorer running at http://localhost:${PORT}`));
