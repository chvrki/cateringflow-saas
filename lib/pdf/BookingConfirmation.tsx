import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    color: '#1c1917',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d97706',
  },
  subtitle: {
    fontSize: 16,
    color: '#78716c',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
    paddingBottom: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    fontSize: 10,
    color: '#78716c',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#1c1917',
  },
  totalBox: {
    marginTop: 20,
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d97706',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: '#a8a29e',
    marginBottom: 4,
  },
})

export interface BookingPDFProps {
  tenant: {
    name: string
    logo_url?: string | null
    email?: string | null
  }
  booking: {
    customer_name: string
    customer_email: string
    customer_phone?: string | null
    event_date: string
    guests: number
    notes?: string | null
  }
  menu: {
    name: string
    description?: string | null
    price_per_person: number
  }
}

export const BookingConfirmationDocument = ({
  tenant,
  booking,
  menu,
}: BookingPDFProps) => {
  const total = menu.price_per_person * booking.guests

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{tenant.name}</Text>
            <Text style={styles.subtitle}>Confirmación de Reserva</Text>
          </View>
          {tenant.logo_url && (
            <Image src={tenant.logo_url} style={styles.logo} />
          )}
        </View>

        {/* Detalles del Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{booking.customer_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{booking.customer_email}</Text>
          </View>
          {booking.customer_phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{booking.customer_phone}</Text>
            </View>
          )}
        </View>

        {/* Detalles del Evento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Evento</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>
              {new Date(booking.event_date).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Número de personas:</Text>
            <Text style={styles.value}>{booking.guests} pax</Text>
          </View>
          {booking.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notas adicionales:</Text>
              <Text style={styles.value}>{booking.notes}</Text>
            </View>
          )}
        </View>

        {/* Resumen Económico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menú Seleccionado</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Menú:</Text>
            <Text style={styles.value}>{menu.name}</Text>
          </View>
          {menu.description && (
            <View style={styles.row}>
              <Text style={styles.label}>Descripción:</Text>
              <Text style={styles.value}>{menu.description}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Precio por persona:</Text>
            <Text style={styles.value}>{menu.price_per_person.toFixed(2)} €</Text>
          </View>

          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gracias por confiar en {tenant.name}
          </Text>
          {tenant.email && (
            <Text style={styles.footerText}>Contacto: {tenant.email}</Text>
          )}
          <Text style={styles.footerText}>Este documento es un comprobante de reserva informativa.</Text>
        </View>
      </Page>
    </Document>
  )
}
