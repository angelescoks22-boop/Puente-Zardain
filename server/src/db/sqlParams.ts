/** Añade un parámetro y devuelve su índice ($1, $2, …) para queries parametrizadas. */
export function addParam(params: unknown[], value: unknown): number {
  params.push(value);
  return params.length;
}
