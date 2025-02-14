<template>
	<div class="file">
		<v-menu attached :disabled="disabled || loading">
			<template #activator="{ toggle }">
				<div>
					<v-skeleton-loader type="input" v-if="loading" />
					<v-input
						v-else
						@click="toggle"
						readonly
						:placeholder="$t('no_file_selected')"
						:disabled="disabled"
						:value="file && file.title"
					>
						<template #prepend>
							<div
								class="preview"
								:class="{
									'has-file': file,
									'is-svg': file && file.type.includes('svg'),
								}"
							>
								<img v-if="imageThumbnail" :src="imageThumbnail" :alt="file.title" />
								<span class="extension" v-else-if="fileExtension">
									{{ fileExtension }}
								</span>
								<v-icon v-else name="folder_open" />
							</div>
						</template>
						<template #append>
							<v-icon class="deselect" name="close" v-if="file" @click.stop="$emit('input', null)" />
							<v-icon v-else name="attach_file" />
						</template>
					</v-input>
				</div>
			</template>

			<v-list dense>
				<template v-if="file">
					<v-list-item :download="file.filename_download" :href="assetURL">
						<v-list-item-icon><v-icon name="file_download" /></v-list-item-icon>
						<v-list-item-content>{{ $t('download_file') }}</v-list-item-content>
					</v-list-item>

					<v-divider />
				</template>
				<v-list-item @click="activeDialog = 'upload'">
					<v-list-item-icon><v-icon name="phonelink" /></v-list-item-icon>
					<v-list-item-content>
						{{ $t(file ? 'replace_from_device' : 'upload_from_device') }}
					</v-list-item-content>
				</v-list-item>

				<v-list-item @click="activeDialog = 'choose'">
					<v-list-item-icon><v-icon name="folder_open" /></v-list-item-icon>
					<v-list-item-content>
						{{ $t(file ? 'replace_from_library' : 'choose_from_library') }}
					</v-list-item-content>
				</v-list-item>

				<v-list-item @click="activeDialog = 'url'">
					<v-list-item-icon><v-icon name="link" /></v-list-item-icon>
					<v-list-item-content>
						{{ $t(file ? 'replace_from_url' : 'import_from_url') }}
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>

		<v-dialog :active="activeDialog === 'upload'" @toggle="activeDialog = null">
			<v-card>
				<v-card-title>{{ $t('upload_from_device') }}</v-card-title>
				<v-card-text>
					<v-upload @upload="onUpload" />
				</v-card-text>
				<v-card-actions>
					<v-button @click="activeDialog = null" secondary>{{ $t('cancel') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<modal-browse
			collection="directus_files"
			:active="activeDialog === 'choose'"
			@update:active="activeDialog = null"
			@input="setSelection"
		/>

		<v-dialog :active="activeDialog === 'url'" @toggle="activeDialog = null" :persistent="urlLoading">
			<v-card>
				<v-card-title>{{ $t('import_from_url') }}</v-card-title>
				<v-card-text>
					<v-input :placeholder="$t('url')" v-model="url" :disabled="urlLoading" />
				</v-card-text>
				<v-card-actions>
					<v-button :disabled="urlLoading" @click="activeDialog = null" secondary>
						{{ $t('cancel') }}
					</v-button>
					<v-button :loading="urlLoading" @click="importFromURL" :disabled="isValidURL === false">
						{{ $t('import') }}
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from '@vue/composition-api';
import ModalBrowse from '@/views/private/components/modal-browse';
import api from '@/api';
import readableMimeType from '@/utils/readable-mime-type';
import getRootPath from '@/utils/get-root-path';

type FileInfo = {
	id: number;
	title: string;
	type: string;
};

export default defineComponent({
	components: { ModalBrowse },
	props: {
		value: {
			type: String,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	setup(props, { emit }) {
		const activeDialog = ref<'upload' | 'choose' | 'url' | null>(null);
		const { loading, error, file, fetchFile } = useFile();

		watch(() => props.value, fetchFile, { immediate: true });

		const fileExtension = computed(() => {
			if (file.value === null) return null;
			return readableMimeType(file.value.type, true);
		});

		const assetURL = computed(() => getRootPath() + `assets/${props.value}`);

		const imageThumbnail = computed(() => {
			if (file.value === null || props.value === null) return null;
			if (file.value.type.includes('svg')) return assetURL.value;
			if (file.value.type.includes('image') === false) return null;
			return assetURL.value + `?key=system-small-cover`;
		});

		const { url, isValidURL, loading: urlLoading, error: urlError, importFromURL } = useURLImport();

		return {
			activeDialog,
			setSelection,
			loading,
			error,
			file,
			fileExtension,
			imageThumbnail,
			onUpload,
			url,
			urlLoading,
			urlError,
			importFromURL,
			isValidURL,
			assetURL,
		};

		function useFile() {
			const loading = ref(false);
			const error = ref(null);
			const file = ref<FileInfo | null>(null);

			return { loading, error, file, fetchFile };

			async function fetchFile() {
				if (props.value === null) {
					file.value = null;
					loading.value = false;
					error.value = null;
					return;
				}

				loading.value = true;

				try {
					const response = await api.get(`/files/${props.value}`, {
						params: {
							fields: ['title', 'type', 'filename_download'],
						},
					});

					file.value = response.data.data;
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}
		}

		function setSelection(selection: number[]) {
			if (selection[0]) {
				emit('input', selection[0]);
			} else {
				emit('input', null);
			}
		}

		function onUpload(fileInfo: FileInfo) {
			file.value = fileInfo;
			activeDialog.value = null;
			emit('input', fileInfo.id);
		}

		function useURLImport() {
			const url = ref('');
			const loading = ref(false);
			const error = ref(null);

			const isValidURL = computed(() => {
				try {
					new URL(url.value);
					return true;
				} catch {
					return false;
				}
			});

			return { url, loading, error, isValidURL, importFromURL };

			async function importFromURL() {
				loading.value = true;

				/**
				 * @TODO add /files/import endpoint to API + use it here
				 */

				try {
					const response = await api.post(`/files`, {
						data: url.value,
					});

					file.value = response.data.data;

					activeDialog.value = null;
					url.value = '';
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.preview {
	--v-icon-color: var(--foreground-subdued);

	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	margin-left: -8px;
	overflow: hidden;
	background-color: var(--background-normal);
	border-radius: var(--border-radius);

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&.has-file {
		background-color: var(--primary-alt);
	}

	&.is-svg {
		padding: 4px;
		background-color: var(--background-normal);

		img {
			object-fit: contain;
		}
	}
}

.extension {
	color: var(--primary);
	font-weight: 600;
	font-size: 11px;
	text-transform: uppercase;
}

.deselect:hover {
	--v-icon-color: var(--danger);
}
</style>
