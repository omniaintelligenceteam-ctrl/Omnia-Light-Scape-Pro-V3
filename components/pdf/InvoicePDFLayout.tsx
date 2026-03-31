import React from 'react';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePDFLayoutProps {
  invoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  projectName: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  notes?: string | null;
  isPaid: boolean;
  isExpired: boolean;
  paidDate?: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const InvoicePDFLayout = React.forwardRef<HTMLDivElement, InvoicePDFLayoutProps>(
  (props, ref) => {
    const {
      invoiceNumber, invoiceDate, dueDate, projectName,
      companyName, companyEmail, companyPhone, companyAddress, companyLogo,
      clientName, clientEmail, clientPhone, clientAddress,
      lineItems, subtotal, taxRate, taxAmount, discount, total, notes,
      isPaid, isExpired, paidDate,
    } = props;

    const statusColor = isPaid ? '#10b981' : isExpired ? '#ef4444' : '#3b82f6';
    const statusLabel = isPaid
      ? `PAID${paidDate ? ` — ${fmtDate(paidDate)}` : ''}`
      : isExpired
      ? 'EXPIRED'
      : `DUE: ${fmt(total)}${dueDate ? ` by ${fmtDate(dueDate)}` : ''}`;

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: '816px',
          height: '1056px',
          backgroundColor: '#111827',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '40px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} style={{ height: '40px', objectFit: 'contain', marginBottom: '8px' }} />
            ) : (
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{companyName}</div>
            )}
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              {companyEmail}
              {companyPhone ? ` · ${companyPhone}` : ''}
              {companyAddress ? ` · ${companyAddress}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>INVOICE</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{invoiceNumber}</div>
          </div>
        </div>

        {/* Blue divider */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', marginBottom: '16px', borderRadius: '1px' }} />

        {/* Status bar */}
        <div style={{
          backgroundColor: `${statusColor}22`,
          border: `1px solid ${statusColor}44`,
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: 600,
          color: statusColor,
          letterSpacing: '0.05em',
        }}>
          {statusLabel}
        </div>

        {/* Bill To / Invoice Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '8px' }}>Bill To</div>
            {clientName && <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{clientName}</div>}
            {clientEmail && <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{clientEmail}</div>}
            {clientPhone && <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{clientPhone}</div>}
            {clientAddress && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{clientAddress}</div>}
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '8px' }}>Invoice Details</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              <span style={{ color: '#6b7280' }}>Project: </span><span style={{ color: '#fff' }}>{projectName}</span>
            </div>
            {invoiceDate && (
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                <span style={{ color: '#6b7280' }}>Date: </span><span style={{ color: '#fff' }}>{fmtDate(invoiceDate)}</span>
              </div>
            )}
            {dueDate && (
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                <span style={{ color: '#6b7280' }}>Due: </span><span style={{ color: '#fff' }}>{fmtDate(dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #374151', marginBottom: '4px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>Description</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'center' }}>Qty</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'right' }}>Unit Price</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'right' }}>Total</div>
            </div>
            {lineItems.map((item, i) => (
              <div key={item.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 100px 100px',
                gap: '8px',
                padding: '7px 0',
                borderBottom: '1px solid #1f2937',
                backgroundColor: i % 2 === 1 ? '#ffffff08' : 'transparent',
              }}>
                <div style={{ fontSize: '12px', color: '#e5e7eb' }}>{item.description}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{fmt(item.unitPrice)}</div>
                <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{fmt(item.total)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#9ca3af' }}>
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {discount != null && discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#10b981' }}>
                <span>Discount</span><span>-{fmt(discount)}</span>
              </div>
            )}
            {taxAmount != null && taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#9ca3af' }}>
                <span>Tax {taxRate ? `(${(taxRate * 100).toFixed(1)}%)` : ''}</span><span>{fmt(taxAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px', fontWeight: 700, color: '#3b82f6', borderTop: '1px solid #374151', marginTop: '4px' }}>
              <span>Total Due</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div style={{ padding: '10px 14px', backgroundColor: '#ffffff08', borderRadius: '6px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '4px' }}>Notes</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'pre-line' }}>{notes}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '24px', left: '40px', right: '40px', textAlign: 'center', fontSize: '10px', color: '#4b5563', borderTop: '1px solid #1f2937', paddingTop: '12px' }}>
          Powered by Omnia LightScape
        </div>
      </div>
    );
  }
);

InvoicePDFLayout.displayName = 'InvoicePDFLayout';
