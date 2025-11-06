// 类型定义文件，定义整个应用中使用的数据类型
import { ethers } from 'ethers';

export interface Activity {
  creator: string;
  title: string;
  choices: string[];
  totalPool: string;  // 改为 string，前端处理转换
  endTime: string;    // 改为 string
  winningChoice: string;
  isSettled: boolean;
  ticketIds: string[];
}

export interface Ticket {
  activityId: string;
  choice: string;
  purchasePrice: string;
  owner: string;
  listPrice: string;
  isListed: boolean;
}
export interface TicketOnsale {
  tokenId: number;
  activityId: string;
  choice: string;
  purchasePrice: string;
  owner: string;
  listPrice: string;
  isListed: boolean;
}


export interface Web3State {
  account: string | null;
  easyBet: ethers.Contract | null;
  betToken: ethers.Contract | null;
  isConnected: boolean;
  loading: boolean;
}