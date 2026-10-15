import React from 'react';
import { 
  CheckCircle2, 
  Settings, 
  BarChart3, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  FileSpreadsheet, 
  Lock, 
  LogOut, 
  Sun, 
  Moon, 
  Sparkles, 
  ClipboardList,
  MapPin,
  Flame
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  eventName, 
  eventLogo,
  stats, 
  isOnline, 
  serverConnected,
  isFirestore,
  soundEnabled, 
  setSoundEnabled,
  operatorName,
  puntoAcceso,
  onOpenPuntoModal,
  isAdmin,
  onOpenAdminModal,
  onLogoutAdmin,
  isDark,
  onToggleTheme
}) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Nombre del Evento */}
          <div className="flex items-center space-x-3 min-w-0">
            {eventLogo ? (
              <img 
                src={eventLogo} 
                alt="Logo del evento" 
                className="h-9 w-9 object-contain rounded-md border border-zinc-200 dark:border-zinc-800 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shrink-0">
                {eventName ? eventName.charAt(0).toUpperCase() : 'E'}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight truncate max-w-[170px] sm:max-w-xs md:max-w-md">
                {eventName || 'Acreditación de Eventos'}
              </h1>
              
              {/* Información de Rol y Punto de Acceso */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium truncate">
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Panel Administrador
                  </span>
                ) : (
                  <button
                    onClick={onOpenPuntoModal}
                    className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition group"
                    title="Hacé clic para cambiar de puerta o nombre de operador"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0 group-hover:scale-110 transition" />
                    <span className="truncate underline decoration-dotted">{puntoAcceso || 'Puerta 1'}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">({operatorName})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navegación por Pestañas (Solo visible en modo Administrador) */}
          {isAdmin ? (
            <nav className="hidden xl:flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold">
              <button
                onClick={() => setCurrentTab('operator')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'operator'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Vista Puerta
              </button>
              <button
                onClick={() => setCurrentTab('stats')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'stats'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Métricas en Vivo
              </button>
              <button
                onClick={() => setCurrentTab('datasource')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'datasource'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Fuente de Datos
              </button>
              <button
                onClick={() => setCurrentTab('firebase')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${
                  currentTab === 'firebase'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Firebase Cloud</span>
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'settings'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Campos
              </button>
              <button
                onClick={() => setCurrentTab('branding')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'branding'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Marca y Logo
              </button>
              <button
                onClick={() => setCurrentTab('audit')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'audit'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Auditoría
              </button>
            </nav>
          ) : (
            /* Vista Operador: Contador conciso en el header */
            <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                {stats.accredited} / {stats.total} ingresados ({stats.rate}%)
              </span>
            </div>
          )}

          {/* Acciones de la derecha: Tema, Sonido, Conexión y Rol */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Indicador de conexión / Firebase en tiempo real */}
            <div 
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                isOnline && isFirestore
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : isOnline && serverConnected
                  ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
                  : !isOnline
                  ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}
              title={
                !isOnline 
                  ? 'Sin conexión a internet' 
                  : isFirestore 
                  ? 'Sincronización en vivo con Cloud Firestore activa' 
                  : serverConnected 
                  ? 'Conectado a servidor local' 
                  : 'Modo local sin base en tiempo real'
              }
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isOnline && (isFirestore || serverConnected) ? 'bg-emerald-500 animate-pulse' : !isOnline ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <span className="hidden md:inline font-mono text-[11px]">
                {!isOnline ? 'Sin internet' : isFirestore ? 'En vivo (Cloud)' : serverConnected ? 'En línea' : 'Local'}
              </span>
            </div>

            {/* Toggle Modo Oscuro */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Toggle de sonido */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sonidos activados' : 'Sonidos silenciados'}
              className={`p-2 rounded-lg text-xs font-medium border transition ${
                soundEnabled 
                  ? 'text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800' 
                  : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Botón de Rol: Entrar a Admin o Salir */}
            {isAdmin ? (
              <button
                onClick={onLogoutAdmin}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition"
                title="Cerrar sesión de administrador y volver a modo operador"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Admin</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition"
                title="Ingresar como Administrador"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>

        </div>

        {/* Barra secundaria en móviles para Admin */}
        {isAdmin && (
          <div className="xl:hidden flex items-center overflow-x-auto py-2 space-x-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium no-scrollbar">
            <button
              onClick={() => setCurrentTab('operator')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'operator' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Puerta
            </button>
            <button
              onClick={() => setCurrentTab('stats')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'stats' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Métricas en Vivo
            </button>
            <button
              onClick={() => setCurrentTab('datasource')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'datasource' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Datos
            </button>
            <button
              onClick={() => setCurrentTab('firebase')}
              className={`px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1 ${
                currentTab === 'firebase' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Firebase</span>
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'settings' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Campos
            </button>
            <button
              onClick={() => setCurrentTab('branding')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'branding' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Logo
            </button>
            <button
              onClick={() => setCurrentTab('audit')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'audit' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Auditoría
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
