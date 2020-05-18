
<script>
	import { onMount, afterUpdate, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	//import VirtualList from '@sveltejs/svelte-virtual-list';
	import VirtualList from './VirtualList.svelte'
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
	} from './playerStore.js'
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
	
	function scrollToCurrent () {
		const filterRemoved = !filterText
		if (autoscroll || filterRemoved) {
			let index = completeList.indexOf(current)
			if (index > 0) index -= 1 //move current a bit to center
			scrollToIndex(index); 
		}
	}
	
	// Event handler
	function handlePlay(event, song) {
		play(song)
		autoscroll = true
		window.getSelection().removeAllRanges()
		//audio.play()
		// TODO audio.autoplay = true
	}
	
	function handleDblClick (e, song) {jumpTo(song)}
	
	function handlePlayPause (event) {
		playPause()
	}
	
	// Life cycle
	afterUpdate(function(x) {
		scrollToCurrent()
	})
</script>

<ul class="playlist">
	<VirtualList items={completeList} let:item={song} bind:scrollToIndex>
		<li class="song {song.type}"
				on:dblclick="{e => handleDblClick(e, song)}"
				>
			<span class="status-icon"></span>
			<span class="spacer"></span>
			<span class="name">{song.name}</span>
			<span class="spacer"></span>
			{#if song.type === PLAYED}
			<button on:click="{e => queueSong(song, previous)}">
				¶+
			</button> 
			{:else if song.type === CURRENT}
			<button on:click="{handlePlayPause}">
				{#if isPaused}¶{:else}ø{/if}
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
				¶+
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
	
	.CURRENT {
		-border-top: 3px solid;
		font-weight: bold;
	}
	
	.status-icon {
		min-width: 1.2em;
    text-align: center;
	}
	.CURRENT .status-icon:before {
		content: '¶';
	}
	.PLAYED .status-icon:before,
	.QUEUE .status-icon:before,
	.PREV_QUEUE .status-icon:before {
		content: '+';
	}
	.PLAYED .status-icon:before {
		content: 'ª';
	}
	.PREV_QUEUE .status-icon:before {
		content: '#';
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
				{#if isPaused}¶{:else}II{/if}
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
