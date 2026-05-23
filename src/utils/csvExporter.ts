import type { Column, Record } from '../types';

export interface CsvExportOptions {
  includeHeaders: boolean;
  delimiter: string;
  encoding: 'utf-8' | 'utf-8-bom';
}

const DEFAULT_OPTIONS: CsvExportOptions = {
  includeHeaders: true,
  delimiter: ',',
  encoding: 'utf-8-bom', // BOM для корректного открытия в Excel
};

/**
 * Экспортирует данные таблицы в CSV формат
 */
export function exportToCsv(
  columns: Column[],
  records: Record[],
  options?: Partial<CsvExportOptions>
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Добавляем заголовки
  if (opts.includeHeaders) {
    const headerLine = columns
      .map(col => escapeCsvValue(col.name, opts.delimiter))
      .join(opts.delimiter);
    lines.push(headerLine);
  }

  // Добавляем данные
  for (const record of records) {
    const rowValues = columns.map(col => {
      const value = record.data[col.id];
      return formatCsvValue(value, col, opts.delimiter);
    });
    lines.push(rowValues.join(opts.delimiter));
  }

  return lines.join('\n');
}

/**
 * Форматирует значение для CSV в зависимости от типа колонки
 */
function formatCsvValue(value: any, column: Column, delimiter: string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (column.type) {
    case 'BOOLEAN':
      return value ? 'true' : 'false';

    case 'NUMBER':
      return String(value);

    case 'DATE':
      // Возвращаем в ISO формате
      return escapeCsvValue(String(value), delimiter);

    case 'SELECT':
      // Находим label опции по id
      if (column.options) {
        const option = column.options.find(opt => opt.id === value);
        return escapeCsvValue(option?.label || '', delimiter);
      }
      return '';

    case 'MULTI_SELECT':
      // Несколько значений через запятую
      if (Array.isArray(value) && column.options) {
        const labels = value
          .map(id => column.options?.find(opt => opt.id === id)?.label)
          .filter(Boolean);
        return escapeCsvValue(labels.join(', '), delimiter);
      }
      return '';

    case 'CREATED_TIME':
    case 'LAST_EDITED_TIME':
      // Timestamp в ISO формат
      if (typeof value === 'number') {
        return escapeCsvValue(new Date(value).toISOString(), delimiter);
      }
      return escapeCsvValue(String(value), delimiter);

    case 'FILE':
      // Файлы экспортируем как список имён через запятую
      if (Array.isArray(value)) {
        const filenames = value
          .map(file => (typeof file === 'object' && file !== null ? file.filename : null))
          .filter(Boolean);
        return escapeCsvValue(filenames.join(', '), delimiter);
      }
      return '';

    case 'RELATION':
      // Связи экспортируем как список ID через запятую
      if (Array.isArray(value)) {
        return escapeCsvValue(value.join(', '), delimiter);
      }
      return typeof value === 'string' ? escapeCsvValue(value, delimiter) : '';

    case 'FORMULA':
      // Формулы экспортируем как вычисленное значение
      // value уже должно быть вычислено
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return escapeCsvValue(String(value), delimiter);

    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'PHONE':
    case 'PERSON':
    default:
      return escapeCsvValue(String(value), delimiter);
  }
}

/**
 * Экранирует значение для CSV:
 * - Если содержит delimiter, перенос строки или кавычки — заключаем в кавычки
 * - Кавычки внутри удваиваем
 * - Защита от CSV injection (формулы в Excel)
 */
function escapeCsvValue(value: string, delimiter: string): string {
  if (!value) {
    return '';
  }

  let escapedValue = value;

  // Защита от CSV injection - экранируем значения начинающиеся с опасных символов
  const dangerousStarts = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousStarts.some(char => escapedValue.startsWith(char))) {
    // Добавляем одинарную кавычку в начало, чтобы Excel не интерпретировал как формулу
    escapedValue = "'" + escapedValue;
  }

  const needsQuotes =
    escapedValue.includes(delimiter) ||
    escapedValue.includes('\n') ||
    escapedValue.includes('\r') ||
    escapedValue.includes('"');

  if (needsQuotes) {
    // Удваиваем кавычки
    const escaped = escapedValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return escapedValue;
}

/**
 * Создаёт Blob с CSV данными и скачивает файл
 */
export function downloadCsv(content: string, filename: string, encoding: 'utf-8' | 'utf-8-bom' = 'utf-8-bom'): void {
  let blobContent = content;

  // Добавляем BOM для UTF-8, чтобы Excel корректно определил кодировку
  if (encoding === 'utf-8-bom') {
    const BOM = '﻿';
    blobContent = BOM + content;
  }

  const blob = new Blob([blobContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    // Гарантированная очистка ресурсов
    if (link.parentNode) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }
}

/**
 * Генерирует имя файла для экспорта
 */
export function generateCsvFilename(databaseName: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedName = databaseName.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  return `${sanitizedName}_${dateStr}.csv`;
}
