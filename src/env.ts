import { defineEnvVars } from '@sveltejs/kit/env';

// 必填字符串：去掉首尾空格，空就报错，方便启动时尽早发现配错了
function requiredString(name: string) {
	return (value: string | undefined) => {
		const trimmed = value?.trim();
		if (!trimmed) throw new Error(`${name} is required`);
		return trimmed;
	};
}

// 必填 URL：先保证非空，再用 URL 构造函数粗查一下格式对不对
function requiredUrl(name: string) {
	return (value: string | undefined) => {
		const trimmed = value?.trim();
		if (!trimmed) throw new Error(`${name} is required`);
		try {
			new URL(trimmed);
		} catch {
			throw new Error(`${name} must be a valid URL`);
		}
		return trimmed;
	};
}

// 在这里登记环境变量；默认只给服务端用，不会进浏览器
export const variables = defineEnvVars({
	OPENAI_BASE_URL: {
		description: '兼容网关地址，一般要带 /v1，只在服务端用',
		schema: requiredUrl('OPENAI_BASE_URL')
	},
	OPENAI_API_KEY: {
		description: '网关 API 密钥，只在服务端用，千万别加 PUBLIC_',
		schema: requiredString('OPENAI_API_KEY')
	},
	OPENAI_MODEL: {
		description: '网关上的模型名，比如 deepseek-chat，只在服务端用',
		schema: requiredString('OPENAI_MODEL')
	}
});
