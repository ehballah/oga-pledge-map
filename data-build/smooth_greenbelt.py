"""Smooths the Greenbelt outer boundary for display (needs: pip install shapely).
Input/output are GeoJSON in the StatCan Lambert projection (metres)."""
import json, sys
from shapely.geometry import shape, mapping, Polygon, MultiPolygon

src, dst = sys.argv[1], sys.argv[2]
g = json.load(open(src))
geom = shape({'type': 'GeometryCollection', 'geometries': [f['geometry'] for f in g['features']]}).buffer(0)
c = geom.buffer(1500, join_style=1).buffer(-1500, join_style=1)   # close narrow gaps
c = c.buffer(-500, join_style=1).buffer(500, join_style=1)         # drop thin slivers
c = c.simplify(500)

def chaikin(coords, n=2):                                          # round off corners
    pts = list(coords)[:-1]
    for _ in range(n):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out += [(0.75*a[0] + 0.25*b[0], 0.75*a[1] + 0.25*b[1]), (0.25*a[0] + 0.75*b[0], 0.25*a[1] + 0.75*b[1])]
        pts = out
    return pts + [pts[0]]

parts = []
for p in getattr(c, 'geoms', [c]):
    if p.area < 40e6:
        continue
    holes = [chaikin(h.coords) for h in p.interiors if Polygon(h).area >= 80e6]
    parts.append(Polygon(chaikin(p.exterior.coords), holes))
json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {}, 'geometry': mapping(MultiPolygon(parts))}]}, open(dst, 'w'))
