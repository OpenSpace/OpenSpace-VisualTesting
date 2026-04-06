import { BrowserRouter, Route,Routes } from 'react-router-dom';

import Compare from './pages/Compare';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<Home />} />
        <Route path={"/compare"} element={<Compare />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
