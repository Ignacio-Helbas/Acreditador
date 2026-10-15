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
  Layers,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Configuración de Campos y Filtros</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Personalizá los campos visibles en la tarjeta del asistente, renombrá etiquetas y definí filtros de acceso.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Guardado</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>

      {/* 1. SELECCIÓN DE CAMPOS VISIBLES EN LA VISTA DE OPERADOR */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm sm:text-base">
          <Eye className="w-4 h-4 text-emerald-600" />
          <span>Campos visibles en la acreditación</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Marcá los datos que el operador necesita ver en pantalla al momento de validar al asistente (DNI, Nombre y Apellido se muestran siempre de forma obligatoria).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
          {availableFields.map((field) => {
            const isSelected = visibleFields.includes(field);
            return (
              <button
                key={field}
                type="button"
                onClick={() => toggleVisibleField(field)}
                className={`p-3 rounded-lg border text-left transition flex items-center justify-between text-xs font-semibold ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <span className="truncate mr-1 capitalize">{fieldLabels[field] || field}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RENOMBRAR ETIQUETAS DE COLUMNAS */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm sm:text-base">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>Renombrar etiquetas de campos</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Si el archivo original tiene encabezados técnicos (ej: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px]">col_tipo_inv</code>), renombralos para que el operador los entienda al instante.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {['dni', 'nombre', 'apellido', ...visibleFields].map((field) => (
            <div key={field} className="flex items-center gap-2">
              <span className="w-28 text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate capitalize">
                {field}:
              </span>
              <input
                type="text"
                value={fieldLabels[field] !== undefined ? fieldLabels[field] : field}
                onChange={(e) => handleLabelChange(field, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. CAMPO PARA FILTRO RÁPIDO */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm sm:text-base">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filtro de Segmentación</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Elegí qué columna usar como filtro rápido en la puerta (ej: Tipo de Entrada, Sector o Mesa).
        </p>

        <div className="max-w-xs pt-1">
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Sin filtro adicional</option>
            {availableFields.map((field) => (
              <option key={field} value={field}>
                {fieldLabels[field] || field}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. PREFERENCIAS DEL OPERADOR */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm sm:text-base">
          <User className="w-4 h-4 text-emerald-600" />
          <span>Identificador de Puesto de Operador</span>
        </div>

        <div className="max-w-sm">
          <input
            type="text"
            value={currentOperator}
            onChange={(e) => setCurrentOperator(e.target.value)}
            placeholder="Ej: Puerta Principal - Puesto 1"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Este nombre se estampa en cada acreditación y en los registros de auditoría.
          </p>
        </div>
      </div>

    </div>
  );
}
