import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Settings, 
  Flame, 
  Image, 
  ShieldCheck, 
  History, 
  LogOut, 
  Sun, 
  Moon, 
  ExternalLink,
  Users,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import StatsView from './components/StatsView';
import DataSourceView from './components/DataSourceView';
import SettingsView from './components/SettingsView';
import BrandingSettingsView from './components/BrandingSettingsView';
import AuditLogsView from './components/AuditLogsView';
import FirebaseSettingsView from './components/FirebaseSettingsView';
import AdminUsersView from './components/AdminUsersView';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { onAuthChange, logoutUser } from './services/auth';
import { apiService } from './services/api';
import { subscribeToAttendees, subscribeToEvent } from './services/firebase';
import { fetchGoogleSheetViaCSV, fetchGoogleSheetViaAPI } from './utils/googleSheets';
import { cn } from './lib/utils';

export default function AdminApp() {
  const [currentTab, setCurrentTab] = useState('stats');
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Información del Evento
  const [eventName, setEventName] = useState('Mi Evento');
  const [eventLogo, setEventLogo] = useState(null);
  const [attendees, setAttendees] = useState([]);
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
    pollingInterval: 60,
    googleSheetUrl: '',
    googleApiKey: '',
  });

  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastSyncSource, setLastSyncSource] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pollingCountdown, setPollingCountdown] = useState(60);

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

  // Verificar Autenticación de Firebase y Rol de Administrador
  useEffect(() => {
    const unsubscribe = onAuthChange((authUser, authorized) => {
      setUser(authUser);
      setIsAdmin(authorized);
      setAuthLoading(false);

      if (!authUser || !authorized) {
        // Redirigir a login si no está autenticado o no es admin
        window.location.href = './login.html';
      }
    });

    return () => unsubscribe();
  }, []);

  // Suscripción en tiempo real a Firebase Firestore para nómina y evento
  useEffect(() => {
    if (!isAdmin) return;

    // 1. Suscribirse a cambios en el documento del evento (nombre, logo, config)
    const unsubEvent = subscribeToEvent('main-event', (eventData) => {
      if (!eventData) return;
      if (eventData.name) setEventName(eventData.name);
      if (eventData.logo !== undefined) setEventLogo(eventData.logo);
      if (eventData.config) setConfig((prev) => ({ ...prev, ...eventData.config }));
      if (eventData.lastUpdated) setLastSyncTime(eventData.lastUpdated);
      if (eventData.lastSyncSource) setLastSyncSource(eventData.lastSyncSource);
    });

    // 2. Suscribirse a la nómina de asistentes en tiempo real
    const unsubAttendees = subscribeToAttendees('main-event', (liveAttendees) => {
      setAttendees(liveAttendees);
    });

    return () => {
      unsubEvent();
      unsubAttendees();
    };
  }, [isAdmin]);

  // Polling Periódico para Google Sheets si está configurado
  useEffect(() => {
    const intervalSeconds = Number(config.pollingInterval) || 0;
    if (!config.googleSheetUrl || intervalSeconds <= 0) return;

    setPollingCountdown(intervalSeconds);
    const timer = setInterval(() => {
      setPollingCountdown((prev) => {
        if (prev <= 1) {
          triggerBackgroundSheetSync();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.googleSheetUrl, config.pollingInterval, config.googleApiKey]);

  const triggerBackgroundSheetSync = async () => {
    if (!config.googleSheetUrl || isSyncing) return;
    try {
      let parsed;
      if (config.googleApiKey && config.googleApiKey.trim()) {
        parsed = await fetchGoogleSheetViaAPI(config.googleSheetUrl, config.googleApiKey);
      } else {
        parsed = await fetchGoogleSheetViaCSV(config.googleSheetUrl);
      }

      if (parsed && parsed.attendees) {
        await apiService.syncAttendees(parsed.attendees, 'google-sheets', eventName);
        setLastSyncTime(new Date().toISOString());
        setLastSyncSource('google-sheets');
      }
    } catch (err) {
      console.warn('[Polling] Error al consultar Google Sheet:', err.message);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = './login.html';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        <p className="text-xs text-zinc-400 font-mono">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 rounded-xl p-6 text-center space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Acceso Denegado</h2>
          <p className="text-xs text-zinc-500">
            Tu cuenta ({user?.email}) no cuenta con permisos de administrador en este evento.
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout} className="mt-2">
            Volver a Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header del Panel de Administración */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Logo y Nombre del Evento */}
            <div className="flex items-center space-x-3 min-w-0">
              {eventLogo ? (
                <img 
                  src={eventLogo} 
                  alt="Logo del evento" 
                  className="h-8 w-8 object-contain rounded-md border border-zinc-200 dark:border-zinc-800 bg-white p-0.5 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                  {eventName ? eventName.charAt(0).toUpperCase() : 'A'}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight truncate max-w-[160px] sm:max-w-xs">
                  {eventName || 'Panel de Administración'}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                  <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                    ADMIN
                  </Badge>
                  <span className="truncate max-w-[140px] sm:max-w-none">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Navegación de Pestañas (Desktop) */}
            <nav className="hidden lg:flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium">
              {[
                { id: 'stats', label: 'Métricas', icon: BarChart3 },
                { id: 'datasource', label: 'Fuente de Datos', icon: FileSpreadsheet },
                { id: 'settings', label: 'Campos', icon: Settings },
                { id: 'branding', label: 'Marca / Logo', icon: Image },
                { id: 'admins', label: 'Administradores', icon: Users },
                { id: 'audit', label: 'Auditoría', icon: History },
                { id: 'firebase', label: 'Cloud', icon: Flame },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 text-xs font-medium',
                      isActive
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Acciones de la derecha */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              
              {/* Enlace a Vista Pública */}
              <a
                href="./index.html"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Abrir vista de acreditación de puerta en una pestaña nueva"
              >
                <span>Puerta</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>

              {/* Toggle Tema Oscuro */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setIsDark((prev) => !prev)}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>

              {/* Botón Cerrar Sesión */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="gap-1 text-xs"
                title="Cerrar sesión de administrador"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>

          </div>

          {/* Navegación móvil horizontal */}
          <div className="lg:hidden flex items-center overflow-x-auto py-2 space-x-1 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium no-scrollbar">
            {[
              { id: 'stats', label: 'Métricas' },
              { id: 'datasource', label: 'Datos' },
              { id: 'settings', label: 'Campos' },
              { id: 'branding', label: 'Marca' },
              { id: 'admins', label: 'Admins' },
              { id: 'audit', label: 'Auditoría' },
              { id: 'firebase', label: 'Cloud' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded shrink-0 text-xs font-medium',
                  currentTab === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 pb-16">
        {currentTab === 'stats' && (
          <StatsView
            attendees={attendees}
            config={config}
            eventName={eventName}
            onResetAccreditations={async () => {
              await apiService.resetAccreditations();
            }}
            onToggleAccredit={(dni, acc) => apiService.accredit(dni, acc)}
          />
        )}

        {currentTab === 'datasource' && (
          <DataSourceView
            onSyncAttendees={async (newAttendees, source) => {
              setIsSyncing(true);
              try {
                const res = await apiService.syncAttendees(newAttendees, source, eventName);
                setLastSyncTime(new Date().toISOString());
                setLastSyncSource(source);
                return res;
              } finally {
                setIsSyncing(false);
              }
            }}
            config={config}
            onSaveConfig={async (newConfig) => {
              setConfig(newConfig);
              await apiService.saveConfig(newConfig, eventName);
            }}
            lastSyncTime={lastSyncTime}
            lastSyncSource={lastSyncSource}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            pollingCountdown={pollingCountdown}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            config={config}
            onSaveConfig={async (newConfig) => {
              setConfig(newConfig);
              await apiService.saveConfig(newConfig, eventName);
            }}
            attendees={attendees}
            operatorName="Administrador"
            setOperatorName={() => {}}
            soundEnabled={true}
            setSoundEnabled={() => {}}
            autoClearSearch={true}
            setAutoClearSearch={() => {}}
          />
        )}

        {currentTab === 'branding' && (
          <BrandingSettingsView
            eventName={eventName}
            eventLogo={eventLogo}
            onSaveBranding={async (name, logo) => {
              setEventName(name);
              setEventLogo(logo);
              await apiService.saveBranding(name, logo);
            }}
            config={config}
            onSaveConfig={async (newConfig) => {
              setConfig(newConfig);
              await apiService.saveConfig(newConfig, eventName);
            }}
          />
        )}

        {currentTab === 'admins' && (
          <AdminUsersView currentUserEmail={user?.email} />
        )}

        {currentTab === 'audit' && (
          <AuditLogsView />
        )}

        {currentTab === 'firebase' && (
          <FirebaseSettingsView />
        )}
      </main>

    </div>
  );
}
