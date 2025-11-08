import mountainLogo from '@/assets/mountain.svg';
import './App.css';
import MiniChat from '@/components/MiniChat';

function App() {
  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={mountainLogo} className="logo" alt="Mountain logo" />
        </a>
      </div>
      <h2>BergRebels assistant</h2>
      <MiniChat />
    </>
  );
}

export default App;
