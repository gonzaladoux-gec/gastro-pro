import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFecha(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

export default function Home() {
  const [tab, setTab] = useState('entregas')
  const [entregas, setEntregas] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modalEntrega, setModalEntrega] = useState(false)
  const [modalProducto, setModalProducto] = useState(false)
  const [editProducto, setEditProducto] = useState(null)
  const [saving, setSaving] = useState(false)

  const [fEntrega, setFEntrega] = useState({ fecha: '', hora: '09:00', productos: '', destinatario: 'Recepción — María G.', valor: '', estado: 'entregado' })
  const [fProducto, setFProducto] = useState({ nombre: '', categoria: 'Lácteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' })

  const showToast = (msg) => setToast(msg)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from('entregas').select('*').order('fecha', { ascending: false }),
      supabase.from('productos').select('*').order('nombre')
    ])
    setEntregas(e || [])
    setProductos(p || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function guardarEntrega() {
    if (!fEntrega.fecha || !fEntrega.productos) return showToast('Completá fecha y productos')
    setSaving(true)
    const { error } = await supabase.from('entregas').insert([{
      fecha: fEntrega.fecha,
      hora: fEntrega.hora,
      productos: fEntrega.productos,
      destinatario: fEntrega.destinatario,
      valor: parseFloat(fEntrega.valor) || 0,
      estado: fEntrega.estado
    }])
    setSaving(false)
    if (error) return showToast('Error al guardar. Verificá la conexión.')
    showToast('Entrega guardada')
    setModalEntrega(false)
    setFEntrega({ fecha: '', hora: '09:00', productos: '', destinatario: 'Recepción — María G.', valor: '', estado: 'entregado' })
    loadData()
  }

  async function guardarProducto() {
    if (!fProducto.nombre || !fProducto.precio) return showToast('Completá nombre y precio')
    setSaving(true)
    const data = {
      nombre: fProducto.nombre,
      categoria: fProducto.categoria,
      precio: parseFloat(fProducto.precio) || 0,
      precio_nuevo: fProducto.precio_nuevo ? parseFloat(fProducto.precio_nuevo) : null,
      stock: parseInt(fProducto.stock) || 0,
      unidad: fProducto.unidad
    }
    const { error } = editProducto
      ? await supabase.from('productos').update(data).eq('id', editProducto.id)
      : await supabase.from('productos').insert([data])
    setSaving(false)
    if (error) return showToast('Error al guardar.')
    showToast(editProducto ? 'Producto actualizado' : 'Producto agregado')
    setModalProducto(false)
    setEditProducto(null)
    setFProducto({ nombre: '', categoria: 'Lácteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' })
    loadData()
  }

  async function eliminarEntrega(id) {
    if (!confirm('¿Eliminás esta entrega?')) return
    await supabase.from('entregas').delete().eq('id', id)
    showToast('Entrega eliminada')
    loadData()
  }

  function abrirEditarProducto(p) {
    setEditProducto(p)
    setFProducto({ nombre: p.nombre, categoria: p.categoria, precio: p.precio, precio_nuevo: p.precio_nuevo || '', stock: p.stock, unidad: p.unidad || 'unidad' })
    setModalProducto(true)
  }

  const entregasDelMes = entregas.filter(e => {
    const d = new Date(e.fecha)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const proximaEntrega = entregas
    .filter(e => e.estado === 'programada' && new Date(e.fecha) >= new Date())
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0]

  const productosConAumento = productos.filter(p => p.precio_nuevo && p.precio_nuevo > p.precio)
  const stockBajo = productos.filter(p => p.stock !== null && p.stock < 5)

  const totalMes = entregasDelMes.reduce((s, e) => s + (e.valor || 0), 0)

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-4.5-7.5-4.5-7.5-9 0-2.5 2.5-4 5-4s5 1.5 5 4"/></svg>
          </div>
          <div>
            <div className="logo-name">Gastro Pro</div>
            <div className="logo-tag">Panel de gestión</div>
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
        {loading ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <>
            {/* ENTREGAS */}
            {tab === 'entregas' && (
              <div>
                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Entregas este mes</div>
                    <div className="stat-val">{entregasDelMes.length}</div>
                    <div className="stat-sub">en {new Date().toLocaleString('es-AR', { month: 'long' })}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Próxima entrega</div>
                    <div className="stat-val" style={{ fontSize: 16, marginTop: 6 }}>
                      {proximaEntrega ? formatFecha(proximaEntrega.fecha) : 'Sin programar'}
                    </div>
                    <div className="stat-sub">{proximaEntrega ? `${proximaEntrega.hora} hs` : '—'}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Total entregas</div>
                    <div className="stat-val">{entregas.length}</div>
                    <div className="stat-sub">historial completo</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Valor este mes</div>
                    <div className="stat-val" style={{ fontSize: 20, marginTop: 4 }}>
                      ${totalMes.toLocaleString('es-AR')}
                    </div>
                    <div className="stat-sub up">acumulado</div>
                  </div>
                </div>

                <div className="sec-header">
                  <h2 className="sec-title">Historial de entregas</h2>
                  <button className="btn btn-sm" onClick={() => setModalEntrega(true)}>+ Nueva entrega</button>
                </div>

                <div className="card">
                  {entregas.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📦</div>No hay entregas registradas todavía.</div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th><th>Hora</th><th>Productos</th><th>Destinatario</th><th>Estado</th><th>Valor</th><th></th>
                        </tr>
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
                            <td>
                              <button className="btn-cancel" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => eliminarEntrega(e.id)}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* PRODUCTOS */}
            {tab === 'productos' && (
              <div>
                {productosConAumento.length > 0 && (
                  <div className="alert-banner">
                    <span>⚠</span>
                    <span><strong>{productosConAumento.length} producto{productosConAumento.length > 1 ? 's' : ''}</strong> con aumento de precio próximo: {productosConAumento.map(p => p.nombre).join(', ')}</span>
                  </div>
                )}
                <div className="sec-header">
                  <h2 className="sec-title">Catálogo de productos</h2>
                  <button className="btn btn-sm" onClick={() => { setEditProducto(null); setFProducto({ nombre: '', categoria: 'Lácteos', precio: '', precio_nuevo: '', stock: '', unidad: 'unidad' }); setModalProducto(true) }}>+ Agregar producto</button>
                </div>
                {productos.length === 0 ? (
                  <div className="empty"><div className="empty-icon">🛒</div>No hay productos cargados todavía.</div>
                ) : (
                  <div className="product-grid">
                    {productos.map(p => (
                      <div className="prod-card" key={p.id} onClick={() => abrirEditarProducto(p)} style={{ cursor: 'pointer' }}>
                        {p.precio_nuevo && p.precio_nuevo > p.precio && <div className="prod-alert" title="Próximo aumento"></div>}
                        <div className="prod-name">{p.nombre}</div>
                        <div className="prod-cat">{p.categoria}</div>
                        <div className="prod-price">${(p.precio || 0).toLocaleString('es-AR')} <span>/{p.unidad || 'unidad'}</span></div>
                        <div className="prod-stock">
                          {p.precio_nuevo && p.precio_nuevo > p.precio
                            ? <><span className="badge badge-warn">Sube pronto</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>→ ${p.precio_nuevo.toLocaleString('es-AR')}</span></>
                            : p.stock !== null && p.stock < 5
                            ? <><span className="badge badge-danger">Stock bajo</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>Stock: {p.stock}</span></>
                            : <><span className="badge badge-green">Disponible</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>Stock: {p.stock ?? '—'}</span></>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STOCK */}
            {tab === 'stock' && (
              <div>
                <div className="sec-header">
                  <h2 className="sec-title">Estado del stock</h2>
                </div>
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
                      <thead>
                        <tr><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Estado</th><th>Acción</th></tr>
                      </thead>
                      <tbody>
                        {productos.map(p => (
                          <tr key={p.id}>
                            <td><strong>{p.nombre}</strong></td>
                            <td>{p.categoria}</td>
                            <td>{p.stock ?? '—'} {p.unidad || 'u.'}</td>
                            <td>
                              {p.stock === null
                                ? <span className="badge badge-gray">Sin stock</span>
                                : p.stock < 3
                                ? <span className="badge badge-danger"><span className="dot dot-danger"></span>Crítico</span>
                                : p.stock < 5
                                ? <span className="badge badge-warn"><span className="dot dot-warn"></span>Bajo</span>
                                : <span className="badge badge-green"><span className="dot dot-green"></span>Normal</span>
                              }
                            </td>
                            <td>
                              <button className="btn-outline btn-sm" onClick={() => abrirEditarProducto(p)}>Editar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* AGENDA */}
            {tab === 'agenda' && (
              <div>
                <div className="sec-header">
                  <h2 className="sec-title">Próximas entregas</h2>
                  <button className="btn btn-sm" onClick={() => setModalEntrega(true)}>+ Programar entrega</button>
                </div>
                {entregas.filter(e => e.estado === 'programada').length === 0 ? (
                  <div className="empty"><div className="empty-icon">📅</div>No hay entregas programadas. Agendá una con el botón de arriba.</div>
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
                          <div className="sched-time">
                            {e.hora} hs
                            <br />
                            <span className="badge badge-warn" style={{ marginTop: 6 }}>Programada</span>
                          </div>
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

      {/* MODAL ENTREGA */}
      {modalEntrega && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalEntrega(false)}>
          <div className="modal">
            <div className="modal-title">Registrar entrega</div>
            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={fEntrega.fecha} onChange={e => setFEntrega({ ...fEntrega, fecha: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Hora</label>
                <input className="form-input" type="time" value={fEntrega.hora} onChange={e => setFEntrega({ ...fEntrega, hora: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Productos entregados</label>
              <input className="form-input" type="text" placeholder="Ej: Desayuno + Yogures x4 + Café x10" value={fEntrega.productos} onChange={e => setFEntrega({ ...fEntrega, productos: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Destinatario</label>
              <input className="form-input" type="text" value={fEntrega.destinatario} onChange={e => setFEntrega({ ...fEntrega, destinatario: e.target.value })} />
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Estado</label>
                <select className="form-input" value={fEntrega.estado} onChange={e => setFEntrega({ ...fEntrega, estado: e.target.value })}>
                  <option value="entregado">Entregado</option>
                  <option value="programada">Programada</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Valor total ($)</label>
                <input className="form-input" type="number" placeholder="Ej: 12400" value={fEntrega.valor} onChange={e => setFEntrega({ ...fEntrega, valor: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEntrega(false)}>Cancelar</button>
              <button className="btn" onClick={guardarEntrega} disabled={saving}>{saving ? 'Guardando...' : 'Guardar entrega'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {modalProducto && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModalProducto(false)}>
          <div className="modal">
            <div className="modal-title">{editProducto ? 'Editar producto' : 'Agregar producto'}</div>
            <div className="form-row">
              <label className="form-label">Nombre del producto</label>
              <input className="form-input" type="text" placeholder="Ej: Yogur natural 200g" value={fProducto.nombre} onChange={e => setFProducto({ ...fProducto, nombre: e.target.value })} />
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Categoría</label>
                <select className="form-input" value={fProducto.categoria} onChange={e => setFProducto({ ...fProducto, categoria: e.target.value })}>
                  <option>Lácteos</option><option>Despensa</option><option>Bebidas</option><option>Infusiones</option><option>Servicio</option><option>Otro</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Unidad</label>
                <select className="form-input" value={fProducto.unidad} onChange={e => setFProducto({ ...fProducto, unidad: e.target.value })}>
                  <option value="unidad">unidad</option>
                  <option value="caja">caja</option>
                  <option value="kg">kg</option>
                  <option value="litro">litro</option>
                  <option value="porción">porción</option>
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Precio actual ($)</label>
                <input className="form-input" type="number" placeholder="980" value={fProducto.precio} onChange={e => setFProducto({ ...fProducto, precio: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Nuevo precio ($) — opcional</label>
                <input className="form-input" type="number" placeholder="1150" value={fProducto.precio_nuevo} onChange={e => setFProducto({ ...fProducto, precio_nuevo: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Stock actual</label>
              <input className="form-input" type="number" placeholder="12" value={fProducto.stock} onChange={e => setFProducto({ ...fProducto, stock: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalProducto(false)}>Cancelar</button>
              <button className="btn" onClick={guardarProducto} disabled={saving}>{saving ? 'Guardando...' : editProducto ? 'Actualizar' : 'Guardar producto'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
