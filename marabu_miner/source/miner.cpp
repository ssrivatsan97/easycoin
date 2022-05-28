#include "hex.h"
#include "hash.h"

#include <iostream>
#include <chrono>
#include <thread>
#include <mutex>

int main(int args, char** argv) {
	if (args < 3) {
		std::cout << "Error: Missing arguments!" << '\n';
		std::cout << "Args: [block] [target] [threads(opts, default = 4)] [timeout ms(opts, default = 300000)]" << '\n';
		return -1;
	}

	std::string block = argv[1];
	auto target = hashing::decodeHex(argv[2]);
	int threads = 4;
	if (args > 3) {
		threads = atoi(argv[3]);
	}
	int MINING_TIMEOUT = 300000;
	if (args > 4) {
		MINING_TIMEOUT = atoi(argv[4]);
	}

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
		auto start = std::chrono::steady_clock::now();
		long iters = 0;
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
			iters++;
			if (iters % 1000000) {
				auto now = std::chrono::steady_clock::now();
				std::chrono::duration<double> time_span = std::chrono::duration_cast<std::chrono::duration<double>>(now - start);
				if (time_span.count() > MINING_TIMEOUT/1000.0) {
					break;
				}
			}
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

	if (found) {
		// std::cout << "{\"type\":\"object\",\"object\":" << finalBlock << "}\n";
		std::cout << finalBlock << "\n";
		// std::cout << blockHash << '\n';
		// std::cout << "Time took to find a hash for target: " << argv[2]
		// 	<< " is: " << (after - cur).count() / 1000000000 << " seconds" << '\n';
	}
	else {
		// std::cout << "Block not found after " << MINING_TIMEOUT << " ms\n";
	}
}

