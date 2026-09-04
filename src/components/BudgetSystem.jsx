import { useState, useEffect } from 'react'
import { PARTIDAS_PRESUPUESTARIAS } from '../types/budget'
import { useSupabase } from '../hooks/useSupabase'
import { exportarMultiplesHojas, formatearPresupuestoParaExcel, formatearResumenPartidasParaExcel } from '../utils/excelExport'
import ArticuloSelector from './ArticuloSelector'
import TablaArticulos from './TablaArticulos'
import ResumenPartidas from './ResumenPartidas'
import GestorMateriales from './GestorMateriales'
import GestorInventario from './GestorInventario'
import GestorStock from './GestorStock'
import AdminNav from './AdminNav'

// Datos fijos de la unidad (según tu imagen)
const UNIDAD_RESPONSABLE = '030000 FAC'
const CENTRO_COSTOS = 'DE DOCUMENTACIÓN'
const ACTIVIDAD = '0009 ACTIVIDAD OPERATIVA'

const BudgetSystem = () => {
  const [vistaActual, setVistaActual] = useState('presupuesto') // 'presupuesto', 'catalogo', 'inventario'
  const [articulosPresupuesto, setArticulosPresupuesto] = useState([])
  const [todosArticulos, setTodosArticulos] = useState([]) // 🔥 NUEVO: Guardar todos los artículos (MAT + LIB)
  const [materialesDisponibles, setMaterialesDisponibles] = useState([])
  const [valoresPartidas, setValoresPartidas] = useState(() => {
    // Inicializar con valores base de cada partida
    const inicial = {}
    PARTIDAS_PRESUPUESTARIAS.forEach(partida => {
      inicial[partida.codigo] = { ...partida.valoresBase }
    })
    return inicial
  })
  const [presupuestoId] = useState(1) // ID del presupuesto principal
  const [isLoading, setIsLoading] = useState(true)
  const [appError, setAppError] = useState(null)
  const [notificacion, setNotificacion] = useState(null)
  
  const {
    loading,
    error,
    cargarMateriales,
    agregarMaterial,
    editarMaterial,
    eliminarMaterial,
    cargarPresupuesto,
    guardarArticuloPresupuesto,
    actualizarArticuloPresupuesto,
    eliminarArticuloPresupuesto,
    cargarValoresPartidas,
    guardarValorPartida,
    cargarStockMateriales,
    cargarMovimientosMaterial,
    registrarMovimientoMaterial
} = useSupabase()

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar materiales
        const materiales = await cargarMateriales()
        setMaterialesDisponibles(materiales)

        // Cargar artículos del presupuesto CON FILTROS
        const presupuesto = await cargarPresupuesto(
          presupuestoId, 
          UNIDAD_RESPONSABLE, 
          CENTRO_COSTOS, 
          ACTIVIDAD
        )
        
        // 🔥 PROCESAR TODOS LOS ARTÍCULOS (MAT y LIB)
        const articulosFormateados = presupuesto.map(item => {
          const esLibro = item.materiales.codigo.startsWith('LIB')
          const precio = esLibro ? 0 : item.precio_presupuesto
          
          return {
            id: item.id,
            codigo: item.materiales.codigo,
            nombre: item.materiales.nombre,
            esLibro: esLibro,
            precioPresupuesto: precio,
            cantidades: {
              marzo: item.cantidad_marzo,
              agosto: item.cantidad_agosto
            },
            totales: {
              marzo: precio * item.cantidad_marzo,
              agosto: precio * item.cantidad_agosto,
              total: (precio * item.cantidad_marzo) + (precio * item.cantidad_agosto)
            }
          }
        })

        // 🔥 Guardar TODOS los artículos para el inventario
        setTodosArticulos(articulosFormateados)

        // 🔥 Solo MAT en el presupuesto (los LIB van al inventario)
        const articulosMAT = articulosFormateados.filter(a => !a.esLibro)
        setArticulosPresupuesto(articulosMAT)

        // Cargar valores de partidas
        const valores = await cargarValoresPartidas(presupuestoId)
        const valoresFormateados = { ...valoresPartidas }
        
        // Si hay valores en la base de datos, usarlos
        valores.forEach(valor => {
          if (!valoresFormateados[valor.codigo_partida]) {
            valoresFormateados[valor.codigo_partida] = {}
          }
          valoresFormateados[valor.codigo_partida][valor.mes] = valor.valor
        })
        
        // Inicializar valores por defecto para partidas que no están en la BD
        for (const partida of PARTIDAS_PRESUPUESTARIAS) {
          if (!valoresFormateados[partida.codigo]) {
            valoresFormateados[partida.codigo] = { ...partida.valoresBase }
            
            // Guardar los valores por defecto en la base de datos
            for (const mes of Object.keys(partida.valoresBase)) {
              try {
                await guardarValorPartida(presupuestoId, partida.codigo, mes, partida.valoresBase[mes])
              } catch (error) {
                // Error silencioso para valores iniciales
              }
            }
          }
        }
        
        setValoresPartidas(valoresFormateados)
      } catch (err) {
        setAppError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    cargarDatos()
  }, [presupuestoId])

  // Función para agregar un nuevo artículo al presupuesto
  const agregarArticulo = async (articulo, cantidadMarzo = 0, cantidadAgosto = 0, precioCustom = null) => {
    try {
      // 🔥 Si es libro (código LIB), NO guardar en presupuesto
      if (articulo.codigo.startsWith('LIB')) {
        mostrarNotificacion('📚 Los libros solo se gestionan en el inventario, no tienen costo.', 'info')
        return
      }
      
      const precioFinal = precioCustom || articulo.precio
      const nuevoArticulo = await guardarArticuloPresupuesto(
        presupuestoId, 
        articulo.id, 
        cantidadMarzo, 
        cantidadAgosto, 
        precioFinal,
        UNIDAD_RESPONSABLE,
        CENTRO_COSTOS,
        ACTIVIDAD
      )
      
      const articuloFormateado = {
        id: nuevoArticulo.id,
        codigo: nuevoArticulo.materiales.codigo,
        nombre: nuevoArticulo.materiales.nombre,
        esLibro: false,
        precioPresupuesto: nuevoArticulo.precio_presupuesto,
        cantidades: {
          marzo: nuevoArticulo.cantidad_marzo,
          agosto: nuevoArticulo.cantidad_agosto
        },
        totales: {
          marzo: nuevoArticulo.precio_presupuesto * nuevoArticulo.cantidad_marzo,
          agosto: nuevoArticulo.precio_presupuesto * nuevoArticulo.cantidad_agosto,
          total: (nuevoArticulo.precio_presupuesto * nuevoArticulo.cantidad_marzo) + (nuevoArticulo.precio_presupuesto * nuevoArticulo.cantidad_agosto)
        }
      }
      
      setArticulosPresupuesto(prev => [...prev, articuloFormateado])
      // 🔥 También agregar a todosArticulos
      setTodosArticulos(prev => [...prev, articuloFormateado])
      mostrarNotificacion(`Artículo "${articulo.nombre}" agregado al presupuesto`, 'success')
    } catch (err) {
      mostrarNotificacion('Error al agregar artículo: ' + err.message, 'error')
    }
  }

  // Función para eliminar un artículo del presupuesto
  const eliminarArticulo = async (id) => {
    try {
      await eliminarArticuloPresupuesto(id)
      setArticulosPresupuesto(prev => prev.filter(art => art.id !== id))
      setTodosArticulos(prev => prev.filter(art => art.id !== id))
      mostrarNotificacion('Artículo eliminado del presupuesto', 'success')
    } catch (err) {
      mostrarNotificacion('Error al eliminar artículo: ' + err.message, 'error')
    }
  }

  // Función para actualizar un artículo del presupuesto
  const actualizarArticulo = async (id, campo, valor) => {
    try {
      await actualizarArticuloPresupuesto(id, campo, valor)
      
      setArticulosPresupuesto(prev => prev.map(art => {
        if (art.id === id) {
          const updated = { ...art }
          
          if (campo === 'precioPresupuesto') {
            updated.precioPresupuesto = parseFloat(valor) || 0
          } else if (campo === 'cantidadMarzo') {
            updated.cantidades.marzo = parseInt(valor) || 0
          } else if (campo === 'cantidadAgosto') {
            updated.cantidades.agosto = parseInt(valor) || 0
          }
          
          // Recalcular totales
          updated.totales = {
            marzo: updated.precioPresupuesto * updated.cantidades.marzo,
            agosto: updated.precioPresupuesto * updated.cantidades.agosto,
            total: (updated.precioPresupuesto * updated.cantidades.marzo) + (updated.precioPresupuesto * updated.cantidades.agosto)
          }
          
          return updated
        }
        return art
      }))
      
      // 🔥 También actualizar en todosArticulos
      setTodosArticulos(prev => prev.map(art => {
        if (art.id === id) {
          const updated = { ...art }
          
          if (campo === 'precioPresupuesto') {
            updated.precioPresupuesto = parseFloat(valor) || 0
          } else if (campo === 'cantidadMarzo') {
            updated.cantidades.marzo = parseInt(valor) || 0
          } else if (campo === 'cantidadAgosto') {
            updated.cantidades.agosto = parseInt(valor) || 0
          }
          
          updated.totales = {
            marzo: updated.precioPresupuesto * updated.cantidades.marzo,
            agosto: updated.precioPresupuesto * updated.cantidades.agosto,
            total: (updated.precioPresupuesto * updated.cantidades.marzo) + (updated.precioPresupuesto * updated.cantidades.agosto)
          }
          
          return updated
        }
        return art
      }))
    } catch (err) {
      mostrarNotificacion('Error al actualizar artículo: ' + err.message, 'error')
    }
  }

  // Función para actualizar valores base de partidas
  const actualizarValorPartida = async (codigoPartida, mes, valor) => {
    try {
      await guardarValorPartida(presupuestoId, codigoPartida, mes, valor)
      setValoresPartidas(prev => ({
        ...prev,
        [codigoPartida]: {
          ...prev[codigoPartida],
          [mes]: parseFloat(valor) || 0
        }
      }))
    } catch (err) {
      alert('Error al actualizar partida: ' + err.message)
    }
  }

  // Función para agregar nuevo material al catálogo
  const agregarNuevoMaterial = async (codigo, nombre, precio) => {
    try {
      // 🔥 Validar que el código no empiece con LIB (los libros no tienen costo)
      if (codigo.startsWith('LIB')) {
        // Los libros se guardan con precio 0
        const nuevoMaterial = await agregarMaterial(codigo, nombre, 0)
        setMaterialesDisponibles(prev => [...prev, nuevoMaterial])
        mostrarNotificacion(`📚 Libro "${nombre}" agregado al catálogo (sin costo)`, 'success')
      } else {
        const nuevoMaterial = await agregarMaterial(codigo, nombre, precio)
        setMaterialesDisponibles(prev => [...prev, nuevoMaterial])
        mostrarNotificacion(`Material "${nombre}" agregado al catálogo`, 'success')
      }
    } catch (err) {
      mostrarNotificacion('Error al agregar material: ' + err.message, 'error')
    }
  }

  // Función para editar material existente
  const editarMaterialCatalogo = async (codigoOriginal, nuevoCodigo, nuevoNombre, nuevoPrecio) => {
    try {
      const material = materialesDisponibles.find(m => m.codigo === codigoOriginal)
      if (material) {
        // 🔥 Si es libro, el precio siempre es 0
        const precioFinal = codigoOriginal.startsWith('LIB') ? 0 : parseFloat(nuevoPrecio) || 0
        
        await editarMaterial(material.id, nuevoCodigo, nuevoNombre, precioFinal)
        
        // Actualizar catálogo de materiales
        setMaterialesDisponibles(prev => prev.map(m => 
          m.id === material.id 
            ? { ...m, codigo: nuevoCodigo, nombre: nuevoNombre, precio: precioFinal }
            : m
        ))

        // Actualizar artículos del presupuesto que tengan este código (solo si no es libro)
        if (!codigoOriginal.startsWith('LIB')) {
          setArticulosPresupuesto(prev => prev.map(articulo => {
            if (articulo.codigo === codigoOriginal) {
              const nuevoPrecioNum = parseFloat(nuevoPrecio) || 0
              const nuevosTotales = {
                marzo: articulo.cantidades.marzo * nuevoPrecioNum,
                agosto: articulo.cantidades.agosto * nuevoPrecioNum,
                total: (articulo.cantidades.marzo * nuevoPrecioNum) + (articulo.cantidades.agosto * nuevoPrecioNum)
              }
              
              return {
                ...articulo,
                codigo: nuevoCodigo,
                nombre: nuevoNombre,
                precioPresupuesto: nuevoPrecioNum,
                totales: nuevosTotales
              }
            }
            return articulo
          }))
          
          // 🔥 También actualizar en todosArticulos
          setTodosArticulos(prev => prev.map(articulo => {
            if (articulo.codigo === codigoOriginal) {
              const nuevoPrecioNum = parseFloat(nuevoPrecio) || 0
              const nuevosTotales = {
                marzo: articulo.cantidades.marzo * nuevoPrecioNum,
                agosto: articulo.cantidades.agosto * nuevoPrecioNum,
                total: (articulo.cantidades.marzo * nuevoPrecioNum) + (articulo.cantidades.agosto * nuevoPrecioNum)
              }
              
              return {
                ...articulo,
                codigo: nuevoCodigo,
                nombre: nuevoNombre,
                precioPresupuesto: nuevoPrecioNum,
                totales: nuevosTotales
              }
            }
            return articulo
          }))
        }

        mostrarNotificacion(`Material "${nuevoNombre}" actualizado correctamente`, 'success')
      }
    } catch (err) {
      mostrarNotificacion('Error al editar material: ' + err.message, 'error')
    }
  }

  // Función para eliminar material del catálogo
  const eliminarMaterialCatalogo = async (codigo) => {
    try {
      const material = materialesDisponibles.find(m => m.codigo === codigo)
      if (material) {
        // Verificar si el material está siendo usado en el presupuesto (solo para no-libros)
        const enUso = !codigo.startsWith('LIB') && articulosPresupuesto.some(art => art.codigo === codigo)
        
        if (enUso) {
          if (!confirm(`El material "${material.nombre}" está siendo usado en el presupuesto. ¿Deseas eliminarlo del catálogo y del presupuesto?`)) {
            return
          }
        }

        await eliminarMaterial(material.id)
        setMaterialesDisponibles(prev => prev.filter(m => m.id !== material.id))
        
        // Eliminar también del presupuesto si está en uso
        if (enUso) {
          setArticulosPresupuesto(prev => prev.filter(art => art.codigo !== codigo))
          setTodosArticulos(prev => prev.filter(art => art.codigo !== codigo))
          mostrarNotificacion(`Material "${material.nombre}" eliminado del catálogo y del presupuesto`, 'success')
        } else {
          mostrarNotificacion(`Material "${material.nombre}" eliminado del catálogo`, 'success')
        }
      }
    } catch (err) {
      mostrarNotificacion('Error al eliminar material: ' + err.message, 'error')
    }
  }

  // Función para mostrar notificaciones bonitas
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  const handleExportarPresupuesto = () => {
    try {
      if (articulosPresupuesto.length === 0) {
        mostrarNotificacion('No hay artículos en el presupuesto para exportar', 'error')
        return
      }

      const fechaActual = new Date().toISOString().split('T')[0]
      const nombreArchivo = `Presupuesto_Biblioteca_${fechaActual}`
      
      // Preparar datos para múltiples hojas
      const datosHojas = []
      
      // Hoja 1: Resumen por partidas presupuestarias
      const datosResumen = formatearResumenPartidasParaExcel(articulosPresupuesto, valoresPartidas, PARTIDAS_PRESUPUESTARIAS)
      datosHojas.push({
        datos: datosResumen,
        nombreHoja: 'Resumen por Partidas',
        conEncabezado: true
      })
      
      // Hoja 2: Detalle de artículos del presupuesto
      const datosArticulos = formatearPresupuestoParaExcel(articulosPresupuesto)
      datosHojas.push({
        datos: datosArticulos,
        nombreHoja: 'Detalle de Artículos',
        conEncabezado: true
      })
      
      const exito = exportarMultiplesHojas(datosHojas, nombreArchivo)
      
      if (exito) {
        mostrarNotificacion(`Presupuesto exportado exitosamente como "${nombreArchivo}.xlsx"`, 'success')
      } else {
        mostrarNotificacion('Error al exportar el presupuesto', 'error')
      }
    } catch (error) {
      mostrarNotificacion('Error al exportar el presupuesto', 'error')
    }
  }

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Cargando Sistema</h2>
          <p className="text-gray-600">Conectando con la base de datos...</p>
        </div>
      </div>
    )
  }

  // Error inicial
  if (appError) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{appError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botón de cerrar sesión */}
      <AdminNav />
      
      {/* Banner del encabezado */}
      <div className="w-full h-[150px] overflow-hidden">
        <img 
          src="/REPOSITORIO DE EXAMENES.png" 
          alt="Repositorio de Exámenes" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
        {/* Notificación bonita */}
        {notificacion && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-md ${
              notificacion.tipo === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : notificacion.tipo === 'info'
                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex-shrink-0">
                {notificacion.tipo === 'success' ? (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : notificacion.tipo === 'info' ? (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm font-medium">{notificacion.mensaje}</p>
              <button
                onClick={() => setNotificacion(null)}
                className="flex-shrink-0 ml-auto text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Navegación por pestañas */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setVistaActual('presupuesto')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'presupuesto'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
              💲 Sistema de Presupuesto
              </button>
              <button
                onClick={() => setVistaActual('catalogo')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'catalogo'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Gestionar Catálogo ({materialesDisponibles.length})
              </button>
              <button
                onClick={() => setVistaActual('materiales')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'materiales'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >   
                📦 Gestión de Materiales
              </button>
              <button
                onClick={() => setVistaActual('inventario')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'inventario'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 Inventario ({todosArticulos.filter(a => a.esLibro).length})
              </button>
              
            </nav>
          </div>
        </div>

        {vistaActual === 'presupuesto' ? (
          // Vista del Sistema de Presupuesto
          <div className="space-y-8">
            {/* Información de la unidad */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">UNIDAD RESPONSABLE:</span>
                  <p className="text-gray-700">030000 FACULTAD DE INGENIERÍA</p>
                </div>
                <div>
                  <span className="font-medium">UNID. CENTRO DE COSTOS:</span>
                  <p className="text-gray-700">032500 CENTRO DE DOCUMENTACIÓN</p>
                </div>
                <div>
                  <span className="font-medium">ACTIVIDAD:</span>
                  <p className="text-gray-700">0009 ACTIVIDAD OPERATIVA</p>
                </div>
              </div>
            </div>

            {/* Selector de artículos */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Agregar Artículos al Presupuesto</h3>
                <button
                  onClick={() => setVistaActual('catalogo')}
                  className="text-sm text-emerald-600 hover:text-emerald-800"
                >
                  ⚙️ Gestionar catálogo
                </button>
              </div>
              <ArticuloSelector 
                articulos={materialesDisponibles.filter(m => !m.codigo.startsWith('LIB'))}
                onAgregarArticulo={agregarArticulo}
              />
              <p className="text-xs text-gray-500 mt-2">
              </p>
            </div>

            {/* Tabla de artículos del presupuesto */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Detalle de Artículos ({articulosPresupuesto.length})</h3>
              <TablaArticulos 
                articulos={articulosPresupuesto}
                onEliminarArticulo={eliminarArticulo}
                onActualizarArticulo={actualizarArticulo}
              />
            </div>

            {/* Resumen por partidas */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Resumen por Partidas Presupuestarias</h3>
              <ResumenPartidas 
                articulos={articulosPresupuesto} 
                valoresPartidas={valoresPartidas}
                onActualizarValorPartida={actualizarValorPartida}
              />
            </div>

            {/* Botón de exportación */}
            {articulosPresupuesto.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center">
                  <button
                    onClick={handleExportarPresupuesto}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg flex items-center space-x-3 mx-auto"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Exportar Presupuesto a Excel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : vistaActual === 'catalogo' ? (
          // Vista del Gestor de Catálogo
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Gestión de Catálogo de Materiales</h2>
                <p className="text-gray-600 mt-1">Administra los materiales disponibles para el presupuesto</p>
              </div>
              <button
                onClick={() => setVistaActual('presupuesto')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                ← Volver al Presupuesto
              </button>
            </div>
            <GestorMateriales 
              materiales={materialesDisponibles}
              onAgregarMaterial={agregarNuevoMaterial}
              onEditarMaterial={editarMaterialCatalogo}
              onEliminarMaterial={eliminarMaterialCatalogo}
            />
          </div>
        ) : vistaActual === 'materiales' ? (
          // Vista de Gestión de Materiales
          <GestorStock
            materiales={materialesDisponibles}
            cargarStockMateriales={cargarStockMateriales}
            cargarMovimientosMaterial={cargarMovimientosMaterial}
            registrarMovimientoMaterial={registrarMovimientoMaterial}
          />
        ) : (
          // Vista del Gestor de Inventario
          <div>
            <div className="mb-6 flex justify-start">
              <button
                onClick={() => setVistaActual('presupuesto')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                ← Volver al Presupuesto
              </button>
            </div>
            <GestorInventario 
              articulosPresupuesto={todosArticulos} // 🔥 PASAR TODOS LOS ARTÍCULOS (MAT + LIB)
              onActualizarInventario={(inventarioData) => {
                console.log('Datos del inventario:', inventarioData)
              }}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default BudgetSystem