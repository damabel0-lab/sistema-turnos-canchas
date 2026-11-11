import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

export const configRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /config -> configuración pública del complejo (horario, política cancelación, etc.)
configRouter.get(
  '/',
  h(async (_req, res) => {
    const horaApertura = process.env.HORA_APERTURA_COMPLEJO ? Number(process.env.HORA_APERTURA_COMPLEJO) : 8;
    const horaCierre = process.env.HORA_CIERRE_COMPLEJO ? Number(process.env.HORA_CIERRE_COMPLEJO) : 23;
    const cancelacionHoras = process.env.POLITICA_CANCELACION_HORAS ? Number(process.env.POLITICA_CANCELACION_HORAS) : 2;
    const descuentoTurnoFijo = process.env.DESCUENTO_TURNO_FIJO_PORCENTAJE ? Number(process.env.DESCUENTO_TURNO_FIJO_PORCENTAJE) : 0;

    res.json({
      hora_apertura: horaApertura,
      hora_cierre: horaCierre,
      cancelacion_minima_horas: cancelacionHoras,
      descuento_turno_fijo_porcentaje: descuentoTurnoFijo,
    });
  }),
);
