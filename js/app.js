// ==========================================
// SISTEMA DE INVENTARIO INTEGRADO V1.0
// ==========================================

// Configuración de categorías por defecto
const CATEGORIAS_DEFAULT = [
    { id: 'sa', nombre: 'Categoría SA', icono: '🌭', descripcion: 'Completería', protegida: false },
    { id: 'panaderia', nombre: 'Panadería', icono: '🥖', descripcion: 'Productos de panadería', protegida: false }
];

// Datos por defecto
const DATOS_DEFAULT = {
    sa: [
        { id: 'sa-1', nombre: 'Pan de Completo', cantidad: 50, unidad: 'unidades', minimo: 20 },
        { id: 'sa-2', nombre: 'Vienesas', cantidad: 100, unidad: 'unidades', minimo: 30 },
        { id: 'sa-3', nombre: 'Tomate', cantidad: 5, unidad: 'kg', minimo: 2 },
        { id: 'sa-4', nombre: 'Palta', cantidad: 10, unidad: 'unidades', minimo: 5 },
        { id: 'sa-5', nombre: 'Mayonesa', cantidad: 3, unidad: 'litros', minimo: 1 }
    ],
    panaderia: [
        { id: 'pan-1', nombre: 'Muffin', cantidad: 24, unidad: 'unidades', minimo: 12 },
        { id: 'pan-2', nombre: 'Marraqueta', cantidad: 30, unidad: 'unidades', minimo: 15 },
        { id: 'pan-3', nombre: 'Hallullas', cantidad: 40, unidad: 'unidades', minimo: 20 },
        { id: 'pan-4', nombre: 'Dobladitas', cantidad: 25, unidad: 'unidades', minimo: 10 },
        { id: 'pan-5', nombre: 'Ciabatta', cantidad: 15, unidad: 'unidades', minimo: 8 }
    ],
    cajeros: [
        { 
            id: 'admin-1', 
            nombre: 'Administrador', 
            rut: '0.000.000-0', 
            turno: 'ADMIN', 
            codigo: 'ADMIN', 
            password: '637177',
            cargo: 'Corporativo',
            activo: true 
        }
    ],
    auditoria: [],
    sesion: null
};

// Claves para LocalStorage
const STORAGE_KEYS = {
    categorias: 'inventario_categorias',
    cajeros: 'inventario_cajeros',
    auditoria: 'inventario_auditoria',
    sesion: 'inventario_sesion'
};

// Variable global para cajero actual
let cajeroActual = null;

// ==========================================
// INICIALIZACIÓN CORRECTA (VERSIÓN FINAL)
// ==========================================

function inicializarDatos() {
    // Inicializar categorías si no existen
    if (!localStorage.getItem(STORAGE_KEYS.categorias)) {
        localStorage.setItem(STORAGE_KEYS.categorias, JSON.stringify(CATEGORIAS_DEFAULT));
    }
    
    // Inicializar datos de cada categoría
    const categorias = obtenerCategorias();
    categorias.forEach(cat => {
        const key = `inventario_${cat.id}`;
        if (!localStorage.getItem(key) && DATOS_DEFAULT[cat.id]) {
            localStorage.setItem(key, JSON.stringify(DATOS_DEFAULT[cat.id]));
        } else if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify([]));
        }
    });
    
    // Inicializar cajeros (solo si no existen)
    const cajerosKey = STORAGE_KEYS.cajeros;
    const cajerosExistentes = localStorage.getItem(cajerosKey);
    
    if (!cajerosExistentes) {
        localStorage.setItem(cajerosKey, JSON.stringify(DATOS_DEFAULT.cajeros));
    }
    
    // Inicializar auditoría
    if (!localStorage.getItem(STORAGE_KEYS.auditoria)) {
        localStorage.setItem(STORAGE_KEYS.auditoria, JSON.stringify([]));
    }
    
    actualizarNavegacion();
    mostrarUsuarioActual();
    
    // NOTA: cargarDashboardDividido() se llama explícitamente desde index.html
    // después de inicializarDatos() para evitar problemas de timing
}

// ==========================================
// SISTEMA DE CATEGORÍAS DINÁMICAS
// ==========================================

function obtenerCategorias() {
    const cats = localStorage.getItem(STORAGE_KEYS.categorias);
    return cats ? JSON.parse(cats) : [...CATEGORIAS_DEFAULT];
}

function guardarCategorias(categorias) {
    localStorage.setItem(STORAGE_KEYS.categorias, JSON.stringify(categorias));
    actualizarNavegacion();
    // La actualización del dashboard se maneja desde index.html
}

function verCategoria(id) {
    window.location.href = `categoria.html?cat=${id}`;
}

function obtenerCategoriaDeURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('cat');
        return cat || null;
    } catch (e) {
        console.error('Error al obtener categoría de URL:', e);
        return null;
    }
}

function cargarCategoriaDinamica() {
    const categoriaId = obtenerCategoriaDeURL();
    
    if (!categoriaId) {
        mostrarNotificacion('No se especificó categoría', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }
    
    const categorias = obtenerCategorias();
    const categoria = categorias.find(c => c.id === categoriaId);
    
    if (!categoria) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }
    
    document.title = `${categoria.nombre} - Inventario`;
    
    const titulo = document.getElementById('cat-titulo');
    if (titulo) titulo.textContent = `${categoria.icono} ${categoria.nombre}`;
    
    const descripcion = document.getElementById('cat-descripcion');
    if (descripcion) descripcion.textContent = categoria.descripcion || `Gestión de inventario de ${categoria.nombre}`;
    
    const btnAgregar = document.getElementById('btn-agregar-item');
    if (btnAgregar) {
        btnAgregar.onclick = () => abrirModalNuevo(categoriaId);
    }
    
    cargarItemsEnGrid(categoriaId);
}

function cargarFiltrosCategoriasAuditoria() {
    const select = document.getElementById('filtro-categoria');
    if (!select) return;

    const categorias = obtenerCategorias();
    let options = '<option value="todas">Todas las categorías</option>';
    
    categorias.forEach(cat => {
        options += `<option value="${cat.id}">${cat.nombre} ${cat.icono}</option>`;
    });
    
    select.innerHTML = options;
}

function crearCategoria(id, nombre, icono = '📦', descripcion = '') {
    const categorias = obtenerCategorias();
    
    if (categorias.find(c => c.id === id)) {
        mostrarNotificacion('Ya existe una categoría con ese ID', 'error');
        return false;
    }
    
    if (!/^[a-z0-9-]+$/.test(id)) {
        mostrarNotificacion('El ID solo puede contener letras minúsculas, números y guiones', 'error');
        return false;
    }
    
    const nuevaCategoria = {
        id: id,
        nombre: nombre,
        icono: icono,
        descripcion: descripcion,
        protegida: false,
        fechaCreacion: new Date().toISOString()
    };
    
    categorias.push(nuevaCategoria);
    guardarCategorias(categorias);
    
    guardarDatos(id, []);
    
    registrarAuditoria({
        cajeroId: cajeroActual?.id || 'system',
        cajeroNombre: cajeroActual?.nombre || 'Sistema',
        cajeroCodigo: cajeroActual?.codigo || 'SYS',
        tipo: 'creacion_categoria',
        categoria: id,
        itemNombre: nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    mostrarNotificacion(`Categoría "${nombre}" creada correctamente`, 'success');
    
    setTimeout(() => {
        verCategoria(id);
    }, 800);
    
    return true;
}

// Alias para compatibilidad con categorias.html
const crearCategoriaCompleta = crearCategoria;

function eliminarCategoria(id) {
    const categorias = obtenerCategorias();
    const categoria = categorias.find(c => c.id === id);
    
    if (!categoria) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        return false;
    }
    
    if (categoria.protegida) {
        mostrarNotificacion('No se puede eliminar una categoría protegida', 'error');
        return false;
    }
    
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"? Se perderán todos los items.`)) {
        return false;
    }
    
    localStorage.removeItem(`inventario_${id}`);
    
    const nuevasCategorias = categorias.filter(c => c.id !== id);
    guardarCategorias(nuevasCategorias);
    
    registrarAuditoria({
        cajeroId: cajeroActual?.id || 'system',
        cajeroNombre: cajeroActual?.nombre || 'Sistema',
        cajeroCodigo: cajeroActual?.codigo || 'SYS',
        tipo: 'eliminacion_categoria',
        categoria: id,
        itemNombre: categoria.nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    mostrarNotificacion(`Categoría "${categoria.nombre}" eliminada`, 'success');
    return true;
}

function editarCategoria(id, nuevoNombre, nuevoIcono, nuevaDescripcion) {
    const categorias = obtenerCategorias();
    const index = categorias.findIndex(c => c.id === id);
    
    if (index === -1) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        return false;
    }
    
    categorias[index].nombre = nuevoNombre;
    categorias[index].icono = nuevoIcono;
    categorias[index].descripcion = nuevaDescripcion;
    
    guardarCategorias(categorias);
    mostrarNotificacion('Categoría actualizada correctamente', 'success');
    return true;
}

// ==========================================
// FUNCIONES DE DATOS GENERALES
// ==========================================

function obtenerStorageKey(categoria) {
    return `inventario_${categoria}`;
}

function obtenerDatos(categoria) {
    const key = obtenerStorageKey(categoria);
    const datos = localStorage.getItem(key);
    return datos ? JSON.parse(datos) : [];
}

function guardarDatos(categoria, datos) {
    const key = obtenerStorageKey(categoria);
    localStorage.setItem(key, JSON.stringify(datos));
    // La actualización del dashboard se maneja desde index.html
}

// ==========================================
// SISTEMA DE SESIONES
// ==========================================

function obtenerSesionActiva() {
    const sesion = localStorage.getItem(STORAGE_KEYS.sesion);
    if (sesion) {
        const datosSesion = JSON.parse(sesion);
        const ahora = new Date().getTime();
        const expiracion = 8 * 60 * 60 * 1000; // 8 horas
        
        if (ahora - datosSesion.inicio < expiracion) {
            return datosSesion;
        } else {
            cerrarSesion();
            return null;
        }
    }
    return null;
}

function iniciarSesion(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('login-codigo').value.toUpperCase().trim();
    const password = document.getElementById('login-password').value;
    
    if (!/^\d{1,6}$/.test(password)) {
        document.getElementById('login-error').textContent = '❌ La contraseña debe contener entre 1 y 6 dígitos numéricos';
        document.getElementById('login-error').style.display = 'block';
        return;
    }
    
    const cajeros = obtenerDatos('cajeros');
    const cajero = cajeros.find(c => c.codigo === codigo && c.password === password && c.activo);
    
    if (!cajero) {
        document.getElementById('login-error').textContent = '❌ Código o contraseña incorrectos';
        document.getElementById('login-error').style.display = 'block';
        return;
    }
    
    const sesion = {
        cajeroId: cajero.id,
        cajeroNombre: cajero.nombre,
        cajeroCodigo: cajero.codigo,
        cajeroCargo: cajero.cargo,
        inicio: new Date().getTime()
    };
    
    localStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(sesion));
    window.location.href = 'index.html';
}

function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEYS.sesion);
    cajeroActual = null;
    window.location.href = 'login.html';
}

function verificarSesion() {
    const sesion = obtenerSesionActiva();
    if (!sesion) {
        window.location.href = 'login.html';
        return false;
    }
    
    cajeroActual = {
        id: sesion.cajeroId,
        nombre: sesion.cajeroNombre,
        codigo: sesion.cajeroCodigo,
        cargo: sesion.cajeroCargo
    };
    
    return true;
}

function mostrarUsuarioActual() {
    const sesion = obtenerSesionActiva();
    if (sesion) {
        const userDiv = document.getElementById('user-info');
        if (userDiv) {
            userDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #f1f5f9; border-radius: 8px;">
                    <span>👤 <strong>${sesion.cajeroNombre}</strong> (${sesion.cajeroCodigo})</span>
                    <button onclick="cerrarSesion()" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Cerrar Sesión</button>
                </div>
            `;
        }
    }
}

function actualizarNavegacion() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    
    const categorias = obtenerCategorias();
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    const categoriaActual = obtenerCategoriaDeURL();
    
    // Verificar si estamos en una página de categoría
    const esPaginaCategoria = paginaActual === 'categoria.html' && categoriaActual;
    
    // NAVEGACIÓN PRINCIPAL + CATEGORÍAS EN LÍNEA (misma fila)
    let html = `
        <div class="nav-wrapper">
            <div class="main-nav">
                <a href="index.html" class="nav-btn ${paginaActual === 'index.html' ? 'active' : ''}">🏠 Inicio</a>
                <a href="conteo_cigarrillos.html" class="nav-btn ${paginaActual === 'conteo_cigarrillos.html' ? 'active' : ''}">🚬 Cigarrillos</a>
                <a href="historial_conteos.html" class="nav-btn ${paginaActual === 'historial_conteos.html' ? 'active' : ''}">📜 Historial</a>
                <a href="cajeros.html" class="nav-btn ${paginaActual === 'cajeros.html' ? 'active' : ''}">👤 Cajeros</a>
                <a href="auditoria.html" class="nav-btn ${paginaActual === 'auditoria.html' ? 'active' : ''}">📋 Auditoría</a>
                <a href="inventario.html" class="nav-btn ${paginaActual === 'inventario.html' ? 'active' : ''}">📊 Reportes</a>
                <a href="categorias.html" class="nav-btn ${paginaActual === 'categorias.html' ? 'active' : ''}">⚙️ Config</a>
                
                <!-- BOTÓN DESPLEGABLE DE CATEGORÍAS (misma línea) -->
                <div class="categories-dropdown-container ${esPaginaCategoria ? 'active' : ''}" id="categories-dropdown">
                    <button class="nav-btn categories-toggle" onclick="toggleCategoriesDropdown(event)">
                        <span>📁 Categorías</span>
                        <span class="categories-arrow">▼</span>
                    </button>
                    <div class="categories-dropdown-menu" id="categories-menu">
                        ${generarListaCategoriasDropdown(categorias, categoriaActual)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    nav.innerHTML = html;
}

// Nueva función para generar lista de categorías en dropdown
function generarListaCategoriasDropdown(categorias, categoriaActualId) {
    if (categorias.length === 0) {
        return `
            <div class="dropdown-empty">
                <div class="empty-icon">📁</div>
                <p>No hay categorías</p>
                <a href="categorias.html">Crear categoría</a>
            </div>
        `;
    }
    
    return categorias.map(cat => {
        const items = obtenerDatos(cat.id);
        const count = items.length;
        const alertas = items.filter(i => i.cantidad <= i.minimo).length;
        const esActiva = cat.id === categoriaActualId;
        
        let alertaHtml = alertas > 0 ? `<span class="dropdown-alert">${alertas}</span>` : '';
        
        return `
            <a href="categoria.html?cat=${cat.id}" class="dropdown-item ${esActiva ? 'active' : ''}">
                <span class="dropdown-icon">${cat.icono}</span>
                <span class="dropdown-name">${cat.nombre}</span>
                <span class="dropdown-count">${count}</span>
                ${alertaHtml}
            </a>
        `;
    }).join('');
}

// Toggle del dropdown de categorías
function toggleCategoriesDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('categories-dropdown');
    dropdown.classList.toggle('open');
}

// Cerrar al hacer click fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('categories-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});


// ==========================================
// FUNCIONES DE INVENTARIO (CRUD Items)
// ==========================================

function cargarItemsEnGrid(categoriaId) {
    const contenedor = document.getElementById('items-grid');
    if (!contenedor) return;
    
    const items = obtenerDatos(categoriaId);
    
    if (items.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">📦</div>
                <h3>No hay items en esta categoría</h3>
                <p>Agrega tu primer item usando el botón superior</p>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = items.map(item => crearCardItem(item, categoriaId)).join('');
}

function crearCardItem(item, categoria) {
    const porcentaje = Math.min((item.cantidad / item.minimo) * 100, 100);
    let estadoClase = 'success';
    let cardClase = '';
    
    if (item.cantidad <= item.minimo * 0.5) {
        estadoClase = 'danger';
        cardClase = 'low-stock';
    } else if (item.cantidad <= item.minimo) {
        estadoClase = 'warning';
        cardClase = 'medium-stock';
    }
    
    return `
        <div class="item-card ${cardClase}" id="item-${item.id}">
            <div class="item-header">
                <div>
                    <div class="item-title">${item.nombre}</div>
                    <small style="color: var(--text-light);">ID: ${item.id}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-edit" onclick="abrirModalEdicion('${categoria}', '${item.id}')" title="Editar">✏️</button>
                    <button class="btn-icon btn-delete" onclick="eliminarItem('${item.id}', '${categoria}')" title="Eliminar">🗑️</button>
                </div>
            </div>
            
            <div class="item-stats">
                <div class="stat">
                    <div class="stat-label">Stock Actual</div>
                    <div class="stat-value">${item.cantidad}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Unidad</div>
                    <div class="stat-value" style="font-size: 1rem;">${item.unidad}</div>
                </div>
            </div>
            
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                <small style="color: var(--text-light);">Mínimo: ${item.minimo}</small>
                <small style="color: var(--${estadoClase === 'success' ? 'success' : estadoClase === 'warning' ? 'warning' : 'danger'}); font-weight: 600;">
                    ${item.cantidad <= item.minimo ? '⚠️ Stock Bajo' : '✓ OK'}
                </small>
            </div>
            
            <div class="stock-bar">
                <div class="stock-fill ${estadoClase}" style="width: ${porcentaje}%"></div>
            </div>
            
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button onclick="ajustarStock('${item.id}', '${categoria}', -1)" class="btn-icon" style="background: #fee2e2; flex: 1;">-</button>
                <button onclick="ajustarStock('${item.id}', '${categoria}', 1)" class="btn-icon" style="background: #d1fae5; flex: 1;">+</button>
            </div>
        </div>
    `;
}

function abrirModalNuevo(categoria) {
    if (!verificarSesion()) return;
    
    const modal = document.getElementById('modal-item');
    const titulo = document.getElementById('modal-title');
    const form = document.getElementById('form-item');
    
    titulo.textContent = 'Agregar Nuevo Item';
    form.reset();
    document.getElementById('item-id').value = '';
    
    modal.dataset.categoria = categoria;
    modal.dataset.modo = 'nuevo';
    
    modal.style.display = 'block';
}

function abrirModalEdicion(categoria, itemId) {
    if (!verificarSesion()) return;
    
    const modal = document.getElementById('modal-item');
    const titulo = document.getElementById('modal-title');
    
    const items = obtenerDatos(categoria);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    titulo.textContent = 'Editar Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-nombre').value = item.nombre;
    document.getElementById('item-cantidad').value = item.cantidad;
    document.getElementById('item-unidad').value = item.unidad;
    document.getElementById('item-minimo').value = item.minimo;
    
    modal.dataset.categoria = categoria;
    modal.dataset.modo = 'editar';
    modal.dataset.stockAnterior = item.cantidad;
    
    modal.style.display = 'block';
}

function cerrarModal() {
    const modal = document.getElementById('modal-item');
    if (modal) {
        modal.style.display = 'none';
    }
}

function guardarItem(event) {
    event.preventDefault();
    
    if (!verificarSesion()) return;
    
    const modal = document.getElementById('modal-item');
    const categoria = modal.dataset.categoria;
    const modo = modal.dataset.modo;
    
    const id = document.getElementById('item-id').value;
    const nombre = document.getElementById('item-nombre').value;
    const cantidad = parseInt(document.getElementById('item-cantidad').value);
    const unidad = document.getElementById('item-unidad').value;
    const minimo = parseInt(document.getElementById('item-minimo').value);
    
    let items = obtenerDatos(categoria);
    let tipoOperacion = '';
    let stockAnterior = 0;
    let itemIdFinal = '';
    let itemNombre = nombre;
    
    if (modo === 'editar' && id) {
        const index = items.findIndex(i => i.id === id);
        if (index === -1) {
            mostrarNotificacion('Item no encontrado', 'error');
            return;
        }
        
        stockAnterior = items[index].cantidad;
        itemNombre = items[index].nombre;
        itemIdFinal = id;
        
        tipoOperacion = items[index].cantidad !== cantidad ? 'edicion' : 'edicion_datos';
        items[index] = { id, nombre, cantidad, unidad, minimo };
    } else {
        const nuevoId = `${categoria}-${Date.now()}`;
        items.push({ id: nuevoId, nombre, cantidad, unidad, minimo });
        tipoOperacion = 'creacion';
        stockAnterior = 0;
        itemIdFinal = nuevoId;
    }
    
    guardarDatos(categoria, items);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: itemIdFinal,
        itemNombre: itemNombre,
        tipo: tipoOperacion,
        cantidad: cantidad,
        stockAnterior: stockAnterior,
        stockNuevo: cantidad
    });
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    cerrarModal();
    mostrarNotificacion(modo === 'editar' ? 'Item actualizado correctamente' : 'Item agregado correctamente', 'success');
}

function eliminarItem(id, categoria) {
    if (!verificarSesion()) return;
    
    if (!confirm('¿Estás seguro de eliminar este item?')) return;
    
    let items = obtenerDatos(categoria);
    const item = items.find(i => i.id === id);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: id,
        itemNombre: item.nombre,
        tipo: 'eliminacion',
        cantidad: 0,
        stockAnterior: item.cantidad,
        stockNuevo: 0
    });
    
    items = items.filter(i => i.id !== id);
    guardarDatos(categoria, items);
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    mostrarNotificacion('Item eliminado correctamente', 'success');
}

function ajustarStock(id, categoria, cambio) {
    if (!verificarSesion()) return;
    
    let items = obtenerDatos(categoria);
    const item = items.find(i => i.id === id);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    const stockAnterior = item.cantidad;
    
    if (item.cantidad + cambio < 0) {
        mostrarNotificacion('No puede tener stock negativo', 'error');
        return;
    }
    
    item.cantidad += cambio;
    guardarDatos(categoria, items);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: id,
        itemNombre: item.nombre,
        tipo: cambio > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(cambio),
        stockAnterior: stockAnterior,
        stockNuevo: item.cantidad
    });
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    mostrarNotificacion(`Stock ${cambio > 0 ? 'aumentado' : 'disminuido'}: ${item.nombre}`, 'success');
}

// ==========================================
// SISTEMA DE AUDITORÍA
// ==========================================

function registrarAuditoria(datos) {
    const auditoria = obtenerDatos('auditoria');
    const registro = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: new Date().toISOString(),
        ...datos
    };
    
    auditoria.unshift(registro);
    
    if (auditoria.length > 1000) {
        auditoria.pop();
    }
    
    guardarDatos('auditoria', auditoria);
}

function cargarAuditoria() {
    const tbody = document.getElementById('tabla-auditoria');
    if (!tbody) return;
    
    let registros = obtenerDatos('auditoria');
    
    const filtroCategoria = document.getElementById('filtro-categoria')?.value || 'todas';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    const filtroFecha = document.getElementById('filtro-fecha')?.value;
    const filtroCajero = document.getElementById('filtro-cajero')?.value.toLowerCase() || '';
    
    if (filtroCategoria !== 'todas') {
        registros = registros.filter(r => r.categoria === filtroCategoria);
    }
    
    if (filtroTipo !== 'todos') {
        registros = registros.filter(r => r.tipo === filtroTipo);
    }
    
    if (filtroFecha) {
        const fechaFiltro = new Date(filtroFecha).toDateString();
        registros = registros.filter(r => new Date(r.fecha).toDateString() === fechaFiltro);
    }
    
    if (filtroCajero) {
        registros = registros.filter(r => 
            r.cajeroNombre.toLowerCase().includes(filtroCajero) ||
            r.cajeroCodigo.toLowerCase().includes(filtroCajero)
        );
    }
    
    if (registros.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state" style="text-align: center; padding: 40px;">
                    <div class="empty-state-icon">📋</div>
                    <p>No hay registros para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = registros.map(reg => {
        const fecha = new Date(reg.fecha);
        const fechaStr = fecha.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let tipoClass = '';
        let tipoTexto = '';
        
        switch(reg.tipo) {
            case 'entrada':
                tipoClass = 'tipo-entrada';
                tipoTexto = '➕ Entrada';
                break;
            case 'salida':
                tipoClass = 'tipo-salida';
                tipoTexto = '➖ Salida';
                break;
            case 'edicion':
            case 'edicion_datos':
                tipoClass = 'tipo-edicion';
                tipoTexto = '✏️ Edición';
                break;
            case 'creacion':
                tipoClass = 'tipo-entrada';
                tipoTexto = '🆕 Nuevo';
                break;
            case 'eliminacion':
                tipoClass = 'tipo-salida';
                tipoTexto = '🗑️ Eliminación';
                break;
            case 'creacion_categoria':
                tipoClass = 'tipo-entrada';
                tipoTexto = '📁 Nueva Cat.';
                break;
            case 'eliminacion_categoria':
                tipoClass = 'tipo-salida';
                tipoTexto = '🗑️ Elim. Cat.';
                break;
            default:
                tipoTexto = reg.tipo;
        }
        
        return `
            <tr>
                <td>${fechaStr}</td>
                <td><strong>${reg.cajeroNombre}</strong></td>
                <td>${reg.cajeroCodigo}</td>
                <td><span class="badge" style="background: ${getCategoriaColor(reg.categoria)}; color: white;">${reg.categoria.toUpperCase()}</span></td>
                <td>${reg.itemNombre}</td>
                <td class="${tipoClass}">${tipoTexto}</td>
                <td>${reg.cantidad > 0 ? reg.cantidad : '-'}</td>
                <td>${reg.stockAnterior}</td>
                <td>${reg.stockNuevo}</td>
            </tr>
        `;
    }).join('');
}

function getCategoriaColor(categoriaId) {
    const categorias = obtenerCategorias();
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? '#3b82f6' : '#6b7280';
}


// ==========================================
// GESTIÓN DE CAJEROS
// ==========================================

function cargarCajeros() {
    const contenedor = document.getElementById('lista-cajeros');
    if (!contenedor) return;
    
    const cajeros = obtenerDatos('cajeros');
    
    const contador = document.getElementById('contador-cajeros');
    if (contador) {
        contador.textContent = `${cajeros.length} activo${cajeros.length !== 1 ? 's' : ''}`;
    }
    
    if (!cajeros || cajeros.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <div class="empty-state-icon" style="font-size: 3rem;">👤</div>
                <h3 style="margin-top: 16px; color: #64748b;">No hay cajeros registrados</h3>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = cajeros.map(c => crearCardCajero(c)).join('');
}

function crearCardCajero(cajero) {
    if (!cajero || !cajero.id) return '';

    const passwordMask = cajero.password ? '•'.repeat(Math.min(cajero.password.length, 8)) : '••••';
    const isAdmin = cajero.codigo === 'ADMIN';
    const usuarioEsAdmin = cajeroActual && cajeroActual.codigo === 'ADMIN';

    const adminBadge = isAdmin ? '<span class="admin-badge">ADMIN</span>' : '';
    const adminClass = isAdmin ? 'cajero-admin' : '';

    let acciones = '';

    if (!isAdmin) {
        acciones += `
            <button class="btn-icon btn-edit" onclick="editarCajero('${cajero.id}')" title="Editar">✏️</button>
        `;

        if (usuarioEsAdmin) {
            acciones += `
                <button class="btn-icon btn-delete" onclick="eliminarCajero('${cajero.id}')" title="Eliminar">🗑️</button>
            `;
        }
    }

    return `
        <div class="cajero-item ${adminClass}" id="cajero-${cajero.id}">
            <div class="cajero-info">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <h4 style="margin:0;">${cajero.nombre}</h4>
                    ${adminBadge}
                </div>
                <p style="margin:2px 0;font-size:0.9rem;color:#64748b;">
                    🆔 ${cajero.rut} | 🏷️ ${cajero.codigo}
                </p>
                <p style="margin:2px 0;font-size:0.9rem;color:#64748b;">
                    🕐 ${cajero.turno} | 👔 ${cajero.cargo}
                </p>
                <p style="margin:2px 0;font-size:0.85rem;color:#94a3b8;">
                    🔑 ${passwordMask} (${cajero.password ? cajero.password.length : 0} dígitos)
                </p>
            </div>
            ${acciones ? `<div class="cajero-actions">${acciones}</div>` : ''}
        </div>
    `;
}

function guardarCajero(event) {
    event.preventDefault();
    
    const id = document.getElementById('cajero-id').value;
    const password = document.getElementById('cajero-password').value;
    const esAdmin = id === 'admin-1';
    
    if (password) {
        if (!/^\d+$/.test(password)) {
            mostrarNotificacion('La contraseña debe contener solo números', 'error');
            return;
        }
        
        if (esAdmin && password.length !== 6) {
            mostrarNotificacion('La contraseña del admin debe tener exactamente 6 dígitos', 'error');
            return;
        }
        
        if (!esAdmin && (password.length < 1 || password.length > 6)) {
            mostrarNotificacion('La contraseña debe tener entre 1 y 6 dígitos numéricos', 'error');
            return;
        }
    }
    
    const cajero = {
        id: id || `caj-${Date.now()}`,
        nombre: document.getElementById('cajero-nombre').value,
        rut: document.getElementById('cajero-rut').value,
        turno: document.getElementById('cajero-turno').value,
        codigo: document.getElementById('cajero-codigo').value.toUpperCase(),
        password: password || (id ? obtenerDatos('cajeros').find(c => c.id === id)?.password : '0000'),
        cargo: document.getElementById('cajero-cargo').value,
        activo: true
    };
    
    if (id === 'admin-1' && cajero.codigo !== 'ADMIN') {
        mostrarNotificacion('No se puede cambiar el código del administrador principal', 'error');
        return;
    }
    
    let cajeros = obtenerDatos('cajeros');
    
    const codigoExistente = cajeros.find(c => c.codigo === cajero.codigo && c.id !== id);
    if (codigoExistente) {
        mostrarNotificacion('El código de cajero ya existe', 'error');
        return;
    }
    
    if (id) {
        const index = cajeros.findIndex(c => c.id === id);
        cajeros[index] = cajero;
    } else {
        cajeros.push(cajero);
    }
    
    guardarDatos('cajeros', cajeros);
    cargarCajeros();
    limpiarFormularioCajero();
    mostrarNotificacion(id ? 'Cajero actualizado' : 'Cajero agregado', 'success');
}

function editarCajero(id) {
    if (id === 'admin-1') {
        mostrarNotificacion('El administrador principal no puede ser editado desde aquí', 'error');
        return;
    }
    
    const cajeros = obtenerDatos('cajeros');
    const cajero = cajeros.find(c => c.id === id);
    
    if (!cajero) return;
    
    document.getElementById('cajero-id').value = cajero.id;
    document.getElementById('cajero-nombre').value = cajero.nombre;
    document.getElementById('cajero-rut').value = cajero.rut;
    document.getElementById('cajero-turno').value = cajero.turno;
    document.getElementById('cajero-codigo').value = cajero.codigo;
    document.getElementById('cajero-cargo').value = cajero.cargo;
    document.getElementById('cajero-password').value = '';
    
    document.getElementById('form-cajero-titulo').textContent = 'Editar Cajero';
    document.querySelector('#form-cajero .btn-primary').textContent = '💾 Actualizar';
}

function eliminarCajero(id) {
    if (!cajeroActual || cajeroActual.codigo !== 'ADMIN') {
        mostrarNotificacion('Solo el administrador puede eliminar cajeros', 'error');
        return;
    }

    if (!confirm('¿Eliminar este cajero permanentemente?')) return;

    if (id === 'admin-1') {
        mostrarNotificacion('No se puede eliminar el administrador principal', 'error');
        return;
    }

    let cajeros = obtenerDatos('cajeros');
    const cajeroEliminado = cajeros.find(c => c.id === id);

    cajeros = cajeros.filter(c => c.id !== id);

    guardarDatos('cajeros', cajeros);
    cargarCajeros();

    mostrarNotificacion(`Cajero ${cajeroEliminado.nombre} eliminado`, 'success');
}

function limpiarFormularioCajero() {
    const form = document.getElementById('form-cajero');
    if (form) {
        form.reset();
        document.getElementById('cajero-id').value = '';
        document.getElementById('form-cajero-titulo').textContent = 'Nuevo Cajero';
        document.querySelector('#form-cajero .btn-primary').textContent = '➕ Agregar Cajero';
    }
}

function filtrarCajeros() {
    const termino = document.getElementById('buscar-cajero')?.value.toLowerCase() || '';
    const items = document.querySelectorAll('.cajero-item');
    
    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        if (texto.includes(termino)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==========================================
// INVENTARIO GENERAL
// ==========================================

function cargarInventarioGeneral(filtro = 'todo') {
    const tbody = document.getElementById('tabla-inventario');
    if (!tbody) return;
    
    const categorias = obtenerCategorias();
    let todos = [];
    
    categorias.forEach(cat => {
        const items = obtenerDatos(cat.id).map(i => ({
            ...i, 
            categoria: cat.nombre,
            categoriaId: cat.id
        }));
        todos = [...todos, ...items];
    });
    
    if (filtro !== 'todo') {
        if (filtro === 'alertas') {
            todos = todos.filter(i => i.cantidad <= i.minimo);
        } else {
            todos = todos.filter(i => i.categoriaId === filtro);
        }
    }
    
    if (todos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state" style="text-align: center; padding: 40px;">
                    <div class="empty-state-icon">📋</div>
                    <p>No hay items para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = todos.map(item => {
        let estado = 'ok';
        let estadoTexto = '✓ Normal';
        
        if (item.cantidad <= item.minimo * 0.5) {
            estado = 'danger';
            estadoTexto = '🔴 Crítico';
        } else if (item.cantidad <= item.minimo) {
            estado = 'warning';
            estadoTexto = '🟡 Bajo';
        }
        
        return `
            <tr>
                <td><span class="badge" style="background: #dbeafe; color: #1e40af;">${item.categoria}</span></td>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.cantidad}</td>
                <td>${item.unidad}</td>
                <td>${item.minimo}</td>
                <td><span class="status-badge status-${estado}">${estadoTexto}</span></td>
                <td>
                    <button onclick="verCategoria('${item.categoriaId}')" class="btn-icon btn-edit" title="Ver">👁️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function mostrarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    cargarInventarioGeneral(tab);
}

// ==========================================
// EXPORTACIÓN A EXCEL
// ==========================================

function exportarExcel() {
    const categorias = obtenerCategorias();
    let todos = [];
    
    categorias.forEach(cat => {
        const items = obtenerDatos(cat.id).map(i => ({
            Categoría: cat.nombre,
            ...i
        }));
        todos = [...todos, ...items];
    });
    
    if (todos.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'error');
        return;
    }
    
    const datos = todos.map(item => ({
        'Categoría': item.Categoría,
        'ID': item.id,
        'Nombre': item.nombre,
        'Cantidad': item.cantidad,
        'Unidad': item.unidad,
        'Stock Mínimo': item.minimo
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    
    ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 25 },
        { wch: 10 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario General');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inventario_general_${fecha}.xlsx`);
    
    mostrarNotificacion('Inventario exportado a Excel correctamente');
}

function exportarAuditoria() {
    const auditoria = obtenerDatos('auditoria');
    
    if (auditoria.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'error');
        return;
    }
    
    const datos = auditoria.map(r => ({
        'Fecha': new Date(r.fecha).toLocaleString('es-ES'),
        'Cajero': r.cajeroNombre,
        'Código': r.cajeroCodigo,
        'Categoría': r.categoria.toUpperCase(),
        'Item': r.itemNombre,
        'Tipo': r.tipo,
        'Cantidad': r.cantidad,
        'Stock Anterior': r.stockAnterior,
        'Stock Nuevo': r.stockNuevo
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    
    const colWidths = [
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `auditoria_${fecha}.xlsx`);
    
    mostrarNotificacion('Historial exportado a Excel correctamente');
}

function limpiarAuditoria() {
    if (!verificarSesion()) return;
    
    if (confirm('¿Está seguro de eliminar TODO el historial de auditoría?')) {
        guardarDatos('auditoria', []);
        cargarAuditoria();
        mostrarNotificacion('Historial limpiado correctamente');
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${tipo === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 99999;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Animación CSS para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// ==========================================
// FUNCIONES ESPECÍFICAS PARA CONTEO DE CIGARRILLOS
// ==========================================

/**
 * Calcula el estado del conteo basado en stock sistema vs físico
 * Equivalente a: =SI.ERROR(SI(F5=E5;"OK";SI(F5<E5;"INGRESAR";"EGRESAR"));"")
 */
function calcularEstadoCigarrillo(stockSistema, conteoFisico) {
    if (conteoFisico === null || conteoFisico === undefined || isNaN(conteoFisico)) {
        return 'PENDIENTE';
    }
    if (conteoFisico === stockSistema) return 'OK';
    if (conteoFisico > stockSistema) return 'INGRESAR';
    return 'EGRESAR';
}

/**
 * Obtiene el color CSS según el estado del conteo
 */
function getColorEstado(estado) {
    switch(estado) {
        case 'OK': return '#10b981'; // Verde
        case 'INGRESAR': return '#3b82f6'; // Azul
        case 'EGRESAR': return '#ef4444'; // Rojo
        default: return '#f59e0b'; // Naranja (pendiente)
    }
}

/**
 * Verifica si el usuario actual es administrador
 */
function esAdministrador() {
    const sesion = obtenerSesionActiva();
    return sesion && sesion.cajeroCodigo === 'ADMIN';
}

/**
 * Obtiene el historial de conteos de cigarrillos
 */
function obtenerHistorialConteos() {
    return obtenerDatos('historial_conteos') || [];
}

/**
 * Guarda un conteo de cigarrillos en el historial
 */
function guardarConteoCigarrillos(conteoData) {
    let historial = obtenerHistorialConteos();
    
    // Agregar al inicio
    historial.unshift({
        id: `conteo-${Date.now()}`,
        fecha: new Date().toISOString(),
        ...conteoData
    });
    
    // Limitar a últimos 50 conteos para no saturar localStorage
    if (historial.length > 50) {
        historial = historial.slice(0, 50);
    }
    
    guardarDatos('historial_conteos', historial);
    
    // Registrar en auditoría general
    registrarAuditoria({
        cajeroId: conteoData.cajeroId,
        cajeroNombre: conteoData.cajeroNombre,
        cajeroCodigo: conteoData.cajeroCodigo,
        tipo: 'conteo_cigarrillos',
        categoria: 'cigarrillos',
        itemNombre: `Conteo ${conteoData.id || 'nuevo'}`,
        cantidad: conteoData.productos ? conteoData.productos.length : 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    return true;
}

// ==========================================
// FUNCIÓN AUXILIAR PARA HISTORIAL DE CONTEOS
// ==========================================

function obtenerHistorialConteos() {
    return obtenerDatos('historial_conteos') || [];
}
