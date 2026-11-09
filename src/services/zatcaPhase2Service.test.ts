import { describe, it, expect } from 'vitest';
import {
  generateZatcaQR,
  generateUblXml,
  calculateZatcaHash,
  processZatcaInvoice,
  ZatcaInvoicePayload,
} from './zatcaPhase2Service';

const SAMPLE_PAYLOAD: ZatcaInvoicePayload = {
  invoiceNumber: 'SAF-INV-2026-0001',
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  issueDate: '2026-08-17',
  issueTime: '14:30:00',
  sellerName: 'مجموعة خالد السليم التجارية',
  sellerVatNumber: '310928374100003',
  sellerAddress: 'طريق الملك فهد، الرياض، المملكة العربية السعودية',
  buyerName: 'بندر صالح الهويريني',
  buyerVatNumber: '300000000000003',
  lineItems: [
    {
      name: 'رسوم وساطة استقدام عاملة منزلية (الفلبين)',
      quantity: 1,
      unitPrice: 12000,
      vatRate: 0.15,
      total: 13800,
    },
  ],
  subtotal: 12000,
  vatAmount: 1800,
  grandTotal: 13800,
};

describe('ZATCA Phase 2 (Fatoorah) Compliance Engine', () => {
  it('should generate valid Base64 encoded TLV QR code string', () => {
    const qr = generateZatcaQR(
      'مجموعة خالد السليم',
      '310928374100003',
      '2026-08-17T14:30:00Z',
      13800,
      1800
    );

    expect(qr).toBeDefined();
    expect(typeof qr).toBe('string');
    expect(qr.length).toBeGreaterThan(20);
  });

  it('should generate compliant UBL 2.1 XML structure', () => {
    const xml = generateUblXml(SAMPLE_PAYLOAD);

    expect(xml).toContain('<cbc:ID>SAF-INV-2026-0001</cbc:ID>');
    expect(xml).toContain('<cbc:UUID>123e4567-e89b-12d3-a456-426614174000</cbc:UUID>');
    expect(xml).toContain('<cbc:CompanyID>310928374100003</cbc:CompanyID>');
    expect(xml).toContain('<cbc:RegistrationName>مجموعة خالد السليم التجارية</cbc:RegistrationName>');
    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="SAR">12000.00</cbc:TaxExclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">13800.00</cbc:PayableAmount>');
  });

  it('should compute cryptographic SHA-256 hash for invoice XML', async () => {
    const xml = generateUblXml(SAMPLE_PAYLOAD);
    const hash = await calculateZatcaHash(xml);

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 hexadecimal string length
  });

  it('should complete end-to-end ZATCA compliance processing', async () => {
    const result = await processZatcaInvoice(SAMPLE_PAYLOAD);

    expect(result.phase2Status).toBe('COMPLIANT');
    expect(result.clearanceStatus).toBe('REPORTED');
    expect(result.qrCodeBase64).toBeDefined();
    expect(result.invoiceHash).toHaveLength(64);
    expect(result.errors).toHaveLength(0);
  });
});
