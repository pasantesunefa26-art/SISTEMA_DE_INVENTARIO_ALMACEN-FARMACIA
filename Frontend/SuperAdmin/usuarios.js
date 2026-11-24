const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';
const MODULOS_COMPARTIDOS = {
  base: '../Compartidos/JS/base.js',
  validaciones: '../Compartidos/JS/validaciones.js',
  formularios: '../Compartidos/JS/formularios.js',
  listasBuscables: '../Compartidos/JS/listas-buscables.js',
  controlSesion: '../Compartidos/JS/control-sesion.js',
};

const state = {
  conexion: null,
  modulos: {},
  usuarios: [],
  filtros: {
    nombre: '',
    usuario: '',
    rol: '',
    departamento: '',
    estado: '',
  },
  paginaActual: 1,
  registrosPorPagina: 10,
  usuarioEnEdicion: null,
  catalogos: {
    roles: [],
    departamentos: [],
    estados: [],
  },
};

const ROLES_VALIDOS = [
  'SuperAdmin',
  'Jefe de Farmacia',
  'Jefe de Almacén',
  'Trabajador de Farmacia',
  'Trabajador de Almacén',
];

const DEPARTAMENTOS_VALIDOS = ['Farmacia', 'Almacén', 'Sistemas'];

function obtenerElementos() {
  return {
    modal: document.getElementById('modal-usuario'),
    tituloModal: document.getElementById('modal-usuario-titulo'),
    btnNuevoUsuario: document.getElementById('btn-nuevo-usuario'),
    formBusqueda: document.getElementById('form-busqueda-usuarios'),
    inputBusquedaNombre: document.getElementById('busqueda-usuarios'),
    inputFiltroUsuario: document.getElementById('filtro-usuario'),
    selectFiltroRol: document.getElementById('filtro-rol'),
    selectFiltroDepartamento: document.getElementById('filtro-departamento'),
    selectFiltroEstado: document.getElementById('filtro-estado'),
    mensajeUsuarios: document.getElementById('mensaje-usuarios'),
    tablaBody: document.getElementById('tabla-usuarios-body'),
    resultadoResumen: document.querySelector('.app-superadmin-resultados'),
    formUsuario: document.getElementById('form-usuario'),
    campoId: document.getElementById('campo-id-usuario'),
    campoNombre: document.getElementById('campo-nombre'),
    campoUsuario: document.getElementById('campo-usuario'),
    campoCorreo: document.getElementById('campo-correo'),
    campoRol: document.getElementById('campo-rol'),
    campoDepartamento: document.getElementById('campo-departamento'),
    campoEstado: document.getElementById('campo-estado'),
    campoPassword: document.getElementById('campo-password'),
    mensajeFormulario: document.getElementById('mensaje-usuarios-form'),
    resumenTotal: document.getElementById('total-usuarios'),
    resumenActivos: document.getElementById('usuarios-activos'),
    resumenInactivos: document.getElementById('usuarios-inactivos'),
    resumenJefes: document.getElementById('jefes-departamento'),
    resumenTrabajadores: document.getElementById('trabajadores'),
    resumenSuperadmins: document.getElementById('superadmins'),
  };
}

function limpiarMensajes() {
  const elementos = obtenerElementos();
  if (elementos.mensajeUsuarios) {
    elementos.mensajeUsuarios.className = 'mensaje-usuarios';
    elementos.mensajeUsuarios.textContent = '';
  }

  if (elementos.mensajeFormulario) {
    elementos.mensajeFormulario.className = 'mensaje-usuarios';
    elementos.mensajeFormulario.textContent = '';
  }
}

function mostrarMensaje(tipo, texto, destino = 'tabla') {
  const elementos = obtenerElementos();
  const contenedor = destino === 'formulario' ? elementos.mensajeFormulario : elementos.mensajeUsuarios;
  if (!contenedor) return;
  contenedor.className = `mensaje-usuarios ${tipo === 'error' ? 'error' : tipo === 'success' ? 'success' : ''}`.trim();
  contenedor.textContent = texto || '';
}

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function normalizarRol(valor) {
  const texto = normalizarTexto(valor);
  return texto || '';
}

function normalizarDepartamento(valor) {
  const texto = normalizarTexto(valor);
  return texto || '';
}

function obtenerNombreCompleto(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';
  return normalizarTexto(
    usuario.nombreCompleto ||
      usuario.nombre ||
      usuario.fullName ||
      [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') ||
      ''
  );
}

function obtenerNombreUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';
  return normalizarTexto(usuario.username || usuario.usuario || usuario.nombreUsuario || usuario.login || '');
}

function obtenerCorreo(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';
  return normalizarTexto(usuario.correo || usuario.email || usuario.mail || '');
}

function obtenerRolUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';
  const rol = usuario.rol || usuario.role || usuario.rolUsuario || usuario.tipoRol || '';
  if (Array.isArray(rol)) {
    return normalizarRol(rol[0] || '');
  }
  if (rol && typeof rol === 'object') {
    return normalizarRol(rol.nombre || rol.codigo || rol.descripcion || '');
  }
  return normalizarRol(rol);
}

function obtenerDepartamentoUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return '';
  const departamento = usuario.departamento || usuario.area || usuario.depto || usuario.departamentoActual || '';
  if (Array.isArray(departamento)) {
    return normalizarDepartamento(departamento[0] || '');
  }
  if (departamento && typeof departamento === 'object') {
    return normalizarDepartamento(departamento.nombre || departamento.codigo || departamento.descripcion || '');
  }
  return normalizarDepartamento(departamento);
}

function obtenerEstadoUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return 'inactivo';
  const valor = usuario.estado || usuario.status || usuario.activo || usuario.habilitado || '';
  if (typeof valor === 'boolean') {
    return valor ? 'activo' : 'inactivo';
  }
  return normalizarTexto(valor).toLowerCase() || 'inactivo';
}

function obtenerUltimoAcceso(usuario) {
  if (!usuario || typeof usuario !== 'object') return '—';
  const valor = usuario.ultimoAcceso || usuario.ultimaConexion || usuario.lastLogin || usuario.lastAccess || usuario.fechaUltimoAcceso || '';
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return normalizarTexto(valor);
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizarUsuario(rawUsuario) {
  if (!rawUsuario || typeof rawUsuario !== 'object') return null;
  return {
    id: rawUsuario.idUsuario || rawUsuario.id || rawUsuario.usuarioId || rawUsuario.id_Usuario || rawUsuario.ID || '',
    nombreCompleto: obtenerNombreCompleto(rawUsuario),
    username: obtenerNombreUsuario(rawUsuario),
    correo: obtenerCorreo(rawUsuario),
    rol: obtenerRolUsuario(rawUsuario),
    departamento: obtenerDepartamentoUsuario(rawUsuario),
    estado: obtenerEstadoUsuario(rawUsuario),
    ultimoAcceso: obtenerUltimoAcceso(rawUsuario),
    password: rawUsuario.password || rawUsuario.contrasena || '',
    activo: obtenerEstadoUsuario(rawUsuario) === 'activo',
    raw: rawUsuario,
  };
}

function normalizarListaUsuarios(datos) {
  if (!Array.isArray(datos)) {
    return [];
  }

  return datos
    .map((usuario) => normalizarUsuario(usuario))
    .filter(Boolean);
}

async function cargarModulos() {
  const modulos = {};
  for (const [nombre, path] of Object.entries(MODULOS_COMPARTIDOS)) {
    try {
      modulos[nombre] = await import(path);
    } catch (error) {
      modulos[nombre] = null;
    }
  }
  return modulos;
}

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    return modulo.default || modulo;
  } catch (error) {
    return null;
  }
}

function obtenerMetodoConexion(conexion, nombres) {
  if (!conexion || typeof conexion !== 'object') {
    return null;
  }

  for (const nombre of nombres) {
    if (typeof conexion[nombre] === 'function') {
      return conexion[nombre].bind(conexion);
    }
  }

  return null;
}

async function ejecutarConexion(actionNames, argumentos = [], fallback = []) {
  const conexion = state.conexion;
  const metodo = obtenerMetodoConexion(conexion, actionNames);

  if (!metodo) {
    return fallback;
  }

  try {
    const resultado = await metodo(...argumentos);
    if (resultado && typeof resultado === 'object' && 'data' in resultado && 'success' in resultado) {
      if (resultado.success === false) {
        throw new Error(resultado.mensaje || 'La operación falló.');
      }
      return resultado.data ?? resultado;
    }
    return resultado ?? fallback;
  } catch (error) {
    throw error;
  }
}

function obtenerRiesgoRolDepartamento(rol, departamento) {
  const rolNormalizado = normalizarTexto(rol);
  const departamentoNormalizado = normalizarTexto(departamento);

  if (!rolNormalizado || !departamentoNormalizado) {
    return { valido: false, mensaje: 'Debe seleccionar un rol y un departamento.' };
  }

  if (rolNormalizado === 'SuperAdmin') {
    return {
      valido: departamentoNormalizado === 'Sistemas',
      mensaje: 'SuperAdmin debe pertenecer al departamento de Sistemas.',
    };
  }

  if (['Jefe de Farmacia', 'Trabajador de Farmacia'].includes(rolNormalizado)) {
    return {
      valido: departamentoNormalizado === 'Farmacia',
      mensaje: 'El rol de Farmacia requiere el departamento Farmacia.',
    };
  }

  if (['Jefe de Almacén', 'Trabajador de Almacén'].includes(rolNormalizado)) {
    return {
      valido: departamentoNormalizado === 'Almacén',
      mensaje: 'El rol de Almacén requiere el departamento Almacén.',
    };
  }

  return { valido: true, mensaje: '' };
}

function obtenerCatalogoRoles() {
  const roles = state.catalogos.roles?.length ? state.catalogos.roles : ROLES_VALIDOS;
  return roles.map((valor) => normalizarTexto(valor)).filter(Boolean);
}

function obtenerCatalogoDepartamentos() {
  const departamentos = state.catalogos.departamentos?.length ? state.catalogos.departamentos : DEPARTAMENTOS_VALIDOS;
  return departamentos.map((valor) => normalizarTexto(valor)).filter(Boolean);
}

function obtenerCatalogoEstados() {
  const estados = state.catalogos.estados?.length ? state.catalogos.estados : ['activo', 'inactivo'];
  return estados.map((valor) => normalizarTexto(valor).toLowerCase()).filter(Boolean);
}

async function cargarCatalogos() {
  const fallback = {
    roles: ROLES_VALIDOS,
    departamentos: DEPARTAMENTOS_VALIDOS,
    estados: ['activo', 'inactivo'],
  };

  if (!state.conexion) {
    state.catalogos = fallback;
    return;
  }

  try {
    const catalogos = await ejecutarConexion(
      ['obtenerCatalogosUsuarios', 'listarCatalogosUsuarios', 'consultarCatalogosUsuarios', 'getCatalogosUsuarios'],
      [],
      fallback
    );

    if (catalogos && typeof catalogos === 'object') {
      state.catalogos = {
        roles: Array.isArray(catalogos.roles) ? catalogos.roles : fallback.roles,
        departamentos: Array.isArray(catalogos.departamentos) ? catalogos.departamentos : fallback.departamentos,
        estados: Array.isArray(catalogos.estados) ? catalogos.estados : fallback.estados,
      };
      return;
    }

    state.catalogos = fallback;
  } catch (error) {
    state.catalogos = fallback;
  }
}

async function cargarUsuarios() {
  const fallback = [];
  if (!state.conexion) {
    state.usuarios = [];
    return;
  }

  try {
    const datos = await ejecutarConexion(
      ['listarUsuarios', 'obtenerUsuarios', 'consultarUsuarios', 'getUsuarios'],
      [],
      fallback
    );

    const list = Array.isArray(datos) ? datos : Array.isArray(datos?.items) ? datos.items : [];
    state.usuarios = normalizarListaUsuarios(list);
  } catch (error) {
    state.usuarios = [];
    mostrarMensaje('error', 'No fue posible consultar los usuarios del sistema.', 'tabla');
  }
}

function formatearNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return new Intl.NumberFormat('es-ES').format(numero);
}

function calcularResumen() {
  const total = state.usuarios.length;
  const activos = state.usuarios.filter((usuario) => usuario.estado === 'activo').length;
  const inactivos = total - activos;
  const jefes = state.usuarios.filter((usuario) => ['Jefe de Farmacia', 'Jefe de Almacén'].includes(usuario.rol)).length;
  const trabajadores = state.usuarios.filter((usuario) => ['Trabajador de Farmacia', 'Trabajador de Almacén'].includes(usuario.rol)).length;
  const superadmins = state.usuarios.filter((usuario) => usuario.rol === 'SuperAdmin').length;

  return { total, activos, inactivos, jefes, trabajadores, superadmins };
}

function actualizarResumen() {
  const elementos = obtenerElementos();
  const resumen = calcularResumen();

  if (elementos.resumenTotal) elementos.resumenTotal.textContent = formatearNumero(resumen.total);
  if (elementos.resumenActivos) elementos.resumenActivos.textContent = formatearNumero(resumen.activos);
  if (elementos.resumenInactivos) elementos.resumenInactivos.textContent = formatearNumero(resumen.inactivos);
  if (elementos.resumenJefes) elementos.resumenJefes.textContent = formatearNumero(resumen.jefes);
  if (elementos.resumenTrabajadores) elementos.resumenTrabajadores.textContent = formatearNumero(resumen.trabajadores);
  if (elementos.resumenSuperadmins) elementos.resumenSuperadmins.textContent = formatearNumero(resumen.superadmins);
}

function obtenerUsuariosFiltrados() {
  const filtros = { ...state.filtros };
  const filtroNombre = filtros.nombre.toLowerCase();
  const filtroUsuario = filtros.usuario.toLowerCase();
  const filtroRol = filtros.rol;
  const filtroDepartamento = filtros.departamento;
  const filtroEstado = filtros.estado;

  return state.usuarios.filter((usuario) => {
    const nombre = (usuario.nombreCompleto || '').toLowerCase();
    const nombreUsuario = (usuario.username || '').toLowerCase();
    const rol = usuario.rol || '';
    const departamento = usuario.departamento || '';
    const estado = usuario.estado || '';

    const coincideNombre = !filtroNombre || nombre.includes(filtroNombre);
    const coincideUsuario = !filtroUsuario || nombreUsuario.includes(filtroUsuario);
    const coincideRol = !filtroRol || rol === filtroRol;
    const coincideDepartamento = !filtroDepartamento || departamento === filtroDepartamento;
    const coincideEstado = !filtroEstado || estado === filtroEstado;

    return coincideNombre && coincideUsuario && coincideRol && coincideDepartamento && coincideEstado;
  });
}

function asegurarContenedorPaginacion() {
  const panel = document.querySelector('.app-superadmin-panel');
  let paginacion = document.querySelector('.app-superadmin-usuarios-pagination');

  if (paginacion) return paginacion;

  paginacion = document.createElement('div');
  paginacion.className = 'app-superadmin-usuarios-pagination';

  const tablaWrap = document.querySelector('.app-superadmin-usuarios-table-wrap');
  if (tablaWrap && tablaWrap.parentNode) {
    tablaWrap.parentNode.insertBefore(paginacion, tablaWrap.nextSibling);
  } else if (panel) {
    panel.appendChild(paginacion);
  }

  return paginacion;
}

function renderPaginacion(totalItems) {
  const elementos = obtenerElementos();
  if (!elementos.resultadoResumen) return;

  const totalPaginas = totalItems > 0 ? Math.ceil(totalItems / state.registrosPorPagina) : 1;
  state.paginaActual = Math.min(state.paginaActual, totalPaginas);

  if (totalItems === 0) {
    elementos.resultadoResumen.textContent = 'Mostrando 0 de 0 registros';
  } else {
    const inicio = Math.min(totalItems, (state.paginaActual - 1) * state.registrosPorPagina + 1);
    const fin = Math.min(totalItems, state.paginaActual * state.registrosPorPagina);
    elementos.resultadoResumen.textContent = `Mostrando ${inicio}-${fin} de ${totalItems} registros`;
  }

  const paginacion = asegurarContenedorPaginacion();
  paginacion.innerHTML = '';

  if (totalItems === 0) {
    return;
  }

  const botonPrev = document.createElement('button');
  botonPrev.type = 'button';
  botonPrev.className = 'app-superadmin-usuarios-page-btn';
  botonPrev.textContent = 'Anterior';
  botonPrev.disabled = state.paginaActual === 1;
  botonPrev.addEventListener('click', () => {
    if (state.paginaActual > 1) {
      state.paginaActual -= 1;
      renderTabla();
    }
  });
  paginacion.appendChild(botonPrev);

  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `app-superadmin-usuarios-page-btn ${pagina === state.paginaActual ? 'is-active' : ''}`;
    boton.textContent = String(pagina);
    boton.addEventListener('click', () => {
      state.paginaActual = pagina;
      renderTabla();
    });
    paginacion.appendChild(boton);
  }

  const botonNext = document.createElement('button');
  botonNext.type = 'button';
  botonNext.className = 'app-superadmin-usuarios-page-btn';
  botonNext.textContent = 'Siguiente';
  botonNext.disabled = state.paginaActual >= totalPaginas;
  botonNext.addEventListener('click', () => {
    if (state.paginaActual < totalPaginas) {
      state.paginaActual += 1;
      renderTabla();
    }
  });
  paginacion.appendChild(botonNext);
}

function renderTabla() {
  const elementos = obtenerElementos();
  if (!elementos.tablaBody) return;

  const usuariosFiltrados = obtenerUsuariosFiltrados();
  const total = usuariosFiltrados.length;
  const inicio = (state.paginaActual - 1) * state.registrosPorPagina;
  const fin = inicio + state.registrosPorPagina;
  const paginaUsuarios = usuariosFiltrados.slice(inicio, fin);

  if (!paginaUsuarios.length) {
    elementos.tablaBody.innerHTML = '<tr class="app-superadmin-usuarios-row-empty"><td colspan="8">No hay usuarios registrados para los filtros actuales.</td></tr>';
    renderPaginacion(0);
    return;
  }

  elementos.tablaBody.innerHTML = paginaUsuarios
    .map((usuario) => {
      const estadoClase = usuario.estado === 'activo' ? 'app-superadmin-usuarios-state--activo' : usuario.estado === 'inactivo' ? 'app-superadmin-usuarios-state--inactivo' : 'app-superadmin-usuarios-state--pendiente';
      const estadoTexto = usuario.estado === 'activo' ? 'Activo' : usuario.estado === 'inactivo' ? 'Inactivo' : 'Pendiente';
      const rolTexto = usuario.rol || 'Sin rol';
      const departamentoTexto = usuario.departamento || 'Sin departamento';

      return `
        <tr>
          <td>${usuario.id || '—'}</td>
          <td>${usuario.nombreCompleto || 'Sin nombre'}</td>
          <td>${usuario.username || '—'}</td>
          <td><span class="app-superadmin-usuarios-role">${rolTexto}</span></td>
          <td>${departamentoTexto}</td>
          <td><span class="app-superadmin-usuarios-state ${estadoClase}">${estadoTexto}</span></td>
          <td>${usuario.ultimoAcceso || '—'}</td>
          <td>
            <div class="app-superadmin-usuarios-actions">
              <button type="button" class="mini-btn primary" data-action="consultar" data-id="${usuario.id || ''}">Consultar</button>
              <button type="button" class="mini-btn" data-action="editar" data-id="${usuario.id || ''}">Editar</button>
              ${usuario.estado === 'activo'
                ? '<button type="button" class="mini-btn danger" data-action="desactivar" data-id="'+(usuario.id || '')+'">Desactivar</button>'
                : '<button type="button" class="mini-btn success" data-action="activar" data-id="'+(usuario.id || '')+'">Activar</button>'}
              <button type="button" class="mini-btn" data-action="restablecer" data-id="${usuario.id || ''}">Restablecer</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  renderPaginacion(total);
  registrarAccionesTabla();
}

function registrarAccionesTabla() {
  const botones = document.querySelectorAll('[data-action]');
  botones.forEach((boton) => {
    boton.onclick = null;
    boton.addEventListener('click', async (event) => {
      const { action, id } = event.currentTarget.dataset;
      const usuario = state.usuarios.find((item) => String(item.id) === String(id));
      if (!usuario) {
        mostrarMensaje('error', 'No se encontró el usuario solicitado.', 'tabla');
        return;
      }

      if (action === 'consultar') {
        mostrarMensaje('success', `Usuario: ${usuario.nombreCompleto || usuario.username}. Rol: ${usuario.rol || 'Sin rol'}. Estado: ${usuario.estado || 'Sin estado'}.`, 'tabla');
      }

      if (action === 'editar') {
        abrirFormularioEdicion(usuario);
      }

      if (action === 'activar') {
        await cambiarEstadoUsuario(usuario, 'activo');
      }

      if (action === 'desactivar') {
        await cambiarEstadoUsuario(usuario, 'inactivo');
      }

      if (action === 'restablecer') {
        await restablecerAccesoUsuario(usuario);
      }
    });
  });
}

async function cambiarEstadoUsuario(usuario, nuevoEstado) {
  const confirmado = window.confirm(
    nuevoEstado === 'activo'
      ? `¿Desea activar al usuario ${usuario.nombreCompleto || usuario.username}?`
      : `¿Desea desactivar al usuario ${usuario.nombreCompleto || usuario.username}?\nLa desactivación también revocará sesiones activas en el backend.`
  );

  if (!confirmado) return;

  const conexion = state.conexion;
  const metodo = obtenerMetodoConexion(conexion, [
    nuevoEstado === 'activo' ? 'activarUsuario' : 'desactivarUsuario',
    nuevoEstado === 'activo' ? 'habilitarUsuario' : 'inhabilitarUsuario',
    nuevoEstado === 'activo' ? 'actualizarEstadoUsuario' : 'actualizarEstadoUsuario',
  ]);

  if (!metodo) {
    mostrarMensaje('error', 'La conexión del backend no expone la operación de cambio de estado.', 'tabla');
    return;
  }

  try {
    await metodo(usuario.id, nuevoEstado, { motivo: 'Cambio administrativo desde SuperAdmin' });
    await cargarUsuarios();
    renderTabla();
    actualizarResumen();
    mostrarMensaje('success', `El usuario quedó ${nuevoEstado === 'activo' ? 'activo' : 'inactivo'} correctamente.`, 'tabla');
  } catch (error) {
    mostrarMensaje('error', error?.message || 'No se pudo actualizar el estado del usuario.', 'tabla');
  }
}

async function restablecerAccesoUsuario(usuario) {
  const confirmacion = window.confirm(`¿Desea restablecer el acceso para ${usuario.nombreCompleto || usuario.username}?\nEl backend deberá aplicar el mecanismo seguro correspondiente.`);
  if (!confirmacion) return;

  const metodo = obtenerMetodoConexion(state.conexion, ['restablecerAccesoUsuario', 'resetearAccesoUsuario', 'reiniciarAccesoUsuario']);
  if (!metodo) {
    mostrarMensaje('error', 'No existe un mecanismo de restablecimiento registrado en la conexión del backend.', 'tabla');
    return;
  }

  try {
    await metodo(usuario.id, { accion: 'restablecer_acceso' });
    mostrarMensaje('success', 'Se solicitó el restablecimiento de acceso. El backend gestionará el procedimiento seguro.', 'tabla');
  } catch (error) {
    mostrarMensaje('error', error?.message || 'No se pudo restablecer el acceso.', 'tabla');
  }
}

function abrirFormularioCreacion() {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;
  state.usuarioEnEdicion = null;
  if (elementos.tituloModal) elementos.tituloModal.textContent = 'Crear usuario';
  if (elementos.formUsuario) elementos.formUsuario.reset();
  if (elementos.campoId) elementos.campoId.value = '';
  rellenarSelectsCatalogos();
  limpiarErroresFormulario();
  limpiarMensajes();
  elementos.modal.classList.add('is-open');
  elementos.modal.setAttribute('aria-hidden', 'false');
}

function abrirFormularioEdicion(usuario) {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;
  if (!usuario) return;

  state.usuarioEnEdicion = usuario;
  if (elementos.tituloModal) elementos.tituloModal.textContent = 'Editar usuario';
  if (elementos.formUsuario) elementos.formUsuario.reset();

  if (elementos.campoId) elementos.campoId.value = usuario.id || '';
  if (elementos.campoNombre) elementos.campoNombre.value = usuario.nombreCompleto || '';
  if (elementos.campoUsuario) elementos.campoUsuario.value = usuario.username || '';
  if (elementos.campoCorreo) elementos.campoCorreo.value = usuario.correo || '';
  if (elementos.campoRol) elementos.campoRol.value = usuario.rol || '';
  if (elementos.campoDepartamento) elementos.campoDepartamento.value = usuario.departamento || '';
  if (elementos.campoEstado) elementos.campoEstado.value = usuario.estado || 'inactivo';
  if (elementos.campoPassword) elementos.campoPassword.value = '';

  rellenarSelectsCatalogos();
  limpiarErroresFormulario();
  elementos.modal.classList.add('is-open');
  elementos.modal.setAttribute('aria-hidden', 'false');
}

function cerrarFormulario() {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;
  elementos.modal.classList.remove('is-open');
  elementos.modal.setAttribute('aria-hidden', 'true');
  limpiarErroresFormulario();
  if (elementos.formUsuario) elementos.formUsuario.reset();
  state.usuarioEnEdicion = null;
}

function limpiarErroresFormulario() {
  const campos = document.querySelectorAll('.app-superadmin-field, .app-superadmin-usuarios-field');
  campos.forEach((campo) => campo.classList.remove('has-error'));
  const mensajes = document.querySelectorAll('.campo-error, .app-superadmin-usuarios-field-error');
  mensajes.forEach((mensaje) => {
    mensaje.textContent = '';
  });
}

function rellenarSelectsCatalogos() {
  const elementos = obtenerElementos();
  const roles = obtenerCatalogoRoles();
  const departamentos = obtenerCatalogoDepartamentos();
  const estados = obtenerCatalogoEstados();

  if (elementos.campoRol) {
    elementos.campoRol.innerHTML = '<option value="">Seleccione un rol</option>' + roles.map((rol) => `<option value="${rol}">${rol}</option>`).join('');
  }

  if (elementos.campoDepartamento) {
    elementos.campoDepartamento.innerHTML = '<option value="">Seleccione un departamento</option>' + departamentos.map((departamento) => `<option value="${departamento}">${departamento}</option>`).join('');
  }

  if (elementos.campoEstado) {
    elementos.campoEstado.innerHTML = estados
      .map((estado) => `<option value="${estado}">${estado === 'activo' ? 'Activo' : 'Inactivo'}</option>`)
      .join('');
  }
}

function obtenerDatosFormulario() {
  const elementos = obtenerElementos();
  return {
    id: elementos.campoId ? elementos.campoId.value : '',
    nombreCompleto: elementos.campoNombre ? normalizarTexto(elementos.campoNombre.value) : '',
    username: elementos.campoUsuario ? normalizarTexto(elementos.campoUsuario.value) : '',
    correo: elementos.campoCorreo ? normalizarTexto(elementos.campoCorreo.value) : '',
    rol: elementos.campoRol ? normalizarTexto(elementos.campoRol.value) : '',
    departamento: elementos.campoDepartamento ? normalizarTexto(elementos.campoDepartamento.value) : '',
    estado: elementos.campoEstado ? normalizarTexto(elementos.campoEstado.value).toLowerCase() : 'inactivo',
    password: elementos.campoPassword ? normalizarTexto(elementos.campoPassword.value) : '',
  };
}

function marcarCampoError(id) {
  const campo = document.getElementById(id);
  if (!campo) return;
  const contenedor = campo.closest('.app-superadmin-field, .app-superadmin-usuarios-field');
  if (contenedor) contenedor.classList.add('has-error');
}

function validarFormularioUsuario(datos) {
  const errores = [];

  if (!datos.nombreCompleto) {
    errores.push({ campo: 'campo-nombre', mensaje: 'El nombre completo es obligatorio.' });
  }

  if (!datos.username) {
    errores.push({ campo: 'campo-usuario', mensaje: 'El nombre de usuario es obligatorio.' });
  }

  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    errores.push({ campo: 'campo-correo', mensaje: 'Ingrese un correo válido.' });
  }

  if (!datos.rol) {
    errores.push({ campo: 'campo-rol', mensaje: 'Debe seleccionar un rol.' });
  }

  if (!datos.departamento) {
    errores.push({ campo: 'campo-departamento', mensaje: 'Debe seleccionar un departamento.' });
  }

  if (datos.rol && datos.departamento) {
    const validacionDepartamento = obtenerRiesgoRolDepartamento(datos.rol, datos.departamento);
    if (!validacionDepartamento.valido) {
      errores.push({ campo: 'campo-departamento', mensaje: validacionDepartamento.mensaje });
    }
  }

  if (!datos.estado || !['activo', 'inactivo'].includes(datos.estado)) {
    errores.push({ campo: 'campo-estado', mensaje: 'El estado inicial no es válido.' });
  }

  if (datos.password && datos.password.length < 8) {
    errores.push({ campo: 'campo-password', mensaje: 'La contraseña temporal debe tener al menos 8 caracteres.' });
  }

  return errores;
}

async function guardarUsuarioFormulario(event) {
  event.preventDefault();
  const datos = obtenerDatosFormulario();
  const errores = validarFormularioUsuario(datos);

  limpiarErroresFormulario();
  if (errores.length) {
    errores.forEach((error) => {
      marcarCampoError(error.campo);
    });
    mostrarMensaje('error', errores[0].mensaje, 'formulario');
    return;
  }

  const elementos = obtenerElementos();
  const payload = {
    id: datos.id || undefined,
    nombreCompleto: datos.nombreCompleto,
    usuario: datos.username,
    username: datos.username,
    correo: datos.correo,
    rol: datos.rol,
    departamento: datos.departamento,
    estado: datos.estado,
    password: datos.password || undefined,
  };

  const metodo = state.usuarioEnEdicion
    ? obtenerMetodoConexion(state.conexion, ['actualizarUsuario', 'modificarUsuario', 'editarUsuario'])
    : obtenerMetodoConexion(state.conexion, ['crearUsuario', 'registrarUsuario', 'nuevoUsuario']);

  if (!metodo) {
    mostrarMensaje('error', 'La conexión del backend no expone la operación de gestión de usuarios.', 'formulario');
    return;
  }

  try {
    if (state.usuarioEnEdicion) {
      await metodo(state.usuarioEnEdicion.id || datos.id, payload);
      mostrarMensaje('success', 'Usuario actualizado correctamente.', 'formulario');
    } else {
      await metodo(payload);
      mostrarMensaje('success', 'Usuario creado correctamente.', 'formulario');
    }

    await cargarUsuarios();
    actualizarResumen();
    renderTabla();
    setTimeout(() => cerrarFormulario(), 800);
  } catch (error) {
    mostrarMensaje('error', error?.message || 'No se pudo guardar el usuario.', 'formulario');
  }
}

function registrarEventosFormulario() {
  const elementos = obtenerElementos();
  if (elementos.btnNuevoUsuario) {
    elementos.btnNuevoUsuario.addEventListener('click', abrirFormularioCreacion);
  }

  if (elementos.formBusqueda) {
    elementos.formBusqueda.addEventListener('submit', (event) => {
      event.preventDefault();
      state.filtros.nombre = elementos.inputBusquedaNombre ? elementos.inputBusquedaNombre.value : '';
      state.filtros.usuario = elementos.inputFiltroUsuario ? elementos.inputFiltroUsuario.value : '';
      state.filtros.rol = elementos.selectFiltroRol ? elementos.selectFiltroRol.value : '';
      state.filtros.departamento = elementos.selectFiltroDepartamento ? elementos.selectFiltroDepartamento.value : '';
      state.filtros.estado = elementos.selectFiltroEstado ? elementos.selectFiltroEstado.value : '';
      state.paginaActual = 1;
      renderTabla();
    });
  }

  const inputsBuscadores = [
    document.getElementById('busqueda-usuarios'),
    document.getElementById('filtro-usuario'),
    document.getElementById('filtro-rol'),
    document.getElementById('filtro-departamento'),
    document.getElementById('filtro-estado'),
  ].filter(Boolean);

  inputsBuscadores.forEach((campo) => {
    campo.addEventListener('input', () => {
      state.filtros.nombre = document.getElementById('busqueda-usuarios')?.value || '';
      state.filtros.usuario = document.getElementById('filtro-usuario')?.value || '';
      state.filtros.rol = document.getElementById('filtro-rol')?.value || '';
      state.filtros.departamento = document.getElementById('filtro-departamento')?.value || '';
      state.filtros.estado = document.getElementById('filtro-estado')?.value || '';
      state.paginaActual = 1;
      renderTabla();
    });
  });

  if (elementos.formUsuario) {
    elementos.formUsuario.addEventListener('submit', guardarUsuarioFormulario);
  }

  document.querySelectorAll('[data-close-modal="usuario"]').forEach((boton) => {
    boton.addEventListener('click', cerrarFormulario);
  });

  if (elementos.modal) {
    elementos.modal.addEventListener('click', (event) => {
      if (event.target === elementos.modal) {
        cerrarFormulario();
      }
    });
  }
}

async function validarAccesoSuperAdmin() {
  const modulos = state.modulos;
  const controlSesion = modulos.controlSesion?.default || modulos.controlSesion;

  if (!controlSesion || typeof controlSesion.verificarSesionAntesDeAcceder !== 'function') {
    return true;
  }

  try {
    const resultado = await controlSesion.verificarSesionAntesDeAcceder({
      ruta: window.location.pathname + window.location.search,
      redirigir: true,
    });

    if (!resultado || !resultado.usuario) {
      throw new Error('Sesión inválida');
    }

    const rolUsuario = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(resultado.usuario) : '';
    const rolNormalizado = String(rolUsuario || '').toUpperCase();
    if (rolNormalizado !== 'SUPERADMIN') {
      throw new Error('Acceso no autorizado');
    }

    return true;
  } catch (error) {
    if (controlSesion.DEFAULT_ROUTES?.login) {
      window.location.assign(controlSesion.DEFAULT_ROUTES.login);
    }
    return false;
  }
}

async function inicializar() {
  state.modulos = await cargarModulos();
  state.conexion = await cargarConexionSuperAdmin();

  const puedeContinuar = await validarAccesoSuperAdmin();
  if (!puedeContinuar) {
    return;
  }

  registrarEventosFormulario();
  rellenarSelectsCatalogos();
  await cargarCatalogos();
  await cargarUsuarios();
  actualizarResumen();
  renderTabla();
  mostrarMensaje('success', 'Sistema listo para administrar usuarios.', 'tabla');
}

document.addEventListener('DOMContentLoaded', inicializar);
