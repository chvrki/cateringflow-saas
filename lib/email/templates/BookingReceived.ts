export function renderBookingReceivedEmail({
  customerName,
  menuName,
  guests,
  eventDate,
  tenantName,
  tenantEmail,
}: {
  customerName: string
  menuName: string
  guests: number
  eventDate: string
  tenantName: string
  tenantEmail?: string | null
}) {
  const dateStr = new Date(eventDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
    <div style="font-family: sans-serif; color: #1c1917; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <h2 style="color: #d97706; border-bottom: 1px solid #f5f5f4; padding-bottom: 10px;">Hola ${customerName},</h2>
      <p>Hemos recibido tu solicitud de reserva en <strong>${tenantName}</strong>.</p>
      
      <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #b45309;">Resumen de tu reserva:</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Menú:</strong> ${menuName}</li>
          <li style="margin-bottom: 8px;"><strong>Fecha:</strong> ${dateStr}</li>
          <li style="margin-bottom: 0;"><strong>Personas:</strong> ${guests} pax</li>
        </ul>
      </div>

      <p style="font-weight: bold; color: #b45309;">Tu reserva está pendiente de confirmación.</p>
      <p>Revisaremos nuestra disponibilidad y recibirás otro email cuando sea confirmada.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; font-size: 12px; color: #78716c;">
        <p>Gracias por confiar en ${tenantName}</p>
        ${tenantEmail ? `<p>Contacto: ${tenantEmail}</p>` : ''}
      </div>
    </div>
  `
}
