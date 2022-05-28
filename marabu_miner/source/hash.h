#pragma once

#include <string>

// CryptoPP Includes
#include <config.h>
#include <sha.h>
#include <hex.h>

namespace hashing {

std::string SHA256(const std::string& in);
std::string encodeHex(const std::string& bytes);
std::string decodeHex(const std::string& hex);
bool compareBytes(const std::string& first, const std::string& second);
std::string SHA256AndEncode(const std::string in);

}
