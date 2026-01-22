// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandRegistry is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    struct Land {
        uint256 id;
        string location;
        uint256 price;
        bool isForSale;
        address payable seller;
    }

    mapping(uint256 => Land) public lands;

    constructor() ERC721("IndiaLand", "LAND") Ownable(msg.sender) {}

    function registerLand(string memory _location, uint256 _price, string memory _tokenURI) public {
        uint256 tokenId = nextTokenId;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        lands[tokenId] = Land(tokenId, _location, _price, true, payable(msg.sender));
        nextTokenId++;
    }

    function buyLand(uint256 _id) public payable {
        Land storage land = lands[_id];
        require(land.isForSale, "Land not for sale");
        require(msg.value >= land.price, "Insufficient funds");
        require(ownerOf(_id) != msg.sender, "You already own this");

        address payable seller = payable(ownerOf(_id));
        
        _transfer(seller, msg.sender, _id);
        (bool success, ) = seller.call{value: msg.value}("");
        require(success, "Transfer failed");

        land.isForSale = false;
        land.seller = payable(msg.sender);
    }
    
    function getAllLands() public view returns (Land[] memory) {
        Land[] memory allLands = new Land[](nextTokenId);
        for(uint256 i=0; i < nextTokenId; i++) {
            allLands[i] = lands[i];
        }
        return allLands;
    }
}