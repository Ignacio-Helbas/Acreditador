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
  Wifi, 
  WifiOff, 
  DoorClosed, 
  ArrowRight,
  ShieldAlert,
  CornerDownLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { formatTime, formatDate, cn } from '../lib/utils';

/**
 * Vista de Operador de Acreditación
 * 
 * Patrones arquitectónicos implementados:
 * - pass.in (Rocketseat): Separación del modelo Attendee (asistente) y CheckIn (evento de pase).
 *   Manejo estricto de CheckInAlreadyExistsException en colisiones concurrentes.
 * - meeting-gate: Metadatos de auditoría en puerta (gateId, operatorId, timestamp, method).
 * - shadcn/ui: Componentes atómicos (Card, Badge, Button, Input) con microinteracciones y atajos accesibles.
 */
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
  const [justAccredited, setJustAccredited] = useState(null); // Feedback prominente de check-in exitoso
  const [collisionAlert, setCollisionAlert] = useState(null); // Alerta si otro operador ya lo acreditó casi en simultáneo
  const [recentAccreditations, setRecentAccreditations] = useState([]);
  const [showUndoModal, setShowUndoModal] = useState(null);

  const searchInputRef = useRef(null);

  // Mantener foco en el buscador al montar y tras cada acción
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Limpiar banner de acreditación reciente tras 4.5 segundos
  useEffect(() => {
    if (!justAccredited) return;
    const timer = setTimeout(() => {
      setJustAccredited(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [justAccredited]);

  // Normalizar texto para búsqueda insensible a mayúsculas y diacríticos
  const normalize = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Valores únicos para el filtro configurado (ej: Sector, Tipo de Entrada)
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

      // Filtro por campo dinámico (ej: Sector, Entrada)
      if (config.filterField && selectedFilterValue !== 'ALL') {
        const attVal = att.dynamicFields?.[config.filterField];
        if (attVal !== selectedFilterValue) return false;
      }

      // Si no hay texto de búsqueda, mostrar según filtros de estado/categoría
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

  // Manejar acreditación con resolución atómica de concurrencia (pass.in & meeting-gate)
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
          method: 'SEARCH_DNI',
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
        // Conflicto de doble acreditación concurrente detectado atómicamente
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

  // Atajos de teclado ergonómicos para puerta
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

  // Métricas rápidas estilo Tremor
  const totalCount = attendees.length;
  const accreditedCount = attendees.filter((a) => a.acreditado).length;
  const pendingCount = totalCount - accreditedCount;
  const percentage = totalCount > 0 ? Math.round((accreditedCount / totalCount) * 100) : 0;

  const labels = config.fieldLabels || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Banner de Confirmación Inmediato de Check-in */}
      {justAccredited && (
        <div 
          role="alert"
          className="bg-emerald-600 text-white rounded-lg p-4 shadow-sm flex items-center justify-between gap-4 border border-emerald-500 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white/20 text-white border-transparent text-[10px] font-mono">
                  CHECK-IN CONFIRMADO
                </Badge>
                <span className="text-xs font-mono opacity-90">
                  {formatTime(justAccredited.fechaAcreditacion)}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold truncate mt-0.5">
                {justAccredited.nombre} {justAccredited.apellido}
              </h4>
              <p className="text-xs font-mono opacity-90">
                DNI {justAccredited.dni}
                {justAccredited.puntoAcceso && (
                  <span className="ml-2 opacity-80">• {justAccredited.puntoAcceso}</span>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setJustAccredited(null)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Banner de Conflicto Concurrente (pass.in CheckInAlreadyExistsException) */}
      {collisionAlert && (
        <div 
          role="alert"
          className="bg-amber-600 text-white rounded-lg p-4 shadow-sm flex items-center justify-between gap-4 border border-amber-500 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white/20 text-white border-transparent text-[10px] font-mono">
                  ACCESO PREVIO DETECTADO
                </Badge>
              </div>
              <h4 className="text-base font-bold truncate mt-0.5">
                {collisionAlert.attendee?.nombre} {collisionAlert.attendee?.apellido} (DNI {collisionAlert.attendee?.dni})
              </h4>
              <p className="text-xs opacity-95 mt-0.5">
                {collisionAlert.error}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollisionAlert(null)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Alerta de Desconexión de Red */}
      {!isOnline && (
        <div className="bg-rose-600 text-white rounded-lg p-3 shadow-sm flex items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Sin conexión a internet. La búsqueda local sigue disponible pero la confirmación de ingresos está bloqueada para preservar la consistencia multi-puerta.</span>
          </div>
        </div>
      )}

      {/* Métricas Compactas de la Puerta (Estilo Tremor) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3.5 px-3.5">
            <CardTitle className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Acreditados
            </CardTitle>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {accreditedCount}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                / {totalCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3.5 px-3.5">
            <CardTitle className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Pendientes
            </CardTitle>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3.5 px-3.5">
            <CardTitle className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Afluencia en Puerta
            </CardTitle>
            <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{percentage}%</span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 space-y-1.5">
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3.5 px-3.5">
            <CardTitle className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Sincronización
            </CardTitle>
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500" />
            )}
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {lastSyncTime ? formatTime(lastSyncTime) : 'Activa'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {lastSyncSource ? `Vía ${lastSyncSource}` : 'Tiempo real'}
                </p>
              </div>
              {onManualSync && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  title="Sincronizar ahora"
                >
                  <RotateCcw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-emerald-600')} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Buscador de Acreditación (Ergonómico, foco instantáneo, sin estética de template) */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingresá el número de DNI o apellido del asistente..."
              className="w-full pl-12 pr-12 py-3 text-base sm:text-lg font-medium placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filtros de la Barra de Búsqueda */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>

              <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={cn(
                    'px-2 py-0.5 rounded font-medium transition-colors',
                    statusFilter === 'ALL'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={cn(
                    'px-2 py-0.5 rounded font-medium transition-colors',
                    statusFilter === 'PENDING'
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-zinc-900 dark:text-emerald-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setStatusFilter('ACCREDITED')}
                  className={cn(
                    'px-2 py-0.5 rounded font-medium transition-colors',
                    statusFilter === 'ACCREDITED'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  Acreditados
                </button>
              </div>

              {config.filterField && filterOptions.length > 0 && (
                <select
                  value={selectedFilterValue}
                  onChange={(e) => setSelectedFilterValue(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs font-medium focus:outline-none"
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

            <div className="hidden sm:flex items-center gap-3 text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[10px]">
                  ↵ Enter
                </kbd>
                Acreditar selección única
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[10px]">
                  ESC
                </kbd>
                Limpiar
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Lista de Asistentes + Historial en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna de Resultados (2 de 3) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL'
                ? `Resultados (${filteredAttendees.length})`
                : 'Puesto de Ingreso'}
            </h2>
          </div>

          {/* Estado vacío inicial */}
          {!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL' && (
            <Card className="text-center py-10 px-4">
              <CardContent className="space-y-2">
                <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Listo para escanear o buscar
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Escribí el DNI o apellido en la barra de arriba. Si hay un único resultado, podés acreditarlo directamente con la tecla <b>Enter</b>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sin resultados encontrados */}
          {(query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL') && filteredAttendees.length === 0 && (
            <Card className="border-rose-200 dark:border-rose-900/60 text-center py-8 px-4">
              <CardContent className="space-y-2">
                <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  No se encontró ningún asistente
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  No existe nadie en la nómina con el criterio <strong className="text-zinc-900 dark:text-zinc-100 font-mono">"{query}"</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="mt-2"
                >
                  Limpiar búsqueda
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tarjetas de Asistentes estilo pass.in + shadcn/ui */}
          {filteredAttendees.map((att) => {
            const isJustDone = justAccredited?.dni === att.dni;

            return (
              <Card
                key={att.id || att.dni}
                className={cn(
                  'transition-all',
                  isJustDone && 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20',
                  att.acreditado && !isJustDone && 'border-amber-200/90 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10'
                )}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Datos del Participante (Attendee Model) */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div 
                      className={cn(
                        'w-9 h-9 rounded-md flex items-center justify-center font-bold font-mono text-sm shrink-0 border',
                        att.acreditado
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      )}
                    >
                      {att.nombre ? att.nombre.charAt(0).toUpperCase() : 'A'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {att.apellido}, {att.nombre}
                        </h3>

                        {att.acreditado ? (
                          <Badge variant="warning" className="gap-1 font-mono">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Acreditado
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Pendiente
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                        DNI {att.dni}
                      </p>

                      {/* Campos Dinámicos / Categoría de Entrada */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {config.visibleFields?.map((field) => {
                          const val = att.dynamicFields?.[field];
                          if (!val) return null;
                          const label = labels[field] || field;

                          return (
                            <span
                              key={field}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                            >
                              <span className="text-zinc-400 mr-1">{label}:</span>
                              <strong className="text-zinc-900 dark:text-zinc-100">{val}</strong>
                            </span>
                          );
                        })}
                      </div>

                      {/* Metadatos de Check-In (meeting-gate pattern) */}
                      {att.acreditado && (
                        <div className="mt-2.5 p-2 rounded bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Acreditado el <strong>{formatDate(att.fechaAcreditacion)}</strong> a las{' '}
                            <span className="font-mono font-semibold">{formatTime(att.fechaAcreditacion)}</span>{' '}
                            {att.operador && <>• {att.operador}</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Check-in */}
                  <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1.5 shrink-0">
                    {!att.acreditado ? (
                      <Button
                        variant="success"
                        size="default"
                        onClick={() => handleAccreditAction(att)}
                        disabled={!isOnline}
                        className="w-full sm:w-36 gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Acreditar</span>
                        <CornerDownLeft className="w-3 h-3 text-emerald-200" />
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-1 w-full sm:w-36">
                        <div className="py-1 px-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 text-center">
                          Ingresado
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUndoModal(att)}
                          className="text-[11px] text-zinc-400 hover:text-rose-600 h-7"
                        >
                          Deshacer ingreso
                        </Button>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Columna Lateral: Registro de Últimos Acreditados (Historial en Puerta) */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Últimos Acreditados</span>
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Puerta
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {recentAccreditations.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  Aún no hay acreditaciones en esta sesión.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAccreditations.map((item, idx) => (
                    <div
                      key={`${item.dni}-${idx}`}
                      className="p-2 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {item.nombre} {item.apellido}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-400">
                          DNI {item.dni}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                          {formatTime(item.fechaAcreditacion)}
                        </span>
                        <button
                          onClick={() => setShowUndoModal(item)}
                          className="text-[10px] text-zinc-400 hover:text-rose-600 hover:underline"
                        >
                          Deshacer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal Deshacer Acreditación */}
      {showUndoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-2 border border-rose-200 dark:border-rose-900">
                <RotateCcw className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold">
                ¿Deshacer acreditación de ingreso?
              </CardTitle>
              <CardDescription>
                El asistente volverá a figurar como <strong>pendiente</strong> en todas las puertas del evento:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {showUndoModal.nombre} {showUndoModal.apellido}
                </p>
                <p className="font-mono text-zinc-500 mt-0.5">DNI {showUndoModal.dni}</p>
              </div>
              <div className="flex space-x-2.5 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUndoModal(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={async () => {
                    await onUndoAccredit(showUndoModal.dni);
                    setRecentAccreditations((prev) => prev.filter((p) => p.dni !== showUndoModal.dni));
                    setShowUndoModal(null);
                    searchInputRef.current?.focus();
                  }}
                >
                  Sí, revertir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
