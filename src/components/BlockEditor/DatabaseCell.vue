<template>
  <component
    :is="cellComponent"
    :value="value"
    :column="column"
    :record-id="recordId"
    @update="handleUpdate"
    @create-option="handleCreateOption"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Column, SelectOption } from '../../types';

// Import all cell components
import TextCell from './cells/TextCell.vue';
import NumberCell from './cells/NumberCell.vue';
import BooleanCell from './cells/BooleanCell.vue';
import DateCell from './cells/DateCell.vue';
import SelectCell from './cells/SelectCell.vue';
import MultiSelectCell from './cells/MultiSelectCell.vue';
import RelationCell from './cells/RelationCell.vue';
import FormulaCell from './cells/FormulaCell.vue';
import FileCell from './cells/FileCell.vue';
import PersonCell from './cells/PersonCell.vue';
import UrlCell from './cells/UrlCell.vue';
import EmailCell from './cells/EmailCell.vue';
import PhoneCell from './cells/PhoneCell.vue';
import CreatedTimeCell from './cells/CreatedTimeCell.vue';
import LastEditedTimeCell from './cells/LastEditedTimeCell.vue';

const props = defineProps<{
  column: Column;
  value: any;
  recordId: string;
}>();

const emit = defineEmits<{
  update: [value: any];
  createOption: [option: SelectOption];
}>();

const cellComponent = computed(() => {
  switch (props.column.type) {
    case 'TEXT':
      return TextCell;
    case 'NUMBER':
      return NumberCell;
    case 'BOOLEAN':
      return BooleanCell;
    case 'DATE':
      return DateCell;
    case 'SELECT':
      return SelectCell;
    case 'MULTI_SELECT':
      return MultiSelectCell;
    case 'RELATION':
      return RelationCell;
    case 'FORMULA':
      return FormulaCell;
    case 'FILE':
      return FileCell;
    case 'PERSON':
      return PersonCell;
    case 'URL':
      return UrlCell;
    case 'EMAIL':
      return EmailCell;
    case 'PHONE':
      return PhoneCell;
    case 'CREATED_TIME':
      return CreatedTimeCell;
    case 'LAST_EDITED_TIME':
      return LastEditedTimeCell;
    default:
      return TextCell;
  }
});

const handleUpdate = (value: any) => {
  emit('update', value);
};

const handleCreateOption = (option: SelectOption) => {
  emit('createOption', option);
};
</script>
