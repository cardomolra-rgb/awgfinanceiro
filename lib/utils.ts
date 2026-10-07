
export const formatCurrency = (value: number, currency = 'BRL'): string => {
    const v = Number.isFinite(value) ? value : 0;
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(v);
    } catch {
        // Moeda inválida (ex.: backup corrompido) não pode derrubar a tela
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    }
};

/** Número no formato brasileiro para planilhas (1234,56). */
export const formatNumberBR = (value: number): string =>
    (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');

/**
 * Evita "injeção de fórmula" no Excel: um texto que começa com = + - @ (ex.: uma descrição
 * de PIX "=HYPERLINK(...)") seria executado como fórmula ao abrir a planilha.
 * Números (ex.: "-12,50") continuam números.
 */
export const neutralizeFormula = (s: string): string =>
    /^[=+\-@\t\r]/.test(s) && !/^-?\d[\d.,]*$/.test(s) ? `'${s}` : s;

const csvCell = (v: unknown): string => {
    const s = neutralizeFormula(v === undefined || v === null ? '' : String(v));
    return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Gera e baixa um CSV compatível com o Excel em português:
 * separador ";" , decimal com vírgula e BOM UTF-8 para acentos.
 */
export const downloadCSV = (headers: string[], rows: (string | number | undefined)[][], fileName: string) => {
    const lines = [headers, ...rows].map(r => r.map(csvCell).join(';'));
    const content = '﻿' + lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const TYPE_LABELS: Record<string, string> = {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
    TRANSFER: 'Transferência',
};

export const STATUS_LABELS: Record<string, string> = {
    PAID: 'Pago',
    PLANNED: 'Em aberto',
    OVERDUE: 'Atrasado',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    PIX: 'PIX',
    BOLETO: 'Boleto',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão de Crédito',
    TRANSFER: 'Transferência',
};
