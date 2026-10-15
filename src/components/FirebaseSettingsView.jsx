import React, { useState, useEffect } from 'react';
import { Flame, Check, AlertCircle, Save, ExternalLink, RefreshCw, Key, ShieldCheck, Database } from 'lucide-react';
import { getFirebaseConfig, saveFirebaseConfig, initFirebase, isFirebaseConfigured } from '../services/firebase';
import { apiService } from '../services/api';

export default function FirebaseSettingsView() {
  const [configText, setConfigText] = useState('');
  const [isConnected, setIsConnected] = useState(isFirebaseConfigured());
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const current = getFirebaseConfig();
    if (current) {
      setConfigText(JSON.stringify(current, null, 2));
    }
  }, []);

  const handleTestAndSave = () => {
    setStatusMessage(null);
    setTesting(true);

    try {
      let parsed = null;
      const trimmed = configText.trim();

      if (!trimmed) {
        // Desconectar Firebase
        apiService.setFirebaseConfig(null);
        setIsConnected(false);
        setStatusMessage({ type: 'info', text: 'Firebase desconectado. La app usará la memoria local / polling.' });
        setTesting(false);
        return;
      }

      // Si pegó un objeto JS tipo const firebaseConfig = { ... }
      if (trimmed.includes('{')) {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // Normalizar claves no citadas si pegó código JS
          const cleanJson = jsonMatch[0]
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
            .replace(/'/g, '"');
          parsed = JSON.parse(cleanJson);
        }
      }

      if (!parsed || !parsed.projectId || !parsed.apiKey) {
        throw new Error('La configuración debe incluir al menos "projectId" y "apiKey".');
      }

      const res = apiService.setFirebaseConfig(parsed);
      if (res.success) {
        setIsConnected(true);
        setStatusMessage({
          type: 'success',
          text: `¡Conexión exitosa con Firestore (Proyecto: ${parsed.projectId})! La sincronización en tiempo real multi-puerta ya está activa.`,
        });
      } else {
        throw new Error(res.error || 'No se pudo conectar a Firebase.');
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Error de configuración: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Base de Datos en Tiempo Real (Firebase Firestore)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Permite que múltiples operadores acrediten simultáneamente desde diferentes dispositivos y puertas sin pisarse.
          </p>
        </div>

        {/* Badge de Estado */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              FIRESTORE EN VIVO ACTIVO
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              Modo Local / Sin Firebase
            </span>
          )}
        </div>
      </div>

      {/* Tarjeta de Configuración */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Configuración de Firebase Web (JSON)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Copiá y pegá el objeto <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px]">firebaseConfig</code> que te da Firebase Console en la sección <b>Configuración del proyecto &gt; Tus apps &gt; Web</b>.
            </p>
          </div>
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold shrink-0"
          >
            <span>Ir a Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div>
          <textarea
            rows={8}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "mi-evento.firebaseapp.com",\n  "projectId": "mi-evento",\n  "storageBucket": "mi-evento.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "1:..."\n}`}
            className="w-full p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Mensaje de estado */}
        {statusMessage && (
          <div
            className={`p-4 rounded-lg text-xs sm:text-sm flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{statusMessage.text}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleTestAndSave}
            disabled={testing}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{testing ? 'Verificando...' : 'Guardar y Activar Sincronización'}</span>
          </button>

          {isConnected && (
            <button
              onClick={() => {
                setConfigText('');
                apiService.setFirebaseConfig(null);
                setIsConnected(false);
                setStatusMessage({ type: 'info', text: 'Firebase desconectado.' });
              }}
              className="text-xs text-zinc-500 hover:text-rose-600 underline transition"
            >
              Desvincular Firebase
            </button>
          )}
        </div>
      </div>

      {/* Guía Rápida */}
      <div className="bg-zinc-100/60 dark:bg-zinc-900/60 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
        <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-amber-500" />
          <span>¿Cómo funciona el estado compartido?</span>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Google Sheets:</b> Sigue siendo la lista maestra de invitados (nombre, DNI, mesa, categoría).</li>
          <li><b>Cloud Firestore:</b> Mantiene el estado en caliente de quién ya ingresó, quién lo acreditó y desde qué puerta.</li>
          <li><b>Multi-Puerta en vivo:</b> Si Puerta 1 acredita a alguien, Puerta 2 lo ve reflejado en su pantalla al instante y no lo deja ingresar de nuevo.</li>
          <li><b>Transacciones atómicas:</b> Si dos puertas acreditan al mismo DNI en la misma milésima de segundo, gana la primera y la segunda es avisada de inmediato.</li>
        </ul>
      </div>

    </div>
  );
}
