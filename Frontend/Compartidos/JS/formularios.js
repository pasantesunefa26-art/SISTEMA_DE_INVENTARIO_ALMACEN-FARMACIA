/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Compartidos/JS/formularios.js
 * ----------------------------------------------------------------------------
 * Administrador general de formularios del frontend.
 *
 * Este módulo se encarga de la presentación, la interacción y la validación
 * previa de los formularios ya existentes. No crea formularios HTML, no
 * realiza solicitudes HTTP, no accede a la base de datos, no modifica
 * existencias, no calcula inventario definitivo y no aplica reglas FEFO.
 *
 * Cada módulo (Farmacia, Almacén, SuperAdmin, etc.) debe proporcionar:
 *   - La función de envío o el objeto de conexión del módulo.
 *   - Las reglas de validación de sus campos.
 *   - Las autorizaciones que correspondan a las operaciones críticas.
 *
 * IMPORTANTE SOBRE SEGURIDAD
 * Las comprobaciones de autorización de este archivo son únicamente una ayuda
 * de interfaz. El backend Java/Spring Boot es el único que puede autorizar
 * operaciones, comprobar permisos, validar reglas de negocio y decidir si un
 * movimiento puede aplicarse. Nunca se debe confiar en el estado del DOM ni en
 * las funciones de este módulo para proteger información.
 *
 * IMPORTANTE SOBRE FECHAS
 * Las fechas efectivas se envían tal como las captura el usuario. Este archivo
 * no establece la fecha de hoy como mínimo, no reemplaza una fecha elegida y no
 * confunde la fecha efectiva del movimiento con la fecha real de registro. La
 * fecha real de registro la determina y almacena el backend.
 *
 * CONTRATO PRINCIPAL
 *   inicializarFormulario(formulario, opciones) -> controlador
 *
 * El controlador expone métodos reutilizables:
 *   obtenerDatos(), obtenerDatosPreparados(), validar(), validarCampo(),
 *   enviar(), cargar(), cargarEdicion(), editar(), limpiar(), restablecer(),
 *   cancelar(), anular(), bloquear(), desbloquear(), esModificado(),
 *   obtenerRegistro(), establecerRegistro(), obtenerIdentificador(),
 *   obtenerEstado(), registrarSeleccion(), destruir().
 * ============================================================================
 */

import {
  agregarClases,
  crearElemento,
  escucharEvento,
  establecerAtributos,
  establecerTexto,
  limpiarMensajes,
  mostrarCarga,
  mostrarMensaje,
  ocultarCarga,
  obtenerElemento,
  quitarClases,
} from './base.js';

import {
  compararFechasPorDia,
  enfocarPrimerError,
  limpiarErroresFormulario,
  limpiarErrorCampo,
  marcarCampoValido,
  marcarErrorCampo,
  mostrarResumenErrores,
  obtenerValorCampo,
  validarFechaEfectiva,
  validarFormulario,
  validarFormularioYMostrar,
} from './validaciones.js';

/* ============================================================================
   1. CONSTANTES PÚBLICAS
   ============================================================================ */

/**
 * Estados internos por los que pasa un formulario administrado.
 * Se publican como atributos data-app-estado para que el CSS o los módulos
 * puedan reaccionar sin depender de clases inventadas.
 */
export const ESTADOS_FORMULARIO = Object.freeze({
  INICIAL: 'inicial',
  LISTO: 'listo',
  EDITANDO: 'editando',
  VALIDANDO: 'validando',
  ENVIANDO: 'enviando',
  EXITO: 'exito',
  ERROR: 'error',
  BLOQUEADO: 'bloqueado',
  LIMPIO: 'limpio',
});

/**
 * Códigos estables de los resultados de este módulo.
 */
export const CODIGOS_FORMULARIO = Object.freeze({
  FORMULARIO_INVALIDO: 'FORMULARIO_INVALIDO',
  FORMULARIO_NO_INICIALIZADO: 'FORMULARIO_NO_INICIALIZADO',
  FORMULARIO_BLOQUEADO: 'FORMULARIO_BLOQUEADO',
  REGISTRO_HISTORICO: 'REGISTRO_HISTORICO',
  SIN_REGISTRO: 'SIN_REGISTRO',
  SIN_CAMBIOS: 'SIN_CAMBIOS',
  SIN_CONEXION: 'SIN_CONEXION',
  OPERACION_CANCELADA: 'OPERACION_CANCELADA',
  OPERACION_NO_AUTORIZADA: 'OPERACION_NO_AUTORIZADA',
  ENVIO_EN_CURSO: 'ENVIO_EN_CURSO',
  ERROR_ENVIO: 'ERROR_ENVIO',
  VALIDACION_FALLIDA: 'VALIDACION_FALLIDA',
  DEPENDENCIA_INVALIDA: 'DEPENDENCIA_INVALIDA',
  RESULTADO_INESPERADO: 'RESULTADO_INESPERADO',
});

/**
 * Dependencias habituales entre campos de los módulos del sistema.
 *
 * `campo` es el campo dependiente y `dependeDe` las posibles fuentes. Los
 * nombres se comparan sin acentos, sin espacios y sin distinguir mayúsculas;
 * también se aceptan atributos explícitos data-app-depende-de.
 *
 * La integración con listas-buscables.js se realiza mediante eventos y
 * callbacks; este archivo no importa ni supone la existencia de ese módulo.
 */
export const DEPENDENCIAS_COMUNES = Object.freeze([
  Object.freeze({
    campo: 'lote',
    dependeDe: Object.freeze([
      'producto',
      'productoId',
      'medicamento',
      'medicamentoId',
    ]),
    descripcion: 'Seleccione primero el producto o medicamento.',
  }),
  Object.freeze({
    campo: 'servicio',
    dependeDe: Object.freeze(['departamento', 'departamentoId']),
    descripcion: 'Seleccione primero el departamento.',
  }),
]);

/* ============================================================================
   2. MENSAJES Y TEXTOS PREDETERMINADOS
   ============================================================================ */

const TEXTOS = Object.freeze({
  guardarRegistro:
    '¿Desea guardar este registro? Verifique que los datos sean correctos.',
  guardarCambios:
    '¿Desea guardar los cambios realizados en este registro?',
  anular:
    '¿Desea anular este registro? La operación quedará registrada y el backend determinará si requiere un movimiento correctivo.',
  limpiar: '¿Desea descartar los datos ingresados y limpiar el formulario?',
  cancelar: '¿Desea cancelar la operación? Se perderán los cambios no guardados.',
  descartar: 'Hay cambios sin guardar. ¿Desea descartarlos?',
  sinCambios: 'No se detectaron cambios para guardar.',
  guardado: 'La operación se realizó correctamente.',
  anulado: 'El registro se anuló correctamente.',
  limpiado: 'El formulario se limpió correctamente.',
  restablecido: 'Los valores del formulario se restablecieron.',
  editando: 'El registro está listo para editar. Verifique los cambios antes de guardar.',
  cancelado: 'Operación cancelada. No se enviaron datos.',
  bloqueado:
    'Este formulario está bloqueado y no admite cambios en este momento.',
  historico:
    'Este registro es histórico o requiere un movimiento correctivo. No puede modificarse directamente: registre el movimiento correctivo correspondiente.',
  sinConexion:
    'El formulario no tiene una función de envío configurada. No se enviaron datos.',
  sinRegistro:
    'No hay un registro cargado para realizar esta operación.',
  noAutorizado:
    'La operación no está autorizada. El sistema verificará los permisos nuevamente.',
  errorEnvio:
    'No se pudo completar la operación. Intente nuevamente o comuníquese con el administrador.',
  envioEnCurso: 'Ya hay un envío en curso. Espere a que termine.',
  fechaRetroactiva:
    'La fecha efectiva es anterior a la fecha actual. El registro se guardará como retroactivo; la fecha real de registro la asignará el sistema.',
  fechaFutura:
    'La fecha efectiva es posterior a la fecha actual. Confirme que corresponda al movimiento que desea registrar.',
  seleccioneDependencia:
    'Seleccione primero el valor del que depende este campo.',
  cambiosSinGuardar: 'Cambios sin guardar',
  listo: 'Listo',
  validando: 'Validando datos…',
  enviando: 'Enviando información…',
  guardando: 'Guardando…',
  anulando: 'Anulando registro…',
  exito: 'Operación completada.',
  error: 'No se pudo completar la operación.',
  resumenErrores: 'Revise los datos del formulario',
});

const ACCIONES = Object.freeze({
  GUARDAR: 'guardar',
  CREAR: 'crear',
  ACTUALIZAR: 'actualizar',
  MODIFICAR: 'modificar',
  ANULAR: 'anular',
});

const ESTADOS_REGISTRO_HISTORICO = Object.freeze([
  'historico',
  'histórico',
  'anulado',
  'anulada',
  'cerrado',
  'cerrada',
  'inactivo',
  'inactiva',
  'archivado',
  'archivada',
]);

const CLAVES_IDENTIFICADOR = Object.freeze([
  'id',
  'identificador',
  'codigo',
  'código',
  'uuid',
  'clave',
]);

const ATRIBUTOS = Object.freeze({
  ACCION: 'data-app-accion',
  OMITIR: 'data-app-omitir',
  TIPO: 'data-app-tipo',
  FECHA_EFECTIVA: 'data-app-fecha-efectiva',
  DEPENDE_DE: 'data-app-depende-de',
  ESTADO: 'data-app-estado',
  MODIFICADO: 'data-app-modificado',
  BLOQUEADO: 'data-app-bloqueado',
  BLOQUEO_CAMPO: 'data-app-bloqueado-campo',
  AVISO_FECHA: 'data-app-aviso-fecha',
  CREADO: 'data-app-creado-por-formularios',
  ERROR_SERVIDOR: 'data-app-error-servidor',
});

const SELECTORES = Object.freeze({
  MENSAJES: '.app-formulario__mensajes',
  ESTADO_ENVIO: '.app-formulario__estado-envio',
  ACCIONES: '.app-formulario__acciones',
  PIE: '.app-formulario__pie',
  CAMPO: '.app-campo',
  AVISO_FECHA: '[data-app-aviso-fecha]',
});

const TIPOS_CONFIRMACION = Object.freeze([
  'info',
  'exito',
  'advertencia',
  'error',
  'critica',
]);

/* ============================================================================
   3. UTILIDADES INTERNAS
   ============================================================================ */

let contadorIdentificadores = 0;

/** Controladores activos por elemento de formulario. */
const controladores = new WeakMap();

/** Elementos creados por este módulo para poder retirarlos al destruir. */
const elementosCreados = new WeakSet();

/** Limpieza de eventos globales por formulario. */
const limpiezasGlobales = new WeakMap();

/** Diálogo de confirmación abierto actualmente (sólo uno a la vez). */
let confirmacionActiva = null;

/**
 * Genera un identificador único para uso interno del DOM.
 * @param {string} prefijo
 * @returns {string}
 * @private
 */
function generarId(prefijo = 'app-formulario') {
  contadorIdentificadores += 1;
  return `${prefijo}-${contadorIdentificadores}`;
}

/**
 * Resuelve un formulario a partir de un elemento o selector.
 * @param {Element|string|null} valor
 * @returns {HTMLFormElement|null}
 * @private
 */
function resolverFormulario(valor) {
  if (!valor) return null;

  const elemento =
    valor instanceof Element ? valor : obtenerElemento(String(valor));

  if (!elemento || elemento.tagName !== 'FORM') return null;

  return elemento;
}

/**
 * Indica si un valor es un objeto simple (no arreglo ni nodo).
 * @param {*} valor
 * @returns {boolean}
 * @private
 */
function esObjeto(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

/**
 * Copia superficial segura de un registro para conservar el estado original.
 * @param {*} valor
 * @returns {*}
 * @private
 */
function copiarRegistro(valor) {
  if (!esObjeto(valor)) return valor;

  try {
    if (typeof structuredClone === 'function') return structuredClone(valor);
  } catch {
    // Si contiene nodos, funciones o ciclos se usa la copia superficial.
  }

  return { ...valor };
}

/**
 * Normaliza un texto para comparar nombres de campos.
 * @param {*} valor
 * @returns {string}
 * @private
 */
function normalizarNombre(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLocaleLowerCase('es');
}

/**
 * Comprueba si el nombre de un campo corresponde a una base conocida.
 * Acepta producto, productoId, producto_id, producto[id], etc.
 * @param {string} nombre
 * @param {string} base
 * @returns {boolean}
 * @private
 */
function nombreCorresponde(nombre, base) {
  const actual = normalizarNombre(nombre);
  const esperado = normalizarNombre(base);

  if (!actual || !esperado) return false;

  return (
    actual === esperado ||
    actual === `${esperado}id` ||
    actual.startsWith(`${esperado}id`) ||
    actual.startsWith(`${esperado}seleccion`)
  );
}

/**
 * Obtiene el texto de un mensaje de error de servidor sin exponer detalles
 * técnicos innecesarios.
 * @param {*} error
 * @returns {string}
 * @private
 */
function textoDeError(error) {
  if (!error) return TEXTOS.errorEnvio;

  if (typeof error === 'string') return error.trim() || TEXTOS.errorEnvio;

  if (error instanceof Error && error.message) return error.message;

  if (esObjeto(error)) {
    return (
      textoDeError(error.mensaje) ||
      textoDeError(error.message) ||
      textoDeError(error.detalle) ||
      TEXTOS.errorEnvio
    );
  }

  return TEXTOS.errorEnvio;
}

/**
 * Normaliza un error de validación o de servidor a la forma compartida.
 * @param {*} error
 * @param {string} [campo]
 * @returns {{campo: string|null, codigo: string|null, mensaje: string, detalle: string|null}}
 * @private
 */
function normalizarError(error, campo = null) {
  if (typeof error === 'string') {
    return {
      campo: campo || null,
      codigo: null,
      mensaje: error.trim() || TEXTOS.error,
      detalle: null,
    };
  }

  if (!esObjeto(error)) {
    return {
      campo: campo || null,
      codigo: null,
      mensaje: TEXTOS.error,
      detalle: null,
    };
  }

  return {
    campo: error.campo ? String(error.campo) : campo || null,
    codigo: error.codigo ? String(error.codigo) : null,
    mensaje:
      textoDeError(error.mensaje || error.message) ||
      TEXTOS.error,
    detalle: error.detalle ? String(error.detalle) : null,
  };
}

/**
 * Extrae la lista de errores de una respuesta heterogénea.
 * @param {*} resultado
 * @returns {Array<Object>}
 * @private
 */
function extraerErrores(resultado) {
  if (!resultado) return [];

  if (Array.isArray(resultado)) {
    return resultado.map((error) => normalizarError(error));
  }

  if (typeof resultado === 'string') {
    return [normalizarError(resultado)];
  }

  if (!esObjeto(resultado)) return [];

  if (Array.isArray(resultado.errores)) {
    return resultado.errores.map((error) => normalizarError(error));
  }

  if (esObjeto(resultado.errores)) {
    return Object.entries(resultado.errores).map(([campo, mensaje]) => {
      if (Array.isArray(mensaje)) {
        return normalizarError(mensaje[0], campo);
      }
      return normalizarError(mensaje, campo);
    });
  }

  if (resultado.mensaje || resultado.message || resultado.detalle || resultado.error) {
    return [
      normalizarError(
        resultado.error && typeof resultado.error === 'string'
          ? resultado.error
          : resultado
      ),
    ];
  }

  return [];
}

/**
 * Determina si una respuesta del módulo representa un fallo.
 * @param {*} resultado
 * @returns {boolean}
 * @private
 */
function respuestaEsError(resultado) {
  if (resultado === false) return true;
  if (!esObjeto(resultado)) return false;

  return (
    resultado.ok === false ||
    resultado.exito === false ||
    resultado.success === false ||
    resultado.valido === false ||
    resultado.error === true ||
    (typeof resultado.error === 'string' && resultado.error.trim() !== '')
  );
}

/**
 * Determina si el formulario debe considerarse bloqueado por historial.
 * @param {Object} registro
 * @param {Function|null} comprobadorPersonalizado
 * @returns {boolean}
 * @private
 */
function esRegistroHistorico(registro, comprobadorPersonalizado) {
  if (!esObjeto(registro)) return false;

  if (typeof comprobadorPersonalizado === 'function') {
    try {
      if (comprobadorPersonalizado(registro) === true) return true;
    } catch {
      // Si el comprobador falla, se continúa con las reglas generales.
    }
  }

  if (
    registro.historico === true ||
    registro.esHistorico === true ||
    registro.requiereMovimientoCorrectivo === true ||
    registro.movimientoCorrectivo === true ||
    registro.soloLectura === true
  ) {
    return true;
  }

  const estado = String(
    registro.estado || registro.estadoRegistro || registro.situacion || ''
  )
    .trim()
    .toLocaleLowerCase('es');

  if (!estado) return false;

  return ESTADOS_REGISTRO_HISTORICO.some(
    (valor) => estado === valor || estado.startsWith(`${valor} `)
  );
}

/**
 * Busca el identificador de un registro con las claves habituales.
 * @param {Object} registro
 * @param {string|null} clave
 * @returns {string|number|null}
 * @private
 */
function obtenerIdentificadorRegistro(registro, clave = null) {
  if (!esObjeto(registro)) return null;

  if (clave && registro[clave] !== undefined && registro[clave] !== null) {
    return registro[clave];
  }

  for (const nombre of CLAVES_IDENTIFICADOR) {
    if (registro[nombre] !== undefined && registro[nombre] !== null) {
      return registro[nombre];
    }
  }

  const datos = registro.datos || registro.data;
  if (esObjeto(datos)) return obtenerIdentificadorRegistro(datos, clave);

  return null;
}

/**
 * Crea una instantánea serializable para comparar cambios.
 * Los archivos se representan por nombre, tamaño, tipo y fecha.
 * @param {Object} datos
 * @returns {string}
 * @private
 */
function crearInstantanea(datos) {
  try {
    return JSON.stringify(datos, (clave, valor) => {
      if (typeof File !== 'undefined' && valor instanceof File) {
        return {
          nombre: valor.name,
          tamano: valor.size,
          tipo: valor.type,
          modificado: valor.lastModified,
        };
      }

      if (valor instanceof Date) return valor.toISOString();
      if (typeof valor === 'function') return undefined;
      return valor;
    });
  } catch {
    return '';
  }
}

/**
 * Determina si el primer argumento de enviar() es un evento.
 * @param {*} valor
 * @returns {boolean}
 * @private
 */
function esEvento(valor) {
  return Boolean(
    valor &&
      typeof valor === 'object' &&
      typeof valor.preventDefault === 'function' &&
      typeof valor.type === 'string'
  );
}

/* ============================================================================
   4. CONFIRMACIONES
   ============================================================================ */

/**
 * Muestra un diálogo de confirmación accesible y devuelve una promesa con la
 * decisión del usuario. No utiliza innerHTML ni estilos en línea.
 *
 * La confirmación es sólo una protección de interfaz. Las operaciones
 * críticas deben autorizarse y verificarse nuevamente en el backend.
 *
 * @param {Object} [opciones]
 * @param {string} [opciones.titulo='Confirmar operación']
 * @param {string} [opciones.mensaje]
 * @param {string} [opciones.detalle]
 * @param {string} [opciones.textoConfirmar='Confirmar']
 * @param {string} [opciones.textoCancelar='Cancelar']
 * @param {string} [opciones.tipo='advertencia'] info, exito, advertencia, error o critica.
 * @param {boolean} [opciones.peligrosa=false] Usa el estilo de eliminación.
 * @param {boolean} [opciones.cerrarAlHacerClicFuera=true]
 * @returns {Promise<boolean>} true si se confirma.
 */
export function solicitarConfirmacion(opciones = {}) {
  if (typeof document === 'undefined' || !document.body) {
    return Promise.resolve(false);
  }

  const {
    titulo = 'Confirmar operación',
    mensaje = '¿Desea continuar con esta operación?',
    detalle = '',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    tipo = 'advertencia',
    peligrosa = false,
    cerrarAlHacerClicFuera = true,
  } = opciones;

  /* Sólo se permite un diálogo a la vez. Si ya existe uno, se cancela para no
     dejar promesas pendientes ni superponer ventanas. */
  if (confirmacionActiva) confirmacionActiva.cerrar(false);

  const tipoNormalizado = TIPOS_CONFIRMACION.includes(tipo)
    ? tipo
    : 'advertencia';
  const idTitulo = generarId('app-confirmacion-titulo');
  const idTexto = generarId('app-confirmacion-texto');

  const overlay = crearElemento('div', {
    clases: ['app-modal', 'app-modal--confirmacion'],
    atributos: { 'data-app-confirmacion': 'true' },
  });

  const dialogo = crearElemento('div', {
    clases: ['app-modal__dialogo'],
    atributos: {
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': idTitulo,
      'aria-describedby': idTexto,
    },
  });

  const encabezado = crearElemento('div', {
    clases: ['app-modal__encabezado'],
  });

  const tituloElemento = crearElemento('h2', {
    clases: ['app-modal__titulo'],
    atributos: { id: idTitulo },
    texto: titulo,
  });

  encabezado.append(tituloElemento);

  const cuerpo = crearElemento('div', {
    clases: ['app-modal__cuerpo'],
  });

  const icono = crearElemento('span', {
    clases: [
      'app-modal__icono',
      `app-modal__icono--${tipoNormalizado === 'critica' ? 'error' : tipoNormalizado}`,
    ],
    atributos: { 'aria-hidden': 'true' },
    texto: tipoNormalizado === 'exito' ? '✓' : tipoNormalizado === 'info' ? 'i' : '!',
  });

  const textoElemento = crearElemento('p', {
    clases: ['app-modal__descripcion'],
    atributos: { id: idTexto },
    texto: mensaje,
  });

  cuerpo.append(icono, textoElemento);

  if (detalle) {
    cuerpo.append(
      crearElemento('p', {
        clases: ['app-modal__descripcion'],
        texto: detalle,
      })
    );
  }

  const pie = crearElemento('div', {
    clases: ['app-modal__pie'],
  });

  const acciones = crearElemento('div', {
    clases: ['app-modal__acciones'],
  });

  const botonCancelar = crearElemento('button', {
    clases: ['app-btn', 'app-btn--cancelar'],
    atributos: {
      type: 'button',
      'data-app-confirmacion-accion': 'cancelar',
    },
    texto: textoCancelar,
  });

  const botonConfirmar = crearElemento('button', {
    clases: [
      'app-btn',
      peligrosa || tipoNormalizado === 'critica'
        ? 'app-btn--eliminar'
        : 'app-btn--confirmar',
    ],
    atributos: {
      type: 'button',
      'data-app-confirmacion-accion': 'confirmar',
    },
    texto: textoConfirmar,
  });

  acciones.append(botonCancelar, botonConfirmar);
  pie.append(acciones);
  dialogo.append(encabezado, cuerpo, pie);
  overlay.append(dialogo);

  const focoAnterior =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  let resuelto = false;

  const cerrar = (resultado) => {
    if (resuelto) return;
    resuelto = true;

    limpiezaTeclado();
    limpiezaClics();
    overlay.remove();

    if (confirmacionActiva && confirmacionActiva.cerrar === cerrar) {
      confirmacionActiva = null;
    }

    if (focoAnterior && focoAnterior.isConnected) {
      try {
        focoAnterior.focus({ preventScroll: true });
      } catch {
        try {
          focoAnterior.focus();
        } catch {
          // El elemento pudo desaparecer o quedar deshabilitado.
        }
      }
    }

    resolver(Boolean(resultado));
  };

  let resolver = () => {};

  const promesa = new Promise((resolverPromesa) => {
    resolver = resolverPromesa;
  });

  const manejarTeclado = (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      cerrar(false);
      return;
    }

    if (evento.key !== 'Tab') return;

    const enfocables = [botonCancelar, botonConfirmar].filter(
      (boton) => !boton.disabled
    );

    if (enfocables.length === 0) return;

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];

    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  const manejarClic = (evento) => {
    const boton = evento.target.closest
      ? evento.target.closest('[data-app-confirmacion-accion]')
      : null;

    if (boton) {
      cerrar(boton.getAttribute('data-app-confirmacion-accion') === 'confirmar');
      return;
    }

    if (evento.target === overlay && cerrarAlHacerClicFuera) {
      cerrar(false);
    }
  };

  const limpiezaTeclado = escucharEvento(overlay, 'keydown', manejarTeclado);
  const limpiezaClics = escucharEvento(overlay, 'click', manejarClic);

  document.body.append(overlay);

  const enfocarInicial =
    opciones.enfocarConfirmar === true ? botonConfirmar : botonCancelar;

  queueMicrotask(() => {
    try {
      enfocarInicial.focus({ preventScroll: true });
    } catch {
      try {
        enfocarInicial.focus();
      } catch {
        // Sin foco disponible; el diálogo sigue siendo anunciado por ARIA.
      }
    }
  });

  confirmacionActiva = { cerrar };

  return promesa;
}

/* ============================================================================
   5. MENSAJES, ESTADO DE ENVÍO Y AVISOS DE FECHA
   ============================================================================ */

/**
 * Obtiene o crea el contenedor de mensajes en línea del formulario.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {HTMLElement|null}
 * @private
 */
function obtenerContenedorMensajes(formulario, config) {
  if (config.contenedorMensajes) {
    const indicado =
      typeof config.contenedorMensajes === 'string'
        ? obtenerElemento(config.contenedorMensajes, formulario) ||
          obtenerElemento(config.contenedorMensajes)
        : config.contenedorMensajes;

    if (indicado instanceof Element) {
      if (config.reemplazarMensajes !== false) limpiarMensajes(indicado);
      return indicado;
    }
  }

  const existente = formulario.querySelector(SELECTORES.MENSAJES);
  if (existente) return existente;

  if (config.crearContenedorMensajes === false) return null;

  const contenedor = crearElemento('div', {
    clases: ['app-formulario__mensajes'],
    atributos: {
      [ATRIBUTOS.CREADO]: 'true',
      'aria-live': 'polite',
    },
  });

  elementosCreados.add(contenedor);
  formulario.prepend(contenedor);

  return contenedor;
}

/**
 * Obtiene o crea el indicador textual del estado del envío.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {HTMLElement|null}
 * @private
 */
function obtenerEstadoEnvio(formulario, config) {
  if (config.estadoEnvio === false) return null;

  let existente = null;

  if (config.estadoEnvio && config.estadoEnvio instanceof Element) {
    existente = config.estadoEnvio;
  } else if (typeof config.estadoEnvio === 'string') {
    existente =
      obtenerElemento(config.estadoEnvio, formulario) ||
      obtenerElemento(config.estadoEnvio);
  } else {
    existente = formulario.querySelector(SELECTORES.ESTADO_ENVIO);
  }

  if (existente) return existente;

  if (config.crearEstadoEnvio === false) return null;

  const estado = crearElemento('span', {
    clases: ['app-formulario__estado-envio'],
    atributos: {
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      [ATRIBUTOS.CREADO]: 'true',
    },
  });

  estado.hidden = true;
  elementosCreados.add(estado);

  const acciones = formulario.querySelector(SELECTORES.ACCIONES);
  const pie = formulario.querySelector(SELECTORES.PIE);

  if (acciones) {
    acciones.prepend(estado);
  } else if (pie) {
    pie.prepend(estado);
  } else {
    formulario.append(estado);
  }

  return estado;
}

/**
 * Actualiza el texto y el tono del estado de envío.
 * @param {HTMLElement|null} estado
 * @param {string} texto
 * @param {string} [tipo] exito, error o vacio.
 * @returns {void}
 * @private
 */
function actualizarEstadoEnvio(estado, texto, tipo = '') {
  if (!estado) return;

  quitarClases(
    estado,
    'app-formulario__estado-envio--exito',
    'app-formulario__estado-envio--error'
  );

  estado.replaceChildren();

  if (!texto) {
    estado.hidden = true;
    return;
  }

  estado.hidden = false;

  if (tipo === 'exito' || tipo === 'error') {
    agregarClases(estado, `app-formulario__estado-envio--${tipo}`);
    estado.append(
      crearElemento('span', {
        clases: ['app-formulario__estado-envio-icono'],
        atributos: { 'aria-hidden': 'true' },
        texto: tipo === 'exito' ? '✓' : '!',
      })
    );
  }

  estado.append(crearElemento('span', { texto }));
}

/**
 * Muestra un mensaje en el formulario y aplica los errores por campo.
 * @param {HTMLFormElement} formulario
 * @param {HTMLElement|null} contenedor
 * @param {Array<Object>} errores
 * @param {Object} config
 * @param {string} [titulo]
 * @returns {void}
 * @private
 */
function mostrarErroresFormulario(
  formulario,
  contenedor,
  errores,
  config,
  titulo = TEXTOS.resumenErrores
) {
  const lista = Array.isArray(errores) ? errores : [];

  for (const error of lista) {
    if (!error.campo) continue;

    const campo = formulario.elements.namedItem(error.campo);
    if (!campo) continue;

    marcarErrorCampo(campo, error.mensaje, {
      detalle: error.detalle,
      destacado: config.destacarErrores !== false,
    });
  }

  if (lista.length > 0) {
    mostrarResumenErrores(contenedor, lista, { titulo });
  }
}

/**
 * Resuelve los campos marcados como fecha efectiva.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {HTMLElement[]}
 * @private
 */
function obtenerCamposFechaEfectiva(formulario, config) {
  const encontrados = new Set(
    Array.from(formulario.querySelectorAll(`[${ATRIBUTOS.FECHA_EFECTIVA}]`))
  );

  const fuentes = config.fechasEfectivas;
  const lista = Array.isArray(fuentes) ? fuentes : fuentes ? [fuentes] : [];

  for (const fuente of lista) {
    if (fuente instanceof Element) {
      encontrados.add(fuente);
      continue;
    }

    if (typeof fuente !== 'string') continue;

    const porNombre = formulario.elements.namedItem(fuente);

    if (porNombre instanceof Element) {
      encontrados.add(porNombre);
      continue;
    }

    const porSelector = formulario.querySelector(fuente);
    if (porSelector) encontrados.add(porSelector);
  }

  return Array.from(encontrados).filter(
    (campo) => campo instanceof HTMLElement && campo.matches('input, select, textarea')
  );
}

/**
 * Obtiene el contenedor visual de un campo.
 * @param {HTMLElement} campo
 * @returns {HTMLElement}
 * @private
 */
function obtenerContenedorCampo(campo) {
  return campo.closest(SELECTORES.CAMPO) || campo.parentElement || campo;
}

/**
 * Elimina el aviso de fecha de un campo.
 * @param {HTMLElement} campo
 * @returns {void}
 * @private
 */
function quitarAvisoFecha(campo) {
  const contenedor = obtenerContenedorCampo(campo);
  const aviso = contenedor.querySelector(`[${ATRIBUTOS.AVISO_FECHA}]`);
  if (aviso) aviso.remove();
}

/**
 * Actualiza el aviso de fecha efectiva sin modificar el valor ni el mínimo.
 * @param {HTMLElement} campo
 * @param {Object} config
 * @returns {{valido: boolean, retroactiva: boolean, futura: boolean, fecha: Date|null}}
 * @private
 */
function actualizarAvisoFecha(campo, config) {
  quitarAvisoFecha(campo);

  const valor = obtenerValorCampo(campo);
  const resultado = validarFechaEfectiva(valor, {
    campo: campo.name || null,
    obligatorio: false,
    permitirRetroactiva: true,
    permitirFutura: config.permitirFechaFutura !== false,
  });

  if (!resultado.valido || !resultado.valor) {
    return { valido: false, retroactiva: false, futura: false, fecha: null };
  }

  const diferencia = compararFechasPorDia(resultado.valor, new Date());

  if (Number.isNaN(diferencia) || diferencia === 0) {
    return {
      valido: true,
      retroactiva: false,
      futura: false,
      fecha: resultado.valor,
    };
  }

  const retroactiva = diferencia < 0;
  const texto = retroactiva ? TEXTOS.fechaRetroactiva : TEXTOS.fechaFutura;

  const aviso = crearElemento('p', {
    clases: ['app-campo__aviso-fecha'],
    atributos: {
      [ATRIBUTOS.AVISO_FECHA]: retroactiva ? 'retroactiva' : 'futura',
    },
  });

  aviso.append(
    crearElemento('span', {
      clases: ['app-campo__aviso-fecha-icono'],
      atributos: { 'aria-hidden': 'true' },
      texto: '!',
    }),
    crearElemento('span', { texto })
  );

  obtenerContenedorCampo(campo).append(aviso);

  return { valido: true, retroactiva, futura: !retroactiva, fecha: resultado.valor };
}

/**
 * Actualiza todos los avisos de fecha del formulario.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {Array<Object>}
 * @private
 */
function actualizarAvisosFecha(formulario, config) {
  return obtenerCamposFechaEfectiva(formulario, config).map((campo) => ({
    campo,
    ...actualizarAvisoFecha(campo, config),
  }));
}

/**
 * Valida las fechas efectivas y devuelve los errores encontrados. No impone la
 * fecha de hoy como mínimo ni reemplaza el valor capturado.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {Array<Object>}
 * @private
 */
function validarFechasEfectivas(formulario, config) {
  const errores = [];

  for (const campo of obtenerCamposFechaEfectiva(formulario, config)) {
    const valor = obtenerValorCampo(campo);
    const obligatorio =
      config.fechasObligatorias === true ||
      campo.required === true ||
      campo.getAttribute('aria-required') === 'true';

    const resultado = validarFechaEfectiva(valor, {
      campo: campo.name || null,
      obligatorio,
      permitirRetroactiva: true,
      permitirFutura: config.permitirFechaFutura !== false,
    });

    if (!resultado.valido) {
      errores.push(normalizarError(resultado, campo.name || null));
    }
  }

  return errores;
}

/**
 * Devuelve los avisos de retroactividad para incluirlos en la confirmación.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {string}
 * @private
 */
function obtenerDetalleFechas(formulario, config) {
  const avisos = actualizarAvisosFecha(formulario, config);
  const retroactivas = avisos.filter((aviso) => aviso.retroactiva);

  if (retroactivas.length === 0) return '';

  return retroactivas.length === 1
    ? TEXTOS.fechaRetroactiva
    : `Se registrarán ${retroactivas.length} fechas efectivas retroactivas. La fecha real de registro la asignará el sistema.`;
}

/* ============================================================================
   6. DATOS DEL FORMULARIO
   ============================================================================ */

/**
 * Indica si un valor contiene información utilizable.
 * @param {*} valor
 * @returns {boolean}
 * @private
 */
function valorTieneContenido(valor) {
  if (Array.isArray(valor)) return valor.some((item) => valorTieneContenido(item));
  if (valor === false || valor === null || valor === undefined) return false;
  if (valor === true) return true;
  return String(valor).trim() !== '';
}

/**
 * Obtiene el valor de una ruta con notación de puntos.
 * @param {Object} objeto
 * @param {string} ruta
 * @returns {*}
 * @private
 */
function obtenerValorRuta(objeto, ruta) {
  if (!esObjeto(objeto) || !ruta) return undefined;

  return String(ruta)
    .split('.')
    .reduce(
      (actual, parte) =>
        actual !== null && actual !== undefined ? actual[parte] : undefined,
      objeto
    );
}

/**
 * Convierte el valor textual de un control según su tipo.
 * @param {HTMLElement} elemento
 * @param {*} valor
 * @returns {*}
 * @private
 */
function convertirValor(elemento, valor) {
  if (valor === null || valor === undefined) return '';

  const tipoDato = elemento.getAttribute(ATRIBUTOS.TIPO);

  if (tipoDato === 'booleano') {
    return valor === true || valor === 'true' || valor === '1' || valor === 1;
  }

  if (tipoDato === 'entero') {
    const numero = Number.parseInt(String(valor), 10);
    return Number.isNaN(numero) ? '' : numero;
  }

  if (tipoDato === 'decimal' || tipoDato === 'numero') {
    const numero = Number(String(valor).replace(',', '.'));
    return Number.isNaN(numero) ? '' : numero;
  }

  if (elemento.type === 'number' || elemento.type === 'range') {
    if (String(valor).trim() === '') return '';
    const numero = Number(valor);
    return Number.isNaN(numero) ? valor : numero;
  }

  if (
    elemento.tagName === 'TEXTAREA' ||
    ['text', 'search', 'email', 'tel', 'url'].includes(elemento.type)
  ) {
    return String(valor).trim();
  }

  return valor;
}

/**
 * Recorre los controles que participan en el envío.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {HTMLElement[]}
 * @private
 */
function obtenerControlesEnviables(formulario, config) {
  return Array.from(formulario.elements).filter((elemento) => {
    if (!(elemento instanceof HTMLElement)) return false;
    if (!elemento.name) return false;
    if (elemento.hasAttribute(ATRIBUTOS.OMITIR)) return false;
    if (['submit', 'reset', 'button', 'image'].includes(elemento.type)) {
      return false;
    }
    if (elemento.disabled && config.incluirDeshabilitados !== true) return false;
    return true;
  });
}

/**
 * Recopila los datos actuales del formulario.
 *
 * Los campos con el mismo nombre se agrupan en arreglos. Un checkbox único
 * produce un booleano; un grupo de checkboxes produce un arreglo de valores.
 * Los campos pueden convertir su valor con data-app-tipo="numero|entero|
 * decimal|booleano|texto" o con data-app-omitir para excluirlos.
 *
 * @param {HTMLFormElement} formulario
 * @param {Object} [config]
 * @returns {Object<string, *>}
 * @private
 */
function recopilarDatos(formulario, config = {}) {
  const grupos = new Map();

  for (const elemento of obtenerControlesEnviables(formulario, config)) {
    const nombreOriginal = elemento.name;
    const esArreglo = nombreOriginal.endsWith('[]');
    const nombre = esArreglo ? nombreOriginal.slice(0, -2) : nombreOriginal;
    const clave = `${nombre}::${elemento.type}`;

    if (!grupos.has(clave)) {
      grupos.set(clave, {
        nombre,
        tipo: elemento.type,
        esArreglo,
        elementos: [],
        valores: [],
      });
    }

    const grupo = grupos.get(clave);
    grupo.elementos.push(elemento);

    if (elemento.type === 'radio') {
      if (elemento.checked) grupo.valores.push(elemento.value);
      continue;
    }

    if (elemento.type === 'checkbox') {
      if (elemento.checked) {
        grupo.valores.push(elemento.value === 'on' ? true : elemento.value);
      }
      continue;
    }

    if (elemento.type === 'file') {
      grupo.valores.push(
        elemento.files && elemento.files.length > 0
          ? Array.from(elemento.files)
          : []
      );
      continue;
    }

    if (elemento.tagName === 'SELECT' && elemento.multiple) {
      grupo.valores.push(
        Array.from(elemento.selectedOptions).map((opcion) => opcion.value)
      );
      continue;
    }

    grupo.valores.push(
      convertirValor(elemento, obtenerValorCampo(elemento))
    );
  }

  const datos = {};

  for (const grupo of grupos.values()) {
    if (grupo.tipo === 'file') {
      datos[grupo.nombre] = grupo.valores[0] || [];
      continue;
    }

    if (grupo.tipo === 'checkbox') {
      if (grupo.esArreglo || grupo.elementos.length > 1) {
        datos[grupo.nombre] = grupo.valores;
      } else {
        datos[grupo.nombre] = grupo.valores.length > 0;
      }
      continue;
    }

    if (grupo.tipo === 'radio') {
      datos[grupo.nombre] = grupo.valores[0] ?? '';
      continue;
    }

    if (grupo.esArreglo) {
      datos[grupo.nombre] = grupo.valores[0] || [];
      continue;
    }

    datos[grupo.nombre] = grupo.valores[0] ?? '';
  }

  return datos;
}

/**
 * Busca el valor de un campo dentro de un registro.
 * @param {Object} registro
 * @param {string} nombre
 * @param {Object} config
 * @returns {*}
 * @private
 */
function obtenerValorDeRegistro(registro, nombre, config) {
  if (!esObjeto(registro)) return undefined;

  const mapeo = config.mapeo;

  if (esObjeto(mapeo) && Object.prototype.hasOwnProperty.call(mapeo, nombre)) {
    const indicado = mapeo[nombre];

    if (typeof indicado === 'function') {
      try {
        return indicado(registro, nombre);
      } catch {
        return undefined;
      }
    }

    if (typeof indicado === 'string') {
      return obtenerValorRuta(registro, indicado);
    }
  }

  const nombreBase = nombre.endsWith('[]') ? nombre.slice(0, -2) : nombre;

  if (registro[nombreBase] !== undefined) return registro[nombreBase];

  const datos = registro.datos || registro.data;
  if (esObjeto(datos) && datos[nombreBase] !== undefined) {
    return datos[nombreBase];
  }

  const buscado = normalizarNombre(nombreBase);
  const clave = Object.keys(registro).find(
    (actual) => normalizarNombre(actual) === buscado
  );

  if (clave !== undefined) return registro[clave];

  return undefined;
}

/**
 * Extrae el identificador de un valor que puede ser un objeto.
 * @param {*} valor
 * @returns {*}
 * @private
 */
function valorPlano(valor) {
  if (!esObjeto(valor)) return valor;
  if (valor.id !== undefined) return valor.id;
  if (valor.identificador !== undefined) return valor.identificador;
  if (valor.codigo !== undefined) return valor.codigo;
  if (valor.valor !== undefined) return valor.valor;
  return valor;
}

/**
 * Selecciona un valor en un elemento select, agregando la opción si el valor
 * del registro no existe en el HTML actual.
 * @param {HTMLSelectElement} select
 * @param {*} valor
 * @param {Object} config
 * @returns {void}
 * @private
 */
function seleccionarValorSelect(select, valor, config) {
  const valores = Array.isArray(valor)
    ? valor.map(valorPlano).filter((item) => item !== null && item !== undefined)
    : [valorPlano(valor)].filter(
        (item) => item !== null && item !== undefined
      );

  const valoresTexto = valores.map((item) => String(item));

  for (const opcion of Array.from(select.options)) {
    opcion.selected = valoresTexto.includes(opcion.value);
  }

  if (select.multiple) return;

  if (valoresTexto.length === 0) {
    select.value = '';
    return;
  }

  if (select.selectedIndex >= 0) return;

  if (config.agregarOpcionesDesconocidas === false) {
    select.value = '';
    return;
  }

  const opcion = crearElemento('option', {
    atributos: { value: valoresTexto[0] },
    texto: valoresTexto[0],
  });

  select.append(opcion);
  select.value = valoresTexto[0];
}

/**
 * Ajusta el valor de un control al cargar un registro.
 * @param {HTMLElement} elemento
 * @param {*} valor
 * @param {Object} config
 * @returns {void}
 * @private
 */
function aplicarValorControl(elemento, valor, config) {
  if (elemento.type === 'file') return;

  if (elemento.tagName === 'SELECT') {
    seleccionarValorSelect(elemento, valor, config);
    return;
  }

  if (elemento.type === 'checkbox') {
    if (Array.isArray(valor)) {
      elemento.checked = valor
        .map((item) => String(valorPlano(item)))
        .includes(String(elemento.value));
      return;
    }

    if (typeof valor === 'boolean') {
      elemento.checked = valor;
      return;
    }

    if (valor === null || valor === undefined || valor === '') {
      elemento.checked = false;
      return;
    }

    elemento.checked =
      String(valorPlano(valor)) === String(elemento.value) ||
      valor === true ||
      valor === 1 ||
      valor === '1' ||
      valor === 'true';
    return;
  }

  if (elemento.type === 'radio') {
    elemento.checked = String(valorPlano(valor)) === String(elemento.value);
    return;
  }

  let texto =
    valor === null || valor === undefined
      ? ''
      : String(valorPlano(valor));

  if (elemento.type === 'date' && texto.includes('T')) {
    texto = texto.split('T')[0];
  } else if (elemento.type === 'datetime-local' && texto.includes('T')) {
    texto = texto.slice(0, 16);
  } else if (elemento.type === 'time' && texto.includes('T')) {
    texto = texto.split('T')[1].slice(0, 8);
  }

  elemento.value = texto;
}

/**
 * Carga un registro en el formulario.
 * @param {HTMLFormElement} formulario
 * @param {Object} registro
 * @param {Object} config
 * @returns {number} Cantidad de campos actualizados.
 * @private
 */
function cargarRegistroEnFormulario(formulario, registro, config) {
  let actualizados = 0;

  for (const elemento of obtenerControlesEnviables(formulario, {
    ...config,
    incluirDeshabilitados: true,
  })) {
    if (elemento.type === 'file') continue;

    const valor = obtenerValorDeRegistro(registro, elemento.name, config);

    if (valor === undefined) continue;

    aplicarValorControl(elemento, valor, config);
    actualizados += 1;
  }

  if (typeof config.alCargar === 'function') {
    try {
      config.alCargar(registro, formulario);
    } catch {
      // Un callback de presentación no debe impedir la carga del registro.
    }
  }

  return actualizados;
}

/**
 * Limpia un control sin ejecutar el reset nativo.
 * @param {HTMLElement} elemento
 * @returns {void}
 * @private
 */
function limpiarControl(elemento) {
  if (elemento.type === 'file') {
    elemento.value = '';
    return;
  }

  if (elemento.tagName === 'SELECT') {
    for (const opcion of Array.from(elemento.options)) opcion.selected = false;
    elemento.selectedIndex = -1;
    return;
  }

  if (elemento.type === 'checkbox' || elemento.type === 'radio') {
    elemento.checked = false;
    return;
  }

  elemento.value = '';
}

/**
 * Restablece un control a su valor predeterminado del HTML.
 * @param {HTMLElement} elemento
 * @returns {void}
 * @private
 */
function restablecerControl(elemento) {
  if (elemento.type === 'file') {
    elemento.value = '';
    return;
  }

  if (elemento.tagName === 'SELECT') {
    for (const opcion of Array.from(elemento.options)) {
      opcion.selected = opcion.defaultSelected;
    }
    return;
  }

  if (elemento.type === 'checkbox' || elemento.type === 'radio') {
    elemento.checked = elemento.defaultChecked;
    return;
  }

  elemento.value = elemento.defaultValue ?? '';
}

/**
 * Emite un evento personalizado desde el formulario.
 * @param {HTMLFormElement} formulario
 * @param {string} nombre
 * @param {Object} [detalle]
 * @returns {void}
 * @private
 */
function emitirEvento(formulario, nombre, detalle = {}) {
  if (typeof CustomEvent !== 'function') return;

  try {
    formulario.dispatchEvent(
      new CustomEvent(nombre, {
        detail: detalle,
        bubbles: true,
        cancelable: false,
      })
    );
  } catch {
    // La falta de soporte de CustomEvent no interrumpe el formulario.
  }
}

/* ============================================================================
   7. DEPENDENCIAS ENTRE CAMPOS
   ============================================================================ */

/**
 * Busca un control por nombre dentro del formulario.
 * @param {HTMLFormElement} formulario
 * @param {string} nombre
 * @returns {HTMLElement|null}
 * @private
 */
function buscarControlPorNombre(formulario, nombre) {
  if (!nombre) return null;

  const directo = formulario.elements.namedItem(nombre);
  if (directo instanceof HTMLElement) return directo;

  const porSelector = formulario.querySelector(
    `[name="${String(nombre).replace(/["\\]/g, '\\$&')}"]`
  );

  return porSelector instanceof HTMLElement ? porSelector : null;
}

/**
 * Construye la lista efectiva de dependencias del formulario.
 * @param {HTMLFormElement} formulario
 * @param {Object} config
 * @returns {Array<Object>}
 * @private
 */
function construirDependencias(formulario, config) {
  const resultado = [];
  const vistos = new Set();

  const agregar = (dependiente, fuentes, mensaje, limpiar) => {
    if (!(dependiente instanceof HTMLElement) || fuentes.length === 0) return;

    const clave = `${dependiente.name}::${fuentes
      .map((fuente) => fuente.name)
      .sort()
      .join('|')}`;

    if (vistos.has(clave)) return;
    vistos.add(clave);

    resultado.push({
      dependiente,
      fuentes,
      mensaje: mensaje || TEXTOS.seleccioneDependencia,
      limpiar: limpiar !== false,
    });
  };

  /* Dependencias declaradas explícitamente en el HTML. */
  for (const dependiente of formulario.querySelectorAll(
    `[${ATRIBUTOS.DEPENDE_DE}]`
  )) {
    const nombres = String(
      dependiente.getAttribute(ATRIBUTOS.DEPENDE_DE) || ''
    )
      .split(/[\s,;]+/)
      .filter(Boolean);

    const fuentes = nombres
      .map((nombre) => buscarControlPorNombre(formulario, nombre))
      .filter((fuente) => fuente instanceof HTMLElement);

    agregar(
      dependiente,
      fuentes,
      dependiente.getAttribute('data-app-mensaje-dependencia'),
      dependiente.getAttribute('data-app-limpiar-dependiente') !== 'false'
    );
  }

  const controles = Array.from(formulario.elements).filter(
    (elemento) => elemento instanceof HTMLElement && elemento.name
  );

  /* Dependencias comunes: producto/medicamento -> lote; departamento -> servicio. */
  for (const regla of DEPENDENCIAS_COMUNES) {
    const dependiente = controles.find((elemento) =>
      nombreCorresponde(elemento.name, regla.campo)
    );

    if (!dependiente) continue;

    const fuentes = controles.filter((elemento) =>
      regla.dependeDe.some((base) => nombreCorresponde(elemento.name, base))
    );

    agregar(dependiente, fuentes, regla.descripcion, true);
  }

  /* Dependencias personalizadas del módulo. */
  const personalizadas = Array.isArray(config.dependencias)
    ? config.dependencias
    : [];

  for (const regla of personalizadas) {
    if (!esObjeto(regla)) continue;

    const dependiente = regla.campo
      ? buscarControlPorNombre(formulario, regla.campo)
      : null;

    if (!dependiente) continue;

    const nombres = Array.isArray(regla.dependeDe)
      ? regla.dependeDe
      : [regla.dependeDe];

    const fuentes = nombres
      .map((nombre) => buscarControlPorNombre(formulario, nombre))
      .filter((fuente) => fuente instanceof HTMLElement);

    agregar(
      dependiente,
      fuentes,
      regla.descripcion || regla.mensaje,
      regla.limpiar !== false
    );
  }

  return resultado;
}

/**
 * Activa o desactiva un campo dependiente según sus fuentes.
 * @param {Object} dependencia
 * @param {Object} config
 * @param {boolean} [limpiar=false] Limpia el dependiente cuando no hay fuente.
 * @returns {boolean} true si la dependencia está activa.
 * @private
 */
function actualizarDependencia(dependencia, config, limpiar = false) {
  const { dependiente, fuentes, mensaje } = dependencia;

  const activa = fuentes.some((fuente) =>
    valorTieneContenido(obtenerValorCampo(fuente))
  );

  if (!activa && limpiar && dependencia.limpiar) {
    limpiarControl(dependiente);
    quitarAvisoFecha(dependiente);
    limpiarErrorCampo(dependiente);
    emitirEvento(
      dependiente.form || dependiente,
      'app:dependencia:limpiada',
      { campo: dependiente.name, fuentes: fuentes.map((fuente) => fuente.name) }
    );
  }

  if (config.deshabilitarDependientes !== false) {
    if (!activa) {
      if (!dependiente.disabled) {
        dependiente.setAttribute('data-app-dependencia-bloqueada', 'true');
        dependiente.disabled = true;
      }
    } else if (
      dependiente.getAttribute('data-app-dependencia-bloqueada') === 'true'
    ) {
      dependiente.disabled = false;
      dependiente.removeAttribute('data-app-dependencia-bloqueada');
    }
  }

  if (!activa) {
    dependiente.setAttribute('aria-disabled', 'true');
    if (mensaje && !dependiente.getAttribute('title')) {
      dependiente.setAttribute('title', mensaje);
      dependiente.setAttribute('data-app-title-dependencia', 'true');
    }
  } else {
    dependiente.removeAttribute('aria-disabled');
    if (dependiente.getAttribute('data-app-title-dependencia') === 'true') {
      dependiente.removeAttribute('title');
      dependiente.removeAttribute('data-app-title-dependencia');
    }
  }

  if (dependiente.form) {
    emitirEvento(dependiente.form, 'app:dependencia:cambiada', {
      campo: dependiente.name,
      activa,
      fuentes: fuentes.map((fuente) => fuente.name),
    });
  }

  return activa;
}

/**
 * Actualiza todas las dependencias; repite una pasada adicional para cubrir
 * cadenas simples (por ejemplo departamento -> servicio -> oficina).
 * @param {Array<Object>} dependencias
 * @param {Object} config
 * @param {boolean} [limpiar=false]
 * @returns {void}
 * @private
 */
function actualizarDependencias(dependencias, config, limpiar = false) {
  for (const dependencia of dependencias) {
    actualizarDependencia(dependencia, config, limpiar);
  }

  for (const dependencia of dependencias) {
    actualizarDependencia(dependencia, config, false);
  }
}

/**
 * Asocia un control con sus dependencias por nombre.
 * @param {Array<Object>} dependencias
 * @param {HTMLElement} control
 * @returns {Array<Object>}
 * @private
 */
function dependenciasDelControl(dependencias, control) {
  return dependencias.filter((dependencia) =>
    dependencia.fuentes.some((fuente) => fuente === control)
  );
}

/* ============================================================================
   8. INICIALIZACIÓN Y CONTROLADOR
   ============================================================================ */

/**
 * Inicializa un formulario existente y devuelve un controlador independiente.
 *
 * No se inicializan formularios automáticamente: cada módulo debe llamar a
 * esta función para el formulario que desea administrar. Se puede llamar más
 * de una vez sobre el mismo formulario; en ese caso se devuelve el controlador
 * existente salvo que se indique `reutilizar: false`.
 *
 * @param {HTMLFormElement|string} formulario Formulario o selector.
 * @param {Object} [opciones]
 * @param {string} [opciones.nombre] Nombre interno del formulario.
 * @param {string} [opciones.modo='registro'] registro o edicion.
 * @param {Array|Object|Function} [opciones.reglas] Reglas de validaciones.js.
 * @param {Function} [opciones.validar] Validación adicional del módulo.
 * @param {Function} [opciones.enviar] Función de envío (datos, contexto).
 * @param {Object} [opciones.conexion] Objeto con crear/actualizar/anular.
 * @param {Object} [opciones.autorizaciones] Autorizaciones de interfaz.
 * @param {Object} [opciones.mapeo] Mapa campo -> ruta o función del registro.
 * @param {Array} [opciones.dependencias] Dependencias adicionales.
 * @param {Array|string|Element} [opciones.fechasEfectivas] Fechas efectivas.
 * @param {boolean} [opciones.inicializarAutomatica=false] No se usa aquí.
 * @returns {Object} Controlador del formulario.
 */
export function inicializarFormulario(formulario, opciones = {}) {
  const elemento = resolverFormulario(formulario);

  if (!elemento) {
    throw new TypeError(
      'inicializarFormulario requiere un elemento <form> o un selector válido.'
    );
  }

  const existente = controladores.get(elemento);

  if (existente && opciones.reutilizar !== false) return existente;
  if (existente) existente.destruir();

  const config = {
    nombre:
      opciones.nombre ||
      elemento.id ||
      elemento.getAttribute('name') ||
      'formulario',
    modo: opciones.modo === 'edicion' ? 'edicion' : 'registro',
    reglas: opciones.reglas || opciones.validaciones || [],
    validar:
      typeof opciones.validar === 'function' ? opciones.validar : null,
    enviar:
      typeof opciones.enviar === 'function'
        ? opciones.enviar
        : typeof opciones.alGuardar === 'function'
          ? opciones.alGuardar
          : typeof opciones.alEnviar === 'function'
            ? opciones.alEnviar
            : typeof opciones.guardar === 'function'
              ? opciones.guardar
              : null,
    conexion:
      opciones.conexion || opciones.api || opciones.servicio || null,
    accion: opciones.accion || null,
    autorizaciones: esObjeto(opciones.autorizaciones)
      ? opciones.autorizaciones
      : esObjeto(opciones.permisos)
        ? opciones.permisos
        : {},
    autorizar:
      typeof opciones.autorizar === 'function' ? opciones.autorizar : null,
    requerirAutorizacionAnulacion:
      opciones.requerirAutorizacionAnulacion !== false,
    confirmaciones: opciones.confirmaciones !== false,
    confirmarGuardar: opciones.confirmarGuardar !== false,
    confirmarAnular: opciones.confirmarAnular !== false,
    confirmarLimpiar: opciones.confirmarLimpiar !== false,
    confirmarCancelar: opciones.confirmarCancelar !== false,
    confirmarAlSalir: opciones.confirmarAlSalir !== false,
    validarCambios: opciones.validarCambios !== false,
    validarAlSalir: opciones.validarAlSalir !== false,
    limpiarAlGuardar: opciones.limpiarAlGuardar !== false,
    deshabilitarDependientes: opciones.deshabilitarDependientes !== false,
    crearContenedorMensajes: opciones.crearContenedorMensajes !== false,
    crearEstadoEnvio: opciones.crearEstadoEnvio !== false,
    prevenirPerdidaDatos: opciones.prevenirPerdidaDatos !== false,
    permitirFechaFutura: opciones.permitirFechaFutura !== false,
    incluirDeshabilitados: opciones.incluirDeshabilitados === true,
    agregarOpcionesDesconocidas: opciones.agregarOpcionesDesconocidas !== false,
    sincronizarSeleccion: opciones.sincronizarSeleccion !== false,
    marcarValidos: opciones.marcarValidos === true,
    destacarErrores: opciones.destacarErrores !== false,
    reemplazarMensajes: opciones.reemplazarMensajes !== false,
    contenedorMensajes: opciones.contenedorMensajes || null,
    estadoEnvio: opciones.estadoEnvio ?? null,
    contenedorCarga: opciones.contenedorCarga || null,
    mapeo: esObjeto(opciones.mapeo) ? opciones.mapeo : {},
    dependencias: Array.isArray(opciones.dependencias)
      ? opciones.dependencias
      : [],
    fechasEfectivas: opciones.fechasEfectivas || [],
    fechasObligatorias: opciones.fechasObligatorias === true,
    claveIdentificador: opciones.claveIdentificador || null,
    textos: {
      ...TEXTOS,
      ...(esObjeto(opciones.textos) ? opciones.textos : {}),
    },
    alCargar:
      typeof opciones.alCargar === 'function' ? opciones.alCargar : null,
    alCambiar:
      typeof opciones.alCambiar === 'function' ? opciones.alCambiar : null,
    alExito:
      typeof opciones.alExito === 'function' ? opciones.alExito : null,
    alError:
      typeof opciones.alError === 'function' ? opciones.alError : null,
    alCancelar:
      typeof opciones.alCancelar === 'function' ? opciones.alCancelar : null,
    alLimpiar:
      typeof opciones.alLimpiar === 'function' ? opciones.alLimpiar : null,
    alSeleccionar:
      typeof opciones.alSeleccionar === 'function'
        ? opciones.alSeleccionar
        : null,
    alFinalizar:
      typeof opciones.alFinalizar === 'function' ? opciones.alFinalizar : null,
    alBloquear:
      typeof opciones.alBloquear === 'function' ? opciones.alBloquear : null,
  };

  const estado = {
    modo: config.modo,
    estado: ESTADOS_FORMULARIO.INICIAL,
    bloqueado: false,
    historico: false,
    motivoBloqueo: '',
    registro: null,
    identificador: null,
    instantanea: null,
    modificado: false,
    enviando: false,
    promesa: null,
    ultimaRespuesta: null,
    errores: [],
    destruido: false,
  };

  const contenedorMensajes = obtenerContenedorMensajes(elemento, config);
  const estadoEnvio = obtenerEstadoEnvio(elemento, config);
  const dependencias = construirDependencias(elemento, config);
  const limpiezas = [];
  const botonesDeshabilitados = new Map();
  const deshabilitadosPorBloqueo = new Map();
  let controlador = null;

  /**
   * Instantánea de todos los campos, incluidos los deshabilitados, para
   * detectar cambios sin confundir dependencias con ediciones del usuario.
   * @returns {string}
   */
  const instantaneaActual = () =>
    crearInstantanea(
      recopilarDatos(elemento, { ...config, incluirDeshabilitados: true })
    );

  const selectoresBotones = {
    enviar:
      '[data-app-accion="guardar"], [data-app-accion="enviar"], [data-app-accion="crear"], button[type="submit"]:not([data-app-accion]), input[type="submit"]:not([data-app-accion])',
    limpiar: '[data-app-accion="limpiar"]',
    cancelar:
      '[data-app-accion="cancelar"], button[type="reset"]:not([data-app-accion]), input[type="reset"]:not([data-app-accion])',
    anular: '[data-app-accion="anular"]',
    editar: '[data-app-accion="editar"]',
  };

  /**
   * Resuelve un botón indicado por opciones o por selector.
   * @param {Element|string|null} indicado
   * @param {string} selector
   * @returns {HTMLElement|null}
   */
  const resolverBoton = (indicado, selector) => {
    if (indicado instanceof HTMLElement) return indicado;

    if (typeof indicado === 'string') {
      const encontrado =
        obtenerElemento(indicado, elemento) || obtenerElemento(indicado);
      if (encontrado instanceof HTMLElement) return encontrado;
    }

    const boton = elemento.querySelector(selector);
    return boton instanceof HTMLElement ? boton : null;
  };

  const botones = {
    enviar: resolverBoton(
      opciones.botonEnviar || opciones.botonGuardar,
      selectoresBotones.enviar
    ),
    limpiar: resolverBoton(
      opciones.botonLimpiar,
      selectoresBotones.limpiar
    ),
    cancelar: resolverBoton(
      opciones.botonCancelar,
      selectoresBotones.cancelar
    ),
    anular: resolverBoton(opciones.botonAnular, selectoresBotones.anular),
    editar: resolverBoton(opciones.botonEditar, selectoresBotones.editar),
  };

  /**
   * Cambia el estado interno y lo refleja en el formulario.
   * @param {string} nuevo
   * @returns {void}
   */
  const cambiarEstado = (nuevo) => {
    estado.estado = nuevo;
    elemento.setAttribute(ATRIBUTOS.ESTADO, nuevo);
  };

  /**
   * Muestra un mensaje en el contenedor del formulario o como notificación.
   * @param {string} tipo
   * @param {string} mensaje
   * @param {Object} [opcionesMensaje]
   * @returns {HTMLElement|null}
   */
  const avisar = (tipo, mensaje, opcionesMensaje = {}) => {
    const {
      titulo = '',
      duracion = 0,
      reemplazar = true,
      contenedor = contenedorMensajes,
    } = opcionesMensaje;

    return mostrarMensaje(mensaje, {
      tipo,
      titulo,
      duracion,
      reemplazar,
      contenedor: contenedor || null,
    });
  };

  /**
   * Construye el contexto que recibe el módulo en validaciones y envíos.
   * @param {string} accion
   * @param {Object} datos
   * @param {Object} [extra]
   * @returns {Object}
   */
  const crearContexto = (accion, datos, extra = {}) => ({
    formulario: elemento,
    controlador,
    nombre: config.nombre,
    modo: estado.modo,
    accion,
    registro: estado.registro,
    identificador: estado.identificador,
    esEdicion: estado.modo === 'edicion',
    esNuevo: accion === ACCIONES.CREAR,
    datos,
    opciones: config,
    textos: config.textos,
    ...extra,
  });

  /**
   * Obtiene las reglas actuales, admitiendo una función que las genere.
   * @returns {Array|Object}
   */
  const obtenerReglas = () => {
    if (typeof config.reglas !== 'function') return config.reglas;

    return config.reglas(
      recopilarDatos(elemento, config),
      crearContexto(determinarAccion(), recopilarDatos(elemento, config))
    );
  };

  /**
   * Determina la acción que corresponde según el modo y el registro.
   * @param {string} [solicitada]
   * @returns {string}
   */
  const determinarAccion = (solicitada = '') => {
    if (solicitada === ACCIONES.ANULAR) return ACCIONES.ANULAR;
    if (config.accion) return config.accion;

    if (estado.modo === 'edicion' || estado.registro) {
      return ACCIONES.ACTUALIZAR;
    }

    return ACCIONES.CREAR;
  };

  /**
   * Normaliza el resultado de una validación personalizada.
   * @param {*} resultado
   * @returns {{valido: boolean, errores: Array<Object>}}
   */
  const normalizarValidacionPersonalizada = (resultado) => {
    if (resultado === null || resultado === undefined || resultado === true) {
      return { valido: true, errores: [] };
    }

    if (resultado === false) {
      return {
        valido: false,
        errores: [normalizarError(config.textos.error)],
      };
    }

    if (typeof resultado === 'string') {
      return { valido: false, errores: [normalizarError(resultado)] };
    }

    if (Array.isArray(resultado)) {
      const errores = resultado.map((error) => normalizarError(error));
      return { valido: errores.length === 0, errores };
    }

    if (!esObjeto(resultado)) {
      return { valido: true, errores: [] };
    }

    const errores = extraerErrores(resultado);
    const falloDeclarado =
      resultado.valido === false ||
      resultado.ok === false ||
      resultado.exito === false ||
      resultado.success === false;

    if (errores.length === 0 && falloDeclarado) {
      errores.push(normalizarError(resultado));
    }

    return {
      valido: errores.length === 0 && !falloDeclarado,
      errores,
    };
  };

  /**
   * Valida el formulario completo y presenta los resultados.
   * @param {Object} [opcionesValidacion]
   * @returns {Object}
   */
  const validar = (opcionesValidacion = {}) => {
    if (estado.destruido) {
      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_INVALIDO,
        errores: [normalizarError('El formulario ya no está disponible.')],
        datos: {},
      };
    }

    if (estado.bloqueado) {
      avisar('advertencia', estado.motivoBloqueo || config.textos.bloqueado);
      actualizarEstadoEnvio(
        estadoEnvio,
        estado.motivoBloqueo || config.textos.bloqueado,
        'error'
      );
      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_BLOQUEADO,
        errores: [
          normalizarError(estado.motivoBloqueo || config.textos.bloqueado),
        ],
        datos: recopilarDatos(elemento, config),
      };
    }

    cambiarEstado(ESTADOS_FORMULARIO.VALIDANDO);
    actualizarEstadoEnvio(estadoEnvio, config.textos.validando);

    let reglas = [];
    const errores = [];

    try {
      reglas = obtenerReglas();
    } catch (error) {
      errores.push(
        normalizarError(
          `No se pudieron preparar las reglas de validación. ${textoDeError(error)}`
        )
      );
    }

    const resultadoBase = validarFormularioYMostrar(elemento, reglas, {
      limpiar: opcionesValidacion.limpiar !== false,
      resumen: false,
      marcarValidos: config.marcarValidos,
      enfocar: false,
      contenedorMensajes,
      destacarErrores: config.destacarErrores,
    });

    for (const error of resultadoBase.errores || []) {
      errores.push(normalizarError(error));
    }

    const datos = recopilarDatos(elemento, config);

    if (typeof config.validar === 'function' && opcionesValidacion.personalizada !== false) {
      try {
        const personalizado = config.validar(
          datos,
          crearContexto(determinarAccion(), datos)
        );
        errores.push(...normalizarValidacionPersonalizada(personalizado).errores);
      } catch (error) {
        errores.push(
          normalizarError(
            `No se pudo completar la validación adicional. ${textoDeError(error)}`
          )
        );
      }
    }

    if (opcionesValidacion.fechas !== false) {
      errores.push(...validarFechasEfectivas(elemento, config));
    }

    actualizarAvisosFecha(elemento, config);

    const vistos = new Set();
    const erroresUnicos = errores.filter((error) => {
      const clave = `${error.campo || ''}::${error.mensaje}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });

    if (erroresUnicos.length > 0) {
      estado.errores = erroresUnicos;
      mostrarErroresFormulario(
        elemento,
        contenedorMensajes,
        erroresUnicos,
        config,
        config.textos.resumenErrores
      );
      enfocarPrimerError(elemento);
      cambiarEstado(ESTADOS_FORMULARIO.ERROR);
      actualizarEstadoEnvio(estadoEnvio, config.textos.resumenErrores, 'error');
      emitirEvento(elemento, 'app:formulario:invalido', {
        nombre: config.nombre,
        errores: erroresUnicos,
        datos,
      });

      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.VALIDACION_FALLIDA,
        errores: erroresUnicos,
        resultados: resultadoBase.resultados || [],
        datos,
      };
    }

    estado.errores = [];
    limpiarMensajes(contenedorMensajes);
    cambiarEstado(
      estado.modo === 'edicion'
        ? ESTADOS_FORMULARIO.EDITANDO
        : ESTADOS_FORMULARIO.LISTO
    );
    actualizarEstadoEnvio(estadoEnvio, '');
    emitirEvento(elemento, 'app:formulario:valido', {
      nombre: config.nombre,
      datos,
    });

    return {
      valido: true,
      codigo: null,
      errores: [],
      resultados: resultadoBase.resultados || [],
      datos,
    };
  };

  /**
   * Filtra las reglas de un campo concreto.
   * @param {Array|Object} reglas
   * @param {string} nombre
   * @returns {Array|Object}
   */
  const filtrarReglas = (reglas, nombre) => {
    const buscado = normalizarNombre(nombre);

    if (Array.isArray(reglas)) {
      return reglas.filter(
        (regla) =>
          regla &&
          typeof regla === 'object' &&
          normalizarNombre(regla.campo) === buscado
      );
    }

    if (esObjeto(reglas)) {
      const clave = Object.keys(reglas).find(
        (actual) => normalizarNombre(actual) === buscado
      );

      return clave !== undefined ? { [clave]: reglas[clave] } : {};
    }

    return {};
  };

  /**
   * Valida un único campo. Se usa al salir de un control y desde los módulos.
   * @param {string|HTMLElement} campo Nombre o control.
   * @param {Object} [opcionesCampo]
   * @param {boolean} [opcionesCampo.soloConValor=false]
   * @param {boolean} [opcionesCampo.mostrar=true]
   * @param {boolean} [opcionesCampo.marcarValido=false]
   * @returns {Object}
   */
  const validarCampo = (campo, opcionesCampo = {}) => {
    const control =
      campo instanceof HTMLElement
        ? campo
        : buscarControlPorNombre(elemento, String(campo));

    if (!control) {
      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_INVALIDO,
        errores: [normalizarError('No se encontró el campo para validar.')],
        campo: null,
      };
    }

    if (estado.bloqueado || estado.destruido) {
      return {
        valido: true,
        errores: [],
        campo: control.name,
        omitido: true,
      };
    }

    const valor = obtenerValorCampo(control);

    if (opcionesCampo.soloConValor === true && !valorTieneContenido(valor)) {
      limpiarErrorCampo(control);
      return { valido: true, errores: [], campo: control.name, omitido: true };
    }

    let reglas;

    try {
      reglas = filtrarReglas(obtenerReglas(), control.name);
    } catch (error) {
      const fallo = normalizarError(
        `No se pudieron preparar las reglas del campo. ${textoDeError(error)}`
      );
      if (opcionesCampo.mostrar !== false) {
        marcarErrorCampo(control, fallo.mensaje);
      }
      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.VALIDACION_FALLIDA,
        errores: [fallo],
        campo: control.name,
      };
    }

    const resultado = validarFormulario(elemento, reglas, {});
    const errores = (resultado.errores || []).map((error) =>
      normalizarError(error, control.name)
    );

    if (errores.length > 0) {
      if (opcionesCampo.mostrar !== false) {
        marcarErrorCampo(control, errores[0].mensaje, {
          detalle: errores[0].detalle,
          destacado: config.destacarErrores,
        });
      }
      return {
        valido: false,
        codigo: CODIGOS_FORMULARIO.VALIDACION_FALLIDA,
        errores,
        campo: control.name,
      };
    }

    if (opcionesCampo.mostrar !== false) {
      if (opcionesCampo.marcarValido === true) {
        marcarCampoValido(control);
      } else {
        limpiarErrorCampo(control);
      }
    }

    return { valido: true, errores: [], campo: control.name };
  };

  /**
   * Comprueba una autorización de interfaz. El backend sigue siendo la
   * autoridad final sobre permisos y reglas de negocio.
   * @param {string} accion
   * @param {Object} datos
   * @returns {Promise<{autorizado: boolean, mensaje: string}>}
   */
  const verificarAutorizacion = async (accion, datos) => {
    let regla = config.autorizaciones[accion];

    if (regla === undefined && accion === ACCIONES.ACTUALIZAR) {
      regla = config.autorizaciones.modificar;
    }

    if (regla === undefined && accion === ACCIONES.CREAR) {
      regla = config.autorizaciones.guardar;
    }

    if (regla === undefined && config.autorizar) {
      regla = config.autorizar;
    }

    if (regla === undefined) {
      if (accion === ACCIONES.ANULAR && config.requerirAutorizacionAnulacion) {
        return {
          autorizado: false,
          mensaje:
            'La anulación requiere una autorización configurada por el sistema.',
        };
      }

      return { autorizado: true, mensaje: '' };
    }

    try {
      const resultado =
        typeof regla === 'function'
          ? await regla.call(
              config.conexion || null,
              accion,
              crearContexto(accion, datos)
            )
          : regla;

      if (resultado === true) return { autorizado: true, mensaje: '' };
      if (resultado === false) {
        return { autorizado: false, mensaje: config.textos.noAutorizado };
      }

      if (typeof resultado === 'string') {
        return {
          autorizado: false,
          mensaje: resultado.trim() || config.textos.noAutorizado,
        };
      }

      if (esObjeto(resultado)) {
        const autorizado =
          resultado.autorizado === true ||
          resultado.permitido === true ||
          resultado.ok === true ||
          resultado.valido === true;

        return {
          autorizado,
          mensaje: autorizado
            ? ''
            : textoDeError(resultado.mensaje || resultado.message) ||
              config.textos.noAutorizado,
        };
      }

      return {
        autorizado: false,
        mensaje: config.textos.noAutorizado,
      };
    } catch (error) {
      return {
        autorizado: false,
        mensaje: `${config.textos.noAutorizado} ${textoDeError(error)}`,
      };
    }
  };

  /**
   * Localiza la función de envío del módulo según la acción.
   * @param {string} accion
   * @returns {Function|null}
   */
  const resolverFuncionEnvio = (accion) => {
    if (typeof config.enviar === 'function') return config.enviar;

    const conexion = config.conexion;

    if (!conexion) return null;
    if (typeof conexion === 'function') return conexion;

    const candidatos = {
      [ACCIONES.CREAR]: ['crear', 'registrar', 'guardar', 'enviar'],
      [ACCIONES.ACTUALIZAR]: [
        'actualizar',
        'modificar',
        'guardar',
        'editar',
        'enviar',
      ],
      [ACCIONES.ANULAR]: ['anular', 'eliminar', 'cancelar', 'enviar'],
    };

    for (const nombre of candidatos[accion] || ['enviar']) {
      if (typeof conexion[nombre] === 'function') {
        return conexion[nombre].bind(conexion);
      }
    }

    return null;
  };

  /**
   * Obtiene el mensaje que devolvió el módulo o usa uno predeterminado.
   * @param {*} respuesta
   * @param {string} accion
   * @returns {string}
   */
  const obtenerMensajeRespuesta = (respuesta, accion) => {
    if (typeof respuesta === 'string' && respuesta.trim()) {
      return respuesta.trim();
    }

    if (esObjeto(respuesta)) {
      const mensaje =
        respuesta.mensaje ||
        respuesta.message ||
        respuesta.datos?.mensaje ||
        respuesta.data?.mensaje;

      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje.trim();
    }

    return accion === ACCIONES.ANULAR
      ? config.textos.anulado
      : config.textos.guardado;
  };

  /**
   * Extrae el registro devuelto por el módulo, si existe.
   * @param {*} respuesta
   * @returns {Object|null}
   */
  const extraerRegistroRespuesta = (respuesta) => {
    if (!esObjeto(respuesta)) return null;
    if (esObjeto(respuesta.registro)) return respuesta.registro;
    if (esObjeto(respuesta.item)) return respuesta.item;

    const datos = respuesta.datos || respuesta.data;

    if (esObjeto(datos)) {
      return datos.registro && esObjeto(datos.registro) ? datos.registro : datos;
    }

    if (obtenerIdentificadorRegistro(respuesta, config.claveIdentificador) !== null) {
      return respuesta;
    }

    return null;
  };

  let botonEnviando = null;
  let spinnerCreado = null;

  /**
   * Prepara la interfaz para un envío y evita acciones simultáneas.
   * @param {string} accion
   * @returns {void}
   */
  const iniciarEnvio = (accion) => {
    estado.enviando = true;
    cambiarEstado(ESTADOS_FORMULARIO.ENVIANDO);
    elemento.setAttribute('aria-busy', 'true');

    actualizarEstadoEnvio(
      estadoEnvio,
      accion === ACCIONES.ANULAR
        ? config.textos.anulando
        : config.textos.guardando
    );

    botonEnviando =
      accion === ACCIONES.ANULAR
        ? botones.anular || botones.enviar
        : botones.enviar;

    for (const boton of [
      botones.enviar,
      botones.anular,
      botones.limpiar,
      botones.cancelar,
      botones.editar,
    ]) {
      if (!(boton instanceof HTMLElement)) continue;
      if (!botonesDeshabilitados.has(boton)) {
        botonesDeshabilitados.set(boton, boton.disabled);
      }
      boton.disabled = true;
    }

    if (botonEnviando instanceof HTMLElement) {
      botonEnviando.setAttribute('aria-disabled', 'true');
      botonEnviando.setAttribute('aria-busy', 'true');
      agregarClases(botonEnviando, 'app-btn--cargando');

      if (!botonEnviando.querySelector('.app-btn__spinner')) {
        spinnerCreado = crearElemento('span', {
          clases: ['app-btn__spinner'],
          atributos: { 'aria-hidden': 'true', [ATRIBUTOS.CREADO]: 'true' },
        });
        botonEnviando.prepend(spinnerCreado);
      }
    }

    if (config.contenedorCarga) {
      mostrarCarga(config.contenedorCarga, {
        texto:
          accion === ACCIONES.ANULAR
            ? config.textos.anulando
            : config.textos.enviando,
      });
    }
  };

  /**
   * Restaura los controles después de un envío, con o sin error.
   * @returns {void}
   */
  const finalizarEnvio = () => {
    estado.enviando = false;
    elemento.removeAttribute('aria-busy');

    for (const [boton, estabaDeshabilitado] of botonesDeshabilitados.entries()) {
      if (!boton.isConnected) continue;
      boton.disabled = estado.bloqueado ? true : estabaDeshabilitado;
      boton.removeAttribute('aria-disabled');
      boton.removeAttribute('aria-busy');
      quitarClases(boton, 'app-btn--cargando');
    }

    botonesDeshabilitados.clear();

    if (spinnerCreado) {
      spinnerCreado.remove();
      spinnerCreado = null;
    }

    botonEnviando = null;

    if (config.contenedorCarga) ocultarCarga(config.contenedorCarga);

    if (estado.estado === ESTADOS_FORMULARIO.ENVIANDO) {
      cambiarEstado(
        estado.modo === 'edicion'
          ? ESTADOS_FORMULARIO.EDITANDO
          : ESTADOS_FORMULARIO.LISTO
      );
    }

    if (config.alFinalizar) {
      try {
        config.alFinalizar(controlador);
      } catch {
        // La restauración visual no debe fallar por un callback del módulo.
      }
    }
  };

  /**
   * Registra un error de envío y actualiza la interfaz.
   * @param {Array<Object>} errores
   * @param {*} respuesta
   * @param {Object} datos
   * @param {string} accion
   * @param {Object} contexto
   * @returns {Object}
   */
  const manejarErrorEnvio = (errores, respuesta, datos, accion, contexto) => {
    const lista =
      errores.length > 0
        ? errores
        : [normalizarError(config.textos.errorEnvio)];

    estado.errores = lista;
    estado.ultimaRespuesta = respuesta ?? null;

    mostrarErroresFormulario(
      elemento,
      contenedorMensajes,
      lista,
      config,
      config.textos.resumenErrores
    );
    enfocarPrimerError(elemento);

    const mensaje = lista[0].mensaje || config.textos.error;
    actualizarEstadoEnvio(estadoEnvio, mensaje, 'error');
    cambiarEstado(ESTADOS_FORMULARIO.ERROR);

    emitirEvento(elemento, 'app:formulario:error', {
      nombre: config.nombre,
      accion,
      errores: lista,
      respuesta: respuesta ?? null,
      datos,
    });

    if (config.alError) {
      try {
        config.alError(respuesta ?? null, contexto, lista);
      } catch {
        // El manejo del error no depende del callback de presentación.
      }
    }

    return {
      exito: false,
      codigo: CODIGOS_FORMULARIO.ERROR_ENVIO,
      errores: lista,
      respuesta: respuesta ?? null,
      datos,
      accion,
      cancelado: false,
      sinCambios: false,
    };
  };

  /**
   * Actualiza el estado de modificación comparando con la instantánea.
   * @param {Event} [evento]
   * @returns {boolean}
   */
  const actualizarModificacion = (evento) => {
    if (estado.destruido || estado.enviando) return estado.modificado;

    const datos = recopilarDatos(elemento, config);
    const actual = crearInstantanea(datos);
    const modificado =
      estado.instantanea !== null && actual !== estado.instantanea;

    estado.modificado = modificado;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, String(modificado));

    if (
      !estado.bloqueado &&
      ![ESTADOS_FORMULARIO.EXITO, ESTADOS_FORMULARIO.ERROR].includes(
        estado.estado
      )
    ) {
      actualizarEstadoEnvio(
        estadoEnvio,
        modificado ? config.textos.cambiosSinGuardar : ''
      );
    }

    if (config.alCambiar) {
      try {
        config.alCambiar(
          datos,
          crearContexto(determinarAccion(), datos, { evento }),
          evento
        );
      } catch {
        // El callback de cambio no interrumpe la captura de datos.
      }
    }

    return modificado;
  };

  /**
   * Ejecuta el flujo completo de envío. Es interno: la protección contra
   * duplicados se aplica en enviar().
   * @param {Object} opcionesEnvio
   * @returns {Promise<Object>}
   */
  const ejecutarEnvio = async (opcionesEnvio = {}) => {
    const accion = determinarAccion(opcionesEnvio.accion);
    let datos = esObjeto(opcionesEnvio.datos)
      ? { ...opcionesEnvio.datos }
      : recopilarDatos(elemento, config);

    if (opcionesEnvio.validar !== false && accion !== ACCIONES.ANULAR) {
      const validacion = validar({
        personalizada: opcionesEnvio.validarPersonalizada !== false,
        fechas: opcionesEnvio.validarFechas !== false,
      });

      if (!validacion.valido) {
        return {
          exito: false,
          codigo: validacion.codigo,
          errores: validacion.errores,
          respuesta: null,
          datos: validacion.datos,
          accion,
          cancelado: false,
          sinCambios: false,
        };
      }

      datos = {
        ...datos,
        ...(esObjeto(validacion.datos) ? validacion.datos : {}),
      };
    }

    if (
      accion !== ACCIONES.ANULAR &&
      estado.modo === 'edicion' &&
      config.validarCambios &&
      opcionesEnvio.omitirCambios !== true &&
      !estado.modificado
    ) {
      avisar('info', config.textos.sinCambios);
      actualizarEstadoEnvio(estadoEnvio, '');
      cambiarEstado(ESTADOS_FORMULARIO.EDITANDO);
      emitirEvento(elemento, 'app:formulario:sin-cambios', {
        nombre: config.nombre,
        datos,
      });

      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.SIN_CAMBIOS,
        errores: [],
        respuesta: null,
        datos,
        accion,
        cancelado: false,
        sinCambios: true,
      };
    }

    if (opcionesEnvio.datosExtra && esObjeto(opcionesEnvio.datosExtra)) {
      datos = { ...datos, ...opcionesEnvio.datosExtra };
    }

    const requiereConfirmacion =
      opcionesEnvio.confirmar !== false &&
      config.confirmaciones &&
      (accion === ACCIONES.ANULAR
        ? config.confirmarAnular
        : config.confirmarGuardar);

    if (requiereConfirmacion) {
      const detalle =
        accion === ACCIONES.ANULAR
          ? opcionesEnvio.detalleConfirmacion || ''
          : opcionesEnvio.detalleConfirmacion ||
            obtenerDetalleFechas(elemento, config);

      const confirmado = await solicitarConfirmacion({
        titulo:
          opcionesEnvio.tituloConfirmacion ||
          (accion === ACCIONES.ANULAR
            ? 'Confirmar anulación'
            : 'Confirmar guardado'),
        mensaje:
          opcionesEnvio.mensajeConfirmacion ||
          (accion === ACCIONES.ANULAR
            ? config.textos.anular
            : estado.modo === 'edicion'
              ? config.textos.guardarCambios
              : config.textos.guardarRegistro),
        detalle,
        textoConfirmar:
          opcionesEnvio.textoConfirmar ||
          (accion === ACCIONES.ANULAR ? 'Anular registro' : 'Guardar'),
        textoCancelar: opcionesEnvio.textoCancelar || 'Cancelar',
        tipo: accion === ACCIONES.ANULAR ? 'critica' : 'advertencia',
        peligrosa: accion === ACCIONES.ANULAR,
        enfocarConfirmar: opcionesEnvio.enfocarConfirmar === true,
      });

      if (!confirmado) {
        cambiarEstado(
          estado.modo === 'edicion'
            ? ESTADOS_FORMULARIO.EDITANDO
            : ESTADOS_FORMULARIO.LISTO
        );
        actualizarEstadoEnvio(estadoEnvio, config.textos.cancelado);
        emitirEvento(elemento, 'app:formulario:cancelado', {
          nombre: config.nombre,
          accion,
          motivo: 'confirmacion',
        });

        return {
          exito: false,
          codigo: CODIGOS_FORMULARIO.OPERACION_CANCELADA,
          errores: [],
          respuesta: null,
          datos,
          accion,
          cancelado: true,
          sinCambios: false,
        };
      }
    }

    const autorizacion = await verificarAutorizacion(accion, datos);

    if (!autorizacion.autorizado) {
      avisar('error', autorizacion.mensaje, {
        titulo: 'Operación no autorizada',
      });
      actualizarEstadoEnvio(estadoEnvio, autorizacion.mensaje, 'error');
      cambiarEstado(ESTADOS_FORMULARIO.ERROR);

      const error = normalizarError(autorizacion.mensaje);
      const contexto = crearContexto(accion, datos);

      emitirEvento(elemento, 'app:formulario:no-autorizado', {
        nombre: config.nombre,
        accion,
        errores: [error],
        datos,
      });

      if (config.alError) {
        try {
          config.alError(autorizacion, contexto, [error]);
        } catch {
          // Sin efecto sobre la respuesta de autorización.
        }
      }

      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.OPERACION_NO_AUTORIZADA,
        errores: [error],
        respuesta: null,
        datos,
        accion,
        cancelado: false,
        sinCambios: false,
      };
    }

    const funcion = resolverFuncionEnvio(accion);

    if (!funcion) {
      avisar('error', config.textos.sinConexion);
      actualizarEstadoEnvio(estadoEnvio, config.textos.sinConexion, 'error');
      cambiarEstado(ESTADOS_FORMULARIO.ERROR);

      emitirEvento(elemento, 'app:formulario:error', {
        nombre: config.nombre,
        accion,
        errores: [normalizarError(config.textos.sinConexion)],
        respuesta: null,
        datos,
      });

      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.SIN_CONEXION,
        errores: [normalizarError(config.textos.sinConexion)],
        respuesta: null,
        datos,
        accion,
        cancelado: false,
        sinCambios: false,
      };
    }

    iniciarEnvio(accion);

    const contexto = crearContexto(accion, datos, {
      evento: opcionesEnvio.evento || null,
      ...(esObjeto(opcionesEnvio.contexto) ? opcionesEnvio.contexto : {}),
    });

    try {
      const respuesta = await funcion(datos, contexto);

      if (respuestaEsError(respuesta)) {
        const errores = extraerErrores(respuesta);

        if (errores.length === 0) {
          errores.push(normalizarError(textoDeError(respuesta)));
        }

        return manejarErrorEnvio(errores, respuesta, datos, accion, contexto);
      }

      const registro = extraerRegistroRespuesta(respuesta);

      if (registro) {
        estado.registro = estado.registro
          ? { ...estado.registro, ...registro }
          : copiarRegistro(registro);

        const identificador = obtenerIdentificadorRegistro(
          estado.registro,
          config.claveIdentificador
        );

        if (identificador !== null && identificador !== undefined) {
          estado.identificador = identificador;
        }
      } else if (esObjeto(respuesta)) {
        const identificador =
          respuesta.id ??
          respuesta.identificador ??
          respuesta.datos?.id ??
          null;

        if (identificador !== null) {
          estado.identificador = identificador;
          estado.registro = {
            ...(estado.registro || {}),
            ...copiarRegistro(registro || {}),
            id: identificador,
          };
        }
      }

      estado.ultimaRespuesta = respuesta ?? null;
      estado.errores = [];

      const esNuevo = accion === ACCIONES.CREAR;

      if (
        esNuevo &&
        config.limpiarAlGuardar &&
        opcionesEnvio.limpiar !== false
      ) {
        limpiarCamposInterno(false);
        estado.registro = null;
        estado.identificador = null;
        estado.modo = 'registro';
      } else {
        estado.instantanea = instantaneaActual();
        estado.modificado = false;
        elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');
      }

      if (accion === ACCIONES.ANULAR) {
        estado.historico = true;
        estado.bloqueado = true;
        estado.motivoBloqueo = config.textos.historico;
        bloquearCampos();
      }

      const mensaje = obtenerMensajeRespuesta(respuesta, accion);

      cambiarEstado(ESTADOS_FORMULARIO.EXITO);
      actualizarEstadoEnvio(estadoEnvio, mensaje, 'exito');
      avisar('exito', mensaje, {
        titulo:
          opcionesEnvio.tituloExito ||
          (accion === ACCIONES.ANULAR
            ? 'Registro anulado'
            : 'Operación realizada'),
      });

      emitirEvento(elemento, 'app:formulario:exito', {
        nombre: config.nombre,
        accion,
        respuesta: respuesta ?? null,
        datos,
        registro: estado.registro,
      });

      if (config.alExito) {
        try {
          config.alExito(respuesta ?? null, contexto, estado.registro);
        } catch {
          // El resultado del envío ya fue exitoso; no se revierte por la UI.
        }
      }

      return {
        exito: true,
        codigo: null,
        errores: [],
        respuesta: respuesta ?? null,
        datos,
        accion,
        registro: estado.registro,
        identificador: estado.identificador,
        cancelado: false,
        sinCambios: false,
      };
    } catch (error) {
      return manejarErrorEnvio(
        [normalizarError(textoDeError(error))],
        error,
        datos,
        accion,
        contexto
      );
    } finally {
      finalizarEnvio();
    }
  };

  /**
   * Envía el formulario. Protege contra dobles envíos devolviendo la misma
   * promesa mientras hay una operación en curso.
   * @param {Event|Object} [evento] Evento submit o directamente opciones.
   * @param {Object} [opcionesEnvio]
   * @returns {Promise<Object>}
   */
  const enviar = async (evento = null, opcionesEnvio = {}) => {
    let opcionesFinales = opcionesEnvio;

    if (esEvento(evento)) {
      evento.preventDefault();
      opcionesFinales = { ...opcionesEnvio, evento };
    } else if (esObjeto(evento)) {
      opcionesFinales = { ...evento, ...opcionesEnvio };
    }

    if (estado.promesa) return estado.promesa;

    if (estado.destruido) {
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_INVALIDO,
        errores: [normalizarError('El formulario ya no está disponible.')],
        respuesta: null,
        datos: {},
        accion: determinarAccion(opcionesFinales.accion),
        cancelado: false,
        sinCambios: false,
      };
    }

    if (estado.bloqueado && opcionesFinales.accion !== ACCIONES.ANULAR) {
      const mensaje = estado.motivoBloqueo || config.textos.bloqueado;
      avisar('advertencia', mensaje);
      actualizarEstadoEnvio(estadoEnvio, mensaje, 'error');
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_BLOQUEADO,
        errores: [normalizarError(mensaje)],
        respuesta: null,
        datos: recopilarDatos(elemento, config),
        accion: determinarAccion(opcionesFinales.accion),
        cancelado: false,
        sinCambios: false,
      };
    }

    const tarea = ejecutarEnvio(opcionesFinales);
    estado.promesa = tarea;

    try {
      return await tarea;
    } finally {
      if (estado.promesa === tarea) estado.promesa = null;
    }
  };

  /**
   * Limpia valores, errores, avisos de fecha y mensajes del formulario.
   * @param {boolean} [limpiarMensajesTambien=false]
   * @returns {void}
   */
  const limpiarCamposInterno = (limpiarMensajesTambien = false) => {
    for (const control of obtenerControlesEnviables(elemento, {
      ...config,
      incluirDeshabilitados: true,
    })) {
      limpiarControl(control);
    }

    for (const aviso of elemento.querySelectorAll(
      `[${ATRIBUTOS.AVISO_FECHA}]`
    )) {
      aviso.remove();
    }

    limpiarErroresFormulario(elemento);
    estado.errores = [];

    if (limpiarMensajesTambien) limpiarMensajes(contenedorMensajes);

    actualizarDependencias(dependencias, config, false);

    estado.instantanea = instantaneaActual();
    estado.modificado = false;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');

    emitirEvento(elemento, 'app:formulario:campos-limpiados', {
      nombre: config.nombre,
    });
  };

  /**
   * Restablece los valores predeterminados del HTML.
   * @param {boolean} [limpiarMensajesTambien=false]
   * @returns {void}
   */
  const restablecerCamposInterno = (limpiarMensajesTambien = false) => {
    for (const control of obtenerControlesEnviables(elemento, {
      ...config,
      incluirDeshabilitados: true,
    })) {
      restablecerControl(control);
    }

    for (const aviso of elemento.querySelectorAll(
      `[${ATRIBUTOS.AVISO_FECHA}]`
    )) {
      aviso.remove();
    }

    limpiarErroresFormulario(elemento);
    estado.errores = [];

    if (limpiarMensajesTambien) limpiarMensajes(contenedorMensajes);

    actualizarDependencias(dependencias, config, false);

    estado.instantanea = instantaneaActual();
    estado.modificado = false;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');
  };

  /**
   * Deshabilita todos los controles del formulario y guarda su estado previo.
   * @returns {void}
   */
  const bloquearCampos = () => {
    for (const control of Array.from(elemento.elements)) {
      if (!(control instanceof HTMLElement)) continue;

      if (!deshabilitadosPorBloqueo.has(control)) {
        deshabilitadosPorBloqueo.set(control, control.disabled);
      }

      control.disabled = true;
      control.setAttribute(ATRIBUTOS.BLOQUEO_CAMPO, 'true');
      control.setAttribute('aria-disabled', 'true');
    }

    elemento.setAttribute(ATRIBUTOS.BLOQUEADO, 'true');
  };

  /**
   * Restaura los controles deshabilitados por un bloqueo.
   * @returns {void}
   */
  const desbloquearCampos = () => {
    for (const [control, estabaDeshabilitado] of deshabilitadosPorBloqueo.entries()) {
      if (!control.isConnected) continue;

      control.disabled = estabaDeshabilitado;
      control.removeAttribute(ATRIBUTOS.BLOQUEO_CAMPO);

      if (!estabaDeshabilitado) control.removeAttribute('aria-disabled');
    }

    deshabilitadosPorBloqueo.clear();
    elemento.removeAttribute(ATRIBUTOS.BLOQUEADO);

    actualizarDependencias(dependencias, config, false);
  };

  /**
   * Carga un registro en el formulario sin enviarlo.
   * @param {Object} registro
   * @param {Object} [opcionesCarga]
   * @param {boolean} [opcionesCarga.silencioso=false]
   * @param {string} [opcionesCarga.modo] registro o edicion.
   * @returns {Object}
   */
  const cargar = (registro, opcionesCarga = {}) => {
    if (!esObjeto(registro)) {
      const mensaje = 'El registro recibido no es válido.';
      avisar('error', mensaje);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.SIN_REGISTRO,
        errores: [normalizarError(mensaje)],
        actualizados: 0,
        registro: null,
      };
    }

    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        errores: [normalizarError(config.textos.envioEnCurso)],
        actualizados: 0,
        registro: null,
      };
    }

    if (opcionesCarga.modo === 'edicion') estado.modo = 'edicion';
    if (opcionesCarga.modo === 'registro') estado.modo = 'registro';

    const copia = copiarRegistro(registro);
    estado.registro = copia;
    estado.identificador = obtenerIdentificadorRegistro(
      copia,
      config.claveIdentificador
    );

    limpiarCamposInterno(false);

    const actualizados = cargarRegistroEnFormulario(elemento, copia, config);

    actualizarDependencias(dependencias, config, false);
    actualizarAvisosFecha(elemento, config);

    estado.instantanea = instantaneaActual();
    estado.modificado = false;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');
    estado.errores = [];

    if (!opcionesCarga.silencioso) {
      limpiarMensajes(contenedorMensajes);
    }

    cambiarEstado(
      estado.modo === 'edicion'
        ? ESTADOS_FORMULARIO.EDITANDO
        : ESTADOS_FORMULARIO.LISTO
    );
    actualizarEstadoEnvio(estadoEnvio, '');

    emitirEvento(elemento, 'app:formulario:cargado', {
      nombre: config.nombre,
      registro: copiarRegistro(copia),
      identificador: estado.identificador,
      modo: estado.modo,
    });

    return {
      exito: true,
      codigo: null,
      errores: [],
      actualizados,
      registro: copiarRegistro(copia),
      identificador: estado.identificador,
      modo: estado.modo,
    };
  };

  /**
   * Carga un registro en modo edición y bloquea los históricos.
   * @param {Object} registro
   * @param {Object} [opcionesCarga]
   * @returns {Object}
   */
  const cargarEdicion = (registro, opcionesCarga = {}) => {
    const copia = esObjeto(registro) ? copiarRegistro(registro) : registro;
    const historico = esRegistroHistorico(copia, opcionesCarga.esHistorico);

    estado.modo = 'edicion';
    const resultado = cargar(copia, {
      ...opcionesCarga,
      modo: 'edicion',
    });

    if (!resultado.exito) return { ...resultado, historico, bloqueado: false };

    if (historico) {
      estado.historico = true;
      estado.bloqueado = true;
      estado.motivoBloqueo = config.textos.historico;
      bloquearCampos();
      cambiarEstado(ESTADOS_FORMULARIO.BLOQUEADO);
      actualizarEstadoEnvio(estadoEnvio, config.textos.historico);

      if (!opcionesCarga.silencioso) {
        avisar('advertencia', config.textos.historico, {
          titulo: 'Registro no modificable',
        });
      }

      if (config.alBloquear) {
        try {
          config.alBloquear(config.textos.historico, copia);
        } catch {
          // La advertencia ya está visible.
        }
      }

      emitirEvento(elemento, 'app:formulario:historico', {
        nombre: config.nombre,
        registro: copiarRegistro(copia),
        motivo: config.textos.historico,
      });
    } else {
      estado.historico = false;
      estado.bloqueado = false;
      estado.motivoBloqueo = '';
      desbloquearCampos();
      cambiarEstado(ESTADOS_FORMULARIO.EDITANDO);
      actualizarEstadoEnvio(estadoEnvio, '');
    }

    return {
      ...resultado,
      historico,
      bloqueado: estado.bloqueado,
    };
  };

  /**
   * Pasa el registro cargado a modo edición si no es histórico.
   * @param {Object} [opcionesEdicion]
   * @returns {Object}
   */
  const editar = (opcionesEdicion = {}) => {
    if (!estado.registro) {
      avisar('advertencia', config.textos.sinRegistro);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.SIN_REGISTRO,
        mensaje: config.textos.sinRegistro,
      };
    }

    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        mensaje: config.textos.envioEnCurso,
      };
    }

    if (
      (estado.historico || esRegistroHistorico(estado.registro, opcionesEdicion.esHistorico)) &&
      opcionesEdicion.forzar !== true
    ) {
      avisar('advertencia', config.textos.historico, {
        titulo: 'Registro no modificable',
      });
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.REGISTRO_HISTORICO,
        mensaje: config.textos.historico,
      };
    }

    estado.modo = 'edicion';
    estado.historico = false;
    estado.bloqueado = false;
    estado.motivoBloqueo = '';
    desbloquearCampos();
    estado.instantanea = instantaneaActual();
    estado.modificado = false;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');

    cambiarEstado(ESTADOS_FORMULARIO.EDITANDO);
    actualizarEstadoEnvio(estadoEnvio, '');
    avisar('info', config.textos.editando);

    emitirEvento(elemento, 'app:formulario:edicion', {
      nombre: config.nombre,
      registro: copiarRegistro(estado.registro),
    });

    return {
      exito: true,
      codigo: null,
      mensaje: config.textos.editando,
    };
  };

  /**
   * Bloquea el formulario y muestra el motivo.
   * @param {string|Object} [opcionesBloqueo]
   * @returns {Object}
   */
  const bloquear = (opcionesBloqueo = {}) => {
    const opcionesNormalizadas =
      typeof opcionesBloqueo === 'string'
        ? { motivo: opcionesBloqueo }
        : esObjeto(opcionesBloqueo)
          ? opcionesBloqueo
          : {};

    const motivo =
      opcionesNormalizadas.motivo ||
      estado.motivoBloqueo ||
      config.textos.bloqueado;

    estado.bloqueado = true;
    estado.motivoBloqueo = motivo;

    if (opcionesNormalizadas.historico === true) estado.historico = true;

    bloquearCampos();
    cambiarEstado(ESTADOS_FORMULARIO.BLOQUEADO);
    actualizarEstadoEnvio(estadoEnvio, motivo);

    if (opcionesNormalizadas.silencioso !== true) {
      avisar(
        opcionesNormalizadas.tipo === 'error' ? 'error' : 'advertencia',
        motivo
      );
    }

    if (config.alBloquear) {
      try {
        config.alBloquear(motivo, estado.registro);
      } catch {
        // El bloqueo ya se aplicó.
      }
    }

    emitirEvento(elemento, 'app:formulario:bloqueado', {
      nombre: config.nombre,
      motivo,
      historico: estado.historico,
    });

    return { exito: true, bloqueado: true, motivo };
  };

  /**
   * Desbloquea el formulario, salvo que el registro sea histórico.
   * @param {Object} [opcionesDesbloqueo]
   * @param {boolean} [opcionesDesbloqueo.forzar=false]
   * @returns {Object}
   */
  const desbloquear = (opcionesDesbloqueo = {}) => {
    if (estado.historico && opcionesDesbloqueo.forzar !== true) {
      avisar('advertencia', config.textos.historico);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.REGISTRO_HISTORICO,
        mensaje: config.textos.historico,
      };
    }

    if (opcionesDesbloqueo.forzar === true) estado.historico = false;

    estado.bloqueado = false;
    estado.motivoBloqueo = '';
    desbloquearCampos();

    cambiarEstado(
      estado.modo === 'edicion'
        ? ESTADOS_FORMULARIO.EDITANDO
        : ESTADOS_FORMULARIO.LISTO
    );
    actualizarEstadoEnvio(estadoEnvio, '');

    emitirEvento(elemento, 'app:formulario:desbloqueado', {
      nombre: config.nombre,
    });

    return { exito: true, bloqueado: false };
  };

  /**
   * Limpia el formulario y vuelve al modo de registro.
   * @param {Object|boolean} [opcionesLimpiar]
   * @returns {Promise<Object>}
   */
  const limpiar = async (opcionesLimpiar = {}) => {
    const opciones =
      typeof opcionesLimpiar === 'boolean'
        ? { confirmar: opcionesLimpiar }
        : esObjeto(opcionesLimpiar)
          ? opcionesLimpiar
          : {};

    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        cancelado: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        errores: [normalizarError(config.textos.envioEnCurso)],
      };
    }

    if (estado.historico && opciones.permitirHistorico !== true) {
      avisar('advertencia', config.textos.historico);
      return {
        exito: false,
        cancelado: false,
        codigo: CODIGOS_FORMULARIO.REGISTRO_HISTORICO,
        errores: [normalizarError(config.textos.historico)],
      };
    }

    const requiereConfirmacion =
      opciones.confirmar !== false &&
      config.confirmaciones &&
      config.confirmarLimpiar &&
      (estado.modificado ||
        estado.registro !== null ||
        estado.modo === 'edicion' ||
        opciones.forzar === true);

    if (requiereConfirmacion) {
      const confirmado = await solicitarConfirmacion({
        titulo: opciones.titulo || 'Limpiar formulario',
        mensaje: opciones.mensaje || config.textos.limpiar,
        textoConfirmar: opciones.textoConfirmar || 'Limpiar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        tipo: 'advertencia',
      });

      if (!confirmado) {
        return {
          exito: false,
          cancelado: true,
          codigo: CODIGOS_FORMULARIO.OPERACION_CANCELADA,
          errores: [],
        };
      }
    }

    limpiarCamposInterno(true);

    estado.modo = 'registro';
    estado.registro = null;
    estado.identificador = null;
    estado.bloqueado = false;
    estado.historico = false;
    estado.motivoBloqueo = '';
    desbloquearCampos();

    cambiarEstado(ESTADOS_FORMULARIO.LIMPIO);
    actualizarEstadoEnvio(estadoEnvio, '');
    avisar('info', config.textos.limpiado);

    if (config.alLimpiar) {
      try {
        config.alLimpiar(controlador);
      } catch {
        // La limpieza ya se completó.
      }
    }

    emitirEvento(elemento, 'app:formulario:limpiado', {
      nombre: config.nombre,
    });

    return {
      exito: true,
      cancelado: false,
      codigo: null,
      errores: [],
      datos: recopilarDatos(elemento, config),
    };
  };

  /**
   * Restablece los valores predeterminados o el último registro cargado.
   * @param {Object} [opcionesRestablecer]
   * @returns {Object}
   */
  const restablecer = (opcionesRestablecer = {}) => {
    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        errores: [normalizarError(config.textos.envioEnCurso)],
      };
    }

    if (estado.bloqueado || estado.historico) {
      avisar('advertencia', estado.motivoBloqueo || config.textos.historico);
      return {
        exito: false,
        codigo: CODIGOS_FORMULARIO.FORMULARIO_BLOQUEADO,
        errores: [
          normalizarError(estado.motivoBloqueo || config.textos.historico),
        ],
      };
    }

    if (estado.registro) {
      const resultado = cargar(estado.registro, {
        silencioso: false,
        modo: estado.modo,
      });

      if (!resultado.exito) return resultado;

      cambiarEstado(
        estado.modo === 'edicion'
          ? ESTADOS_FORMULARIO.EDITANDO
          : ESTADOS_FORMULARIO.LISTO
      );
    } else {
      restablecerCamposInterno(true);
      cambiarEstado(ESTADOS_FORMULARIO.INICIAL);
    }

    actualizarEstadoEnvio(estadoEnvio, '');
    avisar('info', config.textos.restablecido);

    emitirEvento(elemento, 'app:formulario:restablecido', {
      nombre: config.nombre,
    });

    return {
      exito: true,
      codigo: null,
      errores: [],
      datos: recopilarDatos(elemento, config),
    };
  };

  /**
   * Cancela la edición o el llenado actual, con confirmación si hay datos.
   * @param {Object} [opcionesCancelar]
   * @returns {Promise<Object>}
   */
  const cancelar = async (opcionesCancelar = {}) => {
    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        cancelado: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        errores: [normalizarError(config.textos.envioEnCurso)],
      };
    }

    const hayDatos =
      estado.modificado || estado.registro !== null || estado.modo === 'edicion';

    if (
      opcionesCancelar.confirmar !== false &&
      config.confirmaciones &&
      config.confirmarCancelar &&
      hayDatos
    ) {
      const confirmado = await solicitarConfirmacion({
        titulo: opcionesCancelar.titulo || 'Cancelar operación',
        mensaje: opcionesCancelar.mensaje || config.textos.cancelar,
        textoConfirmar: opcionesCancelar.textoConfirmar || 'Descartar cambios',
        textoCancelar: opcionesCancelar.textoCancelar || 'Continuar editando',
        tipo: 'advertencia',
        peligrosa: false,
      });

      if (!confirmado) {
        return {
          exito: false,
          cancelado: true,
          codigo: CODIGOS_FORMULARIO.OPERACION_CANCELADA,
          errores: [],
        };
      }
    }

    if (estado.registro) {
      const resultado = cargar(estado.registro, {
        silencioso: false,
        modo: estado.modo,
      });

      if (!resultado.exito) {
        return { ...resultado, cancelado: false };
      }

      if (estado.historico) {
        estado.bloqueado = true;
        estado.motivoBloqueo = config.textos.historico;
        bloquearCampos();
        cambiarEstado(ESTADOS_FORMULARIO.BLOQUEADO);
      } else {
        cambiarEstado(
          estado.modo === 'edicion'
            ? ESTADOS_FORMULARIO.EDITANDO
            : ESTADOS_FORMULARIO.LISTO
        );
      }
    } else {
      restablecerCamposInterno(true);
      cambiarEstado(ESTADOS_FORMULARIO.LISTO);
      estado.modo = 'registro';
    }

    limpiarErroresFormulario(elemento);
    limpiarMensajes(contenedorMensajes);
    estado.errores = [];
    actualizarEstadoEnvio(estadoEnvio, config.textos.cancelado);
    avisar('info', config.textos.cancelado);

    if (config.alCancelar) {
      try {
        config.alCancelar(controlador);
      } catch {
        // La cancelación ya se aplicó.
      }
    }

    emitirEvento(elemento, 'app:formulario:cancelado', {
      nombre: config.nombre,
      motivo: 'usuario',
    });

    return {
      exito: true,
      cancelado: true,
      codigo: CODIGOS_FORMULARIO.OPERACION_CANCELADA,
      errores: [],
      datos: recopilarDatos(elemento, config),
    };
  };

  /**
   * Anula el registro cargado mediante la función del módulo.
   * @param {Object|string} [opcionesAnular]
   * @returns {Promise<Object>}
   */
  const anular = async (opcionesAnular = {}) => {
    const opciones =
      typeof opcionesAnular === 'string'
        ? { motivo: opcionesAnular }
        : esObjeto(opcionesAnular)
          ? opcionesAnular
          : {};

    if (!estado.registro && estado.identificador === null) {
      avisar('advertencia', config.textos.sinRegistro);
      return {
        exito: false,
        cancelado: false,
        codigo: CODIGOS_FORMULARIO.SIN_REGISTRO,
        errores: [normalizarError(config.textos.sinRegistro)],
      };
    }

    if (estado.enviando) {
      avisar('advertencia', config.textos.envioEnCurso);
      return {
        exito: false,
        cancelado: false,
        codigo: CODIGOS_FORMULARIO.ENVIO_EN_CURSO,
        errores: [normalizarError(config.textos.envioEnCurso)],
      };
    }

    const datos = {
      ...recopilarDatos(elemento, config),
      ...(opciones.motivo ? { motivo: String(opciones.motivo).trim() } : {}),
    };

    if (estado.identificador !== null && estado.identificador !== undefined) {
      if (datos.id === undefined) datos.id = estado.identificador;
      if (datos.identificador === undefined) {
        datos.identificador = estado.identificador;
      }
    }

    return enviar(null, {
      accion: ACCIONES.ANULAR,
      datos,
      validar: false,
      confirmar: opciones.confirmar,
      mensajeConfirmacion: opciones.mensaje,
      detalleConfirmacion: opciones.detalle,
      tituloConfirmacion: opciones.titulo,
      textoConfirmar: opciones.textoConfirmar,
      textoCancelar: opciones.textoCancelar,
      tituloExito: opciones.tituloExito,
      omitirCambios: true,
      contexto: {
        motivo: opciones.motivo || '',
        ...(esObjeto(opciones.contexto) ? opciones.contexto : {}),
      },
    });
  };

  /**
   * Registra una selección proveniente de listas-buscables.js u otro adaptador.
   * @param {string} campo Nombre del campo asociado.
   * @param {*} valor Valor seleccionado.
   * @param {Object|null} [registro] Registro completo de la lista.
   * @returns {boolean}
   */
  const registrarSeleccion = (campo, valor, registro = null) => {
    const nombre = String(campo || '').trim();
    if (!nombre) return false;

    const control = buscarControlPorNombre(elemento, nombre);

    if (control && valor !== undefined && config.sincronizarSeleccion !== false) {
      aplicarValorControl(control, valor, config);
      limpiarErrorCampo(control);
    }

    actualizarDependencias(dependencias, config, false);

    if (
      control &&
      (control.hasAttribute(ATRIBUTOS.FECHA_EFECTIVA) ||
        obtenerCamposFechaEfectiva(elemento, config).includes(control))
    ) {
      actualizarAvisoFecha(control, config);
    }

    actualizarModificacion();

    if (config.alSeleccionar) {
      try {
        config.alSeleccionar(control, valor, registro, controlador);
      } catch {
        // La selección ya quedó aplicada.
      }
    }

    emitirEvento(elemento, 'app:formulario:seleccion', {
      nombre: config.nombre,
      campo: nombre,
      valor,
      registro,
      control,
    });

    return true;
  };

  /**
   * Indica si el formulario tiene cambios respecto a la última instantánea.
   * @returns {boolean}
   */
  const esModificado = () => {
    if (estado.instantanea === null) return false;

    const modificado =
      instantaneaActual() !== estado.instantanea;

    estado.modificado = modificado;
    elemento.setAttribute(ATRIBUTOS.MODIFICADO, String(modificado));

    return modificado;
  };

  /**
   * Devuelve una copia del registro cargado.
   * @returns {Object|null}
   */
  const obtenerRegistro = () =>
    estado.registro ? copiarRegistro(estado.registro) : null;

  /**
   * Establece el registro de trabajo sin cargar sus valores en los campos.
   * @param {Object|null} registro
   * @returns {boolean}
   */
  const establecerRegistro = (registro) => {
    if (registro !== null && !esObjeto(registro)) return false;

    estado.registro = registro ? copiarRegistro(registro) : null;
    estado.identificador = registro
      ? obtenerIdentificadorRegistro(registro, config.claveIdentificador)
      : null;

    return true;
  };

  /**
   * Devuelve los datos actuales del formulario.
   * @returns {Object}
   */
  const obtenerDatos = () => recopilarDatos(elemento, config);

  /**
   * Devuelve los datos y el contexto que usará el módulo al enviarlos.
   * @returns {Object}
   */
  const obtenerDatosPreparados = () => {
    const datos = recopilarDatos(elemento, config);
    const accion = determinarAccion();

    return {
      datos,
      contexto: crearContexto(accion, datos),
      modo: estado.modo,
      accion,
      registro: obtenerRegistro(),
      identificador: estado.identificador,
      esEdicion: estado.modo === 'edicion',
      esNuevo: accion === ACCIONES.CREAR,
    };
  };

  /**
   * Devuelve el identificador del registro cargado.
   * @returns {string|number|null}
   */
  const obtenerIdentificador = () => estado.identificador;

  /**
   * Devuelve una copia del estado interno del controlador.
   * @returns {Object}
   */
  const obtenerEstado = () => ({
    estado: estado.estado,
    modo: estado.modo,
    bloqueado: estado.bloqueado,
    historico: estado.historico,
    motivoBloqueo: estado.motivoBloqueo,
    modificado: estado.modificado,
    enviando: estado.enviando,
    errores: estado.errores.map((error) => ({ ...error })),
    registro: obtenerRegistro(),
    identificador: estado.identificador,
    ultimaRespuesta: estado.ultimaRespuesta,
  });

  /**
   * Destruye el controlador y retira los elementos creados por este módulo.
   * No borra los valores ni el HTML del formulario.
   * @returns {boolean}
   */
  const destruir = () => {
    if (estado.destruido) return false;

    estado.destruido = true;

    for (const limpiar of limpiezas.splice(0)) {
      try {
        limpiar();
      } catch {
        // La limpieza continúa con el resto de escuchadores.
      }
    }

    if (limpiezasGlobales.has(elemento)) {
      const limpiarGlobal = limpiezasGlobales.get(elemento);
      if (typeof limpiarGlobal === 'function') limpiarGlobal();
      limpiezasGlobales.delete(elemento);
    }

    for (const aviso of elemento.querySelectorAll(
      `[${ATRIBUTOS.AVISO_FECHA}]`
    )) {
      aviso.remove();
    }

    for (const creado of [contenedorMensajes, estadoEnvio]) {
      if (creado && elementosCreados.has(creado)) {
        creado.remove();
        elementosCreados.delete(creado);
      }
    }

    elemento.removeAttribute(ATRIBUTOS.ESTADO);
    elemento.removeAttribute(ATRIBUTOS.MODIFICADO);
    elemento.removeAttribute(ATRIBUTOS.BLOQUEADO);
    elemento.removeAttribute('aria-busy');

    if (controladores.get(elemento) === controlador) {
      controladores.delete(elemento);
    }

    emitirEvento(elemento, 'app:formulario:destruido', {
      nombre: config.nombre,
    });

    return true;
  };

  /**
   * Ejecuta una acción asíncrona de interfaz sin dejar promesas rechazadas.
   * @param {Function} accion
   * @returns {void}
   */
  const invocarSeguro = (accion) => {
    const manejarFallo = (error) => {
      const mensaje = textoDeError(error);
      avisar('error', mensaje);
      actualizarEstadoEnvio(estadoEnvio, mensaje, 'error');
      cambiarEstado(ESTADOS_FORMULARIO.ERROR);
    };

    try {
      const resultado = accion();
      if (resultado && typeof resultado.then === 'function') {
        resultado.catch(manejarFallo);
      }
    } catch (error) {
      manejarFallo(error);
    }
  };

  /**
   * Registra un escuchador y acumula su limpieza.
   * @param {Element} objetivo
   * @param {string} tipo
   * @param {EventListener} manejador
   * @param {boolean|AddEventListenerOptions} [opcionesEvento]
   * @returns {void}
   */
  const registrarEvento = (objetivo, tipo, manejador, opcionesEvento) => {
    limpiezas.push(escucharEvento(objetivo, tipo, manejador, opcionesEvento));
  };

  /**
   * Maneja la entrada de datos, limpia errores y actualiza dependencias.
   * @param {Event} evento
   * @returns {void}
   */
  const manejarEntrada = (evento) => {
    if (estado.destruido) return;

    const control = evento.target;

    if (!(control instanceof HTMLElement) || !control.name) return;
    if (estado.bloqueado) return;

    limpiarErrorCampo(control);

    if (obtenerCamposFechaEfectiva(elemento, config).includes(control)) {
      actualizarAvisoFecha(control, config);
    }

    if (evento.type === 'change') {
      const afectadas = dependenciasDelControl(dependencias, control);

      if (config.limpiarDependientesAlCambiar && afectadas.length > 0) {
        for (const dependencia of afectadas) {
          if (dependencia.dependiente === control) continue;

          const teniaValor = valorTieneContenido(
            obtenerValorCampo(dependencia.dependiente)
          );

          limpiarControl(dependencia.dependiente);
          quitarAvisoFecha(dependencia.dependiente);
          limpiarErrorCampo(dependencia.dependiente);

          if (teniaValor) {
            emitirEvento(elemento, 'app:dependencia:limpiada', {
              campo: dependencia.dependiente.name,
              fuentes: dependencia.fuentes.map((fuente) => fuente.name),
            });
          }
        }
      }

      actualizarDependencias(dependencias, config, false);
    }

    actualizarModificacion(evento);
  };

  /**
   * Valida un campo al salir de él, sin mostrar errores prematuros de campos
   * obligatorios que aún están vacíos.
   * @param {FocusEvent} evento
   * @returns {void}
   */
  const manejarSalida = (evento) => {
    if (!config.validarAlSalir || estado.destruido || estado.enviando) return;
    if (estado.bloqueado) return;

    const control = evento.target;

    if (!(control instanceof HTMLElement) || !control.name) return;
    if (
      ['checkbox', 'radio', 'file', 'hidden', 'submit', 'reset', 'button', 'image'].includes(
        control.type
      )
    ) {
      return;
    }

    if (
      evento.relatedTarget instanceof Node &&
      control.contains(evento.relatedTarget)
    ) {
      return;
    }

    const resultado = validarCampo(control, { soloConValor: true });

    if (
      resultado.valido &&
      obtenerCamposFechaEfectiva(elemento, config).includes(control) &&
      valorTieneContenido(obtenerValorCampo(control))
    ) {
      const fecha = validarFechaEfectiva(obtenerValorCampo(control), {
        campo: control.name,
        obligatorio: false,
        permitirRetroactiva: true,
        permitirFutura: config.permitirFechaFutura !== false,
      });

      if (!fecha.valido) {
        marcarErrorCampo(control, fecha.mensaje, {
          detalle: fecha.detalle,
          destacado: config.destacarErrores,
        });
      }
    }
  };

  /**
   * Procesa una selección emitida por listas-buscables.js.
   * @param {CustomEvent} evento
   * @returns {void}
   */
  const manejarSeleccionExterna = (evento) => {
    if (estado.destruido) return;

    const detalle = evento.detail;

    if (!esObjeto(detalle)) return;

    const campo =
      detalle.campo ||
      detalle.nombre ||
      detalle.name ||
      detalle.htmlName ||
      detalle.target?.name;

    if (!campo) return;

    const valor =
      detalle.valor ??
      detalle.value ??
      detalle.seleccionado ??
      detalle.id ??
      detalle.registro?.id ??
      detalle.item?.id;

    registrarSeleccion(
      String(campo),
      valor,
      detalle.registro || detalle.item || null
    );
  };

  /**
   * Conecta los eventos del formulario y de sus botones de acción.
   * @returns {void}
   */
  const conectarEventos = () => {
    registrarEvento(elemento, 'submit', (evento) => {
      evento.preventDefault();

      if (estado.destruido) return;

      if (estado.bloqueado) {
        const mensaje = estado.motivoBloqueo || config.textos.bloqueado;
        avisar('advertencia', mensaje);
        actualizarEstadoEnvio(estadoEnvio, mensaje, 'error');
        return;
      }

      invocarSeguro(() => enviar(evento));
    });

    registrarEvento(elemento, 'input', manejarEntrada);
    registrarEvento(elemento, 'change', manejarEntrada);
    registrarEvento(elemento, 'focusout', manejarSalida);

    registrarEvento(elemento, 'reset', () => {
      queueMicrotask(() => {
        if (estado.destruido) return;

        limpiarErroresFormulario(elemento);
        actualizarDependencias(dependencias, config, false);
        estado.instantanea = instantaneaActual();
        estado.modificado = false;
        elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');
        actualizarEstadoEnvio(estadoEnvio, '');
      });
    });

    for (const nombreEvento of [
      'app:seleccion',
      'app:lista-buscable:seleccion',
      'app:lista:seleccion',
    ]) {
      registrarEvento(elemento, nombreEvento, manejarSeleccionExterna);
    }

    if (botones.limpiar) {
      registrarEvento(botones.limpiar, 'click', (evento) => {
        evento.preventDefault();
        invocarSeguro(() => limpiar());
      });
    }

    if (botones.cancelar) {
      registrarEvento(botones.cancelar, 'click', (evento) => {
        evento.preventDefault();
        invocarSeguro(() => cancelar());
      });
    }

    if (botones.anular) {
      registrarEvento(botones.anular, 'click', (evento) => {
        evento.preventDefault();
        invocarSeguro(() => anular());
      });
    }

    if (botones.editar) {
      registrarEvento(botones.editar, 'click', (evento) => {
        evento.preventDefault();
        invocarSeguro(() => editar());
      });
    }

    if (typeof window !== 'undefined' && config.prevenirPerdidaDatos) {
      const manejarAntesDeSalir = (evento) => {
        if (
          estado.destruido ||
          estado.enviando ||
          !estado.modificado ||
          !config.prevenirPerdidaDatos
        ) {
          return;
        }

        evento.preventDefault();
        evento.returnValue = '';
      };

      window.addEventListener('beforeunload', manejarAntesDeSalir);

      limpiezasGlobales.set(elemento, () => {
        window.removeEventListener('beforeunload', manejarAntesDeSalir);
      });
    }
  };

  controlador = {
    elemento,
    nombre: config.nombre,
    opciones: config,
    obtenerDatos,
    obtenerDatosPreparados,
    validar,
    validarCampo,
    enviar,
    cargar,
    cargarEdicion,
    editar,
    limpiar,
    restablecer,
    cancelar,
    anular,
    bloquear,
    desbloquear,
    esModificado,
    obtenerRegistro,
    establecerRegistro,
    obtenerIdentificador,
    obtenerEstado,
    registrarSeleccion,
    destruir,
  };

  controladores.set(elemento, controlador);
  conectarEventos();

  actualizarDependencias(dependencias, config, false);
  estado.instantanea = instantaneaActual();
  estado.modificado = false;
  elemento.setAttribute(ATRIBUTOS.MODIFICADO, 'false');
  cambiarEstado(ESTADOS_FORMULARIO.INICIAL);
  actualizarEstadoEnvio(estadoEnvio, '');

  if (opciones.registro) {
    if (opciones.modo === 'edicion') {
      cargarEdicion(opciones.registro, {
        silencioso: true,
        esHistorico: opciones.esHistorico,
      });
    } else {
      cargar(opciones.registro, { silencioso: true });
    }
  }

  if (opciones.bloqueado === true) {
    bloquear({
      motivo: opciones.motivoBloqueo || config.textos.bloqueado,
      silencioso: true,
      historico: opciones.historico === true,
    });
  }

  return controlador;
}

/* ============================================================================
   9. CONSULTA Y DESTRUCCIÓN DESDE OTROS MÓDULOS
   ============================================================================ */

/**
 * Devuelve el controlador asociado a un formulario ya inicializado.
 * @param {HTMLFormElement|string} formulario
 * @returns {Object|null}
 */
export function obtenerControladorFormulario(formulario) {
  const elemento = resolverFormulario(formulario);
  if (!elemento) return null;

  return controladores.get(elemento) || null;
}

/**
 * Indica si un formulario ya fue inicializado por este módulo.
 * @param {HTMLFormElement|string} formulario
 * @returns {boolean}
 */
export function formularioEstaInicializado(formulario) {
  return obtenerControladorFormulario(formulario) !== null;
}

/**
 * Destruye el controlador de un formulario si existe.
 * @param {HTMLFormElement|string} formulario
 * @returns {boolean}
 */
export function destruirFormulario(formulario) {
  const controlador = obtenerControladorFormulario(formulario);
  if (!controlador) return false;

  return controlador.destruir();
}
