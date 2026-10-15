import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, KeyRound, X, Check, Lock } from 'lucide-react';

export default function AdminPinModal({ isOpen, onClose, onVerifyPin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Por favor ingresa el PIN.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await onVerifyPin(pin.trim());
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'PIN incorrecto. Intenta nuevamente.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Acceso Administrador</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Ingresa el PIN de organizador para modificar la base de datos, configurar campos o ver métricas avanzadas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              PIN de Seguridad (Por defecto: 1234)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Ingresa el PIN"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
