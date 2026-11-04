<script lang="ts">
	import RiAlertLine from 'remixicon-svelte/icons/alert-line';
	import RiChatAiLine from 'remixicon-svelte/icons/chat-ai-line';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { chat, type ChatMessage } from '#lib/stores/chat-stores.svelte.ts';

	/** 离底部小于这个距离就当作还停在底部，流式增长时继续跟着滚 */
	const NEAR_BOTTOM_PX = 80;

	let viewportRef = $state<HTMLElement | null>(null);
	// 用户往上翻之后就不要再拽回底部；新消息或自己滚回来再贴住
	let stickToBottom = true;
	let seenCount = 0;

	function onViewportScroll(event: Event) {
		const el = event.currentTarget;
		if (!(el instanceof HTMLElement)) return;
		stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
	}

	$effect(() => {
		const messages = chat.messages;
		const count = messages.length;
		const last = messages[count - 1];
		const tailLength = last ? last.content.length : 0;
		const error = chat.error;
		const streaming = chat.isStreaming;
		const el = viewportRef;

		// 读这些值，token 增长、骨架出现或错误出现时重新判断要不要滚
		void tailLength;
		void error;
		void streaming;

		const appended = count > seenCount;
		seenCount = count;
		// 刚发出去的那一轮要能看见，即使用户之前停在上面
		if (appended) stickToBottom = true;
		if (!el || !stickToBottom) return;

		el.scrollTop = el.scrollHeight;
	});

	function isPendingAssistant(message: ChatMessage) {
		const last = chat.messages[chat.messages.length - 1];
		return chat.isStreaming && message.role === 'assistant' && message.content.length === 0 && message.id === last?.id;
	}
</script>

<div class="flex h-full min-h-0 flex-1 flex-col">
	<ScrollArea class="h-full min-h-0 flex-1" bind:viewportRef onviewportscroll={onViewportScroll}>
		<div class="flex min-h-full flex-col gap-4 p-4">
			{#if chat.messages.length === 0}
				<Empty.Root class="flex-1">
					<Empty.Header>
						<Empty.Media variant="icon">
							<RiChatAiLine />
						</Empty.Media>
						<Empty.Title>还没有消息</Empty.Title>
						<Empty.Description>在下方输入内容，开始和助手对话。</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<div class="flex flex-col gap-4" role="log" aria-relevant="additions" aria-busy={chat.isStreaming}>
					{#each chat.messages as message (message.id)}
						{#if message.role === 'user'}
							<Message.Root align="end">
								<Message.Content>
									<Bubble.Root align="end" variant="muted">
										<Bubble.Content class="whitespace-pre-wrap">{message.content}</Bubble.Content>
									</Bubble.Root>
								</Message.Content>
							</Message.Root>
						{:else if isPendingAssistant(message)}
							<Message.Root>
								<Message.Content aria-label="助手正在回复">
									<Skeleton class="h-4 w-40" />
									<Skeleton class="h-4 w-24" />
								</Message.Content>
							</Message.Root>
						{:else}
							<Message.Root>
								<Message.Content>
									{#if message.role === 'system'}
										<Message.Header>系统</Message.Header>
									{/if}
									<Bubble.Root variant={message.role === 'system' ? 'outline' : 'ghost'}>
										<Bubble.Content class="whitespace-pre-wrap">{message.content}</Bubble.Content>
									</Bubble.Root>
								</Message.Content>
							</Message.Root>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</ScrollArea>

	{#if chat.error}
		<div class="shrink-0 px-4 pb-2">
			<Alert.Root variant="destructive">
				<RiAlertLine />
				<Alert.Title>出错了</Alert.Title>
				<Alert.Description>{chat.error}</Alert.Description>
			</Alert.Root>
		</div>
	{/if}
</div>
