import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Link, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  HelpCircle,
  Eye,
  Key,
  Clock,
  ExternalLink
} from 'lucide-react';
import { parseExcelFile } from '../utils/excel';
import { fetchGoogleSheetViaCSV, fetchGoogleSheetViaAPI } from '../utils/googleSheets';
import * as XLSX from 'xlsx';

export default function DataSourceView({
  onSyncAttendees,
  config,
  onSaveConfig,
  lastSyncTime,
  lastSyncSource,
  isSyncing,
  setIsSyncing,
  pollingCountdown,
}) {
  const [activeSourceTab, setActiveSourceTab] = useState('excel'); // 'excel' | 'sheets'
  
  // Estado para subida de archivo Excel
  const [dragActive, setDragActive] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [excelError, setExcelError] = useState(null);
  const [excelSuccess, setExcelSuccess] = useState(null);

  // Estado para Google Sheets
  const [sheetUrl, setSheetUrl] = useState(config.googleSheetUrl || '');
  const [apiKey, setApiKey] = useState(config.googleApiKey || '');
  const [useApiKey, setUseApiKey] = useState(Boolean(config.googleApiKey));
  const [pollingSeconds, setPollingSeconds] = useState(config.pollingInterval || 60);
  const [sheetError, setSheetError] = useState(null);
  const [sheetSuccess, setSheetSuccess] = useState(null);

  // Manejo de drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Procesar archivo seleccionado
  const processFile = async (file) => {
    setSelectedFile(file);
    setExcelError(null);
    setExcelSuccess(null);
    try {
      const parsed = await parseExcelFile(file);
      setParsedPreview(parsed);
    } catch (err) {
      setExcelError(`Error al leer el archivo: ${err.message}`);
      setParsedPreview(null);
    }
  };

  // Confirmar carga de Excel
  const handleConfirmExcel = async () => {
    if (!parsedPreview) return;
    setIsSyncing(true);
    try {
      const res = await onSyncAttendees(parsedPreview.attendees, 'excel');
      setExcelSuccess(
        `¡Éxito! Se cargaron ${res.summary?.total || parsedPreview.attendees.length} asistentes (${res.summary?.added || 0} nuevos, ${res.summary?.preservedAccreditations || 0} acreditaciones previas conservadas).`
      );
      setParsedPreview(null);
      setSelectedFile(null);
    } catch (err) {
      setExcelError(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Conectar y sincronizar Google Sheets
  const handleConnectSheet = async (isManualClick = false) => {
    if (!sheetUrl.trim()) {
      setSheetError('Por favor ingresá la URL o ID de la Google Sheet.');
      return;
    }

    setSheetError(null);
    setSheetSuccess(null);
    setIsSyncing(true);

    try {
      let parsed;
      if (useApiKey && apiKey.trim()) {
        parsed = await fetchGoogleSheetViaAPI(sheetUrl, apiKey);
      } else {
        parsed = await fetchGoogleSheetViaCSV(sheetUrl);
      }

      // Guardar configuración de la hoja y el intervalo de polling
      await onSaveConfig({
        googleSheetUrl: sheetUrl,
        googleApiKey: apiKey,
        pollingInterval: Number(pollingSeconds),
      });

      const res = await onSyncAttendees(parsed.attendees, 'google-sheets');
      setSheetSuccess(
        `¡Sincronización exitosa! ${res.summary?.total || parsed.attendees.length} asistentes sincronizados (${res.summary?.preservedAccreditations || 0} acreditaciones activas conservadas).`
      );
    } catch (err) {
      setSheetError(
        `Error al sincronizar con Google Sheets: ${err.message}. Verificá que la hoja sea pública ("Cualquier persona con el enlace puede ver") o revisá tu API Key.`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Descargar plantilla Excel de ejemplo
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        DNI: '38123456',
        Nombre: 'Juan Carlos',
        Apellido: 'Pérez',
        Empresa: 'Tech Solutions SA',
        Cargo: 'Director General',
        'Tipo de Entrada': 'VIP',
        Mesa: 'Mesa 1',
        Acompañantes: '1',
      },
      {
        DNI: '40987654',
        Nombre: 'María Eugenia',
        Apellido: 'González',
        Empresa: 'Innovar Group',
        Cargo: 'Gerente de Marketing',
        'Tipo de Entrada': 'General',
        Mesa: 'Mesa 4',
        Acompañantes: '0',
      },
      {
        DNI: '35456789',
        Nombre: 'Lucas',
        Apellido: 'Martínez',
        Empresa: 'Banco Central',
        Cargo: 'Analista Senior',
        'Tipo de Entrada': 'Invitado Especial',
        Mesa: 'Mesa 2',
        Acompañantes: '2',
      },
      {
        DNI: '29876543',
        Nombre: 'Valeria',
        Apellido: 'Fernández',
        Empresa: 'Prensa Libre',
        Cargo: 'Periodista',
        'Tipo de Entrada': 'Prensa',
        Mesa: 'Sector Prensa',
        Acompañantes: '0',
      },
      {
        DNI: '42111222',
        Nombre: 'Agustín',
        Apellido: 'Rodríguez',
        Empresa: 'Fundación Futuro',
        Cargo: 'Coordinador',
        'Tipo de Entrada': 'General',
        Mesa: 'Mesa 5',
        Acompañantes: '0',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitados');
    XLSX.writeFile(workbook, 'Plantilla_Invitados_Ejemplo.xlsx');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuente de Datos de Invitados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cargá la nómina de asistentes desde un archivo Excel local o conectá una Google Sheet en la nube.
          </p>
        </div>
        <button
          onClick={handleDownloadSampleExcel}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-300 transition shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Descargar plantilla Excel de ejemplo</span>
        </button>
      </div>

      {/* Selector de Pestañas de Origen */}
      <div className="flex border-b border-slate-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveSourceTab('excel')}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-semibold text-sm transition ${
            activeSourceTab === 'excel'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Subir Archivo Excel (.xlsx / .csv)</span>
        </button>

        <button
          onClick={() => setActiveSourceTab('sheets')}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-semibold text-sm transition ${
            activeSourceTab === 'sheets'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>Conectar Google Sheet</span>
        </button>
      </div>

      {/* ================= PESTAÑA A: SUBIR EXCEL ================= */}
      {activeSourceTab === 'excel' && (
        <div className="space-y-6">
          {/* Zona Drag & Drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Arrastrá tu archivo Excel (.xlsx, .xls) o CSV aquí
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Detecta automáticamente las columnas mínimas <b>DNI, Nombre, Apellido</b> y todos los campos adicionales (empresa, mesa, VIP, etc.).
            </p>

            <div className="mt-5">
              <label className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 transition">
                <span>Elegir archivo desde la computadora</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Mensajes de Estado */}
          {excelError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{excelError}</span>
            </div>
          )}

          {excelSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{excelSuccess}</span>
            </div>
          )}

          {/* Vista Previa de Detección de Columnas y Filas */}
          {parsedPreview && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-600" />
                    <span>Vista previa del archivo cargado</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Archivo: <b>{selectedFile?.name}</b> — Total: <b>{parsedPreview.attendees.length} asistentes detectados</b>
                  </p>
                </div>
                <button
                  onClick={handleConfirmExcel}
                  disabled={isSyncing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSyncing ? 'Sincronizando...' : 'Confirmar y Cargar Asistentes'}</span>
                </button>
              </div>

              {/* Columnas Mapeadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Columna DNI detectada:</span>
                  <span className="font-bold text-slate-800 font-mono">{parsedPreview.detectedMapping.dni}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Columna Nombre detectada:</span>
                  <span className="font-bold text-slate-800">{parsedPreview.detectedMapping.nombre || '(No especificada)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Columna Apellido detectada:</span>
                  <span className="font-bold text-slate-800">{parsedPreview.detectedMapping.apellido || '(No especificada)'}</span>
                </div>
              </div>

              {/* Campos dinámicos detectados */}
              {parsedPreview.dynamicFields.length > 0 && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Campos adicionales detectados: </span>
                  {parsedPreview.dynamicFields.map((f) => (
                    <span key={f} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md mr-1.5 mb-1 font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Tabla de Primeras 5 Filas */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">DNI</th>
                      <th className="px-3 py-2.5">Nombre</th>
                      <th className="px-3 py-2.5">Apellido</th>
                      {parsedPreview.dynamicFields.slice(0, 4).map((f) => (
                        <th key={f} className="px-3 py-2.5">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                    {parsedPreview.attendees.slice(0, 5).map((att, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-medium">{att.dni}</td>
                        <td className="px-3 py-2 font-medium">{att.nombre}</td>
                        <td className="px-3 py-2 font-medium">{att.apellido}</td>
                        {parsedPreview.dynamicFields.slice(0, 4).map((f) => (
                          <td key={f} className="px-3 py-2 text-slate-500">
                            {att.dynamicFields[f] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PESTAÑA B: GOOGLE SHEETS ================= */}
      {activeSourceTab === 'sheets' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Vincular Hoja de Cálculo de Google Sheets</h3>
            <p className="text-slate-500 text-sm mt-1">
              Conectá la hoja compartida de tu evento para consultar cambios periódicamente sin perder el estado de acreditación.
            </p>
          </div>

          {/* Formulario de Configuración de Sheet */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                URL o ID de la Google Sheet *
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>La hoja debe tener permiso de lectura: <i>"Cualquier persona con el enlace puede ver"</i>.</span>
              </p>
            </div>

            {/* Alternar Modo API Key vs Modo Público */}
            <div className="pt-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useApiKey}
                  onChange={(e) => setUseApiKey(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Usar Google Sheets API v4 oficial (con API Key de Google Cloud)</span>
                </span>
              </label>

              {useApiKey && (
                <div className="mt-2 pl-6">
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ingresá tu API Key de Google Cloud Console con la API de Google Sheets habilitada.
                  </p>
                </div>
              )}
            </div>

            {/* Configuración de Intervalo de Polling */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Intervalo de Polling (Consultas periódicas a la hoja)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Cada 60 seg (Recomendado)', val: 60 },
                  { label: 'Cada 90 seg', val: 90 },
                  { label: 'Cada 120 seg', val: 120 },
                  { label: 'Manual (Sin auto-sync)', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setPollingSeconds(opt.val)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                      Number(pollingSeconds) === opt.val
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                El polling periódico evita saturar la cuota de la API de Google (100 consultas cada 100 segundos) y detecta filas nuevas, editadas o eliminadas.
              </p>
            </div>
          </div>

          {/* Mensajes de Alerta / Éxito */}
          {sheetError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{sheetError}</span>
            </div>
          )}

          {sheetSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{sheetSuccess}</span>
            </div>
          )}

          {/* Botón de Conexión y Estado */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {Number(pollingSeconds) > 0 ? (
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Próxima consulta automática en: <b>{pollingCountdown}s</b>
                </span>
              ) : (
                <span>Polling automático desactivado. Usar sincronización manual.</span>
              )}
            </div>

            <button
              onClick={() => handleConnectSheet(true)}
              disabled={isSyncing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Consultando Google Sheet...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
