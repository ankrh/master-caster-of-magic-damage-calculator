// Reference copy of the matrix worker handler. The live version runs from a
// Blob URL assembled in ui.js (MATRIX_WORKER_HANDLER) to avoid importScripts
// path issues. Keep this in sync with that constant.
importScripts('engine.js', 'combat.js');

function distExpectedValue(dist) {
  if (!dist) return 0;
  let ev = 0;
  for (let d = 0; d < dist.length; d++) ev += d * dist[d];
  return ev;
}

self.onmessage = function(e) {
  const { attackerStats, allDefenderStats, opts, rowIndex } = e.data;
  const isRanged = opts.isRanged;
  const ratios = allDefenderStats.map(defenderStats => {
    const result = resolveCombat(attackerStats, defenderStats, opts);
    if (isRanged) {
      return result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
    }
    const pctToDefender = result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
    const pctToAttacker = result.aRemHP > 0 ? distExpectedValue(result.totalDmgToA) / result.aRemHP : 0;
    if (pctToAttacker === 0) return pctToDefender > 0 ? Infinity : 1;
    return pctToDefender / pctToAttacker;
  });
  self.postMessage({ rowIndex, ratios });
};
