import * as XLSX from 'xlsx';

/**
 * Normaliza una cadena para comparaciones flexibles (sin acentos, minúsculas, sin espacios extra)
 */
export function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detecta columnas clave (DNI, Nombre, Apellido) a partir de una lista de encabezados
 */
export function detectKeyColumns(headers) {
  const dniCandidates = ['dni', 'documento', 'doc', 'rut', 'cedula', 'identificacion', 'id', 'pasaporte', 'document'];
  const nombreCandidates = ['nombre', 'nombres', 'firstname', 'name', 'primer_nombre'];
  const apellidoCandidates = ['apellido', 'apellidos', 'lastname', 'surname', 'segundo_nombre'];

  let dniCol = null;
  let nombreCol = null;
  let apellidoCol = null;

  headers.forEach((h) => {
    const norm = normalizeKey(h);
    if (!dniCol && dniCandidates.some((c) => norm === c || norm.includes(c))) {
      dniCol = h;
    } else if (!nombreCol && nombreCandidates.some((c) => norm === c || norm.startsWith('nom'))) {
      nombreCol = h;
    } else if (!apellidoCol && apellidoCandidates.some((c) => norm === c || norm.startsWith('ape'))) {
      apellidoCol = h;
    }
  });

  return { dniCol, nombreCol, apellidoCol };
}

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae la lista normalizada de asistentes
 */
export async function parseExcelFile(file, customMapping = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (rawJson.length === 0) {
          throw new Error('El archivo no contiene filas de datos.');
        }

        // Extraer encabezados de la primera fila
        const headers = Object.keys(rawJson[0]);
        const detected = detectKeyColumns(headers);

        const dniField = customMapping.dni || detected.dniCol || headers[0];
        const nombreField = customMapping.nombre || detected.nombreCol || headers[1] || '';
        const apellidoField = customMapping.apellido || detected.apellidoCol || headers[2] || '';

        // Identificar columnas dinámicas (todas las demás)
        const dynamicFields = headers.filter(
          (h) => h !== dniField && h !== nombreField && h !== apellidoField
        );

        // Transformar registros
        const attendees = rawJson.map((row, index) => {
          const rawDni = row[dniField];
          const cleanDni = rawDni !== undefined && rawDni !== null ? String(rawDni).trim() : `SIN_DNI_${index + 1}`;
          const nombre = row[nombreField] !== undefined ? String(row[nombreField]).trim() : '';
          const apellido = row[apellidoField] !== undefined ? String(row[apellidoField]).trim() : '';

          // Campos adicionales
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

        resolve({
          headers,
          detectedMapping: {
            dni: dniField,
            nombre: nombreField,
            apellido: apellidoField,
          },
          dynamicFields,
          attendees,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta la base final de asistentes a un archivo Excel (.xlsx) con auditoría completa
 */
export function exportAttendeesToExcel(attendees, eventName = 'Evento', config = {}) {
  const fieldLabels = config.fieldLabels || {};

  const exportRows = attendees.map((att) => {
    const row = {};

    // Columnas base
    row[fieldLabels['dni'] || 'DNI'] = att.dni;
    row[fieldLabels['nombre'] || 'Nombre'] = att.nombre;
    row[fieldLabels['apellido'] || 'Apellido'] = att.apellido;

    // Campos dinámicos
    if (att.dynamicFields) {
      Object.entries(att.dynamicFields).forEach(([key, val]) => {
        const label = fieldLabels[key] || key;
        row[label] = val;
      });
    }

    // Columnas de acreditación
    row['Estado'] = att.acreditado ? 'Acreditado' : 'Pendiente';
    row['Fecha Acreditación'] = att.fechaAcreditacion
      ? new Date(att.fechaAcreditacion).toLocaleString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';
    row['Operador'] = att.operador || '-';

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Autoajuste de anchos de columna
  const colWidths = [];
  if (exportRows.length > 0) {
    Object.keys(exportRows[0]).forEach((key) => {
      let maxLen = key.length;
      exportRows.forEach((r) => {
        const valStr = String(r[key] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 10), 50) });
    });
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Acreditaciones');

  const timestamp = new Date().toISOString().slice(0, 10);
  const cleanName = eventName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Acreditaciones_${cleanName}_${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Exporta a CSV con BOM UTF-8 para que Excel lo abra con tildes y caracteres correctos
 */
export function exportAttendeesToCSV(attendees, eventName = 'Evento', config = {}) {
  const fieldLabels = config.fieldLabels || {};
  if (attendees.length === 0) return;

  const sampleAtt = attendees[0];
  const dynamicKeys = Object.keys(sampleAtt.dynamicFields || {});

  const headers = [
    fieldLabels['dni'] || 'DNI',
    fieldLabels['nombre'] || 'Nombre',
    fieldLabels['apellido'] || 'Apellido',
    ...dynamicKeys.map((k) => fieldLabels[k] || k),
    'Estado',
    'Fecha Acreditacion',
    'Operador',
  ];

  const rows = attendees.map((att) => {
    const values = [
      `"${String(att.dni || '').replace(/"/g, '""')}"`,
      `"${String(att.nombre || '').replace(/"/g, '""')}"`,
      `"${String(att.apellido || '').replace(/"/g, '""')}"`,
      ...dynamicKeys.map((k) => `"${String((att.dynamicFields && att.dynamicFields[k]) || '').replace(/"/g, '""')}"`),
      att.acreditado ? '"Acreditado"' : '"Pendiente"',
      att.fechaAcreditacion
        ? `"${new Date(att.fechaAcreditacion).toLocaleString('es-AR')}"`
        : '""',
      `"${String(att.operador || '').replace(/"/g, '""')}"`,
    ];
    return values.join(',');
  });

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  const cleanName = eventName.replace(/[^a-zA-Z0-9_\-]/g, '_');

  link.setAttribute('href', url);
  link.setAttribute('download', `Acreditaciones_${cleanName}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
