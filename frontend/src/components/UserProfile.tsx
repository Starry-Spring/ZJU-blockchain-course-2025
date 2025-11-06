// 用户个人资料组件，显示用户的 BET 余额和所持有的彩票，并提供领取测试代币和挂单出售彩票的功能
import React, { useState, useEffect } from 'react';
import { getEasyBet, getBetToken, formatEther, parseEther } from '../utils/web3';
import { Ticket,TicketOnsale} from '../types';
import { Activity } from '../types';
interface UserProfileProps {
  account: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ account }) => {
  const [balance, setBalance] = useState<string>('0');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [listingTicket, setListingTicket] = useState<number | null>(null);
  const [listPrice, setListPrice] = useState<string>('1.5');
  const [marketTickets, setMarketTickets] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const easyBet = getEasyBet();
  const betToken = getBetToken();

  const loadUserData = async () => {
    if (!betToken || !easyBet) {
      alert('合约未初始化');
      return;
    }
    
    setLoading(true);
    try {
      // 获取代币余额
      console.log('加载用户数据');
      const tokenBalance = await betToken.balanceOf(account);
      setBalance(formatEther(tokenBalance));

      // 获取用户彩票
      const ticketCount = await easyBet.getTicketsCount();
      const userTickets: Ticket[] = [];
      
      for (let i = 0; i < Number(ticketCount); i++) {
        const ticket = await easyBet.getTicket(i);
        if (ticket.owner.toLowerCase() === account.toLowerCase()) {
          userTickets.push(ticket);
        }
      }
      
      setTickets(userTickets);

      // 加载市场中的彩票
      await loadMarketTickets();
      // 加载活动信息
      await loadActivities();
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
    setLoading(false);
  };

  // 加载市场中的彩票
  const loadMarketTickets = async () => {
    if (!easyBet) return;

    try {
      console.log('加载市场彩票');
      const ticketCount = await easyBet.getTicketsCount();
      const marketTicketsList:TicketOnsale[] = [];

      for (let i = 0; i < Number(ticketCount); i++) {
        const ticket = await easyBet.getTicket(i);
        // console.log('检查彩票:', ticket);
        if (ticket.isListed && ticket.owner.toLowerCase() !== account.toLowerCase()) {
          marketTicketsList.push(
            {
              activityId: ticket.activityId,
              choice: ticket.choice,
              purchasePrice: ticket.purchasePrice,
              owner: ticket.owner,
              listPrice: ticket.listPrice,
              isListed: ticket.isListed,
              tokenId: i
        });
        }
      }

      setMarketTickets(marketTicketsList);
    } catch (error) {
      console.error('加载市场彩票失败:', error);
    }
  };

  // 加载活动信息
  const loadActivities = async () => {
    if (!easyBet) return;

    try {
      console.log('加载活动信息');
      const countBN = await easyBet.getActivitiesCount();
      const count = Number(countBN);
      const activityList = [];

      for (let i = 0; i < count; i++) {
        const raw = await easyBet.getActivity(i);
        const normalized = {
          activityId: i,
          creator: raw.creator,
          title: raw.title,
          choices: raw.choices, // string[]
          endTime: raw.endTime.toString(),       // "timestamp" as string
          totalPool: raw.totalPool.toString(),   // wei as string
          isSettled: raw.isSettled,
          winningChoice: raw.winningChoice.toString(),
          // 如果需要其他字段可以在这里加
        };
        activityList.push(normalized as unknown as Activity);

      }
      // console.log('加载的活动列表:', activityList);
      setActivities(activityList);
    } catch (error) {
      console.error('加载活动失败:', error);
    }
  };

  const claimTokens = async () => {
    // console.log('领取代币按钮点击');  
    if (!betToken) return;
    
    try {
      console.log('领取 1000 BET 测试代币');
      const tx = await betToken.claimTokens();
      await tx.wait();
      alert('成功领取 1000 BET 测试代币!');
      loadUserData();
    } catch (error) {
      console.error('领取代币失败:', error);
      alert('领取代币失败');
    }
  };

  // 挂单出售彩票
  const listTicket = async (tokenId: number) => {
    if (!easyBet) return;
    
    if (!listPrice || parseFloat(listPrice) <= 0) {
      alert('请输入有效的价格');
      return;
    }

    try {
      console.log('挂单出售彩票');
      const tx = await easyBet.listTicket(tokenId, parseEther(listPrice));
      await tx.wait();
      alert('挂单成功!');
      setListingTicket(null);
      setListPrice('1.5');
      loadUserData();
    } catch (error) {
      console.error('挂单失败:', error);
      alert('挂单失败');
    }
  };

  // 取消挂单
  const cancelListing = async (tokenId: number) => {
    if (!easyBet) return;
    
    try {
      // 设置价格为0来取消挂单
      console.log('取消挂单');
      const tx = await easyBet.cancelListing(tokenId);
      await tx.wait();
      alert('取消挂单成功!');
      loadUserData();
    } catch (error) {
      console.error('取消挂单失败:', error);
      alert('取消挂单失败');
    }
  };

  // 购买市场中的彩票
  const buyMarketTicket = async (tokenId: number) => {
    if (!easyBet) return;
    
    try {
      console.log('购买市场彩票');
      const ticket = await easyBet.getTicket(tokenId);
      const price = ticket.listPrice.toString();
      if(!betToken)return;
      // 先授权代币
      const approveTx = await betToken.approve(easyBet.target, price);
      await approveTx.wait();
      console.log('代币授权成功');
      const tx = await easyBet.buyTicket(tokenId);
      await tx.wait();
      
      alert('购买彩票成功!');
      loadUserData();
    } catch (error) {
      console.error('购买彩票失败:', error);
      alert('购买彩票失败');
    }
  };

  // 获取活动标题
  const getActivityTitle = (activityId: number) => {
    const activity = activities.find(a => a.activityId === activityId);
    console.log('获取活动标题:', activity);
    return activity ? activity.title : `活动 ${activityId}`;
  };

  // 获取活动选项
  const getActivityChoice = (activityId: number, choiceIndex: number) => {
    const activity = activities.find(a => a.activityId === activityId);
    return activity && activity.choices[choiceIndex] ? activity.choices[choiceIndex] : `选项 ${choiceIndex}`;
  };

  useEffect(() => {
    if (account && betToken && easyBet) {
      loadUserData();
    }
  }, [account, betToken, easyBet]);

  return (
    <div style={{ padding: '20px', borderTop: '1px solid #ccc' }}>
      <h2>👤 我的账户</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>BET 余额:</strong> {balance}</p>
        <button 
          onClick={claimTokens} 
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          领取 1000 BET 测试代币
        </button>
        <button 
          onClick={loadUserData} 
          disabled={loading} 
          style={{ 
            marginLeft: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          刷新余额
        </button>
      </div>

      <h3>我的彩票 ({tickets.length} 张)</h3>
      {tickets.map((ticket, index) => (
        <div key={index} style={{ 
          border: '1px solid #eee', 
          padding: '10px', 
          margin: '5px 0',
          borderRadius: '5px',
          backgroundColor: '#f9f9f9'
        }}>
          <p><strong>彩票 #{index}</strong></p>
          <p>活动: {getActivityTitle(parseInt(ticket.activityId))}</p>
          <p>选项: {getActivityChoice(parseInt(ticket.activityId), parseInt(ticket.choice))}</p>
          <p>状态: {ticket.isListed ? '🟢 出售中 - ' + formatEther(ticket.listPrice) + ' BET' : '🔴 未出售'}</p>
          
          {listingTicket === index ? (
            <div style={{ marginTop: '10px' }}>
              <input
                type="number"
                step="0.1"
                placeholder="出售价格"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                style={{ 
                  padding: '6px', 
                  marginRight: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <button 
                onClick={() => listTicket(index)}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginRight: '10px'
                }}
              >
                确认挂单
              </button>
              <button 
                onClick={() => setListingTicket(null)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
            </div>
          ) : (
            <div>
              {!ticket.isListed ? (
                <button 
                  onClick={() => setListingTicket(index)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginRight: '10px'
                  }}
                >
                  挂单出售
                </button>
              ) : (
                <button 
                  onClick={() => cancelListing(index)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  取消挂单
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      
      {tickets.length === 0 && !loading && (
        <p>暂无彩票，快去下注吧！</p>
      )}

      <h3>🎪 彩票市场 ({marketTickets.length} 张)</h3>
      {marketTickets.map((ticket, index) => {
        // console.log('市场彩票:', ticket);
        return (
        <div key={index} style={{ 
          border: '1px solid #ddd', 
          padding: '10px', 
          margin: '5px 0',
          borderRadius: '5px',
          backgroundColor: '#e7f3ff'
        }}>
          <p><strong>彩票 #{ticket.tokenId}</strong></p>
          <p>活动: {getActivityTitle(parseInt(ticket.activityId))}</p>
          <p>选项: {getActivityChoice(parseInt(ticket.activityId), parseInt(ticket.choice))}</p>
          <p>售价: {formatEther(ticket.listPrice)} BET</p>
          <p>卖家: {ticket.owner.slice(0, 6)}...{ticket.owner.slice(-4)}</p>
          
          <button 
            onClick={() => buyMarketTicket(ticket.tokenId)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            购买彩票
          </button>
        </div>
        );
      })}
      
      {marketTickets.length === 0 && !loading && (
        <p>市场暂无彩票出售</p>
      )}
    </div>
  );
};


export default UserProfile;