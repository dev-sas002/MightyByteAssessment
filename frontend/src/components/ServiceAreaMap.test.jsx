import { describe, expect, it } from 'vitest';
import { SERVICE_AREA } from '../api/config';
import { projectPoint } from './ServiceAreaMap';

describe('projectPoint', () => {
  it('maps the north-west corner to the origin', () => {
    const point = projectPoint({ lat: SERVICE_AREA.north, lng: SERVICE_AREA.west });
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
  });

  it('maps the east edge to the full width', () => {
    expect(projectPoint({ lat: 40.7, lng: SERVICE_AREA.east }).x).toBeCloseTo(100);
  });

  it('drops a fix outside the service area', () => {
    expect(projectPoint({ lat: 51.5, lng: -0.12 })).toBeNull();
  });
});
