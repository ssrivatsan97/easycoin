cmake_minimum_required(VERSION 3.10)

project(MarabuMinerTest)

if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE Release)
endif()
 
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED true)
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")

include_directories(cryptopp)
include_directories(source)

message("Building cryptopp, this will take a while the first time...")
execute_process (
	COMMAND make -C ${CMAKE_SOURCE_DIR}/cryptopp/
	OUTPUT_VARIABLE OUT
)
message("Cryptopp built, output:\n${OUT}")

add_library(Hashes source/hash.cpp)

add_executable(HashRateThread source/hash-rate-thread.cpp)
target_link_libraries(HashRateThread Hashes)
target_link_libraries(HashRateThread ${CMAKE_SOURCE_DIR}/cryptopp/libcryptopp.a)

add_executable(MinerStandalone source/miner.cpp)
target_link_libraries(MinerStandalone Hashes)
target_link_libraries(MinerStandalone ${CMAKE_SOURCE_DIR}/cryptopp/libcryptopp.a)

