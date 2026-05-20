import type { Column, Record } from '../../../../types';
import { exportToCsv, downloadCsv, generateCsvFilename } from '../../../../utils/csvExporter';

interface ExportOptions {
  showToast: (message: string, isError?: boolean) => void;
}

export function useDatabaseExport(options: ExportOptions) {
  const handleExport = (
    databaseName: string,
    columns: Column[],
    records: Record[]
  ) => {
    try {
      const csvContent = exportToCsv(columns, records);
      const filename = generateCsvFilename(databaseName);
      downloadCsv(csvContent, filename, 'utf-8-bom');
      options.showToast(`Экспортировано записей: ${records.length}`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      options.showToast('Не удалось экспортировать CSV', true);
    }
  };

  return { handleExport };
}
