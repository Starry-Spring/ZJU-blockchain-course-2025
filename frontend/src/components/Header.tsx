// 顶部导航栏组件，包含应用标题和钱包连接功能
import React from 'react';
import { getAccount, initWeb3, initContracts } from '../utils/web3';

interface HeaderProps {
  account: string | null;
  onAccountChange: (account: string | null) => void;
}

const Header: React.FC<HeaderProps> = ({ account, onAccountChange }) => {
  const connectWallet = async () => {
    const web3Success = await initWeb3();
    if (web3Success) {
      const contractsSuccess = await initContracts();
      if (contractsSuccess) {
        const account = await getAccount();
        onAccountChange(account);
      }
    }
  };

  const disconnectWallet = () => {
    onAccountChange(null);
  };

  const switchAccount = async () => {
    if (window.ethereum) {
      try {
        // 请求切换账户
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        // 切换账户后需要重新初始化合约
        await initContracts();
        const newAccount = await getAccount();
        onAccountChange(newAccount);
      } catch (error) {
        console.error('切换账户失败:', error);
      }
    }
  };

  return (
    <header style={{ 
      padding: '20px', 
      borderBottom: '1px solid #ccc',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ margin: 0, color: '#333' }}>🎯 EasyBet - 去中心化彩票平台</h1>
      <div>
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>账户: {account.slice(0, 6)}...{account.slice(-4)}</span>
            <button 
              onClick={switchAccount}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              切换账户
            </button>
            <button 
              onClick={disconnectWallet}
              style={{
                padding: '8px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              断开连接
            </button>
          </div>
        ) : (
          <button 
            onClick={connectWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            连接 MetaMask 钱包
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;