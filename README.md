# Marvel-only Comic Explorer

Responsive superhero search with character data from SuperheroAPI and Marvel-related archive discovery from Internet Archive.

## Run locally
1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` (do not open index.html directly).

## Important
- Comic discovery is deliberately restricted to records whose metadata explicitly mentions Marvel; unrelated publishers and generic public-domain comics are not shown.
- Internet Archive is not an official Marvel catalogue and may not contain a specific Marvel issue.
- Full in-page reading is only enabled when a readable file and an explicit public-domain/open-licence signal are found. Most modern Marvel issues are copyrighted and may only be available through authorized services.
- If no matching records are available, the UI shows a clear empty state and a Marvel-related Internet Archive search link rather than substituting unrelated comics.
- HTML, CSS, and JavaScript are kept in their respective folders.
