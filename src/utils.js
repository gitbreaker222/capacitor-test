import { quintOut } from 'svelte/easing';
import { crossfade } from 'svelte/transition';

export const audioExtensions = ['mp3', 'ogg', 'wav', 'mp4', 'm4a', 'flac']

export const [send, receive] = crossfade({
	duration: (d) => { console.log('#', d); return Math.sqrt(d * 200) },

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

export const sortByIndexId = function (a, b) {
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

export const filterName = function (name, filterText) {
	return name.toLowerCase().includes(
		filterText.toLowerCase().trim()
	);
};

export const filterListByName = function (list, filterText) {
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

const isLink = (string) => {
	return string.startsWith('http')
}

const extractFilename = (path = '') => {
	/**
	 * from "/path/to/file.ogg"
	 * to "file"
	 */
	const regex = /(?!\/)[^/]+(?=\.)/g
	const nameResults = path.match(regex, '')

	if (nameResults) return nameResults[0]
	else return '–'
}

let id = 0
export const makeItem = (path = '') => {
	const item = {
		id: id++,
		name: '',
		src: '',
	}

	if (isLink(path)) {
		item.name = path
		item.src = path
	} else {
		item.name = extractFilename(path)
		item.src = encodeURIComponent(path)
	}

	// dev
	if (path.startsWith('./')) {
		item.src = id % 2
			? encodeURIComponent("assets/music/Johann Strauss - Donau Walzer (performed by European Archive).mp3")
			: encodeURIComponent("assets/music/Dead Combo - CC Affiliates Mixtape #1 - 01 - Povo Que Caís Descalço.mp3")
	}

	if (!isLink(path)) encodeURIComponent(path)

	return item
}

export function addType(item, type) {
	if (!item) return addType(makeItem(), type)
	item.type = type
	return item
}

export const Playlist = function (source) {
	if (typeof source === 'number') {
		const collection = []
		for (var i = 0; i < source; i += 1) {
			collection.push('Song ' + i)
		}
		return collection.map(makeItem)
	}
	return source.map(makeItem)
}