/**
 * Real Production Service Layer for KAS Trading & Etimad Cloud Suite
 * Connected directly to PostgreSQL via Supabase with Realtime & Offline Resilience.
 */

import { supabase, isDummySupabase } from './supabaseClient';
import { RealZatcaEngine } from './realZatcaEngine';
import { tafqeet } from './tafqeetService';
import { BOQItem, TenderRecord, SupplierRecord } from '../types/tenders';
import {
  KasEtmadStaff,
  KasEtmadInvoice,
  KasEtmadContract,
  KasEtmadExpense,
  KasEtmadProposal,
} from '../types/kasEtmadSuite';

class KasEtmadRealService {
  // ============================================================================
  // 1. TENDERS & BOQ ITEMS (المنافسات وجداول الكميات)
  // ============================================================================

  public async getTenders(): Promise<TenderRecord[]> {
    if (isDummySupabase) {
      const local = localStorage.getItem('kas_real_tenders_backup');
      return local ? JSON.parse(local) : [];
    }
    try {
      const { data: tenders, error } = await supabase
        .from('kas_tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!tenders || tenders.length === 0) return [];

      // Fetch items for each tender
      const { data: items, error: itemsErr } = await supabase
        .from('kas_boq_items')
        .select('*')
        .order('item_number', { ascending: true });

      if (itemsErr) throw itemsErr;

      return tenders.map(t => {
        const tenderItems: BOQItem[] = (items || [])
          .filter(it => it.tender_id === t.id)
          .map(it => ({
            id: it.id,
            itemNumber: it.item_number,
            description: it.description,
            unit: it.unit,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
            unitPriceInWords: it.unit_price_in_words || tafqeet(Number(it.unit_price)),
            totalPrice: Number(it.total_price),
            totalPriceInWords: it.total_price_in_words || tafqeet(Number(it.total_price)),
            vat: Number(it.vat),
            totalWithVat: Number(it.total_with_vat),
            totalWithVatInWords: it.total_with_vat_in_words || tafqeet(Number(it.total_with_vat)),
          }));

        return {
          id: t.id,
          referenceNumber: t.reference_number,
          title: t.title,
          entityName: t.entity_name,
          clientName: t.client_name,
          category: (t.category as any) || 'توريدات حكومية وتجهيزات',
          status: (t.status as any) || 'مسودة قيد الدراسة',
          submissionDate: t.submission_deadline ? t.submission_deadline.split('T')[0] : new Date().toISOString().split('T')[0],
          supplyDuration: t.supply_duration,
          commitmentDays: t.commitment_days,
          itemsCount: t.items_count,
          subtotal: Number(t.subtotal),
          subtotalInWords: t.subtotal_in_words || tafqeet(Number(t.subtotal)),
          vatAmount: Number(t.vat_amount),
          vatInWords: t.vat_in_words || tafqeet(Number(t.vat_amount)),
          grandTotal: Number(t.grand_total),
          grandTotalInWords: t.grand_total_in_words || tafqeet(Number(t.grand_total)),
          items: tenderItems,
        };
      });
    } catch (err) {
      console.warn('Fallback to local storage for getTenders:', err);
      const local = localStorage.getItem('kas_real_tenders_backup');
      return local ? JSON.parse(local) : [];
    }
  }

  public async saveTender(tender: TenderRecord): Promise<TenderRecord> {
    const isNew = !tender.id || tender.id.startsWith('tender-mock') || tender.id.startsWith('tender-kas') || tender.id.startsWith('TND-');
    const tenderPayload = {
      reference_number: tender.referenceNumber,
      title: tender.title,
      entity_name: tender.entityName,
      client_name: tender.clientName,
      category: tender.category,
      status: tender.status,
      supply_duration: tender.supplyDuration,
      commitment_days: tender.commitmentDays,
      items_count: tender.items ? tender.items.length : 0,
      subtotal: tender.subtotal,
      subtotal_in_words: tender.subtotalInWords,
      vat_amount: tender.vatAmount,
      vat_in_words: tender.vatInWords,
      grand_total: tender.grandTotal,
      grand_total_in_words: tender.grandTotalInWords,
      updated_at: new Date().toISOString(),
    };

    let tenderId = tender.id;

    if (isNew) {
      const { data, error } = await supabase
        .from('kas_tenders')
        .insert([tenderPayload])
        .select()
        .single();
      if (error) throw error;
      tenderId = data.id;
    } else {
      const { error } = await supabase
        .from('kas_tenders')
        .update(tenderPayload)
        .eq('id', tender.id);
      if (error) throw error;

      // Clear existing items before inserting updated ones
      await supabase.from('kas_boq_items').delete().eq('tender_id', tender.id);
    }

    // Insert BOQ items
    if (tender.items && tender.items.length > 0) {
      const itemsPayload = tender.items.map((it: BOQItem, idx: number) => ({
        tender_id: tenderId,
        item_number: idx + 1,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        unit_price_in_words: it.unitPriceInWords,
        total_price: it.totalPrice,
        total_price_in_words: it.totalPriceInWords,
        vat: it.vat,
        total_with_vat: it.totalWithVat,
        total_with_vat_in_words: it.totalWithVatInWords,
      }));

      const { error: itemsError } = await supabase.from('kas_boq_items').insert(itemsPayload);
      if (itemsError) throw itemsError;
    }

    return { ...tender, id: tenderId };
  }

  public async deleteTender(tenderId: string): Promise<boolean> {
    const { error } = await supabase.from('kas_tenders').delete().eq('id', tenderId);
    if (error) throw error;
    return true;
  }

  // ============================================================================
  // 2. MONAFASAT MASTER SEARCH & PAGINATION (+11,700 منافسة)
  // ============================================================================

  public async searchMonafasat(
    query: string = '',
    category: string = '',
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: any[]; totalCount: number }> {
    try {
      let req = supabase
        .from('kas_monafasat_master')
        .select('*', { count: 'exact' });

      if (category && category !== 'all' && category !== 'الكل') {
        req = req.eq('category', category);
      }

      if (query.trim()) {
        req = req.or(`tender_name.ilike.%${query}%,reference_number.ilike.%${query}%,government_entity.ilike.%${query}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await req
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
      };
    } catch (err) {
      console.warn('Error in searchMonafasat:', err);
      return { data: [], totalCount: 0 };
    }
  }

  // ============================================================================
  // 3. INVOICES & ZATCA PHASE 2 E-INVOICING (الفواتير الضريبية)
  // ============================================================================

  public async getInvoices(): Promise<KasEtmadInvoice[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase
        .from('kas_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.client_name,
        amount: Number(inv.subtotal),
        taxAmount: Number(inv.vat_amount),
        date: inv.issue_date,
        dueDate: inv.due_date,
        status: (inv.status as any) || 'غير مدفوع',
        paidAmount: Number(inv.paid_amount || 0),
        items: [
          {
            description: `توريد وتنفيذ منافسة ${inv.invoice_number}`,
            qty: 1,
            rate: Number(inv.subtotal),
            taxPct: 15,
            total: Number(inv.grand_total),
          }
        ],
      }));
    } catch (err) {
      console.warn('Fallback getInvoices:', err);
      return [];
    }
  }

  public async createZatcaInvoice(invoiceData: {
    invoiceNumber: string;
    clientName: string;
    subtotal: number;
    vatAmount: number;
    grandTotal: number;
    issueDate: string;
    dueDate: string;
    status?: any;
    items?: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number; vatAmount: number; totalWithVat: number }>;
  }): Promise<KasEtmadInvoice> {
    const zatcaResult = await RealZatcaEngine.processInvoice({
      invoiceNumber: invoiceData.invoiceNumber,
      issueDate: invoiceData.issueDate,
      sellerName: RealZatcaEngine.DEFAULT_SELLER.name,
      sellerVatNumber: RealZatcaEngine.DEFAULT_SELLER.vatNumber,
      buyerName: invoiceData.clientName,
      subtotal: invoiceData.subtotal,
      vatRate: 15,
      vatAmount: invoiceData.vatAmount,
      grandTotal: invoiceData.grandTotal,
      items: invoiceData.items || [
        {
          name: `توريد وتنفيذ منافسة ${invoiceData.invoiceNumber}`,
          quantity: 1,
          unitPrice: invoiceData.subtotal,
          totalPrice: invoiceData.subtotal,
          vatAmount: invoiceData.vatAmount,
          totalWithVat: invoiceData.grandTotal,
        }
      ],
    });

    const { data: inv, error } = await supabase
      .from('kas_invoices')
      .insert([
        {
          invoice_number: invoiceData.invoiceNumber,
          client_name: invoiceData.clientName,
          issue_date: invoiceData.issueDate,
          due_date: invoiceData.dueDate,
          subtotal: invoiceData.subtotal,
          taxable_amount: invoiceData.subtotal,
          vat_amount: invoiceData.vatAmount,
          grand_total: invoiceData.grandTotal,
          balance_due: invoiceData.grandTotal,
          status: invoiceData.status || 'غير مدفوع',
          zatca_uuid: zatcaResult.uuid,
          zatca_hash: zatcaResult.invoiceHash,
          zatca_xml_ubl: zatcaResult.ublXml,
          zatca_qr_code: zatcaResult.qrCodeBase64,
          zatca_status: 'معتمدة ومطابقة ZATCA Phase 2',
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.client_name,
      amount: Number(inv.subtotal),
      taxAmount: Number(inv.vat_amount),
      date: inv.issue_date,
      dueDate: inv.due_date,
      status: inv.status,
      paidAmount: 0,
      items: [
        {
          description: `توريد وتنفيذ منافسة ${inv.invoice_number}`,
          qty: 1,
          rate: Number(inv.subtotal),
          taxPct: 15,
          total: Number(inv.grand_total),
        }
      ],
    };
  }

  // ============================================================================
  // 4. SUPPLIERS & CLIENTS (الموردين والعملاء)
  // ============================================================================

  public async getSuppliers(): Promise<SupplierRecord[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase
        .from('kas_suppliers')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        city: s.city,
        phone: s.phone,
        email: s.email || '',
        rating: s.rating,
        qualityScore: s.quality_score,
        commitmentScore: s.commitment_score,
        priceCompetitiveness: s.price_competitiveness,
        totalDeals: s.total_deals,
        totalValue: Number(s.total_value),
        status: s.status as any,
      }));
    } catch (err) {
      console.warn('Fallback getSuppliers:', err);
      return [];
    }
  }

  public async saveSupplier(supplier: SupplierRecord): Promise<SupplierRecord> {
    const payload = {
      name: supplier.name,
      category: supplier.category,
      city: supplier.city,
      phone: supplier.phone,
      email: supplier.email,
      rating: supplier.rating,
      quality_score: supplier.qualityScore,
      commitment_score: supplier.commitmentScore,
      price_competitiveness: supplier.priceCompetitiveness,
      total_deals: supplier.totalDeals,
      total_value: supplier.totalValue,
      status: supplier.status,
      updated_at: new Date().toISOString(),
    };

    if (supplier.id && !supplier.id.startsWith('sup-mock') && !supplier.id.startsWith('sup-') && !supplier.id.startsWith('SUP-')) {
      const { error } = await supabase.from('kas_suppliers').update(payload).eq('id', supplier.id);
      if (error) throw error;
      return supplier;
    } else {
      const { data, error } = await supabase.from('kas_suppliers').insert([payload]).select().single();
      if (error) throw error;
      return { ...supplier, id: data.id };
    }
  }

  public async deleteSupplier(id: string): Promise<boolean> {
    const { error } = await supabase.from('kas_suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ============================================================================
  // 5. PROPOSALS (العروض)
  // ============================================================================

  public async getProposals(): Promise<KasEtmadProposal[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase
        .from('kas_proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        proposalNumber: p.proposal_number,
        subject: p.subject,
        toClient: p.client_name,
        totalAmount: Number(p.grand_total),
        date: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        openTill: p.open_till || '',
        createdAt: p.created_at || '',
        status: (p.status as any) || 'مسودة',
        items: [
          {
            description: p.subject,
            qty: 1,
            rate: Number(p.total_amount || p.grand_total),
            taxPct: 15,
            total: Number(p.grand_total),
          }
        ],
      }));
    } catch (err) {
      console.warn('Fallback getProposals:', err);
      return [];
    }
  }

  public async saveProposal(prop: Partial<KasEtmadProposal>): Promise<KasEtmadProposal> {
    const totalVal = prop.totalAmount || 0;
    const payload = {
      proposal_number: prop.proposalNumber || `PROP-2026-${Date.now().toString().slice(-4)}`,
      subject: prop.subject || 'عرض سعر رسمي',
      client_name: prop.toClient || 'الجهة الحكومية',
      grand_total: totalVal,
      total_amount: Number((totalVal / 1.15).toFixed(2)),
      vat_amount: Number((totalVal - totalVal / 1.15).toFixed(2)),
      open_till: prop.openTill || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: prop.status || 'مسودة',
      updated_at: new Date().toISOString(),
    };

    if (prop.id && !prop.id.startsWith('prop-')) {
      const { error } = await supabase.from('kas_proposals').update(payload).eq('id', prop.id);
      if (error) throw error;
      return { ...prop, id: prop.id } as KasEtmadProposal;
    } else {
      const { data, error } = await supabase.from('kas_proposals').insert([payload]).select().single();
      if (error) throw error;
      return {
        id: data.id,
        proposalNumber: data.proposal_number,
        subject: data.subject,
        toClient: data.client_name,
        totalAmount: Number(data.grand_total),
        date: data.created_at?.split('T')[0] || '',
        openTill: data.open_till || '',
        createdAt: data.created_at || '',
        status: data.status,
        items: [
          {
            description: data.subject,
            qty: 1,
            rate: Number(data.total_amount),
            taxPct: 15,
            total: Number(data.grand_total),
          }
        ],
      };
    }
  }

  // ============================================================================
  // 6. CONTRACTS & EXPENSES
  // ============================================================================

  public async getContracts(): Promise<KasEtmadContract[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase.from('kas_contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        subject: c.title,
        clientName: c.client_name,
        contractType: 'توريد وتنفيذ',
        contractValue: Number(c.contract_value),
        startDate: c.start_date,
        endDate: c.end_date,
        status: (c.status as any) || 'ساري',
      }));
    } catch (err) {
      console.warn('Fallback getContracts:', err);
      return [];
    }
  }

  public async getExpenses(): Promise<KasEtmadExpense[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase.from('kas_expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      return (data || []).map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.total_amount),
        taxAmount: Number(e.vat_amount),
        expenseName: e.vendor_name || 'مصروف عام',
        date: e.expense_date,
        paymentMode: e.payment_method || 'تحويل بنكي',
      }));
    } catch (err) {
      console.warn('Fallback getExpenses:', err);
      return [];
    }
  }

  public async getStaff(): Promise<KasEtmadStaff[]> {
    if (isDummySupabase) return [];
    try {
      const { data, error } = await supabase.from('kas_staff').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        name: s.full_name,
        email: s.email,
        role: s.role,
        lastLogin: 'الآن',
        active: s.status === 'نشط',
        phone: s.phone || '',
      }));
    } catch (err) {
      console.warn('Fallback getStaff:', err);
      return [];
    }
  }
}

export const kasEtmadRealService = new KasEtmadRealService();
