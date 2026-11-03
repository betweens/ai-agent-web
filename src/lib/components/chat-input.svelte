<script lang="ts">
	// 图标统一用 remixicon-svelte（线框风格）
	import RiArrowUpLine from 'remixicon-svelte/icons/arrow-up-line';
	import RiArrowDownSLine from 'remixicon-svelte/icons/arrow-down-s-line';
	import RiFileTextLine from 'remixicon-svelte/icons/file-text-line';
	import RiAddLine from 'remixicon-svelte/icons/add-line';
	import RiCloseLine from 'remixicon-svelte/icons/close-line';
	import * as Attachment from "#lib/components/ui/attachment/index.js";
	import * as DropdownMenu from "#lib/components/ui/dropdown-menu/index.js";
	import * as InputGroup from "#lib/components/ui/input-group/index.js";
 
	type AttachmentFile = {
		id: string;
		name: string;
	};
 
	const providers = [
		{
			name: "OpenAI",
			models: [
				{ id: "gpt-5", name: "GPT-5" },
				{ id: "gpt-5-mini", name: "GPT-5 mini" },
			],
		},
		{
			name: "Anthropic",
			models: [
				{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
				{ id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
			],
		},
	];
 
	const models = providers.flatMap((provider) => provider.models);
 
	const efforts = [
		{ id: "low", name: "Low" },
		{ id: "medium", name: "Medium" },
		{ id: "high", name: "High" },
	];
 
	let text = $state("");
	let files = $state<AttachmentFile[]>([]);
	let model = $state(models[0].id);
	let effort = $state(efforts[1].id);
	let form = $state<HTMLFormElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	const currentModel = $derived(models.find((item) => item.id === model) ?? models[0]);
	const currentEffort = $derived(efforts.find((item) => item.id === effort) ?? efforts[1]);
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
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<InputGroup.Button
								{...props}
								size="sm"
								variant="outline"
								aria-label={`Model: ${currentModel.name}`}
								class="ml-auto"
							>
								{currentModel.name}
								<RiArrowDownSLine />
							</InputGroup.Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-48">
						<DropdownMenu.RadioGroup bind:value={model}>
							{#each providers as provider, index (provider.name)}
								{#if index > 0}
									<DropdownMenu.Separator />
								{/if}
								<DropdownMenu.Group>
									<DropdownMenu.Label>{provider.name}</DropdownMenu.Label>
									{#each provider.models as item (item.id)}
										<DropdownMenu.RadioItem value={item.id} closeOnSelect>
											{item.name}
										</DropdownMenu.RadioItem>
									{/each}
								</DropdownMenu.Group>
							{/each}
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<InputGroup.Button
								{...props}
								size="sm"
								variant="outline"
								aria-label={`Effort: ${currentEffort.name}`}
							>
								<span class="text-muted-foreground">Effort</span>
								{currentEffort.name}
								<RiArrowDownSLine />
							</InputGroup.Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-36">
						<DropdownMenu.Group>
							<DropdownMenu.Label>Effort</DropdownMenu.Label>
							<DropdownMenu.RadioGroup bind:value={effort}>
								{#each efforts as item (item.id)}
									<DropdownMenu.RadioItem value={item.id} closeOnSelect>
										{item.name}
									</DropdownMenu.RadioItem>
								{/each}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
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