import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { reservasRouter } from './modules/reservas/reservas.routes.js';
import { canchasRouter } from './modules/canchas/canchas.routes.js';
import { cajaRouter } from './modules/caja/caja.routes.js';
import { torneosRouter } from './modules/torneos/torneos.routes.js';
import { abonosRouter } from './modules/abonos/abonos.routes.js';
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
app.use('/caja', authMiddleware, cajaRouter);
app.use('/torneos', authMiddleware, torneosRouter);
app.use('/abonos', authMiddleware, abonosRouter);
app.use('/notificaciones', authMiddleware, notificacionesRouter);

app.use(errorHandler);
