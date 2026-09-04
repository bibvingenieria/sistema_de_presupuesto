import { useEffect, useMemo, useState } from 'react'

const GestorStock = ({
  materiales,
  cargarStockMateriales,
  cargarMovimientosMaterial,
  registrarMovimientoMaterial
}) => {
  const [materialesStock, setMaterialesStock] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [materialSeleccionado, setMaterialSeleccionado] = useState(null)
  const [tipoMovimiento, setTipoMovimiento] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')

  const [movimientos, setMovimientos] = useState([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // Cargar stock
  const cargarDatos = async () => {
    const datos = await cargarStockMateriales()
    setMaterialesStock(datos)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Obtener estado según stock
  const obtenerEstado = (stock) => {
    if (stock === 0) {
      return {
        nombre: 'Sin stock',
        clase: 'bg-red-100 text-red-700',
        indicador: '🔴'
      }
    }

    if (stock <= 3) {
      return {
        nombre: 'Stock bajo',
        clase: 'bg-yellow-100 text-yellow-700',
        indicador: '🟡'
      }
    }

    return {
      nombre: 'Con stock',
      clase: 'bg-green-100 text-green-700',
      indicador: '🟢'
    }
  }

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = materialesStock.length
    const conStock = materialesStock.filter(
      material => material.stockActual > 3
    ).length
    const stockBajo = materialesStock.filter(
      material => material.stockActual >= 1 && material.stockActual <= 3
    ).length
    const sinStock = materialesStock.filter(
      material => material.stockActual === 0
    ).length

    return {
      total,
      conStock,
      stockBajo,
      sinStock
    }
  }, [materialesStock])

  // Filtrar materiales
  const materialesFiltrados = useMemo(() => {
    return materialesStock.filter(material => {
      const texto = busqueda.toLowerCase()

      const coincideBusqueda =
        material.codigo?.toLowerCase().includes(texto) ||
        material.nombre?.toLowerCase().includes(texto)

      if (!coincideBusqueda) return false

      if (filtroEstado === 'con-stock') {
        return material.stockActual > 3
      }

      if (filtroEstado === 'bajo') {
        return material.stockActual >= 1 && material.stockActual <= 3
      }

      if (filtroEstado === 'sin-stock') {
        return material.stockActual === 0
      }

      return true
    })
  }, [materialesStock, busqueda, filtroEstado])

  // Abrir formulario de movimiento
  const abrirMovimiento = (material, tipo) => {
    setMaterialSeleccionado(material)
    setTipoMovimiento(tipo)
    setCantidad('')
    setMotivo('')
    setObservacion('')
    setMensaje(null)
  }

  // Cerrar formulario
  const cerrarMovimiento = () => {
    setMaterialSeleccionado(null)
    setTipoMovimiento(null)
    setCantidad('')
    setMotivo('')
    setObservacion('')
    setMensaje(null)
  }

  // Registrar movimiento
  const guardarMovimiento = async () => {
    if (!materialSeleccionado) return

    const cantidadNumero = parseInt(cantidad)

    if (!cantidadNumero || cantidadNumero <= 0) {
      setMensaje({
        tipo: 'error',
        texto: 'La cantidad debe ser mayor que 0.'
      })
      return
    }

    if (!motivo.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes ingresar el motivo del movimiento.'
      })
      return
    }

    if (
      tipoMovimiento === 'SALIDA' &&
      cantidadNumero > materialSeleccionado.stockActual
    ) {
      setMensaje({
        tipo: 'error',
        texto: `Stock insuficiente. Stock actual: ${materialSeleccionado.stockActual}.`
      })
      return
    }

    try {
      setGuardando(true)
      setMensaje(null)

      await registrarMovimientoMaterial(
        materialSeleccionado.id,
        tipoMovimiento,
        cantidadNumero,
        motivo.trim(),
        observacion.trim() || null
      )

      await cargarDatos()

      cerrarMovimiento()

      setMensaje({
        tipo: 'exito',
        texto:
          tipoMovimiento === 'ENTRADA'
            ? 'Entrada registrada correctamente.'
            : 'Salida registrada correctamente.'
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo registrar el movimiento.'
      })
    } finally {
      setGuardando(false)
    }
  }

  // Ver historial
  const abrirHistorial = async (material) => {
    setMaterialSeleccionado(material)
    setMostrarHistorial(true)

    const datos = await cargarMovimientosMaterial(material.id)
    setMovimientos(datos)
  }

  const cerrarHistorial = () => {
    setMostrarHistorial(false)
    setMaterialSeleccionado(null)
    setMovimientos([])
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          📦 Gestión de Materiales
        </h2>

        <p className="text-gray-600 mt-1">
          Control de entradas, salidas y stock de materiales.
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Materiales registrados
          </p>

          <p className="text-3xl font-bold text-gray-800 mt-2">
            {estadisticas.total}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Con stock
          </p>

          <p className="text-3xl font-bold text-green-600 mt-2">
            {estadisticas.conStock}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Bajo stock
          </p>

          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {estadisticas.stockBajo}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Sin stock
          </p>

          <p className="text-3xl font-bold text-red-600 mt-2">
            {estadisticas.sinStock}
          </p>
        </div>

      </div>

      {/* Buscador y filtro */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar material
            </label>

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="con-stock">Con Stock</option>
              <option value="bajo">Stock bajo</option>
              <option value="sin-stock">Sin stock</option>
            </select>
          </div>

        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Materiales
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">

            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Código
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Material
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Stock actual
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Estado
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">

              {materialesFiltrados.length === 0 ? (

                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No se encontraron materiales.
                  </td>
                </tr>

              ) : (

                materialesFiltrados.map(material => {
                  const estado = obtenerEstado(material.stockActual)

                  return (
                    <tr
                      key={material.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {material.codigo}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {material.nombre}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-800">
                          {material.stockActual}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estado.clase}`}
                        >
                          {estado.indicador} {estado.nombre}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-center gap-2">

                          <button
                            onClick={() =>
                              abrirMovimiento(material, 'ENTRADA')
                            }
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                          >
                            + Registrar entrada
                          </button>

                          <button
                            onClick={() =>
                              abrirMovimiento(material, 'SALIDA')
                            }
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                          >
                            − Registrar salida
                          </button>

                          <button
                            onClick={() => abrirHistorial(material)}
                            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                          >
                            Historial
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                })

              )}

            </tbody>

          </table>
        </div>
      </div>

      {/* Modal entrada / salida */}
      {materialSeleccionado && tipoMovimiento && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

            <div className="px-6 py-4 border-b flex justify-between items-center">

              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {tipoMovimiento === 'ENTRADA'
                    ? 'Registrar entrada'
                    : 'Registrar salida'}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {materialSeleccionado.nombre}
                </p>
              </div>

              <button
                onClick={cerrarMovimiento}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            <div className="p-6 space-y-4">

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">

                  <span className="text-gray-600">
                    Código
                  </span>

                  <span className="font-medium">
                    {materialSeleccionado.codigo}
                  </span>

                </div>

                <div className="flex justify-between mt-2">

                  <span className="text-gray-600">
                    Stock actual
                  </span>

                  <span className="font-bold text-lg">
                    {materialSeleccionado.stockActual}
                  </span>

                </div>

              </div>

              {mensaje && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    mensaje.tipo === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {mensaje.texto}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>

                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ingrese cantidad"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo *
                </label>

                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Compra, consumo, reposición..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observación
                </label>

                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Observación opcional..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">

              <button
                onClick={cerrarMovimiento}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={guardarMovimiento}
                disabled={guardando}
                className={`px-5 py-2 rounded-lg text-white font-medium ${
                  tipoMovimiento === 'ENTRADA'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {guardando
                  ? 'Guardando...'
                  : tipoMovimiento === 'ENTRADA'
                    ? 'Registrar entrada'
                    : 'Registrar salida'}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* Modal historial */}
      {mostrarHistorial && materialSeleccionado && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">

            <div className="px-6 py-4 border-b flex justify-between items-center">

              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Historial de movimientos
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {materialSeleccionado.nombre} — {materialSeleccionado.codigo}
                </p>
              </div>

              <button
                onClick={cerrarHistorial}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            <div className="overflow-y-auto p-6">

              {movimientos.length === 0 ? (

                <div className="text-center py-10 text-gray-500">
                  Este material todavía no tiene movimientos registrados.
                </div>

              ) : (

                <table className="w-full">

                  <thead className="bg-gray-50">
                    <tr>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Fecha
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Tipo
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Cantidad
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Motivo
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Observación
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {movimientos.map(movimiento => (

                      <tr key={movimiento.id}>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {movimiento.fecha
                            ? new Date(movimiento.fecha).toLocaleString('es-PE')
                            : '-'}
                        </td>

                        <td className="px-4 py-3 text-center">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo === 'ENTRADA'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {movimiento.tipo === 'ENTRADA'
                              ? 'Entrada'
                              : 'Salida'}
                          </span>

                        </td>

                        <td className="px-4 py-3 text-center font-bold">
                          {movimiento.cantidad}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {movimiento.motivo}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600">
                          {movimiento.observacion || '-'}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              )}

            </div>

            <div className="px-6 py-4 border-t flex justify-end">

              <button
                onClick={cerrarHistorial}
                className="px-5 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default GestorStock