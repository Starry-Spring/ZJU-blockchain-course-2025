# ZJU-blockchain-course-2025

⬆ 可以️修改成你自己的项目名。

> 第二次作业要求（以下内容提交时可以删除）：
> 
> 进阶的去中心化彩票系统，参与方包括：竞猜玩家、公证人
>
> **背景**：传统的体育彩票系统（例如我国的体育彩票）一般没有彩票交易功能：例如，对于“NBA本赛季MVP为某球员/F1的赛季总冠军为某车队”这类持续时间长的事件的下注一般在赛季开始前就会买定离手，这使得一旦出现突发或不确定事件（如球员A赛季报销/球队B买入强力球星/C车队车手受伤等），很多玩家的选择便会立即失去意义，导致彩票游戏的可玩性下降。因此，一个有趣的探索方向是让彩票系统拥有合规、方便的交易功能。
>
> 建立一个进阶的去中心化彩票系统（可以是体育彩票，或其它任何比赛节目的竞猜，例如《中国好声音》《我是歌手》年度总冠军等，可以参考 [Polymarket](https://polymarket.com/) ），在网站中：
> - 公证人（你自己）可以创立许多竞猜项目：例如某场比赛的输赢、年度总冠军的得主等，每个项目应当有2个或多个可能的选项，一定的彩票总金额（由公证人提供），以及规定好的结果公布时间。
> - 玩家首先领取到测试所需以太币。在网站中，对于一个竞猜项目和多个可能的选项：
>   1. 每个竞彩玩家都可以选择其中的某个选项并购买一定金额（自己定义）的彩票，购买后该玩家会获得一张对应的彩票凭证（一个 ERC721 合约中的 Token）
>   2. 在竞彩结果公布之前，任何玩家之间可以买卖他们的彩票，以应对项目进行期间的任何突发状况。具体的买卖机制如下：一个玩家可以以指定的金额挂单出售（ERC721 Delegate）自己的彩票，其它玩家如果觉得该彩票有利可图就可以买入他的彩票。双方完成一次 ERC721 Token 交易。
>   3. 公证人可以在时间截止时（简单起见，你可以随时终止项目）输入竞猜的结果并进行结算。所有胜利的玩家可以平分奖池中的金额。
> - Bonus（最多5分，若想要完成，可以直接将功能整合进上述要求中）：
>   1. （2分）发行一个 ERC20 合约，允许用户领取 ERC20 积分，并使用ERC20积分完成上述流程。
>   2. （3分）对交易彩票的过程实现一个简单的链上订单簿：卖方用户可以以不同价格出售一种彩票，网页上显示当前订单簿的信息（多少价格有多少该彩票正在出售）。其他用户可以根据最优价格购买彩票。
> - 可以对上述需求进行合理更改和说明。请大家专注于功能实现，网站UI美观程度不纳入评分标准，能让用户能够舒适操作即可。

**以下内容为作业仓库的README.md中需要描述的内容。请根据自己的需要进行修改并提交。**

作业提交方式为：**提交视频文件**和**仓库的链接**到指定邮箱。

## 如何运行

补充如何完整运行你的应用。

1. 在本地启动ganache应用。

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```
3. 在 `./contracts` 中编译合约，运行如下的命令：
    ```bash
    npx hardhat compile
    ```
4. 在每次启动后端的时候如果发生了 ‘network error'，需要删除相关文件重新compile，然后再部署，如果没有问题可以直接部署，具体代码如下：
    ```
    # 如果遇到'network error'
    rm -rf artifacts
    rm -rf cache
    npx hardhat compile

    # 部署
    npx hardhat run scripts/deploy.ts --network ganache
    ```
5. 在 `./frontend` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```
6. 在 `./frontend` 中启动前端程序，运行如下的命令：
    ```bash
    npm run start
    ```

## 功能实现分析
### EasyBet:核心结构规定
在合约中，我一共规定了两种结构体，一种是活动的结构体，记录的是活动的创建者、标题、选项、持续时间等重要内容，并且通过一个计数器分配活动ID方便管理。另一种是彩票的结构体，记录了对应的活动ID，下注选项，所有者等信息，也会分配一个ticketId方便管理。具体代码如下：
```
struct Activity {
        address creator;
        string title;
        string[] choices;
        // ...
        uint256 totalPool;         // 总奖池金额
        uint256 endTime;
        uint256 winningChoice;    // 获胜选项
        bool isSettled;           // 是否已经结算
        uint256[] ticketIds;
    }

    struct Ticket {
        uint256 activityId;
        uint256 choice;           // 选择的选项索引
        uint256 purchasePrice;    // 购买价格
        address owner;
        uint256 listPrice;        // 挂单价格，为0表示未挂单
        bool isListed;            // 是否已挂单
    }
```
### ActivityList:活动管理
(注意，在前端每一个用到easybet的函数都需要先保证连接到了钱包否则直接报错)
#### 加载活动列表
前端展现时自动加载活动列表，直接调用后端合约的getActivitiesCount()函数，将活动都渲染到前端。这里的实现较为简单，不过多展现代码了。

#### 创建活动
每一个用户都可以自由创建活动，初识奖池统一定为从0开始，减轻创建活动账户的财产负担，方便流程。   
在前端，进行空标题、空选项和重复选项的检查，随后调用后端合约中的创建活动的函数。直接将前端传入的数值放到结构的对应位置并分配对应的活动ID,此时的活动还没有正确选项，一开始的也没有对应的彩票。具体的代码如下：
```
function createActivity(
        string calldata title,
        string[] memory choices,
        uint256 durationInHours
    ) external returns (bool) {
        require(choices.length >= 2, "At least 2 choices required");
        
        uint256 activityId = _activityIdCounter.current();
        uint256 endTime = block.timestamp + (durationInHours * 1 hours);
        
        activities[activityId] = Activity(
            msg.sender,        // creator
            title,             // title
            choices,           // choices
            0,                 // totalPool
            endTime,           // endTime
            0,                 // winningChoice
            false,             // isSettled
            new uint256[](0)   // ticketIds
        );
        
        _activityIdCounter.increment();
        // emit ActivityCreated(activityId, title, endTime);
        return true;
    }
```
#### 下注
为了与日常生活中彩票常采用一注一注购买的习惯相匹配，同时也为了灵活交易彩票，也就是买卖双方可以自由定义出售的彩票数量，我在下注时限定用户只能一注一注购买。同时，已经结算的活动不能再下注，这是通过前端直接将对应按钮设置成为灰色不允许再点击实现的。   
这里还要注意，由于虚拟货币原本应当基于去中心化机制，但是去中心化机制会导致强制要求只有双方都在线的情况下才能交易，因此，这里还是借助了平台，用户先授权给平台，允许平台帮忙转账，之后再让平台将钱转到对应奖池，也就是调用placeBet()函数。
前端部分代码如下：
```
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
```
后端如下：
```
function placeBet(uint256 activityId, uint256 choice) external activityExists(activityId) activityActive(activityId) {
        Activity storage activity = activities[activityId];
        require(choice < activity.choices.length, "Invalid choice");
        
        // 下注金额：1 ETH 等值的代币
        uint256 betAmount = 1 ether;
        // betToken.approve(msg.sender, betAmount);
        require(betToken.transferFrom(msg.sender, address(this), betAmount), "Token transfer failed");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _mint(msg.sender, tokenId);
        
        tickets[tokenId] = Ticket({
            activityId: activityId,
            choice: choice,
            purchasePrice: betAmount,
            owner: msg.sender,
            listPrice: 0,
            isListed: false
        });
        
        activity.totalPool += betAmount;
        choicePool[activityId][choice] += betAmount;
        activity.ticketIds.push(tokenId);
        
        emit BetPlaced(tokenId, activityId, choice, msg.sender);
    }
```

#### 提前结束活动
为了管理和最终演示的方便，活动创建者可以选择提前结束活动。这里会采用多步提醒的方式，告知用户活动一旦被结束就无法撤销。如果用户确定结束活动，则会调用合约的earlyCloseActivity()函数，将endTime直接置为当前时间。    
具体代码如下：
```
function earlyCloseActivity(uint256 activityId) external activityExists(activityId) {
        Activity storage activity = activities[activityId];
        require(msg.sender == activity.creator, "Only creator can close early");
        require(!activity.isSettled, "Activity already settled");
        require(block.timestamp < activity.endTime, "Activity already ended");
        
        // 将结束时间设置为当前时间
        activity.endTime = block.timestamp;
        
        emit ActivityEarlyClosed(activityId);
    }
```

#### 活动结算功能
当提前结束或者正常结束活动之后，活动创建者就可以进入活动的结算环节。活动结算分为两种，一种是发起者因为特殊原因放弃该活动，选择流拍，所有货币原路退回原账户；另一种就是正常结算，奖池中的货币由胜利者平分，直接加到对应账户。
1. 流拍
调用cancelActivity(),使用不存在的选项索引表示流拍，将isSettle的指定为true,表示活动结束，随后将货币原路退回，代码如下：
```
function cancelActivity(uint256 activityId) external activityExists(activityId) {
        Activity storage activity = activities[activityId];
        require(msg.sender == activity.creator, "Only creator can cancel");
        require(!activity.isSettled, "Activity already settled");
        require(block.timestamp >= activity.endTime, "Activity not ended yet");
        
        activity.isSettled = true;
        activity.winningChoice = type(uint256).max; // 使用最大值表示流拍
        
        // 退还所有下注
        for (uint256 i = 0; i < activity.ticketIds.length; i++) {
            uint256 ticketId = activity.ticketIds[i];
            address ticketOwner = ownerOf(ticketId);
            betToken.transfer(ticketOwner, tickets[ticketId].purchasePrice);
        }
        
        emit ActivityCancelled(activityId);
    }
```
2. 结算
和流拍功能不同的是这里要选择获胜的选项，随后调用settleActivity()函数，最后奖金时平分的,代码如下：
```
function settleActivity(uint256 activityId, uint256 winningChoice) external  activityExists(activityId) {
        Activity storage activity = activities[activityId];
        require(block.timestamp >= activity.endTime, "Activity not ended yet");
        require(!activity.isSettled, "Already settled");
        require(winningChoice < activity.choices.length, "Invalid winning choice");
        require(activity.creator == msg.sender, "Only creator can settle");
        activity.winningChoice = winningChoice;
        activity.isSettled = true;
        
        // 计算并分配奖金
        uint256 winningPool = choicePool[activityId][winningChoice];
        if (winningPool > 0) {
            uint256 totalWinningTickets = 0;
            
            // 统计中奖彩票数量
            for (uint256 i = 0; i < activity.ticketIds.length; i++) {
                uint256 ticketId = activity.ticketIds[i];
                if (tickets[ticketId].choice == winningChoice) {
                    totalWinningTickets++;
                }
            }
            
            // 分配奖金
            if (totalWinningTickets > 0) {
                uint256 share = activity.totalPool / totalWinningTickets;
                for (uint256 i = 0; i < activity.ticketIds.length; i++) {
                    uint256 ticketId = activity.ticketIds[i];
                    if (tickets[ticketId].choice == winningChoice) {
                        address winner = ownerOf(ticketId);
                        betToken.transfer(winner, share);
                    }
                }
            }
        }
        
        emit ActivitySettled(activityId, winningChoice);
    }
```

### UserProfile: 用户管理
#### 领取代币
我在实验过程中发现，由于过程中会收取gas费用，下注次数也不限制，多实验几次分配的以太币消耗很快，再加上实验加分点要求思考积分实现，因此我直接采用了积分，也就是这里的代币来实现所有交易。点击领取代币就可以申请与领取代币，通过调用合约的claimTokens()函数,实现了这一功能，具体代码如下：
```
function claimTokens() external {
        _mint(msg.sender, 1000 * 10**decimals());
    }
```

#### 挂单
用户允许对自己买下的彩票自定义售价挂单。通过调用listTicket()函数，传入金额和对应彩票的标识，实现挂单（会有一个"已出售"表示挂单状态）。具体代码如下：
```
function listTicket(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(price > 0, "Price must be positive");
        
        Ticket storage ticket = tickets[tokenId];
        Activity storage activity = activities[ticket.activityId];
        require(!activity.isSettled, "Activity already settled");
        require(block.timestamp < activity.endTime, "Activity has ended");
        
        ticket.listPrice = price;
        ticket.isListed = true;
        
        emit TicketListed(tokenId, price, msg.sender);
    }
```

#### 买单
用户可以买市场中出售的彩票.（但是不可以买自己挂的单，事实上，自己的挂单不会在自己的彩票市场中显示，这是前端逻辑保证的）同样的，这里需要线授权允许使用代币，随后钱包将钱转过去。授权也就是调用了approve函数，而最后的实现加一则是调用了后端的buyTicket。成功后，彩票将出现在买家彩票界面，而不会在买家界面，对应货币也会直接加减。   
前端代码：
```
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
```
后端代码：
```
function buyTicket(uint256 tokenId) external {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.isListed, "Ticket not listed for sale");
        require(ownerOf(tokenId) != msg.sender, "Cannot buy your own ticket");
        
        Activity storage activity = activities[ticket.activityId];
        require(!activity.isSettled, "Activity already settled");
        require(block.timestamp < activity.endTime, "Activity has ended");
        
        uint256 price = ticket.listPrice;
        require(betToken.transferFrom(msg.sender, ownerOf(tokenId), price), "Token transfer failed");
        
        address seller = ownerOf(tokenId);
        _transfer(seller, msg.sender, tokenId);
        
        ticket.owner = msg.sender;
        ticket.isListed = false;
        ticket.listPrice = 0;
        
        emit TicketSold(tokenId, price, seller, msg.sender);
    }
```

#### 取消挂单
如果用户不想挂单了，也可以取消挂单，注意，只有所有者才可以取消挂单。这里的操作是设置价格为0，调用cancelListing()函数，随后在前端判断状态(isListed)，改为"未出售"。具体实现如下：
```
function cancelListing(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        Ticket storage ticket = tickets[tokenId];
        Activity storage activity = activities[ticket.activityId];
        require(!activity.isSettled, "Activity already settled");
        require(ticket.isListed, "Ticket not listed");

        ticket.listPrice = 0;
        ticket.isListed = false;

        // 使用 TicketListed 事件也可以，price 为 0 表示已取消；或你也可以新增 TicketUnlisted 事件
        emit TicketListed(tokenId, 0, msg.sender);
    }
```

## 项目运行截图
### 领取代币
领取成功显示：
![bet](./pics/bet.png)

### 创建活动
账户端确认创建活动之后输出的成功的弹窗：
![crea_suc](./pics/crea_suc.png)
账户端创建活动后各个用户都能看见这个活动：
![crea_res](./pics/crea_res.png)

### 提前结束活动
点击提前结算活动后会出来提示框提醒用户该步骤不可撤销，用户点击确认后待合约确认就可以提前结算活动。   
点击提前结算活动的提示：
![adv](./pics/adv.png)
提前结算活动合约确认后的成功提示：
![adv_suc](./pics/adv_suc.png)

### 活动结束后的结算
1. 结算活动  
结算成功的弹窗提示：
![cal_suc](./pics/cal_suc.png)
结算成功后显示胜利选项：
![cal_res](./pics/cal_res.png)
正确的结算金额（视频中可以看到）：   
奖池中一共有5代币，其中account3一共买了3张，有关这个活动的买了2张错误选项的。account4以2元买了两张胜利选项的，并将其中一张胜利选项的以2元卖出给account5。account5买了一张错误选项的，又用2元买了一张正确选项的。因此，活动的截止时，一共有两张正确的彩票，分别是account4一张，account5一张，account3剩余2997元，account4剩余1000元，account5剩余997元。结算后，两人平分奖池，account4为1002.5元，account5为999.5元，而account3不变，具体结果如下：
account3:
![cal3](./pics/cal3.png)
account4:
![cal4](./pics/cal4.png)
account5:
![cal5](./pics/cal5.png)


2. 活动流拍
流拍成功的弹窗显示：
![quit](./pics/quit.png)
流拍成功后的结果显示（奖池归零，会显示流拍状态）：
![quit_res](./pics/quit_res.png)

### 下注
下注成功弹窗显示：
![place_suc](./pics/place_suc.png)
下注成功后我的彩票显示（状态是未出售）：
![place_res](./pics/place_res.png)
### 挂单
挂单成功弹窗显示：
![sell_suc](./pics/sell_suc.png)
挂单成功后的显示（状态是已出售）：
![sell_res](./pics/sell_res.png)

### 买单
购买非自己出手的市场中的彩票：   
购买成功的弹窗显示：
![buy_suc](./pics/buy_suc.png)
购买后的结果（多出相应彩票，账户减少相应余额）：
![buy_res](./pics/buy_res.png)

### 取消下注
取消成功的截图：
![sell_cal_suc](./pics/sell_cal_suc.png)
之后的显示结果（回到未出售的状态）：
![sell_cal_res](./pics/sell_cal_res.png)



## 参考内容

- 课程的参考Demo见：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)。

- 快速实现 ERC721 和 ERC20：[模版](https://wizard.openzeppelin.com/#erc20)。记得安装相关依赖 ``"@openzeppelin/contracts": "^5.0.0"``。

- 如何实现ETH和ERC20的兑换？ [参考讲解](https://www.wtf.academy/en/docs/solidity-103/DEX/)

如果有其它参考的内容，也请在这里陈列。
