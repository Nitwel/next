<template>
	<v-modal v-model="_active" :title="title" persistent form-width>
		<v-form
			:loading="loading"
			:initial-values="item"
			:collection="collection"
			:primary-key="primaryKey"
			v-model="_edits"
		/>

		<template v-if="junctionField">
			<v-divider large>{{ junctionFieldInfo.name }}</v-divider>
			<v-form
				:loading="loading"
				:initial-values="item && item[junctionField]"
				:collection="junctionRelatedCollection"
				:primary-key="relatedPrimaryKey"
				:edits="_edits[junctionField]"
				@input="setJunctionEdits"
			/>
		</template>

		<template #footer>
			<v-button @click="cancel" secondary>{{ $t('cancel') }}</v-button>
			<v-button @click="save">{{ $t('save') }}</v-button>
		</template>
	</v-modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, watch, toRefs } from '@vue/composition-api';
import api from '@/api';

import useCollection from '@/composables/use-collection';
import { useFieldsStore, useRelationsStore } from '@/stores';
import i18n from '@/lang';
import { Relation } from '@/types';

export default defineComponent({
	model: {
		prop: 'edits',
	},
	props: {
		active: {
			type: Boolean,
			default: false,
		},
		collection: {
			type: String,
			required: true,
		},
		primaryKey: {
			type: [String, Number],
			required: true,
		},
		edits: {
			type: Object as PropType<Record<string, any>>,
			default: undefined,
		},
		junctionField: {
			type: String,
			default: null,
		},
		// There's an interesting case where the main form can be a newly created item ('+'), while
		// it has a pre-selected related item it needs to alter. In that case, we have to fetch the
		// related data anyway.
		relatedPrimaryKey: {
			type: [String, Number],
			default: '+',
		},
	},
	setup(props, { emit }) {
		const fieldsStore = useFieldsStore();
		const relationsStore = useRelationsStore();

		const { _active } = useActiveState();
		const { junctionFieldInfo, junctionRelatedCollection, setJunctionEdits } = useJunction();
		const { _edits, loading, error, item } = useItem();
		const { save, cancel } = useActions();

		const { collection } = toRefs(props);

		const { info: collectionInfo } = useCollection(collection);

		const title = computed(() => {
			if (props.primaryKey === '+') {
				return i18n.t('adding_in', { collection: collectionInfo.value?.name });
			}

			return i18n.t('editing_in', { collection: collectionInfo.value?.name });
		});

		return {
			_active,
			_edits,
			loading,
			error,
			item,
			save,
			cancel,
			title,
			junctionFieldInfo,
			junctionRelatedCollection,
			setJunctionEdits,
		};

		function useActiveState() {
			const localActive = ref(false);

			const _active = computed({
				get() {
					return props.active === undefined ? localActive.value : props.active;
				},
				set(newActive: boolean) {
					localActive.value = newActive;
					emit('update:active', newActive);
				},
			});

			return { _active };
		}

		function useItem() {
			const localEdits = ref<Record<string, any>>({});

			const _edits = computed<Record<string, any>>({
				get() {
					if (props.edits !== undefined) {
						return {
							...props.edits,
							...localEdits.value,
						};
					}

					return localEdits.value;
				},
				set(newEdits) {
					localEdits.value = newEdits;
				},
			});

			const loading = ref(false);
			const error = ref(null);
			const item = ref<Record<string, any> | null>(null);

			watch(
				() => props.active,
				(isActive) => {
					if (isActive === true) {
						if (props.primaryKey !== '+') fetchItem();
						if (props.relatedPrimaryKey !== '+') fetchRelatedItem();
					} else {
						loading.value = false;
						error.value = null;
						item.value = null;
						localEdits.value = {};
					}
				}
			);

			return { _edits, loading, error, item, fetchItem };

			async function fetchItem() {
				loading.value = true;

				const endpoint = props.collection.startsWith('directus_')
					? `/${props.collection.substring(9)}/${props.primaryKey}`
					: `/items/${props.collection}/${props.primaryKey}`;

				let fields = '*';

				if (props.junctionField) {
					fields = `*,${props.junctionField}.*`;
				}

				try {
					const response = await api.get(endpoint, { params: { fields } });

					item.value = response.data.data;
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}

			async function fetchRelatedItem() {
				loading.value = true;

				const collection = junctionRelatedCollection.value;

				const endpoint = collection.startsWith('directus_')
					? `/${collection.substring(9)}/${props.relatedPrimaryKey}`
					: `/items/${collection}/${props.relatedPrimaryKey}`;

				try {
					const response = await api.get(endpoint);

					item.value = {
						...(item.value || {}),
						[junctionFieldInfo.value.field]: response.data.data,
					};
				} catch (err) {
					error.value = err;
				} finally {
					loading.value = false;
				}
			}
		}

		function useJunction() {
			const junctionFieldInfo = computed(() => {
				if (!props.junctionField) return null;

				return fieldsStore.getField(props.collection, props.junctionField);
			});

			const junctionRelatedCollection = computed(() => {
				if (!props.junctionField) return null;

				// If this is a m2m (likely), there will be 2 relations associated with this field
				const relations = relationsStore.getRelationsForField(props.collection, props.junctionField);
				return (
					relations.find((relation: Relation) => {
						return (
							relation.many_collection === props.collection && relation.many_field === props.junctionField
						);
					})?.one_collection || null
				);
			});

			return { junctionFieldInfo, junctionRelatedCollection, setJunctionEdits };

			function setJunctionEdits(edits: any) {
				if (!props.junctionField) return;

				_edits.value = {
					..._edits.value,
					[props.junctionField]: edits,
				};
			}
		}

		function useActions() {
			return { save, cancel };

			function save() {
				emit('input', _edits.value);
				_active.value = false;
				_edits.value = {};
			}

			function cancel() {
				_active.value = false;
				_edits.value = {};
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.v-divider {
	margin: 52px 0;
}
</style>
