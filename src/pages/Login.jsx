import { useState } from 'react';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';

export default function Login({ onLogin }) {
  const { empresa, usuarios } = useConfig();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const user = usuarios.find(
      (u) => u.email === email && u.password === password && u.activo
    );
    if (user) {
      onLogin(user);
    } else {
      setError('Email o contraseña incorrectos, o el usuario está inactivo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 pt-8 pb-6 text-center">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap size={22} className="text-white" />
            </div>
            <h1 className="text-white font-bold text-xl">{empresa.nombre}</h1>
            <p className="text-slate-400 text-sm mt-1">{empresa.slogan}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <p className="text-slate-600 text-sm text-center font-medium">
              Iniciá sesión para continuar
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="correo@ejemplo.com"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              Ingresar
            </button>

          </form>
        </div>

        <p className="text-slate-500 text-xs text-center mt-4">
          v0.1.0 · {empresa.nombre}
        </p>
      </div>
    </div>
  );
}
