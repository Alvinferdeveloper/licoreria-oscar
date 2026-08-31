import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { BRAND_NAME } from '@licoreria/shared-types';
import { Prisma } from '@prisma/client';

// pdfmake no trae tipados para la build de servidor
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/src/printer');

// Estructura mínima que necesita la factura (la trae el servicio de ventas)
export interface InvoiceSale {
  invoiceNumber: string;
  status: string;
  saleDate: Date;
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  customer: { name: string; documentId: string | null };
  user: { name: string };
  details: {
    quantity: number;
    unitPrice: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    product: { name: string; sku: string };
  }[];
}

// pdfmake en Node requiere archivos de fuente en disco; el paquete solo
// distribuye Roboto embebida en base64 (vfs_fonts, build de navegador).
// Se extraen una vez a un directorio temporal y se reutilizan.
function resolveFontsDir(): string {
  const dir = path.join(os.tmpdir(), 'licoreria-pdf-fonts');
  const regular = path.join(dir, 'Roboto-Regular.ttf');
  if (fs.existsSync(regular)) return dir;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsModule = require('pdfmake/build/vfs_fonts');
  const vfs =
    vfsModule?.pdfMake?.vfs ??
    (globalThis as { pdfMake?: { vfs?: Record<string, string> } }).pdfMake
      ?.vfs;
  if (!vfs) {
    throw new InternalServerErrorException(
      'No se encontraron las fuentes de pdfmake',
    );
  }

  fs.mkdirSync(dir, { recursive: true });
  for (const [file, base64] of Object.entries(
    vfs as Record<string, string>,
  )) {
    if (file.endsWith('.ttf')) {
      fs.writeFileSync(path.join(dir, file), Buffer.from(base64, 'base64'));
    }
  }
  return dir;
}

const money = (n: Prisma.Decimal | number | string) =>
  `C$${Number(n).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

@Injectable()
export class InvoicePdfService {
  createStream(sale: InvoiceSale, saleDateLocal: string) {
    const fontsDir = resolveFontsDir();
    const printer = new PdfPrinter({
      Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
      },
    });

    const copper = '#A6632B';
    const cava = '#1F3D33';

    const doc: TDocumentDefinitions = {
      pageSize: 'LETTER',
      pageMargins: [48, 48, 48, 48],
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: BRAND_NAME, fontSize: 18, bold: true, color: cava },
                { text: 'FACTURA', fontSize: 14, color: copper, bold: true },
                // Línea de vertido: regla cobre → transparente (marca)
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 4,
                      w: 96,
                      h: 2,
                      color: copper,
                    },
                  ],
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                {
                  text: `No. ${sale.invoiceNumber}`,
                  fontSize: 12,
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: saleDateLocal,
                  fontSize: 10,
                  alignment: 'right',
                  color: '#5A5248',
                },
                ...(sale.status === 'VOIDED'
                  ? [
                      {
                        text: 'ANULADA',
                        fontSize: 12,
                        bold: true,
                        color: '#B23A34',
                        alignment: 'right' as const,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        {
          margin: [0, 16, 0, 8],
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Cliente', fontSize: 8, color: '#5A5248' },
                { text: sale.customer.name, fontSize: 11 },
                ...(sale.customer.documentId
                  ? [
                      {
                        text: `Documento: ${sale.customer.documentId}`,
                        fontSize: 9,
                        color: '#5A5248',
                      },
                    ]
                  : []),
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: 'Atendido por', fontSize: 8, color: '#5A5248' },
                { text: sale.user.name, fontSize: 11 },
              ],
            },
          ],
        },
        {
          margin: [0, 8, 0, 8],
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Producto', style: 'tableHeader' },
                { text: 'Cant.', style: 'tableHeader', alignment: 'right' },
                { text: 'P. unitario', style: 'tableHeader', alignment: 'right' },
                { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
              ],
              ...sale.details.map((d) => [
                { text: `${d.product.name} (${d.product.sku})`, fontSize: 10 },
                { text: d.quantity.toString(), alignment: 'right' as const, fontSize: 10 },
                { text: money(d.unitPrice), alignment: 'right' as const, fontSize: 10 },
                { text: money(d.subtotal), alignment: 'right' as const, fontSize: 10 },
              ]),
            ],
          },
          layout: {
            hLineColor: '#D8D6CC',
            vLineWidth: () => 0,
            hLineWidth: () => 1,
          },
        },
        {
          margin: [0, 8, 0, 0],
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                widths: ['auto', 'auto'],
                body: [
                  ['Subtotal', { text: money(sale.subtotal), alignment: 'right' }],
                  ['IVA', { text: money(sale.taxTotal), alignment: 'right' }],
                  [
                    { text: 'Total', bold: true },
                    { text: money(sale.total), alignment: 'right', bold: true },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      styles: {
        tableHeader: {
          fontSize: 9,
          bold: true,
          color: '#5A5248',
          margin: [0, 4, 0, 4],
        },
      },
      defaultStyle: { fontSize: 10, color: '#241C15' },
    };

    return printer.createPdfKitDocument(doc);
  }
}
