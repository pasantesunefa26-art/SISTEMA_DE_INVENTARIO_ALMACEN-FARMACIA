import * as base from '../Compartidos/JS/base.js';
import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';

const state = {
  conexion: null,
  accesoValidado: false,
  historial: [],
  respaldoSeleccionado: null,
  solicitudRestauracionEnCurso: false,
};

const NOMBRES_CONEXION = {
  estadoGeneral: [
    'obtenerEstadoGeneralRespaldos',
    'obtenerResumenRespaldos',
    'consultarEstadoRespaldos',
    'obtenerEstadoRespaldos',
    'consultarResumenRespaldos',
  ],
  historial: [
    'obtenerHistorialRespaldos',
    'listarRespaldos',
    'consultarRespaldos',
    'obtenerRespaldos',
    'listarHistorialRespaldos',
  ],
  detalle: [
    'obtenerDetalleRespaldo',
    'consultarDetalleRespaldo',
    'obtenerDetalleBackup',
    'consultarRespaldo',
    'obtenerRespaldoPorId',
  ],
  crear: [
    'crearRespaldo',
    'crearCopiaSeguridad',
    'generarRespaldo',
    'solicitarRespaldo',
  ],
  verificar: [
    'verificarRespaldo',
    'verificarCopiaSeguridad',
    'comprobarRespaldo',
  ],
  descargar: [
    'descargarRespaldo',
    'descargarCopiaSeguridad',
    'obtenerArchivoRespaldo',
  ],
  restaurar: [
    'solicitarRestauracionRespaldo',
    'restaurarRespaldo',
    'iniciarRestauracion',
    'solicitarRestauracion',
  ],
  resultadoRestauracion: [
    'consultarResultadoRestauracion',
    'obtenerEstadoRestauracion',
    'consultarRestauracion',
    'obtenerResultadoRestauracion',
  ],
};

function obtenerElementos() {
  return {
    ultimoEstado: document.getElementById('respaldo-ultimo-estado'),
    ultimaFecha: document.getElementById('respaldo-ultima-fecha'),
    totalDisponibles: document.getElementById('respaldo-total-disponibles'),
    espacioOcupado: document.getElementById('respaldo-espacio-ocupado'),
    estadoExterno: document.getElementById('respaldo-estado-externo'),
    ultimaVerificacion: document.getElementById('respaldo-ultima-verificacion'),
    tablaBody: document.querySelector('#tabla-respaldos tbody'),
    mensaje: document.getElementById('mensaje-respaldos'),
    btnCrear: document.getElementById('btn-crear-respaldo'),
    btnVerificar: document.getElementById('btn-verificar-respaldo'),
    btnRestaurar: document.getElementById('btn-restaurar-respaldo'),
    modalDetalle: document.getElementById('modal-detalle-respaldo'),
    detalleContenido: document.getElementById('detalle-respaldo-contenido'),
    modalConfirmacion: document.getElementById('modal-confirmar-restauracion'),
    btnConfirmarRestauracion: document.getElementById('btn-confirmar-restauracion'),
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
      if (raw) {
        const usuario = JSON.parse(raw);
        if (usuario) return usuario;
      }
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

function resolverListaRespuesta(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!respuesta || typeof respuesta !== 'object') return [];

  const rutas = ['data', 'items', 'registros', 'resultado', 'respaldos', 'backups'];
  for (const clave of rutas) {
    if (Array.isArray(respuesta[clave])) return respuesta[clave];
  }

  return [];
}

function resolverObjetoRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return {};
  if (Array.isArray(respuesta)) return {};
  return respuesta;
}

function formatearFecha(fechaValor) {
  const valor = normalizarTexto(fechaValor);
  if (!valor) return 'No disponible';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

function formatearBytes(valor) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero) || numero <= 0) return '0 MB';

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let tamano = numero;
  let indice = 0;

  while (tamano >= 1024 && indice < unidades.length - 1) {
    tamano /= 1024;
    indice += 1;
  }

  return `${tamano.toFixed(tamano >= 10 || indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch (error) {
    state.conexion = null;
    console.warn('No se pudo cargar la conexión de SuperAdmin para respaldos:', error);
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

      if (!resultado || !resultado.usuario) {
        throw new Error('Sesión inválida');
      }

      const rol = typeof controlSesion.obtenerRolUsuario === 'function'
        ? controlSesion.obtenerRolUsuario(resultado.usuario)
        : '';

      if (rol !== controlSesion.ROLES?.SUPERADMIN) {
        throw new Error('Acceso no autorizado');
      }

      state.accesoValidado = true;
      return true;
    }

    const usuario = obtenerUsuarioDesdeSesion();
    const rol = usuario && typeof controlSesion.obtenerRolUsuario === 'function'
      ? controlSesion.obtenerRolUsuario(usuario)
      : '';

    if (!usuario || rol !== controlSesion.ROLES?.SUPERADMIN) {
      throw new Error('Acceso no autorizado');
    }

    state.accesoValidado = true;
    return true;
  } catch (error) {
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/index.html';
    window.location.assign(destino);
    return false;
  }
}

function mostrarMensaje(texto, tipo = 'info') {
  const elementos = obtenerElementos();
  const nodo = elementos.mensaje;
  if (!nodo) return;

  nodo.textContent = texto;
  nodo.classList.remove('is-success', 'is-warning', 'is-error');

  if (tipo === 'success') nodo.classList.add('is-success');
  if (tipo === 'warning') nodo.classList.add('is-warning');
  if (tipo === 'error') nodo.classList.add('is-error');
}

function abrirModal(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function cerrarModal(idModal) {
  const modal = document.getElementById(idModal);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function asegurarIdRespaldo(respaldo) {
  if (!respaldo || typeof respaldo !== 'object') return null;

  const claves = ['id', 'identificador', 'codigo', 'backupId', 'respaldoId'];
  for (const clave of claves) {
    if (respaldo[clave] !== undefined && respaldo[clave] !== null && respaldo[clave] !== '') {
      return respaldo[clave];
    }
  }

  return null;
}

function crearBadgeEstado(estado) {
  const valor = normalizarTexto(estado || '').toLowerCase();

  const mapa = {
    'en proceso': 'app-superadmin-estado-badge--en-proceso',
    'en-proceso': 'app-superadmin-estado-badge--en-proceso',
    'completado': 'app-superadmin-estado-badge--completado',
    'verificado': 'app-superadmin-estado-badge--verificado',
    'fallido': 'app-superadmin-estado-badge--fallido',
    'pendiente': 'app-superadmin-estado-badge--pendiente',
    'pendiente de verificacion': 'app-superadmin-estado-badge--verificacion-pendiente',
    'pendiente de verificación': 'app-superadmin-estado-badge--verificacion-pendiente',
    'restaurado': 'app-superadmin-estado-badge--restaurado',
    'alerta': 'app-superadmin-estado-badge--alerta',
  };

  const texto = normalizarTexto(estado) || 'Sin estado';
  const clase = mapa[valor] || 'app-superadmin-estado-badge--en-proceso';

  const span = document.createElement('span');
  span.className = `app-superadmin-estado-badge ${clase}`;
  span.textContent = texto;
  return span;
}

function renderDetalleRespaldo(respaldo) {
  const elementos = obtenerElementos();
  const contenedor = elementos.detalleContenido;
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!respaldo || typeof respaldo !== 'object') {
    contenedor.innerHTML = '<p class="app-superadmin-empty-state">No hay información disponible.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'app-superadmin-detalle-grid';

  const detalle = [
    { label: 'Identificador', value: asegurarIdRespaldo(respaldo) || 'No disponible' },
    { label: 'Tipo', value: resolverValor(respaldo, ['tipo', 'tipoRespaldo', 'clase', 'categoria']) || 'No disponible' },
    { label: 'Fecha', value: formatearFecha(resolverValor(respaldo, ['fecha', 'fechaCreacion', 'fechaHora', 'timestamp'])) },
    { label: 'Tamaño', value: formatearBytes(resolverValor(respaldo, ['tamano', 'tamanio', 'size', 'bytes'])) },
    { label: 'Destino', value: resolverValor(respaldo, ['destino', 'almacenDestino', 'rutaDestino', 'ubicacion']) || 'No disponible' },
    { label: 'Estado', value: resolverValor(respaldo, ['estado', 'estadoRespaldo', 'resultado']) || 'No disponible' },
    { label: 'Verificación', value: resolverValor(respaldo, ['verificacion', 'resultadoVerificacion', 'estadoVerificacion']) || 'No disponible' },
    { label: 'Copia externa', value: resolverValor(respaldo, ['copiaExterna', 'almacenamientoExterno', 'estadoExterno']) || 'No disponible' },
  ];

  detalle.forEach((item) => {
    const bloque = document.createElement('div');
    bloque.className = 'app-superadmin-detalle-item';

    const label = document.createElement('span');
    label.textContent = item.label;

    const value = document.createElement('strong');
    value.textContent = item.value;

    bloque.append(label, value);
    grid.appendChild(bloque);
  });

  const lista = document.createElement('ul');
  lista.className = 'app-superadmin-detalle-lista';

  const cobertura = resolverValor(respaldo, ['cobertura', 'catalogo', 'datosCubiertos', 'almacenesCubiertos']);
  const coberturaTexto = Array.isArray(cobertura) ? cobertura : [cobertura || 'Cobertura no reportada'];
  coberturaTexto.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item && typeof item === 'object' ? JSON.stringify(item) : String(item);
    lista.appendChild(li);
  });

  const advertencia = document.createElement('div');
  advertencia.className = 'app-superadmin-respaldos-warning-box';
  advertencia.textContent = 'La restauración requiere confirmación explícita y autorización del backend antes de ejecutarse.';

  contenedor.append(grid, advertencia, lista);
}

function renderTablaHistorial() {
  const elementos = obtenerElementos();
  const cuerpo = elementos.tablaBody;

  if (!cuerpo) return;

  if (!state.historial.length) {
    cuerpo.innerHTML = '<tr><td colspan="10" class="app-superadmin-empty-state">No se encontraron respaldos autorizados.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';

  state.historial.forEach((respaldo) => {
    const fila = document.createElement('tr');
    const id = asegurarIdRespaldo(respaldo) || '—';

    const celdas = [
      id,
      resolverValor(respaldo, ['tipo', 'tipoRespaldo', 'clase']) || '—',
      formatearFecha(resolverValor(respaldo, ['fecha', 'fechaCreacion', 'fechaHora', 'timestamp'])) || '—',
      formatearBytes(resolverValor(respaldo, ['tamano', 'tamanio', 'size', 'bytes'])),
      resolverValor(respaldo, ['destino', 'almacenDestino', 'rutaDestino']) || '—',
      '',
      resolverValor(respaldo, ['verificacion', 'resultadoVerificacion', 'estadoVerificacion']) || '—',
      resolverValor(respaldo, ['copiaExterna', 'estadoExterno', 'almacenamientoExterno']) || '—',
      resolverValor(respaldo, ['responsable', 'usuarioResponsable', 'realizadoPor']) || '—',
      '',
    ];

    celdas.forEach((valor, indice) => {
      const celda = document.createElement('td');
      const contenido = document.createElement('div');

      if (indice === 5) {
        const badge = crearBadgeEstado(resolverValor(respaldo, ['estado', 'estadoRespaldo', 'resultado']));
        celda.appendChild(badge);
      } else if (indice === 9) {
        const grupo = document.createElement('div');
        grupo.className = 'app-superadmin-actions-row';

        const btnDetalle = document.createElement('button');
        btnDetalle.type = 'button';
        btnDetalle.className = 'mini-btn';
        btnDetalle.textContent = 'Detalle';
        btnDetalle.addEventListener('click', () => abrirDetalleRespaldo(respaldo));

        const btnDescargar = document.createElement('button');
        btnDescargar.type = 'button';
        btnDescargar.className = 'mini-btn';
        btnDescargar.textContent = 'Descargar';
        btnDescargar.addEventListener('click', () => descargarRespaldo(respaldo));

        const btnRestaurar = document.createElement('button');
        btnRestaurar.type = 'button';
        btnRestaurar.className = 'mini-btn';
        btnRestaurar.textContent = 'Restaurar';
        btnRestaurar.addEventListener('click', () => abrirConfirmacionRestauracion(respaldo));

        grupo.append(btnDetalle, btnDescargar, btnRestaurar);
        celda.appendChild(grupo);
      } else {
        contenido.textContent = valor;
        celda.appendChild(contenido);
      }

      fila.appendChild(celda);
    });

    cuerpo.appendChild(fila);
  });
}

function normalizarEstadoGeneral(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return {};
  const objeto = respuesta.data && typeof respuesta.data === 'object' && !Array.isArray(respuesta.data)
    ? respuesta.data
    : respuesta;

  return objeto;
}

function actualizarTarjetasEstadoGeneral(respuesta) {
  const elementos = obtenerElementos();
  const data = normalizarEstadoGeneral(respuesta);

  if (!elementos.ultimoEstado || !elementos.ultimaFecha || !elementos.totalDisponibles || !elementos.espacioOcupado || !elementos.estadoExterno || !elementos.ultimaVerificacion) {
    return;
  }

  elementos.ultimoEstado.textContent = resolverValor(data, ['ultimoEstado', 'estado', 'estadoUltimoRespaldo', 'estadoGeneral']) || 'No disponible';
  elementos.ultimaFecha.textContent = formatearFecha(resolverValor(data, ['ultimaFecha', 'fechaUltimoRespaldo', 'fechaHora', 'timestamp']));
  elementos.totalDisponibles.textContent = String(resolverValor(data, ['cantidadDisponibles', 'totalDisponibles', 'copiasDisponibles']) ?? '0');
  elementos.espacioOcupado.textContent = formatearBytes(resolverValor(data, ['espacioOcupado', 'usoEspacio', 'tamanoUtilizado']));
  elementos.estadoExterno.textContent = resolverValor(data, ['estadoExterno', 'sincronizacionExterna', 'almacenamientoExterno']) || 'No disponible';
  elementos.ultimaVerificacion.textContent = formatearFecha(resolverValor(data, ['ultimaVerificacion', 'fechaVerificacion', 'fechaUltimaVerificacion'])) || 'No disponible';
}

async function consultarEstadoGeneral() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.estadoGeneral);
  if (!metodo) {
    mostrarMensaje('La conexión debe exponer la consulta del estado general del respaldo antes de mostrar datos.', 'warning');
    return;
  }

  try {
    const resultado = await metodo();
    const data = resolverObjetoRespuesta(resultado);
    actualizarTarjetasEstadoGeneral(data);
  } catch (error) {
    console.error('Error al consultar el estado general de respaldos:', error);
    mostrarMensaje('No fue posible consultar el estado general de los respaldos.', 'error');
  }
}

async function consultarHistorialRespaldos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.historial);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada aún no expone el historial de respaldos para esta pantalla.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo({ limite: 50, pagina: 1 });
    const lista = resolverListaRespuesta(respuesta);
    state.historial = Array.isArray(lista) ? lista : [];
    renderTablaHistorial();
  } catch (error) {
    console.error('Error al consultar el historial de respaldos:', error);
    mostrarMensaje('No se pudo cargar el historial de respaldos desde el backend.', 'error');
    state.historial = [];
    renderTablaHistorial();
  }
}

async function abrirDetalleRespaldo(respaldo) {
  const id = asegurarIdRespaldo(respaldo);
  if (!id) {
    mostrarMensaje('Debe seleccionar un respaldo válido para ver su detalle.', 'warning');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.detalle);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada aún no expone el detalle del respaldo.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo(id);
    const detalle = resolverObjetoRespuesta(respuesta);
    state.respaldoSeleccionado = detalle && Object.keys(detalle).length ? detalle : respaldo;
    renderDetalleRespaldo(state.respaldoSeleccionado);
    abrirModal('modal-detalle-respaldo');
  } catch (error) {
    console.error('Error al consultar el detalle del respaldo:', error);
    mostrarMensaje('No fue posible consultar el detalle del respaldo solicitado.', 'error');
  }
}

async function solicitarCreacionRespaldo() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.crear);
  if (!metodo) {
    mostrarMensaje('La conexión no expone la operación de creación manual de respaldo en este momento.', 'warning');
    return;
  }

  const confirmado = window.confirm('¿Desea solicitar la creación de un nuevo respaldo? La solicitud se procesará por el backend.');
  if (!confirmado) return;

  try {
    const respuesta = await metodo({ tipo: 'completa', autorizacion: 'superadmin' });
    const data = resolverObjetoRespuesta(respuesta);
    const mensaje = resolverValor(data, ['mensaje', 'message', 'resultado', 'estado']) || 'Solicitud de respaldo enviada al backend.';
    mostrarMensaje(String(mensaje), 'success');
    await consultarEstadoGeneral();
    await consultarHistorialRespaldos();
  } catch (error) {
    console.error('Error al crear respaldo:', error);
    mostrarMensaje('La solicitud de creación de respaldo fue rechazada por el backend.', 'error');
  }
}

async function verificarRespaldoActual() {
  const respaldo = state.respaldoSeleccionado || state.historial[0];
  const id = asegurarIdRespaldo(respaldo);

  if (!id) {
    mostrarMensaje('No hay un respaldo seleccionado para verificar.', 'warning');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.verificar);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada no expone la verificación de respaldos.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo(id);
    const data = resolverObjetoRespuesta(respuesta);
    const mensaje = resolverValor(data, ['mensaje', 'message', 'resultado']) || 'Verificación solicitada con éxito.';
    mostrarMensaje(String(mensaje), 'success');
    await consultarHistorialRespaldos();
    await consultarEstadoGeneral();
  } catch (error) {
    console.error('Error al verificar respaldo:', error);
    mostrarMensaje('La verificación del respaldo falló o fue rechazada.', 'error');
  }
}

async function descargarRespaldo(respaldo) {
  const id = asegurarIdRespaldo(respaldo);
  if (!id) {
    mostrarMensaje('Debe seleccionar un respaldo con identificador válido para descargarlo.', 'warning');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.descargar);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada no expone la descarga autorizada del respaldo.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo(id);
    const data = resolverObjetoRespuesta(respuesta);
    const urlDescarga = resolverValor(data, ['url', 'downloadUrl', 'archivoUrl', 'ruta']) || null;

    if (!urlDescarga) {
      mostrarMensaje('El backend no devolvió un enlace de descarga válido para este respaldo.', 'warning');
      return;
    }

    const link = document.createElement('a');
    link.href = urlDescarga;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();

    mostrarMensaje('Descarga autorizada iniciada correctamente.', 'success');
  } catch (error) {
    console.error('Error al descargar respaldo:', error);
    mostrarMensaje('La descarga solicitada fue rechazada o falló por un error de acceso.', 'error');
  }
}

function abrirConfirmacionRestauracion(respaldo) {
  const id = asegurarIdRespaldo(respaldo);
  if (!id) {
    mostrarMensaje('Debe seleccionar un respaldo válido para restaurar.', 'warning');
    return;
  }

  state.respaldoSeleccionado = respaldo;
  abrirModal('modal-confirmar-restauracion');
}

async function consultarResultadoRestauracion(idRespaldo) {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.resultadoRestauracion);
  if (!metodo) {
    mostrarMensaje('La conexión no reporta el resultado de la restauración.', 'warning');
    return;
  }

  try {
    const respuesta = await metodo(idRespaldo);
    const data = resolverObjetoRespuesta(respuesta);
    const mensaje = resolverValor(data, ['mensaje', 'status', 'resultado', 'estado']) || 'Resultado de restauración actualizado desde el backend.';
    mostrarMensaje(String(mensaje), 'success');
    await consultarHistorialRespaldos();
    await consultarEstadoGeneral();
  } catch (error) {
    console.error('Error al consultar resultado de restauración:', error);
    mostrarMensaje('La restauración fue iniciada, pero el estado final aún no fue confirmado.', 'warning');
  }
}

async function solicitarRestauracion() {
  const respaldo = state.respaldoSeleccionado || state.historial[0];
  const idRespaldo = asegurarIdRespaldo(respaldo);
  if (!idRespaldo) {
    mostrarMensaje('No hay un respaldo válido para restaurar.', 'warning');
    return;
  }

  if (state.solicitudRestauracionEnCurso) {
    mostrarMensaje('Ya existe una restauración en curso para este respaldo.', 'warning');
    return;
  }

  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.restaurar);
  if (!metodo) {
    mostrarMensaje('La conexión centralizada aún no expone la operación de restauración.', 'warning');
    return;
  }

  state.solicitudRestauracionEnCurso = true;
  mostrarMensaje('Solicitando restauración protegida por el backend...', 'warning');

  try {
    const respuesta = await metodo(idRespaldo, { confirmar: true, autorizacion: 'superadmin' });
    const data = resolverObjetoRespuesta(respuesta);
    const mensaje = resolverValor(data, ['mensaje', 'message', 'resultado']) || 'Restauración enviada al backend para revisión.';
    mostrarMensaje(String(mensaje), 'warning');
    cerrarModal('modal-confirmar-restauracion');
    await consultarResultadoRestauracion(idRespaldo);
  } catch (error) {
    console.error('Error al solicitar restauración:', error);
    mostrarMensaje('La restauración fue rechazada o falló por una validación del backend.', 'error');
  } finally {
    state.solicitudRestauracionEnCurso = false;
  }
}

function enlazarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnCrear) {
    elementos.btnCrear.addEventListener('click', solicitarCreacionRespaldo);
  }

  if (elementos.btnVerificar) {
    elementos.btnVerificar.addEventListener('click', verificarRespaldoActual);
  }

  if (elementos.btnRestaurar) {
    elementos.btnRestaurar.addEventListener('click', () => {
      const respaldo = state.respaldoSeleccionado || state.historial[0];
      if (!respaldo) {
        mostrarMensaje('No hay un respaldo disponible para restaurar.', 'warning');
        return;
      }
      abrirConfirmacionRestauracion(respaldo);
    });
  }

  if (elementos.btnConfirmarRestauracion) {
    elementos.btnConfirmarRestauracion.addEventListener('click', solicitarRestauracion);
  }

  document.querySelectorAll('[data-close-modal]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const clave = boton.dataset.closeModal;
      if (clave) cerrarModal(`modal-${clave}`);
    });
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      cerrarModal('modal-detalle-respaldo');
      cerrarModal('modal-confirmar-restauracion');
    }
  });
}

async function inicializar() {
  await cargarConexionSuperAdmin();
  const autorizado = await validarAccesoSuperAdmin();
  if (!autorizado) return;

  enlazarEventos();
  await consultarEstadoGeneral();
  await consultarHistorialRespaldos();
}

inicializar();
