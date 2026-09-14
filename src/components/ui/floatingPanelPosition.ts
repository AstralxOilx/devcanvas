export type PanelPosition = { x: number; y: number }

export function clampPanelPosition(position: PanelPosition, bounds: { width: number; height: number }, panel: { width: number; height: number }): PanelPosition {
  const gap = 12
  return {
    x: Math.max(gap, Math.min(position.x, bounds.width - panel.width - gap)),
    y: Math.max(gap, Math.min(position.y, bounds.height - panel.height - gap)),
  }
}
