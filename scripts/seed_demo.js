import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'event_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initialData = {
  eventName: "Conferencia Anual de Tecnología 2026",
  lastUpdated: new Date().toISOString(),
  lastSyncSource: "excel",
  config: {
    visibleFields: ["Empresa", "Cargo", "Tipo de Entrada", "Mesa"],
    fieldLabels: {
      dni: "DNI / Documento",
      nombre: "Nombre",
      apellido: "Apellido",
      Empresa: "Empresa",
      Cargo: "Cargo",
      "Tipo de Entrada": "Entrada",
      Mesa: "Mesa / Sector",
      Acompañantes: "Acompañantes",
      Observaciones: "Observaciones"
    },
    filterField: "Tipo de Entrada",
    filterValues: [],
    pollingInterval: 60,
    googleSheetUrl: "",
    googleApiKey: ""
  },
  attendees: [
    {
      id: "38123456",
      dni: "38123456",
      nombre: "Juan Carlos",
      apellido: "Pérez",
      nombreCompleto: "Juan Carlos Pérez",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Google Cloud Argentina",
        Cargo: "Cloud Architect",
        "Tipo de Entrada": "VIP",
        Mesa: "Mesa 1 - Principal",
        Acompañantes: "1",
        Observaciones: "Invitado Especial"
      }
    },
    {
      id: "40987654",
      dni: "40987654",
      nombre: "María Eugenia",
      apellido: "González",
      nombreCompleto: "María Eugenia González",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Mercado Libre",
        Cargo: "Engineering Lead",
        "Tipo de Entrada": "General",
        Mesa: "Mesa 4",
        Acompañantes: "0",
        Observaciones: "Vegetariana"
      }
    },
    {
      id: "35456789",
      dni: "35456789",
      nombre: "Lucas",
      apellido: "Martínez",
      nombreCompleto: "Lucas Martínez",
      acreditado: true,
      fechaAcreditacion: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      operador: "Puerta Principal 1",
      dynamicFields: {
        Empresa: "Globant",
        Cargo: "Senior Developer",
        "Tipo de Entrada": "Speaker",
        Mesa: "Mesa 2",
        Acompañantes: "1",
        Observaciones: "Panel Inteligencia Artificial"
      }
    },
    {
      id: "29876543",
      dni: "29876543",
      nombre: "Valeria",
      apellido: "Fernández",
      nombreCompleto: "Valeria Fernández",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Infobae",
        Cargo: "Periodista de Tecnología",
        "Tipo de Entrada": "Prensa",
        Mesa: "Sector Prensa",
        Acompañantes: "0",
        Observaciones: "Acreditación con cámara"
      }
    },
    {
      id: "42111222",
      dni: "42111222",
      nombre: "Agustín",
      apellido: "Rodríguez",
      nombreCompleto: "Agustín Rodríguez",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Fintech Latam",
        Cargo: "Product Manager",
        "Tipo de Entrada": "General",
        Mesa: "Mesa 5",
        Acompañantes: "0",
        Observaciones: "-"
      }
    },
    {
      id: "33444555",
      dni: "33444555",
      nombre: "Carolina",
      apellido: "Sánchez",
      nombreCompleto: "Carolina Sánchez",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Tech Academy",
        Cargo: "Directora Académica",
        "Tipo de Entrada": "VIP",
        Mesa: "Mesa 1 - Principal",
        Acompañantes: "2",
        Observaciones: "Asiste con comitiva"
      }
    },
    {
      id: "28999888",
      dni: "28999888",
      nombre: "Roberto",
      apellido: "López",
      nombreCompleto: "Roberto López",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Telecomunicaciones del Sur",
        Cargo: "Gerente Comercial",
        "Tipo de Entrada": "General",
        Mesa: "Mesa 6",
        Acompañantes: "0",
        Observaciones: "-"
      }
    },
    {
      id: "37654321",
      dni: "37654321",
      nombre: "Florencia",
      apellido: "Díaz",
      nombreCompleto: "Florencia Díaz",
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: {
        Empresa: "Agencia Digital Uno",
        Cargo: "Diseñadora UX/UI",
        "Tipo de Entrada": "Invitado Especial",
        Mesa: "Mesa 3",
        Acompañantes: "0",
        Observaciones: "-"
      }
    }
  ],
  history: [
    {
      dni: "35456789",
      nombreCompleto: "Lucas Martínez",
      accion: "ACREDITADO",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      operador: "Puerta Principal 1"
    }
  ]
};

fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
console.log('[OK] Base de datos inicial sembrada con 8 asistentes de demostración.');
