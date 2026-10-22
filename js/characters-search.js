(() => {
  "use strict";
  const SUPERHERO_API = "https://www.superheroapi.com/api.php/586069776286026/search/";
  // Comics are requested from our local Node backend; credentials stay in .env.
  const COMICS_API = "/api/comics";
  const form = document.getElementById("connectionForm");
  const input = document.getElementById("search-character");
  const cardsGroup = document.getElementById("cards-group");
  const hint = document.getElementById("searchHint");
  const characterSection = document.getElementById("characterSection");
  const comicSection = document.getElementById("comicSection");
  const characterSpinner = document.getElementById("characterSpinnerSection");
  const comicsSpinner = document.getElementById("comicsSpinnerSection");
  const menuToggle = document.getElementById("menuToggle");
  const mainMenu = document.getElementById("mainMenu");
  let searchTimer, searchController, requestSequence = 0;
  const heroCache = new Map();
  let comicCache = [];
  const esc = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clean = value => value && value !== "-" && value !== "Not applicable" ? value : "Not available";
  const listText = value => Array.isArray(value) ? value.filter(Boolean).join(", ") : clean(value);
  const status = (message, kind = "") => `<p class="status ${kind}">${esc(message)}</p>`;
  const setLoading = (element, message) => { element.innerHTML = `<div class="loading" role="status">${esc(message)}</div>`; };
  const field = (label, value) => `<div class="detail-field"><span>${esc(label)}</span><strong>${esc(clean(value))}</strong></div>`;
  const section = (title, content) => `<section class="detail-group"><h3>${esc(title)}</h3><div class="detail-fields">${content}</div></section>`;

  menuToggle.addEventListener("click", () => {
    const open = mainMenu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  mainMenu.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  function closeMenu() { mainMenu.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.setAttribute("aria-label", "Open navigation"); }

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const term = input.value.trim();
    if (term.length < 2) { cardsGroup.innerHTML = ""; hint.textContent = term ? "Type at least 2 characters to search." : "Enter a character name to get started."; return; }
    searchTimer = setTimeout(() => searchHeroes(term), 350);
  });
  form.addEventListener("submit", e => {
    e.preventDefault(); const term = input.value.trim();
    if (!term) { hint.textContent = "Please enter a character name first."; input.focus(); return; }
    clearTimeout(searchTimer); searchHeroes(term);
  });

  async function searchHeroes(term) {
    const seq = ++requestSequence;
    if (searchController) searchController.abort();
    searchController = new AbortController();
    hint.textContent = "Searching the universe…";
    cardsGroup.innerHTML = `<div class="loading">Searching heroes…</div>`;
    try {
      const response = await fetch(`${SUPERHERO_API}${encodeURIComponent(term)}`, { signal: searchController.signal });
      if (!response.ok) throw new Error("Search service unavailable");
      const data = await response.json();
      if (seq !== requestSequence) return;
      if (data.response !== "success" || !Array.isArray(data.results) || !data.results.length) {
        cardsGroup.innerHTML = ""; hint.textContent = `No heroes found for “${term}”. Try another name.`; return;
      }
      const heroes = data.results.slice(0, 18);
      heroes.forEach(hero => heroCache.set(String(hero.id), hero));
      hint.textContent = `${heroes.length} ${heroes.length === 1 ? "hero" : "heroes"} found. Click any card to view full details and comics.`;
      cardsGroup.innerHTML = `<div class="results-grid">${heroes.map(hero => {
        const image = hero.image?.url || "";
        return `<button type="button" class="hero-card" data-hero-id="${esc(hero.id)}" aria-label="View details for ${esc(hero.name)}">
          ${image ? `<img src="${esc(image)}" alt="${esc(hero.name)}" loading="lazy" decoding="async">` : `<div class="empty-art">HERO</div>`}
          <div class="hero-card-meta"><p class="hero-name">${esc(hero.name)}</p><span>View profile ↗</span></div>
        </button>`;
      }).join("")}</div>`;
    } catch (error) {
      if (error.name === "AbortError") return;
      cardsGroup.innerHTML = ""; hint.textContent = "Could not load characters. Check your connection or API access.";
    }
  }

  cardsGroup.addEventListener("click", event => {
    const card = event.target.closest("[data-hero-id]");
    if (!card) return;
    const hero = heroCache.get(card.dataset.heroId);
    if (hero) showHeroDetails(hero);
  });

  function showHeroDetails(hero) {
    const bio = hero.biography || {}, app = hero.appearance || {}, work = hero.work || {}, links = hero.connections || {}, stats = hero.powerstats || {};
    const image = hero.image?.url || "";
    const statNames = ["intelligence", "strength", "speed", "durability", "power", "combat"];
    const statBars = statNames.map(key => {
      const raw = Number(stats[key]); const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return `<div class="power-stat"><div><span>${esc(key)}</span><strong>${esc(clean(stats[key]))}${stats[key] && stats[key] !== "-" ? "/100" : ""}</strong></div><div class="power-track"><span style="width:${value}%"></span></div></div>`;
    }).join("");
    characterSection.innerHTML = `
      <div class="profile-heading"><div><p class="eyebrow">HERO DOSSIER</p><h2 class="section-title">Character profile</h2></div><span class="alignment alignment-${esc((bio.alignment || "unknown").toLowerCase())}">${esc(clean(bio.alignment))}</span></div>
      <article class="character-panel full-profile">
        ${image ? `<img class="character-portrait" src="${esc(image)}" alt="${esc(hero.name)}" loading="lazy" decoding="async">` : `<div class="empty-art profile-empty">NO IMAGE</div>`}
        <div class="profile-main"><p class="eyebrow">SUPERHERO DATABASE · #${esc(hero.id)}</p><h3 class="character-name">${esc(hero.name)}</h3>
          <p class="character-description">${esc(clean(bio["full-name"]))}${bio["full-name"] && bio["full-name"] !== "-" ? ` · ${esc(clean(app.race))}` : ""}</p>
          <div class="stats"><span class="stat-pill">Publisher · ${esc(clean(bio.publisher))}</span><span class="stat-pill">Gender · ${esc(clean(app.gender))}</span><span class="stat-pill">Race · ${esc(clean(app.race))}</span></div>
          <h3 class="subheading">Power stats</h3><div class="power-grid">${statBars}</div>
        </div>
      </article>
      <div class="details-grid">
        ${section("Biography", field("Full name", bio["full-name"]) + field("Aliases", listText(bio.aliases)) + field("Alignment", bio.alignment) + field("Publisher", bio.publisher) + field("Place of birth", bio["place-of-birth"]) + field("First appearance", bio["first-appearance"]) + field("Alter egos", bio["alter-egos"]))}
        ${section("Appearance", field("Gender", app.gender) + field("Race", app.race) + field("Height", listText(app.height)) + field("Weight", listText(app.weight)) + field("Eye color", app["eye-color"]) + field("Hair color", app["hair-color"]))}
        ${section("Work & base", field("Occupation", work.occupation) + field("Base", work.base))}
        ${section("Connections", field("Group affiliation", links["group-affiliation"]) + field("Relatives", links.relatives))}
      </div>`;
    comicSection.innerHTML = "";
    comicsSpinner.innerHTML = "";
    setLoading(comicsSpinner, `Looking for Marvel comics featuring ${hero.name}…`);
    characterSection.scrollIntoView({ behavior: "smooth", block: "start" });
    loadComics(hero.name);
  }

  async function loadComics(heroName) {
    try {
      const response = await fetch(`${COMICS_API}?name=${encodeURIComponent(heroName)}`);
      const payload = await response.json().catch(() => ({}));
      comicsSpinner.innerHTML = "";
      if (!response.ok) {
        comicSection.innerHTML = `<h2 class="comic-section-heading">Marvel comics featuring ${esc(heroName)}</h2>${status(payload.error || "Marvel comic records could not be loaded.", "error")}`;
        return;
      }
      comicCache = Array.isArray(payload.comics) ? payload.comics : [];
      if (!comicCache.length) {
        comicSection.innerHTML = `<div class="comic-heading-row"><div><p class="eyebrow">MARVEL COMICS ONLY</p><h2 class="comic-section-heading">Marvel comics featuring ${esc(heroName)}</h2><p class="comic-intro">No matching readable Marvel-related comic records were found in the connected archive. Other publishers' comics are intentionally hidden.</p></div></div>
          ${status("Try another character name, or use the archive search link to check whether a specific Marvel issue is available. This site does not invent comic entries or display unrelated publishers.") }
          <p class="attribution"><a href="https://archive.org/search?query=${encodeURIComponent('Marvel Comics ' + heroName + ' AND mediatype:texts')}" target="_blank" rel="noopener noreferrer">Search Marvel-related records on Internet Archive ↗</a></p>`;
        return;
      }
      comicSection.innerHTML = `<div class="comic-heading-row"><div><p class="eyebrow">MARVEL COMICS ONLY</p><h2 class="comic-section-heading">Marvel comics featuring ${esc(heroName)}</h2><p class="comic-intro">Only Marvel-related records are shown. Click a card to read when a suitable open licence is confirmed; otherwise view the archive record.</p></div><span class="comic-count">${comicCache.length} items</span></div>
        <div class="comic-grid">${comicCache.map((comic, index) => {
          const desc = (comic.description || "No description provided by the archive.").trim();
          const year = comic.year || "Year unavailable";
          const creator = comic.creator || "Creator unavailable";
          const action = comic.canRead ? "Read comic ↗" : "View record ↗";
          const rights = comic.canRead ? "Reader available · open-rights signal found" : "Rights not confirmed · external record";
          return `<button type="button" class="comic-card comic-card-button" data-comic-index="${index}" aria-label="${comic.canRead ? "Read" : "Open archive record for"} ${esc(comic.title)}">
            <img src="${esc(comic.cover)}" alt="${esc(comic.title)} cover" loading="lazy" decoding="async" onerror="this.style.display='none'">
            <div class="comic-content"><h3>${esc(comic.title)}</h3><p class="comic-meta">${esc(String(year))} · ${esc(creator)}</p><p>${esc(desc.slice(0, 160))}${desc.length > 160 ? "…" : ""}</p><span class="rights-note ${comic.canRead ? "rights-open" : "rights-unknown"}">${esc(rights)}</span><span class="comic-link">${esc(action)}</span></div>
          </button>`;
        }).join("")}</div><p class="attribution">${esc(payload.attributionText || "Marvel-related archive metadata. Confirm rights before reusing any comic pages.")}</p>`;
    } catch (error) {
      comicsSpinner.innerHTML = "";
      comicSection.innerHTML = `<h2 class="comic-section-heading">Marvel comics featuring ${esc(heroName)}</h2>${status("Cannot reach Internet Archive. Character details are still available; no unrelated comics will be displayed.", "error")}`;
    }
  }

  function ensureReaderModal() {
    let modal = document.getElementById("comicReaderModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "comicReaderModal";
    modal.className = "reader-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "readerTitle");
    modal.hidden = true;
    modal.innerHTML = `<div class="reader-dialog"><header class="reader-toolbar"><div class="reader-heading"><p class="eyebrow">ARCHIVE READER</p><h2 id="readerTitle">Comic title</h2></div><div class="reader-actions"><a id="readerExternalLink" class="reader-external" target="_blank" rel="noopener noreferrer">Open on Internet Archive ↗</a><button id="readerClose" class="reader-close" type="button" aria-label="Close comic reader">×</button></div></header><div class="reader-frame-wrap"><iframe id="readerFrame" title="Comic book reader" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen" allowfullscreen></iframe></div><p class="reader-disclaimer">This reader is hosted by Internet Archive. Availability and page access depend on the source item's access and rights settings.</p></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#readerClose").addEventListener("click", closeComicReader);
    modal.addEventListener("click", event => { if (event.target === modal) closeComicReader(); });
    return modal;
  }

  function openComicReader(comic) {
    const modal = ensureReaderModal();
    modal.querySelector("#readerTitle").textContent = comic.title || "Classic comic";
    modal.querySelector("#readerExternalLink").href = comic.detailUrl;
    const frame = modal.querySelector("#readerFrame");
    frame.src = comic.readerUrl;
    modal.hidden = false;
    document.body.classList.add("reader-open");
    modal.querySelector("#readerClose").focus();
  }

  function closeComicReader() {
    const modal = document.getElementById("comicReaderModal");
    if (!modal) return;
    modal.hidden = true;
    modal.querySelector("#readerFrame").src = "about:blank";
    document.body.classList.remove("reader-open");
  }

  comicSection.addEventListener("click", event => {
    const card = event.target.closest("[data-comic-index]");
    if (!card) return;
    const comic = comicCache[Number(card.dataset.comicIndex)];
    if (!comic) return;
    if (comic.canRead) openComicReader(comic);
    else window.open(comic.detailUrl, "_blank", "noopener,noreferrer");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeComicReader();
  });

  const params = new URLSearchParams(window.location.search);
  const initialName = params.get("name");
  if (initialName) { input.value = initialName; searchHeroes(initialName); }
})();
