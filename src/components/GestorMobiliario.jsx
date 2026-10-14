
import { useEffect, useMemo, useState } from 'react'

const UBICACIONES = [
  'Sala A',
  'Sala B',
  'Sala C',
  'Sala de Control',
  'Jefatura'
]

const ESTADOS = [
  'Operativo',
  'Mantenimiento',
  'Baja'
]

const FORMULARIO_INICIAL = {
  nombre: '',
  numero_inventario: '',
  ubicacion: '',
  estado: 'Operativo'
}

export default function GestorMobiliario({
  cargarMobiliario,
  agregarMobiliario,
  editarMobiliario,
  eliminarMobiliario
}) {
  const [mobiliario, setMobiliario] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroUbicacion, setFiltroUbicacion] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mobiliarioEditar, setMobiliarioEditar] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState('')
  const [error, setError] = useState('')

  // Cargar mobiliario
  const obtenerMobiliario = async () => {
    try {
      setCargando(true)
      const data = await cargarMobiliario()
      setMobiliario(data || [])
    } catch (err) {
      setError('No se pudo cargar el mobiliario: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    obtenerMobiliario()
  }, [])

  // Ocultar notificaciones automáticamente
  useEffect(() => {
    if (!notificacion) return

    const timer = setTimeout(() => {
      setNotificacion('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [notificacion])

  useEffect(() => {
    if (!error) return

    const timer = setTimeout(() => {
      setError('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [error])

  // Filtrar mobiliario
  const mobiliarioFiltrado = useMemo(() => {
    return mobiliario.filter((item) => {
      const coincideBusqueda =
        item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.numero_inventario?.toLowerCase().includes(busqueda.toLowerCase())

      const coincideUbicacion =
        !filtroUbicacion || item.ubicacion === filtroUbicacion

      const coincideEstado =
        !filtroEstado || item.estado === filtroEstado

      return coincideBusqueda && coincideUbicacion && coincideEstado
    })
  }, [mobiliario, busqueda, filtroUbicacion, filtroEstado])

  // Estadísticas
  const totalMobiliario = mobiliario.length
  const totalOperativos = mobiliario.filter(
    (item) => item.estado === 'Operativo'
  ).length
  const totalMantenimiento = mobiliario.filter(
    (item) => item.estado === 'Mantenimiento'
  ).length
  const totalBaja = mobiliario.filter(
    (item) => item.estado === 'Baja'
  ).length

  // Abrir formulario para registrar
  const abrirNuevo = () => {
    setMobiliarioEditar(null)
    setFormulario(FORMULARIO_INICIAL)
    setMostrarModal(true)
    setError('')
  }

  // Abrir formulario para editar
  const abrirEditar = (item) => {
    setMobiliarioEditar(item)
    setFormulario({
      nombre: item.nombre || '',
      numero_inventario: item.numero_inventario || '',
      ubicacion: item.ubicacion || '',
      estado: item.estado || 'Operativo'
    })
    setMostrarModal(true)
    setError('')
  }

  // Guardar mobiliario
  const guardarMobiliario = async (e) => {
    e.preventDefault()

    if (
      !formulario.nombre.trim() ||
      !formulario.numero_inventario.trim() ||
      !formulario.ubicacion ||
      !formulario.estado
    ) {
      setError('Completa todos los campos.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      const datos = {
        nombre: formulario.nombre.trim(),
        numero_inventario: formulario.numero_inventario.trim(),
        ubicacion: formulario.ubicacion,
        estado: formulario.estado
      }

      if (mobiliarioEditar) {
        await editarMobiliario(mobiliarioEditar.id, datos)
        setNotificacion('Mobiliario actualizado correctamente.')
      } else {
        await agregarMobiliario(datos)
        setNotificacion('Mobiliario registrado correctamente.')
      }

      setMostrarModal(false)
      setFormulario(FORMULARIO_INICIAL)
      setMobiliarioEditar(null)
      await obtenerMobiliario()
    } catch (err) {
      setError(
        err.code === '23505'
          ? 'Ese número de inventario ya está registrado.'
          : 'No se pudo guardar: ' + err.message
      )
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar mobiliario
  const borrarMobiliario = async (item) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar "${item.nombre}" del inventario?`
    )

    if (!confirmar) return

    try {
      await eliminarMobiliario(item.id)
      setNotificacion('Mobiliario eliminado correctamente.')
      await obtenerMobiliario()
    } catch (err) {
      setError('No se pudo eliminar: ' + err.message)
    }
  }

  // Colores según estado
  const colorEstado = (estado) => {
    switch (estado) {
      case 'Operativo':
        return 'bg-green-100 text-green-700'
      case 'Mantenimiento':
        return 'bg-yellow-100 text-yellow-700'
      case 'Baja':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Inventario de Mobiliario
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra los muebles y bienes del Centro de Documentación.
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700 transition"
        >
          + Registrar mobiliario
        </button>
      </div>

      {/* Notificaciones */}
      {notificacion && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          ✓ {notificacion}
        </div>
      )}

      {error && !mostrarModal && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total mobiliario</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {totalMobiliario}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Operativos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {totalOperativos}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Mantenimiento</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {totalMantenimiento}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">De baja</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {totalBaja}
          </p>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          <input
            type="text"
            placeholder="Buscar por nombre o N.º de inventario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />

          <select
            value={filtroUbicacion}
            onChange={(e) => setFiltroUbicacion(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas las ubicaciones</option>
            {UBICACIONES.map((ubicacion) => (
              <option key={ubicacion} value={ubicacion}>
                {ubicacion}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            Mostrando {mobiliarioFiltrado.length} de {totalMobiliario} registros
          </p>

          {(busqueda || filtroUbicacion || filtroEstado) && (
            <button
              onClick={() => {
                setBusqueda('')
                setFiltroUbicacion('')
                setFiltroEstado('')
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-4 font-semibold">Nombre de Mobiliario</th>
                <th className="px-5 py-4 font-semibold">N.º de Inventario</th>
                <th className="px-5 py-4 font-semibold">Ubicación</th>
                <th className="px-5 py-4 font-semibold">Estado</th>
                <th className="px-5 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    Cargando mobiliario...
                  </td>
                </tr>
              ) : mobiliarioFiltrado.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    No se encontraron registros de mobiliario.
                  </td>
                </tr>
              ) : (
                mobiliarioFiltrado.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {item.nombre}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.numero_inventario}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.ubicacion}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(item.estado)}`}>
                        {item.estado}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => abrirEditar(item)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => borrarMobiliario(item)}
                          className="font-medium text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de registro y edición */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {mobiliarioEditar ? 'Editar mobiliario' : 'Registrar mobiliario'}
              </h3>

              <button
                onClick={() => setMostrarModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={guardarMobiliario} className="space-y-4">

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nombre de Mobiliario *
                </label>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) =>
                    setFormulario({ ...formulario, nombre: e.target.value })
                  }
                  placeholder="Ej. Escritorio, silla, estante..."
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  N.º de Inventario *
                </label>
                <input
                  type="text"
                  value={formulario.numero_inventario}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      numero_inventario: e.target.value
                    })
                  }
                  placeholder="Ej. MOB-001"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ubicación *
                </label>
                <select
                  value={formulario.ubicacion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, ubicacion: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar ubicación</option>
                  {UBICACIONES.map((ubicacion) => (
                    <option key={ubicacion} value={ubicacion}>
                      {ubicacion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Estado *
                </label>
                <select
                  value={formulario.estado}
                  onChange={(e) =>
                    setFormulario({ ...formulario, estado: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {guardando
                    ? 'Guardando...'
                    : mobiliarioEditar
                      ? 'Guardar cambios'
                      : 'Registrar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
