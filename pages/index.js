import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatFecha(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

function getPeriodoActual() {
  const hoy = new Date()
  const dia = hoy.getDate()
  const mes = hoy.getMonth()
  const anio = hoy.getFullYear()
  if (dia <= 15) {
    return { inicio: new Date(anio, mes, 1), fin: new Date(anio, mes, 15) }
  } else {
    return { inicio: new Date(anio, mes, 16), fin: new Date(anio, mes + 1, 0) }
  }
}

export default function Home() {
  const [tab, setTab] = useState('entregas')
  const [entregas, setEntregas] = useState([])
  const [productos, setProductos] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modalEntrega, setModalEntrega] = useState(false)
  const [modalProducto, setModalProducto] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [editProducto, setEditProducto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alertas, setAlertas] = useState([])
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const [notificando, setNotificando] = useState({})

  const [fEntrega, setFEntrega] = useState({ fecha: '', hora: '09:00', productos: '', destinatario: 'DevRev - Recepcion', valor: '', estado: 'entregado' })
  const [fProducto, setFProducto] = useState({ nombre: '', categoria: 'Lacteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' })
  const [fPago, setFPago] = useState({ nota: '', montoPagado: '' })
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const showToast = (msg) => setToast(msg)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: e }, { data: p }, { data: a }, { data: pg }] = await Promise.all([
      supabase.from('entregas').select('*').order('fecha', { ascending: false }),
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('alertas_stock').select('*').order('created_at', { ascending: false }),
      supabase.from('pagos').select('*').order('created_at', { ascending: false })
    ])
    setEntregas(e || [])
    setProductos(p || [])
    setAlertas(a || [])
    setPagos(pg || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function guardarEntrega() {
    if (!fEntrega.fecha || !fEntrega.productos) return showToast('Completa fecha y productos')
    setSaving(true)
    const { error } = await supabase.from('entregas').insert([{
      fecha: fEntrega.fecha, hora: fEntrega.hora, productos: fEntrega.productos,
      destinatario: fEntrega.destinatario, valor: parseFloat(fEntrega.valor) || 0, estado: fEntrega.estado
    }])
    setSaving(false)
    if (error) return showToast('Error al guardar.')
    showToast('Entrega guardada')
    setModalEntrega(false)
    setFEntrega({ fecha: '', hora: '09:00', productos: '', destinatario: 'DevRev - Recepcion', valor: '', estado: 'entregado' })
    loadData()
  }

  async function guardarProducto() {
    if (!fProducto.nombre || !fProducto.precio) return showToast('Completa nombre y precio')
    setSaving(true)
    const data = {
      nombre: fProducto.nombre, categoria: fProducto.categoria,
      precio: parseFloat(fProducto.precio) || 0,
      precio_nuevo: fProducto.precio_nuevo ? parseFloat(fProducto.precio_nuevo) : null,
      stock: parseInt(fProducto.stock) || 0, unidad: fProducto.unidad
    }
    const { error } = editProducto
      ? await supabase.from('productos').update(data).eq('id', editProducto.id)
      : await supabase.from('productos').insert([data])
    setSaving(false)
    if (error) return showToast('Error al guardar.')
    showToast(editProducto ? 'Producto actualizado' : 'Producto agregado')
    setModalProducto(false)
    setEditProducto(null)
    setFProducto({ nombre: '', categoria: 'Lacteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' })
    loadData()
  }

  async function eliminarProducto(id) {
    if (!confirm('Eliminas este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    showToast('Producto eliminado')
    loadData()
  }

  async function eliminarEntrega(id) {
    if (!confirm('Eliminas esta entrega?')) return
    await supabase.from('entregas').delete().eq('id', id)
    showToast('Entrega eliminada')
    loadData()
  }

  async function eliminarPago(id) {
    if (!confirm('Eliminas este pago?')) return
    await supabase.from('pagos').delete().eq('id', id)
    showToast('Pago eliminado')
    loadData()
  }

  async function asentarPago() {
    setSaving(true)
    const periodo = getPeriodoActual()
    const { error } = await supabase.from('pagos').insert([{
      periodo_inicio: periodo.inicio.toISOString().split('T')[0],
      periodo_fin: periodo.fin.toISOString().split('T')[0],
      monto: parseFloat(fPago.montoPagado) || totalAdeudado, nota: fPago.nota, deuda_al_pagar: totalAdeudado
    }])
    setSaving(false)
    if (error) return showToast('Error al asentar pago.')
    showToast('Pago asentado correctamente')
    setModalPago(false)
    setFPago({ nota: '', montoPagado: '' })
    loadData()
  }

  async function notificarAumento(p) {
    if (!p.precio_nuevo || p.precio_nuevo <= p.precio) return showToast('Este producto no tiene precio nuevo cargado')
    setNotificando(prev => ({ ...prev, [p.id]: true }))
    try {
      const res = await fetch('/api/notificar-aumento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto: p.nombre, precioActual: p.precio.toLocaleString('es-AR'), precioNuevo: p.precio_nuevo.toLocaleString('es-AR') })
      })
      if (res.ok) {
        showToast('Notificacion enviada a DevRev')
      } else {
        showToast('Error al enviar notificacion')
      }
    } catch {
      showToast('Error al enviar notificacion')
    }
    setNotificando(prev => ({ ...prev, [p.id]: false }))
  }

  function abrirEditarProducto(p) {
    setEditProducto(p)
    setFProducto({ nombre: p.nombre, categoria: p.categoria, precio: p.precio, precio_nuevo: p.precio_nuevo || '', stock: p.stock, unidad: p.unidad || 'unidad' })
    setModalProducto(true)
  }

  const entregasDelMes = entregas.filter(e => {
    const d = new Date(e.fecha + 'T12:00:00')
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const entregasFiltradas = entregas.filter(e => {
    if (e.estado !== 'entregado') return false
    const d = new Date(e.fecha + 'T12:00:00')
    if (fechaDesde && fechaHasta) {
      const desde = new Date(fechaDesde + 'T00:00:00')
      const hasta = new Date(fechaHasta + 'T23:59:59')
      return d >= desde && d <= hasta
    }
    return d.getMonth() === mesFiltro && d.getFullYear() === anioFiltro
  })

  const totalFiltrado = entregasFiltradas.reduce((s, e) => s + (e.valor || 0), 0)

  const proximaEntrega = entregas
    .filter(e => e.estado === 'programada' && new Date(e.fecha + 'T12:00:00') >= new Date())
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0]

  const productosConAumento = productos.filter(p => p.precio_nuevo && p.precio_nuevo > p.precio)
  const stockBajo = productos.filter(p => p.stock !== null && p.stock < 5)

  const totalMes = entregasDelMes.filter(e => e.estado === 'entregado').reduce((s, e) => s + (e.valor || 0), 0)

  const ultimoPago = pagos[0]
  const totalPagado = pagos.reduce((s, pg) => s + (pg.monto || 0), 0)
  const totalEntregadoHistorico = entregas.filter(e => e.estado === 'entregado').reduce((s, e) => s + (e.valor || 0), 0)
  const saldoNeto = totalPagado - totalEntregadoHistorico
  const saldoFavor = Math.max(0, saldoNeto)
  const entregasAdeudadas = entregas.filter(e => {
    if (e.estado !== 'entregado') return false
    if (!ultimoPago) return true
    return new Date(e.fecha + 'T12:00:00') > new Date(ultimoPago.created_at)
  })
  const totalEntregadoBruto = entregasAdeudadas.reduce((s, e) => s + (e.valor || 0), 0)
  const totalAdeudado = Math.max(0, -saldoNeto)

  const periodo = getPeriodoActual()
  const periodoLabel = `${periodo.inicio.getDate()} al ${periodo.fin.getDate()} de ${MESES[periodo.inicio.getMonth()]}`

  const mesesDisponibles = []
  const ahora = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    mesesDisponibles.push({ mes: d.getMonth(), anio: d.getFullYear(), label: `${MESES_FULL[d.getMonth()]} ${d.getFullYear()}` })
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="GEC" style={{ height: 40, width: 'auto' }} />
          <div>
            <div className="logo-name">GEC</div>
            <div className="logo-tag">Soluciones gastronomicas</div>
          </div>
        </div>
        <div className="header-right">
          <span className="badge-role">Admin</span>
          <div className="avatar">GP</div>
        </div>
      </header>

      <nav className="nav">
        {[['entregas','Entregas'],['productos','Productos y precios'],['stock','Stock'],['agenda','Agenda']].map(([id, label]) => (
          <button key={id} className={`nav-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <main className="main">
        {loading ? <div className="loading">Cargando datos...</div> : (
          <>
            {tab === 'entregas' && (
              <div>
                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Entregas este mes</div>
                    <div className="stat-val">{entregasDelMes.filter(e => e.estado === 'entregado').length}</div>
                    <div className="stat-sub">en {new Date().toLocaleString('es-AR', { month: 'long' })}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Proxima entrega</div>
                    <div className="stat-val" style={{ fontSize: 16, marginTop: 6 }}>{proximaEntrega ? formatFecha(proximaEntrega.fecha) : 'Sin programar'}</div>
                    <div className="stat-sub">{proximaEntrega ? `${proximaEntrega.hora} hs` : '-'}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Valor entregado</div>
                    <div className="stat-val" style={{ fontSize: 20, marginTop: 4 }}>${totalMes.toLocaleString('es-AR')}</div>
                    <div className="stat-sub up">solo entregado</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">{saldoFavor > 0 ? 'Saldo a favor DevRev' : 'Adeudado DevRev'}</div>
                    <div className="stat-val" style={{ fontSize: 20, marginTop: 4, color: saldoFavor > 0 ? 'var(--accent)' : totalAdeudado > 0 ? 'var(--danger)' : 'var(--muted)' }}>${(saldoFavor > 0 ? saldoFavor : totalAdeudado).toLocaleString('es-AR')}</div>
                    <div className="stat-sub">{saldoFavor > 0 ? 'se descuenta de proxima deuda' : periodoLabel}</div>
                    
                  </div>
                </div>

                {saldoFavor > 0 && (
                  <div className="alert-banner" style={{ marginBottom: '1.25rem', background: '#E1F5EE', border: '1px solid #A8DFC8' }}>
                    <span>✅</span>
                    <span>DevRev tiene <strong>${saldoFavor.toLocaleString('es-AR')}</strong> de saldo a favor — se descontara de la proxima deuda.</span>
                  </div>
                )}
                {totalAdeudado > 0 && saldoFavor === 0 && (
                  <div className="alert-banner" style={{ marginBottom: '1.25rem', background: '#FCEBEB', border: '1px solid #F5C4B3', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <span>💰</span>
                      <span>DevRev adeuda <strong>${totalAdeudado.toLocaleString('es-AR')}</strong> por el periodo {periodoLabel}</span>
                    </div>
                    <button className="btn btn-sm" onClick={() => setModalPago(true)}>Asentar pago</button>
                  </div>
                )}

                <div style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Por mes</div>
                        <select className="form-input" style={{ width: 'auto' }} value={`${mesFiltro}-${anioFiltro}`} onChange={e => { const [m, a] = e.target.value.split('-'); setMesFiltro(parseInt(m)); setAnioFiltro(parseInt(a)); setFechaDesde(''); setFechaHasta('') }}>
                          {mesesDisponibles.map(m => (
                            <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>O por rango de fechas</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="date" className="form-input" style={{ width: 'auto' }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                          <span style={{ color: '#7A7568', fontSize: 13 }}>a</span>
                          <input type="date" className="form-input" style={{ width: 'auto' }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                          {(fechaDesde || fechaHasta) && <button className="btn-cancel" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setFechaDesde(''); setFechaHasta('') }}>Limpiar</button>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#7A7568', marginBottom: 4 }}>{entregasFiltradas.length} entrega{entregasFiltradas.length !== 1 ? 's' : ''} entregadas</div>
                      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2A6B4F' }}>${totalFiltrado.toLocaleString('es-AR')}</div>
                    </div>
                  </div>
                </div>

                <div className="sec-header">
                  <h2 className="sec-title">Historial de entregas</h2>
                  <button className="btn btn-sm" onClick={() => setModalEntrega(true)}>+ Nueva entrega</button>
                </div>

                <div className="card">
                  {entregas.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📦</div>No hay entregas registradas todavia.</div>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Fecha</th><th>Hora</th><th>Productos</th><th>Destinatario</th><th>Estado</th><th>Valor</th><th></th></tr>
                      </thead>
                      <tbody>
                        {entregas.map(e => (
                          <tr key={e.id}>
                            <td>{formatFecha(e.fecha)}</td>
                            <td>{e.hora} hs</td>
                            <td>{e.productos}</td>
                            <td>{e.destinatario}</td>
                            <td>
                              <span className={`badge ${e.estado === 'entregado' ? 'badge-green' : e.estado === 'programada' ? 'badge-warn' : 'badge-gray'}`}>
                                <span className={`dot ${e.estado === 'entregado' ? 'dot-green' : e.estado === 'programada' ? 'dot-warn' : ''}`}></span>
                                {e.estado === 'entregado' ? 'Entregado' : e.estado === 'programada' ? 'Programada' : e.estado}
                              </span>
                            </td>
                            <td>${(e.valor || 0).toLocaleString('es-AR')}</td>
                            <td><button className="btn-cancel" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => eliminarEntrega(e.id)}>Eliminar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {pagos.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h2 className="sec-title" style={{ marginBottom: '1rem' }}>Historial de pagos</h2>
                    <div className="card">
                      <table>
                        <thead><tr><th>Periodo</th><th>Monto</th><th>Nota</th><th>Fecha</th><th></th></tr></thead>
                        <tbody>
                          {pagos.map(pg => (
                            <tr key={pg.id}>
                              <td>{formatFecha(pg.periodo_inicio)} a {formatFecha(pg.periodo_fin)}</td>
                              <td>${(pg.monto || 0).toLocaleString('es-AR')}</td>
                              <td>{pg.nota || '-'}</td>
                              <td>{formatFecha(pg.created_at?.split('T')[0])}</td>
                              <td><button className="btn-cancel" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => eliminarPago(pg.id)}>Eliminar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'productos' && (
              <div>
                {productosConAumento.length > 0 && (
                  <div className="alert-banner">
                    <span>⚠</span>
                    <span><strong>{productosConAumento.length} producto{productosConAumento.length > 1 ? 's' : ''}</strong> con aumento de precio proximo: {productosConAumento.map(p => p.nombre).join(', ')}</span>
                  </div>
                )}
                <div className="sec-header">
                  <h2 className="sec-title">Catalogo de productos</h2>
                  <button className="btn btn-sm" onClick={() => { setEditProducto(null); setFProducto({ nombre: '', categoria: 'Lacteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' }); setModalProducto(true) }}>+ Agregar producto</button>
                </div>
                {productos.length === 0 ? (
                  <div className="empty"><div className="empty-icon">🛒</div>No hay productos cargados todavia.</div>
                ) : (
                  <div className="product-grid">
                    {productos.map(p => (
                      <div className="prod-card" key={p.id}>
                        {p.precio_nuevo && p.precio_nuevo > p.precio && <div className="prod-alert" title="Proximo aumento"></div>}
                        <div className="prod-name">{p.nombre}</div>
                        <div className="prod-cat">{p.categoria}</div>
                        <div className="prod-price">${(p.precio || 0).toLocaleString('es-AR')} <span>/{p.unidad || 'unidad'}</span></div>
                        <div className="prod-stock">
                          {p.precio_nuevo && p.precio_nuevo > p.precio
                            ? <><span className="badge badge-warn">Sube pronto</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>a ${p.precio_nuevo.toLocaleString('es-AR')}</span></>
                            : p.stock !== null && p.stock < 5
                            ? <><span className="badge badge-danger">Stock bajo</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>Stock: {p.stock}</span></>
                            : <><span className="badge badge-green">Disponible</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>Stock: {p.stock ?? '-'}</span></>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button className="btn-outline btn-sm" style={{ flex: 1 }} onClick={() => abrirEditarProducto(p)}>Editar</button>
                          <button className="btn-cancel btn-sm" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => eliminarProducto(p.id)}>Eliminar</button>
                        </div>
                        {p.precio_nuevo && p.precio_nuevo > p.precio && (
                          <button
                            onClick={() => notificarAumento(p)}
                            disabled={notificando[p.id]}
                            style={{ marginTop: 8, width: '100%', background: '#FAEEDA', color: '#BA7517', border: '1px solid #F5C4B3', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 500, cursor: notificando[p.id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {notificando[p.id] ? 'Enviando...' : 'Notificar aumento a DevRev'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'stock' && (
              <div>
                {alertas.filter(a => !a.leida).length > 0 && (
                  <div className="alert-banner" style={{ marginBottom: '1.25rem', background: '#FCEBEB', border: '1px solid #F5C4B3' }}>
                    <span>🔔</span>
                    <div>
                      <strong>DevRev aviso stock bajo en {alertas.filter(a => !a.leida).length} producto{alertas.filter(a => !a.leida).length > 1 ? 's' : ''}:</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, fontSize: 12 }}>
                        {alertas.filter(a => !a.leida).map(a => (
                          <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span>{a.producto_nombre}</span>
                            <button onClick={async () => { await supabase.from('alertas_stock').update({ leida: true }).eq('id', a.id); loadData() }} style={{ fontSize: 11, background: 'transparent', border: '1px solid #E5E2DA', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: '#7A7568', fontFamily: 'inherit' }}>Marcar como leida</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="sec-header"><h2 className="sec-title">Estado del stock</h2></div>
                {stockBajo.length > 0 && (
                  <div className="alert-banner" style={{ marginBottom: '1rem' }}>
                    <span>⚠</span>
                    <span><strong>{stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''}</strong> con stock bajo: {stockBajo.map(p => p.nombre).join(', ')}</span>
                  </div>
                )}
                <div className="card">
                  {productos.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📊</div>No hay productos para mostrar.</div>
                  ) : (
                    <table>
                      <thead><tr><th>Producto</th><th>Categoria</th><th>Stock actual</th><th>Estado</th><th>Accion</th></tr></thead>
                      <tbody>
                        {productos.map(p => (
                          <tr key={p.id}>
                            <td><strong>{p.nombre}</strong></td>
                            <td>{p.categoria}</td>
                            <td>{p.stock ?? '-'} {p.unidad || 'u.'}</td>
                            <td>
                              {p.stock === null ? <span className="badge badge-gray">Sin stock</span>
                                : p.stock < 3 ? <span className="badge badge-danger"><span className="dot dot-danger"></span>Critico</span>
                                : p.stock < 5 ? <span className="badge badge-warn"><span className="dot dot-warn"></span>Bajo</span>
                                : <span className="badge badge-green"><span className="dot dot-green"></span>Normal</span>}
                            </td>
                            <td><button className="btn-outline btn-sm" onClick={() => abrirEditarProducto(p)}>Editar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {tab === 'agenda' && (
              <div>
                <div className="sec-header">
                  <h2 className="sec-title">Proximas entregas</h2>
                  <button className="btn btn-sm" onClick={() => setModalEntrega(true)}>+ Programar entrega</button>
                </div>
                {entregas.filter(e => e.estado === 'programada').length === 0 ? (
                  <div className="empty"><div className="empty-icon">📅</div>No hay entregas programadas.</div>
                ) : (
                  <div className="sched-list">
                    {entregas.filter(e => e.estado === 'programada').sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(e => {
                      const d = new Date(e.fecha + 'T12:00:00')
                      return (
                        <div className="sched-item" key={e.id}>
                          <div className="sched-date">
                            <div className="sched-day">{DIAS[d.getDay()]}</div>
                            <div className="sched-num">{d.getDate()}</div>
                          </div>
                          <div className="sched-info">
                            <div className="sched-title">{e.productos}</div>
                            <div className="sched-detail">{e.destinatario}</div>
                          </div>
                          <div className="sched-time">{e.hora} hs<br /><span className="badge badge-warn" style={{ marginTop: 6 }}>Programada</span></div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {modalEntrega && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalEntrega(false)}>
          <div className="modal">
            <div className="modal-title">Registrar entrega</div>
            <div className="form-row-2">
              <div className="form-row"><label className="form-label">Fecha</label><input className="form-input" type="date" value={fEntrega.fecha} onChange={e => setFEntrega({ ...fEntrega, fecha: e.target.value })} /></div>
              <div className="form-row"><label className="form-label">Hora</label><input className="form-input" type="time" value={fEntrega.hora} onChange={e => setFEntrega({ ...fEntrega, hora: e.target.value })} /></div>
            </div>
            <div className="form-row"><label className="form-label">Productos entregados</label><input className="form-input" type="text" placeholder="Ej: Desayuno + Yogures x4" value={fEntrega.productos} onChange={e => setFEntrega({ ...fEntrega, productos: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Destinatario</label><input className="form-input" type="text" value={fEntrega.destinatario} onChange={e => setFEntrega({ ...fEntrega, destinatario: e.target.value })} /></div>
            <div className="form-row-2">
              <div className="form-row"><label className="form-label">Estado</label><select className="form-input" value={fEntrega.estado} onChange={e => setFEntrega({ ...fEntrega, estado: e.target.value })}><option value="entregado">Entregado</option><option value="programada">Programada</option></select></div>
              <div className="form-row"><label className="form-label">Valor total ($)</label><input className="form-input" type="number" placeholder="Ej: 12400" value={fEntrega.valor} onChange={e => setFEntrega({ ...fEntrega, valor: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEntrega(false)}>Cancelar</button>
              <button className="btn" onClick={guardarEntrega} disabled={saving}>{saving ? 'Guardando...' : 'Guardar entrega'}</button>
            </div>
          </div>
        </div>
      )}

      {modalProducto && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalProducto(false)}>
          <div className="modal">
            <div className="modal-title">{editProducto ? 'Editar producto' : 'Agregar producto'}</div>
            <div className="form-row"><label className="form-label">Nombre del producto</label><input className="form-input" type="text" placeholder="Ej: Yogur natural 200g" value={fProducto.nombre} onChange={e => setFProducto({ ...fProducto, nombre: e.target.value })} /></div>
            <div className="form-row-2">
              <div className="form-row"><label className="form-label">Categoria</label><select className="form-input" value={fProducto.categoria} onChange={e => setFProducto({ ...fProducto, categoria: e.target.value })}><option>Lacteos</option><option>Despensa</option><option>Bebidas</option><option>Infusiones</option><option>Servicio</option><option>Otro</option></select></div>
              <div className="form-row"><label className="form-label">Unidad</label><select className="form-input" value={fProducto.unidad} onChange={e => setFProducto({ ...fProducto, unidad: e.target.value })}><option value="unidad">unidad</option><option value="caja">caja</option><option value="kg">kg</option><option value="litro">litro</option><option value="porcion">porcion</option></select></div>
            </div>
            <div className="form-row-2">
              <div className="form-row"><label className="form-label">Precio actual ($)</label><input className="form-input" type="number" placeholder="980" value={fProducto.precio} onChange={e => setFProducto({ ...fProducto, precio: e.target.value })} /></div>
              <div className="form-row"><label className="form-label">Nuevo precio ($) - opcional</label><input className="form-input" type="number" placeholder="1150" value={fProducto.precio_nuevo} onChange={e => setFProducto({ ...fProducto, precio_nuevo: e.target.value })} /></div>
            </div>
            <div className="form-row"><label className="form-label">Stock actual</label><input className="form-input" type="number" placeholder="12" value={fProducto.stock} onChange={e => setFProducto({ ...fProducto, stock: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalProducto(false)}>Cancelar</button>
              <button className="btn" onClick={guardarProducto} disabled={saving}>{saving ? 'Guardando...' : editProducto ? 'Actualizar' : 'Guardar producto'}</button>
            </div>
          </div>
        </div>
      )}

      {modalPago && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalPago(false)}>
          <div className="modal">
            <div className="modal-title">Asentar pago de DevRev</div>
            <div style={{ background: '#F7F5F0', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: 14 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>Periodo</div>
              <div style={{ fontWeight: 500 }}>{periodoLabel}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8, marginBottom: 4 }}>Total adeudado</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24 }}>${totalAdeudado.toLocaleString('es-AR')}</div>
            </div>
            <div className="form-row">
              <label className="form-label">Monto pagado</label>
              <input className="form-input" type="number" placeholder={totalAdeudado.toString()} value={fPago.montoPagado} onChange={e => setFPago({ ...fPago, montoPagado: e.target.value })} />
              {fPago.montoPagado && parseFloat(fPago.montoPagado) < totalAdeudado && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                  Queda pendiente: ${(totalAdeudado - parseFloat(fPago.montoPagado)).toLocaleString('es-AR')}
                </div>
              )}
              {fPago.montoPagado && parseFloat(fPago.montoPagado) > totalAdeudado && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6 }}>
                  Quedara saldo a favor: ${(parseFloat(fPago.montoPagado) - totalAdeudado).toLocaleString('es-AR')}
                </div>
              )}
            </div>
            <div className="form-row"><label className="form-label">Nota - opcional</label><input className="form-input" type="text" placeholder="Ej: Transferencia recibida" value={fPago.nota} onChange={e => setFPago({ ...fPago, nota: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalPago(false)}>Cancelar</button>
              <button className="btn" onClick={asentarPago} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar pago'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
