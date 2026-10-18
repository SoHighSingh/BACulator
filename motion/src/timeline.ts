// Every beat of the add-a-drink flow, in seconds. Motion only answers a tap.
export const T = {
  fingerMic: 1.3, // finger comes to the mic
  micPress: 1.8, // tap the mic
  open: 1.85, // composer rises (280 ms), mic goes live
  words: [2.4, 2.8, 3.2, 3.5], // "double vodka red bull", word by word
  listenEnd: 4.05, // listening stops, the parsed card rises (280 ms)
  fingerAdd: 5.9, // finger comes to Add
  addPress: 6.4, // tap Add: squeeze to 0.975 for 120 ms
  close: 6.6, // composer closes
  status: 6.8, // "Added: Vodka" slides in
  num: 6.87, // number settles 0.10 → 0.12 (520 ms), band eases wider
  end: 9.5, // AddFlow length (hold ≥1.5 s on the end state)
  loopFade: 9.0, // AddFlowLoop: dissolve back to the first frame
  loopEnd: 10.0,
};

export const RISE = 0.28; // composer rise, seconds
export const SETTLE = 0.52; // number blur-in, seconds
export const TRANSCRIPT = ["double", "vodka", "red", "bull"];
