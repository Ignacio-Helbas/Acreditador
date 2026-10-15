import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoAttendees = [
  {
    DNI: '38123456',
    Nombre: 'Juan Carlos',
    Apellido: 'Pérez',
    Empresa: 'Google Cloud Argentina',
    Cargo: 'Cloud Architect',
    'Tipo de Entrada': 'VIP',
    Mesa: 'Mesa 1 - Principal',
    Acompañantes: '1',
    Observaciones: 'Invitado Especial'
  },
  {
    DNI: '40987654',
    Nombre: 'María Eugenia',
    Apellido: 'González',
    Empresa: 'Mercado Libre',
    Cargo: 'Engineering Lead',
    'Tipo de Entrada': 'General',
    Mesa: 'Mesa 4',
    Acompañantes: '0',
    Observaciones: 'Vegetariana'
  },
  {
    DNI: '35456789',
    Nombre: 'Lucas',
    Apellido: 'Martínez',
    Empresa: 'Globant',
    Cargo: 'Senior Developer',
    'Tipo de Entrada': 'Speaker',
    Mesa: 'Mesa 2',
    Acompañantes: '1',
    Observaciones: 'Panel Inteligencia Artificial'
  },
  {
    DNI: '29876543',
    Nombre: 'Valeria',
    Apellido: 'Fernández',
    Empresa: 'Infobae',
    Cargo: 'Periodista de Tecnología',
    'Tipo de Entrada': 'Prensa',
    Mesa: 'Sector Prensa',
    Acompañantes: '0',
    Observaciones: 'Acreditación con cámara'
  },
  {
    DNI: '42111222',
    Nombre: 'Agustín',
    Apellido: 'Rodríguez',
    Empresa: 'Fintech Latam',
    Cargo: 'Product Manager',
    'Tipo de Entrada': 'General',
    Mesa: 'Mesa 5',
    Acompañantes: '0',
    Observaciones: '-'
  },
  {
    DNI: '33444555',
    Nombre: 'Carolina',
    Apellido: 'Sánchez',
    Empresa: 'Tech Academy',
    Cargo: 'Directora Académica',
    'Tipo de Entrada': 'VIP',
    Mesa: 'Mesa 1 - Principal',
    Acompañantes: '2',
    Observaciones: 'Asiste con comitiva'
  },
  {
    DNI: '28999888',
    Nombre: 'Roberto',
    Apellido: 'López',
    Empresa: 'Telecomunicaciones del Sur',
    Cargo: 'Gerente Comercial',
    'Tipo de Entrada': 'General',
    Mesa: 'Mesa 6',
    Acompañantes: '0',
    Observaciones: '-'
  },
  {
    DNI: '37654321',
    Nombre: 'Florencia',
    Apellido: 'Díaz',
    Empresa: 'Agencia Digital Uno',
    Cargo: 'Diseñadora UX/UI',
    'Tipo de Entrada': 'Invitado Especial',
    Mesa: 'Mesa 3',
    Acompañantes: '0',
    Observaciones: '-'
  }
];

const worksheet = XLSX.utils.json_to_sheet(demoAttendees);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitados');

const targetPath = path.join(__dirname, '..', 'plantilla_invitados_demo.xlsx');
XLSX.writeFile(workbook, targetPath);
console.log(`[OK] Archivo demo generado con exito en: ${targetPath}`);
