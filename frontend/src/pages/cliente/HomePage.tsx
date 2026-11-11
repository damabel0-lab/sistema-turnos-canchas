import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import { Calendar, CreditCard, Trophy } from 'lucide-react';

export function HomePage() {
  return (
    <main className="pantalla">
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="titulo" style={{ fontSize: '2.5rem' }}>PlayControl</h1>
        <p className="subtitulo">Complejo deportivo — reservá tu turno en segundos</p>
        <div className="fila" style={{ justifyContent: 'center', gap: '0.75rem' }}>
          <Link to="/reservar" className="boton boton-primario">Reservar turno</Link>
          <Link to="/mis-reservas" className="boton boton-outline">Mis reservas</Link>
        </div>
      </header>

      <h2 className="titulo" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        ¿Qué querés hacer hoy?
      </h2>
      <div className="grilla-tarjetas">
        <Card>
          <div className="icono-circulo" style={{ marginBottom: '0.75rem' }}>
            <Calendar size={22} />
          </div>
          <h3 style={{ margin: '0 0 0.25rem' }}>Reservar cancha</h3>
          <p className="texto-sec">Elegí deporte, cancha y horario disponible.</p>
          <Link to="/reservar" className="boton boton-ghost" style={{ marginTop: '0.75rem' }}>
            Ir a reservar
          </Link>
        </Card>

        <Card>
          <div className="icono-circulo" style={{ marginBottom: '0.75rem' }}>
            <CreditCard size={22} />
          </div>
          <h3 style={{ margin: '0 0 0.25rem' }}>Mis reservas</h3>
          <p className="texto-sec">Ve tus próximos turnos y cancelá si hace falta.</p>
          <Link to="/mis-reservas" className="boton boton-ghost" style={{ marginTop: '0.75rem' }}>
            Ver mis reservas
          </Link>
        </Card>

        <Card>
          <div className="icono-circulo" style={{ marginBottom: '0.75rem' }}>
            <Trophy size={22} />
          </div>
          <h3 style={{ margin: '0 0 0.25rem' }}>Torneos</h3>
          <p className="texto-sec">Participá en campeonatos y seguí los resultados.</p>
          <Link to="/torneos" className="boton boton-ghost" style={{ marginTop: '0.75rem' }}>
            Ver torneos
          </Link>
        </Card>
      </div>
    </main>
  );
}
