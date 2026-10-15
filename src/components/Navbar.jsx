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
  Flame,
  Search,
  Command
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

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
  onToggleTheme,
  onOpenCommandPalette
}) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo y Nombre del Evento */}
          <div className="flex items-center space-x-3 min-w-0">
            {eventLogo ? (
              <img 
                src={eventLogo} 
                alt="Logo del evento" 
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-md border border-zinc-200 dark:border-zinc-800 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                {eventName ? eventName.charAt(0).toUpperCase() : 'E'}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm md:text-base leading-tight truncate max-w-[140px] sm:max-w-xs">
                {eventName || 'Acreditación de Eventos'}
              </h1>
              
              {/* Información de Rol y Punto de Acceso */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium truncate">
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Panel Administrador
                  </span>
                ) : (
                  <button
                    onClick={onOpenPuntoModal}
                    className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition group text-[11px]"
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

          {/* Buscador Rápido Global (Cmd+K) estilo shadcn-admin */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-normal text-zinc-500">Buscar asistente o acción...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-500">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          {/* Navegación por Pestañas (Solo visible en modo Administrador) */}
          {isAdmin ? (
            <nav className="hidden xl:flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold">
              <button
                onClick={() => setCurrentTab('operator')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'operator'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                Puerta
              </button>
              <button
                onClick={() => setCurrentTab('stats')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'stats'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                Métricas
              </button>
              <button
                onClick={() => setCurrentTab('datasource')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'datasource'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                Fuente de Datos
              </button>
              <button
                onClick={() => setCurrentTab('firebase')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium flex items-center gap-1',
                  currentTab === 'firebase'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                <Flame className="w-3 h-3 text-amber-500" />
                <span>Cloud</span>
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'settings'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                Campos
              </button>
              <button
                onClick={() => setCurrentTab('branding')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'branding'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                Marca
              </button>
              <button
                onClick={() => setCurrentTab('audit')}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors text-xs font-medium',
                  currentTab === 'audit'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
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

          {/* Acciones de la derecha: Command Móvil, Tema, Sonido, Conexión y Rol */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Botón Command en móvil */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onOpenCommandPalette}
              className="md:hidden"
              title="Buscar (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
            </Button>

            {/* Indicador de conexión / Firebase en tiempo real */}
            <Badge
              variant={!isOnline ? 'destructive' : isFirestore ? 'success' : serverConnected ? 'info' : 'outline'}
              className="hidden sm:inline-flex gap-1.5 py-1 font-mono text-[10px]"
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
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                isOnline && (isFirestore || serverConnected) ? 'bg-emerald-500 animate-pulse' : !isOnline ? 'bg-rose-500' : 'bg-amber-500'
              )} />
              <span>
                {!isOnline ? 'Offline' : isFirestore ? 'Cloud' : serverConnected ? 'Online' : 'Local'}
              </span>
            </Badge>

            {/* Toggle Modo Oscuro */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>

            {/* Toggle de sonido */}
            <Button
              variant={soundEnabled ? 'outline' : 'destructive'}
              size="icon-sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sonidos activados' : 'Sonidos silenciados'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>

            {/* Botón de Rol: Entrar a Admin o Salir */}
            {isAdmin ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onLogoutAdmin}
                className="gap-1 text-xs"
                title="Cerrar sesión de administrador y volver a modo operador"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Cerrar Admin</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAdminModal}
                className="gap-1 text-xs"
                title="Ingresar como Administrador"
              >
                <Lock className="w-3 h-3 text-zinc-400" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
          </div>

        </div>

        {/* Barra secundaria en móviles para Admin */}
        {isAdmin && (
          <div className="xl:hidden flex items-center overflow-x-auto py-2 space-x-1 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium no-scrollbar">
            <button
              onClick={() => setCurrentTab('operator')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'operator' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Puerta
            </button>
            <button
              onClick={() => setCurrentTab('stats')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'stats' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Métricas
            </button>
            <button
              onClick={() => setCurrentTab('datasource')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'datasource' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Datos
            </button>
            <button
              onClick={() => setCurrentTab('firebase')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium flex items-center gap-1',
                currentTab === 'firebase' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Cloud</span>
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'settings' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Campos
            </button>
            <button
              onClick={() => setCurrentTab('branding')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'branding' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Marca
            </button>
            <button
              onClick={() => setCurrentTab('audit')}
              className={cn(
                'px-2 py-0.5 rounded shrink-0 text-xs font-medium',
                currentTab === 'audit' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Auditoría
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
