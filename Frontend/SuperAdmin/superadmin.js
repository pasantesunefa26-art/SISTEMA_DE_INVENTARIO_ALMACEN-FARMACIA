/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/SuperAdmin/superadmin.js
 * -----------------------------------------------------------------------------
 * Lógica del panel principal de SuperAdmin.
 *
 * Este archivo no crea autenticación ni inventa valores. Se conecta a la capa
 * de servicio del frontend y al módulo compartido de control de sesión.
 * ============================================================================ */

import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/superadmin.conexion.js';

let superadminConexion = null;

async function cargarConexionSuperAdmin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    superadminConexion = modulo.default || modulo;
  } catch {
    superadminConexion = null;
  }
}

function obtenerElementos() {
  return {
    nombre: document.getElementById('superadmin-nombre'),
    rol: document.getElementById('superadmin-rol'),
    departamento: document.getElementById('superadmin-departamento'),
    totalMedicamentos: document.getElementById('superadmin-total-medicamentos'),
    totalInsumos: document.getElementById('superadmin-total-insumos'),
    usuariosActivos: document.getElementById('superadmin-usuarios-activos'),
    usuariosInactivos: document.getElementById('superadmin-usuarios-inactivos'),
    movimientosPeriodo: document.getElementById('superadmin-movimientos-periodo'),
    alertas: document.getElementById('superadmin-alertas'),
    actividadReciente: document.getElementById('superadmin-actividad-reciente'),
    nombreDetalle: document.getElementById('superadmin-nombre-detalle'),
    usuario: document.getElementById('superadmin-usuario'),
    rolDetalle: document.getElementById('superadmin-rol-detalle'),
    btnAccederFarmacia: document.getElementById('btn-acceder-farmacia'),
    btnAccederAlmacen: document.getElementById('btn-acceder-almacen'),
    btnIrUsuarios: document.getElementById('btn-ir-usuarios'),
    btnIrCatalogos: document.getElementById('btn-ir-catalogos'),
    btnCerrarSesion: document.getElementById('btn-cerrar-sesion'),
    itemsNavegacion: Array.from(document.querySelectorAll('.app-superadmin-nav-item')),
    botonesAcceso: Array.from(document.querySelectorAll('[data-access]')),
  };
}

function formatearNumero(valor) {
  if (valor === undefined || valor === null || valor === '') return '—';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return new Intl.NumberFormat('es-ES').format(numero);
}

function resolverRutaPrivada(ruta) {
  if (!ruta) return null;
  if (ruta.startsWith('/')) return ruta;
  return `/${ruta.replace(/^\//, '')}`;
}

function mostrarCarga(elemento, texto = 'Cargando…') {
  if (!elemento) return;
  elemento.textContent = texto;
}

function obtenerUsuarioAutenticado() {
  const datos = controlSesion.obtenerDatosSesionSegura ? controlSesion.obtenerDatosSesionSegura() : null;
  if (!datos) return null;
  return datos.usuario || null;
}

async function validarAcceso() {
  try {
    const resultado = await controlSesion.verificarSesionAntesDeAcceder({
      ruta: window.location.pathname + window.location.search,
      redirigir: true,
    });

    if (!resultado || !resultado.usuario) {
      throw new Error('Sesión inválida');
    }

    const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(resultado.usuario) : '';
    if (rol !== controlSesion.ROLES.SUPERADMIN) {
      throw new Error('Acceso no autorizado');
    }

    return resultado;
  } catch (error) {
    if (error?.codigo === 'NAVEGACION_NO_AUTORIZADA') {
      window.location.assign(controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/login.html');
      return null;
    }

    window.location.assign(controlSesion.DEFAULT_ROUTES?.login || '/Frontend/Login/login.html');
    throw error;
  }
}

async function cargarPerfil() {
  const user = obtenerUsuarioAutenticado();
  const elementos = obtenerElementos();

  if (!user) {
    mostrarCarga(elementos.nombre, 'Sin sesión');
    mostrarCarga(elementos.rol, '—');
    mostrarCarga(elementos.departamento, '—');
    return;
  }

  const rol = controlSesion.obtenerRolUsuario ? controlSesion.obtenerRolUsuario(user) : '';
  const departamento = controlSesion.obtenerDepartamentoUsuario ? controlSesion.obtenerDepartamentoUsuario(user) : '';

  if (elementos.nombre) elementos.nombre.textContent = user.nombre || user.nombres || user.username || 'Usuario';
  if (elementos.rol) elementos.rol.textContent = rol || 'SuperAdmin';
  if (elementos.departamento) elementos.departamento.textContent = departamento || 'Sistemas';

  if (elementos.nombreDetalle) elementos.nombreDetalle.textContent = user.nombre || user.nombres || user.username || 'Usuario';
  if (elementos.usuario) elementos.usuario.textContent = user.username || user.usuario || user.email || '—';
  if (elementos.rolDetalle) elementos.rolDetalle.textContent = rol || 'SuperAdmin';
}

function renderEstadoError(elemento, texto = 'Sin datos disponibles') {
  if (!elemento) return;
  elemento.textContent = texto;
}

function renderActividadReciente(items = []) {
  const elemento = document.getElementById('superadmin-actividad-reciente');
  if (!elemento) return;

  if (!Array.isArray(items) || items.length === 0) {
    elemento.innerHTML = '<p class="app-superadmin-empty-state">No hay actividad reciente disponible.</p>';
    return;
  }

  const html = items
    .slice(0, 6)
    .map((item) => {
      const usuario = item.usuario || item.usuarioResponsable || 'Sistema';
      const operacion = item.operacion || item.tipoOperacion || 'Operación';
      const modulo = item.modulo || item.area || 'Sistema';
      const fecha = item.fecha || item.fechaHora || item.creadoEn || '—';
      const resultado = item.resultado || item.estado || 'OK';

      return `
        <div class="app-superadmin-activity-item">
          <div class="app-superadmin-activity-meta">
            <strong>${usuario}</strong>
            <small>${operacion} • ${modulo}</small>
          </div>
          <div class="app-superadmin-activity-meta">
            <small>${fecha}</small>
            <small>${resultado}</small>
          </div>
        </div>
      `;
    })
    .join('');

  elemento.innerHTML = html;
}

function renderAlertas(items = []) {
  const contenedor = document.querySelector('.app-superadmin-alert-list');
  if (!contenedor) return;

  if (!Array.isArray(items) || items.length === 0) {
    contenedor.innerHTML = '<p class="app-superadmin-empty-state">No hay alertas activas.</p>';
    return;
  }

  const html = items
    .slice(0, 6)
    .map((item) => {
      const titulo = item.titulo || item.nombre || 'Alerta';
      const descripcion = item.descripcion || item.detalle || item.mensaje || 'Sin detalle disponible';
      const prioridad = item.prioridad || item.nivel || 'info';
      const nivelClase =
        prioridad === 'error' ? 'is-error' :
        prioridad === 'warning' ? 'is-warning' :
        prioridad === 'success' ? 'is-success' :
        'is-info';

      return `
        <div class="app-superadmin-alert-item ${nivelClase}">
          <div class="app-superadmin-alert-meta">
            <strong>${titulo}</strong>
            <small>${descripcion}</small>
          </div>
          <small>${prioridad}</small>
        </div>
      `;
    })
    .join('');

  contenedor.innerHTML = html;
}

function asignarValor(elementoId, valor) {
  const elemento = document.getElementById(elementoId);
  if (!elemento) return;
  elemento.textContent = valor;
}

async function cargarDashboard() {
  if (!superadminConexion) {
    const elementos = obtenerElementos();
    renderEstadoError(elementos.totalMedicamentos, 'No disponible');
    renderEstadoError(elementos.totalInsumos, 'No disponible');
    renderEstadoError(elementos.usuariosActivos, 'No disponible');
    renderEstadoError(elementos.usuariosInactivos, 'No disponible');
    renderEstadoError(elementos.movimientosPeriodo, 'No disponible');
    renderEstadoError(elementos.alertas, 'No disponible');
    renderActividadReciente([]);
    renderAlertas([]);
    return;
  }

  const elementos = obtenerElementos();
  const consultas = [
    'obtenerResumenGlobal',
    'obtenerActividadReciente',
    'obtenerAlertasAdministrativas',
  ];

  const disponibles = consultas.filter((nombre) => typeof superadminConexion[nombre] === 'function');

  try {
    if (disponibles.includes('obtenerResumenGlobal')) {
      const resumen = await superadminConexion.obtenerResumenGlobal();
      const datos = resumen && typeof resumen === 'object' ? resumen : {};

      asignarValor('superadmin-total-medicamentos', formatearNumero(datos.totalMedicamentos ?? datos.medicamentos ?? datos.total_medicamentos));
      asignarValor('superadmin-total-insumos', formatearNumero(datos.totalInsumos ?? datos.insumos ?? datos.total_insumos));
      asignarValor('superadmin-usuarios-activos', formatearNumero(datos.usuariosActivos ?? datos.activos ?? datos.totalUsuariosActivos));
      asignarValor('superadmin-usuarios-inactivos', formatearNumero(datos.usuariosInactivos ?? datos.inactivos ?? datos.totalUsuariosInactivos));
      asignarValor('superadmin-movimientos-periodo', formatearNumero(datos.movimientosPeriodo ?? datos.movimientos ?? datos.totalMovimientos));
      asignarValor('superadmin-alertas', formatearNumero(datos.alertas ?? datos.totalAlertas ?? datos.alertasPendientes));
    } else {
      renderEstadoError(elementos.totalMedicamentos, '—');
      renderEstadoError(elementos.totalInsumos, '—');
      renderEstadoError(elementos.usuariosActivos, '—');
      renderEstadoError(elementos.usuariosInactivos, '—');
      renderEstadoError(elementos.movimientosPeriodo, '—');
      renderEstadoError(elementos.alertas, '—');
    }
  } catch (error) {
    renderEstadoError(elementos.totalMedicamentos, 'No disponible');
    renderEstadoError(elementos.totalInsumos, 'No disponible');
    renderEstadoError(elementos.usuariosActivos, 'No disponible');
    renderEstadoError(elementos.usuariosInactivos, 'No disponible');
    renderEstadoError(elementos.movimientosPeriodo, 'No disponible');
    renderEstadoError(elementos.alertas, 'No disponible');
  }

  try {
    if (disponibles.includes('obtenerActividadReciente')) {
      const actividad = await superadminConexion.obtenerActividadReciente();
      renderActividadReciente(Array.isArray(actividad) ? actividad : actividad?.items || []);
    } else {
      renderActividadReciente([]);
    }
  } catch {
    renderActividadReciente([]);
  }

  try {
    if (disponibles.includes('obtenerAlertasAdministrativas')) {
      const alertas = await superadminConexion.obtenerAlertasAdministrativas();
      renderAlertas(Array.isArray(alertas) ? alertas : alertas?.items || []);
    } else {
      renderAlertas([]);
    }
  } catch {
    renderAlertas([]);
  }
}

function crearRedireccionModulo(ruta) {
  if (!ruta) return;
  const destino = resolverRutaPrivada(ruta);
  if (destino) {
    window.location.assign(destino);
  }
}

function inicializarAcciones() {
  const elementos = obtenerElementos();

  if (elementos.btnAccederFarmacia) {
    elementos.btnAccederFarmacia.addEventListener('click', () => {
      crearRedireccionModulo('/Frontend/Farmacia/index.html');
    });
  }

  if (elementos.btnAccederAlmacen) {
    elementos.btnAccederAlmacen.addEventListener('click', () => {
      crearRedireccionModulo('/Frontend/Almacen/index.html');
    });
  }

  elementos.botonesAcceso.forEach((boton) => {
    boton.addEventListener('click', () => {
      const valor = boton.dataset.access;
      if (valor === 'farmacia') {
        crearRedireccionModulo('/Frontend/Farmacia/index.html');
      }
      if (valor === 'almacen') {
        crearRedireccionModulo('/Frontend/Almacen/index.html');
      }
    });
  });

  if (elementos.btnIrUsuarios) {
    elementos.btnIrUsuarios.addEventListener('click', () => {
      crearRedireccionModulo('/Frontend/SuperAdmin/Usuarios/index.html');
    });
  }

  if (elementos.btnIrCatalogos) {
    elementos.btnIrCatalogos.addEventListener('click', () => {
      crearRedireccionModulo('/Frontend/SuperAdmin/Catalogos/index.html');
    });
  }

  if (elementos.btnCerrarSesion) {
    elementos.btnCerrarSesion.addEventListener('click', async () => {
      try {
        await controlSesion.cerrarSesion({
          redirigir: true,
          rutaLogin: '/Frontend/Login/login.html',
        });
      } catch {
        window.location.assign('/Frontend/Login/login.html');
      }
    });
  }

  elementos.itemsNavegacion.forEach((item) => {
    item.addEventListener('click', () => {
      elementos.itemsNavegacion.forEach((el) => el.classList.remove('is-active'));
      item.classList.add('is-active');

      const destino = item.dataset.target;
      if (destino === 'farmacia') {
        crearRedireccionModulo('/Frontend/Farmacia/index.html');
      }
      if (destino === 'almacen') {
        crearRedireccionModulo('/Frontend/Almacen/index.html');
      }
      if (destino === 'usuarios') {
        crearRedireccionModulo('/Frontend/SuperAdmin/Usuarios/index.html');
      }
      if (destino === 'catalogos') {
        crearRedireccionModulo('/Frontend/SuperAdmin/Catalogos/index.html');
      }
      if (destino === 'bitacora') {
        crearRedireccionModulo('/Frontend/SuperAdmin/Bitacora/index.html');
      }
      if (destino === 'respaldos') {
        crearRedireccionModulo('/Frontend/SuperAdmin/Respaldos/index.html');
      }
      if (destino === 'configuracion') {
        crearRedireccionModulo('/Frontend/SuperAdmin/Configuracion/index.html');
      }
    });
  });
}

async function inicializarPanel() {
  await cargarConexionSuperAdmin();

  try {
    await validarAcceso();
    await cargarPerfil();
    await cargarDashboard();
    inicializarAcciones();
  } catch (error) {
    console.error('No se pudo inicializar el panel de SuperAdmin:', error);
    const elementos = obtenerElementos();
    renderEstadoError(elementos.totalMedicamentos, 'Error');
    renderEstadoError(elementos.totalInsumos, 'Error');
    renderEstadoError(elementos.usuariosActivos, 'Error');
    renderEstadoError(elementos.usuariosInactivos, 'Error');
    renderEstadoError(elementos.movimientosPeriodo, 'Error');
    renderEstadoError(elementos.alertas, 'Error');
    renderActividadReciente([]);
    renderAlertas([]);
  }
}

inicializarPanel();

export {
  inicializarPanel,
  validarAcceso,
  cargarDashboard,
  cargarPerfil,
  inicializarAcciones,
};
