import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Eye, 
  Tag, 
  Filter, 
  User, 
  Check, 
  Save, 
  Volume2, 
  VolumeX,
  Sparkles,
  Layers,
  HelpCircle,
  Lock
} from 'lucide-react';

export default function SettingsView({
  config,
  onSaveConfig,
  attendees,
  operatorName,
  setOperatorName,
  soundEnabled,
  setSoundEnabled,
  autoClearSearch,
  setAutoClearSearch,
}) {
  const [visibleFields, setVisibleFields] = useState(config.visibleFields || []);
  const [fieldLabels, setFieldLabels] = useState(config.fieldLabels || {});
  const [filterField, setFilterField] = useState(config.filterField || '');
  const [currentOperator, setCurrentOperator] = useState(operatorName);
  const [adminPin, setAdminPin] = useState(config.adminPin || '1234');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Obtener todos los campos dinámicos disponibles en la nómina de asistentes
  const availableFields = useMemo(() => {
    const fieldsSet = new Set();
    attendees.forEach((a) => {
      if (a.dynamicFields) {
        Object.keys(a.dynamicFields).forEach((k) => fieldsSet.add(k));
      }
    });
    // Si la lista está vacía, mostrar algunos campos típicos de ejemplo
    if (fieldsSet.size === 0) {
      ['empresa', 'cargo', 'tipoEntrada', 'mesa', 'acompañantes'].forEach((k) => fieldsSet.add(k));
    }
    return Array.from(fieldsSet);
  }, [attendees]);

  // Alternar campo visible
  const toggleVisibleField = (field) => {
    setVisibleFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Actualizar etiqueta personalizada
  const handleLabelChange = (field, newLabel) => {
    setFieldLabels((prev) => ({
      ...prev,
      [field]: newLabel,
    }));
  };

  // Guardar configuración completa
  const handleSave = async () => {
    const newConfig = {
      ...config,
      visibleFields,
      fieldLabels,
      filterField,
      adminPin: adminPin.trim() || '1234',
    };
    await onSaveConfig(newConfig);
    setOperatorName(currentOperator);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>Configuración del Evento y Operador</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personalizá los campos visibles en la tarjeta del asistente, renombrá etiquetas y definí filtros de acceso.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>¡Guardado!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Perfil del Operador y Puesto de Puerta */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          <span>Identificación de este Operador / Puesto de Puerta</span>
        </h2>
        <p className="text-xs text-slate-500">
          Este nombre quedará grabado en la columna de auditoría ("Operador") de cada persona acreditada.
        </p>
        <div className="max-w-md">
          <input
            type="text"
            value={currentOperator}
            onChange={(e) => setCurrentOperator(e.target.value)}
            placeholder="Ej: Puerta Norte 1, Mesa VIP, Operador Juan"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 2. Selección de Campos Visibles en la Tarjeta */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" />
              <span>Campos Visibles en la Pantalla de Acreditación</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Marcá qué columnas del archivo/hoja querés que el operador vea en la tarjeta al buscar una persona.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {availableFields.map((field) => {
            const isVisible = visibleFields.includes(field);
            const label = fieldLabels[field] || field;

            return (
              <label
                key={field}
                className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                  isVisible
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleVisibleField(field)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs truncate" title={label}>
                  {label}
                  {fieldLabels[field] && (
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Original: {field}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Renombrar Etiquetas de Columnas */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-600" />
          <span>Renombrar Etiquetas de Columnas</span>
        </h2>
        <p className="text-xs text-slate-500">
          Si los encabezados originales de tu hoja son crudos (ej: <code>TIPO_DE_ENTRADA_REG</code>), podés ponerles nombres limpios para el operador.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {['dni', 'nombre', 'apellido', ...availableFields].map((field) => (
            <div key={field} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="w-1/3 font-semibold text-slate-600 truncate" title={field}>
                {field}:
              </span>
              <input
                type="text"
                value={fieldLabels[field] || ''}
                onChange={(e) => handleLabelChange(field, e.target.value)}
                placeholder={field}
                className="w-2/3 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Definir Filtro Rápido en Puerta */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-5 h-5 text-emerald-600" />
          <span>Filtro de Sector / Puerta (Opcional)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Elegí un campo dinámico para que aparezca como selector de filtro rápido en la pantalla del operador (ej: filtrar por Tipo de Entrada o Mesa).
        </p>

        <div className="max-w-md">
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">(Sin filtro especial por sector)</option>
            {availableFields.map((f) => (
              <option key={f} value={f}>
                Filtrar por: {fieldLabels[f] || f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Seguridad y PIN de Administrador */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <span>Seguridad: PIN de Acceso Administrador</span>
        </h2>
        <p className="text-xs text-slate-500">
          Este PIN protege las pestañas de Fuente de Datos, Configuración y Reportes. Los operadores en las puertas solo tendrán acceso a la pantalla de Acreditar y no podrán alterar ni borrar la base de datos sin este PIN.
        </p>

        <div className="max-w-xs">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            PIN Actual / Nuevo (4 a 8 dígitos)
          </label>
          <input
            type="password"
            maxLength={10}
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            placeholder="1234"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 6. Preferencias Generales */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span>Preferencias de Operación</span>
        </h2>

        <div className="space-y-3 pt-1">
          {/* Audio */}
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-slate-700">
              Activar tonos de confirmación de audio (acreditación exitosa y alerta de doble acreditación)
            </span>
          </label>

          {/* Auto clear */}
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoClearSearch}
              onChange={(e) => setAutoClearSearch(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-slate-700">
              Limpiar automáticamente el buscador tras una acreditación exitosa (ideal para lectores de código de barras)
            </span>
          </label>
        </div>
      </div>

    </div>
  );
}
