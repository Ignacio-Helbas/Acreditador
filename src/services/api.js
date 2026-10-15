// Servicio de comunicación y sincronización en tiempo real (Firebase Firestore + WebSocket + Fallback)
import { 
  initFirebase, 
  isFirebaseConfigured, 
  subscribeToAttendees as subscribeFirestoreAttendees,
  subscribeToEvent as subscribeFirestoreEvent,
  subscribeToActivityFeed as subscribeFirestoreFeed,
  accreditAttendeeTransaction,
  undoAccreditationTransaction,
  syncAttendeesToFirestore,
  saveEventConfigToFirestore,
  saveEventBrandingToFirestore,
  resetAllAccreditationsInFirestore,
  saveFirebaseConfig,
  getFirebaseConfig
} from './firebase';

const LOCAL_STORAGE_KEY = 'acreditador_event_state';
const ADMIN_PIN_KEY = 'acreditador_admin_pin';
const PUNTO_ACCESO_KEY = 'acreditador_punto_acceso';
const OPERATOR_NAME_KEY = 'acreditador_operator_name';
const DEFAULT_EVENT_ID = 'main-event';

class ApiService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.isOnline = navigator.onLine;
    this.serverConnected = false;
    this.isFirestoreActive = false;
    this.unsubscribeFirestore = null;
    this.unsubscribeEventFirestore = null;

    this.puntoAcceso = localStorage.getItem(PUNTO_ACCESO_KEY) || 'Puerta 1';
    this.operatorName = localStorage.getItem(OPERATOR_NAME_KEY) || 'Operador Puerta 1';
    this.adminPin = sessionStorage.getItem(ADMIN_PIN_KEY) || localStorage.getItem(ADMIN_PIN_KEY) || '';

    // Manejo de conectividad online/offline del navegador
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners({ type: 'NETWORK_STATUS', online: true });
      if (this.isFirestoreActive) {
        this.notifyListeners({ type: 'SERVER_STATUS', connected: true, mode: 'firestore' });
      } else {
        this.connectWebSocket();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.serverConnected = false;
      this.notifyListeners({ type: 'NETWORK_STATUS', online: false });
      this.notifyListeners({ type: 'SERVER_STATUS', connected: false });
    });

    // Intentar inicializar Firebase si existe configuración
    this.setupFirebaseIfAvailable();
  }

  setupFirebaseIfAvailable() {
    if (isFirebaseConfigured()) {
      const res = initFirebase();
      if (res.initialized) {
        this.isFirestoreActive = true;
        this.serverConnected = true;
      }
    }
  }

  setPuntoAcceso(punto) {
    this.puntoAcceso = punto;
    localStorage.setItem(PUNTO_ACCESO_KEY, punto);
    this.notifyListeners({ type: 'PUNTO_ACCESO_CHANGED', puntoAcceso: punto });
  }

  getPuntoAcceso() {
    return this.puntoAcceso;
  }

  setOperatorName(name) {
    this.operatorName = name;
    localStorage.setItem(OPERATOR_NAME_KEY, name);
  }

  getOperatorName() {
    return this.operatorName;
  }

  setAdminPin(pin) {
    this.adminPin = pin;
    if (pin) {
      sessionStorage.setItem(ADMIN_PIN_KEY, pin);
    } else {
      sessionStorage.removeItem(ADMIN_PIN_KEY);
      localStorage.removeItem(ADMIN_PIN_KEY);
    }
  }

  getAdminPin() {
    return this.adminPin;
  }

  isAdmin() {
    return Boolean(this.adminPin);
  }

  async verifyAdminPin(pin) {
    // Si hay backend Node.js activo, validar ahí
    if (this.serverConnected && !this.isFirestoreActive && this.isOnline) {
      try {
        const res = await fetch('/api/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });
        if (res.ok) {
          this.setAdminPin(pin);
          return { success: true };
        }
        return { success: false, error: 'PIN incorrecto' };
      } catch (err) {
        console.warn('Error verificando PIN en servidor:', err);
      }
    }

    // Validación local
    const local = this.getLocalState();
    const expected = local.config?.adminPin;
    if (expected && String(pin).trim() === String(expected).trim()) {
      this.setAdminPin(pin);
      return { success: true };
    }
    return { success: false, error: 'PIN incorrecto' };
  }

  logoutAdmin() {
    this.setAdminPin('');
    this.notifyListeners({ type: 'ADMIN_LOGOUT' });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error en listener:', err);
      }
    });
  }

  // Configurar Firebase desde la UI
  setFirebaseConfig(config) {
    saveFirebaseConfig(config);
    const res = initFirebase();
    if (res.initialized) {
      this.isFirestoreActive = true;
      this.serverConnected = true;
      this.attachFirestoreListeners();
      this.notifyListeners({ type: 'SERVER_STATUS', connected: true, mode: 'firestore' });
      return { success: true };
    }
    return { success: false, error: res.error };
  }

  getFirebaseConfig() {
    return getFirebaseConfig();
  }

  isFirestore() {
    return this.isFirestoreActive;
  }

  // Activar listeners en tiempo real de Firestore
  attachFirestoreListeners() {
    if (!this.isFirestoreActive) return;

    if (this.unsubscribeFirestore) this.unsubscribeFirestore();
    if (this.unsubscribeEventFirestore) this.unsubscribeEventFirestore();

    // 1. Escuchar asistentes en tiempo real
    this.unsubscribeFirestore = subscribeFirestoreAttendees(
      DEFAULT_EVENT_ID,
      (attendees) => {
        const local = this.getLocalState();
        local.attendees = attendees;
        local.lastUpdated = new Date().toISOString();
        this.saveLocalState(local);

        this.notifyListeners({
          type: 'EVENT_SYNCED',
          data: {
            attendees,
            lastUpdated: local.lastUpdated,
            lastSyncSource: 'firestore',
          },
        });
      },
      (err) => {
        console.warn('Error en suscripción Firestore:', err);
      }
    );

    // 2. Escuchar cambios de configuración del evento
    this.unsubscribeEventFirestore = subscribeFirestoreEvent(
      DEFAULT_EVENT_ID,
      (eventData) => {
        if (!eventData) return;
        const local = this.getLocalState();
        if (eventData.name) local.eventName = eventData.name;
        if (eventData.logo !== undefined) local.eventLogo = eventData.logo;
        if (eventData.config) local.config = { ...local.config, ...eventData.config };
        this.saveLocalState(local);

        this.notifyListeners({
          type: 'BRANDING_UPDATED',
          eventName: eventData.name,
          eventLogo: eventData.logo,
        });

        if (eventData.config) {
          this.notifyListeners({
            type: 'CONFIG_UPDATED',
            config: eventData.config,
            eventName: eventData.name,
          });
        }
      }
    );
  }

  // Conexión WebSocket para cuando corre con backend Node.js
  connectWebSocket() {
    if (this.isFirestoreActive) {
      this.attachFirestoreListeners();
      this.notifyListeners({ type: 'SERVER_STATUS', connected: true, mode: 'firestore' });
      return;
    }

    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    const isStaticHost = hostname.includes('github.io') || hostname.includes('vercel.app') || window.location.protocol === 'file:';
    if (isStaticHost) {
      this.serverConnected = false;
      this.notifyListeners({ type: 'SERVER_STATUS', connected: true, mode: 'cloud' });
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.serverConnected = true;
        this.notifyListeners({ type: 'SERVER_STATUS', connected: true, mode: 'websocket' });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notifyListeners(payload);

          if (payload.type === 'INIT_STATE' || payload.type === 'EVENT_SYNCED') {
            this.saveLocalState(payload.data);
          }
        } catch (e) {
          console.warn('Mensaje WS no interpretable:', e);
        }
      };

      this.ws.onclose = () => {
        this.serverConnected = false;
        this.notifyListeners({ type: 'SERVER_STATUS', connected: false });
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 4000);
      };

      this.ws.onerror = () => {
        this.serverConnected = false;
      };
    } catch (e) {
      this.serverConnected = false;
    }
  }

  // Carga inicial del estado
  async getInitialState() {
    // Si Firestore está activo, activar listeners
    if (this.isFirestoreActive) {
      this.attachFirestoreListeners();
      const local = this.getLocalState();
      return { data: local, connectedOperators: 1 };
    }

    try {
      const res = await fetch('/api/event');
      if (res.ok) {
        const json = await res.json();
        this.serverConnected = true;
        this.saveLocalState(json.data);
        return { data: json.data, connectedOperators: json.connectedOperators || 1 };
      }
    } catch (e) {
      this.serverConnected = false;
    }

    // Fallback a localStorage
    const local = this.getLocalState();
    return { data: local, connectedOperators: 1 };
  }

  // Acreditar asistente (Atómico en Firestore o Backend / Local)
  async accredit(dni, accredited = true) {
    const punto = this.puntoAcceso;
    const operator = `${this.operatorName} (${punto})`;

    // 1. Si Firebase Firestore está conectado (Modo Real-Time Cloud compartido)
    if (this.isFirestoreActive && this.isOnline) {
      try {
        if (accredited) {
          const res = await accreditAttendeeTransaction(DEFAULT_EVENT_ID, dni, punto, operator);
          return res;
        } else {
          const res = await undoAccreditationTransaction(DEFAULT_EVENT_ID, dni, punto, operator);
          return res;
        }
      } catch (err) {
        console.error('Error en transacción Firestore:', err);
        throw err;
      }
    }

    // 2. Si hay backend Node.js REST
    if (this.serverConnected && this.isOnline) {
      try {
        const res = await fetch('/api/event/accredit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni, accredited, operator }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          return json;
        } else if (res.status === 409) {
          return {
            success: false,
            alreadyAccredited: true,
            attendee: json.attendee,
            error: json.error,
          };
        }
      } catch (err) {
        console.warn('Error en llamada remota:', err);
      }
    }

    // 3. Fallback Local
    const localState = this.getLocalState();
    const cleanDni = String(dni).trim().toLowerCase();
    const attendee = localState.attendees.find(
      (a) => String(a.dni).trim().toLowerCase() === cleanDni
    );

    if (!attendee) {
      throw new Error('Asistente no encontrado');
    }

    if (accredited && attendee.acreditado) {
      return {
        success: false,
        alreadyAccredited: true,
        attendee,
        error: 'Asistente ya acreditado previamente',
      };
    }

    const now = new Date().toISOString();
    attendee.acreditado = accredited;
    attendee.fechaAcreditacion = accredited ? now : null;
    attendee.operador = accredited ? operator : null;
    attendee.puntoAcceso = accredited ? punto : null;

    localState.lastUpdated = now;
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'ACCREDITATION_UPDATED',
      attendee,
      lastUpdated: now,
    });

    return { success: true, attendee };
  }

  // Sincronizar nómina de asistentes en bloque
  async syncAttendees(attendees, source = 'manual', eventName) {
    // Si Firestore está activo
    if (this.isFirestoreActive && this.isOnline) {
      const res = await syncAttendeesToFirestore(DEFAULT_EVENT_ID, attendees, source);
      return res;
    }

    // Si backend Node.js está disponible
    if (this.serverConnected && this.isOnline) {
      const res = await fetch('/api/event/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': this.adminPin,
        },
        body: JSON.stringify({ attendees, source, eventName }),
      });
      if (res.ok) return await res.json();
      if (res.status === 403) throw new Error('PIN de Administrador requerido.');
    }

    // Modo local
    const localState = this.getLocalState();
    if (eventName) localState.eventName = eventName;

    const map = new Map();
    localState.attendees.forEach((a) => map.set(String(a.dni).trim().toLowerCase(), a));

    let added = 0;
    let updated = 0;
    let preserved = 0;

    const merged = attendees.map((inc) => {
      const key = String(inc.dni).trim().toLowerCase();
      const ex = map.get(key);
      if (ex) {
        updated++;
        if (ex.acreditado) preserved++;
        return {
          ...inc,
          acreditado: ex.acreditado || false,
          fechaAcreditacion: ex.fechaAcreditacion || null,
          operador: ex.operador || null,
          puntoAcceso: ex.puntoAcceso || null,
        };
      } else {
        added++;
        return {
          ...inc,
          acreditado: false,
          fechaAcreditacion: null,
          operador: null,
          puntoAcceso: null,
        };
      }
    });

    localState.attendees = merged;
    localState.lastSyncSource = source;
    localState.lastUpdated = new Date().toISOString();
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'EVENT_SYNCED',
      data: localState,
    });

    return {
      success: true,
      summary: {
        total: merged.length,
        added,
        updated,
        preservedAccreditations: preserved,
      },
    };
  }

  // Guardar configuración general
  async saveConfig(newConfig, eventName) {
    if (this.isFirestoreActive && this.isOnline) {
      await saveEventConfigToFirestore(DEFAULT_EVENT_ID, newConfig, eventName);
    } else if (this.serverConnected && this.isOnline) {
      try {
        await fetch('/api/event/config', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-pin': this.adminPin,
          },
          body: JSON.stringify({ config: newConfig, eventName }),
        });
      } catch (e) {
        console.warn('Error guardando config en backend:', e);
      }
    }

    const localState = this.getLocalState();
    localState.config = newConfig;
    if (eventName) localState.eventName = eventName;
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'CONFIG_UPDATED',
      config: newConfig,
      eventName,
    });
  }

  // Guardar marca y logo
  async saveBranding(eventName, eventLogo) {
    if (this.isFirestoreActive && this.isOnline) {
      await saveEventBrandingToFirestore(DEFAULT_EVENT_ID, eventName, eventLogo);
    } else if (this.serverConnected && this.isOnline) {
      try {
        await fetch('/api/admin/branding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': this.adminPin,
          },
          body: JSON.stringify({ eventName, eventLogo }),
        });
      } catch (e) {
        console.warn('Error guardando branding en backend:', e);
      }
    }

    const localState = this.getLocalState();
    localState.eventName = eventName;
    localState.eventLogo = eventLogo;
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'BRANDING_UPDATED',
      eventName,
      eventLogo,
    });
  }

  // Reiniciar acreditaciones a cero
  async resetAccreditations() {
    if (this.isFirestoreActive && this.isOnline) {
      await resetAllAccreditationsInFirestore(DEFAULT_EVENT_ID);
      return;
    }

    if (this.serverConnected && this.isOnline) {
      try {
        await fetch('/api/event/reset-accreditations', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-pin': this.adminPin,
          },
        });
      } catch (e) {
        console.warn('Error en reset backend:', e);
      }
    }

    const localState = this.getLocalState();
    localState.attendees = localState.attendees.map((a) => ({
      ...a,
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      puntoAcceso: null,
    }));
    localState.lastUpdated = new Date().toISOString();
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'EVENT_RESET',
      data: localState,
    });
  }

  getLocalState() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error leyendo local state:', e);
    }
    return {
      eventName: 'Mi Evento 2026',
      eventLogo: null,
      attendees: [],
      config: {
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
      },
      auditLogs: [],
      lastUpdated: null,
      lastSyncSource: null,
    };
  }

  saveLocalState(state) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  async getAuditLogs() {
    if (this.serverConnected && !this.isFirestoreActive && this.isOnline) {
      try {
        const res = await fetch('/api/admin/audit-logs', {
          headers: { 'x-admin-pin': this.adminPin }
        });
        if (res.ok) {
          const json = await res.json();
          return json.logs || [];
        }
      } catch (e) {
        console.warn('Error obteniendo logs de servidor:', e);
      }
    }

    const local = this.getLocalState();
    return local.auditLogs || [];
  }
}

export const apiService = new ApiService();
