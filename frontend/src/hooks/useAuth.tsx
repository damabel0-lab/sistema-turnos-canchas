import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Rol = 'super_admin' | 'recepcionista' | 'cliente';

export interface PerfilUsuario {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol: Rol;
  es_socio: boolean;
}

interface AuthContextValue {
  session: Session | null;
  perfil: PerfilUsuario | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  registrarse: (datos: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    telefono?: string;
  }) => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Cargar sesión inicial + escuchar cambios de autenticación
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva);
    });

    return () => suscripcion.subscription.unsubscribe();
  }, []);

  // Cargar el perfil cuando hay sesión
  useEffect(() => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }

    supabase
      .from('usuarios')
      .select('id, nombre, apellido, telefono, rol, es_socio')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setPerfil(data as PerfilUsuario | null));
  }, [session?.user?.id]);

  async function entrar(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email o contraseña incorrectos');
  }

  async function registrarse(datos: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    telefono?: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) return;

    // Alta del perfil en public.usuarios (requiere que exista el trigger o permiso de inserción)
    const { error: errorPerfil } = await supabase.from('usuarios').insert({
      id: data.user.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono ?? null,
      rol: 'cliente',
      es_socio: false,
    });
    if (errorPerfil) console.warn('No se pudo crear el perfil:', errorPerfil.message);
  }

  async function salir() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, entrar, registrarse, salir }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
