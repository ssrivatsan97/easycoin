#include "hex.h"
#include "hash.h"
#include "json.hpp"

#include <iostream>
#include <chrono>

std::string TEST_TARGET = "00000002af000000000000000000000000000000000000000000000000000000";

int main() {
	auto target = hashing::decodeHex(TEST_TARGET);
	int numBlocks = 2;
	nlohmann::json msgs [numBlocks];
	std::string previd = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e";
	for (int i = 0; i < numBlocks; i++) {
		msgs[i]["T"] = "00000002af000000000000000000000000000000000000000000000000000000";
		msgs[i]["created"] = 1650650324705;
		msgs[i]["miner"] = "grader";
		msgs[i]["nonce"] = "0000000000000000000000000000000000000000000000000000002634878840";
		msgs[i]["type"] = "block";
	}	
	msgs[0]["note"] = "This block has a coinbase transaction";
	msgs[0]["txids"] = {"a8dce60f89fba3cfcc8bef6a16c80c9b0a0b178eaf378589d62b8e5354867425"};
	msgs[1]["note"] = "This block has another coinbase and spends earlier coinbase";
	msgs[1]["txids"] = {"72dc0438756e7b32e849e495e2252a4a6b4fd699c705ffee7d27342ed135fde1","f67b65f34c00f7d7293bc6b58194739fb38848ebab78099c2c51d8abefdb3c99"};
	
	for (int i = 0; i < numBlocks; i++) {
		nlohmann::json msg = msgs[i];
		msg["previd"] = previd;
		Hex64 nonce;
		std::string hash;
		std::string dumped = msg.dump();
		std::string prefix = dumped.substr(0, dumped.find("\"nonce\":") + 9);
		std::string postfix = dumped.substr(dumped.find("\"nonce\":") + 64 + 9, dumped.size());
		for (auto& c : prefix) {
			if (c == '\'') {
				c = '"';
			}
		}
		for (auto& c : postfix) {
			if (c == '\'') {
				c = '"';
			}
		}
		nonce = Hex64();
		if ((prefix + "0000000000000000000000000000000000000000000000000000002634878840" + postfix)
			== dumped){ 
			std::cout << "Dumped == prefix + nonce + postfix" << '\n';
		}
		else {
			std::cout << "Dumped != prefix + nonce + postfix" << '\n';
		}
		auto cur = std::chrono::high_resolution_clock::now();
		while (true) {
			hash = hashing::SHA256(prefix + nonce.value() + postfix);
			if (hashing::compareBytes(hash, target)) {
				break;
			}
			nonce++;
		}
		auto after = std::chrono::high_resolution_clock::now();
		std::cout << "Time took to find a hash for target: " << TEST_TARGET
			<< " is: " << (after - cur).count() / 1000000000 << " seconds" << '\n';
		std::cout << "hash: " << hashing::encodeHex(hash) << '\n';
		std::cout << "block: \n" << prefix + nonce.value() + postfix << "\n";
		previd = hashing::encodeHex(hash);
	}
}