#include "hash.h"

#include <functional>
#include <algorithm>

namespace hashing {

std::string SHA256(const std::string& in) {
	CryptoPP::SHA256 hash;
	std::string digest(CryptoPP::SHA256::DIGESTSIZE, '0');
	hash.CalculateDigest((CryptoPP::byte*) digest.data(), (CryptoPP::byte*) in.c_str(), in.size());
	return digest;
}

std::string decodeHex(const std::string& hex) {
	std::string decoded;
	CryptoPP::HexDecoder decoder;
	decoder.Put((CryptoPP::byte*) hex.data(), hex.size());
	decoder.MessageEnd();
	uint64_t size = decoder.MaxRetrievable();
	if(size > 0 && size <= SIZE_MAX) {
		decoded.resize(size);
		decoder.Get((CryptoPP::byte*)decoded.data(), decoded.size());
	}
	return decoded;
}

std::string encodeHex(const std::string& bytes) {
    std::string output;
    CryptoPP::HexEncoder encoder;
    encoder.Attach(new CryptoPP::StringSink(output));
    encoder.Put((CryptoPP::byte*)bytes.data(), bytes.size());
    encoder.MessageEnd();
    std::for_each(output.begin(), output.end(), [](char & c){
        c = std::tolower(c);
    });
    return output;
}

bool compareBytes(const std::string& first, const std::string& second) {
	int len = std::min(first.size(), second.size());
	for (int i = 0; i < len; ++i) {
		if (static_cast<CryptoPP::byte>(first[i]) < static_cast<CryptoPP::byte>(second[i])) {
			return true;
		}
		else if (static_cast<CryptoPP::byte>(first[i]) > static_cast<CryptoPP::byte>(second[i])) {
			return false;
		}
	}
	return false;
}

std::string SHA256AndEncode(const std::string in) {
	return encodeHex(SHA256(in));
}


};
