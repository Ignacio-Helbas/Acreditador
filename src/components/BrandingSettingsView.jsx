import React, { useState } from 'react';
import { Image, Upload, Trash2, Check, Lock, Sparkles, AlertCircle } from 'lucide-react';

export default function BrandingSettingsView({
  eventName,
  eventLogo,
  onSaveBranding,
  config,
  onSaveConfig
}) {
  const [name, setName] = useState(eventName || '');
  const [logoPreview, setLogoPreview] = useState(eventLogo || null);
  const [adminPin, setAdminPin] = useState(config.adminPin || '1234');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Procesar archivo de imagen con redimensionamiento a tamaño óptimo de logo
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'El archivo seleccionado debe ser una imagen (PNG, JPG, SVG, WEBP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensionar suavemente si es muy grande para no sobrecargar el almacenamiento
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const optimizedBase64 = canvas.toDataURL('image/png');
        setLogoPreview(optimizedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'El nombre del evento no puede estar vacío.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await onSaveBranding(name.trim(), logoPreview);
      if (adminPin.trim() && adminPin !== config.adminPin) {
        await onSaveConfig({ ...config, adminPin: adminPin.trim() }, name.trim());
      }
      setMessage({ type: 'success', text: 'Personalización guardada con éxito.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setMessage({ type: 'error', text: `Error al guardar: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Personalización del Evento
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configura el nombre y el logo institucional que se mostrarán en la cabecera tanto para los operadores como para los organizadores.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Nombre del Evento */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-3">
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Nombre del Evento *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Cumbre de Tecnología e Innovación 2026"
            className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-emerald-500"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Este nombre se verá en el título superior de todas las pantallas y en los encabezados de reportes.
          </p>
        </div>

        {/* Logo del Evento */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Logo o Isotipo del Evento
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Formato recomendado: PNG transparente o SVG cuadrado (relación 1:1).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* Vista previa en miniatura */}
            <div className="w-24 h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-2 shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded" />
              ) : (
                <div className="text-zinc-400 text-xs text-center font-medium">
                  Sin logo
                </div>
              )}
            </div>

            {/* Acciones de carga */}
            <div className="space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition">
                  <Upload className="w-4 h-4" />
                  <span>Subir imagen de logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar logo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Previsualización en vivo de la cabecera */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-2">
              Previsualización de la barra superior:
            </span>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700/60 flex items-center space-x-3">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-8 w-8 object-contain rounded border border-zinc-200 dark:border-zinc-700 bg-white p-0.5" />
              ) : (
                <div className="h-8 w-8 rounded bg-zinc-900 text-white font-bold flex items-center justify-center text-xs">
                  {name ? name.charAt(0).toUpperCase() : 'E'}
                </div>
              )}
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {name || 'Nombre del evento'}
              </span>
            </div>
          </div>
        </div>

        {/* Seguridad: PIN de Administrador */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-3">
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            PIN de Administrador (Seguridad)
          </label>
          <div className="max-w-xs">
            <input
              type="password"
              maxLength={10}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="1234"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-emerald-500"
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Los operadores que no tengan este PIN solo podrán acreditar y no verán esta pestaña ni podrán borrar datos.
          </p>
        </div>

        {/* Mensaje de Feedback */}
        {message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}>
            <span>{message.text}</span>
          </div>
        )}

        {/* Botón Guardar */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-sm active:scale-95 transition disabled:opacity-50"
          >
            {isSaving ? 'Guardando cambios...' : 'Guardar personalización'}
          </button>
        </div>

      </form>

    </div>
  );
}
