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
  ClipboardList
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  eventName, 
  eventLogo,
  stats, 
  connectedOperators, 
  isOnline, 
  serverConnected,
  soundEnabled, 
  setSoundEnabled,
  operatorName,
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
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {eventName || 'Acreditación de Evento'}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <span className="truncate">{isAdmin ? 'Panel de Administración' : `${operatorName}`}</span>
              </div>
            </div>
          </div>

          {/* Navegación por Pestañas (Solo visible en modo Administrador) */}
          {isAdmin ? (
            <nav className="hidden lg:flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold">
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
                onClick={() => setCurrentTab('stats')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'stats'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Métricas y Exportar
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`px-3 py-1.5 rounded-md transition ${
                  currentTab === 'settings'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Campos y Filtros
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
                {stats.accredited} / {stats.total} acreditados ({stats.rate}%)
              </span>
            </div>
          )}

          {/* Acciones de la derecha: Tema, Sonido, Conexión y Rol */}
          <div className="flex items-center space-x-2">
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

            {/* Indicador de conexión */}
            <div 
              className={`p-2 rounded-lg text-xs border ${
                serverConnected && isOnline
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
              }`}
              title={serverConnected ? `En línea con ${connectedOperators} operador(es)` : 'Modo local sin servidor'}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>

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
          <div className="lg:hidden flex items-center overflow-x-auto py-2 space-x-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium no-scrollbar">
            <button
              onClick={() => setCurrentTab('operator')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'operator' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Puerta
            </button>
            <button
              onClick={() => setCurrentTab('datasource')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'datasource' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Datos
            </button>
            <button
              onClick={() => setCurrentTab('stats')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'stats' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Métricas
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'settings' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Campos
            </button>
            <button
              onClick={() => setCurrentTab('branding')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'branding' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Logo
            </button>
            <button
              onClick={() => setCurrentTab('audit')}
              className={`px-2.5 py-1 rounded-md shrink-0 ${
                currentTab === 'audit' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'
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
