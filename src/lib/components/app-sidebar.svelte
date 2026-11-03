<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
  import RiNotification3Line from 'remixicon-svelte/icons/notification-3-line';
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<Collapsible.Root open class="group/collapsible">
			{#snippet child({ props })}
				<Sidebar.MenuItem {...props}>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton {...props} tooltipContent="提示">
								<RiNotification3Line /> 提示
							</Sidebar.MenuButton>
						{/snippet}
					</Collapsible.Trigger>
					<Collapsible.Content>
						<Sidebar.MenuSub>
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton>
									<RiNotification3Line />
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						</Sidebar.MenuSub>
					</Collapsible.Content>
				</Sidebar.MenuItem>
			{/snippet}
		</Collapsible.Root>
	</Sidebar.Menu>
</Sidebar.Group>
