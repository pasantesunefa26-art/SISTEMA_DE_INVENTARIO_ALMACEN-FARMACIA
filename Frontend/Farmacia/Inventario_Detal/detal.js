/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Farmacia/Inventario_Detal/detal.js
 * -----------------------------------------------------------------------------
 * Lógica funcional del módulo Inventario Detal de Farmacia.
 *
 * RESPONSABILIDADES
 * - Verificar sesión, departamento y rol/autorización visual antes de consultar.
 * - Consultar medicamentos, lotes, existencias, transferencias recibidas,
 *   movimientos y alertas del inventario Detal mediante la conexión centralizada.
 * - Gestionar búsqueda, filtros, paginación, detalle de lote y navegación.
 * - Mostrar estados reales devueltos por el backend sin simular información.
 *
 * REGLAS DE NEGOCIO RESPETADAS
 * - Detal es un inventario independiente abastecido por transferencias desde
 *   Inventario Mayor. No se mezclan existencias de Mayor en esta pantalla.
 * - Los lotes transferidos conservan número de lote, medicamento, fecha de
 *   vencimiento, identificación de origen y código de barras original.
 * - No se crean lotes, no se generan códigos de barras nuevos y no se implementa
 *   FEFO ni selección automática de lotes.
 * - Las transferencias recibidas son movimientos internos de Farmacia y no se
 *   contabilizan como entradas externas o donaciones.
 * - Las operaciones confirmadas no se modifican ni eliminan desde este archivo.
 *
 * DEPENDENCIAS / CONTRATO DE INTEGRACIÓN
 * - Utilidades compartidas: ../../Compartidos/JS/base.js
 * - Validaciones: ../../Compartidos/JS/validaciones.js
 * - Listas buscables: ../../Compartidos/JS/listas-buscables.js
 * - Control de sesión: ../../Compartidos/JS/control-sesion.js
 * - Conexión centralizada de Farmacia (obligatoria para datos reales):
 *     ../../../conexiones/frontend/farmacia.conexion.js
 *
 * Si la conexión centralizada o alguno de sus métodos aún no está implementado,
 * este archivo documenta la dependencia y muestra el estado correspondiente sin
 * simular datos, lotes, movimientos, alertas ni códigos de barras.
 *
 * La autorización definitiva de acceso, consultas, impresión, reportes y
 * correcciones se realiza en el backend Java/Spring Boot.
 * ============================================================================
 */

import * as base from '../../Compartidos/JS/base.js';
import * as validaciones from '../../Compartidos/JS/validaciones.js';
import * as listasBuscables from '../../Compartidos/JS/listas-buscables.js';
import * as controlSesion from '../../Compartidos/JS/control-sesion.js';

/**
 * Módulo de conexión centralizada de Farmacia.
 * Dependencia requerida: no se inventan endpoints ni respuestas.
 */
const MODULO_CONEXION = '../../../conexiones/frontend/farmacia.conexion.js';

/**
 * Rutas reales del proyecto para navegación entre módulos de Farmacia.
 * Se usan como destinos de consulta; la disponibilidad final depende del
 * despliegue y de los permisos validados por backend.
 */
const RUTAS = Object.freeze({
  login: controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html',
  mayor: '/Frontend/Farmacia/Inventario_Mayor/',
  transferencias: '/Frontend/Farmacia/Transferencias/',
  kardex: '/Frontend/Farmacia/Kardex/',
  reportes: '/Frontend/Farmacia/Reportes/',
});

/**
 * Nombres candidatos del contrato de conexión centralizada.
 * El archivo consulta únicamente métodos expuestos por la conexión; si faltan,
 * se informa la dependencia sin simular información.
 */
const NOMBRES_CONEXION = Object.freeze({
  resumen: [
    'obtenerResumenInventarioDetal',
    'consultarResumenInventarioDetal',
    'consultarResumenDetal',
    'obtenerDashboardDetal',
  ],
  medicamentos: [
    'obtenerMedicamentosDetal',
    'consultarMedicamentosDetal',
    'listarMedicamentosDetal',
    'buscarMedicamentosDetal',
  ],
  lotes: [
    'obtenerLotesDetal',
    'consultarLotesDetal',
    'listarLotesDetal',
    'obtenerLotesMedicamentoDetal',
  ],
  transferencias: [
    'obtenerTransferenciasRecibidasDetal',
    'consultarTransferenciasRecibidasDetal',
    'listarTransferenciasRecibidasDetal',
    'obtenerTransferenciasRecibidas',
  ],
  movimientos: [
    'obtenerMovimientosDetal',
    'consultarMovimientosDetal',
    'listarMovimientosDetal',
    'obtenerHistorialMovimientosDetal',
  ],
  alertas: [
    'obtenerAlertasInventarioDetal',
    'consultarAlertasInventarioDetal',
    'obtenerAlertasDetal',
    'consultarAlertasDetal',
  ],
  imprimirEtiqueta: [
    'imprimirEtiquetaLoteDetal',
    'consultarEtiquetaLoteDetal',
    'obtenerEtiquetaLoteDetal',
    'imprimirEtiquetaLote',
  ],
});

const ROLES_ADMIN_ALERTAS = new Set([
  controlSesion.ROLES?.JEFE_FARMACIA || 'JEFE_FARMACIA',
  controlSesion.ROLES?.SUPERADMIN || 'SUPERADMIN',
]);

const state = {
  conexion: null,
  usuario: null,
  rol: '',
  departamento: '',
  accesoValidado: false,
  medicamentos: [],
  medicamentosFiltrados: [],
  lotes: [],
  transferencias: [],
  movimientos: [],
  alertas: null,
  medicamentoSeleccionado: null,
  loteSeleccionado: null,
  filtros: {
    busqueda: '',
    numeroLote: '',
    estadoLote: '',
    fechaVencimiento: '',
    fechaRecepcionTransferencia: '',
    disponibilidad: '',
    fechaInicial: '',
    fechaFinal: '',
  },
  paginacion: {
    pagina: 1,
    tamano: 20,
    total: 0,
  },
  cargando: {
    resumen: false,
    medicamentos: false,
    lotes: false,
    transferencias: false,
    movimientos: false,
    alertas: false,
  },
};

/* -------------------------------------------------------------------------- */
/* Utilidades generales                                                       */
/* -------------------------------------------------------------------------- */

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

function textoMinusculas(valor) {
  return normalizarTexto(valor).toLowerCase();
}

function esObjeto(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function resolverValor(objeto, claves, defecto = undefined) {
  if (!esObjeto(objeto)) return defecto;
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(objeto, clave)) {
      const valor = objeto[clave];
      if (valor !== undefined && valor !== null && valor !== '') {
        return valor;
      }
      // Permitir 0 y false explícitos cuando existen.
      if (valor === 0 || valor === false) return valor;
    }
  }
  return defecto;
}

function resolverListaRespuesta(respuesta, clavesExtra = []) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!esObjeto(respuesta)) return [];

  const claves = [
    ...clavesExtra,
    'data',
    'items',
    'registros',
    'contenido',
    'content',
    'resultado',
    'resultados',
    'medicamentos',
    'lotes',
    'movimientos',
    'transferencias',
    'alertas',
  ];

  for (const clave of claves) {
    const valor = respuesta[clave];
    if (Array.isArray(valor)) return valor;
    if (esObjeto(valor) && Array.isArray(valor.items)) return valor.items;
    if (esObjeto(valor) && Array.isArray(valor.content)) return valor.content;
  }

  return [];
}

function resolverObjetoRespuesta(respuesta) {
  if (!esObjeto(respuesta)) return {};
  if (Array.isArray(respuesta)) return {};

  if (esObjeto(respuesta.data) && !Array.isArray(respuesta.data)) {
    return respuesta.data;
  }
  if (esObjeto(respuesta.resumen) && !Array.isArray(respuesta.resumen)) {
    return respuesta.resumen;
  }
  if (esObjeto(respuesta.resultado) && !Array.isArray(respuesta.resultado)) {
    return respuesta.resultado;
  }

  return respuesta;
}

function formatearValor(valor, defecto = '—') {
  if (valor === undefined || valor === null || valor === '') return defecto;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

function formatearFechaVisual(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return '—';

  if (typeof base.formatearFecha === 'function') {
    try {
      const formateada = base.formatearFecha(valor);
      if (formateada) return formateada;
    } catch {
      // Continuar con valor original.
    }
  }

  return texto;
}

function formatearFechaHoraVisual(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return '—';
  return texto;
}

function establecerTexto(idOElemento, valor, defecto = '—') {
  const elemento = typeof idOElemento === 'string' ? base.obtenerElementoPorId(idOElemento) : idOElemento;
  if (!elemento) return;
  elemento.textContent = formatearValor(valor, defecto);
}

function limpiarContenedor(elemento) {
  if (elemento) {
    elemento.innerHTML = '';
  }
}

function obtenerTbody(selectorTabla) {
  return base.obtenerElemento(`${selectorTabla} tbody`);
}

function crearFilaEstado(colspan, titulo, texto, claseExtra = '') {
  const fila = document.createElement('tr');
  fila.className = 'app-tabla__fila';
  if (claseExtra) fila.classList.add(claseExtra);

  const celda = document.createElement('td');
  celda.colSpan = colspan;
  celda.className = 'app-tabla__celda app-tabla__celda--estado';

  const contenedor = document.createElement('div');
  contenedor.className = 'app-tabla__estado-vacio';

  const tituloEl = document.createElement('p');
  tituloEl.className = 'app-tabla__estado-vacio-titulo';
  tituloEl.textContent = titulo;

  const textoEl = document.createElement('p');
  textoEl.className = 'app-tabla__estado-vacio-texto';
  textoEl.textContent = texto;

  contenedor.append(tituloEl, textoEl);
  celda.append(contenedor);
  fila.append(celda);
  return fila;
}

function renderEstadoTabla(selectorTabla, colspan, titulo, texto) {
  const tbody = obtenerTbody(selectorTabla);
  if (!tbody) return;
  limpiarContenedor(tbody);
  tbody.append(crearFilaEstado(colspan, titulo, texto));
}

function mostrarMensajeSistema(mensaje, tipo = 'info') {
  if (typeof base.mostrarMensaje === 'function') {
    base.mostrarMensaje(mensaje, tipo);
    return;
  }
  if (typeof base.mostrarNotificacion === 'function') {
    base.mostrarNotificacion(mensaje, tipo);
    return;
  }
  if (typeof base.mostrarMensajeError === 'function' && (tipo === 'error' || tipo === 'danger')) {
    base.mostrarMensajeError(mensaje);
    return;
  }
  // Fallback no intrusivo en consola para entornos sin componente visual disponible.
  if (tipo === 'error' || tipo === 'danger') {
    console.error(mensaje);
  } else {
    console.warn(mensaje);
  }
}

function manejarErrorConsulta(contexto, error) {
  const mensaje = normalizarTexto(error?.message) || 'Ocurrió un error inesperado.';
  const codigo = error?.codigo || error?.status || error?.name || '';

  if (codigo === 401 || /sesión|sesion|unauthorized|no autentic/i.test(mensaje)) {
    mostrarMensajeSistema('La sesión no es válida o ha expirado. Inicie sesión nuevamente.', 'error');
    window.location.assign(RUTAS.login);
    return;
  }

  if (codigo === 403 || /acceso denegado|forbidden|no autorizado/i.test(mensaje)) {
    mostrarMensajeSistema('No cuenta con permisos para consultar esta información.', 'error');
    return;
  }

  if (/conexión|conexion|network|fetch|failed to fetch|timeout/i.test(mensaje)) {
    mostrarMensajeSistema(`Error de conexión al consultar ${contexto}. Verifique la comunicación con el sistema.`, 'error');
    return;
  }

  if (/servidor|500|internal/i.test(mensaje) || /server/i.test(String(codigo))) {
    mostrarMensajeSistema(`Error del servidor al consultar ${contexto}. Intente nuevamente.`, 'error');
    return;
  }

  if (/incomplet|faltan datos|required|validaci/i.test(mensaje)) {
    mostrarMensajeSistema(`La información requerida para consultar ${contexto} está incompleta.`, 'error');
    return;
  }

  mostrarMensajeSistema(`No se pudo consultar ${contexto}: ${mensaje}`, 'error');
}

function actualizarMarcaActualizacion(texto) {
  establecerTexto('detal-resumen-actualizado', texto || 'Sin datos cargados');
}

/* -------------------------------------------------------------------------- */
/* Conexión centralizada                                                      */
/* -------------------------------------------------------------------------- */

async function cargarConexionFarmacia() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo?.default || modulo || null;
    if (!state.conexion) {
      console.warn('La conexión centralizada de Farmacia no expuso un módulo válido para Inventario Detal.');
    }
  } catch (error) {
    state.conexion = null;
    console.warn(
      'Dependencia pendiente: no se pudo cargar la conexión centralizada de Farmacia para Inventario Detal.',
      error
    );
  }
}

function obtenerMetodoConexion(nombres = []) {
  if (!state.conexion || typeof state.conexion !== 'object') return null;
  for (const nombre of nombres) {
    if (typeof state.conexion[nombre] === 'function') {
      return state.conexion[nombre].bind(state.conexion);
    }
  }
  return null;
}

function informarDependenciaConexion(recurso, selectorTabla = null, colspan = 8) {
  const mensaje = `La conexión centralizada de Farmacia no expone actualmente ${recurso}.`;
  console.warn(`Dependencia de integración: ${mensaje}`);
  if (selectorTabla) {
    renderEstadoTabla(
      selectorTabla,
      colspan,
      'Dependencia de conexión pendiente',
      `${mensaje} No se muestran datos simulados.`
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Acceso y visibilidad                                                       */
/* -------------------------------------------------------------------------- */

function usuarioEsDeAlmacen(usuario, rol, departamento) {
  const rolNormalizado = textoMinusculas(rol || (controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(usuario) : ''));
  const depNormalizado = textoMinusculas(
    departamento || (controlSesion.obtenerDepartamentoUsuario ? controlSesion.obtenerDepartamentoUsuario(usuario) : '')
  );
  return (
    rolNormalizado.includes('almacen') ||
    rolNormalizado.includes('almacén') ||
    depNormalizado === 'almacen' ||
    depNormalizado === 'almacén'
  );
}

function usuarioAutorizadoFarmacia(usuario, rol, departamento) {
  const rolNormalizado = normalizarTexto(rol).toUpperCase();
  const depNormalizado = normalizarTexto(departamento).toUpperCase();
  const superadmin = controlSesion.ROLES?.SUPERADMIN || 'SUPERADMIN';
  const jefe = controlSesion.ROLES?.JEFE_FARMACIA || 'JEFE_FARMACIA';
  const trabajador = controlSesion.ROLES?.TRABAJADOR_FARMACIA || 'TRABAJADOR_FARMACIA';
  const farmacia = controlSesion.DEPARTAMENTOS?.FARMACIA || 'FARMACIA';

  if (usuarioEsDeAlmacen(usuario, rolNormalizado, depNormalizado)) return false;
  if (rolNormalizado === superadmin) return true; // Acceso autorizado mediante contexto de Farmacia (validado por backend).
  if (depNormalizado !== farmacia && depNormalizado) return false;
  return rolNormalizado === jefe || rolNormalizado === trabajador;
}

async function validarAccesoDetal() {
  try {
    let sesion = null;
    if (typeof controlSesion.consultarSesionActual === 'function') {
      sesion = await controlSesion.consultarSesionActual();
    } else if (typeof controlSesion.verificarSesionAntesDeAcceder === 'function') {
      const verificada = await controlSesion.verificarSesionAntesDeAcceder({ redirigir: false });
      sesion = verificada?.usuario || verificada;
    }

    const usuario = (controlSesion.obtenerUsuarioDesdeSesion
      ? controlSesion.obtenerUsuarioDesdeSesion(sesion)
      : sesion?.usuario) || sesion || (typeof controlSesion.obtenerUsuarioActual === 'function' ? controlSesion.obtenerUsuarioActual() : null);

    if (!usuario) {
      throw new Error('Sesión inválida o inexistente.');
    }

    const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(usuario) : resolverValor(usuario, ['rol', 'role', 'tipoRol'], '');
    const departamento = controlSesion.obtenerDepartamentoUsuario
      ? controlSesion.obtenerDepartamentoUsuario(usuario)
      : resolverValor(usuario, ['departamento', 'department', 'area'], '');

    if (usuarioEsDeAlmacen(usuario, rol, departamento)) {
      const error = new Error('Acceso denegado: los usuarios de Almacén no pueden acceder a Inventario Detal.');
      error.codigo = 403;
      throw error;
    }

    if (!usuarioAutorizadoFarmacia(usuario, rol, departamento)) {
      const error = new Error('Acceso denegado: el usuario no está autorizado para Inventario Detal de Farmacia.');
      error.codigo = 403;
      throw error;
    }

    state.usuario = usuario;
    state.rol = normalizarTexto(rol).toUpperCase();
    state.departamento = normalizarTexto(departamento).toUpperCase();
    state.accesoValidado = true;
    aplicarVisibilidadPorRol();
    return true;
  } catch (error) {
    manejarErrorConsulta('acceso al módulo', error);
    // Redirección defensiva de frontend; backend es la autoridad final.
    window.setTimeout(() => {
      window.location.assign(RUTAS.login);
    }, 250);
    return false;
  }
}

function puedeVerAlertasAdministrativas() {
  return ROLES_ADMIN_ALERTAS.has(normalizarTexto(state.rol).toUpperCase());
}

function aplicarVisibilidadPorRol() {
  const puedeVer = puedeVerAlertasAdministrativas();
  const selectores = [
    '#tarjeta-detal-stock-bajo',
    '#tarjeta-detal-agotados',
    '#seccion-alertas-detal',
  ];

  selectores.forEach((selector) => {
    const elemento = document.querySelector(selector);
    if (!elemento) return;
    elemento.hidden = !puedeVer;
    elemento.setAttribute('aria-hidden', puedeVer ? 'false' : 'true');
  });
}

/* -------------------------------------------------------------------------- */
/* Filtros y paginación                                                       */
/* -------------------------------------------------------------------------- */

function leerFiltrosDesdeFormulario() {
  state.filtros.busqueda = normalizarTexto(base.obtenerElementoPorId('busqueda-medicamento-detal')?.value);
  state.filtros.numeroLote = normalizarTexto(base.obtenerElementoPorId('filtro-lote-detal')?.value);
  state.filtros.estadoLote = normalizarTexto(base.obtenerElementoPorId('filtro-estado-detal')?.value);
  state.filtros.fechaVencimiento = normalizarTexto(base.obtenerElementoPorId('filtro-fecha-detal')?.value);
  state.filtros.fechaRecepcionTransferencia = normalizarTexto(
    base.obtenerElementoPorId('filtro-fecha-recepcion-detal')?.value
  );
  state.filtros.disponibilidad = normalizarTexto(base.obtenerElementoPorId('filtro-disponibilidad-detal')?.value);
  state.filtros.fechaInicial = normalizarTexto(base.obtenerElementoPorId('filtro-fecha-inicial-detal')?.value);
  state.filtros.fechaFinal = normalizarTexto(base.obtenerElementoPorId('filtro-fecha-final-detal')?.value);
}

function validarFiltrosPeriodo() {
  const { fechaInicial, fechaFinal } = state.filtros;
  if (!fechaInicial && !fechaFinal) return { valido: true };

  if (typeof validaciones.validarPeriodo === 'function' && fechaInicial && fechaFinal) {
    const resultado = validaciones.validarPeriodo(fechaInicial, fechaFinal, {
      campoInicio: 'filtro-fecha-inicial-detal',
      campoFin: 'filtro-fecha-final-detal',
      etiquetaInicio: 'fecha inicial',
      etiquetaFin: 'fecha final',
      obligatorio: false,
      permitirIguales: true,
    });
    if (!resultado.valido) {
      mostrarMensajeSistema(resultado.mensaje || 'El período de consulta no es válido.', 'error');
      return resultado;
    }
  }

  return { valido: true };
}

function obtenerParametrosConsulta() {
  const f = state.filtros;
  const params = {
    // Texto/código/presentación se envían para que el backend consulte registros reales.
    busqueda: f.busqueda || undefined,
    texto: f.busqueda || undefined,
    medicamento: f.busqueda || undefined,
    codigo: f.busqueda || undefined,
    presentacion: f.busqueda || undefined,
    numeroLote: f.numeroLote || undefined,
    lote: f.numeroLote || undefined,
    estado: f.estadoLote || undefined,
    estadoLote: f.estadoLote || undefined,
    fechaVencimiento: f.fechaVencimiento || undefined,
    vencimiento: f.fechaVencimiento || undefined,
    fechaTransferencia: f.fechaRecepcionTransferencia || undefined,
    fechaRecepcion: f.fechaRecepcionTransferencia || undefined,
    fechaRecepcionTransferencia: f.fechaRecepcionTransferencia || undefined,
    disponibilidad: f.disponibilidad || undefined,
    fechaInicio: f.fechaInicial || undefined,
    fechaInicial: f.fechaInicial || undefined,
    fechaFin: f.fechaFinal || undefined,
    fechaFinal: f.fechaFinal || undefined,
    // Inclusión de extremos del período (el backend debe aplicar el filtro definitivo).
    incluirFechaInicial: f.fechaInicial ? true : undefined,
    incluirFechaFinal: f.fechaFinal ? true : undefined,
    modulo: 'DETAL',
    inventario: 'DETAL',
  };

  // Eliminar claves indefinidas para no enviar ruido.
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
}

function fechaDentroDePeriodo(fecha, inicio, fin) {
  if (!fecha) return true;
  const valor = normalizarTexto(fecha).slice(0, 10);
  if (!valor) return true;
  if (inicio && valor < inicio) return false;
  if (fin && valor > fin) return false; // Inclusivo por comparación de cadenas YYYY-MM-DD.
  return true;
}

function filtrarMedicamentosLocal(lista) {
  const { busqueda, estadoLote, fechaVencimiento, disponibilidad } = state.filtros;
  const termino = textoMinusculas(busqueda);

  return (lista || []).filter((item) => {
    const nombre = textoMinusculas(resolverValor(item, ['nombre', 'nombreMedicamento', 'medicamento', 'descripcion'], ''));
    const codigo = textoMinusculas(resolverValor(item, ['codigo', 'codigoMedicamento', 'codigoProducto'], ''));
    const presentacion = textoMinusculas(resolverValor(item, ['presentacion', 'formaFarmaceutica', 'forma'], ''));
    const estado = textoMinusculas(resolverValor(item, ['estado', 'estadoGeneral', 'estadoMedicamento'], ''));
    const vencimiento = normalizarTexto(resolverValor(item, ['fechaVencimiento', 'proximoVencimiento', 'vencimiento'], ''));
    const cantidad = Number(resolverValor(item, ['cantidadTotalDisponible', 'existenciaTotal', 'totalDisponible', 'stock'], 0));

    const coincideTexto = !termino || nombre.includes(termino) || codigo.includes(termino) || presentacion.includes(termino);
    const coincideEstado = !estadoLote || estado === textoMinusculas(estadoLote);
    const coincideVencimiento = !fechaVencimiento || vencimiento.slice(0, 10) === fechaVencimiento;
    let coincideDisponibilidad = true;
    if (disponibilidad === 'con-existencia' || disponibilidad === 'disponible') coincideDisponibilidad = cantidad > 0;
    if (disponibilidad === 'sin-existencia' || disponibilidad === 'no-disponible' || disponibilidad === 'agotado') {
      coincideDisponibilidad = cantidad <= 0;
    }

    return coincideTexto && coincideEstado && coincideVencimiento && coincideDisponibilidad;
  });
}

function filtrarLotesLocal(lista) {
  const { numeroLote, estadoLote, fechaVencimiento, fechaRecepcionTransferencia, disponibilidad, fechaInicial, fechaFinal } = state.filtros;
  const terminoLote = textoMinusculas(numeroLote);

  return (lista || []).filter((lote) => {
    const num = textoMinusculas(resolverValor(lote, ['numeroLote', 'lote', 'codigoLote', 'loteNumero'], ''));
    const estado = textoMinusculas(resolverValor(lote, ['estado', 'estadoLote'], ''));
    const vencimiento = normalizarTexto(resolverValor(lote, ['fechaVencimiento', 'vencimiento'], '')).slice(0, 10);
    const fechaTransferencia = normalizarTexto(
      resolverValor(lote, ['fechaTransferencia', 'fechaRecepcion', 'fechaEfectivaTransferencia', 'fechaEntrada'], '')
    ).slice(0, 10);
    const disponible = Number(resolverValor(lote, ['cantidadDisponible', 'existenciaDisponible', 'stockDisponible', 'disponible'], 0));

    const coincideLote = !terminoLote || num.includes(terminoLote);
    const coincideEstado = !estadoLote || estado === textoMinusculas(estadoLote);
    const coincideVencimiento = !fechaVencimiento || vencimiento === fechaVencimiento;
    const coincideRecepcion = !fechaRecepcionTransferencia || fechaTransferencia === fechaRecepcionTransferencia;
    const coincidePeriodo = fechaDentroDePeriodo(fechaTransferencia || vencimiento, fechaInicial, fechaFinal);
    let coincideDisponibilidad = true;
    if (disponibilidad === 'con-existencia' || disponibilidad === 'disponible') coincideDisponibilidad = disponible > 0;
    if (disponibilidad === 'sin-existencia' || disponibilidad === 'no-disponible' || disponibilidad === 'agotado') {
      coincideDisponibilidad = disponible <= 0;
    }

    return coincideLote && coincideEstado && coincideVencimiento && coincideRecepcion && coincidePeriodo && coincideDisponibilidad;
  });
}

function aplicarPaginacion(lista) {
  const total = (lista || []).length;
  state.paginacion.total = total;
  const tamano = Math.max(1, Number(state.paginacion.tamano) || 20);
  const paginas = Math.max(1, Math.ceil(total / tamano));
  state.paginacion.pagina = Math.min(Math.max(1, state.paginacion.pagina), paginas);

  const inicio = (state.paginacion.pagina - 1) * tamano;
  const fin = inicio + tamano;
  return (lista || []).slice(inicio, fin);
}

function actualizarControlesPaginacion() {
  const { pagina, tamano, total } = state.paginacion;
  const paginas = Math.max(1, Math.ceil(total / Math.max(1, tamano)));
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(total, pagina * tamano);

  establecerTexto('detal-paginacion-desde', String(desde), '0');
  establecerTexto('detal-paginacion-hasta', String(hasta), '0');
  establecerTexto('detal-paginacion-total', String(total), '0');
  establecerTexto('detal-paginacion-actual', String(pagina), '1');

  const anterior = base.obtenerElementoPorId('detal-paginacion-anterior');
  const siguiente = base.obtenerElementoPorId('detal-paginacion-siguiente');
  if (anterior) anterior.disabled = pagina <= 1 || total === 0;
  if (siguiente) siguiente.disabled = pagina >= paginas || total === 0;
}

function irAPagina(pagina) {
  state.paginacion.pagina = Math.max(1, Number(pagina) || 1);
  renderMedicamentos();
}

/* -------------------------------------------------------------------------- */
/* Renderizado                                                                */
/* -------------------------------------------------------------------------- */

function actualizarTarjetasResumen(respuesta) {
  const data = resolverObjetoRespuesta(respuesta);
  establecerTexto('detal-total-medicamentos', resolverValor(data, ['totalMedicamentos', 'medicamentosRegistrados', 'cantidadMedicamentos'], 0), '0');
  establecerTexto('detal-existencia-total', resolverValor(data, ['existenciaTotal', 'totalExistencias', 'stockTotal', 'existenciaTotalDetal'], 0), '0');
  establecerTexto('detal-total-lotes', resolverValor(data, ['totalLotes', 'cantidadLotes', 'lotesRegistrados'], 0), '0');
  establecerTexto('detal-lotes-disponibles', resolverValor(data, ['lotesDisponibles', 'lotesConExistencia', 'cantidadLotesDisponibles'], 0), '0');
  establecerTexto(
    'detal-transferencias-periodo',
    resolverValor(data, ['transferenciasRecibidasPeriodo', 'medicamentosRecibidosDesdeMayor', 'totalTransferenciasRecibidas', 'transferenciasPeriodo'], 0),
    '0'
  );
  establecerTexto(
    'detal-cantidad-transferida',
    resolverValor(data, ['cantidadTotalTransferida', 'cantidadTransferidaDesdeMayor', 'totalCantidadTransferida'], 0),
    '0'
  );

  // Indicadores de vencimiento visibles en resumen general (estados reales del backend).
  establecerTexto('detal-proximos-vencer', resolverValor(data, ['proximosVencer', 'medicamentosProximosAVencer', 'porVencer'], 0), '0');
  establecerTexto('detal-vencidos', resolverValor(data, ['vencidos', 'medicamentosVencidos', 'lotesVencidos'], 0), '0');

  if (puedeVerAlertasAdministrativas()) {
    establecerTexto('detal-stock-bajo', resolverValor(data, ['stockBajo', 'existenciasBajas', 'medicamentosStockBajo'], 0), '0');
    establecerTexto('detal-agotados', resolverValor(data, ['agotados', 'medicamentosAgotados', 'sinExistencia'], 0), '0');
  }

  actualizarMarcaActualizacion(`Actualizado: ${new Date().toLocaleString('es-VE')}`);
}

function actualizarAlertasAdministrativas(respuesta) {
  if (!puedeVerAlertasAdministrativas()) return;
  const data = resolverObjetoRespuesta(respuesta);
  const proximos = resolverValor(data, ['proximosVencer', 'medicamentosProximosAVencer', 'porVencer'], 0);
  const vencidos = resolverValor(data, ['vencidos', 'medicamentosVencidos', 'lotesVencidos'], 0);
  const bajo = resolverValor(data, ['stockBajo', 'existenciasBajas', 'medicamentosStockBajo'], 0);
  const agotados = resolverValor(data, ['agotados', 'medicamentosAgotados', 'sinExistencia'], 0);

  establecerTexto('alerta-detal-proximos-vencer', proximos, '0');
  establecerTexto('alerta-detal-vencidos', vencidos, '0');
  establecerTexto('alerta-detal-stock-bajo', bajo, '0');
  establecerTexto('alerta-detal-agotados', agotados, '0');
  establecerTexto('detal-proximos-vencer', proximos, '0');
  establecerTexto('detal-vencidos', vencidos, '0');
  establecerTexto('detal-stock-bajo', bajo, '0');
  establecerTexto('detal-agotados', agotados, '0');
}

function renderMedicamentos() {
  state.medicamentosFiltrados = filtrarMedicamentosLocal(state.medicamentos);
  const paginaActual = aplicarPaginacion(state.medicamentosFiltrados);
  const tbody = obtenerTbody('#tabla-medicamentos-detal');
  if (!tbody) return;

  limpiarContenedor(tbody);

  if (!paginaActual.length) {
    tbody.append(
      crearFilaEstado(
        8,
        'No hay medicamentos para mostrar',
        'No se encontraron registros de Inventario Detal con los filtros aplicados o la conexión aún no ha devuelto datos.'
      )
    );
    actualizarControlesPaginacion();
    return;
  }

  paginaActual.forEach((medicamento) => {
    const id = resolverValor(medicamento, ['id', 'idMedicamento', 'medicamentoId', 'codigo', 'codigoMedicamento'], null);
    const fila = document.createElement('tr');
    fila.className = 'app-tabla__fila';
    fila.tabIndex = 0;

    const codigo = resolverValor(medicamento, ['codigo', 'codigoMedicamento', 'codigoProducto'], '—');
    const nombre = resolverValor(medicamento, ['nombre', 'nombreMedicamento', 'medicamento', 'descripcion'], '—');
    const presentacion = resolverValor(medicamento, ['presentacion', 'formaFarmaceutica', 'forma'], '—');
    const unidad = resolverValor(medicamento, ['unidad', 'unidadMedida', 'unidadMedidaNombre'], '—');
    const cantidadTotal = resolverValor(
      medicamento,
      ['cantidadTotalDisponible', 'existenciaTotal', 'totalDisponible', 'stockDetal'],
      0
    );
    const cantidadLotes = resolverValor(medicamento, ['cantidadLotes', 'totalLotes', 'numeroLotes'], 0);
    const estado = resolverValor(medicamento, ['estado', 'estadoGeneral', 'estadoMedicamento'], '—');

    const celdas = [codigo, nombre, presentacion, unidad, cantidadTotal, cantidadLotes, estado];
    celdas.forEach((valor, idx) => {
      const celda = document.createElement('td');
      celda.className = 'app-tabla__celda';
      if (idx === 4 || idx === 5) celda.classList.add('app-tabla__celda--numero');
      celda.textContent = formatearValor(valor);
      fila.append(celda);
    });

    const celdaAcciones = document.createElement('td');
    celdaAcciones.className = 'app-tabla__celda';
    const btnLotes = document.createElement('button');
    btnLotes.type = 'button';
    btnLotes.className = 'app-btn app-btn--sm app-btn--secundario';
    btnLotes.textContent = 'Consultar lotes';
    btnLotes.addEventListener('click', (evento) => {
      evento.stopPropagation();
      seleccionarMedicamento(medicamento);
    });
    celdaAcciones.append(btnLotes);
    fila.append(celdaAcciones);

    const seleccionar = () => seleccionarMedicamento(medicamento);
    fila.addEventListener('click', seleccionar);
    fila.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        seleccionar();
      }
    });

    if (state.medicamentoSeleccionado && id !== null) {
      const idSeleccionado = resolverValor(state.medicamentoSeleccionado, ['id', 'idMedicamento', 'medicamentoId', 'codigo', 'codigoMedicamento'], null);
      if (String(idSeleccionado) === String(id)) {
        fila.classList.add('is-selected');
      }
    }

    tbody.append(fila);
  });

  actualizarControlesPaginacion();
}

function renderLotes() {
  const tbody = obtenerTbody('#tabla-lotes-detal');
  if (!tbody) return;

  limpiarContenedor(tbody);
  const lotes = filtrarLotesLocal(state.lotes);

  if (!state.medicamentoSeleccionado) {
    tbody.append(
      crearFilaEstado(
        9,
        'Seleccione un medicamento',
        'Los lotes de Detal se mostrarán aquí de manera independiente.'
      )
    );
    return;
  }

  if (!lotes.length) {
    tbody.append(
      crearFilaEstado(
        9,
        'No hay lotes para mostrar',
        'El medicamento seleccionado no tiene lotes en Detal para los filtros aplicados o la información no está disponible.'
      )
    );
    return;
  }

  lotes.forEach((lote) => {
    const fila = document.createElement('tr');
    fila.className = 'app-tabla__fila';
    fila.tabIndex = 0;

    const numeroLote = resolverValor(lote, ['numeroLote', 'lote', 'codigoLote', 'numero'], '—');
    const medicamento = resolverValor(lote, ['medicamento', 'nombreMedicamento', 'producto'], resolverValor(state.medicamentoSeleccionado, ['nombre', 'nombreMedicamento'], '—'));
    const cantidadRecibida = resolverValor(lote, ['cantidadRecibida', 'cantidadRecibidaDesdeMayor', 'cantidadIngresada', 'recibida'], 0);
    const cantidadDisponible = resolverValor(lote, ['cantidadDisponible', 'existenciaDisponible', 'stockDisponible', 'disponible'], 0);
    const fechaTransferencia = resolverValor(lote, ['fechaTransferencia', 'fechaRecepcion', 'fechaEfectivaTransferencia', 'fechaEntrada'], '');
    const fechaVencimiento = resolverValor(lote, ['fechaVencimiento', 'vencimiento'], '');
    const codigoBarras = resolverValor(lote, ['codigoBarras', 'codigoBarra', 'barcode', 'codigoBarrasOriginal'], '');
    const estado = resolverValor(lote, ['estado', 'estadoLote'], '—');

    const valores = [
      numeroLote,
      medicamento,
      cantidadRecibida,
      cantidadDisponible,
      formatearFechaVisual(fechaTransferencia),
      formatearFechaVisual(fechaVencimiento),
      formatearValor(codigoBarras, 'Sin código'),
      estado,
    ];

    valores.forEach((valor, idx) => {
      const celda = document.createElement('td');
      celda.className = 'app-tabla__celda';
      if (idx === 2 || idx === 3) celda.classList.add('app-tabla__celda--numero');
      celda.textContent = formatearValor(valor);
      fila.append(celda);
    });

    const celdaAcciones = document.createElement('td');
    celdaAcciones.className = 'app-tabla__celda';

    const btnDetalle = document.createElement('button');
    btnDetalle.type = 'button';
    btnDetalle.className = 'app-btn app-btn--sm app-btn--secundario';
    btnDetalle.textContent = 'Ver detalle';
    btnDetalle.addEventListener('click', (evento) => {
      evento.stopPropagation();
      seleccionarLote(lote);
    });

    const btnEtiqueta = document.createElement('button');
    btnEtiqueta.type = 'button';
    btnEtiqueta.className = 'app-btn app-btn--sm app-btn--imprimir';
    btnEtiqueta.textContent = 'Etiqueta';
    btnEtiqueta.title = 'Consultar/imprimir etiqueta existente';
    btnEtiqueta.addEventListener('click', (evento) => {
      evento.stopPropagation();
      imprimirEtiquetaLote(lote);
    });

    celdaAcciones.append(btnDetalle, document.createTextNode(' '), btnEtiqueta);
    fila.append(celdaAcciones);

    const seleccionar = () => seleccionarLote(lote);
    fila.addEventListener('click', seleccionar);
    fila.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        seleccionar();
      }
    });

    if (state.loteSeleccionado) {
      const idSel = resolverValor(state.loteSeleccionado, ['id', 'idLote', 'loteId', 'numeroLote'], null);
      const idAct = resolverValor(lote, ['id', 'idLote', 'loteId', 'numeroLote'], null);
      if (idSel !== null && String(idSel) === String(idAct)) {
        fila.classList.add('is-selected');
      }
    }

    tbody.append(fila);
  });
}

function renderTransferencias() {
  const tbody = obtenerTbody('#tabla-transferencias-recibidas');
  if (!tbody) return;
  limpiarContenedor(tbody);

  const lista = (state.transferencias || []).filter((item) => {
    const fechaEfectiva = normalizarTexto(
      resolverValor(item, ['fechaEfectiva', 'fechaEfectivaTransferencia', 'fechaTransferencia', 'fecha'], '')
    ).slice(0, 10);
    return fechaDentroDePeriodo(fechaEfectiva, state.filtros.fechaInicial, state.filtros.fechaFinal);
  });

  if (!lista.length) {
    tbody.append(
      crearFilaEstado(
        9,
        'No hay transferencias para mostrar',
        'No se encontraron transferencias recibidas desde Mayor para el período o filtros consultados.'
      )
    );
    return;
  }

  lista.forEach((item) => {
    const fila = document.createElement('tr');
    fila.className = 'app-tabla__fila';

    const id = resolverValor(item, ['id', 'idTransferencia', 'identificador', 'codigoTransferencia', 'numeroTransferencia'], '—');
    const medicamento = resolverValor(item, ['medicamento', 'nombreMedicamento', 'producto'], '—');
    const lote = resolverValor(item, ['lote', 'numeroLote', 'codigoLote'], '—');
    const cantidad = resolverValor(item, ['cantidadRecibida', 'cantidad', 'cantidadTransferida'], 0);
    const fechaEfectiva = resolverValor(item, ['fechaEfectiva', 'fechaEfectivaTransferencia', 'fechaTransferencia'], '');
    const fechaRegistro = resolverValor(item, ['fechaRegistro', 'fechaHoraRegistro', 'creadoEn', 'registradoEn'], '');
    const usuario = resolverValor(item, ['usuarioResponsable', 'responsable', 'usuario', 'registradoPor'], '—');
    const estado = resolverValor(item, ['estado', 'estadoTransferencia'], '—');

    const valores = [
      id,
      medicamento,
      lote,
      cantidad,
      formatearFechaVisual(fechaEfectiva),
      formatearFechaHoraVisual(fechaRegistro),
      usuario,
      estado,
    ];

    valores.forEach((valor, idx) => {
      const celda = document.createElement('td');
      celda.className = 'app-tabla__celda';
      if (idx === 3) celda.classList.add('app-tabla__celda--numero');
      celda.textContent = formatearValor(valor);
      fila.append(celda);
    });

    const celdaAcciones = document.createElement('td');
    celdaAcciones.className = 'app-tabla__celda';
    const btnDetalle = document.createElement('button');
    btnDetalle.type = 'button';
    btnDetalle.className = 'app-btn app-btn--sm app-btn--secundario';
    btnDetalle.textContent = 'Ver detalle';
    btnDetalle.addEventListener('click', () => mostrarDetalleTransferencia(item));
    celdaAcciones.append(btnDetalle);
    fila.append(celdaAcciones);

    tbody.append(fila);
  });
}

function renderMovimientos() {
  const tbody = obtenerTbody('#tabla-movimientos-detal');
  if (!tbody) return;
  limpiarContenedor(tbody);

  const lista = (state.movimientos || []).filter((item) => {
    const fecha = normalizarTexto(
      resolverValor(item, ['fechaEfectiva', 'fechaMovimiento', 'fecha', 'fechaOperacion'], '')
    ).slice(0, 10);
    return fechaDentroDePeriodo(fecha, state.filtros.fechaInicial, state.filtros.fechaFinal);
  });

  if (!lista.length) {
    tbody.append(
      crearFilaEstado(
        8,
        'No hay movimientos para mostrar',
        'No se encontraron movimientos de Detal para el período o filtros consultados.'
      )
    );
    return;
  }

  lista.forEach((item) => {
    const fila = document.createElement('tr');
    fila.className = 'app-tabla__fila';

    const fechaEfectiva = resolverValor(item, ['fechaEfectiva', 'fechaMovimiento', 'fecha'], '');
    const tipo = resolverValor(item, ['tipo', 'tipoMovimiento', 'operacion', 'claseMovimiento'], '—');
    const medicamento = resolverValor(item, ['medicamento', 'nombreMedicamento', 'producto'], '—');
    const lote = resolverValor(item, ['lote', 'numeroLote', 'codigoLote'], '—');
    const cantidad = resolverValor(item, ['cantidad', 'cantidadMovimiento'], 0);
    const responsable = resolverValor(item, ['responsable', 'usuarioResponsable', 'usuario'], '—');
    const documento = resolverValor(item, ['documento', 'referencia', 'codigoDocumento', 'documentoReferencia'], '—');
    const estado = resolverValor(item, ['estado', 'estadoMovimiento'], '—');

    const valores = [
      formatearFechaVisual(fechaEfectiva),
      tipo,
      medicamento,
      lote,
      cantidad,
      responsable,
      documento,
      estado,
    ];

    valores.forEach((valor, idx) => {
      const celda = document.createElement('td');
      celda.className = 'app-tabla__celda';
      if (idx === 4) celda.classList.add('app-tabla__celda--numero');
      celda.textContent = formatearValor(valor);
      fila.append(celda);
    });

    tbody.append(fila);
  });
}

function limpiarDetalleLote() {
  state.loteSeleccionado = null;
  establecerTexto('detalle-lote-detal-estado', 'Sin selección', 'Sin selección');
  establecerTexto('detalle-lote-detal-numero', '—');
  establecerTexto('detalle-lote-detal-medicamento', '—');
  establecerTexto('detalle-lote-detal-presentacion', '—');
  establecerTexto('detalle-lote-detal-codigo-barras', '—');
  establecerTexto('detalle-lote-detal-fecha-transferencia', '—');
  establecerTexto('detalle-lote-detal-fecha-vencimiento', '—');
  establecerTexto('detalle-lote-detal-estado-texto', '—');
  establecerTexto('detalle-lote-detal-cantidad-recibida', '0', '0');
  establecerTexto('detalle-lote-detal-cantidad-disponible', '0', '0');
  establecerTexto('detalle-lote-detal-codigo-barras-imagen', '—');
  establecerTexto('detalle-lote-detal-codigo-barras-texto', '—');
  establecerTexto('detalle-lote-detal-codigo-barras-lote', '—');
  const badgeProc = base.obtenerElementoPorId('detalle-lote-detal-procedencia');
  if (badgeProc) badgeProc.textContent = 'Mayor → Detal';
}

function seleccionarLote(lote) {
  if (!lote) {
    limpiarDetalleLote();
    return;
  }
  state.loteSeleccionado = lote;

  const numeroLote = resolverValor(lote, ['numeroLote', 'lote', 'codigoLote', 'numero'], '—');
  const medicamento = resolverValor(lote, ['medicamento', 'nombreMedicamento', 'producto'], resolverValor(state.medicamentoSeleccionado, ['nombre', 'nombreMedicamento'], '—'));
  const presentacion = resolverValor(lote, ['presentacion', 'formaFarmaceutica'], resolverValor(state.medicamentoSeleccionado, ['presentacion'], '—'));
  const codigoBarras = resolverValor(lote, ['codigoBarras', 'codigoBarra', 'barcode', 'codigoBarrasOriginal'], '');
  const fechaTransferencia = resolverValor(lote, ['fechaTransferencia', 'fechaRecepcion', 'fechaEfectivaTransferencia', 'fechaEntrada'], '');
  const fechaVencimiento = resolverValor(lote, ['fechaVencimiento', 'vencimiento'], '');
  const estado = resolverValor(lote, ['estado', 'estadoLote'], '—');
  const recibida = resolverValor(lote, ['cantidadRecibida', 'cantidadRecibidaDesdeMayor', 'cantidadIngresada', 'recibida'], 0);
  const disponible = resolverValor(lote, ['cantidadDisponible', 'existenciaDisponible', 'stockDisponible', 'disponible'], 0);
  const procedencia = resolverValor(lote, ['procedencia', 'origen', 'ubicacionOrigen'], 'Mayor → Detal');

  establecerTexto('detalle-lote-detal-estado', formatearValor(estado, 'Sin estado'));
  establecerTexto('detalle-lote-detal-numero', numeroLote);
  establecerTexto('detalle-lote-detal-procedencia', procedencia, 'Mayor → Detal');
  establecerTexto('detalle-lote-detal-medicamento', medicamento);
  establecerTexto('detalle-lote-detal-presentacion', presentacion);
  establecerTexto('detalle-lote-detal-codigo-barras', formatearValor(codigoBarras, 'Sin código registrado'));
  establecerTexto('detalle-lote-detal-fecha-transferencia', formatearFechaVisual(fechaTransferencia));
  establecerTexto('detalle-lote-detal-fecha-vencimiento', formatearFechaVisual(fechaVencimiento));
  establecerTexto('detalle-lote-detal-estado-texto', estado);
  establecerTexto('detalle-lote-detal-cantidad-recibida', String(recibida), '0');
  establecerTexto('detalle-lote-detal-cantidad-disponible', String(disponible), '0');
  establecerTexto('detalle-lote-detal-codigo-barras-texto', formatearValor(codigoBarras, '—'));
  establecerTexto('detalle-lote-detal-codigo-barras-lote', `Lote ${formatearValor(numeroLote)}`);

  // Visualización informativa del código existente: no se genera un código nuevo.
  const img = base.obtenerElementoPorId('detalle-lote-detal-codigo-barras-imagen');
  if (img) {
    if (codigoBarras) {
      img.textContent = String(codigoBarras);
    } else {
      img.textContent = 'Sin código de barras registrado';
    }
  }

  renderLotes();
}

function mostrarDetalleTransferencia(item) {
  // Consulta informativa: la UI no altera operaciones confirmadas.
  const id = resolverValor(item, ['id', 'idTransferencia', 'identificador', 'codigoTransferencia'], '—');
  const medicamento = resolverValor(item, ['medicamento', 'nombreMedicamento', 'producto'], '—');
  const lote = resolverValor(item, ['lote', 'numeroLote'], '—');
  const cantidad = resolverValor(item, ['cantidadRecibida', 'cantidad', 'cantidadTransferida'], '—');
  const fechaEfectiva = formatearFechaVisual(resolverValor(item, ['fechaEfectiva', 'fechaEfectivaTransferencia', 'fechaTransferencia'], ''));
  const fechaRegistro = formatearFechaHoraVisual(resolverValor(item, ['fechaRegistro', 'fechaHoraRegistro', 'creadoEn'], ''));
  const responsable = resolverValor(item, ['usuarioResponsable', 'responsable', 'usuario'], '—');
  const estado = resolverValor(item, ['estado', 'estadoTransferencia'], '—');

  const detalle = [
    `Identificador: ${formatearValor(id)}`,
    `Medicamento: ${formatearValor(medicamento)}`,
    `Lote: ${formatearValor(lote)}`,
    `Cantidad recibida: ${formatearValor(cantidad)}`,
    `Fecha efectiva: ${fechaEfectiva}`,
    `Fecha y hora real de registro: ${fechaRegistro}`,
    `Usuario responsable: ${formatearValor(responsable)}`,
    `Estado: ${formatearValor(estado)}`,
    '',
    'Movimiento interno de Farmacia (Mayor → Detal). No corresponde a una entrada externa.',
  ].join('\n');

  window.alert(detalle);
}

/* -------------------------------------------------------------------------- */
/* Consultas                                                                  */
/* -------------------------------------------------------------------------- */

async function consultarResumenDetal() {
  state.cargando.resumen = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.resumen);
  if (!metodo) {
    informarDependenciaConexion('el resumen de Inventario Detal');
    state.cargando.resumen = false;
    return;
  }

  try {
    const respuesta = await metodo(obtenerParametrosConsulta());
    actualizarTarjetasResumen(respuesta);
  } catch (error) {
    manejarErrorConsulta('el resumen de Inventario Detal', error);
  } finally {
    state.cargando.resumen = false;
  }
}

async function consultarMedicamentos() {
  state.cargando.medicamentos = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.medicamentos);
  if (!metodo) {
    state.medicamentos = [];
    informarDependenciaConexion('la consulta de medicamentos de Detal', '#tabla-medicamentos-detal', 8);
    renderMedicamentos();
    state.cargando.medicamentos = false;
    return;
  }

  renderEstadoTabla('#tabla-medicamentos-detal', 8, 'Consultando medicamentos', 'Obteniendo registros reales de Inventario Detal...');

  try {
    const respuesta = await metodo(obtenerParametrosConsulta());
    state.medicamentos = resolverListaRespuesta(respuesta, ['medicamentos']);
    state.paginacion.pagina = 1;
    renderMedicamentos();
  } catch (error) {
    state.medicamentos = [];
    renderMedicamentos();
    manejarErrorConsulta('los medicamentos de Inventario Detal', error);
  } finally {
    state.cargando.medicamentos = false;
  }
}

async function consultarLotes(medicamento = state.medicamentoSeleccionado) {
  state.cargando.lotes = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.lotes);
  const idMedicamento = resolverValor(medicamento, ['id', 'idMedicamento', 'medicamentoId', 'codigo', 'codigoMedicamento'], null);

  if (!medicamento || idMedicamento === null) {
    state.lotes = [];
    renderLotes();
    state.cargando.lotes = false;
    return;
  }

  if (!metodo) {
    state.lotes = [];
    informarDependenciaConexion('la consulta de lotes de Detal', '#tabla-lotes-detal', 9);
    state.cargando.lotes = false;
    return;
  }

  renderEstadoTabla('#tabla-lotes-detal', 9, 'Consultando lotes', 'Obteniendo lotes del medicamento seleccionado en Detal...');

  try {
    const params = {
      ...obtenerParametrosConsulta(),
      medicamentoId: idMedicamento,
      idMedicamento,
      codigoMedicamento: resolverValor(medicamento, ['codigo', 'codigoMedicamento'], undefined),
    };
    const respuesta = await metodo(params);
    // Solo lotes de Detal devueltos por backend; no se mezclan existencias de Mayor.
    state.lotes = resolverListaRespuesta(respuesta, ['lotes']);
    state.loteSeleccionado = null;
    limpiarDetalleLote();
    renderLotes();
  } catch (error) {
    state.lotes = [];
    renderLotes();
    if (/no existe|inexistente|no encontrado|404/i.test(normalizarTexto(error?.message)) || error?.status === 404) {
      mostrarMensajeSistema('El lote o medicamento solicitado no existe o no está disponible en Detal.', 'error');
    } else {
      manejarErrorConsulta('los lotes de Inventario Detal', error);
    }
  } finally {
    state.cargando.lotes = false;
  }
}

async function consultarTransferenciasRecibidas() {
  state.cargando.transferencias = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.transferencias);
  if (!metodo) {
    state.transferencias = [];
    informarDependenciaConexion('las transferencias recibidas desde Mayor', '#tabla-transferencias-recibidas', 9);
    state.cargando.transferencias = false;
    return;
  }

  renderEstadoTabla(
    '#tabla-transferencias-recibidas',
    9,
    'Consultando transferencias',
    'Obteniendo transferencias confirmadas recibidas desde Inventario Mayor...'
  );

  try {
    const respuesta = await metodo(obtenerParametrosConsulta());
    state.transferencias = resolverListaRespuesta(respuesta, ['transferencias', 'transferenciasRecibidas']);
    renderTransferencias();
  } catch (error) {
    state.transferencias = [];
    renderTransferencias();
    manejarErrorConsulta('las transferencias recibidas', error);
  } finally {
    state.cargando.transferencias = false;
  }
}

async function consultarMovimientos() {
  state.cargando.movimientos = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.movimientos);
  if (!metodo) {
    state.movimientos = [];
    informarDependenciaConexion('el historial de movimientos de Detal', '#tabla-movimientos-detal', 8);
    state.cargando.movimientos = false;
    return;
  }

  renderEstadoTabla('#tabla-movimientos-detal', 8, 'Consultando movimientos', 'Obteniendo historial real de movimientos de Detal...');

  try {
    const respuesta = await metodo(obtenerParametrosConsulta());
    state.movimientos = resolverListaRespuesta(respuesta, ['movimientos']);
    renderMovimientos();
  } catch (error) {
    state.movimientos = [];
    renderMovimientos();
    manejarErrorConsulta('los movimientos de Inventario Detal', error);
  } finally {
    state.cargando.movimientos = false;
  }
}

async function consultarAlertas() {
  if (!puedeVerAlertasAdministrativas()) {
    // Las alertas administrativas no se muestran a trabajadores.
    return;
  }

  state.cargando.alertas = true;
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.alertas);
  if (!metodo) {
    console.warn('Dependencia pendiente: la conexión no expone alertas administrativas de Inventario Detal.');
    state.cargando.alertas = false;
    return;
  }

  try {
    const respuesta = await metodo(obtenerParametrosConsulta());
    state.alertas = resolverObjetoRespuesta(respuesta);
    actualizarAlertasAdministrativas(state.alertas);
  } catch (error) {
    // Las alertas no deben bloquear la consulta principal.
    console.warn('No se pudieron consultar las alertas administrativas de Detal.', error);
  } finally {
    state.cargando.alertas = false;
  }
}

async function recargarDashboardCompleto() {
  if (!state.accesoValidado) return;
  leerFiltrosDesdeFormulario();
  const periodoValido = validarFiltrosPeriodo();
  if (!periodoValido.valido) return;

  await Promise.allSettled([
    consultarResumenDetal(),
    consultarMedicamentos(),
    consultarTransferenciasRecibidas(),
    consultarMovimientos(),
    consultarAlertas(),
  ]);
}

async function aplicarBusquedaYFiltros(evento) {
  if (evento) evento.preventDefault();
  state.paginacion.pagina = 1;
  await recargarDashboardCompleto();
  if (state.medicamentoSeleccionado) {
    await consultarLotes(state.medicamentoSeleccionado);
  }
}

async function seleccionarMedicamento(medicamento) {
  state.medicamentoSeleccionado = medicamento || null;
  state.loteSeleccionado = null;
  limpiarDetalleLote();
  renderMedicamentos();
  if (medicamento) {
    await consultarLotes(medicamento);
  } else {
    state.lotes = [];
    renderLotes();
  }
}

/* -------------------------------------------------------------------------- */
/* Códigos de barras y navegación                                             */
/* -------------------------------------------------------------------------- */

async function imprimirEtiquetaLote(lote = state.loteSeleccionado) {
  if (!lote) {
    mostrarMensajeSistema('Seleccione un lote para consultar o imprimir su etiqueta existente.', 'info');
    return;
  }

  const codigoBarras = resolverValor(lote, ['codigoBarras', 'codigoBarra', 'barcode', 'codigoBarrasOriginal'], '');
  const numeroLote = resolverValor(lote, ['numeroLote', 'lote', 'codigoLote'], '—');

  if (!codigoBarras) {
    mostrarMensajeSistema(`El lote ${formatearValor(numeroLote)} no tiene un código de barras registrado para imprimir.`, 'error');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.imprimirEtiqueta);

  // Se consulta/imprime etiqueta existente. No se genera ni sustituye el código original.
  if (metodo) {
    try {
      const respuesta = await metodo({
        loteId: resolverValor(lote, ['id', 'idLote', 'loteId'], undefined),
        numeroLote,
        codigoBarras,
        medicamentoId: resolverValor(state.medicamentoSeleccionado, ['id', 'idMedicamento', 'medicamentoId'], undefined),
      });

      // La conexión puede devolver una URL/acción de impresión ya preparada por backend.
      const url = resolverValor(resolverObjetoRespuesta(respuesta), ['url', 'urlImpresion', 'enlace', 'href'], null);
      if (url) {
        window.open(String(url), '_blank', 'noopener,noreferrer');
        return;
      }

      mostrarMensajeSistema('La etiqueta existente fue consultada correctamente. La presentación/impresión depende de la respuesta del backend.', 'info');
      return;
    } catch (error) {
      manejarErrorConsulta('la etiqueta del lote', error);
      return;
    }
  }

  // Dependencia pendiente: sin método expuesto no se inventa impresión ni código.
  console.warn(
    'Dependencia pendiente: la conexión centralizada no expone un método para consultar/imprimir etiquetas existentes de lotes en Detal.'
  );
  mostrarMensajeSistema(
    `Código de barras existente del lote ${formatearValor(numeroLote)}: ${formatearValor(codigoBarras)}. La impresión depende de la conexión centralizada y no genera un código nuevo.`,
    'info'
  );
}

function navegarA(destino, nombre) {
  if (!destino) {
    mostrarMensajeSistema(`No se encontró una ruta configurada para ${nombre}.`, 'error');
    return;
  }
  window.location.assign(destino);
}

function limpiarFiltrosFormulario() {
  const form = base.obtenerElementoPorId('formulario-busqueda-detal');
  if (form && typeof form.reset === 'function') {
    form.reset();
  }
  leerFiltrosDesdeFormulario();
  state.paginacion.pagina = 1;
}

function restablecerFiltros() {
  limpiarFiltrosFormulario();
  recargarDashboardCompleto();
  if (state.medicamentoSeleccionado) {
    consultarLotes(state.medicamentoSeleccionado);
  }
}

/* -------------------------------------------------------------------------- */
/* Eventos                                                                    */
/* -------------------------------------------------------------------------- */

function enlazarEventos() {
  const form = base.obtenerElementoPorId('formulario-busqueda-detal');
  if (form) {
    form.addEventListener('submit', aplicarBusquedaYFiltros);
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        leerFiltrosDesdeFormulario();
        state.paginacion.pagina = 1;
        recargarDashboardCompleto();
        if (state.medicamentoSeleccionado) {
          consultarLotes(state.medicamentoSeleccionado);
        }
      }, 0);
    });
  }

  base.obtenerElementoPorId('btn-limpiar-filtros-detal')?.addEventListener('click', () => {
    // El reset nativo disparará el handler anterior; esto asegura consistencia.
  });
  base.obtenerElementoPorId('btn-restablecer-filtros-detal')?.addEventListener('click', restablecerFiltros);

  base.obtenerElementoPorId('btn-actualizar-medicamentos-detal')?.addEventListener('click', async () => {
    leerFiltrosDesdeFormulario();
    await consultarMedicamentos();
    if (state.medicamentoSeleccionado) {
      await consultarLotes(state.medicamentoSeleccionado);
    }
  });

  base.obtenerElementoPorId('btn-consultar-medicamentos-detal')?.addEventListener('click', async () => {
    base.obtenerElementoPorId('busqueda-medicamento-detal')?.focus();
    await consultarMedicamentos();
  });
  base.obtenerElementoPorId('btn-consultar-lotes-detal')?.addEventListener('click', async () => {
    if (!state.medicamentoSeleccionado) {
      mostrarMensajeSistema('Seleccione un medicamento para consultar sus lotes en Detal.', 'info');
      return;
    }
    await consultarLotes(state.medicamentoSeleccionado);
  });

  base.obtenerElementoPorId('btn-consultar-transferencias-recibidas-detal')?.addEventListener('click', async () => {
    await consultarTransferenciasRecibidas();
    base.obtenerElementoPorId('seccion-transferencias-recibidas-detal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  base.obtenerElementoPorId('btn-consultar-mayor')?.addEventListener('click', () => navegarA(RUTAS.mayor, 'Inventario Mayor'));
  base.obtenerElementoPorId('btn-consultar-transferencias')?.addEventListener('click', () => navegarA(RUTAS.transferencias, 'Transferencias'));
  base.obtenerElementoPorId('btn-consultar-kardex')?.addEventListener('click', () => navegarA(RUTAS.kardex, 'Kardex'));
  base.obtenerElementoPorId('btn-acceder-reportes')?.addEventListener('click', (evento) => {
    evento.preventDefault();
    navegarA(RUTAS.reportes, 'Reportes');
  });
  base.obtenerElementoPorId('btn-acceso-reportes-detal')?.addEventListener('click', (evento) => {
    evento.preventDefault();
    navegarA(RUTAS.reportes, 'Reportes');
  });

  base.obtenerElementoPorId('btn-imprimir-etiqueta-lote-detal')?.addEventListener('click', () => {
    imprimirEtiquetaLote(state.loteSeleccionado);
  });
  base.obtenerElementoPorId('btn-imprimir-etiqueta-detalle-detal')?.addEventListener('click', () => {
    imprimirEtiquetaLote(state.loteSeleccionado);
  });

  // Paginación
  base.obtenerElementoPorId('detal-paginacion-anterior')?.addEventListener('click', () => irAPagina(state.paginacion.pagina - 1));
  base.obtenerElementoPorId('detal-paginacion-siguiente')?.addEventListener('click', () => irAPagina(state.paginacion.pagina + 1));
  base.obtenerElementoPorId('detal-paginacion-tamano')?.addEventListener('change', (evento) => {
    const tamano = Number(evento.target?.value || 20);
    state.paginacion.tamano = Number.isFinite(tamano) && tamano > 0 ? tamano : 20;
    state.paginacion.pagina = 1;
    renderMedicamentos();
  });

  // Actualización coordinada tras confirmación de transferencias (evento emitido por otro módulo).
  // No se modifica Mayor desde este archivo; solo se refrescan datos de Detal.
  const eventosActualizacion = [
    'app:transferencia:confirmada',
    'app:transferencia-detal:confirmada',
    'transferencia:confirmada',
  ];
  eventosActualizacion.forEach((nombreEvento) => {
    document.addEventListener(nombreEvento, () => {
      recargarDashboardCompleto().then(() => {
        if (state.medicamentoSeleccionado) {
          consultarLotes(state.medicamentoSeleccionado);
        }
      });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Inicialización                                                             */
/* -------------------------------------------------------------------------- */

async function inicializar() {
  await cargarConexionFarmacia();

  const autorizado = await validarAccesoDetal();
  if (!autorizado) return;

  leerFiltrosDesdeFormulario();
  enlazarEventos();
  limpiarDetalleLote();
  actualizarControlesPaginacion();

  // Intentar usar listas buscables si existe un contenedor previsto y proveedor disponible.
  // No se crean catálogos estáticos: el proveedor debe ser expuesto por la conexión centralizada.
  try {
    const contenedorListaMedicamentos = base.obtenerElementoPorId('contenedor-lista-medicamento-detal');
    const proveedorMedicamentos = obtenerMetodoConexion([
      'buscarMedicamentosDetal',
      'consultarMedicamentosDetal',
      'listarMedicamentosDetal',
    ]);
    if (contenedorListaMedicamentos && typeof listasBuscables.crearListaMedicamentos === 'function' && proveedorMedicamentos) {
      listasBuscables.crearListaMedicamentos({
        elemento: contenedorListaMedicamentos,
        buscarProvider: async ({ query }) => {
          const respuesta = await proveedorMedicamentos({ ...obtenerParametrosConsulta(), busqueda: query, texto: query });
          return resolverListaRespuesta(respuesta, ['medicamentos']);
        },
        onSeleccion: (item) => seleccionarMedicamento(item),
      });
    }
  } catch (error) {
    console.warn('No fue posible inicializar la lista buscable de medicamentos en Detal.', error);
  }

  await recargarDashboardCompleto();
}

// La validación de acceso y permisos es obligatoria antes de operar.
inicializar();

// Exponer recarga controlada para coordinación externa (sin modificar otros módulos).
window.appInventarioDetal = Object.freeze({
  recargar: recargarDashboardCompleto,
  consultarMedicamentos,
  consultarLotes,
  consultarTransferenciasRecibidas,
  consultarMovimientos,
  consultarAlertas,
});