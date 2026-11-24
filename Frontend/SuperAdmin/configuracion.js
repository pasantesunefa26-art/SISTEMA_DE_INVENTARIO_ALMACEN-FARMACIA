import * as base from '../Compartidos/JS/base.js';
import * as validaciones from '../Compartidos/JS/validaciones.js';
import * as formularios from '../Compartidos/JS/formularios.js';
import * as listasBuscables from '../Compartidos/JS/listas-buscables.js';
import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';

const state = {
  conexion: null,
  accesoValidado: false,
  configuracion: {},
  productos: [],
  cambiosPendientes: [],
  operacionEnCurso: false,
};

const NOMBRES_CONEXION = {
  consultarConfiguracion: [
    'obtenerConfiguracionSistema',
    'consultarConfiguracionSistema',
    'obtenerConfiguracionesSistema',
    'consultarConfiguraciones',
  ],
  consultarMinimos: [
    'obtenerMinimosProductos',
    'consultarMinimosProductos',
    'listarProductosMinimos',
  ],
  consultarAlertas: [
    'obtenerConfiguracionAlertas',
    'consultarAlertasInventario',
    'obtenerAlertasInventario',
  ],
  consultarSeguridad: [
    'obtenerConfiguracionSeguridad',
    'consultarSeguridadSistema',
    'obtenerSeguridadSistema',
  ],
  actualizar: [
    'actualizarConfiguracionSistema',
    'guardarConfiguracionSistema',
    'actualizarParametroConfiguracion',
  ],
  consultaModificaciones: [
    'consultarHistorialConfiguracion',
    'obtenerHistorialConfiguracion',
    'obtenerModificacionesConfiguracion',
  ],
};

const SECCIONES = {
  general: 'general',
  alertas: 'alertas',
  seguridad: 'seguridad',
  modulos: 'modulos',
  informacion: 'informacion',
};

function obtenerElementos() {
  return {
    btnGuardar: document.getElementById('btn-guardar-configuracion'),
    btnGuardarSecundario: document.getElementById('btn-guardar-configuracion-secundario'),
    btnCancelar: document.getElementById('btn-cancelar-configuracion'),
    btnConfirmar: document.getElementById('btn-confirmar-configuracion'),
    mensaje: document.getElementById('mensaje-configuracion'),
    modal: document.getElementById('modal-confirmacion-configuracion'),
    nombreInstitucional: document.getElementById('campo-nombre-institucional'),
    identificacionInstitucional: document.getElementById('campo-identificacion-institucional'),
    region: document.getElementById('campo-region'),
    formatoFecha: document.getElementById('campo-formato-fecha'),
    zonaHoraria: document.getElementById('campo-zona-horaria'),
    visualizacion: document.getElementById('campo-visualizacion'),
    anticipacionVencimiento: document.getElementById('campo-anticipacion-vencimiento'),
    stockMinimo: document.getElementById('campo-stock-minimo'),
    stockMinimoInsumo: document.getElementById('campo-stock-minimo-insumo'),
    alertaAgotado: document.getElementById('campo-alerta-agotado'),
    stockBajo: document.getElementById('campo-alerta-stock-bajo'),
    inactividadSesion: document.getElementById('campo-inactividad-sesion'),
    bloqueoIntentos: document.getElementById('campo-bloqueo-intentos'),
    autenticacionPermitida: document.getElementById('campo-autenticacion-permitida'),
    proteccionSesiones: document.getElementById('campo-proteccion-sesiones'),
    moduloFarmacia: document.getElementById('campo-modulo-farmacia'),
    moduloAlmacen: document.getElementById('campo-modulo-almacen'),
    ultimaModificacion: document.getElementById('campo-ultima-modificacion'),
    usuarioResponsable: document.getElementById('campo-usuario-responsable'),
    fechaHoraConfig: document.getElementById('campo-fecha-hora-config'),
    estadoConfiguracion: document.getElementById('campo-estado-configuracion'),
  };
}

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
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

function resolverValor(obj, claves) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(obj, clave)) {
      return obj[clave];
    }
  }
  return undefined;
}

function resolverObjetoRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return {};
  if (Array.isArray(respuesta)) return {};

  if (respuesta.data && typeof respuesta.data === 'object' && !Array.isArray(respuesta.data)) {
    return respuesta.data;
  }

  return respuesta;
}

function resolverListaRespuesta(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!respuesta || typeof respuesta !== 'object') return [];

  const rutas = ['data', 'items', 'registros', 'resultado', 'productos', 'minimos'];
  for (const clave of rutas) {
    if (Array.isArray(respuesta[clave])) return respuesta[clave];
  }

  return [];
}

function mostrarMensaje(texto, tipo = 'info') {
  const elemento = document.getElementById('mensaje-configuracion');
  if (!elemento) return;

  elemento.textContent = texto;
  elemento.classList.remove('is-success', 'is-warning', 'is-error');

  if (tipo === 'success') elemento.classList.add('is-success');
  if (tipo === 'warning') elemento.classList.add('is-warning');
  if (tipo === 'error') elemento.classList.add('is-error');
}

function abrirModal() {
  const modal = document.getElementById('modal-confirmacion-configuracion');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function cerrarModal() {
  const modal = document.getElementById('modal-confirmacion-configuracion');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch (error) {
    state.conexion = null;
    console.warn('No se pudo cargar la conexión de SuperAdmin para configuración:', error);
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

async function validarAccesoSuperAdmin() {
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

      if (rol !== controlSesion.ROLES?.SUPERADMIN) throw new Error('Acceso no autorizado');

      state.accesoValidado = true;
      return true;
    }

    const usuario = obtenerUsuarioDesdeSesion();
    const rol = usuario && typeof controlSesion.obtenerRolUsuario === 'function'
      ? controlSesion.obtenerRolUsuario(usuario)
      : '';

    if (!usuario || rol !== controlSesion.ROLES?.SUPERADMIN) throw new Error('Acceso no autorizado');

    state.accesoValidado = true;
    return true;
  } catch {
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
    window.location.assign(destino);
    return false;
  }
}

function completarCamposDesdeConfiguracion(configuracion) {
  const elementos = obtenerElementos();
  if (!configuracion || typeof configuracion !== 'object') return;

  if (elementos.nombreInstitucional) elementos.nombreInstitucional.value = normalizarTexto(resolverValor(configuracion, ['nombreInstitucional', 'nombreSistema', 'nombre'])) || '';
  if (elementos.identificacionInstitucional) elementos.identificacionInstitucional.value = normalizarTexto(resolverValor(configuracion, ['identificacionInstitucional', 'codigoInstitucional', 'identificacion'])) || '';
  if (elementos.region) elementos.region.value = normalizarTexto(resolverValor(configuracion, ['region', 'regionSistema', 'preferenciaRegional'])) || '';
  if (elementos.formatoFecha) elementos.formatoFecha.value = normalizarTexto(resolverValor(configuracion, ['formatoFecha', 'formatoFechas', 'fechaFormato'])) || '';
  if (elementos.zonaHoraria) elementos.zonaHoraria.value = normalizarTexto(resolverValor(configuracion, ['zonaHoraria', 'timezone', 'horario'])) || '';
  if (elementos.visualizacion) elementos.visualizacion.value = normalizarTexto(resolverValor(configuracion, ['visualizacion', 'preferenciaVisual', 'theme'])) || '';

  if (elementos.anticipacionVencimiento) elementos.anticipacionVencimiento.value = normalizarTexto(resolverValor(configuracion, ['anticipacionVencimiento', 'diasAnticipacionVencimiento'])) || '';
  if (elementos.stockMinimo) elementos.stockMinimo.value = normalizarTexto(resolverValor(configuracion, ['stockMinimoMedicamento', 'stockMinimo', 'minimoMedicamento'])) || '';
  if (elementos.stockMinimoInsumo) elementos.stockMinimoInsumo.value = normalizarTexto(resolverValor(configuracion, ['stockMinimoInsumo', 'minimoInsumo'])) || '';
  if (elementos.alertaAgotado) elementos.alertaAgotado.value = normalizarTexto(resolverValor(configuracion, ['alertaAgotado', 'productosAgotados', 'umbralAgotado'])) || '';
  if (elementos.stockBajo) elementos.stockBajo.value = normalizarTexto(resolverValor(configuracion, ['stockBajo', 'umbralStockBajo'])) || '';

  if (elementos.inactividadSesion) elementos.inactividadSesion.value = normalizarTexto(resolverValor(configuracion, ['inactividadSesion', 'tiempoInactividad', 'maxInactividad'])) || '';
  if (elementos.bloqueoIntentos) elementos.bloqueoIntentos.value = normalizarTexto(resolverValor(configuracion, ['bloqueoIntentos', 'tiempoBloqueoIntentos'])) || '';
  if (elementos.autenticacionPermitida) elementos.autenticacionPermitida.value = normalizarTexto(resolverValor(configuracion, ['autenticacionPermitida', 'metodoAutenticacion'])) || '';
  if (elementos.proteccionSesiones) elementos.proteccionSesiones.value = normalizarTexto(resolverValor(configuracion, ['proteccionSesiones', 'estadoSesiones', 'seguridadSesiones'])) || '';
  if (elementos.moduloFarmacia) elementos.moduloFarmacia.value = normalizarTexto(resolverValor(configuracion, ['moduloFarmacia', 'estadoFarmacia'])) || '';
  if (elementos.moduloAlmacen) elementos.moduloAlmacen.value = normalizarTexto(resolverValor(configuracion, ['moduloAlmacen', 'estadoAlmacen'])) || '';

  if (elementos.ultimaModificacion) elementos.ultimaModificacion.value = normalizarTexto(resolverValor(configuracion, ['ultimaModificacion', 'usuarioModificacion', 'modificadoPor'])) || 'No disponible';
  if (elementos.usuarioResponsable) elementos.usuarioResponsable.value = normalizarTexto(resolverValor(configuracion, ['usuarioResponsable', 'responsable', 'usuarioModificador'])) || 'No disponible';
  if (elementos.fechaHoraConfig) elementos.fechaHoraConfig.value = normalizarTexto(resolverValor(configuracion, ['fechaHora', 'fechaModificacion', 'fechaActualizacion'])) || 'No disponible';
  if (elementos.estadoConfiguracion) elementos.estadoConfiguracion.value = normalizarTexto(resolverValor(configuracion, ['estadoConfiguracion', 'estado', 'estadoGeneral'])) || 'No disponible';
}

async function consultarConfiguracionSistema() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.consultarConfiguracion);
  if (!metodo) {
    mostrarMensaje('La conexión aún no expone la consulta de configuración del sistema.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo();
    const data = resolverObjetoRespuesta(respuesta);
    state.configuracion = data;
    completarCamposDesdeConfiguracion(data);
  } catch (error) {
    console.error('Error al consultar configuración del sistema:', error);
    mostrarMensaje('No fue posible cargar la configuración actual desde el backend.', 'error');
  }
}

async function consultarProductosMinimos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.consultarMinimos);
  if (!metodo) {
    return;
  }

  try {
    const respuesta = await metodo();
    state.productos = resolverListaRespuesta(respuesta);
  } catch (error) {
    console.error('Error al consultar mínimos por producto:', error);
    state.productos = [];
  }
}

function construirCambio(parametro, valorActual, valorNuevo, seccion) {
  return {
    parametro,
    valorActual,
    valorNuevo,
    seccion,
    timestamp: new Date().toISOString(),
  };
}

function obtenerCambiosPendientes() {
  const elementos = obtenerElementos();
  const cambios = [];

  const mapa = [
    ['nombreInstitucional', 'general', 'nombreInstitucional'],
    ['identificacionInstitucional', 'general', 'identificacionInstitucional'],
    ['region', 'general', 'region'],
    ['formatoFecha', 'general', 'formatoFecha'],
    ['zonaHoraria', 'general', 'zonaHoraria'],
    ['visualizacion', 'general', 'visualizacion'],
    ['anticipacionVencimiento', 'alertas', 'anticipacionVencimiento'],
    ['stockMinimo', 'alertas', 'stockMinimoMedicamento'],
    ['stockMinimoInsumo', 'alertas', 'stockMinimoInsumo'],
    ['alertaAgotado', 'alertas', 'alertaAgotado'],
    ['stockBajo', 'alertas', 'stockBajo'],
    ['inactividadSesion', 'seguridad', 'inactividadSesion'],
    ['bloqueoIntentos', 'seguridad', 'bloqueoIntentos'],
    ['autenticacionPermitida', 'seguridad', 'autenticacionPermitida'],
    ['proteccionSesiones', 'seguridad', 'proteccionSesiones'],
    ['moduloFarmacia', 'modulos', 'moduloFarmacia'],
    ['moduloAlmacen', 'modulos', 'moduloAlmacen'],
  ];

  mapa.forEach(([campoId, seccion, parametro]) => {
    const campo = elementos[campoId];
    if (!campo) return;

    const valorActual = resolverValor(state.configuracion, [parametro, campo.name]) ?? '';
    const valorNuevo = normalizarTexto(campo.value || '');
    if (valorNuevo && String(valorActual) !== String(valorNuevo)) {
      cambios.push(construirCambio(parametro, valorActual, valorNuevo, seccion));
    }
  });

  return cambios;
}

function validarCambio(parametro, valor) {
  const valorNormalizado = normalizarTexto(valor);

  if (parametro === 'inactividadSesion' || parametro === 'bloqueoIntentos') {
    const numero = Number(valorNormalizado);
    return Number.isFinite(numero) && numero > 0;
  }

  if (parametro === 'stockMinimoMedicamento' || parametro === 'stockMinimoInsumo' || parametro === 'anticipacionVencimiento' || parametro === 'alertaAgotado' || parametro === 'stockBajo') {
    const numero = Number(valorNormalizado);
    return Number.isFinite(numero) && numero >= 0;
  }

  return valorNormalizado !== '';
}

function renderCambiosPendientes() {
  state.cambiosPendientes = obtenerCambiosPendientes();
}

function confirmarGuardado() {
  renderCambiosPendientes();

  if (!state.cambiosPendientes.length) {
    mostrarMensaje('No hay cambios pendientes para guardar.', 'warning');
    return;
  }

  abrirModal();
}

async function guardarConfiguracion() {
  renderCambiosPendientes();

  if (!state.cambiosPendientes.length) {
    mostrarMensaje('No se encontraron cambios válidos para aplicar.', 'warning');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.actualizar);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada aún no expone la actualización de configuración.', 'warning');
    return;
  }

  const cambiosValidos = [];
  for (const cambio of state.cambiosPendientes) {
    if (!validarCambio(cambio.parametro, cambio.valorNuevo)) {
      mostrarMensaje(`El valor de ${cambio.parametro} no es válido para el backend.`, 'error');
      return;
    }
    cambiosValidos.push(cambio);
  }

  if (state.operacionEnCurso) {
    mostrarMensaje('Ya hay una operación de configuración en curso.', 'warning');
    return;
  }

  state.operacionEnCurso = true;
  mostrarMensaje('Enviando cambios al backend...', 'warning');

  try {
    const respuesta = await metodo({ cambios: cambiosValidos });
    const data = resolverObjetoRespuesta(respuesta);
    const resultado = resolverValor(data, ['mensaje', 'message', 'resultado']) || 'Configuración actualizada correctamente.';

    mostrarMensaje(String(resultado), 'success');
    await consultarConfiguracionSistema();
    await consultarProductosMinimos();
    cerrarModal();
  } catch (error) {
    console.error('Error al guardar cambios de configuración:', error);
    mostrarMensaje('Los cambios no fueron guardados. El backend rechazó la operación o hubo un error de conexión.', 'error');
  } finally {
    state.operacionEnCurso = false;
  }
}

function cancelarCambios() {
  const elementos = obtenerElementos();
  completarCamposDesdeConfiguracion(state.configuracion);
  mostrarMensaje('Se descartaron los cambios pendientes.', 'warning');

  if (elementos.btnGuardar) elementos.btnGuardar.blur();
  if (elementos.btnGuardarSecundario) elementos.btnGuardarSecundario.blur();
}

function enlazarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnGuardar) {
    elementos.btnGuardar.addEventListener('click', confirmarGuardado);
  }

  if (elementos.btnGuardarSecundario) {
    elementos.btnGuardarSecundario.addEventListener('click', confirmarGuardado);
  }

  if (elementos.btnCancelar) {
    elementos.btnCancelar.addEventListener('click', cancelarCambios);
  }

  if (elementos.btnConfirmar) {
    elementos.btnConfirmar.addEventListener('click', guardarConfiguracion);
  }

  document.querySelectorAll('[data-close-modal]').forEach((boton) => {
    boton.addEventListener('click', () => cerrarModal());
  });

  Object.values(elementos).forEach((elemento) => {
    if (!elemento || typeof elemento.addEventListener !== 'function') return;
    if (elemento.tagName === 'INPUT' || elemento.tagName === 'SELECT') {
      elemento.addEventListener('input', renderCambiosPendientes);
      elemento.addEventListener('change', renderCambiosPendientes);
    }
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrarModal();
  });
}

async function inicializar() {
  await cargarConexionSuperAdmin();
  const autorizado = await validarAccesoSuperAdmin();
  if (!autorizado) return;

  enlazarEventos();
  await consultarConfiguracionSistema();
  await consultarProductosMinimos();
  mostrarMensaje('Configuración cargada correctamente.', 'success');
}

inicializar();
