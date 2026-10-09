import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useSupabase = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cargar todos los materiales
  const cargarMateriales = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Agregar nuevo material
  const agregarMaterial = async (codigo, nombre, precio) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('materiales')
        .insert([{ codigo, nombre, precio: parseFloat(precio) }])
        .select()
      
      if (error) throw error
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Editar material existente
  const editarMaterial = async (id, codigo, nombre, precio) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('materiales')
        .update({ codigo, nombre, precio: parseFloat(precio) })
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar material
  const eliminarMaterial = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('materiales')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Cargar presupuesto con artículos (CON FILTROS)
  const cargarPresupuesto = async (presupuestoId = 1, unidadResponsable = null, centroCostos = null, actividad = null) => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('presupuesto_articulos')
        .select(`
          *,
          materiales (codigo, nombre, precio)
        `)
        .eq('presupuesto_id', presupuestoId)
      
      // Aplicar filtros si se proporcionan
      if (unidadResponsable) {
        query = query.eq('unidad_responsable', unidadResponsable)
      }
      if (centroCostos) {
        query = query.eq('centro_costos', centroCostos)
      }
      if (actividad) {
        query = query.eq('actividad', actividad)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Guardar artículo en presupuesto (CON FILTROS)
  const guardarArticuloPresupuesto = async (presupuestoId, materialId, cantidadMarzo, cantidadAgosto, precioPresupuesto, unidadResponsable, centroCostos, actividad) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('presupuesto_articulos')
        .insert([{
          presupuesto_id: presupuestoId,
          material_id: materialId,
          cantidad_marzo: cantidadMarzo,
          cantidad_agosto: cantidadAgosto,
          precio_presupuesto: precioPresupuesto,
          unidad_responsable: unidadResponsable,
          centro_costos: centroCostos,
          actividad: actividad
        }])
        .select(`
          *,
          materiales (codigo, nombre, precio)
        `)
      
      if (error) throw error
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Actualizar artículo en presupuesto
  const actualizarArticuloPresupuesto = async (id, campo, valor) => {
    try {
      setLoading(true)
      let updateData = {}
      
      if (campo === 'cantidadMarzo') updateData.cantidad_marzo = parseInt(valor) || 0
      if (campo === 'cantidadAgosto') updateData.cantidad_agosto = parseInt(valor) || 0
      if (campo === 'precioPresupuesto') updateData.precio_presupuesto = parseFloat(valor) || 0
      
      const { data, error } = await supabase
        .from('presupuesto_articulos')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          materiales (codigo, nombre, precio)
        `)
      
      if (error) throw error
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar artículo del presupuesto
  const eliminarArticuloPresupuesto = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('presupuesto_articulos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Cargar valores de partidas
  const cargarValoresPartidas = async (presupuestoId = 1) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('partida_valores')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
      
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Guardar valor de partida
  const guardarValorPartida = async (presupuestoId, codigoPartida, mes, valor) => {
    try {
      setLoading(true)
      
      // Primero verificar si ya existe
      const { data: existing, error: selectError } = await supabase
        .from('partida_valores')
        .select('id')
        .eq('presupuesto_id', presupuestoId)
        .eq('codigo_partida', codigoPartida)
        .eq('mes', mes)
        .single()
      
      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }
      
      let result
      if (existing) {
        // Si existe, actualizar
        result = await supabase
          .from('partida_valores')
          .update({ valor: parseFloat(valor) || 0 })
          .eq('presupuesto_id', presupuestoId)
          .eq('codigo_partida', codigoPartida)
          .eq('mes', mes)
      } else {
        // Si no existe, insertar
        result = await supabase
          .from('partida_valores')
          .insert({
            presupuesto_id: presupuestoId,
            codigo_partida: codigoPartida,
            mes: mes,
            valor: parseFloat(valor) || 0
          })
      }
      
      if (result.error) throw result.error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

    // Cargar stock de todos los materiales
  const cargarStockMateriales = async () => {
    try {
      setLoading(true)

      const { data: materiales, error: materialesError } = await supabase
        .from('materiales')
        .select('*')
        .order('nombre')

      if (materialesError) throw materialesError

      const { data: movimientos, error: movimientosError } = await supabase
        .from('movimientos_materiales')
        .select('material_id, tipo, cantidad')

      if (movimientosError) throw movimientosError

      const materialesConStock = materiales.map(material => {
        const movimientosMaterial = movimientos.filter(
          movimiento => movimiento.material_id === material.id
        )

        const entradas = movimientosMaterial
          .filter(movimiento => movimiento.tipo === 'ENTRADA')
          .reduce((total, movimiento) => total + movimiento.cantidad, 0)

        const salidas = movimientosMaterial
          .filter(movimiento => movimiento.tipo === 'SALIDA')
          .reduce((total, movimiento) => total + movimiento.cantidad, 0)

        const stockActual = entradas - salidas

        return {
          ...material,
          stockActual
        }
      })

      return materialesConStock
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Cargar historial de movimientos de un material
  const cargarMovimientosMaterial = async (materialId) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('movimientos_materiales')
        .select('*')
        .eq('material_id', materialId)
        .order('fecha', { ascending: false })

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Registrar entrada o salida de material
  const registrarMovimientoMaterial = async (
    materialId,
    tipo,
    cantidad,
    motivo,
    observacion = null
  ) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc(
        'registrar_movimiento_material',
        {
          p_material_id: materialId,
          p_tipo: tipo,
          p_cantidad: parseInt(cantidad),
          p_motivo: motivo,
          p_observacion: observacion
        }
      )

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

    // ==========================================
  // SOLICITUD DE MATERIALES
  // ==========================================

  // Cargar todas las solicitudes con sus materiales y recepciones
  const cargarSolicitudesMateriales = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('solicitudes_materiales')
        .select(`
          id,
          codigo,
          fecha_solicitud,
          observacion,
          detalle_solicitudes_materiales (
            id,
            cantidad_solicitada,
            material_id,
            materiales (
              id,
              codigo,
              nombre
            ),
            recepciones_materiales (
              id,
              cantidad,
              fecha_recepcion,
              observacion,
              movimiento_material_id
            )
          )
        `)
        .order('fecha_solicitud', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Crear una nueva solicitud de material
  const crearSolicitudMaterial = async (
    codigo,
    materialId,
    cantidadSolicitada,
    observacion = null
  ) => {
    try {
      setLoading(true)

      // Crear la solicitud principal
      const { data: solicitud, error: solicitudError } = await supabase
        .from('solicitudes_materiales')
        .insert([{
          codigo,
          observacion
        }])
        .select()
        .single()

      if (solicitudError) throw solicitudError

      // Crear el detalle de la solicitud
      const { data: detalle, error: detalleError } = await supabase
        .from('detalle_solicitudes_materiales')
        .insert([{
          solicitud_id: solicitud.id,
          material_id: materialId,
          cantidad_solicitada: parseInt(cantidadSolicitada)
        }])
        .select(`
          *,
          materiales (
            id,
            codigo,
            nombre
          )
        `)
        .single()

      if (detalleError) {
        // Si falla el detalle, eliminar la solicitud creada
        await supabase
          .from('solicitudes_materiales')
          .delete()
          .eq('id', solicitud.id)

        throw detalleError
      }

      return {
        ...solicitud,
        detalle_solicitudes_materiales: [detalle]
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Cargar el detalle completo de una solicitud
  const cargarDetalleSolicitudMaterial = async (solicitudId) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('solicitudes_materiales')
        .select(`
          id,
          codigo,
          fecha_solicitud,
          observacion,
          detalle_solicitudes_materiales (
            id,
            cantidad_solicitada,
            material_id,
            materiales (
              id,
              codigo,
              nombre
            ),
            recepciones_materiales (
              id,
              cantidad,
              fecha_recepcion,
              observacion,
              movimiento_material_id
            )
          )
        `)
        .eq('id', solicitudId)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Registrar una recepción y aumentar automáticamente el stock
  const registrarRecepcionMaterial = async (
    detalleSolicitudId,
    cantidad,
    fechaRecepcion = null,
    observacion = null
  ) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc(
        'registrar_recepcion_material',
        {
          p_detalle_solicitud_id: detalleSolicitudId,
          p_cantidad: parseInt(cantidad),
          p_fecha_recepcion: fechaRecepcion
            ? `${fechaRecepcion}T00:00:00`
            : null,
          p_observacion: observacion
        }
      )

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar una recepción y revertir automáticamente el stock
  const eliminarRecepcionMaterial = async (recepcionId) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc(
        'eliminar_recepcion_material',
        {
          p_recepcion_id: recepcionId
        }
      )

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar una solicitud completa y revertir sus recepciones
  const eliminarSolicitudMaterial = async (solicitudId) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc(
        'eliminar_solicitud_material',
        {
          p_solicitud_id: solicitudId
        }
      )

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

    // ==========================================
  // INVENTARIO DE COMPUTADORAS
  // ==========================================

  // Cargar todas las computadoras
  const cargarComputadoras = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('computadoras')
        .select('*')
        .order('codigo')

      if (error) throw error

      return data || []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Agregar una nueva computadora
  const agregarComputadora = async (computadora) => {
    try {
      setLoading(true)

      const datos = {
        ...computadora,
        ram_gb: computadora.ram_gb
          ? parseInt(computadora.ram_gb)
          : null
      }

      const { data, error } = await supabase
        .from('computadoras')
        .insert([datos])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Editar una computadora existente
  const editarComputadora = async (id, computadora) => {
    try {
      setLoading(true)

      const datos = {
        ...computadora,
        ram_gb: computadora.ram_gb
          ? parseInt(computadora.ram_gb)
          : null
      }

      const { data, error } = await supabase
        .from('computadoras')
        .update(datos)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar una computadora
  const eliminarComputadora = async (id) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('computadoras')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // INVENTARIO DE OTROS EQUIPOS
  // ==========================================

  // Cargar todos los equipos
  const cargarOtrosEquipos = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('otros_equipos')
        .select('*')
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Agregar equipo
  const agregarOtroEquipo = async (equipo) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('otros_equipos')
        .insert([equipo])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Editar equipo
  const editarOtroEquipo = async (id, equipo) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('otros_equipos')
        .update({
          ...equipo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Eliminar equipo
  const eliminarOtroEquipo = async (id) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('otros_equipos')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }


  return {
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
    registrarMovimientoMaterial,

    cargarSolicitudesMateriales,
    crearSolicitudMaterial,
    cargarDetalleSolicitudMaterial,
    registrarRecepcionMaterial,
    eliminarRecepcionMaterial,
    eliminarSolicitudMaterial,

    cargarComputadoras,
    agregarComputadora,
    editarComputadora,
    eliminarComputadora,

    cargarOtrosEquipos,
    agregarOtroEquipo,
    editarOtroEquipo,
    eliminarOtroEquipo
    
  }
}