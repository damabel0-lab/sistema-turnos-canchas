import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { Calendar, CreditCard, Trophy } from 'lucide-react';

export function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          PlayControl
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Complejo deportivo — reservá tu turno en segundos
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" asChild className="px-8 py-3 text-lg">
            <Link to="/reservar">Reservar turno</Link>
          </Button>
          <Button variant="ghost" asChild className="px-8 py-3 text-lg">
            <Link to="/mis-reservas">Mis reservas</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-left">
          ¿Qué querés hacer hoy?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padded={false}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Calendar size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Reservar cancha</h3>
              <p className="text-sm text-gray-600 mb-4">
                Elegí deporte, cancha y horario disponible.
              </p>
              <Button variant="ghost" asChild className="w-full">
                <Link to="/reservar">Ir a reservar</Link>
              </Button>
            </div>
          </Card>
          <Card padded={false}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CreditCard size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Mis reservas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ve tus próximos turnos y cancela si es necesario.
              </p>
              <Button variant="ghost" asChild className="w-full">
                <Link to="/mis-reservas">Ver mis reservas</Link>
              </Button>
            </div>
          </Card>
          <Card padded={false}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Trophy size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Torneos</h3>
              <p className="text-sm text-gray-600 mb-4">
                Participá en campeonatos y seguí los resultados.
              </p>
              <Button variant="ghost" asChild className="w-full">
                <Link to="/torneos">Ver torneos</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
