import React from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom'

import './style.css'
import Home from './views/home'
import FileManager from './views/file-manager'
import Shared from './views/shared'
import Recent from './views/recent'
import Trash from './views/trash'
import NotFound from './views/not-found'
import Login from './views/login'
import Signup from './views/signup'
import Admin from './views/admin'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <Router>
      <Switch>
        <ProtectedRoute component={FileManager} exact path="/" />
        <Route component={Login} exact path="/login" />
        <Route component={Signup} exact path="/signup" />
        <ProtectedRoute component={Home} exact path="/home" />
        <ProtectedRoute component={Shared} exact path="/shared" />
        <ProtectedRoute component={Recent} exact path="/recent" />
        <ProtectedRoute component={Trash} exact path="/trash" />
        <ProtectedRoute component={FileManager} exact path="/file-manager" />
        <ProtectedRoute component={Admin} exact path="/admin" />
        <ProtectedRoute component={NotFound} path="**" />
        <Redirect to="**" />
      </Switch>
    </Router>
  )
}

ReactDOM.render(<App />, document.getElementById('app'))
