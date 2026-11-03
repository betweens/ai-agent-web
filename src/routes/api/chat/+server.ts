/**
 * 聊天流式接口：POST JSON → 调 pi-ai streamSimple → 用 SSE 往前端推 token。
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AssistantMessage, Context, Message } from '@earendil-works/pi-ai';
import { getChatModel, models, openaiApiKey } from '#lib/server/llm.js';

/** 前端约定的一条消息（先按最小字段） */
type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

type ChatRequestBody = {
	sessionId?: string;
	messages: ChatMessage[];
};

/** 把前端 role/content 转成 pi-ai 的 Message（历史 assistant 用最小可重放结构） */
function toPiMessages(messages: ChatMessage[]): Message[] {
	const model = getChatModel();
	const now = Date.now();

	return messages.map((m, i) => {
		const timestamp = now - (messages.length - i) * 1000;

		if (m.role === 'user') {
			return { role: 'user' as const, content: m.content, timestamp };
		}

		if (m.role === 'system') {
			return { role: 'system' as const, content: m.content, timestamp };
		}

		// 历史 assistant：没有完整 usage 等字段时，填一份占位，够多轮续聊
		const assistant: AssistantMessage = {
			role: 'assistant',
			content: [{ type: 'text', text: m.content }],
			api: model.api,
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
			},
			stopReason: 'stop',
			timestamp
		};
		return assistant;
	});
}

export const POST: RequestHandler = async ({ request }) => {
	let body: ChatRequestBody;
	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		error(400, '请求体必须是 JSON');
	}

	const messages = body.messages;
	if (!Array.isArray(messages) || messages.length === 0) {
		error(400, 'messages 不能为空');
	}

	const last = messages[messages.length - 1];
	if (!last || last.role !== 'user' || !last.content?.trim()) {
		error(400, '最后一条必须是非空的 user 消息');
	}

	const model = getChatModel();
	const context: Context = {
		systemPrompt: '你是一个有帮助的中文助手。',
		messages: toPiMessages(messages)
	};

	const encoder = new TextEncoder();
	// 前端 abort 时 request.signal 会 abort；再挂一个本地 controller 方便 cancel 里统一停
	const upstream = new AbortController();
	const onClientAbort = () => upstream.abort();
	request.signal.addEventListener('abort', onClientAbort);

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
				);
			};

			try {
				send('meta', {
					sessionId: body.sessionId ?? null,
					model: model.id,
					provider: model.provider
				});

				// streamSimple：事件协议 start → text_delta* → done / error
				const s = models.streamSimple(model, context, {
					signal: upstream.signal,
					// 显式带上密钥，不依赖 process.env 是否已被灌入
					apiKey: openaiApiKey
				});

				let finished = false;
				for await (const event of s) {
					if (upstream.signal.aborted) break;

					if (event.type === 'text_delta') {
						// 和 chat-stores 约定：token/delta 带 { content }
						send('token', { content: event.delta });
					} else if (event.type === 'error') {
						// error 事件里的 error 是 AssistantMessage，文案在 errorMessage
						send('error', {
							message: event.error.errorMessage ?? String(event.reason)
						});
						finished = true;
					} else if (event.type === 'done') {
						send('done', { stopReason: event.reason });
						finished = true;
					}
				}

				if (!finished) {
					send('done', { reason: upstream.signal.aborted ? 'aborted' : 'stream-end' });
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : '未知错误';
				try {
					send('error', { message });
					send('done', { reason: 'error' });
				} catch {
					// controller 可能已关
				}
			} finally {
				request.signal.removeEventListener('abort', onClientAbort);
				controller.close();
			}
		},
		cancel() {
			upstream.abort();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};

export const GET: RequestHandler = async () => {
	return Response.json({ ok: true, path: '/api/chat', mode: 'sse-pi-ai' });
};
