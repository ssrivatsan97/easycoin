#pragma once

#include <string>
#include <algorithm>

class Hex64;

class Hex64 {
private:
	std::string m_number;

public:
	Hex64() : m_number(64, '0') { }
	Hex64(const std::string& number) {
		int extra = 64 - number.size();
		if (extra < 0) {
			m_number = number.substr(0, 64);
			return;
		}
		m_number = std::string(extra, '0') + number;
	}

	Hex64(const Hex64& other) : m_number(other.m_number) { }

	inline void reverse() {
		std::reverse(m_number.begin(), m_number.end());
	}

	inline Hex64& operator++(int x) {
		for (int i = 63; i >= 0; --i) {
			m_number[i]++;
			if (m_number[i] == '9' + 1) {
				m_number[i] = 'a';
				break;
			}
			if (m_number[i] == 'f' + 1) {
				m_number[i] = '0';
			}
			else {
				break;
			}
		}
		return *this;
	}

	inline bool operator<(const Hex64& other) const {
		for (int i = 0; i < 64; ++i) {
			if (m_number[i] < other.m_number[i]) {
				return true;
			}
			if (m_number[i] > other.m_number[i]) {
				return false;
			}
		}
		return false;
	}

	inline bool operator==(const Hex64& other) const {
		for (int i = 0; i < 64; ++i) {
			if (m_number[i] != other.m_number[i]) {
				return false;
			}
		}
		return true;
	}

	inline const std::string& value() const { return m_number; }
};

