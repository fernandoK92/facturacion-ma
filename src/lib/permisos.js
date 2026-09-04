// Qué secciones puede ver cada rol.

export const ROLES = ["admin", "vendedor", "propietaria"];

export const ETIQUETA_ROL = {
  admin: "Administrador",
  vendedor: "Vendedor",
  propietaria: "Propietaria",
};

// Secciones = las mismas labels que usa el sidebar / las rutas del Dashboard.
const TODO = [
  "Dashboard",
  "Escanear",
  "Terminal POS",
  "Inventario",
  "Historial de ventas",
  "Análisis de ventas",
  "Clientes",
  "Usuarios",
];

export const PERMISOS = {
  admin: TODO,
  propietaria: TODO,
  vendedor: ["Escanear", "Terminal POS"],
};

/** Lista de secciones permitidas para un rol (vacío si el rol es desconocido). */
export function seccionesPermitidas(rol) {
  return PERMISOS[rol] ?? [];
}

/** Sección a la que cae el usuario al entrar, según su rol. */
export function seccionInicial(rol) {
  return seccionesPermitidas(rol)[0] ?? "Terminal POS";
}

export function puedeVer(rol, seccion) {
  return seccionesPermitidas(rol).includes(seccion);
}
