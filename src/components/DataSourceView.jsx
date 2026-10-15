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
  ExternalLink,
  Check
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
        `Se cargaron ${res.summary?.total || parsedPreview.attendees.length} asistentes (${res.summary?.added || 0} nuevos, ${res.summary?.preservedAccreditations || 0} acreditaciones previas conservadas).`
      );
      setParsedPreview(null);
      setSelectedFile(null);
    } catch (err) {
      setExcelError(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Conectar y probar Google Sheet
  const handleConnectSheet = async () => {
    setSheetError(null);
    setSheetSuccess(null);

    if (!sheetUrl.trim()) {
      setSheetError('Por favor ingresá el enlace de la Google Sheet');
      return;
    }

    setIsSyncing(true);
    try {
      let parsed;
      if (useApiKey && apiKey.trim()) {
        parsed = await fetchGoogleSheetViaAPI(sheetUrl, apiKey);
      } else {
        parsed = await fetchGoogleSheetViaCSV(sheetUrl);
      }

      if (!parsed || !parsed.attendees || parsed.attendees.length === 0) {
        throw new Error('No se detectaron filas o columnas válidas (DNI, Nombre, Apellido) en la hoja.');
      }

      // Guardar configuración del enlace y tiempo de polling
      await onSaveConfig({
        ...config,
        googleSheetUrl: sheetUrl.trim(),
        googleApiKey: useApiKey ? apiKey.trim() : '',
        pollingInterval: Number(pollingSeconds) || 60,
      });

      // Sincronizar asistentes con la base de datos
      const res = await onSyncAttendees(parsed.attendees, 'google-sheets');

      setSheetSuccess(
        `Google Sheet vinculada. Se sincronizaron ${res.summary?.total || parsed.attendees.length} asistentes. Consulta cada ${pollingSeconds}s.`
      );
    } catch (err) {
      setSheetError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Desconectar Google Sheet
  const handleDisconnectSheet = async () => {
    setSheetUrl('');
    setApiKey('');
    await onSaveConfig({
      ...config,
      googleSheetUrl: '',
      googleApiKey: '',
      pollingInterval: 0,
    });
    setSheetSuccess('Sincronización con Google Sheet desvinculada.');
  };

  // Descargar plantilla Excel de ejemplo
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        DNI: '38123456',
        Nombre: 'Juan Carlos',
        Apellido: 'González',
        Empresa: 'Tech Solutions SA',
        Cargo: 'Director General',
        'Tipo de Entrada': 'VIP',
        Mesa: 'Mesa 1',
        Acompañantes: '1',
      },
      {
        DNI: '35444888',
        Nombre: 'Mariana',
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Fuente de Datos de Invitados
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Cargá la nómina de asistentes desde un archivo Excel local o conectá una Google Sheet en la nube.
          </p>
        </div>
        <button
          onClick={handleDownloadSampleExcel}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-emerald-600 transition shadow-sm self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Descargar plantilla Excel</span>
        </button>
      </div>

      {/* Selector de Pestañas de Origen */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 space-x-2">
        <button
          onClick={() => setActiveSourceTab('excel')}
          className={`flex items-center space-x-2 py-2.5 px-4 border-b-2 font-semibold text-xs sm:text-sm transition ${
            activeSourceTab === 'excel'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Subir Archivo Excel (.xlsx / .csv)</span>
        </button>

        <button
          onClick={() => setActiveSourceTab('sheets')}
          className={`flex items-center space-x-2 py-2.5 px-4 border-b-2 font-semibold text-xs sm:text-sm transition ${
            activeSourceTab === 'sheets'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
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
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Arrastrá tu archivo Excel (.xlsx, .xls) o CSV aquí
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              Detecta automáticamente las columnas mínimas <b>DNI, Nombre, Apellido</b> y todos los campos adicionales (empresa, mesa, VIP, etc.).
            </p>

            <div className="mt-5">
              <label className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm transition">
                <span>Elegir archivo desde la computadora</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFile && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 font-mono">
                Archivo seleccionado: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Alertas */}
          {excelError && (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en la lectura del archivo</p>
                <p className="text-xs mt-0.5 opacity-90">{excelError}</p>
              </div>
            </div>
          )}

          {excelSuccess && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sincronización exitosa</p>
                <p className="text-xs mt-0.5 opacity-90">{excelSuccess}</p>
              </div>
            </div>
          )}

          {/* Previsualización de los datos parseados antes de confirmar */}
          {parsedPreview && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Previsualización del archivo</span>
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Se detectaron <b className="font-mono">{parsedPreview.attendees.length}</b> invitados válidos y <b className="font-mono">{parsedPreview.allHeaders.length}</b> columnas.
                  </p>
                </div>

                <button
                  onClick={handleConfirmExcel}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isSyncing ? 'Sincronizando...' : 'Confirmar y Cargar Asistentes'}</span>
                </button>
              </div>

              {/* Columnas detectadas */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase mr-1">Columnas:</span>
                {parsedPreview.allHeaders.map((h) => {
                  const isCore = ['dni', 'nombre', 'apellido'].includes(h.toLowerCase());
                  return (
                    <span
                      key={h}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        isCore
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {h}
                    </span>
                  );
                })}
              </div>

              {/* Muestra de primeras 5 filas */}
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-3 py-2 font-mono">DNI</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Apellido</th>
                      <th className="px-3 py-2">Campos Adicionales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {parsedPreview.attendees.slice(0, 5).map((att, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="px-3 py-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">{att.dni}</td>
                        <td className="px-3 py-2">{att.nombre}</td>
                        <td className="px-3 py-2">{att.apellido}</td>
                        <td className="px-3 py-2 text-zinc-500 text-[11px]">
                          {Object.entries(att.dynamicFields || {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PESTAÑA B: CONECTAR GOOGLE SHEETS ================= */}
      {activeSourceTab === 'sheets' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            
            {/* Input URL */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Enlace / URL de la Google Sheet
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Asegurate de que la hoja tenga permiso de lectura pública o esté configurada como <i>"Cualquier usuario con el enlace puede leer"</i>.
              </p>
            </div>

            {/* Configuración de Polling Inteligente (60-120 seg) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Intervalo de consulta periódica (Polling)
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={pollingSeconds}
                    onChange={(e) => setPollingSeconds(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={30}>Cada 30 segundos</option>
                    <option value={60}>Cada 60 segundos (Recomendado)</option>
                    <option value={120}>Cada 120 segundos (Ahorro de cuota)</option>
                    <option value={300}>Cada 5 minutos</option>
                    <option value={0}>Manual únicamente (Sin polling)</option>
                  </select>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Evita saturar la cuota de la API de Google consultando periódicamente en segundo plano.
                </p>
              </div>

              {/* Modo API Key Opcional */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  <input
                    type="checkbox"
                    checked={useApiKey}
                    onChange={(e) => setUseApiKey(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Usar Google Sheets API Key (Opcional)</span>
                </label>
                {useApiKey && (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSyB..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                  />
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Si la hoja es pública, no se requiere API Key.
                </p>
              </div>
            </div>

            {/* Alertas Sheets */}
            {sheetError && (
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error de conexión con Google Sheets</p>
                  <p className="text-xs mt-0.5 opacity-90">{sheetError}</p>
                </div>
              </div>
            )}

            {sheetSuccess && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Conexión establecida</p>
                  <p className="text-xs mt-0.5 opacity-90">{sheetSuccess}</p>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleConnectSheet}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Conectando...' : 'Conectar y Sincronizar Ahora'}</span>
                </button>

                {config.googleSheetUrl && (
                  <button
                    onClick={handleDisconnectSheet}
                    className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 text-xs font-semibold transition"
                  >
                    Desconectar hoja
                  </button>
                )}
              </div>

              {config.googleSheetUrl && (
                <div className="flex items-center text-xs text-zinc-500 font-mono">
                  <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span>Próxima consulta en: <b>{pollingCountdown}s</b></span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
