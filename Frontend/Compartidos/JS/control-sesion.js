/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Compartidos/JS/control-sesion.js
 * -----------------------------------------------------------------------------
 * Control centralizado de sesión y navegación visual por rol/departamento.
 *
 * Reglas de seguridad:
 * - la autorización definitiva se realiza en el backend Java/Spring Boot
 * - no se almacenan credenciales ni tokens en localStorage/sessionStorage
 * - no se intenta leer cookies HttpOnly desde JavaScript
 * - este archivo sólo administra la experiencia y la redirección visual
 *
 * INTEGRACIÓN REQUERIDA
 *   Debe conectarse con las funciones de conexión del módulo de login, por
 *   ejemplo:
 *     conexiones/frontend/login.conexion.js
 *
 *   Si aún no existen, el contrato debe cumplir estos nombres mínimos:
 *     - loginConexion.obtenerSesionActual()
 *     - loginConexion.cerrarSesion()
 *     - loginConexion.esSesionValida()
 *     - loginConexion.obtenerUsuarioActual()
 *
 *   Este archivo no inventa endpoints ni crea llamadas HTTP duplicadas.
 * ============================================================================ */

const ROLES = Object.freeze({
  SUPERADMIN: 'SUPERADMIN',
  JEFE_FARMACIA: 'JEFE_FARMACIA',
  JEFE_ALMACEN: 'JEFE_ALMACEN',
  TRABAJADOR_FARMACIA: 'TRABAJADOR_FARMACIA',
  TRABAJADOR_ALMACEN: 'TRABAJADOR_ALMACEN',
});

const DEPARTAMENTOS = Object.freeze({
  FARMACIA: 'FARMACIA',
  ALMACEN: 'ALMACEN',
});

const DEFAULT_ROUTES = Object.freeze({
  login: '/Frontend/Login/index.html',
  superadmin: '/Frontend/SuperAdmin/index.html',
  farmacia: '/Frontend/Farmacia/index.html',
  jefesFarmacia: '/Frontend/Jefes/Farmacia/index.html',
  jefesAlmacen: '/Frontend/Jefes/Almacen/index.html',
  trabajadoresFarmacia: '/Frontend/Trabajadores/Farmacia/index.html',
  trabajadoresAlmacen: '/Frontend/Trabajadores/Almacen/index.html',
  almacen: '/Frontend/Almacen/index.html',
});

const NAVEGACION_VISUAL = Object.freeze({
  [ROLES.SUPERADMIN]: {
    modulo: 'GLOBAL',
    panel: DEFAULT_ROUTES.superadmin,
    permitidos: [
      DEFAULT_ROUTES.superadmin,
      DEFAULT_ROUTES.farmacia,
      DEFAULT_ROUTES.almacen,
      DEFAULT_ROUTES.jefesFarmacia,
      DEFAULT_ROUTES.jefesAlmacen,
      DEFAULT_ROUTES.trabajadoresFarmacia,
      DEFAULT_ROUTES.trabajadoresAlmacen,
    ],
  },
  [ROLES.JEFE_FARMACIA]: {
    modulo: DEPARTAMENTOS.FARMACIA,
    panel: DEFAULT_ROUTES.jefesFarmacia,
    permitidos: [
      DEFAULT_ROUTES.jefesFarmacia,
      DEFAULT_ROUTES.farmacia,
    ],
  },
  [ROLES.JEFE_ALMACEN]: {
    modulo: DEPARTAMENTOS.ALMACEN,
    panel: DEFAULT_ROUTES.jefesAlmacen,
    permitidos: [
      DEFAULT_ROUTES.jefesAlmacen,
      DEFAULT_ROUTES.almacen,
    ],
  },
  [ROLES.TRABAJADOR_FARMACIA]: {
    modulo: DEPARTAMENTOS.FARMACIA,
    panel: DEFAULT_ROUTES.trabajadoresFarmacia,
    permitidos: [
      DEFAULT_ROUTES.trabajadoresFarmacia,
      DEFAULT_ROUTES.farmacia,
    ],
  },
  [ROLES.TRABAJADOR_ALMACEN]: {
    modulo: DEPARTAMENTOS.ALMACEN,
    panel: DEFAULT_ROUTES.trabajadoresAlmacen,
    permitidos: [
      DEFAULT_ROUTES.trabajadoresAlmacen,
      DEFAULT_ROUTES.almacen,
    ],
  },
});

function normalizarRol(valor) {
  if (!valor && valor !== 0) return '';
  return String(valor).trim().toUpperCase();
}

function normalizarDepartamento(valor) {
  if (!valor && valor !== 0) return '';
  return String(valor).trim().toUpperCase();
}

function obtenerRutaActual() {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname || '';
  const search = window.location.search || '';
  return `${path}${search}`;
}

function normalizarRuta(ruta) {
  if (!ruta) return '';
  return String(ruta).replace(/\\/g, '/').trim();
}

function resolverLoginConexion() {
  if (typeof window !== 'undefined' && window.loginConexion) {
    return window.loginConexion;
  }

  if (typeof globalThis !== 'undefined' && globalThis.loginConexion) {
    return globalThis.loginConexion;
  }

  return null;
}

function resolverRutaMapeada(rutaUsuario, mapa = {}) {
  const ruta = normalizarRuta(rutaUsuario);
  if (!ruta) return ruta;

  const claves = Object.keys(mapa);
  for (const clave of claves) {
    const valor = normalizarRuta(mapa[clave]);
    if (!valor) continue;
    if (ruta === valor || ruta.endsWith(valor)) {
      return valor;
    }
  }

  return ruta;
}

function esperar(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function crearErrorSesion(mensaje, codigo = 'SESIÓN_INVALIDA') {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

async function consultarSesionActual() {
  const conexion = resolverLoginConexion();

  if (!conexion) {
    throw crearErrorSesion(
      'No se encontró la conexión de login configurada para consultar la sesión.',
      'SIN_CONEXION_LOGIN'
    );
  }

  if (typeof conexion.obtenerSesionActual === 'function') {
    return conexion.obtenerSesionActual();
  }

  if (typeof conexion.obtenerUsuarioActual === 'function') {
    return conexion.obtenerUsuarioActual();
  }

  if (typeof conexion.esSesionValida === 'function') {
    const valida = await conexion.esSesionValida();
    if (!valida) {
      throw crearErrorSesion('La sesión no es válida o ha expirado.', 'SESIÓN_INVALIDA');
    }
    return null;
  }

  throw crearErrorSesion(
    'El contrato de integración de login no incluye un método para obtener la sesión actual.',
    'CONTRATO_LOGIN_INCOMPLETO'
  );
}

async function cerrarSesionServidor() {
  const conexion = resolverLoginConexion();

  if (!conexion) {
    throw crearErrorSesion(
      'No se encontró la conexión de login configurada para cerrar la sesión.',
      'SIN_CONEXION_LOGIN'
    );
  }

  if (typeof conexion.cerrarSesion === 'function') {
    return conexion.cerrarSesion();
  }

  if (typeof conexion.logout === 'function') {
    return conexion.logout();
  }

  throw crearErrorSesion(
    'El contrato de integración de login no incluye un método para cerrar sesión.',
    'CONTRATO_LOGIN_INCOMPLETO'
  );
}

function obtenerUsuarioDesdeSesion(sesion) {
  if (!sesion || typeof sesion !== 'object') return null;

  const usuario =
    sesion.usuario ||
    sesion.user ||
    sesion.datosUsuario ||
    sesion.perfil ||
    sesion.data ||
    null;

  return usuario && typeof usuario === 'object' ? usuario : null;
}

function obtenerRolUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';

  const rol =
    usuario.rol ||
    usuario.role ||
    usuario.rolUsuario ||
    usuario.tipoRol ||
    usuario.authorities ||
    usuario.permisos ||
    usuario.roles ||
    '';

  if (Array.isArray(rol)) {
    const primer = rol.find((valor) => typeof valor === 'string' || typeof valor === 'number');
    return normalizarRol(primer);
  }

  if (rol && typeof rol === 'object') {
    return normalizarRol(rol.nombre || rol.codigo || rol.rol || rol.role || '');
  }

  return normalizarRol(rol);
}

function obtenerDepartamentoUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';

  const departamento =
    usuario.departamento ||
    usuario.departamentoId ||
    usuario.departamentoActual ||
    usuario.area ||
    usuario.servicio ||
    usuario.idDepartamento ||
    usuario.departamentoAsignado ||
    '';

  if (departamento && typeof departamento === 'object') {
    return normalizarDepartamento(departamento.nombre || departamento.codigo || departamento.departamento || '');
  }

  return normalizarDepartamento(departamento);
}

function obtenerRutaPanelPorRol(rol) {
  const rolNormalizado = normalizarRol(rol);
  const config = NAVEGACION_VISUAL[rolNormalizado];
  return config ? config.panel : DEFAULT_ROUTES.login;
}

function verificarPermisoVisual(rol, departamento, ruta) {
  const rutaNormalizada = normalizarRuta(ruta);
  const rolNormalizado = normalizarRol(rol);
  const departamentoNormalizado = normalizarDepartamento(departamento);

  const config = NAVEGACION_VISUAL[rolNormalizado];
  if (!config) return false;

  if (rolNormalizado === ROLES.SUPERADMIN) {
    return config.permitidos.some((rutaPermitida) => {
      const permitida = normalizarRuta(rutaPermitida);
      return rutaNormalizada === permitida || rutaNormalizada.endsWith(permitida);
    });
  }

  if (departamentoNormalizado && departamentoNormalizado !== config.modulo) {
    return false;
  }

  const rutasPermitidas = config.permitidos || [];
  return rutasPermitidas.some((rutaPermitida) => {
    const permitida = normalizarRuta(rutaPermitida);
    return rutaNormalizada === permitida || rutaNormalizada.endsWith(permitida);
  });
}

function obtenerSesionActual() {
  const conexion = resolverLoginConexion();

  if (!conexion || typeof conexion.obtenerSesionActual !== 'function') {
    return null;
  }

  try {
    return conexion.obtenerSesionActual();
  } catch {
    return null;
  }
}

function obtenerUsuarioActual() {
  const conexion = resolverLoginConexion();

  if (!conexion) return null;

  if (typeof conexion.obtenerUsuarioActual === 'function') {
    try {
      return conexion.obtenerUsuarioActual();
    } catch {
      return null;
    }
  }

  const sesion = obtenerSesionActual();
  return obtenerUsuarioDesdeSesion(sesion);
}

function haySesionValida() {
  const conexion = resolverLoginConexion();
  if (!conexion) return false;

  if (typeof conexion.esSesionValida === 'function') {
    try {
      return Boolean(conexion.esSesionValida());
    } catch {
      return false;
    }
  }

  return Boolean(obtenerSesionActual());
}

function obtenerDatosSesionSegura() {
  const sesion = obtenerSesionActual();
  const usuario = obtenerUsuarioDesdeSesion(sesion) || obtenerUsuarioActual();

  if (!sesion && !usuario) {
    return null;
  }

  return {
    sesion,
    usuario,
    rol: obtenerRolUsuario(usuario),
    departamento: obtenerDepartamentoUsuario(usuario),
  };
}

async function verificarSesionAntesDeAcceder(opciones = {}) {
  const {
    ruta = obtenerRutaActual(),
    redirigir = true,
    rutaLogin = DEFAULT_ROUTES.login,
    onExpirada,
    onNoAutorizado,
  } = opciones;

  try {
    const datos = await consultarSesionActual();
    const usuario = obtenerUsuarioDesdeSesion(datos) || obtenerUsuarioActual();
    const rol = obtenerRolUsuario(usuario);
    const departamento = obtenerDepartamentoUsuario(usuario);

    if (!usuario || !rol) {
      if (redirigir) {
        window.location.assign(rutaLogin);
      }
      throw crearErrorSesion('No existe una sesión válida para el usuario.', 'SESIÓN_INVALIDA');
    }

    const permitido = verificarPermisoVisual(rol, departamento, ruta);
    if (!permitido) {
      const panel = obtenerRutaPanelPorRol(rol);
      if (redirigir) {
        window.location.assign(panel || rutaLogin);
      }

      const error = crearErrorSesion('La ruta solicitada no está autorizada para este usuario.', 'NAVEGACION_NO_AUTORIZADA');
      if (typeof onNoAutorizado === 'function') {
        onNoAutorizado(error, { rol, departamento, ruta, panel });
      }
      throw error;
    }

    return {
      usuario,
      rol,
      departamento,
      ruta,
      esValida: true,
    };
  } catch (error) {
    const esExpiracion =
      error?.codigo === 'SESIÓN_EXPIRADA' ||
      error?.message?.toLowerCase().includes('expir') ||
      error?.message?.toLowerCase().includes('sesion');

    if (esExpiracion && typeof onExpirada === 'function') {
      onExpirada(error);
    }

    if (redirigir && (error?.codigo === 'SESIÓN_INVALIDA' || error?.codigo === 'SESIÓN_EXPIRADA')) {
      window.location.assign(rutaLogin);
    }

    throw error;
  }
}

async function cerrarSesion(opciones = {}) {
  const {
    redirigir = true,
    rutaLogin = DEFAULT_ROUTES.login,
    onExito,
    onError,
  } = opciones;

  try {
    await cerrarSesionServidor();

    if (redirigir) {
      window.location.assign(rutaLogin);
    }

    if (typeof onExito === 'function') {
      onExito({ ok: true, redirect: rutaLogin });
    }

    return { ok: true };
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
    }
    throw error;
  }
}

function registrarActividad() {
  if (typeof window === 'undefined') return;
  window.__appControlSesionUltimaActividad = Date.now();
}

function iniciarControlInactividad(opciones = {}) {
  const {
    tiempo = 0,
    onExpiracion,
    rutaLogin = DEFAULT_ROUTES.login,
    mostrarAviso = true,
  } = opciones;

  if (!tiempo || Number(tiempo) <= 0) {
    return () => {};
  }

  const limite = Number(tiempo);

  const onActivity = () => {
    registrarActividad();
  };

  const revisar = async () => {
    const ultima = Number(window.__appControlSesionUltimaActividad || Date.now());
    const ahora = Date.now();

    if (ahora - ultima >= limite) {
      if (mostrarAviso) {
        window.alert('La sesión ha expirado por inactividad. Se le redirigirá al inicio de sesión.');
      }

      if (typeof onExpiracion === 'function') {
        onExpiracion({ codigo: 'SESIÓN_EXPIRADA', razon: 'INACTIVIDAD' });
      }

      try {
        await cerrarSesion({ redirigir: true, rutaLogin });
      } catch {
        window.location.assign(rutaLogin);
      }
      return;
    }
  };

  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach((evento) => {
    document.addEventListener(evento, onActivity, { passive: true });
  });

  registrarActividad();
  const timer = window.setInterval(revisar, 1000);

  return () => {
    window.clearInterval(timer);
    ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach((evento) => {
      document.removeEventListener(evento, onActivity);
    });
  };
}

function validarMapaRutas(mapa = {}) {
  return Object.fromEntries(
    Object.entries(mapa).map(([clave, valor]) => [clave, normalizarRuta(valor)])
  );
}

function crearControlSesion(config = {}) {
  const mapaRutas = validarMapaRutas(config.rutas || {});
  const rutas = { ...DEFAULT_ROUTES, ...mapaRutas };

  const api = {
    ROLES,
    DEPARTAMENTOS,
    rutas,
    obtenerRutaActual,
    obtenerSesionActual,
    obtenerUsuarioActual,
    haySesionValida,
    obtenerDatosSesionSegura,
    verificarPermisoVisual,
    verificarSesionAntesDeAcceder: (opciones = {}) => verificarSesionAntesDeAcceder({ ...opciones, ruta: opciones.ruta || obtenerRutaActual() }),
    cerrarSesion,
    iniciarControlInactividad: (opciones = {}) => iniciarControlInactividad({ ...opciones, rutaLogin: opciones.rutaLogin || rutas.login }),
    redirigirSegunRol: (rol, opciones = {}) => {
      const panel = obtenerRutaPanelPorRol(rol);
      const destino = opciones.ruta || panel || rutas.login;
      if (typeof window !== 'undefined') {
        window.location.assign(destino);
      }
      return destino;
    },
    obtenerRolUsuario,
    obtenerDepartamentoUsuario,
    obtenerRutaPanelPorRol,
    validarMapaRutas,
  };

  return api;
}

const controlSesion = crearControlSesion();

export {
  ROLES,
  DEPARTAMENTOS,
  DEFAULT_ROUTES,
  NAVEGACION_VISUAL,
  crearControlSesion,
  obtenerRutaActual,
  obtenerSesionActual,
  obtenerUsuarioActual,
  haySesionValida,
  obtenerDatosSesionSegura,
  verificarPermisoVisual,
  verificarSesionAntesDeAcceder,
  cerrarSesion,
  iniciarControlInactividad,
  obtenerRolUsuario,
  obtenerDepartamentoUsuario,
  obtenerRutaPanelPorRol,
  validarMapaRutas,
};

export default controlSesion;
