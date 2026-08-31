import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import { APP_TIMEZONE } from '@licoreria/shared-types';

// Las fechas en los Excel se presentan en hora de Managua, nunca en UTC crudo
export function formatManagua(date: Date, withTime = true): string {
  return new Intl.DateTimeFormat('es-NI', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date);
}

@Injectable()
export class ExcelService {
  // Genera un libro de una sola hoja y lo envía como descarga .xlsx
  async send(
    res: Response,
    filename: string,
    sheetName: string,
    columns: { header: string; key: string; width: number }[],
    rows: Record<string, string | number>[],
  ) {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(rows);

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`,
    );
    res.send(Buffer.from(buffer));
  }
}
