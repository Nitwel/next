<template>
	<form @submit.prevent="onSubmit">
		<v-input autofocus autocomplete="username" type="email" v-model="email" :placeholder="$t('email')" />
		<v-input type="password" autocomplete="current-password" v-model="password" :placeholder="$t('password')" />

		<transition-expand>
			<v-input type="text" :placeholder="$t('otp')" v-if="requiresTFA" v-model="otp" />
		</transition-expand>

		<v-notice type="warning" v-if="error">
			{{ errorFormatted }}
		</v-notice>
		<div class="buttons">
			<v-button type="submit" :loading="loggingIn" large>{{ $t('sign_in') }}</v-button>
			<router-link to="/reset-password" class="forgot-password">
				{{ $t('forgot_password') }}
			</router-link>
		</div>

		<!-- <template v-if="ssoProviders">
			<v-divider class="sso-divider" />

			<v-button
				secondary
				class="sso-button"
				rounded
				icon
				v-for="provider in ssoProviders"
				:key="provider.name"
				:href="provider.link"
			>
				<img :src="provider.icon" :alt="provider.name" />
			</v-button>

			<v-notice class="sso-notice" type="danger" v-if="ssoError">
				{{ translateAPIError(ssoError) }}
			</v-notice>
		</template> -->
	</form>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import router from '@/router';
//
import { login } from '@/auth';
import { RequestError } from '@/api';
import { translateAPIError } from '@/lang';
import { useUserStore } from '@/stores';

type Credentials = {
	email: string;
	password: string;
	otp?: string;
};

export default defineComponent({
	props: {
		ssoError: {
			type: String,
			default: null,
		},
	},
	setup() {
		const loggingIn = ref(false);
		const email = ref<string | null>(null);
		const password = ref<string | null>(null);
		const error = ref<RequestError | null>(null);
		const otp = ref<string | null>(null);
		const requiresTFA = ref(false);
		const userStore = useUserStore();

		watch(email, () => {
			if (requiresTFA.value === true) requiresTFA.value = false;
		});

		const errorFormatted = computed(() => {
			if (error.value) {
				return translateAPIError(error.value);
			}
			return null;
		});

		/** @todo fetch these from /auth/sso */
		// const ssoProviders = computed(() => {
		// 	const redirectURL = getRootPath() + `admin/login`;
		// 	return projectsStore.currentProject.value.sso.map((provider: { icon: string; name: string }) => {
		// 		return {
		// 			...provider,
		// 			link: `/auth/sso/${provider.name}?mode=cookie&redirect_url=${redirectURL}`,
		// 		};
		// 	});
		// });

		return {
			// ssoProviders,
			errorFormatted,
			error,
			email,
			password,
			onSubmit,
			loggingIn,
			translateAPIError,
			otp,
			requiresTFA,
		};

		async function onSubmit() {
			if (email.value === null || password.value === null) return;

			try {
				loggingIn.value = true;

				const credentials: Credentials = {
					email: email.value,
					password: password.value,
				};

				if (otp.value) {
					credentials.otp = otp.value;
				}

				await login(credentials);

				// Stores are hydrated after login
				const lastPage = userStore.state.currentUser?.last_page;
				router.push(lastPage || '/collections');
			} catch (err) {
				/** @todo use new error code */
				if (err.response?.data?.error?.code === 111) {
					requiresTFA.value = true;
				} else {
					error.value = err;
				}
			} finally {
				loggingIn.value = false;
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.v-input,
.v-notice {
	margin-bottom: 20px;
}

.buttons {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.forgot-password {
	color: var(--foreground-subdued);
	transition: color var(--fast) var(--transition);
	&:hover {
		color: var(--foreground-normal);
	}
}

.sso-divider {
	margin: 24px 0;
}

.sso-button {
	img {
		width: 24px;
		height: auto;
	}
}

.sso-notice {
	margin-top: 24px;
}
</style>
