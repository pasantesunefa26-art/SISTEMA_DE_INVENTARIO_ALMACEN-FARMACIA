import * as base from '../../compartidos/js/base.js';
import * as validaciones from '../../compartidos/js/validaciones.js';
import * as listasBuscables from '../../compartidos/js/listas-buscables.js';
import * as controlSesion from '../../compartidos/js/control-sesion.js';

const MODULO_CONEXION = '../../../conexiones/frontend/farmacia.conexion.js';

const state = {
  conexion: null,
  accesoValidado: false,
  usuario: null,
  medicamentos: [],
  lotes: [],
  movimientos: [],
  alertas: [],
  medicamentoSeleccionado: null,
  filtros: {
    texto: '',
    codigo: '',
    lote: '',
    estado: '',
    vencimiento: '',
    fechaInicio: '',
    fechaFin: '',
  },
};

const NOMBRES_CONEXION = {
  resumen: ['obtenerResumenInventarioMayor', 'consultarResumenMayor', 'obtenerDashboardMayor'],
  medicamentos: ['obtenerMedicamentosMayor', 'consultarMedicamentosMayor', 'listarMedicamentosMayor'],
  lotes: ['obtenerLotesMayor', 'consultarLotesMayor', 'listarLotesMayor'],
  movimientos: ['obtenerMovimientosMayor', 'consultarMovimientosMayor', 'listarMovimientosMayor'],
  alertas: ['obtenerAlertasMayor', 'consultarAlertasMayor', 'listarAlertasMayor'],
  donaciones: ['obtenerResumenDonacionesMayor', 'consultarDonacionesMayor', 'listarDonacionesMayor'],
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

  const rutas = ['data', 'items', 'registros', 'resultado', 'medicamentos', 'lotes', 'movimientos', 'alertas'];
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
    nombreUsuario: base.obtenerElementoPorId('mayor-usuario-nombre'),
    totalMedicamentos: base.obtenerElementoPorId('mayor-total-medicamentos'),
    existenciaTotal: base.obtenerElementoPorId('mayor-existencia-total'),
    totalLotes: base.obtenerElementoPorId('mayor-total-lotes'),
    lotesDisponibles: base.obtenerElementoPorId('mayor-lotes-disponibles'),
    proximosVencer: base.obtenerElementoPorId('mayor-proximos-vencer'),
    vencidos: base.obtenerElementoPorId('mayor-medicamentos-vencidos'),
    stockBajo: base.obtenerElementoPorId('mayor-stock-bajo'),
    agotados: base.obtenerElementoPorId('mayor-agotados'),
    busqueda: base.obtenerElementoPorId('busqueda-medicamento-mayor'),
    filtroCodigo: base.obtenerElementoPorId('filtro-codigo-mayor'),
    filtroLote: base.obtenerElementoPorId('filtro-lote-mayor'),
    filtroEstado: base.obtenerElementoPorId('filtro-estado-mayor'),
    filtroVencimiento: base.obtenerElementoPorId('filtro-vencimiento-mayor'),
    tablaMedicamentos: base.obtenerElemento('#tabla-medicamentos-mayor tbody'),
    tablaLotes: base.obtenerElemento('#tabla-lotes-mayor tbody'),
    tablaMovimientos: base.obtenerElemento('#tabla-movimientos-mayor tbody'),
    btnBuscar: base.obtenerElementoPorId('btn-buscar-mayor'),
    btnLimpiar: base.obtenerElementoPorId('btn-limpiar-filtros-mayor'),
    btnTransferir: base.obtenerElementoPorId('btn-transferir-a-detal'),
    btnKardex: base.obtenerElementoPorId('btn-consultar-kardex'),
    btnEtiqueta: base.obtenerElementoPorId('btn-imprimir-etiqueta'),
  };
}

function resolverUsuarioActual() {
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

function establecerUsuarioEnPantalla(usuario) {
  const elementos = obtenerElementos();
  if (!usuario || !elementos.nombreUsuario) return;

  const nombre = normalizarTexto(resolverValor(usuario, ['nombreCompleto', 'nombre', 'fullName'])) ||
    normalizarTexto(resolverValor(usuario, ['username', 'usuario'])) || 'Usuario';

  elementos.nombreUsuario.textContent = nombre;
}

async function cargarConexionFarmacia() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch (error) {
    state.conexion = null;
    console.warn('No existe la conexión centralizada de Farmacia para Inventario Mayor:', error);
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

async function validarAccesoMayor() {
  if (state.accesoValidado) return true;

  try {
    if (typeof controlSesion.consultarSesionActual === 'function') {
      const sesion = await controlSesion.consultarSesionActual();
      const usuario = controlSesion.obtenerUsuarioDesdeSesion ? controlSesion.obtenerUsuarioDesdeSesion(sesion) : (sesion && sesion.usuario ? sesion.usuario : sesion);
      if (!usuario) throw new Error('Sesión inválida');

      const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(usuario) : '';
      const departamento = controlSesion.obtenerDepartamentoUsuario ? controlSesion.obtenerDepartamentoUsuario(usuario) : '';
      const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === controlSesion.ROLES?.JEFE_FARMACIA && departamento === controlSesion.DEPARTAMENTOS?.FARMACIA);

      if (!autorizado) throw new Error('Acceso denegado');

      state.usuario = usuario;
      state.accesoValidado = true;
      establecerUsuarioEnPantalla(usuario);
      return true;
    }

    const usuario = resolverUsuarioActual();
    if (!usuario) throw new Error('Sesión inexistente');

    const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(usuario) : resolverValor(usuario, ['rol', 'role', 'tipoRol']) || '';
    const departamento = controlSesion.obtenerDepartamentoUsuario ? controlSesion.obtenerDepartamentoUsuario(usuario) : resolverValor(usuario, ['departamento', 'department']) || '';
    const autorizado = rol === controlSesion.ROLES?.SUPERADMIN || (rol === controlSesion.ROLES?.JEFE_FARMACIA && departamento === controlSesion.DEPARTAMENTOS?.FARMACIA);

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

function configurarFechasPorDefecto() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  state.filtros.fechaInicio = inicio.toISOString().slice(0, 10);
  state.filtros.fechaFin = fin.toISOString().slice(0, 10);
}

function obtenerValorCamposFiltro() {
  const elementos = obtenerElementos();
  state.filtros.texto = normalizarTexto(elementos.busqueda?.value || '');
  state.filtros.codigo = normalizarTexto(elementos.filtroCodigo?.value || '');
  state.filtros.lote = normalizarTexto(elementos.filtroLote?.value || '');
  state.filtros.estado = normalizarTexto(elementos.filtroEstado?.value || '');
  state.filtros.vencimiento = normalizarTexto(elementos.filtroVencimiento?.value || '');
  state.filtros.fechaInicio = normalizarTexto(document.getElementById('fecha-inicio')?.value || state.filtros.fechaInicio || '');
  state.filtros.fechaFin = normalizarTexto(document.getElementById('fecha-fin')?.value || state.filtros.fechaFin || '');
}

function aplicarFiltrosLocalmente(lista) {
  const filtros = state.filtros;
  return lista.filter((item) => {
    const nombre = normalizarTexto(resolverValor(item, ['nombre', 'nombreMedicamento', 'descripcion', 'descripcionMedicamento'])).toLowerCase();
    const codigo = normalizarTexto(resolverValor(item, ['codigo', 'codigoMedicamento'])).toLowerCase();
    const lote = normalizarTexto(resolverValor(item, ['lote', 'numeroLote'])).toLowerCase();
    const estado = normalizarTexto(resolverValor(item, ['estado', 'estadoLote', 'estadoGeneral'])).toLowerCase();
    const vencimiento = normalizarTexto(resolverValor(item, ['fechaVencimiento', 'vencimiento']));
    const hayTexto = !filtros.texto || nombre.includes(filtros.texto.toLowerCase()) || codigo.includes(filtros.texto.toLowerCase());
    const hayCodigo = !filtros.codigo || codigo.includes(filtros.codigo.toLowerCase());
    const hayLote = !filtros.lote || lote.includes(filtros.lote.toLowerCase());
    const hayEstado = !filtros.estado || estado === filtros.estado.toLowerCase();
    const hayVencimiento = !filtros.vencimiento || vencimiento === filtros.vencimiento;

    return hayTexto && hayCodigo && hayLote && hayEstado && hayVencimiento;
  });
}

function actualizarTarjetasResumen(respuesta) {
  const data = resolverObjetoRespuesta(respuesta);
  const elementos = obtenerElementos();

  if (elementos.totalMedicamentos) elementos.totalMedicamentos.textContent = resolverValor(data, ['totalMedicamentos', 'medicamentosRegistrados']) ?? '0';
  if (elementos.existenciaTotal) elementos.existenciaTotal.textContent = resolverValor(data, ['existenciaTotal', 'totalExistencias', 'stockDisponible']) ?? '0';
  if (elementos.totalLotes) elementos.totalLotes.textContent = resolverValor(data, ['totalLotes', 'lotesRegistrados']) ?? '0';
  if (elementos.lotesDisponibles) elementos.lotesDisponibles.textContent = resolverValor(data, ['lotesDisponibles', 'lotesConExistencia']) ?? '0';
  if (elementos.proximosVencer) elementos.proximosVencer.textContent = resolverValor(data, ['proximosVencer', 'medicamentosProximosAVencer']) ?? '0';
  if (elementos.vencidos) elementos.vencidos.textContent = resolverValor(data, ['vencidos', 'medicamentosVencidos']) ?? '0';
  if (elementos.stockBajo) elementos.stockBajo.textContent = resolverValor(data, ['stockBajo', 'existenciasBajas']) ?? '0';
  if (elementos.agotados) elementos.agotados.textContent = resolverValor(data, ['agotados', 'medicamentosAgotados']) ?? '0';
}

async function consultarResumenMayor() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.resumen);
  if (!metodo) {
    console.warn('El contrato de conexión no define aún el resumen del inventario Mayor.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    actualizarTarjetasResumen(respuesta);
  } catch (error) {
    console.error('Error al consultar resumen de Mayor:', error);
  }
}

async function consultarMedicamentos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.medicamentos);
  if (!metodo) {
    console.warn('La conexión no expone la consulta de medicamentos en Mayor.');
    renderMedicamentosVacios('La conexión aún no expone este recurso.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    let lista = resolverListaRespuesta(respuesta);
    lista = aplicarFiltrosLocalmente(lista);
    state.medicamentos = lista;
    renderMedicamentos();
  } catch (error) {
    console.error('Error al consultar medicamentos de Mayor:', error);
    state.medicamentos = [];
    renderMedicamentosVacios('No se pudieron cargar los medicamentos.');
  }
}

function renderMedicamentosVacios(mensaje = 'No hay medicamentos registrados en el inventario principal.') {
  const tbody = base.obtenerElemento('#tabla-medicamentos-mayor tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="app-superadmin-empty-state">${mensaje}</td></tr>`;
}

function renderMedicamentos() {
  const tbody = base.obtenerElemento('#tabla-medicamentos-mayor tbody');
  if (!tbody) return;

  if (!state.medicamentos.length) {
    renderMedicamentosVacios('No hay medicamentos registrados para los filtros activos.');
    return;
  }

  tbody.innerHTML = '';
  state.medicamentos.forEach((medicamento) => {
    const fila = document.createElement('tr');
    fila.style.cursor = 'pointer';

    const codigo = resolverValor(medicamento, ['codigo', 'codigoMedicamento']) || '—';
    const nombre = resolverValor(medicamento, ['nombre', 'nombreMedicamento', 'descripcion']) || '—';
    const presentacion = resolverValor(medicamento, ['presentacion', 'formaFarmaceutica']) || '—';
    const unidad = resolverValor(medicamento, ['unidadMedida', 'unidad']) || '—';
    const cantidadTotal = resolverValor(medicamento, ['cantidadTotalDisponible', 'existenciaTotal', 'totalDisponible']) ?? '0';
    const lotes = resolverValor(medicamento, ['cantidadLotes', 'totalLotes']) ?? '0';
    const estado = resolverValor(medicamento, ['estadoGeneral', 'estado']) || 'Activo';

    const valores = [codigo, nombre, presentacion, unidad, cantidadTotal, lotes, estado];
    valores.forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    const celdaAcciones = document.createElement('td');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-secondary';
    boton.textContent = 'Ver lotes';
    boton.addEventListener('click', () => {
      state.medicamentoSeleccionado = medicamento;
      consultarLotes(medicamento);
    });
    celdaAcciones.appendChild(boton);
    fila.appendChild(celdaAcciones);

    tbody.appendChild(fila);
  });
}

async function consultarLotes(medicamento) {
  const idMedicamento = resolverValor(medicamento, ['id', 'idMedicamento', 'codigo']) || resolverValor(medicamento, ['codigoMedicamento']);
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.lotes);
  if (!metodo) {
    console.warn('El contrato de conexión aún no expone los lotes del inventario Mayor.');
    renderLotesVacios('El contrato de integración aún no define lotes.');
    return;
  }

  try {
    const respuesta = await metodo({
      medicamentoId: idMedicamento,
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    const lista = resolverListaRespuesta(respuesta);
    state.lotes = lista;
    renderLotes();
  } catch (error) {
    console.error('Error al consultar lotes de Mayor:', error);
    state.lotes = [];
    renderLotesVacios('No se pudieron cargar los lotes del medicamento seleccionado.');
  }
}

function renderLotesVacios(mensaje = 'Seleccione un medicamento para consultar sus lotes.') {
  const tbody = base.obtenerElemento('#tabla-lotes-mayor tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="10" class="app-superadmin-empty-state">${mensaje}</td></tr>`;
}

function renderLotes() {
  const tbody = base.obtenerElemento('#tabla-lotes-mayor tbody');
  if (!tbody) return;

  if (!state.lotes.length) {
    renderLotesVacios('El medicamento seleccionado no tiene lotes registrados en Mayor.');
    return;
  }

  tbody.innerHTML = '';
  state.lotes.forEach((lote) => {
    const fila = document.createElement('tr');
    const numero = resolverValor(lote, ['numeroLote', 'lote']) || '—';
    const fechaEntrada = resolverValor(lote, ['fechaEntrada', 'fechaRegistro']) || '—';
    const vencimiento = resolverValor(lote, ['fechaVencimiento', 'vencimiento']) || '—';
    const cantidadRecibida = resolverValor(lote, ['cantidadRecibida', 'cantidadIngresada']) ?? '0';
    const cantidadDisponible = resolverValor(lote, ['cantidadDisponible', 'stockDisponible']) ?? '0';
    const procedencia = resolverValor(lote, ['procedencia', 'origen']) || '—';
    const documento = resolverValor(lote, ['documentoEntrada', 'documento', 'referencia']) || '—';
    const codigoBarras = resolverValor(lote, ['codigoBarras', 'codigoBarra']) || 'Sin código';
    const estado = resolverValor(lote, ['estado', 'estadoLote']) || 'Activo';

    const valores = [numero, fechaEntrada, vencimiento, cantidadRecibida, cantidadDisponible, procedencia, documento, codigoBarras, estado];
    valores.forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    const celdaAcciones = document.createElement('td');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-secondary';
    boton.textContent = 'Etiqueta';
    boton.addEventListener('click', () => {
      if (!codigoBarras || codigoBarras === 'Sin código') {
        alert('Este lote no tiene código de barras registrado.');
        return;
      }
      alert(`Código de barras: ${codigoBarras}`);
    });
    celdaAcciones.appendChild(boton);
    fila.appendChild(celdaAcciones);

    tbody.appendChild(fila);
  });
}

async function consultarMovimientos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.movimientos);
  if (!metodo) {
    console.warn('El contrato de conexión aún no expone los movimientos del inventario Mayor.');
    renderMovimientosVacios('Los movimientos de Mayor aún no están expuestos por la conexión.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.movimientos = resolverListaRespuesta(respuesta);
    renderMovimientos();
  } catch (error) {
    console.error('Error al consultar movimientos de Mayor:', error);
    state.movimientos = [];
    renderMovimientosVacios('No se pudieron cargar los movimientos del inventario.');
  }
}

function renderMovimientosVacios(mensaje = 'No hay movimientos recientes disponibles.') {
  const tbody = base.obtenerElemento('#tabla-movimientos-mayor tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="app-superadmin-empty-state">${mensaje}</td></tr>`;
}

function renderMovimientos() {
  const tbody = base.obtenerElemento('#tabla-movimientos-mayor tbody');
  if (!tbody) return;

  if (!state.movimientos.length) {
    renderMovimientosVacios('No hay movimientos recientes disponibles para el período actual.');
    return;
  }

  tbody.innerHTML = '';
  state.movimientos.forEach((movimiento) => {
    const fila = document.createElement('tr');
    const fechaEfectiva = resolverValor(movimiento, ['fechaEfectiva', 'fechaMovimiento']) || '—';
    const tipo = resolverValor(movimiento, ['tipo', 'tipoMovimiento', 'operacion']) || '—';
    const medicamento = resolverValor(movimiento, ['medicamento', 'nombreMedicamento', 'producto']) || '—';
    const lote = resolverValor(movimiento, ['lote', 'numeroLote']) || '—';
    const cantidad = resolverValor(movimiento, ['cantidad', 'cantidadMovimiento']) ?? '0';
    const responsable = resolverValor(movimiento, ['responsable', 'usuarioResponsable']) || '—';
    const documento = resolverValor(movimiento, ['documento', 'referencia', 'codigoDocumento']) || '—';
    const estado = resolverValor(movimiento, ['estado', 'estadoMovimiento']) || '—';

    [fechaEfectiva, tipo, medicamento, lote, cantidad, responsable, documento, estado].forEach((valor) => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    tbody.appendChild(fila);
  });
}

async function consultarAlertasMayor() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.alertas);
  if (!metodo) {
    console.warn('La conexión no expone alertas del inventario Mayor.');
    return;
  }

  try {
    const respuesta = await metodo({
      fechaInicio: state.filtros.fechaInicio,
      fechaFin: state.filtros.fechaFin,
    });
    state.alertas = resolverListaRespuesta(respuesta);
  } catch (error) {
    console.error('Error al consultar alertas del inventario Mayor:', error);
    state.alertas = [];
  }
}

function limpiarFiltros() {
  const elementos = obtenerElementos();
  if (elementos.busqueda) elementos.busqueda.value = '';
  if (elementos.filtroCodigo) elementos.filtroCodigo.value = '';
  if (elementos.filtroLote) elementos.filtroLote.value = '';
  if (elementos.filtroEstado) elementos.filtroEstado.value = '';
  if (elementos.filtroVencimiento) elementos.filtroVencimiento.value = '';
  state.filtros = {
    texto: '',
    codigo: '',
    lote: '',
    estado: '',
    vencimiento: '',
    fechaInicio: state.filtros.fechaInicio,
    fechaFin: state.filtros.fechaFin,
  };
  consultarMedicamentos();
}

function aplicarFiltrosDesdeFormulario() {
  obtenerValorCamposFiltro();
  consultarMedicamentos();
}

function enlazarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnBuscar) {
    elementos.btnBuscar.addEventListener('click', aplicarFiltrosDesdeFormulario);
  }

  if (elementos.btnLimpiar) {
    elementos.btnLimpiar.addEventListener('click', limpiarFiltros);
  }

  if (elementos.btnTransferir) {
    elementos.btnTransferir.addEventListener('click', () => {
      const destino = '/Frontend/Farmacia/Transferencias/';
      window.location.assign(destino);
    });
  }

  if (elementos.btnKardex) {
    elementos.btnKardex.addEventListener('click', () => {
      window.location.assign('/Frontend/Farmacia/Kardex/');
    });
  }

  if (elementos.btnEtiqueta) {
    elementos.btnEtiqueta.addEventListener('click', () => {
      const loteActual = state.lotes[0];
      if (!loteActual || !resolverValor(loteActual, ['codigoBarras', 'codigoBarra'])) {
        alert('No hay una etiqueta disponible para el lote seleccionado.');
        return;
      }
      alert(`Etiqueta lista para imprimir: ${resolverValor(loteActual, ['codigoBarras', 'codigoBarra'])}`);
    });
  }
}

async function recargarDashboard() {
  await consultarResumenMayor();
  await consultarMedicamentos();
  await consultarMovimientos();
  await consultarAlertasMayor();
}

async function inicializar() {
  await cargarConexionFarmacia();
  const autorizado = await validarAccesoMayor();
  if (!autorizado) return;

  configurarFechasPorDefecto();
  enlazarEventos();
  await recargarDashboard();
}

inicializar();
