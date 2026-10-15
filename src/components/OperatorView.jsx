import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  UserCheck, 
  Users, 
  Sparkles,
  Filter,
  X,
  History,
  Check
} from 'lucide-react';

export default function OperatorView({
  attendees,
  config,
  onAccredit,
  onUndoAccredit,
  lastSyncTime,
  lastSyncSource,
  onManualSync,
  isSyncing,
  autoClearSearch = true,
}) {
  const [query, setQuery] = useState('');
  const [selectedFilterValue, setSelectedFilterValue] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ACCREDITED'
  const [justAccreditedId, setJustAccreditedId] = useState(null);
  const [recentAccreditations, setRecentAccreditations] = useState([]);
  const [showUndoModal, setShowUndoModal] = useState(null);

  const searchInputRef = useRef(null);

  // Mantener foco automático permanente en el buscador
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Normalizar texto para búsqueda insensible a acentos y mayúsculas
  const normalize = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Valores únicos para el filtro configurado (si existe)
  const filterOptions = useMemo(() => {
    if (!config.filterField) return [];
    const values = new Set();
    attendees.forEach((a) => {
      const val = a.dynamicFields?.[config.filterField];
      if (val) values.add(String(val).trim());
    });
    return Array.from(values).sort();
  }, [attendees, config.filterField]);

  // Lista filtrada de asistentes
  const filteredAttendees = useMemo(() => {
    if (!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL') {
      return [];
    }

    const cleanQ = normalize(query);
    const isNumericQuery = /^[0-9]+$/.test(cleanQ);

    return attendees.filter((att) => {
      // Filtro de estado
      if (statusFilter === 'PENDING' && att.acreditado) return false;
      if (statusFilter === 'ACCREDITED' && !att.acreditado) return false;

      // Filtro por campo dinámico (ej: Tipo de Entrada)
      if (config.filterField && selectedFilterValue !== 'ALL') {
        const attVal = att.dynamicFields?.[config.filterField];
        if (attVal !== selectedFilterValue) return false;
      }

      // Si no hay texto de búsqueda, mostrar según filtros de arriba
      if (!cleanQ) return true;

      const attDni = normalize(att.dni);
      const attNombre = normalize(att.nombre);
      const attApellido = normalize(att.apellido);
      const attCompleto = `${attNombre} ${attApellido}`;

      // Búsqueda prioritaria por DNI
      if (attDni.includes(cleanQ)) return true;

      // Búsqueda por Nombre / Apellido
      if (attNombre.includes(cleanQ) || attApellido.includes(cleanQ) || attCompleto.includes(cleanQ)) {
        return true;
      }

      // Búsqueda secundaria en campos dinámicos visibles
      for (const field of config.visibleFields || []) {
        const fieldVal = normalize(att.dynamicFields?.[field]);
        if (fieldVal && fieldVal.includes(cleanQ)) return true;
      }

      return false;
    }).sort((a, b) => {
      // Si la búsqueda coincide exactamente con el DNI, ponerlo primero
      const cleanQ = normalize(query);
      if (normalize(a.dni) === cleanQ) return -1;
      if (normalize(b.dni) === cleanQ) return 1;
      // Los no acreditados primero
      if (!a.acreditado && b.acreditado) return -1;
      if (a.acreditado && !b.acreditado) return 1;
      return 0;
    });
  }, [attendees, query, selectedFilterValue, statusFilter, config]);

  // Manejar acreditación
  const handleAccreditAction = async (attendee) => {
    const result = await onAccredit(attendee.dni);
    if (result && result.success) {
      setJustAccreditedId(attendee.id);
      setRecentAccreditations((prev) => [
        {
          ...attendee,
          acreditado: true,
          fechaAcreditacion: new Date().toISOString(),
        },
        ...prev.filter((p) => p.dni !== attendee.dni).slice(0, 7),
      ]);

      if (autoClearSearch) {
        setQuery('');
      }

      // Volver a dar foco al buscador para el siguiente asistente
      setTimeout(() => {
        searchInputRef.current?.focus();
        setJustAccreditedId(null);
      }, 1500);
    }
  };

  // Manejo de teclado (Enter para acreditar si hay 1 solo resultado, Escape para limpiar)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      searchInputRef.current?.focus();
    } else if (e.key === 'Enter') {
      if (filteredAttendees.length === 1) {
        const single = filteredAttendees[0];
        handleAccreditAction(single);
      }
    }
  };

  // Métricas rápidas
  const totalCount = attendees.length;
  const accreditedCount = attendees.filter((a) => a.acreditado).length;
  const percentage = totalCount > 0 ? Math.round((accreditedCount / totalCount) * 100) : 0;

  // Formato amigable de fecha y hora
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Barra de Estadísticas y Sincronización Superior */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Contador Acreditados */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acreditados</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-600">{accreditedCount}</span>
              <span className="text-sm font-medium text-slate-400">/ {totalCount}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
            {percentage}%
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendientes</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-700">{totalCount - accreditedCount}</span>
              <span className="text-xs font-medium text-slate-400">por ingresar</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
            <span>Afluencia en Puerta</span>
            <span>{percentage}% completado</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Estado de Sincronización */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Sincronización</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {lastSyncTime ? formatTime(lastSyncTime) : 'Sin sincronizar'}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {lastSyncSource ? `Vía ${lastSyncSource}` : 'Base local'}
            </p>
          </div>
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sincronizar ahora con la hoja"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Input de Búsqueda Principal (Grande, Prominente, Foco Automático) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/5 mb-6">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none text-slate-400">
            <Search className="w-7 h-7 text-emerald-600" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ingresá DNI o Nombre / Apellido para acreditar... (Enter para confirmar)"
            className="w-full pl-14 pr-28 py-4 text-xl sm:text-2xl font-semibold placeholder:text-slate-400 text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              title="Limpiar búsqueda (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Barra de Filtros y Atajos Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>

            {/* Filtro por Estado */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === 'PENDING' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setStatusFilter('ACCREDITED')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === 'ACCREDITED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Acreditados
              </button>
            </div>

            {/* Filtro por campo dinámico (si está configurado) */}
            {config.filterField && filterOptions.length > 0 && (
              <select
                value={selectedFilterValue}
                onChange={(e) => setSelectedFilterValue(e.target.value)}
                className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Todo {config.fieldLabels?.[config.filterField] || config.filterField}</option>
                {filterOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-600">
            <span>Atajos: <kbd className="bg-slate-200/90 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-300">Enter</kbd> Acreditar</span>
            <span><kbd className="bg-slate-200/90 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-300">Esc</kbd> Limpiar</span>
          </div>
        </div>
      </div>

      {/* Sección Principal: Resultados de Búsqueda y Últimos Acreditados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna de Resultados (2 de 3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL'
                ? `Resultados de búsqueda (${filteredAttendees.length})`
                : 'Escribí un DNI o nombre para buscar'}
            </h2>
          </div>

          {/* Estado Vacío: Sin búsqueda aún */}
          {!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL' && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <Search className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Listo para acreditar</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-1 text-sm">
                Colocá el cursor en el buscador e ingresá el DNI del asistente o pasá el lector de código de barras.
              </p>
              {totalCount === 0 && (
                <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs max-w-sm mx-auto border border-amber-200">
                  ⚠️ No hay asistentes cargados. Andá a la pestaña <b>"Fuente de Datos"</b> para subir un Excel o conectar una Google Sheet.
                </div>
              )}
            </div>
          )}

          {/* Estado: Búsqueda sin coincidencias */}
          {(query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL') && filteredAttendees.length === 0 && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No se encontraron asistentes</h3>
              <p className="text-slate-500 text-sm mt-1">
                Ninguna persona coincide con <b className="text-slate-700">"{query}"</b>. Verificá si el DNI fue digitado correctamente.
              </p>
            </div>
          )}

          {/* Tarjetas de Asistentes Encontrados */}
          {filteredAttendees.map((att) => {
            const isJustAccredited = justAccreditedId === att.id;
            const labels = config.fieldLabels || {};

            return (
              <div
                key={att.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-sm ${
                  isJustAccredited
                    ? 'border-emerald-500 ring-4 ring-emerald-500/20 animate-accredit-pulse'
                    : att.acreditado
                    ? 'border-amber-200/90 bg-amber-50/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Datos del Asistente */}
                  <div className="flex items-start space-x-3.5">
                    {/* Avatar / Iniciales */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                      att.acreditado 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {att.nombre ? att.nombre.charAt(0).toUpperCase() : 'A'}
                    </div>

                    <div>
                      {/* Nombre y Apellido */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">
                          {att.nombre} {att.apellido}
                        </h3>
                        {att.acreditado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> ACREDITADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* DNI Destacado */}
                      <p className="text-sm font-semibold text-slate-600 mt-0.5 font-mono">
                        <span className="text-slate-400 font-sans text-xs uppercase font-normal mr-1">
                          {labels['dni'] || 'DNI'}:
                        </span>
                        {att.dni}
                      </p>

                      {/* Campos Dinámicos Configurables */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {config.visibleFields?.map((field) => {
                          const val = att.dynamicFields?.[field];
                          if (!val) return null;
                          const label = labels[field] || field;

                          return (
                            <span
                              key={field}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              <span className="text-slate-400 mr-1">{label}:</span>
                              <b className="font-semibold text-slate-800">{val}</b>
                            </span>
                          );
                        })}
                      </div>

                      {/* Auditoría de Acreditación (si ya fue acreditado) */}
                      {att.acreditado && (
                        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Acreditado el <b>{formatDate(att.fechaAcreditacion)}</b> a las{' '}
                            <b>{formatTime(att.fechaAcreditacion)}</b>{' '}
                            {att.operador && <>(por <b>{att.operador}</b>)</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="w-full sm:w-auto flex sm:flex-col items-center gap-2 shrink-0">
                    {!att.acreditado ? (
                      <button
                        onClick={() => handleAccreditAction(att)}
                        className="w-full sm:w-44 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-md shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-5 h-5 stroke-[2.5]" />
                        <span>Acreditar</span>
                        <span className="text-xs bg-emerald-700/80 px-1.5 py-0.5 rounded font-mono font-normal">
                          ↵
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full sm:w-44">
                        <div className="w-full py-2.5 px-3 rounded-xl bg-amber-100/80 text-amber-800 font-semibold text-xs border border-amber-300 text-center flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-amber-700" />
                          <span>Ya ingresó</span>
                        </div>
                        <button
                          onClick={() => setShowUndoModal(att)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Deshacer acreditación</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Columna Lateral: Últimos Acreditados en Puerta (1 de 3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Últimos Acreditados</span>
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                En vivo
              </span>
            </div>

            {recentAccreditations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aún no hay acreditaciones en esta sesión.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentAccreditations.map((item, idx) => (
                  <div
                    key={`${item.dni}-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/70 transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.nombre} {item.apellido}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        DNI: {item.dni}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-600 font-semibold block text-[11px]">
                        {formatTime(item.fechaAcreditacion)}
                      </span>
                      <button
                        onClick={() => setShowUndoModal(item)}
                        className="text-slate-400 hover:text-rose-600 text-[10px] underline"
                      >
                        Deshacer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Confirmación para Deshacer Acreditación */}
      {showUndoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4 border border-rose-100">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Deshacer acreditación?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Estás a punto de volver a marcar como <b>pendiente</b> a:
            </p>
            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <p className="font-bold text-slate-800">{showUndoModal.nombre} {showUndoModal.apellido}</p>
              <p className="text-slate-500 font-mono text-xs mt-0.5">DNI: {showUndoModal.dni}</p>
            </div>
            <p className="text-xs text-slate-400">
              Esta acción quedará registrada en el historial de auditoría.
            </p>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowUndoModal(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onUndoAccredit(showUndoModal.dni);
                  setRecentAccreditations((prev) => prev.filter((p) => p.dni !== showUndoModal.dni));
                  setShowUndoModal(null);
                  searchInputRef.current?.focus();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition"
              >
                Sí, deshacer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
