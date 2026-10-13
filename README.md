# OGA Pledge Map

Interactive map of candidates who have signed the Ontario Greenbelt Alliance's Municipal Leadership Pledge, shown by municipality, with three summary numbers above it. Built for [greenbeltalliance.ca/sign-the-candidate-pledge](https://greenbeltalliance.ca/sign-the-candidate-pledge).

## How it works

- Counts come from the candidate cards already on the page (every element with `data-field="municipality"`), so the map updates itself whenever new signees are published in Webflow. No CMS or Make.com changes are needed.
- Clicking a municipality fills the "Search for a municipality" field (`#muni-search-field`) and triggers Finsweet CMS Filter, so the cards filter as if the name had been typed.
- Typing a municipality's full name zooms the map to it. Clearing the field, or pressing **Show all**, zooms back out.
- The stats show straight away. The map and its libraries (Leaflet and topojson-client from jsDelivr, plus `ontario.json` at about 115 KB gzipped) load only when the map is about to scroll into view.
- If a card's municipality doesn't match a boundary, a warning appears in the browser console.

## Add it to Webflow

Add a **Code Embed** element directly under the "View Candidates in Your Municipality" heading and paste:

```html
<div id="oga-pledge-map"></div>
<script defer src="https://cdn.jsdelivr.net/gh/ehballah/oga-pledge-map@COMMIT/dist/pledge-map.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/ehballah/oga-pledge-map@COMMIT/dist/show-more.js"></script>
```

Replace `COMMIT` with the latest commit hash (or `1` once a v1 release exists).

Optional attributes on the map's `div`:

| Attribute | Default |
|---|---|
| `data-search` | `#muni-search-field` |
| `data-field` | `[data-field="municipality"]` |
| `data-src` | `ontario.json` next to the script |

### Show more (`dist/show-more.js`)

Shows the first 24 candidate cards with **Show 24 more** and **Show all** buttons under the list. Every card stays on the page (only hidden), so the map's counts, the Finsweet search and the card scripts keep working. While a search is active, or a municipality is selected on the map, every match shows and the buttons hide. Cards added later by Finsweet CMS Load are picked up automatically.

Optional attributes on its `<script>` tag: `data-step` (cards per click, default 24), `data-list` (default `[fs-cmsfilter-element="list"]`), `data-search` (default `#muni-search-field`). To remove it, delete that one `<script>` line.

## Updating

1. Commit changes, then tag a new version (`git tag v1.0.1 && git push --tags`).
2. `@1` in the embed URL follows the newest `1.x` tag. jsDelivr can cache for up to 12 hours; to update sooner, visit `https://purge.jsdelivr.net/gh/ehballah/oga-pledge-map@1/dist/pledge-map.js`.

The map data can be rebuilt with `data-build/build.sh` (needs `mapshaper`).

## Data sources

- Municipal boundaries: Statistics Canada, 2021 Census boundary files (census subdivisions, cartographic). Contains information licensed under the Open Government Licence – Canada. First Nations reserves and unorganized areas are drawn but not selectable, since they don't hold municipal elections.
- Stat tiles: **Candidates signed** (all cards), **Greenbelt-area municipalities** (the 62 Greenbelt municipalities plus 37 with at least 1 km² of land within 20 km of the Greenbelt, 99 in all, roughly the municipalities OGA reached out to) and **Greenbelt municipalities** (62). Signees from municipalities outside the area still count in the first tile.
- Lakes: Statistics Canada, 2016 Census lakes and rivers (polygons). Contains information licensed under the Open Government Licence – Canada. Every lake of 20 km² or more south of 46°N is shown (Lake Simcoe, Lake Scugog, the Kawarthas, Muskoka and others), plus lakes of 150 km² or more further north.
- Greenbelt outer boundary: Ontario GeoHub. Contains information licensed under the Open Government Licence – Ontario. Shown at its full official shape, including the Urban River Valleys, with light simplification. A municipality counts as a Greenbelt municipality if at least 1 km² of it is inside the boundary (62 municipalities).
- Hamilton Township (Northumberland) is renamed in the data so it doesn't clash with the City of Hamilton.

## Testing locally

```
python3 -m http.server
```

Then open `http://localhost:8000/test/index.html`. It's a saved copy of the live page with the embed added.
