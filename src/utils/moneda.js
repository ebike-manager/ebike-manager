// ── Configuración de monedas soportadas ──────────────────────────────────────
export const MONEDAS = {
  USD: { simbolo: 'US$', nombre: 'Dólar estadounidense (USD)', decimales: 2 },
  UYU: { simbolo: '$U',  nombre: 'Peso uruguayo (UYU)',        decimales: 0 },
};

/**
 * Formatea un número como dinero según la moneda del sistema.
 * @param {number} n - Valor numérico
 * @param {string} moneda - Código de moneda: 'USD' | 'UYU'
 * @returns {string} - Ej: "US$ 1.299,99" o "$U 45.000"
 */
export const formatMoney = (n, moneda = 'USD') => {
  const cfg = MONEDAS[moneda] ?? MONEDAS.USD;
  return (
    cfg.simbolo +
    '\u00A0' +
    (n ?? 0).toLocaleString('es-UY', {
      minimumFractionDigits: cfg.decimales,
      maximumFractionDigits: cfg.decimales,
    })
  );
};
