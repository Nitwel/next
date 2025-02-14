import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useRequestsStore } from '@/stores/';
import { LogoutReason, logout, refresh } from '@/auth';
import getRootPath from '@/utils/get-root-path';

const api = axios.create({
	baseURL: getRootPath(),
	withCredentials: true,
});

interface RequestConfig extends AxiosRequestConfig {
	id: string;
}

interface Response extends AxiosResponse {
	config: RequestConfig;
}

export interface RequestError extends AxiosError {
	response: Response;
}

export const onRequest = (config: AxiosRequestConfig) => {
	const requestsStore = useRequestsStore();
	const id = requestsStore.startRequest();

	const requestConfig: RequestConfig = {
		id: id,
		...config,
	};

	return requestConfig;
};

export const onResponse = (response: AxiosResponse | Response) => {
	const requestsStore = useRequestsStore();
	const id = (response.config as RequestConfig).id;
	requestsStore.endRequest(id);
	return response;
};

export const onError = async (error: RequestError) => {
	const requestsStore = useRequestsStore();
	const id = (error.response.config as RequestConfig).id;
	requestsStore.endRequest(id);

	// If a request fails with the unauthorized error, it either means that your user doesn't have
	// access, or that your session doesn't exist / has expired.
	// In case of the second, we should force the app to logout completely and redirect to the login
	// view.
	/* istanbul ignore next */
	const status = error.response?.status;
	/* istanbul ignore next */
	const code = error.response?.data?.error?.code;

	if (status === 401 && code === 'INVALID_CREDENTIALS' && error.request.responseURL.includes('refresh') === false) {
		try {
			await refresh();

			/** @todo retry failed request after successful refresh */
		} catch {
			logout({ reason: LogoutReason.ERROR_SESSION_EXPIRED });
		}
	}

	return Promise.reject(error);
};

api.interceptors.request.use(onRequest);
api.interceptors.response.use(onResponse, onError);

export default api;
