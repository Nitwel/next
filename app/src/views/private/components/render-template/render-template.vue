<template>
	<div class="render-template">
		<template v-for="(part, index) in parts">
			<value-null :key="index" v-if="part === null || part.value === null" />
			<component
				v-else-if="typeof part === 'object'"
				:is="`display-${part.component}`"
				:key="index"
				:value="part.value"
				:interface="part.interface"
				:interface-options="part.interfaceOptions"
				:type="part.type"
				v-bind="part.options"
			/>
			<span :key="index" v-else>{{ part }}</span>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from '@vue/composition-api';
import { useFieldsStore } from '@/stores';
import { get } from 'lodash';
import { Field } from '@/types';
import displays from '@/displays';
import ValueNull from '@/views/private/components/value-null';

export default defineComponent({
	components: { ValueNull },
	props: {
		collection: {
			type: String,
			required: true,
		},
		item: {
			type: Object as PropType<Record<string, any>>,
			required: true,
		},
		template: {
			type: String,
			required: true,
		},
	},
	setup(props) {
		const fieldsStore = useFieldsStore();

		const regex = /({{.*?}})/g;

		const parts = computed(() =>
			props.template
				.split(regex)
				.map((part) => {
					if (part.startsWith('{{') === false) return part;

					const fieldKey = part.replace(/{{/g, '').replace(/}}/g, '').trim();
					const field: Field | null = fieldsStore.getField(props.collection, fieldKey);

					// Instead of crashing when the field doesn't exist, we'll render a couple question
					// marks to indicate it's absence
					if (!field) return '???';

					// Try getting the value from the item, return some question marks if it doesn't exist
					const value = get(props.item, fieldKey);
					if (value === undefined) return '???';

					// If no display is configured, we can render the raw value
					if (field.meta?.display === null) return value;

					const displayInfo = displays.find((display) => display.id === field.meta?.display);

					// If used display doesn't exist in the current project, return raw value
					if (!displayInfo) return value;

					// If the display handler is a function, we parse the value and return the result
					if (typeof displayInfo.handler === 'function') {
						const handler = displayInfo.handler as Function;
						return handler(value, field.meta?.display_options);
					}

					return {
						component: field.meta?.display,
						options: field.meta?.display_options,
						value: value,
						interface: field.meta?.interface,
						interfaceOptions: field.meta?.options,
						type: field.meta?.special /** @todo check what this is used for */,
					};
				})
				.map((p) => p)
				.filter((p) => p)
		);

		return { parts };
	},
});
</script>

<style lang="scss" scoped>
@import '@/styles/mixins/no-wrap';

.render-template {
	position: relative;
	max-width: 100%;
	height: 100%;
	padding-right: 8px;

	& > * {
		vertical-align: middle;
	}

	&::after {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 8px;
		background: linear-gradient(
			90deg,
			rgba(var(--background-page-rgb), 0) 0%,
			rgba(var(--background-page-rgb), 1) 100%
		);
		content: '';
		pointer-events: none;
	}

	@include no-wrap;
}

.subdued {
	color: var(--foreground-subdued);
}
</style>
