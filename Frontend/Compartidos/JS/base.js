/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Compartidos/JS/base.js
 * ----------------------------------------------------------------------------
 * Funciones generales reutilizables por todos los módulos del sistema.
 *
 * CONTENIDO
 *   1. Manipulación segura del DOM
 *   2. Manejo de texto, números y fechas
 *   3. Componentes de interfaz compartidos
 *   4. Seguridad de presentación
 *
 * Este módulo no realiza solicitudes HTTP, no accede a la base de datos y no
 * almacena credenciales ni tokens. Las funciones de fecha conservan el valor
 * original: las cadenas sin zona horaria se interpretan como fecha local para
 * evitar desplazamientos de un día.
 * ============================================================================
 */

/* ============================================================================
   1. MANIPULACIÓN SEGURA DEL DOM
   ============================================================================ */

/**
 * Obtiene un elemento por su identificador.
 * @param {string} id Identificador sin el símbolo #.
 * @param {Document|Element} [raiz=document] Ámbito de búsqueda.
 * @returns {HTMLElement|null}
 */
export function obtenerElementoPorId(id, raiz = document) {
  if (!id) return null;

  if (raiz === document) return document.getElementById(String(id));

  if (typeof raiz.querySelector !== 'function') return null;

  const identificador = String(id);

  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return raiz.querySelector(`#${CSS.escape(identificador)}`);
  }

  return raiz.querySelector(`[id="${identificador.replace(/["\\]/g, '\\$&')}"]`);
}

/**
 * Obtiene el primer elemento que coincide con un selector CSS.
 * @param {string} selector Selector CSS.
 * @param {Document|Element} [raiz=document] Ámbito de búsqueda.
 * @returns {Element|null}
 */
export function obtenerElemento(selector, raiz = document) {
  const ambito = resolverRaiz(raiz);
  if (!selector || !ambito) return null;

  try {
    return ambito.querySelector(String(selector));
  } catch {
    return null;
  }
}

/**
 * Obtiene todos los elementos que coinciden con un selector CSS.
 * @param {string} selector Selector CSS.
 * @param {Document|Element} [raiz=document] Ámbito de búsqueda.
 * @returns {Element[]} Arreglo (no NodeList) para poder recorrerlo con métodos de arreglo.
 */
export function obtenerElementos(selector, raiz = document) {
  const ambito = resolverRaiz(raiz);
  if (!selector || !ambito) return [];

  try {
    return Array.from(ambito.querySelectorAll(String(selector)));
  } catch {
    return [];
  }
}

/**
 * Comprueba si un elemento o selector existe en el documento.
 * @param {string|Element|null|undefined} valor Selector CSS o referencia a un elemento.
 * @param {Document|Element} [raiz=document] Ámbito de búsqueda cuando se usa un selector.
 * @returns {boolean}
 */
export function existeElemento(valor, raiz = document) {
  if (typeof valor !== 'string') return Boolean(resolverElemento(valor));

  const ambito = resolverRaiz(raiz);
  if (!valor || !ambito) return false;

  try {
    return Boolean(ambito.querySelector(valor));
  } catch {
    return false;
  }
}

/**
 * Crea un elemento del DOM de forma segura.
 *
 * No acepta las opciones `html` ni `innerHTML`: el contenido textual se asigna
 * con textContent y los hijos se insertan como nodos o texto. Los atributos de
 * evento (`on*`) y las URL ejecutables se descartan.
 *
 * @param {string} etiqueta Nombre de la etiqueta (div, button, span, etc.).
 * @param {Object} [opciones]
 * @param {string|number} [opciones.texto] Texto seguro del elemento.
 * @param {string|string[]} [opciones.clases] Clase o clases CSS.
 * @param {Object<string, string|number|boolean|null>} [opciones.atributos] Atributos seguros.
 * @param {Object<string, string|number>} [opciones.datos] Valores para data-*.
 * @param {Node|string|Array<Node|string>} [opciones.hijos] Nodos o texto hijo.
 * @param {Object<string, Function|Function[]>} [opciones.eventos] Manejadores por tipo de evento.
 * @returns {HTMLElement}
 * @throws {TypeError} Si la etiqueta no es válida o se intenta usar HTML directo.
 */
export function crearElemento(etiqueta, opciones = {}) {
  const nombre = String(etiqueta ?? '').trim();

  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(nombre)) {
    throw new TypeError(`Etiqueta HTML no válida: ${etiqueta}`);
  }

  if (
    Object.prototype.hasOwnProperty.call(opciones, 'html') ||
    Object.prototype.hasOwnProperty.call(opciones, 'innerHTML')
  ) {
    throw new TypeError(
      'crearElemento no acepta HTML directo. Use texto, hijos o establecerTexto().'
    );
  }

  const elemento = document.createElement(nombre);
  const { texto, clases, atributos, datos, hijos, eventos } = opciones;

  if (texto !== undefined && texto !== null) {
    elemento.textContent = String(texto);
  }

  if (clases) {
    agregarClases(elemento, clases);
  }

  if (atributos) {
    establecerAtributos(elemento, atributos);
  }

  if (datos && typeof datos === 'object') {
    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null) {
        elemento.dataset[clave] = String(valor);
      }
    }
  }

  if (hijos !== undefined && hijos !== null) {
    const lista = Array.isArray(hijos) ? hijos : [hijos];

    for (const hijo of lista) {
      if (hijo === undefined || hijo === null || hijo === false) continue;

      elemento.append(
        hijo instanceof Node ? hijo : document.createTextNode(String(hijo))
      );
    }
  }

  if (eventos && typeof eventos === 'object') {
    for (const [tipo, manejador] of Object.entries(eventos)) {
      const manejadores = Array.isArray(manejador) ? manejador : [manejador];

      for (const funcion of manejadores) {
        if (typeof funcion === 'function') {
          elemento.addEventListener(tipo, funcion);
        }
      }
    }
  }

  return elemento;
}

/**
 * Agrega una o varias clases CSS a un elemento.
 * @param {Element|string} elemento Elemento o selector.
 * @param {...(string|string[])} clases Clases que se agregarán.
 * @returns {Element|null}
 */
export function agregarClases(elemento, ...clases) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  const lista = clases
    .flat(Infinity)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  if (lista.length > 0) {
    referencia.classList.add(...lista);
  }

  return referencia;
}

/**
 * Quita una o varias clases CSS de un elemento.
 * @param {Element|string} elemento Elemento o selector.
 * @param {...(string|string[])} clases Clases que se quitarán.
 * @returns {Element|null}
 */
export function quitarClases(elemento, ...clases) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  const lista = clases
    .flat(Infinity)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  if (lista.length > 0) {
    referencia.classList.remove(...lista);
  }

  return referencia;
}

/**
 * Alterna una clase CSS.
 * @param {Element|string} elemento Elemento o selector.
 * @param {string} clase Clase que se alternará.
 * @param {boolean} [forzar] true para agregar, false para quitar; omitir para alternar.
 * @returns {Element|null}
 */
export function alternarClase(elemento, clase, forzar) {
  const referencia = resolverElemento(elemento);
  if (!referencia || !clase) return null;

  if (typeof forzar === 'boolean') {
    referencia.classList.toggle(clase, forzar);
  } else {
    referencia.classList.toggle(clase);
  }

  return referencia;
}

/**
 * Comprueba si un elemento tiene una clase CSS.
 * @param {Element|string} elemento Elemento o selector.
 * @param {string} clase Clase que se comprobará.
 * @returns {boolean}
 */
export function tieneClase(elemento, clase) {
  const referencia = resolverElemento(elemento);
  if (!referencia || !clase) return false;
  return referencia.classList.contains(clase);
}

/**
 * Muestra un elemento oculto con el atributo hidden.
 * @param {Element|string} elemento Elemento o selector.
 * @returns {Element|null}
 */
export function mostrarElemento(elemento) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  referencia.hidden = false;
  referencia.removeAttribute('aria-hidden');

  return referencia;
}

/**
 * Oculta un elemento con el atributo hidden y aria-hidden.
 * @param {Element|string} elemento Elemento o selector.
 * @returns {Element|null}
 */
export function ocultarElemento(elemento) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  referencia.hidden = true;
  referencia.setAttribute('aria-hidden', 'true');

  return referencia;
}

/**
 * Alterna la visibilidad de un elemento.
 * @param {Element|string} elemento Elemento o selector.
 * @param {boolean} [forzar] true para mostrar, false para ocultar; omitir para alternar.
 * @returns {Element|null}
 */
export function alternarElemento(elemento, forzar) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  const debeMostrarse =
    typeof forzar === 'boolean' ? forzar : referencia.hidden;

  return debeMostrarse
    ? mostrarElemento(referencia)
    : ocultarElemento(referencia);
}

/**
 * Registra un escuchador de eventos y devuelve una función para retirarlo.
 * @param {Element|string} elemento Elemento o selector.
 * @param {string} tipo Tipo de evento (click, input, submit, etc.).
 * @param {Function} manejador Función que se ejecutará.
 * @param {boolean|AddEventListenerOptions} [opciones] Opciones del escuchador.
 * @returns {Function} Función de limpieza.
 */
export function escucharEvento(elemento, tipo, manejador, opciones) {
  const referencia = resolverElemento(elemento);
  if (!referencia || !tipo || typeof manejador !== 'function') {
    return () => {};
  }

  referencia.addEventListener(tipo, manejador, opciones);

  return () => {
    referencia.removeEventListener(tipo, manejador, opciones);
  };
}

/**
 * Registra delegación de eventos sobre un contenedor.
 * @param {Element|string} contenedor Elemento que escucha el evento.
 * @param {string} tipo Tipo de evento.
 * @param {string} selector Selector de los elementos objetivo.
 * @param {(evento: Event, objetivo: Element) => void} manejador Función que se ejecutará.
 * @param {boolean|AddEventListenerOptions} [opciones] Opciones del escuchador.
 * @returns {Function} Función de limpieza.
 */
export function delegarEvento(
  contenedor,
  tipo,
  selector,
  manejador,
  opciones
) {
  const referencia = resolverElemento(contenedor);

  if (
    !referencia ||
    !tipo ||
    !selector ||
    typeof manejador !== 'function'
  ) {
    return () => {};
  }

  const escuchador = (evento) => {
    const origen = evento.target;

    if (!(origen instanceof Element)) return;

    const objetivo = origen.closest(selector);

    if (!objetivo || !referencia.contains(objetivo)) return;

    manejador(evento, objetivo);
  };

  referencia.addEventListener(tipo, escuchador, opciones);

  return () => {
    referencia.removeEventListener(tipo, escuchador, opciones);
  };
}

/**
 * Ejecuta una función cuando el DOM está listo.
 * @param {(evento?: Event) => void} callback Función que se ejecutará.
 * @returns {Function} Función de limpieza.
 */
export function alCargarDOM(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('alCargarDOM requiere una función.');
  }

  if (document.readyState === 'loading') {
    const manejador = (evento) => {
      document.removeEventListener('DOMContentLoaded', manejador);
      callback(evento);
    };

    document.addEventListener('DOMContentLoaded', manejador, { once: true });

    return () => document.removeEventListener('DOMContentLoaded', manejador);
  }

  queueMicrotask(() => callback());

  return () => {};
}

/**
 * Elimina todos los hijos de un elemento de forma segura.
 * @param {Element|string} elemento Elemento o selector.
 * @returns {Element|null}
 */
export function limpiarElemento(elemento) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  referencia.replaceChildren();

  return referencia;
}

/* --- Utilidades internas del DOM ------------------------------------------ */

/**
 * Resuelve un selector o una referencia a un elemento.
 * @param {string|Element|null|undefined} valor
 * @returns {Element|null}
 * @private
 */
function resolverElemento(valor) {
  if (!valor) return null;

  if (typeof valor === 'string') {
    try {
      return document.querySelector(valor);
    } catch {
      return null;
    }
  }

  if (typeof valor === 'object' && valor.nodeType === 1) {
    return valor;
  }

  return null;
}

/**
 * Resuelve el ámbito de búsqueda de un selector.
 * @param {Document|Element|string|null|undefined} raiz
 * @returns {Document|Element|null}
 * @private
 */
function resolverRaiz(raiz) {
  if (!raiz) return document;
  if (raiz === document) return document;

  if (typeof raiz === 'string') {
    try {
      return document.querySelector(raiz);
    } catch {
      return null;
    }
  }

  return typeof raiz.querySelector === 'function' ? raiz : null;
}

/* ============================================================================
   2. MANEJO DE TEXTO, NÚMEROS Y FECHAS
   ----------------------------------------------------------------------------
   Las funciones de formato no alteran el valor original: sólo devuelven una
   representación para la interfaz. Las fechas sin zona horaria (por ejemplo
   "2026-11-13" o "2026-11-13 08:30") se interpretan como fecha local para
   evitar que se muestre el día anterior.
   ============================================================================ */

const LOCALE = 'es-MX';

/**
 * Comprueba si un valor debe considerarse vacío.
 *
 * Se consideran vacíos: null, undefined, cadenas vacías o con sólo espacios,
 * arreglos sin elementos, Map/Set sin entradas y objetos planos sin claves.
 * Los valores 0 y false NO se consideran vacíos.
 *
 * @param {*} valor Valor que se comprobará.
 * @returns {boolean}
 */
export function esVacio(valor) {
  if (valor === null || valor === undefined) return true;

  if (typeof valor === 'string') return valor.trim() === '';

  if (Array.isArray(valor)) return valor.length === 0;

  if (valor instanceof Map || valor instanceof Set) return valor.size === 0;

  if (typeof valor === 'object') {
    const prototipo = Object.getPrototypeOf(valor);

    if (prototipo === Object.prototype || prototipo === null) {
      return Object.keys(valor).length === 0;
    }
  }

  return false;
}

/**
 * Convierte un valor en texto y elimina los espacios innecesarios.
 * Conserva mayúsculas, acentos y el contenido interno.
 *
 * @param {*} valor Valor que se convertirá.
 * @returns {string}
 */
export function limpiarEspacios(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza texto para búsquedas y comparaciones: elimina acentos, convierte
 * a minúsculas y reduce los espacios internos a uno solo.
 *
 * @param {*} valor Valor que se normalizará.
 * @returns {string}
 */
export function normalizarTexto(valor) {
  return limpiarEspacios(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(LOCALE);
}

/**
 * Compara dos cadenas de texto.
 *
 * @param {*} primero Primer valor.
 * @param {*} segundo Segundo valor.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.ignorarMayusculas=true] Compara sin distinguir mayúsculas.
 * @param {boolean} [opciones.ignorarAcentos=true] Compara sin distinguir acentos.
 * @returns {boolean}
 */
export function compararTexto(primero, segundo, opciones = {}) {
  const { ignorarMayusculas = true, ignorarAcentos = true } = opciones;

  const preparar = (valor) => {
    let texto = limpiarEspacios(valor);

    if (ignorarAcentos) {
      texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return ignorarMayusculas ? texto.toLocaleLowerCase(LOCALE) : texto;
  };

  return preparar(primero) === preparar(segundo);
}

/**
 * Convierte un valor numérico o una cadena en número.
 * En la configuración regional del sistema la coma se usa como separador de
 * miles y el punto como separador decimal.
 *
 * @param {*} valor Valor que se convertirá.
 * @returns {number|null} Número finito o null cuando no es válido.
 * @private
 */
function convertirANumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

  if (typeof valor === 'bigint') return Number(valor);

  if (typeof valor !== 'string') return null;

  let texto = valor.trim();
  if (!texto) return null;

  let negativo = false;

  if (/^\(.+\)$/.test(texto)) {
    negativo = true;
    texto = texto.slice(1, -1);
  }

  texto = texto.replace(/[^\d.,+-]/g, '');
  if (!texto) return null;

  texto = texto.replace(/,/g, '');

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;

  return negativo ? -Math.abs(numero) : numero;
}

/**
 * Normaliza la cantidad de decimales a un entero entre 0 y 20, que es el
 * rango admitido por Intl.NumberFormat.
 * @param {*} valor
 * @param {number} [defecto=2]
 * @returns {number}
 * @private
 */
function normalizarDecimales(valor, defecto = 2) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return defecto;

  return Math.min(20, Math.max(0, Math.trunc(numero)));
}

/**
 * Formatea un número con la configuración regional del sistema.
 * Devuelve una cadena vacía cuando el valor no es numérico.
 *
 * @param {*} valor Número o cadena numérica.
 * @param {Object} [opciones]
 * @param {number} [opciones.decimalesMinimos=0] Decimales mínimos.
 * @param {number} [opciones.decimalesMaximos=2] Decimales máximos.
 * @param {boolean} [opciones.usarAgrupacion=true] Usa separador de miles.
 * @param {string} [opciones.locale='es-MX'] Configuración regional.
 * @returns {string}
 */
export function formatearNumero(valor, opciones = {}) {
  const numero = convertirANumero(valor);
  if (numero === null) return '';

  const {
    decimalesMinimos = 0,
    decimalesMaximos = 2,
    usarAgrupacion = true,
    locale = LOCALE,
  } = opciones;

  const minimo = normalizarDecimales(decimalesMinimos, 0);
  const maximo = Math.max(minimo, normalizarDecimales(decimalesMaximos, 2));

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: minimo,
    maximumFractionDigits: maximo,
    useGrouping: Boolean(usarAgrupacion),
  }).format(numero);
}

/**
 * Formatea una cantidad para tablas, kardex y fichas de inventario.
 *
 * @param {*} valor Cantidad que se mostrará.
 * @param {number} [decimales=2] Decimales máximos permitidos.
 * @returns {string}
 */
export function formatearCantidad(valor, decimales = 2) {
  return formatearNumero(valor, {
    decimalesMaximos: normalizarDecimales(decimales, 2),
  });
}

/**
 * Formatea un valor monetario. Si el código de moneda no es válido, devuelve
 * el número con el código antepuesto en lugar de lanzar una excepción.
 *
 * @param {*} valor Importe que se mostrará.
 * @param {Object} [opciones]
 * @param {string} [opciones.moneda='MXN'] Código ISO de la moneda.
 * @param {string} [opciones.locale='es-MX'] Configuración regional.
 * @param {number} [opciones.decimales=2] Decimales que se mostrarán.
 * @returns {string}
 */
export function formatearMoneda(valor, opciones = {}) {
  const numero = convertirANumero(valor);
  if (numero === null) return '';

  const { moneda = 'MXN', locale = LOCALE, decimales = 2 } = opciones;
  const codigo = String(moneda ?? '').trim().toUpperCase() || 'MXN';
  const maximo = normalizarDecimales(decimales, 2);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: codigo,
      minimumFractionDigits: maximo,
      maximumFractionDigits: maximo,
    }).format(numero);
  } catch {
    return `${codigo} ${formatearNumero(numero, {
      decimalesMaximos: maximo,
    })}`;
  }
}

/**
 * Construye una fecha local validando que los componentes existan.
 * @param {number} anio
 * @param {number} mes Mes del 1 al 12.
 * @param {number} dia
 * @param {number} [horas=0]
 * @param {number} [minutos=0]
 * @param {number} [segundos=0]
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

const PATRON_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_FECHA_DIA_MES_ANIO = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const PATRON_FECHA_HORA =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/;
const PATRON_ZONA_HORARIA = /(?:z|[+-]\d{2}:?\d{2})$/i;

/**
 * Convierte un valor en Date sin desplazar las fechas sin zona horaria.
 * Acepta Date, marca de tiempo en milisegundos, "AAAA-MM-DD",
 * "DD/MM/AAAA" y fechas ISO con o sin hora.
 *
 * @param {*} valor
 * @returns {Date|null}
 * @private
 */
function convertirAFecha(valor) {
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
 * Formatea una fecha para su presentación (DD/MM/AAAA).
 * Devuelve una cadena vacía o el texto indicado cuando la fecha no es válida.
 *
 * @param {*} valor Fecha, marca de tiempo o cadena de fecha.
 * @param {Object} [opciones]
 * @param {string} [opciones.locale='es-MX'] Configuración regional.
 * @param {string} [opciones.textoInvalido=''] Texto para valores no válidos.
 * @returns {string}
 */
export function formatearFecha(valor, opciones = {}) {
  const fecha = convertirAFecha(valor);
  if (!fecha) return opciones.textoInvalido ?? '';

  const { locale = LOCALE } = opciones;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

/**
 * Formatea una fecha y hora para su presentación (DD/MM/AAAA HH:MM).
 *
 * @param {*} valor Fecha, marca de tiempo o cadena de fecha.
 * @param {Object} [opciones]
 * @param {string} [opciones.locale='es-MX'] Configuración regional.
 * @param {boolean} [opciones.incluirSegundos=false] Muestra los segundos.
 * @param {string} [opciones.textoInvalido=''] Texto para valores no válidos.
 * @returns {string}
 */
export function formatearFechaHora(valor, opciones = {}) {
  const fecha = convertirAFecha(valor);
  if (!fecha) return opciones.textoInvalido ?? '';

  const { locale = LOCALE, incluirSegundos = false } = opciones;

  const formateadorFecha = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const opcionesHora = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };

  if (incluirSegundos) opcionesHora.second = '2-digit';

  const formateadorHora = new Intl.DateTimeFormat(locale, opcionesHora);

  return `${formateadorFecha.format(fecha)} ${formateadorHora.format(fecha)}`;
}

/* === FIN_BLOQUE_2 === */

/* ============================================================================
   3. COMPONENTES DE INTERFAZ COMPARTIDOS
   ----------------------------------------------------------------------------
   Estas funciones construyen la estructura que esperan las clases de
   componentes.css: app-alerta, app-notificacion, app-cargando y
   app-estado-vacio. No implementan filtros, paginación ni lógica de módulos.
   ============================================================================ */

const TIPOS_MENSAJE = new Set(['info', 'exito', 'advertencia', 'error']);

const EQUIVALENCIAS_TIPO = {
  success: 'exito',
  correcto: 'exito',
  warning: 'advertencia',
  warn: 'advertencia',
  danger: 'error',
  critico: 'error',
  crítico: 'error',
  informacion: 'info',
  información: 'info',
};

/**
 * Normaliza el tipo de mensaje a info, exito, advertencia o error.
 * @param {string} tipo
 * @returns {string}
 * @private
 */
function normalizarTipoMensaje(tipo) {
  const valor = String(tipo ?? 'info').trim().toLocaleLowerCase(LOCALE);
  const normalizado = EQUIVALENCIAS_TIPO[valor] || valor;
  return TIPOS_MENSAJE.has(normalizado) ? normalizado : 'info';
}

/* Trazos de los iconos dibujados con SVG. Son datos internos del módulo, no
   contenido procedente de usuarios ni de la base de datos. */
const ICONOS = {
  info: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'M12 11v5' }],
    ['path', { d: 'M12 8h.01' }],
  ],
  exito: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'm8 12 2.5 2.5L16 9' }],
  ],
  advertencia: [
    ['path', { d: 'M12 3.5 2.8 20h18.4L12 3.5Z' }],
    ['path', { d: 'M12 9v5' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  error: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'm9 9 6 6' }],
    ['path', { d: 'm15 9-6 6' }],
  ],
  cerrar: [
    ['path', { d: 'm6 6 12 12' }],
    ['path', { d: 'm18 6-12 12' }],
  ],
  vacio: [
    ['path', { d: 'M4 7h16v12H4z' }],
    ['path', { d: 'M4 11h16' }],
    ['path', { d: 'M9 15h6' }],
  ],
};

/**
 * Crea un icono SVG accesible (oculto para lectores de pantalla).
 * @param {string} nombre Nombre del icono interno.
 * @param {string} [clase] Clase CSS opcional.
 * @returns {SVGSVGElement}
 * @private
 */
function crearIcono(nombre, clase) {
  const definicion = ICONOS[nombre] || ICONOS.info;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  if (clase) svg.setAttribute('class', clase);

  for (const [etiqueta, atributos] of definicion) {
    const nodo = document.createElementNS('http://www.w3.org/2000/svg', etiqueta);

    for (const [atributo, valor] of Object.entries(atributos)) {
      nodo.setAttribute(atributo, valor);
    }

    svg.append(nodo);
  }

  return svg;
}

/**
 * Crea un botón de cierre con etiqueta accesible.
 * @param {string} clase Clase del botón.
 * @param {string} etiqueta Texto para aria-label.
 * @param {Function} alCerrar Acción de cierre.
 * @returns {HTMLButtonElement}
 * @private
 */
function crearBotonCerrar(clase, etiqueta, alCerrar) {
  const boton = crearElemento('button', {
    clases: [clase],
    atributos: { type: 'button', 'aria-label': etiqueta },
    eventos: { click: alCerrar },
  });

  boton.append(crearIcono('cerrar'));

  return boton;
}

/* Temporizadores de cierre automático de mensajes. */
const temporizadoresCierre = new WeakMap();

/**
 * Programa el cierre automático de un mensaje y lo pausa mientras el usuario
 * lo mantiene enfocado o con el puntero encima.
 * @param {Element} elemento Mensaje.
 * @param {number} duracion Milisegundos.
 * @private
 */
function programarCierre(elemento, duracion) {
  const milisegundos = Number(duracion);

  if (!(milisegundos > 0)) return;

  const estado = { id: null, duracion: milisegundos };

  const iniciar = () => {
    if (estado.id !== null) clearTimeout(estado.id);
    estado.id = setTimeout(() => cerrarMensaje(elemento), estado.duracion);
  };

  const pausar = () => {
    if (estado.id !== null) {
      clearTimeout(estado.id);
      estado.id = null;
    }
  };

  const reanudar = () => {
    if (estado.id === null) iniciar();
  };

  elemento.addEventListener('pointerenter', pausar);
  elemento.addEventListener('pointerleave', reanudar);
  elemento.addEventListener('focusin', pausar);
  elemento.addEventListener('focusout', (evento) => {
    if (!elemento.contains(evento.relatedTarget)) reanudar();
  });

  temporizadoresCierre.set(elemento, estado);
  iniciar();
}

/**
 * Cierra y elimina un mensaje o notificación creado por este módulo.
 *
 * @param {Element|string} elemento Mensaje o selector.
 * @returns {boolean} true si el elemento existía y fue eliminado.
 */
export function cerrarMensaje(elemento) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return false;

  const estado = temporizadoresCierre.get(referencia);

  if (estado && estado.id !== null) clearTimeout(estado.id);

  temporizadoresCierre.delete(referencia);
  referencia.remove();

  return true;
}

/**
 * Construye una alerta en línea con la estructura de componentes.css.
 * @param {string} mensaje Texto del mensaje.
 * @param {Object} opciones
 * @returns {HTMLElement}
 * @private
 */
function crearAlerta(mensaje, opciones) {
  const { tipo, titulo, cerrable, icono } = opciones;

  const alerta = crearElemento('div', {
    clases: ['app-alerta', `app-alerta--${tipo}`],
    atributos: { role: tipo === 'error' ? 'alert' : 'status' },
  });

  if (icono) alerta.append(crearIcono(tipo, 'app-alerta__icono'));

  const contenido = crearElemento('div', { clases: ['app-alerta__contenido'] });

  if (titulo) {
    contenido.append(
      crearElemento('p', { clases: ['app-alerta__titulo'], texto: titulo })
    );
  }

  contenido.append(
    crearElemento('p', { clases: ['app-alerta__texto'], texto: mensaje })
  );

  alerta.append(contenido);

  if (cerrable) {
    alerta.append(
      crearBotonCerrar('app-alerta__cerrar', 'Cerrar mensaje', () =>
        cerrarMensaje(alerta)
      )
    );
  }

  return alerta;
}

/**
 * Obtiene o crea la región fija de notificaciones.
 * @returns {HTMLElement}
 * @private
 */
function obtenerRegionNotificaciones() {
  const existente = document.querySelector('.app-notificaciones');
  if (existente) return existente;

  const region = crearElemento('div', {
    clases: ['app-notificaciones'],
    atributos: {
      id: 'app-notificaciones',
      role: 'region',
      'aria-label': 'Notificaciones del sistema',
    },
  });

  document.body.append(region);

  return region;
}

/**
 * Muestra una notificación flotante temporal.
 *
 * @param {string} mensaje Texto del mensaje.
 * @param {Object} [opciones]
 * @param {string} [opciones.tipo='info'] info, exito, advertencia o error.
 * @param {string} [opciones.titulo=''] Título opcional.
 * @param {number} [opciones.duracion=5000] Milisegundos antes de cerrarse; 0 la mantiene.
 * @param {boolean} [opciones.cerrable=true] Muestra el botón de cierre.
 * @param {boolean} [opciones.icono=true] Muestra el icono del tipo.
 * @returns {HTMLElement|null}
 */
export function mostrarNotificacion(mensaje, opciones = {}) {
  if (!document.body) return null;

  const {
    tipo = 'info',
    titulo = '',
    duracion = 5000,
    cerrable = true,
    icono = true,
  } = opciones;

  const tipoNormalizado = normalizarTipoMensaje(tipo);
  const region = obtenerRegionNotificaciones();

  const notificacion = crearElemento('div', {
    clases: ['app-notificacion', `app-notificacion--${tipoNormalizado}`],
    atributos: {
      role: tipoNormalizado === 'error' ? 'alert' : 'status',
      'aria-atomic': 'true',
    },
  });

  if (icono) {
    notificacion.append(
      crearIcono(tipoNormalizado, 'app-notificacion__icono')
    );
  }

  const contenido = crearElemento('div', {
    clases: ['app-notificacion__contenido'],
  });

  if (titulo) {
    contenido.append(
      crearElemento('p', {
        clases: ['app-notificacion__titulo'],
        texto: titulo,
      })
    );
  }

  contenido.append(
    crearElemento('p', {
      clases: ['app-notificacion__texto'],
      texto: mensaje === null || mensaje === undefined ? '' : String(mensaje),
    })
  );

  notificacion.append(contenido);

  if (cerrable) {
    notificacion.append(
      crearBotonCerrar(
        'app-notificacion__cerrar',
        'Cerrar notificación',
        () => cerrarMensaje(notificacion)
      )
    );
  }

  region.append(notificacion);

  if (duracion > 0) programarCierre(notificacion, duracion);

  return notificacion;
}

/**
 * Muestra un mensaje informativo, de éxito, de advertencia o de error.
 *
 * Si se indica un contenedor, inserta una alerta en línea con .app-alerta.
 * Si no se indica contenedor, muestra una notificación flotante. En ese caso
 * la duración predeterminada es de 5 segundos.
 *
 * @param {string} mensaje Texto del mensaje.
 * @param {Object} [opciones]
 * @param {string} [opciones.tipo='info'] info, exito, advertencia o error.
 * @param {string} [opciones.titulo=''] Título opcional.
 * @param {Element|string} [opciones.contenedor] Destino de la alerta en línea.
 * @param {boolean} [opciones.cerrable=true] Muestra el botón de cierre.
 * @param {boolean} [opciones.icono=true] Muestra el icono del tipo.
 * @param {number} [opciones.duracion=0] Cierre automático en milisegundos; 0 no cierra.
 *   En notificaciones flotantes, si se omite, dura 5 segundos.
 * @param {boolean} [opciones.reemplazar=false] Quita alertas previas del contenedor.
 * @returns {HTMLElement|null}
 */
export function mostrarMensaje(mensaje, opciones = {}) {
  const {
    tipo = 'info',
    titulo = '',
    contenedor = null,
    cerrable = true,
    icono = true,
    duracion = 0,
    reemplazar = false,
  } = opciones;

  const tipoNormalizado = normalizarTipoMensaje(tipo);
  const texto = mensaje === null || mensaje === undefined ? '' : String(mensaje);

  if (!contenedor) {
    const duracionNotificacion = Object.prototype.hasOwnProperty.call(
      opciones,
      'duracion'
    )
      ? duracion
      : 5000;

    return mostrarNotificacion(texto, {
      tipo: tipoNormalizado,
      titulo,
      duracion: duracionNotificacion,
      cerrable,
      icono,
    });
  }

  const destino = resolverElemento(contenedor);
  if (!destino) return null;

  if (reemplazar) limpiarMensajes(destino);

  const alerta = crearAlerta(texto, {
    tipo: tipoNormalizado,
    titulo,
    cerrable,
    icono,
  });

  destino.append(alerta);

  if (duracion > 0) programarCierre(alerta, duracion);

  return alerta;
}

/**
 * Muestra un mensaje informativo.
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarMensajeInfo(mensaje, opciones = {}) {
  return mostrarMensaje(mensaje, { ...opciones, tipo: 'info' });
}

/**
 * Muestra un mensaje de éxito.
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarMensajeExito(mensaje, opciones = {}) {
  return mostrarMensaje(mensaje, { ...opciones, tipo: 'exito' });
}

/**
 * Muestra un mensaje de advertencia.
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarMensajeAdvertencia(mensaje, opciones = {}) {
  return mostrarMensaje(mensaje, { ...opciones, tipo: 'advertencia' });
}

/**
 * Muestra un mensaje de error.
 * @param {string} mensaje
 * @param {Object} [opciones]
 * @returns {HTMLElement|null}
 */
export function mostrarMensajeError(mensaje, opciones = {}) {
  return mostrarMensaje(mensaje, { ...opciones, tipo: 'error' });
}

/**
 * Elimina las alertas y notificaciones que sean hijas directas del contenedor.
 * @param {Element|string} contenedor Contenedor o selector.
 * @returns {number} Cantidad de mensajes eliminados.
 */
export function limpiarMensajes(contenedor) {
  const referencia = resolverElemento(contenedor);
  if (!referencia) return 0;

  const mensajes = Array.from(referencia.children).filter(
    (hijo) =>
      hijo.classList.contains('app-alerta') ||
      hijo.classList.contains('app-notificacion')
  );

  for (const mensaje of mensajes) cerrarMensaje(mensaje);

  return mensajes.length;
}

/* Indicadores de carga activos por contenedor. */
const indicadoresCarga = new WeakMap();

/**
 * Muestra un indicador de carga dentro de un contenedor.
 *
 * Añade aria-busy al contenedor y un bloque .app-cargando al final. No elimina
 * el contenido existente; para tablas se recomienda usar el contenedor de la
 * tabla, no el <tbody>.
 *
 * @param {Element|string} contenedor Contenedor o selector.
 * @param {Object} [opciones]
 * @param {string} [opciones.texto='Cargando…'] Texto del indicador.
 * @param {string|string[]} [opciones.clases] Clases adicionales.
 * @returns {HTMLElement|null}
 */
export function mostrarCarga(contenedor, opciones = {}) {
  const referencia = resolverElemento(contenedor);
  if (!referencia) return null;

  ocultarCarga(referencia);

  const { texto = 'Cargando…', clases = [] } = opciones;
  const clasesExtra = clases
    ? Array.isArray(clases)
      ? clases
      : String(clases).split(/\s+/).filter(Boolean)
    : [];

  const indicador = crearElemento('div', {
    clases: ['app-cargando', ...clasesExtra],
    atributos: {
      role: 'status',
      'aria-live': 'polite',
      'data-app-carga': 'true',
    },
  });

  indicador.append(
    crearElemento('span', {
      clases: ['app-spinner'],
      atributos: { 'aria-hidden': 'true' },
    })
  );

  if (texto) {
    indicador.append(crearElemento('span', { texto }));
  }

  referencia.append(indicador);
  referencia.setAttribute('aria-busy', 'true');

  indicadoresCarga.set(referencia, indicador);

  return indicador;
}

/**
 * Oculta el indicador de carga de un contenedor y restaura aria-busy.
 *
 * @param {Element|string} contenedor Contenedor o selector.
 * @returns {boolean} true si se encontró y retiró un indicador.
 */
export function ocultarCarga(contenedor) {
  const referencia = resolverElemento(contenedor);
  if (!referencia) return false;

  const registrado = indicadoresCarga.get(referencia);

  const indicador =
    registrado && registrado.isConnected
      ? registrado
      : Array.from(referencia.children).find((hijo) =>
          hijo.hasAttribute('data-app-carga')
        );

  if (indicador) indicador.remove();

  indicadoresCarga.delete(referencia);
  referencia.removeAttribute('aria-busy');

  return Boolean(indicador);
}

/**
 * Crea una acción de la lista de acciones de un estado vacío.
 * @param {Node|Object} accion Nodo o descriptor { texto, clases, atributos, alHacerClic }.
 * @returns {Node|null}
 * @private
 */
function crearAccionEstadoVacio(accion) {
  if (!accion) return null;
  if (accion instanceof Node) return accion;
  if (typeof accion !== 'object' || !accion.texto) return null;

  const { texto, clases = [], atributos = {}, alHacerClic } = accion;
  const clasesExtra = Array.isArray(clases)
    ? clases
    : String(clases).split(/\s+/).filter(Boolean);

  return crearElemento('button', {
    clases: ['app-btn', 'app-btn--secundario', ...clasesExtra],
    texto,
    atributos: { type: 'button', ...atributos },
    eventos:
      typeof alHacerClic === 'function' ? { click: alHacerClic } : undefined,
  });
}

/**
 * Muestra un estado vacío con la estructura de componentes.css.
 *
 * @param {Element|string} contenedor Contenedor o selector.
 * @param {Object} [opciones]
 * @param {string} [opciones.titulo='Sin información'] Título del estado.
 * @param {string} [opciones.texto=''] Texto descriptivo.
 * @param {boolean} [opciones.icono=true] Muestra el icono.
 * @param {boolean} [opciones.limpiar=false] Vacía el contenedor antes de insertar.
 * @param {Array<Node|Object>} [opciones.acciones=[]] Botones o descriptores de acción.
 * @returns {HTMLElement|null}
 */
export function mostrarEstadoVacio(contenedor, opciones = {}) {
  const referencia = resolverElemento(contenedor);
  if (!referencia) return null;

  const {
    titulo = 'Sin información',
    texto = '',
    icono = true,
    limpiar = false,
    acciones = [],
  } = opciones;

  if (limpiar) {
    ocultarCarga(referencia);
    limpiarElemento(referencia);
  }

  const estado = crearElemento('div', {
    clases: ['app-estado-vacio'],
    atributos: { role: 'status' },
  });

  if (icono) {
    const cajaIcono = crearElemento('span', {
      clases: ['app-estado-vacio__icono'],
      atributos: { 'aria-hidden': 'true' },
    });

    cajaIcono.append(crearIcono('vacio'));
    estado.append(cajaIcono);
  }

  estado.append(
    crearElemento('p', {
      clases: ['app-estado-vacio__titulo'],
      texto: titulo,
    })
  );

  if (texto) {
    estado.append(
      crearElemento('p', {
        clases: ['app-estado-vacio__texto'],
        texto,
      })
    );
  }

  const listaAcciones = (Array.isArray(acciones) ? acciones : [acciones])
    .map(crearAccionEstadoVacio)
    .filter(Boolean);

  if (listaAcciones.length > 0) {
    const contenedorAcciones = crearElemento('div', {
      clases: ['app-estado-vacio__acciones'],
    });

    contenedorAcciones.append(...listaAcciones);
    estado.append(contenedorAcciones);
  }

  referencia.append(estado);

  return estado;
}

/* === FIN_BLOQUE_3 === */

/* ============================================================================
   4. SEGURIDAD DE PRESENTACIÓN
   ----------------------------------------------------------------------------
   Todo contenido procedente de formularios, de la base de datos o de la API
   debe asignarse con textContent o como nodo de texto. Las funciones de este
   bloque impiden que ese contenido se convierta en HTML o en una URL
   ejecutable.
   ============================================================================ */

/* Atributos que nunca se aceptan desde datos externos. */
const ATRIBUTOS_PROHIBIDOS = new Set([
  'srcdoc',
  'innerhtml',
  'outerhtml',
  'style',
]);

/**
 * Comprueba si una URL usa un protocolo ejecutable.
 * @param {string} valor
 * @returns {boolean}
 * @private
 */
function esUrlPeligrosa(valor) {
  const limpio = String(valor).replace(/[\u0000-\u001f\u007f\s]+/g, '');
  return /^(?:javascript|vbscript|data):/i.test(limpio);
}

/**
 * Asigna atributos de forma segura.
 *
 * Ignora los manejadores en línea (on*), srcdoc, innerHTML, outerHTML y style,
 * además de las URL con protocolos ejecutables. Los valores null, undefined y
 * false eliminan el atributo; true lo establece vacío.
 *
 * @param {Element|string} elemento Elemento o selector.
 * @param {Object<string, string|number|boolean|null|undefined>} atributos
 * @returns {Element|null}
 */
export function establecerAtributos(elemento, atributos) {
  const referencia = resolverElemento(elemento);

  if (!referencia || !atributos || typeof atributos !== 'object') return null;

  for (const [nombre, valor] of Object.entries(atributos)) {
    const atributo = String(nombre).trim().toLocaleLowerCase(LOCALE);

    if (
      !atributo ||
      atributo.startsWith('on') ||
      ATRIBUTOS_PROHIBIDOS.has(atributo)
    ) {
      continue;
    }

    if (valor === null || valor === undefined || valor === false) {
      referencia.removeAttribute(atributo);
      continue;
    }

    if (valor === true) {
      referencia.setAttribute(atributo, '');
      continue;
    }

    const texto = String(valor);

    if (
      (atributo === 'href' ||
        atributo === 'src' ||
        atributo === 'xlink:href' ||
        atributo === 'action' ||
        atributo === 'formaction') &&
      esUrlPeligrosa(texto)
    ) {
      continue;
    }

    referencia.setAttribute(atributo, texto);
  }

  return referencia;
}

/**
 * Asigna texto seguro a un elemento, reemplazando su contenido anterior.
 *
 * @param {Element|string} elemento Elemento o selector.
 * @param {*} texto Texto que se mostrará.
 * @returns {Element|null}
 */
export function establecerTexto(elemento, texto) {
  const referencia = resolverElemento(elemento);
  if (!referencia) return null;

  referencia.textContent =
    texto === null || texto === undefined ? '' : String(texto);

  return referencia;
}

const ENTIDADES_HTML = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa los caracteres peligrosos de una cadena.
 *
 * Debe usarse únicamente cuando una API externa exija construir HTML como
 * cadena. Para el DOM propio, la opción correcta es textContent,
 * crearElemento o establecerTexto.
 *
 * @param {*} valor Texto que se escapará.
 * @returns {string}
 */
export function escaparHTML(valor) {
  return String(valor ?? '').replace(
    /[&<>"']/g,
    (caracter) => ENTIDADES_HTML[caracter]
  );
}

/* === FIN_BLOQUE_4 === */
