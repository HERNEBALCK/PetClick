'use strict';

const BASE_WIDTH = 160;
const BASE_HEIGHT = 169;

function windowBounds(state, displays, primary) {
  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;
  const point = state.position;
  const matching = point && displays.find(({ workArea: a }) =>
    point.x + width > a.x && point.x < a.x + a.width && point.y + height > a.y && point.y < a.y + a.height);
  const area = (matching || primary).workArea;
  return {
    width, height,
    x: point && matching ? Math.min(Math.max(point.x, area.x), area.x + Math.max(0, area.width - width))
      : area.x + Math.max(0, area.width - width - 24),
    y: point && matching ? Math.min(Math.max(point.y, area.y), area.y + Math.max(0, area.height - height))
      : area.y + Math.max(0, area.height - height - 24)
  };
}

module.exports = { windowBounds, BASE_WIDTH, BASE_HEIGHT };
