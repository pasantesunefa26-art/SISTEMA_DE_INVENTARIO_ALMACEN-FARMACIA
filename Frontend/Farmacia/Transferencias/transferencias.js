/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Farmacia/Transferencias/transferencias.js
 * -----------------------------------------------------------------------------
 * Lógica funcional del módulo de transferencias de Farmacia
 * (Inventario Mayor → Inventario Detal).
 *
 * RESPONSABILIDADES
 * - Verificar sesión, departamento, rol y permisos visuales antes de operar.
 * - Consultar medicamentos y lotes reales desde la conexión centralizada.
 * - Gestionar selección manual de lote (sin FEFO, sin selección automática).
 * - Validar datos en frontend (cantidad, fecha, pertenencia/estado de lote)
 *   y mostrar vista previa informativa. La validación/decisión definitiva y
 *   los cálculos/saldos finales corresponden al backend.
 * - Confirmar transferencias con resumen, confirmación explícita, control de
 *   doble envío e idempotencia cuando el backend lo soporte.
 * - Consultar historial, filtros, paginación y detalle de transferencias.
 * - Actualizar información de Mayor/Detal tras confirmación del backend.
 *
 * REGLAS DE NEGOCIO RESPETADAS
 * - Transferencia interna Mayor → Detal: descuenta en Mayor e incorpora la
 *   misma cantidad en Detal del mismo lote, sin nueva entrada externa, sin
 *   donación y sin duplicar existencia global consolidada de Farmacia.
 * - Conserva identidad del medicamento y del lote (identificador, número,
 *   medicamento, fechas/procedencia/documentación de origen e información
 *   disponible) y código de barras original. No se generan códigos nuevos.
 * - No se implementa FEFO ni selección automática de lotes.
 * - No se modifican ni eliminan directamente transferencias confirmadas.
 * - Correcciones/anulaciones, cuando existan, deben realizarse por operaciones
 *   autorizadas del backend (movimiento correctivo vinculado, motivo, usuario,
 *   fecha/hora real, actualización transaccional y bitácora). Este frontend no
 *   ejecuta edición/borrado directo de registros históricos.
 *
 * DEPENDENCIAS / CONTRATO DE INTEGRACIÓN
 * - Utilidades compartidas: ../../Compartidos/JS/base.js
 * - Validaciones: ../../Compartidos/JS/validaciones.js
 * - Formularios: ../../Compartidos/JS/formularios.js
 * - Listas buscables: ../../Compartidos/JS/listas-buscables.js
 * - Control de sesión: ../../Compartidos/JS/control-sesion.js
 * - Conexión centralizada (obligatoria para datos/operaciones reales):
 *     ../../../conexiones/frontend/farmacia.conexion.js
 *
 * Si la conexión centralizada o alguno de sus métodos aún no está implementado,
 * este archivo documenta el contrato esperado y muestra el estado/dependencia
 * correspondiente sin simular datos, lotes, existencias ni resultados.
 *
 * La autorización definitiva (acceso, permisos, producto/lote/cantidad/fecha,
 * existencia y concurrencia) se realiza en el backend Java/Spring Boot.
 * La operación debe ejecutarse transaccionalmente en backend para evitar
 * estados parciales o duplicaciones.
 * ============================================================================
 */

import * as base from '../../Compartidos/JS/base.js';
import * as validaciones from '../../Compartidos/JS/validaciones.js';
import * as formularios from '../../Compartidos/JS/formularios.js';
import * as listasBuscables from '../../Compartidos/JS/listas-buscables.js';
import * as controlSesion from '../../Compartidos/JS/control-sesion.js';

/**
 * Conexión centralizada de Farmacia (sin duplicar solicitudes HTTP en este módulo).
 * Ruta requerida por especificación.
 */
const MODULO_CONEXION = '../../../conexiones/frontend/farmacia.conexion.js';

/**
 * Contrato esperado de la conexión centralizada (nombres candidatos).
 * Se resuelve dinámicamente contra el módulo/objeto exportado; si no existe un
 * método compatible, se informa la dependencia sin inventar endpoints ni datos.
 */
const CONTRATO_CONEXION = Object.freeze({
  medicamentos: Object.freeze([
    'consultarMedicamentos',
    'buscarMedicamentos',
    'listarMedicamentos',
    'obtenerMedicamentos',
    'consultarMedicamentosMayor',
  ]),
  lotesPorMedicamento: Object.freeze([
    'consultarLotesMedicamentoMayor',
    'obtenerLotesMedicamentoMayor',
    'consultarLotesPorMedicamento',
    'listarLotesPorMedicamento',
    'obtenerLotesPorMedicamento',
  ]),
  existenciaLoteMayor: Object.freeze([
    'consultarExistenciaLoteMayor',
    'obtenerExistenciaLoteMayor',
    'consultarExistenciaLote',
  ]),
  existenciaLoteDetal: Object.freeze([
    'consultarExistenciaLoteDetal',
    'obtenerExistenciaLoteDetal',
    'consultarExistenciaLoteEnDetal',
  ]),
  previsualizar: Object.freeze([
    'previsualizarTransferenciaMayorDetal',
    'calcularPrevisualizacionTransferencia',
    'consultarPrevisualizacionTransferencia',
  ]),
  confirmar: Object.freeze([
    'confirmarTransferenciaMayorDetal',
    'registrarTransferenciaMayorDetal',
    'crearTransferenciaMayorDetal',
    'confirmarTransferencia',
  ]),
  historial: Object.freeze([
    'consultarHistorialTransferenciasMayorDetal',
    'obtenerHistorialTransferenciasMayorDetal',
    'listarTransferenciasMayorDetal',
    'consultarTransferencias',
  ]),
  detalle: Object.freeze([
    'consultarDetalleTransferencia',
    'obtenerDetalleTransferencia',
  ]),
  permisoCrearMedicamento: Object.freeze([
    'consultarPermisoCrearMedicamento',
    'puedeCrearMedicamento',
    'verificarPermisoCrearMedicamento',
  ]),
  abrirCrearMedicamento: Object.freeze([
    'abrirRegistroMedicamento',
    'iniciarCreacionMedicamento',
    'solicitarCreacionMedicamento',
  ]),
  permisosOperacion: Object.freeze([
    'consultarPermisosTransferencia',
    'obtenerPermisosTransferencia',
    'verificarPermisosOperacion',
  ]),
});

const IDS = Object.freeze({
  form: 'form-transferencia',
  mensaje: 'mensaje-transferencia',
  medicamento: 'campo-medicamento-transferencia',
  btnAgregarMedicamento: 'btn-agregar-medicamento-transferencia',
  lote: 'campo-lote-transferencia',
  cantidad: 'campo-cantidad-transferencia',
  existenciaLoteSeleccionado: 'existencia-lote-seleccionado-transferencia',
  fecha: 'campo-fecha-transferencia',
  observaciones: 'campo-observaciones-transferencia',
  origen: 'transferencia-origen',
  destino: 'transferencia-destino',
  existenciaMayor: 'existencia-mayor-transferencia',
  existenciaDetal: 'existencia-detal-transferencia',
  resumen: 'resumen-transferencia',
  btnConfirmar: 'btn-confirmar-transferencia',
  btnCancelar: 'btn-cancelar-transferencia',
  tablaHistorial: 'tabla-historial-transferencias',
  busqueda: 'busqueda-transferencias',
  filtroFecha: 'filtro-fecha-transferencia',
  filtroFechaInicial: 'filtro-fecha-inicial-transferencias',
  filtroFechaFinal: 'filtro-fecha-final-transferencias',
  filtroEstado: 'filtro-estado-transferencia',
  modal: 'modal-confirmar-transferencia',
  formFiltros: 'form-filtros-transferencias',
  btnBuscarHistorial: 'btn-buscar-transferencias',
  btnLimpiarFiltros: 'btn-limpiar-filtros-transferencias',
});

const estado = {
  conexion: null,
  conexionDisponible: false,
  metodos: {},
  usuario: null,
  rol: '',
  departamento: '',
  contexto: null,
  permisos: {
    puedeTransferir: null,
    puedeCrearMedicamento: null,
  },
  listaMedicamentos: null,
  listaLotes: null,
  medicamentoSeleccionado: null,
  loteSeleccionado: null,
  existenciaMayor: null,
  existenciaDetal: null,
  cantidad: null,
  fechaEfectiva: '',
  observaciones: '',
  enviando: false,
  historial: {
    items: [],
    pagina: 1,
    tamano: 20,
    total: 0,
  },
  filtrosHistorial: {
    busqueda: '',
    fechaInicial: '',
    fechaFinal: '',
    estado: '',
  },
  ultimoErrorOperacion: null,
};

let idempotenciaActual = null;

const dom = {};

/* -------------------------------------------------------------------------- */
/* Utilidades DOM y formato                                                   */
/* -------------------------------------------------------------------------- */

function $(id) {
  return base.obtenerElementoPorId(id) || document.getElementById(id);
}

function cacheDom() {
  Object.values(IDS).forEach((id) => {
    if (!dom[id]) dom[id] = $(id);
  });
  dom.tbodyHistorial = dom[IDS.tablaHistorial]?.querySelector('tbody') || null;
  dom.modalDialogo = dom[IDS.modal]?.querySelector('.app-modal__dialogo') || null;
  dom.modalResumen = $('modal-confirmar-transferencia-resumen');
  dom.modalEstado = $('modal-confirmar-transferencia-estado');
  dom.modalCerrar = $('modal-confirmar-transferencia-cerrar');
  dom.modalCancelar = $('modal-confirmar-transferencia-cancelar');
  dom.modalAceptar = $('modal-confirmar-transferencia-aceptar');
  dom.resumenValidacion = $('resumen-previa-validacion');
}

function normalizarTexto(valor) {
  return valor === undefined || valor === null ? '' : String(valor).trim();
}

function esObjeto(valor) {
  return Object.prototype.toString.call(valor) === '[object Object]';
}

function valorDe(obj, claves, defecto = undefined) {
  if (!obj || typeof obj !== 'object') return defecto;
  for (const clave of claves) {
    if (obj[clave] !== undefined && obj[clave] !== null && obj[clave] !== '') return obj[clave];
    if (obj[clave] === 0 || obj[clave] === false) return obj[clave];
  }
  return defecto;
}

function aNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatearTexto(valor) {
  const t = normalizarTexto(valor);
  return t === '' ? '—' : t;
}

function formatearNumero(valor) {
  const n = aNumero(valor);
  if (n === null) return '—';
  return Number.isInteger(n) ? String(n) : String(n);
}

function formatearFecha(valor) {
  const t = normalizarTexto(valor);
  if (!t) return '—';
  if (typeof base.formatearFecha === 'function') {
    try {
      const f = base.formatearFecha(valor);
      if (f) return f;
    } catch (_) { /* usar original */ }
  }
  return t;
}

function formatearFechaHora(valor) {
  const t = normalizarTexto(valor);
  if (!t) return '—';
  if (typeof base.formatearFechaHora === 'function') {
    try {
      const f = base.formatearFechaHora(valor);
      if (f) return f;
    } catch (_) { /* usar original */ }
  }
  return t;
}

function limpiarContenedorMensajes() {
  const cont = dom[IDS.mensaje];
  if (!cont) return;
  if (typeof base.limpiarMensajes === 'function') {
    base.limpiarMensajes(cont);
  } else {
    cont.innerHTML = '';
  }
}

function mostrarMensaje(tipo, texto, opciones = {}) {
  const cont = dom[IDS.mensaje];
  if (!cont) return;
  const reemplazar = opciones.reemplazar !== false;
  if (reemplazar) limpiarContenedorMensajes();

  if (typeof base.mostrarMensaje === 'function') {
    base.mostrarMensaje(texto, { tipo, contenedor: cont, reemplazar: false, duracion: 0 });
    return;
  }

  const alerta = document.createElement('div');
  alerta.className = `app-alerta app-alerta--${tipo || 'info'} app-farmacia-transferencias-mensaje`;
  alerta.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  alerta.textContent = texto;
  cont.appendChild(alerta);
}

function mostrarError(texto, opciones = {}) {
  mostrarMensaje('error', texto, opciones);
}

function mostrarExito(texto, opciones = {}) {
  mostrarMensaje('exito', texto, opciones);
}

function mostrarInfo(texto, opciones = {}) {
  mostrarMensaje('info', texto, opciones);
}

function mostrarAdvertencia(texto, opciones = {}) {
  mostrarMensaje('advertencia', texto, opciones);
}

function establecerTexto(id, valor) {
  const el = $(id);
  if (!el) return;
  if (typeof base.establecerTexto === 'function') {
    base.establecerTexto(el, formatearTexto(valor));
  } else {
    el.textContent = formatearTexto(valor);
  }
}

function setTextoElemento(el, valor) {
  if (!el) return;
  el.textContent = valor;
}

function limpiarTabla(tbody, columnas, titulo, texto) {
  if (!tbody) return;
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  tr.className = 'app-tabla__fila';
  const td = document.createElement('td');
  td.colSpan = columnas;
  td.className = 'app-tabla__celda app-tabla__celda--estado';
  const wrap = document.createElement('div');
  wrap.className = 'app-tabla__estado-vacio';
  const p1 = document.createElement('p');
  p1.className = 'app-tabla__estado-vacio-titulo';
  p1.textContent = titulo;
  const p2 = document.createElement('p');
  p2.className = 'app-tabla__estado-vacio-texto';
  p2.textContent = texto;
  wrap.append(p1, p2);
  td.appendChild(wrap);
  tr.appendChild(td);
  tbody.appendChild(tr);
}

/* -------------------------------------------------------------------------- */
/* Conexión centralizada (contrato esperado, sin endpoints inventados)        */
/* -------------------------------------------------------------------------- */

function obtenerCandidatosMetodo(clave) {
  return CONTRATO_CONEXION[clave] || [];
}

function resolverMetodo(clave) {
  const fuente = estado.conexion || {};
  for (const nombre of obtenerCandidatosMetodo(clave)) {
    if (typeof fuente[nombre] === 'function') {
      return { nombre, fn: fuente[nombre].bind(fuente) };
    }
    // Soporte para módulos con export default que contenga métodos
    if (fuente.default && typeof fuente.default[nombre] === 'function') {
      return { nombre, fn: fuente.default[nombre].bind(fuente.default) };
    }
  }
  return null;
}

async function cargarConexion() {
  try {
    const modulo = await import(MODULO_CONEXION);
    const conexion = modulo?.default || modulo?.farmaciaConexion || modulo?.conexionFarmacia || modulo;
    if (conexion && typeof conexion === 'object') {
      estado.conexion = conexion;
      estado.conexionDisponible = true;
      return true;
    }
    estado.conexion = null;
    estado.conexionDisponible = false;
    return false;
  } catch (error) {
    estado.conexion = null;
    estado.conexionDisponible = false;
    console.warn('[transferencias] Dependencia de conexión no disponible:', MODULO_CONEXION, error);
    return false;
  }
}

function conexionNoDisponibleMensaje(clave) {
  const candidatos = obtenerCandidatosMetodo(clave).join(', ');
  return `No se pudo completar la operación porque la conexión centralizada de Farmacia no está disponible o no implementa el método requerido (${candidatos || 'contrato no definido'}). Verifique ${MODULO_CONEXION}.`;
}

async function invocarConexion(clave, ...args) {
  if (!estado.conexionDisponible || !estado.conexion) {
    const error = new Error(conexionNoDisponibleMensaje(clave));
    error.codigo = 'CONEXION_NO_DISPONIBLE';
    throw error;
  }
  const metodo = resolverMetodo(clave);
  if (!metodo) {
    const error = new Error(conexionNoDisponibleMensaje(clave));
    error.codigo = 'METODO_NO_DISPONIBLE';
    throw error;
  }
  return metodo.fn(...args);
}

function extraerLista(respuesta, claves = []) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!esObjeto(respuesta)) return [];
  const candidatos = [...claves, 'data', 'items', 'contenido', 'content', 'resultados', 'registros', 'lista', 'rows'];
  for (const c of candidatos) {
    const v = respuesta[c];
    if (Array.isArray(v)) return v;
    if (esObjeto(v) && Array.isArray(v.items)) return v.items;
    if (esObjeto(v) && Array.isArray(v.content)) return v.content;
  }
  return [];
}

function extraerObjeto(respuesta) {
  if (!esObjeto(respuesta)) return respuesta ?? null;
  if (Array.isArray(respuesta)) return null;
  if (esObjeto(respuesta.data) && !Array.isArray(respuesta.data)) return respuesta.data;
  if (esObjeto(respuesta.resultado) && !Array.isArray(respuesta.resultado)) return respuesta.resultado;
  return respuesta;
}

/* -------------------------------------------------------------------------- */
/* Sesión, acceso y permisos                                                  */
/* -------------------------------------------------------------------------- */

function esSuperAdmin() {
  return estado.rol === (controlSesion.ROLES?.SUPERADMIN || 'SUPERADMIN');
}

function esFarmacia() {
  return estado.departamento === (controlSesion.DEPARTAMENTOS?.FARMACIA || 'FARMACIA');
}

function esAlmacen() {
  return estado.departamento === (controlSesion.DEPARTAMENTOS?.ALMACEN || 'ALMACEN') ||
    estado.rol === (controlSesion.ROLES?.JEFE_ALMACEN || 'JEFE_ALMACEN') ||
    estado.rol === (controlSesion.ROLES?.TRABAJADOR_ALMACEN || 'TRABAJADOR_ALMACEN');
}

async function verificarAcceso() {
  try {
    if (typeof controlSesion.verificarSesionAntesDeAcceder === 'function') {
      const resultado = await controlSesion.verificarSesionAntesDeAcceder({ redirigir: true });
      estado.usuario = resultado?.usuario || controlSesion.obtenerUsuarioActual?.() || null;
      estado.rol = normalizarTexto(resultado?.rol || controlSesion.obtenerRolUsuario?.(estado.usuario)).toUpperCase();
      estado.departamento = normalizarTexto(resultado?.departamento || controlSesion.obtenerDepartamentoUsuario?.(estado.usuario)).toUpperCase();
    } else {
      const usuario = controlSesion.obtenerUsuarioActual?.() || controlSesion.obtenerDatosSesionSegura?.()?.usuario || null;
      estado.usuario = usuario;
      estado.rol = normalizarTexto(controlSesion.obtenerRolUsuario?.(usuario)).toUpperCase();
      estado.departamento = normalizarTexto(controlSesion.obtenerDepartamentoUsuario?.(usuario)).toUpperCase();
      if (!usuario || !estado.rol) {
        throw new Error('Sesión no válida.');
      }
    }

    // Rechazar usuarios de Almacén y permitir acceso solo a Farmacia o SuperAdmin con contexto autorizado.
    if (esAlmacen() || (!esFarmacia() && !esSuperAdmin())) {
      mostrarError('Acceso no autorizado. Este módulo es exclusivo para usuarios autorizados de Farmacia (o SuperAdmin en contexto autorizado).');
      bloquearFormularioCompleto(true);
      return false;
    }

    await consultarPermisosOperacion();
    return true;
  } catch (error) {
    console.error('[transferencias] Error de acceso/sesión:', error);
    mostrarError('No se pudo validar la sesión o los permisos. Inicie sesión nuevamente.');
    bloquearFormularioCompleto(true);
    // controlSesion puede redirigir; no forzamos navegación adicional.
    return false;
  }
}

async function consultarPermisosOperacion() {
  // Permisos visuales; la autorización definitiva se revalida en backend.
  try {
    const resp = await invocarConexion('permisosOperacion', {
      modulo: 'FARMACIA',
      operacion: 'TRANSFERENCIA_MAYOR_DETAL',
      usuario: estado.usuario,
      rol: estado.rol,
      departamento: estado.departamento,
    });
    const obj = extraerObjeto(resp) || {};
    if (obj.puedeTransferir !== undefined) estado.permisos.puedeTransferir = Boolean(obj.puedeTransferir);
    if (obj.puedeCrearMedicamento !== undefined) estado.permisos.puedeCrearMedicamento = Boolean(obj.puedeCrearMedicamento);
  } catch (_) {
    // Si no existe método, mantener comportamiento conservador en UI para acciones críticas.
    // Jefe de Farmacia/SuperAdmin pueden tener operaciones autorizadas; trabajadores según permisos.
    estado.permisos.puedeTransferir = null; // desconocido -> backend decide; UI no asume autorización total
  }
  aplicarPermisosUI();
}

function aplicarPermisosUI() {
  const btn = dom[IDS.btnConfirmar];
  if (btn) {
    // La disponibilidad depende de permisos reales y validación backend; si se conoce denegación explícita, deshabilitar.
    if (estado.permisos.puedeTransferir === false) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'No autorizado para confirmar transferencias.';
    }
  }
  // Botón agregar medicamento: visible solo con permiso de creación.
  actualizarVisibilidadBotonAgregar();
}

function bloquearFormularioCompleto(bloquear) {
  const form = dom[IDS.form];
  if (!form) return;
  Array.from(form.elements || []).forEach((el) => {
    if (bloquear) {
      el.disabled = true;
      el.setAttribute('aria-disabled', 'true');
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Medicamentos (lista desplegable con buscador, datos reales)                */
/* -------------------------------------------------------------------------- */

function obtenerIdMedicamento(item) {
  return valorDe(item, ['id', 'idMedicamento', 'medicamentoId', 'codigo', 'codigoMedicamento', 'uuid']);
}

function etiquetaMedicamento(item) {
  const nombre = valorDe(item, ['nombre', 'nombreMedicamento', 'descripcion', 'medicamento'], '');
  const codigo = valorDe(item, ['codigo', 'codigoMedicamento'], '');
  if (nombre && codigo) return `${nombre} (${codigo})`;
  return nombre || codigo || 'Medicamento';
}

async function proveedorMedicamentos({ query } = {}) {
  // Sin catálogos estáticos: solo datos consultados por conexión centralizada.
  try {
    const resp = await invocarConexion('medicamentos', {
      busqueda: normalizarTexto(query),
      nombre: normalizarTexto(query),
      codigo: normalizarTexto(query),
      modulo: 'MAYOR',
      soloExistentes: true,
    });
    const lista = extraerLista(resp, ['medicamentos', 'productos', 'items']);
    return Array.isArray(lista) ? lista : [];
  } catch (error) {
    console.warn('[transferencias] No se pudieron consultar medicamentos:', error);
    mostrarAdvertencia('No se pudo consultar el catálogo de medicamentos desde la conexión centralizada. Verifique la disponibilidad del servicio.', { reemplazar: false });
    return [];
  }
}

function onMedicamentoSeleccionado(item) {
  estado.medicamentoSeleccionado = item || null;
  // Al cambiar medicamento: limpiar lote, cantidad, vista previa y datos dependientes.
  limpiarSeleccionLote({ mantenerMedicamento: true });
  limpiarCantidadYPreview();
  actualizarResumenExistencias();
  actualizarInfoLote();
  actualizarVistaPrevia();

  if (estado.listaLotes) {
    estado.listaLotes.setContexto({
      medicamentoId: obtenerIdMedicamento(item),
      medicamento: item,
      modulo: 'MAYOR',
    });
    estado.listaLotes.limpiar();
    estado.listaLotes.setDisabled(!item);
    // Consultar lotes correspondientes al nuevo medicamento (sin selección automática).
    estado.listaLotes.ejecutarBusqueda('');
  }
}

async function actualizarVisibilidadBotonAgregar() {
  const btn = dom[IDS.btnAgregarMedicamento];
  if (!btn) return;
  let permitido = estado.permisos.puedeCrearMedicamento;

  if (permitido === null) {
    try {
      const resp = await invocarConexion('permisoCrearMedicamento', {
        usuario: estado.usuario,
        rol: estado.rol,
        departamento: estado.departamento,
      });
      if (typeof resp === 'boolean') permitido = resp;
      else {
        const obj = extraerObjeto(resp) || resp || {};
        permitido = Boolean(valorDe(obj, ['permitido', 'puede', 'puedeCrear', 'autorizado'], false));
      }
    } catch (_) {
      permitido = false; // sin confirmación de permiso, no mostrar como disponible
    }
    estado.permisos.puedeCrearMedicamento = permitido;
  }

  if (permitido) {
    btn.hidden = false;
    btn.removeAttribute('aria-hidden');
  } else {
    btn.hidden = true;
    btn.setAttribute('aria-hidden', 'true');
  }
}

async function manejarAgregarMedicamento() {
  // Solo si tiene permiso; la creación real usa proceso autorizado de catálogos.
  if (estado.permisos.puedeCrearMedicamento !== true) {
    mostrarError('No tiene permiso para registrar medicamentos.');
    return;
  }
  try {
    const metodo = resolverMetodo('abrirCrearMedicamento');
    if (!metodo) {
      mostrarAdvertencia('No hay un mecanismo de creación de medicamentos configurado en la conexión centralizada. Utilice el proceso autorizado de administración de catálogos.');
      return;
    }
    const resultado = await metodo.fn({ usuario: estado.usuario, rol: estado.rol, departamento: estado.departamento });
    // Tras registro exitoso, volver a consultar catálogo y permitir seleccionar el nuevo.
    const exito = resultado === true || valorDe(extraerObjeto(resultado) || {}, ['exito', 'ok', 'registrado', 'creado'], false);
    await recargarMedicamentos(exito ? resultado : null);
  } catch (error) {
    console.error('[transferencias] Error al abrir/crear medicamento:', error);
    mostrarError('No se pudo completar la operación de registro de medicamento. Verifique sus permisos o la conexión.');
  }
}

async function recargarMedicamentos(resultadoCreacion) {
  if (estado.listaMedicamentos) {
    await estado.listaMedicamentos.ejecutarBusqueda(estado.listaMedicamentos.busqueda || '');
  }
  // Intentar seleccionar medicamento registrado si el resultado lo identifica.
  const creado = extraerObjeto(resultadoCreacion);
  const idCreado = obtenerIdMedicamento(creado);
  if (idCreado && estado.listaMedicamentos) {
    const encontrado = (estado.listaMedicamentos.items || []).find((m) => String(obtenerIdMedicamento(m)) === String(idCreado));
    if (encontrado) {
      estado.listaMedicamentos.seleccionar(encontrado);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Lotes dependientes (Mayor, selección manual, sin FEFO)                     */
/* -------------------------------------------------------------------------- */

function obtenerIdLote(item) {
  return valorDe(item, ['id', 'idLote', 'loteId', 'identificadorLote', 'numeroLote', 'lote', 'codigoLote']);
}

function obtenerIdMedicamentoDeLote(item) {
  return valorDe(item, ['idMedicamento', 'medicamentoId', 'productoId', 'idProducto']);
}

function etiquetaLote(item) {
  return valorDe(item, ['numeroLote', 'lote', 'numero', 'codigoLote', 'codigo'], 'Lote');
}

function loteTransferible(item) {
  // Exclusión definitiva según backend; en frontend solo evitamos estados claramente no utilizables si vienen informados.
  if (!item) return false;
  const estadoLote = normalizarTexto(valorDe(item, ['estado', 'estadoLote', 'situacion'], '')).toLowerCase();
  const noUtilizables = ['anulado', 'anulada', 'bloqueado', 'bloqueada', 'inactivo', 'inactiva', 'vencido', 'vencida', 'no disponible', 'no-disponible'];
  if (estadoLote && noUtilizables.includes(estadoLote)) return false;
  const disponible = aNumero(valorDe(item, ['existenciaDisponible', 'cantidadDisponible', 'disponible', 'saldoDisponible', 'existencia'], null));
  if (disponible !== null && disponible <= 0) return false;
  // Si backend indica explícitamente transferible/utilizable
  const flag = valorDe(item, ['transferible', 'utilizable', 'disponibleParaTransferir'], undefined);
  if (flag === false) return false;
  return true;
}

async function proveedorLotes({ query } = {}) {
  const med = estado.medicamentoSeleccionado;
  const medId = obtenerIdMedicamento(med);
  if (!med || !medId) return [];
  try {
    const resp = await invocarConexion('lotesPorMedicamento', {
      medicamentoId: medId,
      idMedicamento: medId,
      medicamento: med,
      busqueda: normalizarTexto(query),
      numeroLote: normalizarTexto(query),
      modulo: 'MAYOR',
      inventario: 'MAYOR',
      soloDisponibles: false, // backend filtra utilizables; pedimos información y filtramos visualmente lo obvio
    });
    const lista = extraerLista(resp, ['lotes', 'items', 'registros']);
    // Solo lotes del medicamento seleccionado y utilizables según información disponible.
    return (Array.isArray(lista) ? lista : []).filter((l) => {
      const idMedLote = obtenerIdMedicamentoDeLote(l);
      if (idMedLote !== undefined && idMedLote !== null && String(idMedLote) !== String(medId)) return false;
      return loteTransferible(l);
    });
  } catch (error) {
    console.warn('[transferencias] No se pudieron consultar lotes de Mayor:', error);
    mostrarAdvertencia('No se pudieron consultar los lotes del medicamento seleccionado en Inventario Mayor.', { reemplazar: false });
    return [];
  }
}

async function onLoteSeleccionado(item) {
  estado.loteSeleccionado = item || null;
  // Limpiar cantidad/vista previa dependiente al cambiar lote
  const inputCantidad = dom[IDS.cantidad];
  if (inputCantidad) inputCantidad.value = '';
  estado.cantidad = null;

  await consultarExistenciasSeleccion();
  actualizarInfoLote();
  actualizarResumenExistencias();
  actualizarVistaPrevia();
  validarYActualizarEstadoConfirmacion();
}

function limpiarSeleccionLote({ mantenerMedicamento = false } = {}) {
  estado.loteSeleccionado = null;
  estado.existenciaMayor = null;
  estado.existenciaDetal = null;
  if (estado.listaLotes) {
    estado.listaLotes.seleccionado = null;
    if (estado.listaLotes.input) estado.listaLotes.input.value = '';
    if (!mantenerMedicamento) {
      estado.listaLotes.setContexto({});
      estado.listaLotes.setItems([]);
      estado.listaLotes.setDisabled(true);
    }
  }
}

function limpiarCantidadYPreview() {
  const inputCantidad = dom[IDS.cantidad];
  if (inputCantidad) inputCantidad.value = '';
  estado.cantidad = null;
  actualizarVistaPrevia();
  validarYActualizarEstadoConfirmacion();
}

async function consultarExistenciasSeleccion() {
  const lote = estado.loteSeleccionado;
  const med = estado.medicamentoSeleccionado;
  if (!lote || !med) {
    estado.existenciaMayor = null;
    estado.existenciaDetal = null;
    return;
  }

  // Priorizar valores informados por el lote consultado en Mayor.
  const dispMayor = aNumero(valorDe(lote, ['existenciaDisponible', 'cantidadDisponible', 'disponible', 'saldoDisponible', 'existenciaMayor', 'existencia']));
  estado.existenciaMayor = dispMayor;

  // Consultar existencia actual del mismo lote en Detal (si conexión lo soporta).
  const loteId = obtenerIdLote(lote);
  const medId = obtenerIdMedicamento(med);
  try {
    const resp = await invocarConexion('existenciaLoteDetal', {
      loteId,
      idLote: loteId,
      medicamentoId: medId,
      idMedicamento: medId,
      numeroLote: valorDe(lote, ['numeroLote', 'lote', 'numero']),
    });
    const obj = extraerObjeto(resp) || {};
    const dispDetal = aNumero(valorDe(obj, ['existenciaDisponible', 'cantidadDisponible', 'existenciaActual', 'saldo', 'cantidadActual', 'existencia'], null));
    if (dispDetal !== null) estado.existenciaDetal = dispDetal;
    else if (obj === null) estado.existenciaDetal = estado.existenciaDetal; // sin cambio
  } catch (_) {
    // Si no hay método, no simular: mostrar desconocido (—) y dejar que backend confirme.
    if (estado.existenciaDetal === null || estado.existenciaDetal === undefined) {
      estado.existenciaDetal = null;
    }
  }

  // Si backend expone existencia Mayor más precisa por consulta dedicada
  try {
    const respM = await invocarConexion('existenciaLoteMayor', { loteId, idLote: loteId, medicamentoId: medId, idMedicamento: medId });
    const objM = extraerObjeto(respM) || {};
    const dispM = aNumero(valorDe(objM, ['existenciaDisponible', 'cantidadDisponible', 'existenciaActual', 'saldo', 'cantidadActual', 'existencia'], null));
    if (dispM !== null) estado.existenciaMayor = dispM;
  } catch (_) { /* opcional */ }
}

function actualizarResumenExistencias() {
  const med = estado.medicamentoSeleccionado;
  const lote = estado.loteSeleccionado;
  establecerTexto('resumen-mayor-medicamento', med ? etiquetaMedicamento(med) : null);
  establecerTexto('resumen-mayor-lote', lote ? etiquetaLote(lote) : null);
  establecerTexto(IDS.existenciaMayor, estado.existenciaMayor);
  establecerTexto(IDS.existenciaDetal, estado.existenciaDetal);
  establecerTexto(IDS.existenciaLoteSeleccionado, estado.existenciaMayor);
}

function actualizarInfoLote() {
  const lote = estado.loteSeleccionado;
  establecerTexto('info-lote-numero', valorDe(lote, ['numeroLote', 'lote', 'numero']));
  establecerTexto('info-lote-vencimiento', formatearFecha(valorDe(lote, ['fechaVencimiento', 'vencimiento', 'fechaCaducidad'])));
  establecerTexto('info-lote-existencia-mayor', estado.existenciaMayor);
  establecerTexto('info-lote-procedencia', valorDe(lote, ['procedencia', 'origen', 'proveedor', 'fuente']));
  establecerTexto('info-lote-estado', valorDe(lote, ['estado', 'estadoLote', 'situacion']));
  establecerTexto('info-lote-codigo-barras', valorDe(lote, ['codigoBarras', 'codigoBarra', 'barcode', 'codigo']));
}

/* -------------------------------------------------------------------------- */
/* Validación frontend y vista previa                                         */
/* -------------------------------------------------------------------------- */

function leerFormulario() {
  estado.cantidad = aNumero(dom[IDS.cantidad]?.value);
  estado.fechaEfectiva = normalizarTexto(dom[IDS.fecha]?.value);
  estado.observaciones = normalizarTexto(dom[IDS.observaciones]?.value);
}

function limpiarErroresCampos() {
  ['error-medicamento-transferencia', 'error-lote-transferencia', 'error-cantidad-transferencia', 'error-fecha-transferencia']
    .forEach((id) => { const el = $(id); if (el) el.textContent = ''; });
  const grupos = ['grupo-medicamento-transferencia', 'grupo-lote-transferencia', 'grupo-cantidad-transferencia', 'grupo-fecha-transferencia'];
  grupos.forEach((id) => $(id)?.classList.remove('app-campo--error'));
  dom[IDS.cantidad]?.removeAttribute('aria-invalid');
  dom[IDS.fecha]?.removeAttribute('aria-invalid');
}

function marcarErrorCampo(grupoId, mensajeId, mensaje) {
  $(grupoId)?.classList.add('app-campo--error');
  const m = $(mensajeId);
  if (m) m.textContent = mensaje;
}

function validarFormularioFrontend({ paraConfirmar = false } = {}) {
  leerFormulario();
  limpiarErroresCampos();
  const errores = [];

  if (!estado.medicamentoSeleccionado || !obtenerIdMedicamento(estado.medicamentoSeleccionado)) {
    errores.push({ tipo: 'medicamento', mensaje: 'Debe seleccionar un medicamento.' });
    marcarErrorCampo('grupo-medicamento-transferencia', 'error-medicamento-transferencia', 'Medicamento obligatorio.');
  }

  if (!estado.loteSeleccionado || !obtenerIdLote(estado.loteSeleccionado)) {
    errores.push({ tipo: 'lote', mensaje: 'Debe seleccionar un lote.' });
    marcarErrorCampo('grupo-lote-transferencia', 'error-lote-transferencia', 'Lote obligatorio.');
  } else {
    // Comprobar pertenencia al medicamento seleccionado (frontend) y origen Mayor
    const idMed = obtenerIdMedicamento(estado.medicamentoSeleccionado);
    const idMedLote = obtenerIdMedicamentoDeLote(estado.loteSeleccionado);
    if (idMed && idMedLote && String(idMed) !== String(idMedLote)) {
      errores.push({ tipo: 'lote', mensaje: 'El lote seleccionado no pertenece al medicamento indicado.' });
      marcarErrorCampo('grupo-lote-transferencia', 'error-lote-transferencia', 'El lote no pertenece al medicamento seleccionado.');
    }
    if (loteTransferible(estado.loteSeleccionado) === false) {
      errores.push({ tipo: 'lote', mensaje: 'El lote seleccionado no se encuentra en un estado válido para transferir.' });
      marcarErrorCampo('grupo-lote-transferencia', 'error-lote-transferencia', 'El lote no está disponible para transferir.');
    }
  }

  // Cantidad
  const cantidad = estado.cantidad;
  if (cantidad === null || !Number.isFinite(cantidad)) {
    errores.push({ tipo: 'cantidad', mensaje: 'La cantidad es inválida.' });
    marcarErrorCampo('grupo-cantidad-transferencia', 'error-cantidad-transferencia', 'Cantidad inválida.');
    dom[IDS.cantidad]?.setAttribute('aria-invalid', 'true');
  } else {
    if (cantidad <= 0 || !Number.isInteger(cantidad)) {
      errores.push({ tipo: 'cantidad', mensaje: 'La cantidad debe ser numérica, mayor que cero y en el formato permitido.' });
      marcarErrorCampo('grupo-cantidad-transferencia', 'error-cantidad-transferencia', 'Cantidad inválida. Debe ser un número entero mayor que cero.');
      dom[IDS.cantidad]?.setAttribute('aria-invalid', 'true');
    }
    const existenciaMayor = aNumero(estado.existenciaMayor);
    if (existenciaMayor !== null && cantidad > existenciaMayor) {
      errores.push({ tipo: 'cantidad', mensaje: 'La cantidad ingresada supera la existencia disponible del lote seleccionado.' });
      marcarErrorCampo('grupo-cantidad-transferencia', 'error-cantidad-transferencia', 'La cantidad ingresada supera la existencia disponible del lote seleccionado.');
      dom[IDS.cantidad]?.setAttribute('aria-invalid', 'true');
    }
  }

  // Fecha efectiva (obligatoria, válida; permite anteriores, no se fuerza hoy ni se reemplaza)
  if (!estado.fechaEfectiva) {
    errores.push({ tipo: 'fecha', mensaje: 'Debe indicar la fecha de transferencia.' });
    marcarErrorCampo('grupo-fecha-transferencia', 'error-fecha-transferencia', 'Fecha inválida u obligatoria.');
    dom[IDS.fecha]?.setAttribute('aria-invalid', 'true');
  } else {
    const valida = typeof validaciones.validarFecha === 'function'
      ? validaciones.validarFecha(estado.fechaEfectiva, { campo: 'fechaEfectiva', obligatorio: true })
      : null;
    if (valida && valida.valido === false) {
      errores.push({ tipo: 'fecha', mensaje: 'La fecha de transferencia no es válida.' });
      marcarErrorCampo('grupo-fecha-transferencia', 'error-fecha-transferencia', 'Fecha inválida.');
      dom[IDS.fecha]?.setAttribute('aria-invalid', 'true');
    }
  }

  // No permitir confirmar si cantidad inválida o supera existencia (frontend). Backend revalida.
  const puedeConfirmar = errores.length === 0;
  return { valido: paraConfirmar ? puedeConfirmar : errores.filter(e => e.tipo !== 'cantidad' || aNumero(estado.cantidad) !== null).length === 0, errores, puedeConfirmar };
}

function calcularPreviewLocal() {
  const cantidad = aNumero(estado.cantidad);
  const exMayor = aNumero(estado.existenciaMayor);
  const exDetal = aNumero(estado.existenciaDetal);
  const resultado = { mayorActual: exMayor, mayorResultante: null, detalActual: exDetal, detalResultante: null, excede: false, valido: false };
  if (cantidad === null || cantidad <= 0 || !Number.isInteger(cantidad)) return resultado;
  resultado.excede = exMayor !== null && cantidad > exMayor;
  if (exMayor !== null) resultado.mayorResultante = exMayor - cantidad;
  if (exDetal !== null) resultado.detalResultante = exDetal + cantidad;
  resultado.valido = !resultado.excede && exMayor !== null;
  return resultado;
}

async function actualizarVistaPrevia() {
  const med = estado.medicamentoSeleccionado;
  const lote = estado.loteSeleccionado;
  leerFormulario();

  establecerTexto('resumen-previa-medicamento', med ? etiquetaMedicamento(med) : null);
  establecerTexto('resumen-previa-lote', lote ? etiquetaLote(lote) : null);
  establecerTexto('resumen-previa-cantidad', estado.cantidad);
  establecerTexto('resumen-previa-fecha', estado.fechaEfectiva ? formatearFecha(estado.fechaEfectiva) : null);
  establecerTexto('resumen-previa-origen', 'Inventario Mayor');
  establecerTexto('resumen-previa-destino', 'Inventario Detal');

  // Intentar previsualización desde backend (cálculos definitivos) si está disponible; si no, cálculo informativo local.
  let preview = calcularPreviewLocal();
  try {
    if (med && lote && aNumero(estado.cantidad) > 0 && resolverMetodo('previsualizar')) {
      const resp = await invocarConexion('previsualizar', construirPayloadTransferencia({ soloPrevisualizacion: true }));
      const obj = extraerObjeto(resp) || {};
      if (obj && Object.keys(obj).length) {
        preview.mayorActual = aNumero(valorDe(obj, ['existenciaActualMayor', 'mayorActual', 'saldoActualMayor'], preview.mayorActual));
        preview.mayorResultante = aNumero(valorDe(obj, ['existenciaResultanteMayor', 'mayorResultante', 'saldoResultanteMayor'], preview.mayorResultante));
        preview.detalActual = aNumero(valorDe(obj, ['existenciaActualDetal', 'detalActual', 'cantidadActualDetal', 'saldoActualDetal'], preview.detalActual));
        preview.detalResultante = aNumero(valorDe(obj, ['existenciaResultanteDetal', 'detalResultante', 'saldoResultanteDetal'], preview.detalResultante));
        const excede = valorDe(obj, ['excedeExistencia', 'cantidadExcede', 'existenciaInsuficiente'], undefined);
        if (excede !== undefined) preview.excede = Boolean(excede);
      }
    }
  } catch (_) {
    // Mantener preview informativo local; definitivo lo confirma backend.
  }

  establecerTexto('resumen-previa-existencia-mayor-actual', preview.mayorActual);
  establecerTexto('resumen-previa-existencia-mayor-resultante', preview.mayorResultante);
  establecerTexto('resumen-previa-existencia-detal-actual', preview.detalActual);
  establecerTexto('resumen-previa-existencia-detal-resultante', preview.detalResultante);

  const contResumen = dom[IDS.resumen];
  const excede = Boolean(preview.excede || (aNumero(estado.cantidad) !== null && aNumero(preview.mayorActual) !== null && aNumero(estado.cantidad) > aNumero(preview.mayorActual)));
  if (contResumen) {
    contResumen.classList.toggle('app-farmacia-transferencias--saldo-insuficiente', excede);
  }

  const msg = dom.resumenValidacion || $('resumen-previa-validacion');
  if (msg) {
    if (excede) {
      msg.textContent = 'La cantidad ingresada supera la existencia disponible del lote seleccionado. No es posible confirmar la transferencia.';
      msg.classList.add('app-farmacia-transferencias--existencia-insuficiente');
    } else if (!med || !lote || !estado.cantidad || !estado.fechaEfectiva) {
      msg.textContent = 'Complete los datos obligatorios y verifique que la cantidad no supere la existencia disponible para habilitar la confirmación.';
      msg.classList.remove('app-farmacia-transferencias--existencia-insuficiente');
    } else {
      msg.textContent = 'Vista previa informativa. Los saldos definitivos y la validación final serán calculados y confirmados por el backend.';
      msg.classList.remove('app-farmacia-transferencias--existencia-insuficiente');
    }
  }
}

function validarYActualizarEstadoConfirmacion() {
  const { puedeConfirmar, errores } = validarFormularioFrontend({ paraConfirmar: true });
  const btn = dom[IDS.btnConfirmar];
  const excede = errores.some((e) => /supera la existencia/i.test(e.mensaje || ''));
  if (btn) {
    const bloqueado = estado.enviando || !puedeConfirmar || excede || estado.permisos.puedeTransferir === false;
    btn.disabled = bloqueado;
    btn.setAttribute('aria-disabled', bloqueado ? 'true' : 'false');
  }
  if (excede) {
    // Mensaje explícito requerido cuando supera saldo
    const campoMsg = $('error-cantidad-transferencia');
    if (campoMsg && !campoMsg.textContent) {
      campoMsg.textContent = 'La cantidad ingresada supera la existencia disponible del lote seleccionado.';
    }
  }
  return !excede && puedeConfirmar;
}

/* -------------------------------------------------------------------------- */
/* Construcción de payload y confirmación                                     */
/* -------------------------------------------------------------------------- */

function generarIdempotencia() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tr-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function construirPayloadTransferencia({ soloPrevisualizacion = false } = {}) {
  const med = estado.medicamentoSeleccionado || {};
  const lote = estado.loteSeleccionado || {};
  const medId = obtenerIdMedicamento(med);
  const loteId = obtenerIdLote(lote);

  return {
    // Identidades conservadas (no se crean lotes/códigos nuevos)
    medicamentoId: medId,
    idMedicamento: medId,
    loteId,
    idLote: loteId,
    numeroLote: valorDe(lote, ['numeroLote', 'lote', 'numero']),
    codigoBarras: valorDe(lote, ['codigoBarras', 'codigoBarra', 'barcode', 'codigo']),
    fechaVencimiento: valorDe(lote, ['fechaVencimiento', 'vencimiento', 'fechaCaducidad']),
    procedencia: valorDe(lote, ['procedencia', 'origen']),
    // Movimiento
    cantidad: aNumero(estado.cantidad),
    fechaEfectiva: estado.fechaEfectiva || null, // fecha seleccionada por usuario (puede ser retroactiva), no reemplazada
    observaciones: estado.observaciones || '',
    origen: 'MAYOR',
    destino: 'DETAL',
    inventarioOrigen: 'MAYOR',
    inventarioDestino: 'DETAL',
    tipoMovimiento: 'TRANSFERENCIA_MAYOR_DETAL',
    soloPrevisualizacion: Boolean(soloPrevisualizacion),
    // Idempotencia para evitar duplicaciones por reintentos/interrupciones (si backend lo soporta)
    claveIdempotencia: idempotenciaActual,
    idempotencyKey: idempotenciaActual,
    // Contexto (backend valida permisos/autorización/usuario real)
    usuario: estado.usuario,
    rol: estado.rol,
    departamento: estado.departamento,
  };
}

function abrirModalConfirmacion() {
  const modal = dom[IDS.modal];
  if (!modal) return;
  rellenarResumenModal();
  setEstadoModal('', '');
  modal.hidden = false;
  modal.removeAttribute('aria-hidden');
  modal.classList.remove('app-farmacia-transferencias--en-proceso', 'app-farmacia-transferencias--completada', 'app-farmacia-transferencias--fallida');
  // Enfocar botón cancelar/volver por seguridad
  (dom.modalCancelar || dom.modalCerrar || dom.modalAceptar)?.focus?.();
}

function cerrarModalConfirmacion(forzado = false) {
  if (estado.enviando && !forzado) return;
  const modal = dom[IDS.modal];
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

function setEstadoModal(texto, tipo) {
  const el = dom.modalEstado;
  if (!el) return;
  el.textContent = texto || '';
  el.classList.remove(
    'app-farmacia-transferencias-modal-estado--cargando',
    'app-farmacia-transferencias-modal-estado--exito',
    'app-farmacia-transferencias-modal-estado--completada',
    'app-farmacia-transferencias-modal-estado--error',
    'app-farmacia-transferencias-modal-estado--fallida'
  );
  if (tipo) el.classList.add(`app-farmacia-transferencias-modal-estado--${tipo}`);
}

function rellenarResumenModal() {
  const med = estado.medicamentoSeleccionado;
  const lote = estado.loteSeleccionado;
  const preview = calcularPreviewLocal();
  establecerTexto('modal-resumen-medicamento', med ? etiquetaMedicamento(med) : null);
  establecerTexto('modal-resumen-lote', lote ? etiquetaLote(lote) : null);
  establecerTexto('modal-resumen-cantidad', estado.cantidad);
  establecerTexto('modal-resumen-mayor-actual', preview.mayorActual);
  establecerTexto('modal-resumen-mayor-resultante', preview.mayorResultante);
  establecerTexto('modal-resumen-detal-actual', preview.detalActual);
  establecerTexto('modal-resumen-detal-resultante', preview.detalResultante);
  establecerTexto('modal-resumen-fecha', estado.fechaEfectiva ? formatearFecha(estado.fechaEfectiva) : null);
  establecerTexto('modal-resumen-origen', 'Inventario Mayor');
  establecerTexto('modal-resumen-destino', 'Inventario Detal');
}

async function solicitarConfirmacionOperacion() {
  const resumenTexto = [
    `Medicamento: ${formatearTexto(estado.medicamentoSeleccionado ? etiquetaMedicamento(estado.medicamentoSeleccionado) : '')}`,
    `Lote: ${formatearTexto(estado.loteSeleccionado ? etiquetaLote(estado.loteSeleccionado) : '')}`,
    `Cantidad: ${formatearTexto(estado.cantidad)}`,
    `Fecha efectiva: ${formatearTexto(estado.fechaEfectiva)}`,
    'Origen: Inventario Mayor → Destino: Inventario Detal',
  ].join('\n');

  if (typeof formularios.solicitarConfirmacion === 'function') {
    try {
      return await formularios.solicitarConfirmacion({
        titulo: 'Confirmar transferencia',
        mensaje: 'Se registrará una transferencia interna de Inventario Mayor a Inventario Detal con los datos indicados.',
        detalle: resumenTexto,
        textoConfirmar: 'Confirmar y enviar',
        textoCancelar: 'Cancelar',
        tipo: 'advertencia',
      });
    } catch (_) { /* fallback a modal propio */ }
  }
  // Fallback explícito: usar modal propio ya visible y requerir clic en aceptar.
  return true;
}

async function iniciarFlujoConfirmacion(evento) {
  if (evento) evento.preventDefault();
  if (estado.enviando) return;

  // 1) Comprobar campos obligatorios y validaciones frontend
  const { valido, errores, puedeConfirmar } = validarFormularioFrontend({ paraConfirmar: true });
  await actualizarVistaPrevia();
  validarYActualizarEstadoConfirmacion();

  if (!valido || !puedeConfirmar) {
    if (errores.some((e) => e.tipo === 'cantidad' && /supera la existencia/i.test(e.mensaje || ''))) {
      mostrarError('La cantidad ingresada supera la existencia disponible del lote seleccionado.');
    } else {
      mostrarError('Revise los datos obligatorios y corrija los errores antes de confirmar la transferencia.');
    }
    return;
  }

  // 2) Comprobar permisos (visual). Backend revalida.
  if (estado.permisos.puedeTransferir === false) {
    mostrarError('Transferencia no autorizada.');
    return;
  }

  // 3) Mostrar resumen y solicitar confirmación explícita (modal)
  idempotenciaActual = generarIdempotencia();
  abrirModalConfirmacion();
}

async function ejecutarConfirmacionTransferencia() {
  if (estado.enviando) return;

  // Revalidar antes de enviar
  const { valido, puedeConfirmar } = validarFormularioFrontend({ paraConfirmar: true });
  if (!valido || !puedeConfirmar) {
    setEstadoModal('No es posible confirmar: verifique cantidad, lote, fecha y existencias.', 'error');
    mostrarError('No se puede confirmar la transferencia. Verifique los datos ingresados.');
    return;
  }

  const btnForm = dom[IDS.btnConfirmar];
  const btnModal = dom.modalAceptar;
  estado.enviando = true;
  if (btnForm) { btnForm.disabled = true; btnForm.setAttribute('aria-disabled', 'true'); }
  if (btnModal) { btnModal.disabled = true; btnModal.setAttribute('aria-disabled', 'true'); }
  if (dom.modalCancelar) dom.modalCancelar.disabled = true;
  if (dom.modalCerrar) dom.modalCerrar.disabled = true;
  dom[IDS.modal]?.classList.add('app-farmacia-transferencias--en-proceso');
  dom[IDS.modal]?.classList.remove('app-farmacia-transferencias--completada', 'app-farmacia-transferencias--fallida');
  setEstadoModal('Procesando transferencia. Espere la confirmación del servidor…', 'cargando');
  mostrarInfo('Procesando transferencia. No cierre esta ventana hasta recibir confirmación del servidor.', { reemplazar: true });

  try {
    // 4) Enviar solicitud al backend y 5) esperar confirmación definitiva
    const payload = construirPayloadTransferencia({ soloPrevisualizacion: false });
    const resp = await invocarConexion('confirmar', payload);
    const obj = extraerObjeto(resp) || resp || {};

    const exito = resp === true || valorDe(obj, ['exito', 'ok', 'confirmada', 'registrada', 'success'], false) === true || (!valorDe(obj, ['error', 'fallo'], false) && (valorDe(obj, ['id', 'identificador', 'transferenciaId'], null) !== null));
    if (!exito) {
      const msg = normalizarTexto(valorDe(obj, ['mensaje', 'message', 'detalle', 'error'], '')) || 'La transferencia no fue confirmada por el servidor.';
      throw Object.assign(new Error(msg), { respuesta: obj, codigo: valorDe(obj, ['codigo', 'code']) });
    }

    // 6) Mostrar resultado real confirmado y 7) actualizar información
    setEstadoModal('Transferencia confirmada por el servidor.', 'completada');
    dom[IDS.modal]?.classList.remove('app-farmacia-transferencias--en-proceso');
    dom[IDS.modal]?.classList.add('app-farmacia-transferencias--completada');
    mostrarExito(normalizarTexto(valorDe(obj, ['mensaje', 'message'], 'Transferencia confirmada correctamente.')), { reemplazar: true });

    // Emitir evento para que otros módulos (p.ej. Detal) puedan refrescar tras confirmación
    document.dispatchEvent(new CustomEvent('app:transferencia:confirmada', { detail: { modulo: 'MAYOR_DETAL', respuesta: obj, payload } }));
    document.dispatchEvent(new CustomEvent('farmacia:transferencia:confirmada', { detail: { respuesta: obj } }));

    await Promise.allSettled([
      recargarDatosTrasConfirmacion(obj),
      cargarHistorialTransferencias({ pagina: 1 }),
    ]);

    // Permitir cerrar modal tras éxito
    if (dom.modalCancelar) dom.modalCancelar.disabled = false;
    if (dom.modalCerrar) dom.modalCerrar.disabled = false;
    if (btnModal) { btnModal.disabled = false; btnModal.textContent = 'Cerrar'; btnModal.onclick = () => cerrarModalConfirmacion(true); }

    // Limpiar formulario para nueva operación (manteniendo fecha ingresada no se fuerza; se puede limpiar)
    // conservar datos seguros no es necesario tras éxito; preparar nueva transferencia
    resetFormularioTrasExito();
  } catch (error) {
    console.error('[transferencias] Error al confirmar transferencia:', error);
    estado.ultimoErrorOperacion = error;
    dom[IDS.modal]?.classList.remove('app-farmacia-transferencias--en-proceso');
    dom[IDS.modal]?.classList.add('app-farmacia-transferencias--fallida');
    const mensajeError = resolverMensajeError(error);
    setEstadoModal(mensajeError, 'fallida');
    // No asumir éxito parcial: consultar saldos confirmados por servidor cuando haya incertidumbre
    mostrarError(mensajeError, { reemplazar: true });
    await consultarSaldosTrasError();
    if (dom.modalCancelar) dom.modalCancelar.disabled = false;
    if (dom.modalCerrar) dom.modalCerrar.disabled = false;
  } finally {
    estado.enviando = false;
    if (btnForm) validarYActualizarEstadoConfirmacion();
    if (btnModal && dom[IDS.modal]?.classList.contains('app-farmacia-transferencias--fallida')) {
      btnModal.disabled = false;
    }
  }
}

function resolverMensajeError(error) {
  const codigo = normalizarTexto(error?.codigo || error?.respuesta?.codigo || error?.code).toUpperCase();
  const msg = normalizarTexto(error?.message || error?.respuesta?.mensaje || error?.respuesta?.message || '');
  const mapa = {
    MEDICAMENTO_INEXISTENTE: 'Medicamento inexistente.',
    LOTE_INEXISTENTE: 'Lote inexistente.',
    LOTE_NO_CORRESPONDE: 'Lote perteneciente a otro medicamento.',
    LOTE_NO_DISPONIBLE: 'Lote no disponible para transferir.',
    CANTIDAD_INVALIDA: 'Cantidad inválida.',
    EXISTENCIA_INSUFICIENTE: 'Existencia insuficiente para completar la transferencia.',
    FECHA_INVALIDA: 'Fecha inválida.',
    NO_AUTORIZADO: 'Usuario sin permisos o transferencia no autorizada.',
    SESION_EXPIRADA: 'Sesión expirada. Inicie sesión nuevamente.',
    CONFLICTO_CONCURRENCIA: 'Conflicto por actualización simultánea del inventario. Consulte nuevamente los saldos.',
    CONEXION_NO_DISPONIBLE: 'Error de conexión con el servicio de Farmacia.',
    METODO_NO_DISPONIBLE: 'Operación no disponible en la conexión centralizada.',
  };
  if (codigo && mapa[codigo]) return mapa[codigo];
  if (/sesion/i.test(msg)) return 'Sesión expirada o no válida.';
  if (/permiso|autoriz/i.test(msg)) return 'Usuario sin permisos o transferencia no autorizada.';
  if (/existencia|insuficiente|saldo/i.test(msg)) return 'Existencia insuficiente o saldo no disponible.';
  if (/concurr|conflic/i.test(msg)) return 'Conflicto por actualización simultánea del inventario.';
  if (/conex|red|network|fetch/i.test(msg)) return 'Error de conexión. No se confirmó la transferencia; verifique los saldos actuales.';
  if (/servidor|500|intern/i.test(msg)) return 'Error del servidor. No se confirmó la transferencia; consulte los saldos actuales.';
  if (error?.codigo === 'CONEXION_NO_DISPONIBLE' || error?.codigo === 'METODO_NO_DISPONIBLE') {
    return 'No se pudo confirmar la transferencia: la conexión centralizada no está disponible o no implementa la operación requerida.';
  }
  return msg || 'No se pudo confirmar la transferencia. Consulte los saldos actuales antes de reintentar.';
}

async function consultarSaldosTrasError() {
  // Ante incertidumbre, consultar saldos confirmados por servidor (sin asumir estado parcial)
  try {
    await consultarExistenciasSeleccion();
    actualizarResumenExistencias();
    actualizarInfoLote();
    await actualizarVistaPrevia();
  } catch (_) { /* mantener estado actual */ }
}

async function recargarDatosTrasConfirmacion(respuesta) {
  // Actualizar existencia del lote en Mayor/Detal y vistas según confirmación del backend
  const obj = extraerObjeto(respuesta) || {};
  const exMayor = aNumero(valorDe(obj, ['existenciaResultanteMayor', 'mayorResultante', 'saldoMayor', 'existenciaMayor'], null));
  const exDetal = aNumero(valorDe(obj, ['existenciaResultanteDetal', 'detalResultante', 'saldoDetal', 'existenciaDetal'], null));
  if (exMayor !== null) estado.existenciaMayor = exMayor;
  if (exDetal !== null) estado.existenciaDetal = exDetal;
  // Si no vienen, reconsultar
  if (exMayor === null || exDetal === null) {
    await consultarExistenciasSeleccion();
  }
  // Refrescar lotes del medicamento (existencias actualizadas en Mayor)
  if (estado.listaLotes && estado.medicamentoSeleccionado) {
    await estado.listaLotes.ejecutarBusqueda(estado.listaLotes.busqueda || '');
  }
  actualizarResumenExistencias();
  actualizarInfoLote();
  await actualizarVistaPrevia();
}

function resetFormularioTrasExito() {
  // Limpiar selección y campos dependientes para nueva transferencia
  if (estado.listaMedicamentos) estado.listaMedicamentos.limpiar();
  if (estado.listaLotes) { estado.listaLotes.limpiar(); estado.listaLotes.setDisabled(true); estado.listaLotes.setItems([]); }
  estado.medicamentoSeleccionado = null;
  estado.loteSeleccionado = null;
  estado.existenciaMayor = null;
  estado.existenciaDetal = null;
  estado.cantidad = null;
  estado.observaciones = '';
  if (dom[IDS.cantidad]) dom[IDS.cantidad].value = '';
  if (dom[IDS.observaciones]) dom[IDS.observaciones].value = '';
  // No sustituir fecha elegida por usuario en general; tras éxito se puede dejar vacía para nueva captura
  if (dom[IDS.fecha]) dom[IDS.fecha].value = '';
  estado.fechaEfectiva = '';
  idempotenciaActual = null;
  limpiarErroresCampos();
  actualizarResumenExistencias();
  actualizarInfoLote();
  actualizarVistaPrevia();
  validarYActualizarEstadoConfirmacion();
}

/* -------------------------------------------------------------------------- */
/* Historial de transferencias                                                */
/* -------------------------------------------------------------------------- */

function leerFiltrosHistorial() {
  estado.filtrosHistorial.busqueda = normalizarTexto(dom[IDS.busqueda]?.value);
  estado.filtrosHistorial.fechaInicial = normalizarTexto(dom[IDS.filtroFechaInicial]?.value);
  estado.filtrosHistorial.fechaFinal = normalizarTexto(dom[IDS.filtroFechaFinal]?.value);
  estado.filtrosHistorial.estado = normalizarTexto(dom[IDS.filtroEstado]?.value);
}

async function cargarHistorialTransferencias({ pagina = 1 } = {}) {
  leerFiltrosHistorial();
  estado.historial.pagina = pagina;
  try {
    const resp = await invocarConexion('historial', {
      busqueda: estado.filtrosHistorial.busqueda,
      medicamento: estado.filtrosHistorial.busqueda,
      codigo: estado.filtrosHistorial.busqueda,
      numeroLote: estado.filtrosHistorial.busqueda,
      usuario: estado.filtrosHistorial.busqueda,
      fechaInicial: estado.filtrosHistorial.fechaInicial || null,
      fechaFinal: estado.filtrosHistorial.fechaFinal || null,
      estado: estado.filtrosHistorial.estado || null,
      pagina: estado.historial.pagina,
      tamano: estado.historial.tamano,
      limite: estado.historial.tamano,
      origen: 'MAYOR',
      destino: 'DETAL',
    });
    const obj = extraerObjeto(resp) || {};
    const items = extraerLista(resp, ['transferencias', 'historial', 'items', 'registros']);
    estado.historial.items = items;
    estado.historial.total = aNumero(valorDe(obj, ['total', 'totalRegistros', 'totalElementos'], items.length)) || items.length;
    renderizarHistorial();
  } catch (error) {
    console.warn('[transferencias] No se pudo consultar historial:', error);
    estado.historial.items = [];
    estado.historial.total = 0;
    limpiarTabla(dom.tbodyHistorial, 12, 'No se pudo cargar el historial', conexionNoDisponibleMensaje('historial'));
  }
}

function renderizarHistorial() {
  const tbody = dom.tbodyHistorial;
  if (!tbody) return;
  const items = estado.historial.items || [];
  if (!items.length) {
    limpiarTabla(tbody, 12, 'No hay transferencias para mostrar', 'Use la búsqueda y los filtros para consultar el historial de transferencias registradas en el sistema.');
    return;
  }
  tbody.innerHTML = '';
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'app-tabla__fila';

    const celdas = [
      formatearTexto(valorDe(item, ['identificador', 'id', 'transferenciaId', 'codigo', 'folio'])),
      formatearFecha(valorDe(item, ['fechaEfectiva', 'fechaTransferencia', 'fecha'])),
      formatearFechaHora(valorDe(item, ['fechaRegistro', 'fechaHoraRegistro', 'fechaRealRegistro', 'creadoEn', 'registradoEn'])),
      formatearTexto(valorDe(item, ['medicamento', 'nombreMedicamento', 'producto']) || etiquetaMedicamento(valorDe(item, ['medicamentoObjeto'], {}) || {})),
      formatearTexto(valorDe(item, ['lote', 'numeroLote'])),
      formatearNumero(valorDe(item, ['cantidad', 'cantidadTransferida'])),
      formatearTexto(valorDe(item, ['origen'], 'Inventario Mayor')),
      formatearTexto(valorDe(item, ['destino'], 'Inventario Detal')),
      formatearTexto(valorDe(item, ['usuarioResponsable', 'usuario', 'responsable', 'registradoPor'])),
      formatearTexto(valorDe(item, ['documento', 'referencia', 'documentoReferencia', 'folioDocumento'])),
      formatearTexto(valorDe(item, ['estado', 'estatus'])),
    ];

    celdas.forEach((texto, idx) => {
      const td = document.createElement('td');
      td.className = 'app-tabla__celda' + (idx === 5 ? ' app-tabla__celda--numero' : '');
      td.textContent = texto;
      tr.appendChild(td);
    });

    const tdAcc = document.createElement('td');
    tdAcc.className = 'app-tabla__celda app-tabla__celda--acciones';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-btn app-btn--secundario app-btn--sm';
    btn.textContent = 'Ver detalle';
    btn.addEventListener('click', () => consultarDetalleTransferencia(item));
    tdAcc.appendChild(btn);
    tr.appendChild(tdAcc);

    tbody.appendChild(tr);
  });
}

async function consultarDetalleTransferencia(item) {
  const id = valorDe(item, ['id', 'identificador', 'transferenciaId', 'codigo']);
  try {
    const resp = await invocarConexion('detalle', { id, transferenciaId: id, identificador: id });
    const det = extraerObjeto(resp) || item || {};
    const texto = [
      `Identificador: ${formatearTexto(valorDe(det, ['identificador', 'id', 'transferenciaId']))}`,
      `Medicamento: ${formatearTexto(valorDe(det, ['medicamento', 'nombreMedicamento']))}`,
      `Lote: ${formatearTexto(valorDe(det, ['lote', 'numeroLote']))}`,
      `Cantidad: ${formatearTexto(valorDe(det, ['cantidad']))}`,
      `Fecha efectiva: ${formatearFecha(valorDe(det, ['fechaEfectiva', 'fechaTransferencia']))}`,
      `Fecha/hora real de registro: ${formatearFechaHora(valorDe(det, ['fechaRegistro', 'fechaHoraRegistro', 'fechaRealRegistro']))}`,
      `Usuario: ${formatearTexto(valorDe(det, ['usuarioResponsable', 'usuario']))}`,
      `Estado: ${formatearTexto(valorDe(det, ['estado']))}`,
      `Documento/referencia: ${formatearTexto(valorDe(det, ['documento', 'referencia']))}`,
    ].join('\n');
    window.alert(texto); // visualización simple de detalle sin modificar registros
  } catch (error) {
    console.warn('[transferencias] Error al consultar detalle:', error);
    mostrarAdvertencia('No se pudo consultar el detalle de la transferencia. Verifique la conexión centralizada.');
  }
}

function limpiarFiltrosHistorial() {
  if (dom[IDS.busqueda]) dom[IDS.busqueda].value = '';
  if (dom[IDS.filtroFechaInicial]) dom[IDS.filtroFechaInicial].value = '';
  if (dom[IDS.filtroFechaFinal]) dom[IDS.filtroFechaFinal].value = '';
  if (dom[IDS.filtroEstado]) dom[IDS.filtroEstado].value = '';
  leerFiltrosHistorial();
  cargarHistorialTransferencias({ pagina: 1 });
}

/* -------------------------------------------------------------------------- */
/* Eventos e inicialización                                                   */
/* -------------------------------------------------------------------------- */

function vincularEventos() {
  dom[IDS.form]?.addEventListener('submit', iniciarFlujoConfirmacion);
  dom[IDS.btnCancelar]?.addEventListener('click', () => {
    if (estado.enviando) return;
    // Cancelar operación actual (no borra históricos). Conserva seguridad: limpia formulario.
    resetFormularioTrasExito();
    limpiarContenedorMensajes();
    mostrarInfo('Operación cancelada.');
  });

  dom[IDS.cantidad]?.addEventListener('input', async () => {
    leerFormulario();
    await actualizarVistaPrevia();
    validarYActualizarEstadoConfirmacion();
  });
  dom[IDS.fecha]?.addEventListener('change', async () => {
    leerFormulario();
    await actualizarVistaPrevia();
    validarYActualizarEstadoConfirmacion();
  });
  dom[IDS.fecha]?.addEventListener('input', async () => {
    leerFormulario();
    await actualizarVistaPrevia();
    validarYActualizarEstadoConfirmacion();
  });
  dom[IDS.observaciones]?.addEventListener('input', () => { leerFormulario(); });

  dom[IDS.btnAgregarMedicamento]?.addEventListener('click', manejarAgregarMedicamento);

  // Modal
  dom.modalCerrar?.addEventListener('click', () => cerrarModalConfirmacion(false));
  dom.modalCancelar?.addEventListener('click', () => cerrarModalConfirmacion(false));
  dom[IDS.modal]?.addEventListener('click', (e) => {
    if (e.target === dom[IDS.modal]) cerrarModalConfirmacion(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom[IDS.modal] && !dom[IDS.modal].hidden) cerrarModalConfirmacion(false);
  });
  dom.modalAceptar?.addEventListener('click', () => {
    // Si ya completó con éxito, botón puede actuar como cerrar
    if (dom[IDS.modal]?.classList.contains('app-farmacia-transferencias--completada')) {
      cerrarModalConfirmacion(true);
      return;
    }
    ejecutarConfirmacionTransferencia();
  });

  // Historial filtros
  dom[IDS.formFiltros]?.addEventListener('submit', (e) => {
    e.preventDefault();
    cargarHistorialTransferencias({ pagina: 1 });
  });
  dom[IDS.formFiltros]?.addEventListener('reset', () => {
    // Esperar a que el reset limpie inputs
    setTimeout(limpiarFiltrosHistorial, 0);
  });
}

function inicializarListas() {
  const contMed = dom[IDS.medicamento];
  const contLote = dom[IDS.lote];
  if (contMed && typeof listasBuscables.crearListaBuscable === 'function') {
    estado.listaMedicamentos = listasBuscables.crearListaBuscable({
      elemento: contMed,
      tipo: 'medicamentos',
      placeholder: 'Buscar medicamento por nombre o código…',
      buscarProvider: proveedorMedicamentos,
      getId: (item) => obtenerIdMedicamento(item),
      getLabel: (item) => etiquetaMedicamento(item),
      getCodigo: (item) => valorDe(item, ['codigo', 'codigoMedicamento'], ''),
      getDetalle: (item) => valorDe(item, ['presentacion', 'formaFarmaceutica', 'concentracion'], ''),
      onSeleccion: (item) => onMedicamentoSeleccionado(item),
      onCambio: (item) => onMedicamentoSeleccionado(item),
      mostrarBotonAgregar: false, // botón propio en HTML (btn-agregar-medicamento-transferencia)
    });
  }

  if (contLote && typeof listasBuscables.crearListaBuscable === 'function') {
    estado.listaLotes = listasBuscables.crearListaBuscable({
      elemento: contLote,
      tipo: 'lotes-mayor',
      placeholder: 'Seleccione un medicamento para ver lotes…',
      disabled: true,
      buscarProvider: proveedorLotes,
      getId: (item) => obtenerIdLote(item),
      getLabel: (item) => {
        const num = valorDe(item, ['numeroLote', 'lote', 'numero'], 'Lote');
        const vence = valorDe(item, ['fechaVencimiento', 'vencimiento'], '');
        return vence ? `${num} · Vence: ${formatearFecha(vence)}` : String(num);
      },
      getCodigo: (item) => valorDe(item, ['codigoLote', 'codigoBarras', 'codigo'], ''),
      getDetalle: (item) => {
        const partes = [];
        const ex = aNumero(valorDe(item, ['existenciaDisponible', 'cantidadDisponible', 'disponible', 'existencia'], null));
        if (ex !== null) partes.push(`Existencia Mayor: ${ex}`);
        const proc = valorDe(item, ['procedencia', 'origen'], '');
        if (proc) partes.push(`Procedencia: ${proc}`);
        const est = valorDe(item, ['estado', 'estadoLote'], '');
        if (est) partes.push(`Estado: ${est}`);
        return partes.join(' · ');
      },
      onSeleccion: (item) => onLoteSeleccionado(item),
      onCambio: (item) => onLoteSeleccionado(item),
    });
  }
}

async function inicializar() {
  cacheDom();
  vincularEventos();
  inicializarListas();

  const conexionOk = await cargarConexion();
  if (!conexionOk) {
    mostrarAdvertencia(`No se encontró la conexión centralizada (${MODULO_CONEXION}). Configure las conexiones de frontend para consultar datos reales y registrar transferencias.`, { reemplazar: false });
  }

  const accesoOk = await verificarAcceso();
  if (!accesoOk) return;

  // Carga inicial (solo datos reales vía conexión; sin simulaciones)
  await Promise.allSettled([
    cargarHistorialTransferencias({ pagina: 1 }),
    // medicamentos se consultan bajo demanda por el buscador/proveedor
  ]);

  // Estado inicial de UI
  if (estado.listaLotes) estado.listaLotes.setDisabled(true);
  actualizarResumenExistencias();
  actualizarInfoLote();
  actualizarVistaPrevia();
  validarYActualizarEstadoConfirmacion();
}

if (typeof base.alCargarDOM === 'function') {
  base.alCargarDOM(() => { inicializar(); });
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { inicializar(); });
} else {
  inicializar();
}

// Exposición mínima para depuración/integración controlada (sin datos simulados)
window.appTransferenciasFarmacia = Object.freeze({
  recargarHistorial: () => cargarHistorialTransferencias({ pagina: 1 }),
  recargarMedicamentos: () => recargarMedicamentos(null),
  obtenerEstado: () => ({ ...estado, conexion: undefined }),
});
