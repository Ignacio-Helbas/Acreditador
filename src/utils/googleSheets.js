import * as XLSX from 'xlsx';
import { detectKeyColumns } from './excel';

/**
 * Extrae el ID de una Google Sheet a partir de su URL completa o ID directo
 */
export function extractSheetId(urlOrId) {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();

  // Si ya es un ID (cadena de caracteres sin barras)
  if (!trimmed.includes('/') && trimmed.length > 20) {
    return trimmed;
  }

  // Regex para URLs de Google Sheets estándar
  const matches = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    return matches[1];
  }

  // URLs de publicación directa tipo /pub?output=csv
  return trimmed;
}

/**
 * Extrae el GID (hoja específica) si está presente en la URL
 */
export function extractGid(url) {
  if (!url) return null;
  const matches = url.match(/[#&?]gid=([0-9]+)/);
  return matches && matches[1] ? matches[1] : '0';
}

/**
 * Obtiene y procesa una Google Sheet mediante CSV público (o a través del proxy del servidor)
 */
export async function fetchGoogleSheetViaCSV(urlOrId, customMapping = {}) {
  const sheetId = extractSheetId(urlOrId);
  const gid = extractGid(urlOrId) || '0';

  let csvUrl;
  if (urlOrId.includes('/pub') && urlOrId.includes('output=csv')) {
    csvUrl = urlOrId;
  } else {
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  let csvText;
  try {
    // 1. Si hay backend propio disponible, intentar proxy local
    const proxyUrl = `/api/sheets/proxy?url=${encodeURIComponent(csvUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      csvText = await res.text();
    } else {
      throw new Error('Local proxy not available');
    }
  } catch (proxyErr) {
    try {
      // 2. Intento directo desde el navegador (funciona si la hoja está "Publicada en la web" como CSV)
      const directRes = await fetch(csvUrl);
      if (directRes.ok) {
        csvText = await directRes.text();
      } else {
        throw new Error(`Status ${directRes.status}`);
      }
    } catch (directErr) {
      // 3. Fallback a proxy CORS transparente para hosting en GitHub Pages / Vercel
      try {
        const corsProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
        const corsRes = await fetch(corsProxy);
        if (!corsRes.ok) throw new Error('CORS proxy error');
        csvText = await corsRes.text();
      } catch (allErr) {
        throw new Error(
          'No se pudo acceder a la Google Sheet. Para conectarla por internet: en Google Sheets ve a "Archivo > Compartir > Publicar en la web", elige formato "CSV" y pega ese enlace aquí, o usa una API Key.'
        );
      }
    }
  }

  return processRawCsvText(csvText, customMapping);
}

/**
 * Obtiene y procesa una Google Sheet utilizando Google Sheets API v4 oficial
 */
export async function fetchGoogleSheetViaAPI(sheetId, apiKey, range = 'A1:Z5000', customMapping = {}) {
  const cleanId = extractSheetId(sheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `Error HTTP ${res.status}`;
    throw new Error(`Google Sheets API Error: ${message}`);
  }

  const json = await res.json();
  const rows = json.values;

  if (!rows || rows.length === 0) {
    throw new Error('La hoja está vacía o el rango especificado no contiene datos.');
  }

  const headers = rows[0].map((h) => String(h || '').trim());
  const detected = detectKeyColumns(headers);

  const dniField = customMapping.dni || detected.dniCol || headers[0];
  const nombreField = customMapping.nombre || detected.nombreCol || headers[1] || '';
  const apellidoField = customMapping.apellido || detected.apellidoCol || headers[2] || '';

  const dniIndex = headers.indexOf(dniField);
  const nombreIndex = headers.indexOf(nombreField);
  const apellidoIndex = headers.indexOf(apellidoField);

  const dynamicFields = headers.filter(
    (h) => h !== dniField && h !== nombreField && h !== apellidoField
  );

  const attendees = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDni = dniIndex !== -1 ? row[dniIndex] : `SIN_DNI_${i}`;
    const cleanDni = rawDni !== undefined && rawDni !== null ? String(rawDni).trim() : `SIN_DNI_${i}`;
    const nombre = nombreIndex !== -1 && row[nombreIndex] !== undefined ? String(row[nombreIndex]).trim() : '';
    const apellido = apellidoIndex !== -1 && row[apellidoIndex] !== undefined ? String(row[apellidoIndex]).trim() : '';

    const dynamicData = {};
    dynamicFields.forEach((field) => {
      const fieldIdx = headers.indexOf(field);
      dynamicData[field] = fieldIdx !== -1 && row[fieldIdx] !== undefined ? String(row[fieldIdx]).trim() : '';
    });

    attendees.push({
      id: cleanDni || `row_${i}`,
      dni: cleanDni,
      nombre,
      apellido,
      nombreCompleto: `${nombre} ${apellido}`.trim() || 'Sin Nombre',
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: dynamicData,
    });
  }

  return {
    headers,
    detectedMapping: { dni: dniField, nombre: nombreField, apellido: apellidoField },
    dynamicFields,
    attendees,
  };
}

/**
 * Parsea texto CSV a objetos estructurados de asistentes
 */
function processRawCsvText(csvText, customMapping = {}) {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  if (rawJson.length === 0) {
    throw new Error('La hoja no contiene filas con datos válidos.');
  }

  const headers = Object.keys(rawJson[0]);
  const detected = detectKeyColumns(headers);

  const dniField = customMapping.dni || detected.dniCol || headers[0];
  const nombreField = customMapping.nombre || detected.nombreCol || headers[1] || '';
  const apellidoField = customMapping.apellido || detected.apellidoCol || headers[2] || '';

  const dynamicFields = headers.filter(
    (h) => h !== dniField && h !== nombreField && h !== apellidoField
  );

  const attendees = rawJson.map((row, index) => {
    const rawDni = row[dniField];
    const cleanDni = rawDni !== undefined && rawDni !== null ? String(rawDni).trim() : `SIN_DNI_${index + 1}`;
    const nombre = row[nombreField] !== undefined ? String(row[nombreField]).trim() : '';
    const apellido = row[apellidoField] !== undefined ? String(row[apellidoField]).trim() : '';

    const dynamicData = {};
    dynamicFields.forEach((field) => {
      dynamicData[field] = row[field] !== undefined ? String(row[field]).trim() : '';
    });

    return {
      id: cleanDni || `row_${index + 1}`,
      dni: cleanDni,
      nombre,
      apellido,
      nombreCompleto: `${nombre} ${apellido}`.trim() || 'Sin Nombre',
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      dynamicFields: dynamicData,
      rawRow: row,
    };
  });

  return {
    headers,
    detectedMapping: { dni: dniField, nombre: nombreField, apellido: apellidoField },
    dynamicFields,
    attendees,
  };
}

/**
 * Merge inteligente: combina los asistentes entrantes de la hoja con los asistentes locales,
 * garantizando que NUNCA se pierda el estado de quienes ya fueron acreditados.
 */
export function mergeAttendeesPreservingState(currentAttendees, incomingAttendees) {
  const currentMap = new Map();
  currentAttendees.forEach((att) => {
    const key = String(att.dni).trim().toLowerCase();
    currentMap.set(key, att);
  });

  let addedCount = 0;
  let updatedCount = 0;
  let preservedCount = 0;

  const merged = incomingAttendees.map((incoming) => {
    const key = String(incoming.dni).trim().toLowerCase();
    const existing = currentMap.get(key);

    if (existing) {
      updatedCount++;
      if (existing.acreditado) {
        preservedCount++;
      }
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
        acreditado: false,
        fechaAcreditacion: null,
        operador: null,
      };
    }
  });

  return {
    mergedAttendees: merged,
    stats: {
      total: merged.length,
      added: addedCount,
      updated: updatedCount,
      preservedAccreditations: preservedCount,
    },
  };
}
