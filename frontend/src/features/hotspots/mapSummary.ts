import { formatNumber } from '@/lib/format';

/** One sentence on how many hotspots are plotted and how many could not be. */
export function mapSummary(onMap: number, total: number): string {
  if (total === 0) return 'There are no hotspots yet. Add one under Hotspots.';

  const plotted = `${formatNumber(onMap)} of ${formatNumber(total)} ${
    total === 1 ? 'hotspot is' : 'hotspots are'
  } on the map.`;
  const unplaced = total - onMap;
  if (unplaced <= 0) return plotted;

  return `${plotted} ${formatNumber(unplaced)} ${
    unplaced === 1 ? 'has' : 'have'
  } no usable coordinates; add them under Hotspots.`;
}
