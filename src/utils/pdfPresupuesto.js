import { jsPDF } from 'jspdf';
import { formatMoney } from './moneda';

/**
 * Genera y descarga un presupuesto en PDF.
 * @param {object} params
 * @param {object} params.empresa  - { nombre, slogan, moneda }
 * @param {object} params.venta    - { clienteNombre, fecha, items[], total, notas }
 * @param {string} params.numero   - Número de presupuesto (ej: "2026-0042")
 */
export function generarPresupuestoPDF({ empresa, venta, numero }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margenL = 20;
  const margenR = 190;
  const ancho = margenR - margenL;
  let y = 20;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const lineH = (h = 6) => { y += h; };
  const drawLine = (x1 = margenL, x2 = margenR, color = [226, 232, 240]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(x1, y, x2, y);
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  // Empresa nombre (grande, color primario)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(empresa.nombre || 'E-Bike Manager', margenL, y);

  // Slogan
  if (empresa.slogan) {
    lineH(7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(empresa.slogan, margenL, y);
  }

  // Documento type + número (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PRESUPUESTO', margenR, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nº ${numero}`, margenR, 30, { align: 'right' });

  // Fecha
  const fechaDisplay = new Date(venta.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.text(`Fecha: ${fechaDisplay}`, margenR, 37, { align: 'right' });

  // Validez
  const fechaValidez = new Date();
  fechaValidez.setDate(fechaValidez.getDate() + 30);
  const validezDisplay = fechaValidez.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Válido hasta: ${validezDisplay}`, margenR, 43, { align: 'right' });

  y = 52;
  drawLine();
  lineH(6);

  // ── CLIENTE ────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margenL, y - 2, ancho, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DESTINATARIO', margenL + 4, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(venta.clienteNombre || 'Cliente', margenL + 4, y + 11);

  y += 28;

  // ── TABLA DE ITEMS ────────────────────────────────────────────────────────
  // Header de tabla
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margenL, y, ancho, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PRODUCTO / DESCRIPCIÓN', margenL + 3, y + 5.5);
  doc.text('CANT.', 120, y + 5.5, { align: 'center' });
  doc.text('PRECIO UNIT.', 152, y + 5.5, { align: 'center' });
  doc.text('SUBTOTAL', margenR - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Items
  const items = venta.items ?? [];
  let altRow = false;
  let subtotalGlobal = 0;
  const subtotalesPorMoneda = {};

  items.forEach((item) => {
    const rowH = 9;
    if (altRow) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margenL, y, ancho, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    // Product name (truncate if long)
    const nombre = item.productoNombre.length > 40 ? item.productoNombre.slice(0, 37) + '...' : item.productoNombre;
    doc.text(nombre, margenL + 3, y + 6);
    doc.text(String(item.cantidad), 120, y + 6, { align: 'center' });
    doc.text(formatMoney(item.precioUnitario, item.moneda ?? 'USD'), 152, y + 6, { align: 'center' });
    doc.text(formatMoney(item.subtotal, item.moneda ?? 'USD'), margenR - 3, y + 6, { align: 'right' });

    const m = item.moneda ?? 'USD';
    subtotalesPorMoneda[m] = (subtotalesPorMoneda[m] ?? 0) + item.subtotal;
    subtotalGlobal += item.subtotal;

    y += rowH;
    altRow = !altRow;

    // Page break if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  y += 3;
  drawLine();
  y += 5;

  // ── TOTALES ────────────────────────────────────────────────────────────────
  const totalesX = 130;

  // Per-currency subtotals
  Object.entries(subtotalesPorMoneda).forEach(([m, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Subtotal ${m}:`, totalesX, y);
    doc.text(formatMoney(v, m), margenR - 3, y, { align: 'right' });
    y += 6;
  });

  y += 2;
  drawLine(totalesX, margenR, [16, 185, 129]);
  y += 6;

  // TOTAL box
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(totalesX - 2, y - 5, margenR - totalesX + 5, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalesX + 2, y + 3);

  const totalDisplay = Object.entries(subtotalesPorMoneda)
    .map(([m, v]) => formatMoney(v, m))
    .join(' + ');
  doc.text(totalDisplay || formatMoney(venta.total, empresa.moneda ?? 'USD'), margenR - 3, y + 3, { align: 'right' });

  y += 18;

  // ── NOTAS ────────────────────────────────────────────────────────────────
  if (venta.notas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('NOTAS:', margenL, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const notasLines = doc.splitTextToSize(venta.notas, ancho);
    doc.text(notasLines, margenL, y);
    y += notasLines.length * 5 + 5;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  y = 275;
  drawLine();
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Este presupuesto tiene validez de 30 días. Los precios pueden estar sujetos a variaciones.`,
    105, y, { align: 'center' }
  );
  y += 5;
  doc.text(
    `${empresa.nombre || 'E-Bike Manager'} — Movilidad eléctrica`,
    105, y, { align: 'center' }
  );

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const clienteSlug = (venta.clienteNombre ?? 'cliente').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const fecha = venta.fecha ?? new Date().toISOString().split('T')[0];
  doc.save(`presupuesto-${clienteSlug}-${fecha}.pdf`);
}
