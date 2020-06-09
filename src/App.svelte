<script>
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { 
		settingsStore,
		getDeviceInfo,
	 } from "./store/settingsStore.js";
	import Main from './pages/Main.svelte';

	$: platform = $settingsStore.platform
	
	$: ready = platform;

	onMount(() => {
		getDeviceInfo()
	})
	
</script>

<svelte:head>
	<link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic">
	<link rel="stylesheet" href="assets/css/normalize.css">
	<link rel="stylesheet" href="assets/css/milligram.css">
</svelte:head> 


{#if (ready)}
	<Main></Main>
{:else}
	<div>loading</div>
{/if}


<style>
	:global(
		html ul,
		html li,
		html button,
		html [type=checkbox]
		) {
		margin: 0;
	}

	:global(html button, .button) {
		padding: 0 1.5rem;
	}
	
	:global(.page) {
		min-height: 100%;
	}
	
</style>
