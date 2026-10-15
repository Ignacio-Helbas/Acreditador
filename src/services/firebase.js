import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp, 
  writeBatch,
  query,
  orderBy,
  limit,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

const FIREBASE_CONFIG_KEY = 'acreditador_firebase_config';
const DEFAULT_EVENT_ID = 'main-event';

// Obtener configuración de Firebase (Variables de entorno o localStorage)
export function getFirebaseConfig() {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.projectId && parsed.apiKey) {
          return parsed;
        }
      } catch (e) {
        console.warn('Configuración local de Firebase inválida:', e);
      }
    }
  }

  // Fallback a variables de entorno de Vite
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

// Guardar configuración de Firebase personalizada
export function saveFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    return;
  }
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

let app = null;
let db = null;

// Inicializa Firebase Firestore
export function initFirebase() {
  const config = getFirebaseConfig();
  if (!config) {
    return { initialized: false, db: null, error: 'Sin configuración de Firebase' };
  }

  try {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    db = getFirestore(app);

    // Intentar inicio de sesión anónimo transparente para cumplir con request.auth != null
    try {
      const auth = getAuth(app);
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((authErr) => {
          console.warn('Inicio anónimo no habilitado en Firebase Console (opcional):', authErr.message);
        });
      }
    } catch (authInitErr) {
      // Si Firebase Auth no se requiere, ignorar silenciosamente
    }

    return { initialized: true, db, error: null };
  } catch (err) {
    console.error('Error inicializando Firebase:', err);
    return { initialized: false, db: null, error: err.message };
  }
}

export function getDb() {
  if (!db) {
    const res = initFirebase();
    return res.db;
  }
  return db;
}

export function isFirebaseConfigured() {
  return Boolean(getFirebaseConfig());
}

/**
 * -------------------------------------------------------------
 * LISTENERS EN TIEMPO REAL
 * -------------------------------------------------------------
 */

// 1. Suscribirse a los datos del evento (nombre, logo, config)
export function subscribeToEvent(eventId = DEFAULT_EVENT_ID, onUpdate, onError) {
  const database = getDb();
  if (!database) return () => {};

  const eventDocRef = doc(database, 'events', eventId);
  return onSnapshot(
    eventDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Error en listener de evento Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// 2. Suscribirse a la nómina completa de asistentes (actualizaciones en tiempo real)
export function subscribeToAttendees(eventId = DEFAULT_EVENT_ID, onUpdate, onError) {
  const database = getDb();
  if (!database) return () => {};

  const collRef = collection(database, 'events', eventId, 'attendees');
  return onSnapshot(
    collRef,
    (snapshot) => {
      const attendees = [];
      snapshot.forEach((docSnap) => {
        attendees.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(attendees);
    },
    (err) => {
      console.warn('Error en listener de asistentes Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// 3. Suscribirse al Feed de Actividad en vivo (para el panel de Admin)
export function subscribeToActivityFeed(eventId = DEFAULT_EVENT_ID, onUpdate, onError) {
  const database = getDb();
  if (!database) return () => {};

  const feedRef = collection(database, 'events', eventId, 'activity_feed');
  const q = query(feedRef, orderBy('timestamp', 'desc'), limit(40));

  return onSnapshot(
    q,
    (snapshot) => {
      const feed = [];
      snapshot.forEach((docSnap) => {
        feed.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(feed);
    },
    (err) => {
      console.warn('Error en listener de feed Firestore:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * -------------------------------------------------------------
 * OPERACIONES ATÓMICAS Y TRANSACCIONES
 * -------------------------------------------------------------
 */

// Acreditar asistente con transacción atómica (Primera escritura gana)
export async function accreditAttendeeTransaction(
  eventId = DEFAULT_EVENT_ID,
  dni,
  puntoAcceso = 'Puerta 1',
  operador = 'Operador Puerta'
) {
  const database = getDb();
  if (!database) {
    throw new Error('Firebase Firestore no está inicializado.');
  }

  const cleanDni = String(dni).trim().toLowerCase();
  const attendeeRef = doc(database, 'events', eventId, 'attendees', cleanDni);
  const feedRef = doc(collection(database, 'events', eventId, 'activity_feed'));

  return await runTransaction(database, async (transaction) => {
    const attendeeDoc = await transaction.get(attendeeRef);

    if (!attendeeDoc.exists()) {
      throw new Error(`Asistente con DNI ${dni} no encontrado en la base de datos.`);
    }

    const data = attendeeDoc.data();

    // Detección estricta de doble acreditación
    if (data.acreditado) {
      return {
        success: false,
        alreadyAccredited: true,
        attendee: data,
        error: `Ya fue acreditado previamente por ${data.operador || data.puntoAcceso || 'otro operador'} a las ${data.fechaAcreditacion}`,
      };
    }

    const nowIso = new Date().toISOString();
    const updatedData = {
      ...data,
      acreditado: true,
      fechaAcreditacion: nowIso,
      operador: operador || puntoAcceso,
      puntoAcceso: puntoAcceso,
    };

    // Actualizar el documento del asistente
    transaction.update(attendeeRef, {
      acreditado: true,
      fechaAcreditacion: nowIso,
      operador: operador || puntoAcceso,
      puntoAcceso: puntoAcceso,
      updatedAt: serverTimestamp(),
    });

    // Registrar en el Feed de Actividad en vivo
    transaction.set(feedRef, {
      dni: data.dni,
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      action: 'ACCREDIT',
      operador: operador || puntoAcceso,
      puntoAcceso: puntoAcceso,
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      attendee: updatedData,
    };
  });
}

// Deshacer acreditación con transacción atómica
export async function undoAccreditationTransaction(
  eventId = DEFAULT_EVENT_ID,
  dni,
  puntoAcceso = 'Puerta 1',
  operador = 'Operador Puerta'
) {
  const database = getDb();
  if (!database) {
    throw new Error('Firebase Firestore no está inicializado.');
  }

  const cleanDni = String(dni).trim().toLowerCase();
  const attendeeRef = doc(database, 'events', eventId, 'attendees', cleanDni);
  const feedRef = doc(collection(database, 'events', eventId, 'activity_feed'));

  return await runTransaction(database, async (transaction) => {
    const attendeeDoc = await transaction.get(attendeeRef);

    if (!attendeeDoc.exists()) {
      throw new Error(`Asistente con DNI ${dni} no encontrado.`);
    }

    const data = attendeeDoc.data();
    const nowIso = new Date().toISOString();

    transaction.update(attendeeRef, {
      acreditado: false,
      fechaAcreditacion: null,
      operador: null,
      puntoAcceso: null,
      updatedAt: serverTimestamp(),
    });

    // Registrar evento en feed de actividad
    transaction.set(feedRef, {
      dni: data.dni,
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      action: 'UNDO',
      operador: operador || puntoAcceso,
      puntoAcceso: puntoAcceso,
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      attendee: {
        ...data,
        acreditado: false,
        fechaAcreditacion: null,
        operador: null,
        puntoAcceso: null,
      },
    };
  });
}

// Sincronizar nómina de asistentes en batch a Firestore preservando acreditaciones
export async function syncAttendeesToFirestore(eventId = DEFAULT_EVENT_ID, incomingAttendees = [], source = 'excel') {
  const database = getDb();
  if (!database) {
    throw new Error('Firebase Firestore no está conectado.');
  }

  // 1. Obtener asistentes existentes para no pisar acreditaciones previas
  const existingMap = new Map();
  try {
    const existingSnap = await getDocs(collection(database, 'events', eventId, 'attendees'));
    existingSnap.forEach((docSnap) => {
      existingMap.set(docSnap.id, docSnap.data());
    });
  } catch (err) {
    console.warn('Error leyendo asistentes previos de Firestore:', err);
  }

  let preservedCount = 0;
  let addedCount = 0;
  let updatedCount = 0;

  // 2. Procesar en batches de 450 (límite de Firestore es 500 operaciones por batch)
  const batchSize = 400;
  for (let i = 0; i < incomingAttendees.length; i += batchSize) {
    const chunk = incomingAttendees.slice(i, i + batchSize);
    const batch = writeBatch(database);

    for (const att of chunk) {
      const cleanDni = String(att.dni).trim().toLowerCase();
      const existing = existingMap.get(cleanDni);
      const docRef = doc(database, 'events', eventId, 'attendees', cleanDni);

      let record;
      if (existing) {
        // Conservar acreditación previa si ya estaba acreditado
        const wasAccredited = Boolean(existing.acreditado);
        if (wasAccredited) preservedCount++;
        else updatedCount++;

        record = {
          ...existing,
          ...att,
          acreditado: wasAccredited,
          fechaAcreditacion: wasAccredited ? existing.fechaAcreditacion : null,
          operador: wasAccredited ? existing.operador : null,
          puntoAcceso: wasAccredited ? existing.puntoAcceso : null,
          updatedAt: serverTimestamp(),
        };
      } else {
        addedCount++;
        record = {
          ...att,
          acreditado: false,
          fechaAcreditacion: null,
          operador: null,
          puntoAcceso: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      batch.set(docRef, record, { merge: true });
    }

    await batch.commit();
  }

  // Registrar fecha de actualización en el evento
  const eventRef = doc(database, 'events', eventId);
  await setDoc(
    eventRef,
    {
      lastUpdated: new Date().toISOString(),
      lastSyncSource: source,
      totalAttendees: incomingAttendees.length,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    summary: {
      total: incomingAttendees.length,
      added: addedCount,
      updated: updatedCount,
      preservedAccreditations: preservedCount,
    },
  };
}

// Guardar configuración general del evento en Firestore
export async function saveEventConfigToFirestore(eventId = DEFAULT_EVENT_ID, config = {}, eventName = '') {
  const database = getDb();
  if (!database) return;

  const eventRef = doc(database, 'events', eventId);
  const data = {
    config,
    updatedAt: serverTimestamp(),
  };
  if (eventName) data.name = eventName;

  await setDoc(eventRef, data, { merge: true });
}

// Guardar marca del evento (nombre y logo) en Firestore
export async function saveEventBrandingToFirestore(eventId = DEFAULT_EVENT_ID, eventName = '', eventLogo = null) {
  const database = getDb();
  if (!database) return;

  const eventRef = doc(database, 'events', eventId);
  await setDoc(
    eventRef,
    {
      name: eventName,
      logo: eventLogo,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Reiniciar todas las acreditaciones a cero
export async function resetAllAccreditationsInFirestore(eventId = DEFAULT_EVENT_ID) {
  const database = getDb();
  if (!database) return;

  const snap = await getDocs(collection(database, 'events', eventId, 'attendees'));
  const batchSize = 400;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = writeBatch(database);
    for (const d of chunk) {
      batch.update(d.ref, {
        acreditado: false,
        fechaAcreditacion: null,
        operador: null,
        puntoAcceso: null,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
