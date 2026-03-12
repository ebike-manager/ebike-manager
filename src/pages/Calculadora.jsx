import { useState, useCallback } from 'react';
import {
  Calculator, RefreshCcw, ArrowLeftRight, TrendingUp,
  Tag, CreditCard, Package, ChevronDown,
} from 'lucide-react';
import { MONEDAS, formatMoney } from '../utils/moneda';

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'basica',      label: 'Básica',       icon: Calculator    },
  { id: 'conversor',   label: 'Conversor',    icon: ArrowLeftRight },
  { id: 'importacion', label: 'Importación',  icon: Package        },
  { id: 'margen',      label: 'Margen',       icon: TrendingUp     },
  { id: 'descuento',   label: 'Descuentos',   icon: Tag            },
  { id: 'cuotas',      label: 'Cuotas',       icon: CreditCard     },
];

// ── Shared input component ────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'number', suffix, prefix, min = '0', step = '0.01', readOnly }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-slate-400 text-sm font-medium pointer-events-none">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          min={min}
          step={step}
          readOnly={readOnly}
          className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-12' : ''} ${readOnly ? 'bg-slate-50 text-slate-600' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-400 text-xs font-medium pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
      <span className={`text-sm ${highlight ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

// ── CALCULADORA BÁSICA ────────────────────────────────────────────────────────
function TabBasica() {
  const [display, setDisplay]   = useState('0');
  const [operator, setOperator] = useState(null);
  const [prev, setPrev]         = useState(null);
  const [reset, setReset]       = useState(false);

  const press = useCallback((val) => {
    if (val === 'AC') {
      setDisplay('0'); setOperator(null); setPrev(null); setReset(false);
    } else if (val === '±') {
      setDisplay((d) => String(-parseFloat(d) || 0));
    } else if (val === '%') {
      setDisplay((d) => String(parseFloat(d) / 100));
    } else if (['+', '-', '×', '÷'].includes(val)) {
      setPrev(parseFloat(display));
      setOperator(val);
      setReset(true);
    } else if (val === '=') {
      if (operator && prev !== null) {
        const cur = parseFloat(display);
        const ops = { '+': prev + cur, '-': prev - cur, '×': prev * cur, '÷': cur !== 0 ? prev / cur : 'Error' };
        const result = ops[operator] ?? cur;
        const str = typeof result === 'number'
          ? (Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(10)).toString())
          : 'Error';
        setDisplay(str);
        setOperator(null);
        setPrev(null);
        setReset(true);
      }
    } else if (val === '.') {
      if (reset) { setDisplay('0.'); setReset(false); return; }
      if (!display.includes('.')) setDisplay((d) => d + '.');
    } else {
      // digit
      if (display === '0' || reset) {
        setDisplay(val);
        setReset(false);
      } else {
        if (display.replace('-', '').replace('.', '').length < 12) {
          setDisplay((d) => d + val);
        }
      }
    }
  }, [display, operator, prev, reset]);

  const BTN_ROWS = [
    ['AC', '±', '%', '÷'],
    ['7',  '8', '9', '×'],
    ['4',  '5', '6', '-'],
    ['1',  '2', '3', '+'],
    ['0',  '',  '.', '='],
  ];

  const btnCls = (v) => {
    if (['÷', '×', '-', '+', '='].includes(v))
      return 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg';
    if (['AC', '±', '%'].includes(v))
      return 'bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium';
    if (v === '0')
      return 'col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-lg font-medium text-left pl-5';
    return 'bg-slate-100 hover:bg-slate-200 text-slate-900 text-lg font-medium';
  };

  return (
    <div className="max-w-xs mx-auto">
      {/* Display */}
      <div className="bg-slate-900 rounded-2xl p-5 mb-4 shadow-inner">
        {operator && prev !== null && (
          <p className="text-slate-500 text-sm text-right mb-1">{prev} {operator}</p>
        )}
        <p className="text-white text-4xl font-light text-right leading-none break-all">
          {display.length > 10 ? parseFloat(display).toExponential(4) : display}
        </p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {BTN_ROWS.flat().map((v, i) => {
          if (v === '') return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => press(v)}
              className={`h-14 rounded-xl transition-all active:scale-95 shadow-sm text-center ${btnCls(v)}`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CONVERSOR ────────────────────────────────────────────────────────────────
function TabConversor() {
  const [tasa, setTasa]   = useState('40');
  const [usd, setUsd]     = useState('');
  const [uyu, setUyu]     = useState('');

  const handleUsd = (v) => {
    setUsd(v);
    const t = parseFloat(tasa) || 40;
    setUyu(v === '' ? '' : String((parseFloat(v) || 0) * t));
  };

  const handleUyu = (v) => {
    setUyu(v);
    const t = parseFloat(tasa) || 40;
    setUsd(v === '' ? '' : String(((parseFloat(v) || 0) / t).toFixed(4)));
  };

  const swap = () => {
    const tmp = usd;
    setUsd(uyu);
    setUyu(tmp);
  };

  const t = parseFloat(tasa) || 40;

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Exchange rate */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Tipo de cambio</p>
        <div className="flex items-center gap-3">
          <span className="text-emerald-700 font-bold">1 USD =</span>
          <div className="relative flex-1">
            <input
              type="number"
              value={tasa}
              onChange={(e) => {
                setTasa(e.target.value);
                if (usd) handleUsd(usd);
              }}
              className="w-full border border-emerald-300 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-emerald-700 font-bold">UYU</span>
        </div>
      </div>

      {/* Currency inputs */}
      <div className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dólares</span>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">USD</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-light text-slate-400">US$</span>
            <input
              type="number"
              value={usd}
              onChange={(e) => handleUsd(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-3xl font-light text-slate-900 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={swap}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-2 shadow-md transition-all active:scale-95"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pesos uruguayos</span>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">UYU</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-light text-slate-400">$U</span>
            <input
              type="number"
              value={uyu}
              onChange={(e) => handleUyu(e.target.value)}
              placeholder="0"
              className="flex-1 text-3xl font-light text-slate-900 outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reference rates */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500">US$ 100 →</p>
          <p className="text-sm font-bold text-slate-900">$U {(100 * t).toLocaleString('es-UY')}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500">$U 1000 →</p>
          <p className="text-sm font-bold text-slate-900">US$ {(1000 / t).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// ── IMPORTACIÓN ───────────────────────────────────────────────────────────────
function TabImportacion() {
  const [vals, setVals] = useState({
    precio: '', flete: '8', seguro: '2', arancel: '20', iva: '22', margen: '30',
  });
  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }));

  const precio   = parseFloat(vals.precio)   || 0;
  const flete    = (parseFloat(vals.flete)   || 0) / 100;
  const seguro   = (parseFloat(vals.seguro)  || 0) / 100;
  const arancel  = (parseFloat(vals.arancel) || 0) / 100;
  const iva      = (parseFloat(vals.iva)     || 0) / 100;
  const margen   = (parseFloat(vals.margen)  || 0) / 100;

  const costoFlete   = precio * flete;
  const costoSeguro  = precio * seguro;
  const subtotal1    = precio + costoFlete + costoSeguro;
  const costoArancel = subtotal1 * arancel;
  const subtotal2    = subtotal1 + costoArancel;
  const costoIva     = subtotal2 * iva;
  const landedCost   = subtotal2 + costoIva;
  const precioVenta  = landedCost / (1 - margen);

  const fmt = (n) => `US$ ${n.toFixed(2)}`;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio del producto" value={vals.precio} onChange={set('precio')} prefix="US$" />
        <Field label="Margen deseado"       value={vals.margen}  onChange={set('margen')}  suffix="%" min="0" max="99" />
        <Field label="Flete"                value={vals.flete}   onChange={set('flete')}   suffix="%" />
        <Field label="Seguro"               value={vals.seguro}  onChange={set('seguro')}  suffix="%" />
        <Field label="Arancel aduanero"     value={vals.arancel} onChange={set('arancel')} suffix="%" />
        <Field label="IVA"                  value={vals.iva}     onChange={set('iva')}     suffix="%" />
      </div>

      {precio > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Desglose de costos</p>
          <ResultRow label="Precio original"       value={fmt(precio)} />
          <ResultRow label={`+ Flete (${vals.flete}%)`}      value={fmt(costoFlete)} />
          <ResultRow label={`+ Seguro (${vals.seguro}%)`}    value={fmt(costoSeguro)} />
          <ResultRow label={`+ Arancel (${vals.arancel}%)`}  value={fmt(costoArancel)} />
          <ResultRow label={`+ IVA (${vals.iva}%)`}          value={fmt(costoIva)} />
          <div className="border-t border-slate-200 my-1 pt-1" />
          <ResultRow label="Costo de importación total" value={fmt(landedCost)} />
          <ResultRow label={`Precio de venta (+${vals.margen}% margen)`} value={fmt(precioVenta)} highlight />
        </div>
      )}
    </div>
  );
}

// ── MARGEN ────────────────────────────────────────────────────────────────────
function TabMargen() {
  const [costo,  setCosto]  = useState('');
  const [margen, setMargen] = useState('30');
  const [monedaSel, setMonedaSel] = useState('USD');

  const c = parseFloat(costo)  || 0;
  const m = parseFloat(margen) / 100 || 0;

  const precioVenta   = m < 1 ? c / (1 - m) : 0;
  const ganancia      = precioVenta - c;
  const margenReal    = c > 0 ? ((precioVenta - c) / precioVenta) * 100 : 0;
  const markupPct     = c > 0 ? ((precioVenta - c) / c) * 100 : 0;

  const fmt = (n) => formatMoney(n, monedaSel);
  const pct = Math.min(Math.max(margenReal, 0), 100);

  const colorBar = pct < 20 ? 'bg-red-500' : pct < 35 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Moneda</label>
          <div className="flex gap-2">
            {Object.keys(MONEDAS).map((m) => (
              <button
                key={m}
                onClick={() => setMonedaSel(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  monedaSel === m
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m} — {MONEDAS[m].simbolo}
              </button>
            ))}
          </div>
        </div>
        <Field label="Costo del producto"   value={costo}  onChange={setCosto}  prefix={MONEDAS[monedaSel].simbolo} />
        <Field label="Margen deseado"        value={margen} onChange={setMargen} suffix="%" />
      </div>

      {c > 0 && (
        <div className="space-y-4">
          {/* Visual progress bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Margen sobre ventas</span>
              <span className={`text-sm font-bold ${pct < 20 ? 'text-red-600' : pct < 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {margenReal.toFixed(1)}%
              </span>
            </div>
            <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${colorBar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-slate-400">
              <span>0%</span>
              <span className="text-amber-500">35% recomendado</span>
              <span>100%</span>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            <ResultRow label="Costo del producto"  value={fmt(c)} />
            <ResultRow label="Ganancia bruta"       value={fmt(ganancia)} />
            <ResultRow label="Markup sobre costo"   value={`${markupPct.toFixed(1)}%`} />
            <ResultRow label="Precio de venta"      value={fmt(precioVenta)} highlight />
          </div>
        </div>
      )}
    </div>
  );
}

// ── DESCUENTOS ────────────────────────────────────────────────────────────────
function TabDescuento() {
  const [precio,    setPrecio]    = useState('');
  const [descuento, setDescuento] = useState('');
  const [monedaSel, setMonedaSel] = useState('USD');

  const p = parseFloat(precio)    || 0;
  const d = parseFloat(descuento) || 0;

  const ahorro       = p * (d / 100);
  const precioFinal  = p - ahorro;

  const fmt = (n) => formatMoney(n, monedaSel);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Moneda</label>
        <div className="flex gap-2 mb-3">
          {Object.keys(MONEDAS).map((m) => (
            <button
              key={m}
              onClick={() => setMonedaSel(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                monedaSel === m ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m} — {MONEDAS[m].simbolo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio original" value={precio}    onChange={setPrecio}    prefix={MONEDAS[monedaSel].simbolo} />
        <Field label="Descuento"       value={descuento} onChange={setDescuento} suffix="%" />
      </div>

      {/* Preset discount buttons */}
      <div className="flex gap-2">
        {[5, 10, 15, 20, 30, 50].map((pct) => (
          <button
            key={pct}
            onClick={() => setDescuento(String(pct))}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              descuento === String(pct)
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>

      {p > 0 && d > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Ahorrás</p>
          <p className="text-4xl font-bold text-emerald-700 mb-1">{fmt(ahorro)}</p>
          <p className="text-slate-500 text-sm">
            <span className="line-through text-slate-400 mr-2">{fmt(p)}</span>
            <span className="font-bold text-slate-900">{fmt(precioFinal)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── CUOTAS ────────────────────────────────────────────────────────────────────
function TabCuotas() {
  const [monto,  setMonto]  = useState('');
  const [tasa,   setTasa]   = useState('3');
  const [cuotas, setCuotas] = useState('12');
  const [monedaSel, setMonedaSel] = useState('USD');
  const [showTable, setShowTable] = useState(false);

  const P  = parseFloat(monto)  || 0;
  const r  = (parseFloat(tasa)  || 0) / 100;
  const n  = parseInt(cuotas, 10) || 1;

  // French amortization formula
  const cuotaMensual = r === 0
    ? P / n
    : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const totalAPagar  = cuotaMensual * n;
  const totalInteres = totalAPagar - P;

  const fmt = (v) => formatMoney(v, monedaSel);

  // Build amortization table
  const tabla = [];
  let saldo = P;
  for (let i = 1; i <= n && i <= 60; i++) {
    const interes  = saldo * r;
    const capital  = cuotaMensual - interes;
    saldo         -= capital;
    tabla.push({ cuota: i, capital, interes, cuotaMensual, saldo: Math.max(saldo, 0) });
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Moneda</label>
        <div className="flex gap-2 mb-3">
          {Object.keys(MONEDAS).map((m) => (
            <button
              key={m}
              onClick={() => setMonedaSel(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                monedaSel === m ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m} — {MONEDAS[m].simbolo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Monto total"      value={monto}  onChange={setMonto}  prefix={MONEDAS[monedaSel].simbolo} />
        <Field label="Tasa mensual"     value={tasa}   onChange={setTasa}   suffix="%" />
        <Field label="Cant. de cuotas" value={cuotas} onChange={setCuotas} min="1" max="120" step="1" />
      </div>

      {/* Preset cuotas */}
      <div className="flex gap-2">
        {[3, 6, 12, 18, 24, 36].map((n) => (
          <button
            key={n}
            onClick={() => setCuotas(String(n))}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              cuotas === String(n) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {P > 0 && (
        <div className="space-y-2">
          <ResultRow label={`Cuota mensual × ${n}`} value={fmt(cuotaMensual)} highlight />
          <ResultRow label="Total a pagar"           value={fmt(totalAPagar)} />
          <ResultRow label="Total intereses"         value={fmt(totalInteres)} />

          <button
            onClick={() => setShowTable((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ChevronDown size={14} className={`transition-transform ${showTable ? 'rotate-180' : ''}`} />
            {showTable ? 'Ocultar tabla' : 'Ver tabla de amortización'}
          </button>

          {showTable && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['#', 'Cuota', 'Capital', 'Interés', 'Saldo'].map((h) => (
                        <th key={h} className="px-3 py-2 text-slate-500 font-semibold text-right first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tabla.map((row) => (
                      <tr key={row.cuota} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-500">{row.cuota}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-800">{fmt(row.cuotaMensual)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{fmt(row.capital)}</td>
                        <td className="px-3 py-1.5 text-right text-red-600">{fmt(row.interes)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-700 font-medium">{fmt(row.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Calculadora Page ─────────────────────────────────────────────────────
export default function Calculadora() {
  const [activeTab, setActiveTab] = useState('basica');

  const TabContent = {
    basica:      TabBasica,
    conversor:   TabConversor,
    importacion: TabImportacion,
    margen:      TabMargen,
    descuento:   TabDescuento,
    cuotas:      TabCuotas,
  }[activeTab];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
          <Calculator size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calculadora Financiera</h1>
          <p className="text-slate-500 text-sm">Herramientas para decisiones inteligentes de precio y financiamiento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                activeTab === id
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          <TabContent />
        </div>
      </div>
    </div>
  );
}
