// AI Engine stub (non-ESM) to prevent initialization hang
window.DevFlowAI = {
  initialized: false,
  async init(){
    await new Promise(r=>setTimeout(r,150));
    this.initialized = true;
    console.log('🤖 AI engine stub initialized');
    const ls = document.getElementById('loading-screen');
    if(ls) ls.remove();
  },
  recommendProjects(repos){
    return (repos||[]).slice(0,5).map(r=>({...r, aiScore: 90}));
  }
};
console.log('🤖 ai-engine.js loaded (stub)');
