import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  UserCheck, 
  Users, 
  Filter, 
  X, 
  History, 
  Check,
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export default function OperatorView({
  attendees = [],
  config = {},
  onAccredit,
  onUndoAccredit,
  lastSyncTime,
  lastSyncSource,
  onManualSync,
  isSyncing,
  autoClearSearch = true,
  isOnline = true,
}) {
  const [query, setQuery] = useState('');
  const [selectedFilterValue, setSelectedFilterValue] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ACCREDITED'
  const [justAccredited, setJustAccredited] = useState(null); // Feedback prominente de éxito
  const [collisionAlert, setCollisionAlert] = useState(null); // Alerta si otro operador ya lo acreditó casi a la vez
  const [recentAccreditations, setRecentAccreditations] = useState([]);
  const [showUndoModal, setShowUndoModal] = useState(null);
  const [showRecentMobile, setShowRecentMobile] = useState(false);

  const searchInputRef = useRef(null);

  // Mantener foco en el buscador al montar y tras cada acción
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Limpiar banner de acreditación reciente tras 4 segundos
  useEffect(() => {
    if (!justAccredited) return;
    const timer = setTimeout(() => {
      setJustAccredited(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [justAccredited]);

  // Normalizar texto para búsqueda sin acentos ni mayúsculas
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

    return attendees.filter((att) => {
      // Filtro de estado
      if (statusFilter === 'PENDING' && att.acreditado) return false;
      if (statusFilter === 'ACCREDITED' && !att.acreditado) return false;

      // Filtro por campo dinámico (ej: Sector, Tipo de Entrada)
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

      // 1. Prioridad: Coincidencia por DNI
      if (attDni.includes(cleanQ)) return true;

      // 2. Coincidencia por Nombre y/o Apellido
      if (attNombre.includes(cleanQ) || attApellido.includes(cleanQ) || attCompleto.includes(cleanQ)) {
        return true;
      }

      // 3. Coincidencia secundaria en campos dinámicos visibles
      for (const field of config.visibleFields || []) {
        const fieldVal = normalize(att.dynamicFields?.[field]);
        if (fieldVal && fieldVal.includes(cleanQ)) return true;
      }

      return false;
    }).sort((a, b) => {
      const cleanQ = normalize(query);
      if (normalize(a.dni) === cleanQ) return -1;
      if (normalize(b.dni) === cleanQ) return 1;
      if (!a.acreditado && b.acreditado) return -1;
      if (a.acreditado && !b.acreditado) return 1;
      return 0;
    });
  }, [attendees, query, selectedFilterValue, statusFilter, config]);

  // Manejar acreditación con resolución atómica de concurrencia
  const handleAccreditAction = async (attendee) => {
    setCollisionAlert(null);
    try {
      const result = await onAccredit(attendee.dni);
      if (result && result.success) {
        const nowIso = new Date().toISOString();
        const accreditedRecord = {
          ...attendee,
          acreditado: true,
          fechaAcreditacion: nowIso,
          puntoAcceso: result.attendee?.puntoAcceso || attendee.puntoAcceso,
          operador: result.attendee?.operador || attendee.operador,
        };

        setJustAccredited(accreditedRecord);
        setRecentAccreditations((prev) => [
          accreditedRecord,
          ...prev.filter((p) => p.dni !== attendee.dni).slice(0, 9),
        ]);

        if (autoClearSearch) {
          setQuery('');
        }

        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      } else if (result && result.alreadyAccredited) {
        // Conflicto de doble acreditación concurrente detectado por la base de datos
        setCollisionAlert({
          attendee: result.attendee || attendee,
          error: result.error || 'Este asistente ya fue acreditado desde otro punto de acceso.',
        });
      }
    } catch (err) {
      setCollisionAlert({
        attendee,
        error: err.message || 'Error al intentar confirmar la acreditación.',
      });
    }
  };

  // Manejo de atajos de teclado (Enter para acreditar si hay 1 solo resultado, Escape para limpiar)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      setJustAccredited(null);
      searchInputRef.current?.focus();
    } else if (e.key === 'Enter') {
      if (filteredAttendees.length === 1) {
        const single = filteredAttendees[0];
        if (!single.acreditado) {
          handleAccreditAction(single);
        }
      }
    }
  };

  // Métricas rápidas
  const totalCount = attendees.length;
  const accreditedCount = attendees.filter((a) => a.acreditado).length;
  const pendingCount = totalCount - accreditedCount;
  const percentage = totalCount > 0 ? Math.round((accreditedCount / totalCount) * 100) : 0;

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const labels = config.fieldLabels || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* ================= BANNER DE CONFIRMACIÓN PROMINENTE ================= */}
      {justAccredited && (
        <div 
          role="alert"
          className="bg-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow-lg shadow-emerald-900/10 flex items-center justify-between gap-4 border border-emerald-500 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded font-mono">
                  ACREDITADO CON ÉXITO
                </span>
                <span className="text-xs font-mono opacity-90">
                  {formatTime(justAccredited.fechaAcreditacion)}
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold truncate mt-0.5">
                {justAccredited.nombre} {justAccredited.apellido}
              </h4>
              <p className="text-xs sm:text-sm font-mono opacity-90">
                DNI: <span className="font-bold">{justAccredited.dni}</span>
                {config.filterField && justAccredited.dynamicFields?.[config.filterField] && (
                  <span className="ml-2 bg-emerald-700/60 px-1.5 py-0.5 rounded text-[11px]">
                    {justAccredited.dynamicFields[config.filterField]}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setJustAccredited(null)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition shrink-0"
            title="Cerrar notificación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ================= BANNER DE ALERTA DE CONFLICTO / DOBLE ACREDITACIÓN ================= */}
      {collisionAlert && (
        <div 
          role="alert"
          className="bg-amber-600 text-white rounded-xl p-4 sm:p-5 shadow-lg shadow-amber-900/10 flex items-center justify-between gap-4 border border-amber-500 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded font-mono">
                YA ACREDITADO EN OTRO ACCESO
              </span>
              <h4 className="text-base sm:text-lg font-bold truncate mt-0.5">
                {collisionAlert.attendee?.nombre} {collisionAlert.attendee?.apellido} (DNI: {collisionAlert.attendee?.dni})
              </h4>
              <p className="text-xs sm:text-sm opacity-95 mt-0.5">
                {collisionAlert.error}
              </p>
            </div>
          </div>

          <button
            onClick={() => setCollisionAlert(null)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition shrink-0"
            title="Entendido"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ================= ALERTA DE MODO OFFLINE ================= */}
      {!isOnline && (
        <div className="bg-rose-600 text-white rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Sin conexión a internet. Podés consultar la lista de asistentes pero la confirmación de ingresos está pausada para evitar ingresos duplicados.</span>
          </div>
        </div>
      )}

      {/* ================= MÉTRICAS Y ESTADO DE SINCRONIZACIÓN ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Acreditados */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acreditados</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {accreditedCount}
              </span>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                / {totalCount}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-200 dark:border-emerald-800 font-mono">
            {percentage}%
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pendientes</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-zinc-800 dark:text-zinc-200 font-mono">
                {pendingCount}
              </span>
              <span className="text-[11px] text-zinc-400">en espera</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Barra de Progreso de Ingreso */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center col-span-2 sm:col-span-1">
          <div className="flex justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            <span>Afluencia en Puerta</span>
            <span className="font-mono font-bold">{percentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <div 
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Sincronización */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Sincronización</p>
            <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-1 flex items-center gap-1.5 font-mono truncate">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{lastSyncTime ? formatTime(lastSyncTime) : 'Local'}</span>
            </p>
            <p className="text-[10px] text-zinc-400 truncate">
              {lastSyncSource ? `Vía ${lastSyncSource}` : 'En memoria local'}
            </p>
          </div>
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sincronizar ahora con la hoja"
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition disabled:opacity-50 shrink-0"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ================= BUSCADOR PRINCIPAL (GRANDE, FOCO AUTOMÁTICO, ERGONÓMICO) ================= */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none text-zinc-400">
            <Search className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por DNI o Nombre... (Enter para acreditar)"
            className="w-full pl-13 pr-24 py-3.5 sm:py-4 text-lg sm:text-2xl font-bold placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3.5 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md transition"
              title="Limpiar búsqueda (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Barra de Filtros y Atajos */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtro:
            </span>

            {/* Filtro por Estado */}
            <div className="inline-flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === 'PENDING'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setStatusFilter('ACCREDITED')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === 'ACCREDITED'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Acreditados
              </button>
            </div>

            {/* Filtro por campo dinámico si existe */}
            {config.filterField && filterOptions.length > 0 && (
              <select
                value={selectedFilterValue}
                onChange={(e) => setSelectedFilterValue(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todo {labels[config.filterField] || config.filterField}</option>
                {filterOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Atajo: <kbd className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-700 text-[11px]">Enter</kbd> Acreditar</span>
            <span><kbd className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-700 text-[11px]">Esc</kbd> Limpiar</span>
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN DE RESULTADOS Y AUDITORÍA EN TIEMPO REAL ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna de Resultados (2 de 3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL'
                ? `Resultados (${filteredAttendees.length})`
                : 'Búsqueda de Asistentes'}
            </h2>
          </div>

          {/* Estado Inicial: Sin consulta ingresada */}
          {!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL' && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 sm:p-12 border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Puesto de Acreditación Activo
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 text-xs sm:text-sm">
                Ingresá el número de DNI o apellido del invitado. El sistema te avisará al instante si ya fue acreditado para evitar doble ingreso.
              </p>
              {totalCount === 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-lg text-xs max-w-md mx-auto border border-amber-200 dark:border-amber-800 text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>No hay asistentes cargados. Solicitá al administrador cargar la nómina desde la pestaña <b>"Fuente de Datos"</b>.</span>
                </div>
              )}
            </div>
          )}

          {/* Estado: Sin resultados encontrados (Alerta clara) */}
          {(query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL') && filteredAttendees.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10 text-center shadow-sm">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mx-auto mb-3 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                No se encontró ningún asistente
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                No existe nadie registrado con el valor <b className="text-zinc-900 dark:text-zinc-100 font-mono font-bold">"{query}"</b> en la base de datos de este evento.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 transition"
                >
                  Limpiar búsqueda
                </button>
              </div>
            </div>
          )}

          {/* Tarjetas de Asistentes Encontrados */}
          {filteredAttendees.map((att) => {
            const isJustDone = justAccredited?.dni === att.dni;

            return (
              <div
                key={att.id || att.dni}
                className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all p-4 sm:p-5 shadow-sm ${
                  isJustDone
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : att.acreditado
                    ? 'border-amber-300/80 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Información Principal del Asistente */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    {/* Monograma / Inicial */}
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base shrink-0 font-mono ${
                      att.acreditado 
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                    }`}>
                      {att.nombre ? att.nombre.charAt(0).toUpperCase() : 'A'}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Nombre y Estado */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {att.nombre} {att.apellido}
                        </h3>

                        {att.acreditado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-mono">
                            <Check className="w-3 h-3 stroke-[3]" /> ACREDITADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* DNI */}
                      <p className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 mt-1 font-mono">
                        <span className="text-zinc-400 dark:text-zinc-500 font-sans text-xs uppercase font-medium mr-1.5">
                          {labels['dni'] || 'DNI'}:
                        </span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">{att.dni}</span>
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
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80"
                            >
                              <span className="text-zinc-400 dark:text-zinc-500 mr-1">{label}:</span>
                              <b className="font-semibold text-zinc-900 dark:text-zinc-100">{val}</b>
                            </span>
                          );
                        })}
                      </div>

                      {/* Advertencia de Ya Acreditado (Prevención de Doble Ingreso) */}
                      {att.acreditado && (
                        <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start sm:items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                          <span>
                            Acreditado previamente el <b>{formatDate(att.fechaAcreditacion)}</b> a las{' '}
                            <b className="font-mono">{formatTime(att.fechaAcreditacion)}</b>{' '}
                            {att.operador && <>(por <b>{att.operador}</b>)</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción (Grandes, Táctiles para Móvil) */}
                  <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    {!att.acreditado ? (
                      <button
                        onClick={() => handleAccreditAction(att)}
                        disabled={!isOnline}
                        className={`w-full sm:w-44 h-12 rounded-lg text-white font-bold text-sm sm:text-base shadow-sm transition flex items-center justify-center gap-2 ${
                          !isOnline
                            ? 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                            : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99]'
                        }`}
                        title={!isOnline ? 'Reconecta a internet para confirmar la acreditación' : 'Confirmar acreditación'}
                      >
                        <UserCheck className="w-5 h-5 stroke-[2.5]" />
                        <span>{!isOnline ? 'Sin conexión' : 'Acreditar'}</span>
                        {isOnline && (
                          <span className="hidden sm:inline-block text-[10px] bg-emerald-700/80 px-1 py-0.5 rounded font-mono font-normal">
                            ↵
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5 w-full sm:w-44">
                        <div className="w-full py-2 px-3 rounded-lg bg-amber-100/70 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-300 dark:border-amber-700 text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <span>Ingresado</span>
                        </div>
                        <button
                          onClick={() => setShowUndoModal(att)}
                          className="w-full py-1 px-2 rounded text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-zinc-200 dark:border-zinc-800 transition flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
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

        {/* Columna Lateral: Últimos Acreditados (Historial en Vivo) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Últimos Acreditados</span>
              </h3>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                En vivo
              </span>
            </div>

            {recentAccreditations.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 py-6 text-center">
                Aún no hay acreditaciones registradas en esta sesión.
              </p>
            ) : (
              <div className="space-y-2">
                {recentAccreditations.map((item, idx) => (
                  <div
                    key={`${item.dni}-${idx}`}
                    className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.nombre} {item.apellido}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        DNI: {item.dni}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[11px] block">
                        {formatTime(item.fechaAcreditacion)}
                      </span>
                      <button
                        onClick={() => setShowUndoModal(item)}
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] underline"
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

      {/* ================= MODAL: DESHACER ACREDITACIÓN ================= */}
      {showUndoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mb-3 border border-rose-200 dark:border-rose-800">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              ¿Deshacer acreditación?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Estás a punto de volver a marcar como <b>pendiente</b> a:
            </p>
            <div className="my-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">{showUndoModal.nombre} {showUndoModal.apellido}</p>
              <p className="text-zinc-500 dark:text-zinc-400 font-mono text-xs mt-0.5">DNI: {showUndoModal.dni}</p>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Esta acción quedará registrada en el historial de auditoría.
            </p>
            <div className="flex space-x-3 mt-5">
              <button
                onClick={() => setShowUndoModal(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
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
                className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition"
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
