export type Role = {
	id: string;
	name: string;
	description: string;
	collection_listing:
		| null
		| {
				group_name: string;
				collections: {
					collection: string;
				}[];
		  }[];
	module_listing:
		| null
		| {
				link: string;
				name: string;
				icon: string;
		  }[];
	enforce_2fa: null | boolean;
	external_id: null | string;
	ip_whitelist: string[];
	app_access: boolean;
	admin: boolean;
};

export type Avatar = {
	id: string;
};

// There's more data returned in thumbnails and the avatar data, but we
// only care about the thumbnails in this context

export type User = {
	id: string;
	status: string;
	first_name: string;
	last_name: string;
	email: string;
	token: string;
	last_login: string;
	last_page: string;
	external_id: string;
	'2fa_secret': string;
	theme: 'auto' | 'dark' | 'light';
	role: Role;
	password_reset_token: string | null;
	timezone: string;
	locale: string;
	locale_options: null;
	avatar: null | Avatar;
	company: string | null;
	title: string | null;
	email_notifications: boolean;
};
