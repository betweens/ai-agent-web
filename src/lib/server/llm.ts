/**
 * 服务端 LLM 接入：用 .env 里的 OPENAI_* 配一个 OpenAI 兼容网关，
 * 后面接口里直接 models.streamSimple / getChatModel 就行。
 * 这个文件只能在服务端引用，别从浏览器组件 import。
 */
import {
	createModels,
	createProvider,
	envApiKeyAuth,
	type Model
} from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { OPENAI_BASE_URL, OPENAI_MODEL } from '$app/env/private';

// 自定义 provider 的 id，别和内置 openai 撞名
const PROVIDER_ID = 'openai-compat';

// 模型目录里的这一条：id 必须和网关真实模型名一致（来自 OPENAI_MODEL）
const chatModel: Model<'openai-completions'> = {
	id: OPENAI_MODEL,
	name: OPENAI_MODEL,
	api: 'openai-completions',
	provider: PROVIDER_ID,
	baseUrl: OPENAI_BASE_URL,
	reasoning: false,
	input: ['text'],
	// 费用先填 0，本地学习用；以后要算成本再改
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 128000,
	maxTokens: 8192
};

// 挂上 Completions 兼容 API；密钥走环境变量 OPENAI_API_KEY，不写死在代码里
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

// 全局 models 集合：后面 stream / Agent 都用它
export const models = createModels();
models.setProvider(provider);

/** 取出当前配置的聊天模型；找不到就直接抛错，避免静默用错模型 */
export function getChatModel() {
	const model = models.getModel(PROVIDER_ID, OPENAI_MODEL);
	if (!model) {
		throw new Error(`找不到模型: ${PROVIDER_ID}/${OPENAI_MODEL}`);
	}
	return model;
}
