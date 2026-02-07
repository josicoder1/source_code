export const Router = {
  routes: {},
  mount(point){ this.point = point; window.addEventListener('hashchange',()=>this.render()); this.render() },
  add(path, handler){ this.routes[path]=handler },
  render(){ const path = location.hash.replace('#','') || '/'; const handler = this.routes[path] || this.routes['/404']; this.point.innerHTML=''; handler(this.point) }
}
