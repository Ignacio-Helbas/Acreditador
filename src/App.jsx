import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import OperatorView from './components/OperatorView';
import DataSourceView from './components/DataSourceView';
import SettingsView from './components/SettingsView';
import StatsView from './components/StatsView';
import BrandingSettingsView from './components/BrandingSettingsView';
import AuditLogsView from './components/AuditLogsView';
import FirebaseSettingsView from './components/FirebaseSettingsView';
import AdminPinModal from './components/AdminPinModal';
import PuntoAccesoModal from './components/PuntoAccesoModal';
import LoadingScreen from './components/LoadingScreen';
import { apiService } from './services/api';
import { playSuccessSound, playWarningSound } from './utils/sound';
import { fetchGoogleSheetViaCSV, fetchGoogleSheetViaAPI } from './utils/googleSheets';

export default function App() {
  const [currentTab, setCurrentTab] = useState('operator');
  const [isAdmin, setIsAdmin] = useState(() => apiService.isAdmin());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPuntoModalOpen, setIsPuntoModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
    adminPin: '1234',
  });

  // Estado de sincronización y red
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastSyncSource, setLastSyncSource] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pollingCountdown, setPollingCountdown] = useState(60);
  const [connectedOperators, setConnectedOperators] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverConnected, setServerConnected] = useState(false);
  const [isFirestore, setIsFirestore] = useState(() => apiService.isFirestore());

  // Punto de Acceso y Operador
  const [puntoAcceso, setPuntoAccesoState] = useState(() => apiService.getPuntoAcceso());
  const [operatorName, setOperatorNameState] = useState(() => apiService.getOperatorName());

  // Modo Oscuro con persistencia en localStorage y detección de preferencia de sistema
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

  // Preferencias de Operador
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('acreditador_sound') !== 'false';
  });
  const [autoClearSearch, setAutoClearSearch] = useState(() => {
    return localStorage.getItem('acreditador_autoclear') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('acreditador_sound', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('acreditador_autoclear', autoClearSearch);
  }, [autoClearSearch]);

  const handleSavePunto = (punto) => {
    apiService.setPuntoAcceso(punto);
    setPuntoAccesoState(punto);
  };

  const handleSaveOperator = (name) => {
    apiService.setOperatorName(name);
    setOperatorNameState(name);
  };

  // Carga inicial y conexión con WebSocket / Firestore / Backend
  useEffect(() => {
    let isMounted = true;

    // 1. Obtener estado inicial
    apiService.getInitialState().then(({ data, connectedOperators: ops }) => {
      if (!isMounted || !data) {
        setIsInitialLoading(false);
        return;
      }
      if (data.eventName) setEventName(data.eventName);
      if (data.eventLogo) setEventLogo(data.eventLogo);
      if (data.attendees) setAttendees(data.attendees);
      if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
      if (data.lastUpdated) setLastSyncTime(data.lastUpdated);
      if (data.lastSyncSource) setLastSyncSource(data.lastSyncSource);
      if (ops) setConnectedOperators(ops);

      setTimeout(() => {
        if (isMounted) setIsInitialLoading(false);
      }, 400);
    }).catch(() => {
      if (isMounted) setIsInitialLoading(false);
    });

    // 2. Conectar listeners en vivo (Firestore o WebSocket)
    apiService.connectWebSocket();
    setIsFirestore(apiService.isFirestore());

    // 3. Suscribirse a eventos en tiempo real
    const unsubscribe = apiService.subscribe((msg) => {
      if (!isMounted) return;

      switch (msg.type) {
        case 'INIT_STATE':
          if (msg.data) {
            if (msg.data.eventName) setEventName(msg.data.eventName);
            if (msg.data.eventLogo !== undefined) setEventLogo(msg.data.eventLogo);
            if (msg.data.attendees) setAttendees(msg.data.attendees);
            if (msg.data.config) setConfig((prev) => ({ ...prev, ...msg.data.config }));
            if (msg.data.lastUpdated) setLastSyncTime(msg.data.lastUpdated);
            if (msg.data.lastSyncSource) setLastSyncSource(msg.data.lastSyncSource);
          }
          if (msg.operatorCount) setConnectedOperators(msg.operatorCount);
          setServerConnected(true);
          break;

        case 'ACCREDITATION_UPDATED':
          if (msg.attendee) {
            setAttendees((prev) => {
              const cleanDni = String(msg.attendee.dni).trim().toLowerCase();
              return prev.map((a) =>
                String(a.dni).trim().toLowerCase() === cleanDni ? { ...a, ...msg.attendee } : a
              );
            });
          }
          if (msg.lastUpdated) setLastSyncTime(msg.lastUpdated);
          break;

        case 'EVENT_SYNCED':
          if (msg.data) {
            if (msg.data.attendees) setAttendees(msg.data.attendees);
            if (msg.data.lastUpdated) setLastSyncTime(msg.data.lastUpdated);
            if (msg.data.lastSyncSource) setLastSyncSource(msg.data.lastSyncSource);
          }
          break;

        case 'CONFIG_UPDATED':
          if (msg.config) setConfig((prev) => ({ ...prev, ...msg.config }));
          if (msg.eventName) setEventName(msg.eventName);
          break;

        case 'BRANDING_UPDATED':
          if (msg.eventName) setEventName(msg.eventName);
          if (msg.eventLogo !== undefined) setEventLogo(msg.eventLogo);
          break;

        case 'OPERATORS_COUNT':
          if (msg.count !== undefined) setConnectedOperators(msg.count);
          break;

        case 'EVENT_RESET':
          if (msg.data?.attendees) setAttendees(msg.data.attendees);
          break;

        case 'NETWORK_STATUS':
          setIsOnline(msg.online);
          break;

        case 'SERVER_STATUS':
          setServerConnected(msg.connected);
          if (msg.mode === 'firestore') setIsFirestore(true);
          break;

        case 'PUNTO_ACCESO_CHANGED':
          if (msg.puntoAcceso) setPuntoAccesoState(msg.puntoAcceso);
          break;

        default:
          break;
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Polling Periódico para Google Sheets (cada 60-120 segundos configurable)
  useEffect(() => {
    const intervalSeconds = Number(config.pollingInterval) || 0;
    if (!config.googleSheetUrl || intervalSeconds <= 0) {
      return;
    }

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

  // Sincronización en segundo plano con Google Sheets
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
      console.warn('[Polling] Error en consulta periódica de Google Sheet:', err.message);
    }
  };

  // Manejar acreditación
  const handleAccredit = async (dni) => {
    try {
      const res = await apiService.accredit(dni, true);
      if (res && res.success) {
        if (soundEnabled) playSuccessSound();
        return res;
      } else if (res && res.alreadyAccredited) {
        if (soundEnabled) playWarningSound();
        return res;
      }
    } catch (err) {
      if (soundEnabled) playWarningSound();
      throw err;
    }
  };

  // Manejar desacreditación / deshacer
  const handleUndoAccredit = async (dni) => {
    try {
      const res = await apiService.accredit(dni, false);
      return res;
    } catch (err) {
      console.error('Error al desacreditar:', err);
      throw err;
    }
  };

  // Sincronización de asistentes (desde Excel o Sheets)
  const handleSyncAttendees = async (newAttendees, source) => {
    setIsSyncing(true);
    try {
      const res = await apiService.syncAttendees(newAttendees, source, eventName);
      setLastSyncTime(new Date().toISOString());
      setLastSyncSource(source);
      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  // Guardar configuración general
  const handleSaveConfig = async (newConfig) => {
    setConfig(newConfig);
    await apiService.saveConfig(newConfig, eventName);
  };

  // Guardar marca del evento (nombre y logo)
  const handleSaveBranding = async (name, logo) => {
    setEventName(name);
    setEventLogo(logo);
    await apiService.saveBranding(name, logo);
  };

  // Reiniciar acreditaciones a cero
  const handleResetAccreditations = async () => {
    await apiService.resetAccreditations();
  };

  // Métricas rápidas
  const stats = useMemo(() => {
    const total = attendees.length;
    const accredited = attendees.filter((a) => a.acreditado).length;
    const pending = total - accredited;
    const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;
    return { total, accredited, pending, rate };
  }, [attendees]);

  // Autenticación de Administrador
  const handleVerifyPin = async (pin) => {
    const res = await apiService.verifyAdminPin(pin);
    if (res.success) {
      setIsAdmin(true);
      return { success: true };
    }
    return res;
  };

  const handleLogoutAdmin = () => {
    apiService.logoutAdmin();
    setIsAdmin(false);
    setCurrentTab('operator');
  };

  const handleSelectTab = (tab) => {
    if (tab !== 'operator' && !isAdmin) {
      setIsAdminModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  if (isInitialLoading) {
    return <LoadingScreen eventName={eventName} eventLogo={eventLogo} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Barra Superior con Logo, Nombre, Rol, Punto de Acceso y Estado En Vivo */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleSelectTab}
        eventName={eventName}
        eventLogo={eventLogo}
        stats={stats}
        connectedOperators={connectedOperators}
        isOnline={isOnline}
        serverConnected={serverConnected}
        isFirestore={isFirestore}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        operatorName={operatorName}
        puntoAcceso={puntoAcceso}
        onOpenPuntoModal={() => setIsPuntoModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      {/* Contenido Principal con separación estricta de vistas por rol */}
      <main className="flex-1 pb-16">
        {/* Vista de Operador (Puerta): disponible para operadores y administradores */}
        {currentTab === 'operator' && (
          <OperatorView
            attendees={attendees}
            config={config}
            onAccredit={handleAccredit}
            onUndoAccredit={handleUndoAccredit}
            lastSyncTime={lastSyncTime}
            lastSyncSource={lastSyncSource}
            onManualSync={config.googleSheetUrl ? triggerBackgroundSheetSync : null}
            isSyncing={isSyncing}
            autoClearSearch={autoClearSearch}
            isOnline={isOnline}
          />
        )}

        {/* Vistas de Administración: NUNCA se renderizan si no está autenticado */}
        {isAdmin && currentTab === 'stats' && (
          <StatsView
            attendees={attendees}
            config={config}
            eventName={eventName}
            onResetAccreditations={handleResetAccreditations}
            onToggleAccredit={(dni, acc) => apiService.accredit(dni, acc)}
          />
        )}

        {isAdmin && currentTab === 'datasource' && (
          <DataSourceView
            onSyncAttendees={handleSyncAttendees}
            config={config}
            onSaveConfig={handleSaveConfig}
            lastSyncTime={lastSyncTime}
            lastSyncSource={lastSyncSource}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            pollingCountdown={pollingCountdown}
          />
        )}

        {isAdmin && currentTab === 'firebase' && (
          <FirebaseSettingsView />
        )}

        {isAdmin && currentTab === 'settings' && (
          <SettingsView
            config={config}
            onSaveConfig={handleSaveConfig}
            attendees={attendees}
            operatorName={operatorName}
            setOperatorName={handleSaveOperator}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            autoClearSearch={autoClearSearch}
            setAutoClearSearch={setAutoClearSearch}
          />
        )}

        {isAdmin && currentTab === 'branding' && (
          <BrandingSettingsView
            eventName={eventName}
            eventLogo={eventLogo}
            onSaveBranding={handleSaveBranding}
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {isAdmin && currentTab === 'audit' && (
          <AuditLogsView />
        )}
      </main>

      {/* Modal de Ingreso de PIN de Administrador */}
      <AdminPinModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onVerifyPin={handleVerifyPin}
      />

      {/* Modal de Asignación de Punto de Acceso y Operador */}
      <PuntoAccesoModal
        isOpen={isPuntoModalOpen}
        onClose={() => setIsPuntoModalOpen(false)}
        currentPunto={puntoAcceso}
        onSavePunto={handleSavePunto}
        currentOperator={operatorName}
        onSaveOperator={handleSaveOperator}
      />
    </div>
  );
}
