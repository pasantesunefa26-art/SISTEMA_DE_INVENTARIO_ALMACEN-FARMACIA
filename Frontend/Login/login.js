/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Login/login.js
 * -----------------------------------------------------------------------------
 * Lógica de autenticación del login.
 *
 * IMPORTANTE
 * - La validación y autorización final se realizan en el backend Java/Spring Boot.
 * - Este archivo sólo coordina la interfaz, la captura, la carga visual y la
 *   redirección una vez que el backend confirma la autenticación.
 * - Si la conexión de login aún no está implementada, aquí se respetará el
 *   contrato de integración sin inventar endpoints ni simular acceso.
 * ============================================================================ */

import * as controlSesion from '../Compartidos/JS/control-sesion.js';

const MODULO_CONEXION = '../../conexiones/frontend/login.conexion.js';

let loginConexion = null;

async function cargarConexionLogin() {
  try {
    const modulo = await import(MODULO_CONEXION);
    loginConexion = modulo.default || modulo;
  } catch {
    loginConexion = null;
  }
}

function obtenerElementos() {
  const formulario = document.getElementById('form-login');
  const campoUsuario = document.getElementById('campo-usuario');
  const campoContrasena = document.getElementById('campo-contrasena');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const btnIniciarSesion = document.getElementById('btn-iniciar-sesion');
  const mensajeLogin = document.getElementById('mensaje-login');
  const estadoCarga = document.getElementById('estado-carga');
  const seccionSegundoFactor = document.getElementById('seccion-segundo-factor');
  const campoCodigo2fa = document.getElementById('campo-codigo-2fa');
  const btnVerificar2fa = document.getElementById('btn-verificar-2fa');
  const btnVolverLogin = document.getElementById('btn-volver-login');
  const linkRecuperacion = document.querySelector('.login-link-recuperacion');

  return {
    formulario,
    campoUsuario,
    campoContrasena,
    btnTogglePassword,
    btnIniciarSesion,
    mensajeLogin,
    estadoCarga,
    seccionSegundoFactor,
    campoCodigo2fa,
    btnVerificar2fa,
    btnVolverLogin,
    linkRecuperacion,
  };
}

function ocultarMensaje() {
  const { mensajeLogin } = obtenerElementos();
  if (!mensajeLogin) return;
  mensajeLogin.textContent = '';
  mensajeLogin.classList.remove('visible', 'success', 'error', 'warning', 'info');
}

function mostrarMensaje(tipo, texto) {
  const { mensajeLogin } = obtenerElementos();
  if (!mensajeLogin) return;

  mensajeLogin.textContent = texto;
  mensajeLogin.classList.remove('success', 'error', 'warning', 'info');
  mensajeLogin.classList.add(tipo, 'visible');
}

function setEstadoCarga(texto = '', deshabilitar = false) {
  const { btnIniciarSesion, estadoCarga } = obtenerElementos();

  if (estadoCarga) {
    estadoCarga.textContent = texto;
  }

  if (btnIniciarSesion) {
    btnIniciarSesion.disabled = deshabilitar;
    btnIniciarSesion.setAttribute('aria-busy', String(deshabilitar));
  }
}

function limpiarErroresCampos() {
  const { campoUsuario, campoContrasena, campoCodigo2fa } = obtenerElementos();
  [campoUsuario, campoContrasena, campoCodigo2fa].forEach((campo) => {
    if (!campo) return;
    campo.setAttribute('aria-invalid', 'false');
    campo.classList.remove('invalid');
  });
}

function marcarCampoError(campo) {
  if (!campo) return;
  campo.setAttribute('aria-invalid', 'true');
  campo.classList.add('invalid');
}

function obtenerCredenciales() {
  const { campoUsuario, campoContrasena } = obtenerElementos();

  const usuario = campoUsuario ? campoUsuario.value.trim() : '';
  const password = campoContrasena ? campoContrasena.value : '';

  return { usuario, password };
}

function validarCredenciales({ usuario, password }) {
  if (!usuario) {
    const { campoUsuario } = obtenerElementos();
    marcarCampoError(campoUsuario);
    mostrarMensaje('error', 'Debe ingresar su usuario.');
    campoUsuario?.focus();
    return false;
  }

  if (!password) {
    const { campoContrasena } = obtenerElementos();
    marcarCampoError(campoContrasena);
    mostrarMensaje('error', 'Debe ingresar su contraseña.');
    campoContrasena?.focus();
    return false;
  }

  limpiarErroresCampos();
  return true;
}

function alternarVisibilidadPassword() {
  const { campoContrasena, btnTogglePassword } = obtenerElementos();
  if (!campoContrasena || !btnTogglePassword) return;

  const mostrando = campoContrasena.type === 'text';
  campoContrasena.type = mostrando ? 'password' : 'text';
  btnTogglePassword.textContent = mostrando ? 'Mostrar' : 'Ocultar';
  btnTogglePassword.setAttribute('aria-pressed', String(!mostrando));
  btnTogglePassword.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
  campoContrasena.focus();
}

function normalizarRespuestaSesion(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') {
    return null;
  }

  const usuario =
    respuesta.usuario ||
    respuesta.user ||
    respuesta.datosUsuario ||
    respuesta.data ||
    respuesta.perfil ||
    null;

  return usuario && typeof usuario === 'object' ? usuario : null;
}

async function manejarResultadoAutenticacion(resultado) {
  const usuario = normalizarRespuestaSesion(resultado);

  if (!usuario) {
    mostrarMensaje('error', 'No se pudo completar la autenticación.');
    setEstadoCarga('', false);
    return;
  }

  const rol = usuario.rol || usuario.role || usuario.tipoRol || usuario.authorities || '';
  const departamento = usuario.departamento || usuario.departamentoActual || usuario.area || '';

  try {
    const redireccion = typeof controlSesion.redireccionarSegunRol === 'function'
      ? controlSesion.redireccionarSegunRol(usuario)
      : null;

    if (redireccion) {
      window.location.assign(redireccion);
      return;
    }

    const panel = controlSesion.obtenerRutaPanelPorRol ? controlSesion.obtenerRutaPanelPorRol(rol) : null;
    if (panel) {
      window.location.assign(panel);
      return;
    }

    showErrorAndReset('No se pudo determinar la ruta de acceso del usuario.');
  } catch (error) {
    console.error('Error de redirección por rol:', error);
    mostrarMensaje('error', 'La autenticación fue correcta, pero no se pudo acceder al panel correspondiente.');
    setEstadoCarga('', false);
  }
}

function showErrorAndReset(mensaje) {
  mostrarMensaje('error', mensaje);
  setEstadoCarga('', false);
}

async function enviarCredenciales(evento) {
  evento.preventDefault();

  const credenciales = obtenerCredenciales();
  if (!validarCredenciales(credenciales)) {
    return;
  }

  if (!loginConexion || typeof loginConexion.iniciarSesion !== 'function') {
    mostrarMensaje('error', 'El servicio de autenticación no está disponible en este momento.');
    setEstadoCarga('', false);
    return;
  }

  setEstadoCarga('Validando credenciales…', true);
  ocultarMensaje();

  try {
    const respuesta = await loginConexion.iniciarSesion({
      usuario: credenciales.usuario,
      password: credenciales.password,
    });

    const resultado = respuesta && typeof respuesta === 'object' ? respuesta : {};

    if (resultado.requiereSegundoFactor || resultado.necesitaSegundoFactor || resultado.twoFactorRequired) {
      mostrarSegundoFactor(resultado);
      setEstadoCarga('', false);
      return;
    }

    if (resultado.ok === false || resultado.error || resultado.codigo === 'CREDENCIALES_INVALIDAS') {
      mostrarMensaje('error', 'Usuario o contraseña incorrectos.');
      setEstadoCarga('', false);
      return;
    }

    if (resultado.codigo === 'CUENTA_BLOQUEADA' || resultado.estado === 'BLOQUEADA') {
      mostrarMensaje('warning', resultado.mensaje || 'Cuenta temporalmente bloqueada. Intente más tarde.');
      setEstadoCarga('', false);
      return;
    }

    if (resultado.codigo === 'SESION_EXPIRADA' || resultado.sesionExpirada) {
      mostrarMensaje('warning', 'La sesión expiró. Ingrese nuevamente.');
      setEstadoCarga('', false);
      return;
    }

    if (resultado.codigo === 'ERROR_CONEXION' || resultado.errorConexion) {
      mostrarMensaje('error', 'No se pudo conectar con el servidor. Intente nuevamente.');
      setEstadoCarga('', false);
      return;
    }

    await manejarResultadoAutenticacion(resultado);
  } catch (error) {
    const message = error?.message || 'Error inesperado al iniciar sesión.';
    if (/bloquead|intentos|tempor/.test(message.toLowerCase())) {
      mostrarMensaje('warning', message);
    } else if (/conex|network|timeout|servidor/.test(message.toLowerCase())) {
      mostrarMensaje('error', 'No se pudo conectar con el servidor. Intente nuevamente.');
    } else {
      mostrarMensaje('error', 'Usuario o contraseña incorrectos.');
    }
    setEstadoCarga('', false);
  }
}

function mostrarSegundoFactor(respuesta = {}) {
  const { seccionSegundoFactor, formulario } = obtenerElementos();
  if (formulario) formulario.classList.add('hidden');
  if (seccionSegundoFactor) seccionSegundoFactor.classList.remove('hidden');
  mostrarMensaje('info', respuesta.mensaje || 'Se requiere verificación adicional para continuar.');
}

function ocultarSegundoFactor() {
  const { seccionSegundoFactor, formulario } = obtenerElementos();
  if (formulario) formulario.classList.remove('hidden');
  if (seccionSegundoFactor) seccionSegundoFactor.classList.add('hidden');
}

async function verificarSegundoFactor(evento) {
  evento.preventDefault();

  const { campoCodigo2fa } = obtenerElementos();
  const codigo = campoCodigo2fa ? campoCodigo2fa.value.trim() : '';

  if (!codigo) {
    marcarCampoError(campoCodigo2fa);
    mostrarMensaje('error', 'Debe ingresar el código de verificación.');
    campoCodigo2fa?.focus();
    return;
  }

  if (!loginConexion || typeof loginConexion.verificarSegundoFactor !== 'function') {
    mostrarMensaje('error', 'La verificación de seguridad no está disponible en este momento.');
    return;
  }

  setEstadoCarga('Verificando código…', true);
  ocultarMensaje();

  try {
    const resultado = await loginConexion.verificarSegundoFactor({
      codigo,
      usuario: obtenerCredenciales().usuario,
    });

    if (resultado && resultado.ok === true) {
      await manejarResultadoAutenticacion(resultado);
      return;
    }

    if (resultado && resultado.codigo === 'CODIGO_INCORRECTO') {
      mostrarMensaje('error', 'El código de verificación ingresado es incorrecto.');
      setEstadoCarga('', false);
      return;
    }

    if (resultado && (resultado.codigo === 'SESION_EXPIRADA' || resultado.sesionExpirada)) {
      mostrarMensaje('warning', 'La sesión expiró. Ingrese nuevamente.');
      setEstadoCarga('', false);
      return;
    }

    mostrarMensaje('error', 'No se pudo verificar la identidad. Intente nuevamente.');
    setEstadoCarga('', false);
  } catch (error) {
    mostrarMensaje('error', error?.message || 'Error al verificar el segundo factor.');
    setEstadoCarga('', false);
  }
}

async function solicitarRecuperacion() {
  const { campoUsuario } = obtenerElementos();
  const usuario = campoUsuario ? campoUsuario.value.trim() : '';

  if (!loginConexion || typeof loginConexion.solicitarRecuperacion !== 'function') {
    mostrarMensaje('info', 'La recuperación de contraseña no está disponible en este momento.');
    return;
  }

  try {
    await loginConexion.solicitarRecuperacion({ usuario });
    mostrarMensaje('info', 'Si la cuenta existe, se enviará el proceso de recuperación correspondiente.');
  } catch (error) {
    mostrarMensaje('info', 'La recuperación de contraseña no está disponible en este momento.');
  }
}

function inicializarEventos() {
  const { formulario, btnTogglePassword, btnVerificar2fa, btnVolverLogin, linkRecuperacion } = obtenerElementos();

  if (formulario) {
    formulario.addEventListener('submit', enviarCredenciales);
  }

  if (btnTogglePassword) {
    btnTogglePassword.addEventListener('click', alternarVisibilidadPassword);
  }

  if (btnVerificar2fa) {
    btnVerificar2fa.addEventListener('click', verificarSegundoFactor);
  }

  if (btnVolverLogin) {
    btnVolverLogin.addEventListener('click', () => {
      ocultarSegundoFactor();
      ocultarMensaje();
      setEstadoCarga('', false);
    });
  }

  if (linkRecuperacion) {
    linkRecuperacion.addEventListener('click', (evento) => {
      evento.preventDefault();
      solicitarRecuperacion();
    });
  }
}

async function inicializarLogin() {
  await cargarConexionLogin();
  inicializarEventos();
  ocultarSegundoFactor();
  ocultarMensaje();
  setEstadoCarga('', false);
}

inicializarLogin();

export {
  inicializarLogin,
  enviarCredenciales,
  verificarSegundoFactor,
  solicitarRecuperacion,
  alternarVisibilidadPassword,
};
