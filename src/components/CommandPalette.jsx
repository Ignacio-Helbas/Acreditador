import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, Clock, X, ArrowRight, ShieldCheck, BarChart3, Users, Settings } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export default function CommandPalette({
  isOpen,
  onClose,
  attendees = [],
  onSelectAttendee,
  onNavigate,
  currentView
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Escuchar tecla escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Autofoco en el input al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrado rápido
  const cleanQ = query.trim().toLowerCase();
  const matchedAttendees = cleanQ.length > 0
    ? attendees.filter((a) => {
        const dni = String(a.dni || '').toLowerCase();
        const nom = String(a.nombre || '').toLowerCase();
        const ape = String(a.apellido || '').toLowerCase();
        return dni.includes(cleanQ) || nom.includes(cleanQ) || ape.includes(cleanQ);
      }).slice(0, 6)
    : [];

  const navigationCommands = [
    { id: 'operator', label: 'Vista de Acreditación (Puerta)', icon: Users, view: 'operator' },
    { id: 'stats', label: 'Métricas en Vivo (Dashboard)', icon: BarChart3, view: 'admin', tab: 'stats' },
    { id: 'audit', label: 'Registro de Auditoría (Access Logs)', icon: ShieldCheck, view: 'admin', tab: 'audit' },
    { id: 'config', label: 'Configuración y Fuentes de Datos', icon: Settings, view: 'admin', tab: 'source' },
  ].filter(cmd => cleanQ === '' || cmd.label.toLowerCase().includes(cleanQ));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Input */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5">
          <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por DNI o Nombre... o escribir un comando"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {/* Asistentes encontrados */}
          {matchedAttendees.length > 0 && (
            <div className="pb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Asistentes ({matchedAttendees.length})
              </div>
              <div className="space-y-1 mt-1">
                {matchedAttendees.map((att) => (
                  <button
                    key={att.dni}
                    onClick={() => {
                      onSelectAttendee(att);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-md text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {att.acreditado ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {att.apellido}, {att.nombre}
                        </span>
                        <span className="ml-2 font-mono text-zinc-500 text-[11px]">
                          DNI {att.dni}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {att.acreditado ? (
                        <Badge variant="success">Acreditado</Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                      <ArrowRight className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navegación rápida */}
          <div className="pt-2">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Navegación del Sistema
            </div>
            <div className="space-y-0.5 mt-1">
              {navigationCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onNavigate(cmd.view, cmd.tab);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left rounded-md text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span>{cmd.label}</span>
                    </div>
                    <kbd className="text-[10px] font-mono text-zinc-400">↵</kbd>
                  </button>
                );
              })}
            </div>
          </div>

          {matchedAttendees.length === 0 && cleanQ.length > 0 && navigationCommands.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Presioná</span>
            <kbd className="rounded border border-zinc-200 dark:border-zinc-700 px-1 py-0.2 bg-white dark:bg-zinc-800 font-mono text-[10px]">↵</kbd>
            <span>para seleccionar</span>
          </div>
          <span>Búsqueda global estilo shadcn-admin</span>
        </div>
      </div>
    </div>
  );
}
