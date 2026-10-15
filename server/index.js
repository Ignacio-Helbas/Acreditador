import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'event_data.json');

// Asegurar que existe directorio de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Estructura de datos en memoria con persistencia en archivo
let eventState = {
  eventName: "Evento General",
  lastUpdated: new Date().toISOString(),
  lastSyncSource: null, // 'excel' | 'google-sheets'
  config: {
    visibleFields: ['empresa', 'cargo', 'tipoEntrada', 'mesa'],
    fieldLabels: {
      dni: 'DNI / Documento',
      nombre: 'Nombre',
      apellido: 'Apellido',
      empresa: 'Empresa / Institución',
      cargo: 'Cargo',
      tipoEntrada: 'Tipo de Entrada',
      mesa: 'Mesa / Sector',
      acreditado: 'Estado',
      fechaAcreditacion: 'Hora Acreditación',
    },
    filterField: '', // campo opcional para filtro primario
    filterValues: [],
    pollingInterval: 60, // segundos
    googleSheetUrl: '',
    googleApiKey: '',
  },
  attendees: [], // Array de asistentes
  history: [], // Historial de acciones para auditoría
};

// Cargar estado previo si existe
if (fs.existsSync(DB_FILE)) {
  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(rawData);
    eventState = { ...eventState, ...parsed };
    console.log(`[DB] Estado cargado con éxito. ${eventState.attendees.length} asistentes.`);
  } catch (err) {
    console.error('[DB] Error al cargar base de datos previa:', err.message);
  }
}

// Guardar en disco de manera segura
function saveToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(eventState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error guardando en disco:', err.message);
  }
}

// Broadcast a todos los clientes WebSocket conectados
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Si existe la carpeta dist/ (producción), servirla estáticamente
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ================= Rutas API =================

// Obtener estado completo del evento
app.get('/api/event', (req, res) => {
  res.json({
    success: true,
    data: eventState,
    connectedOperators: wss.clients.size,
  });
});

// Acreditar o desacreditar a un asistente
app.post('/api/event/accredit', (req, res) => {
  const { dni, accredited, operator = 'Operador' } = req.body;

  if (!dni) {
    return res.status(400).json({ success: false, error: 'DNI requerido' });
  }

  const cleanDni = String(dni).trim().toLowerCase();
  const attendeeIndex = eventState.attendees.findIndex(
    (a) => String(a.dni).trim().toLowerCase() === cleanDni
  );

  if (attendeeIndex === -1) {
    return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
  }

  const attendee = eventState.attendees[attendeeIndex];
  const now = new Date().toISOString();

  // Si ya estaba acreditado y se intenta acreditar de nuevo
  if (accredited && attendee.acreditado) {
    return res.status(409).json({
      success: false,
      error: 'Asistente ya acreditado',
      attendee,
    });
  }

  attendee.acreditado = Boolean(accredited);
  attendee.fechaAcreditacion = accredited ? now : null;
  attendee.operador = accredited ? operator : null;

  // Registrar en historial
  eventState.history.unshift({
    dni: attendee.dni,
    nombreCompleto: `${attendee.nombre || ''} ${attendee.apellido || ''}`.trim(),
    accion: accredited ? 'ACREDITADO' : 'DESACREDITADO',
    timestamp: now,
    operador,
  });

  // Mantener historial acotado a los últimos 500 registros
  if (eventState.history.length > 500) {
    eventState.history = eventState.history.slice(0, 500);
  }

  eventState.lastUpdated = now;
  saveToDisk();

  // Notificar a todos los clientes WebSocket
  broadcast({
    type: 'ACCREDITATION_UPDATED',
    attendee,
    historyEntry: eventState.history[0],
    lastUpdated: now,
  });

  res.json({
    success: true,
    attendee,
  });
});

// Sincronización inteligente de asistentes (Excel o Google Sheets)
// Conserva el estado de acreditación de quienes ya ingresaron
app.post('/api/event/sync', (req, res) => {
  const { attendees: incomingAttendees, source = 'manual', eventName } = req.body;

  if (!Array.isArray(incomingAttendees)) {
    return res.status(400).json({ success: false, error: 'Lista de asistentes inválida' });
  }

  if (eventName) {
    eventState.eventName = eventName;
  }

  // Mapa de asistentes existentes indexado por DNI normalizado
  const existingMap = new Map();
  eventState.attendees.forEach((att) => {
    const key = String(att.dni).trim().toLowerCase();
    existingMap.set(key, att);
  });

  let addedCount = 0;
  let updatedCount = 0;
  let preservedAccreditations = 0;

  const mergedAttendees = incomingAttendees.map((incoming) => {
    const key = String(incoming.dni).trim().toLowerCase();
    const existing = existingMap.get(key);

    if (existing) {
      updatedCount++;
      if (existing.acreditado) {
        preservedAccreditations++;
      }
      // Conservar acreditación previa, operador y timestamp, pero actualizar datos que hayan cambiado en el Sheet
      return {
        ...incoming,
        acreditado: existing.acreditado || false,
        fechaAcreditacion: existing.fechaAcreditacion || null,
        operador: existing.operador || null,
      };
    } else {
      addedCount++;
      return {
        ...incoming,
        acreditado: incoming.acreditado || false,
        fechaAcreditacion: incoming.fechaAcreditacion || null,
        operador: incoming.operador || null,
      };
    }
  });

  eventState.attendees = mergedAttendees;
  eventState.lastSyncSource = source;
  eventState.lastUpdated = new Date().toISOString();
  saveToDisk();

  broadcast({
    type: 'EVENT_SYNCED',
    data: eventState,
  });

  res.json({
    success: true,
    summary: {
      total: mergedAttendees.length,
      added: addedCount,
      updated: updatedCount,
      preservedAccreditations,
    },
  });
});

// Guardar configuración (campos visibles, etiquetas, filtros, polling)
app.post('/api/event/config', (req, res) => {
  const { config, eventName } = req.body;
  if (config) {
    eventState.config = { ...eventState.config, ...config };
  }
  if (eventName) {
    eventState.eventName = eventName;
  }
  eventState.lastUpdated = new Date().toISOString();
  saveToDisk();

  broadcast({
    type: 'CONFIG_UPDATED',
    config: eventState.config,
    eventName: eventState.eventName,
  });

  res.json({ success: true, config: eventState.config });
});

// Reiniciar / Limpiar acreditaciones (para pruebas o nuevo día de evento)
app.post('/api/event/reset-accreditations', (req, res) => {
  eventState.attendees.forEach((a) => {
    a.acreditado = false;
    a.fechaAcreditacion = null;
    a.operador = null;
  });
  eventState.history = [];
  eventState.lastUpdated = new Date().toISOString();
  saveToDisk();

  broadcast({
    type: 'EVENT_RESET',
    data: eventState,
  });

  res.json({ success: true, message: 'Acreditaciones reiniciadas' });
});

// Proxy para Google Sheets (evita problemas de CORS al consultar hojas públicas o CSV)
app.get('/api/sheets/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
    }
    const text = await fetchResponse.text();
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: `Error obteniendo hoja: ${err.message}` });
  }
});

// Manejo de WebSockets para multi-operador
wss.on('connection', (ws) => {
  // Enviar estado inicial al conectar
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    data: eventState,
    operatorCount: wss.clients.size,
  }));

  // Notificar a todos la cantidad actual de operadores conectados
  broadcast({
    type: 'OPERATORS_COUNT',
    count: wss.clients.size,
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      // Ignorar mensajes mal formateados
    }
  });

  ws.on('close', () => {
    broadcast({
      type: 'OPERATORS_COUNT',
      count: wss.clients.size,
    });
  });
});

// Si estamos en producción y ninguna ruta coincide, devolver index.html
app.get('*', (req, res) => {
  if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.json({ message: 'Servidor backend activo. Frontend disponible en Vite dev server.' });
  }
});

server.listen(PORT, () => {
  console.log(`[Servidor] Acreditador ejecutandose en http://localhost:${PORT}`);
  console.log(`[WebSocket] Listo para conexiones multi-operador`);
});
