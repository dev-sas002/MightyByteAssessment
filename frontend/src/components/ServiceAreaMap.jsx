import React from 'react';
import PropTypes from 'prop-types';
import { SERVICE_AREA } from '../api/config';

const MID_LAT_RADIANS = (((SERVICE_AREA.north + SERVICE_AREA.south) / 2) * Math.PI) / 180;
// Scale longitude by cos(latitude) so the box keeps its real-world proportions.
const WIDTH = (SERVICE_AREA.east - SERVICE_AREA.west) * Math.cos(MID_LAT_RADIANS);
const HEIGHT = SERVICE_AREA.north - SERVICE_AREA.south;
const VIEW_W = 100;
const VIEW_H = (VIEW_W * HEIGHT) / WIDTH;

/** Projects a fix into the SVG box, or null when it falls outside the service area. */
export function projectPoint({ lat, lng }) {
  if (lat < SERVICE_AREA.south || lat > SERVICE_AREA.north) return null;
  if (lng < SERVICE_AREA.west || lng > SERVICE_AREA.east) return null;
  return {
    x: ((lng - SERVICE_AREA.west) / (SERVICE_AREA.east - SERVICE_AREA.west)) * VIEW_W,
    y: ((SERVICE_AREA.north - lat) / HEIGHT) * VIEW_H,
  };
}

/**
 * Schematic of the service area with the watched driver's recent fixes.
 * It is a bounding box, not a street map: enough to see movement and spread
 * without pulling in a tile provider.
 */
function ServiceAreaMap({ trail }) {
  const points = trail.map(projectPoint).filter(Boolean);
  const latest = points[points.length - 1];
  const outside = trail.length - points.length;

  return (
    <figure className="area-map">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H.toFixed(2)}`}
        role="img"
        aria-label={`Service area with ${points.length} recent position${points.length === 1 ? '' : 's'}`}
      >
        <rect className="area-bounds" x="0" y="0" width={VIEW_W} height={VIEW_H} />
        {[25, 50, 75].map((x) => (
          <line key={`v${x}`} className="area-grid" x1={x} x2={x} y1="0" y2={VIEW_H} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={`h${f}`}
            className="area-grid"
            x1="0"
            x2={VIEW_W}
            y1={VIEW_H * f}
            y2={VIEW_H * f}
          />
        ))}
        {points.length > 1 && (
          <polyline
            className="area-trail"
            points={points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
          />
        )}
        {points.slice(0, -1).map((p, index) => (
          <circle key={index} className="area-past" cx={p.x} cy={p.y} r="1.2" />
        ))}
        {latest && <circle className="area-latest" cx={latest.x} cy={latest.y} r="2.4" />}
      </svg>
      <figcaption>
        Service area, last {trail.length} fix{trail.length === 1 ? '' : 'es'}
        {outside > 0 && ` (${outside} outside the area, not drawn)`}
      </figcaption>
    </figure>
  );
}

ServiceAreaMap.propTypes = {
  trail: PropTypes.arrayOf(PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }))
    .isRequired,
};

export default ServiceAreaMap;
