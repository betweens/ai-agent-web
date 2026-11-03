/**
 * 服务端 LLM 接入：用 .env 里的 OPENAI_* 配一个 OpenAI 兼容网关。
 * 这个文件只能在服务端引用，别从浏览器组件 import。
 *
 * 密钥来源：
 * - 用 SvelteKit `$app/env/private` 读并校验
 * - 调用 stream / complete 时显式传 apiKey（不碰 process.env）
 */
import {
	createModels,
	createProvider,
	envApiKeyAuth,
	type Model
} from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } from '$app/env/private';

/** Kit 校验过的网关密钥；业务代码统一用这个 */
export const openaiApiKey = OPENAI_API_KEY;

// 自定义 provider 的 id，别和内置 openai 撞名
const PROVIDER_ID = 'openai-compat';

// 模型目录里的这一条：id 必须和网关真实模型名一致
const chatModel: Model<'openai-completions'> = {
	id: OPENAI_MODEL,
	name: OPENAI_MODEL,
	api: 'openai-completions',
	provider: PROVIDER_ID,
	baseUrl: OPENAI_BASE_URL,
	reasoning: false,
	input: ['text'],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 128000,
	maxTokens: 8192
};

// 仍保留 envApiKeyAuth 作为兜底
// 真正推荐的是调用时显式传 apiKey
const provider = createProvider({
	id: PROVIDER_ID,
	name: 'OpenAI Compatible',
	baseUrl: OPENAI_BASE_URL,
	auth: {
		apiKey: envApiKeyAuth('OpenAI 兼容网关密钥', ['OPENAI_API_KEY'])
	},
	models: [chatModel],
	api: openAICompletionsApi()
});

export const models = createModels();
models.setProvider(provider);

/** 取出当前配置的聊天模型 */
export function getChatModel() {
	const model = models.getModel(PROVIDER_ID, OPENAI_MODEL);
	if (!model) {
		throw new Error(`找不到模型: ${PROVIDER_ID}/${OPENAI_MODEL}`);
	}
	return model;
}