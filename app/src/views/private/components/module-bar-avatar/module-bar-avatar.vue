<template>
	<v-hover class="module-bar-avatar" v-slot="{ hover }">
		<v-dialog v-model="signOutActive">
			<template #activator="{ on }">
				<v-button
					@click="on"
					tile
					icon
					x-large
					:class="{ show: hover }"
					class="sign-out"
					v-tooltip.right="$t('sign_out')"
				>
					<v-icon name="logout" />
				</v-button>
			</template>

			<v-card>
				<v-card-title>{{ $t('sign_out_confirm') }}</v-card-title>
				<v-card-actions>
					<v-button secondary @click="signOutActive = !signOutActive">
						{{ $t('cancel') }}
					</v-button>
					<v-button :to="signOutLink">{{ $t('sign_out') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<router-link :to="userProfileLink">
			<v-avatar tile large v-tooltip.right="userFullName">
				<img v-if="avatarURL" :src="avatarURL" :alt="userFullName" class="avatar-image" />
				<v-icon v-else name="account_circle" />
			</v-avatar>
		</router-link>
	</v-hover>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { useUserStore } from '@/stores/';
import getRootPath from '../../../../utils/get-root-path';

export default defineComponent({
	setup() {
		const userStore = useUserStore();

		const signOutActive = ref(false);

		const avatarURL = computed<string | null>(() => {
			if (userStore.state.currentUser === null) return null;
			if (userStore.state.currentUser.avatar === null) return null;

			return getRootPath() + `assets/${userStore.state.currentUser.avatar.id}?key=system-medium-cover`;
		});

		const userProfileLink = computed<string>(() => {
			const id = userStore.state.currentUser?.id;
			const role = userStore.state.currentUser?.role?.id;

			return `/users/${role}/${id}`;
		});

		const signOutLink = computed<string>(() => {
			return `/logout`;
		});

		const userFullName = userStore.fullName;

		return { userFullName, avatarURL, userProfileLink, signOutActive, signOutLink };
	},
});
</script>

<style lang="scss" scoped>
.module-bar-avatar {
	position: relative;

	.v-avatar {
		--v-avatar-color: var(--module-background-alt);
		.avatar-image {
			opacity: 0.75;
			transition: opacity var(--fast) var(--transition);
		}
	}
}

.sign-out {
	--v-button-background-color: var(--module-background-alt);
	--v-button-background-color-hover: var(--warning);

	position: absolute;
	top: 0;
	left: 0;
	transition: transform var(--fast) var(--transition);

	&.show {
		transform: translateY(-100%);
	}

	.v-icon {
		--v-icon-color: var(--white);
	}
}

.v-avatar:hover {
	.avatar-image {
		opacity: 1;
	}

	.v-icon {
		--v-icon-color: var(--white);
	}
}
</style>
