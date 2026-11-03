<script lang="ts">
	// 图标统一用 remixicon-svelte（线框风格）
	import RiArrowUpLine from 'remixicon-svelte/icons/arrow-up-line';
	import RiFileTextLine from 'remixicon-svelte/icons/file-text-line';
	import RiAddLine from 'remixicon-svelte/icons/add-line';
	import RiCloseLine from 'remixicon-svelte/icons/close-line';
	import * as Attachment from "#lib/components/ui/attachment/index.js";
	import * as InputGroup from "#lib/components/ui/input-group/index.js";
 
	type AttachmentFile = {
		id: string;
		name: string;
	};
 
	let text = $state("");
	let files = $state<AttachmentFile[]>([]);
	let form = $state<HTMLFormElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	const canSend = $derived(text.trim().length > 0);
 
	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSend) {
			return;
		}
 
		text = "";
		files = [];
	}
 
	function onAttach(event: Event & { currentTarget: HTMLInputElement }) {
		const selected = event.currentTarget.files;
		if (!selected) {
			return;
		}
 
		files = [
			...files,
			...Array.from(selected, (file) => ({
				id: crypto.randomUUID(),
				name: file.name,
			})),
		];
		event.currentTarget.value = "";
	}
</script>
 
<div class="w-full ">
	<form bind:this={form} onsubmit={onSubmit}>
		<input
			bind:this={input}
			type="file"
			multiple
			class="sr-only"
			tabindex={-1}
			onchange={onAttach}
		/>
		<InputGroup.Root>
			{#if files.length > 0}
				<InputGroup.Addon align="block-start" class="flex-wrap">
					{#each files as file (file.id)}
						<Attachment.Root size="sm">
							<Attachment.Media>
								<RiFileTextLine />
							</Attachment.Media>
							<Attachment.Content>
								<Attachment.Title>{file.name}</Attachment.Title>
							</Attachment.Content>
							<Attachment.Actions>
								<Attachment.Action
									aria-label={`Remove ${file.name}`}
									onclick={() => (files = files.filter((item) => item.id !== file.id))}
								>
									<RiCloseLine />
								</Attachment.Action>
							</Attachment.Actions>
						</Attachment.Root>
					{/each}
				</InputGroup.Addon>
			{/if}
			<InputGroup.Textarea
				bind:value={text}
				placeholder="Ask the agent to change your code..."
				onkeydown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						form?.requestSubmit();
					}
				}}
				class="p-3"
			/>
			<InputGroup.Addon align="block-end">
				<InputGroup.Button
					size="icon-sm"
					variant="outline"
					class="rounded-full"
					aria-label="Attach files"
					onclick={() => input?.click()}
				>
					<RiAddLine />
				</InputGroup.Button>
				<div class="flex-1"></div>
				<InputGroup.Button
					type="submit"
					size="icon-sm"
					variant="default"
					class="rounded-full"
					disabled={!canSend}
					aria-label="Send"
				>
					<RiArrowUpLine />
				</InputGroup.Button>
			</InputGroup.Addon>
		</InputGroup.Root>
	</form>
</div>
