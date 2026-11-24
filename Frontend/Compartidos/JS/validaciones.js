/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * validaciones.js — Validaciones compartidas del frontend
 * ============================================================================
 *
 * Este módulo centraliza la comprobación de datos antes de enviarlos al
 * backend. Se utiliza desde formularios.js y desde los formularios de Login,
 * SuperAdmin, Farmacia, Almacén, Jefes de Departamento y Trabajadores.
 *
 * Organización del archivo:
 *   1. Resultados estructurados y utilidades internas.
 *   2. Validaciones generales de campos.
 *   3. Validaciones numéricas y de cantidades.
 *   4. Correos, códigos, selecciones y coincidencias.
 *   5. Validaciones de fechas y períodos.
 *   6. Validaciones de inventario: productos, lotes y existencias.
 *   7. Validación de formularios completos.
 *   8. Mensajes visuales junto a los campos.
 *
 * IMPORTANTE
 * - Estas validaciones son sólo la primera comprobación en el navegador.
 * - El backend Java/Spring Boot debe volver a verificar cantidades, lotes,
 *   productos, fechas, permisos y reglas de negocio antes de confirmar
 *   cualquier movimiento.
 * - Este archivo no consulta la base de datos, no modifica existencias, no
 *   autoriza operaciones y no aplica reglas automáticas como FEFO.
 * - No se establece que las fechas de salida o transferencia deban ser hoy o
 *   posteriores: los movimientos retroactivos son válidos. Cada formulario
 *   decide sus reglas y las envía como opciones.
 *
 * CONTRATO DE RESULTADO
 * Todas las funciones de validación devuelven un objeto con esta forma:
 *
 *   {
 *     valido: boolean,
 *     valor: any,                 // valor normalizado cuando es válido
 *     campo: string|null,         // primer campo con error
 *     codigo: string|null,        // código estable del primer error
 *     mensaje: string,            // mensaje en español para el usuario
 *     detalle: string|null,       // información adicional opcional
 *     errores: Array<{ campo, codigo, mensaje, detalle }>,
 *     datos: Object,              // información adicional de la validación
 *     resultados: Array<Object>   // sólo en validaciones compuestas
 *   }
 *
 * Los mensajes se generan en español y explican cómo corregir el problema.
 * ============================================================================
 */

import {
  esVacio,
  limpiarEspacios,
  compararTexto,
  formatearFecha,
  obtenerElemento,
  crearElemento,
  agregarClases,
  quitarClases,
  establecerAtributos,
  mostrarMensajeError,
} from './base.js';

const LOCALE = 'es-MX';

/* ============================================================================
   1. RESULTADOS ESTRUCTURADOS Y UTILIDADES INTERNAS
   ============================================================================ */

/**
 * Códigos estables de error. Permiten que formularios.js decida el tratamiento
 * sin depender del texto del mensaje.
 */
export const CODIGOS_ERROR = Object.freeze({
  REQUERIDO: 'REQUERIDO',
  VACIO: 'VACIO',
  LONGITUD_MINIMA: 'LONGITUD_MINIMA',
  LONGITUD_MAXIMA: 'LONGITUD_MAXIMA',
  LONGITUD_EXACTA: 'LONGITUD_EXACTA',
  FORMATO_INVALIDO: 'FORMATO_INVALIDO',
  CARACTERES_INVALIDOS: 'CARACTERES_INVALIDOS',
  NUMERO_INVALIDO: 'NUMERO_INVALIDO',
  ENTERO_INVALIDO: 'ENTERO_INVALIDO',
  DECIMALES_EXCEDIDOS: 'DECIMALES_EXCEDIDOS',
  CANTIDAD_INVALIDA: 'CANTIDAD_INVALIDA',
  CANTIDAD_NEGATIVA: 'CANTIDAD_NEGATIVA',
  CANTIDAD_CERO: 'CANTIDAD_CERO',
  CANTIDAD_MAXIMA: 'CANTIDAD_MAXIMA',
  RANGO_INVALIDO: 'RANGO_INVALIDO',
  CORREO_INVALIDO: 'CORREO_INVALIDO',
  CODIGO_INVALIDO: 'CODIGO_INVALIDO',
  SELECCION_REQUERIDA: 'SELECCION_REQUERIDA',
  SELECCION_INVALIDA: 'SELECCION_INVALIDA',
  NO_COINCIDE: 'NO_COINCIDE',
  FECHA_REQUERIDA: 'FECHA_REQUERIDA',
  FECHA_INVALIDA: 'FECHA_INVALIDA',
  FECHA_FUERA_RANGO: 'FECHA_FUERA_RANGO',
  FECHA_RETROACTIVA: 'FECHA_RETROACTIVA',
  FECHA_FUTURA: 'FECHA_FUTURA',
  FECHA_VENCIDA: 'FECHA_VENCIDA',
  PERIODO_INVALIDO: 'PERIODO_INVALIDO',
  PRODUCTO_REQUERIDO: 'PRODUCTO_REQUERIDO',
  PRODUCTO_INVALIDO: 'PRODUCTO_INVALIDO',
  PRODUCTO_INACTIVO: 'PRODUCTO_INACTIVO',
  LOTE_REQUERIDO: 'LOTE_REQUERIDO',
  LOTE_INVALIDO: 'LOTE_INVALIDO',
  LOTE_INACTIVO: 'LOTE_INACTIVO',
  LOTE_SIN_PRODUCTO: 'LOTE_SIN_PRODUCTO',
  LOTE_NO_CORRESPONDE: 'LOTE_NO_CORRESPONDE',
  LOTE_SIN_EXISTENCIA: 'LOTE_SIN_EXISTENCIA',
  EXISTENCIA_NO_DISPONIBLE: 'EXISTENCIA_NO_DISPONIBLE',
  EXISTENCIA_INSUFICIENTE: 'EXISTENCIA_INSUFICIENTE',
  FORMULARIO_INVALIDO: 'FORMULARIO_INVALIDO',
  CAMPO_NO_ENCONTRADO: 'CAMPO_NO_ENCONTRADO',
  VALIDACION_NO_DISPONIBLE: 'VALIDACION_NO_DISPONIBLE',
});

/**
 * Mensajes reutilizables. Las funciones aceptan `mensaje` o `etiqueta` para
 * adaptar el texto al formulario concreto.
 */
export const MENSAJES_VALIDACION = Object.freeze({
  REQUERIDO: 'Debe completar este campo.',
  SELECCION: 'Debe seleccionar una opción.',
  PRODUCTO: 'Debe seleccionar un producto registrado.',
  LOTE: 'Debe seleccionar un lote.',
  CANTIDAD: 'La cantidad debe ser un número válido.',
  CANTIDAD_NEGATIVA: 'La cantidad no puede ser negativa.',
  CANTIDAD_CERO: 'La cantidad debe ser mayor que cero.',
  EXISTENCIA: 'La cantidad supera la existencia disponible.',
  FECHA: 'La fecha ingresada no es válida.',
  CORREO: 'Ingrese un correo electrónico válido, por ejemplo nombre@dominio.com.',
  CODIGO: 'El código contiene caracteres no permitidos.',
  COINCIDENCIA: 'Los valores ingresados no coinciden.',
});

/**
 * Crea un error de validación normalizado.
 *
 * @param {string|null} campo Nombre o identificador del campo.
 * @param {string} codigo Código estable de CODIGOS_ERROR.
 * @param {string} mensaje Mensaje en español para el usuario.
 * @param {Object} [datos]
 * @param {string} [datos.detalle] Información adicional.
 * @returns {{campo: string|null, codigo: string, mensaje: string, detalle: string|null}}
 */
export function crearErrorValidacion(campo, codigo, mensaje, datos = {}) {
  return {
    campo: campo ? String(campo) : null,
    codigo: codigo || CODIGOS_ERROR.FORMATO_INVALIDO,
    mensaje: limpiarEspacios(mensaje) || MENSAJES_VALIDACION.REQUERIDO,
    detalle: datos.detalle ? String(datos.detalle) : null,
  };
}

/**
 * Construye un resultado válido.
 *
 * @param {*} [valor] Valor normalizado.
 * @param {Object} [datos] Información adicional.
 * @returns {Object}
 */
export function resultadoValido(valor = null, datos = {}) {
  return {
    valido: true,
    valor,
    campo: null,
    codigo: null,
    mensaje: '',
    detalle: null,
    errores: [],
    datos: datos && typeof datos === 'object' ? { ...datos } : {},
    resultados: [],
  };
}

/**
 * Construye un resultado inválido a partir de un error.
 *
 * @param {string|null} campo
 * @param {string} codigo
 * @param {string} mensaje
 * @param {Object} [datos]
 * @returns {Object}
 */
export function resultadoInvalido(campo, codigo, mensaje, datos = {}) {
  const error = crearErrorValidacion(campo, codigo, mensaje, datos);

  return {
    valido: false,
    valor: null,
    campo: error.campo,
    codigo: error.codigo,
    mensaje: error.mensaje,
    detalle: error.detalle,
    errores: [error],
    datos: datos && typeof datos === 'object' ? { ...datos } : {},
    resultados: [],
  };
}

/**
 * Combina varios resultados. El resultado combinado es inválido si alguno de
 * los resultados parciales lo es; conserva todos los errores y expone el
 * primero para enfocar el campo correspondiente.
 *
 * @param {Array<Object>} resultados Resultados parciales.
 * @param {Object} [datos] Información adicional.
 * @returns {Object}
 */
export function combinarResultados(resultados, datos = {}) {
  const lista = Array.isArray(resultados) ? resultados.filter(Boolean) : [];
  const errores = [];

  for (const resultado of lista) {
    if (!resultado || resultado.valido) continue;

    if (Array.isArray(resultado.errores) && resultado.errores.length > 0) {
      errores.push(...resultado.errores);
    } else if (resultado.mensaje) {
      errores.push(
        crearErrorValidacion(
          resultado.campo ?? null,
          resultado.codigo || CODIGOS_ERROR.FORMATO_INVALIDO,
          resultado.mensaje,
          { detalle: resultado.detalle }
        )
      );
    }
  }

  const primerError = errores[0] || null;
  const datosCombinados = { ...datos };

  for (const resultado of lista) {
    if (resultado?.datos && typeof resultado.datos === 'object') {
      Object.assign(datosCombinados, resultado.datos);
    }
  }

  return {
    valido: errores.length === 0,
    valor: lista.length === 1 ? lista[0].valor ?? null : null,
    campo: primerError?.campo ?? null,
    codigo: primerError?.codigo ?? null,
    mensaje: primerError?.mensaje ?? '',
    detalle: primerError?.detalle ?? null,
    errores,
    datos: datosCombinados,
    resultados: lista,
  };
}

/**
 * Devuelve el primer error de un resultado o de una lista de errores.
 *
 * @param {Object|Array<Object>|null} resultado
 * @returns {Object|null}
 */
export function obtenerPrimerError(resultado) {
  if (!resultado) return null;
  if (Array.isArray(resultado)) return resultado[0] || null;
  if (Array.isArray(resultado.errores)) return resultado.errores[0] || null;
  if (resultado.codigo && resultado.mensaje) {
    return crearErrorValidacion(
      resultado.campo ?? null,
      resultado.codigo,
      resultado.mensaje,
      { detalle: resultado.detalle }
    );
  }
  return null;
}

/**
 * Indica si un resultado es válido.
 *
 * @param {Object|null} resultado
 * @returns {boolean}
 */
export function esResultadoValido(resultado) {
  return Boolean(resultado && resultado.valido === true);
}

/* --- Utilidades internas --------------------------------------------------- */

/**
 * Convierte un valor en texto limpio sin lanzar excepciones.
 * @param {*} valor
 * @returns {string}
 * @private
 */
function aTexto(valor) {
  return limpiarEspacios(valor);
}

/**
 * Obtiene una etiqueta legible para construir mensajes.
 * @param {Object} opciones
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @returns {string}
 * @private
 */
function obtenerEtiqueta(opciones = {}) {
  return aTexto(opciones.etiqueta || opciones.nombre || opciones.campo || '');
}

/**
 * Construye un mensaje con etiqueta cuando está disponible.
 * @param {string} base
 * @param {string} etiqueta
 * @returns {string}
 * @private
 */
function conEtiqueta(base, etiqueta) {
  return etiqueta ? `${base} (${etiqueta}).` : base;
}

/**
 * Cuenta caracteres visibles sin romper pares sustitutos.
 * @param {string} texto
 * @returns {number}
 * @private
 */
function contarCaracteres(texto) {
  return Array.from(String(texto)).length;
}

/**
 * Convierte un valor numérico o una cadena numérica en Number.
 *
 * Acepta números y cadenas con punto decimal. Una coma se interpreta como
 * separador decimal sólo cuando no existe un punto, para no confundir
 * "1,234.50". No acepta valores booleanos, arreglos ni objetos.
 *
 * @param {*} valor
 * @returns {number|null} null cuando no es un número finito.
 * @private
 */
function convertirNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  if (typeof valor !== 'string') return null;

  let texto = valor.trim();
  if (!texto) return null;

  texto = texto.replace(/\s+/g, '');

  if (texto.includes(',') && !texto.includes('.')) {
    texto = texto.replace(',', '.');
  } else if (texto.includes(',') && texto.includes('.')) {
    // Formato 1,234.50: la coma separa miles.
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto)) {
      texto = texto.replace(/,/g, '');
    } else {
      return null;
    }
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(texto)) return null;

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Cuenta los decimales significativos de un número o cadena.
 * @param {*} valor
 * @returns {number}
 * @private
 */
function contarDecimales(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return 0;
    const texto = String(valor);
    if (/e-/i.test(texto)) {
      const [base, exponente] = texto.split(/e-/i);
      const decimalesBase = (base.split('.')[1] || '').length;
      return decimalesBase + Number(exponente);
    }
    return (texto.split('.')[1] || '').length;
  }

  const texto = String(valor ?? '').trim().replace(/\s+/g, '');

  if (!texto.includes('.')) return 0;

  return texto.split('.')[1].replace(/0+$/, '').length;
}

/**
 * Devuelve el primer valor que no esté vacío.
 * @param {...*} valores
 * @returns {*}
 * @private
 */
function primerValorDisponible(...valores) {
  for (const valor of valores) {
    if (!esVacio(valor)) return valor;
  }

  return undefined;
}

/**
 * Crea una fecha local validando que los componentes existan realmente.
 * Evita que "2026-02-31" se convierta en marzo.
 *
 * @param {number} anio
 * @param {number} mes Mes 1-12.
 * @param {number} dia
 * @param {number} [horas]
 * @param {number} [minutos]
 * @param {number} [segundos]
 * @returns {Date|null}
 * @private
 */
function crearFechaLocal(anio, mes, dia, horas = 0, minutos = 0, segundos = 0) {
  const fecha = new Date(anio, mes - 1, dia, horas, minutos, segundos);

  const valida =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia &&
    fecha.getHours() === horas &&
    fecha.getMinutes() === minutos &&
    fecha.getSeconds() === segundos;

  return valida ? fecha : null;
}

const PATRON_FECHA_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const PATRON_FECHA_DIA_MES_ANIO = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const PATRON_FECHA_HORA =
  /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/;
const PATRON_ZONA_HORARIA = /(?:z|[+-]\d{2}:?\d{2})$/i;

/**
 * Convierte un valor en Date sin desplazar fechas sin zona horaria.
 * Acepta Date, marca de tiempo en milisegundos, "AAAA-MM-DD",
 * "DD/MM/AAAA", "DD-MM-AAAA" y fechas ISO con o sin hora.
 *
 * @param {*} valor
 * @returns {Date|null}
 * @private
 */
function convertirFecha(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  if (typeof valor !== 'string') return null;

  const texto = valor.trim();
  if (!texto) return null;

  let coincidencia = PATRON_FECHA_ISO.exec(texto);

  if (coincidencia) {
    return crearFechaLocal(
      Number(coincidencia[1]),
      Number(coincidencia[2]),
      Number(coincidencia[3])
    );
  }

  coincidencia = PATRON_FECHA_DIA_MES_ANIO.exec(texto);

  if (coincidencia) {
    return crearFechaLocal(
      Number(coincidencia[3]),
      Number(coincidencia[2]),
      Number(coincidencia[1])
    );
  }

  coincidencia = PATRON_FECHA_HORA.exec(texto);

  if (coincidencia && !PATRON_ZONA_HORARIA.test(texto)) {
    return crearFechaLocal(
      Number(coincidencia[1]),
      Number(coincidencia[2]),
      Number(coincidencia[3]),
      Number(coincidencia[4]),
      Number(coincidencia[5]),
      Number(coincidencia[6] || 0)
    );
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Normaliza una fecha al inicio del día local para comparar días completos.
 * @param {Date} fecha
 * @returns {Date}
 * @private
 */
function inicioDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/* ============================================================================
   2. VALIDACIONES GENERALES DE CAMPOS
   ============================================================================ */

/**
 * Comprueba si un campo está vacío. Un valor 0 o false NO se considera vacío.
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function esCampoVacio(valor) {
  return esVacio(valor);
}

/**
 * Valida que un campo obligatorio tenga contenido.
 *
 * @param {*} valor Valor recibido.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo] Nombre interno del campo.
 * @param {string} [opciones.etiqueta] Nombre visible; se usa en el mensaje.
 * @param {string} [opciones.mensaje] Mensaje personalizado.
 * @returns {Object} Resultado estructurado.
 */
export function validarObligatorio(valor, opciones = {}) {
  const campo = opciones.campo ? String(opciones.campo) : null;
  const etiqueta = obtenerEtiqueta(opciones);

  if (esVacio(valor)) {
    const mensaje =
      aTexto(opciones.mensaje) ||
      (etiqueta
        ? `Debe completar el campo ${etiqueta}.`
        : MENSAJES_VALIDACION.REQUERIDO);

    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.REQUERIDO,
      mensaje,
      { etiqueta }
    );
  }

  return resultadoValido(valor, { etiqueta });
}

/**
 * Alias explícito de validarObligatorio para código que prefiera el nombre
 * en positivo.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarNoVacio(valor, opciones = {}) {
  return validarObligatorio(valor, opciones);
}

/**
 * Valida la longitud de un texto.
 *
 * La longitud se cuenta sobre el texto sin espacios en los extremos y con los
 * espacios internos reducidos a uno. Los emojis y caracteres compuestos cuentan
 * como un solo carácter visible.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {number} [opciones.minimo]
 * @param {number} [opciones.maximo]
 * @param {number} [opciones.exacta] Longitud exacta requerida.
 * @param {boolean} [opciones.obligatorio=true]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarLongitud(valor, opciones = {}) {
  const {
    campo = null,
    minimo,
    maximo,
    exacta,
    obligatorio = true,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);
  const nombre = etiqueta ? `El campo ${etiqueta}` : 'El campo';

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta, longitud: 0 });
    return validarObligatorio(valor, { campo, etiqueta, mensaje });
  }

  const texto = aTexto(valor);
  const longitud = contarCaracteres(texto);

  if (Number.isFinite(exacta) && longitud !== Number(exacta)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LONGITUD_EXACTA,
      aTexto(mensaje) || `${nombre} debe tener exactamente ${exacta} caracteres.`,
      { etiqueta, longitud, requerida: Number(exacta) }
    );
  }

  if (Number.isFinite(minimo) && longitud < Number(minimo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LONGITUD_MINIMA,
      aTexto(mensaje) ||
        `${nombre} debe tener al menos ${minimo} caracteres.`,
      { etiqueta, longitud, minimo: Number(minimo) }
    );
  }

  if (Number.isFinite(maximo) && longitud > Number(maximo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LONGITUD_MAXIMA,
      aTexto(mensaje) ||
        `${nombre} no debe superar los ${maximo} caracteres.`,
      { etiqueta, longitud, maximo: Number(maximo) }
    );
  }

  return resultadoValido(texto, { etiqueta, longitud });
}

/**
 * Comprueba que un texto cumpla una expresión regular.
 *
 * @param {*} valor
 * @param {RegExp|string} patron Expresión regular o su texto.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {string} [opciones.mensaje]
 * @param {boolean} [opciones.obligatorio=false] Si es true, exige contenido.
 * @returns {Object}
 */
export function validarPatron(valor, patron, opciones = {}) {
  const { campo = null, mensaje, obligatorio = false } = opciones;
  const etiqueta = obtenerEtiqueta(opciones);

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, { campo, etiqueta });
  }

  let expresion = patron;

  if (typeof patron === 'string') {
    try {
      expresion = new RegExp(patron, 'u');
    } catch {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
        'No se pudo comprobar el formato del campo.',
        { etiqueta }
      );
    }
  }

  if (!(expresion instanceof RegExp)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
      'No se pudo comprobar el formato del campo.',
      { etiqueta }
    );
  }

  const texto = aTexto(valor);
  expresion.lastIndex = 0;
  const cumple = expresion.test(texto);
  expresion.lastIndex = 0;

  if (!cumple) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FORMATO_INVALIDO,
      aTexto(mensaje) ||
        (etiqueta
          ? `El formato del campo ${etiqueta} no es válido.`
          : 'El formato ingresado no es válido.'),
      { etiqueta, valor: texto }
    );
  }

  return resultadoValido(texto, { etiqueta });
}

const PATRON_SOLO_LETRAS = /^[\p{L}\p{M}]+(?:[\s.'’-]+[\p{L}\p{M}]+)*$/u;
const PATRON_ALFANUMERICO = /^[\p{L}\p{M}\p{N}]+(?:[\s._/-]+[\p{L}\p{M}\p{N}]+)*$/u;

/**
 * Valida un texto general: obligatoriedad, longitud y caracteres permitidos.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {boolean} [opciones.obligatorio=true]
 * @param {number} [opciones.minimo]
 * @param {number} [opciones.maximo]
 * @param {number} [opciones.exacta]
 * @param {RegExp|string} [opciones.patron] Patrón adicional.
 * @param {boolean} [opciones.soloLetras=false] Sólo letras, espacios y signos
 *   comunes de nombres (punto, apóstrofo, guion).
 * @param {boolean} [opciones.soloAlfanumerico=false] Letras, números, espacios,
 *   punto, guion bajo, guion y diagonal.
 * @param {boolean} [opciones.permitirEspacios=true]
 * @param {string} [opciones.mensaje]
 * @param {string} [opciones.mensajePatron]
 * @returns {Object}
 */
export function validarTexto(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = true,
    soloLetras = false,
    soloAlfanumerico = false,
    permitirEspacios = true,
    patron = null,
    mensajePatron,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, { campo, etiqueta, mensaje });
  }

  const texto = aTexto(valor);
  const nombre = etiqueta ? `El campo ${etiqueta}` : 'El campo';

  if (!permitirEspacios && /\s/.test(texto)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CARACTERES_INVALIDOS,
      aTexto(mensaje) || `${nombre} no debe contener espacios.`,
      { etiqueta, valor: texto }
    );
  }

  if (soloLetras && !PATRON_SOLO_LETRAS.test(texto)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FORMATO_INVALIDO,
      aTexto(mensaje) ||
        `${nombre} sólo debe contener letras, espacios, puntos, apóstrofos o guiones.`,
      { etiqueta, valor: texto }
    );
  }

  if (soloAlfanumerico && !PATRON_ALFANUMERICO.test(texto)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CARACTERES_INVALIDOS,
      aTexto(mensaje) ||
        `${nombre} sólo debe contener letras, números, espacios, puntos, guiones o diagonales.`,
      { etiqueta, valor: texto }
    );
  }

  const resultadoLongitud = validarLongitud(texto, {
    campo,
    etiqueta,
    obligatorio: true,
    minimo: opciones.minimo,
    maximo: opciones.maximo,
    exacta: opciones.exacta,
    mensaje,
  });

  if (!resultadoLongitud.valido) return resultadoLongitud;

  if (patron) {
    const resultadoPatron = validarPatron(texto, patron, {
      campo,
      etiqueta,
      obligatorio: true,
      mensaje: mensajePatron || mensaje,
    });

    if (!resultadoPatron.valido) return resultadoPatron;
  }

  return resultadoValido(texto, {
    etiqueta,
    longitud: contarCaracteres(texto),
  });
}

/* ============================================================================
   3. VALIDACIONES NUMÉRICAS Y DE CANTIDADES
   ============================================================================ */

/**
 * Valida un número con opciones de rango, signo, decimales y tipo entero.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {boolean} [opciones.obligatorio=false]
 * @param {boolean} [opciones.entero=false]
 * @param {boolean} [opciones.permitirNegativos=true]
 * @param {boolean} [opciones.permitirCero=true]
 * @param {number} [opciones.minimo]
 * @param {number} [opciones.maximo]
 * @param {number} [opciones.decimales] Máximo de decimales permitidos.
 * @param {string} [opciones.mensaje]
 * @param {string} [opciones.mensajeMinimo]
 * @param {string} [opciones.mensajeMaximo]
 * @returns {Object}
 */
export function validarNumero(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = false,
    entero = false,
    permitirNegativos = true,
    permitirCero = true,
    decimales,
    mensaje,
    mensajeMinimo,
    mensajeMaximo,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);
  const nombre = etiqueta ? `El campo ${etiqueta}` : 'El valor';

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido(null, { etiqueta });
    return validarObligatorio(valor, { campo, etiqueta, mensaje });
  }

  const numero = convertirNumero(valor);

  if (numero === null) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.NUMERO_INVALIDO,
      aTexto(mensaje) || `${nombre} debe ser un número válido.`,
      { etiqueta, valor }
    );
  }

  if (entero && !Number.isInteger(numero)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.ENTERO_INVALIDO,
      aTexto(mensaje) || `${nombre} debe ser un número entero, sin decimales.`,
      { etiqueta, valor: numero }
    );
  }

  if (
    Number.isFinite(decimales) &&
    Number(decimales) >= 0 &&
    Number.isInteger(numero) === false &&
    contarDecimales(valor) > Number(decimales)
  ) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.DECIMALES_EXCEDIDOS,
      aTexto(mensaje) ||
        `${nombre} admite como máximo ${decimales} decimales.`,
      { etiqueta, valor: numero, decimales: Number(decimales) }
    );
  }

  if (!permitirNegativos && numero < 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_NEGATIVA,
      aTexto(mensaje) || `${nombre} no puede ser negativo.`,
      { etiqueta, valor: numero }
    );
  }

  if (!permitirCero && numero === 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_CERO,
      aTexto(mensaje) || `${nombre} debe ser mayor que cero.`,
      { etiqueta, valor: numero }
    );
  }

  if (Number.isFinite(opciones.minimo) && numero < Number(opciones.minimo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.RANGO_INVALIDO,
      aTexto(mensajeMinimo) ||
        `${nombre} debe ser igual o mayor que ${opciones.minimo}.`,
      { etiqueta, valor: numero, minimo: Number(opciones.minimo) }
    );
  }

  if (Number.isFinite(opciones.maximo) && numero > Number(opciones.maximo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.RANGO_INVALIDO,
      aTexto(mensajeMaximo) ||
        `${nombre} debe ser igual o menor que ${opciones.maximo}.`,
      { etiqueta, valor: numero, maximo: Number(opciones.maximo) }
    );
  }

  return resultadoValido(numero, { etiqueta });
}

/**
 * Valida un número entero.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarEntero(valor, opciones = {}) {
  return validarNumero(valor, { ...opciones, entero: true });
}

/**
 * Valida un valor decimal.
 *
 * Por defecto no exige el campo y no permite valores negativos ni más de dos
 * decimales; todas las opciones pueden modificarse.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarDecimal(valor, opciones = {}) {
  return validarNumero(valor, {
    decimales: 2,
    permitirNegativos: false,
    ...opciones,
  });
}

/**
 * Valida una cantidad de inventario.
 *
 * Por defecto la cantidad es obligatoria, debe ser numérica, no puede ser
 * negativa, debe ser mayor que cero y admite hasta tres decimales. No modifica
 * la existencia ni consulta el inventario.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {number} [opciones.maximo] Cantidad máxima permitida.
 * @param {number} [opciones.minimo] Cantidad mínima permitida.
 * @param {number} [opciones.decimales=3]
 * @param {boolean} [opciones.permitirCero=false]
 * @param {boolean} [opciones.entero=false]
 * @param {boolean} [opciones.obligatorio=true]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarCantidad(valor, opciones = {}) {
  const {
    campo = null,
    decimales = 3,
    permitirCero = false,
    entero = false,
    obligatorio = true,
    maximo,
    minimo,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);
  const nombre = etiqueta ? `La cantidad de ${etiqueta}` : 'La cantidad';

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido(null, { etiqueta });

    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.REQUERIDO,
      aTexto(mensaje) ||
        (etiqueta
          ? `Debe ingresar la cantidad de ${etiqueta}.`
          : 'Debe ingresar una cantidad.'),
      { etiqueta }
    );
  }

  const numero = convertirNumero(valor);

  if (numero === null) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_INVALIDA,
      aTexto(mensaje) || 'La cantidad debe ser un número válido.',
      { etiqueta, valor }
    );
  }

  if (numero < 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_NEGATIVA,
      aTexto(mensaje) || 'La cantidad no puede ser negativa.',
      { etiqueta, valor: numero }
    );
  }

  if (!permitirCero && numero === 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_CERO,
      aTexto(mensaje) || 'La cantidad debe ser mayor que cero.',
      { etiqueta, valor: numero }
    );
  }

  if (entero && !Number.isInteger(numero)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.ENTERO_INVALIDO,
      aTexto(mensaje) || 'La cantidad debe ser un número entero.',
      { etiqueta, valor: numero }
    );
  }

  if (
    Number.isFinite(decimales) &&
    !Number.isInteger(numero) &&
    contarDecimales(valor) > Number(decimales)
  ) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.DECIMALES_EXCEDIDOS,
      aTexto(mensaje) ||
        `La cantidad admite como máximo ${decimales} decimales.`,
      { etiqueta, valor: numero, decimales: Number(decimales) }
    );
  }

  if (Number.isFinite(minimo) && numero < Number(minimo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_INVALIDA,
      aTexto(mensaje) ||
        `${nombre} debe ser igual o mayor que ${minimo}.`,
      { etiqueta, valor: numero, minimo: Number(minimo) }
    );
  }

  if (Number.isFinite(maximo) && numero > Number(maximo)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_MAXIMA,
      aTexto(mensaje) ||
        `La cantidad no puede ser mayor que ${maximo}.`,
      { etiqueta, valor: numero, maximo: Number(maximo) }
    );
  }

  return resultadoValido(numero, { etiqueta });
}

/**
 * Alias explícito para cantidades que deben ser mayores que cero.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarCantidadPositiva(valor, opciones = {}) {
  return validarCantidad(valor, { ...opciones, permitirCero: false });
}

/**
 * Comprueba que una cantidad no supere un máximo.
 *
 * @param {*} cantidad
 * @param {*} maximo
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarCantidadMaxima(cantidad, maximo, opciones = {}) {
  const { campo = null, mensaje } = opciones;
  const etiqueta = obtenerEtiqueta(opciones);

  const resultadoCantidad = validarCantidad(cantidad, {
    ...opciones,
    campo,
    etiqueta,
  });

  if (!resultadoCantidad.valido) return resultadoCantidad;

  const limite = convertirNumero(maximo);

  if (limite === null || limite < 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
      'No se pudo comprobar el límite permitido para la cantidad.',
      { etiqueta, maximo: null }
    );
  }

  if (resultadoCantidad.valor > limite) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CANTIDAD_MAXIMA,
      aTexto(mensaje) || `La cantidad no puede ser mayor que ${limite}.`,
      {
        etiqueta,
        valor: resultadoCantidad.valor,
        maximo: limite,
      }
    );
  }

  return resultadoValido(resultadoCantidad.valor, {
    etiqueta,
    maximo: limite,
  });
}

/**
 * Valida que un número se encuentre dentro de un rango.
 *
 * @param {*} valor
 * @param {number} minimo
 * @param {number} maximo
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarRangoNumerico(valor, minimo, maximo, opciones = {}) {
  return validarNumero(valor, {
    ...opciones,
    minimo,
    maximo,
  });
}

/* ============================================================================
   4. CORREOS, CÓDIGOS, SELECCIONES Y COINCIDENCIAS
   ============================================================================ */

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PATRON_CODIGO = /^[\p{L}\p{N}][\p{L}\p{N}._/-]*$/u;

/**
 * Valida un correo electrónico.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {boolean} [opciones.obligatorio=false]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarCorreo(valor, opciones = {}) {
  const { campo = null, obligatorio = false, mensaje } = opciones;
  const etiqueta = obtenerEtiqueta(opciones);

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, {
      campo,
      etiqueta: etiqueta || 'correo electrónico',
      mensaje: mensaje || 'Debe ingresar un correo electrónico.',
    });
  }

  const correo = String(valor).trim();
  const [local = '', dominio = ''] = correo.split('@');
  const valido =
    correo.length <= 254 &&
    local.length > 0 &&
    local.length <= 64 &&
    dominio.length > 0 &&
    PATRON_CORREO.test(correo) &&
    !correo.includes('..') &&
    !local.startsWith('.') &&
    !local.endsWith('.') &&
    !dominio.startsWith('.') &&
    !dominio.endsWith('.');

  if (!valido) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CORREO_INVALIDO,
      aTexto(mensaje) || MENSAJES_VALIDACION.CORREO,
      { etiqueta, valor: correo }
    );
  }

  return resultadoValido(correo, { etiqueta });
}

/**
 * Valida códigos, claves y referencias internas.
 *
 * Por defecto se permiten letras, números, punto, guion bajo, guion y diagonal.
 * El valor se devuelve sin espacios en los extremos y conserva mayúsculas.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {boolean} [opciones.obligatorio=true]
 * @param {number} [opciones.minimo=1]
 * @param {number} [opciones.maximo=50]
 * @param {RegExp|string} [opciones.patron]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarCodigo(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = true,
    minimo = 1,
    maximo = 50,
    patron = PATRON_CODIGO,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, {
      campo,
      etiqueta: etiqueta || 'código',
      mensaje: mensaje || 'Debe ingresar un código.',
    });
  }

  const resultadoLongitud = validarLongitud(valor, {
    campo,
    etiqueta,
    obligatorio: true,
    minimo,
    maximo,
  });

  if (!resultadoLongitud.valido) return resultadoLongitud;

  const resultadoPatron = validarPatron(resultadoLongitud.valor, patron, {
    campo,
    etiqueta,
    obligatorio: true,
    mensaje:
      mensaje ||
      (etiqueta
        ? `El código de ${etiqueta} contiene caracteres no permitidos.`
        : MENSAJES_VALIDACION.CODIGO),
  });

  if (!resultadoPatron.valido) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.CODIGO_INVALIDO,
      resultadoPatron.mensaje,
      { etiqueta, valor: resultadoPatron.valor }
    );
  }

  return resultadoValido(resultadoLongitud.valor, { etiqueta });
}

/**
 * Valida una referencia interna. Es un alias explícito de validarCodigo para
 * códigos de producto, lote, departamento o documento.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarReferencia(valor, opciones = {}) {
  return validarCodigo(valor, opciones);
}

/**
 * Valida que se haya seleccionado una opción.
 *
 * La etiqueta debe describir la opción completa, por ejemplo "un medicamento",
 * "un lote" o "un departamento o servicio", para que el mensaje resulte claro.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta='una opción']
 * @param {boolean} [opciones.obligatorio=true]
 * @param {boolean} [opciones.multiple=false] Acepta un arreglo de valores.
 * @param {Array<*>} [opciones.valoresPermitidos] Lista de valores válidos.
 * @param {boolean} [opciones.rechazarCero=false] Rechaza el valor "0".
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarSeleccion(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = true,
    multiple = false,
    valoresPermitidos = null,
    rechazarCero = false,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones) || 'una opción';

  if (esVacio(valor)) {
    if (!obligatorio) {
      return resultadoValido(multiple ? [] : '', { etiqueta });
    }

    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_REQUERIDA,
      aTexto(mensaje) || `Debe seleccionar ${etiqueta}.`,
      { etiqueta }
    );
  }

  const valores = multiple ? (Array.isArray(valor) ? valor : [valor]) : [valor];
  const permitidos =
    Array.isArray(valoresPermitidos) && valoresPermitidos.length > 0
      ? new Set(valoresPermitidos.map((item) => String(item)))
      : null;

  const normalizados = [];

  for (const item of valores) {
    if (item === null || item === undefined || String(item).trim() === '') {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.SELECCION_REQUERIDA,
        aTexto(mensaje) || `Debe seleccionar ${etiqueta}.`,
        { etiqueta }
      );
    }

    if (typeof item === 'object') {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.SELECCION_INVALIDA,
        aTexto(mensaje) || 'La opción seleccionada no es válida.',
        { etiqueta }
      );
    }

    const texto = String(item).trim();

    if (rechazarCero && texto === '0') {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.SELECCION_INVALIDA,
        aTexto(mensaje) || `Debe seleccionar ${etiqueta}.`,
        { etiqueta, valor: texto }
      );
    }

    if (permitidos && !permitidos.has(texto)) {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.SELECCION_INVALIDA,
        aTexto(mensaje) || 'La opción seleccionada no es válida.',
        { etiqueta, valor: texto }
      );
    }

    normalizados.push(texto);
  }

  if (!multiple && normalizados.length !== 1) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(mensaje) || `Debe seleccionar ${etiqueta}.`,
      { etiqueta }
    );
  }

  return resultadoValido(multiple ? normalizados : normalizados[0], {
    etiqueta,
  });
}

/**
 * Valida que dos campos coincidan (por ejemplo, contraseña y confirmación).
 *
 * @param {*} valor
 * @param {*} valorComparado
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.campoComparado]
 * @param {string} [opciones.etiqueta]
 * @param {string} [opciones.etiquetaComparada]
 * @param {boolean} [opciones.obligatorio=true]
 * @param {boolean} [opciones.ignorarMayusculas=false]
 * @param {boolean} [opciones.ignorarAcentos=false]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarCoincidencia(valor, valorComparado, opciones = {}) {
  const {
    campo = null,
    campoComparado = null,
    obligatorio = true,
    ignorarMayusculas = false,
    ignorarAcentos = false,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones);
  const etiquetaComparada = aTexto(
    opciones.etiquetaComparada || opciones.nombreComparado
  );

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, { campo, etiqueta, mensaje });
  }

  if (esVacio(valorComparado)) {
    return resultadoInvalido(
      campoComparado || campo,
      CODIGOS_ERROR.REQUERIDO,
      etiquetaComparada
        ? `Debe completar el campo ${etiquetaComparada}.`
        : 'Debe completar el campo de confirmación.',
      { etiqueta: etiquetaComparada }
    );
  }

  const coincide = compararTexto(valor, valorComparado, {
    ignorarMayusculas,
    ignorarAcentos,
  });

  if (!coincide) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.NO_COINCIDE,
      aTexto(mensaje) ||
        (etiqueta
          ? `El valor del campo ${etiqueta} no coincide con el valor de confirmación.`
          : MENSAJES_VALIDACION.COINCIDENCIA),
      { etiqueta, campoComparado }
    );
  }

  return resultadoValido(String(valor).trim(), { etiqueta });
}

/* ============================================================================
   5. VALIDACIONES DE FECHAS Y PERÍODOS
   ----------------------------------------------------------------------------
   El sistema distingue dos conceptos:
   - Fecha efectiva: el día del movimiento (entrada, salida, transferencia o
     vencimiento). Puede ser anterior a hoy.
   - Fecha de registro: el instante real en que el usuario guarda la operación.
   Las funciones de esta sección nunca cambian una fecha retroactiva: sólo la
   validan y, si corresponde, informan que es anterior.
   ============================================================================ */

/**
 * Compara dos fechas por día local.
 *
 * @param {Date} primera
 * @param {Date} segunda
 * @returns {number} Negativo si la primera es anterior; 0 si es el mismo día.
 */
export function compararFechasPorDia(primera, segunda) {
  const fechaPrimera = convertirFecha(primera);
  const fechaSegunda = convertirFecha(segunda);

  if (!fechaPrimera || !fechaSegunda) return Number.NaN;

  return inicioDelDia(fechaPrimera).getTime() - inicioDelDia(fechaSegunda).getTime();
}

/**
 * Comprueba si un valor es una fecha válida.
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function esFechaValida(valor) {
  return convertirFecha(valor) !== null;
}

/**
 * Valida una fecha y, opcionalmente, un rango mínimo o máximo.
 *
 * No exige que la fecha sea hoy o posterior. Si se necesita esa regla, el
 * formulario debe indicarla explícitamente con `fechaMinima`.
 *
 * @param {*} valor Fecha, marca de tiempo o cadena de fecha.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta='fecha']
 * @param {boolean} [opciones.obligatorio=false]
 * @param {boolean} [opciones.soloFecha=true] Normaliza al inicio del día.
 * @param {*} [opciones.fechaMinima] Límite inferior inclusivo.
 * @param {*} [opciones.fechaMaxima] Límite superior inclusivo.
 * @param {string} [opciones.mensaje]
 * @param {string} [opciones.mensajeMinimo]
 * @param {string} [opciones.mensajeMaximo]
 * @returns {Object}
 */
export function validarFecha(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = false,
    soloFecha = true,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones) || 'fecha';

  if (esVacio(valor)) {
    if (!obligatorio) {
      return resultadoValido(null, { etiqueta, fecha: null });
    }

    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FECHA_REQUERIDA,
      aTexto(mensaje) || `Debe ingresar la ${etiqueta}.`,
      { etiqueta }
    );
  }

  const fechaConvertida = convertirFecha(valor);

  if (!fechaConvertida) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FECHA_INVALIDA,
      aTexto(mensaje) || MENSAJES_VALIDACION.FECHA,
      { etiqueta, valor }
    );
  }

  const fecha = soloFecha ? inicioDelDia(fechaConvertida) : fechaConvertida;

  const fechaMinima = esVacio(opciones.fechaMinima)
    ? null
    : convertirFecha(opciones.fechaMinima);
  const fechaMaxima = esVacio(opciones.fechaMaxima)
    ? null
    : convertirFecha(opciones.fechaMaxima);

  if (opciones.fechaMinima !== undefined && opciones.fechaMinima !== null) {
    if (!fechaMinima) {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
        'No se pudo comprobar la fecha mínima permitida.',
        { etiqueta }
      );
    }

    if (fecha.getTime() < inicioDelDia(fechaMinima).getTime()) {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.FECHA_FUERA_RANGO,
        aTexto(opciones.mensajeMinimo) ||
          `La ${etiqueta} no puede ser anterior al ${formatearFecha(fechaMinima)}.`,
        {
          etiqueta,
          fecha,
          fechaMinima,
        }
      );
    }
  }

  if (opciones.fechaMaxima !== undefined && opciones.fechaMaxima !== null) {
    if (!fechaMaxima) {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
        'No se pudo comprobar la fecha máxima permitida.',
        { etiqueta }
      );
    }

    const limiteSuperior = new Date(fechaMaxima.getTime());
    limiteSuperior.setHours(23, 59, 59, 999);

    if (fecha.getTime() > limiteSuperior.getTime()) {
      return resultadoInvalido(
        campo,
        CODIGOS_ERROR.FECHA_FUERA_RANGO,
        aTexto(opciones.mensajeMaximo) ||
          `La ${etiqueta} no puede ser posterior al ${formatearFecha(fechaMaxima)}.`,
        {
          etiqueta,
          fecha,
          fechaMaxima,
        }
      );
    }
  }

  return resultadoValido(fecha, {
    etiqueta,
    fecha,
    fechaTexto: formatearFecha(fecha),
    fechaISO: [
      String(fecha.getFullYear()).padStart(4, '0'),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0'),
    ].join('-'),
  });
}

/**
 * Valida una fecha obligatoria.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarFechaObligatoria(valor, opciones = {}) {
  return validarFecha(valor, { ...opciones, obligatorio: true });
}

/**
 * Valida la fecha de entrada de un movimiento.
 *
 * Se permite cualquier fecha válida, incluida una anterior a hoy. El formulario
 * puede añadir límites con `fechaMinima` o `fechaMaxima`.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarFechaEntrada(valor, opciones = {}) {
  return validarFecha(valor, {
    etiqueta: 'fecha de entrada',
    obligatorio: true,
    ...opciones,
  });
}

/**
 * Valida la fecha de salida de un movimiento.
 *
 * No se exige que sea hoy ni posterior: las salidas retroactivas son válidas.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarFechaSalida(valor, opciones = {}) {
  return validarFecha(valor, {
    etiqueta: 'fecha de salida',
    obligatorio: true,
    ...opciones,
  });
}

/**
 * Valida la fecha de una transferencia entre almacenes o servicios.
 *
 * No se exige que sea hoy ni posterior: las transferencias retroactivas son
 * válidas.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarFechaTransferencia(valor, opciones = {}) {
  return validarFecha(valor, {
    etiqueta: 'fecha de transferencia',
    obligatorio: true,
    ...opciones,
  });
}

/**
 * Valida una fecha de vencimiento.
 *
 * Por defecto sólo comprueba que sea una fecha real. Si el formulario necesita
 * rechazar productos vencidos, debe indicar `exigirNoVencida: true`; incluso en
 * ese caso la decisión final corresponde al backend y a la política sanitaria.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {boolean} [opciones.exigirNoVencida=false]
 * @param {*} [opciones.fechaReferencia] Fecha con la que se compara; hoy por defecto.
 * @returns {Object}
 */
export function validarFechaVencimiento(valor, opciones = {}) {
  const resultado = validarFecha(valor, {
    etiqueta: 'fecha de vencimiento',
    obligatorio: true,
    ...opciones,
  });

  if (!resultado.valido) return resultado;

  const referencia =
    convertirFecha(opciones.fechaReferencia) || new Date();
  const vencida =
    compararFechasPorDia(resultado.valor, referencia) < 0;
  const aviso = vencida
    ? 'La fecha de vencimiento es anterior a la fecha de referencia. Verifique si el producto puede utilizarse.'
    : '';

  if (vencida && opciones.exigirNoVencida === true) {
    return resultadoInvalido(
      opciones.campo || null,
      CODIGOS_ERROR.FECHA_VENCIDA,
      aTexto(opciones.mensaje) ||
        `La ${resultado.datos.etiqueta || 'fecha de vencimiento'} ya venció.`,
      {
        etiqueta: resultado.datos.etiqueta,
        fecha: resultado.valor,
        fechaReferencia: referencia,
      }
    );
  }

  return resultadoValido(resultado.valor, {
    ...resultado.datos,
    vencida,
    fechaReferencia: referencia,
    aviso,
  });
}

/**
 * Valida un período compuesto por fecha de inicio y fecha de finalización.
 *
 * @param {*} inicio
 * @param {*} fin
 * @param {Object} [opciones]
 * @param {string} [opciones.campoInicio='fechaInicio']
 * @param {string} [opciones.campoFin='fechaFin']
 * @param {string} [opciones.etiquetaInicio='fecha de inicio']
 * @param {string} [opciones.etiquetaFin='fecha de finalización']
 * @param {boolean} [opciones.obligatorio=true]
 * @param {boolean} [opciones.permitirIguales=true]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarPeriodo(inicio, fin, opciones = {}) {
  const {
    campoInicio = 'fechaInicio',
    campoFin = 'fechaFin',
    etiquetaInicio = 'fecha de inicio',
    etiquetaFin = 'fecha de finalización',
    obligatorio = true,
    permitirIguales = true,
    mensaje,
  } = opciones;

  const resultadoInicio = validarFecha(inicio, {
    campo: campoInicio,
    etiqueta: etiquetaInicio,
    obligatorio,
  });

  const resultadoFin = validarFecha(fin, {
    campo: campoFin,
    etiqueta: etiquetaFin,
    obligatorio,
  });

  if (!resultadoInicio.valido || !resultadoFin.valido) {
    return combinarResultados([resultadoInicio, resultadoFin], {
      inicio: resultadoInicio.valor,
      fin: resultadoFin.valor,
    });
  }

  const comparacion = compararFechasPorDia(
    resultadoFin.valor,
    resultadoInicio.valor
  );

  if (comparacion < 0) {
    return resultadoInvalido(
      campoFin,
      CODIGOS_ERROR.PERIODO_INVALIDO,
      aTexto(mensaje) ||
        `La ${etiquetaFin} no puede ser anterior a la ${etiquetaInicio}.`,
      {
        inicio: resultadoInicio.valor,
        fin: resultadoFin.valor,
        detalle: `Período: ${formatearFecha(resultadoInicio.valor)} al ${formatearFecha(resultadoFin.valor)}.`,
      }
    );
  }

  if (comparacion === 0 && !permitirIguales) {
    return resultadoInvalido(
      campoFin,
      CODIGOS_ERROR.PERIODO_INVALIDO,
      aTexto(mensaje) ||
        `La ${etiquetaFin} debe ser posterior a la ${etiquetaInicio}.`,
      {
        inicio: resultadoInicio.valor,
        fin: resultadoFin.valor,
      }
    );
  }

  return resultadoValido(
    { inicio: resultadoInicio.valor, fin: resultadoFin.valor },
    {
      inicio: resultadoInicio.valor,
      fin: resultadoFin.valor,
      permitirIguales,
    }
  );
}

/**
 * Valida una fecha efectiva sin confundirla con la fecha de registro.
 *
 * Permite fechas retroactivas de forma predeterminada y NUNCA reemplaza ni
 * desplaza la fecha ingresada. Si el formulario necesita prohibirlas, debe
 * indicar `permitirRetroactiva: false`.
 *
 * @param {*} valor Fecha efectiva del movimiento.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta='fecha efectiva del movimiento']
 * @param {boolean} [opciones.obligatorio=true]
 * @param {boolean} [opciones.permitirRetroactiva=true]
 * @param {boolean} [opciones.permitirFutura=true]
 * @param {*} [opciones.fechaRegistro] Momento real del registro; ahora por defecto.
 * @returns {Object}
 */
export function validarFechaEfectiva(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = true,
    permitirRetroactiva = true,
    permitirFutura = true,
  } = opciones;

  const resultado = validarFecha(valor, {
    campo,
    etiqueta: opciones.etiqueta || 'fecha efectiva del movimiento',
    obligatorio,
    mensaje: opciones.mensaje,
  });

  if (!resultado.valido) return resultado;

  const fechaRegistro = convertirFecha(opciones.fechaRegistro) || new Date();
  const comparacion = compararFechasPorDia(resultado.valor, fechaRegistro);
  const retroactiva = comparacion < 0;
  const esFutura = comparacion > 0;

  if (retroactiva && permitirRetroactiva === false) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FECHA_RETROACTIVA,
      aTexto(opciones.mensajeRetroactiva) ||
        'La fecha efectiva no puede ser anterior a la fecha de registro.',
      {
        etiqueta: resultado.datos.etiqueta,
        fecha: resultado.valor,
        fechaRegistro,
        retroactiva,
      }
    );
  }

  if (esFutura && permitirFutura === false) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FECHA_FUTURA,
      aTexto(opciones.mensajeFutura) ||
        'La fecha efectiva no puede ser posterior a la fecha de registro.',
      {
        etiqueta: resultado.datos.etiqueta,
        fecha: resultado.valor,
        fechaRegistro,
        esFutura,
      }
    );
  }

  return resultadoValido(resultado.valor, {
    ...resultado.datos,
    retroactiva,
    esFutura,
    fechaRegistro,
    aviso: retroactiva
      ? 'La fecha efectiva es anterior a la fecha de registro. El movimiento se guardará con la fecha indicada.'
      : '',
  });
}

/**
 * Crea la marca de tiempo real del registro.
 *
 * Debe enviarse al backend por separado de la fecha efectiva del movimiento.
 * No genera credenciales, tokens ni solicitudes HTTP.
 *
 * @param {Date|number|string} [fecha=new Date()] Momento del registro.
 * @returns {{fechaRegistro: Date, fechaRegistroISO: string, marcaTiempo: number, zonaHoraria: string}|null}
 */
export function crearMarcaTiempoRegistro(fecha = new Date()) {
  const fechaRegistro = fecha instanceof Date ? new Date(fecha.getTime()) : new Date(fecha);

  if (Number.isNaN(fechaRegistro.getTime())) return null;

  let zonaHoraria = '';

  try {
    zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    zonaHoraria = '';
  }

  return {
    fechaRegistro,
    fechaRegistroISO: fechaRegistro.toISOString(),
    marcaTiempo: fechaRegistro.getTime(),
    zonaHoraria,
  };
}

/* ============================================================================
   6. VALIDACIONES DE INVENTARIO: PRODUCTOS, LOTES Y EXISTENCIAS
   ----------------------------------------------------------------------------
   Estas funciones comprueban los datos que ya están disponibles en la pantalla
   (por ejemplo, la existencia que devolvió el backend al cargar el lote).
   No consultan MySQL, no reservan existencias y no sustituyen la verificación
   transaccional del backend.
   ============================================================================ */

const CLAVES_ID_PRODUCTO = [
  'id',
  'productoId',
  'producto_id',
  'idProducto',
  'id_producto',
];

const CLAVES_ID_LOTE = [
  'id',
  'loteId',
  'lote_id',
  'idLote',
  'id_lote',
];

const CLAVES_EXISTENCIA = [
  'existencia',
  'existenciaDisponible',
  'existencia_disponible',
  'stock',
  'cantidadDisponible',
  'cantidad_disponible',
  'disponible',
];

const ESTADOS_INACTIVOS = new Set([
  'inactivo',
  'inactiva',
  'eliminado',
  'eliminada',
  'deshabilitado',
  'deshabilitada',
  'suspendido',
  'suspendida',
  'baja',
]);

/**
 * Extrae el identificador de una entidad (objeto) o devuelve el valor primitivo.
 *
 * @param {*} entidad Objeto con id o valor primitivo.
 * @param {string[]} [claves] Nombres posibles del identificador.
 * @returns {*} Identificador encontrado o null.
 */
export function obtenerIdentificadorEntidad(entidad, claves = CLAVES_ID_PRODUCTO) {
  if (entidad === null || entidad === undefined) return null;

  if (typeof entidad !== 'object' || Array.isArray(entidad)) {
    return entidad;
  }

  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(entidad, clave)) {
      const valor = entidad[clave];
      if (!esVacio(valor)) return valor;
    }
  }

  return null;
}

/**
 * Comprueba si una entidad está marcada como inactiva o eliminada.
 *
 * @param {*} entidad
 * @returns {boolean}
 * @private
 */
function esEntidadInactiva(entidad) {
  if (!entidad || typeof entidad !== 'object') return false;

  if (entidad.activo === false || entidad.habilitado === false) return true;
  if (entidad.eliminado === true || entidad.borrado === true) return true;
  if (entidad.registrado === false) return true;

  const estado = aTexto(entidad.estado || entidad.estatus).toLocaleLowerCase(LOCALE);

  return ESTADOS_INACTIVOS.has(estado);
}

/**
 * Valida un identificador de producto, lote, usuario o entidad interna.
 *
 * Acepta números enteros positivos, cadenas numéricas positivas y UUID. No
 * acepta 0, negativos, decimales, "null", "undefined", "NaN" ni objetos.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @param {string} [opciones.campo]
 * @param {string} [opciones.etiqueta]
 * @param {boolean} [opciones.obligatorio=true]
 * @param {boolean} [opciones.permitirCero=false]
 * @param {RegExp} [opciones.patron] Patrón alternativo para identificadores no
 *   numéricos. Si se indica, sustituye la comprobación de número/UUID.
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarIdentificador(valor, opciones = {}) {
  const {
    campo = null,
    obligatorio = true,
    permitirCero = false,
    patron = null,
    mensaje,
  } = opciones;

  const etiqueta = obtenerEtiqueta(opciones) || 'identificador';

  if (esVacio(valor)) {
    if (!obligatorio) return resultadoValido('', { etiqueta });
    return validarObligatorio(valor, {
      campo,
      etiqueta,
      mensaje: mensaje || `Debe seleccionar ${etiqueta}.`,
    });
  }

  if (typeof valor === 'object') {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(mensaje) || 'El identificador seleccionado no es válido.',
      { etiqueta }
    );
  }

  const texto = String(valor).trim();
  const textoMinusculas = texto.toLocaleLowerCase(LOCALE);
  const invalidos = new Set(['null', 'undefined', 'nan', 'false']);

  if (texto === '0' && !permitirCero) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(mensaje) || 'El identificador seleccionado no es válido.',
      { etiqueta, valor: texto }
    );
  }

  if (invalidos.has(textoMinusculas)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(mensaje) || 'El identificador seleccionado no es válido.',
      { etiqueta, valor: texto }
    );
  }

  const patronUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const patronPositivo = /^[1-9]\d*$/;

  const esUuid = patronUuid.test(texto);
  const esPositivo = patronPositivo.test(texto);

  if (patron instanceof RegExp) patron.lastIndex = 0;
  const cumplePatron = patron instanceof RegExp ? patron.test(texto) : false;
  if (patron instanceof RegExp) patron.lastIndex = 0;

  const formatoBase =
    esUuid || esPositivo || (permitirCero && texto === '0');
  const valido = patron instanceof RegExp ? cumplePatron : formatoBase;

  if (!valido) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(mensaje) || 'El identificador seleccionado no es válido.',
      { etiqueta, valor: texto }
    );
  }

  return resultadoValido(texto, { etiqueta });
}

/**
 * Indica si un identificador es válido.
 *
 * @param {*} valor
 * @param {Object} [opciones]
 * @returns {boolean}
 */
export function esIdentificadorValido(valor, opciones = {}) {
  return validarIdentificador(valor, opciones).valido;
}

/**
 * Valida que se haya seleccionado un producto registrado y activo.
 *
 * @param {*} producto Identificador u objeto del producto.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo='productoId']
 * @param {string} [opciones.etiqueta='un producto registrado']
 * @param {string} [opciones.mensaje]
 * @param {string[]} [opciones.clavesIdentificador]
 * @returns {Object} `valor` contiene el identificador normalizado.
 */
export function validarProductoSeleccionado(producto, opciones = {}) {
  const campo = opciones.campo || 'productoId';
  const etiqueta = opciones.etiqueta || 'un producto registrado';
  const claves = Array.isArray(opciones.clavesIdentificador)
    ? opciones.clavesIdentificador
    : CLAVES_ID_PRODUCTO;

  const identificador = obtenerIdentificadorEntidad(producto, claves);

  if (esVacio(identificador)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.PRODUCTO_REQUERIDO,
      aTexto(opciones.mensaje) || `Debe seleccionar ${etiqueta}.`,
      { etiqueta }
    );
  }

  const resultadoId = validarIdentificador(identificador, {
    campo,
    etiqueta,
    mensaje:
      opciones.mensajeId ||
      'El producto seleccionado no es válido. Vuelva a seleccionarlo.',
  });

  if (!resultadoId.valido) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.PRODUCTO_INVALIDO,
      resultadoId.mensaje,
      { etiqueta, producto }
    );
  }

  if (esEntidadInactiva(producto)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.PRODUCTO_INACTIVO,
      'El producto seleccionado está inactivo o no está disponible. Seleccione otro producto.',
      { etiqueta, producto, productoId: resultadoId.valor }
    );
  }

  return resultadoValido(resultadoId.valor, {
    etiqueta,
    producto,
    productoId: resultadoId.valor,
  });
}

/**
 * Valida que se haya seleccionado un lote válido y activo.
 *
 * No comprueba existencia ni pertenencia; para una salida use
 * `validarLoteParaSalida` o `validarSalidaInventario`.
 *
 * @param {*} lote Identificador u objeto del lote.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo='loteId']
 * @param {string} [opciones.etiqueta='un lote']
 * @param {string} [opciones.mensaje]
 * @param {string[]} [opciones.clavesIdentificador]
 * @returns {Object} `valor` contiene el identificador normalizado.
 */
export function validarLoteSeleccionado(lote, opciones = {}) {
  const campo = opciones.campo || 'loteId';
  const etiqueta = opciones.etiqueta || 'un lote';
  const claves = Array.isArray(opciones.clavesIdentificador)
    ? opciones.clavesIdentificador
    : CLAVES_ID_LOTE;

  const identificador = obtenerIdentificadorEntidad(lote, claves);

  if (esVacio(identificador)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LOTE_REQUERIDO,
      aTexto(opciones.mensaje) || MENSAJES_VALIDACION.LOTE,
      { etiqueta }
    );
  }

  const resultadoId = validarIdentificador(identificador, {
    campo,
    etiqueta,
    mensaje:
      opciones.mensajeId ||
      'El lote seleccionado no es válido. Vuelva a seleccionarlo.',
  });

  if (!resultadoId.valido) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LOTE_INVALIDO,
      resultadoId.mensaje,
      { etiqueta, lote }
    );
  }

  if (esEntidadInactiva(lote)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LOTE_INACTIVO,
      'El lote seleccionado está inactivo o no está disponible. Seleccione otro lote.',
      { etiqueta, lote, loteId: resultadoId.valor }
    );
  }

  return resultadoValido(resultadoId.valor, {
    etiqueta,
    lote,
    loteId: resultadoId.valor,
  });
}

/**
 * Comprueba que el lote pertenezca al producto seleccionado.
 *
 * La comprobación local usa los datos ya cargados en el formulario. La
 * pertenencia real debe verificarse nuevamente en el backend.
 *
 * @param {*} lote Objeto o identificador del lote.
 * @param {*} producto Objeto o identificador del producto.
 * @param {Object} [opciones]
 * @param {string} [opciones.campoLote='loteId']
 * @param {string} [opciones.campoProducto='productoId']
 * @param {string[]} [opciones.clavesProductoEnLote]
 * @param {string} [opciones.mensaje]
 * @returns {Object}
 */
export function validarLoteDeProducto(lote, producto, opciones = {}) {
  const campoLote = opciones.campoLote || 'loteId';
  const campoProducto = opciones.campoProducto || 'productoId';

  const resultadoLote = validarLoteSeleccionado(lote, {
    campo: campoLote,
    etiqueta: opciones.etiquetaLote || 'un lote',
  });

  const resultadoProducto = validarProductoSeleccionado(producto, {
    campo: campoProducto,
    etiqueta: opciones.etiquetaProducto || 'un producto registrado',
  });

  if (!resultadoLote.valido || !resultadoProducto.valido) {
    return combinarResultados([resultadoLote, resultadoProducto], {
      requiereVerificacionBackend: true,
    });
  }

  const clavesRelacion = Array.isArray(opciones.clavesProductoEnLote)
    ? opciones.clavesProductoEnLote
    : ['productoId', 'producto_id', 'idProducto', 'id_producto'];

  let productoDelLote = null;

  if (lote && typeof lote === 'object') {
    productoDelLote = obtenerIdentificadorEntidad(lote, clavesRelacion);

    if (esVacio(productoDelLote) && lote.producto) {
      productoDelLote = obtenerIdentificadorEntidad(
        lote.producto,
        CLAVES_ID_PRODUCTO
      );
    }
  }

  if (esVacio(productoDelLote)) {
    return resultadoInvalido(
      campoLote,
      CODIGOS_ERROR.LOTE_SIN_PRODUCTO,
      aTexto(opciones.mensaje) ||
        'El lote seleccionado no tiene un producto asociado. Vuelva a seleccionarlo.',
      {
        etiquetaLote: resultadoLote.datos.etiqueta,
        loteId: resultadoLote.valor,
        productoId: resultadoProducto.valor,
        requiereVerificacionBackend: true,
      }
    );
  }

  if (String(productoDelLote).trim() !== String(resultadoProducto.valor).trim()) {
    return resultadoInvalido(
      campoLote,
      CODIGOS_ERROR.LOTE_NO_CORRESPONDE,
      aTexto(opciones.mensaje) ||
        'El lote seleccionado no corresponde al producto elegido. Seleccione un lote de ese producto.',
      {
        loteId: resultadoLote.valor,
        productoId: resultadoProducto.valor,
        productoDelLote: String(productoDelLote),
        requiereVerificacionBackend: true,
      }
    );
  }

  return resultadoValido(
    { loteId: resultadoLote.valor, productoId: resultadoProducto.valor },
    {
      loteId: resultadoLote.valor,
      productoId: resultadoProducto.valor,
      productoDelLote: String(productoDelLote),
      requiereVerificacionBackend: true,
    }
  );
}

/**
 * Obtiene la existencia declarada por un lote.
 *
 * @param {*} lote Objeto del lote.
 * @returns {number|null} Existencia no negativa o null si no está disponible.
 */
export function obtenerExistenciaLote(lote) {
  if (!lote || typeof lote !== 'object') return null;

  for (const clave of CLAVES_EXISTENCIA) {
    if (!Object.prototype.hasOwnProperty.call(lote, clave)) continue;

    const numero = convertirNumero(lote[clave]);
    if (numero === null || numero < 0) return null;

    return numero;
  }

  return null;
}

/**
 * Valida que un lote tenga existencia disponible para una salida.
 *
 * @param {*} lote Objeto del lote con su existencia.
 * @param {Object} [opciones]
 * @param {string} [opciones.campo='loteId']
 * @param {string} [opciones.campoCantidad='cantidad']
 * @param {*} [opciones.cantidad] Cantidad solicitada; si se indica, se compara.
 * @param {string} [opciones.mensaje]
 * @returns {Object} `valor` contiene la existencia disponible.
 */
export function validarExistenciaLote(lote, opciones = {}) {
  const campo = opciones.campo || 'loteId';
  const existencia = obtenerExistenciaLote(lote);

  if (existencia === null) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.EXISTENCIA_NO_DISPONIBLE,
      aTexto(opciones.mensaje) ||
        'No se pudo comprobar la existencia del lote. Vuelva a seleccionarlo.',
      { lote }
    );
  }

  if (existencia <= 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LOTE_SIN_EXISTENCIA,
      aTexto(opciones.mensaje) ||
        'El lote seleccionado no tiene existencia disponible.',
      { lote, existencia }
    );
  }

  if (!esVacio(opciones.cantidad)) {
    const resultadoCantidad = validarCantidadContraExistencia(
      opciones.cantidad,
      existencia,
      {
        campo: opciones.campoCantidad || 'cantidad',
        etiqueta: opciones.etiquetaCantidad || '',
        mensaje: opciones.mensajeCantidad,
      }
    );

    if (!resultadoCantidad.valido) return resultadoCantidad;

    return resultadoValido(existencia, {
      lote,
      existencia,
      solicitado: resultadoCantidad.valor,
      disponible: existencia - resultadoCantidad.valor,
    });
  }

  return resultadoValido(existencia, { lote, existencia });
}

/**
 * Compara la cantidad solicitada con la existencia disponible.
 *
 * @param {*} cantidad
 * @param {*} disponible
 * @param {Object} [opciones]
 * @param {string} [opciones.campo='cantidad']
 * @param {string} [opciones.etiqueta='solicitada']
 * @param {string} [opciones.mensaje]
 * @returns {Object} `valor` contiene la cantidad validada.
 */
export function validarCantidadContraExistencia(
  cantidad,
  disponible,
  opciones = {}
) {
  const campo = opciones.campo || 'cantidad';

  const resultadoCantidad = validarCantidad(cantidad, {
    campo,
    etiqueta: opciones.etiqueta || '',
    decimales: opciones.decimales,
    entero: opciones.entero,
    permitirCero: opciones.permitirCero,
    minimo: opciones.minimo,
    mensaje: opciones.mensajeCantidad,
  });

  if (!resultadoCantidad.valido) return resultadoCantidad;

  const existencia = convertirNumero(disponible);

  if (existencia === null || existencia < 0) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.EXISTENCIA_NO_DISPONIBLE,
      aTexto(opciones.mensajeExistencia) ||
        'No se pudo comprobar la existencia disponible. Vuelva a seleccionar el lote.',
      { disponible: null }
    );
  }

  if (resultadoCantidad.valor > existencia) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.EXISTENCIA_INSUFICIENTE,
      aTexto(opciones.mensaje) || MENSAJES_VALIDACION.EXISTENCIA,
      {
        disponible: existencia,
        solicitado: resultadoCantidad.valor,
        detalle: `Existencia disponible: ${existencia}. Cantidad solicitada: ${resultadoCantidad.valor}.`,
      }
    );
  }

  return resultadoValido(resultadoCantidad.valor, {
    disponible: existencia,
    solicitado: resultadoCantidad.valor,
    restante: existencia - resultadoCantidad.valor,
  });
}

/**
 * Valida todo lo necesario para usar un lote en una salida:
 * selección, pertenencia al producto (si se indica), existencia y cantidad.
 *
 * @param {*} lote Objeto del lote con su existencia y producto.
 * @param {Object} [opciones]
 * @param {*} [opciones.producto] Producto seleccionado.
 * @param {*} [opciones.cantidad] Cantidad solicitada.
 * @param {*} [opciones.existencia] Existencia disponible si el lote se recibe
 *   sólo como identificador.
 * @param {string} [opciones.campoLote='loteId']
 * @param {string} [opciones.campoProducto='productoId']
 * @param {string} [opciones.campoCantidad='cantidad']
 * @returns {Object}
 */
export function validarLoteParaSalida(lote, opciones = {}) {
  const campoLote = opciones.campoLote || 'loteId';
  const campoProducto = opciones.campoProducto || 'productoId';
  const campoCantidad = opciones.campoCantidad || 'cantidad';

  const resultados = [];
  const resultadoLote = validarLoteSeleccionado(lote, {
    campo: campoLote,
    etiqueta: opciones.etiquetaLote || 'un lote',
  });
  resultados.push(resultadoLote);

  if (!resultadoLote.valido) {
    return combinarResultados(resultados, {
      requiereVerificacionBackend: true,
    });
  }

  if (!esVacio(opciones.producto)) {
    resultados.push(
      validarLoteDeProducto(lote, opciones.producto, {
        campoLote,
        campoProducto,
      })
    );
  }

  if (lote && typeof lote === 'object') {
    resultados.push(
      validarExistenciaLote(lote, {
        campo: campoLote,
        cantidad: opciones.cantidad,
        campoCantidad,
        etiquetaCantidad: opciones.etiquetaCantidad,
      })
    );
  } else if (!esVacio(opciones.existencia)) {
    const existencia = convertirNumero(opciones.existencia);

    if (existencia === null || existencia <= 0) {
      resultados.push(
        resultadoInvalido(
          campoLote,
          existencia === null
            ? CODIGOS_ERROR.EXISTENCIA_NO_DISPONIBLE
            : CODIGOS_ERROR.LOTE_SIN_EXISTENCIA,
          existencia === null
            ? 'No se pudo comprobar la existencia del lote. Vuelva a seleccionarlo.'
            : 'El lote seleccionado no tiene existencia disponible.',
          { lote, existencia }
        )
      );
    } else if (!esVacio(opciones.cantidad)) {
      resultados.push(
        validarCantidadContraExistencia(
          opciones.cantidad,
          existencia,
          {
            campo: campoCantidad,
            etiqueta: opciones.etiquetaCantidad,
          }
        )
      );
    } else {
      resultados.push(
        resultadoValido(existencia, { lote, existencia })
      );
    }
  } else {
    resultados.push(
      resultadoInvalido(
        campoLote,
        CODIGOS_ERROR.EXISTENCIA_NO_DISPONIBLE,
        'No se pudo comprobar la existencia del lote. Vuelva a seleccionarlo.',
        { lote }
      )
    );
  }

  const combinado = combinarResultados(resultados, {
    ...resultadoLote.datos,
    requiereVerificacionBackend: true,
  });

  if (!combinado.valido) return combinado;

  const existenciaFinal =
    obtenerExistenciaLote(lote) ?? convertirNumero(opciones.existencia);

  return {
    ...combinado,
    valido: true,
    valor: {
      loteId: resultadoLote.valor,
      cantidad: !esVacio(opciones.cantidad)
        ? convertirNumero(opciones.cantidad)
        : null,
      existencia: existenciaFinal,
    },
    campo: null,
    codigo: null,
    mensaje: '',
    detalle: null,
    datos: {
      ...combinado.datos,
      loteId: resultadoLote.valor,
      existencia: existenciaFinal,
      requiereVerificacionBackend: true,
    },
  };
}

/**
 * Valida los datos mínimos de una salida de inventario.
 *
 * Comprueba producto, lote, pertenencia, cantidad y existencia local. No
 * descuenta existencias ni crea movimientos: eso corresponde al backend.
 *
 * @param {Object} datos
 * @param {*} datos.producto Producto u objeto con id.
 * @param {*} datos.lote Lote u objeto con id y existencia.
 * @param {*} datos.cantidad Cantidad solicitada.
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarSalidaInventario(datos = {}, opciones = {}) {
  const campoProducto = opciones.campoProducto || 'productoId';
  const campoLote = opciones.campoLote || 'loteId';
  const campoCantidad = opciones.campoCantidad || 'cantidad';

  const productoRecibido = primerValorDisponible(
    datos.producto,
    datos.productoId,
    datos.idProducto
  );
  const loteRecibido = primerValorDisponible(
    datos.lote,
    datos.loteId,
    datos.idLote
  );
  const cantidadRecibida = primerValorDisponible(
    datos.cantidad,
    datos.cantidadSolicitada
  );

  const resultados = [];

  const resultadoProducto = validarProductoSeleccionado(productoRecibido, {
    campo: campoProducto,
    etiqueta: opciones.etiquetaProducto || 'un producto registrado',
  });
  resultados.push(resultadoProducto);

  const resultadoLote = validarLoteSeleccionado(loteRecibido, {
    campo: campoLote,
    etiqueta: opciones.etiquetaLote || 'un lote',
  });
  resultados.push(resultadoLote);

  const resultadoCantidad = validarCantidad(cantidadRecibida, {
    campo: campoCantidad,
    etiqueta: opciones.etiquetaCantidad || '',
    decimales: opciones.decimales,
    entero: opciones.entero,
    maximo: opciones.maximo,
  });
  resultados.push(resultadoCantidad);

  const loteEsObjeto = loteRecibido && typeof loteRecibido === 'object';

  if (resultadoProducto.valido && resultadoLote.valido && loteEsObjeto) {
    resultados.push(
      validarLoteDeProducto(loteRecibido, productoRecibido, {
        campoLote,
        campoProducto,
      })
    );
  }

  const existencia = obtenerExistenciaLote(loteRecibido);
  const existenciaInformada = !esVacio(opciones.existenciaDisponible)
    ? convertirNumero(opciones.existenciaDisponible)
    : existencia;

  if (resultadoCantidad.valido && resultadoLote.valido) {
    if (existenciaInformada === null) {
      resultados.push(
        resultadoInvalido(
          campoLote,
          CODIGOS_ERROR.EXISTENCIA_NO_DISPONIBLE,
          'No se pudo comprobar la existencia del lote. Vuelva a seleccionarlo.',
          { lote: loteRecibido }
        )
      );
    } else {
      resultados.push(
        validarCantidadContraExistencia(
          resultadoCantidad.valor,
          existenciaInformada,
          { campo: campoCantidad }
        )
      );
    }
  }

  const combinado = combinarResultados(resultados, {
    productoId: resultadoProducto.valor,
    loteId: resultadoLote.valor,
    cantidad: resultadoCantidad.valor,
    existenciaDisponible: existenciaInformada,
    requiereVerificacionBackend: true,
  });

  if (!combinado.valido) return combinado;

  return {
    ...combinado,
    valido: true,
    valor: {
      productoId: resultadoProducto.valor,
      loteId: resultadoLote.valor,
      cantidad: resultadoCantidad.valor,
    },
    campo: null,
    codigo: null,
    mensaje: '',
    detalle: null,
  };
}

/**
 * Valida los datos mínimos de una entrada de inventario.
 *
 * No suma existencias ni registra el movimiento. Por defecto exige lote; puede
 * desactivarse con `exigirLote: false` cuando el formulario lo permita.
 *
 * @param {Object} datos
 * @param {*} datos.producto
 * @param {*} datos.lote
 * @param {*} datos.cantidad
 * @param {Object} [opciones]
 * @param {boolean} [opciones.exigirLote=true]
 * @returns {Object}
 */
export function validarEntradaInventario(datos = {}, opciones = {}) {
  const campoProducto = opciones.campoProducto || 'productoId';
  const campoLote = opciones.campoLote || 'loteId';
  const campoCantidad = opciones.campoCantidad || 'cantidad';
  const exigirLote = opciones.exigirLote !== false;

  const productoRecibido = primerValorDisponible(
    datos.producto,
    datos.productoId,
    datos.idProducto
  );
  const loteRecibido = primerValorDisponible(
    datos.lote,
    datos.loteId,
    datos.idLote
  );
  const cantidadRecibida = primerValorDisponible(
    datos.cantidad,
    datos.cantidadSolicitada
  );

  const resultados = [
    validarProductoSeleccionado(productoRecibido, {
      campo: campoProducto,
      etiqueta: opciones.etiquetaProducto || 'un producto registrado',
    }),
    validarCantidad(cantidadRecibida, {
      campo: campoCantidad,
      etiqueta: opciones.etiquetaCantidad || '',
      maximo: opciones.maximo,
      decimales: opciones.decimales,
      entero: opciones.entero,
    }),
  ];

  if (exigirLote) {
    resultados.push(
      validarLoteSeleccionado(loteRecibido, {
        campo: campoLote,
        etiqueta: opciones.etiquetaLote || 'un lote',
      })
    );
  }

  const combinado = combinarResultados(resultados, {
    productoId: resultados[0]?.valor ?? null,
    loteId: exigirLote ? resultados[2]?.valor ?? null : null,
    cantidad: resultados[1]?.valor ?? null,
    requiereVerificacionBackend: true,
  });

  if (!combinado.valido) return combinado;

  return {
    ...combinado,
    valido: true,
    valor: {
      productoId: resultados[0].valor,
      loteId: exigirLote ? resultados[2].valor : null,
      cantidad: resultados[1].valor,
    },
    campo: null,
    codigo: null,
    mensaje: '',
    detalle: null,
  };
}

/**
 * Comprueba que el lote de origen y el de destino sean distintos.
 *
 * @param {*} loteOrigen
 * @param {*} loteDestino
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarLotesDistintos(loteOrigen, loteDestino, opciones = {}) {
  const campo = opciones.campo || 'loteDestinoId';
  const origen = obtenerIdentificadorEntidad(loteOrigen, CLAVES_ID_LOTE);
  const destino = obtenerIdentificadorEntidad(loteDestino, CLAVES_ID_LOTE);

  if (esVacio(origen) || esVacio(destino)) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.LOTE_REQUERIDO,
      'Debe seleccionar el lote de origen y el lote de destino.',
      { loteOrigen: origen, loteDestino: destino }
    );
  }

  if (String(origen).trim() === String(destino).trim()) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.SELECCION_INVALIDA,
      aTexto(opciones.mensaje) ||
        'El lote de destino debe ser diferente al lote de origen.',
      { loteOrigen: origen, loteDestino: destino }
    );
  }

  return resultadoValido(
    { loteOrigen: String(origen), loteDestino: String(destino) },
    { loteOrigen: String(origen), loteDestino: String(destino) }
  );
}

/* ============================================================================
   7. VALIDACIÓN DE FORMULARIOS COMPLETOS
   ============================================================================ */

/**
 * Obtiene el valor actual de un control.
 *
 * @param {Element|string} campo Elemento o selector.
 * @returns {*} Texto, arreglo de valores, archivo(s) o null.
 */
export function obtenerValorCampo(campo) {
  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  if (elemento.tagName === 'SELECT' && elemento.multiple) {
    return Array.from(elemento.selectedOptions).map((opcion) => opcion.value);
  }

  if (elemento.type === 'checkbox') {
    return elemento.checked ? elemento.value : '';
  }

  if (elemento.type === 'file') {
    return elemento.files && elemento.files.length > 0
      ? Array.from(elemento.files)
      : [];
  }

  return elemento.value ?? '';
}

/**
 * Busca un control por su atributo name dentro de un formulario.
 *
 * @param {HTMLFormElement|Element} formulario
 * @param {string} nombre
 * @returns {Element|null}
 */
export function buscarCampoEnFormulario(formulario, nombre) {
  if (!formulario || !nombre) return null;

  const elementos = formulario.elements;

  if (elementos && typeof elementos.namedItem === 'function') {
    const encontrado = elementos.namedItem(nombre);

    if (encontrado) {
      if (
        typeof RadioNodeList !== 'undefined' &&
        encontrado instanceof RadioNodeList
      ) {
        const marcado = Array.from(encontrado).find((item) => item.checked);
        return marcado || encontrado[0] || null;
      }

      return encontrado;
    }
  }

  if (typeof formulario.querySelectorAll === 'function') {
    const controles = Array.from(
      formulario.querySelectorAll('[name]')
    ).filter((elemento) => elemento.name === nombre);

    if (controles.length === 0) return null;

    return controles.find((elemento) => elemento.checked) || controles[0];
  }

  return null;
}

/**
 * Normaliza el resultado devuelto por una regla de formulario.
 *
 * @param {Object|boolean|null} resultado
 * @param {string} campo
 * @param {string} [mensajeDefecto]
 * @returns {Object}
 * @private
 */
function normalizarResultadoRegla(resultado, campo, mensajeDefecto) {
  if (resultado && typeof resultado === 'object' && 'valido' in resultado) {
    if (resultado.valido) {
      return resultado.errores
        ? resultado
        : { ...resultado, errores: [] };
    }

    const mensaje =
      aTexto(resultado.mensaje) ||
      aTexto(mensajeDefecto) ||
      'El valor ingresado no es válido.';

    if (Array.isArray(resultado.errores) && resultado.errores.length > 0) {
      const errores = resultado.errores.map((error) => ({
        ...error,
        campo: error.campo || campo,
        codigo: error.codigo || CODIGOS_ERROR.FORMATO_INVALIDO,
        mensaje: error.mensaje || mensaje,
      }));

      return {
        ...resultado,
        valido: false,
        campo: errores[0].campo,
        codigo: errores[0].codigo,
        mensaje: errores[0].mensaje,
        errores,
      };
    }

    return resultadoInvalido(
      resultado.campo || campo,
      resultado.codigo || CODIGOS_ERROR.FORMATO_INVALIDO,
      mensaje,
      { detalle: resultado.detalle, ...resultado.datos }
    );
  }

  if (resultado === true) {
    return resultadoValido(null, { campo });
  }

  if (resultado === false) {
    return resultadoInvalido(
      campo,
      CODIGOS_ERROR.FORMATO_INVALIDO,
      aTexto(mensajeDefecto) || 'El valor ingresado no es válido.',
      { campo }
    );
  }

  return resultadoInvalido(
    campo,
    CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
    'No se pudo validar este campo. Intente nuevamente.',
    { campo }
  );
}

/**
 * Extrae las reglas de validación en una lista uniforme.
 *
 * Formatos admitidos:
 *   [ { campo: 'correo', validador: (valor) => validarCorreo(valor) } ]
 *   { correo: (valor) => validarCorreo(valor) }
 *
 * @param {Array|Object} reglas
 * @returns {Array<{campo: string, validador: Function}>}
 * @private
 */
function normalizarReglas(reglas) {
  const lista = [];

  if (Array.isArray(reglas)) {
    for (const regla of reglas) {
      if (!regla || typeof regla !== 'object') {
        throw new TypeError(
          'Cada regla de validación debe ser un objeto con campo y validador.'
        );
      }

      const validador = regla.validador || regla.validar || regla.funcion;

      if (typeof validador !== 'function') {
        throw new TypeError(
          `La regla del campo "${regla.campo || ''}" no tiene una función validadora.`
        );
      }

      if (!regla.campo) {
        throw new TypeError('Toda regla de validación debe indicar un campo.');
      }

      lista.push({
        campo: String(regla.campo),
        validador,
        etiqueta: regla.etiqueta,
        mensaje: regla.mensaje,
      });
    }

    return lista;
  }

  if (reglas && typeof reglas === 'object') {
    for (const [campo, valor] of Object.entries(reglas)) {
      if (typeof valor === 'function') {
        lista.push({ campo, validador: valor });
        continue;
      }

      if (valor && typeof valor === 'object') {
        const validador = valor.validador || valor.validar || valor.funcion;

        if (typeof validador === 'function') {
          lista.push({
            campo,
            validador,
            etiqueta: valor.etiqueta,
            mensaje: valor.mensaje,
          });
          continue;
        }
      }

      throw new TypeError(
        `La regla del campo "${campo}" no tiene una función validadora.`
      );
    }
  }

  return lista;
}

/**
 * Valida un formulario completo a partir de una lista de reglas.
 *
 * No envía datos ni realiza solicitudes HTTP. Sólo recorre los campos,
 * ejecuta las funciones validadoras y devuelve todos los errores. Los
 * validadores reciben (valor, formulario, regla) y deben devolver un resultado
 * estructurado; también se acepta true/false por comodidad.
 *
 * @param {HTMLFormElement|Element|string} formulario Formulario o selector.
 * @param {Array|Object} reglas Reglas de validación.
 * @param {Object} [opciones]
 * @returns {Object}
 */
export function validarFormulario(formulario, reglas, opciones = {}) {
  const elementoFormulario = resolverCampo(formulario);

  if (
    !elementoFormulario ||
    !elementoFormulario.elements ||
    typeof elementoFormulario.elements.namedItem !== 'function'
  ) {
    return resultadoInvalido(
      null,
      CODIGOS_ERROR.FORMULARIO_INVALIDO,
      'No se encontró el formulario para validar.',
      { formulario }
    );
  }

  let listaReglas;

  try {
    listaReglas = normalizarReglas(reglas);
  } catch (error) {
    return resultadoInvalido(
      null,
      CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
      'No se pudieron preparar las reglas de validación del formulario.',
      {
        causa: error instanceof Error ? error.message : String(error),
        formulario,
      }
    );
  }

  const resultados = [];
  const valores = {};
  const elementos = {};

  for (const regla of listaReglas) {
    const elemento = buscarCampoEnFormulario(
      elementoFormulario,
      regla.campo
    );
    const valor = elemento ? obtenerValorCampo(elemento) : undefined;

    valores[regla.campo] = valor;
    elementos[regla.campo] = elemento;

    let resultado;

    try {
      resultado = regla.validador(valor, elementoFormulario, regla);
    } catch (error) {
      resultado = resultadoInvalido(
        regla.campo,
        CODIGOS_ERROR.VALIDACION_NO_DISPONIBLE,
        regla.mensaje ||
          'No se pudo validar este campo. Intente nuevamente.',
        { causa: error instanceof Error ? error.message : String(error) }
      );
    }

    const normalizado = normalizarResultadoRegla(
      resultado,
      regla.campo,
      regla.mensaje
    );

    resultados.push(normalizado);
  }

  const combinado = combinarResultados(resultados, {
    valores,
    elementos,
    cantidadReglas: listaReglas.length,
  });

  if (!combinado.valido) {
    return {
      ...combinado,
      datos: {
        ...combinado.datos,
        valores,
        elementos,
        cantidadErrores: combinado.errores.length,
      },
    };
  }

  return {
    ...combinado,
    valido: true,
    valor: valores,
    campo: null,
    codigo: null,
    mensaje: '',
    detalle: null,
    datos: {
      ...combinado.datos,
      valores,
      elementos,
      cantidadErrores: 0,
      ...opciones.datos,
    },
  };
}

/* ============================================================================
   8. MENSAJES VISUALES JUNTO A LOS CAMPOS
   ----------------------------------------------------------------------------
   Reutiliza las clases de formularios.css:
     .app-campo--error, .app-campo--exito, .app-campo__mensaje,
     .app-campo__mensaje--error/exito/advertencia/info y aria-invalid.
   Los mensajes se insertan con createElement/textContent, nunca con innerHTML.
   ============================================================================ */

const TIPOS_MENSAJE_CAMPO = new Set([
  'error',
  'exito',
  'advertencia',
  'info',
]);

const idsMensajeCampo = new WeakMap();
let contadorMensajeCampo = 0;

/**
 * Resuelve un elemento o selector de campo.
 *
 * @param {Element|string|null} campo
 * @returns {Element|null}
 * @private
 */
function resolverCampo(campo) {
  if (!campo) return null;

  if (typeof campo === 'string') {
    const porSelector = obtenerElemento(campo);
    if (porSelector) return porSelector;

    const porId = document.getElementById(campo);
    if (porId) return porId;

    const porNombre = document.getElementsByName(campo);
    return porNombre.length > 0 ? porNombre[0] : null;
  }

  return campo &&
    (campo.nodeType === 1 ||
      (campo.elements && typeof campo.elements === 'object'))
    ? campo
    : null;
}

/**
 * Devuelve el contenedor visual .app-campo del control.
 *
 * @param {Element} elemento
 * @returns {Element}
 * @private
 */
function obtenerContenedorCampo(elemento) {
  const contenedor =
    typeof elemento.closest === 'function'
      ? elemento.closest('.app-campo')
      : null;

  return contenedor || elemento.parentElement || elemento;
}

/**
 * Obtiene todos los controles que comparten un mensaje (grupo de radios).
 *
 * @param {Element} elemento
 * @returns {Element[]}
 * @private
 */
function obtenerControlesAsociados(elemento) {
  if (
    elemento.type === 'radio' &&
    elemento.name &&
    elemento.form &&
    elemento.form.elements
  ) {
    const grupo = elemento.form.elements.namedItem(elemento.name);

    if (grupo && typeof grupo.length === 'number') {
      return Array.from(grupo).filter((item) => item.type === 'radio');
    }
  }

  return [elemento];
}

/**
 * Genera un identificador estable para el mensaje de un campo.
 *
 * @param {Element} elemento
 * @param {string} tipo
 * @returns {string}
 * @private
 */
function obtenerIdMensajeCampo(elemento, tipo) {
  const clave = `${tipo}`;
  const mapa = idsMensajeCampo.get(elemento);

  if (mapa && mapa[clave]) return mapa[clave];

  const base =
    elemento.type === 'radio' && elemento.name
      ? `${elemento.form?.id || 'formulario'}-${elemento.name}`
      : elemento.id || `app-campo-${++contadorMensajeCampo}`;
  const id = `${String(base).replace(/\s+/g, '-')}-${tipo}`;

  if (mapa) {
    mapa[clave] = id;
  } else {
    idsMensajeCampo.set(elemento, { [clave]: id });
  }

  return id;
}

/**
 * Agrega o quita un identificador de aria-describedby sin perder otros.
 *
 * @param {Element} elemento
 * @param {string} id
 * @param {boolean} agregar
 * @private
 */
function actualizarDescripcion(elemento, id, agregar) {
  const actuales = String(elemento.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((item) => item !== id);

  if (agregar) actuales.push(id);

  if (actuales.length > 0) {
    elemento.setAttribute('aria-describedby', [...new Set(actuales)].join(' '));
  } else {
    elemento.removeAttribute('aria-describedby');
  }
}

/**
 * Quita las referencias de error de un control.
 *
 * @param {Element} elemento
 * @param {string} id
 * @private
 */
function quitarReferenciaError(elemento, id) {
  actualizarDescripcion(elemento, id, false);

  if (elemento.getAttribute('aria-errormessage') === id) {
    elemento.removeAttribute('aria-errormessage');
  }
}

/**
 * Crea el nodo de mensaje de un campo.
 *
 * @param {string} tipo
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement}
 * @private
 */
function crearMensajeCampo(tipo, mensaje, opciones = {}) {
  const id = opciones.id;
  const clases = [
    'app-campo__mensaje',
    `app-campo__mensaje--${tipo}`,
  ];

  if (opciones.destacado) clases.push('app-campo__mensaje--destacado');

  const hijos = [
    crearElemento('span', {
      clases: 'app-campo__mensaje-texto',
      texto: mensaje,
    }),
  ];

  if (opciones.detalle) {
    hijos.push(
      crearElemento('span', {
        clases: 'app-campo__mensaje-detalle',
        texto: opciones.detalle,
      })
    );
  }

  return crearElemento('p', {
    clases,
    atributos: {
      id,
      role: tipo === 'error' ? 'alert' : 'status',
    },
    datos: { appMensajeCampo: tipo },
    hijos,
  });
}

/**
 * Limpia los mensajes de un tipo y sus referencias accesibles.
 *
 * @param {Element} elemento
 * @param {string} tipo
 * @private
 */
function limpiarMensajeCampo(elemento, tipo) {
  const contenedor = obtenerContenedorCampo(elemento);
  const id = obtenerIdMensajeCampo(elemento, tipo);
  let mensaje = null;

  if (contenedor === elemento) {
    let siguiente = elemento.nextElementSibling;

    while (siguiente) {
      if (siguiente.dataset?.appMensajeCampo === tipo) {
        mensaje = siguiente;
        break;
      }

      if (
        siguiente.matches?.('.app-campo, .app-formulario__grupo, .app-formulario__fila')
      ) {
        break;
      }

      siguiente = siguiente.nextElementSibling;
    }
  } else {
    mensaje = contenedor.querySelector(
      `[data-app-mensaje-campo="${tipo}"]`
    );
  }

  if (mensaje) mensaje.remove();

  for (const control of obtenerControlesAsociados(elemento)) {
    quitarReferenciaError(control, id);
  }
}

/**
 * Limpia todos los mensajes y estados visuales de un campo.
 *
 * @param {Element|string} campo Elemento o selector.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.exito=true] Quita también el estado de éxito.
 * @param {boolean} [opciones.info=true] Quita mensajes informativos.
 * @param {boolean} [opciones.advertencia=true] Quita advertencias.
 * @returns {Element|null}
 */
export function limpiarValidacionCampo(campo, opciones = {}) {
  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  const {
    exito = true,
    info = true,
    advertencia = true,
  } = opciones;

  limpiarMensajeCampo(elemento, 'error');
  if (exito) limpiarMensajeCampo(elemento, 'exito');
  if (info) limpiarMensajeCampo(elemento, 'info');
  if (advertencia) limpiarMensajeCampo(elemento, 'advertencia');

  const contenedor = obtenerContenedorCampo(elemento);
  quitarClases(contenedor, 'app-campo--error');

  if (exito) quitarClases(contenedor, 'app-campo--exito');

  for (const control of obtenerControlesAsociados(elemento)) {
    control.removeAttribute('aria-invalid');
  }

  return elemento;
}

/**
 * Limpia el error de un campo y conserva otros mensajes.
 *
 * @param {Element|string} campo
 * @param {Object} [opciones]
 * @param {boolean} [opciones.limpiarExito=true] Quita también el estado de éxito.
 * @returns {Element|null}
 */
export function limpiarErrorCampo(campo, opciones = {}) {
  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  limpiarMensajeCampo(elemento, 'error');

  const contenedor = obtenerContenedorCampo(elemento);
  quitarClases(contenedor, 'app-campo--error');

  for (const control of obtenerControlesAsociados(elemento)) {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-errormessage');
  }

  if (opciones.limpiarExito !== false) {
    limpiarMensajeCampo(elemento, 'exito');
    quitarClases(contenedor, 'app-campo--exito');
  }

  return elemento;
}

/**
 * Marca un campo con error, inserta el mensaje junto al control y actualiza
 * los atributos de accesibilidad.
 *
 * @param {Element|string} campo
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @param {string} [opciones.detalle] Información adicional bajo el mensaje.
 * @param {boolean} [opciones.destacado=false] Usa el estilo destacado.
 * @returns {HTMLElement|null} Nodo del mensaje.
 */
export function marcarErrorCampo(campo, mensaje, opciones = {}) {
  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  const texto =
    aTexto(mensaje) || 'El valor ingresado no es válido.';

  limpiarMensajeCampo(elemento, 'error');
  limpiarMensajeCampo(elemento, 'exito');

  const contenedor = obtenerContenedorCampo(elemento);
  agregarClases(contenedor, 'app-campo--error');
  quitarClases(contenedor, 'app-campo--exito');

  const id = obtenerIdMensajeCampo(elemento, 'error');
  const nodo = crearMensajeCampo('error', texto, {
    id,
    detalle: opciones.detalle,
    destacado: opciones.destacado === true,
  });

  const ancla =
    contenedor.querySelector('.app-campo__ayuda') || null;

  if (contenedor === elemento) {
    elemento.insertAdjacentElement('afterend', nodo);
  } else if (ancla && ancla.parentElement === contenedor) {
    ancla.insertAdjacentElement('afterend', nodo);
  } else {
    contenedor.append(nodo);
  }

  for (const control of obtenerControlesAsociados(elemento)) {
    establecerAtributos(control, {
      'aria-invalid': 'true',
      'aria-errormessage': id,
    });
    actualizarDescripcion(control, id, true);
  }

  return nodo;
}

/**
 * Muestra un mensaje de cualquier tipo junto a un campo.
 *
 * @param {Element|string} campo
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @param {string} [opciones.tipo='info'] error, exito, advertencia o info.
 * @param {string} [opciones.detalle]
 * @param {boolean} [opciones.destacado]
 * @returns {HTMLElement|null}
 */
export function mostrarMensajeCampo(campo, mensaje, opciones = {}) {
  const tipo = TIPOS_MENSAJE_CAMPO.has(opciones.tipo)
    ? opciones.tipo
    : 'info';

  if (tipo === 'error') {
    return marcarErrorCampo(campo, mensaje, opciones);
  }

  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  const texto = aTexto(mensaje);
  if (!texto) return null;

  if (tipo === 'exito') limpiarErrorCampo(elemento);

  limpiarMensajeCampo(elemento, tipo);

  const id = obtenerIdMensajeCampo(elemento, tipo);
  const nodo = crearMensajeCampo(tipo, texto, {
    id,
    detalle: opciones.detalle,
    destacado: opciones.destacado === true,
  });

  const contenedor = obtenerContenedorCampo(elemento);

  if (contenedor === elemento) {
    elemento.insertAdjacentElement('afterend', nodo);
  } else {
    contenedor.append(nodo);
  }

  for (const control of obtenerControlesAsociados(elemento)) {
    actualizarDescripcion(control, id, true);
  }

  if (tipo === 'exito') agregarClases(contenedor, 'app-campo--exito');

  return nodo;
}

/**
 * Alias de mostrarMensajeCampo para errores.
 *
 * @param {Element|string} campo
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarErrorCampo(campo, mensaje, opciones = {}) {
  return mostrarMensajeCampo(campo, mensaje, { ...opciones, tipo: 'error' });
}

/**
 * Alias de mostrarMensajeCampo para información.
 *
 * @param {Element|string} campo
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarInfoCampo(campo, mensaje, opciones = {}) {
  return mostrarMensajeCampo(campo, mensaje, { ...opciones, tipo: 'info' });
}

/**
 * Marca visualmente un campo como válido.
 *
 * @param {Element|string} campo
 * @param {Object} [opciones]
 * @param {string} [opciones.mensaje] Si se indica, muestra el mensaje de éxito.
 * @param {string} [opciones.detalle]
 * @returns {Element|null}
 */
export function marcarCampoValido(campo, opciones = {}) {
  const elemento = resolverCampo(campo);
  if (!elemento) return null;

  limpiarErrorCampo(elemento);

  const contenedor = obtenerContenedorCampo(elemento);
  agregarClases(contenedor, 'app-campo--exito');

  if (opciones.mensaje) {
    mostrarMensajeCampo(elemento, opciones.mensaje, {
      tipo: 'exito',
      detalle: opciones.detalle,
      destacado: opciones.destacado,
    });
  }

  return elemento;
}

/**
 * Aplica el resultado de una validación a un campo concreto.
 *
 * @param {Element|string} campo
 * @param {Object} resultado Resultado estructurado.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.marcarValidos=false]
 * @returns {Object|null} El mismo resultado recibido.
 */
export function aplicarResultadoCampo(campo, resultado, opciones = {}) {
  const elemento = resolverCampo(campo);
  if (!elemento || !resultado) return resultado;

  if (resultado.valido) {
    if (opciones.marcarValidos) {
      marcarCampoValido(elemento, {
        mensaje: opciones.mensajeExito,
      });
    } else {
      limpiarErrorCampo(elemento);
    }

    return resultado;
  }

  marcarErrorCampo(elemento, resultado.mensaje, {
    detalle: resultado.detalle,
    destacado: opciones.destacarErrores,
  });

  return resultado;
}

/**
 * Limpia los errores y mensajes de todos los campos de un formulario.
 *
 * @param {HTMLFormElement|Element|string} formulario
 * @returns {Element|null}
 */
export function limpiarErroresFormulario(formulario) {
  const elemento = resolverCampo(formulario);

  if (!elemento || typeof elemento.querySelectorAll !== 'function') {
    return null;
  }

  const controles = elemento.querySelectorAll('[aria-invalid="true"]');
  for (const control of controles) {
    limpiarErrorCampo(control);
  }

  const mensajes = elemento.querySelectorAll(
    '[data-app-mensaje-campo="error"]'
  );
  for (const mensaje of mensajes) {
    mensaje.remove();
  }

  const contenedores = elemento.querySelectorAll('.app-campo--error');
  for (const contenedor of contenedores) {
    quitarClases(contenedor, 'app-campo--error');
  }

  return elemento;
}

/**
 * Lleva el foco al primer campo marcado con error.
 *
 * @param {HTMLFormElement|Element|string} formulario
 * @param {Object} [opciones]
 * @param {boolean} [opciones.desplazar=true] Desplaza la vista al campo.
 * @returns {Element|null} Control enfocado.
 */
export function enfocarPrimerError(formulario, opciones = {}) {
  const elemento = resolverCampo(formulario);

  if (!elemento || typeof elemento.querySelector !== 'function') {
    return null;
  }

  const control =
    elemento.querySelector('[aria-invalid="true"]') ||
    (elemento.matches && elemento.matches('[aria-invalid="true"]')
      ? elemento
      : null);

  if (!control) return null;

  try {
    control.focus({ preventScroll: true });
  } catch {
    try {
      control.focus();
    } catch {
      // El control puede estar deshabilitado; no se interrumpe la validación.
    }
  }

  if (opciones.desplazar !== false && typeof control.scrollIntoView === 'function') {
    let behavior = 'smooth';

    try {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        behavior = 'auto';
      }
    } catch {
      behavior = 'auto';
    }

    try {
      control.scrollIntoView({ behavior, block: 'center' });
    } catch {
      // Navegadores antiguos pueden no aceptar opciones.
    }
  }

  return control;
}

/**
 * Muestra un resumen de errores en el contenedor indicado.
 *
 * Reutiliza .app-alerta y .app-formulario__mensajes. Si no se proporciona un
 * contenedor válido, muestra una notificación flotante.
 *
 * @param {Element|string|null} contenedor Destino del resumen.
 * @param {Object|Array<Object>} errores Resultado o lista de errores.
 * @param {Object} [opciones]
 * @param {string} [opciones.titulo='Revise el formulario']
 * @param {string} [opciones.mensaje]
 * @returns {HTMLElement|null}
 */
export function mostrarResumenErrores(contenedor, errores, opciones = {}) {
  const lista = Array.isArray(errores)
    ? errores
    : Array.isArray(errores?.errores)
      ? errores.errores
      : errores?.mensaje
        ? [errores]
        : [];

  if (lista.length === 0) return null;

  const primero = lista[0];
  const cantidad = lista.length;
  const mensaje =
    aTexto(opciones.mensaje) ||
    (cantidad === 1
      ? primero.mensaje
      : `Se encontraron ${cantidad} errores. ${primero.mensaje}`);

  let destino = null;

  if (contenedor) {
    const referencia =
      typeof contenedor === 'string'
        ? resolverCampo(contenedor)
        : contenedor;

    if (referencia) {
      destino =
        typeof referencia.querySelector === 'function'
          ? referencia.querySelector('.app-formulario__mensajes') || referencia
          : null;
    }
  }

  return mostrarMensajeError(mensaje, {
    titulo: opciones.titulo || 'Revise el formulario',
    contenedor: destino,
    reemplazar: true,
  });
}

/**
 * Valida un formulario, muestra los errores junto a los campos, enfoca el
 * primer error y presenta un resumen.
 *
 * No envía el formulario. El envío debe realizarse sólo cuando el resultado
 * tenga `valido === true`.
 *
 * @param {HTMLFormElement|Element|string} formulario
 * @param {Array|Object} reglas
 * @param {Object} [opciones]
 * @param {boolean} [opciones.limpiar=true] Limpia errores previos.
 * @param {boolean} [opciones.marcarValidos=false]
 * @param {boolean} [opciones.enfocar=true]
 * @param {boolean} [opciones.resumen=true]
 * @param {Element|string} [opciones.contenedorMensajes]
 * @param {string} [opciones.tituloResumen]
 * @returns {Object}
 */
export function validarFormularioYMostrar(
  formulario,
  reglas,
  opciones = {}
) {
  const elemento = resolverCampo(formulario);

  if (!elemento) {
    return resultadoInvalido(
      null,
      CODIGOS_ERROR.FORMULARIO_INVALIDO,
      'No se encontró el formulario para validar.',
      { formulario }
    );
  }

  if (opciones.limpiar !== false) {
    limpiarErroresFormulario(elemento);
  }

  const resultado = validarFormulario(elemento, reglas, opciones);
  const elementos = resultado.datos.elementos || {};

  for (const resultadoCampo of resultado.resultados || []) {
    const campo = resultadoCampo.campo || '';
    const elementoCampo = elementos[campo];
    if (!elementoCampo) continue;

    aplicarResultadoCampo(elementoCampo, resultadoCampo, {
      marcarValidos: opciones.marcarValidos,
      destacarErrores: opciones.destacarErrores,
    });
  }

  if (!resultado.valido) {
    if (opciones.resumen !== false) {
      const contenedor =
        opciones.contenedorMensajes ||
        (typeof elemento.querySelector === 'function'
          ? elemento.querySelector('.app-formulario__mensajes')
          : null);

      mostrarResumenErrores(contenedor, resultado.errores, {
        titulo: opciones.tituloResumen,
      });
    }

    if (opciones.enfocar !== false) {
      enfocarPrimerError(elemento, {
        desplazar: opciones.desplazar !== false,
      });
    }
  }

  return resultado;
}

