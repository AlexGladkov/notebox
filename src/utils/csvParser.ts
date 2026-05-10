import type { ColumnType } from '../types';

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  errors: CsvParseError[];
}

export interface CsvParseError {
  line: number;
  message: string;
}

/**
 * Парсит CSV строку с поддержкой quoted values и экранирования
 */
export function parseCsv(content: string): CsvParseResult {
  const errors: CsvParseError[] = [];
  const lines: string[] = [];

  // Разбиваем на строки с учётом quoted values
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      // Экранированная кавычка ("")
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        // Переключаем режим quoted
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      // Конец строки (не внутри quoted value)
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      // Windows line ending
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      i++; // Пропускаем \n
    } else {
      currentLine += char;
    }
  }

  // Добавляем последнюю строку
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    errors.push({ line: 0, message: 'CSV файл пуст' });
    return { headers: [], rows: [], errors };
  }

  // Первая строка — заголовки
  const headers = parseCsvLine(lines[0]);

  // Проверяем на дубликаты в заголовках
  const headerSet = new Set<string>();
  headers.forEach((header, index) => {
    if (headerSet.has(header)) {
      errors.push({
        line: 1,
        message: `Дублирующийся заголовок "${header}" в колонке ${index + 1}`
      });
    }
    headerSet.add(header);
  });

  // Парсим остальные строки
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i]);

      // Проверяем количество колонок
      if (row.length !== headers.length) {
        errors.push({
          line: i + 1,
          message: `Ожидалось ${headers.length} колонок, получено ${row.length}`,
        });
      }

      rows.push(row);
    } catch (err) {
      errors.push({
        line: i + 1,
        message: err instanceof Error ? err.message : 'Ошибка парсинга строки',
      });
    }
  }

  return { headers, rows, errors };
}

/**
 * Парсит одну строку CSV с учётом quoted values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let wasQuoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Экранированная кавычка
        current += '"';
        i++;
      } else {
        // Начало/конец quoted value
        inQuotes = !inQuotes;
        wasQuoted = true;
      }
    } else if (char === ',' && !inQuotes) {
      // Разделитель колонок
      // Trim только если значение не было в кавычках
      result.push(wasQuoted ? current : current.trim());
      current = '';
      wasQuoted = false;
    } else {
      current += char;
    }
  }

  // Добавляем последнее значение
  result.push(wasQuoted ? current : current.trim());

  return result;
}

/**
 * Автоматически определяет типы колонок на основе данных
 */
export function detectColumnTypes(headers: string[], rows: string[][]): ColumnType[] {
  if (rows.length === 0) {
    // Если нет данных, все колонки TEXT по умолчанию
    return headers.map(() => 'TEXT');
  }

  return headers.map((_, colIndex) => {
    const values = rows
      .map(row => row[colIndex])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) {
      return 'TEXT';
    }

    // Проверяем BOOLEAN
    const allBoolean = values.every(v => {
      const lower = v.toLowerCase();
      return lower === 'true' || lower === 'false' ||
             lower === 'yes' || lower === 'no' ||
             lower === '1' || lower === '0' ||
             lower === 'да' || lower === 'нет';
    });
    if (allBoolean) return 'BOOLEAN';

    // Проверяем NUMBER
    const allNumber = values.every(v => {
      const num = v.replace(',', '.'); // Поддержка запятой как десятичного разделителя
      return !isNaN(Number(num));
    });
    if (allNumber) return 'NUMBER';

    // Проверяем DATE (ISO формат или распространённые форматы)
    const allDate = values.every(v => {
      // ISO: 2024-01-31
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true;
      // DD.MM.YYYY или DD/MM/YYYY
      if (/^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}/.test(v)) return true;
      return false;
    });
    if (allDate) return 'DATE';

    // Проверяем URL
    const allUrl = values.every(v => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    });
    if (allUrl) return 'URL';

    // Проверяем EMAIL
    const allEmail = values.every(v => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    });
    if (allEmail) return 'EMAIL';

    // Проверяем PHONE
    const allPhone = values.every(v => {
      // Простая проверка на телефонный номер
      return /^[\d\s\-\+\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 10;
    });
    if (allPhone) return 'PHONE';

    // По умолчанию TEXT
    return 'TEXT';
  });
}

/**
 * Преобразует значение CSV в формат, подходящий для типа колонки
 * Возвращает объект с результатом и, если нужно, новые опции для SELECT полей
 */
export interface ConvertResult {
  value: any;
  newOptions?: Array<{ label: string; color: string }>;
}

export function convertCsvValue(value: string, type: ColumnType, options?: any[]): any {
  if (!value || value === '') {
    return null;
  }

  switch (type) {
    case 'SELECT':
    case 'MULTI_SELECT':
      // Для SELECT полей ищем опцию по label и возвращаем её id
      if (!options || options.length === 0) {
        // Если options пустой, возвращаем label как есть - будет обработано позже
        return type === 'MULTI_SELECT'
          ? value.split(',').map(v => v.trim()).filter(v => v)
          : value;
      }

      if (type === 'SELECT') {
        // Для SELECT ищем одну опцию
        const option = options.find(opt =>
          opt.label && opt.label.toLowerCase() === value.toLowerCase()
        );
        // Если не нашли опцию, возвращаем label как есть - будет обработано позже
        return option ? option.id : value;
      } else {
        // Для MULTI_SELECT разбиваем по запятой и ищем каждую опцию
        const values = value.split(',').map(v => v.trim()).filter(v => v);
        const selectedIds = values
          .map(v => {
            const option = options.find(opt =>
              opt.label && opt.label.toLowerCase() === v.toLowerCase()
            );
            // Если не нашли опцию, возвращаем label как есть
            return option ? option.id : v;
          })
          .filter(Boolean);
        return selectedIds.length > 0 ? selectedIds : null;
      }

    case 'BOOLEAN':
      const lower = value.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'да';

    case 'NUMBER':
      const num = value.replace(',', '.');
      const parsedNum = Number(num);
      // Возвращаем null для невалидных чисел вместо NaN
      return isNaN(parsedNum) ? null : parsedNum;

    case 'DATE':
      // Пытаемся распарсить дату
      // ISO формат
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value;
      }
      // DD.MM.YYYY
      const ddmmyyyy = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        // Валидируем дату
        const date = new Date(formattedDate);
        if (isNaN(date.getTime())) {
          return null;
        }
        return formattedDate;
      }
      // DD/MM/YYYY
      const ddmmyyyySlash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyySlash) {
        const [, day, month, year] = ddmmyyyySlash;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        // Валидируем дату
        const date = new Date(formattedDate);
        if (isNaN(date.getTime())) {
          return null;
        }
        return formattedDate;
      }
      // Если не распознали формат, пытаемся распарсить нативно
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return null;

    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'PHONE':
    default:
      return value;
  }
}

/**
 * Валидирует размер CSV файла
 */
export function validateCsvSize(content: string, maxSizeMB = 5): { valid: boolean; error?: string } {
  const sizeInBytes = new Blob([content]).size;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > maxSizeMB) {
    return {
      valid: false,
      error: `Размер файла (${sizeInMB.toFixed(2)} МБ) превышает максимально допустимый (${maxSizeMB} МБ)`,
    };
  }

  return { valid: true };
}

/**
 * Валидирует количество строк в CSV
 */
export function validateCsvRowCount(rows: string[][], maxRows = 10000): { valid: boolean; error?: string } {
  if (rows.length > maxRows) {
    return {
      valid: false,
      error: `Количество строк (${rows.length}) превышает максимально допустимое (${maxRows})`,
    };
  }

  return { valid: true };
}
