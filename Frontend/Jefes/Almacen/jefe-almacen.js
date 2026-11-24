import * as base from '../../compartidos/js/base.js';
import * as controlSesion from '../../compartidos/js/control-sesion.js';

const MODULO_CONEXION = '../../../conexiones/frontend/jefe-almacen.conexion.js';

const state = {
  conexion: null,
  accesoValidado: false,
  usuario: null,
  inventario: null,
  entradas: [],
  salidas: [],
  despachos: [],
  distribucion: [],
  salidasPacientes: [],
  alertas: [],
  actividad: [],
  cierreMensual: null,
  filtros: {
    fechaInicio: '',
    fechaFin: '',
  },
};

const NOMBRES_CONEXION = {
  usuario: ['obtenerUsuarioActualAlmacen', 'consultarUsuarioActualAlmacen', 'obtenerPerfilUsuario'],
  inventario: ['obtenerInventarioGeneralAlmacen', 'consultarInventarioGeneralAlmacen', 'obtenerInventarioGeneral'],
  lotes: ['obtenerLotesInventarioAlmacen', 'consultarLotesInventarioAlmacen', 'listarLotesInventario'],
  entradas: ['obtenerEntradasF15Almacen', 'consultarEntradasF15Almacen', 'obtenerEntradasF15'],
  salidas: ['obtenerSalidasF156CAlmacen', 'consultarSalidasF156CAlmacen', 'obtenerSalidasF156C'],
  procedencias: ['obtenerProcedenciasAlmacen', 'consultarProcedenciasAlmacen', 'listarProcedencias'],
  despachos: ['obtenerDespachosAlmacen', 'consultarDespachosAlmacen', 'listarDespachos'],
  distribucion: ['obtenerDistribucionServiciosAlmacen', 'consultarDistribucionServiciosAlmacen', 'listarDistribucionServicios'],
  pacientes: ['obtenerSalidasPacientesAlmacen', 'consultarSalidasPacientesAlmacen', 'listarSalidasPacientes'],
  alertas: ['obtenerAlertasInventarioAlmacen', 'consultarAlertasInventarioAlmacen', 'listarAlertasInventario'],
  actividad: ['obtenerActividadTrabajadoresAlmacen', 'consultarActividadTrabajadoresAlmacen', 'listarActividadTrabajadores'],
  cierreMensual: ['obtenerCierreMensualAlmacen', 'consultarCierreMensualAlmacen', 'obtenerResumenMensual'],
};

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

function resolverValor(obj, claves) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(obj, clave)) {
      return obj[clave];
    }
  }
  return undefined;
}

function resolverListaRespuesta(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!respuesta || typeof respuesta !== 'object') return [];

  const rutas = ['data', 'items', 'registros', 'resultado', 'entradas', 'salidas', 'despachos', 'distribucion', 'alertas', 'actividad', 'pacientes'];
  for (const clave of rutas) {
    if (Array.isArray(respuesta[clave])) return respuesta[clave];
  }

  return [];
}

function resolverObjetoRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return {};
  if (Array.isArray(respuesta)) return {};

  if (respuesta.data && typeof respuesta.data === 'object' && !Array.isArray(respuesta.data)) {
    return respuesta.data;
  }

  return respuesta;
}

function obtenerElementos() {
  return {
    nombre: document.getElementById('jefe-almacen-nombre'),
    rol: document.getElementById('jefe-almacen-rol'),
    departamento: document.getElementById('jefe-almacen-departamento'),
    totalInsumos: document.getElementById('almacen-total-insumos'),
    existenciaTotal: document.getElementById('almacen-existencia-total'),
    totalLotes: document.getElementById('almacen-total-lotes'),
    lotesDisponibles: document.getElementById('almacen-lotes-disponibles'),
    totalEntradas: document.getElementById('almacen-total-entradas'),
    totalSalidas: document.getElementById('almacen-total-salidas'),
    procedenciaMinisterio: document.getElementById('almacen-procedencia-ministerio'),
    procedenciaDonacion: document.getElementById('almacen-procedencia-donacion'),
    procedenciaCompra: document.getElementById('almacen-procedencia-compra'),
    fechaInicio: document.getElementById('fecha-inicio-resumen'),
    fechaFin: document.getElementById('fecha-fin-resumen'),
    btnAplicar: document.getElementById('btn-aplicar-periodo'),
    btnCerrarSesion: document.getElementById('btn-cerrar-sesion'),
    tablaEntradas: document.querySelector('table[aria-label="Entradas F-15"] tbody'),
    tablaSalidas: document.querySelector('table[aria-label="Salidas F-15-6C"] tbody'),
    tablaDistribucion: document.querySelector('#almacen-distribucion-servicios tbody'),
    tablaPacientes: document.querySelector('#almacen-salidas-pacientes tbody'),
    tablaAlertas: document.querySelector('#almacen-alertas tbody'),
    tablaActividad: document.querySelector('#almacen-actividad-trabajadores tbody'),
    inventarioInicial: document.getElementById('almacen-inventario-inicial'),
    entradasMensual: document.getElementById('almacen-total-entradas-mensual'),
    salidasMensual: document.getElementById('almacen-total-salidas-mensual'),
    ajustesAutorizados: document.getElementById('almacen-ajustes-autorizados'),
    existenciaFinal: document.getElementById('almacen-existencia-final'),
  };
}

function obtenerUsuarioDesdeSesion() {
  if (typeof controlSesion.obtenerDatosSesionSegura === 'function') {
    const datos = controlSesion.obtenerDatosSesionSegura();
    if (datos && datos.usuario) return datos.usuario;
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('usuarioActual');
      if (raw) return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return null;
}

function formatearFecha(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return '—';

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return texto;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(fecha);
}

async function cargarConexionJefeAlmacen() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch (error) {
    state.conexion = null;
    console.warn('No se encontró la conexión centralizada del Jefe de Almacén:', error);
  }
}

function obtenerMetodoConexion(nombres) {
  if (!state.conexion || typeof state.conexion !== 'object') return null;

  for (const nombre of nombres) {
    if (typeof state.conexion[nombre] === 'function') {
      return state.conexion[nombre].bind(state.conexion);
    }
  }

  return null;
}

function establecerUsuarioEnPantalla(usuario) {
  const elementos = obtenerElementos();
  if (!usuario) return;

  const nombre = normalizarTexto(resolverValor(usuario, ['nombreCompleto', 'nombre', 'fullName'])) ||
    normalizarTexto(resolverValor(usuario, ['username', 'usuario'])) || 'Usuario';
  const rol = normalizarTexto(resolverValor(usuario, ['rol', 'role', 'tipoRol'])) || 'Jefe de Almacén';
  const departamento = normalizarTexto(resolverValor(usuario, ['departamento', 'department'])) || 'Almacén';

  if (elementos.nombre) elementos.nombre.textContent = nombre;
  if (elementos.rol) elementos.rol.textContent = rol;
  if (elementos.departamento) elementos.departamento.textContent = departamento;
}

async function validarAccesoJefeAlmacen() {
  if (state.accesoValidado) return true;

  try {
    const usuarioSesion = obtenerUsuarioDesdeSesion();
    const rolUsado = controlSesion.obtenerRolUsuario && usuarioSesion ? controlSesion.obtenerRolUsuario(usuarioSesion) : '';
    const departamentoUsado = controlSesion.obtenerDepartamentoUsuario && usuarioSesion ? controlSesion.obtenerDepartamentoUsuario(usuarioSesion) : '';

    if (controlSesion.consultarSesionActual && typeof controlSesion.consultarSesionActual === 'function') {
      const sesion = await controlSesion.consultarSesionActual();
      const usuario = controlSesion.obtenerUsuarioDesdeSesion ? controlSesion.obtenerUsuarioDesdeSesion(sesion) : (sesion && sesion.usuario ? sesion.usuario : sesion);
      if (!usuario) throw new Error('Sesión inválida');

      const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(usuario) : '';
      const departamento = controlSesion.obtenerDepartamentoUsuario ? controlSesion.obtenerDepartamentoUsuario(usuario) : '';
      const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === controlSesion.ROLES?.JEFE_ALMACEN && departamento === controlSesion.DEPARTAMENTOS?.ALMACEN);

      if (!autorizado) throw new Error('Acceso denegado');

      state.usuario = usuario;
      state.accesoValidado = true;
      establecerUsuarioEnPantalla(usuario);
      return true;
    }

    const usuario = usuarioSesion || null;
    if (!usuario) throw new Error('Sesión inválida');

    const rol = rolUsado || resolverValor(usuario, ['rol', 'role', 'tipoRol']) || '';
    const departamento = departamentoUsado || resolverValor(usuario, ['departamento', 'department']) || '';
    const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === controlSesion.ROLES?.JEFE_ALMACEN && departamento === controlSesion.DEPARTAMENTOS?.ALMACEN);

    if (!autorizado) throw new Error('Acceso denegado');

    state.usuario = usuario;
    state.accesoValidado = true;
    establecerUsuarioEnPantalla(usuario);
    return true;
  } catch (error) {
    console.error('Acceso no autorizado o sesión vencida:', error);
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
    window.location.assign(destino);
    return false;
  }
}

function obtenerFechasPorDefecto() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  state.filtros.fechaInicio = inicio.toISOString().slice(0, 10);
  state.filtros.fechaFin = fin.toISOString().slice(0, 10);

  const elementos = obtenerElementos();
  if (elementos.fechaInicio) elementos.fechaInicio.value = state.filtros.fechaInicio;
  if (elementos.fechaFin) elementos.fechaFin.value = state.filtros.fechaFin;
}

function aplicarFiltroPeriodo() {
  const elementos = obtenerElementos();
  state.filtros.fechaInicio = normalizarTexto(elementos.fechaInicio?.value || '');
  state.filtros.fechaFin = normalizarTexto(elementos.fechaFin?.value || '');

  if (!state.filtros.fechaInicio || !state.filtros.fechaFin) {
    obtenerFechasPorDefecto();
  }

  if (new Date(state.filtros.fechaInicio) > new Date(state.filtros.fechaFin)) {
    [state.filtros.fechaInicio, state.filtros.fechaFin] = [state.filtros.fechaFin, state.filtros.fechaInicio];
    if (elementos.fechaInicio) elementos.fechaInicio.value = state.filtros.fechaInicio;
    if (elementos.fechaFin) elementos.fechaFin.value = state.filtros.fechaFin;
  }

  recargarDashboard();
}

function restablecerFiltroPeriodo() {
  obtenerFechasPorDefecto();
  recargarDashboard();
}

function actualizarTarjetasInventario(respuesta) {
  const data = resolverObjetoRespuesta(respuesta);
  const elementos = obtenerElementos();

  if (elementos.totalInsumos) elementos.totalInsumos.textContent = resolverValor(data, ['totalInsumos', 'insumosRegistrados', 'cantidadInsumos']) ?? '0';
  if (elementos.existenciaTotal) elementos.existenciaTotal.textContent = resolverValor(data, ['existenciaTotal', 'stockTotal', 'totalExistencia']) ?? '0';
  if (elementos.totalLotes) elementos.totalLotes.textContent = resolverValor(data, ['totalLotes', 'lotesRegistrados', 'cantidadLotes']) ?? '0';
  if (elementos.lotesDisponibles) elementos.lotesDisponibles.textContent = resolverValor(data, ['lotesDisponibles', 'lotesConExistencia']) ?? '0';
  if (elementos.totalEntradas) elementos.totalEntradas.textContent = resolverValor(data, ['totalEntradas', 'entradasRegistradas']) ?? '0';
  if (elementos.totalSalidas) elementos.totalSalidas.textContent = resolverValor(data, ['totalSalidas', 'salidasRegistradas']) ?? '0';
  if (elementos.procedenciaMinisterio) elementos.procedenciaMinisterio.textContent = resolverValor(data, ['ministerio', 'procedenciaMinisterio']) ?? '0';
  if (elementos.procedenciaDonacion) elementos.procedenciaDonacion.textContent = resolverValor(data, ['donacion', 'procedenciaDonacion']) ?? '0';
  if (elementos.procedenciaCompra) elementos.procedenciaCompra.textContent = resolverValor(data, ['compraHospitalaria', 'procedenciaCompra']) ?? '0';
}

async function consultarInventarioGeneral() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.inventario);
  if (!metodo) {
    console.warn('La conexión no expone el inventario general del departamento de Almacén.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.inventario = resolverObjetoRespuesta(respuesta);
    actualizarTarjetasInventario(respuesta);
  } catch (error) {
    console.error('Error al consultar inventario general:', error);
  }
}

async function consultarEntradasF15() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.entradas);
  if (!metodo) {
    console.warn('La conexión no expone las entradas F-15.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.entradas = resolverListaRespuesta(respuesta);
    renderEntradas();
  } catch (error) {
    console.error('Error al consultar entradas F-15:', error);
    state.entradas = [];
    renderEntradas();
  }
}

function renderEntradas() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaEntradas;
  if (!cuerpo) return;

  if (!state.entradas.length) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="app-superadmin-empty-state">No hay entradas registradas para el período consultado.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.entradas.forEach((entrada) => {
    const fila = document.createElement('tr');
    const documento = resolverValor(entrada, ['documento', 'identificador', 'numeroDocumento']) || '—';
    const fecha = formatearFecha(resolverValor(entrada, ['fechaEntrada', 'fechaEfectiva', 'fecha'])) || '—';
    const insumo = resolverValor(entrada, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const cantidad = resolverValor(entrada, ['cantidadRecibida', 'cantidad', 'total']) ?? '0';
    const procedencia = resolverValor(entrada, ['procedencia', 'origen']) || '—';
    const lote = resolverValor(entrada, ['lote', 'numeroLote']) || '—';
    const estado = resolverValor(entrada, ['estado', 'estadoMovimiento']) || '—';

    [documento, fecha, insumo, cantidad, procedencia, lote, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarSalidasF156C() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.salidas);
  if (!metodo) {
    console.warn('La conexión no expone las salidas F-15-6C.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.salidas = resolverListaRespuesta(respuesta);
    renderSalidas();
  } catch (error) {
    console.error('Error al consultar salidas F-15-6C:', error);
    state.salidas = [];
    renderSalidas();
  }
}

function renderSalidas() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaSalidas;
  if (!cuerpo) return;

  if (!state.salidas.length) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="app-superadmin-empty-state">No hay salidas confirmadas en el período consultado.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.salidas.forEach((salida) => {
    const fila = document.createElement('tr');
    const documento = resolverValor(salida, ['documento', 'identificador', 'codigoSalida']) || '—';
    const fecha = formatearFecha(resolverValor(salida, ['fechaSalida', 'fechaEfectiva', 'fecha'])) || '—';
    const insumo = resolverValor(salida, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const lote = resolverValor(salida, ['lote', 'numeroLote', 'loteSeleccionado']) || '—';
    const cantidad = resolverValor(salida, ['cantidadDespachada', 'cantidad', 'cantidadSalida']) ?? '0';
    const servicio = resolverValor(salida, ['servicio', 'departamento', 'areaDestino']) || '—';
    const estado = resolverValor(salida, ['estado', 'estadoMovimiento']) || '—';

    [documento, fecha, insumo, lote, cantidad, servicio, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarDespachos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.despachos);
  if (!metodo) return;

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.despachos = resolverListaRespuesta(respuesta);
  } catch (error) {
    console.error('Error al consultar despachos:', error);
    state.despachos = [];
  }
}

async function consultarDistribucionServicios() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.distribucion);
  if (!metodo) {
    console.warn('La conexión no expone la distribución por servicios.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.distribucion = resolverListaRespuesta(respuesta);
    renderDistribucion();
  } catch (error) {
    console.error('Error al consultar distribución por servicios:', error);
    state.distribucion = [];
    renderDistribucion();
  }
}

function renderDistribucion() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaDistribucion;
  if (!cuerpo) return;

  if (!state.distribucion.length) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="app-superadmin-empty-state">No hay distribución registrada para mostrar.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.distribucion.forEach((registro) => {
    const fila = document.createElement('tr');
    const servicio = resolverValor(registro, ['servicio', 'area', 'nombreServicio']) || '—';
    const insumo = resolverValor(registro, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const cantidad = resolverValor(registro, ['cantidadSuministrada', 'cantidad', 'total']) ?? '0';
    const fecha = formatearFecha(resolverValor(registro, ['fechaSuministro', 'fecha', 'fechaEfectiva'])) || '—';
    const total = resolverValor(registro, ['totalPeriodo', 'total']) ?? cantidad;

    [servicio, insumo, cantidad, fecha, total].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarSalidasPacientes() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.pacientes);
  if (!metodo) return;

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.salidasPacientes = resolverListaRespuesta(respuesta);
    renderSalidasPacientes();
  } catch (error) {
    console.error('Error al consultar salidas a pacientes:', error);
    state.salidasPacientes = [];
    renderSalidasPacientes();
  }
}

function renderSalidasPacientes() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaPacientes;
  if (!cuerpo) return;

  if (!state.salidasPacientes.length) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="app-superadmin-empty-state">No hay salidas a pacientes registradas.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.salidasPacientes.forEach((registro) => {
    const fila = document.createElement('tr');
    const operacion = resolverValor(registro, ['operacion', 'codigoOperacion']) || '—';
    const insumo = resolverValor(registro, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const cantidad = resolverValor(registro, ['cantidad', 'cantidadEntregada']) ?? '0';
    const fecha = formatearFecha(resolverValor(registro, ['fecha', 'fechaEfectiva'])) || '—';
    const estado = resolverValor(registro, ['estado', 'estadoMovimiento']) || '—';

    [operacion, insumo, cantidad, fecha, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarAlertasInventario() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.alertas);
  if (!metodo) {
    console.warn('La conexión no expone alertas de inventario.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.alertas = resolverListaRespuesta(respuesta);
    renderAlertas();
  } catch (error) {
    console.error('Error al consultar alertas:', error);
    state.alertas = [];
    renderAlertas();
  }
}

function renderAlertas() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaAlertas;
  if (!cuerpo) return;

  if (!state.alertas.length) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="app-superadmin-empty-state">No hay alertas activas reportadas por el backend.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.alertas.forEach((alerta) => {
    const fila = document.createElement('tr');
    const insumo = resolverValor(alerta, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const codigo = resolverValor(alerta, ['codigo', 'codigoInsumo']) || '—';
    const lote = resolverValor(alerta, ['lote', 'numeroLote']) || '—';
    const vencimiento = formatearFecha(resolverValor(alerta, ['fechaVencimiento', 'vencimiento'])) || '—';
    const existencia = resolverValor(alerta, ['existenciaDisponible', 'existencia', 'stockDisponible']) ?? '0';
    const tipo = resolverValor(alerta, ['tipoAlerta', 'tipo']) || '—';
    const prioridad = resolverValor(alerta, ['prioridad']) || '—';

    [insumo, codigo, lote, vencimiento, existencia, tipo, prioridad].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarActividadTrabajadores() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.actividad);
  if (!metodo) {
    console.warn('La conexión no expone la actividad del personal de Almacén.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.actividad = resolverListaRespuesta(respuesta);
    renderActividad();
  } catch (error) {
    console.error('Error al consultar actividad del personal:', error);
    state.actividad = [];
    renderActividad();
  }
}

function renderActividad() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaActividad;
  if (!cuerpo) return;

  if (!state.actividad.length) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="app-superadmin-empty-state">No hay actividad reciente disponible.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  state.actividad.forEach((movimiento) => {
    const fila = document.createElement('tr');
    const trabajador = resolverValor(movimiento, ['trabajador', 'responsable', 'usuario']) || '—';
    const operacion = resolverValor(movimiento, ['operacion', 'tipoMovimiento']) || '—';
    const insumo = resolverValor(movimiento, ['insumo', 'nombreInsumo', 'producto']) || '—';
    const lote = resolverValor(movimiento, ['lote', 'numeroLote']) || '—';
    const cantidad = resolverValor(movimiento, ['cantidad', 'cantidadMovimiento']) ?? '0';
    const fecha = formatearFecha(resolverValor(movimiento, ['fechaEfectiva', 'fechaMovimiento', 'fecha'])) || '—';
    const estado = resolverValor(movimiento, ['estado', 'estadoMovimiento']) || '—';

    [trabajador, operacion, insumo, lote, cantidad, fecha, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarCierreMensual() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.cierreMensual);
  if (!metodo) {
    console.warn('La conexión no expone el cierre mensual.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.cierreMensual = resolverObjetoRespuesta(respuesta);
    const elementos = obtenerElementos();
    const inventarioInicial = resolverValor(state.cierreMensual, ['inventarioInicial', 'saldoInicial']) ?? '0';
    const entradas = resolverValor(state.cierreMensual, ['entradasPeriodo', 'totalEntradas']) ?? '0';
    const salidas = resolverValor(state.cierreMensual, ['salidasPeriodo', 'totalSalidas']) ?? '0';
    const ajustes = resolverValor(state.cierreMensual, ['ajustesAutorizados', 'totalAjustes']) ?? '0';
    const final = resolverValor(state.cierreMensual, ['existenciaFinal', 'saldoFinal']) ?? '0';

    if (elementos.inventarioInicial) elementos.inventarioInicial.value = inventarioInicial;
    if (elementos.entradasMensual) elementos.entradasMensual.value = entradas;
    if (elementos.salidasMensual) elementos.salidasMensual.value = salidas;
    if (elementos.ajustesAutorizados) elementos.ajustesAutorizados.value = ajustes;
    if (elementos.existenciaFinal) elementos.existenciaFinal.value = final;
  } catch (error) {
    console.error('Error al consultar cierre mensual:', error);
  }
}

async function recargarDashboard() {
  await consultarInventarioGeneral();
  await consultarEntradasF15();
  await consultarSalidasF156C();
  await consultarDespachos();
  await consultarDistribucionServicios();
  await consultarSalidasPacientes();
  await consultarAlertasInventario();
  await consultarActividadTrabajadores();
  await consultarCierreMensual();
}

function navegarModulo(ruta) {
  if (!ruta) return;
  window.location.assign(ruta);
}

function enlazarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnAplicar) {
    elementos.btnAplicar.addEventListener('click', aplicarFiltroPeriodo);
  }

  const botonRestaurar = document.getElementById('btn-restablecer-periodo');
  if (botonRestaurar) {
    botonRestaurar.addEventListener('click', restablecerFiltroPeriodo);
  }

  if (elementos.btnCerrarSesion) {
    elementos.btnCerrarSesion.addEventListener('click', async () => {
      if (typeof controlSesion.cerrarSesionServidor === 'function') {
        try {
          await controlSesion.cerrarSesionServidor();
        } catch (error) {
          console.warn('No se pudo cerrar la sesión del servidor, se continuará con la redirección visual.', error);
        }
      }
      const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
      window.location.assign(destino);
    });
  }

  const rutas = {
    'btn-inventario-general': '/Frontend/Almacen/Inventario_General/',
    'btn-entradas-f15': '/Frontend/Almacen/Entrada_F15/',
    'btn-salidas-f15-6c': '/Frontend/Almacen/Salida_F15_6C/',
    'btn-despachos': '/Frontend/Almacen/Despachos/',
    'btn-distribucion': '/Frontend/Almacen/Distribucion_Servicios/',
    'btn-reportes-almacen': '/Frontend/Almacen/Reportes/',
  };

  Object.entries(rutas).forEach(([id, ruta]) => {
    const boton = document.getElementById(id);
    if (boton) {
      boton.addEventListener('click', () => navegarModulo(ruta));
    }
  });
}

async function inicializar() {
  await cargarConexionJefeAlmacen();
  const autorizado = await validarAccesoJefeAlmacen();
  if (!autorizado) return;

  enlazarEventos();
  obtenerFechasPorDefecto();
  await recargarDashboard();
}

inicializar();
