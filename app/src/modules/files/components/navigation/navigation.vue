<template>
	<v-list nav>
		<template v-if="loading && (nestedFolders === null || nestedFolders.length === 0)">
			<v-list-item v-for="n in 4" :key="n">
				<v-skeleton-loader type="list-item-icon" />
			</v-list-item>
		</template>

		<div class="folders">
			<v-item-group scope="files-navigation" multiple v-model="openFolders">
				<v-list-group to="/files" value="root" scope="files-navigation" exact disable-groupable-parent>
					<template #activator>
						<v-list-item-icon>
							<v-icon name="folder" />
						</v-list-item-icon>
						<v-list-item-content>{{ $t('file_library') }}</v-list-item-content>
					</template>

					<navigation-folder
						v-for="folder in nestedFolders"
						:key="folder.id"
						:folder="folder"
						:current-folder="currentFolder"
					/>
				</v-list-group>
			</v-item-group>
		</div>

		<v-divider />

		<v-list-item to="/files/all" exact>
			<v-list-item-icon><v-icon name="folder_special" /></v-list-item-icon>
			<v-list-item-content>{{ $t('all_files') }}</v-list-item-content>
		</v-list-item>

		<v-list-item to="/files/mine" exact>
			<v-list-item-icon><v-icon name="folder_special" /></v-list-item-icon>
			<v-list-item-content>{{ $t('my_files') }}</v-list-item-content>
		</v-list-item>

		<v-list-item to="/files/recent" exact>
			<v-list-item-icon><v-icon name="folder_special" /></v-list-item-icon>
			<v-list-item-content>{{ $t('recent_files') }}</v-list-item-content>
		</v-list-item>
	</v-list>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import useFolders from '../../composables/use-folders';
import NavigationFolder from './navigation-folder.vue';
import arraysAreEqual from '@/utils/arrays-are-equal';

export default defineComponent({
	components: { NavigationFolder },
	model: {
		prop: 'currentFolder',
		event: 'filter',
	},
	props: {
		currentFolder: {
			type: String,
			default: null,
		},
	},
	setup(props) {
		const { nestedFolders, folders, error, loading, openFolders } = useFolders();

		setOpenFolders();

		watch(() => props.currentFolder, setOpenFolders);

		return { folders, nestedFolders, error, loading, openFolders };

		function setOpenFolders() {
			if (!folders.value) return [];
			if (!openFolders?.value) return [];

			const shouldBeOpen: string[] = [];
			const folder = folders.value.find((folder) => folder.id === props.currentFolder);

			if (folder && folder.parent_folder) parseFolder(folder.parent_folder);

			const newOpenFolders = [...openFolders.value];

			for (const folderID of shouldBeOpen) {
				if (newOpenFolders.includes(folderID) === false) {
					newOpenFolders.push(folderID);
				}
			}

			if (newOpenFolders.length !== 1 && arraysAreEqual(newOpenFolders, openFolders.value) === false) {
				openFolders.value = newOpenFolders;
			}

			function parseFolder(id: string) {
				if (!folders.value) return;
				shouldBeOpen.push(id);

				const folder = folders.value.find((folder) => folder.id === id);

				if (folder && folder.parent_folder) {
					parseFolder(folder.parent_folder);
				}
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.v-skeleton-loader {
	--v-skeleton-loader-background-color: var(--background-normal-alt);
}

.folders {
	width: 100%;
	overflow-x: hidden;

	::v-deep .v-list-item-content {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}
</style>
