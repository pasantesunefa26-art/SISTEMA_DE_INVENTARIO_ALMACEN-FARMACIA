import * as base from '../../compartidos/js/base.js';
import * as controlSesion from '../../compartidos/js/control-sesion.js';

const MODULO_CONEXION = '../../../conexiones/frontend/jefe-farmacia.conexion.js';

const state = {
  conexion: null,
  accesoValidado: false,
  usuario: null,
  inventarioMayor: null,
  inventarioDetal: null,
  operacionEnCurso: false,
  alertas: [],
  actividad: [],
  entregas: [],
  filtros: {
    fechaInicio: '',
    fechaFin: '',
  },
};

const NOMBRES_CONEXION = {
  usuario: ['obtenerUsuarioActualFarmacia', 'consultarUsuarioActual', 'obtenerPerfilUsuario'],
  resumen: ['obtenerResumenFarmacia', 'consultarResumenFarmacia', 'obtenerDashboardFarmacia'],
  inventarioMayor: ['obtenerInventarioMayorFarmacia', 'consultarInventarioMayor', 'obtenerInventarioMayor'],
  inventarioDetal: ['obtenerInventarioDetalFarmacia', 'consultarInventarioDetal', 'obtenerInventarioDetal'],
  donaciones: ['obtenerResumenDonacionesFarmacia', 'consultarDonacionesFarmacia'],
  entregas: ['obtenerEntregasFarmacia', 'consultarEntregasFarmacia', 'obtenerResumenEntregas'],
  alertas: ['obtenerAlertasFarmacia', 'consultarAlertasFarmacia', 'listarAlertasFarmacia'],
  actividad: ['obtenerActividadFarmacia', 'consultarActividadFarmacia', 'listarActividadFarmacia'],
  reportes: ['obtenerReportesFarmacia', 'consultarReportesFarmacia'],
};

function obtenerElementos() {
  return {
    nombre: document.getElementById('jefe-farmacia-nombre'),
    rol: document.getElementById('jefe-farmacia-rol'),
    departamento: document.getElementById('jefe-farmacia-departamento'),
    totalMayor: document.getElementById('farmacia-total-mayor'),
    totalDetal: document.getElementById('farmacia-total-detal'),
    totalConsolidado: document.getElementById('farmacia-total-consolidado'),
    lotesMayor: document.getElementById('farmacia-lotes-mayor'),
    lotesDetal: document.getElementById('farmacia-lotes-detal'),
    medicamentosRecibidos: document.getElementById('farmacia-medicamentos-recibidos'),
    totalDonaciones: document.getElementById('farmacia-total-donaciones'),
    sumatoriaMedicamentosDonaciones: document.getElementById('farmacia-sumatoria-medicamentos-donaciones'),
    totalEntregado: document.getElementById('farmacia-total-entregado'),
    fechaInicio: document.getElementById('fecha-inicio-resumen'),
    fechaFin: document.getElementById('fecha-fin-resumen'),
    btnAplicarPeriodo: document.getElementById('btn-aplicar-periodo'),
    btnRestablecerPeriodo: document.getElementById('btn-restablecer-periodo'),
    btnCerrarSesion: document.getElementById('btn-cerrar-sesion'),
    tablaAlertas: document.querySelector('#alertas-farmacia tbody'),
    tablaActividad: document.querySelector('#actividad-farmacia tbody'),
    totalEntregadoResumen: document.getElementById('farmacia-total-entregado-resumen'),
    medicamentosEntregados: document.getElementById('farmacia-medicamentos-entregados'),
    cantidadEntregada: document.getElementById('farmacia-cantidad-entregada'),
  };
}

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

  const rutas = ['data', 'items', 'registros', 'resultado', 'alertas', 'actividad', 'entregas', 'productos'];
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

function formatearFecha(fecha) {
  const valor = normalizarTexto(fecha);
  if (!valor) return '—';

  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return valor;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function establecerUsuarioEnPantalla(usuario) {
  const elementos = obtenerElementos();
  if (!usuario) return;

  const nombre = normalizarTexto(resolverValor(usuario, ['nombreCompleto', 'nombre', 'fullName'])) || normalizarTexto(resolverValor(usuario, ['username', 'usuario'])) || 'Usuario';
  const rol = normalizarTexto(resolverValor(usuario, ['rol', 'role'])) || 'Jefe de Farmacia';
  const departamento = normalizarTexto(resolverValor(usuario, ['departamento', 'department'])) || 'Farmacia';

  if (elementos.nombre) elementos.nombre.textContent = nombre;
  if (elementos.rol) elementos.rol.textContent = rol;
  if (elementos.departamento) elementos.departamento.textContent = departamento;
}

async function cargarConexionJefeFarmacia() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch (error) {
    state.conexion = null;
    console.warn('No se encontró la conexión de Farmacia para el dashboard:', error);
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

async function validarAccesoJefeFarmacia() {
  if (state.accesoValidado) return true;

  try {
    if (typeof controlSesion.verificarSesionAntesDeAcceder === 'function') {
      const resultado = await controlSesion.verificarSesionAntesDeAcceder({
        ruta: window.location.pathname + window.location.search,
        redirigir: true,
      });

      if (!resultado || !resultado.usuario) throw new Error('Sesión inválida');

      const rol = typeof controlSesion.obtenerRolUsuario === 'function'
        ? controlSesion.obtenerRolUsuario(resultado.usuario)
        : '';

      const departamento = typeof controlSesion.obtenerDepartamentoUsuario === 'function'
        ? controlSesion.obtenerDepartamentoUsuario(resultado.usuario)
        : '';

      const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === 'JEFE_FARMACIA' && departamento === 'FARMACIA');
      if (!autorizado) throw new Error('Acceso denegado');

      state.usuario = resultado.usuario;
      state.accesoValidado = true;
      establecerUsuarioEnPantalla(resultado.usuario);
      return true;
    }

    const usuario = obtenerUsuarioDesdeSesion();
    const rol = usuario && typeof controlSesion.obtenerRolUsuario === 'function'
      ? controlSesion.obtenerRolUsuario(usuario)
      : '';
    const departamento = usuario && typeof controlSesion.obtenerDepartamentoUsuario === 'function'
      ? controlSesion.obtenerDepartamentoUsuario(usuario)
      : '';

    const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === 'JEFE_FARMACIA' && departamento === 'FARMACIA');
    if (!usuario || !autorizado) throw new Error('Acceso denegado');

    state.usuario = usuario;
    state.accesoValidado = true;
    establecerUsuarioEnPantalla(usuario);
    return true;
  } catch (error) {
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
    window.location.assign(destino);
    return false;
  }
}

function actualizarResumenGeneral(respuesta) {
  const data = resolverObjetoRespuesta(respuesta);
  const elementos = obtenerElementos();

  if (elementos.totalMayor) elementos.totalMayor.textContent = resolverValor(data, ['totalMayor', 'medicamentosRegistradosMayor', 'cantidadMayor']) ?? '0';
  if (elementos.totalDetal) elementos.totalDetal.textContent = resolverValor(data, ['totalDetal', 'medicamentosRegistradosDetal', 'cantidadDetal']) ?? '0';
  if (elementos.totalConsolidado) elementos.totalConsolidado.textContent = resolverValor(data, ['totalConsolidado', 'inventarioConsolidado', 'existenciasConsolidadas']) ?? '0';
  if (elementos.lotesMayor) elementos.lotesMayor.textContent = resolverValor(data, ['lotesMayor', 'lotesActivosMayor']) ?? '0';
  if (elementos.lotesDetal) elementos.lotesDetal.textContent = resolverValor(data, ['lotesDetal', 'lotesActivosDetal']) ?? '0';
  if (elementos.medicamentosRecibidos) elementos.medicamentosRecibidos.textContent = resolverValor(data, ['medicamentosRecibidos', 'totalMedicamentosRecibidos']) ?? '0';
  if (elementos.totalDonaciones) elementos.totalDonaciones.textContent = resolverValor(data, ['totalDonaciones', 'medicamentosDonaciones']) ?? '0';
  if (elementos.sumatoriaMedicamentosDonaciones) elementos.sumatoriaMedicamentosDonaciones.textContent = resolverValor(data, ['sumatoriaMedicamentosDonaciones', 'totalMedicamentosMasDonaciones']) ?? '0';
  if (elementos.totalEntregado) elementos.totalEntregado.textContent = resolverValor(data, ['totalEntregado', 'medicamentosEntregados']) ?? '0';
}

async function consultarResumenFarmacia() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.resumen);
  if (!metodo) {
    console.warn('La conexión no expone el resumen del dashboard de farmacia.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    actualizarResumenGeneral(respuesta);
  } catch (error) {
    console.error('Error al consultar el resumen de Farmacia:', error);
  }
}

async function consultarInventarioMayor() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.inventarioMayor);
  if (!metodo) {
    console.warn('La conexión no expone el inventario Mayor.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    const data = resolverObjetoRespuesta(respuesta);
    state.inventarioMayor = data;
  } catch (error) {
    console.error('Error al consultar inventario Mayor:', error);
  }
}

async function consultarInventarioDetal() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.inventarioDetal);
  if (!metodo) {
    console.warn('La conexión no expone el inventario Detal.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    const data = resolverObjetoRespuesta(respuesta);
    state.inventarioDetal = data;
  } catch (error) {
    console.error('Error al consultar inventario Detal:', error);
  }
}

async function consultarDonacionesYRecepcion() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.donaciones);
  if (!metodo) return;

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    const data = resolverObjetoRespuesta(respuesta);

    const totalDonaciones = resolverValor(data, ['totalDonaciones', 'sumatoriaDonaciones']) ?? '0';
    const medicamentosRecibidos = resolverValor(data, ['medicamentosRecibidos', 'recibidos']) ?? '0';
    const sumatoria = resolverValor(data, ['sumatoriaMedicamentosDonaciones', 'totalMedicamentosMasDonaciones']) ?? '0';

    const elementos = obtenerElementos();
    if (elementos.medicamentosRecibidos) elementos.medicamentosRecibidos.textContent = medicamentosRecibidos;
    if (elementos.totalDonaciones) elementos.totalDonaciones.textContent = totalDonaciones;
    if (elementos.sumatoriaMedicamentosDonaciones) elementos.sumatoriaMedicamentosDonaciones.textContent = sumatoria;
  } catch (error) {
    console.error('Error al consultar donaciones o recepciones:', error);
  }
}

async function consultarEntregas() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.entregas);
  if (!metodo) {
    console.warn('La conexión no expone el resumen de entregas.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    const data = resolverObjetoRespuesta(respuesta);
    state.entregas = resolverListaRespuesta(respuesta);

    const totalEntregado = resolverValor(data, ['totalEntregado', 'cantidadEntregada', 'totalCantidad']) ?? '0';
    const medicamentosEntregados = resolverValor(data, ['medicamentosEntregados', 'registrosEntregados']) ?? '0';
    const cantidadEntregada = resolverValor(data, ['cantidadTotalEntregada', 'cantidadEntregadaTotal']) ?? '0';

    const elementos = obtenerElementos();
    if (elementos.totalEntregado) elementos.totalEntregado.textContent = totalEntregado;
    if (elementos.totalEntregadoResumen) elementos.totalEntregadoResumen.value = totalEntregado;
    if (elementos.medicamentosEntregados) elementos.medicamentosEntregados.value = medicamentosEntregados;
    if (elementos.cantidadEntregada) elementos.cantidadEntregada.value = cantidadEntregada;
  } catch (error) {
    console.error('Error al consultar entregas realizadas:', error);
  }
}

async function consultarAlertasFarmacia() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.alertas);
  if (!metodo) {
    console.warn('La conexión no expone las alertas de farmacia.');
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
    console.error('Error al consultar alertas de farmacia:', error);
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
    const medicamento = resolverValor(alerta, ['medicamento', 'nombreMedicamento', 'producto']) || '—';
    const codigo = resolverValor(alerta, ['codigo', 'codigoMedicamento', 'identificador']) || '—';
    const lote = resolverValor(alerta, ['lote', 'numeroLote']) || '—';
    const vencimiento = formatearFecha(resolverValor(alerta, ['fechaVencimiento', 'vencimiento', 'fechaCaducidad'])) || '—';
    const existencia = resolverValor(alerta, ['existencia', 'stockDisponible', 'cantidadDisponible']) ?? '0';
    const tipo = resolverValor(alerta, ['tipo', 'tipoAlerta']) || '—';
    const prioridad = resolverValor(alerta, ['prioridad', 'nivelPrioridad']) || '—';

    [medicamento, codigo, lote, vencimiento, existencia, tipo, prioridad].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

async function consultarActividadFarmacia() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.actividad);
  if (!metodo) {
    console.warn('La conexión no expone la actividad reciente de farmacia.');
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
    console.error('Error al consultar actividad de farmacia:', error);
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
  state.actividad.forEach((registro) => {
    const fila = document.createElement('tr');
    const trabajador = resolverValor(registro, ['trabajador', 'responsable', 'usuario']) || '—';
    const operacion = resolverValor(registro, ['operacion', 'tipoOperacion']) || '—';
    const medicamento = resolverValor(registro, ['medicamento', 'producto', 'nombreMedicamento']) || '—';
    const movimiento = resolverValor(registro, ['tipoMovimiento', 'movimiento']) || '—';
    const cantidad = resolverValor(registro, ['cantidad', 'cantidadMovimiento']) ?? '0';
    const fecha = formatearFecha(resolverValor(registro, ['fechaMovimiento', 'fecha', 'fechaEfectiva'])) || '—';
    const estado = resolverValor(registro, ['estado', 'estadoMovimiento']) || '—';

    [trabajador, operacion, medicamento, movimiento, cantidad, fecha, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
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
    const temporal = state.filtros.fechaInicio;
    state.filtros.fechaInicio = state.filtros.fechaFin;
    state.filtros.fechaFin = temporal;
    if (elementos.fechaInicio) elementos.fechaInicio.value = state.filtros.fechaInicio;
    if (elementos.fechaFin) elementos.fechaFin.value = state.filtros.fechaFin;
  }

  recargarDashboard();
}

function restablecerFiltroPeriodo() {
  obtenerFechasPorDefecto();
  recargarDashboard();
}

async function recargarDashboard() {
  await consultarResumenFarmacia();
  await consultarInventarioMayor();
  await consultarInventarioDetal();
  await consultarDonacionesYRecepcion();
  await consultarEntregas();
  await consultarAlertasFarmacia();
  await consultarActividadFarmacia();
}

function navegarModulo(ruta) {
  if (!ruta) return;
  window.location.assign(ruta);
}

function enlazarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnAplicarPeriodo) {
    elementos.btnAplicarPeriodo.addEventListener('click', aplicarFiltroPeriodo);
  }

  if (elementos.btnRestablecerPeriodo) {
    elementos.btnRestablecerPeriodo.addEventListener('click', restablecerFiltroPeriodo);
  }

  if (elementos.btnCerrarSesion) {
    elementos.btnCerrarSesion.addEventListener('click', async () => {
      if (typeof controlSesion.cerrarSesionServidor === 'function') {
        await controlSesion.cerrarSesionServidor();
      }
      const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
      window.location.assign(destino);
    });
  }

  const mapaRutas = {
    'btn-inventario-mayor': '/Frontend/Farmacia/Inventario_Mayor/',
    'btn-inventario-detal': '/Frontend/Farmacia/Inventario_Detal/',
    'btn-transferencias-farmacia': '/Frontend/Farmacia/Transferencias/',
    'btn-recepciones-farmacia': '/Frontend/Farmacia/Recepciones/',
    'btn-donaciones-farmacia': '/Frontend/Farmacia/Donaciones/',
    'btn-kardex-farmacia': '/Frontend/Farmacia/Kardex/',
    'btn-tratamientos-farmacia': '/Frontend/Farmacia/Tratamientos/',
    'btn-insulina-farmacia': '/Frontend/Farmacia/Control_Insulina/',
    'btn-reportes-farmacia': '/Frontend/Farmacia/Reportes/',
  };

  Object.entries(mapaRutas).forEach(([id, ruta]) => {
    const boton = document.getElementById(id);
    if (boton) {
      boton.addEventListener('click', () => navegarModulo(ruta));
    }
  });
}

async function inicializar() {
  await cargarConexionJefeFarmacia();
  const autorizado = await validarAccesoJefeFarmacia();
  if (!autorizado) return;

  enlazarEventos();
  obtenerFechasPorDefecto();
  await recargarDashboard();
}

inicializar();
