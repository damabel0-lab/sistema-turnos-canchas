import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Send, Trash2, X, Images } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, haceCuanto, leerImagen } from './Avatar';

interface Autor {
  id: string;
  nombre: string;
  apellido: string;
  es_dueno: boolean;
}

interface Publicacion {
  id: number;
  texto: string | null;
  creado_en: string;
  autor: Autor;
  imagenes: { id: number; url: string }[];
  reacciones: number;
  me_gusta: boolean;
  comentarios: number;
}

interface Comentario {
  id: number;
  texto: string;
  creado_en: string;
  autor: Autor;
}

interface FotoPendiente {
  data: string;
  nombre: string;
}

const MAX_FOTOS = 4;
const MAX_BYTES = 6 * 1024 * 1024;

/** Muro social del complejo: publicaciones con fotos, likes y comentarios. */
export function MuroComplejo({
  slug,
  puedeModerar,
}: {
  slug: string;
  /** dueño/recepcionista del complejo o super_admin: puede borrar publicaciones ajenas */
  puedeModerar: boolean;
}) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    api<Publicacion[]>(`/publicaciones/complejo/${slug}`)
      .then((lista) => setPublicaciones(lista))
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el muro'))
      .finally(() => setCargando(false));
  }, [slug]);

  useEffect(() => {
    setCargando(true);
    setError(null);
    cargar();
  }, [cargar]);

  const publicar = (nueva: Publicacion) => setPublicaciones((prev) => [nueva, ...prev]);

  const borrarPublicacion = async (id: number) => {
    if (!window.confirm('¿Borrar esta publicación?')) return;
    try {
      await api(`/publicaciones/${id}`, { method: 'DELETE' });
      setPublicaciones((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  };

  const reaccionar = async (id: number) => {
    try {
      const r = await api<{ me_gusta: boolean; reacciones: number }>(`/publicaciones/${id}/reaccion`, {
        method: 'POST',
      });
      setPublicaciones((prev) =>
        prev.map((p) => (p.id === id ? { ...p, me_gusta: r.me_gusta, reacciones: r.reacciones } : p)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reaccionar');
    }
  };

  return (
    <section className="muro" aria-label="Actividad del complejo">
      <div className="muro-titulo">
        <h2>Actividad</h2>
        <span className="texto-debil">Lo que pasa en este complejo</span>
      </div>

      <Compositor slug={slug} onPublicar={publicar} />

      {error && <div className="alerta-error" role="alert">{error}</div>}

      {cargando ? (
        <p className="texto-sec">Cargando publicaciones…</p>
      ) : publicaciones.length === 0 ? (
        <div className="muro-vacio">
          <MessageCircle size={26} strokeWidth={1.6} />
          <p>Todavía no hay publicaciones. Sé el primero en contar algo.</p>
        </div>
      ) : (
        <div className="muro-lista">
          {publicaciones.map((p) => (
            <PublicacionCard
              key={p.id}
              pub={p}
              puedeModerar={puedeModerar}
              onReaccionar={reaccionar}
              onBorrar={borrarPublicacion}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ================= Compositor ================= */

function Compositor({ slug, onPublicar }: { slug: string; onPublicar: (p: Publicacion) => void }) {
  const { perfil } = useAuth();
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<FotoPendiente[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const agregarFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const disponibles = MAX_FOTOS - fotos.length;
    const elegidas = Array.from(files).slice(0, disponibles);
    if (Array.from(files).length > disponibles) {
      setError(`Hasta ${MAX_FOTOS} fotos por publicación`);
    }
    try {
      const nuevas: FotoPendiente[] = [];
      for (const f of elegidas) {
        if (f.size > MAX_BYTES) {
          setError('Alguna imagen supera los 6 MB');
          continue;
        }
        const data = await leerImagen(f);
        nuevas.push({ data, nombre: f.name });
      }
      setFotos((prev) => [...prev, ...nuevas].slice(0, MAX_FOTOS));
    } catch {
      setError('No se pudieron leer las imágenes');
    }
  };

  const quitarFoto = (idx: number) => setFotos((prev) => prev.filter((_, i) => i !== idx));

  const enviar = async () => {
    if (!texto.trim() && fotos.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const creada = await api<Publicacion>(`/publicaciones/complejo/${slug}`, {
        method: 'POST',
        body: JSON.stringify({
          texto: texto.trim() || null,
          imagenes: fotos.map((f) => ({ data: f.data })),
        }),
      });
      setTexto('');
      setFotos([]);
      if (archivoRef.current) archivoRef.current.value = '';
      onPublicar(creada);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar');
    } finally {
      setEnviando(false);
    }
  };

  if (!perfil) return null;

  return (
    <div className="muro-compositor">
      <Avatar nombre={perfil.nombre} apellido={perfil.apellido} id={perfil.id} size={42} />
      <div className="muro-compositor-cuerpo">
        <textarea
          className="muro-textarea"
          placeholder="¿Qué pasa en el complejo? Contale a la comunidad…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          maxLength={2000}
        />
        {fotos.length > 0 && (
          <div className="muro-fotos-preview">
            {fotos.map((f, i) => (
              <div key={`${f.nombre}-${i}`} className="muro-foto-preview">
                <img src={f.data} alt={f.nombre} />
                <button
                  type="button"
                  className="muro-foto-quitar"
                  aria-label="Quitar foto"
                  onClick={() => quitarFoto(i)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="muro-error">{error}</p>}
        <div className="muro-compositor-acciones">
          <button
            type="button"
            className="boton boton-ghost"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}
            onClick={() => archivoRef.current?.click()}
            disabled={fotos.length >= MAX_FOTOS}
          >
            <Images size={15} /> Foto{fotos.length > 0 ? ` (${fotos.length})` : ''}
          </button>
          <input
            ref={archivoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void agregarFotos(e.target.files);
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="boton boton-primario"
            style={{ fontSize: '0.85rem', padding: '0.42rem 1.1rem', marginLeft: 'auto' }}
            disabled={enviando || (!texto.trim() && fotos.length === 0)}
            onClick={() => void enviar()}
          >
            <Send size={15} /> {enviando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Publicación ================= */

function PublicacionCard({
  pub,
  puedeModerar,
  onReaccionar,
  onBorrar,
}: {
  pub: Publicacion;
  puedeModerar: boolean;
  onReaccionar: (id: number) => Promise<void>;
  onBorrar: (id: number) => Promise<void>;
}) {
  const { perfil } = useAuth();
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const puedeBorrar = puedeModerar || perfil?.id === pub.autor.id;

  const abrirComentarios = async () => {
    if (comentariosAbiertos) {
      setComentariosAbiertos(false);
      return;
    }
    setComentariosAbiertos(true);
    if (comentarios) return;
    setCargandoComentarios(true);
    try {
      const lista = await api<Comentario[]>(`/publicaciones/${pub.id}/comentarios`);
      setComentarios(lista);
    } catch {
      setComentarios([]);
    } finally {
      setCargandoComentarios(false);
    }
  };

  const comentar = async () => {
    if (!nuevo.trim() || enviando) return;
    setEnviando(true);
    try {
      const c = await api<Comentario>(`/publicaciones/${pub.id}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ texto: nuevo.trim() }),
      });
      setComentarios((prev) => [...(prev ?? []), c]);
      setNuevo('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No se pudo comentar');
    } finally {
      setEnviando(false);
    }
  };

  const borrarComentario = async (id: number) => {
    if (!window.confirm('¿Borrar este comentario?')) return;
    try {
      await api(`/publicaciones/comentarios/${id}`, { method: 'DELETE' });
      setComentarios((prev) => (prev ?? []).filter((c) => c.id !== id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  };

  const fotos = pub.imagenes;
  const claseFotos = fotos.length === 1 ? 'fotos-1' : fotos.length === 2 ? 'fotos-2' : fotos.length === 3 ? 'fotos-3' : 'fotos-4';

  return (
    <article className="publicacion">
      <header className="publicacion-cabecera">
        <Avatar nombre={pub.autor.nombre} apellido={pub.autor.apellido} id={pub.autor.id} size={42} />
        <div className="publicacion-autor">
          <div className="fila" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
            <strong>{`${pub.autor.nombre} ${pub.autor.apellido}`.trim()}</strong>
            {pub.autor.es_dueno && <span className="badge badge-exito">Dueño</span>}
          </div>
          <span className="texto-debil" style={{ fontSize: '0.75rem' }}>{haceCuanto(pub.creado_en)}</span>
        </div>
        {puedeBorrar && (
          <button
            type="button"
            className="muro-borrar"
            aria-label="Borrar publicación"
            onClick={() => void onBorrar(pub.id)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </header>

      {pub.texto && <p className="publicacion-texto">{pub.texto}</p>}

      {fotos.length > 0 && (
        <div className={`publicacion-fotos ${claseFotos}`}>
          {fotos.map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="publicacion-foto">
              <img src={f.url} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <div className="publicacion-acciones">
        <button
          type="button"
          className={`muro-accion${pub.me_gusta ? ' activa' : ''}`}
          onClick={() => void onReaccionar(pub.id)}
          aria-pressed={pub.me_gusta}
        >
          <Heart size={16} fill={pub.me_gusta ? 'currentColor' : 'none'} />
          {pub.reacciones > 0 ? `${pub.reacciones}` : 'Me gusta'}
        </button>
        <button type="button" className="muro-accion" onClick={() => void abrirComentarios()}>
          <MessageCircle size={16} />
          {pub.comentarios > 0 ? `${pub.comentarios} comentario${pub.comentarios === 1 ? '' : 's'}` : 'Comentar'}
        </button>
      </div>

      {comentariosAbiertos && (
        <div className="publicacion-comentarios">
          {cargandoComentarios ? (
            <p className="texto-debil" style={{ fontSize: '0.8rem' }}>Cargando comentarios…</p>
          ) : (
            <>
              {(comentarios ?? []).map((c) => (
                <div key={c.id} className="comentario">
                  <Avatar nombre={c.autor.nombre} apellido={c.autor.apellido} id={c.autor.id} size={30} />
                  <div className="comentario-cuerpo">
                    <div className="fila" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.82rem' }}>{`${c.autor.nombre} ${c.autor.apellido}`.trim()}</strong>
                      {c.autor.es_dueno && <span className="badge badge-exito">Dueño</span>}
                      <span className="texto-debil" style={{ fontSize: '0.72rem' }}>{haceCuanto(c.creado_en)}</span>
                    </div>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.85rem' }}>{c.texto}</p>
                  </div>
                  {(puedeModerar || perfil?.id === c.autor.id) && (
                    <button
                      type="button"
                      className="muro-borrar"
                      aria-label="Borrar comentario"
                      onClick={() => void borrarComentario(c.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {(comentarios ?? []).length === 0 && (
                <p className="texto-debil" style={{ fontSize: '0.8rem', margin: 0 }}>
                  Todavía no hay comentarios.
                </p>
              )}
              <div className="comentario-escribir">
                <input
                  className="input"
                  placeholder="Escribí un comentario…"
                  value={nuevo}
                  maxLength={1000}
                  onChange={(e) => setNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void comentar();
                    }
                  }}
                />
                <button
                  type="button"
                  className="boton boton-primario"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  disabled={enviando || !nuevo.trim()}
                  onClick={() => void comentar()}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
