# Acreditador Generico de Eventos

Una aplicacion web completa, rapida y reutilizable para la acreditacion de asistentes en eventos corporativos, congresos, festivales y jornadas. Diseñada para operar a maxima velocidad en las puertas de ingreso, tanto en puestos individuales como con multiples operadores sincronizados en tiempo real.

---

## Caracteristicas Principales

### 1. Fuentes de Datos Flexibles
- **Carga de archivos Excel (.xlsx, .xls) o CSV:**
  - Arrastrar y soltar (Drag & Drop) con previsualizacion inmediata de filas y deteccion automatica de encabezados.
  - Incluye plantilla Excel de ejemplo lista para descargar y probar con 1 clic (plantilla_invitados_demo.xlsx).
- **Conexion con Google Sheets en tiempo real:**
  - **Metodo Rapido / Enlace Publico:** Funciona directamente pegando el enlace de Google Sheets compartido ("Cualquier persona con el enlace puede ver" o "Publicar en la web como CSV"). No requiere configurar credenciales complejas en Google Cloud.
  - **Metodo API v4:** Soporte para clave de API oficial de Google Sheets API v4.
  - **Polling Periodico Configurable:** Consultas cada 60, 90 o 120 segundos para evitar agotar la cuota de la API de Google.
  - **Sincronizacion Inteligente sin Perdida de Estado:** Si se agregan, editan o reordenan filas en la hoja de calculo, la app actualiza los datos sin perder el estado de quienes ya fueron acreditados.

### 2. Estructura de Datos Dinamica
- **Campos minimos requeridos:** DNI, Nombre, Apellido (detectados automaticamente por sinonimos: documento, doc, rut, cedula, name, firstname, lastname, etc.).
- **Campos dinamicos ilimitados:** Cualquier columna adicional presente en el archivo (empresa, cargo, tipo de entrada, mesa, sector, acompañantes, observaciones) es tratada como campo configurable.

### 3. Vista de Acreditador (Puesto de Puerta)
- **Ultra rapida y optimizada para agilidad:**
  - Campo de busqueda grande con foco automatico constante.
  - Busqueda primaria y exacta por DNI (compatible con lectores de codigo de barras o teclado numerico).
  - Busqueda secundaria por Nombre o Apellido (insensible a mayusculas, minusculas y tildes).
  - Atajos de teclado:
    - Enter: Si hay una unica coincidencia, acredita inmediatamente.
    - Esc: Limpia el buscador y devuelve el foco para el siguiente asistente.
- **Prevencion de doble acreditacion:**
  - Si una persona ya fue acreditada, la app muestra una advertencia visual destacada indicando la fecha, hora exacta y que operador la acredito.
  - Alerta sonora diferenciada de advertencia.
- **Feedback Sonoro Inmediato:**
  - Tonos generados mediante la API nativa de Audio del navegador (sin descargas de archivos de audio externas). Silenciable con 1 clic desde la barra superior.
- **Historial de ultimos acreditados en vivo:**
  - Panel lateral con los ultimos ingresos registrados y boton de Deshacer acreditacion en caso de error involuntario del operador.

### 4. Panel de Administracion y Configuracion
- **Selector de campos visibles:** Elige que columnas de la hoja se muestran en las tarjetas del acreditador.
- **Renombrador de etiquetas:** Modifica nombres tecnicos de columnas (ej. CAT_TICKET por Tipo de Entrada).
- **Filtros rapidos de puerta:** Asigna un campo dinamico (ej. Tipo de Entrada = VIP o Sector = Puerta Norte) para que el operador trabaje filtrando su subconjunto de invitados.
- **Identificador de Operador:** Personaliza el nombre o puesto de puerta (ej. Puerta 1, Mesa VIP, Operador Juan) que se grabara en la auditoria.
- **Persistencia garantizada:** Guarda la configuracion en localStorage y en la base local del servidor.

### 5. Metricas y Exportacion
- **Estadisticas en vivo:** Total de invitados, acreditados, pendientes y porcentaje de afluencia.
- **Desglose por categoria:** Graficos de barras para ver el porcentaje de ingreso por Tipo de Entrada o Sector.
- **Exportacion con auditoria:**
  - Exportacion a Excel (.xlsx) con todas las columnas originales mas columnas de auditoria: Estado, Fecha Acreditacion y Operador.
  - Exportacion a CSV con codificacion UTF-8 BOM para apertura correcta en hojas de calculo.

### 6. Soporte Multi-Operador y Modo Offline
- **Multi-Operador en red local o nube:** Servidor Node.js con WebSockets. Cuando cualquier operador acredita a un asistente, se actualiza automaticamente en las pantallas de todos los demas operadores conectados en simultaneo.
- **Modo Offline:** Si se interrumpe la conexion a internet, la aplicacion sigue funcionando con los datos almacenados en el navegador y encola las acreditaciones para sincronizarlas al reconectar.

---

## Tecnologias Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, SheetJS (xlsx).
- **Backend:** Node.js, Express, WebSockets (ws), CORS, JSON File Persistence (data/event_data.json).
- **Audio:** Web Audio API nativo del navegador.

---

## Instrucciones de Instalacion y Ejecucion

### Requisitos
- Node.js (version 18 o superior).

### 1. Iniciar con doble clic (Recomendado)
- Haz doble clic en el archivo `iniciar.bat`.
- Se abrira la consola y tu navegador en: `http://localhost:3001`

### 2. Iniciar en Modo Desarrollo (Vite + Servidor)
```powershell
npm.cmd run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### 3. Iniciar en Modo Produccion (Servidor unificado)
```powershell
npm.cmd run build
npm.cmd start
```
- Aplicacion disponible en: `http://localhost:3001`

---

## Estructura del Proyecto

```
Acreditador Generico/
├── data/                       # Almacenamiento local persistente (event_data.json)
├── dist/                       # Build optimizado para produccion
├── server/
│   └── index.js                # Servidor Express, WebSockets y Proxy de Google Sheets
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Barra de navegacion, conexion y toggles
│   │   ├── OperatorView.jsx    # Pantalla rapida de puerta para operadores
│   │   ├── DataSourceView.jsx  # Carga de Excel / Google Sheets con polling
│   │   ├── SettingsView.jsx    # Configuracion de campos, etiquetas y filtros
│   │   └── StatsView.jsx       # Reportes, graficos y exportacion a Excel/CSV
│   ├── services/
│   │   └── api.js              # Cliente de sincronizacion WebSocket / REST / Offline
│   ├── utils/
│   │   ├── excel.js            # Lectura y exportacion Excel / CSV con SheetJS
│   │   ├── googleSheets.js     # Integracion Google Sheets (CSV y API v4)
│   │   └── sound.js            # Feedback de audio sintetizado con Web Audio API
│   ├── App.jsx                 # Componente raiz y orquestador de estado
│   ├── index.css               # Estilos globales y Tailwind CSS
│   └── main.jsx                # Punto de entrada Vite React
├── plantilla_invitados_demo.xlsx # Archivo demo generado para pruebas inmediatas
├── iniciar.bat                 # Script de arranque rapido
├── iniciar_dev.bat             # Script de arranque en modo desarrollo
├── subir_a_github.bat          # Script para sincronizar con GitHub
├── package.json
└── vite.config.js
```
