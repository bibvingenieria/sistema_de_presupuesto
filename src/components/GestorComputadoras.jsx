import { useEffect, useMemo, useState } from 'react'

const estados = [
  'Operativo',
  'En mantenimiento',
  'Baja',
  'Sin verificar'
]

const salasDisponibles = [
  'Sala A',
  'Sala B',
  'Sala C',
  'Sala de Control',
  'Jefatura'
]

const formularioInicial = {
  // Identificación y ubicación
  codigo: '',
  sala: '',
  ubicacion: '',
  marca_pc: '',
  modelo_pc: '',
  service_tag: '',
  numero_serie: '',

  // CPU
  cpu_codigo_inventario: '',
  cpu: '',
  ram_gb: '',
  disco: '',
  sistema_operativo: '',

  // Monitor
  monitor_codigo_inventario: '',
  monitor_marca: '',
  monitor_modelo: '',
  monitor_serie: '',

  // Teclado
  teclado_codigo_inventario: '',
  teclado_marca: '',
  teclado_modelo: '',
  teclado_serie: '',

  // Mouse
  mouse_codigo_inventario: '',
  mouse_marca: '',
  mouse_modelo: '',
  mouse_serie: '',

  // Estado
  estado: 'Operativo',
  observaciones: ''
}

// =========================================================
// CAMPO REUTILIZABLE
// =========================================================

const Campo = ({
  etiqueta,
  tipo = 'text',
  placeholder = '',
  valor,
  onChange
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {etiqueta}
      </label>

      <input
        type={tipo}
        value={valor ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

// =========================================================
// TÍTULO DE COMPONENTE
// =========================================================

const TituloComponente = ({ icono, titulo }) => {
  return (
    <div className="mb-4">
      <h5 className="text-base font-semibold text-gray-800">
        {icono} {titulo}
      </h5>
    </div>
  )
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

const GestorComputadoras = ({
  cargarComputadoras,
  agregarComputadora,
  editarComputadora,
  eliminarComputadora
}) => {
  const [computadoras, setComputadoras] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroSala, setFiltroSala] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)

  const [computadoraSeleccionada, setComputadoraSeleccionada] =
    useState(null)

  const [formulario, setFormulario] = useState(formularioInicial)

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // =========================================================
  // OCULTAR MENSAJE AUTOMÁTICAMENTE
  // =========================================================

  useEffect(() => {
    if (!mensaje) return

    const temporizador = setTimeout(() => {
      setMensaje(null)
    }, 3000)

    return () => clearTimeout(temporizador)
  }, [mensaje])

  // =========================================================
  // CARGAR COMPUTADORAS
  // =========================================================

  const cargarDatos = async () => {
    try {
      const datos = await cargarComputadoras()
      setComputadoras(datos || [])
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.message ||
          'No se pudo cargar el inventario de computadoras.'
      })
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // =========================================================
  // ESTADÍSTICAS
  // =========================================================

  const estadisticas = useMemo(() => {
    const total = computadoras.length

    const operativas = computadoras.filter(
      computadora => computadora.estado === 'Operativo'
    ).length

    const mantenimiento = computadoras.filter(
      computadora => computadora.estado === 'En mantenimiento'
    ).length

    const baja = computadoras.filter(
      computadora => computadora.estado === 'Baja'
    ).length

    return {
      total,
      operativas,
      mantenimiento,
      baja
    }
  }, [computadoras])

  // =========================================================
  // FILTRAR COMPUTADORAS
  // =========================================================

  const computadorasFiltradas = useMemo(() => {
    return computadoras.filter(computadora => {
      const texto = busqueda.toLowerCase().trim()

      const contenido = [
        computadora.codigo,
        computadora.sala,
        computadora.ubicacion,
        computadora.marca_pc,
        computadora.modelo_pc,
        computadora.service_tag,
        computadora.numero_serie,

        // CPU
        computadora.cpu_codigo_inventario,
        computadora.cpu,
        computadora.ram_gb,
        computadora.disco,
        computadora.sistema_operativo,

        // Monitor
        computadora.monitor_codigo_inventario,
        computadora.monitor_marca,
        computadora.monitor_modelo,
        computadora.monitor_serie,

        // Teclado
        computadora.teclado_codigo_inventario,
        computadora.teclado_marca,
        computadora.teclado_modelo,
        computadora.teclado_serie,

        // Mouse
        computadora.mouse_codigo_inventario,
        computadora.mouse_marca,
        computadora.mouse_modelo,
        computadora.mouse_serie,

        computadora.estado
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const coincideBusqueda =
        !texto || contenido.includes(texto)

      const coincideSala =
        filtroSala === 'todas' ||
        computadora.sala === filtroSala

      const coincideEstado =
        filtroEstado === 'todos' ||
        computadora.estado === filtroEstado

      return (
        coincideBusqueda &&
        coincideSala &&
        coincideEstado
      )
    })
  }, [
    computadoras,
    busqueda,
    filtroSala,
    filtroEstado
  ])

  // =========================================================
  // ABRIR NUEVA PC
  // =========================================================

  const abrirNuevo = () => {
    setFormulario({
      ...formularioInicial
    })

    setModoEdicion(false)
    setComputadoraSeleccionada(null)
    setMensaje(null)
    setMostrarFormulario(true)
  }

  // =========================================================
  // ABRIR EDICIÓN
  // =========================================================

  const abrirEditar = computadora => {
    setFormulario({
      ...formularioInicial,
      ...computadora,
      ram_gb: computadora.ram_gb ?? ''
    })

    setComputadoraSeleccionada(computadora)
    setModoEdicion(true)
    setMensaje(null)
    setMostrarFormulario(true)
  }

  // =========================================================
  // CERRAR FORMULARIO
  // =========================================================

  const cerrarFormulario = () => {
    setMostrarFormulario(false)
    setModoEdicion(false)
    setComputadoraSeleccionada(null)

    setFormulario({
      ...formularioInicial
    })

    setMensaje(null)
  }

  // =========================================================
  // CAMBIAR CAMPO
  // =========================================================

  const cambiarCampo = (campo, valor) => {
    setFormulario(actual => ({
      ...actual,
      [campo]: valor
    }))
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  const guardarComputadora = async () => {
    if (!formulario.codigo.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'El código / N.º de PC es obligatorio.'
      })

      return
    }

    try {
      setGuardando(true)
      setMensaje(null)

      const datos = {
        ...formulario,
        codigo: formulario.codigo.trim(),
        ram_gb: formulario.ram_gb
          ? parseInt(formulario.ram_gb)
          : null
      }

      if (modoEdicion && computadoraSeleccionada) {
        await editarComputadora(
          computadoraSeleccionada.id,
          datos
        )
      } else {
        await agregarComputadora(datos)
      }

      const mensajeExito = modoEdicion
        ? 'Computadora actualizada correctamente.'
        : 'Computadora registrada correctamente.'

      cerrarFormulario()

      await cargarDatos()

      setMensaje({
        tipo: 'exito',
        texto: mensajeExito
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.message ||
          'No se pudo guardar la computadora.'
      })
    } finally {
      setGuardando(false)
    }
  }

  // =========================================================
  // ELIMINAR
  // =========================================================

  const eliminar = async computadora => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar la computadora ${computadora.codigo}?`
    )

    if (!confirmar) return

    try {
      setMensaje(null)

      await eliminarComputadora(computadora.id)

      await cargarDatos()

      setMensaje({
        tipo: 'exito',
        texto: 'Computadora eliminada correctamente.'
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.message ||
          'No se pudo eliminar la computadora.'
      })
    }
  }

  // =========================================================
  // ESTADO
  // =========================================================

  const obtenerEstado = estado => {
    switch (estado) {
      case 'Operativo':
        return {
          clase: 'bg-green-100 text-green-700',
          indicador: '🟢'
        }

      case 'En mantenimiento':
        return {
          clase: 'bg-yellow-100 text-yellow-700',
          indicador: '🟡'
        }

      case 'Baja':
        return {
          clase: 'bg-red-100 text-red-700',
          indicador: '🔴'
        }

      default:
        return {
          clase: 'bg-gray-100 text-gray-700',
          indicador: '⚪'
        }
    }
  }

  return (
    <div className="space-y-6">

      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            💻 Inventario de PC
          </h2>

          <p className="text-gray-600 mt-1">
            Control de computadoras, salas y componentes.
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
        >
          + Nueva PC
        </button>

      </div>

      {/* =====================================================
          INDICADORES
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Computadoras registradas
          </p>

          <p className="text-3xl font-bold text-gray-800 mt-2">
            {estadisticas.total}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            Operativas
          </p>

          <p className="text-3xl font-bold text-green-600 mt-2">
            {estadisticas.operativas}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            En mantenimiento
          </p>

          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {estadisticas.mantenimiento}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500">
            En baja
          </p>

          <p className="text-3xl font-bold text-red-600 mt-2">
            {estadisticas.baja}
          </p>
        </div>

      </div>

      {/* =====================================================
          BUSCADOR Y FILTROS
      ===================================================== */}

      <div className="bg-white rounded-lg shadow-sm border p-4">

        <div className="flex flex-col md:flex-row gap-4">

          <div className="flex-1">

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar computadora
            </label>

            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por código, Service Tag, sala, marca..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div className="md:w-64">

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sala
            </label>

            <select
              value={filtroSala}
              onChange={e => setFiltroSala(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="todas">
                Todas las salas
              </option>

              {salasDisponibles.map(sala => (
                <option
                  key={sala}
                  value={sala}
                >
                  {sala}
                </option>
              ))}

            </select>

          </div>

          <div className="md:w-64">

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="todos">
                Todos los estados
              </option>

              {estados.map(estado => (
                <option
                  key={estado}
                  value={estado}
                >
                  {estado}
                </option>
              ))}

            </select>

          </div>

          <div className="flex items-end">

            <button
              onClick={cargarDatos}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
            >
              ↻ Actualizar
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          MENSAJE
      ===================================================== */}

      {mensaje && (
        <div
          className={`p-4 rounded-lg text-sm ${
            mensaje.tipo === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* =====================================================
          TABLA
      ===================================================== */}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

        <div className="px-6 py-4 border-b">

          <h3 className="text-lg font-semibold text-gray-800">
            Computadoras
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {computadorasFiltradas.length} computadora(s) mostrada(s)
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Código
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Sala / Ubicación
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  PC
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  CPU / RAM
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Monitor
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

              {computadorasFiltradas.length === 0 ? (

                <tr>

                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No se encontraron computadoras.
                  </td>

                </tr>

              ) : (

                computadorasFiltradas.map(computadora => {

                  const estado = obtenerEstado(
                    computadora.estado
                  )

                  return (
                    <tr
                      key={computadora.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-6 py-4">

                        <div className="text-sm font-bold text-gray-800">
                          {computadora.codigo}
                        </div>

                        {computadora.service_tag && (
                          <div className="text-xs text-gray-500 mt-1">
                            ST: {computadora.service_tag}
                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <div className="text-sm font-medium text-gray-800">
                          {computadora.sala || '—'}
                        </div>

                        {computadora.ubicacion && (
                          <div className="text-xs text-gray-500 mt-1">
                            {computadora.ubicacion}
                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <div className="text-sm font-medium text-gray-800">
                          {[
                            computadora.marca_pc,
                            computadora.modelo_pc
                          ]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </div>

                        {computadora.numero_serie && (
                          <div className="text-xs text-gray-500 mt-1">
                            Serie: {computadora.numero_serie}
                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <div className="text-sm text-gray-700">
                          {computadora.cpu || '—'}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          RAM:{' '}
                          {computadora.ram_gb
                            ? `${computadora.ram_gb} GB`
                            : '—'}
                        </div>

                        {computadora.disco && (
                          <div className="text-xs text-gray-500">
                            Disco: {computadora.disco}
                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <div className="text-sm text-gray-700">
                          {[
                            computadora.monitor_marca,
                            computadora.monitor_modelo
                          ]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </div>

                        {computadora.monitor_serie && (
                          <div className="text-xs text-gray-500 mt-1">
                            Serie: {computadora.monitor_serie}
                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4 text-center">

                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estado.clase}`}
                        >
                          {estado.indicador}{' '}
                          {computadora.estado}
                        </span>

                      </td>

                      <td className="px-6 py-4">

                        <div className="flex flex-wrap justify-center gap-2">

                          <button
                            onClick={() =>
                              abrirEditar(computadora)
                            }
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() =>
                              eliminar(computadora)
                            }
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                          >
                            Eliminar
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

      {/* =====================================================
          MODAL NUEVA / EDITAR
      ===================================================== */}

      {mostrarFormulario && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">

            {/* CABECERA */}

            <div className="px-6 py-4 border-b flex justify-between items-center">

              <div>

                <h3 className="text-xl font-bold text-gray-800">
                  {modoEdicion
                    ? 'Editar computadora'
                    : 'Registrar computadora'}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Complete la información del equipo.
                </p>

              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>

            </div>

            {/* CONTENIDO */}

            <div className="overflow-y-auto p-6 space-y-6">

              {/* =================================================
                  IDENTIFICACIÓN Y UBICACIÓN
              ================================================= */}

              <div>

                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Identificación y ubicación
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <Campo
                    etiqueta="Código / N.º de PC *"
                    placeholder="Ej. PC-001"
                    valor={formulario.codigo}
                    onChange={valor =>
                      cambiarCampo('codigo', valor)
                    }
                  />

                  {/* SALA DESPLEGABLE */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sala
                    </label>

                    <select
                      value={formulario.sala}
                      onChange={e =>
                        cambiarCampo('sala', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">
                        Seleccionar sala
                      </option>

                      {salasDisponibles.map(sala => (
                        <option
                          key={sala}
                          value={sala}
                        >
                          {sala}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Campo
                    etiqueta="Ubicación"
                    placeholder="Ej. Mesa 01"
                    valor={formulario.ubicacion}
                    onChange={valor =>
                      cambiarCampo('ubicacion', valor)
                    }
                  />

                  <Campo
                    etiqueta="Marca PC"
                    placeholder="Ej. Dell"
                    valor={formulario.marca_pc}
                    onChange={valor =>
                      cambiarCampo('marca_pc', valor)
                    }
                  />

                  <Campo
                    etiqueta="Modelo PC"
                    placeholder="Ej. OptiPlex 7090"
                    valor={formulario.modelo_pc}
                    onChange={valor =>
                      cambiarCampo('modelo_pc', valor)
                    }
                  />

                  <Campo
                    etiqueta="Service Tag"
                    placeholder="Ej. ABC123"
                    valor={formulario.service_tag}
                    onChange={valor =>
                      cambiarCampo('service_tag', valor)
                    }
                  />

                  <Campo
                    etiqueta="N.º de Serie"
                    placeholder="Ej. SN123456789"
                    valor={formulario.numero_serie}
                    onChange={valor =>
                      cambiarCampo('numero_serie', valor)
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  COMPONENTES CPU
              ================================================= */}

              <div className="border-t pt-6">

                <TituloComponente
                  
                  titulo="Componentes CPU"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <Campo
                    etiqueta="Código de Inventario"
                    placeholder="Ej. CPU-001"
                    valor={formulario.cpu_codigo_inventario}
                    onChange={valor =>
                      cambiarCampo(
                        'cpu_codigo_inventario',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="CPU"
                    placeholder="Ej. Intel Core i5"
                    valor={formulario.cpu}
                    onChange={valor =>
                      cambiarCampo('cpu', valor)
                    }
                  />

                  <Campo
                    etiqueta="RAM (GB)"
                    tipo="number"
                    placeholder="Ej. 8"
                    valor={formulario.ram_gb}
                    onChange={valor =>
                      cambiarCampo('ram_gb', valor)
                    }
                  />

                  <Campo
                    etiqueta="Disco"
                    placeholder="Ej. SSD 480 GB"
                    valor={formulario.disco}
                    onChange={valor =>
                      cambiarCampo('disco', valor)
                    }
                  />

                  <Campo
                    etiqueta="Sistema Operativo"
                    placeholder="Ej. Windows 11"
                    valor={formulario.sistema_operativo}
                    onChange={valor =>
                      cambiarCampo(
                        'sistema_operativo',
                        valor
                      )
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  COMPONENTES MONITOR
              ================================================= */}

              <div className="border-t pt-6">

                <TituloComponente
                  
                  titulo="Componentes Monitor"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <Campo
                    etiqueta="Código de Inventario"
                    placeholder="Ej. MON-001"
                    valor={formulario.monitor_codigo_inventario}
                    onChange={valor =>
                      cambiarCampo(
                        'monitor_codigo_inventario',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Marca"
                    placeholder="Ej. Dell"
                    valor={formulario.monitor_marca}
                    onChange={valor =>
                      cambiarCampo(
                        'monitor_marca',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Modelo"
                    placeholder="Ej. P2419H"
                    valor={formulario.monitor_modelo}
                    onChange={valor =>
                      cambiarCampo(
                        'monitor_modelo',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="N.º de Serie"
                    placeholder="Ej. MON123456"
                    valor={formulario.monitor_serie}
                    onChange={valor =>
                      cambiarCampo(
                        'monitor_serie',
                        valor
                      )
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  COMPONENTES TECLADO
              ================================================= */}

              <div className="border-t pt-6">

                <TituloComponente
                  
                  titulo="Componentes Teclado"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <Campo
                    etiqueta="Código de Inventario"
                    placeholder="Ej. TEC-001"
                    valor={formulario.teclado_codigo_inventario}
                    onChange={valor =>
                      cambiarCampo(
                        'teclado_codigo_inventario',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Marca"
                    placeholder="Ej. Dell"
                    valor={formulario.teclado_marca}
                    onChange={valor =>
                      cambiarCampo(
                        'teclado_marca',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Modelo"
                    placeholder="Ej. KB216"
                    valor={formulario.teclado_modelo}
                    onChange={valor =>
                      cambiarCampo(
                        'teclado_modelo',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="N.º de Serie"
                    placeholder="Ej. TEC123456"
                    valor={formulario.teclado_serie}
                    onChange={valor =>
                      cambiarCampo(
                        'teclado_serie',
                        valor
                      )
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  COMPONENTES MOUSE
              ================================================= */}

              <div className="border-t pt-6">

                <TituloComponente
                  
                  titulo="Componentes Mouse"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <Campo
                    etiqueta="Código de Inventario"
                    placeholder="Ej. MOU-001"
                    valor={formulario.mouse_codigo_inventario}
                    onChange={valor =>
                      cambiarCampo(
                        'mouse_codigo_inventario',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Marca"
                    placeholder="Ej. Dell"
                    valor={formulario.mouse_marca}
                    onChange={valor =>
                      cambiarCampo(
                        'mouse_marca',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="Modelo"
                    placeholder="Ej. MS116"
                    valor={formulario.mouse_modelo}
                    onChange={valor =>
                      cambiarCampo(
                        'mouse_modelo',
                        valor
                      )
                    }
                  />

                  <Campo
                    etiqueta="N.º de Serie"
                    placeholder="Ej. MOU123456"
                    valor={formulario.mouse_serie}
                    onChange={valor =>
                      cambiarCampo(
                        'mouse_serie',
                        valor
                      )
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  ESTADO Y OBSERVACIONES
              ================================================= */}

              <div className="border-t pt-6">

                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Estado
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>

                    <select
                      value={formulario.estado}
                      onChange={e =>
                        cambiarCampo(
                          'estado',
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >

                      {estados.map(estado => (
                        <option
                          key={estado}
                          value={estado}
                        >
                          {estado}
                        </option>
                      ))}

                    </select>

                  </div>

                  <Campo
                    etiqueta="Observaciones"
                    placeholder="Observaciones adicionales..."
                    valor={formulario.observaciones}
                    onChange={valor =>
                      cambiarCampo(
                        'observaciones',
                        valor
                      )
                    }
                  />

                </div>

              </div>

            </div>

            {/* =================================================
                PIE DEL MODAL
            ================================================= */}

            <div className="px-6 py-4 border-t flex justify-end gap-3">

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarComputadora}
                disabled={guardando}
                className="px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : modoEdicion
                    ? 'Guardar cambios'
                    : 'Registrar computadora'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default GestorComputadoras