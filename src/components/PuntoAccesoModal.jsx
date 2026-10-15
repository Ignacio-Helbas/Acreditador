import React, { useState } from 'react';
import { MapPin, Check, X, Shield, Users } from 'lucide-react';

const PUNTOS_PREDEFINIDOS = [
  'Puerta Principal',
  'Puerta 1 (Acceso General)',
  'Puerta 2 (Lateral)',
  'Acceso VIP / Invitados Especiales',
  'Mesa de Prensa',
  'Acceso Estacionamiento',
  'Puesto Móvil',
];

export default function PuntoAccesoModal({ isOpen, onClose, currentPunto, onSavePunto, currentOperator, onSaveOperator }) {
  const [punto, setPunto] = useState(currentPunto || 'Puerta 1');
  const [customPunto, setCustomPunto] = useState('');
  const [operador, setOperador] = useState(currentOperator || 'Operador 1');

  if (!isOpen) return null;

  const handleSelectPredefined = (p) => {
    setPunto(p);
    setCustomPunto('');
  };

  const handleSave = () => {
    const finalPunto = customPunto.trim() || punto;
    onSavePunto(finalPunto);
    if (operador.trim()) {
      onSaveOperator(operador.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">Identificar este Puesto</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Asigna la puerta o punto de acreditación para auditar ingresos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* Nombre del operador personal */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Nombre o Puesto del Operador
            </label>
            <input
              type="text"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Ej: Juan Pérez / Operador A"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Opciones predefinidas de puntos de acceso */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Punto de Acceso / Puerta
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {PUNTOS_PREDEFINIDOS.map((p) => {
                const isSelected = (!customPunto && punto === p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPredefined(p)}
                    className={`p-2 rounded-lg border text-left text-xs font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opción personalizada */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              O escribe un punto de acceso personalizado:
            </label>
            <input
              type="text"
              value={customPunto}
              onChange={(e) => setCustomPunto(e.target.value)}
              placeholder="Ej: Acceso Carpa 3"
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Acciones */}
        <div className="flex space-x-2 pt-5 border-t border-zinc-100 dark:border-zinc-800 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
          >
            Guardar Puesto
          </button>
        </div>

      </div>
    </div>
  );
}
