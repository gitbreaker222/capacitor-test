<!--svelte:options immutable={true} /-->
<script>
	import { onMount, beforeUpdate, afterUpdate, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	//import VirtualList from '@sveltejs/svelte-virtual-list';
	import VirtualList from './VirtualList.svelte'
	import Icon from './Icon.svelte'
	import {
		playerStore,
		playPause, 
		play,
		queueSong,
		resetSong,
		jumpTo,
		PLAYED,
		CURRENT,
		QUEUE,
		PREV_QUEUE,
		REMAINING,
	} from './store/playerStore.js'
	import { send, receive } from './utils.js'
	import { filterListByName, addType } from './utils.js'
	
	// Constants / Variables	
	let autoscroll = false
	let scrollToIndex
	
	$: isPaused = $playerStore.paused
	$: isRandom = $playerStore.isRandom
	$: filterText = $playerStore.filterText
	$: previous = $playerStore.previous
	$: current = $playerStore.current
	$: next = $playerStore.next
	$: nextPrev = $playerStore.nextPrev
	$: remaining = $playerStore.remaining
	
	// Derived
	$: completeList = filterListByName([
		...previous.map(i => addType(i, PLAYED)),
		addType(current, CURRENT),
		...next.map(i => addType(i, QUEUE)),
		...nextPrev.map(i => addType(i, PREV_QUEUE)),
		...remaining.map(i => addType(i, REMAINING)),
	], filterText)
	
	$: {
		autoscroll = current && !!current.id
	}

	// Methods
	function scrollToCurrent () {
		let index = completeList.indexOf(current)
		if (index > 0) index -= 1 //move current a bit to center
		scrollToIndex(index);
		autoscroll = false
	}
	
	function handleDblClick (event, song) {
		jumpTo(song)
		window.getSelection().removeAllRanges()
	}
	
	function handlePlayPause (event) {
		playPause()
	}
	
	// Life cycle
	afterUpdate(() => {
		if (!filterText && autoscroll) {
			scrollToCurrent()
		}
	})
</script>

<ul class="playlist">
	<VirtualList items={completeList} let:item={song} bind:scrollToIndex>
		<li class="song {song.type}"
				on:dblclick="{e => handleDblClick(e, song)}"
				>
			<span class="status-icon">
				{#if song.type === PLAYED}
				<Icon name="stop button"></Icon>
				{:else if song.type === CURRENT}
				<Icon name="play"></Icon>
				{:else if song.type === QUEUE}
				<Icon name="plus"></Icon>
				{:else if song.type === PREV_QUEUE}
				<Icon name="stop button"></Icon>
				{/if}
			</span>

			<span class="spacer"></span>
			<span class="name">{song.name}</span>
			<span class="spacer"></span>

			{#if song.type === PLAYED}
			<button on:click="{e => queueSong(song, previous)}">
				<Icon name="plus" invert></Icon>
				<Icon name="play" invert></Icon>
			</button> 
			{:else if song.type === CURRENT}
			<button on:click="{handlePlayPause}">
				{#if isPaused}
				<Icon name="play" invert></Icon>
				{:else}
				<Icon name="pause button" invert></Icon>
				{/if}
			</button> 
			{:else if song.type === QUEUE}
			<button on:click="{e => resetSong(song, next)}">
				<Icon name="right arrow curving down" invert></Icon>
			</button> 
			{:else if song.type === PREV_QUEUE}
			<button on:click="{e => resetSong(song, nextPrev)}">
				<Icon name="right arrow curving down" invert></Icon>
			</button> 
			{:else if song.type === REMAINING}
			<button on:click="{e => queueSong(song, remaining)}">
				<Icon name="plus" invert></Icon>
				<Icon name="play" invert></Icon>
			</button> 
			{/if}

		</li>
	</VirtualList>
</ul>

<style>
	.spacer {
		min-width: .6em;
	}
	
	.playlist {
		display: flex;
		flex-flow: column;
		flex: 1;
		overflow: auto;
		display: block;
	}
	
	li {
		padding: .2em;
		border-bottom: 1.1px solid currentColor;
		display: flex;
		align-items: center;
		position: relative;
		height: 45px; /*important for exact virtual list*/
		line-height: 1;
	}
	li:active {
		background: #eee;
	}
	
	li .name {
		flex: 1;
	}
	li button {
		display: inline-flex;
		align-items: center;
	}

	li button :global(.Icon) {
		font-size: 1.5em;
	}

	
	.status-icon {
		min-width: 1.2em;
    text-align: center;
	}
	
	.CURRENT {
		-border-top: 3px solid;
		font-weight: bold;
	}
</style>

<!-- regular list 
<ul class="playlist scrollable" style="display: none">
	{#each completeList as song (song.id)}
		<li class="song {song.type}"
				in:receive="{{key: song.id}}"
				out:send="{{key: song.id}}"
				animate:flip="{{duration: 200}}"
				on:dblclick="{e => handleDblClick(e, song)}"
				>
			<span class="status-icon"></span>
			<span class="spacer"></span>
			<span class="name">{song.name}</span>
			<span class="spacer"></span>
			{#if song.type === PLAYED}
			<button on:click="{e => queueSong(song, previous)}">
				##
			</button> 
			{:else if song.type === CURRENT}
			<button on:click="{e => (e)}">
				{#if isPaused}�{:else}II{/if}
			</button> 
			{:else if song.type === QUEUE}
			<button on:click="{e => resetSong(song, next)}">
				5
			</button> 
			{:else if song.type === PREV_QUEUE}
			<button on:click="{e => resetSong(song, nextPrev)}">
				5
			</button> 
			{:else if song.type === REMAINING}
			<button on:click="{e => queueSong(song, remaining)}">
				+#
			</button> 
			{/if}
		</li>
	{/each}
</ul-->
