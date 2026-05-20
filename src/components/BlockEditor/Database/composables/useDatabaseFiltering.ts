import { computed, type Ref, type ComputedRef } from 'vue';
import type { Record, Column } from '../../../../types';
import type { DatabaseFilter, DatabaseSort } from '../../../../types/database';

export function useDatabaseFiltering(
  records: Ref<Record[]>,
  columns: ComputedRef<Column[]>,
  filters: Ref<DatabaseFilter | null>,
  sorts: Ref<DatabaseSort | null>,
  searchQuery: Ref<string>
) {
  const applyFilter = (records: Record[], filter: DatabaseFilter): Record[] => {
    return records.filter(record => {
      const value = record.data[filter.columnId];
      const column = columns.value.find(c => c.id === filter.columnId);

      switch (filter.operator) {
        case 'isEmpty':
          return value === null || value === undefined || value === '';
        case 'isNotEmpty':
          return value !== null && value !== undefined && value !== '';
        case 'equals':
          // Для Select/MultiSelect колонок нужно сравнивать label
          if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
            if (!value) return false;
            const option = column.options?.find(o => o.id === value);
            return option?.label === filter.value;
          }
          return value === filter.value;
        case 'contains':
          // Для Select/MultiSelect также ищем по label
          if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
            if (!value) return false;
            const option = column.options?.find(o => o.id === value);
            return option?.label.toLowerCase().includes(String(filter.value).toLowerCase());
          }
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'gt':
          return Number(value) > Number(filter.value);
        case 'lt':
          return Number(value) < Number(filter.value);
        case 'gte':
          return Number(value) >= Number(filter.value);
        case 'lte':
          return Number(value) <= Number(filter.value);
        default:
          return true;
      }
    });
  };

  const applySearch = (records: Record[], query: string): Record[] => {
    const lowerQuery = query.toLowerCase();
    return records.filter(record => {
      return Object.entries(record.data).some(([columnId, value]) => {
        if (value === null || value === undefined) return false;

        // Find column to check if it's SELECT or MULTI_SELECT
        const column = columns.value.find(c => c.id === columnId);
        if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
          // Search in option labels
          if (column.type === 'SELECT') {
            const option = column.options?.find(o => o.id === value);
            return option?.label.toLowerCase().includes(lowerQuery);
          } else if (column.type === 'MULTI_SELECT' && Array.isArray(value)) {
            return value.some(optionId => {
              const option = column.options?.find(o => o.id === optionId);
              return option?.label.toLowerCase().includes(lowerQuery);
            });
          }
        }

        // Search in plain text values
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });
  };

  const applySort = (records: Record[], sort: DatabaseSort): Record[] => {
    return [...records].sort((a, b) => {
      const aValue = a.data[sort.columnId];
      const bValue = b.data[sort.columnId];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  };

  const filteredRecords = computed(() => {
    let result = [...records.value];

    // Apply filter
    if (filters.value) {
      result = applyFilter(result, filters.value);
    }

    // Apply search
    if (searchQuery.value) {
      result = applySearch(result, searchQuery.value);
    }

    // Apply sort
    if (sorts.value) {
      result = applySort(result, sorts.value);
    }

    return result;
  });

  return { filteredRecords };
}
