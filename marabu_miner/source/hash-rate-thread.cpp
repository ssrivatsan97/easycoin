#include "hex.h"
#include "hash.h"

#include <iostream>
#include <chrono>
#include <thread>
#include <mutex>

int main(int args, char** argv) {
	if (args < 2) {
		std::cout << "Error: Missing arguments!" << '\n';
		std::cout << "Args: [target] [threads(opts, default = 4)]" << '\n';
		return -1;
	}

	auto target = hashing::decodeHex(argv[1]);
	int threads = 4;
	if (args > 2) {
		threads = atoi(argv[2]);
	}

	std::string block = "{\"T\":\"00000002af000000000000000000000000000000000000000000000000000000\",\"created\":1624219079,\"miner\":\"Easycoin\",\"nonce\":\"0000000000000000000000000000000000000000000000000000002634878840\",\"note\":\"Hash rate test\",\"previd\":\"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e\",\"txids\":[],\"type\":\"block\"}";

	int numBlocks = 20;
	double avgMiningTime = 0;
	for (int i = 0; i < numBlocks; i++) {
		size_t noncePos = block.find("\"nonce\":");
		if (noncePos == std::string::npos) {
			std::cout << "Error: Block has no nonce field" << '\n';
			return -2;
		}

		std::string prefix = block.substr(0, noncePos + 9);
		std::string postfix = block.substr(noncePos + 64 + 9, block.size());

		std::string finalBlock;
		std::string blockHash;
		std::mutex foundMutex;
		bool found = false;

		auto workFunc = [&](Hex64 nonce) {
			while (!found) {
				auto blk = prefix + nonce.value() + postfix;
				auto hash = hashing::SHA256(blk);
				if (hashing::compareBytes(hash, target)) {
					std::lock_guard<std::mutex> lock(foundMutex);
					if (found) {
						return;
					}

					found = true;
					finalBlock = blk;
					blockHash = hashing::encodeHex(hash);
					return;
				}
				nonce++;
			}
		};

		std::vector<std::thread> workers;
		Hex64 initialNonce;
		auto cur = std::chrono::high_resolution_clock::now();
		for (int i = 0; i < threads; ++i) {
			Hex64 nonce(initialNonce);
			nonce.reverse();
			workers.emplace_back(workFunc, nonce);
			initialNonce++;
		}

		for (auto& worker : workers) {
			worker.join();
		}
		auto after = std::chrono::high_resolution_clock::now();

		std::cout << finalBlock << '\n';
		std::cout << blockHash << '\n';
		std::cout << "Time took to find a hash for target: " << argv[1]
			<< " is: " << (after - cur).count() / 1000000000 << " seconds" << '\n';

		avgMiningTime += (after - cur).count() / 1000000000;
		size_t prevPos = block.find("\"previd\":");
		block.replace(prevPos + 10, 64, blockHash);
	}
	std::cout << "\n Average mining time: " << (avgMiningTime/numBlocks);
}