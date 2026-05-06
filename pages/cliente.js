import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFecha(dateStr) {
  if (!dateStr) return '—'
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
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (autenticado) loadData()
  }, [autenticado, loadData])

  function handleLogin() {
    if (password === 'Desayunos') {
      setAutenticado(true)
      setErrorPass(false)
    } else {
      setErrorPass(true)
    }
  }

  const proximasEntregas = entregas
    .filter(e => e.estado === 'programada')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  const productosConAumento = productos.filter(p => p.precio_nuevo && p.precio_nuevo > p.precio)

  const entregasDelMes = entregas.filter(e => {
    const d = new Date(e.fecha)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (!autenticado) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F7F5F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');`}</style>
        <div style={{
          background: 'white', borderRadius: 16, padding: '2.5rem',
          width: 360, border: '1px solid #E5E2DA', textAlign: 'center'
        }}>
          <img src="/logo.png" alt="GEC" style={{ height: 52, marginBottom: '1.5rem' }} />
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 6 }}>Portal DevRev</div>
          <div style={{ fontSize: 13, color: '#7A7568', marginBottom: '1.75rem' }}>Ingresá la contraseña para acceder</div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrorPass(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '10px 14px',
              border: `1px solid ${errorPass ? '#A32D2D' : '#E5E2DA'}`,
              borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              outline: 'none', background: '#F7F5F0', marginBottom: 8
            }}
          />
          {errorPass && <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>Contraseña incorrecta</div>}
          <button
            onClick={handleLogin}
            style={{
              width: '100%', background: '#2A6B4F', color: 'white',
              border: 'none', borderRadius: 8, padding: '10px',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", marginTop: 4
            }}
          >
            Ingresar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F7F5F0' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');`}</style>

      {/* HEADER */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E5E2DA',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64,
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="GEC" style={{ height: 36 }} />
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17 }}>GEC</div>
            <div style={{ fontSize: 11, color: '#7A7568', marginTop: -2 }}>Portal cliente</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: '#E1F5EE', color: '#2A6B4F',
            fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20
          }}>DevRev</span>
          <button onClick={() => setAutenticado(false)} style={{
            background: 'transparent', border: '1px solid #E5E2DA',
            borderRadius: 8, padding: '5px 12px', fontSize: 12,
            cursor: 'pointer', color: '#7A7568', fontFamily: "'DM Sans', sans-serif"
          }}>Salir</button>
        </div>
      </div>

      {/* NAV */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E5E2DA',
        padding: '0 2rem', display: 'flex', overflowX: 'auto'
      }}>
        {[['entregas', 'Mis entregas'], ['productos', 'Productos y precios'], ['agenda', 'Próximas entregas']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '14px 20px', fontSize: 13, fontWeight: 500,
            color: tab === id ? '#2A6B4F' : '#7A7568',
            borderBottom: tab === id ? '2px solid #2A6B4F' : '2px solid transparent',
            background: 'none', border: 'none', borderBottom: tab === id ? '2px solid #2A6B4F' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#7A7568', fontSize: 13 }}>Cargando...</div>
        ) : (
          <>
            {/* ENTREGAS */}
            {tab === 'entregas' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Entregas este mes', val: entregasDelMes.length, sub: new Date().toLocaleString('es-AR', { month: 'long' }) },
                    { label: 'Próxima entrega', val: proximasEntregas[0] ? formatFecha(proximasEntregas[0].fecha) : 'Sin programar', sub: proximasEntregas[0] ? `${proximasEntregas[0].hora} hs` : '—', small: true },
                    { label: 'Total entregas', val: entregas.length, sub: 'historial completo' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #E5E2DA', borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: 11, color: '#7A7568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: s.small ? 16 : 26, marginTop: s.small ? 4 : 0 }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#7A7568', marginTop: 4 }}>{s.sub}</div>
                    </div>
                  ))}
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
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                                background: e.estado === 'entregado' ? '#E1F5EE' : '#FAEEDA',
                                color: e.estado === 'entregado' ? '#2A6B4F' : '#BA7517'
                              }}>
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

            {/* PRODUCTOS */}
            {tab === 'productos' && (
              <div>
                {productosConAumento.length > 0 && (
                  <div style={{
                    background: '#FAEEDA', border: '1px solid #F5C4B3',
                    borderRadius: 10, padding: '.75rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                    marginBottom: '1.25rem', fontSize: 13
                  }}>
                    <span>⚠</span>
                    <span><strong>{productosConAumento.length} producto{productosConAumento.length > 1 ? 's' : ''}</strong> con aumento de precio próximo: {productosConAumento.map(p => p.nombre).join(', ')}</span>
                  </div>
                )}
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: '1rem' }}>Precios actuales</div>
                {productos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#7A7568', fontSize: 14 }}>No hay productos cargados.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {productos.map(p => (
                      <div key={p.id} style={{
                        background: 'white', border: '1px solid #E5E2DA',
                        borderRadius: 12, padding: '1.1rem', position: 'relative'
                      }}>
                        {p.precio_nuevo && p.precio_nuevo > p.precio && (
                          <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#BA7517' }} title="Próximo aumento"></div>
                        )}
                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: '#7A7568', marginBottom: 12 }}>{p.categoria}</div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22 }}>
                          ${(p.precio || 0).toLocaleString('es-AR')} <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#7A7568' }}>/{p.unidad || 'unidad'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5E2DA' }}>
                          {p.precio_nuevo && p.precio_nuevo > p.precio ? (
                            <>
                              <span style={{ background: '#FAEEDA', color: '#BA7517', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20 }}>Sube pronto</span>
                              <span style={{ fontSize: 11, color: '#7A7568' }}>→ ${p.precio_nuevo.toLocaleString('es-AR')}</span>
                            </>
                          ) : (
                            <span style={{ background: '#E1F5EE', color: '#2A6B4F', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20 }}>Precio vigente</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AGENDA */}
            {tab === 'agenda' && (
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: '1rem' }}>Próximas entregas</div>
                {proximasEntregas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#7A7568', fontSize: 14 }}>No hay entregas programadas próximamente.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {proximasEntregas.map(e => {
                      const d = new Date(e.fecha + 'T12:00:00')
                      return (
                        <div key={e.id} style={{
                          background: 'white', border: '1px solid #E5E2DA',
                          borderRadius: 12, padding: '1rem 1.25rem',
                          display: 'flex', alignItems: 'center', gap: '1rem'
                        }}>
                          <div style={{
                            background: '#E1F5EE', color: '#2A6B4F',
                            borderRadius: 8, padding: '8px 12px',
                            textAlign: 'center', minWidth: 54
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.5px' }}>{DIAS[d.getDay()]}</div>
                            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, lineHeight: 1 }}>{d.getDate()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{e.productos}</div>
                            <div style={{ fontSize: 12, color: '#7A7568', marginTop: 3 }}>{e.destinatario}</div>
                          </div>
                          <div style={{ fontSize: 12, color: '#7A7568', textAlign: 'right' }}>
                            {e.hora} hs
                            <br />
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
