/* Optional, deterministic UI automation over the existing simulation engine.
 * Never change the simulation RNG just to select a UI choice. */
const AutoPlay = (() => {
  const MODES = Object.freeze({off:'off', advance:'advance', full:'full'});
  const DELAY_MS = 450;

  function canStep(s,mode) {
    if (!s || s.finished || mode===MODES.off) return false;
    if (mode===MODES.advance) {
      // A multi-choice decision or a ready manuscript must be handled by the player.
      return (s.pending ? s.pending.choices?.length===1 : !s.offers.length && !DoctoralGame.canSubmit(s));
    }
    if (mode===MODES.full) return !!s.pending || !s.offers.length;
    return false;
  }

  function choiceIndex(s) {
    if (!s.pending || !s.pending.choices?.length) return -1;
    const choices=s.pending.choices;
    // Seek financial support, and continue an unfinished degree by default.
    const recommended=choices.findIndex(c=>['apply_dc','apply_spring','apply_ra','extend'].includes(c.kind));
    if (recommended>=0) return recommended;
    if (choices.length===1) return 0;
    // Stable variation based on event identity; does not consume simulation RNG.
    const input=[s.seed,s.month,s.pending.id,s.logs.length,s.actionHistory.length].join(':');
    let hash=2166136261;
    for (let i=0;i<input.length;i++) hash=Math.imul(hash^input.charCodeAt(i),16777619)>>>0;
    return hash%choices.length;
  }

  function action(s) {
    if (s.morale<38) return 'rest';
    if (s.month<0 && s.dcPrep<14) return 'funding';
    if (s.month>=0 && DoctoralGame.mainFunding(s)==='なし' && s.cash<14) return 'work';
    if (s.month>=0 && s.month<24 && DoctoralGame.mainFunding(s)==='なし' && s.dcPrep<14 && DoctoralGame.monthInAcademicYear(s)<2) return 'funding';
    const requirements=DoctoralGame.profile(s).university;
    if (s.research<28) return 'research';
    if (s.papers<requirements.paperRequirement && s.manuscript==='writing' && s.draft<100) return 'write';
    if (s.research<requirements.researchRequirement) return 'research';
    if (s.manuscript==='reviewing') return 'research';
    return 'write';
  }

  // Exactly one logical transition per call; the UI schedules the next tick.
  function step(s,mode,manualAction='research') {
    if (!canStep(s,mode)) return {type:'paused'};
    if (s.pending && (mode===MODES.full || s.pending.choices?.length===1)) {
      const index=choiceIndex(s);
      if (index<0 || !DoctoralGame.resolve(s,index)) return {type:'paused'};
      return {type:'choice',index};
    }
    if (mode===MODES.full && DoctoralGame.canSubmit(s)) {
      return DoctoralGame.submit(s)?{type:'submission'}:{type:'paused'};
    }
    const chosen=mode===MODES.full?action(s):manualAction;
    return DoctoralGame.advance(s,chosen)?{type:'month',action:chosen}:{type:'paused'};
  }

  return {MODES,DELAY_MS,canStep,choiceIndex,action,step};
})();