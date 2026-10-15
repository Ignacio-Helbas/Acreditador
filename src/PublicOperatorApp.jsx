import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MapPin, 
  ShieldAlert, 
  CornerDownLeft, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import PuntoAccesoModal from './components/PuntoAccesoModal';
import { apiService } from './services/api';
import { subscribeToAttendees, subscribeToEvent } from './services/firebase';
import { playSuccessSound, playWarningSound } from './utils/sound';
import { formatTime, formatDate, cn } from './lib/utils';

export default function PublicOperatorApp() {
  const [attendees, setAttendees] = useState([]);
  const [eventName, setEventName] = useState('Acreditación de Evento');
  const [eventLogo, setEventLogo] = useState(null);
  const [config, setConfig] = useState({
    visibleFields: ['empresa', 'cargo', 'tipoEntrada', 'mesa'],
    fieldLabels: {
      dni: 'DNI / Documento',
      nombre: 'Nombre',
      apellido: 'Apellido',
      empresa: 'Empresa',
      cargo: 'Cargo',
      tipoEntrada: 'Tipo de Entrada',
      mesa: 'Mesa / Sector',
    },
    filterField: '',
  });

  const [query, setQuery] = useState('');
  const [selectedFilterValue, setSelectedFilterValue] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ACCREDITED'
  const [justAccredited, setJustAccredited] = useState(null);
  const [collisionAlert, setCollisionAlert] = useState(null);
  const [recentAccreditations, setRecentAccreditations] = useState([]);
  const [isPuntoModalOpen, setIsPuntoModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Punto de Acceso y Operador local
  const [puntoAcceso, setPuntoAcceso] = useState(() => apiService.getPuntoAcceso());
  const [operatorName, setOperatorName] = useState(() => apiService.getOperatorName());

  // Preferencias locales
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('acreditador_sound') !== 'false');
  const [autoClearSearch, setAutoClearSearch] = useState(() => localStorage.getItem('acreditador_autoclear') !== 'false');

  const searchInputRef = useRef(null);

  // Modo Oscuro
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('acreditador_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('acreditador_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('acreditador_theme', 'light');
    }
  }, [isDark]);

  // Detector de conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Foco inmediato en el buscador
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Limpiar banner de acreditado tras 4.5 segundos
  useEffect(() => {
    if (!justAccredited) return;
    const timer = setTimeout(() => setJustAccredited(null), 4500);
    return () => clearTimeout(timer);
  }, [justAccredited]);

  // Suscripción en tiempo real a Firebase Firestore
  useEffect(() => {
    // 1. Datos del evento (nombre, logo, config)
    const unsubEvent = subscribeToEvent('main-event', (data) => {
      if (!data) return;
      if (data.name) setEventName(data.name);
      if (data.logo !== undefined) setEventLogo(data.logo);
      if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
    });

    // 2. Asistentes en vivo
    const unsubAttendees = subscribeToAttendees('main-event', (liveAttendees) => {
      setAttendees(liveAttendees);
    });

    return () => {
      unsubEvent();
      unsubAttendees();
    };
  }, []);

  const normalize = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const filterOptions = useMemo(() => {
    if (!config.filterField) return [];
    const values = new Set();
    attendees.forEach((a) => {
      const val = a.dynamicFields?.[config.filterField];
      if (val) values.add(String(val).trim());
    });
    return Array.from(values).sort();
  }, [attendees, config.filterField]);

  // Filtrado de asistentes
  const filteredAttendees = useMemo(() => {
    if (!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL') {
      return [];
    }

    const cleanQ = normalize(query);

    return attendees.filter((att) => {
      if (statusFilter === 'PENDING' && att.acreditado) return false;
      if (statusFilter === 'ACCREDITED' && !att.acreditado) return false;

      if (config.filterField && selectedFilterValue !== 'ALL') {
        const attVal = att.dynamicFields?.[config.filterField];
        if (attVal !== selectedFilterValue) return false;
      }

      if (!cleanQ) return true;

      const attDni = normalize(att.dni);
      const attNombre = normalize(att.nombre);
      const attApellido = normalize(att.apellido);
      const attCompleto = `${attNombre} ${attApellido}`;

      if (attDni.includes(cleanQ)) return true;
      if (attNombre.includes(cleanQ) || attApellido.includes(cleanQ) || attCompleto.includes(cleanQ)) {
        return true;
      }

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

  // Acción de Acreditar con resolución atómica
  const handleAccreditAction = async (attendee) => {
    setCollisionAlert(null);
    try {
      const result = await apiService.accredit(attendee.dni, true);
      if (result && result.success) {
        if (soundEnabled) playSuccessSound();

        const nowIso = new Date().toISOString();
        const accreditedRecord = {
          ...attendee,
          acreditado: true,
          fechaAcreditacion: nowIso,
          puntoAcceso: result.attendee?.puntoAcceso || puntoAcceso,
          operador: result.attendee?.operador || operatorName,
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
        if (soundEnabled) playWarningSound();
        setCollisionAlert({
          attendee: result.attendee || attendee,
          error: result.error || 'Este asistente ya fue acreditado desde otro punto de acceso.',
        });
      }
    } catch (err) {
      if (soundEnabled) playWarningSound();
      setCollisionAlert({
        attendee,
        error: err.message || 'Error al intentar confirmar la acreditación.',
      });
    }
  };

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

  const totalCount = attendees.length;
  const accreditedCount = attendees.filter((a) => a.acreditado).length;
  const pendingCount = totalCount - accreditedCount;
  const percentage = totalCount > 0 ? Math.round((accreditedCount / totalCount) * 100) : 0;
  const labels = config.fieldLabels || {};

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header Público Limpio (CERO referencias a Admin) */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            
            {/* Logo y Nombre del Evento */}
            <div className="flex items-center space-x-3 min-w-0">
              {eventLogo ? (
                <img 
                  src={eventLogo} 
                  alt="Logo del evento" 
                  className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-md border border-zinc-200 dark:border-zinc-800 bg-white p-0.5 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 font-mono">
                  {eventName ? eventName.charAt(0).toUpperCase() : 'E'}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight truncate max-w-[180px] sm:max-w-sm">
                  {eventName || 'Acreditación de Eventos'}
                </h1>
                
                {/* Selector de Punto de Acceso para Operador */}
                <button
                  onClick={() => setIsPuntoModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition mt-0.5"
                  title="Cambiar punto de acceso o nombre de operador"
                >
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate underline decoration-dotted">{puntoAcceso || 'Puerta 1'}</span>
                  <span className="text-[10px] text-zinc-400">({operatorName})</span>
                </button>
              </div>
            </div>

            {/* Contador Compacto y Controles de Puerta */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                  {accreditedCount} / {totalCount} ({percentage}%)
                </span>
              </div>

              {/* Indicador de red */}
              <Badge
                variant={isOnline ? 'success' : 'destructive'}
                className="gap-1 font-mono text-[10px]"
                title={isOnline ? 'Conectado a la base en tiempo real' : 'Sin conexión'}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span className="hidden md:inline">{isOnline ? 'En vivo' : 'Offline'}</span>
              </Badge>

              {/* Toggle Sonido */}
              <Button
                variant={soundEnabled ? 'outline' : 'destructive'}
                size="icon-sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Sonido activado' : 'Silenciado'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>

              {/* Toggle Tema Oscuro */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setIsDark((prev) => !prev)}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        
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
                  DNI {justAccredited.dni} • {justAccredited.puntoAcceso || puntoAcceso}
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

        {/* Banner de Conflicto Concurrente (Acceso Previo) */}
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
                    YA ACREDITADO
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

        {/* Sin conexión */}
        {!isOnline && (
          <div className="bg-rose-600 text-white rounded-lg p-3 shadow-sm flex items-center gap-2 text-xs font-medium">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Sin conexión a internet. La acreditación está pausada para evitar duplicados entre puertas.</span>
          </div>
        )}

        {/* BUSCADOR PROTAGONISTA DE DNI */}
        <Card className="border-zinc-200/90 dark:border-zinc-800">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ingresá el número de DNI o apellido del asistente..."
                className="w-full pl-12 pr-12 py-3.5 sm:py-4 text-lg sm:text-2xl font-bold placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
                  className="absolute right-3.5 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Barra de Filtros y Atajos */}
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
                  Acreditar
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

        {/* Resultados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {query.trim() || selectedFilterValue !== 'ALL' || statusFilter !== 'ALL'
                  ? `Resultados (${filteredAttendees.length})`
                  : 'Puesto de Ingreso'}
              </h2>
            </div>

            {/* Estado Inicial */}
            {!query.trim() && selectedFilterValue === 'ALL' && statusFilter === 'ALL' && (
              <Card className="text-center py-10 px-4">
                <CardContent className="space-y-2">
                  <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Listo para acreditar
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Ingresá el DNI del asistente en el buscador superior. Si hay un único resultado podés acreditarlo presionando <b>Enter</b>.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sin Resultados */}
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
                    No figura nadie registrado con <strong className="text-zinc-900 dark:text-zinc-100 font-mono">"{query}"</strong>.
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

            {/* Tarjetas de Asistentes */}
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

                        {/* Campos dinámicos */}
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

                        {/* Detalle si ya fue acreditado */}
                        {att.acreditado && (
                          <div className="mt-2.5 p-2 rounded bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Ingresó el <strong>{formatDate(att.fechaAcreditacion)}</strong> a las{' '}
                              <span className="font-mono font-semibold">{formatTime(att.fechaAcreditacion)}</span>{' '}
                              {att.operador && <>• {att.operador}</>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón de Acreditar */}
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
                        <div className="py-1 px-3 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 text-center w-full sm:w-36">
                          Ingresado
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Columna Lateral: Últimos Acreditados */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Últimos Ingresos</span>
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {puntoAcceso || 'Puerta'}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

      </main>

      {/* Modal para configurar Punto de Acceso local */}
      <PuntoAccesoModal
        isOpen={isPuntoModalOpen}
        onClose={() => setIsPuntoModalOpen(false)}
        currentPunto={puntoAcceso}
        onSavePunto={(p) => {
          apiService.setPuntoAcceso(p);
          setPuntoAcceso(p);
        }}
        currentOperator={operatorName}
        onSaveOperator={(op) => {
          apiService.setOperatorName(op);
          setOperatorName(op);
        }}
      />

    </div>
  );
}
