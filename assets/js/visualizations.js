// Visualization helpers stub (non-ESM)
window.DevFlowViz = {
  charts: {},
  createBasicChart(ctxId, data){
    if(typeof Chart === 'undefined') return;
    const ctx = document.getElementById(ctxId);
    if(!ctx) return;
    this.charts[ctxId] = new Chart(ctx,{type:'bar',data:{labels:data.labels||[],datasets:[{label:'Activity',data:data.values||[],backgroundColor:'#00ddff55',borderColor:'#00ddff'}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
  }
};
console.log('📊 visualizations.js loaded (stub)');
