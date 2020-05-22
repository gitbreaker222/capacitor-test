<script>
  let className = ''
  export { className as class }
  export let invert = false
  export let name

  // setup icon list
  const map = {
    "last track button": "23EE",
    "next track button": "23ED",
    "pause button": "23F8",
    "play": '25B6',
    "plus": "2795",
    "right arrow curving down": "2935",
    "shuffle tracks button": "1F500",
    "stop button": "23F9",
  }

  let src = `./assets/openmoji-svg-black/${map[name]}.svg`

  if (!map[name]) {
    console.warn(`<Icon name="${name}"> unknown name`)
    console.info(
      'Available names:', 
      Object.keys(map)
    )
  }
</script>

<!-- mask technique not performant enought on scroll
<i
  class={"Icon " + className}
  style="--src: url({src})"
  >
  <img src="{src}" alt="{name} icon">
</i>
-->
<i class={"Icon " + className}>
  <img
    src="{src}"
    alt="{name} icon"
    class:invert
    >
</i>

<style>
  .Icon {
    width: 1.6em;
    height: 1.6em;
    display: inline-flex;
    align-items: center;
    
    /*
    background: currentColor;
    mask: var(--src);
    -webkit-mask: var(--src);
    */
  }
  img.invert {
    filter: invert();
  }
</style>