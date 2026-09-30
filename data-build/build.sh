#!/usr/bin/env bash
# Rebuilds dist/ontario.json from the official sources. Needs: curl, unzip, node, mapshaper (npm i -g mapshaper).
set -euo pipefail
cd "$(dirname "$0")"
curl -sSL -o csd.zip https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000b21a_e.zip
unzip -oq csd.zip
curl -sSL -o gb.geojson "https://geohub.lio.gov.on.ca/api/download/v1/items/2677fbd096e04e33bf75cf4d7e6ba976/geojson?layers=0"
LCC='+proj=lcc +lat_1=49 +lat_2=77 +lat_0=63.390675 +lon_0=-91.86666666666666 +x_0=6200000 +y_0=3000000 +datum=NAD83'
mapshaper gb.geojson -dissolve -proj "$LCC" -o gb_lcc.shp
# Municipalities with >= 1 km2 inside the Greenbelt
mapshaper lcsd000b21a_e.shp -filter 'PRUID=="35" && ["IRI","NO","S-É"].indexOf(CSDTYPE)<0' -clip gb_lcc.shp \
  -each 'gbkm=this.area/1e6' -filter-fields CSDUID,gbkm -o format=csv gb_overlap.csv
IDS=$(node -e 'const r=require("fs").readFileSync("gb_overlap.csv","utf8").trim().split("\n").slice(1);const a={};r.forEach(l=>{const[id,k]=l.split(",");a[id]=(a[id]||0)+ +k});console.log(Object.keys(a).filter(k=>a[k]>=1).map(k=>JSON.stringify(k)).join(","))')
mapshaper -i lcsd000b21a_e.shp gb_lcc.shp combine-files \
  -filter target=lcsd000b21a_e 'PRUID=="35"' \
  -each target=lcsd000b21a_e "cd=CSDUID.slice(0,4); m=['IRI','NO','S-É'].indexOf(CSDTYPE)<0?1:0; gb=[$IDS].indexOf(CSDUID)>=0?1:0" \
  -rename-layers munis,greenbelt target=* \
  -simplify interval=250 keep-shapes target=* \
  -filter-slivers min-area=0.5km2 target=* \
  -proj wgs84 target=* \
  -each target=munis 'id=CSDUID; name=CSDNAME' \
  -filter-fields target=munis id,name,cd,m,gb \
  -o format=topojson quantization=1e5 target=* ontario.topojson
node -e '
const fs=require("fs");const t=JSON.parse(fs.readFileSync("ontario.topojson","utf8"));
t.objects.munis.geometries.forEach(g=>{if(g.properties.id==="3514019")g.properties.name="Hamilton Township";});
t.objects.greenbelt.geometries.forEach(g=>g.properties={});
fs.writeFileSync("../dist/ontario.json",JSON.stringify(t));
const gb=t.objects.munis.geometries.filter(g=>g.properties.gb&&g.properties.m).map(g=>g.properties.name).sort();
console.log("Wrote dist/ontario.json. Greenbelt municipalities ("+gb.length+") — paste into GREENBELT in pledge-map.js if changed:");
console.log(JSON.stringify(gb));'
rm -f csd.zip lcsd000b21a_e.* gb.geojson gb_lcc.* gb_overlap.csv ontario.topojson
