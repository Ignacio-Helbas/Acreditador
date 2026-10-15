import React, { useState, useMemo } from 'react';
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
  FileText
} from 'lucide-react';
import { exportAttendeesToExcel, exportAttendeesToCSV } from '../utils/excel';

export default function StatsView({
  attendees,
  config,
  eventName,
  onResetAccreditations,
  onToggleAccredit,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACCREDITED' | 'PENDING'
  const [currentPage, setCurrentPage] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const pageSize = 20;

  // Métricas generales
  const total = attendees.length;
  const accredited = attendees.filter((a) => a.acreditado).length;
  const pending = total - accredited;
  const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Encabezado y Botones de Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>Métricas y Reporte de Acreditación</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Revisá la asistencia en tiempo real y exportá los resultados con auditoría de fecha y operador.
          </p>
        </div>

        {/* Acciones de exportación */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportAttendeesToExcel(attendees, eventName, config)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar a Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => exportAttendeesToCSV(attendees, eventName, config)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-sm active:scale-95 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Invitados</span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{total}</p>
          <p className="text-xs text-slate-400 mt-1">Cargados en el sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Acreditados</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{accredited}</p>
          <p className="text-xs text-emerald-600/80 mt-1">Ingresaron al evento</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendientes</span>
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-3xl font-extrabold text-slate-700">{pending}</p>
          <p className="text-xs text-slate-400 mt-1">Aún no se presentaron</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencia</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {rate}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 mb-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{accredited} de {total} personas</p>
        </div>
      </div>

      {/* Desglose por Categorías */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
            Asistencia por {labels[categoryField] || categoryField}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryStats.map((item) => (
              <div
                key={item.category}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate" title={item.category}>
                    {item.category}
                  </span>
                  <span className="font-semibold text-emerald-700">{item.percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Acreditados: <b>{item.accredited}</b></span>
                  <span>Total: <b>{item.total}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla Completa de Asistentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-base">Nómina Completa de Invitados</h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador dentro de la tabla */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtrar por DNI o nombre..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
              />
            </div>

            {/* Selector de estado */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACCREDITED">Solo acreditados</option>
              <option value="PENDING">Solo pendientes</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">{labels['dni'] || 'DNI'}</th>
                <th className="px-4 py-3">Nombre y Apellido</th>
                {config.visibleFields?.slice(0, 3).map((f) => (
                  <th key={f} className="px-4 py-3">{labels[f] || f}</th>
                ))}
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Hora Ingreso</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {paginatedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron invitados con los criterios aplicados.
                  </td>
                </tr>
              ) : (
                paginatedAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{att.dni}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {att.nombre} {att.apellido}
                    </td>
                    {config.visibleFields?.slice(0, 3).map((f) => (
                      <td key={f} className="px-4 py-2.5 text-slate-600">
                        {att.dynamicFields?.[f] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-2.5">
                      {att.acreditado ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Acreditado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                      {att.fechaAcreditacion
                        ? new Date(att.fechaAcreditacion).toLocaleTimeString('es-AR')
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                      {att.operador || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onToggleAccredit(att.dni, !att.acreditado)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-md transition ${
                          att.acreditado
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {att.acreditado ? 'Desmarcar' : 'Acreditar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredAttendees.length)} a{' '}
              {Math.min(currentPage * pageSize, filteredAttendees.length)} de {filteredAttendees.length} invitados
            </span>
            <div className="flex space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2.5 py-1 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zona de Peligro: Reiniciar Acreditaciones */}
      <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Reiniciar Acreditaciones del Evento</span>
          </h3>
          <p className="text-xs text-rose-700 mt-1">
            Esta opción vuelve a marcar a todos los invitados como "pendientes" y borra los timestamps de ingreso. Mantiene la lista de invitados intacta.
          </p>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs transition shrink-0"
        >
          Reiniciar acreditaciones
        </button>
      </div>

      {/* Modal de confirmación para reinicio */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Estás seguro de reiniciar?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Se restablecerá el estado de los <b>{accredited} asistentes acreditados</b> a pendientes. Te recomendamos exportar a Excel antes de continuar.
            </p>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onResetAccreditations();
                  setShowResetModal(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition"
              >
                Sí, reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
