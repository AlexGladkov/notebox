<template>
  <div>
    <FolderItem
      v-for="folder in folders"
      :key="folder.id"
      :folder="folder"
      :is-selected="selectedFolderId === folder.id"
      :has-children="getChildFolders(folder.id).length > 0"
      :is-expanded="expandedFolders.has(folder.id)"
      @select="$emit('selectFolder', folder.id)"
      @rename="(name) => $emit('renameFolder', folder.id, name)"
      @delete="$emit('deleteFolder', folder.id)"
      @create-subfolder="$emit('createSubfolder', folder.id)"
      @toggle-expand="toggleFolder(folder.id)"
    >
      <FolderTree
        v-if="expandedFolders.has(folder.id)"
        :folders="getChildFolders(folder.id)"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        @select-folder="$emit('selectFolder', $event)"
        @rename-folder="(id, name) => $emit('renameFolder', id, name)"
        @delete-folder="$emit('deleteFolder', $event)"
        @create-subfolder="$emit('createSubfolder', $event)"
        @toggle-expand="toggleFolder"
      />
    </FolderItem>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Folder } from '../types';
import FolderItem from './FolderItem.vue';

const props = defineProps<{
  folders: Folder[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
}>();

const emit = defineEmits<{
  selectFolder: [id: string];
  renameFolder: [id: string, name: string];
  deleteFolder: [id: string];
  createSubfolder: [parentId: string];
  toggleExpand: [id: string];
}>();

const getChildFolders = (parentId: string) => {
  return computed(() =>
    props.folders.filter(f => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  ).value;
};

const toggleFolder = (id: string) => {
  emit('toggleExpand', id);
};
</script>
