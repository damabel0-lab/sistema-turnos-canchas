import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { reservasRouter } from './modules/reservas/reservas.routes.js';
import { canchasRouter } from './modules/canchas/canchas.routes.js';
import { deportesRouter } from './modules/deportes/deportes.routes.js';
import { cajaRouter } from './modules/caja/caja.routes.js';
import { torneosRouter } from './modules/torneos/torneos.routes.js';
import { equiposRouter } from './modules/torneos/equipos.routes.js';
import { partidosRouter } from './modules/torneos/partidos.routes.js';
import { abonosRouter } from './modules/abonos/abonos.routes.js';
import { bloqueosRouter } from './modules/bloqueos/bloqueos.routes.js';
import { reporteRouter } from './modules/caja/reporte.routes.js';
import { configRouter } from './modules/config/config.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { sociosRouter } from './modules/socios/socios.routes.js';
import { beneficiosRouter } from './modules/beneficios/beneficios.routes.js';
import { socioBeneficiosRouter } from './modules/socio-beneficios/socio-beneficios.routes.js';
import { notificacionesRouter } from './modules/notifications/notifications.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'playcontrol-api' });
});

// Rutas con autenticación (JWT de Supabase)
app.use('/reservas', authMiddleware, reservasRouter);
app.use('/canchas', authMiddleware, canchasRouter);
app.use('/deportes', authMiddleware, deportesRouter);
app.use('/caja', authMiddleware, cajaRouter);
app.use('/torneos', authMiddleware, torneosRouter);
app.use('/torneos', authMiddleware, equiposRouter);
app.use('/torneos', authMiddleware, partidosRouter);
app.use('/abonos', authMiddleware, abonosRouter);
app.use('/bloqueos', authMiddleware, bloqueosRouter);
app.use('/caja', authMiddleware, reporteRouter);
app.use('/config', configRouter);
app.use('/dashboard', dashboardRouter);
app.use('/socios', authMiddleware, sociosRouter);
app.use('/beneficios', authMiddleware, beneficiosRouter);
app.use('/socio-beneficios', authMiddleware, socioBeneficiosRouter);
app.use('/notificaciones', authMiddleware, notificacionesRouter);

app.use(errorHandler);
