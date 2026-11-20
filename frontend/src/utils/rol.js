/** Lee el rol del usuario desde el token JWT guardado al iniciar sesión (solo para ajustar la pantalla; el backend valida de verdad). */
export function obtenerRol() {
  try {
    const token = localStorage.getItem('sisvac_token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).rol || null;
  } catch {
    return null;
  }
}

/** Roles que pueden editar, eliminar, desvincular y enviar avisos manuales. */
export const ROLES_EDICION = ['administrador', 'personal_salud'];
export const puedeEditar = () => ROLES_EDICION.includes(obtenerRol());

/** Roles que solo ven una parte del sistema: al entrar van directo a "Niños". */
export const ROLES_SIN_PANEL = ['consulta_limitada', 'enfermeria'];

/** Id del usuario autenticado (para que enfermería vea solo los niños que ella registró al vincular). */
export function obtenerIdUsuario() {
  try {
    return JSON.parse(atob(localStorage.getItem('sisvac_token').split('.')[1])).id || null;
  } catch {
    return null;
  }
}

/** Roles que pueden registrar mediciones y marcar dosis aplicadas. */
export const puedeRegistrarClinico = () => ['administrador', 'personal_salud', 'enfermeria'].includes(obtenerRol());
