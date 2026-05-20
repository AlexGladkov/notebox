import type { Column, ColumnType, SelectOption } from '../../../../types';
import type { ImportData } from '../../CsvImportDialog.vue';

interface ImportOptions {
  addColumn: (databaseId: string, name: string, type: ColumnType, options?: SelectOption[]) => Promise<Column>;
  updateColumn: (databaseId: string, columnId: string, name: string, type: ColumnType, options?: SelectOption[]) => Promise<void>;
  batchCreateRecords: (databaseId: string, records: { [columnId: string]: any }[]) => Promise<void>;
  batchDeleteRecords: (databaseId: string, recordIds: string[]) => Promise<void>;
  getRecordsByDatabaseId: (databaseId: string) => any[];
  showToast: (message: string, isError?: boolean) => void;
}

export function useDatabaseImport(options: ImportOptions) {
  const handleImport = async (
    databaseId: string,
    databaseColumns: Column[],
    importData: ImportData
  ) => {
    try {
      // Создаём новые колонки если нужно
      const columnIdMap = new Map<string, string>(); // Map временный ID -> реальный ID

      if (importData.newColumns && importData.newColumns.length > 0 && importData.tempColumnIds) {
        const createdColumns = [];
        for (const newCol of importData.newColumns) {
          const column = await options.addColumn(
            databaseId,
            newCol.name,
            newCol.type
          );
          if (!column) {
            throw new Error(`Не удалось создать колонку: ${newCol.name}`);
          }
          createdColumns.push(column);
        }

        // Создаем маппинг временных ID на реальные ID
        for (const [tempId, colIndex] of importData.tempColumnIds.entries()) {
          const realColumn = createdColumns[colIndex];
          if (realColumn) {
            columnIdMap.set(tempId, realColumn.id);
          }
        }
      }

      // Обрабатываем SELECT поля - создаём недостающие опции
      const selectColumnsToUpdate = new Map<string, { column: Column; newOptions: Set<string> }>();

      for (const record of importData.records) {
        for (const [tempColumnId, value] of Object.entries(record)) {
          const actualColumnId = columnIdMap.get(tempColumnId) || tempColumnId;
          const column = databaseColumns.find(c => c.id === actualColumnId);

          if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
            // Проверяем, есть ли строковые значения (не ID)
            const values = column.type === 'MULTI_SELECT' && Array.isArray(value) ? value : [value];

            for (const val of values) {
              if (typeof val === 'string' && val) {
                // Это строка, а не ID - нужно создать опцию
                const existingOption = column.options?.find(opt => opt.id === val || opt.label.toLowerCase() === val.toLowerCase());
                if (!existingOption) {
                  // Добавляем в список новых опций для этой колонки
                  if (!selectColumnsToUpdate.has(actualColumnId)) {
                    selectColumnsToUpdate.set(actualColumnId, { column, newOptions: new Set() });
                  }
                  selectColumnsToUpdate.get(actualColumnId)!.newOptions.add(val);
                }
              }
            }
          }
        }
      }

      // Создаём новые опции для SELECT колонок
      const optionIdMap = new Map<string, string>(); // Map label -> новый ID опции
      for (const [columnId, { column, newOptions }] of selectColumnsToUpdate.entries()) {
        const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange'];
        const updatedOptions = [...(column.options || [])];

        for (const label of newOptions) {
          const newOptionId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const color = colors[updatedOptions.length % colors.length];
          updatedOptions.push({ id: newOptionId, label, color });
          optionIdMap.set(`${columnId}:${label}`, newOptionId);
        }

        // Обновляем колонку с новыми опциями
        await options.updateColumn(
          databaseId,
          columnId,
          column.name,
          column.type,
          updatedOptions
        );
      }

      // Преобразуем записи с учётом новых колонок и опций
      const recordsToImport = importData.records.map(record => {
        const transformedRecord: { [columnId: string]: any } = {};
        for (const [tempColumnId, value] of Object.entries(record)) {
          const actualColumnId = columnIdMap.get(tempColumnId) || tempColumnId;
          const column = databaseColumns.find(c => c.id === actualColumnId);

          let transformedValue = value;

          // Преобразуем строковые значения SELECT полей в ID опций
          if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
            if (column.type === 'SELECT' && typeof value === 'string') {
              // Ищем опцию по label или берём ID из карты новых опций
              const existingOption = column.options?.find(opt => opt.label.toLowerCase() === value.toLowerCase());
              transformedValue = existingOption?.id || optionIdMap.get(`${actualColumnId}:${value}`) || value;
            } else if (column.type === 'MULTI_SELECT' && Array.isArray(value)) {
              transformedValue = value.map(val => {
                if (typeof val === 'string') {
                  const existingOption = column.options?.find(opt => opt.label.toLowerCase() === val.toLowerCase());
                  return existingOption?.id || optionIdMap.get(`${actualColumnId}:${val}`) || val;
                }
                return val;
              });
            }
          }

          transformedRecord[actualColumnId] = transformedValue;
        }
        return transformedRecord;
      });

      // Если режим "заменить" - удаляем существующие записи
      if (importData.mode === 'replace') {
        const existingRecords = options.getRecordsByDatabaseId(databaseId);
        if (existingRecords.length > 0) {
          const confirmed = confirm(
            `Вы уверены, что хотите удалить все существующие записи (${existingRecords.length}) и заменить их импортированными данными?`
          );
          if (!confirmed) {
            return false;
          }
          await options.batchDeleteRecords(
            databaseId,
            existingRecords.map(r => r.id)
          );
        }
      }

      // Создаём новые записи
      await options.batchCreateRecords(databaseId, recordsToImport);

      options.showToast(`Успешно импортировано записей: ${recordsToImport.length}`);
      return true;
    } catch (err) {
      console.error('Failed to import CSV:', err);
      options.showToast('Не удалось импортировать CSV', true);
      return false;
    }
  };

  return { handleImport };
}
