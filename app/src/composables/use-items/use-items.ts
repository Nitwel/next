import { computed, ref, Ref, watch } from '@vue/composition-api';
import api from '@/api';
import useCollection from '@/composables/use-collection';
import Vue from 'vue';
import { isEqual } from 'lodash';
import { Filter } from '@/types/';
import filtersToQuery from '@/utils/filters-to-query';
import { orderBy } from 'lodash';
import moveInArray from '@/utils/move-in-array';

type Query = {
	limit: Ref<number>;
	fields: Ref<readonly string[]>;
	sort: Ref<string>;
	page: Ref<number>;
	filters: Ref<readonly Filter[]>;
	searchQuery: Ref<string | null>;
};

export function useItems(collection: Ref<string>, query: Query) {
	const { primaryKeyField, sortField } = useCollection(collection);

	const { limit, fields, sort, page, filters, searchQuery } = query;

	const endpoint = computed(() => {
		return collection.value.startsWith('directus_')
			? `/${collection.value.substring(9)}`
			: `/items/${collection.value}`;
	});

	const items = ref<any>([]);
	const loading = ref(false);
	const error = ref(null);

	const itemCount = ref<number | null>(null);
	const totalCount = ref<number | null>(null);

	const totalPages = computed(() => {
		if (itemCount.value === null) return 1;
		if (itemCount.value < limit.value) return 1;
		return Math.ceil(itemCount.value / limit.value);
	});

	getItems();

	watch(
		collection,
		async (after, before) => {
			if (!before || isEqual(after, before)) {
				return;
			}

			// Waiting for the tick here makes sure the query have been adjusted for the new
			// collection
			await Vue.nextTick();
			reset();
			getItems();
		},
		{ immediate: true }
	);

	watch([page, fields], async (after, before) => {
		if (!before || isEqual(after, before)) {
			return;
		}

		await Vue.nextTick();
		if (loading.value === false) {
			getItems();
		}
	});

	watch(sort, async (after, before) => {
		if (!before || isEqual(after, before)) {
			return;
		}

		// When all items are on page, we only sort locally
		const hasAllItems = limit.value > (itemCount.value || 0);

		if (hasAllItems) {
			sortItems(after);
			return;
		}

		await Vue.nextTick();
		if (loading.value === false) {
			getItems();
		}
	});

	watch([filters, limit, searchQuery], async (after, before) => {
		if (!before || isEqual(after, before)) {
			return;
		}

		await Vue.nextTick();
		if (loading.value === false) {
			getItems();
		}
	});

	return { itemCount, totalCount, items, totalPages, loading, error, changeManualSort, getItems };

	async function getItems() {
		error.value = null;

		const loadingTimeout = setTimeout(() => {
			loading.value = true;
		}, 250);

		let fieldsToFetch = [...fields.value];

		// Make sure the primary key is always fetched
		if (
			fields.value !== ['*'] &&
			primaryKeyField.value &&
			fieldsToFetch.includes(primaryKeyField.value.field) === false
		) {
			fieldsToFetch.push(primaryKeyField.value.field);
		}

		// Make sure all fields that are used to filter are fetched
		if (fields.value !== ['*']) {
			filters.value.forEach((filter) => {
				if (fieldsToFetch.includes(filter.field) === false) {
					fieldsToFetch.push(filter.field);
				}
			});
		}

		// Make sure that the field we're sorting on is fetched
		if (fields.value !== ['*'] && sortField.value && sort.value) {
			const sortFieldKey = sort.value.startsWith('-') ? sort.value.substring(1) : sort.value;
			if (fieldsToFetch.includes(sortFieldKey) === false) {
				fieldsToFetch.push(sortFieldKey);
			}
		}

		// Filter out fake internal columns. This is (among other things) for a fake $file m2o field
		// on directus_files
		fieldsToFetch = fieldsToFetch.filter((field) => field.startsWith('$') === false);

		try {
			const response = await api.get(endpoint.value, {
				params: {
					limit: limit.value,
					fields: fieldsToFetch,
					sort: sort.value,
					page: page.value,
					search: searchQuery.value,
					...filtersToQuery(filters.value),
				},
			});

			let fetchedItems = response.data.data;

			/**
			 * @NOTE
			 *
			 * This is used in conjunction with the fake field in /src/stores/fields/fields.ts to be
			 * able to render out the directus_files collection (file library) using regular layouts
			 *
			 * Layouts expect the file to be a m2o of a `file` type, however, directus_files is the
			 * only collection that doesn't have this (obviously). This fake $file field is used to
			 * pretend there is a file m2o, so we can use the regular layout logic for files as well
			 */
			if (collection.value === 'directus_files') {
				fetchedItems = fetchedItems.map((file: any) => ({
					...file,
					$file: file,
				}));
			}

			items.value = fetchedItems;
			itemCount.value = response.data.data.length;

			if (response.data.data.length === limit.value) {
				getItemCount();
			}
		} catch (err) {
			error.value = err;
		} finally {
			clearTimeout(loadingTimeout);
			loading.value = false;
		}
	}

	async function getItemCount() {
		if (!primaryKeyField.value) return;

		const response = await api.get(endpoint.value, {
			params: {
				limit: 0,
				fields: primaryKeyField.value.field,
				meta: 'filter_count,total_count',
				search: searchQuery.value,
				...filtersToQuery(filters.value),
			},
		});

		totalCount.value = response.data.meta.total_count;
		itemCount.value = response.data.meta.filter_count;
	}

	function reset() {
		items.value = [];
		totalCount.value = null;
		itemCount.value = null;
	}

	function sortItems(sortBy: string) {
		const field = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
		const descending = sortBy.startsWith('-');
		items.value = orderBy(items.value, [field], [descending ? 'desc' : 'asc']);
	}

	type ManualSortData = {
		item: Record<string, any>;
		oldIndex: number;
		newIndex: number;
	};

	async function changeManualSort({ item, oldIndex, newIndex }: ManualSortData) {
		const pk = primaryKeyField.value?.field;
		if (!pk) return;

		const move = newIndex > oldIndex ? 'down' : 'up';
		const selectionRange = move === 'down' ? [oldIndex + 1, newIndex + 1] : [newIndex, oldIndex];

		const updates = items.value.slice(...selectionRange).map((toBeUpdatedItem: any) => {
			const sortValue = getPositionForItem(toBeUpdatedItem);

			return {
				[pk]: toBeUpdatedItem[pk],
				sort: move === 'down' ? sortValue - 1 : sortValue + 1,
			};
		});

		const sortOfItemOnNewIndex = newIndex + 1 + limit.value * (page.value - 1);

		updates.push({
			[pk]: item[pk],
			sort: sortOfItemOnNewIndex,
		});

		// Reflect changes in local items array
		items.value = moveInArray(items.value, oldIndex, newIndex);

		// Save updates to items
		await api.patch(endpoint.value, updates);
	}

	// Used as default value for the sort position. This is the index of the given item in the array
	// of items, offset by the page count and current page

	function getPositionForItem(item: any) {
		const pk = primaryKeyField.value?.field;
		if (!pk) return;

		const index = items.value.findIndex((existingItem: any) => existingItem[pk] === item[pk]);

		return index + 1 + limit.value * (page.value - 1);
	}
}
