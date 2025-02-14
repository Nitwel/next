<template>
	<div>
		<v-list-item
			v-if="folder.children === undefined"
			:to="`/files?folder=${folder.id}`"
			:active="currentFolder === folder.id"
			exact
			@contextmenu.native.prevent.stop="$refs.contextMenu.activate"
		>
			<v-list-item-icon><v-icon name="folder" /></v-list-item-icon>
			<v-list-item-content>{{ folder.name }}</v-list-item-content>
		</v-list-item>

		<v-list-group
			v-else
			:to="`/files?folder=${folder.id}`"
			:active="currentFolder === folder.id"
			:value="folder.id"
			scope="files-navigation"
			exact
			disable-groupable-parent
			@contextmenu.native.prevent.stop="$refs.contextMenu.activate"
		>
			<template #activator>
				<v-list-item-icon>
					<v-icon name="folder" />
				</v-list-item-icon>
				<v-list-item-content>{{ folder.name }}</v-list-item-content>
			</template>

			<navigation-folder
				v-for="childFolder in folder.children"
				:key="childFolder.id"
				:folder="childFolder"
				:current-folder="currentFolder"
				:click-handler="clickHandler"
			/>
		</v-list-group>

		<v-menu ref="contextMenu" show-arrow placement="bottom-start">
			<v-list dense>
				<v-list-item @click="renameActive = true">
					<v-list-item-icon>
						<v-icon name="edit" />
					</v-list-item-icon>
					<v-list-item-content>
						{{ $t('rename_folder') }}
					</v-list-item-content>
				</v-list-item>
				<v-list-item @click="moveActive = true">
					<v-list-item-icon>
						<v-icon name="folder_move" />
					</v-list-item-icon>
					<v-list-item-content>
						{{ $t('move_to_folder') }}
					</v-list-item-content>
				</v-list-item>
				<v-list-item @click="deleteActive = true">
					<v-list-item-icon>
						<v-icon name="delete" />
					</v-list-item-icon>
					<v-list-item-content>
						{{ $t('delete_folder') }}
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>

		<v-dialog v-model="renameActive" persistent>
			<v-card>
				<v-card-title>{{ $t('rename_folder') }}</v-card-title>
				<v-card-text>
					<v-input v-model="renameValue" />
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="renameActive = false">{{ $t('cancel') }}</v-button>
					<v-button @click="renameSave" :loading="renameSaving">{{ $t('save') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="moveActive" persistent>
			<v-card>
				<v-card-title>{{ $t('move_to_folder') }}</v-card-title>
				<v-card-text>
					<folder-picker v-model="moveValue" :disabled-folders="[folder.id]" />
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="moveActive = false">{{ $t('cancel') }}</v-button>
					<v-button @click="moveSave" :loading="moveSaving">{{ $t('save') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="deleteActive" persistent>
			<v-card>
				<v-card-title>{{ $t('delete_folder') }}</v-card-title>
				<v-card-text>
					<v-notice>
						{{ $t('nested_files_folders_will_be_moved') }}
					</v-notice>
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="deleteActive = false">{{ $t('cancel') }}</v-button>
					<v-button @click="deleteSave" :loading="deleteSaving">{{ $t('delete') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, computed } from '@vue/composition-api';
import useFolders, { Folder } from '../../composables/use-folders';
import notify from '@/utils/notify';
import api from '@/api';
import FolderPicker from '../folder-picker';
import router from '@/router';

export default defineComponent({
	name: 'navigation-folder',
	components: { FolderPicker },
	props: {
		folder: {
			type: Object as PropType<Folder>,
			required: true,
		},
		currentFolder: {
			type: String,
			default: null,
		},
		clickHandler: {
			type: Function,
			default: () => undefined,
		},
	},
	setup(props) {
		const { renameActive, renameValue, renameSave, renameSaving } = useRenameFolder();
		const { moveActive, moveValue, moveSave, moveSaving } = useMoveFolder();
		const { deleteActive, deleteSave, deleteSaving } = useDeleteFolder();

		const { fetchFolders } = useFolders();

		return {
			renameActive,
			renameValue,
			renameSave,
			renameSaving,
			moveActive,
			moveValue,
			moveSave,
			moveSaving,
			deleteActive,
			deleteSave,
			deleteSaving,
		};

		function useRenameFolder() {
			const renameActive = ref(false);
			const renameValue = ref(props.folder.name);
			const renameSaving = ref(false);

			return { renameActive, renameValue, renameSave, renameSaving };

			async function renameSave() {
				renameSaving.value = true;

				try {
					await api.patch(`/folders/${props.folder.id}`, {
						name: renameValue.value,
					});
				} catch (error) {
					console.error(error);
				} finally {
					renameSaving.value = false;
					await fetchFolders();
					renameActive.value = false;
				}
			}
		}

		function useMoveFolder() {
			const moveActive = ref(false);
			const moveValue = ref(props.folder.parent_folder);
			const moveSaving = ref(false);

			return { moveActive, moveValue, moveSave, moveSaving };

			async function moveSave() {
				moveSaving.value = true;

				try {
					await api.patch(`/folders/${props.folder.id}`, {
						parent_folder: moveValue.value,
					});
				} catch (error) {
					console.error(error);
				} finally {
					moveSaving.value = false;
					await fetchFolders();
					moveActive.value = false;
				}
			}
		}

		function useDeleteFolder() {
			const deleteActive = ref(false);
			const deleteSaving = ref(false);

			return { deleteActive, deleteSave, deleteSaving };

			async function deleteSave() {
				deleteSaving.value = true;

				try {
					const foldersToUpdate = await api.get('/folders', {
						params: {
							filter: {
								parent_folder: {
									_eq: props.folder.id,
								},
							},
						},
					});

					const filesToUpdate = await api.get('/files', {
						params: {
							filter: {
								folder: {
									_eq: props.folder.id,
								},
							},
						},
					});

					const newParent = props.folder.parent_folder || null;

					const folderKeys = foldersToUpdate.data.data.map((folder: { id: string }) => folder.id);
					const fileKeys = filesToUpdate.data.data.map((file: { id: string }) => file.id);

					if (folderKeys.length > 0) {
						await api.patch(`/folders/${folderKeys.join(',')}`, { parent_folder: newParent });
					}

					if (fileKeys.length > 0) {
						await api.patch(`/files/${fileKeys.join(',')}`, { folder: newParent });
					}

					await api.delete(`/folders/${props.folder.id}`);

					if (newParent) {
						router.push(`/files?folder=${newParent}`);
					} else {
						router.push('/files');
					}

					deleteActive.value = false;
				} catch (error) {
					console.error(error);
				} finally {
					await fetchFolders();
					deleteSaving.value = false;
				}
			}
		}
	},
});
</script>
