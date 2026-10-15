import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { initFirebase, getDb } from './firebase';

// Inicializar instancia de Auth
export function getFirebaseAuth() {
  const { initialized } = initFirebase();
  if (!initialized) {
    console.warn('Firebase no inicializado al solicitar getFirebaseAuth');
  }
  return getAuth();
}

/**
 * Iniciar sesión con Google (Popup)
 */
export async function loginWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Verificar si el email está autorizado en la colección admins
  const authCheck = await checkAdminAccess(user.email);
  if (!authCheck.isAuthorized) {
    // Si no está autorizado, cerramos sesión de inmediato
    await signOut(auth);
    throw new Error(`El email "${user.email}" no está en la lista de administradores autorizados.`);
  }

  return { user, adminRecord: authCheck.adminRecord };
}

/**
 * Iniciar sesión con Email y Contraseña
 */
export async function loginWithEmail(email, password) {
  const auth = getFirebaseAuth();
  const cleanEmail = String(email).trim().toLowerCase();

  const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const user = result.user;

  const authCheck = await checkAdminAccess(user.email || cleanEmail);
  if (!authCheck.isAuthorized) {
    await signOut(auth);
    throw new Error(`El email "${cleanEmail}" no está en la lista de administradores autorizados.`);
  }

  return { user, adminRecord: authCheck.adminRecord };
}

/**
 * Cerrar sesión
 */
export async function logoutUser() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/**
 * Observar cambios en el estado de autenticación
 */
export function onAuthChange(callback) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, false);
      return;
    }

    try {
      const authCheck = await checkAdminAccess(user.email);
      callback(user, authCheck.isAuthorized, authCheck.adminRecord);
    } catch (err) {
      console.warn('Error verificando rol de admin:', err);
      callback(user, false, null);
    }
  });
}

/**
 * Verificar si un email figura como administrador activo en Firestore
 * Colección: /admins/{email.toLowerCase()}
 */
export async function checkAdminAccess(email) {
  if (!email) return { isAuthorized: false, adminRecord: null };
  const database = getDb();
  if (!database) return { isAuthorized: false, adminRecord: null };

  const cleanEmail = String(email).trim().toLowerCase();
  const adminDocRef = doc(database, 'admins', cleanEmail);

  try {
    const docSnap = await getDoc(adminDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const isActive = data.active !== false; // true si no se definió false
      return { isAuthorized: isActive, adminRecord: data };
    }
    return { isAuthorized: false, adminRecord: null };
  } catch (err) {
    console.error('Error al consultar colección admins en Firestore:', err);
    return { isAuthorized: false, adminRecord: null, error: err.message };
  }
}

/**
 * Obtener todos los administradores registrados (solo ejecutable por admins)
 */
export async function getAdminsList() {
  const database = getDb();
  if (!database) return [];

  const snap = await getDocs(collection(database, 'admins'));
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list;
}

/**
 * Agregar un nuevo administrador a la colección
 */
export async function addAdminUser(email, note = '') {
  const database = getDb();
  if (!database) throw new Error('Firestore no disponible');

  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Email inválido');
  }

  const docRef = doc(database, 'admins', cleanEmail);
  const data = {
    email: cleanEmail,
    role: 'admin',
    active: true,
    note: note || '',
    createdAt: serverTimestamp(),
  };

  await setDoc(docRef, data, { merge: true });
  return data;
}

/**
 * Eliminar o desactivar un administrador
 */
export async function removeAdminUser(email) {
  const database = getDb();
  if (!database) throw new Error('Firestore no disponible');

  const cleanEmail = String(email).trim().toLowerCase();
  const docRef = doc(database, 'admins', cleanEmail);
  await deleteDoc(docRef);
}
