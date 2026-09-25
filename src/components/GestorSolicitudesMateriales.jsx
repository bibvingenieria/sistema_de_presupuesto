import { useEffect, useMemo, useState } from 'react'

const GestorSolicitudesMateriales = ({
  materiales,
  cargarSolicitudesMateriales,
  crearSolicitudMaterial,
  cargarDetalleSolicitudMaterial,
  registrarRecepcionMaterial,
  eliminarRecepcionMaterial,
  eliminarSolicitudMaterial
}) => {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  const [modalNueva, setModalNueva] = useState(false)
  const [modalRecepcion, setModalRecepcion] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)

  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null)
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null)

  const [mensaje, setMensaje] = useState(null)

  const [formSolicitud, setFormSolicitud] = useState({
    materialId: '',
    cantidadSolicitada: '',
    fechaSolicitud: new Date().toISOString().split('T')[0],
    observacion: ''
  })

  const [formRecepcion, setFormRecepcion] = useState({
    cantidad: '',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    observacion: ''
  })

  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })

    setTimeout(() => {
      setMensaje(null)
    }, 4000)
  }

  // =========================================================
  // CARGAR SOLICITUDES
  // =========================================================

  const cargarDatos = async () => {
    try {
      setCargando(true)

      const data = await cargarSolicitudesMateriales()

      setSolicitudes(data || [])
    } catch (error) {
      mostrarMensaje(
        'Error al cargar las solicitudes: ' + error.message,
        'error'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // =========================================================
  // TRANSFORMAR SOLICITUDES PARA LA TABLA
  // =========================================================

  const solicitudesFormateadas = useMemo(() => {
    const resultado = []

    solicitudes.forEach((solicitud) => {
      const detalles = solicitud.detalle_solicitudes_materiales || []

      detalles.forEach((detalle) => {
        const recepciones = detalle.recepciones_materiales || []

        const recibido = recepciones.reduce(
          (total, recepcion) => total + Number(recepcion.cantidad || 0),
          0
        )

        const solicitado = Number(detalle.cantidad_solicitada || 0)

        const pendiente = Math.max(solicitado - recibido, 0)

        let estado = 'PENDIENTE'

        if (recibido > 0 && recibido < solicitado) {
          estado = 'PARCIAL'
        }

        if (recibido >= solicitado) {
          estado = 'COMPLETADO'
        }

        resultado.push({
          solicitudId: solicitud.id,
          codigo: solicitud.codigo,
          fechaSolicitud: solicitud.fecha_solicitud,
          observacionSolicitud: solicitud.observacion,

          detalleId: detalle.id,
          materialId: detalle.material_id,
          material: detalle.materiales,

          solicitado,
          recibido,
          pendiente,

          estado,

          recepciones
        })
      })
    })

    return resultado
  }, [solicitudes])

  // =========================================================
  // FILTROS
  // =========================================================

  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return solicitudesFormateadas.filter((item) => {
      const coincideBusqueda =
        !texto ||
        item.codigo.toLowerCase().includes(texto) ||
        item.material?.codigo?.toLowerCase().includes(texto) ||
        item.material?.nombre?.toLowerCase().includes(texto)

      const coincideEstado =
        filtroEstado === 'TODOS' || item.estado === filtroEstado

      return coincideBusqueda && coincideEstado
    })
  }, [solicitudesFormateadas, busqueda, filtroEstado])

  // =========================================================
  // ESTADÍSTICAS
  // =========================================================

  const estadisticas = useMemo(() => {
    return {
      total: solicitudesFormateadas.length,

      pendientes: solicitudesFormateadas.filter(
        (item) => item.estado === 'PENDIENTE'
      ).length,

      parciales: solicitudesFormateadas.filter(
        (item) => item.estado === 'PARCIAL'
      ).length,

      completadas: solicitudesFormateadas.filter(
        (item) => item.estado === 'COMPLETADO'
      ).length
    }
  }, [solicitudesFormateadas])

  // =========================================================
  // GENERAR CÓDIGO DE SOLICITUD
  // =========================================================

  const generarCodigoSolicitud = () => {
    let mayor = 0

    solicitudes.forEach((solicitud) => {
      const match = String(solicitud.codigo || '').match(/^SOL-(\d+)$/)

      if (match) {
        const numero = parseInt(match[1], 10)

        if (numero > mayor) {
          mayor = numero
        }
      }
    })

    return `SOL-${String(mayor + 1).padStart(3, '0')}`
  }

  // =========================================================
  // NUEVA SOLICITUD
  // =========================================================

  const abrirNuevaSolicitud = () => {
    setFormSolicitud({
      materialId: '',
      cantidadSolicitada: '',
      fechaSolicitud: new Date().toISOString().split('T')[0],
      observacion: ''
    })

    setModalNueva(true)
  }

  const cerrarNuevaSolicitud = () => {
    setModalNueva(false)

    setFormSolicitud({
      materialId: '',
      cantidadSolicitada: '',
      fechaSolicitud: new Date().toISOString().split('T')[0],
      observacion: ''
    })
  }

  const guardarNuevaSolicitud = async (e) => {
    e.preventDefault()

    if (!formSolicitud.materialId) {
      mostrarMensaje('Selecciona un material.', 'error')
      return
    }

    const cantidad = parseInt(formSolicitud.cantidadSolicitada, 10)

    if (!cantidad || cantidad <= 0) {
      mostrarMensaje(
        'La cantidad solicitada debe ser mayor que 0.',
        'error'
      )
      return
    }

    try {
      const codigo = generarCodigoSolicitud()

      await crearSolicitudMaterial(
        codigo,
        parseInt(formSolicitud.materialId, 10),
        cantidad,
        formSolicitud.observacion.trim() || null
      )

      cerrarNuevaSolicitud()

      await cargarDatos()

      mostrarMensaje(
        `Solicitud ${codigo} creada correctamente.`,
        'success'
      )
    } catch (error) {
      mostrarMensaje(
        'Error al crear la solicitud: ' + error.message,
        'error'
      )
    }
  }

  // =========================================================
  // REGISTRAR RECEPCIÓN
  // =========================================================

  const abrirRecepcion = (item) => {
    setSolicitudSeleccionada(item)

    setFormRecepcion({
      cantidad: '',
      fechaRecepcion: new Date().toISOString().split('T')[0],
      observacion: ''
    })

    setModalRecepcion(true)
  }

  const cerrarRecepcion = () => {
    setModalRecepcion(false)
    setSolicitudSeleccionada(null)

    setFormRecepcion({
      cantidad: '',
      fechaRecepcion: new Date().toISOString().split('T')[0],
      observacion: ''
    })
  }

  const guardarRecepcion = async (e) => {
    e.preventDefault()

    if (!solicitudSeleccionada) {
      return
    }

    const cantidad = parseInt(formRecepcion.cantidad, 10)

    if (!cantidad || cantidad <= 0) {
      mostrarMensaje(
        'La cantidad recibida debe ser mayor que 0.',
        'error'
      )
      return
    }

    if (cantidad > solicitudSeleccionada.pendiente) {
      mostrarMensaje(
        `No puedes recibir más de ${solicitudSeleccionada.pendiente} unidades pendientes.`,
        'error'
      )
      return
    }

    if (!formRecepcion.fechaRecepcion) {
      mostrarMensaje(
        'Selecciona la fecha de recepción.',
        'error'
      )
      return
    }

    try {
      await registrarRecepcionMaterial(
        solicitudSeleccionada.detalleId,
        cantidad,
        formRecepcion.fechaRecepcion,
        formRecepcion.observacion.trim() || null
      )

      cerrarRecepcion()

      await cargarDatos()

      mostrarMensaje(
        `Se registraron ${cantidad} unidades recibidas y se actualizó el stock.`,
        'success'
      )
    } catch (error) {
      mostrarMensaje(
        'Error al registrar la recepción: ' + error.message,
        'error'
      )
    }
  }

  // =========================================================
  // VER DETALLE
  // =========================================================

  const abrirDetalle = async (item) => {
    try {
      const detalle = await cargarDetalleSolicitudMaterial(
        item.solicitudId
      )

      setDetalleSeleccionado(detalle)
      setModalDetalle(true)
    } catch (error) {
      mostrarMensaje(
        'Error al cargar el detalle: ' + error.message,
        'error'
      )
    }
  }

  const cerrarDetalle = () => {
    setModalDetalle(false)
    setDetalleSeleccionado(null)
  }

  // =========================================================
  // ELIMINAR RECEPCIÓN
  // =========================================================

  const eliminarRecepcion = async (recepcion) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar esta recepción de ${recepcion.cantidad} unidades?\n\n` +
      'Esta acción también revertirá la entrada correspondiente del inventario.'
    )

    if (!confirmar) {
      return
    }

    try {
      await eliminarRecepcionMaterial(recepcion.id)

      await cargarDatos()

      if (detalleSeleccionado) {
        const detalleActualizado =
          await cargarDetalleSolicitudMaterial(
            detalleSeleccionado.id
          )

        setDetalleSeleccionado(detalleActualizado)
      }

      mostrarMensaje(
        'Recepción eliminada y movimiento de inventario revertido.',
        'success'
      )
    } catch (error) {
      mostrarMensaje(
        'Error al eliminar la recepción: ' + error.message,
        'error'
      )
    }
  }

  // =========================================================
  // ELIMINAR SOLICITUD
  // =========================================================

  const eliminarSolicitud = async () => {
    if (!detalleSeleccionado) {
      return
    }

    const codigo = detalleSeleccionado.codigo

    const detalles =
      detalleSeleccionado.detalle_solicitudes_materiales || []

    const totalRecibido = detalles.reduce((total, detalle) => {
      const recepciones = detalle.recepciones_materiales || []

      return (
        total +
        recepciones.reduce(
          (subtotal, recepcion) =>
            subtotal + Number(recepcion.cantidad || 0),
          0
        )
      )
    }, 0)

    let mensajeConfirmacion =
      `¿Deseas eliminar completamente la solicitud ${codigo}?`

    if (totalRecibido > 0) {
      mensajeConfirmacion +=
        `\n\nLa solicitud tiene ${totalRecibido} unidades recibidas.` +
        '\nTambién se revertirán todas las entradas asociadas en el inventario.'
    }

    mensajeConfirmacion +=
      '\n\nEsta acción no se puede deshacer.'

    const confirmar = window.confirm(mensajeConfirmacion)

    if (!confirmar) {
      return
    }

    try {
      await eliminarSolicitudMaterial(detalleSeleccionado.id)

      cerrarDetalle()

      await cargarDatos()

      mostrarMensaje(
        `Solicitud ${codigo} eliminada correctamente.`,
        'success'
      )
    } catch (error) {
      mostrarMensaje(
        'Error al eliminar la solicitud: ' + error.message,
        'error'
      )
    }
  }

  // =========================================================
  // FORMATO DE FECHA
  // =========================================================

  const formatearFecha = (fecha) => {
    if (!fecha) return '-'

    const fechaObj = new Date(fecha)

    if (Number.isNaN(fechaObj.getTime())) {
      return '-'
    }

    return fechaObj.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // =========================================================
  // BADGE DE ESTADO
  // =========================================================

  const EstadoBadge = ({ estado }) => {
    if (estado === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
          🟡 Pendiente
        </span>
      )
    }

    if (estado === 'PARCIAL') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          🔵 Recepción parcial
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        🟢 Completado
      </span>
    )
  }

  // =========================================================
  // CARGANDO
  // =========================================================

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>

          <p className="text-gray-600">
            Cargando solicitudes de materiales...
          </p>
        </div>
      </div>
    )
  }

  // =========================================================
  // DATOS PARA SELECT
  // =========================================================

  const materialesParaSolicitud = (materiales || [])
    .filter((material) => !String(material.codigo || '').startsWith('LIB'))
    .sort((a, b) =>
      String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es'
      )
    )

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          NOTIFICACIÓN
      ====================================================== */}
      {mensaje && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
          <div
            className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-md ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex-shrink-0">
              {mensaje.tipo === 'success' ? (
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            <p className="text-sm font-medium">
              {mensaje.texto}
            </p>

            <button
              onClick={() => setMensaje(null)}
              className="flex-shrink-0 ml-auto text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          ENCABEZADO
      ====================================================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              Solicitud de Materiales
            </h2>

            <p className="text-gray-600 mt-1">
              Registra las solicitudes y controla las recepciones pendientes.
            </p>
          </div>

          <button
            onClick={abrirNuevaSolicitud}
            className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm"
          >
            ＋ Nueva Solicitud
          </button>

        </div>
      </div>

      {/* =====================================================
          ESTADÍSTICAS
      ====================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-gray-400">
          <p className="text-sm text-gray-500">
            Total de solicitudes
          </p>

          <p className="text-3xl font-bold text-gray-800 mt-1">
            {estadisticas.total}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-yellow-400">
          <p className="text-sm text-gray-500">
            Pendientes
          </p>

          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {estadisticas.pendientes}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-400">
          <p className="text-sm text-gray-500">
            Recepción parcial
          </p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {estadisticas.parciales}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-400">
          <p className="text-sm text-gray-500">
            Completadas
          </p>

          <p className="text-3xl font-bold text-green-600 mt-1">
            {estadisticas.completadas}
          </p>
        </div>

      </div>

      {/* =====================================================
          FILTROS
      ====================================================== */}
      <div className="bg-white rounded-lg shadow-md p-5">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>

            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, código de material o nombre..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />

              <span className="absolute right-3 top-2.5 text-gray-400">
                🔎
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">🟡 Pendiente</option>
              <option value="PARCIAL">🔵 Recepción parcial</option>
              <option value="COMPLETADO">🟢 Completado</option>
            </select>
          </div>

        </div>

      </div>

      {/* =====================================================
          TABLA
      ====================================================== */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">

        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Solicitudes registradas
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {solicitudesFiltradas.length} solicitud(es) mostrada(s)
            </p>
          </div>
        </div>

        {solicitudesFiltradas.length === 0 ? (
          <div className="p-12 text-center">

            <div className="text-5xl mb-4">
              📋
            </div>

            <h3 className="text-lg font-semibold text-gray-700">
              No hay solicitudes
            </h3>

            <p className="text-gray-500 mt-1">
              {busqueda || filtroEstado !== 'TODOS'
                ? 'No se encontraron solicitudes con los filtros seleccionados.'
                : 'Todavía no se ha registrado ninguna solicitud de materiales.'}
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-gray-200">

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Solicitud
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Material
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Solicitado
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Recibido
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Pendiente
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>

                </tr>

              </thead>

              <tbody className="bg-white divide-y divide-gray-200">

                {solicitudesFiltradas.map((item) => (

                  <tr
                    key={item.detalleId}
                    className="hover:bg-gray-50"
                  >

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-800">
                        {item.codigo}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatearFecha(item.fechaSolicitud)}
                    </td>

                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.material?.nombre || '-'}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {item.material?.codigo || '-'}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center font-semibold text-gray-700">
                      {item.solicitado}
                    </td>

                    <td className="px-4 py-4 text-center font-semibold text-blue-600">
                      {item.recibido}
                    </td>

                    <td className="px-4 py-4 text-center font-semibold text-orange-600">
                      {item.pendiente}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <EstadoBadge estado={item.estado} />
                    </td>

                    <td className="px-4 py-4">

                      <div className="flex items-center justify-center gap-2">

                        {item.estado !== 'COMPLETADO' && (
                          <button
                            onClick={() => abrirRecepcion(item)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium"
                            title="Registrar recepción"
                          >
                            Registrar
                          </button>
                        )}

                        <button
                          onClick={() => abrirDetalle(item)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 text-sm font-medium"
                          title="Ver detalle"
                        >
                          Ver
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =====================================================
          MODAL NUEVA SOLICITUD
      ====================================================== */}
      {modalNueva && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Nueva Solicitud de Material
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Registra la cantidad que deseas solicitar.
                </p>
              </div>

              <button
                onClick={cerrarNuevaSolicitud}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={guardarNuevaSolicitud}
              className="p-6 space-y-5"
            >

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material *
                </label>

                <select
                  value={formSolicitud.materialId}
                  onChange={(e) =>
                    setFormSolicitud((prev) => ({
                      ...prev,
                      materialId: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                >
                  <option value="">
                    Selecciona un material
                  </option>

                  {materialesParaSolicitud.map((material) => (
                    <option
                      key={material.id}
                      value={material.id}
                    >
                      {material.codigo} - {material.nombre}
                    </option>
                  ))}

                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad solicitada *
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={formSolicitud.cantidadSolicitada}
                    onChange={(e) =>
                      setFormSolicitud((prev) => ({
                        ...prev,
                        cantidadSolicitada: e.target.value
                      }))
                    }
                    placeholder="Ej. 10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de solicitud *
                  </label>

                  <input
                    type="date"
                    value={formSolicitud.fechaSolicitud}
                    onChange={(e) =>
                      setFormSolicitud((prev) => ({
                        ...prev,
                        fechaSolicitud: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observación
                </label>

                <textarea
                  value={formSolicitud.observacion}
                  onChange={(e) =>
                    setFormSolicitud((prev) => ({
                      ...prev,
                      observacion: e.target.value
                    }))
                  }
                  rows="3"
                  placeholder="Observaciones de la solicitud..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">

                <p className="text-sm text-blue-800">
                  ℹ️ Crear una solicitud <strong>no modifica el stock</strong>.
                  El inventario se actualizará únicamente cuando registres una recepción.
                </p>

              </div>

              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={cerrarNuevaSolicitud}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Crear Solicitud
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          MODAL RECEPCIÓN
      ====================================================== */}
            {/* =====================================================
          MODAL RECEPCIÓN
      ====================================================== */}
      {modalRecepcion && solicitudSeleccionada && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* ENCABEZADO */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">

              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Registrar Recepción
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {solicitudSeleccionada.codigo}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarRecepcion}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            {/* FORMULARIO */}
            <form
              onSubmit={guardarRecepcion}
              className="flex flex-col min-h-0"
            >

              {/* CONTENIDO CON SCROLL */}
              <div className="p-6 space-y-5 overflow-y-auto">

                <div className="bg-gray-50 rounded-lg p-4">

                  <div className="grid grid-cols-2 gap-4">

                    <div>
                      <p className="text-xs text-gray-500">
                        Material
                      </p>

                      <p className="font-semibold text-gray-800 mt-1">
                        {solicitudSeleccionada.material?.nombre}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {solicitudSeleccionada.material?.codigo}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Cantidad solicitada
                      </p>

                      <p className="text-xl font-bold text-gray-800 mt-1">
                        {solicitudSeleccionada.solicitado}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Ya recibido
                      </p>

                      <p className="text-xl font-bold text-blue-600 mt-1">
                        {solicitudSeleccionada.recibido}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Pendiente
                      </p>

                      <p className="text-xl font-bold text-orange-600 mt-1">
                        {solicitudSeleccionada.pendiente}
                      </p>
                    </div>

                  </div>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad recibida *
                  </label>

                  <input
                    type="number"
                    min="1"
                    max={solicitudSeleccionada.pendiente}
                    value={formRecepcion.cantidad}
                    onChange={(e) =>
                      setFormRecepcion((prev) => ({
                        ...prev,
                        cantidad: e.target.value
                      }))
                    }
                    placeholder={`Máximo ${solicitudSeleccionada.pendiente}`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    Máximo permitido: {solicitudSeleccionada.pendiente}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de recepción *
                  </label>

                  <input
                    type="date"
                    value={formRecepcion.fechaRecepcion}
                    onChange={(e) =>
                      setFormRecepcion((prev) => ({
                        ...prev,
                        fechaRecepcion: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observación
                  </label>

                  <textarea
                    value={formRecepcion.observacion}
                    onChange={(e) =>
                      setFormRecepcion((prev) => ({
                        ...prev,
                        observacion: e.target.value
                      }))
                    }
                    rows="3"
                    placeholder="Observaciones de la recepción..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">

                  <p className="text-sm text-green-800">
                    📦 Al registrar esta recepción, la cantidad recibida se
                    agregará automáticamente al stock del material.
                  </p>

                </div>

              </div>

              {/* BOTONES SIEMPRE VISIBLES */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0">

                <button
                  type="button"
                  onClick={cerrarRecepcion}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Registrar Recepción
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          MODAL DETALLE
      ====================================================== */}
      {modalDetalle && detalleSeleccionado && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">

              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Detalle de Solicitud
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {detalleSeleccionado.codigo}
                </p>
              </div>

              <button
                onClick={cerrarDetalle}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            <div className="p-6 space-y-6">

              {(() => {
                const detalles =
                  detalleSeleccionado.detalle_solicitudes_materiales || []

                return detalles.map((detalle) => {

                  const recepciones =
                    detalle.recepciones_materiales || []

                  const solicitado =
                    Number(detalle.cantidad_solicitada || 0)

                  const recibido =
                    recepciones.reduce(
                      (total, recepcion) =>
                        total + Number(recepcion.cantidad || 0),
                      0
                    )

                  const pendiente =
                    Math.max(solicitado - recibido, 0)

                  let estado = 'PENDIENTE'

                  if (recibido > 0 && recibido < solicitado) {
                    estado = 'PARCIAL'
                  }

                  if (recibido >= solicitado) {
                    estado = 'COMPLETADO'
                  }

                  return (
                    <div
                      key={detalle.id}
                      className="space-y-6"
                    >

                      {/* INFORMACIÓN GENERAL */}

                      <div className="bg-gray-50 rounded-lg p-5">

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                          <div>
                            <p className="text-xs text-gray-500">
                              Material
                            </p>

                            <p className="font-semibold text-gray-800 mt-1">
                              {detalle.materiales?.nombre || '-'}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {detalle.materiales?.codigo || '-'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Cantidad solicitada
                            </p>

                            <p className="text-2xl font-bold text-gray-800 mt-1">
                              {solicitado}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Cantidad recibida
                            </p>

                            <p className="text-2xl font-bold text-blue-600 mt-1">
                              {recibido}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Pendiente
                            </p>

                            <p className="text-2xl font-bold text-orange-600 mt-1">
                              {pendiente}
                            </p>
                          </div>

                        </div>

                        <div className="mt-5 flex items-center justify-between">

                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              Estado
                            </p>

                            <EstadoBadge estado={estado} />
                          </div>

                          <div className="text-right">

                            <p className="text-xs text-gray-500">
                              Fecha de solicitud
                            </p>

                            <p className="font-medium text-gray-700 mt-1">
                              {formatearFecha(
                                detalleSeleccionado.fecha_solicitud
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* OBSERVACIÓN */}

                      {detalleSeleccionado.observacion && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">

                          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                            Observación de la solicitud
                          </p>

                          <p className="text-sm text-blue-900">
                            {detalleSeleccionado.observacion}
                          </p>

                        </div>
                      )}

                      {/* HISTORIAL */}

                      <div>

                        <div className="flex items-center justify-between mb-4">

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">
                              Historial de Recepciones
                            </h4>

                            <p className="text-sm text-gray-500">
                              {recepciones.length} recepción(es) registrada(s)
                            </p>
                          </div>

                        </div>

                        {recepciones.length === 0 ? (
                          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">

                            <div className="text-4xl mb-3">
                              📦
                            </div>

                            <p className="font-medium text-gray-700">
                              No hay recepciones registradas
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              Todavía no se ha recibido material de esta solicitud.
                            </p>

                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-gray-200 rounded-lg">

                            <table className="min-w-full divide-y divide-gray-200">

                              <thead className="bg-gray-50">

                                <tr>

                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Fecha
                                  </th>

                                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                    Cantidad
                                  </th>

                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Observación
                                  </th>

                                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                    Acción
                                  </th>

                                </tr>

                              </thead>

                              <tbody className="divide-y divide-gray-200">

                                {recepciones.map((recepcion) => (

                                  <tr
                                    key={recepcion.id}
                                    className="hover:bg-gray-50"
                                  >

                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      {formatearFecha(
                                        recepcion.fecha_recepcion
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                      <span className="font-semibold text-green-600">
                                        +{recepcion.cantidad}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {recepcion.observacion || '-'}
                                    </td>

                                    <td className="px-4 py-3 text-center">

                                      <button
                                        onClick={() =>
                                          eliminarRecepcion(recepcion)
                                        }
                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 text-sm"
                                        title="Eliminar recepción"
                                      >
                                        🗑️ Eliminar
                                      </button>

                                    </td>

                                  </tr>

                                ))}

                              </tbody>

                            </table>

                          </div>
                        )}

                      </div>

                    </div>
                  )
                })
              })()}

              {/* =================================================
                  ACCIONES DE LA SOLICITUD
              ================================================== */}

              <div className="pt-5 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-3">

                <button
                  onClick={eliminarSolicitud}
                  className="px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
                >
                  🗑️ Eliminar Solicitud
                </button>

                <div className="flex justify-end gap-3">

                  <button
                    onClick={cerrarDetalle}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cerrar
                  </button>

                </div>

              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">

                <p className="text-sm text-yellow-800">
                  ⚠️ Al eliminar una solicitud, también se eliminan sus
                  recepciones y se revierten las entradas de inventario
                  asociadas.
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default GestorSolicitudesMateriales