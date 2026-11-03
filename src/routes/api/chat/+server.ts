/**
 * 聊天流式接口骨架：前端 POST JSON，服务端用 ReadableStream 往回推。
 * 真正调 pi-ai / 拼 SSE 事件后面再补，这里先把请求校验和响应架子搭好。
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// 后面接模型时再打开：
// import { getChatModel, models } from '#lib/server/llm';

/** 前端约定的一条消息（先按最小字段来，后面再扩附件等） */
type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

/** POST body：会话 id + 完整历史（含刚发出的那条用户消息） */
type ChatRequestBody = {
	sessionId?: string;
	messages: ChatMessage[];
};

export const POST: RequestHandler = async ({ request }) => {
	// 1) 解析 JSON；坏请求直接 400
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

	// 2) 流式响应：先返回一个空架子，占位事件方便前端联调
	//    真正流式时：在 start 里调 models.streamSimple，把 delta 写成 SSE data 行
	const encoder = new TextEncoder();

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				// SSE 格式：event + data，空行结束一条
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
				);
			};

			try {
				// --- 占位：告诉前端「骨架通了」，后面换成真实 token 流 ---
				send('meta', {
					sessionId: body.sessionId ?? null,
					ok: true,
					note: '骨架占位，尚未接入 LLM'
				});

				// TODO: 这里接 getChatModel() + streamSimple(messages, ...)
				// TODO: 每个 delta 发 event: 'token' / 'delta'
				// TODO: 结束发 event: 'done'

				send('done', { reason: 'skeleton' });
			} catch (err) {
				const message = err instanceof Error ? err.message : '未知错误';
				send('error', { message });
			} finally {
				controller.close();
			}
		},
		cancel() {
			// 前端 abort / 关页时会走到这里；后面接 LLM 时在这里取消上游请求
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

// 可选：探活；联调时 curl 一下看路由在不在
export const GET: RequestHandler = async () => {
	return Response.json({ ok: true, path: '/api/chat', mode: 'sse-skeleton' });
};
