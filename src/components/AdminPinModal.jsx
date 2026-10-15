import React, { useState, useRef, useEffect } from 'react';
import { Lock, X } from 'lucide-react';

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
      setError('Por favor ingresá el PIN.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await onVerifyPin(pin.trim());
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'PIN incorrecto. Intentá nuevamente.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">Acceso Administrador</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Ingresá el PIN de organizador para cargar archivos, configurar campos, personalizar logo o ver métricas avanzadas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              PIN de Seguridad (Por defecto: 1234)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
                {error}
              </p>
            )}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
