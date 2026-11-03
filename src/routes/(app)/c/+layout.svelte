<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import ChatInput from '#lib/components/chat-input.svelte';
	import AppSidebar from '#lib/components/app-sidebar.svelte';

	let { children } = $props();
</script>

<!-- h-svh + overflow-hidden：整页高度锁在视口，滚动交给内部 ScrollArea -->
<Sidebar.Provider class="h-svh overflow-hidden">
	<Sidebar.Root collapsible="icon">
		<Sidebar.Header>哈哈哈</Sidebar.Header>
		<Sidebar.Content>
			<AppSidebar />
		</Sidebar.Content>
		<Sidebar.Footer />
	</Sidebar.Root>
	<Sidebar.Inset class="min-h-0 overflow-hidden">
		<header class="shrink-0 border-b p-2">
			<Sidebar.Trigger />
		</header>
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
			{@render children?.()}
		</div>
		<footer class="shrink-0 px-2">
			<ChatInput />
		</footer>
	</Sidebar.Inset>
</Sidebar.Provider>
