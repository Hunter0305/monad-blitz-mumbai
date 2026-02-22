// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GoalBadgeNFT
 * @dev Soulbound ERC-721 badges for completed goals
 */
contract GoalBadgeNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 public tokenCounter;
    string private baseURI;
    address public stakeContract;

    struct BadgeMetadata {
        uint256 goalId;
        uint8 category;
        uint64 completedAt;
        uint64 streak;
    }

    mapping(uint256 => BadgeMetadata) public badgeMetadata;
    mapping(address => uint256) public userBadgeCount;
    mapping(address => mapping(uint8 => uint256)) public categoryBadgeCount;

    event BadgeMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 goalId,
        uint8 category
    );

    event BadgeBurned(address indexed user, uint256 indexed tokenId);

    modifier onlyStakeContract() {
        require(msg.sender == stakeContract, "Only StakeYourGoal contract");
        _;
    }

    constructor(address _stakeContract)
        ERC721("TimeVault Goal Badge", "TVBADGE")
        Ownable(msg.sender)
    {
        stakeContract = _stakeContract;
        baseURI = "https://ipfs.io/ipfs/";
    }

    /**
     * @dev Mint a badge when goal is completed (called by StakeYourGoal)
     */
    function mintBadge(
        address user,
        uint256 goalId,
        uint8 category,
        uint64 streak
    ) external onlyStakeContract returns (uint256) {
        uint256 tokenId = tokenCounter++;

        _safeMint(user, tokenId);

        badgeMetadata[tokenId] = BadgeMetadata({
            goalId: goalId,
            category: category,
            completedAt: uint64(block.timestamp),
            streak: streak
        });

        userBadgeCount[user]++;
        categoryBadgeCount[user][category]++;

        emit BadgeMinted(user, tokenId, goalId, category);
        return tokenId;
    }

    /**
     * @dev Burn a badge (irreversible)
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not badge owner");

        address user = msg.sender;
        uint8 category = badgeMetadata[tokenId].category;

        userBadgeCount[user]--;
        categoryBadgeCount[user][category]--;

        _burn(tokenId);

        emit BadgeBurned(user, tokenId);
    }

    /**
     * @dev Get badge metadata
     */
    function getBadgeMetadata(uint256 tokenId)
        external
        view
        returns (BadgeMetadata memory)
    {
        require(_exists(tokenId), "Token does not exist");
        return badgeMetadata[tokenId];
    }

    /**
     * @dev Get user's badge count
     */
    function getUserBadgeCount(address user)
        external
        view
        returns (uint256)
    {
        return userBadgeCount[user];
    }

    /**
     * @dev Get category-specific badge count
     */
    function getCategoryBadgeCount(address user, uint8 category)
        external
        view
        returns (uint256)
    {
        return categoryBadgeCount[user][category];
    }

    /**
     * @dev Override tokenURI with IPFS base
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Token does not exist");

        BadgeMetadata memory metadata = badgeMetadata[tokenId];
        string memory categoryStr = _getCategoryName(metadata.category);

        return string(
            abi.encodePacked(
                baseURI,
                "Qm",
                categoryStr,
                "_",
                Strings.toString(uint256(metadata.streak)),
                "_",
                Strings.toString(tokenId)
            )
        );
    }

    /**
     * @dev Helper to convert category to string
     */
    function _getCategoryName(uint8 category)
        internal
        pure
        returns (string memory)
    {
        if (category == 0) return "health";
        if (category == 1) return "work";
        if (category == 2) return "learning";
        if (category == 3) return "fitness";
        if (category == 4) return "finance";
        return "other";
    }

    /**
     * @dev Override _update to prevent transfers (soulbound NFT)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(
            from == address(0) || to == address(0),
            "Soulbound: badges cannot be transferred"
        );
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Admin: set base URI
     */
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    /**
     * @dev Admin: set stake contract address
     */
    function setStakeContract(address _stakeContract) external onlyOwner {
        stakeContract = _stakeContract;
    }

    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
