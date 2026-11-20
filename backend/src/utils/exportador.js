/**
 * Exportación de reportes a Excel (.xlsx) y PDF.
 * Ambos reciben el mismo objeto: { titulo, columnas: [{key,label,peso?}], filas: [{...}] }
 */
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const VERDE = '0B6E4F';

function textoCelda(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

async function generarExcel(reporte) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SISVAC';
  wb.created = new Date();
  const hoja = wb.addWorksheet(reporte.titulo.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Reporte');
  const n = reporte.columnas.length;

  hoja.addRow([reporte.titulo]).font = { bold: true, size: 14, color: { argb: 'FF' + VERDE } };
  hoja.addRow([`Generado el ${new Date().toLocaleString('es-GT')} — SISVAC`]).font = { italic: true, color: { argb: 'FF666666' } };
  hoja.addRow([]);

  const filaEnc = hoja.addRow(reporte.columnas.map((c) => c.label));
  filaEnc.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + VERDE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  for (const fila of reporte.filas) {
    hoja.addRow(reporte.columnas.map((c) => (fila[c.key] === undefined ? null : fila[c.key])));
  }

  // ancho de columna según el contenido (entre 10 y 45 caracteres)
  reporte.columnas.forEach((c, i) => {
    const mayor = Math.max(c.label.length, ...reporte.filas.map((f) => textoCelda(f[c.key]).length));
    hoja.getColumn(i + 1).width = Math.min(45, Math.max(10, mayor + 3));
  });

  hoja.views = [{ state: 'frozen', ySplit: 4 }];
  if (n > 0) hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: n } };
  if (reporte.filas.length === 0) hoja.addRow(['Sin registros para los filtros seleccionados']);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function generarPDF(reporte) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER', layout: 'landscape', margin: 36, bufferPages: true,
      info: { Title: reporte.titulo, Author: 'SISVAC' },
    });
    const partes = [];
    doc.on('data', (c) => partes.push(c));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const margen = 36;
    const anchoUtil = doc.page.width - margen * 2;
    const limiteInferior = doc.page.height - 50;
    const pesos = reporte.columnas.map((c) => c.peso || 1);
    const sumaPesos = pesos.reduce((a, b) => a + b, 0);
    const anchos = pesos.map((p) => (anchoUtil * p) / sumaPesos);
    const altoFila = 20;

    doc.fillColor('#' + VERDE).font('Helvetica-Bold').fontSize(16).text(reporte.titulo, margen, margen);
    doc.fillColor('#666666').font('Helvetica').fontSize(9)
      .text(`Generado el ${new Date().toLocaleString('es-GT')}  |  ${reporte.filas.length} registro(s)`, margen, doc.y + 2);
    let y = doc.y + 12;

    const dibujarEncabezado = () => {
      doc.rect(margen, y, anchoUtil, altoFila).fill('#' + VERDE);
      let x = margen;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      reporte.columnas.forEach((c, i) => {
        doc.text(c.label, x + 3, y + 6, { width: anchos[i] - 6, height: 10, ellipsis: true });
        x += anchos[i];
      });
      y += altoFila;
    };

    dibujarEncabezado();
    if (reporte.filas.length === 0) {
      doc.fillColor('#666666').font('Helvetica-Oblique').fontSize(10)
        .text('Sin registros para los filtros seleccionados', margen + 3, y + 10);
    }
    reporte.filas.forEach((fila, idx) => {
      if (y + altoFila > limiteInferior) {
        doc.addPage();
        y = margen;
        dibujarEncabezado();
      }
      if (idx % 2 === 0) doc.rect(margen, y, anchoUtil, altoFila).fill('#F4F6F5');
      let x = margen;
      doc.fillColor('#222222').font('Helvetica').fontSize(8);
      reporte.columnas.forEach((c, i) => {
        doc.text(textoCelda(fila[c.key]), x + 3, y + 6, { width: anchos[i] - 6, height: 10, ellipsis: true });
        x += anchos[i];
      });
      y += altoFila;
    });

    // pie de página con numeración
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // evita que el pie provoque una página nueva
      doc.fillColor('#999999').font('Helvetica').fontSize(8)
        .text(`SISVAC — Página ${i + 1} de ${paginas.count}`, margen, doc.page.height - 30,
          { width: anchoUtil, align: 'center', lineBreak: false });
      doc.page.margins.bottom = margenInferior;
    }
    doc.end();
  });
}

module.exports = { generarExcel, generarPDF };
