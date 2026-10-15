// Servicio de comunicación y sincronización en tiempo real (WebSocket + REST + Offline Fallback)

const LOCAL_STORAGE_KEY = 'acreditador_event_state';
const OFFLINE_QUEUE_KEY = 'acreditador_offline_queue';

class ApiService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.isOnline = navigator.onLine;
    this.serverConnected = false;
    this.operatorName = localStorage.getItem('acreditador_operator_name') || 'Operador Puerta 1';

    // Manejo de eventos de conectividad del navegador
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.connectWebSocket();
      this.flushOfflineQueue();
      this.notifyListeners({ type: 'NETWORK_STATUS', online: true });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.serverConnected = false;
      this.notifyListeners({ type: 'NETWORK_STATUS', online: false });
    });
  }

  setOperatorName(name) {
    this.operatorName = name;
    localStorage.setItem('acreditador_operator_name', name);
  }

  getOperatorName() {
    return this.operatorName;
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

  // Inicializa la conexión WebSocket para multi-operador
  connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Si estamos en Vite dev (puerto 5173), conectamos al proxy en localhost:5173/ws o directo a 3001
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.serverConnected = true;
        this.notifyListeners({ type: 'SERVER_STATUS', connected: true });
        this.flushOfflineQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notifyListeners(payload);

          // Si recibimos un estado nuevo o actualizado, guardamos copia en localStorage para offline
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
        // Reintentar conexión en 3 segundos
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
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
    try {
      const res = await fetch('/api/event');
      if (res.ok) {
        const json = await res.json();
        this.serverConnected = true;
        this.saveLocalState(json.data);
        return { data: json.data, connectedOperators: json.connectedOperators || 1 };
      }
    } catch (e) {
      console.warn('Backend REST no disponible, usando almacenamiento local offline:', e.message);
      this.serverConnected = false;
    }

    // Fallback a localStorage
    const local = this.getLocalState();
    return { data: local, connectedOperators: 1 };
  }

  // Acreditar asistente (con soporte offline si el servidor se desconecta)
  async accredit(dni, accredited = true) {
    const operator = this.operatorName;
    const now = new Date().toISOString();

    // Si el servidor está conectado, intentar llamada REST
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
          // Ya acreditado
          return {
            success: false,
            alreadyAccredited: true,
            attendee: json.attendee,
            error: json.error,
          };
        }
      } catch (err) {
        console.warn('Error en llamada remota, procesando en modo offline:', err);
      }
    }

    // Procesar localmente (Modo Offline)
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

    attendee.acreditado = accredited;
    attendee.fechaAcreditacion = accredited ? now : null;
    attendee.operador = accredited ? operator : null;

    localState.lastUpdated = now;
    this.saveLocalState(localState);

    // Encolar acción para sincronizar al volver la conexión
    this.enqueueOfflineAction({
      action: 'ACCREDIT',
      dni,
      accredited,
      operator,
      timestamp: now,
    });

    // Notificar localmente
    this.notifyListeners({
      type: 'ACCREDITATION_UPDATED',
      attendee,
      lastUpdated: now,
      isOfflineAction: true,
    });

    return { success: true, attendee, isOffline: true };
  }

  // Sincronizar asistentes en lote (desde Excel o Sheets)
  async syncAttendees(attendees, source = 'manual', eventName) {
    if (this.serverConnected && this.isOnline) {
      try {
        const res = await fetch('/api/event/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendees, source, eventName }),
        });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch (err) {
        console.warn('Error enviando sync al backend:', err);
      }
    }

    // Modo Offline
    const localState = this.getLocalState();
    if (eventName) localState.eventName = eventName;

    // Merge manual
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
        };
      } else {
        added++;
        return {
          ...inc,
          acreditado: false,
          fechaAcreditacion: null,
          operador: null,
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
      summary: { total: merged.length, added, updated, preservedAccreditations: preserved },
    };
  }

  // Guardar configuración
  async saveConfig(config, eventName) {
    if (this.serverConnected && this.isOnline) {
      try {
        const res = await fetch('/api/event/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, eventName }),
        });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('No se pudo guardar config en backend:', e);
      }
    }

    const localState = this.getLocalState();
    if (config) localState.config = { ...localState.config, ...config };
    if (eventName) localState.eventName = eventName;
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'CONFIG_UPDATED',
      config: localState.config,
      eventName: localState.eventName,
    });

    return { success: true, config: localState.config };
  }

  // Resetear acreditaciones
  async resetAccreditations() {
    if (this.serverConnected && this.isOnline) {
      try {
        const res = await fetch('/api/event/reset-accreditations', { method: 'POST' });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Error reseteando en servidor:', e);
      }
    }

    const localState = this.getLocalState();
    localState.attendees.forEach((a) => {
      a.acreditado = false;
      a.fechaAcreditacion = null;
      a.operador = null;
    });
    localState.history = [];
    localState.lastUpdated = new Date().toISOString();
    this.saveLocalState(localState);

    this.notifyListeners({
      type: 'EVENT_RESET',
      data: localState,
    });

    return { success: true };
  }

  // Helpers de LocalStorage
  getLocalState() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error leyendo local state:', e);
    }
    return {
      eventName: 'Evento Principal',
      lastUpdated: new Date().toISOString(),
      lastSyncSource: null,
      config: {
        visibleFields: ['empresa', 'cargo', 'tipoEntrada', 'mesa'],
        fieldLabels: {
          dni: 'DNI / Documento',
          nombre: 'Nombre',
          apellido: 'Apellido',
          empresa: 'Empresa',
          cargo: 'Cargo',
          tipoEntrada: 'Tipo de Entrada',
          mesa: 'Mesa / Ubicación',
        },
        filterField: '',
        filterValues: [],
        pollingInterval: 60,
        googleSheetUrl: '',
        googleApiKey: '',
      },
      attendees: [],
      history: [],
    };
  }

  saveLocalState(state) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error guardando en local storage:', e);
    }
  }

  // Manejo de cola offline
  enqueueOfflineAction(action) {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push(action);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error encolando acción offline:', e);
    }
  }

  async flushOfflineQueue() {
    if (!this.serverConnected || !this.isOnline) return;
    try {
      const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueStr) return;
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      console.log(`[Sync] Enviando ${queue.length} acciones pendientes acumuladas offline...`);

      for (const item of queue) {
        if (item.action === 'ACCREDIT') {
          await fetch('/api/event/accredit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dni: item.dni,
              accredited: item.accredited,
              operator: item.operator,
            }),
          });
        }
      }

      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log('[Sync] Acciones offline sincronizadas exitosamente.');
    } catch (e) {
      console.warn('Error al vaciar cola offline:', e);
    }
  }
}

export const apiService = new ApiService();
