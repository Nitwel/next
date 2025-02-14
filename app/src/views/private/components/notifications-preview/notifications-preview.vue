<template>
	<div class="notifications-preview">
		<transition-expand tag="div">
			<div v-if="active" class="inline">
				<div class="padding-box">
					<router-link class="link" :to="activityLink" :class="{ 'has-items': lastFour.length > 0 }">
						{{ $t('show_all_activity') }}
					</router-link>
					<transition-group tag="div" name="notification" class="transition">
						<notification-item
							v-for="notification in lastFour"
							:key="notification.id"
							v-bind="notification"
						/>
					</transition-group>
				</div>
			</div>
		</transition-expand>

		<drawer-button
			:active="active"
			@click="active = !active"
			v-tooltip.left="$t('notifications')"
			class="toggle"
			icon="notifications"
		>
			{{ $t('notifications') }}
		</drawer-button>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import DrawerButton from '../drawer-button';
import NotificationItem from '../notification-item';
import { useNotificationsStore } from '@/stores/';

export default defineComponent({
	components: { DrawerButton, NotificationItem },
	props: {
		drawerOpen: {
			type: Boolean,
			default: false,
		},
	},
	setup(props) {
		const notificationsStore = useNotificationsStore();

		const activityLink = computed(() => `/activity`);
		const active = ref(false);

		watch(
			() => props.drawerOpen,
			(open: boolean) => {
				if (open === false) {
					active.value = false;
				}
			}
		);

		return { lastFour: notificationsStore.lastFour, activityLink, active };
	},
});
</script>

<style lang="scss" scoped>
.notifications-preview {
	position: relative;
}

.link {
	display: block;
	color: var(--foreground-subdued);
	text-align: center;
	text-decoration: none;

	&:hover {
		color: var(--foreground-normal);
	}

	&.has-items {
		margin-bottom: 12px;
	}
}

.transition {
	position: relative;
	width: 100%;
}

.drawer-button {
	background-color: var(--background-normal-alt);
}

.inline {
	position: absolute;
	right: 0;
	bottom: 100%;
	width: 100%;
	background-color: var(--background-normal);
	box-shadow: 0px -4px 12px rgba(38, 50, 56, 0.1);

	.padding-box {
		position: relative;
		width: 100%;
		padding: 12px;
	}
}

.notification-enter-active,
.notification-leave-active {
	transition: all var(--slow) var(--transition);
}

.notification-leave-active {
	position: absolute;
}

.notification-move {
	transition: all 500ms var(--transition);
}

.notification-enter,
.notification-leave-to {
	opacity: 0;
}
</style>
