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
  Unlock,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  eventName, 
  setEventName, 
  stats, 
  connectedOperators, 
  isOnline, 
  serverConnected,
  soundEnabled, 
  setSoundEnabled,
  operatorName,
  isAdmin,
  onOpenAdminModal,
  onLogoutAdmin
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Nombre del Evento */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                {isAdmin ? (
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="font-bold text-slate-800 text-lg hover:bg-slate-100/80 px-1.5 py-0.5 rounded transition border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none w-52 sm:w-64"
                    title="Haz clic para renombrar el evento (Modo Administrador)"
                  />
                ) : (
                  <span className="font-bold text-slate-800 text-lg px-1.5 py-0.5 block truncate max-w-[200px] sm:max-w-xs">
                    {eventName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-1.5">
                <span>{isAdmin ? 'Modo Administrador' : 'Modo Operador'}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {operatorName}
                </span>
              </p>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {/* Pestaña Acreditar (Siempre visible) */}
            <button
              onClick={() => setCurrentTab('operator')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'operator'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acreditar</span>
              {stats.total > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  currentTab === 'operator' 
                    ? 'bg-emerald-700/80 text-emerald-100' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {stats.accredited}/{stats.total}
                </span>
              )}
            </button>

            {/* Pestañas exclusivas para Administradores */}
            {isAdmin ? (
              <>
                <button
                  onClick={() => setCurrentTab('datasource')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentTab === 'datasource'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Fuente de Datos</span>
                </button>

                <button
                  onClick={() => setCurrentTab('stats')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentTab === 'stats'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Métricas y Exportar</span>
                </button>

                <button
                  onClick={() => setCurrentTab('settings')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentTab === 'settings'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configuración</span>
                </button>

                <button
                  onClick={onLogoutAdmin}
                  title="Bloquear a Modo Operador"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Bloquear a Operador</span>
                </button>
              </>
            ) : (
              /* Botón de Acceso para Administrador cuando se está en Modo Operador */
              <button
                onClick={onOpenAdminModal}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 transition"
                title="Desbloquear panel de administrador para modificar base de datos o configuraciones"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Acceso Administrador</span>
              </button>
            )}
          </nav>

          {/* Estado de Red / Sonido / Multi-operador */}
          <div className="flex items-center space-x-2">
            {/* Toggle de sonido */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sonidos activados (clic para silenciar)' : 'Sonidos silenciados (clic para activar)'}
              className={`p-2 rounded-lg text-xs font-medium transition border ${
                soundEnabled 
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Badge de estado de sincronización */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                serverConnected && isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : !isOnline
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={
                serverConnected 
                  ? `Sincronización en vivo activa. ${connectedOperators} operadores en red.` 
                  : 'Modo autónomo/offline activo. Los datos se guardan en el navegador.'
              }
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden md:inline">
                {serverConnected ? `${connectedOperators} op.` : isOnline ? 'Local' : 'Offline'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
