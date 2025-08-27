// GitHub API helper (stub, non-ESM)
window.DevFlowGitHub = {
  async getUser(token){
    const r = await fetch('https://api.github.com/user',{headers:{Authorization:`token ${token}`}});
    if(!r.ok) throw new Error('GitHub user fetch failed');
    return r.json();
  },
  async getRepos(token){
    const r = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated',{headers:{Authorization:`token ${token}`}});
    return r.ok? r.json(): [];
  }
};
console.log('🐙 github-api.js loaded (stub)');
