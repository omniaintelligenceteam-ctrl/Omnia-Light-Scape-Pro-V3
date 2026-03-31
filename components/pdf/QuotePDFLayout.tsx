import React from 'react';

interface QuoteLineItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotePDFLayoutProps {
  projectName: string;
  quoteDate?: string | null;
  expiresAt?: string | null;
  companyName: string;
  companyEmail: string;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  notes?: string | null;
  isApproved: boolean;
  isExpired: boolean;
  approvedDate?: string | null;
  imageUrl?: string | null;
  thumbRef?: React.RefObject<HTMLImageElement>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const QuotePDFLayout = React.forwardRef<HTMLDivElement, QuotePDFLayoutProps>(
  (props, ref) => {
    const {
      projectName, quoteDate, expiresAt,
      companyName, companyEmail, companyPhone, companyAddress, companyLogo,
      clientName, clientEmail,
      lineItems, subtotal, taxRate, taxAmount, discount, total, notes,
      isApproved, isExpired, approvedDate,
      imageUrl, thumbRef,
    } = props;

    const statusColor = isApproved ? '#10b981' : isExpired ? '#ef4444' : '#F6B45A';
    const statusLabel = isApproved
      ? `APPROVED${approvedDate ? ` — ${fmtDate(approvedDate)}` : ''}`
      : isExpired
      ? 'EXPIRED — Contact us for an updated quote'
      : `AWAITING APPROVAL — Total: ${fmt(total)}`;

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
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F6B45A' }}>QUOTE</div>
            {quoteDate && <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{fmtDate(quoteDate)}</div>}
          </div>
        </div>

        {/* Gold divider - solid color avoids html2canvas createPattern crash on gradients */}
        <div style={{ height: '2px', backgroundColor: '#F6B45A', marginBottom: '16px', borderRadius: '1px' }} />

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

        {/* Prepared For / Quote Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '8px' }}>Prepared For</div>
            {clientName && <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{clientName}</div>}
            {clientEmail && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{clientEmail}</div>}
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '8px' }}>Quote Details</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              <span style={{ color: '#6b7280' }}>Project: </span><span style={{ color: '#fff' }}>{projectName}</span>
            </div>
            {quoteDate && (
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                <span style={{ color: '#6b7280' }}>Date: </span><span style={{ color: '#fff' }}>{fmtDate(quoteDate)}</span>
              </div>
            )}
            {expiresAt && (
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                <span style={{ color: '#6b7280' }}>Valid Until: </span><span style={{ color: '#fff' }}>{fmtDate(expiresAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #374151', marginBottom: '4px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>Item</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'center' }}>Qty</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'right' }}>Unit Price</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', textAlign: 'right' }}>Total</div>
            </div>
            {lineItems.map((item, i) => (
              <div key={item.id ?? i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 100px 100px',
                gap: '8px',
                padding: '7px 0',
                borderBottom: '1px solid #1f2937',
                backgroundColor: i % 2 === 1 ? '#ffffff08' : 'transparent',
              }}>
                <div style={{ fontSize: '12px', color: '#e5e7eb' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{fmt(item.unitPrice)}</div>
                <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{fmt(item.total)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Totals + Thumbnail row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          {/* Thumbnail (left) */}
          {imageUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <img
                ref={thumbRef}
                src={imageUrl}
                alt="Lighting Design"
                crossOrigin="anonymous"
                style={{ width: '120px', height: '88px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #374151' }}
              />
              <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.05em' }}>CLICK TO VIEW FULL DESIGN</div>
            </div>
          ) : (
            <div />
          )}

          {/* Totals (right) */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px', fontWeight: 700, color: '#F6B45A', borderTop: '1px solid #374151', marginTop: '4px' }}>
              <span>Total</span><span>{fmt(total)}</span>
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

QuotePDFLayout.displayName = 'QuotePDFLayout';
