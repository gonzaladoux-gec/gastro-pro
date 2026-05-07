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

export default function Cliente() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [errorPass, setErrorPass] = useState(false)
  const [tab, setTab] = useState('entregas')
  const [entregas, setEntregas] = useState([])
  const [productos, setProductos] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [avisados, setAvisados] = useState({})
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: e }, { data: p }, { data: pg }] = await Promise.all([
      supabase.from('entregas').select('*').order('fecha', { ascending: false }),
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('pagos').select('*').order('created_at', { ascending: false })
    ])
    setEntregas(e || [])
    setProductos(p || [])
    setPagos(pg || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (autenticado) loadData() }, [autenticado, loadData])

  function handleLogin() {
    if (password === 'Desayunos') { setAutenticado(true); setErrorPass(false) }
    else setErrorPass(true)
  }

  async function avisarStock(producto) {
    if (avisados[producto.id]) return
    await supabase.from('alertas_stock').insert([{ producto_id: producto.id, producto_nombre: producto.nombre, mensaje: `DevRev reporto stock bajo de ${producto.nombre}`, leida: false }])
    setAvisados(prev => ({ ...prev, [producto.id]: true }))
  }

  const proximasEntregas = entregas.filter(e => e.estado === 'programada').sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  const productosConAumento = productos.filter(p => p.precio_nuevo && p.precio_nuevo > p.precio)

  const ultimoPago = pagos[0]
  const entregasAdeudadas = entregas.filter(e => {
    if (e.estado !== 'entregado') return false
    if (!ultimoPago) return true
    return new Date(e.fecha) > new Date(ultimoPago.created_at)
  })
  const totalAdeudado = entregasAdeudadas.reduce((s, e) => s + (e.valor || 0), 0)

  const entregasFiltradas = entregas.filter(e => {
    const d = new Date(e.fecha)
    return d.getMonth() === mesFiltro && d.getFullYear() === anioFiltro && e.estado === 'entregado'
  })
  const totalFiltrado = entregasFiltradas.reduce((s, e) => s + (e.valor || 0), 0)

  const mesesDisponibles = []
  const ahora = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    mesesDisponibles.push({ mes: d.getMonth(), anio: d.getFullYear(), label: `${MESES_FULL[d.getMonth()]} ${d.getFullYear()}` })
  }

  if (!autenticado) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');`}</style>
        <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem', width: 360, border: '1px solid #E5E2DA', textAlign: 'center' }}>
          <img src="/logo.png" alt="GEC" style={{ height: 52, marginBottom: '1.5rem' }} />
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 6 }}>Portal DevRev</div>
          <div style={{ fontSize: 13, color: '#7A7568', marginBottom: '1.75rem' }}>Ingresa la contrasena para acceder</div>
          <input type="password" placeholder="Contrasena" value={password}
            onChange={e => { setPassword(e.target.value); setErrorPass(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 14px', border: `1px solid ${errorPass ? '#A32D2D' : '#E5E2DA'}`, borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#F7F5F0', marginBottom: 8 }}
          />
          {errorPass && <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>Contrasena incorrecta</div>}
          <button onClick={handleLogin} style={{ width: '100%', background: '#2A6B4F', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>Ingresar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F7F5F0' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');`}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #E5E2DA', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="GEC" style={{ height: 36 }} />
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17 }}>GEC</div>
            <div style={{ fontSize: 11, color: '#7A7568', marginTop: -2 }}>Portal cliente</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#E1F5EE', color: '#2A6B4F', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>DevRev</span>
          <button onClick={() => setAutenticado(false)} style={{ background: 'transparent', border: '1px solid #E5E2DA', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#7A7568', fontFamily: "'DM Sans', sans-serif" }}>Salir</button>
        </div>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #E5E2DA', padding: '0 2rem', display: 'flex', overflowX: 'auto' }}>
        {[['entregas', 'Mis entregas'], ['productos', 'Productos y precios'], ['agenda', 'Proximas entregas']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '14px 20px', fontSize: 13, fontWeight: 500, color: tab === id ? '#2A6B4F' : '#7A7568', borderBottom: tab === id ? '2px solid #2A6B4F' : '2px solid transparent', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid #2A6B4F' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '2rem' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#7A7568', fontSize: 13 }}>Cargando...</div> : (
          <>
            {tab === 'entregas' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
                  <div style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Proxima entrega</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, marginTop: 4 }}>{proximasEntregas[0] ? formatFecha(proximasEntregas[0].fecha) : 'Sin programar'}</div>
                    <div style={{ fontSize: 11, color: '#7A7568', marginTop: 4 }}>{proximasEntregas[0] ? `${proximasEntregas[0].hora} hs` : '-'}</div>
                  </div>
                  <div style={{ background: totalAdeudado > 0 ? '#FCEBEB' : 'white', border: `1px solid ${totalAdeudado > 0 ? '#F5C4B3' : '#E5E2DA'}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Saldo pendiente</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: totalAdeudado > 0 ? '#A32D2D' : '#2A6B4F' }}>${totalAdeudado.toLocaleString('es-AR')}</div>
                    <div style={{ fontSize: 11, color: '#7A7568', marginTop: 4 }}>{ultimoPago ? `desde ${formatFecha(ultimoPago.created_at?.split('T')[0])}` : 'acumulado'}</div>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Total entregas</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26 }}>{entregas.filter(e => e.estado === 'entregado').length}</div>
                    <div style={{ fontSize: 11, color: '#7A7568', marginTop: 4 }}>historial completo</div>
                  </div>
                </div>

                {totalAdeudado > 0 && (
                  <div style={{ background: '#FCEBEB', border: '1px solid #F5C4B3', borderRadius: 10, padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem', fontSize: 13 }}>
                    <span>💰</span>
                    <span>Tu saldo pendiente es <strong>${totalAdeudado.toLocaleString('es-AR')}</strong>. El pago se realiza contra entrega de manera quincenal.</span>
                  </div>
                )}

                {totalAdeudado === 0 && ultimoPago && (
                  <div style={{ background: '#E1F5EE', border: '1px solid #A8DFC8', borderRadius: 10, padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem', fontSize: 13 }}>
                    <span>✅</span>
                    <span>Al dia. No tenes saldo pendiente.</span>
                  </div>
                )}

                <div style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Resumen por mes</div>
                      <select style={{ padding: '8px 12px', border: '1px solid #E5E2DA', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: '#F7F5F0', outline: 'none' }} value={`${mesFiltro}-${anioFiltro}`} onChange={e => { const [m, a] = e.target.value.split('-'); setMesFiltro(parseInt(m)); setAnioFiltro(parseInt(a)) }}>
                        {mesesDisponibles.map(m => (
                          <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#7A7568', marginBottom: 4 }}>{entregasFiltradas.length} entrega{entregasFiltradas.length !== 1 ? 's' : ''} entregadas</div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#2A6B4F' }}>${totalFiltrado.toLocaleString('es-AR')}</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: '1rem' }}>Historial de entregas</div>
                <div style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, overflow: 'hidden' }}>
                  {entregas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#7A7568', fontSize: 14 }}>No hay entregas registradas.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#F7F5F0' }}>
                          {['Fecha', 'Hora', 'Productos', 'Estado', 'Valor'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A7568', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #E5E2DA' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entregas.map((e, i) => (
                          <tr key={e.id} style={{ borderBottom: i < entregas.length - 1 ? '1px solid #E5E2DA' : 'none' }}>
                            <td style={{ padding: '12px 16px' }}>{formatFecha(e.fecha)}</td>
                            <td style={{ padding: '12px 16px' }}>{e.hora} hs</td>
                            <td style={{ padding: '12px 16px' }}>{e.productos}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: e.estado === 'entregado' ? '#E1F5EE' : '#FAEEDA', color: e.estado === 'entregado' ? '#2A6B4F' : '#BA7517' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.estado === 'entregado' ? '#1D9E75' : '#BA7517', display: 'inline-block' }}></span>
                                {e.estado === 'entregado' ? 'Entregado' : 'Programada'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>${(e.valor || 0).toLocaleString('es-AR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {tab === 'productos' && (
              <div>
                {productosConAumento.length > 0 && (
                  <div style={{ background: '#FAEEDA', border: '1px solid #F5C4B3', borderRadius: 10, padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem', fontSize: 13 }}>
                    <span>⚠</span>
                    <span><strong>{productosConAumento.length} producto{productosConAumento.length > 1 ? 's' : ''}</strong> con aumento proximo: {productosConAumento.map(p => p.nombre).join(', ')}</span>
                  </div>
                )}
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 6 }}>Precios actuales</div>
                <div style={{ fontSize: 13, color: '#7A7568', marginBottom: '1rem' }}>Si notas que un producto esta por agotarse, usa el boton para avisarnos.</div>
                {productos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#7A7568', fontSize: 14 }}>No hay productos cargados.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
                    {productos.map(p => (
                      <div key={p.id} style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1.1rem', position: 'relative' }}>
                        {p.precio_nuevo && p.precio_nuevo > p.precio && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#BA7517' }}></div>}
                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: '#7A7568', marginBottom: 12 }}>{p.categoria}</div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22 }}>
                          ${(p.precio || 0).toLocaleString('es-AR')} <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#7A7568' }}>/{p.unidad || 'unidad'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5E2DA' }}>
                          {p.precio_nuevo && p.precio_nuevo > p.precio ? (
                            <>
                              <span style={{ background: '#FAEEDA', color: '#BA7517', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20 }}>Sube pronto</span>
                              <span style={{ fontSize: 11, color: '#7A7568' }}>a ${p.precio_nuevo.toLocaleString('es-AR')}</span>
                            </>
                          ) : (
                            <span style={{ background: '#E1F5EE', color: '#2A6B4F', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20 }}>Precio vigente</span>
                          )}
                        </div>
                        <button onClick={() => avisarStock(p)} disabled={avisados[p.id]}
                          style={{ marginTop: 10, width: '100%', background: avisados[p.id] ? '#F1EFE8' : 'transparent', color: avisados[p.id] ? '#7A7568' : '#A32D2D', border: `1px solid ${avisados[p.id] ? '#E5E2DA' : '#A32D2D'}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 500, cursor: avisados[p.id] ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          {avisados[p.id] ? 'Aviso enviado' : 'Avisar stock bajo'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'agenda' && (
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: '1rem' }}>Proximas entregas</div>
                {proximasEntregas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#7A7568', fontSize: 14 }}>No hay entregas programadas proximamente.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {proximasEntregas.map(e => {
                      const d = new Date(e.fecha + 'T12:00:00')
                      return (
                        <div key={e.id} style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ background: '#E1F5EE', color: '#2A6B4F', borderRadius: 8, padding: '8px 12px', textAlign: 'center', minWidth: 54 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.5px' }}>{DIAS[d.getDay()]}</div>
                            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, lineHeight: 1 }}>{d.getDate()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{e.productos}</div>
                            <div style={{ fontSize: 12, color: '#7A7568', marginTop: 3 }}>{e.destinatario}</div>
                          </div>
                          <div style={{ fontSize: 12, color: '#7A7568', textAlign: 'right' }}>
                            {e.hora} hs<br />
                            <span style={{ background: '#FAEEDA', color: '#BA7517', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, marginTop: 6, display: 'inline-block' }}>Programada</span>
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
      </div>
    </div>
  )
}
