<script>
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import {
		playerStore,
		load,
		setPaused,
		playPause, 
		play,
		playPrev,
		playNext,
		toggleRandom,
		setFilterText,
	} from '../store/playerStore.js'
	import Playlist from '../Playlist.svelte'
	import Icon from '../Icon.svelte'
	import { debounce, sortByIndexId } from '../utils.js'

	// constants / variables / state
	let audio	
	$: paused = $playerStore.paused
  $: isRandom = $playerStore.isRandom
	$: previous = $playerStore.previous 
	$: current = $playerStore.current
	$: next = $playerStore.next
	$: nextPrev = $playerStore.nextPrev
	$: remaining = $playerStore.remaining
	
	// derived
	$: currentCounter = previous.length + (current ? 1 : 0)
	$: totalCount = currentCounter + next.length + nextPrev.length + remaining.length
	
	// event handler
	const handleFilter = debounce(function (event) {
		setFilterText(event.target.value)
	}, 700)
	
	const handlePlay = () => {
		setPaused(false)
	}

	const handlePause = (event) => {
		const {
			currentTime,
			duration
		} = event.target

		if (currentTime === duration) {
			console.log('song ended at', duration);
			
			playNext()
		}
		else setPaused(true)
	}

	const handleError = (error) => {
		console.error(error)
		throw new Error('player error')
		//setPaused(true)
	}

	onMount(() => {
		load()
	})
	
</script>

<div class="page Main">
  <div class="controls" style="display: normal">
    <button on:click={playPrev}>
      <Icon name="last track button" invert class="big"></Icon>
      &nbsp;prev
    </button>
    <button on:click={playNext}>
      next&nbsp;
      {#if (isRandom)}
      <Icon name="shuffle tracks button" invert></Icon>
      {:else}
      <Icon name="next track button" invert></Icon>
      {/if}
    </button>
    <label class="button">
      <input type="checkbox"
             checked={isRandom}
             on:click={toggleRandom}
      >
      &nbsp;
      <Icon name="shuffle tracks button" invert></Icon>
    </label>
    <input class="search"
           type="text"
           placeholder="filter:"
           on:input="{handleFilter}">
    <div class="info">
      {currentCounter}/{totalCount}&emsp;
      {#if current}<strong>{current.name}</strong>{/if}
    </div>
    <audio
      autoplay
      controls
      src={current && current.src}
      bind:paused={paused}
      on:pause={handlePause}
      on:play={handlePlay}
    ></audio>
  </div>
  
  <Playlist></Playlist>
</div>

<style>
  .Main {
		display: flex;
		flex-flow: column-reverse nowrap;
		height: 100%;
	}

	button, .button {
		display: inline-flex;
		align-items: center;
	}
  
	.controls {
		display: flex;
		flex-flow: row wrap;
		z-index: 1;
		background: white;
		box-shadow: 0 0 0.5em .5em white;
	}
	.controls .search {
		flex: 1 0 5rem;
	}
	.controls .search:focus {
		flex: 1 1 40rem;
	}
	.controls .info {
		flex: 1 0 100%;
		font-size: 11px;
	}
	.controls :global(.Icon) {
		font-size: 1.5em;
	}
	audio {
		width: 100%;
		height: 2rem;
	}
	
</style>
