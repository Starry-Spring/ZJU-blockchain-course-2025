// 显示所有竞猜活动列表的组件
import React, { useState, useEffect } from 'react';
import { getEasyBet, getBetToken, formatEther, parseEther } from '../utils/web3';
import { Activity } from '../types';
interface UserProfileProps {
  account: string;
}
const ActivityList: React.FC<UserProfileProps> = ({ account }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    choices: ['', ''],
    duration: 24 // 小时
  });
  const [settlingActivity, setSettlingActivity] = useState<number | null>(null); // 修复拼写
  const [winningChoice, setWinningChoice] = useState<string>(''); 
  const [earlyClosingActivity, setEarlyClosingActivity] = useState<number | null>(null);
  const easyBet = getEasyBet();
  const betToken = getBetToken();

  // 添加新选项
  const addChoice = () => {
    setNewActivity({
      ...newActivity,
      choices: [...newActivity.choices, '']
    });
  };

  // 删除选项
  const removeChoice = (index: number) => {
    if (newActivity.choices.length <= 2) {
      alert('至少需要两个选项');
      return;
    }
    const newChoices = newActivity.choices.filter((_, i) => i !== index);
    setNewActivity({
      ...newActivity,
      choices: newChoices
    });
  };

  // 更新选项内容
  const updateChoice = (index: number, value: string) => {
    const newChoices = [...newActivity.choices];
    newChoices[index] = value;
    setNewActivity({
      ...newActivity,
      choices: newChoices
    });
  };

  // 创建新活动
  const createActivity = async () => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    // 验证输入
    if (!newActivity.title.trim()) {
      alert('请输入活动标题');
      return;
    }

    // 过滤空选项并验证
    const validChoices = newActivity.choices.filter(choice => choice.trim() !== '');
    if (validChoices.length < 2) {
      alert('至少需要两个有效选项');
      return;
    }

    // 检查重复选项
    const uniqueChoices = new Set(validChoices.map(choice => choice.trim().toLowerCase()));
    if (uniqueChoices.size !== validChoices.length) {
      alert('选项不能重复');
      return;
    }

    try {
      console.log('创建新活动');
      const tx = await easyBet.createActivity(
        newActivity.title.trim(), 
        validChoices, 
        newActivity.duration,
      );
      await tx.wait();
      
      alert('活动创建成功!');

      setShowCreateForm(false);
      loadActivities(); // 重新加载活动列表
    } catch (error) {
      console.error('创建活动失败:', error);
      alert('创建活动失败，请查看控制台');
    }
  };

  // 加载活动列表
  const loadActivities = async () => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    console.log('合约目标地址:', easyBet.target);
    
    setLoading(true);
    try {
      console.log('加载活动列表');
      // getActivitiesCount 返回 BigInt，先转 number
      const countBN = await easyBet.getActivitiesCount();
      const count = Number(countBN);
      console.log('总活动数量:', count); // 重点看这个
      const activityList: Activity[] = [];

      for (let i = 0; i < count; i++) {
       const raw = await easyBet.getActivity(i);
        // raw 中的 uint256 字段是 BigInt，统一转换为字符串，方便前端处理
        const normalized = {
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
      
      setActivities(activityList);
    } catch (error) {
      console.error('加载活动失败:', error);
      alert('加载活动失败，请检查控制台');
    }
    setLoading(false);
  };

  // 下注功能
  const placeBet = async (activityId: number, choice: number) => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    try {
      // 先授权代币
      console.log('批准合约花费 1 BET 代币');
      if (betToken) {
        const approveTx = await betToken.approve(easyBet.target, parseEther("1"));
        await approveTx.wait();
      }

      const tx = await easyBet.placeBet(activityId, choice);
      await tx.wait();
      
      alert('下注成功!');
      loadActivities(); // 重新加载活动列表
    } catch (error) {
      console.error('下注失败:', error);
      alert('下注失败，请查看控制台');
    }
  };

  // 提前结束活动
  const earlyCloseActivity = async (activityId: number) => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    if (!window.confirm('确定要提前结束这个活动吗？此操作不可撤销！')) {
      return;
    }

    try {
      console.log('提前结束活动');
      const tx = await easyBet.earlyCloseActivity(activityId);
      await tx.wait();
      
      alert('活动已提前结束!');
      setEarlyClosingActivity(null);
      loadActivities();
    } catch (error) {
      console.error('提前结束失败:', error);
      alert('提前结束失败，请查看控制台');
    }
  };

  // 流拍功能 - 退还所有下注
  const cancelActivity = async (activityId: number) => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    try {
      console.log('流拍活动，退还下注');
      // 这里需要合约支持流拍功能，需要在合约中添加 cancelActivity 函数
      // 暂时用 settleActivity 实现，选择不存在的选项作为流拍标识
      const tx = await easyBet.cancelActivity(activityId); // 使用不存在的选项索引表示流拍
      await tx.wait();
      
      alert('活动已流拍，资金已退还!');
      loadActivities();
    } catch (error) {
      console.error('流拍失败:', error);
      alert('流拍失败，请查看控制台');
    }
  };


  // 结算活动
  const settleActivity = async (activityId: number) => {
    if (!easyBet) {
      alert('请先连接钱包');
      return;
    }

    if (!winningChoice.trim()) {
      alert('请选择获胜选项');
      return;
    }

    try {
      console.log('结算活动');
      const tx = await easyBet.settleActivity(activityId, parseInt(winningChoice));
      await tx.wait();
      
      alert('活动结算成功!');
      setSettlingActivity(null);
      setWinningChoice('');
      loadActivities();
    } catch (error) {
      console.error('结算失败:', error);
      alert('结算失败，请查看控制台');
    }
  };
  

  useEffect(() => {
    if (easyBet) {
      loadActivities();
    }
  }, [easyBet]);

  const formatTime = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const isActivityEnded = (endTime: string) => {
    return Date.now() > parseInt(endTime) * 1000;
  };


  return (
    <div style={{ padding: '20px' }}>
      <h2>📋 竞猜活动列表</h2>
      <button onClick={loadActivities} disabled={loading}>
        {loading ? '加载中...' : '刷新活动'}
      </button>

      <p></p>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {showCreateForm ? '取消创建' : '➕ 创建新活动'}
        </button>

        {showCreateForm && (
          <div style={{
            border: '1px solid #ddd',
            padding: '20px',
            marginTop: '15px',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <h3>创建新活动</h3>
            <div style={{ marginBottom: '10px' }}>
              <input
                placeholder="活动标题"
                value={newActivity.title}
                onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                style={{ width: '300px', padding: '8px', marginRight: '10px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                竞猜选项 ({newActivity.choices.length} 个):
              </label>
              
              {newActivity.choices.map((choice, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  gap: '10px'
                }}>
                  <input
                    placeholder={`选项 ${index + 1}`}
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    style={{ 
                      flex: 1,
                      padding: '8px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                  {newActivity.choices.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeChoice(index)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addChoice}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                ➕ 添加选项
              </button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span>持续时间: </span>
              <select 
                value={newActivity.duration}
                onChange={(e) => setNewActivity({...newActivity, duration: parseInt(e.target.value)})}
              >
                <option value={1}>1小时</option>
                <option value={24}>24小时</option>
                <option value={168}>7天</option>
              </select>
            </div>
            <button 
              onClick={createActivity}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              创建活动
            </button>
          </div>
        )}
      </div>

      
      <div style={{ marginTop: '20px' }}>
        {activities.map((activity, index) => {
          const isEnded = isActivityEnded(activity.endTime);
          const isSettled = activity.isSettled;
          const winningIndex = isSettled ? parseInt(activity.winningChoice || '-1', 10) : -1;
          const isCreator = account.toLowerCase() === (activity.creator || '').toLowerCase();
          // console.log(activity);
          return (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '15px', 
              margin: '10px 0',
              borderRadius: '8px',
              backgroundColor: isSettled ? '#f8f9fa' : '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3>{activity.title} {isSettled && '🏆'}</h3>
              <p><strong>创建者:</strong> {activity.creator?.slice(0, 6)}...{activity.creator?.slice(-4)}</p>
              <p><strong>结束时间:</strong> {formatTime(activity.endTime)}</p>
              <p><strong>奖池:</strong> {formatEther(activity.totalPool)} BET</p>
              <p><strong>状态:</strong> 
                {isSettled ? '已结束' : isEnded ? '等待结算' : '进行中'}
              </p>
              
              <div>
                <strong>选项:</strong>
                {activity.choices.map((choice, choiceIndex) => (
                  <div key={choiceIndex} style={{ margin: '5px 0' }}>
                    <button 
                      onClick={() => placeBet(index, choiceIndex)}
                      disabled={isSettled || isEnded}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isSettled || isEnded ? 'not-allowed' : 'pointer',
                        opacity: isSettled || isEnded ? 0.6 : 1,
                        marginRight: '10px'
                      }}
                    >
                      下注 {choice} (1 BET)
                    </button>
                  </div>
                ))}
              </div>

              {/* 提前结束活动按钮 - 放在结算按钮之前 */}
              {!isEnded && !isSettled && isCreator && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px', border: '1px solid #ffb74d' }}>
                  <h4 style={{ color: '#e65100', marginBottom: '10px' }}>活动管理</h4>
                  {earlyClosingActivity === index ? (
                    <div>
                      <p style={{ color: '#856404', marginBottom: '10px', fontWeight: 'bold' }}>
                        ⚠️ 确定要提前结束这个活动吗？活动将立即进入等待结算状态，此操作不可撤销！
                      </p>
                      <button 
                        onClick={() => earlyCloseActivity(index)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        确认提前结束
                      </button>
                      <button 
                        onClick={() => setEarlyClosingActivity(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#757575',
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
                    <button 
                      onClick={() => setEarlyClosingActivity(index)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ⏰ 提前结束活动
                    </button>
                  )}
                </div>
              )}

              {isEnded && !isSettled && isCreator && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <h4>结算活动</h4>
                  {settlingActivity === index ? (
                    <div>
                      <select 
                        value={winningChoice}
                        onChange={(e) => setWinningChoice(e.target.value)}
                        style={{ padding: '8px', marginRight: '10px' }}
                      >
                        <option value="">选择获胜选项</option>
                        {activity.choices.map((choice, choiceIndex) => (
                          <option key={choiceIndex} value={choiceIndex}>
                            {choice}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={() => settleActivity(index)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '10px'
                        }}
                      >
                        确认结算
                      </button>
                      <button 
                        onClick={() => cancelActivity(index)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        流拍退款
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSettlingActivity(index)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      开始结算
                    </button>
                  )}
                </div>
              )}

              {isSettled && winningIndex >= 0 && winningIndex < activity.choices.length && (
                <p style={{ color: 'green', fontWeight: 'bold' }}>
                  🎉 获胜选项: {activity.choices[winningIndex]}
                </p>
              )}
            </div>
          );
        })}
        
        {activities.length === 0 && !loading && (
          <p>暂无活动，请先部署合约并创建活动</p>
        )}
      </div>
    </div>
  );
};

export default ActivityList;