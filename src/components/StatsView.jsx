import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Activity,
  Check,
  Flame
} from 'lucide-react';
import { exportAttendeesToExcel, exportAttendeesToCSV } from '../utils/excel';
import { subscribeToActivityFeed, isFirebaseConfigured } from '../services/firebase';

export default function StatsView({
  attendees = [],
  config = {},
  eventName = 'Evento',
  onResetAccreditations,
  onToggleAccredit,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACCREDITED' | 'PENDING'
  const [currentPage, setCurrentPage] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const pageSize = 20;

  // Suscripción al feed de actividad en vivo desde Firestore (si está activo)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribe = subscribeToActivityFeed(
      'main-event',
      (feed) => {
        setActivityFeed(feed);
      },
      (err) => console.warn('Feed error:', err)
    );
    return () => unsubscribe();
  }, []);

  // Métricas generales
  const total = attendees.length;
  const accredited = attendees.filter((a) => a.acreditado).length;
  const pending = total - accredited;
  const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;

  // Desglose por Punto de Acceso / Operador
  const doorStats = useMemo(() => {
    const counts = {};
    attendees.forEach((a) => {
      if (!a.acreditado) return;
      const door = a.puntoAcceso || (a.operador ? String(a.operador).split('(')[1]?.replace(')', '') : 'Sin punto asignado') || 'Puerta 1';
      counts[door] = (counts[door] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([door, count]) => ({
        door,
        count,
        percentage: accredited > 0 ? Math.round((count / accredited) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [attendees, accredited]);

  // Desglose por campo de filtro o tipo de entrada si existe
  const categoryField = config.filterField || 'tipoEntrada';
  const categoryStats = useMemo(() => {
    const counts = {};
    attendees.forEach((a) => {
      const cat = a.dynamicFields?.[categoryField] || 'General';
      if (!counts[cat]) {
        counts[cat] = { total: 0, accredited: 0 };
      }
      counts[cat].total++;
      if (a.acreditado) counts[cat].accredited++;
    });
    return Object.entries(counts).map(([cat, data]) => ({
      category: cat,
      total: data.total,
      accredited: data.accredited,
      percentage: data.total > 0 ? Math.round((data.accredited / data.total) * 100) : 0,
    }));
  }, [attendees, categoryField]);

  // Feed fallback local si no hay Firestore
  const displayFeed = useMemo(() => {
    if (activityFeed.length > 0) return activityFeed;
    return attendees
      .filter((a) => a.acreditado && a.fechaAcreditacion)
      .sort((a, b) => new Date(b.fechaAcreditacion) - new Date(a.fechaAcreditacion))
      .slice(0, 25)
      .map((a) => ({
        id: a.dni,
        dni: a.dni,
        nombre: a.nombre,
        apellido: a.apellido,
        action: 'ACCREDIT',
        operador: a.operador || a.puntoAcceso || 'Operador',
        puntoAcceso: a.puntoAcceso || 'Puerta 1',
        timestamp: a.fechaAcreditacion,
      }));
  }, [activityFeed, attendees]);

  // Asistentes filtrados para la tabla
  const filteredAttendees = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return attendees.filter((att) => {
      if (statusFilter === 'ACCREDITED' && !att.acreditado) return false;
      if (statusFilter === 'PENDING' && att.acreditado) return false;

      if (!q) return true;

      const dniMatch = String(att.dni || '').toLowerCase().includes(q);
      const nameMatch = `${att.nombre || ''} ${att.apellido || ''}`.toLowerCase().includes(q);
      return dniMatch || nameMatch;
    });
  }, [attendees, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAttendees.length / pageSize) || 1;
  const paginatedAttendees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttendees.slice(start, start + pageSize);
  }, [filteredAttendees, currentPage]);

  const labels = config.fieldLabels || {};

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Encabezado y Botones de Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Panel de Control en Vivo</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Supervisá el flujo de acreditaciones en tiempo real por puerta y exportá el reporte oficial.
          </p>
        </div>

        {/* Acciones de exportación */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportAttendeesToExcel(attendees, eventName, config)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => exportAttendeesToCSV(attendees, eventName, config)}
            className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 font-semibold text-xs transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Invitados</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono mt-1">{total}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">En nómina del evento</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Acreditados</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{accredited}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{rate}% del total</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">{pending}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Por ingresar</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Afluencia Total</p>
          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-xs font-mono font-bold text-right text-zinc-700 dark:text-zinc-300 mt-1">{rate}%</span>
        </div>
      </div>

      {/* Grid de 2 Columnas: Desglose por Puntos de Acceso + Feed en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Desglose por Punto de Acceso / Puerta */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Acreditaciones por Punto de Acceso</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">
              {doorStats.length} {doorStats.length === 1 ? 'puerta' : 'puertas activas'}
            </span>
          </div>

          {doorStats.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Aún no hay ingresos registrados desde ningún punto de acceso.
            </p>
          ) : (
            <div className="space-y-3">
              {doorStats.map((item) => (
                <div key={item.door} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {item.door}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.count} ingresos ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Feed de Actividad en Tiempo Real (Streaming) */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Feed de Ingresos en Vivo</span>
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              EN VIVO
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {displayFeed.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">
                Esperando las primeras acreditaciones para mostrar el flujo en vivo...
              </p>
            ) : (
              displayFeed.map((item, idx) => (
                <div
                  key={item.id || `${item.dni}-${idx}`}
                  className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs transition animate-in fade-in"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.nombre} {item.apellido}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] truncate flex items-center gap-1.5">
                      <span className="font-mono font-semibold">DNI: {item.dni}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.puntoAcceso || item.operador}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] block">
                      {formatTime(item.timestamp)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-mono">
                      INGRESÓ
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Desglose por Categoría / Tipo de Entrada */}
      {categoryStats.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Desglose por {labels[categoryField] || categoryField}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categoryStats.map((item) => (
              <div key={item.category} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.category}</span>
                  <span className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.accredited}/{item.total} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla Completa de Asistentes */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4 p-5">
        
        {/* Barra de Búsqueda y Filtro de la Tabla */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por DNI o nombre..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700 text-xs self-start sm:self-auto">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-semibold transition ${statusFilter === 'ALL' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Todos ({total})
            </button>
            <button
              onClick={() => { setStatusFilter('ACCREDITED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-semibold transition ${statusFilter === 'ACCREDITED' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Acreditados ({accredited})
            </button>
            <button
              onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-semibold transition ${statusFilter === 'PENDING' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Pendientes ({pending})
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2.5 font-mono">DNI</th>
                <th className="px-3 py-2.5">Nombre y Apellido</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Hora Acreditación</th>
                <th className="px-3 py-2.5">Punto / Operador</th>
                <th className="px-3 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedAttendees.map((att) => (
                <tr key={att.id || att.dni} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <td className="px-3 py-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">{att.dni}</td>
                  <td className="px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-200">{att.nombre} {att.apellido}</td>
                  <td className="px-3 py-2">
                    {att.acreditado ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                        Acreditado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">{formatTime(att.fechaAcreditacion)}</td>
                  <td className="px-3 py-2 text-zinc-500 text-[11px] truncate max-w-[140px]">
                    {att.puntoAcceso || att.operador || '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onToggleAccredit(att.dni, !att.acreditado)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                        att.acreditado
                          ? 'text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold'
                      }`}
                    >
                      {att.acreditado ? 'Deshacer' : 'Acreditar'}
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedAttendees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-400 text-xs">
                    No se encontraron asistentes con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Confirmación para Reiniciar Acreditaciones */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mb-3 border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              ¿Reiniciar todas las acreditaciones?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Esta acción marcará a todos los <b>{total} asistentes</b> como <b>pendientes</b> en la base de datos en tiempo real y borrará las marcas de tiempo. La nómina no se borrará.
            </p>
            <div className="flex space-x-3 mt-5">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onResetAccreditations();
                  setShowResetModal(false);
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition"
              >
                Sí, reiniciar a cero
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
