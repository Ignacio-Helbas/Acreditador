import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw, Clock, User, FileText, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.warn('Error cargando logs de auditoría:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'DATA_SYNC':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'CONFIG_UPDATE':
      case 'BRANDING_UPDATE':
        return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'DATA_RESET':
        return 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'ADMIN_LOGIN':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <span>Historial y Auditoría de Cambios</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Registro cronológico inmutable de cargas de archivos, modificaciones en la base y configuraciones de organizadores.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar registros</span>
        </button>
      </div>

      {/* Filtros por tipo de acción */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-zinc-400 dark:text-zinc-500 mr-1 font-medium">Filtrar:</span>
        {[
          { label: 'Todos los registros', val: 'ALL' },
          { label: 'Cargas y Sincronizaciones', val: 'DATA_SYNC' },
          { label: 'Personalización', val: 'BRANDING_UPDATE' },
          { label: 'Configuración', val: 'CONFIG_UPDATE' },
          { label: 'Inicios de Sesión', val: 'ADMIN_LOGIN' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setFilterType(f.val)}
            className={`px-3 py-1 rounded-md transition font-medium ${
              filterType === f.val
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de registros */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
            No hay registros de auditoría que coincidan con el filtro seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getBadgeStyle(log.type)}`}>
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {log.user || 'Administrador'}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                    {log.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
