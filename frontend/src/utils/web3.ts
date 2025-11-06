// 处理所有区块链相关的操作
import { ethers, Contract, BrowserProvider, JsonRpcSigner, formatEther as formatEth, parseEther as parseEth } from 'ethers';

// 声明全局类型
declare global {
  interface Window {
    ethereum?: any;
    web3Data?: {
      provider: BrowserProvider;
      signer: JsonRpcSigner;
      easyBet: Contract;
      betToken: Contract;
    };
  }
}

// 缓存变量
let provider: BrowserProvider | null = null;
let signer: JsonRpcSigner | null = null;
let easyBet: Contract | null = null;
let betToken: Contract | null = null;
let isInitializing = false;
let initializationPromise: Promise<boolean> | null = null;

// 检查是否已经连接
export const isWeb3Connected = (): boolean => {
  return !!(provider && signer && easyBet && betToken);
};

// 初始化 Web3 - 添加缓存和防重复初始化
export const initWeb3 = async (): Promise<boolean> => {
  // 如果已经在初始化，等待结果
  if (isInitializing && initializationPromise) {
    return await initializationPromise;
  }

  // 如果已经初始化，直接返回
  if (isWeb3Connected()) {
    return true;
  }

  isInitializing = true;
  initializationPromise = (async (): Promise<boolean> => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // 检查是否已经授权
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          // 如果没有授权，请求授权
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        }

        provider = new BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        return true;
      } catch (error) {
        console.error('Error initializing Web3:', error);
        isInitializing = false;
        initializationPromise = null;
        return false;
      }
    } else {
      alert('请安装 MetaMask 钱包!');
      isInitializing = false;
      initializationPromise = null;
      return false;
    }
  })();

  return await initializationPromise;
};

// 获取当前账户 - 优化版本
export const getAccount = async (): Promise<string> => {
  if (!window.ethereum) return '';
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || '';
  } catch (error) {
    console.error('获取账户失败:', error);
    return '';
  }
};

// 预加载合约 ABI 和地址
let contractAddresses: any = null;
let EasyBetABI: any = null;
let BetTokenABI: any = null;

const loadContractData = async () => {
  if (!contractAddresses) {
    contractAddresses = await import('../contracts/contract-addresses.json');
  }
  if (!EasyBetABI) {
    EasyBetABI = await import('../contracts/EasyBet.json');
  }
  if (!BetTokenABI) {
    BetTokenABI = await import('../contracts/BetToken.json');
  }
};

// 初始化合约 - 优化版本
export const initContracts = async (): Promise<boolean> => {
  if (!signer) {
    console.error('签名者未初始化');
    return false;
  }

  // 如果合约已经初始化，直接返回
  if (easyBet && betToken) {
    return true;
  }

  try {
    // 预加载合约数据
    await loadContractData();

    if (!contractAddresses?.EasyBet || !contractAddresses?.BetToken) {
      console.error('合约地址未定义!');
      return false;
    }

    if (!EasyBetABI?.abi || !BetTokenABI?.abi) {
      console.error('ABI 文件加载失败!');
      return false;
    }

    // 创建合约实例
    easyBet = new Contract(contractAddresses.EasyBet, EasyBetABI.abi, signer);
    betToken = new Contract(contractAddresses.BetToken, BetTokenABI.abi, signer);

    // 缓存到全局变量，方便调试
    window.web3Data = {
      provider: provider!,
      signer: signer!,
      easyBet,
      betToken
    };

    console.log('合约初始化成功');
    isInitializing = false;
    return true;
  } catch (error) {
    console.error('初始化合约失败:', error);
    isInitializing = false;
    initializationPromise = null;
    return false;
  }
};

// 批量初始化
export const initWeb3AndContracts = async (): Promise<boolean> => {
  const web3Success = await initWeb3();
  if (!web3Success) return false;

  const contractsSuccess = await initContracts();
  return contractsSuccess;
};

// 获取合约实例 - 添加安全检查
export const getEasyBet = (): Contract | null => {
  if (!easyBet) {
    console.warn('EasyBet 合约未初始化');
  }
  return easyBet;
};

export const getBetToken = (): Contract | null => {
  if (!betToken) {
    console.warn('BetToken 合约未初始化');
  }
  return betToken;
};

// 监听账户变化 - 优化版本
export const setupAccountChangeListener = (callback: (account: string) => void) => {
  if (window.ethereum) {
    // 移除旧的监听器
    window.ethereum.removeAllListeners('accountsChanged');
    
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      const newAccount = accounts[0] || '';
      console.log('账户变更:', newAccount);
      
      // 重置合约实例，因为签名者变了
      if (newAccount) {
        setTimeout(async () => {
          await initWeb3AndContracts();
          callback(newAccount);
        }, 100);
      } else {
        disconnectWeb3();
        callback('');
      }
    });

    // 监听网络变化
    window.ethereum.on('chainChanged', (chainId: string) => {
      console.log('网络变更:', chainId);
      window.location.reload();
    });
  }
};

// 断开连接 - 优化版本
export const disconnectWeb3 = () => {
  provider = null;
  signer = null;
  easyBet = null;
  betToken = null;
  isInitializing = false;
  initializationPromise = null;
  
  if (window.web3Data) {
    delete window.web3Data;
  }
  
  console.log('Web3 已断开连接');
};

// 工具函数 - 添加缓存和优化
const formatCache = new Map<string, string>();
const parseCache = new Map<string, bigint>();

export const formatEther = (value: string): string => {
  if (!value) return '0';
  
  const cached = formatCache.get(value);
  if (cached) return cached;
  
  try {
    const result = formatEth(value);
    formatCache.set(value, result);
    return result;
  } catch (error) {
    console.error('格式化 ETH 失败:', error, value);
    return '0';
  }
};

export const parseEther = (value: string): bigint => {
  if (!value || value === '0') return BigInt(0);
  
  const cached = parseCache.get(value);
  if (cached) return cached;
  
  try {
    const result = parseEth(value);
    parseCache.set(value, result);
    return result;
  } catch (error) {
    console.error('解析 ETH 失败:', error, value);
    return BigInt(0);
  }
};

// 批量读取合约数据 - 新增功能
export const batchReadContract = async (calls: Array<{ contract: Contract; method: string; args?: any[] }>) => {
  if (!provider) {
    throw new Error('Provider 未初始化');
  }

  try {
    const results = await Promise.all(
      calls.map(async ({ contract, method, args = [] }) => {
        try {
          const result = await contract[method](...args);
          return { success: true, data: result };
        } catch (error) {
          console.error(`调用 ${method} 失败:`, error);
          return { success: false, error };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error('批量读取失败:', error);
    throw error;
  }
};

// 健康检查
export const healthCheck = async (): Promise<boolean> => {
  if (!isWeb3Connected()) {
    return false;
  }

  try {
    // 简单的网络检查
    const network = await provider!.getNetwork();
    const account = await getAccount();
    
    return !!(network && account);
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
};