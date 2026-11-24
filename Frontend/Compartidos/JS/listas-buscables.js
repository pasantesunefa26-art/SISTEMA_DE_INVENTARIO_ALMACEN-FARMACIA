/**
 * ============================================================================
 * SISTEMA INSTITUCIONAL DE INVENTARIO HOSPITALARIO
 * Archivo: Frontend/Compartidos/JS/listas-buscables.js
 * -----------------------------------------------------------------------------
 * Componente reutilizable para listas desplegables con buscador.
 *
 * Este módulo no crea catálogos estáticos ni accede directamente a MySQL.
 * Proporciona un contrato reutilizable para integrar proveedores de datos desde
 * la carpeta conexiones/frontend/ y de los módulos del sistema.
 *
 * CONTRATO DE INTEGRACIÓN
 *   - todo dato debe llegar por un proveedor inyectado via config.buscarProvider
 *   - el proveedor debe devolver un arreglo de objetos y no inventar valores
 *   - el backend Java/Spring Boot debe validar autorización, existencia, lote,
 *     disponibilidad, estado del producto y permisos del usuario
 *
 * Este componente es un contenedor de UI y no reemplaza la validación del
 * backend ni la autoridad del servidor.
 * ============================================================================ */

const CLASES = Object.freeze({
  root: 'app-lista-buscable',
  wrapper: 'app-lista-buscable__wrapper',
  inputGroup: 'input-group',
  input: 'form-control',
  trigger: 'btn btn-secondary',
  listbox: 'app-lista-buscable__lista',
  item: 'app-lista-buscable__item',
  itemSelected: 'is-selected',
  itemFocus: 'is-focus',
  disabled: 'is-disabled',
  loading: 'is-loading',
  empty: 'is-empty',
  error: 'is-error',
  hidden: 'is-hidden',
  btnAdd: 'btn btn-primary app-lista-buscable__agregar',
  ayuda: 'form-text',
});

const TEXTOS = Object.freeze({
  buscar: 'Buscar…',
  sinResultados: 'Sin resultados',
  cargando: 'Cargando…',
  error: 'No se pudieron cargar los datos.',
  agregar: '+ Agregar nuevo',
  buscarLotes: 'Buscar lote…',
  seleccionar: 'Seleccione una opción',
});

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isPlainObject(valor) {
  return Object.prototype.toString.call(valor) === '[object Object]';
}

function resolverElemento(valor, raiz = document) {
  if (!valor) return null;
  if (valor instanceof HTMLElement) return valor;
  if (typeof valor === 'string') {
    try {
      return raiz.querySelector(valor);
    } catch {
      return null;
    }
  }
  return null;
}

function construirAtributos(elemento, atributos = {}) {
  if (!elemento || !isPlainObject(atributos)) return;

  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (valor === true) {
      elemento.setAttribute(clave, clave);
      continue;
    }
    elemento.setAttribute(clave, String(valor));
  }
}

function crearElementoSeguro(etiqueta, opciones = {}) {
  const elemento = document.createElement(etiqueta);
  const { texto, clases, atributos, data, eventos } = opciones;

  if (texto !== undefined && texto !== null) {
    elemento.textContent = String(texto);
  }

  if (clases) {
    const lista = Array.isArray(clases) ? clases : String(clases).split(/\s+/);
    elemento.classList.add(...lista.filter(Boolean));
  }

  if (atributos) {
    construirAtributos(elemento, atributos);
  }

  if (data && isPlainObject(data)) {
    for (const [clave, valor] of Object.entries(data)) {
      if (valor !== undefined && valor !== null) {
        elemento.dataset[clave] = String(valor);
      }
    }
  }

  if (eventos && isPlainObject(eventos)) {
    for (const [tipo, manejador] of Object.entries(eventos)) {
      const funciones = Array.isArray(manejador) ? manejador : [manejador];
      for (const fn of funciones) {
        if (typeof fn === 'function') {
          elemento.addEventListener(tipo, fn);
        }
      }
    }
  }

  return elemento;
}

function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function emitSelectionEvent(target, detalle) {
  if (!(target instanceof HTMLElement)) return;

  target.dispatchEvent(
    new CustomEvent('app:lista:seleccion', {
      bubbles: true,
      detail: detalle,
    })
  );
}

function defaultValueExtractor(item, config) {
  if (!item) return '';
  const candidato = config.getValor ? config.getValor(item) : item?.valor ?? item?.id ?? item?.codigo ?? item?.codigoProducto ?? '';
  return candidato ?? '';
}

function defaultIdExtractor(item, config) {
  if (!item) return null;
  if (config.getId) return config.getId(item);
  if (item.id !== undefined) return item.id;
  if (item.identificador !== undefined) return item.identificador;
  if (item.codigo !== undefined) return item.codigo;
  return null;
}

function defaultLabelExtractor(item, config) {
  if (!item) return '';

  if (config.getLabel) {
    const label = config.getLabel(item);
    if (label !== undefined && label !== null && label !== '') {
      return String(label);
    }
  }

  const opciones = [
    item.nombre,
    item.descripcion,
    item.label,
    item.texto,
    item.nombreProducto,
    item.denominacion,
    item.titulo,
  ];

  for (const valor of opciones) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return String(valor);
    }
  }

  return '';
}

function defaultCodigoExtractor(item, config) {
  if (!item) return '';

  if (config.getCodigo) {
    const codigo = config.getCodigo(item);
    if (codigo !== undefined && codigo !== null) return String(codigo);
  }

  if (item.codigo !== undefined && item.codigo !== null && String(item.codigo).trim() !== '') {
    return String(item.codigo);
  }

  if (item.codigoProducto !== undefined && item.codigoProducto !== null && String(item.codigoProducto).trim() !== '') {
    return String(item.codigoProducto);
  }

  return '';
}

function defaultDetalleExtractor(item, config) {
  if (!item) return '';

  if (config.getDetalle) {
    const detalle = config.getDetalle(item);
    if (detalle !== undefined && detalle !== null) return String(detalle);
  }

  if (item.numeroLote !== undefined && item.numeroLote !== null) {
    return `Lote: ${item.numeroLote}`;
  }

  if (item.fechaVencimiento !== undefined && item.fechaVencimiento !== null) {
    return `Vence: ${item.fechaVencimiento}`;
  }

  if (item.existenciaDisponible !== undefined && item.existenciaDisponible !== null) {
    return `Disponible: ${item.existenciaDisponible}`;
  }

  if (item.departamento !== undefined && item.departamento !== null) {
    return String(item.departamento);
  }

  return '';
}

class ListaBuscable {
  constructor(config = {}) {
    this.config = {
      tipo: 'generic',
      placeholder: TEXTOS.buscar,
      disabled: false,
      limpiarAlCambiar: false,
      mostrarBotonAgregar: false,
      buscarProvider: null,
      onSeleccion: null,
      onCambio: null,
      onError: null,
      onAgregarNuevo: null,
      getId: defaultIdExtractor,
      getLabel: defaultLabelExtractor,
      getCodigo: defaultCodigoExtractor,
      getDetalle: defaultDetalleExtractor,
      getValor: defaultValueExtractor,
      filtro: null,
      comparador: null,
      listar: null,
      contexto: {},
      maxResultados: 100,
      debounceMs: 220,
      ...config,
    };

    this.root = null;
    this.wrapper = null;
    this.input = null;
    this.trigger = null;
    this.listbox = null;
    this.status = null;
    this.botonAgregar = null;
    this.busqueda = '';
    this.items = [];
    this.resultados = [];
    this.seleccionado = null;
    this.ultimoRequest = 0;
    this.claveCarga = 0;
    this.abierta = false;
    this.enCarga = false;
    this.errorCarga = false;
    this.debouncedSearch = debounce(this.ejecutarBusqueda.bind(this), this.config.debounceMs);

    this.init();
  }

  init() {
    if (this.config.elemento) {
      this.root = resolverElemento(this.config.elemento);
    } else if (this.config.selector) {
      this.root = resolverElemento(this.config.selector);
    } else {
      this.root = document.createElement('div');
      this.root.className = CLASES.root;
    }

    if (!(this.root instanceof HTMLElement)) {
      throw new TypeError('ListaBuscable requiere un contenedor HTMLElement válido.');
    }

    this.root.classList.add(CLASES.root);
    this.root.setAttribute('data-app-lista', String(this.config.tipo));
    this.root.setAttribute('aria-haspopup', 'listbox');
    this.root.setAttribute('aria-expanded', 'false');

    if (!this.root.dataset.appListaTipo) {
      this.root.dataset.appListaTipo = String(this.config.tipo);
    }

    if (this.root.querySelector('.app-lista-buscable__wrapper')) {
      this.wrapper = this.root.querySelector('.app-lista-buscable__wrapper');
      this.input = this.root.querySelector('input[type="search"]');
      this.trigger = this.root.querySelector('.app-lista-buscable__toggle');
      this.listbox = this.root.querySelector('.app-lista-buscable__lista');
      this.status = this.root.querySelector('.app-lista-buscable__estado');
      this.botonAgregar = this.root.querySelector('.app-lista-buscable__agregar');
      return;
    }

    this.renderBase();
    this.asociarEventos();
    this.setDisabled(Boolean(this.config.disabled));
    this.actualizarEstado(TEXTOS.cargando);
    this.cargarDatosIniciales();
  }

  renderBase() {
    this.wrapper = crearElementoSeguro('div', {
      clases: [CLASES.wrapper, 'form-group'],
    });

    const fila = crearElementoSeguro('div', {
      clases: ['input-group', 'app-lista-buscable__fila'],
      atributos: {
        role: 'combobox',
        'aria-expanded': 'false',
      },
    });

    this.input = crearElementoSeguro('input', {
      clases: [CLASES.input, 'app-lista-buscable__input'],
      atributos: {
        type: 'search',
        autocomplete: 'off',
        role: 'searchbox',
        'aria-autocomplete': 'list',
        'aria-controls': 'lista-buscable-' + Math.random().toString(36).slice(2),
        placeholder: this.config.placeholder || TEXTOS.buscar,
      },
    });

    this.trigger = crearElementoSeguro('button', {
      texto: '▾',
      clases: [CLASES.trigger, 'app-lista-buscable__toggle'],
      atributos: {
        type: 'button',
        'aria-label': 'Abrir lista',
      },
    });

    this.listbox = crearElementoSeguro('ul', {
      clases: [CLASES.listbox, 'app-lista-buscable__lista', 'is-hidden'],
      atributos: {
        role: 'listbox',
        tabindex: '0',
      },
    });

    this.status = crearElementoSeguro('div', {
      clases: ['app-lista-buscable__estado', CLASES.ayuda],
      atributos: {
        role: 'status',
        'aria-live': 'polite',
      },
      texto: TEXTOS.buscar,
    });

    if (this.config.mostrarBotonAgregar || typeof this.config.onAgregarNuevo === 'function') {
      this.botonAgregar = crearElementoSeguro('button', {
        texto: TEXTOS.agregar,
        clases: [CLASES.btnAdd, 'app-lista-buscable__agregar'],
        atributos: {
          type: 'button',
        },
      });
    }

    fila.append(this.input, this.trigger);
    this.wrapper.append(fila);

    if (this.botonAgregar) {
      this.wrapper.append(this.botonAgregar);
    }

    this.root.append(this.wrapper, this.listbox, this.status);
  }

  asociarEventos() {
    this.trigger.addEventListener('click', () => {
      if (this.config.disabled) return;
      if (this.abierta) {
        this.cerrar();
      } else {
        this.abrir();
      }
    });

    this.input.addEventListener('focus', () => {
      if (!this.config.disabled) {
        this.abrir();
      }
    });

    this.input.addEventListener('input', (evento) => {
      const valor = evento.target.value ?? '';
      this.busqueda = valor;
      this.debouncedSearch(valor);
    });

    this.input.addEventListener('keydown', (evento) => {
      if (this.config.disabled) return;

      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        this.moverFoco(1);
      }

      if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        this.moverFoco(-1);
      }

      if (evento.key === 'Enter') {
        evento.preventDefault();
        if (this.resultados.length > 0) {
          const activo = this.listbox.querySelector('.is-focus');
          if (activo) {
            const indice = Number(activo.dataset.indice || 0);
            this.seleccionar(this.resultados[indice]);
          } else {
            this.seleccionar(this.resultados[0]);
          }
        }
      }

      if (evento.key === 'Escape') {
        evento.preventDefault();
        this.cerrar();
      }
    });

    this.listbox.addEventListener('mousedown', (evento) => {
      const item = evento.target.closest('[data-app-lista-item]');
      if (!item) return;
      const indice = Number(item.dataset.indice || 0);
      const valor = this.resultados[indice];
      if (valor) {
        this.seleccionar(valor);
      }
    });

    document.addEventListener('click', (evento) => {
      if (!this.root.contains(evento.target)) {
        this.cerrar();
      }
    });

    if (this.botonAgregar) {
      this.botonAgregar.addEventListener('click', () => {
        if (typeof this.config.onAgregarNuevo === 'function') {
          this.config.onAgregarNuevo({ lista: this, tipo: this.config.tipo, contexto: this.config.contexto });
        }
      });
    }
  }

  async cargarDatosIniciales() {
    await this.ejecutarBusqueda('');
  }

  async ejecutarBusqueda(termino = '') {
    if (typeof this.config.buscarProvider !== 'function' && typeof this.config.listar !== 'function') {
      this.errorCarga = true;
      this.actualizarEstado(TEXTOS.error);
      this.mostrarError('No se ha configurado un proveedor de datos para esta lista.');
      return [];
    }

    this.enCarga = true;
    this.errorCarga = false;
    this.actualizarEstado(TEXTOS.cargando);
    this.root.classList.add(CLASES.loading);

    const requestId = ++this.ultimoRequest;
    const consulta = String(termino ?? '');

    try {
      const proveedor = this.config.buscarProvider || this.config.listar;
      const respuesta = await proveedor({
        query: consulta,
        tipo: this.config.tipo,
        contexto: this.config.contexto || {},
        filtro: this.config.filtro,
      });

      if (requestId !== this.ultimoRequest) {
        return [];
      }

      const datos = Array.isArray(respuesta) ? respuesta : Array.isArray(respuesta?.items) ? respuesta.items : [];
      this.items = datos;
      this.filtrarYRenderizar(consulta);
      return datos;
    } catch (error) {
      if (requestId !== this.ultimoRequest) {
        return [];
      }

      this.errorCarga = true;
      this.root.classList.add(CLASES.error);
      this.mostrarError(error?.message || TEXTOS.error);
      this.actualizarEstado(TEXTOS.error);
      if (typeof this.config.onError === 'function') {
        this.config.onError(error, { tipo: this.config.tipo, query: consulta, contexto: this.config.contexto });
      }
      return [];
    } finally {
      this.enCarga = false;
      this.root.classList.remove(CLASES.loading);
    }
  }

  filtrarYRenderizar(termino = '') {
    const texto = normalizarTexto(termino);
    let filtrados = [...this.items];

    if (this.config.filtro && typeof this.config.filtro === 'function') {
      filtrados = filtrados.filter((item) => this.config.filtro(item, texto));
    }

    if (texto) {
      filtrados = filtrados.filter((item) => {
        const etiqueta = normalizarTexto(this.config.getLabel(item, this.config));
        const codigo = normalizarTexto(this.config.getCodigo(item, this.config));
        const detalle = normalizarTexto(this.config.getDetalle(item, this.config));
        const valor = normalizarTexto(defaultValueExtractor(item, this.config));
        return (
          etiqueta.includes(texto) ||
          codigo.includes(texto) ||
          detalle.includes(texto) ||
          valor.includes(texto)
        );
      });
    }

    const max = Number(this.config.maxResultados || 100);
    this.resultados = filtrados.slice(0, max);
    this.renderResultados();
  }

  renderResultados() {
    this.listbox.innerHTML = '';

    if (this.enCarga) {
      this.actualizarEstado(TEXTOS.cargando);
      return;
    }

    if (this.errorCarga) {
      this.actualizarEstado(TEXTOS.error);
      return;
    }

    if (this.resultados.length === 0) {
      const item = crearElementoSeguro('li', {
        clases: ['app-lista-buscable__vacio'],
        texto: TEXTOS.sinResultados,
      });
      item.setAttribute('role', 'option');
      item.setAttribute('aria-disabled', 'true');
      this.listbox.append(item);
      this.actualizarEstado(TEXTOS.sinResultados);
      this.listbox.classList.remove(CLASES.hidden);
      this.abierta = true;
      this.root.setAttribute('aria-expanded', 'true');
      return;
    }

    this.resultados.forEach((item, indice) => {
      const label = this.config.getLabel(item, this.config) || TEXTOS.seleccionar;
      const codigo = this.config.getCodigo(item, this.config) || '';
      const detalle = this.config.getDetalle(item, this.config) || '';
      const valorId = this.config.getId(item, this.config);
      const seleccionado = this.seleccionado && this.obtenerId(this.seleccionado) === valorId;

      const li = crearElementoSeguro('li', {
        clases: [CLASES.item, seleccionado ? CLASES.itemSelected : ''],
        atributos: {
          role: 'option',
          'aria-selected': seleccionado ? 'true' : 'false',
          tabindex: '0',
          'data-app-lista-item': 'true',
          'data-indice': String(indice),
        },
      });

      const textoPrincipal = crearElementoSeguro('div', { texto: label, clases: ['app-lista-buscable__titulo'] });
      const codigoEl = codigo ? crearElementoSeguro('small', { texto: codigo, clases: ['app-lista-buscable__codigo'] }) : null;
      const detalleEl = detalle ? crearElementoSeguro('small', { texto: detalle, clases: ['app-lista-buscable__detalle'] }) : null;

      if (textoPrincipal) li.append(textoPrincipal);
      if (codigoEl) li.append(codigoEl);
      if (detalleEl) li.append(detalleEl);

      li.addEventListener('mouseenter', () => {
        this.listbox.querySelectorAll('.is-focus').forEach((element) => element.classList.remove('is-focus'));
        li.classList.add('is-focus');
      });

      li.addEventListener('click', () => this.seleccionar(item));
      this.listbox.append(li);
    });

    this.actualizarEstado(`${this.resultados.length} resultado${this.resultados.length === 1 ? '' : 's'}`);
    this.listbox.classList.remove(CLASES.hidden);
    this.abierta = true;
    this.root.setAttribute('aria-expanded', 'true');
  }

  obtenerId(item) {
    if (!item) return null;
    if (typeof this.config.getId === 'function') {
      return this.config.getId(item, this.config);
    }
    return item.id ?? item.codigo ?? null;
  }

  seleccionar(item) {
    if (!item || this.config.disabled) return null;

    this.seleccionado = item;
    this.input.value = this.config.getLabel(item, this.config) || '';
    this.root.dataset.appListaSeleccionado = String(this.obtenerId(item) ?? '');
    this.root.setAttribute('aria-activedescendant', String(this.obtenerId(item) ?? ''));

    if (typeof this.config.onSeleccion === 'function') {
      this.config.onSeleccion(item, {
        tipo: this.config.tipo,
        input: this.input,
        lista: this,
      });
    }

    if (typeof this.config.onCambio === 'function') {
      this.config.onCambio(item, {
        tipo: this.config.tipo,
        input: this.input,
        lista: this,
      });
    }

    emitSelectionEvent(this.root, {
      item,
      id: this.obtenerId(item),
      valor: this.config.getValor(item, this.config),
      tipo: this.config.tipo,
      codigo: this.config.getCodigo(item, this.config),
    });

    this.cerrar();
    return item;
  }

  abrir() {
    if (this.config.disabled) return;
    this.abierta = true;
    this.root.setAttribute('aria-expanded', 'true');
    this.listbox.classList.remove(CLASES.hidden);
    this.trigger.setAttribute('aria-label', 'Cerrar lista');

    if (this.resultados.length === 0) {
      this.actualizarEstado(TEXTOS.sinResultados);
    }
  }

  cerrar() {
    this.abierta = false;
    this.root.setAttribute('aria-expanded', 'false');
    this.listbox.classList.add(CLASES.hidden);
    this.trigger.setAttribute('aria-label', 'Abrir lista');
  }

  moverFoco(direccion) {
    const items = [...this.listbox.querySelectorAll('[data-app-lista-item]')];
    if (items.length === 0) return;

    const actuales = items.filter((item) => item.classList.contains('is-focus'));
    let indiceActual = actuales.length > 0 ? Number(actuales[0].dataset.indice || 0) : -1;

    if (direccion > 0) {
      indiceActual = Math.min(indiceActual + 1, items.length - 1);
    } else {
      indiceActual = Math.max(indiceActual - 1, 0);
    }

    items.forEach((item) => item.classList.remove('is-focus'));
    const objetivo = items[Math.max(0, Math.min(indiceActual, items.length - 1))];
    objetivo.classList.add('is-focus');
    objetivo.focus();
  }

  mostrarError(mensaje) {
    this.status.textContent = mensaje || TEXTOS.error;
    this.status.classList.add(CLASES.error);
    this.listbox.classList.add(CLASES.hidden);
    this.root.classList.add(CLASES.error);
  }

  actualizarEstado(mensaje) {
    this.status.textContent = mensaje || TEXTOS.buscar;
    this.status.classList.remove(CLASES.error);
    this.root.classList.remove(CLASES.error);
  }

  limpiar() {
    this.input.value = '';
    this.busqueda = '';
    this.seleccionado = null;
    this.root.dataset.appListaSeleccionado = '';
    this.filtrarYRenderizar('');
  }

  setDisabled(disabled = true) {
    this.config.disabled = Boolean(disabled);
    this.input.disabled = this.config.disabled;
    this.trigger.disabled = this.config.disabled;

    if (this.config.disabled) {
      this.root.classList.add(CLASES.disabled);
      this.root.setAttribute('aria-disabled', 'true');
      this.cerrar();
    } else {
      this.root.classList.remove(CLASES.disabled);
      this.root.removeAttribute('aria-disabled');
    }
  }

  setItems(items = []) {
    this.items = Array.isArray(items) ? items : [];
    this.filtrarYRenderizar(this.busqueda);
  }

  setContexto(contexto = {}) {
    this.config.contexto = contexto;
  }

  getSeleccionado() {
    return this.seleccionado;
  }

  setSeleccionado(item) {
    if (!item) {
      this.seleccionado = null;
      this.input.value = '';
      return;
    }

    this.seleccionado = item;
    this.input.value = this.config.getLabel(item, this.config) || '';
  }
}

export function crearListaBuscable(config = {}) {
  return new ListaBuscable(config);
}

export function crearListaMedicamentos(config = {}) {
  return new ListaBuscable({
    tipo: 'medicamentos',
    placeholder: 'Buscar medicamento…',
    mostrarBotonAgregar: true,
    ...config,
  });
}

export function crearListaInsumos(config = {}) {
  return new ListaBuscable({
    tipo: 'insumos',
    placeholder: 'Buscar insumo…',
    mostrarBotonAgregar: true,
    ...config,
  });
}

export function crearListaLotes(config = {}) {
  return new ListaBuscable({
    tipo: 'lotes',
    placeholder: 'Buscar lote…',
    getLabel: (item) => item?.numeroLote || item?.lote || item?.numero || '',
    getCodigo: (item) => item?.codigoLote || item?.codigo || '',
    getDetalle: (item) => {
      const partes = [];
      if (item?.fechaVencimiento) partes.push(`Vence: ${item.fechaVencimiento}`);
      if (item?.existenciaDisponible !== undefined && item?.existenciaDisponible !== null) {
        partes.push(`Disponible: ${item.existenciaDisponible}`);
      }
      return partes.join(' • ');
    },
    ...config,
  });
}

export function crearListaDepartamentos(config = {}) {
  return new ListaBuscable({
    tipo: 'departamentos',
    placeholder: 'Buscar departamento…',
    getLabel: (item) => item?.nombre || item?.descripcion || item?.departamento || '',
    getCodigo: (item) => item?.codigo || item?.codigoDepartamento || '',
    ...config,
  });
}

export function crearListaServicios(config = {}) {
  return new ListaBuscable({
    tipo: 'servicios',
    placeholder: 'Buscar servicio…',
    getLabel: (item) => item?.nombre || item?.descripcion || item?.servicio || '',
    getCodigo: (item) => item?.codigo || item?.codigoServicio || '',
    ...config,
  });
}

export function crearListaGenerica(config = {}) {
  return new ListaBuscable(config);
}

export default {
  ListaBuscable,
  crearListaBuscable,
  crearListaMedicamentos,
  crearListaInsumos,
  crearListaLotes,
  crearListaDepartamentos,
  crearListaServicios,
  crearListaGenerica,
};
