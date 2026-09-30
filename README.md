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
<script defer src="https://cdn.jsdelivr.net/gh/ehballah/oga-pledge-map@1/dist/pledge-map.js"></script>
```

Optional attributes on the `div`:

| Attribute | Default |
|---|---|
| `data-search` | `#muni-search-field` |
| `data-field` | `[data-field="municipality"]` |
| `data-src` | `ontario.json` next to the script |

## Updating

1. Commit changes, then tag a new version (`git tag v1.0.1 && git push --tags`).
2. `@1` in the embed URL follows the newest `1.x` tag. jsDelivr can cache for up to 12 hours; to update sooner, visit `https://purge.jsdelivr.net/gh/ehballah/oga-pledge-map@1/dist/pledge-map.js`.

The map data can be rebuilt with `data-build/build.sh` (needs `mapshaper` and Python's `shapely`).

## Data sources

- Municipal boundaries: Statistics Canada, 2021 Census boundary files (census subdivisions, cartographic). Contains information licensed under the Open Government Licence – Canada. First Nations reserves and unorganized areas are drawn but not selectable, since they don't hold municipal elections.
- Lakes: Statistics Canada, 2016 Census lakes and rivers (polygons). Contains information licensed under the Open Government Licence – Canada. Every lake of 20 km² or more south of 46°N is shown (Lake Simcoe, Lake Scugog, the Kawarthas, Muskoka and others), plus lakes of 150 km² or more further north.
- Greenbelt outer boundary: Ontario GeoHub. Contains information licensed under the Open Government Licence – Ontario. The line on the map is smoothed for display, so it's approximate at close zoom. A municipality counts as a Greenbelt municipality if at least 1 km² of it is inside the real, unsmoothed boundary (62 municipalities).
- Hamilton Township (Northumberland) is renamed in the data so it doesn't clash with the City of Hamilton.

## Testing locally

```
python3 -m http.server
```

Then open `http://localhost:8000/test/index.html`. It's a saved copy of the live page with the embed added.
