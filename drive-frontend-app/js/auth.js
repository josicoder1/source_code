import { Storage } from './storage.js'

export const Auth = {
  register({name,email,password}){
    const users = Storage.getUsers();
    if(users.find(u=>u.email===email)) throw new Error('Email already registered')
    const user = {id:Date.now(),name,email,password,createdAt:new Date().toISOString()}
    users.push(user); Storage.setUsers(users); return user
  },
  login({email,password,remember}){
    const users = Storage.getUsers();
    const user = users.find(u=>u.email===email && u.password===password)
    if(!user) throw new Error('Invalid credentials')
    const session = {userId:user.id,token:Math.random().toString(36).slice(2),remember:!!remember}
    Storage.setSession(session); return session
  },
  logout(){ Storage.setSession(null) },
  currentUser(){ const s = Storage.getSession(); if(!s) return null; return Storage.getUsers().find(u=>u.id===s.userId) }
}
