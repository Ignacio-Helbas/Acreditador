import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Activity,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { exportAttendeesToExcel, exportAttendeesToCSV } from '../utils/excel';
import { subscribeToActivityFeed, isFirebaseConfigured } from '../services/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { formatTime, cn } from '../lib/utils';

export default function StatsView({
  attendees = [],
  config = {},
  eventName = 'Evento',
  onResetAccreditations,
  onToggleAccredit,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACCREDITED' | 'PENDING'
  const [currentPage, setCurrentPage] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const pageSize = 20;

  // Suscripción al feed de actividad en vivo desde Firestore (si está activo)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribe = subscribeToActivityFeed(
      'main-event',
      (feed) => {
        setActivityFeed(feed);
      },
      (err) => console.warn('Feed error:', err)
    );
    return () => unsubscribe();
  }, []);

  // Métricas generales (Estilo Tremor KPI)
  const total = attendees.length;
  const accredited = attendees.filter((a) => a.acreditado).length;
  const pending = total - accredited;
  const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;

  // Desglose por Punto de Acceso / Operador
  const doorStats = useMemo(() => {
    const counts = {};
    attendees.forEach((a) => {
      if (!a.acreditado) return;
      const door = a.puntoAcceso || (a.operador ? String(a.operador).split('(')[1]?.replace(')', '') : 'Sin asignar') || 'Puerta 1';
      counts[door] = (counts[door] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([door, count]) => ({
        door,
        count,
        percentage: accredited > 0 ? Math.round((count / accredited) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [attendees, accredited]);

  // Desglose por campo de filtro o tipo de entrada si existe
  const categoryField = config.filterField || 'tipoEntrada';
  const categoryStats = useMemo(() => {
    const counts = {};
    attendees.forEach((a) => {
      const cat = a.dynamicFields?.[categoryField] || 'General';
      if (!counts[cat]) {
        counts[cat] = { total: 0, accredited: 0 };
      }
      counts[cat].total++;
      if (a.acreditado) counts[cat].accredited++;
    });
    return Object.entries(counts).map(([cat, data]) => ({
      category: cat,
      total: data.total,
      accredited: data.accredited,
      percentage: data.total > 0 ? Math.round((data.accredited / data.total) * 100) : 0,
    }));
  }, [attendees, categoryField]);

  // Feed fallback local si no hay Firestore
  const displayFeed = useMemo(() => {
    if (activityFeed.length > 0) return activityFeed;
    return attendees
      .filter((a) => a.acreditado && a.fechaAcreditacion)
      .sort((a, b) => new Date(b.fechaAcreditacion) - new Date(a.fechaAcreditacion))
      .slice(0, 25)
      .map((a) => ({
        id: a.dni,
        dni: a.dni,
        nombre: a.nombre,
        apellido: a.apellido,
        action: 'ACCREDIT',
        operador: a.operador || a.puntoAcceso || 'Operador',
        puntoAcceso: a.puntoAcceso || 'Puerta 1',
        timestamp: a.fechaAcreditacion,
      }));
  }, [activityFeed, attendees]);

  // Asistentes filtrados para la tabla
  const filteredAttendees = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return attendees.filter((att) => {
      if (statusFilter === 'ACCREDITED' && !att.acreditado) return false;
      if (statusFilter === 'PENDING' && att.acreditado) return false;

      if (!q) return true;

      const dniMatch = String(att.dni || '').toLowerCase().includes(q);
      const nameMatch = `${att.nombre || ''} ${att.apellido || ''}`.toLowerCase().includes(q);
      return dniMatch || nameMatch;
    });
  }, [attendees, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAttendees.length / pageSize) || 1;
  const paginatedAttendees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttendees.slice(start, start + pageSize);
  }, [filteredAttendees, currentPage]);

  const labels = config.fieldLabels || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header Estilo Tremor / shadcn-admin */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard de Acreditación
            </h1>
            <Badge variant="outline" className="font-mono">LIVE</Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Métricas de afluencia, monitoreo de puntos de acceso y exportación de nómina.
          </p>
        </div>

        {/* Acciones de exportación */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAttendeesToExcel(attendees, eventName, config)}
            className="gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAttendeesToCSV(attendees, eventName, config)}
            className="gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>CSV</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowResetModal(true)}
            className="gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reiniciar</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Estilo Tremor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI: Total Invitados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Nómina
            </CardTitle>
            <Users className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{total}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Invitados cargados</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI: Acreditados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Acreditados
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{accredited}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="success" className="text-[10px] px-1.5 py-0 font-mono">
                {rate}% ingresado
              </Badge>
              <span className="text-[11px] text-zinc-400">del total</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI: Pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Pendientes
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{pending}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-mono">
                {100 - rate}%
              </Badge>
              <span className="text-[11px] text-zinc-400">por arribar</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI: Tremor Progress Bar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Progreso General
            </CardTitle>
            <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">{rate}%</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${rate}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>{accredited} ingresaron</span>
              <span>{pending} faltan</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Grid: Desglose por Puntos de Acceso + Live Stream Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Desglose por Puerta / Acceso */}
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Acreditaciones por Punto de Acceso</span>
                </CardTitle>
                <CardDescription>Distribución de ingresos por puerta física</CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {doorStats.length} {doorStats.length === 1 ? 'puerta' : 'puertas'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {doorStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Aún no hay ingresos registrados desde ningún punto de acceso.
              </div>
            ) : (
              <div className="space-y-3">
                {doorStats.map((item) => (
                  <div key={item.door} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {item.door}
                      </span>
                      <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <strong className="text-zinc-900 dark:text-zinc-100">{item.count}</strong> ({item.percentage}%)
                      </span>
                    </div>
                    {/* Tremor Progress Bar para cada puerta */}
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full" 
                        style={{ width: `${item.percentage}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Feed con indicador de latencia */}
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>Feed de Ingresos en Vivo</span>
                </CardTitle>
                <CardDescription>Actividad transmitida en tiempo real</CardDescription>
              </div>
              <Badge variant="warning" className="gap-1 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                EN VIVO
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayFeed.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Esperando las primeras acreditaciones para mostrar el flujo en tiempo real...
                </div>
              ) : (
                displayFeed.map((item, idx) => (
                  <div
                    key={item.id || `${item.dni}-${idx}`}
                    className="p-2.5 rounded-md border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.nombre} {item.apellido}
                      </p>
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        <span className="font-mono">DNI {item.dni}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{item.puntoAcceso || item.operador}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] text-zinc-400 block">
                        {formatTime(item.timestamp)}
                      </span>
                      <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                        Check-in
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Desglose por Categoría / Tipo de Entrada */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-xs font-semibold">
              Desglose por {labels[categoryField] || categoryField}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categoryStats.map((item) => (
                <div key={item.category} className="p-3 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.category}</span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {item.accredited}/{item.total} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla Completa de Asistentes estilo shadcn/ui */}
      <Card>
        <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por DNI o apellido..."
                className="pl-8"
              />
            </div>

            <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
              <button
                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  statusFilter === 'ALL'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                Todos ({total})
              </button>
              <button
                onClick={() => { setStatusFilter('ACCREDITED'); setCurrentPage(1); }}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  statusFilter === 'ACCREDITED'
                    ? 'bg-white text-emerald-600 shadow-sm dark:bg-zinc-900 dark:text-emerald-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                Acreditados ({accredited})
              </button>
              <button
                onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  statusFilter === 'PENDING'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                Pendientes ({pending})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">DNI</TableHead>
                <TableHead>Asistente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Hora Ingreso</TableHead>
                <TableHead>Punto de Acceso</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAttendees.map((att) => (
                <TableRow key={att.id || att.dni}>
                  <TableCell className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {att.dni}
                  </TableCell>
                  <TableCell className="font-medium">
                    {att.apellido}, {att.nombre}
                  </TableCell>
                  <TableCell>
                    {att.acreditado ? (
                      <Badge variant="success">Acreditado</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-zinc-500">
                    {formatTime(att.fechaAcreditacion)}
                  </TableCell>
                  <TableCell className="text-zinc-500 text-[11px] truncate max-w-[140px]">
                    {att.puntoAcceso || att.operador || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={att.acreditado ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => onToggleAccredit(att.dni, !att.acreditado)}
                      className={att.acreditado ? 'text-zinc-400 hover:text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}
                    >
                      {att.acreditado ? 'Deshacer' : 'Acreditar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {paginatedAttendees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-zinc-400">
                    No se encontraron asistentes con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 text-xs text-zinc-500">
              <span>Página {currentPage} de {totalPages} ({filteredAttendees.length} resultados)</span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación para Reiniciar Acreditaciones */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
              <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-2 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold">
                ¿Reiniciar todas las acreditaciones?
              </CardTitle>
              <CardDescription>
                Esta acción marcará a todos los <strong>{total} asistentes</strong> como pendientes en la base de datos en tiempo real y borrará las marcas de tiempo. La nómina no se borrará.
              </CardDescription>
            </CardHeader>
            <div className="flex space-x-2.5 p-4 pt-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowResetModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={async () => {
                  await onResetAccreditations();
                  setShowResetModal(false);
                }}
              >
                Sí, reiniciar a cero
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
