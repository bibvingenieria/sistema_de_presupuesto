import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const GestorInventario = ({ articulosPresupuesto, onActualizarInventario }) => {
  const [inventario, setInventario] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos, aprobados, rechazados, pendientes, parciales
  const [busqueda, setBusqueda] = useState('')
  const [periodoActual, setPeriodoActual] = useState('marzo') // marzo, agosto, ambos
  const [materialActualIndex, setMaterialActualIndex] = useState(0)
  const [modoVista, setModoVista] = useState('revision') // revision, tabla
  const [mostrarCampoManual, setMostrarCampoManual] = useState(false)
  const [cantidadManual, setCantidadManual] = useState(0)
  const [cargando, setCargando] = useState(false)

  // Cargar inventario desde la base de datos
  useEffect(() => {
    const cargarInventario = async () => {
      try {
        setCargando(true)
        
        // 🔥 FILTRAR: Solo libros (código que empieza con LIB)
        const articulosLibros = articulosPresupuesto.filter(articulo => 
          articulo.codigo && articulo.codigo.startsWith('LIB')
        )

        if (articulosLibros.length === 0) {
          setInventario([])
          setCargando(false)
          return
        }

        // Obtener datos existentes del inventario desde Supabase
        const { data: inventarioExistente, error } = await supabase
          .from('inventario')
          .select('*')

        if (error) {
          console.error('Error cargando inventario:', error)
          setCargando(false)
          return
        }

        // Crear mapa de inventario existente por artículo_id
        const inventarioMap = {}
        if (inventarioExistente) {
          inventarioExistente.forEach(item => {
            inventarioMap[item.articulo_id] = item
          })
        }

        // Inicializar inventario solo con libros
        const inventarioInicial = articulosLibros.map(articulo => {
          const inventarioExiste = inventarioMap[articulo.id]
          
          // Calcular estados basados en cantidades aprobadas
          const cantidadAprobadaMarzo = inventarioExiste?.cantidad_marzo || 0
          const cantidadAprobadaAgosto = inventarioExiste?.cantidad_agosto || 0
          
          const getEstado = (solicitado, aprobado) => {
            if (aprobado === 0) return 'rechazado'
            if (aprobado >= solicitado) return 'aprobado'
            return 'parcial'
          }
          
          return {
            id: articulo.id,
            codigo: articulo.codigo || 'N/A',
            nombre: articulo.nombre || 'Sin nombre',
            precioPresupuesto: 0, // Los libros no tienen costo
            esLibro: true,
            
            // Cantidades solicitadas (del presupuesto)
            cantidadSolicitadaMarzo: articulo.cantidades?.marzo || 0,
            cantidadSolicitadaAgosto: articulo.cantidades?.agosto || 0,
            
            // Cantidades aprobadas por período (desde BD o 0)
            cantidadAprobadaMarzo: cantidadAprobadaMarzo,
            cantidadAprobadaAgosto: cantidadAprobadaAgosto,
            
            // Estados calculados
            estadoMarzo: getEstado(articulo.cantidades?.marzo || 0, cantidadAprobadaMarzo),
            estadoAgosto: getEstado(articulo.cantidades?.agosto || 0, cantidadAprobadaAgosto),
            
            // Stock actual (común para ambos períodos)
            stockActual: inventarioExiste?.stock_actual || 0,
            
            // Observaciones
            observacionesMarzo: inventarioExiste?.observaciones_marzo || '',
            observacionesAgosto: inventarioExiste?.observaciones_agosto || '',
            fechaRevisionMarzo: inventarioExiste?.fecha_revision_marzo || null,
            fechaRevisionAgosto: inventarioExiste?.fecha_revision_agosto || null,
          }
        })
        
        setInventario(inventarioInicial)
      } catch (error) {
        console.error('Error inicializando inventario:', error)
      } finally {
        setCargando(false)
      }
    }

    cargarInventario()
  }, [articulosPresupuesto])

  // Función para actualizar cantidad y estado de un artículo
  const actualizarEstadoArticulo = async (id, campo, valor) => {
    try {
      // Actualizar en el estado local
      setInventario(prev => prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [campo]: valor }
          
          // Recalcular estado
          if (campo === 'cantidadAprobadaMarzo') {
            const solicitado = updated.cantidadSolicitadaMarzo
            const aprobado = updated.cantidadAprobadaMarzo
            updated.estadoMarzo = aprobado === 0 ? 'rechazado' : aprobado >= solicitado ? 'aprobado' : 'parcial'
            updated.fechaRevisionMarzo = new Date().toISOString()
          } else if (campo === 'cantidadAprobadaAgosto') {
            const solicitado = updated.cantidadSolicitadaAgosto
            const aprobado = updated.cantidadAprobadaAgosto
            updated.estadoAgosto = aprobado === 0 ? 'rechazado' : aprobado >= solicitado ? 'aprobado' : 'parcial'
            updated.fechaRevisionAgosto = new Date().toISOString()
          }
          
          return updated
        }
        return item
      }))

      // Guardar en Supabase
      const articuloActual = inventario.find(item => item.id === id)
      const cantidadMarzo = campo === 'cantidadAprobadaMarzo' ? valor : articuloActual?.cantidadAprobadaMarzo || 0
      const cantidadAgosto = campo === 'cantidadAprobadaAgosto' ? valor : articuloActual?.cantidadAprobadaAgosto || 0

      // Verificar si ya existe registro
      const { data: existente, error: errorConsulta } = await supabase
        .from('inventario')
        .select('id')
        .eq('articulo_id', id)
        .single()

      if (errorConsulta && errorConsulta.code !== 'PGRST116') {
        throw errorConsulta
      }

      if (existente) {
        // Actualizar
        const { error: errorUpdate } = await supabase
          .from('inventario')
          .update({
            cantidad_marzo: cantidadMarzo,
            cantidad_agosto: cantidadAgosto,
            observaciones_marzo: articuloActual?.observacionesMarzo || '',
            observaciones_agosto: articuloActual?.observacionesAgosto || '',
            fecha_revision_marzo: new Date().toISOString(),
            fecha_revision_agosto: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('articulo_id', id)

        if (errorUpdate) throw errorUpdate
      } else {
        // Insertar nuevo
        const { error: errorInsert } = await supabase
          .from('inventario')
          .insert({
            articulo_id: id,
            cantidad_marzo: cantidadMarzo,
            cantidad_agosto: cantidadAgosto,
            stock_actual: 0,
            observaciones_marzo: articuloActual?.observacionesMarzo || '',
            observaciones_agosto: articuloActual?.observacionesAgosto || '',
            fecha_revision_marzo: new Date().toISOString(),
            fecha_revision_agosto: new Date().toISOString()
          })

        if (errorInsert) throw errorInsert
      }

    } catch (error) {
      console.error('Error actualizando inventario:', error)
      alert('Error al guardar en la base de datos. Por favor intenta de nuevo.')
    }
  }

  // Filtrar artículos según búsqueda, estado y período
  const inventarioFiltrado = inventario.filter(item => {
    const coincideBusqueda = item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            item.codigo.toLowerCase().includes(busqueda.toLowerCase())
    
    // Filtro por período
    let coincidePeriodo = true
    if (periodoActual === 'marzo') {
      coincidePeriodo = item.cantidadSolicitadaMarzo > 0
    } else if (periodoActual === 'agosto') {
      coincidePeriodo = item.cantidadSolicitadaAgosto > 0
    } else { // ambos
      coincidePeriodo = item.cantidadSolicitadaMarzo > 0 || item.cantidadSolicitadaAgosto > 0
    }
    
    // Filtro por estado
    let estadoPeriodo
    if (periodoActual === 'marzo') {
      estadoPeriodo = item.estadoMarzo
    } else if (periodoActual === 'agosto') {
      estadoPeriodo = item.estadoAgosto
    } else {
      // Para "ambos", considerar aprobado si tiene al menos un período aprobado
      const estados = [item.estadoMarzo, item.estadoAgosto]
      estadoPeriodo = estados.includes('aprobado') ? 'aprobado' : 
                      estados.includes('parcial') ? 'parcial' :
                      estados.includes('rechazado') ? 'rechazado' : 'pendiente'
    }
    
    const coincideEstado = filtroEstado === 'todos' || estadoPeriodo === filtroEstado
    
    return coincideBusqueda && coincidePeriodo && coincideEstado
  }).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Resetear índice cuando cambian los filtros
  useEffect(() => {
    setMaterialActualIndex(0)
    if (periodoActual === 'ambos') {
      setModoVista('tabla')
    }
  }, [busqueda, filtroEstado, periodoActual])

  // Función para exportar inventario
  const exportarInventario = () => {
    const inventarioParaExportar = inventarioFiltrado.map(item => {
      const totalSolicitado = item.cantidadSolicitadaMarzo + item.cantidadSolicitadaAgosto
      const totalAprobado = item.cantidadAprobadaMarzo + item.cantidadAprobadaAgosto
      
      return {
        'Código': item.codigo,
        'Libro': item.nombre,
        'Solicitado Marzo': item.cantidadSolicitadaMarzo,
        'Aprobado Marzo': item.cantidadAprobadaMarzo,
        'Estado Marzo': item.estadoMarzo,
        'Solicitado Agosto': item.cantidadSolicitadaAgosto,
        'Aprobado Agosto': item.cantidadAprobadaAgosto,
        'Estado Agosto': item.estadoAgosto,
        'Total Solicitado': totalSolicitado,
        'Total Aprobado': totalAprobado,
        'Fecha Rev. Marzo': item.fechaRevisionMarzo || '',
        'Fecha Rev. Agosto': item.fechaRevisionAgosto || ''
      }
    })

    if (inventarioParaExportar.length === 0) {
      alert('No hay libros para exportar')
      return
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(inventarioParaExportar)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_Libros')
    
    const fecha = new Date().toLocaleDateString().replace(/\//g, '-')
    XLSX.writeFile(workbook, `Inventario_Libros_${fecha}.xlsx`)
  }

  // Estadísticas rápidas
  const stats = {
    total: inventarioFiltrado.length,
    aprobados: inventarioFiltrado.filter(i => {
      const estado = periodoActual === 'marzo' ? i.estadoMarzo : 
                     periodoActual === 'agosto' ? i.estadoAgosto : 
                     i.estadoMarzo === 'aprobado' || i.estadoAgosto === 'aprobado'
      return estado === 'aprobado'
    }).length,
    rechazados: inventarioFiltrado.filter(i => {
      const estado = periodoActual === 'marzo' ? i.estadoMarzo : 
                     periodoActual === 'agosto' ? i.estadoAgosto : 
                     i.estadoMarzo === 'rechazado' && i.estadoAgosto === 'rechazado'
      return estado === 'rechazado'
    }).length,
    parciales: inventarioFiltrado.filter(i => {
      const estado = periodoActual === 'marzo' ? i.estadoMarzo : 
                     periodoActual === 'agosto' ? i.estadoAgosto : 
                     i.estadoMarzo === 'parcial' || i.estadoAgosto === 'parcial'
      return estado === 'parcial'
    }).length,
    pendientes: inventarioFiltrado.filter(i => {
      const estado = periodoActual === 'marzo' ? i.estadoMarzo : 
                     periodoActual === 'agosto' ? i.estadoAgosto : 
                     i.estadoMarzo === 'pendiente' || i.estadoAgosto === 'pendiente'
      return estado === 'pendiente'
    }).length
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'aprobado': return 'bg-green-100 text-green-800'
      case 'rechazado': return 'bg-red-100 text-red-800'
      case 'parcial': return 'bg-yellow-100 text-yellow-800'
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'aprobado': return '✅'
      case 'rechazado': return '❌'
      case 'parcial': return '⚠️'
      case 'pendiente': return '⏳'
      default: return '❓'
    }
  }

  // Mensaje cuando no hay libros
  if (inventario.length === 0 && !cargando) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <div className="w-20 h-20 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-white">📚</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Sin Libros en el Inventario</h3>
        <p className="text-gray-600">No hay libros agregados al presupuesto para gestionar en el inventario.</p>
        <p className="text-gray-500 text-sm mt-2">Los libros se identifican con código que empieza con "LIB"</p>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando inventario...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">
              📚 Gestión de Inventario de Libros
            </h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
              {inventario.length} libros
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <label className="text-lg font-semibold text-gray-700">Período:</label>
            <select
              value={periodoActual}
              onChange={(e) => setPeriodoActual(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-lg font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="marzo">Marzo 2025</option>
              <option value="agosto">Agosto 2025</option>
              <option value="ambos">Ambos Períodos</option>
            </select>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.aprobados}</div>
            <div className="text-sm text-green-600">Aprobados</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.parciales}</div>
            <div className="text-sm text-yellow-600">Parciales</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.rechazados}</div>
            <div className="text-sm text-red-600">Rechazados</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.pendientes}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="aprobado">✅ Aprobados</option>
            <option value="parcial">⚠️ Parciales</option>
            <option value="rechazado">❌ Rechazados</option>
          </select>
          <button
            onClick={exportarInventario}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 Exportar
          </button>
        </div>
      </div>

      {/* Vista de revisión uno por uno */}
      {inventarioFiltrado.length > 0 && modoVista === 'revision' && periodoActual !== 'ambos' && (
        <div className="bg-white rounded-lg shadow-md">
          {(() => {
            const materialActual = inventarioFiltrado[materialActualIndex] || inventarioFiltrado[0]
            const cantidadSolicitada = periodoActual === 'marzo' 
              ? materialActual.cantidadSolicitadaMarzo 
              : materialActual.cantidadSolicitadaAgosto
            const cantidadAprobada = periodoActual === 'marzo' 
              ? materialActual.cantidadAprobadaMarzo 
              : materialActual.cantidadAprobadaAgosto
            const estadoActual = periodoActual === 'marzo' 
              ? materialActual.estadoMarzo 
              : materialActual.estadoAgosto

            return (
              <div className="p-8">
                {/* Progreso */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Libro {materialActualIndex + 1} de {inventarioFiltrado.length}</span>
                    <span>{stats.aprobados + stats.rechazados} de {stats.total} revisados</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${((materialActualIndex + 1) / inventarioFiltrado.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Información del libro */}
                <div className="text-center mb-8">
                  <div className="inline-block px-4 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full mb-3">
                    📚 LIBRO
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{materialActual.nombre}</h3>
                  <p className="text-lg text-gray-600">Código: <span className="font-medium">{materialActual.codigo}</span></p>
                </div>

                {/* Cantidad solicitada vs aprobada */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600">{cantidadSolicitada}</div>
                    <div className="text-sm text-blue-800 font-medium">Solicitado</div>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600">{cantidadAprobada}</div>
                    <div className="text-sm text-green-800 font-medium">Aprobado</div>
                  </div>
                </div>

                {/* Estado actual */}
                <div className="text-center mb-6">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${getEstadoColor(estadoActual)}`}>
                    {getEstadoIcon(estadoActual)} {estadoActual.toUpperCase()}
                  </span>
                </div>

                {/* Campo manual */}
                {mostrarCampoManual && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ingrese cantidad a aprobar (máximo {cantidadSolicitada}):
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        max={cantidadSolicitada}
                        value={cantidadManual}
                        onChange={(e) => setCantidadManual(parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-lg"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const campo = periodoActual === 'marzo' ? 'cantidadAprobadaMarzo' : 'cantidadAprobadaAgosto'
                          actualizarEstadoArticulo(materialActual.id, campo, cantidadManual)
                          setMostrarCampoManual(false)
                          setTimeout(() => {
                            if (materialActualIndex < inventarioFiltrado.length - 1) {
                              setMaterialActualIndex(materialActualIndex + 1)
                            }
                          }, 500)
                        }}
                        disabled={cantidadManual <= 0 || cantidadManual > cantidadSolicitada}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setMostrarCampoManual(false)
                          setCantidadManual(0)
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                {!mostrarCampoManual && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <button
                      onClick={() => {
                        const campo = periodoActual === 'marzo' ? 'cantidadAprobadaMarzo' : 'cantidadAprobadaAgosto'
                        actualizarEstadoArticulo(materialActual.id, campo, cantidadSolicitada)
                        setTimeout(() => {
                          if (materialActualIndex < inventarioFiltrado.length - 1) {
                            setMaterialActualIndex(materialActualIndex + 1)
                          }
                        }, 500)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-6 rounded-lg transition-colors text-lg"
                    >
                      ✅ Aprobar Todo<br />
                      <span className="text-sm">({cantidadSolicitada} unidades)</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCantidadManual(Math.ceil(cantidadSolicitada / 2))
                        setMostrarCampoManual(true)
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-6 px-6 rounded-lg transition-colors text-lg"
                    >
                      ⚠️ Aprobar Parcial<br />
                      <span className="text-sm">(Cantidad personalizada)</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const campo = periodoActual === 'marzo' ? 'cantidadAprobadaMarzo' : 'cantidadAprobadaAgosto'
                        actualizarEstadoArticulo(materialActual.id, campo, 0)
                        setTimeout(() => {
                          if (materialActualIndex < inventarioFiltrado.length - 1) {
                            setMaterialActualIndex(materialActualIndex + 1)
                          }
                        }, 500)
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-6 rounded-lg transition-colors text-lg"
                    >
                      ❌ Rechazar<br />
                      <span className="text-sm">(0 unidades)</span>
                    </button>
                  </div>
                )}

                {/* Navegación */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => {
                      if (materialActualIndex > 0) {
                        setMaterialActualIndex(materialActualIndex - 1)
                        setMostrarCampoManual(false)
                      }
                    }}
                    disabled={materialActualIndex === 0}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    ⬅️ Anterior
                  </button>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-sm text-gray-600">
                      {materialActualIndex < inventarioFiltrado.length - 1 
                        ? `Quedan ${inventarioFiltrado.length - materialActualIndex - 1} libros por revisar`
                        : 'Último libro'
                      }
                    </div>
                    <button
                      onClick={() => setModoVista('tabla')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                    >
                      📊 Ver Tabla Completa
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (materialActualIndex < inventarioFiltrado.length - 1) {
                        setMaterialActualIndex(materialActualIndex + 1)
                        setMostrarCampoManual(false)
                      }
                    }}
                    disabled={materialActualIndex >= inventarioFiltrado.length - 1}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    Siguiente ➡️
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Vista de tabla */}
      {(modoVista === 'tabla' || periodoActual === 'ambos') && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                📋 Tabla de Inventario de Libros
                {periodoActual === 'ambos' && ' - Ambos Períodos 2025'}
                {periodoActual === 'marzo' && ' - Marzo 2025'}
                {periodoActual === 'agosto' && ' - Agosto 2025'}
              </h3>
              {periodoActual !== 'ambos' && (
                <button
                  onClick={() => setModoVista('revision')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  🔙 Volver a Revisión
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Libro
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprobado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventarioFiltrado.map((item) => {
                  const cantidadSolicitada = periodoActual === 'ambos' 
                    ? item.cantidadSolicitadaMarzo + item.cantidadSolicitadaAgosto
                    : (periodoActual === 'marzo' ? item.cantidadSolicitadaMarzo : item.cantidadSolicitadaAgosto)
                  
                  const cantidadAprobada = periodoActual === 'ambos'
                    ? item.cantidadAprobadaMarzo + item.cantidadAprobadaAgosto
                    : (periodoActual === 'marzo' ? item.cantidadAprobadaMarzo : item.cantidadAprobadaAgosto)
                  
                  const estado = periodoActual === 'ambos'
                    ? (item.estadoMarzo === 'aprobado' || item.estadoAgosto === 'aprobado' ? 'aprobado' :
                       item.estadoMarzo === 'parcial' || item.estadoAgosto === 'parcial' ? 'parcial' :
                       item.estadoMarzo === 'rechazado' && item.estadoAgosto === 'rechazado' ? 'rechazado' : 'pendiente')
                    : (periodoActual === 'marzo' ? item.estadoMarzo : item.estadoAgosto)

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">
                              📚
                            </span>
                            {item.nombre}
                          </div>
                          <div className="text-sm text-gray-500">Código: {item.codigo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-medium text-blue-600">{cantidadSolicitada}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-green-600">{cantidadAprobada}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(estado)}`}>
                          {getEstadoIcon(estado)} {estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {periodoActual !== 'ambos' && (
                          <button
                            onClick={() => {
                              const campo = periodoActual === 'marzo' ? 'cantidadAprobadaMarzo' : 'cantidadAprobadaAgosto'
                              if (confirm(`¿Resetear cantidad para "${item.nombre}"?`)) {
                                actualizarEstadoArticulo(item.id, campo, 0)
                              }
                            }}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            🗑️ Resetear
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inventarioFiltrado.length === 0 && modoVista === 'revision' && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No se encontraron libros con los filtros aplicados.</p>
        </div>
      )}
    </div>
  )
}

export default GestorInventario