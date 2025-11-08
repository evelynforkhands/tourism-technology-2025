import { useState } from 'react';
import './App.css';
import { Button } from '@/components/ui/button';
import Chatbot from "./Chatbot";

function App() {
  const [count, setCount] = useState(0);

//   return (
//     <>
// <Button variant="outline" onClick={() => alert('Hello, WXT!')}>Click me</Button>

//       <h1>WXT + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 5)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the WXT and React logos to learn more
//       </p>
//     </>
//   );
return (
    <div className="w-[400px] h-[600px]">
      <Chatbot />
    </div>
  );
}

export default App;
