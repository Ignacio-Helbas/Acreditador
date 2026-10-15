import React from 'react';

export default function LoadingScreen({ eventName, eventLogo }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="w-full max-w-sm text-center space-y-5">
        
        {/* Logo o Monograma */}
        <div className="mx-auto flex items-center justify-center">
          {eventLogo ? (
            <img 
              src={eventLogo} 
              alt={eventName} 
              className="h-16 w-16 object-contain rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-sm"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xl flex items-center justify-center tracking-tight shadow-sm">
              {eventName ? eventName.charAt(0).toUpperCase() : 'E'}
            </div>
          )}
        </div>

        {/* Título del evento */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {eventName || 'Acreditación de Evento'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Sistema de control de accesos
          </p>
        </div>

        {/* Barra de progreso minimalista */}
        <div className="pt-2">
          <div className="w-48 mx-auto h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full animate-pulse w-3/4" />
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2.5 font-mono">
            Sincronizando nómina...
          </p>
        </div>

      </div>
    </div>
  );
}
