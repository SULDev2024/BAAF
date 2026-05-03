/** Render numeric matrix into a container. @param {{ highlight?: [string, string] }} [opts] */
export function renderMatrix(containerSelector, matrix, rowLabels, colLabels, opts = {}) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  el.innerHTML = '';
  const cols = colLabels || rowLabels;
  const hi = opts.highlight;
  const hiI = hi ? rowLabels.indexOf(hi[0]) : -1;
  const hiJ = hi ? cols.indexOf(hi[1]) : -1;

  const table = document.createElement('table');
  table.className = 'algo-matrix';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '13px';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.appendChild(document.createElement('th'));
  cols.forEach((c) => {
    const th = document.createElement('th');
    th.textContent = c;
    th.style.padding = '4px 8px';
    th.style.border = '1px solid #e2e8f0';
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);
  const tb = document.createElement('tbody');
  matrix.forEach((row, i) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = rowLabels[i];
    th.style.padding = '4px 8px';
    th.style.border = '1px solid #e2e8f0';
    tr.appendChild(th);
    row.forEach((cell, j) => {
      const td = document.createElement('td');
      td.textContent = cell == null ? '' : String(cell);
      td.style.padding = '4px 8px';
      td.style.border = '1px solid #e2e8f0';
      td.style.textAlign = 'right';
      if (hi && ((i === hiI && j === hiJ) || (i === hiJ && j === hiI))) {
        td.style.background = '#fef3c7';
        td.style.fontWeight = '600';
      }
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  el.appendChild(table);
}
