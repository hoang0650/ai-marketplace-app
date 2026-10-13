import { apiClient } from './client';

/** Order VAT invoice choice (NĐ 123/2020 as amended by NĐ 70/2025). Default: buyer does not want an invoice. */
export type InvoiceBuyerType = 'none' | 'organization' | 'individual';

export type OrderInvoice = {
  id: string;
  orderId: string;
  wantsInvoice: boolean;
  buyerType: InvoiceBuyerType;
  buyerName: string;
  taxCode: string;
  personalId: string;
  address: string;
  email: string;
  budgetUnitCode: string;
  status: 'pending' | 'issued' | 'cancelled';
  invoiceNumber: string;
  invoiceSeries: string;
  hasPdf: boolean;
  editableUntil: string | null;
  editable: boolean;
};

export type InvoicePrefill = {
  buyerType: 'organization' | 'individual';
  buyerName: string;
  taxCode: string;
  personalId: string;
  address: string;
  email: string;
  budgetUnitCode: string;
  source: string;
};

export type OrderInvoiceResponse = {
  order: { id: string; status: string };
  invoice: OrderInvoice | null;
  prefill: InvoicePrefill;
  hasSavedProfile: boolean;
};

export type InvoiceChoiceBody = {
  wantsInvoice: boolean;
  buyerType?: 'organization' | 'individual';
  buyerName?: string;
  taxCode?: string;
  personalId?: string;
  address?: string;
  email?: string;
  budgetUnitCode?: string;
  saveProfile?: boolean;
};

export const invoiceApi = {
  get: (orderId: string) => apiClient.get<OrderInvoiceResponse>(`/orders/${orderId}/invoice`),
  save: (orderId: string, body: InvoiceChoiceBody) =>
    apiClient.put<{ ok: boolean; invoice: OrderInvoice }>(`/orders/${orderId}/invoice`, body),
  pdfUrl: (orderId: string) => apiClient.get<{ url: string; expiresIn: number }>(`/orders/${orderId}/invoice/pdf`),
};
