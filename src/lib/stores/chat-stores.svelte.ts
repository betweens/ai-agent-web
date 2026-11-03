/**
 * 聊天共享状态：历史消息、发送中标记、发消息（打 /api/chat 读 SSE）。
 * 组件里只调 chat.sendMessage / chat.abort，不要自己去 fetch。
 */
export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
	id: string;
	role: ChatRole;
	content: string;
};

class ChatStore {
	/** 当前会话 id；没有就先空着，服务端 meta 里也可能带回 */
	sessionId = $state<string | null>(null);

	/** 对话历史（含流式过程中正在长出来的那条 assistant） */
	messages = $state<ChatMessage[]>([]);

	/** 是否正在收流；用来禁用发送按钮、显示停止 */
	isStreaming = $state(false);

	/** 最近一次错误文案；成功发送可清掉 */
	error = $state<string | null>(null);

	/** 当前这次请求的 AbortController，方便点「停止」 */
	#abort: AbortController | null = null;

	/**
	 * 发送一条用户消息：先入本地历史，再 POST /api/chat，按 SSE 事件更新 assistant。
	 * content 为空直接 return；正在流式时也先挡住（要打断请先 abort）。
	 */
	async sendMessage(content: string) {
		const text = content.trim();
		if (!text || this.isStreaming) return;

		this.error = null;

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: text
		};
		// 先占一条空的 assistant，后面 token 往里面拼
		const assistantMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'assistant',
			content: ''
		};

		this.messages = [...this.messages, userMsg, assistantMsg];
		this.isStreaming = true;

		const controller = new AbortController();
		this.#abort = controller;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					sessionId: this.sessionId ?? undefined,
					// 发给服务端时去掉本地 id，只要 role/content
					messages: this.messages
						.filter((m) => m.id !== assistantMsg.id) // 还没生成完的 assistant 别传上去
						.map(({ role, content }) => ({ role, content }))
				})
			});

			if (!res.ok) {
				const detail = await res.text().catch(() => '');
				throw new Error(detail || `请求失败: ${res.status}`);
			}
			if (!res.body) {
				throw new Error('响应没有 body，无法读流');
			}

			await this.#readSse(res.body, assistantMsg.id);
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// 用户主动停止，不算错误
			} else {
				const message = err instanceof Error ? err.message : '发送失败';
				console.error('[chat]', message, err);
				this.error = message;
				// 若 assistant 还是空的，补一句错误提示，避免界面留空白气泡
				this.messages = this.messages.map((m) => (m.id === assistantMsg.id && !m.content ? { ...m, content: `（出错了）${message}` } : m));
			}
		} finally {
			this.isStreaming = false;
			this.#abort = null;
		}
	}

	/** 打断当前流式请求 */
	abort() {
		this.#abort?.abort();
		this.#abort = null;
		this.isStreaming = false;
	}

	/** 清空当前会话（不碰服务端，只清本地） */
	clear() {
		this.abort();
		this.messages = [];
		this.error = null;
	}

	/**
	 * 解析服务端 SSE：event + data 成对出现。
	 * 约定事件：meta / token|delta / done / error（和 +server.ts 骨架对齐）
	 */
	async #readSse(body: ReadableStream<Uint8Array>, assistantId: string) {
		// 不用 pipeThrough(TextDecoderStream)：和当前 TS DOM 类型对 Uint8Array 对不上
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		const flushChunks = (chunks: string[]) => {
			for (const chunk of chunks) {
				if (!chunk.trim()) continue;

				let eventName = 'message';
				const dataLines: string[] = [];

				for (const line of chunk.split('\n')) {
					if (line.startsWith('event:')) {
						eventName = line.slice(6).trim();
					} else if (line.startsWith('data:')) {
						dataLines.push(line.slice(5).trim());
					}
				}

				const raw = dataLines.join('\n');
				let data: unknown = raw;
				try {
					data = JSON.parse(raw);
				} catch {
					// 非 JSON 就当纯文本 token
				}

				this.#applySseEvent(eventName, data, assistantId);
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				buffer += decoder.decode(); // 冲掉末尾残留字节
				break;
			}
			buffer += decoder.decode(value, { stream: true });

			// SSE 事件块之间用空行隔开
			const chunks = buffer.split('\n\n');
			buffer = chunks.pop() ?? '';
			flushChunks(chunks);
		}

		// 流结束时 buffer 里可能还有最后一块（没带尾部空行）
		if (buffer.trim()) {
			flushChunks([buffer]);
		}
	}

	#applySseEvent(eventName: string, data: unknown, assistantId: string) {
		// 联调：把每条 SSE 事件名和内容打到控制台，方便看流式输出
		console.log('[chat] sse', eventName, data);

		if (eventName === 'meta' && data && typeof data === 'object') {
			const sessionId = (data as { sessionId?: string | null }).sessionId;
			if (sessionId) this.sessionId = sessionId;
			return;
		}

		if (eventName === 'token' || eventName === 'delta') {
			const piece = typeof data === 'string' ? data : data && typeof data === 'object' && 'content' in data ? String((data as { content: unknown }).content ?? '') : '';
			if (!piece) return;
			this.messages = this.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + piece } : m));
			return;
		}

		if (eventName === 'error') {
			const message = data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : '流式出错';
			console.error('[chat] sse error:', message, data);
			this.error = message;
			// 页面若没绑 chat.error，至少让助手气泡能看见原因
			this.messages = this.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content ? `${m.content}\n\n（出错了）${message}` : `（出错了）${message}` } : m));
			return;
		}

		// done：骨架阶段没有 token，这里可写一句占位，方便你联调看通了没有
		if (eventName === 'done') {
			const target = this.messages.find((m) => m.id === assistantId);
			if (target && !target.content) {
				this.messages = this.messages.map((m) => (m.id === assistantId ? { ...m, content: '（骨架已通，尚未接入真实模型）' } : m));
			}
		}
	}
}

/** 模块单例：各组件 import { chat } from '...' 共用同一份 */
export const chat = new ChatStore();
