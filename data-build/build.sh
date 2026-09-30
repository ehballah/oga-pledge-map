#!/usr/bin/env bash
# Rebuilds dist/ontario.json from the official sources.
# Needs: curl, unzip, node, python3 with shapely (pip install shapely), mapshaper (npm i -g mapshaper).
set -euo pipefail
cd "$(dirname "$0")"
STATCAN=https://www12.statcan.gc.ca/census-recensement
curl -sSL -o csd.zip $STATCAN/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000b21a_e.zip && unzip -oq csd.zip
curl -sSL -o lhy.zip $STATCAN/2011/geo/bound-limit/files-fichiers/2016/lhy_000c16a_e.zip && unzip -oq lhy.zip
curl -sSL -o gb.geojson "https://geohub.lio.gov.on.ca/api/download/v1/items/2677fbd096e04e33bf75cf4d7e6ba976/geojson?layers=0"
LCC='+proj=lcc +lat_1=49 +lat_2=77 +lat_0=63.390675 +lon_0=-91.86666666666666 +x_0=6200000 +y_0=3000000 +datum=NAD83'

# Lakes: all Ontario lakes >= 20 km2 south of 46°N, >= 150 km2 further north
mapshaper lhy_000c16a_e.shp -filter '/(^|,)35(,|$)/.test(PRUID)' -each 'km=this.area/1e6' -filter 'km>=20' \
  -proj wgs84 -each 'lat=this.centroidY' -filter 'lat<46 || km>=150' -proj "$LCC" -dissolve -o lakes.shp

# Greenbelt: dissolve, remove lakes, smooth for display
mapshaper gb.geojson -dissolve -proj "$LCC" -o gb_lcc.shp
mapshaper gb_lcc.shp -erase lakes.shp -o format=geojson gb_nolake.json
python3 smooth_greenbelt.py gb_nolake.json gb_smooth.json
mapshaper -i gb_smooth.json -proj init="$LCC" wgs84 -o gb_smooth_wgs.json

# Greenbelt municipalities: >= 1 km2 inside the real (unsmoothed) boundary
mapshaper lcsd000b21a_e.shp -filter 'PRUID=="35" && ["IRI","NO","S-É"].indexOf(CSDTYPE)<0' -clip gb_lcc.shp \
  -each 'gbkm=this.area/1e6' -filter-fields CSDUID,gbkm -o format=csv gb_overlap.csv
IDS=$(node -e 'const r=require("fs").readFileSync("gb_overlap.csv","utf8").trim().split("\n").slice(1);const a={};r.forEach(l=>{const[id,k]=l.split(",");a[id]=(a[id]||0)+ +k});console.log(Object.keys(a).filter(k=>a[k]>=1).map(k=>JSON.stringify(k)).join(","))')

mapshaper -i lcsd000b21a_e.shp -filter 'PRUID=="35"' -erase lakes.shp \
  -each "cd=CSDUID.slice(0,4); m=['IRI','NO','S-É'].indexOf(CSDTYPE)<0?1:0; gb=[$IDS].indexOf(CSDUID)>=0?1:0" \
  -simplify interval=250 keep-shapes -filter-slivers min-area=0.5km2 -proj wgs84 \
  -each 'id=CSDUID; name=CSDNAME' -filter-fields id,name,cd,m,gb -rename-layers munis \
  -i gb_smooth_wgs.json -rename-layers greenbelt \
  -o format=topojson quantization=1e5 target=munis,greenbelt ontario.topojson
node -e '
const fs=require("fs");const t=JSON.parse(fs.readFileSync("ontario.topojson","utf8"));
t.objects.munis.geometries.forEach(g=>{if(g.properties.id==="3514019")g.properties.name="Hamilton Township";});
t.objects.greenbelt.geometries.forEach(g=>g.properties={});
fs.writeFileSync("../dist/ontario.json",JSON.stringify(t));
const gb=t.objects.munis.geometries.filter(g=>g.properties.gb&&g.properties.m).map(g=>g.properties.name).sort();
console.log("Wrote dist/ontario.json. Greenbelt municipalities ("+gb.length+") — paste into GREENBELT in pledge-map.js if changed:");
console.log(JSON.stringify(gb));'
rm -f csd.zip lhy.zip lcsd000b21a_e.* lhy_000c16a_e.* lakes.* gb.geojson gb_lcc.* gb_nolake.json gb_smooth*.json gb_overlap.csv ontario.topojson
