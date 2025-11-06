// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment the line to use openzeppelin/ERC721,ERC20
// You can use this dependency directly because it has been installed by TA already
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract EasyBet is ERC721, Ownable {
    using Counters for Counters.Counter;

    // use a event if you want
    event BetPlaced(uint256 tokenId, uint256 activityId, uint256 choice, address owner); // 下注函数
    event ActivityCreated(uint256 activityId, string title, uint256 endTime); // 创建活动
    event TicketListed(uint256 tokenId, uint256 price, address seller); // 列出票据
    event TicketSold(uint256 tokenId, uint256 price, address seller, address buyer); // 出售票据
    event ActivitySettled(uint256 activityId, uint256 winningChoice); // 活动结算
    event ActivityCancelled(uint256 activityId); // 活动流拍
    event ActivityEarlyClosed(uint256 activityId); // 活动提前结束


    // maybe you need a struct to store some activity information
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

    // 计数器
    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _activityIdCounter;

    mapping(uint256 => Activity) public activities; // A map from activity-index to its information
    mapping(uint256 => Ticket) public tickets; // A map from ticket-index to its information
    mapping(uint256 => mapping(uint256 => uint256)) public choicePool; // A map from activity-index and choice-index to total pool for that choice
    // ERC20 代币
    IERC20 public betToken;

    constructor() ERC721("EasyBetTicket", "EBT"){
        // 部署ERC20代币
        betToken = new BetToken(address(this));
    }

    // 修改器：检查活动是否存在
    modifier activityExists(uint256 activityId) {
        require(activityId < _activityIdCounter.current(), "Activity does not exist");
        _;
    }

    // 修改器：检查活动是否在进行中
    modifier activityActive(uint256 activityId) {
        require(block.timestamp < activities[activityId].endTime, "Activity has ended");
        _;
    }


    // TODO add any variables and functions if you want
    function helloworld() pure external returns(string memory) {
        return "hello world";
    }

    // 创建活动（仅所有者）
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

    // 下注函数
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

    // 流拍功能 - 退还所有下注
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

    // 提前结束活动
    function earlyCloseActivity(uint256 activityId) external activityExists(activityId) {
        Activity storage activity = activities[activityId];
        require(msg.sender == activity.creator, "Only creator can close early");
        require(!activity.isSettled, "Activity already settled");
        require(block.timestamp < activity.endTime, "Activity already ended");
        
        // 将结束时间设置为当前时间
        activity.endTime = block.timestamp;
        
        emit ActivityEarlyClosed(activityId);
    }

    // 挂单出售彩票
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

    // 取消挂单：必须为票主，设置价格为0并取消挂单
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

    // 购买彩票
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

    // 结算活动
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

    // 查询函数
    function getActivity(uint256 activityId) external view returns (Activity memory) {
        return activities[activityId];
    }

    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        return tickets[tokenId];
    }

    function getActivitiesCount() external view returns (uint256) {
        return _activityIdCounter.current();
    }

    function getTicketsCount() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function getListedTickets(uint256 activityId) external view returns (uint256[] memory) {
        uint256 totalTickets = _tokenIdCounter.current();
        uint256 counter = 0;
        
        // 先计算数量
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[i].isListed && tickets[i].activityId == activityId) {
                counter++;
            }
        }
        
        // 创建数组
        uint256[] memory listedTickets = new uint256[](counter);
        counter = 0;
        
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[i].isListed && tickets[i].activityId == activityId) {
                listedTickets[counter] = i;
                counter++;
            }
        }
        
        return listedTickets;
    }

    // TODO add any logic if you want
}

// ERC20 代币合约
contract BetToken is ERC20 {
    address public easyBetContract;
    
    constructor(address _easyBetContract) ERC20("BetToken", "BET") {
        easyBetContract = _easyBetContract;
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    // 领取测试代币
    function claimTokens() external {
        _mint(msg.sender, 1000 * 10**decimals());
    }
}