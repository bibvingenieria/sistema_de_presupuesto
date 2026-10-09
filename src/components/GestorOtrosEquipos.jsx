
import { useEffect, useMemo, useState } from 'react'

const UBICACIONES = [
  'Sala A',
  'Sala B',
  'Sala C',
  'Sala de Control',
  'Jefatura',
  'Entrada',
  'Servidor',
  'Otro'
]

const ESTADOS = [
  'Operativo',
  'En mantenimiento',
  'Inactivo',
  'En baja'
]

const FORMULARIO_VACIO = {
  nombre: '',
  numero_inventario: '',
  modelo: '',
  marca: '',
  numero_serie: '',
  ubicacion: 'Sala A',
  estado: 'Operativo'
}

const GestorOtrosEquipos = ({
  cargarOtrosEquipos,
  agregarOtroEquipo,
  editarOtroEquipo,
  eliminarOtroEquipo
}) => {
  const [equipos, setEquipos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroUbicacion, setFiltroUbicacion] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [equipoEditando, setEquipoEditando] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  
  const [error, setError] = useState('')
useEffect(() => {
  if (!error) return

  const temporizador = setTimeout(() => {
    setError('')
  }, 3000)

  return () => clearTimeout(temporizador)
}, [error])

  
const [notificacion, setNotificacion] = useState('')
useEffect(() => {
  if (!notificacion) return

  const temporizador = setTimeout(() => {
    setNotificacion('')
  }, 3000)

  return () => clearTimeout(temporizador)
}, [notificacion])


  const cargarDatos = async () => {
    setCargando(true)
    setError('')

    try {
      const datos = await cargarOtrosEquipos()
      setEquipos(datos || [])
    } catch (err) {
      setError('No se pudieron cargar los equipos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const equiposFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return equipos.filter(equipo => {
      const coincideBusqueda = [
        equipo.nombre,
        equipo.numero_inventario,
        equipo.modelo,
        equipo.marca,
        equipo.numero_serie
      ].some(valor =>
        (valor || '').toLowerCase().includes(texto)
      )

      const coincideUbicacion =
        filtroUbicacion === 'Todas' ||
        equipo.ubicacion === filtroUbicacion

      const coincideEstado =
        filtroEstado === 'Todos' ||
        equipo.estado === filtroEstado

      return coincideBusqueda &&
        coincideUbicacion &&
        coincideEstado
    })
  }, [equipos, busqueda, filtroUbicacion, filtroEstado])

  const estadisticas = useMemo(() => ({
    total: equipos.length,
    operativos: equipos.filter(e => e.estado === 'Operativo').length,
    mantenimiento: equipos.filter(
      e => e.estado === 'En mantenimiento'
    ).length,
    baja: equipos.filter(e => e.estado === 'En baja').length
  }), [equipos])

  const abrirNuevo = () => {
    setEquipoEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setError('')
    setModalAbierto(true)
  }

  const abrirEdicion = equipo => {
    setEquipoEditando(equipo)
    setFormulario({
      nombre: equipo.nombre || '',
      numero_inventario: equipo.numero_inventario || '',
      modelo: equipo.modelo || '',
      marca: equipo.marca || '',
      numero_serie: equipo.numero_serie || '',
      ubicacion: equipo.ubicacion || 'Sala A',
      estado: equipo.estado || 'Operativo'
    })
    setError('')
    setModalAbierto(true)
  }

  const actualizarCampo = (campo, valor) => {
    setFormulario(actual => ({
      ...actual,
      [campo]: valor
    }))
  }

  const guardarEquipo = async evento => {
    evento.preventDefault()
    setError('')
    setNotificacion('')

    const datos = {
      nombre: formulario.nombre.trim(),
      numero_inventario: formulario.numero_inventario.trim(),
      modelo: formulario.modelo.trim() || null,
      marca: formulario.marca.trim() || null,
      numero_serie: formulario.numero_serie.trim() || null,
      ubicacion: formulario.ubicacion,
      estado: formulario.estado
    }

    if (!datos.nombre || !datos.numero_inventario) {
      setError('El nombre y el número de inventario son obligatorios.')
      return
    }

    setGuardando(true)

    try {
      if (equipoEditando) {
        const actualizado = await editarOtroEquipo(
          equipoEditando.id,
          datos
        )

        setEquipos(actuales =>
          actuales.map(equipo =>
            equipo.id === equipoEditando.id
              ? actualizado
              : equipo
          )
        )

        setNotificacion('Equipo actualizado correctamente.')
      } else {
        const nuevo = await agregarOtroEquipo(datos)

        setEquipos(actuales =>
          [...actuales, nuevo].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es')
          )
        )

        setNotificacion('Equipo registrado correctamente.')
      }

      setModalAbierto(false)
      setFormulario(FORMULARIO_VACIO)
      setEquipoEditando(null)
    } catch (err) {
      if (err.code === '23505') {
        setError('Ese número de inventario ya está registrado.')
      } else {
        setError('No se pudo guardar el equipo: ' + err.message)
      }
    } finally {
      setGuardando(false)
    }
  }

  const eliminarEquipo = async equipo => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar "${equipo.nombre}" del inventario?`
    )

    if (!confirmar) return

    setError('')
    setNotificacion('')

    try {
      await eliminarOtroEquipo(equipo.id)

      setEquipos(actuales =>
        actuales.filter(item => item.id !== equipo.id)
      )

      setNotificacion('Equipo eliminado correctamente.')
    } catch (err) {
      setError('No se pudo eliminar el equipo: ' + err.message)
    }
  }

  const claseEstado = estado => {
    switch (estado) {
      case 'Operativo':
        return 'bg-green-100 text-green-800'
      case 'En mantenimiento':
        return 'bg-amber-100 text-amber-800'
      case 'Inactivo':
        return 'bg-gray-100 text-gray-700'
      case 'En baja':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const campoClase =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 ' +
    'text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500'

  const etiquetaClase =
    'mb-1.5 block text-sm font-medium text-gray-700'

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            📦 Otros equipos
          </h2>
          <p className="mt-1 text-gray-600">
            Registro y control de equipos diversos de la biblioteca.
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          + Agregar equipo
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            titulo: 'Equipos registrados',
            cantidad: estadisticas.total,
            color: 'text-gray-800'
          },
          {
            titulo: 'Operativos',
            cantidad: estadisticas.operativos,
            color: 'text-green-600'
          },
          {
            titulo: 'En mantenimiento',
            cantidad: estadisticas.mantenimiento,
            color: 'text-amber-600'
          },
          {
            titulo: 'En baja',
            cantidad: estadisticas.baja,
            color: 'text-red-600'
          }
        ].map(item => (
          <div
            key={item.titulo}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{item.titulo}</p>
            <p className={`mt-2 text-3xl font-bold ${item.color}`}>
              {item.cantidad}
            </p>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <label className={etiquetaClase}>
              Buscar equipo
            </label>
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, inventario, marca, modelo o serie..."
              className={campoClase}
            />
          </div>

          <div className="lg:col-span-3">
            <label className={etiquetaClase}>Ubicación</label>
            <select
              value={filtroUbicacion}
              onChange={e => setFiltroUbicacion(e.target.value)}
              className={campoClase}
            >
              <option value="Todas">Todas las ubicaciones</option>
              {UBICACIONES.map(ubicacion => (
                <option key={ubicacion} value={ubicacion}>
                  {ubicacion}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className={etiquetaClase}>Estado</label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className={campoClase}
            >
              <option value="Todos">Todos los estados</option>
              {ESTADOS.map(estado => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setBusqueda('')
              setFiltroUbicacion('Todas')
              setFiltroEstado('Todos')
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && !modalAbierto && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notificacion && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {notificacion}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800">
            Equipos registrados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {equiposFiltrados.length} equipo(s) mostrado(s)
          </p>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-gray-500">
            Cargando equipos...
          </div>
        ) : equiposFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">
              No se encontraron equipos.
            </p>
            {equipos.length === 0 && (
              <button
                onClick={abrirNuevo}
                className="mt-4 font-semibold text-emerald-700 hover:underline"
              >
                Registrar el primer equipo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-4 py-3 font-semibold">N.º inventario</th>
                  <th className="px-4 py-3 font-semibold">Marca</th>
                  <th className="px-4 py-3 font-semibold">Modelo</th>
                  <th className="px-4 py-3 font-semibold">N.º serie</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {equiposFiltrados.map(equipo => (
                  <tr key={equipo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-800">
                      {equipo.nombre}
                    </td>
                    <td className="px-4 py-4 font-mono text-gray-700">
                      {equipo.numero_inventario}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {equipo.marca || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {equipo.modelo || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {equipo.numero_serie || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {equipo.ubicacion}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${claseEstado(equipo.estado)}`}>
                        {equipo.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => abrirEdicion(equipo)}
                          className="rounded-md bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarEquipo(equipo)}
                          className="rounded-md bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100"
                        >
                          Eliminar
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

      {/* Modal de registro y edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {equipoEditando ? 'Editar equipo' : 'Agregar equipo'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Completa los datos del equipo.
                </p>
              </div>

              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarEquipo}
              className="flex min-h-0 flex-col"
            >
              <div className="space-y-4 overflow-y-auto p-5">
                <div>
                  <label className={etiquetaClase}>
                    Nombre del equipo *
                  </label>
                  <input
                    required
                    maxLength={200}
                    value={formulario.nombre}
                    onChange={e => actualizarCampo('nombre', e.target.value)}
                    placeholder="Ej. Proyector multimedia"
                    className={campoClase}
                  />
                </div>

                <div>
                  <label className={etiquetaClase}>
                    Número de inventario *
                  </label>
                  <input
                    required
                    maxLength={50}
                    value={formulario.numero_inventario}
                    onChange={e =>
                      actualizarCampo('numero_inventario', e.target.value)
                    }
                    placeholder="Ej. 002476"
                    className={campoClase}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Debe ser único y corresponde a un solo equipo.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={etiquetaClase}>Marca</label>
                    <input
                      maxLength={150}
                      value={formulario.marca}
                      onChange={e => actualizarCampo('marca', e.target.value)}
                      placeholder="Ej. NEC"
                      className={campoClase}
                    />
                  </div>

                  <div>
                    <label className={etiquetaClase}>Modelo</label>
                    <input
                      maxLength={150}
                      value={formulario.modelo}
                      onChange={e => actualizarCampo('modelo', e.target.value)}
                      placeholder="Ej. M361X"
                      className={campoClase}
                    />
                  </div>
                </div>

                <div>
                  <label className={etiquetaClase}>Número de serie</label>
                  <input
                    maxLength={150}
                    value={formulario.numero_serie}
                    onChange={e =>
                      actualizarCampo('numero_serie', e.target.value)
                    }
                    placeholder="Número de serie del equipo"
                    className={campoClase}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={etiquetaClase}>Ubicación *</label>
                    <select
                      required
                      value={formulario.ubicacion}
                      onChange={e =>
                        actualizarCampo('ubicacion', e.target.value)
                      }
                      className={campoClase}
                    >
                      {UBICACIONES.map(ubicacion => (
                        <option key={ubicacion} value={ubicacion}>
                          {ubicacion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={etiquetaClase}>Estado *</label>
                    <select
                      required
                      value={formulario.estado}
                      onChange={e =>
                        actualizarCampo('estado', e.target.value)
                      }
                      className={campoClase}
                    >
                      {ESTADOS.map(estado => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-200 bg-white p-5">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? 'Guardando...'
                    : equipoEditando
                      ? 'Guardar cambios'
                      : 'Registrar equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestorOtrosEquipos
