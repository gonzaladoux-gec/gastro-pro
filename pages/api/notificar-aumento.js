export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { producto, precioActual, precioNuevo } = req.body

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'GEC <info@geccatering.com>',
        to: ['rosario.pizarro@devrev.ai', 'i-magdalena.olazabal@devrev.ai'],
        subject: `GEC - Actualizacion de precio: ${producto}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; color: #1C1A17;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://panel.geccatering.com/logo.png" alt="GEC" style="height: 48px;" />
            </div>
            <h2 style="font-size: 20px; margin-bottom: 8px;">Actualizacion de precio</h2>
            <p style="color: #7A7568; font-size: 14px; margin-bottom: 24px;">
              Te informamos que el siguiente producto tendra un cambio de precio proximamente.
            </p>
            <div style="background: #F7F5F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">${producto}</div>
              <table style="width: 100%;">
                <tr>
                  <td style="vertical-align: top;">
                    <div style="font-size: 11px; color: #7A7568; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;">Precio actual</div>
                    <div style="font-size: 22px;">$${precioActual}</div>
                  </td>
                  <td style="vertical-align: middle; text-align: center; font-size: 22px; color: #7A7568; padding-top: 16px;">-></td>
                  <td style="vertical-align: top; text-align: right;">
                    <div style="font-size: 11px; color: #7A7568; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;">Nuevo precio</div>
                    <div style="font-size: 22px; color: #BA7517;">$${precioNuevo}</div>
                  </td>
                </tr>
              </table>
            </div>
            <p style="font-size: 13px; color: #7A7568;">
              Podas consultar todos los precios actualizados en tu portal:
              <a href="https://panel.geccatering.com/cliente" style="color: #2A6B4F;">panel.geccatering.com/cliente</a>
            </p>
            <hr style="border: none; border-top: 1px solid #E5E2DA; margin: 24px 0;" />
            <p style="font-size: 12px; color: #7A7568; text-align: center;">GEC - Soluciones gastronomicas</p>
          </div>
        `
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(500).json({ error })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
