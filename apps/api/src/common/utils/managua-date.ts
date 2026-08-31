// Nicaragua es UTC-6 todo el año (sin horario de verano).
// Los filtros de fecha se interpretan como días de Managua y se
// convierten a UTC antes de consultar: "hoy" = 00:00 Managua = 06:00 UTC.
const MANAGUA_OFFSET_HOURS = 6;

export interface UtcRange {
  gte: Date;
  lt: Date;
}

// Recibe fechas 'YYYY-MM-DD' (día de Managua) y devuelve el rango UTC
// [inicio del primer día, inicio del día siguiente al último)
export function managuaDaysToUtcRange(
  startDate: string,
  endDate: string,
): UtcRange {
  const gte = new Date(`${startDate}T00:00:00.000Z`);
  gte.setUTCHours(gte.getUTCHours() + MANAGUA_OFFSET_HOURS);

  const lt = new Date(`${endDate}T00:00:00.000Z`);
  lt.setUTCHours(lt.getUTCHours() + MANAGUA_OFFSET_HOURS);
  lt.setUTCDate(lt.getUTCDate() + 1);

  return { gte, lt };
}
