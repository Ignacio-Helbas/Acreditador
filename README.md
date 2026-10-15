# 🎫 Acreditador Genérico de Eventos

Una aplicación web completa, rápida y reutilizable para la acreditación de asistentes en eventos corporativos, congresos, festivales y jornadas. Diseñada para operar a máxima velocidad en las puertas de ingreso, tanto en puestos individuales como con múltiples operadores sincronizados en tiempo real.

---

## 🚀 Características Principales

### 1. Fuentes de Datos Flexibles
- **Carga de archivos Excel (`.xlsx`, `.xls`) o CSV:**
  - Arrastrar y soltar (Drag & Drop) con previsualización inmediata de filas y detección automática de encabezados.
  - Incluye plantilla Excel de ejemplo lista para descargar y probar con 1 clic (`plantilla_invitados_demo.xlsx`).
- **Conexión con Google Sheets en tiempo real:**
  - **Método Rápido / Enlace Público:** Funciona directamente pegando el enlace de Google Sheets compartido (*"Cualquier persona con el enlace puede ver"* o *"Publicar en la web como CSV"*). ¡No requiere configurar Google Cloud Console!
  - **Método API v4:** Soporte para clave de API oficial de Google Sheets API v4.
  - **Polling Periódico Configurable:** Consultas cada 60, 90 o 120 segundos para evitar agotar la cuota de la API de Google.
  - **Sincronización Inteligente sin Pérdida de Estado:** Si se agregan, editan o reordenan filas en la hoja de cálculo, la app actualiza los datos **sin perder el estado de quiénes ya fueron acreditados**.

### 2. Estructura de Datos Dinámica
- **Campos mínimos requeridos:** `DNI`, `Nombre`, `Apellido` (detectados automáticamente por sinónimos: *documento, doc, rut, cédula, name, firstname, lastname, etc.*).
- **Campos dinámicos ilimitados:** Cualquier columna adicional presente en el archivo (empresa, cargo, tipo de entrada, mesa, sector, acompañantes, observaciones) es tratada como campo configurable.

### 3. Vista de Acreditador (Puesto de Puerta)
- **Ultra rápida y optimizada para agilidad:**
  - Campo de búsqueda grande con **foco automático constante**.
  - Búsqueda primaria y exacta por **DNI** (compatible con lectores de código de barras o ingreso por teclado numérico).
  - Búsqueda secundaria por **Nombre o Apellido** (tolerante a mayúsculas, minúsculas y tildes).
  - Atajos de teclado:
    - `Enter`: Si hay una única coincidencia, acredita inmediatamente.
    - `Esc`: Limpia el buscador y devuelve el foco para el siguiente asistente.
- **Prevención de doble acreditación:**
  - Si una persona ya fue acreditada, la app muestra una advertencia visual prominente indicando la fecha, hora exacta y qué operador la acreditó.
  - Alerta sonora diferenciada de advertencia.
- **Feedback Sonoro Inmediato:**
  - Acordes armónicos generados mediante la API nativa de Audio del navegador (sin descargas de archivos de audio externas). Silenciable con 1 clic desde la barra superior.
- **Historial de últimos acreditados en vivo:**
  - Panel lateral con los últimos ingresos registrados y botón de **Deshacer acreditación** en caso de error involuntario del operador.

### 4. Panel de Administración y Configuración
- **Selector de campos visibles:** Elegí qué columnas de la hoja se muestran en las tarjetas del acreditador.
- **Renombrador de etiquetas:** Cambiá nombres técnicos de columnas (ej. `CAT_TICKET` por `Tipo de Entrada`).
- **Filtros rápidos de puerta:** Asigná un campo dinámico (ej. `Tipo de Entrada = VIP` o `Sector = Puerta Norte`) para que el operador trabaje filtrando su subconjunto de invitados.
- **Identificador de Operador:** Personalizá el nombre o puesto de puerta (ej. `Puerta 1`, `Mesa VIP`, `Operador Nacho`) que se grabará en la auditoría.
- **Persistencia garantizada:** Guarda la configuración en `localStorage` y en la base local del servidor.

### 5. Métricas y Exportación
- **Estadísticas en vivo:** Total de invitados, acreditados, pendientes y porcentaje de afluencia.
- **Desglose por categoría:** Gráficos de barras para ver el porcentaje de ingreso por Tipo de Entrada o Sector.
- **Exportación con auditoría:**
  - Exportación a **Excel (`.xlsx`)** con todas las columnas originales + columnas de auditoría: `Estado`, `Fecha Acreditación` y `Operador`.
  - Exportación a **CSV** con codificación UTF-8 BOM para apertura perfecta en Excel.

### 6. Soporte Multi-Operador y Modo Offline
- **Multi-Operador en red local o nube:** Servidor Node.js con WebSockets. Cuando cualquier operador acredita a un asistente, se actualiza automáticamente en las pantallas de todos los demás operadores conectados en simultáneo.
- **Modo Offline:** Si se interrumpe la conexión a internet, la aplicación sigue funcionando con los datos almacenados en el navegador y encola las acreditaciones para sincronizarlas al reconectar.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, SheetJS (`xlsx`).
- **Backend:** Node.js, Express, WebSockets (`ws`), CORS, JSON File Persistence (`data/event_data.json`).
- **Audio:** Web Audio API nativo del navegador.

---

## 💻 Instrucciones de Instalación y Ejecución

### Requisitos
- Node.js (versión 18 o superior).

### 1. Iniciar en Modo Desarrollo (Frontend + Backend concurrentes)
```powershell
npm.cmd run dev
```
- La aplicación abrirá el frontend en: `http://localhost:5173`
- El servidor backend y WebSocket se iniciará en: `http://localhost:3001`

### 2. Iniciar en Modo Producción (Servidor unificado)
```powershell
npm.cmd run build
npm.cmd start
```
- La aplicación completa (interfaz web + API + WebSockets) estará disponible en: `http://localhost:3001`

---

## 📁 Estructura del Proyecto

```
Acreditador Generico/
├── data/                       # Almacenamiento local persistente (event_data.json)
├── dist/                       # Build optimizado para producción
├── server/
│   └── index.js                # Servidor Express, WebSockets y Proxy de Google Sheets
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Barra de navegación, conexión y toggles
│   │   ├── OperatorView.jsx    # Pantalla rápida de puerta para operadores
│   │   ├── DataSourceView.jsx  # Carga de Excel / Google Sheets con polling
│   │   ├── SettingsView.jsx    # Configuración de campos, etiquetas y filtros
│   │   └── StatsView.jsx       # Reportes, gráficos y exportación a Excel/CSV
│   ├── services/
│   │   └── api.js              # Cliente de sincronización WebSocket / REST / Offline
│   ├── utils/
│   │   ├── excel.js            # Lectura y exportación Excel / CSV con SheetJS
│   │   ├── googleSheets.js     # Integración Google Sheets (CSV y API v4)
│   │   └── sound.js            # Feedback de audio sintetizado con Web Audio API
│   ├── App.jsx                 # Componente raíz y orquestador de estado
│   ├── index.css               # Estilos globales y Tailwind CSS
│   └── main.jsx                # Punto de entrada Vite React
├── plantilla_invitados_demo.xlsx # Archivo demo generado para pruebas inmediatas
├── package.json
└── vite.config.js
```
