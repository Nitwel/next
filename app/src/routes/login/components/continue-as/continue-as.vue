<template>
	<div class="continue-as">
		<v-progress-circular v-if="loading" indeterminate />
		<template v-else>
			<p v-html="$t('continue_as', { name })" />
			<div class="actions">
				<router-link to="/logout" class="sign-out">{{ $t('sign_out') }}</router-link>
				<v-button large @click="hydrateAndLogin">{{ $t('continue') }}</v-button>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from '@vue/composition-api';

import api from '@/api';
import { hydrate } from '@/hydrate';
import router from '@/router';

export default defineComponent({
	setup() {
		const loading = ref(false);
		const error = ref(null);
		const name = ref<string | null>(null);
		const lastPage = ref<string | null>(null);

		fetchUser();

		return { name, lastPage, loading, error, hydrateAndLogin };

		async function fetchUser() {
			loading.value = true;
			error.value = null;

			try {
				const response = await api.get(`/users/me`, {
					params: {
						fields: ['first_name', 'last_name', 'last_page'],
					},
				});

				name.value = response.data.data.first_name + ' ' + response.data.data.last_name;
				lastPage.value = response.data.data.last_page;
			} catch (err) {
				error.value = err;
			} finally {
				loading.value = false;
			}
		}

		async function hydrateAndLogin() {
			await hydrate();
			router.push(lastPage.value || `/collections/`);
		}
	},
});
</script>

<style lang="scss" scoped>
.continue-as {
	p {
		margin-bottom: 32px;
	}

	::v-deep {
		// In the translated string for continue as, there's a B element to emphasize the users name
		b {
			font-weight: 500;
		}
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.sign-out {
		color: var(--foreground-subdued);
		transition: color var(--fast) var(--transition);
		&:hover {
			color: var(--foreground-normal);
		}
	}
}
</style>
