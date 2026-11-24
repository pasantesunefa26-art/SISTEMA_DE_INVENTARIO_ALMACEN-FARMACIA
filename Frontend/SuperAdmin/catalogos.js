import * as base from '../Compartidos/JS/base.js';
import * as validaciones from '../Compartidos/JS/validaciones.js';
import * as formularios from '../Compartidos/JS/formularios.js';
import * as listasBuscables from '../Compartidos/JS/listas-buscables.js';
import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';

const state = {
  conexion: null,
  seccionActual: 'medicamentos',
  catalogos: {
    medicamentos: [],
    insumos: [],
    departamentos: [],
    servicios: [],
    categorias: [],
    unidades: [],
    procedencias: [],
  },
  filtros: {
    texto: '',
    estado: '',
  },
  paginaActual: 1,
  registrosPorPagina: 10,
  registroEnEdicion: null,
  accesoValidado: false,
};

const SECCIONES = Object.freeze({
  medicamentos: {
    etiqueta: 'Medicamentos',
    metodoBase: 'medicamento',
    nombres: {
      obtener: ['obtenerMedicamentos', 'listarMedicamentos', 'consultarMedicamentos', 'obtenerCatalogoMedicamentos'],
      crear: ['crearMedicamento', 'registrarMedicamento', 'guardarMedicamento'],
      actualizar: ['actualizarMedicamento', 'editarMedicamento', 'modificarMedicamento'],
      desactivar: ['desactivarMedicamento', 'inactivarMedicamento', 'eliminarMedicamento'],
    },
  },
  insumos: {
    etiqueta: 'Insumos',
    metodoBase: 'insumo',
    nombres: {
      obtener: ['obtenerInsumos', 'listarInsumos', 'consultarInsumos', 'obtenerCatalogoInsumos'],
      crear: ['crearInsumo', 'registrarInsumo', 'guardarInsumo'],
      actualizar: ['actualizarInsumo', 'editarInsumo', 'modificarInsumo'],
      desactivar: ['desactivarInsumo', 'inactivarInsumo', 'eliminarInsumo'],
    },
  },
  departamentos: {
    etiqueta: 'Departamentos',
    metodoBase: 'departamento',
    nombres: {
      obtener: ['obtenerDepartamentos', 'listarDepartamentos', 'consultarDepartamentos', 'obtenerCatalogoDepartamentos'],
      crear: ['crearDepartamento', 'registrarDepartamento', 'guardarDepartamento'],
      actualizar: ['actualizarDepartamento', 'editarDepartamento', 'modificarDepartamento'],
      desactivar: ['desactivarDepartamento', 'inactivarDepartamento', 'eliminarDepartamento'],
    },
  },
  servicios: {
    etiqueta: 'Servicios',
    metodoBase: 'servicio',
    nombres: {
      obtener: ['obtenerServicios', 'listarServicios', 'consultarServicios', 'obtenerCatalogoServicios'],
      crear: ['crearServicio', 'registrarServicio', 'guardarServicio'],
      actualizar: ['actualizarServicio', 'editarServicio', 'modificarServicio'],
      desactivar: ['desactivarServicio', 'inactivarServicio', 'eliminarServicio'],
    },
  },
  categorias: {
    etiqueta: 'Categorías',
    metodoBase: 'categoria',
    nombres: {
      obtener: ['obtenerCategorias', 'listarCategorias', 'consultarCategorias', 'obtenerCatalogoCategorias'],
      crear: ['crearCategoria', 'registrarCategoria', 'guardarCategoria'],
      actualizar: ['actualizarCategoria', 'editarCategoria', 'modificarCategoria'],
      desactivar: ['desactivarCategoria', 'inactivarCategoria', 'eliminarCategoria'],
    },
  },
  unidades: {
    etiqueta: 'Unidades',
    metodoBase: 'unidad',
    nombres: {
      obtener: ['obtenerUnidades', 'listarUnidades', 'consultarUnidades', 'obtenerCatalogoUnidades'],
      crear: ['crearUnidad', 'registrarUnidad', 'guardarUnidad'],
      actualizar: ['actualizarUnidad', 'editarUnidad', 'modificarUnidad'],
      desactivar: ['desactivarUnidad', 'inactivarUnidad', 'eliminarUnidad'],
    },
  },
  procedencias: {
    etiqueta: 'Procedencias',
    metodoBase: 'procedencia',
    nombres: {
      obtener: ['obtenerProcedencias', 'listarProcedencias', 'consultarProcedencias', 'obtenerCatalogoProcedencias'],
      crear: ['crearProcedencia', 'registrarProcedencia', 'guardarProcedencia'],
      actualizar: ['actualizarProcedencia', 'editarProcedencia', 'modificarProcedencia'],
      desactivar: ['desactivarProcedencia', 'inactivarProcedencia', 'eliminarProcedencia'],
    },
  },
});

function obtenerElementos() {
  return {
    tablaBody: document.getElementById('tabla-catalogo-body'),
    total: document.getElementById('total-catalogos'),
    mensaje: document.getElementById('mensaje-catalogos'),
    paginacion: document.getElementById('paginacion-catalogos'),
    pestanas: document.querySelectorAll('.app-superadmin-catalogos-tab'),
    inputBusqueda: document.getElementById('busqueda-catalogo'),
    filtroEstado: document.getElementById('filtro-catalogo-estado'),
    btnBuscar: document.getElementById('btn-buscar-catalogo'),
    btnNuevo: document.getElementById('btn-nuevo-registro'),
    modal: document.getElementById('modal-catalogo'),
    modalTitulo: document.getElementById('modal-catalogo-titulo'),
    formCatalogo: document.getElementById('form-catalogo'),
    campoId: document.getElementById('campo-id-catalogo'),
    campoCodigo: document.getElementById('campo-codigo'),
    campoNombre: document.getElementById('campo-nombre'),
    campoCategoria: document.getElementById('campo-categoria'),
    campoEstado: document.getElementById('campo-estado'),
    mensajeFormulario: document.getElementById('mensaje-catalogos-form'),
  };
}

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function normalizarEstado(valor) {
  const texto = normalizarTexto(valor).toLowerCase();
  if (['activo', 'active', 'habilitado', 'enabled', 'true', '1'].includes(texto)) return 'activo';
  if (['inactivo', 'inactive', 'deshabilitado', 'disabled', 'false', '0'].includes(texto)) return 'inactivo';
  if (texto === '1' || texto === 'true') return 'activo';
  return 'inactivo';
}

function obtenerValorRegistro(item, claves = []) {
  for (const clave of claves) {
    if (item && item[clave] !== undefined && item[clave] !== null && item[clave] !== '') {
      return item[clave];
    }
  }
  return '';
}

function extraerIdRegistro(item) {
  if (!item || typeof item !== 'object') return null;
  return (
    item.id ||
    item.idCatalogo ||
    item.catalogoId ||
    item.idRegistro ||
    item.categoriaId ||
    item.codigo ||
    item.idCatalogoMaestro ||
    item.ID ||
    null
  );
}

function extraerCodigo(item) {
  if (!item || typeof item !== 'object') return '';
  return normalizarTexto(
    obtenerValorRegistro(item, ['codigo', 'codigoCatalogo', 'codigoItem', 'clave', 'sigla']) ||
      item.id ||
      ''
  );
}

function extraerNombre(item) {
  if (!item || typeof item !== 'object') return 'Sin nombre';
  return normalizarTexto(
    obtenerValorRegistro(item, ['nombre', 'descripcion', 'denominacion', 'titulo', 'nombreCatalogo']) ||
      'Sin nombre'
  );
}

function extraerCategoria(item) {
  if (!item || typeof item !== 'object') return 'Sin categoría';
  const categoria =
    obtenerValorRegistro(item, ['categoria', 'categoriaNombre', 'tipo', 'clasificacion', 'clasificacionNombre']) ||
    item?.categoria?.nombre ||
    item?.tipo?.nombre ||
    item?.clasificacion?.nombre ||
    '';
  return normalizarTexto(categoria) || 'Sin categoría';
}

function extraerDepartamento(item) {
  if (!item || typeof item !== 'object') return 'Sin departamento';
  const departamento =
    obtenerValorRegistro(item, ['departamento', 'departamentoNombre', 'area', 'servicio', 'servicioNombre']) ||
    item?.departamento?.nombre ||
    item?.area?.nombre ||
    '';
  return normalizarTexto(departamento) || 'Sin departamento';
}

function extraerUnidad(item) {
  if (!item || typeof item !== 'object') return 'Sin unidad';
  const unidad =
    obtenerValorRegistro(item, ['unidad', 'unidadMedida', 'unidadNombre', 'medida', 'presentacion']) ||
    item?.unidad?.nombre ||
    item?.medida?.nombre ||
    '';
  return normalizarTexto(unidad) || 'Sin unidad';
}

function extraerEstado(item) {
  if (!item || typeof item !== 'object') return 'inactivo';
  const estado =
    obtenerValorRegistro(item, ['estado', 'estatus', 'activo', 'habilitado', 'status']) ||
    item?.estado?.nombre ||
    item?.status ||
    item?.activo ||
    'inactivo';
  return normalizarEstado(estado);
}

function mostrarMensaje(tipo, texto, destino = 'tabla') {
  const elementos = obtenerElementos();
  const contenedor = destino === 'formulario' ? elementos.mensajeFormulario : elementos.mensaje;
  if (!contenedor) return;
  contenedor.className = `app-superadmin-catalogos-message ${tipo === 'error' ? 'error' : tipo === 'success' ? 'success' : ''}`.trim();
  contenedor.textContent = texto || '';
}

function limpiarMensajes() {
  mostrarMensaje('', '', 'tabla');
  mostrarMensaje('', '', 'formulario');
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

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    state.conexion = modulo.default || modulo;
  } catch {
    state.conexion = null;
  }
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
        return JSON.parse(raw);
      }
    } catch {
      return null;
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
        throw new Error('La sesión no es válida');
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
    mostrarMensaje('error', 'No tiene permisos para administrar catálogos. Redirigiendo al inicio.', 'tabla');
    const destino = controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/login.html';
    window.location.assign(destino);
    return false;
  }
}

function resolverRespuestaBackend(resultado) {
  if (resultado === null || resultado === undefined) return [];

  if (Array.isArray(resultado)) return resultado;

  if (Array.isArray(resultado.data)) return resultado.data;
  if (Array.isArray(resultado.items)) return resultado.items;
  if (Array.isArray(resultado.registros)) return resultado.registros;
  if (Array.isArray(resultado.resultado)) return resultado.resultado;

  if (resultado && typeof resultado === 'object') {
    const posibles = [resultado.data, resultado.items, resultado.registros, resultado.resultado];
    for (const posible of posibles) {
      if (Array.isArray(posible)) return posible;
    }
  }

  return [];
}

function prepararDatosCatalogo(seccion, payload) {
  const registros = resolverRespuestaBackend(payload);
  state.catalogos[seccion] = Array.isArray(registros) ? registros : [];
  return state.catalogos[seccion];
}

async function consultarCatalogoSeccion(seccion) {
  const config = SECCIONES[seccion];
  if (!config) return { disponible: false, registros: [], mensaje: 'Sección no disponible.' };

  const nombres = config.nombres.obtener || [];
  const metodo = obtenerMetodoConexion(nombres);

  if (!metodo) {
    return {
      disponible: false,
      registros: [],
      mensaje: `La categoría ${config.etiqueta} todavía no está disponible en el backend.`,
    };
  }

  try {
    const respuesta = await metodo();
    const registros = prepararDatosCatalogo(seccion, respuesta);
    return {
      disponible: true,
      registros,
      mensaje: `${registros.length} registros cargados.`,
    };
  } catch (error) {
    return {
      disponible: false,
      registros: [],
      mensaje: error?.message || `No se pudo consultar ${config.etiqueta.toLowerCase()}.`,
    };
  }
}

async function cargarCatalogos() {
  const seccion = state.seccionActual;
  const elementos = obtenerElementos();
  if (elementos.mensaje) {
    elementos.mensaje.className = 'app-superadmin-catalogos-message';
    elementos.mensaje.textContent = 'Cargando información…';
  }

  const resultado = await consultarCatalogoSeccion(seccion);

  if (elementos.mensaje) {
    elementos.mensaje.className = `app-superadmin-catalogos-message ${resultado.disponible ? 'success' : 'error'}`.trim();
    elementos.mensaje.textContent = resultado.mensaje || 'Sin información disponible.';
  }

  if (!resultado.disponible) {
    state.catalogos[seccion] = [];
    renderTabla();
    return;
  }

  renderTabla();
}

function obtenerRegistrosFiltrados() {
  const seccion = state.seccionActual;
  const registros = state.catalogos[seccion] || [];
  const texto = normalizarTexto(state.filtros.texto).toLowerCase();
  const estado = normalizarTexto(state.filtros.estado).toLowerCase();

  return registros.filter((item) => {
    const nombre = extraerNombre(item).toLowerCase();
    const codigo = extraerCodigo(item).toLowerCase();
    const estadoActual = extraerEstado(item).toLowerCase();

    const coincideTexto = !texto || nombre.includes(texto) || codigo.includes(texto);
    const coincideEstado = !estado || estadoActual === estado;

    return coincideTexto && coincideEstado;
  });
}

function renderPaginacion(totalItems) {
  const elementos = obtenerElementos();
  if (!elementos.paginacion) return;

  const totalPaginas = Math.max(1, Math.ceil(totalItems / state.registrosPorPagina));
  state.paginaActual = Math.min(state.paginaActual, totalPaginas);

  const paginas = [];
  for (let i = 1; i <= totalPaginas; i += 1) {
    paginas.push(`
      <button
        type="button"
        class="app-superadmin-catalogos-page-btn ${i === state.paginaActual ? 'is-active' : ''}"
        data-pagina="${i}"
      >
        ${i}
      </button>
    `);
  }

  elementos.paginacion.innerHTML = paginas.join('');

  elementos.paginacion.querySelectorAll('[data-pagina]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const pagina = Number(boton.dataset.pagina || 1);
      state.paginaActual = pagina;
      renderTabla();
    });
  });
}

function renderTabla() {
  const elementos = obtenerElementos();
  const registros = obtenerRegistrosFiltrados();
  const total = registros.length;

  if (elementos.total) {
    elementos.total.textContent = `${total} registro${total === 1 ? '' : 's'}`;
  }

  if (total === 0) {
    elementos.tablaBody.innerHTML = `
      <tr>
        <td colspan="6" class="app-superadmin-catalogos-empty">
          No hay registros para esta categoría.
        </td>
      </tr>
    `;
    renderPaginacion(0);
    return;
  }

  const inicio = (state.paginaActual - 1) * state.registrosPorPagina;
  const paginaRegistros = registros.slice(inicio, inicio + state.registrosPorPagina);

  elementos.tablaBody.innerHTML = paginaRegistros
    .map((item) => {
      const id = extraerIdRegistro(item);
      const codigo = extraerCodigo(item);
      const nombre = extraerNombre(item);
      const categoria = extraerCategoria(item);
      const departamento = extraerDepartamento(item);
      const estado = extraerEstado(item);

      return `
        <tr>
          <td>${id ?? '—'}</td>
          <td>${codigo || '—'}</td>
          <td>${nombre}</td>
          <td>${categoria !== 'Sin categoría' ? categoria : departamento !== 'Sin departamento' ? departamento : '—'}</td>
          <td><span class="estado-chip ${estado}">${estado}</span></td>
          <td>
            <div class="tabla-acciones">
              <button type="button" class="mini-btn primary" data-action="editar" data-id="${id ?? ''}">Editar</button>
              <button type="button" class="mini-btn danger" data-action="desactivar" data-id="${id ?? ''}">Desactivar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  renderPaginacion(total);
}

function abrirModal() {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;
  elementos.modal.classList.add('is-open');
  elementos.modal.setAttribute('aria-hidden', 'false');
}

function cerrarModal() {
  const elementos = obtenerElementos();
  if (!elementos.modal) return;
  elementos.modal.classList.remove('is-open');
  elementos.modal.setAttribute('aria-hidden', 'true');
  resetFormulario();
}

function resetFormulario() {
  const elementos = obtenerElementos();
  if (!elementos.formCatalogo) return;
  elementos.formCatalogo.reset();
  if (elementos.campoId) elementos.campoId.value = '';
  if (elementos.campoEstado) elementos.campoEstado.value = 'activo';
  if (elementos.mensajeFormulario) {
    elementos.mensajeFormulario.className = 'app-superadmin-catalogos-message';
    elementos.mensajeFormulario.textContent = '';
  }
  state.registroEnEdicion = null;
}

function cargarOpcionesCategoria() {
  const elementos = obtenerElementos();
  if (!elementos.campoCategoria) return;

  const categorias = state.catalogos.categorias || [];
  const opciones = ['<option value="">Sin categoría</option>'];

  categorias.forEach((item) => {
    const nombre = extraerNombre(item);
    const id = extraerIdRegistro(item);
    if (nombre && nombre !== 'Sin nombre') {
      opciones.push(`<option value="${id ?? nombre}">${nombre}</option>`);
    }
  });

  elementos.campoCategoria.innerHTML = opciones.join('');
}

function setearFormularioDesdeRegistro(item) {
  const elementos = obtenerElementos();
  if (!item || !elementos.formCatalogo) return;

  if (elementos.campoId) elementos.campoId.value = extraerIdRegistro(item) ?? '';
  if (elementos.campoCodigo) elementos.campoCodigo.value = extraerCodigo(item) || '';
  if (elementos.campoNombre) elementos.campoNombre.value = extraerNombre(item) || '';
  if (elementos.campoEstado) elementos.campoEstado.value = extraerEstado(item) || 'activo';

  const idCategoria = obtenerValorRegistro(item, ['categoriaId', 'categoria', 'tipoId', 'clasificacionId']) || '';
  if (elementos.campoCategoria) {
    elementos.campoCategoria.value = idCategoria || '';
  }

  if (elementos.modalTitulo) {
    elementos.modalTitulo.textContent = 'Editar registro';
  }
}

function abrirModalEdicion(id) {
  const seccion = state.seccionActual;
  const registro = (state.catalogos[seccion] || []).find((item) => String(extraerIdRegistro(item)) === String(id));
  if (!registro) return;

  state.registroEnEdicion = registro;
  setearFormularioDesdeRegistro(registro);
  abrirModal();
}

function obtenerPayloadFormulario() {
  const elementos = obtenerElementos();
  const nombre = normalizarTexto(elementos.campoNombre?.value || '');
  const codigo = normalizarTexto(elementos.campoCodigo?.value || '');
  const categoria = normalizarTexto(elementos.campoCategoria?.value || '');
  const estado = normalizarTexto(elementos.campoEstado?.value || 'activo');
  const id = normalizarTexto(elementos.campoId?.value || '');

  return { id, codigo, nombre, categoria, estado, seccion: state.seccionActual };
}

function validarFormularioCatalogo() {
  const elementos = obtenerElementos();
  const payload = obtenerPayloadFormulario();
  const errores = [];

  if (!payload.nombre) {
    errores.push({ campo: 'campo-nombre', mensaje: 'El nombre o descripción es obligatorio.' });
  }

  if (!payload.codigo && state.seccionActual !== 'servicios' && state.seccionActual !== 'categorias') {
    errores.push({ campo: 'campo-codigo', mensaje: 'El código es obligatorio para esta categoría.' });
  }

  if (payload.codigo && payload.codigo.length < 2) {
    errores.push({ campo: 'campo-codigo', mensaje: 'El código debe tener al menos 2 caracteres.' });
  }

  if (payload.codigo && typeof payload.codigo === 'string' && payload.codigo.trim().length > 80) {
    errores.push({ campo: 'campo-codigo', mensaje: 'El código es demasiado largo.' });
  }

  if (elementos.campoNombre) {
    elementos.campoNombre.closest('.app-superadmin-catalogos-field')?.classList.toggle('has-error', Boolean(payload.nombre === ''));
  }

  if (elementos.campoCodigo) {
    elementos.campoCodigo.closest('.app-superadmin-catalogos-field')?.classList.toggle('has-error', Boolean(payload.codigo && payload.codigo.length < 2));
  }

  return { valido: errores.length === 0, errores };
}

function elegirMetodoOperacion(accion, seccion) {
  const config = SECCIONES[seccion];
  const nombres = config?.nombres?.[accion] || [];
  return obtenerMetodoConexion(nombres);
}

async function ejecutarOperacionCatalogo(accion, payload) {
  const seccion = payload.seccion || state.seccionActual;
  const metodo = elegirMetodoOperacion(accion, seccion);

  if (!metodo) {
    throw new Error(`La operación ${accion} para ${SECCIONES[seccion]?.etiqueta || seccion} no está disponible en el backend.`);
  }

  const datos = { ...payload, seccion };
  return metodo(datos);
}

async function guardarRegistroFormulario(event) {
  event.preventDefault();

  const validacion = validarFormularioCatalogo();
  if (!validacion.valido) {
    const primerError = validacion.errores[0];
    mostrarMensaje('error', primerError?.mensaje || 'Revise los datos ingresados.', 'formulario');
    return;
  }

  const payload = obtenerPayloadFormulario();
  const accion = payload.id ? 'actualizar' : 'crear';

  try {
    const respuesta = await ejecutarOperacionCatalogo(accion, payload);
    const datos = resolverRespuestaBackend(respuesta);
    const actualizados = Array.isArray(datos) && datos.length ? datos : state.catalogos[state.seccionActual] || [];
    state.catalogos[state.seccionActual] = actualizados;
    mostrarMensaje('success', payload.id ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.', 'formulario');
    cerrarModal();
    await cargarCatalogos();
  } catch (error) {
    mostrarMensaje('error', error?.message || 'No se pudo guardar el registro. Verifique la respuesta del backend.', 'formulario');
  }
}

async function desactivarRegistro(id) {
  if (!id) return;

  const seccion = state.seccionActual;
  const intentos = ['desactivar', 'inactivar', 'eliminar'];

  try {
    let resultado;
    for (const accion of intentos) {
      const metodo = elegirMetodoOperacion(accion, seccion);
      if (metodo) {
        resultado = await metodo({ id, seccion });
        break;
      }
    }

    if (!resultado) {
      throw new Error(`La desactivación de ${SECCIONES[seccion]?.etiqueta || 'este registro'} no está disponible en el backend.`);
    }

    mostrarMensaje('success', 'Registro desactivado correctamente.', 'tabla');
    await cargarCatalogos();
  } catch (error) {
    mostrarMensaje('error', error?.message || 'No se pudo desactivar el registro.', 'tabla');
  }
}

function inicializarEventos() {
  const elementos = obtenerElementos();

  elementos.pestanas?.forEach((boton) => {
    boton.addEventListener('click', async () => {
      const seccion = boton.dataset.seccion;
      if (!seccion || !SECCIONES[seccion]) return;

      state.seccionActual = seccion;
      state.paginaActual = 1;
      state.filtros.texto = '';
      state.filtros.estado = '';

      if (elementos.inputBusqueda) {
        elementos.inputBusqueda.value = '';
      }
      if (elementos.filtroEstado) {
        elementos.filtroEstado.value = '';
      }

      elementos.pestanas.forEach((item) => item.classList.toggle('is-active', item === boton));
      await cargarCatalogos();
    });
  });

  if (elementos.btnBuscar) {
    elementos.btnBuscar.addEventListener('click', () => {
      state.filtros.texto = elementos.inputBusqueda?.value || '';
      state.filtros.estado = elementos.filtroEstado?.value || '';
      state.paginaActual = 1;
      renderTabla();
    });
  }

  if (elementos.inputBusqueda) {
    elementos.inputBusqueda.addEventListener('input', () => {
      state.filtros.texto = elementos.inputBusqueda.value || '';
      state.paginaActual = 1;
      renderTabla();
    });
  }

  if (elementos.filtroEstado) {
    elementos.filtroEstado.addEventListener('change', () => {
      state.filtros.estado = elementos.filtroEstado.value || '';
      state.paginaActual = 1;
      renderTabla();
    });
  }

  if (elementos.btnNuevo) {
    elementos.btnNuevo.addEventListener('click', () => {
      state.registroEnEdicion = null;
      if (elementos.modalTitulo) elementos.modalTitulo.textContent = 'Nuevo registro';
      resetFormulario();
      abrirModal();
    });
  }

  document.querySelectorAll('[data-close-modal="catalogo"]').forEach((boton) => {
    boton.addEventListener('click', () => cerrarModal());
  });

  if (elementos.modal) {
    elementos.modal.addEventListener('click', (event) => {
      if (event.target === elementos.modal) cerrarModal();
    });
  }

  if (elementos.formCatalogo) {
    elementos.formCatalogo.addEventListener('submit', guardarRegistroFormulario);
  }

  if (elementos.tablaBody) {
    elementos.tablaBody.addEventListener('click', async (event) => {
      const boton = event.target.closest('[data-action]');
      if (!boton) return;

      const { action, id } = boton.dataset;
      if (action === 'editar') {
        abrirModalEdicion(id);
      }

      if (action === 'desactivar') {
        await desactivarRegistro(id);
      }
    });
  }
}

async function inicializar() {
  const elementos = obtenerElementos();
  if (!elementos) return;

  await cargarConexionSuperAdmin();
  const autorizado = await validarAccesoSuperAdmin();
  if (!autorizado) return;

  await cargarCatalogos();
  cargarOpcionesCategoria();
  inicializarEventos();
}

document.addEventListener('DOMContentLoaded', () => {
  inicializar();
});
