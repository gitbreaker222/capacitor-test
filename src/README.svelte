<!--
Interaction-Design demo for music-playlist mechanics:
(cares less about graphical UI)

There are 5 lists:

- played songs
- current song (yes, also a list because of fading tracks)
- queued songs
- queued from previous songs
- remaining songs

Actions:

- Next: Plays the next song from queued list, then from remaining. Puts current at end of played.
- Prev: Play previous played song. Puts current at start of queue-previous.
- Random: If active AND queue/queue-previous empty, picks random next song. No effect on previous songs.
- Queue song: Moves song at the end of queue.
- Move queued song to remaining: Puts song back in remaining at sorted position. (TODO: should be possible to move songs to played)
- Double-click song: Moves current position to that song as if prev/next was triggered so many times. If random, songs between current position and selected song will not move to played.

UX:

- Queue: Listener want's to have THAT song coming next, no matter whats next in the list.
- Played Songs: The music plays. Later the listener wants to look up THAT SONG from 10 Minutes ago.
- Random: Will not change history, so going back and forth stays expectable, while keeping control about queued songs
- Sorting: ...
- In Focus: ...

Motivation:

So far all Music-Players I tried on Linux are either missing an elegant GUI or are too limited in their funcions.

-->