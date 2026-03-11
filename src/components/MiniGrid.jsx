import { h } from "preact";
import { useState } from "preact/hooks";
import htm from "htm";
const html = htm.bind(h);

const palette = (t) => `hsl(${184 - 162 * t} ${56 + 18 * t}% ${29 + 28 * t}%)`;

/**
 * @typedef {Object} MiniGridProps
 * @property {string[]} [rows]
 * @property {string[]} [cols]
 * @property {number[][]} [values]
 * @property {number | null} [highlightRow]
 * @property {number | null} [highlightCol]
 * @property {number | null} [compareRow]
 * @property {boolean} [showDelta]
 * @property {boolean} [interactive]
 * @property {string | null} [caption]
 */

/**
 * @param {MiniGridProps} props
 */
export default function MiniGrid({
  rows = [],
  cols = [],
  values = [],
  highlightRow = null,
  highlightCol = null,
  compareRow = null,
  showDelta = false,
  interactive = true,
  caption = null,
}) {
  const [hoverCell, setHoverCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  const allVals = values.flat().filter((value) => Number.isFinite(value));
  const min = allVals.length ? Math.min(...allVals) : 0;
  const max = allVals.length ? Math.max(...allVals) : 1;
  const norm = (value) => {
    if (!Number.isFinite(value)) return 0.5;
    return max === min ? 0.5 : (value - min) / (max - min);
  };
  const formatValue = (value) => (Number.isFinite(value) ? value.toFixed(2) : "--");

  const getCellInfo = (ri, ci) => {
    const val = values[ri]?.[ci];
    const rowLabel = rows[ri];
    const colLabel = cols[ci];
    return { val, rowLabel, colLabel };
  };

  const handleClick = (ri, ci) => {
    if (!interactive) return;
    setSelectedCell(selectedCell?.ri === ri && selectedCell?.ci === ci ? null : { ri, ci });
  };

  const handleKeyDown = (event, ri, ci) => {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick(ri, ci);
    }
  };

  return html`
    <div class="mini-grid-wrap">
      <div class="mini-grid" style="display:inline-grid; grid-template-columns: auto repeat(${cols.length}, 1fr);">
        <div class="mini-corner"></div>
        ${cols.map((c, ci) => html`
          <div class="mini-col-label ${highlightCol === ci ? 'active' : ''}">${c}</div>
        `)}
        ${rows.map((r, ri) => html`
          <div class="mini-row-label ${highlightRow === ri || compareRow === ri ? 'active' : ''}">${r}</div>
          ${cols.map((_, ci) => {
            const val = values[ri]?.[ci] ?? 0;
            const t = norm(val);
            const isHighlight = highlightRow === ri;
            const isCompare = compareRow === ri;
            const isSelected = selectedCell?.ri === ri && selectedCell?.ci === ci;

            let displayVal = val;
            if (showDelta && compareRow !== null && ri === highlightRow) {
              const baseVal = values[compareRow]?.[ci] ?? 0;
              displayVal = val - baseVal;
            }
            const displayLabel = formatValue(displayVal);

            return html`
              <div
                class="mini-cell ${isHighlight ? 'ring-highlight' : ''} ${isCompare ? 'ring-compare' : ''} ${isSelected ? 'selected' : ''}"
                style="background: ${palette(t)};"
                role=${interactive ? "button" : undefined}
                tabindex=${interactive ? 0 : undefined}
                aria-label=${`Train ${rows[ri] ?? "?"}, evaluate ${cols[ci] ?? "?"}, score ${displayLabel}`}
                onClick=${() => handleClick(ri, ci)}
                onKeyDown=${(event) => handleKeyDown(event, ri, ci)}
                onMouseEnter=${() => setHoverCell({ ri, ci })}
                onMouseLeave=${() => setHoverCell(null)}
              >
                <span class="mini-val">${displayLabel}</span>
              </div>
            `;
          })}
        `)}
      </div>
      ${caption && html`<div class="mini-caption">${caption}</div>`}
      ${(() => {
        if (!hoverCell) return null;
        const { val, rowLabel, colLabel } = getCellInfo(hoverCell.ri, hoverCell.ci);
        return html`
          <div class="mini-tooltip">
            Train: <strong>${rowLabel ?? "?"}</strong> · Eval: <strong>${colLabel ?? "?"}</strong> · Score: <strong>${formatValue(val)}</strong>
          </div>
        `;
      })()}
    </div>
  `;
}
