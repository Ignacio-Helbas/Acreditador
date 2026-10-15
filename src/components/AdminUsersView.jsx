import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, ShieldCheck, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAdminsList, addAdminUser, removeAdminUser } from '../services/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { formatDate } from '../lib/utils';

export default function AdminUsersView({ currentUserEmail }) {
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const list = await getAdminsList();
      setAdmins(list);
    } catch (err) {
      console.warn('Error al cargar lista de administradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Por favor ingresá un correo electrónico válido.' });
      return;
    }

    setAdding(true);
    setMessage(null);
    try {
      await addAdminUser(newEmail.trim(), newNote.trim());
      setNewEmail('');
      setNewNote('');
      setMessage({ type: 'success', text: `Administrador "${newEmail.trim().toLowerCase()}" agregado con éxito.` });
      await fetchAdmins();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al agregar administrador.' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email) => {
    if (email === currentUserEmail) {
      alert('No podés eliminar tu propia cuenta de administrador.');
      return;
    }
    if (!window.confirm(`¿Seguro que deseás revocar el acceso de administrador a ${email}?`)) {
      return;
    }

    try {
      await removeAdminUser(email);
      setMessage({ type: 'info', text: `Acceso revocado para ${email}.` });
      await fetchAdmins();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al eliminar administrador.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Gestión de Administradores Autorizados</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Solo los correos registrados en esta lista pueden acceder al panel administrativo y modificar la base de datos.
          </p>
        </div>
      </div>

      {/* Formulario de Alta de Nuevo Admin */}
      <Card>
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Autorizar Nuevo Administrador</span>
          </CardTitle>
          <CardDescription>
            Agregá el correo de Google o email con el que la persona iniciará sesión en el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Correo Electrónico (Gmail o Institucional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ejemplo@utn.edu.ar o usuario@gmail.com"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Nota / Rol / Puesto (Opcional)
              </label>
              <Input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Coordinador general, Staff acreditación, etc."
              />
            </div>

            <Button
              type="submit"
              variant="default"
              isLoading={adding}
              className="gap-1.5 shrink-0 h-9"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Autorizar</span>
            </Button>
          </form>

          {message && (
            <div className={`mt-3 p-3 rounded-md text-xs flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                : message.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Administradores Registrados */}
      <Card>
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Cuentas Autorizadas ({admins.length})</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdmins}
              disabled={loading}
              className="text-xs"
            >
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email de Administrador</TableHead>
                <TableHead>Rol / Permiso</TableHead>
                <TableHead>Detalle / Nota</TableHead>
                <TableHead>Fecha de Alta</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((adm) => (
                <TableRow key={adm.id || adm.email}>
                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {adm.email}
                    {adm.email === currentUserEmail && (
                      <span className="ml-2 text-[10px] text-emerald-600 font-sans font-bold">(Tú)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" className="font-mono text-[9px]">
                      {adm.role || 'ADMIN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">
                    {adm.note || '-'}
                  </TableCell>
                  <TableCell className="text-zinc-400 font-mono text-[11px]">
                    {adm.createdAt ? formatDate(adm.createdAt.toDate ? adm.createdAt.toDate().toISOString() : adm.createdAt) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {adm.email !== currentUserEmail && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(adm.email)}
                        className="text-zinc-400 hover:text-rose-600"
                        title="Revocar acceso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {admins.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    No se encontraron administradores registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
