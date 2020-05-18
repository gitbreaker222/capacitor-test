import { quintOut } from 'svelte/easing';
import { crossfade } from 'svelte/transition';

export const [send, receive] = crossfade({
	duration: (d) => {console.log('#',d); return Math.sqrt(d * 200)},

	fallback(node, params) {
		const style = getComputedStyle(node);
		const transform = style.transform === 'none' ? '' : style.transform;

		return {
			duration: 600,
			easing: quintOut,
			css: t => `opacity: ${t}`
		};
	}
});

export const sortByIndexId = function(a, b) {
  if (a.id == null || b.id == null) {
    console.error("expected Id");
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  console.error("Found two identical IDs; see below");
  console.warn(a, b);
  return 0;
};

export const filterName = function(name, filterText) {
  return name.toLowerCase().includes(
		filterText.toLowerCase().trim()
	);
};

export const filterListByName = function(list, filterText) {
	if (!filterText) return list
	return list.filter(i => filterName(i.name, filterText))
}

export function debounce(func, timeout) {
  let timer
  return (...args) => {
    const next = () => func(...args);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(next, timeout > 0 ? timeout : 300);
  };
}

let id = 0 
export const makeItem = name => ({
	id: id++,
	name,
	src: id % 2
	  ? "https://sveltejs.github.io/assets/music/strauss.mp3"
		: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Creative_Commons/Dead_Combo/CC_Affiliates_Mixtape_1/Dead_Combo_-_01_-_Povo_Que_Cas_Descalo.mp3"
})

export function addType (item, type) {
	if (!item) return addType(makeItem(''), type)
	item.type = type
	return item
}