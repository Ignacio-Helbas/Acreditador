# Acreditador Generico de Eventos

Una aplicacion web completa, rapida y reutilizable para la acreditacion de asistentes en eventos corporativos, congresos, festivales y jornadas. Diseñada para operar a maxima velocidad en las puertas de ingreso, tanto en puestos individuales como con multiples operadores sincronizados en tiempo real.

---

## Caracteristicas Principales

### 1. Control de Acceso y Roles (Administrador vs Operador)
- **Modo Operador (Puesto de Puerta):**
  - Vista limpia y enfocada unicamente en buscar asistentes y acreditarlos.
  - Proteccion total: los operadores no pueden ver ni acceder a la carga de Excel, Google Sheets, configuraciones ni opciones de reinicio.
- **Modo Administrador (Organizador):**
  - Protegido por PIN de seguridad (por defecto: `1234`, configurable en Ajustes).
  - Acceso completo a carga de datos, configuracion de campos, metricas avanzadas, exportacion a Excel/CSV y reinicio del evento.
  - Bloqueo rapido para entregar la computadora o tablet a los recepcionistas con total tranquilidad.

### 2. Fuentes de Datos Flexibles
- **Carga de archivos Excel (.xlsx, .xls) o CSV:**
  - Arrastrar y soltar (Drag & Drop) con previsualizacion inmediata de filas y deteccion automatica de encabezados.
  - Incluye plantilla Excel de ejemplo lista para descargar y probar con 1 clic (`plantilla_invitados_demo.xlsx`).
- **Conexion con Google Sheets en tiempo real:**
  - **Metodo Rapido / Enlace Publico:** Funciona directamente pegando el enlace de Google Sheets compartido ("Cualquier persona con el enlace puede ver" o "Publicar en la web como CSV"). No requiere configurar credenciales en Google Cloud.
  - **Metodo API v4:** Soporte para clave de API oficial de Google Sheets API v4.
  - **Polling Periodico Configurable:** Consultas cada 60, 90 o 120 segundos para evitar agotar la cuota de la API de Google.
  - **Sincronizacion Inteligente sin Perdida de Estado:** Si se agregan, editan o reordenan filas en la hoja de calculo, la app actualiza los datos sin perder el estado de quienes ya fueron acreditados.

### 3. Estructura de Datos Dinamica
- **Campos minimos requeridos:** DNI, Nombre, Apellido (detectados automaticamente por sinonimos: documento, doc, rut, cedula, name, firstname, lastname, etc.).
- **Campos dinamicos ilimitados:** Cualquier columna adicional presente en el archivo (empresa, cargo, tipo de entrada, mesa, sector, acompañantes, observaciones) es tratada como campo configurable.

### 4. Vista de Acreditador (Puesto de Puerta)
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

## Despliegue en la Nube (Sin depender de tu computadora)

Para que la app este disponible en internet en un enlace web publico (por ejemplo `https://tu-acreditador.onrender.com`) y cualquier operador pueda abrirla desde su celular, tablet o laptop sin depender de que tu computadora este encendida:

### Opcion Recomendada: Render.com (Gratis)
1. Crea una cuenta gratuita en [render.com](https://render.com).
2. Haz clic en **New +** y selecciona **Web Service**.
3. Conecta tu repositorio de GitHub (`Ignacio-Helbas/Acreditador`).
4. Configura los siguientes campos (Render suele detectarlos automaticamente con el archivo `render.yaml` incluido):
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Haz clic en **Create Web Service**.
6. En un par de minutos, Render te proporcionara un enlace publico permanente (HTTPS) para compartir con tu equipo de acreditacion.

---

## Ejecucion en Local

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

### 3. Subir cambios a GitHub
- Haz doble clic en el archivo `subir_a_github.bat`.

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
│   │   ├── Navbar.jsx          # Barra de navegacion, roles y toggles
│   │   ├── OperatorView.jsx    # Pantalla rapida de puerta para operadores
│   │   ├── DataSourceView.jsx  # Carga de Excel / Google Sheets con polling
│   │   ├── SettingsView.jsx    # Configuracion de campos, etiquetas, filtros y PIN
│   │   ├── StatsView.jsx       # Reportes, graficos y exportacion a Excel/CSV
│   │   └── AdminPinModal.jsx   # Modal de seguridad para ingresar PIN de administrador
│   ├── services/
│   │   └── api.js              # Cliente de sincronizacion WebSocket / REST / Offline / PIN
│   ├── utils/
│   │   ├── excel.js            # Lectura y exportacion Excel / CSV con SheetJS
│   │   ├── googleSheets.js     # Integracion Google Sheets (CSV y API v4)
│   │   └── sound.js            # Feedback de audio sintetizado con Web Audio API
│   ├── App.jsx                 # Componente raiz y orquestador de estado y roles
│   ├── index.css               # Estilos globales y Tailwind CSS
│   └── main.jsx                # Punto de entrada Vite React
├── plantilla_invitados_demo.xlsx # Archivo demo generado para pruebas inmediatas
├── render.yaml                 # Configuracion para despliegue automatico en Render.com
├── iniciar.bat                 # Script de arranque rapido
├── iniciar_dev.bat             # Script de arranque en modo desarrollo
├── subir_a_github.bat          # Script para sincronizar con GitHub
├── package.json
└── vite.config.js
```
