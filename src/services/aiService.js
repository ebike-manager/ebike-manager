// AI Service — calls the Vite proxy at /api/ai which forwards to Anthropic.
// When ANTHROPIC_API_KEY is not configured, functions return null and callers
// should display MOCK_RESPONSES for a working demo experience.

const MODEL = 'claude-sonnet-4-6';

// ── Mock responses for demo mode (no API key) ────────────────────────────────
export const MOCK_RESPONSES = {
  producto:
    '{"categoria":"Bicicletas","descripcion":"Bicicleta eléctrica de alto rendimiento con motor de 500W, batería de litio 48V y alcance de hasta 80 km. Ideal para uso urbano y rutas de montaña.","precioSugerido":1250,"sku":"EBIKE-001"}',

  inventario: `## 📊 Análisis de Inventario — Modo Demo

**⚠️ Stock crítico (acción urgente):**
- **Batería Litio 48V 15Ah** — 2 unidades (umbral mínimo: 3). Reabastecer esta semana.
- **Controlador Sinusoidal 48V 25A** — 1 unidad (umbral: 2). Pedido urgente.

**📦 Sin movimiento reciente:**
- Kit Luces LED Recargables — 20 unidades sin ventas en 30 días. Considerar descuento.
- Casco Urbano Talla M Negro — 15 unidades. Evaluar bundle con bicicletas.

**💡 Recomendaciones:**
1. Reabastecer baterías y controladores antes de fin de semana (alta demanda).
2. Crear combo "E-Bike + Casco + Luces" con 10% descuento para mover accesorios.
3. Motor Bafang BBS02 tiene alta rotación — mantener stock mínimo de 5 unidades.
4. Revisar precio del Controlador Sinusoidal: puede estar por debajo del mercado.

> **Nota:** Activá tu API key en .env para análisis en tiempo real con datos reales.`,

  ventas: `## 📈 Predicción de Ventas — Próxima Semana (Demo)

**Estimación basada en historial:**
| Producto | Unidades | Ingresos est. |
|----------|----------|---------------|
| E-Bike Mountain Pro 29" | 1–2 | US$ 2,600 |
| Motor Bafang BBS02 750W | 1 | US$ 490 |
| Accesorios varios | 3–5 | US$ 280 |

**Total estimado semana:** US$ 3,200 – US$ 3,800

**⚠️ Productos por agotarse:**
- Batería Litio 48V 15Ah — stock para ~2 ventas más
- Controlador Sinusoidal — stock para 1 venta más

**📊 Tendencia:** Crecimiento del 12% respecto a la semana anterior. El fin de semana concentra el 60% de las ventas.

> Activá tu API key en .env para predicciones reales basadas en tus datos.`,

  reporte: `## 📊 Reporte Ejecutivo del Mes — Demo

**Período:** Marzo 2026

---

### Resumen de Ventas
- **Total transacciones:** 7 ventas
- **Ingresos totales:** US$ 4,813.88
- **Ticket promedio:** US$ 687.70
- **Mejor cliente:** Carlos Méndez (3 compras · US$ 1,109.93)

### Estado del Inventario
- **SKUs activos:** 6 productos
- **Valor del inventario:** US$ 12,799 aprox.
- **Alertas críticas:** 2 productos bajo umbral mínimo

### Análisis
✅ Las e-bikes completas generan el **70% del ingreso** total — priorizar su stock.
⚠️ Accesorios (cascos, luces) tienen **baja rotación** — revisar estrategia de precios.
📈 Tendencia mensual **positiva +12%** — recomendamos incrementar pedidos en baterías.

### Plan de Acción
1. 🔴 **Urgente:** Reabastecer baterías y controladores esta semana.
2. 🟡 **Esta semana:** Crear promoción de accesorios (bundle o descuento del 15%).
3. 🟢 **Este mes:** Contactar a Carlos Méndez para renovación/upgrade de su e-bike.

> Activá tu API key en .env para reportes generados con tus datos reales.`,

  chat: `Hola! Soy tu asistente de E-Bike Manager. Estoy en **modo demo** porque no detecté una API key de Anthropic.

Para activar la IA real, creá un archivo \`.env\` en la carpeta raíz del proyecto:

\`\`\`
ANTHROPIC_API_KEY=sk-ant-...
\`\`\`

Luego reiniciá el servidor con \`npm run dev\`. Una vez configurado, podré:
- Responder preguntas sobre tus ventas e inventario en tiempo real
- Analizar tendencias y hacer predicciones
- Generar reportes ejecutivos personalizados

¿Necesitás ayuda para obtener tu API key? La conseguís en console.anthropic.com`,

  comando: '⚠️ **Modo demo** — Configurá `ANTHROPIC_API_KEY` en `.env` para consultas reales con IA.',
};

// ── Internals ─────────────────────────────────────────────────────────────────
async function _post(payload) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, ...payload }),
  });

  if (res.status === 503) return null; // No API key — caller uses mock

  if (!res.ok) {
    let msg = `Error HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || j.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res;
}

// Simulate streaming effect for mock text (types character by character)
async function _streamMock(text, onChunk) {
  let buf = '';
  const step = 4;
  for (let i = 0; i < text.length; i += step) {
    buf += text.slice(i, i + step);
    onChunk?.(buf, text.slice(i, i + step));
    await new Promise((r) => setTimeout(r, 8));
  }
  return text;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * One-shot text completion. Returns the response string, or null if no API key.
 * Callers should display MOCK_RESPONSES[key] when null is returned.
 */
export async function llamarClaude({ system, messages, maxTokens = 2048 }) {
  const res = await _post({ max_tokens: maxTokens, system, messages });
  if (!res) return null;
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

/**
 * Streaming completion. Calls onChunk(fullText, delta) as tokens arrive.
 * Returns the full text when done, or null if no API key.
 * When null, callers can use _streamMock via MOCK_RESPONSES or stream manually.
 */
export async function llamarClaudeStream({ system, messages, maxTokens = 2048, onChunk }) {
  const res = await _post({ max_tokens: maxTokens, system, messages, stream: true });
  if (!res) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          fullText += parsed.delta.text;
          onChunk?.(fullText, parsed.delta.text);
        }
      } catch { /* ignore malformed SSE lines */ }
    }
  }

  return fullText;
}

/**
 * Helper: call streaming and fall back to simulated mock streaming.
 * mockText = MOCK_RESPONSES[key] to use when API key is absent.
 */
export async function streamOrMock({ system, messages, maxTokens = 2048, mockText, onChunk }) {
  const result = await llamarClaudeStream({ system, messages, maxTokens, onChunk });
  if (result === null) {
    return await _streamMock(mockText, onChunk);
  }
  return result;
}
