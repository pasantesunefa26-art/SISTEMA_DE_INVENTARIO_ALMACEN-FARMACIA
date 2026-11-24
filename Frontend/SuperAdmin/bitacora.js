import * as base from '../Compartidos/JS/base.js';
import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';

const state = {
  conexion: null,
  paginaActual: 1,
  registrosPorPagina: 15,
  filtros: {
    usuario: '',
    rol: '',
    departamento: '',
    modulo: '',
    operacion: '',
    fechaInicio: '',
    fechaFin: '',
    resultado: '',
  },
  estadisticas: {
    totalEventos: 0,
    loginsExitosos: 0,
    loginsFallidos: 0,
    eventosAdmin: 0,
    eventosFarmacia: 0,
    eventosAlmacen: 0,
    eventosSeguridad: 0,
  },
  eventos: [],
  detalleEvento: null,
  accesoValidado: false,
};

const NOMBRES_CONEXION = {
  estadisticas: ['obtenerEstadisticasBitacora', 'obtenerResumenBitacora', 'obtenerEstadisticasSistema'],
  listar: ['obtenerEventosBitacora', 'listarBitacora', 'consultarBitacora', 'consultarEventosBitacora'],
  detalle: ['obtenerDetalleEventoBitacora', 'obtenerEventoBitacora', 'consultarDetalleEvento'],
  exportar: ['exportarBitacora', 'exportarEventosBitacora', 'descargarBitacora'],
};

function obtenerElementos() {
  return {
    totalEventos: document.getElementById('bitacora-total-eventos'),
    loginExitoso: document.getElementById('bitacora-login-exitoso'),
    loginFallido: document.getElementById('bitacora-login-fallido'),
    admin: document.getElementById('bitacora-eventos-admin'),
    farmacia: document.getElementById('bitacora-eventos-farmacia'),
    almacen: document.getElementById('bitacora-eventos-almacen'),
    filtroUsuario: document.getElementById('filtro-usuario'),
    filtroRol: document.getElementById('filtro-rol'),
    filtroDepartamento: document.getElementById('filtro-departamento'),
    filtroModulo: document.getElementById('filtro-modulo'),
    filtroOperacion: document.getElementById('filtro-operacion'),
    filtroFechaInicio: document.getElementById('filtro-fecha-inicio'),
    filtroFechaFin: document.getElementById('filtro-fecha-fin'),
    filtroResultado: document.getElementById('filtro-resultado'),
    btnBuscar: document.getElementById('btn-buscar-bitacora'),
    btnLimpiar: document.getElementById('btn-limpiar-filtros'),
    btnExportar: document.getElementById('btn-exportar-bitacora'),
    filtrosActivos: document.getElementById('bitacora-filtros-activos'),
    tablaBody: document.querySelector('#tabla-bitacora tbody'),
    paginacionInfo: document.querySelector('.app-superadmin-page-info'),
    prev: document.querySelector('[data-page="prev"]'),
    next: document.querySelector('[data-page="next"]'),
    modal: document.getElementById('modal-detalle-evento'),
    modalContenido: document.getElementById('detalle-evento-contenido'),
  };
}

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

function formatearNumero(valor) {
  const numero = Number(valor ?? 0);
  if (Number.isNaN(numero)) return '0';
  return new Intl.NumberFormat('es-ES').format(numero);
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

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch {
    state.conexion = null;
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
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/login.html';
    window.location.assign(destino);
    return false;
  }
}

function resolverRespuestaArray(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (!respuesta || typeof respuesta !== 'object') return [];

  const claves = ['data', 'items', 'registros', 'resultado', 'eventos'];
  for (const clave of claves) {
    if (Array.isArray(respuesta[clave])) return respuesta[clave];
  }

  return [];
}

function resolverObjetoRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return {};
  if (Array.isArray(respuesta)) return {};
  return respuesta;
}

function aplicarFiltrosAConsulta() {
  const elementos = obtenerElementos();
  state.filtros.usuario = normalizarTexto(elementos.filtroUsuario?.value || '');
  state.filtros.rol = normalizarTexto(elementos.filtroRol?.value || '');
  state.filtros.departamento = normalizarTexto(elementos.filtroDepartamento?.value || '');
  state.filtros.modulo = normalizarTexto(elementos.filtroModulo?.value || '');
  state.filtros.operacion = normalizarTexto(elementos.filtroOperacion?.value || '');
  state.filtros.fechaInicio = normalizarTexto(elementos.filtroFechaInicio?.value || '');
  state.filtros.fechaFin = normalizarTexto(elementos.filtroFechaFin?.value || '');
  state.filtros.resultado = normalizarTexto(elementos.filtroResultado?.value || '');
  state.paginaActual = 1;
}

function obtenerFiltrosActivos() {
  const filtros = [];
  const { usuario, rol, departamento, modulo, operacion, fechaInicio, fechaFin, resultado } = state.filtros;

  if (usuario) filtros.push(`Usuario: ${usuario}`);
  if (rol) filtros.push(`Rol: ${rol}`);
  if (departamento) filtros.push(`Departamento: ${departamento}`);
  if (modulo) filtros.push(`Módulo: ${modulo}`);
  if (operacion) filtros.push(`Operación: ${operacion}`);
  if (fechaInicio) filtros.push(`Desde: ${fechaInicio}`);
  if (fechaFin) filtros.push(`Hasta: ${fechaFin}`);
  if (resultado) filtros.push(`Resultado: ${resultado}`);

  return filtros;
}

function renderFiltrosActivos() {
  const elementos = obtenerElementos();
  const filtros = obtenerFiltrosActivos();
  if (elementos.filtrosActivos) {
    elementos.filtrosActivos.textContent = filtros.length ? filtros.join(' • ') : 'Ninguno';
  }
}

function renderEstadisticas() {
  const elementos = obtenerElementos();
  if (elementos.totalEventos) elementos.totalEventos.textContent = formatearNumero(state.estadisticas.totalEventos);
  if (elementos.loginExitoso) elementos.loginExitoso.textContent = formatearNumero(state.estadisticas.loginsExitosos);
  if (elementos.loginFallido) elementos.loginFallido.textContent = formatearNumero(state.estadisticas.loginsFallidos);
  if (elementos.admin) elementos.admin.textContent = formatearNumero(state.estadisticas.eventosAdmin);
  if (elementos.farmacia) elementos.farmacia.textContent = formatearNumero(state.estadisticas.eventosFarmacia);
  if (elementos.almacen) elementos.almacen.textContent = formatearNumero(state.estadisticas.eventosAlmacen);
}

function obtenerEstadoClase(resultado) {
  const valor = normalizarTexto(resultado).toLowerCase();
  if (!valor || ['ok', 'exitoso', 'success', 'completado', 'aprobado'].includes(valor)) return 'success';
  if (['fallido', 'error', 'failed', 'rechazado', 'denegado', 'bloqueado'].includes(valor)) return 'error';
  if (['warning', 'advertencia', 'alerta', 'revocado', 'pendiente'].includes(valor)) return 'warning';
  return 'info';
}

function renderEventosTabla() {
  const elementos = obtenerElementos();

  if (!Array.isArray(state.eventos) || state.eventos.length === 0) {
    if (elementos.tablaBody) {
      elementos.tablaBody.innerHTML = '<tr><td colspan="10" class="app-superadmin-empty-state">No hay eventos registrados con los filtros actuales.</td></tr>';
    }
    if (elementos.paginacionInfo) {
      elementos.paginacionInfo.textContent = 'Página 1';
    }
    return;
  }

  const inicio = (state.paginaActual - 1) * state.registrosPorPagina;
  const fin = inicio + state.registrosPorPagina;
  const pagina = state.eventos.slice(inicio, fin);

  if (elementos.tablaBody) {
    elementos.tablaBody.innerHTML = pagina
      .map((evento) => {
        const id = evento?.idEvento || evento?.id || evento?.identificador || '—';
        const fecha = evento?.fechaHora || evento?.fecha || evento?.timestamp || '—';
        const usuario = evento?.usuario || evento?.usuarioResponsable || evento?.nombreUsuario || '—';
        const rol = evento?.rol || evento?.rolUsuario || '—';
        const departamento = evento?.departamento || evento?.area || '—';
        const modulo = evento?.modulo || evento?.aplicacion || '—';
        const operacion = evento?.tipoOperacion || evento?.operacion || evento?.accion || '—';
        const registro = evento?.registroAfectado || evento?.registro || evento?.entidad || '—';
        const resultado = evento?.resultado || evento?.estado || '—';
        const clase = obtenerEstadoClase(resultado);

        return `
          <tr>
            <td>${id}</td>
            <td>${fecha}</td>
            <td>${usuario}</td>
            <td>${rol}</td>
            <td>${departamento}</td>
            <td>${modulo}</td>
            <td>${operacion}</td>
            <td>${registro}</td>
            <td><span class="app-superadmin-resultado-chip ${clase}">${resultado}</span></td>
            <td><button type="button" class="app-superadmin-boton-detalle" data-evento-id="${id}">Ver detalle</button></td>
          </tr>
        `;
      })
      .join('');
  }

  if (elementos.paginacionInfo) {
    const totalPaginas = Math.max(1, Math.ceil(state.eventos.length / state.registrosPorPagina));
    elementos.paginacionInfo.textContent = `Página ${state.paginaActual} de ${totalPaginas}`;
  }
}

async function consultarEstadisticas() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.estadisticas);

  if (!metodo) {
    state.estadisticas = {
      totalEventos: 0,
      loginsExitosos: 0,
      loginsFallidos: 0,
      eventosAdmin: 0,
      eventosFarmacia: 0,
      eventosAlmacen: 0,
      eventosSeguridad: 0,
    };
    renderEstadisticas();
    return;
  }

  try {
    const respuesta = await metodo();
    const data = resolverObjetoRespuesta(respuesta);
    state.estadisticas = {
      totalEventos: Number(data.totalEventos ?? data.total ?? 0),
      loginsExitosos: Number(data.loginsExitosos ?? data.loginExitoso ?? 0),
      loginsFallidos: Number(data.loginsFallidos ?? data.loginFallido ?? 0),
      eventosAdmin: Number(data.eventosAdmin ?? data.administrativo ?? 0),
      eventosFarmacia: Number(data.eventosFarmacia ?? data.farmacia ?? 0),
      eventosAlmacen: Number(data.eventosAlmacen ?? data.almacen ?? 0),
      eventosSeguridad: Number(data.eventosSeguridad ?? data.seguridad ?? 0),
    };
    renderEstadisticas();
  } catch (error) {
    state.estadisticas = {
      totalEventos: 0,
      loginsExitosos: 0,
      loginsFallidos: 0,
      eventosAdmin: 0,
      eventosFarmacia: 0,
      eventosAlmacen: 0,
      eventosSeguridad: 0,
    };
    renderEstadisticas();
  }
}

async function consultarEventos() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.listar);
  if (!metodo) {
    state.eventos = [];
    renderEventosTabla();
    return;
  }

  try {
    const respuesta = await metodo({
      ...state.filtros,
      pagina: state.paginaActual,
      tamaño: state.registrosPorPagina,
    });

    const datos = resolverRespuestaArray(respuesta);
    state.eventos = Array.isArray(datos) ? datos : [];
    renderEventosTabla();
  } catch (error) {
    state.eventos = [];
    renderEventosTabla();
  }
}

async function consultarDetalleEvento(idEvento) {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.detalle);
  if (!metodo) {
    state.detalleEvento = null;
    return;
  }

  try {
    const respuesta = await metodo({ id: idEvento });
    const dato = resolverObjetoRespuesta(respuesta);
    state.detalleEvento = dato;
    renderDetalleEvento();
  } catch (error) {
    state.detalleEvento = null;
    renderDetalleEvento();
  }
}

function renderDetalleEvento() {
  const elementos = obtenerElementos();
  if (!elementos.modalContenido) return;

  if (!state.detalleEvento) {
    elementos.modalContenido.innerHTML = '<p class="app-superadmin-empty-state">No fue posible consultar el detalle del evento.</p>';
    return;
  }

  const evento = state.detalleEvento;
  const info = [
    ['ID del evento', evento.idEvento || evento.id || evento.identificador || '—'],
    ['Fecha y hora', evento.fechaHora || evento.fecha || evento.timestamp || '—'],
    ['Usuario responsable', evento.usuario || evento.usuarioResponsable || '—'],
    ['Rol', evento.rol || evento.rolUsuario || '—'],
    ['Departamento', evento.departamento || evento.area || '—'],
    ['Tipo de operación', evento.tipoOperacion || evento.operacion || evento.accion || '—'],
    ['Módulo', evento.modulo || evento.aplicacion || '—'],
    ['Registro afectado', evento.registroAfectado || evento.registro || evento.entidad || '—'],
    ['Resultado', evento.resultado || evento.estado || '—'],
    ['Motivo', evento.motivo || evento.descripcion || 'Sin motivo registrado'],
    ['Dirección IP', evento.ip || evento.direccionIp || 'No disponible'],
    ['Dispositivo', evento.dispositivo || evento.device || 'No disponible'],
  ];

  const valoresAntes = evento.valoresAnteriores || evento.antes || evento.anterior || null;
  const valoresDespues = evento.valoresPosteriores || evento.despues || evento.posterior || null;

  const html = `
    <div class="app-superadmin-detalle-grid">
      ${info
        .map(
          ([label, valor]) => `
            <div class="app-superadmin-detalle-item">
              <small>${label}</small>
              <strong>${normalizarTexto(valor) || '—'}</strong>
            </div>
          `
        )
        .join('')}
    </div>

    <div class="app-superadmin-detalle-seccion">
      <h4>Valores anteriores y posteriores</h4>
      <div class="app-superadmin-comparacion">
        <div class="app-superadmin-comparacion-card">
          <h5>Anterior</h5>
          <pre>${JSON.stringify(valoresAntes ?? {}, null, 2) || 'No se registraron cambios previos.'}</pre>
        </div>
        <div class="app-superadmin-comparacion-card">
          <h5>Posterior</h5>
          <pre>${JSON.stringify(valoresDespues ?? {}, null, 2) || 'No se registraron cambios posteriores.'}</pre>
        </div>
      </div>
    </div>
  `;

  elementos.modalContenido.innerHTML = html;
}

function abrirModalEvento(idEvento) {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;

  elementos.modal.classList.add('is-open');
  elementos.modal.setAttribute('aria-hidden', 'false');
  consultarDetalleEvento(idEvento);
}

function cerrarModalEvento() {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;

  elementos.modal.classList.remove('is-open');
  elementos.modal.setAttribute('aria-hidden', 'true');
}

async function exportarBitacora() {
  const metodo = obtenerMetodoConexion(NOMBRES_CONEXION.exportar);
  if (!metodo) {
    window.alert('La exportación de la bitácora no está disponible en el backend.');
    return;
  }

  try {
    const respuesta = await metodo({
      ...state.filtros,
      formato: 'csv',
    });

    if (respuesta && respuesta.url) {
      const enlace = document.createElement('a');
      enlace.href = respuesta.url;
      enlace.download = 'bitacora-superadmin.csv';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      return;
    }

    if (respuesta && respuesta.data) {
      const blob = new Blob([respuesta.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'bitacora-superadmin.csv';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      return;
    }

    window.alert('La exportación se ejecutó, pero el backend no devolvió un archivo descargable.');
  } catch (error) {
    window.alert('No se pudo exportar la bitácora. Verifique sus permisos o la conexión con el servicio.');
  }
}

async function recargarDatos() {
  renderFiltrosActivos();
  await consultarEstadisticas();
  await consultarEventos();
}

function prepararSelectsDesdeCatalogos() {
  const elementos = obtenerElementos();
  const opciones = [
    { id: elementos.filtroRol, values: ['SUPERADMIN', 'JEFE_FARMACIA', 'JEFE_ALMACEN', 'TRABAJADOR_FARMACIA', 'TRABAJADOR_ALMACEN'] },
    { id: elementos.filtroDepartamento, values: ['FARMACIA', 'ALMACEN', 'SISTEMAS'] },
    { id: elementos.filtroModulo, values: ['FARMACIA', 'ALMACEN', 'ADMINISTRACION', 'SEGURIDAD', 'CONFIGURACION'] },
    { id: elementos.filtroOperacion, values: ['LOGIN', 'LOGIN_FALLIDO', 'CREAR', 'EDITAR', 'ELIMINAR', 'TRANSFERENCIA', 'DESPACHO', 'AJUSTE', 'EXPORTAR'] },
    { id: elementos.filtroResultado, values: ['EXITOSO', 'FALLIDO', 'BLOQUEADO', 'REVOCADO', 'PENDIENTE'] },
  ];

  for (const config of opciones) {
    if (!config.id) continue;
    const values = config.values || [];
    config.id.innerHTML = '<option value="">Todos</option>' + values.map((value) => `<option value="${value}">${value}</option>`).join('');
  }
}

function inicializarEventos() {
  const elementos = obtenerElementos();

  if (elementos.btnBuscar) {
    elementos.btnBuscar.addEventListener('click', async () => {
      aplicarFiltrosAConsulta();
      await consultarEventos();
      renderFiltrosActivos();
    });
  }

  if (elementos.btnLimpiar) {
    elementos.btnLimpiar.addEventListener('click', () => {
      state.filtros = {
        usuario: '',
        rol: '',
        departamento: '',
        modulo: '',
        operacion: '',
        fechaInicio: '',
        fechaFin: '',
        resultado: '',
      };

      if (elementos.filtroUsuario) elementos.filtroUsuario.value = '';
      if (elementos.filtroRol) elementos.filtroRol.value = '';
      if (elementos.filtroDepartamento) elementos.filtroDepartamento.value = '';
      if (elementos.filtroModulo) elementos.filtroModulo.value = '';
      if (elementos.filtroOperacion) elementos.filtroOperacion.value = '';
      if (elementos.filtroFechaInicio) elementos.filtroFechaInicio.value = '';
      if (elementos.filtroFechaFin) elementos.filtroFechaFin.value = '';
      if (elementos.filtroResultado) elementos.filtroResultado.value = '';

      state.paginaActual = 1;
      renderFiltrosActivos();
      consultarEventos();
    });
  }

  if (elementos.btnExportar) {
    elementos.btnExportar.addEventListener('click', exportarBitacora);
  }

  if (elementos.prev) {
    elementos.prev.addEventListener('click', async () => {
      if (state.paginaActual > 1) {
        state.paginaActual -= 1;
        await consultarEventos();
      }
    });
  }

  if (elementos.next) {
    elementos.next.addEventListener('click', async () => {
      const totalPaginas = Math.max(1, Math.ceil((state.eventos?.length || 0) / state.registrosPorPagina));
      if (state.paginaActual < totalPaginas) {
        state.paginaActual += 1;
        await consultarEventos();
      }
    });
  }

  if (elementos.tablaBody) {
    elementos.tablaBody.addEventListener('click', (event) => {
      const boton = event.target.closest('[data-evento-id]');
      if (!boton) return;
      abrirModalEvento(boton.dataset.eventoId);
    });
  }

  if (elementos.modal) {
    elementos.modal.addEventListener('click', (event) => {
      if (event.target === elementos.modal) cerrarModalEvento();
    });
  }

  document.querySelectorAll('[data-close-modal="detalle"]').forEach((boton) => {
    boton.addEventListener('click', cerrarModalEvento);
  });
}

async function inicializar() {
  await cargarConexionSuperAdmin();
  const autorizado = await validarAccesoSuperAdmin();
  if (!autorizado) return;

  prepararSelectsDesdeCatalogos();
  inicializarEventos();
  renderFiltrosActivos();
  await recargarDatos();
}

document.addEventListener('DOMContentLoaded', inicializar);
