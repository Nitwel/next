import { createStore } from 'pinia';
import { Relation } from '@/types';
import api from '@/api';
import { useFieldsStore } from '@/stores/';

export const useRelationsStore = createStore({
	id: 'relationsStore',
	state: () => ({
		relations: [] as Relation[],
	}),
	actions: {
		async hydrate() {
			const response = await api.get(`/relations`);

			this.state.relations = response.data.data;
		},
		async dehydrate() {
			this.reset();
		},
		getRelationsForCollection(collection: string) {
			return this.state.relations.filter((relation) => {
				return relation.many_collection === collection || relation.one_collection === collection;
			});
		},
		getRelationsForField(collection: string, field: string) {
			const fieldsStore = useFieldsStore();
			const fieldInfo = fieldsStore.getField(collection, field);

			if (!fieldInfo) return [];

			if (fieldInfo.type === 'file') {
				return [
					{
						many_collection: collection,
						many_field: field,
						one_collection: 'directus_files',
						one_field: null,
						junction_field: null,
					},
				] as Relation[];
			}

			if (['user', 'user_created', 'user_updated', 'owner'].includes(fieldInfo.type)) {
				return [
					{
						many_collection: collection,
						many_field: field,
						one_collection: 'directus_users',
						one_field: null,
						junction_field: null,
					},
				] as Relation[];
			}

			const relations = this.getRelationsForCollection(collection).filter((relation: Relation) => {
				return relation.many_field === field || relation.one_field === field;
			});

			if (relations.length > 0) {
				const isM2M = relations[0].junction_field !== null;

				// If the relation matching the field has a junction field, it's a m2m. In that case,
				// we also want to return the secondary relationship (from the jt to the related)
				// so any ui elements (interfaces) can utilize the full relationship
				if (isM2M) {
					const secondaryRelation = this.state.relations.find((relation) => {
						return (
							relation.many_collection === relations[0].many_collection &&
							relation.many_field === relations[0].junction_field
						);
					});

					if (secondaryRelation) relations.push(secondaryRelation);
				}
			}

			return relations;
		},
	},
});
