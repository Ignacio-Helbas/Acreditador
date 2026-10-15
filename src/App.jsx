import React, { useState, useEffect, useRef, useMemo } from 'react';
import Navbar from './components/Navbar';
import OperatorView from './components/OperatorView';
import DataSourceView from './components/DataSourceView';
import SettingsView from './components/SettingsView';
import StatsView from './components/StatsView';
import { apiService } from './services/api';
import { playSuccessSound, playWarningSound } from './utils/sound';
import { fetchGoogleSheetViaCSV, fetchGoogleSheetViaAPI } from './utils/googleSheets';

export default function App() {
  const [currentTab, setCurrentTab] = useState('operator');
  const [eventName, setEventName] = useState('Mi Evento 2026');
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

  // Estado de sincronización y red
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastSyncSource, setLastSyncSource] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pollingCountdown, setPollingCountdown] = useState(60);
  const [connectedOperators, setConnectedOperators] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverConnected, setServerConnected] = useState(false);

  // Preferencias
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('acreditador_sound') !== 'false';
  });
  const [autoClearSearch, setAutoClearSearch] = useState(() => {
    return localStorage.getItem('acreditador_autoclear') !== 'false';
  });
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem('acreditador_operator_name') || 'Operador Puerta 1';
  });

  // Guardar preferencias en localStorage
  useEffect(() => {
    localStorage.setItem('acreditador_sound', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('acreditador_autoclear', autoClearSearch);
  }, [autoClearSearch]);

  const handleSetOperatorName = (name) => {
    setOperatorName(name);
    apiService.setOperatorName(name);
  };

  // Carga inicial y conexión con WebSocket / Backend
  useEffect(() => {
    let isMounted = true;

    // 1. Obtener estado inicial
    apiService.getInitialState().then(({ data, connectedOperators: ops }) => {
      if (!isMounted || !data) return;
      if (data.eventName) setEventName(data.eventName);
      if (data.attendees) setAttendees(data.attendees);
      if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
      if (data.lastUpdated) setLastSyncTime(data.lastUpdated);
      if (data.lastSyncSource) setLastSyncSource(data.lastSyncSource);
      if (ops) setConnectedOperators(ops);
    });

    // 2. Conectar WebSocket para sincronización en tiempo real multi-operador
    apiService.connectWebSocket();

    // 3. Suscribirse a eventos en tiempo real
    const unsubscribe = apiService.subscribe((msg) => {
      if (!isMounted) return;

      switch (msg.type) {
        case 'INIT_STATE':
          if (msg.data) {
            if (msg.data.eventName) setEventName(msg.data.eventName);
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
          // Ejecutar polling en segundo plano
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
      console.error('Error al acreditar:', err);
    }
  };

  // Manejar desacreditación / deshacer
  const handleUndoAccredit = async (dni) => {
    try {
      const res = await apiService.accredit(dni, false);
      return res;
    } catch (err) {
      console.error('Error al desacreditar:', err);
    }
  };

  // Manejar sincronización de asistentes (desde Excel o Sheets)
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

  // Guardar configuración
  const handleSaveConfig = async (newConfig) => {
    setConfig(newConfig);
    await apiService.saveConfig(newConfig, eventName);
  };

  // Guardar nombre del evento
  const handleSaveEventName = async (name) => {
    setEventName(name);
    await apiService.saveConfig(config, name);
  };

  // Reiniciar acreditaciones
  const handleResetAccreditations = async () => {
    await apiService.resetAccreditations();
  };

  // Métricas
  const stats = useMemo(() => {
    const total = attendees.length;
    const accredited = attendees.filter((a) => a.acreditado).length;
    const pending = total - accredited;
    const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;
    return { total, accredited, pending, rate };
  }, [attendees]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegación Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        eventName={eventName}
        setEventName={handleSaveEventName}
        stats={stats}
        connectedOperators={connectedOperators}
        isOnline={isOnline}
        serverConnected={serverConnected}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        operatorName={operatorName}
      />

      {/* Contenido Principal según Pestaña */}
      <main className="flex-1 pb-16">
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
          />
        )}

        {currentTab === 'datasource' && (
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

        {currentTab === 'settings' && (
          <SettingsView
            config={config}
            onSaveConfig={handleSaveConfig}
            attendees={attendees}
            operatorName={operatorName}
            setOperatorName={handleSetOperatorName}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            autoClearSearch={autoClearSearch}
            setAutoClearSearch={setAutoClearSearch}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView
            attendees={attendees}
            config={config}
            eventName={eventName}
            onResetAccreditations={handleResetAccreditations}
            onToggleAccredit={(dni, acc) => apiService.accredit(dni, acc)}
          />
        )}
      </main>
    </div>
  );
}
