import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import ActivityList from './components/ActivityList';
import UserProfile from './components/UserProfile';
import { getAccount, setupAccountChangeListener, disconnectWeb3, initContracts } from './utils/web3';

function App() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      const currentAccount = await getAccount();
      if (currentAccount) {
        await initContracts();
        setAccount(currentAccount);
      }
    };
    
    checkConnection();

    // 监听账户变化 - 创建异步处理函数
    const handleAccountChange = async (newAccount: string) => {
      if (newAccount) {
        // 账户变化时重新初始化合约
        await initContracts();
        setAccount(newAccount);
      } else {
        setAccount(null);
      }
    };

    setupAccountChangeListener(handleAccountChange);

  }, []);

  const handleAccountChange = (newAccount: string | null) => {
    setAccount(newAccount);
    if (!newAccount) {
      disconnectWeb3(); // 真正断开连接
    }
  };

  return (
    <div className="App">
      <Header account={account} onAccountChange={handleAccountChange} />
      
      {account ? (
        <div>
          <ActivityList account={account}/>
          <UserProfile account={account} />
        </div>
      ) : (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2>欢迎来到 EasyBet 🎯</h2>
          <p>一个去中心化的彩票交易平台</p>
          <p>请连接您的 MetaMask 钱包开始使用</p>
          <div style={{ marginTop: '20px' }}>
            <p><small>功能包括：创建活动、下注竞猜、彩票交易、奖池分配</small></p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;