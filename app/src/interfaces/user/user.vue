<template>
	<div class="user">
		<v-menu v-model="menuActive" attached :disabled="disabled">
			<template #activator="{ active }">
				<v-skeleton-loader type="input" v-if="loadingCurrent" />
				<v-input
					:active="active"
					v-else
					:placeholder="$t('select_an_item')"
					:disabled="disabled"
					@click="onPreviewClick"
				>
					<template #input v-if="currentUser">
						<div class="preview">
							<render-template
								collection="directus_users"
								:item="currentUser"
								:template="displayTemplate"
							/>
						</div>
					</template>

					<template #append v-if="!disabled">
						<template v-if="currentUser">
							<v-icon
								name="open_in_new"
								class="edit"
								v-tooltip="$t('edit')"
								@click.stop="editModalActive = true"
							/>
							<v-icon
								name="close"
								class="deselect"
								@click.stop="$emit('input', null)"
								v-tooltip="$t('deselect')"
							/>
						</template>
						<template v-else>
							<v-icon
								class="add"
								name="add"
								v-tooltip="$t('create_item')"
								@click.stop="editModalActive = true"
							/>
							<v-icon class="expand" :class="{ active }" name="expand_more" />
						</template>
					</template>
				</v-input>
			</template>

			<v-list dense>
				<template v-if="usersLoading">
					<v-list-item v-for="n in 10" :key="`loader-${n}`">
						<v-list-item-content>
							<v-skeleton-loader type="text" />
						</v-list-item-content>
					</v-list-item>
				</template>

				<template v-else>
					<v-list-item
						v-for="item in users"
						:key="item.id"
						:active="value === item.id"
						@click="setCurrent(item)"
					>
						<v-list-item-content>
							<render-template collection="directus_users" :template="displayTemplate" :item="item" />
						</v-list-item-content>
					</v-list-item>
				</template>
			</v-list>
		</v-menu>

		<modal-detail
			:active.sync="editModalActive"
			collection="directus_users"
			:primary-key="currentPrimaryKey"
			:edits="edits"
			@input="stageEdits"
			v-if="!disabled"
		/>

		<modal-browse
			:active.sync="selectModalActive"
			collection="directus_users"
			:selection="selection"
			@input="stageSelection"
			v-if="!disabled"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, PropType } from '@vue/composition-api';
import useCollection from '@/composables/use-collection';
import api from '@/api';
import ModalDetail from '@/views/private/components/modal-detail';
import ModalBrowse from '@/views/private/components/modal-browse';

export default defineComponent({
	components: { ModalDetail, ModalBrowse },
	props: {
		value: {
			type: [Number, Object],
			default: null,
		},
		template: {
			type: String,
			default: null,
		},
		selectMode: {
			type: String as PropType<'auto' | 'dropdown' | 'modal'>,
			default: 'auto',
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	setup(props, { emit }) {
		const { usesMenu, menuActive } = useMenu();
		const { info: collectionInfo } = useCollection(ref('directus_users'));
		const { selection, stageSelection, selectModalActive } = useSelection();
		const { displayTemplate, onPreviewClick, requiredFields } = usePreview();
		const { totalCount, loading: usersLoading, fetchUsers, users } = useUsers();

		const { setCurrent, currentUser, loading: loadingCurrent, currentPrimaryKey } = useCurrent();

		const { edits, stageEdits } = useEdits();

		const editModalActive = ref(false);

		return {
			collectionInfo,
			currentUser,
			displayTemplate,
			users,
			usersLoading,
			loadingCurrent,
			menuActive,
			onPreviewClick,
			selection,
			selectModalActive,
			setCurrent,
			totalCount,
			stageSelection,
			useMenu,
			currentPrimaryKey,
			edits,
			stageEdits,
			editModalActive,
		};

		function useCurrent() {
			const currentUser = ref<Record<string, any> | null>(null);
			const loading = ref(false);
			const error = ref(null);

			watch(
				() => props.value,
				(newValue) => {
					// When the newly configured value is a primitive, assume it's the primary key
					// of the item and fetch it from the API to render the preview
					if (newValue !== null && newValue !== currentUser.value?.id && typeof newValue === 'number') {
						fetchCurrent();
					}

					// If the value isn't a primary key, the current value will be set by the editing
					// handlers in useEdit()

					if (newValue === null) {
						currentUser.value = null;
					}
				}
			);

			const currentPrimaryKey = computed<string | number>(() => {
				if (!currentUser.value) return '+';
				if (!props.value) return '+';

				if (typeof props.value === 'number' || typeof props.value === 'string') {
					return props.value;
				}

				if (typeof props.value === 'object' && props.value.hasOwnProperty('id')) {
					return props.value.id;
				}

				return '+';
			});

			return { setCurrent, currentUser, loading, currentPrimaryKey };

			function setCurrent(item: Record<string, any>) {
				currentUser.value = item;
				emit('input', item.id);
			}

			async function fetchCurrent() {
				loading.value = true;

				const fields = requiredFields;

				if (fields.includes('id') === false) {
					fields.push('id');
				}

				try {
					const response = await api.get(`/users/${props.value}`, {
						params: {
							fields: fields,
						},
					});

					currentUser.value = response.data.data;
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}
		}

		function useUsers() {
			const totalCount = ref<number | null>(null);

			const users = ref<Record<string, any>[] | null>(null);
			const loading = ref(false);
			const error = ref(null);

			fetchTotalCount();
			users.value = null;

			return { totalCount, fetchUsers, users, loading };

			async function fetchUsers() {
				if (users.value !== null) return;

				loading.value = true;

				const fields = requiredFields;

				if (fields.includes('id') === false) {
					fields.push('id');
				}

				try {
					const response = await api.get(`/users`, {
						params: {
							fields: fields,
							limit: -1,
						},
					});

					users.value = response.data.data;
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}

			async function fetchTotalCount() {
				const response = await api.get(`/users`, {
					params: {
						limit: 0,
						meta: 'total_count',
					},
				});

				totalCount.value = response.data.meta.total_count;
			}
		}

		function useMenu() {
			const menuActive = ref(false);
			const usesMenu = computed(() => {
				if (props.selectMode === 'modal') return false;
				if (props.selectMode === 'dropdown') return true;

				// auto
				if (totalCount.value && totalCount.value > 100) return false;
				return true;
			});

			return { menuActive, usesMenu };
		}

		function usePreview() {
			const displayTemplate = '{{ first_name }} {{ last_name }}';
			const requiredFields = ['first_name', 'last_name'];

			return { onPreviewClick, displayTemplate, requiredFields };

			function onPreviewClick() {
				if (props.disabled) return;

				if (usesMenu.value === true) {
					const newActive = !menuActive.value;
					menuActive.value = newActive;
					if (newActive === true) fetchUsers();
				} else {
					selectModalActive.value = true;
				}
			}
		}

		function useSelection() {
			const selectModalActive = ref(false);

			const selection = computed<(number | string)[]>(() => {
				if (!props.value) return [];

				if (typeof props.value === 'object' && props.value.hasOwnProperty('id')) {
					return [props.value.id];
				}

				if (typeof props.value === 'string' || typeof props.value === 'number') {
					return [props.value];
				}

				return [];
			});

			return { selection, stageSelection, selectModalActive };

			function stageSelection(newSelection: (number | string)[]) {
				if (newSelection.length === 0) {
					emit('input', null);
				} else {
					emit('input', newSelection[0]);
				}
			}
		}

		function useEdits() {
			const edits = computed(() => {
				// If the current value isn't a primitive, it means we've already staged some changes
				// This ensures we continue on those changes instead of starting over
				if (props.value && typeof props.value === 'object') {
					return props.value;
				}

				return {};
			});

			return { edits, stageEdits };

			function stageEdits(newEdits: Record<string, any>) {
				// Make sure we stage the primary key if it exists. This is needed to have the API
				// update the existing item instead of create a new one
				if (currentPrimaryKey.value && currentPrimaryKey.value !== '+') {
					emit('input', {
						id: currentPrimaryKey.value,
						...newEdits,
					});
				} else {
					if (newEdits.hasOwnProperty('id') && newEdits.id === '+') {
						delete newEdits.id;
					}

					emit('input', newEdits);
				}

				currentUser.value = {
					...currentUser.value,
					...newEdits,
				};
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.many-to-one {
	position: relative;
}

.v-skeleton-loader {
	top: 0;
	left: 0;
}

.preview {
	display: block;
	flex-grow: 1;
}

.expand {
	transition: transform var(--fast) var(--transition);

	&.active {
		transform: scaleY(-1);
	}
}

.edit {
	margin-right: 4px;

	&:hover {
		--v-icon-color: var(--foreground-normal);
	}
}

.add:hover {
	--v-icon-color: var(--primary);
}

.deselect:hover {
	--v-icon-color: var(--danger);
}
</style>
