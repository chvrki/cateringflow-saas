import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type QuoteDocumentProps = {
  tenant: {
    name: string
  }
  quote: {
    id: string
    client_name: string
    client_email: string | null
    client_phone: string | null
    event_date: string | null
    guests: number | null
    event_type: string | null
    location: string | null
    menu_name: string | null
    price_per_pax: number | null
    subtotal: number | null
    tax_amount: number | null
    total: number | null
    deposit_amount: number | null
    valid_until: string | null
    legal_terms: string | null
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 10,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 18,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: '#78350f',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'right',
  },
  muted: {
    color: '#6b7280',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1 solid #f3f4f6',
    paddingVertical: 7,
  },
  label: {
    color: '#6b7280',
  },
  value: {
    fontWeight: 700,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
    borderTop: '1 solid #d1d5db',
  },
  total: {
    fontSize: 14,
    fontWeight: 700,
    color: '#d97706',
  },
  box: {
    border: '1 solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
})

function currency(value: number | null) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value ?? 0)
}

function date(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES')
}

export function QuoteDocument({ tenant, quote }: QuoteDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Caterix</Text>
            <Text style={styles.muted}>{tenant.name}</Text>
          </View>
          <View>
            <Text style={styles.title}>Presupuesto</Text>
            <Text style={styles.muted}>#{quote.id.slice(0, 8)}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.grid]}>
          <View style={[styles.column, styles.box]}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.value}>{quote.client_name}</Text>
            <Text style={styles.muted}>{quote.client_email ?? '-'}</Text>
            <Text style={styles.muted}>{quote.client_phone ?? '-'}</Text>
          </View>
          <View style={[styles.column, styles.box]}>
            <Text style={styles.sectionTitle}>Evento</Text>
            <Text>{quote.event_type ?? 'Evento'}</Text>
            <Text style={styles.muted}>{date(quote.event_date)}</Text>
            <Text style={styles.muted}>{quote.location ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>{quote.menu_name ?? 'Menu'}</Text>
              <Text style={styles.value}>
                {quote.guests ?? 0} pax x {currency(quote.price_per_pax)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen economico</Text>
          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>{currency(quote.subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>IVA 21%</Text>
              <Text style={styles.value}>{currency(quote.tax_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.value}>Total</Text>
              <Text style={styles.total}>{currency(quote.total)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fianza</Text>
              <Text style={styles.value}>{currency(quote.deposit_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validez</Text>
          <Text>Presupuesto valido hasta el {date(quote.valid_until)}.</Text>
        </View>

        {quote.legal_terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condiciones</Text>
            <Text style={styles.muted}>{quote.legal_terms}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
